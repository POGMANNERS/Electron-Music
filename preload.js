// preload.js
const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  backupState: (state) => ipcRenderer.invoke('backup-state', state),
  loadState: () => ipcRenderer.invoke('load-state'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  filePathToBase64: (filePath) => ipcRenderer.invoke('filePath-to-base64', filePath),
});
