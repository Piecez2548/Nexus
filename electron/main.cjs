const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen } = require("electron");
const path = require("node:path");
const { startStaticServer } = require("./staticServer.cjs");

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
let staticServer = null;
let mainWindow = null;

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
  globalShortcut.register("CommandOrControl+Shift+Space", () => mainWindow?.webContents.send("screen-tutor:hotkey"));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  staticServer?.close();
  if (process.platform !== "darwin") app.quit();
});
