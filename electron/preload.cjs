const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("screenTutor", {
  captureRegion: (region) => ipcRenderer.invoke("screen-tutor:capture-region", region),
  selectRegion: () => ipcRenderer.invoke("screen-tutor:select-region"),
  showResult: () => ipcRenderer.send("screen-tutor:show-result"),
  submitRegion: (region) => ipcRenderer.send("screen-tutor:region-selected", region),
  cancelRegion: () => ipcRenderer.send("screen-tutor:region-cancelled"),
  onHotkey: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("screen-tutor:hotkey", listener);
    return () => ipcRenderer.removeListener("screen-tutor:hotkey", listener);
  },
  onClipboardImage: (callback) => {
    const listener = (_event, imageDataUrl) => callback(imageDataUrl);
    ipcRenderer.on("screen-tutor:clipboard-image", listener);
    return () => ipcRenderer.removeListener("screen-tutor:clipboard-image", listener);
  },
  setPanelOpen: (open) => ipcRenderer.send("screen-tutor:panel-open", Boolean(open)),
  setAutoRead: (on) => ipcRenderer.send("screen-tutor:auto-read", Boolean(on)),
});
