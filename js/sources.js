// Source management module for AniStream

// Default anime sources that are known to work
const DEFAULT_SOURCES = [
  {
    id: 'animepahe',
    name: 'AnimePahe',
    url: 'https://animepahe.ru',
    autoDetect: true,
    icon: 'https://animepahe.ru/favicon.ico'
  },
  {
    id: 'hianime',
    name: 'HiAnime',
    url: 'https://hianime.to',
    autoDetect: true,
    icon: 'https://hianime.to/favicon.ico'
  },
  {
    id: 'gogoanime',
    name: 'GogoAnime',
    url: 'https://gogoanime.cl',
    autoDetect: true,
    icon: 'https://gogoanime.cl/favicon.ico'
  }
];

// Predefined sites with their information
const PREDEFINED_SITES = {
  // AnimePahe
  'animepahe.ru': {
    name: 'AnimePahe',
    icon: 'https://animepahe.ru/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.anime-title', 'title'],
      episodeSelectors: ['.episode-title', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  'animepahe.com': {
    name: 'AnimePahe',
    icon: 'https://animepahe.com/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.anime-title', 'title'],
      episodeSelectors: ['.episode-title', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // HiAnime
  'hianime.to': {
    name: 'HiAnime',
    icon: 'https://hianime.to/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.anime-name', 'title'],
      episodeSelectors: ['.episode-info', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // GogoAnime
  'gogoanime.cl': {
    name: 'GogoAnime',
    icon: 'https://gogoanime.cl/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.anime_info_body_bg h1', 'title'],
      episodeSelectors: ['.episode_page .active a', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // 9anime
  '9anime.to': {
    name: '9anime',
    icon: 'https://9anime.to/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.title', 'title'],
      episodeSelectors: ['.episodes .active', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // Zoro
  'zoro.to': {
    name: 'Zoro.to',
    icon: 'https://zoro.to/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.film-name', 'title'],
      episodeSelectors: ['.ssl-item.ep-item.active', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // Crunchyroll
  'crunchyroll.com': {
    name: 'Crunchyroll',
    icon: 'https://www.crunchyroll.com/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.show-title', 'title'],
      episodeSelectors: ['.episode-title', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // Animefever
  'animefever.tv': {
    name: 'AnimeFever',
    icon: 'https://animefever.tv/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.anime-title', 'title'],
      episodeSelectors: ['.episode-title', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  },
  // AnimeHeaven
  'animeheaven.ru': {
    name: 'AnimeHeaven',
    icon: 'https://animeheaven.ru/favicon.ico',
    autoDetect: true,
    patterns: {
      titleSelectors: ['.title', 'title'],
      episodeSelectors: ['.episode', 'title'],
      episodeRegex: /episode\s*(\d+)/i
    }
  }
};

// Initialize sources module
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Add default sources if none exist
    addDefaultSources();

    // Add source form event listeners
    setupSourceFormEvents();
  } catch (error) {
    console.error('Error initializing sources module:', error);
  }
});

// Add default sources if none exist
async function addDefaultSources() {
  try {
    // Check if API is available
    if (!window.api || !window.api.getStoreValue) {
      console.error('API not available for sources module');
      // Initialize with default sources in memory
      window.appState = window.appState || {};
      window.appState.sources = DEFAULT_SOURCES;
      return;
    }
    
    // Get current sources
    const sources = await window.api.getStoreValue('sources');
    
    // If no sources, add defaults
    if (!sources || sources.length === 0) {
      // Try to save to store if API available
      if (window.api.setStoreValue) {
        await window.api.setStoreValue('sources', DEFAULT_SOURCES);
      }
      
      // Update app state
      window.appState = window.appState || {};
      window.appState.sources = DEFAULT_SOURCES;
      
      // Update UI
      if (window.updateSourcesTab) {
        window.updateSourcesTab();
      }
      
      console.log('Added default sources');
    }
  } catch (error) {
    console.error('Error adding default sources:', error);
    
    // Fall back to memory-only sources
    window.appState = window.appState || {};
    window.appState.sources = DEFAULT_SOURCES;
    
    // Update UI
    if (window.updateSourcesTab) {
      window.updateSourcesTab();
    }
  }
}

// Setup event listeners for the source form
function setupSourceFormEvents() {
  try {
    // When the source URL is entered, try to auto-detect the site info
    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'source-url') {
        autoDetectSourceInfo(event.target.value);
      }
    });
  } catch (error) {
    console.error('Error setting up source form events:', error);
  }
}

// Auto-detect source information based on URL
async function autoDetectSourceInfo(url) {
  if (!url) return;
  
  try {
    // Extract the hostname
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Look for the hostname in predefined sites
    const siteInfo = PREDEFINED_SITES[hostname];
    if (siteInfo) {
      // Auto-fill the form with the predefined info
      document.getElementById('source-name').value = siteInfo.name;
      document.getElementById('source-auto-detect').checked = siteInfo.autoDetect;
      
      // Notify user
      window.showToast(`Source "${siteInfo.name}" detected automatically`, 'success');
    } else {
      // Try to fetch the site's favicon and title
      await fetchSiteInfo(url);
    }
  } catch (error) {
    console.error('Error auto-detecting source info:', error);
  }
}

// Fetch site information (favicon, title) using fetch or puppeteer
async function fetchSiteInfo(url) {
  try {
    // Extract domain for default name
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Set a default name based on the domain
    const defaultName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    document.getElementById('source-name').value = defaultName;
    
    // Notify user that we'll try to fetch the site info
    window.showToast('Fetching site information...', 'info');
    
    // Get site info using puppeteer
    const animeInfo = await window.api.extractAnimeInfo(url);
    
    if (animeInfo && animeInfo.title) {
      // Update the name if we got a better one
      document.getElementById('source-name').value = animeInfo.title;
      window.showToast('Site information fetched successfully', 'success');
    }
  } catch (error) {
    console.error('Error fetching site info:', error);
    window.showToast('Could not fetch site information', 'warning');
  }
}

// Get patterns for anime detection based on the source
function getAnimeDetectionPatterns(source) {
  // First check if we have predefined patterns for this source
  try {
    const hostname = new URL(source.url).hostname;
    if (PREDEFINED_SITES[hostname] && PREDEFINED_SITES[hostname].patterns) {
      return PREDEFINED_SITES[hostname].patterns;
    }
  } catch (e) {
    console.error('Error getting hostname:', e);
  }
  
  // Common patterns for anime sites
  const commonPatterns = {
    titleSelectors: [
      'h1.anime-title',
      'h1.title',
      '.anime-title',
      '.title',
      'meta[property="og:title"]',
      'title'
    ],
    episodeSelectors: [
      '.episode-number',
      '.episode',
      '.ep-num',
      'span:contains("Episode")',
      'title'
    ],
    episodeRegex: /episode\s*(\d+)/i
  };
  
  return commonPatterns;
}

// Get source information based on URL
function getSourceInfoFromUrl(url) {
  if (!url) return null;
  
  try {
    // Parse URL to get hostname
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if we have predefined info for this hostname
    if (PREDEFINED_SITES[hostname]) {
      return {
        name: PREDEFINED_SITES[hostname].name,
        icon: PREDEFINED_SITES[hostname].icon,
        autoDetect: PREDEFINED_SITES[hostname].autoDetect
      };
    }
    
    // If not, create default info
    return {
      name: hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1),
      icon: `${urlObj.protocol}//${hostname}/favicon.ico`,
      autoDetect: true
    };
  } catch (error) {
    console.error('Error getting source info from URL:', error);
    return null;
  }
}

// Export functions for use in other modules
window.getAnimeDetectionPatterns = getAnimeDetectionPatterns;
window.getSourceInfoFromUrl = getSourceInfoFromUrl; 