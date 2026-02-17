const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', enabled),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),

  // Data operations
  loadHashtags: () => ipcRenderer.invoke('load-hashtags'),
  loadCharsData: () => ipcRenderer.invoke('load-chars-data'),
  loadCustomData: () => ipcRenderer.invoke('load-custom-data'),
  saveCustomData: (data) => ipcRenderer.invoke('save-custom-data', data),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),
  loadUsageStats: () => ipcRenderer.invoke('load-usage-stats'),
  saveUsageStats: (data) => ipcRenderer.invoke('save-usage-stats', data),
  reorderCharacters: (gameCode, newOrder) => ipcRenderer.invoke('reorder-characters', gameCode, newOrder),

  // Clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Icons
  downloadIcon: (url, filename) => ipcRenderer.invoke('download-icon', url, filename),
  getCachePath: (filename) => ipcRenderer.invoke('get-cache-path', filename),

  // Backup
  exportBackup: (filePath) => ipcRenderer.invoke('export-backup', filePath),
  importBackup: (filePath) => ipcRenderer.invoke('import-backup', filePath),

  // Icon cache
  getIconCacheDir: () => ipcRenderer.invoke('get-icon-cache-dir'),
  openIconCacheDir: () => ipcRenderer.invoke('open-icon-cache-dir'),
  clearIconCache: () => ipcRenderer.invoke('clear-icon-cache'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
