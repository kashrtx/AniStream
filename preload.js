const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Store functions
    getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
    setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
    
    // Dialog functions
    chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Update functions
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    // Backup and restore
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: () => ipcRenderer.invoke('import-data'),
    
    // Event listeners
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', () => callback());
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', () => callback());
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
    
    // Browser automation (simplified API for renderer)
    browse: (url, options) => ipcRenderer.invoke('browse', url, options),
    extractAnimeInfo: (url) => ipcRenderer.invoke('extract-anime-info', url),
    downloadEpisode: (url, filename) => ipcRenderer.invoke('download-episode', url, filename),
    
    // MALSync integration
    updateMAL: (data) => ipcRenderer.invoke('update-mal', data),
    searchMAL: (query) => ipcRenderer.invoke('search-mal', query),
    getMALAnimeDetails: (id) => ipcRenderer.invoke('get-mal-anime-details', id)
  }
); 