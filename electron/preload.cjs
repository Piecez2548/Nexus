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
});
