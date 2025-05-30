// MAL Sync functionality for AniStream
const MAL_SYNC_USER_SCRIPT_PATH = '../MAL-Sync-0.12.0.user.js';

// Initialize MAL Sync module
document.addEventListener('DOMContentLoaded', () => {
  // Initialize MALSync 
  initMalSync();
  
  // Check MAL sync status on load
  checkMalSyncStatus();
});

// Initialize MALSync by integrating the userscript
async function initMalSync() {
  try {
    // Check if MALSync is already loaded
    if (window.MALSync) {
      console.log('MALSync already initialized');
      return;
    }
    
    // Create a script element to load the MALSync userscript
    const script = document.createElement('script');
    script.src = MAL_SYNC_USER_SCRIPT_PATH;
    script.id = 'mal-sync-script';
    script.onload = () => {
      console.log('MALSync script loaded successfully');
    };
    script.onerror = (error) => {
      console.error('Error loading MALSync script:', error);
    };
    
    // Append the script to the document
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error initializing MALSync:', error);
  }
}

// Check if MAL Sync is enabled and initialized
async function checkMalSyncStatus() {
  try {
    // Get settings
    const settings = await window.api.getStoreValue('settings');
    
    // Update UI based on settings
    if (settings && settings.malSyncEnabled) {
      document.getElementById('mal-sync-toggle').checked = true;
      updateMalLoginUI(true);
    } else {
      document.getElementById('mal-sync-toggle').checked = false;
      updateMalLoginUI(false);
    }
  } catch (error) {
    console.error('Error checking MAL sync status:', error);
  }
}

// Update the MAL login UI
function updateMalLoginUI(isEnabled) {
  const loginButton = document.getElementById('mal-login-button');
  
  if (isEnabled) {
    loginButton.innerHTML = '<i class="fas fa-cog"></i><span>MALSync Settings</span>';
    loginButton.classList.add('enabled');
    
    // Change event handler to open MALSync settings
    loginButton.onclick = () => {
      openMalSyncSettings();
    };
  } else {
    loginButton.innerHTML = '<i class="fas fa-toggle-on"></i><span>Enable MALSync</span>';
    loginButton.classList.remove('enabled');
    
    // Change event handler to enable MALSync
    loginButton.onclick = () => {
      enableMalSync();
    };
  }
}

// Enable MAL Sync
async function enableMalSync() {
  try {
    // Update settings
    const settings = await window.api.getStoreValue('settings') || {};
    settings.malSyncEnabled = true;
    await window.api.setStoreValue('settings', settings);
    
    // Initialize MALSync
    await initMalSync();
    
    // Update UI
    updateMalLoginUI(true);
    
    window.showToast('MALSync enabled', 'success');
  } catch (error) {
    console.error('Error enabling MALSync:', error);
    window.showToast('Failed to enable MALSync', 'error');
  }
}

// Open MALSync settings dialog
function openMalSyncSettings() {
  // Create a modal dialog for MALSync settings
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>MALSync Settings</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="setting-item">
          <div class="setting-label">
            <span>Tracking Service</span>
            <p class="setting-description">Choose your anime tracking service</p>
          </div>
          <div class="setting-control">
            <select id="tracking-service" class="settings-select">
              <option value="myanimelist">MyAnimeList</option>
              <option value="anilist">AniList</option>
              <option value="kitsu">Kitsu</option>
              <option value="simkl">Simkl</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span>Auto Tracking</span>
            <p class="setting-description">Automatically update your list when watching anime</p>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="auto-tracking" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <button id="open-malsync-auth" class="action-button">
            <i class="fas fa-user"></i>
            <span>Login to Service</span>
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button id="save-malsync-settings" class="action-button">Save Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.add('show');
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  });
  
  const saveBtn = modal.querySelector('#save-malsync-settings');
  saveBtn.addEventListener('click', async () => {
    const trackingService = document.getElementById('tracking-service').value;
    const autoTracking = document.getElementById('auto-tracking').checked;
    
    // Save MALSync settings
    const malSyncSettings = {
      service: trackingService,
      autoTracking: autoTracking
    };
    
    await window.api.setStoreValue('malSyncSettings', malSyncSettings);
    window.showToast('MALSync settings saved', 'success');
    
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  });
  
  const authBtn = modal.querySelector('#open-malsync-auth');
  authBtn.addEventListener('click', () => {
    const service = document.getElementById('tracking-service').value;
    let authUrl = '';
    
    // Determine auth URL based on service
    switch (service) {
      case 'myanimelist':
        authUrl = 'https://myanimelist.net/login.php';
        break;
      case 'anilist':
        authUrl = 'https://anilist.co/api/v2/oauth/authorize';
        break;
      case 'kitsu':
        authUrl = 'https://kitsu.io/explore/anime';
        break;
      case 'simkl':
        authUrl = 'https://simkl.com/oauth/authorize';
        break;
      default:
        authUrl = 'https://myanimelist.net/login.php';
    }
    
    window.api.openExternal(authUrl);
  });
}

// Search anime using MALSync
async function searchAnime(query) {
  try {
    // Check if MAL sync is enabled
    const settings = await window.api.getStoreValue('settings');
    if (!settings || !settings.malSyncEnabled) {
      return [];
    }
    
    // Use MALSync API for search if available
    if (window.MALSync && window.MALSync.search) {
      return window.MALSync.search(query);
    }
    
    // Fallback to Jikan API
    const results = await window.api.searchMAL(query);
    return results || [];
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
}

// Get anime details using MALSync
async function getAnimeDetails(id) {
  try {
    // Check if MAL sync is enabled
    const settings = await window.api.getStoreValue('settings');
    if (!settings || !settings.malSyncEnabled) {
      return null;
    }
    
    // Use MALSync API for details if available
    if (window.MALSync && window.MALSync.getAnime) {
      return window.MALSync.getAnime(id);
    }
    
    // Fallback to Jikan API
    const details = await window.api.getMALAnimeDetails(id);
    return details;
  } catch (error) {
    console.error('Error getting anime details:', error);
    return null;
  }
}

// Update anime status using MALSync
async function updateAnimeStatus(data) {
  try {
    // Check if MAL sync is enabled
    const settings = await window.api.getStoreValue('settings');
    if (!settings || !settings.malSyncEnabled) {
      return { success: false, message: 'MALSync is disabled' };
    }
    
    // Use MALSync API for updating if available
    if (window.MALSync && window.MALSync.setStatus) {
      return window.MALSync.setStatus(data);
    }
    
    // Fallback to our own API
    const result = await window.api.updateMAL(data);
    return result;
  } catch (error) {
    console.error('Error updating anime status:', error);
    return { success: false, message: 'Error updating status' };
  }
}

// Export MAL functions for use in other modules
window.searchAnime = searchAnime;
window.getAnimeDetails = getAnimeDetails;
window.updateAnimeStatus = updateAnimeStatus; 