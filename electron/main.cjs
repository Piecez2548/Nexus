const { app, BrowserWindow, clipboard, desktopCapturer, globalShortcut, ipcMain, net, screen, session, shell } = require("electron");
const crypto = require("node:crypto");
const path = require("node:path");
const { startStaticServer } = require("./staticServer.cjs");

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
// The desktop app shows the live site, so every deploy reaches it; offline it falls back to the bundled build.
const WEB_URL = process.env.SCREENTUTOR_WEB_URL || "https://nexus-lemon-eight-32.vercel.app";
let appOrigin = "";

function isTrusted(event) {
  try { return new URL(event.senderFrame.url).origin === appOrigin; } catch { return false; }
}

// Pages in these windows can use the desktop bridge, so they may only ever show the app itself; other links open in the browser.
function lockToApp(win) {
  const external = (url) => { if (/^https:\/\//i.test(url)) void shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin === appOrigin) return;
    event.preventDefault();
    external(url);
  });
}
let staticServer = null;
let mainWindow = null;
let regionSelectorWindow = null;
let regionSelectorDisplay = null;
let resolveRegionSelection = null;

function finishRegionSelection(region) {
  const resolve = resolveRegionSelection;
  resolveRegionSelection = null;
  regionSelectorDisplay = null;
  if (regionSelectorWindow && !regionSelectorWindow.isDestroyed()) regionSelectorWindow.close();
  regionSelectorWindow = null;
  resolve?.(region);
}

ipcMain.handle("screen-tutor:capture-region", async (event, region) => {
  if (!isTrusted(event)) throw new Error("Untrusted caller.");
  if (!region || region.width <= 0 || region.height <= 0 || region.width > 10000 || region.height > 10000) {
    throw new Error("Invalid capture region.");
  }
  const display = screen.getAllDisplays().find((item) => String(item.id) === String(region.monitorId)) ?? screen.getPrimaryDisplay();
  const size = display.size;
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: size, fetchWindowIcons: false });
  const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
  if (!source) throw new Error("No screen source is available.");
  const thumbnailSize = source.thumbnail.getSize();
  const scaleX = thumbnailSize.width / size.width;
  const scaleY = thumbnailSize.height / size.height;
  const crop = source.thumbnail.crop({
    x: Math.max(0, Math.round((region.x - display.bounds.x) * scaleX)),
    y: Math.max(0, Math.round((region.y - display.bounds.y) * scaleY)),
    width: Math.max(1, Math.round(region.width * scaleX)),
    height: Math.max(1, Math.round(region.height * scaleY)),
  });
  return crop.toDataURL();
});

ipcMain.handle("screen-tutor:select-region", async (event) => {
  if (!isTrusted(event)) return null;
  if (regionSelectorWindow) return null;

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) ?? screen.getPrimaryDisplay();
  return new Promise((resolve) => {
    resolveRegionSelection = resolve;
    regionSelectorDisplay = display;

    try {
      const selectorWindow = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        transparent: true,
        frame: false,
        fullscreenable: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        skipTaskbar: true,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      regionSelectorWindow = selectorWindow;
      selectorWindow.setAlwaysOnTop(true, "screen-saver");
      selectorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      selectorWindow.on("closed", () => {
        if (regionSelectorWindow === selectorWindow) {
          regionSelectorWindow = null;
          regionSelectorDisplay = null;
          const pending = resolveRegionSelection;
          resolveRegionSelection = null;
          pending?.(null);
        }
      });
      void selectorWindow.loadFile(path.join(__dirname, "region-selector.html"));
    } catch {
      finishRegionSelection(null);
    }
  });
});

ipcMain.on("screen-tutor:region-selected", (event, draft) => {
  if (!regionSelectorWindow || event.sender !== regionSelectorWindow.webContents || !regionSelectorDisplay) return;
  if (!draft || ![draft.x, draft.y, draft.width, draft.height].every(Number.isFinite)) return;

  const { bounds } = regionSelectorDisplay;
  const x = Math.max(0, Math.min(bounds.width - 1, Math.round(draft.x)));
  const y = Math.max(0, Math.min(bounds.height - 1, Math.round(draft.y)));
  const width = Math.min(Math.round(draft.width), bounds.width - x);
  const height = Math.min(Math.round(draft.height), bounds.height - y);
  if (width < 40 || height < 40) return;

  finishRegionSelection({
    x: bounds.x + x,
    y: bounds.y + y,
    width,
    height,
    monitorId: String(regionSelectorDisplay.id),
  });
});

ipcMain.on("screen-tutor:region-cancelled", (event) => {
  if (regionSelectorWindow && event.sender === regionSelectorWindow.webContents) finishRegionSelection(null);
});

ipcMain.on("screen-tutor:show-result", (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  mainWindow.show();
  mainWindow.focus();
});

