// preload.js
const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', 
{
  backupState: (state) => ipcRenderer.invoke('backup-state', state),
  loadState: () => ipcRenderer.invoke('load-state'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  filePathToFile: (filePaths) => ipcRenderer.invoke('filePath-to-file', filePaths),
});
