/**
 * AniStream - Settings
 * Handles application settings and theme
 */

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
});

// Global settings state
let settingsState = {};

/**
 * Initialize the settings module
 */
async function initSettings() {
  try {
    // Load settings from storage
    settingsState = await window.anistream.getSettings();
    
    // Apply initial theme
    applyTheme(settingsState.theme || 'dark');
    
    // Set up settings form
    setupSettingsForm();
  } catch (error) {
    console.error('Failed to initialize settings:', error);
    // Set default settings
    settingsState = {
      theme: 'dark',
      autoPlayNext: true,
      defaultPage: 'home'
    };
    
    // Apply default theme
    applyTheme('dark');
  }
}

/**
 * Set up settings form elements and listeners
 */
function setupSettingsForm() {
  // Theme selector
  const themeSelect = document.getElementById('theme-select');
  themeSelect.value = settingsState.theme || 'dark';
  themeSelect.addEventListener('change', () => {
    const newTheme = themeSelect.value;
    applyTheme(newTheme);
    updateSetting('theme', newTheme);
  });
  
  // Auto-play next
  const autoPlayNext = document.getElementById('auto-play-next');
  autoPlayNext.checked = settingsState.autoPlayNext !== false;
  autoPlayNext.addEventListener('change', () => {
    updateSetting('autoPlayNext', autoPlayNext.checked);
  });
  
  // Default page
  const defaultPage = document.getElementById('default-page');
  defaultPage.value = settingsState.defaultPage || 'home';
  defaultPage.addEventListener('change', () => {
    updateSetting('defaultPage', defaultPage.value);
  });
}

/**
 * Apply theme to the application
 * @param {string} theme - Theme name (light, dark, system)
 */
function applyTheme(theme) {
  const body = document.body;
  
  if (theme === 'system') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.dataset.theme = prefersDark ? 'dark' : 'light';
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (settingsState.theme === 'system') {
        body.dataset.theme = e.matches ? 'dark' : 'light';
      }
    });
  } else {
    body.dataset.theme = theme;
  }
}

/**
 * Update a single setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
async function updateSetting(key, value) {
  try {
    // Update local state
    settingsState[key] = value;
    
    // Save to storage
    await window.anistream.updateSettings(settingsState);
    
    showNotification('Settings updated', 'success');
  } catch (error) {
    console.error('Failed to update setting:', error);
    showNotification('Failed to save settings', 'error');
  }
}

/**
 * Show a notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Simple console notification for now
  console.log(`Notification (${type}): ${message}`);
  
  // In a real app, you would show a UI notification
  // This could be implemented with a toast or notification system
} 