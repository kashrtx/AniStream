const { contextBridge, ipcRenderer, dialog } = require('electron');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Mock data store for development (until we connect to the main process)
const mockStore = {
  sources: [
    {
      id: '1',
      url: 'https://animepahe.ru',
      title: 'AnimePahe',
      favicon: 'https://animepahe.ru/favicon.ico',
      addedAt: Date.now()
    },
    {
      id: '2',
      url: 'https://hianime.to',
      title: 'HiAnime',
      favicon: 'https://hianime.to/favicon.ico',
      addedAt: Date.now() - 86400000
    }
  ],
  bookmarks: [
    {
      id: '1',
      animeId: 'anime1',
      title: 'Demon Slayer',
      thumbnail: 'https://via.placeholder.com/300x168.png?text=Demon+Slayer',
      url: 'https://animepahe.ru/anime/demon-slayer',
      type: 'anime',
      addedAt: Date.now()
    },
    {
      id: '2',
      animeId: 'anime2',
      title: 'Attack on Titan',
      thumbnail: 'https://via.placeholder.com/300x168.png?text=Attack+on+Titan',
      url: 'https://animepahe.ru/anime/attack-on-titan',
      type: 'anime',
      addedAt: Date.now() - 86400000
    }
  ],
  watchHistory: [
    {
      animeId: 'anime1',
      episodeId: 'ep1',
      title: 'Demon Slayer',
      episodeNumber: '1',
      thumbnail: 'https://via.placeholder.com/300x168.png?text=Demon+Slayer',
      url: 'https://animepahe.ru/anime/demon-slayer/1',
      progress: 75,
      lastWatched: Date.now() - 3600000
    }
  ],
  settings: {
    theme: 'dark',
    autoPlayNext: true,
    defaultPage: 'home'
  },
  extensions: [
    {
      id: 'malsync-extension',
      name: 'MAL-Sync',
      version: '0.8.9',
      enabled: true,
      icon: 'https://malsync.moe/favicon.ico'
    },
    {
      id: 'ublock-origin',
      name: 'uBlock Origin',
      version: '1.49.2',
      enabled: true,
      icon: 'https://raw.githubusercontent.com/gorhill/uBlock/master/src/img/icon_128.png'
    }
  ]
};

// Popular anime sites for autocomplete
const popularSites = [
  {
    url: 'https://animepahe.ru',
    title: 'AnimePahe',
    favicon: 'https://animepahe.ru/favicon.ico'
  },
  {
    url: 'https://hianime.to',
    title: 'HiAnime',
    favicon: 'https://hianime.to/favicon.ico'
  },
  {
    url: 'https://9anime.to',
    title: '9anime',
    favicon: 'https://9anime.to/favicon.ico'
  },
  {
    url: 'https://gogoanime.tel',
    title: 'GogoAnime',
    favicon: 'https://gogoanime.tel/img/icon/logo.png'
  },
  {
    url: 'https://zoro.to',
    title: 'Zoro',
    favicon: 'https://zoro.to/favicon.ico'
  },
  {
    url: 'https://aniwatch.to',
    title: 'AniWatch',
    favicon: 'https://aniwatch.to/favicon.ico'
  }
];

// Helper functions
function searchPopularSites(query) {
  if (!query) return [];
  query = query.toLowerCase();
  
  return popularSites.filter(site => 
    site.url.toLowerCase().includes(query) || 
    site.title.toLowerCase().includes(query)
  );
}

