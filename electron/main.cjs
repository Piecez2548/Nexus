const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen } = require("electron");
const path = require("node:path");
const { startStaticServer } = require("./staticServer.cjs");

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
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

ipcMain.handle("screen-tutor:capture-region", async (_event, region) => {
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

ipcMain.handle("screen-tutor:select-region", async () => {
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

  win.loadURL(url);
  if (devServerUrl) win.webContents.openDevTools({ mode: "detach" });
}

async function resolveAppUrl() {
  if (devServerUrl) return devServerUrl;

  const { server, url } = await startStaticServer(path.join(__dirname, "..", "dist"));
  staticServer = server;
  return url;
}

app.whenReady().then(async () => {
  const url = await resolveAppUrl();
  createWindow(url);
  const registered = globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("screen-tutor:hotkey");
  });
  if (!registered) console.error("Unable to register ScreenTutor global shortcut.");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  staticServer?.close();
  if (process.platform !== "darwin") app.quit();
});
