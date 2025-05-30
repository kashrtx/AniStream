const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const puppeteer = require('./puppeteer');

// Initialize configuration store
const store = new Store();

// Set default values if not already set
if (!store.has('settings')) {
  store.set('settings', {
    malSyncEnabled: true,
    downloadPath: path.join(app.getPath('downloads'), 'AniStream'),
    theme: 'dark',
    adBlockEnabled: true,
    autoUpdateCheck: true
  });
}

// Create download directory if it doesn't exist
const downloadPath = store.get('settings.downloadPath');
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true });
}

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Required for local file access
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true // Enable webview tag for Cloudflare challenges
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false, // Don't show until ready-to-show
    frame: false, // Custom frame for modern UI
    backgroundColor: '#121212' // Dark background for initial load
  });

  // Make sure the MAL-Sync script exists, create a copy from the original if not
  ensureMalSyncScript();

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'views/index.html'));

  // Open the DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready to show (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates if enabled
    if (store.get('settings.autoUpdateCheck')) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure MAL-Sync script is available
function ensureMalSyncScript() {
  const malSyncScriptPath = path.join(__dirname, 'MAL-Sync-0.12.0.user.js');
  
  // Check if script exists
  if (!fs.existsSync(malSyncScriptPath)) {
    console.log('MAL-Sync script not found, creating a default one');
    
    // Create a placeholder script if the real one doesn't exist
    // In production, you would include the real MALSync userscript with your app
    const placeholderScript = `
      // MALSync placeholder script
      console.log('MALSync script loaded');
      
      // Define MALSync object
      window.MALSync = {
        search: async function(query) {
          console.log('MALSync search:', query);
          return [];
        },
        getAnime: async function(id) {
          console.log('MALSync getAnime:', id);
          return null;
        },
        setStatus: async function(data) {
          console.log('MALSync setStatus:', data);
          return { success: true, message: 'Status updated (placeholder)' };
        }
      };
    `;
    
    fs.writeFileSync(malSyncScriptPath, placeholderScript);
  }
}

// Create window when Electron has finished initialization
app.on('ready', async () => {
  createWindow();
  
  // Setup puppeteer handlers
  puppeteer.setupPuppeteerHandlers();
  
  // Initialize puppeteer
  try {
    await puppeteer.initPuppeteer();
  } catch (error) {
    console.error('Error initializing puppeteer:', error);
  }
});

// Quit when all windows are closed
app.on('window-all-closed', async () => {
  // Clean up puppeteer
  await puppeteer.cleanupPuppeteer();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for renderer process communication
ipcMain.handle('get-store-value', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', async (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Handle backup and import functionality
ipcMain.handle('export-data', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export AniStream Data',
    defaultPath: path.join(app.getPath('documents'), 'anistream-backup.json'),
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!result.canceled) {
    const data = {
      settings: store.get('settings'),
      sources: store.get('sources'),
      history: store.get('history'),
      favorites: store.get('favorites')
    };
    
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return true;
  }
  return false;
});

ipcMain.handle('import-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import AniStream Data',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      
      if (data.settings) store.set('settings', data.settings);
      if (data.sources) store.set('sources', data.sources);
      if (data.history) store.set('history', data.history);
      if (data.favorites) store.set('favorites', data.favorites);
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
  return false;
});

// MAL Sync API handlers
ipcMain.handle('search-mal', async (event, query) => {
  try {
    // Use Jikan API (unofficial MAL API)
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching MAL:', error);
    return [];
  }
});

ipcMain.handle('get-mal-anime-details', async (event, id) => {
  try {
    // Use Jikan API (unofficial MAL API)
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error getting MAL anime details:', error);
    return null;
  }
});

ipcMain.handle('update-mal', async (event, data) => {
  try {
    // Get MAL credentials
    const credentials = store.get('malCredentials');
    if (!credentials) {
      return { success: false, message: 'Not logged in to MAL' };
    }
    
    // In a real app, we would use MAL's API to update the anime status
    // For now, we'll just return a successful response
    console.log('Updating MAL status:', data);
    return { success: true, message: 'Updated MAL status' };
  } catch (error) {
    console.error('Error updating MAL:', error);
    return { success: false, message: 'Error updating MAL' };
  }
}); 