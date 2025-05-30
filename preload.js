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
  
  addSource: async (sourcePartial) => {
    // Process source URL for completion and validation
    let source = { ...sourcePartial };
    
    // Generate a unique ID if not provided
    if (!source.id) {
      source.id = uuidv4();
    }
    
    // Auto-complete URL if not starting with http:// or https://
    if (source.url && !source.url.match(/^https?:\/\//)) {
      source.url = `https://${source.url}`;
    }
    
    // Add timestamp
    source.addedAt = Date.now();
    
    try {
      const result = await ipcRenderer.invoke('add-source', source);
      return result;
    } catch (e) {
      console.warn('Using mock data for adding source:', e);
      mockStore.sources.push(source);
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
  
  installExtension: async (extensionId, source = 'local') => {
    try {
      const result = await ipcRenderer.invoke('install-extension', { extensionId, source });
      return result;
    } catch (e) {
      console.warn('Using mock data for installing extension:', e);
      // Simulate adding a new extension
      const newExtension = {
        id: extensionId,
        name: `Extension ${extensionId}`,
        version: '1.0.0',
        enabled: true,
        icon: 'https://via.placeholder.com/32.png?text=EXT'
      };
      mockStore.extensions.push(newExtension);
      return newExtension;
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
  
  // Utility functions
  urlToFaviconUrl: (url) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch (e) {
      console.warn('Failed to generate favicon URL:', e);
      return 'assets/images/default-favicon.png';
    }
  },
  
  // Fetch site metadata (title, favicon)
  fetchSiteMetadata: async (url) => {
    // In a real implementation, this would fetch metadata from the site
    // For now, we'll simulate it by checking against our popular sites list
    try {
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (e) {
        // If URL is invalid, try to fix it
        if (!url.match(/^https?:\/\//)) {
          url = `https://${url}`;
          urlObj = new URL(url);
        } else {
          throw e;
        }
      }
      
      const popularSite = popularSites.find(site => 
        url.includes(new URL(site.url).hostname)
      );
      
      if (popularSite) {
        return {
          title: popularSite.title,
          favicon: popularSite.favicon
        };
      }
      
      // If not a known site, just return a basic response
      return {
        title: urlObj.hostname,
        favicon: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
      };
    } catch (error) {
      console.error('Failed to fetch site metadata:', error);
      return { 
        title: url,
        favicon: 'assets/images/default-favicon.png' 
      };
    }
  }
};

// Expose API to renderer process
contextBridge.exposeInMainWorld('anistream', aniStreamAPI); 