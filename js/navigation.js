/**
 * AniStream - Navigation
 * Handles tab navigation and basic UI interactions
 */

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});

/**
 * Initialize tab navigation
 */
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Add click event to each tab
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Set the initial tab based on settings
  setInitialTab();
}

/**
 * Set the initial tab based on user settings
 */
async function setInitialTab() {
  try {
    const settings = await window.anistream.getSettings();
    const defaultPage = settings.defaultPage || 'home';
    
    // Find and click the default tab
    const defaultTab = document.querySelector(`.nav-tab[data-tab="${defaultPage}"]`);
    if (defaultTab) {
      defaultTab.click();
    }
  } catch (error) {
    console.error('Failed to load default tab setting:', error);
    // Default to home tab if error occurs
    const homeTab = document.querySelector('.nav-tab[data-tab="home"]');
    if (homeTab) {
      homeTab.click();
    }
  }
}

/**
 * Switch to a specific tab programmatically
 * @param {string} tabName - The name of the tab to switch to
 */
function switchToTab(tabName) {
  const tab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (tab) {
    tab.click();
  }
} 