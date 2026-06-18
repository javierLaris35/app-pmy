const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getMachineInfo: () => ipcRenderer.invoke("get-machine-info"),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  send: (channel, args) => ipcRenderer.send(channel, args),
});
