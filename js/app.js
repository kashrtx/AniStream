// Main application logic for AniStream

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Global application state
const appState = {
  sources: [],
  history: [],
  favorites: [],
  currentAnime: null,
  settings: {
    theme: 'dark',
    malSyncEnabled: true,
    adBlockEnabled: true,
    downloadPath: ''
  }
};

// Initialize the application
async function initApp() {
  // Load user data from store
  await loadUserData();
  
  // Initialize UI components
  initUI();
  
  // Apply theme
  applyTheme(appState.settings.theme);
  
  // Populate UI with data
  updateHomeTab();
  updateSourcesTab();
  
  // Setup event listeners
  setupEventListeners();
}

// Load user data from electron store
async function loadUserData() {
  try {
    // Load sources
    const sources = await window.api.getStoreValue('sources');
    if (sources) appState.sources = sources;
    
    // Load history
    const history = await window.api.getStoreValue('history');
    if (history) appState.history = history;
    
    // Load favorites
    const favorites = await window.api.getStoreValue('favorites');
    if (favorites) appState.favorites = favorites;
    
    // Load settings
    const settings = await window.api.getStoreValue('settings');
    if (settings) appState.settings = settings;
    
    // Set download path in UI
    if (appState.settings.downloadPath) {
      document.getElementById('download-path').value = appState.settings.downloadPath;
    }
    
    console.log('User data loaded successfully');
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Setup global event listeners
function setupEventListeners() {
  // Window control buttons
  document.getElementById('minimize-button').addEventListener('click', () => {
    // Using Electron IPC to minimize window
  });
  
  document.getElementById('maximize-button').addEventListener('click', () => {
    // Using Electron IPC to maximize/restore window
  });
  
  document.getElementById('close-button').addEventListener('click', () => {
    // Using Electron IPC to close window
  });
  
  // Settings form events
  document.getElementById('mal-sync-toggle').addEventListener('change', (e) => {
    appState.settings.malSyncEnabled = e.target.checked;
    saveSettings();
  });
  
  document.getElementById('adblock-toggle').addEventListener('change', (e) => {
    appState.settings.adBlockEnabled = e.target.checked;
    saveSettings();
  });
  
  document.getElementById('theme-select').addEventListener('change', (e) => {
    const theme = e.target.value;
    appState.settings.theme = theme;
    applyTheme(theme);
    saveSettings();
  });
  
  document.getElementById('browse-button').addEventListener('click', async () => {
    const path = await window.api.chooseDirectory();
    if (path) {
      document.getElementById('download-path').value = path;
      appState.settings.downloadPath = path;
      saveSettings();
    }
  });
  
  // Backup and restore
  document.getElementById('export-button').addEventListener('click', async () => {
    try {
      const success = await window.api.exportData();
      if (success) {
        showToast('Data exported successfully');
      } else {
        showToast('Failed to export data', 'error');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('Error exporting data', 'error');
    }
  });
  
  document.getElementById('import-button').addEventListener('click', async () => {
    try {
      const success = await window.api.importData();
      if (success) {
        showToast('Data imported successfully');
        // Reload application with new data
        window.location.reload();
      } else {
        showToast('Failed to import data', 'error');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      showToast('Error importing data', 'error');
    }
  });
  
  // MAL login
  document.getElementById('mal-login-button').addEventListener('click', () => {
    // Handle MAL authentication (open settings)
    if (window.openMalSyncSettings) {
      window.openMalSyncSettings();
    } else {
      showToast('MALSync settings not available', 'error');
    }
  });
  
  // Update button
  document.getElementById('update-button').addEventListener('click', () => {
    try {
      window.api.installUpdate();
    } catch (error) {
      console.error('Error installing update:', error);
    }
  });
  
  // Event listeners for update notifications
  try {
    if (window.api.onUpdateAvailable) {
      window.api.onUpdateAvailable(() => {
        document.getElementById('update-button').classList.remove('hidden');
      });
    }
    
    if (window.api.onUpdateDownloaded) {
      window.api.onUpdateDownloaded(() => {
        document.getElementById('update-button').textContent = 'Install Update';
      });
    }
  } catch (error) {
    console.error('Error setting up update listeners:', error);
  }
}

// Apply theme to the application
function applyTheme(theme) {
  if (theme === 'system') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  // Update theme selector
  document.getElementById('theme-select').value = theme;
}

// Save settings to store
async function saveSettings() {
  try {
    await window.api.setStoreValue('settings', appState.settings);
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Update the home tab with recent and favorite anime
function updateHomeTab() {
  const continueWatchingGrid = document.getElementById('continue-watching-grid');
  const favoritesGrid = document.getElementById('favorites-grid');
  
  // Clear existing content
  continueWatchingGrid.innerHTML = '';
  favoritesGrid.innerHTML = '';
  
  // Sort history by last watched time (most recent first)
  const sortedHistory = [...appState.history].sort((a, b) => {
    return new Date(b.lastWatched) - new Date(a.lastWatched);
  });
  
  // Limit to the 12 most recent
  const recentAnime = sortedHistory.slice(0, 12);
  
  if (recentAnime.length > 0) {
    recentAnime.forEach(anime => {
      continueWatchingGrid.appendChild(createAnimeCard(anime));
    });
  } else {
    continueWatchingGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-film"></i>
        <p>Your recently watched anime will appear here</p>
      </div>
    `;
  }
  
  if (appState.favorites.length > 0) {
    appState.favorites.forEach(anime => {
      favoritesGrid.appendChild(createAnimeCard(anime));
    });
  } else {
    favoritesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-heart"></i>
        <p>Your favorite anime will appear here</p>
      </div>
    `;
  }
}

// Update the sources tab
function updateSourcesTab() {
  const sourcesList = document.getElementById('sources-list');
  
  // Clear existing content
  sourcesList.innerHTML = '';
  
  if (appState.sources.length > 0) {
    appState.sources.forEach(source => {
      sourcesList.appendChild(createSourceCard(source));
    });
  } else {
    sourcesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-server"></i>
        <p>No sources added yet</p>
        <button id="add-first-source-button" class="action-button">
          <i class="fas fa-plus"></i>
          <span>Add Your First Source</span>
        </button>
      </div>
    `;
    
    // Add event listener for the "Add First Source" button
    setTimeout(() => {
      const addFirstSourceButton = document.getElementById('add-first-source-button');
      if (addFirstSourceButton) {
        addFirstSourceButton.addEventListener('click', () => {
          document.getElementById('add-source-modal').classList.add('show');
        });
      }
    }, 0);
  }
}

// Create an anime card element
function createAnimeCard(anime) {
  const card = document.createElement('div');
  card.className = 'anime-card';
  card.dataset.id = anime.id;
  
  const isFavorite = appState.favorites.some(fav => fav.id === anime.id);
  
  card.innerHTML = `
    <div class="anime-favorite ${isFavorite ? 'active' : ''}" data-id="${anime.id}">
      <i class="fas fa-heart"></i>
    </div>
    <img src="${anime.image || 'assets/placeholder.jpg'}" alt="${anime.title}" class="anime-poster">
    <div class="anime-info">
      <div class="anime-title">${anime.title}</div>
      <div class="anime-progress">Episode ${anime.currentEpisode || 0}/${anime.totalEpisodes || '?'}</div>
    </div>
  `;
  
  // Add event listener to open anime details
  card.addEventListener('click', (e) => {
    // Ignore clicks on the favorite button
    if (!e.target.closest('.anime-favorite')) {
      openAnimeDetails(anime);
    }
  });
  
  // Add event listener for favorite button
  const favoriteBtn = card.querySelector('.anime-favorite');
  favoriteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(anime);
    favoriteBtn.classList.toggle('active');
  });
  
  return card;
}

// Create a source card element
function createSourceCard(source) {
  const card = document.createElement('div');
  card.className = 'source-card';
  card.dataset.id = source.id;
  
  card.innerHTML = `
    <div class="source-info">
      <img src="${source.icon || getFavicon(source.url)}" alt="${source.name}" class="source-icon">
      <div>
        <div class="source-name">${source.name}</div>
        <div class="source-url">${source.url}</div>
      </div>
    </div>
    <div class="source-actions">
      <button class="source-action-button browse" title="Browse this source">
        <i class="fas fa-globe"></i>
      </button>
      <button class="source-action-button edit" title="Edit source">
        <i class="fas fa-edit"></i>
      </button>
      <button class="source-action-button delete" title="Delete source">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  
  // Add event listeners for action buttons
  const browseBtn = card.querySelector('.source-action-button.browse');
  browseBtn.addEventListener('click', () => {
    browseSource(source);
  });
  
  const editBtn = card.querySelector('.source-action-button.edit');
  editBtn.addEventListener('click', () => {
    editSource(source);
  });
  
  const deleteBtn = card.querySelector('.source-action-button.delete');
  deleteBtn.addEventListener('click', () => {
    deleteSource(source);
  });
  
  return card;
}

// Get favicon for a URL
function getFavicon(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch (e) {
    return 'assets/default-favicon.png';
  }
}

// Toggle favorite status
async function toggleFavorite(anime) {
  const index = appState.favorites.findIndex(a => a.id === anime.id);
  
  if (index >= 0) {
    // Remove from favorites
    appState.favorites.splice(index, 1);
  } else {
    // Add to favorites
    appState.favorites.push(anime);
  }
  
  // Save to store
  await window.api.setStoreValue('favorites', appState.favorites);
  
  // Update UI
  updateHomeTab();
}

// Open anime details modal
function openAnimeDetails(anime) {
  appState.currentAnime = anime;
  
  const modal = document.getElementById('anime-details-modal');
  const modalBody = modal.querySelector('.anime-details-body');
  
  // Populate modal with anime details
  modalBody.innerHTML = `
    <div class="anime-detail-header">
      <img src="${anime.backdrop || anime.image || 'assets/placeholder-wide.jpg'}" class="anime-backdrop">
    </div>
    <div class="anime-detail-info">
      <img src="${anime.image || 'assets/placeholder.jpg'}" class="anime-poster-large">
      <div class="anime-detail-text">
        <h2 class="anime-detail-title">${anime.title}</h2>
        <div class="anime-meta">
          <span><i class="fas fa-star"></i> ${anime.rating || '?'}</span>
          <span><i class="fas fa-calendar"></i> ${anime.year || '?'}</span>
          <span><i class="fas fa-clock"></i> ${anime.duration || '?'}</span>
          <span><i class="fas fa-closed-captioning"></i> ${anime.type || 'TV'}</span>
        </div>
        <p class="anime-description">${anime.description || 'No description available.'}</p>
        <div class="anime-actions">
          <button class="action-button" id="resume-watching">
            <i class="fas fa-play"></i>
            <span>Resume Ep ${anime.currentEpisode || 1}</span>
          </button>
          <button class="action-button" id="add-to-mal" ${appState.settings.malSyncEnabled ? '' : 'disabled'}>
            <i class="fas fa-sync"></i>
            <span>Update MAL</span>
          </button>
        </div>
      </div>
    </div>
    <div class="episode-list">
      <div class="episode-list-header">
        <div class="episode-list-title">Episodes</div>
        <div class="episode-count">${anime.totalEpisodes || '?'} total</div>
      </div>
      <div class="episode-grid" id="episode-grid">
        ${generateEpisodeButtons(anime)}
      </div>
    </div>
  `;
  
  // Add event listeners for buttons
  setTimeout(() => {
    const resumeBtn = document.getElementById('resume-watching');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        watchEpisode(anime, anime.currentEpisode || 1);
      });
    }
    
    const malBtn = document.getElementById('add-to-mal');
    if (malBtn) {
      malBtn.addEventListener('click', () => {
        updateMAL(anime);
      });
    }
    
    // Add event listeners for episode buttons
    const episodeButtons = document.querySelectorAll('.episode-button');
    episodeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const episode = parseInt(button.dataset.episode);
        watchEpisode(anime, episode);
      });
    });
  }, 0);
  
  // Show the modal
  modal.classList.add('show');
  
  // Add event listener for close button
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// Generate episode buttons
function generateEpisodeButtons(anime) {
  const totalEpisodes = anime.totalEpisodes || 12; // Default to 12 if unknown
  let buttonsHtml = '';
  
  for (let i = 1; i <= totalEpisodes; i++) {
    const isWatched = anime.watchedEpisodes && anime.watchedEpisodes.includes(i);
    const isCurrent = i === anime.currentEpisode;
    
    buttonsHtml += `
      <button class="episode-button ${isWatched ? 'watched' : ''} ${isCurrent ? 'current' : ''}" data-episode="${i}">
        ${i}
      </button>
    `;
  }
  
  return buttonsHtml;
}

// Watch an episode
async function watchEpisode(anime, episode) {
  try {
    // Close any open modals
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
    
    // Show loading indicator
    showToast('Loading episode...', 'info');
    
    // If we don't have a source for this anime yet, prompt user to select one
    if (!anime.source && appState.sources.length > 0) {
      const sourceSelection = await showSourceSelectionDialog();
      if (sourceSelection) {
        anime.source = sourceSelection;
      } else {
        showToast('No source selected', 'error');
        return;
      }
    } else if (!anime.source && appState.sources.length === 0) {
      showToast('Please add a source first', 'error');
      document.getElementById('sources-tab').click();
      return;
    }
    
    // Find the source in our sources list
    const source = appState.sources.find(s => s.id === anime.source);
    if (!source) {
      showToast('Source not found', 'error');
      return;
    }
    
    // Get the episode URL
    let episodeUrl;
    if (anime.episodeUrls && anime.episodeUrls[episode]) {
      // Use cached URL if available
      episodeUrl = anime.episodeUrls[episode];
    } else {
      // Otherwise attempt to search for it
      episodeUrl = await searchEpisode(source, anime, episode);
      
      // Cache the URL for future use
      if (!anime.episodeUrls) anime.episodeUrls = {};
      anime.episodeUrls[episode] = episodeUrl;
    }
    
    if (!episodeUrl) {
      showToast('Episode not found', 'error');
      return;
    }
    
    // Browse to the episode
    await window.api.browse(episodeUrl, {
      adBlock: appState.settings.adBlockEnabled,
      autoDetect: source.autoDetect
    });
    
    // Update watch history
    updateWatchHistory(anime, episode);
    
    // Update MAL if enabled
    if (appState.settings.malSyncEnabled) {
      updateMAL(anime, episode);
    }
  } catch (error) {
    console.error('Error watching episode:', error);
    showToast('Error playing episode', 'error');
  }
}

// Update watch history
async function updateWatchHistory(anime, episode) {
  // Find anime in history
  const index = appState.history.findIndex(a => a.id === anime.id);
  
  // Update or add to history
  if (index >= 0) {
    // Update existing entry
    appState.history[index].currentEpisode = episode;
    appState.history[index].lastWatched = new Date().toISOString();
    
    // Add to watched episodes if not already there
    if (!appState.history[index].watchedEpisodes) {
      appState.history[index].watchedEpisodes = [];
    }
    if (!appState.history[index].watchedEpisodes.includes(episode)) {
      appState.history[index].watchedEpisodes.push(episode);
    }
  } else {
    // Add new entry
    const historyEntry = {
      ...anime,
      currentEpisode: episode,
      lastWatched: new Date().toISOString(),
      watchedEpisodes: [episode]
    };
    appState.history.push(historyEntry);
  }
  
  // Save to store
  await window.api.setStoreValue('history', appState.history);
  
  // Update UI
  updateHomeTab();
}

// Search for an episode
async function searchEpisode(source, anime, episode) {
  // This is a placeholder - actual implementation would depend on the source
  // For now, we'll just build a URL based on common patterns
  
  try {
    // If the source has auto-detect enabled, we can try to find the episode
    if (source.autoDetect) {
      // First, search for the anime
      const searchUrl = `${source.url}/search?keyword=${encodeURIComponent(anime.title)}`;
      
      // Extract anime URL from search results
      const animePageUrl = await window.api.extractAnimeInfo(searchUrl);
      
      if (animePageUrl) {
        // Then navigate to the episode
        return `${animePageUrl}/episode-${episode}`;
      }
    }
    
    // Fallback: try some common URL patterns
    const slug = anime.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    const patterns = [
      `${source.url}/anime/${slug}/episode-${episode}`,
      `${source.url}/watch/${slug}-episode-${episode}`,
      `${source.url}/${slug}-episode-${episode}`
    ];
    
    // Return the first pattern (in real implementation, we would check which one works)
    return patterns[0];
  } catch (error) {
    console.error('Error searching for episode:', error);
    return null;
  }
}

// Update MAL
async function updateMAL(anime, episode) {
  if (!appState.settings.malSyncEnabled) return;
  
  try {
    // Show loading indicator
    showToast('Updating MAL...', 'info');
    
    // Try to use the MALSync API directly if available
    if (window.updateAnimeStatus) {
      // Prepare data for MAL update
      const updateData = {
        animeId: anime.malId,
        episode: episode || anime.currentEpisode || 1,
        status: 'watching'
      };
      
      const result = await window.updateAnimeStatus(updateData);
      
      if (result.success) {
        showToast('MAL updated successfully', 'success');
      } else {
        showToast(result.message || 'Failed to update MAL', 'error');
      }
      return;
    }
    
    // Fallback to our API if MALSync is not available
    const updateData = {
      animeId: anime.malId,
      episode: episode || anime.currentEpisode || 1,
      status: 'watching'
    };
    
    // Call MAL update API
    const result = await window.api.updateMAL(updateData);
    
    if (result.success) {
      showToast('MAL updated successfully', 'success');
    } else {
      showToast('Failed to update MAL', 'error');
    }
  } catch (error) {
    console.error('Error updating MAL:', error);
    showToast('Error updating MAL', 'error');
  }
}

// Show a source selection dialog
function showSourceSelectionDialog() {
  return new Promise((resolve) => {
    // Create a modal dialog for source selection
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Select Source</h2>
          <button class="close-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>Select a source to watch this anime:</p>
          <div class="source-selection-list">
            ${appState.sources.map(source => `
              <div class="source-selection-item" data-id="${source.id}">
                <img src="${source.icon || getFavicon(source.url)}" alt="${source.name}" class="source-icon">
                <span>${source.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel-source-selection" class="cancel-button">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });
    
    const cancelBtn = document.getElementById('cancel-source-selection');
    cancelBtn.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });
    
    const sourceItems = modal.querySelectorAll('.source-selection-item');
    sourceItems.forEach(item => {
      item.addEventListener('click', () => {
        const sourceId = item.dataset.id;
        modal.remove();
        resolve(sourceId);
      });
    });
  });
}

// Show a toast notification
function showToast(message, type = 'success') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Show animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Get icon for toast type
function getToastIcon(type) {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info': return 'fa-info-circle';
    default: return 'fa-info-circle';
  }
}

// Browse a source
function browseSource(source) {
  window.api.browse(source.url, {
    adBlock: appState.settings.adBlockEnabled,
    autoDetect: source.autoDetect
  });
}

// Edit a source
function editSource(source) {
  // Populate the add source modal with the source data
  document.getElementById('source-name').value = source.name;
  document.getElementById('source-url').value = source.url;
  document.getElementById('source-auto-detect').checked = source.autoDetect;
  
  // Show the modal
  document.getElementById('add-source-modal').classList.add('show');
  
  // Store the source ID for updating
  document.getElementById('add-source-modal').dataset.editId = source.id;
}

// Delete a source
async function deleteSource(source) {
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete the source "${source.name}"?`)) {
    return;
  }
  
  // Remove the source
  const index = appState.sources.findIndex(s => s.id === source.id);
  if (index >= 0) {
    appState.sources.splice(index, 1);
    
    // Save to store
    await window.api.setStoreValue('sources', appState.sources);
    
    // Update UI
    updateSourcesTab();
    
    showToast(`Source "${source.name}" deleted`);
  }
}

// Export functions for use in other modules
window.appState = appState;
window.updateHomeTab = updateHomeTab;
window.updateSourcesTab = updateSourcesTab;
window.createAnimeCard = createAnimeCard;
window.createSourceCard = createSourceCard;
window.openAnimeDetails = openAnimeDetails;
window.showToast = showToast; 