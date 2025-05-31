const { app, BrowserWindow, ipcMain, session, dialog, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');

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
    },
    extensions: [] // Ensure this line is present
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
  
  // Expects sourceData = { url, title, faviconUrl }
  ipcMain.handle('add-source', (event, sourceData) => {
    const sources = store.get('sources', []);
    const newSource = {
      id: uuidv4(),
      url: sourceData.url,
      title: sourceData.title,
      favicon: sourceData.faviconUrl, // Ensure key consistency
      addedAt: Date.now()
    };
    sources.push(newSource);
    store.set('sources', sources);
    return sources; // Return all sources, including the new one with generated fields
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
  ipcMain.handle('get-installed-extensions', async () => {
    // Return extensions from store, potentially updated after startup loading
    return store.get('extensions', []);
  });
  
  ipcMain.handle('install-extension', async (event, { extensionPath }) => {
    try {
      const loadedExtension = await session.defaultSession.loadExtension(extensionPath, { allowFileAccess: true });
      console.log(`Extension '${loadedExtension.name}' (ID: ${loadedExtension.id}) loaded into default session from path: ${extensionPath}`);
      const extensions = store.get('extensions', []);
      const newExtension = {
        id: loadedExtension.id,
        name: loadedExtension.name,
        version: loadedExtension.version,
        path: extensionPath,
        enabled: true
      };
      
      extensions.push(newExtension);
      store.set('extensions', extensions);
      
      return newExtension;
    } catch (error) {
      console.error('Failed to install extension:', error);
      return { error: error.message };
    }
  });
  
  ipcMain.handle('uninstall-extension', async (event, extensionId) => {
    try {
      await session.defaultSession.removeExtension(extensionId);
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

  ipcMain.handle('select-extension-directory', async () => {
    if (!mainWindow) {
      console.error('Main window not available for dialog.');
      return null;
    }
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (e) {
      console.error('Failed to show open dialog:', e);
      return null;
    }
  });

  ipcMain.handle('fetch-site-metadata', async (event, url) => {
    try {
      const response = await fetch(url, { redirect: 'follow', timeout: 5000 }); // 5s timeout
      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();

      let title = new URL(url).hostname;
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      let faviconUrl = new URL('/favicon.ico', url).href;
      const linkRegex = /<link\s+(?:[^>]*?\s+)?rel=(['"](?:shortcut icon|icon)['"])(?:[^>]*?\s+)?href=(['"]([^'"]+)['"])/gi;
      let match;
      // Search for best quality icon, e.g. sizes attribute, but keep it simple for now
      // Last one found is often a good heuristic if multiple are present without sizes.
      while ((match = linkRegex.exec(html)) !== null) {
        faviconUrl = new URL(match[3], url).href;
      }

      return { title, faviconUrl };
    } catch (error) {
      console.error(`Error fetching metadata for ${url}:`, error);
      const hostname = new URL(url).hostname;
      return {
        title: hostname,
        faviconUrl: new URL('/favicon.ico', url).href
      };
    }
  });
}

// Create main window when Electron is ready
app.whenReady().then(async () => {
  // Register the app:// protocol for serving content
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); // Remove 'app://'
    const filePath = path.join(__dirname, url);
    callback(filePath);
  });
  
  createWindow();

  // Load installed extensions on startup
  let storedExtensions = store.get('extensions', []);
  const successfullyLoadedExtensions = [];
  for (const extensionToLoad of storedExtensions) {
    if (extensionToLoad.enabled && extensionToLoad.path) {
      try {
        const loadedExtension = await session.defaultSession.loadExtension(extensionToLoad.path, { allowFileAccess: true });
        console.log(`Reloaded extension '${loadedExtension.name}' (ID: ${loadedExtension.id}) into default session from path: ${extensionToLoad.path}`);
        successfullyLoadedExtensions.push(extensionToLoad); // Push the original stored object
      } catch (error) {
        console.error(`Failed to load extension ${extensionToLoad.name} from ${extensionToLoad.path}:`, error);
        // Extension failed to load, do not add it to successfullyLoadedExtensions,
        // effectively removing it from the store for the next save.
      }
    } else if (!extensionToLoad.path) {
      console.warn(`Extension ${extensionToLoad.name} is missing a path and will be removed.`);
    } else {
      // Extension is disabled but path is present, keep it.
      successfullyLoadedExtensions.push(extensionToLoad);
    }
  }
  // Update the store with only successfully loaded or valid disabled extensions
  store.set('extensions', successfullyLoadedExtensions);
  
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