const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("screenTutor", {
  captureRegion: (region) => ipcRenderer.invoke("screen-tutor:capture-region", region),
  onHotkey: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("screen-tutor:hotkey", listener);
    return () => ipcRenderer.removeListener("screen-tutor:hotkey", listener);
  },
});