// The answer panel: a small always-on-top window that slides in from the right edge of the screen. The page draws a
// 28px arrow handle at its left edge; sliding it away leaves only the handle visible.
const PANEL_WIDTH = 408;
const PANEL_HANDLE = 28;
const CLIPBOARD_POLL_MS = 600;
let panelWindow = null;
let panelAnimation = null;
let autoRead = true;
let lastClipboardSignature = "";
let clipboardTimer = null;

function panelBounds(open) {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: area.x + area.width - (open ? PANEL_WIDTH : PANEL_HANDLE),
    y: area.y + 60,
    width: PANEL_WIDTH,
    height: Math.min(640, area.height - 80),
  };
}

function slidePanel(open) {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  panelWindow.webContents.send("screen-tutor:panel-state", open);
  clearInterval(panelAnimation);
  const from = panelWindow.getBounds();
  const to = panelBounds(open);
  const steps = 10;
  let step = 0;
  panelAnimation = setInterval(() => {
    step += 1;
    const eased = 1 - Math.pow(1 - step / steps, 3);
    if (!panelWindow || panelWindow.isDestroyed()) return clearInterval(panelAnimation);
    panelWindow.setBounds({ ...to, x: Math.round(from.x + (to.x - from.x) * eased) });
    if (step >= steps) clearInterval(panelAnimation);
  }, 16);
}

ipcMain.on("screen-tutor:panel-open", (event, open) => {
  if (panelWindow && event.sender === panelWindow.webContents) slidePanel(Boolean(open));
});

ipcMain.on("screen-tutor:auto-read", (event, on) => {
  if (panelWindow && event.sender === panelWindow.webContents) autoRead = Boolean(on);
});

function createPanel(url) {
  const win = new BrowserWindow({
    ...panelBounds(true),
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#fbfdf9",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  panelWindow = win;
  lockToApp(win);
  win.setAlwaysOnTop(true, "screen-saver");
  win.once("ready-to-show", () => win.showInactive());
  win.on("closed", () => { if (panelWindow === win) panelWindow = null; });
  void win.loadURL(`${url}/screentutor?panel=1`);
}

// A sampled fingerprint is enough to tell one screenshot from the next without hashing every pixel.
function imageSignature(image) {
  if (image.isEmpty()) return "";
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap();
  const stride = Math.max(1, Math.floor(bitmap.length / 8192));
  const sample = Buffer.alloc(Math.ceil(bitmap.length / stride));
  for (let i = 0, j = 0; i < bitmap.length; i += stride, j += 1) sample[j] = bitmap[i];
  return `${width}x${height}:${crypto.createHash("md5").update(sample).digest("hex")}`;
}

// Win+Shift+S puts the crop on the clipboard; read every new one in the background, whichever window has focus.
function watchClipboard() {
  lastClipboardSignature = imageSignature(clipboard.readImage());
  clipboardTimer = setInterval(() => {
    const image = clipboard.readImage();
    const signature = imageSignature(image);
    if (signature === lastClipboardSignature) return;
    lastClipboardSignature = signature;
    if (!signature || !autoRead || !panelWindow || panelWindow.isDestroyed()) return;
    panelWindow.webContents.send("screen-tutor:clipboard-image", image.toDataURL());
  }, CLIPBOARD_POLL_MS);
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#f5f7f4",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  lockToApp(win);
  win.on("closed", () => { if (mainWindow === win) app.quit(); });

  win.loadURL(url);
  if (devServerUrl) win.webContents.openDevTools({ mode: "detach" });
}

async function webReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    return (await net.fetch(`${WEB_URL}/screentutor`, { method: "HEAD", signal: controller.signal })).ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveAppUrl() {
  if (devServerUrl) return devServerUrl;
  if (await webReachable()) {
    // A stale service worker would keep serving the previous deploy; settings and history in local storage are untouched.
    await session.defaultSession.clearStorageData({ storages: ["serviceworkers", "cachestorage"] });
    return WEB_URL;
  }

  const { server, url } = await startStaticServer(path.join(__dirname, "..", "dist"));
  staticServer = server;
  return url;
}

// One copy only: starting it again (for example from the website's button) just slides the panel back out.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on("second-instance", () => {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  panelWindow.showInactive();
  slidePanel(true);
});

app.whenReady().then(async () => {
  if (!gotLock) return;
  const url = await resolveAppUrl();
  appOrigin = new URL(url).origin;
  createWindow(`${url}/screentutor`);
  createPanel(url);
  watchClipboard();
  const registered = globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("screen-tutor:hotkey");
  });
  if (!registered) console.error("Unable to register ScreenTutor global shortcut.");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(`${url}/screentutor`);
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  clearInterval(clipboardTimer);
  staticServer?.close();
  if (process.platform !== "darwin") app.quit();
});
