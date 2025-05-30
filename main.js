const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize the data store
const store = new Store({
  name: 'anistream-data',
  defaults: {
    sources: [],
    bookmarks: [],
    watchHistory: [],
    settings: {
      theme: 'dark',
      autoPlayNext: true,
      defaultPage: 'home'
    }
  }
});

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Setup protocol handler for favicon fetching
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable webviews
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'assets/images/logo.svg')
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Register directory for extensions
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');
  
  // Create extensions directory if it doesn't exist
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
  }

  // Register IPC handlers
  setupIPCHandlers();
}

function setupIPCHandlers() {
  // Source management
  ipcMain.handle('get-sources', () => {
    return store.get('sources', []);
  });
  
  ipcMain.handle('add-source', (event, source) => {
    const sources = store.get('sources', []);
    sources.push(source);
    store.set('sources', sources);
    return sources;
  });
  
  ipcMain.handle('remove-source', (event, sourceId) => {
    const sources = store.get('sources', []).filter(source => source.id !== sourceId);
    store.set('sources', sources);
    return sources;
  });
  
  // Bookmark management
  ipcMain.handle('get-bookmarks', () => {
    return store.get('bookmarks', []);
  });
  
  ipcMain.handle('add-bookmark', (event, bookmark) => {
    const bookmarks = store.get('bookmarks', []);
    bookmarks.push(bookmark);
    store.set('bookmarks', bookmarks);
    return bookmarks;
  });
  
  ipcMain.handle('remove-bookmark', (event, bookmarkId) => {
    const bookmarks = store.get('bookmarks', []).filter(bookmark => bookmark.id !== bookmarkId);
    store.set('bookmarks', bookmarks);
    return bookmarks;
  });
  
  // History management
  ipcMain.handle('get-history', () => {
    return store.get('watchHistory', []);
  });
  
  ipcMain.handle('add-history', (event, historyItem) => {
    const history = store.get('watchHistory', []);
    // Check if item already exists, update timestamp if it does
    const existingIndex = history.findIndex(item => 
      item.animeId === historyItem.animeId && item.episodeId === historyItem.episodeId
    );
    
    if (existingIndex !== -1) {
      history[existingIndex] = historyItem;
    } else {
      history.push(historyItem);
    }
    
    store.set('watchHistory', history);
    return history;
  });
  
  // Settings management
  ipcMain.handle('get-settings', () => {
    return store.get('settings', {
      theme: 'dark',
      autoPlayNext: true,
      defaultPage: 'home'
    });
  });
  
  ipcMain.handle('update-settings', (event, settings) => {
    store.set('settings', settings);
    return settings;
  });
  
  // Extension management
  ipcMain.handle('get-installed-extensions', () => {
    // For now, return mock data instead of actual Chrome extensions
    return store.get('extensions', []);
  });
  
  ipcMain.handle('install-extension', (event, { extensionId, source }) => {
    try {
      // In a real app, we would install the extension
      // For now, just add a mock extension to the store
      const extensions = store.get('extensions', []);
      const newExtension = {
        id: extensionId,
        name: extensionId.split('/').pop() || `Extension ${extensionId}`,
        version: '1.0.0',
        enabled: true,
        icon: 'assets/images/default-extension-icon.png'
      };
      
      extensions.push(newExtension);
      store.set('extensions', extensions);
      
      return newExtension;
    } catch (error) {
      console.error('Failed to install extension:', error);
      return null;
    }
  });
  
  ipcMain.handle('uninstall-extension', (event, extensionId) => {
    try {
      const extensions = store.get('extensions', []);
      const filteredExtensions = extensions.filter(ext => ext.id !== extensionId);
      store.set('extensions', filteredExtensions);
      return true;
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
      return false;
    }
  });
  
  // Utility functions
  ipcMain.handle('open-extension-directory', () => {
    const extensionsDir = path.join(app.getPath('userData'), 'extensions');
    shell.openPath(extensionsDir);
    return true;
  });
}

// Create main window when Electron is ready
app.whenReady().then(() => {
  // Register the app:// protocol for serving content
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); // Remove 'app://'
    const filePath = path.join(__dirname, url);
    callback(filePath);
  });
  
  createWindow();
  
  app.on('activate', function () {
    // On macOS re-create a window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 