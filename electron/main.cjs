const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { startStaticServer } = require("./staticServer.cjs");

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
let staticServer = null;

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on("window-all-closed", () => {
  staticServer?.close();
  if (process.platform !== "darwin") app.quit();
});