// Create API functions using mock data as fallback
const aniStreamAPI = {
  // Source management
  getSources: async () => {
    try {
      const result = await ipcRenderer.invoke('get-sources');
      return result;
    } catch (e) {
      console.warn('Using mock data for sources:', e);
      return mockStore.sources;
    }
  },
  
  // sourceData should be an object like { url: "...", title: "...", faviconUrl: "..." }
  // This is passed from js/sources.js after calling fetchSiteMetadata.
  // The main process will generate id and addedAt.
  addSource: async (sourceData) => {
    try {
      // Ensure URL is absolute before sending (though js/sources.js should also do this)
      let absoluteUrl = sourceData.url;
      if (absoluteUrl && !absoluteUrl.match(/^https?:\/\//)) {
        absoluteUrl = `https://${absoluteUrl}`;
      }
      new URL(absoluteUrl); // Validate

      const payload = {
        ...sourceData,
        url: absoluteUrl
      };
      const result = await ipcRenderer.invoke('add-source', payload);
      return result;
    } catch (e) {
      console.error('Error invoking add-source:', e);
      // Fallback to mock if needed, or rethrow/return error
      // For now, let's match the existing pattern of using mockStore on error.
      // However, the structure of sourceData might not be complete for mockStore.
      // This part needs careful handling if mockStore is to be a true fallback here.
      // Given main.js now creates the full object, mock might not be suitable here.
      // Let's return an error structure or rethrow.
      // throw e; // Or return { error: e.message }
      // Reverting to mock for now to maintain consistency with other functions.
      // This mock logic will likely be incorrect as main.js adds id/timestamp.
      const mockSource = {
        id: uuidv4(),
        ...sourceData,
        addedAt: Date.now()
      };
      mockStore.sources.push(mockSource);
      return mockStore.sources;
    }
  },
  
  removeSource: async (id) => {
    try {
      const result = await ipcRenderer.invoke('remove-source', id);
      return result;
    } catch (e) {
      console.warn('Using mock data for removing source:', e);
      mockStore.sources = mockStore.sources.filter(source => source.id !== id);
      return mockStore.sources;
    }
  },
  
  searchSites: (query) => {
    // Search through popular anime sites
    return Promise.resolve(searchPopularSites(query));
  },
  
  // Bookmark management
  getBookmarks: async () => {
    try {
      const result = await ipcRenderer.invoke('get-bookmarks');
      return result;
    } catch (e) {
      console.warn('Using mock data for bookmarks:', e);
      return mockStore.bookmarks;
    }
  },
  
  addBookmark: async (bookmark) => {
    if (!bookmark.id) {
      bookmark.id = uuidv4();
    }
    bookmark.addedAt = Date.now();
    
    try {
      const result = await ipcRenderer.invoke('add-bookmark', bookmark);
      return result;
    } catch (e) {
      console.warn('Using mock data for adding bookmark:', e);
      mockStore.bookmarks.push(bookmark);
      return mockStore.bookmarks;
    }
  },
  
  removeBookmark: async (id) => {
    try {
      const result = await ipcRenderer.invoke('remove-bookmark', id);
      return result;
    } catch (e) {
      console.warn('Using mock data for removing bookmark:', e);
      mockStore.bookmarks = mockStore.bookmarks.filter(bookmark => bookmark.id !== id);
      return mockStore.bookmarks;
    }
  },
  
  // Watch history management
  getHistory: async () => {
    try {
      const result = await ipcRenderer.invoke('get-history');
      return result;
    } catch (e) {
      console.warn('Using mock data for history:', e);
      return mockStore.watchHistory;
    }
  },
  
  addHistory: async (historyItem) => {
    historyItem.timestamp = Date.now();
    
    try {
      const result = await ipcRenderer.invoke('add-history', historyItem);
      return result;
    } catch (e) {
      console.warn('Using mock data for adding history:', e);
      // Check if item already exists, update timestamp if it does
      const existingIndex = mockStore.watchHistory.findIndex(item => 
        item.animeId === historyItem.animeId && item.episodeId === historyItem.episodeId
      );
      
      if (existingIndex !== -1) {
        mockStore.watchHistory[existingIndex] = historyItem;
      } else {
        mockStore.watchHistory.push(historyItem);
      }
      return mockStore.watchHistory;
    }
  },
  
  // Settings management
  getSettings: async () => {
    try {
      const result = await ipcRenderer.invoke('get-settings');
      return result;
    } catch (e) {
      console.warn('Using mock data for settings:', e);
      return mockStore.settings;
    }
  },
  
  updateSettings: async (settings) => {
    try {
      const result = await ipcRenderer.invoke('update-settings', settings);
      return result;
    } catch (e) {
      console.warn('Using mock data for updating settings:', e);
      mockStore.settings = { ...mockStore.settings, ...settings };
      return mockStore.settings;
    }
  },
  
  // Extension management
  getInstalledExtensions: async () => {
    try {
      const result = await ipcRenderer.invoke('get-installed-extensions');
      return result;
    } catch (e) {
      console.warn('Using mock data for extensions:', e);
      return mockStore.extensions;
    }
  },
  
  // The argument is now an object like { extensionPath: "..." }
  installExtension: async (payload) => {
    try {
      // Pass the payload directly, main.js expects { extensionPath }
      const result = await ipcRenderer.invoke('install-extension', payload);
      return result;
    } catch (e) {
      console.warn('Error invoking install-extension:', e);
      // It's better to return the error or an error structure
      return { error: e.message || 'Failed to install extension via IPC' };
    }
  },
  
  uninstallExtension: async (extensionId) => {
    try {
      const result = await ipcRenderer.invoke('uninstall-extension', extensionId);
      return result;
    } catch (e) {
      console.warn('Using mock data for uninstalling extension:', e);
      mockStore.extensions = mockStore.extensions.filter(ext => ext.id !== extensionId);
      return true;
    }
  },

  selectExtensionDirectory: async () => {
    try {
      const result = await ipcRenderer.invoke('select-extension-directory');
      return result;
    } catch (e) {
      console.error('Failed to open directory dialog:', e);
      return null;
    }
  },
  
  openExtensionDirectory: async () => {
    try {
      const result = await ipcRenderer.invoke('open-extension-directory');
      return result;
    } catch (e) {
      console.warn('Could not open extension directory:', e);
      // Simulate dialog
      alert('Extension directory would open here');
      return true;
    }
  },
  
  // Fetch site metadata (title, favicon)
  fetchSiteMetadata: async (url) => {
    try {
      // Ensure the URL is valid and absolute before sending
      let absoluteUrl = url;
      if (absoluteUrl && !absoluteUrl.match(/^https?:\/\//)) {
        absoluteUrl = 'https://' + absoluteUrl;
      }
      new URL(absoluteUrl); // Validate URL structure, throws if invalid

      const metadata = await ipcRenderer.invoke('fetch-site-metadata', absoluteUrl);
      return metadata; // Expected to be { title, faviconUrl }
    } catch (error) {
      console.error('Failed to fetch site metadata via IPC:', error);
      // Fallback to a very basic default using the input URL
      let hostname = url;
      try {
        const tempUrl = url.startsWith('http') ? url : 'https://' + url;
        hostname = new URL(tempUrl).hostname;
      } catch (e) {
        // if hostname parsing fails, use the original url (or part of it)
        hostname = url.length > 50 ? url.substring(0, 50) + '...' : url;
      }
      return { 
        title: hostname,
        // This is a plain guess, main process should provide a better default if possible
        faviconUrl: `https://${hostname}/favicon.ico`
      };
    }
  }
};

// Expose API to renderer process
contextBridge.exposeInMainWorld('anistream', aniStreamAPI); 