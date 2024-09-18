// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', 
{
  backupState: (state) => ipcRenderer.invoke('backup-state', state),
  loadState: () => ipcRenderer.invoke('load-state'),
  
  backupPlaylist: (playlist, playlist_name) => ipcRenderer.invoke('backup-playlist', playlist, playlist_name),
  loadPlaylist: (playlist_name) => ipcRenderer.invoke('load-playlist', playlist_name),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  filePathToFile: (filePaths) => ipcRenderer.invoke('filePath-to-file', filePaths),
});