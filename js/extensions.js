/**
 * AniStream - Extensions
 * Handles browser extensions management
 */

// Initialize extensions module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initExtensions();
});

// Global extensions state
let extensionsState = [];

/**
 * Initialize the extensions module
 */
async function initExtensions() {
  // Get reference to DOM elements
  const extensionsList = document.getElementById('extensions-list');
  const installExtensionButton = document.getElementById('install-extension-button');
  const browseExtensionButton = document.getElementById('browse-extension-button');
  
  // Load installed extensions
  await loadExtensions();
  
  // Add event listeners
  installExtensionButton.addEventListener('click', showInstallExtensionDialog);
  browseExtensionButton.addEventListener('click', browseExtensionDirectory);
}

/**
 * Load installed extensions
 */
async function loadExtensions() {
  try {
    extensionsState = await window.anistream.getInstalledExtensions();
    renderExtensions();
  } catch (error) {
    console.error('Failed to load extensions:', error);
    extensionsState = [];
  }
}

/**
 * Render extensions list
 */
function renderExtensions() {
  const extensionsList = document.getElementById('extensions-list');
  
  // Clear current content
  extensionsList.innerHTML = '';
  
  // Show empty state if no extensions
  if (extensionsState.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="material-icons">extension</i>
      <p>No extensions installed</p>
      <p class="sub-text">Install extensions like MALSync for anime tracking and uBlock Origin for ad blocking</p>
    `;
    extensionsList.appendChild(emptyState);
    return;
  }
  
  // Create extension items for each extension
  extensionsState.forEach(extension => {
    const extensionItem = createExtensionItem(extension);
    extensionsList.appendChild(extensionItem);
  });
}

/**
 * Create an extension item element
 * @param {Object} extension - Extension object
 * @returns {HTMLElement} Extension item element
 */
function createExtensionItem(extension) {
  // Clone the template
  const template = document.getElementById('extension-item-template');
  const extensionItem = template.content.cloneNode(true).querySelector('.extension-item');
  
  // Set extension data
  extensionItem.dataset.id = extension.id;
  
  // Set extension info
  extensionItem.querySelector('.extension-name').textContent = extension.name;
  extensionItem.querySelector('.extension-version').textContent = `v${extension.version}`;
  
  // Set icon
  let iconUrl = extension.icon;
  if (!iconUrl && extension.icons && extension.icons.length > 0) {
    // Use the largest icon available
    iconUrl = extension.icons[extension.icons.length - 1].url;
  }
  
  if (iconUrl) {
    extensionItem.querySelector('.extension-icon img').src = iconUrl;
  } else {
    extensionItem.querySelector('.extension-icon img').src = 'assets/images/default-extension-icon.png';
  }
  
  extensionItem.querySelector('.extension-icon img').alt = extension.name;
  
  // Set up toggle button
  const toggleBtn = extensionItem.querySelector('.toggle-btn');
  if (extension.enabled) {
    toggleBtn.classList.add('active');
    toggleBtn.title = 'Disable extension';
  } else {
    toggleBtn.classList.remove('active');
    toggleBtn.title = 'Enable extension';
  }
  
  // Add event listeners
  toggleBtn.addEventListener('click', () => {
    toggleExtension(extension.id, !extension.enabled, toggleBtn);
  });
  
  extensionItem.querySelector('.uninstall-btn').addEventListener('click', () => {
    uninstallExtension(extension.id, extensionItem);
  });
  
  return extensionItem;
}

/**
 * Toggle extension enabled state
 * @param {string} extensionId - ID of the extension
 * @param {boolean} enable - Whether to enable or disable
 * @param {HTMLElement} button - Toggle button element
 */
async function toggleExtension(extensionId, enable, button) {
  try {
    // In a real implementation, this would call a method to enable/disable the extension
    // For now, we'll just update our local state
    const extension = extensionsState.find(ext => ext.id === extensionId);
    if (extension) {
      extension.enabled = enable;
      
      // Update button
      if (enable) {
        button.classList.add('active');
        button.title = 'Disable extension';
      } else {
        button.classList.remove('active');
        button.title = 'Enable extension';
      }
      
      showNotification(`Extension ${enable ? 'enabled' : 'disabled'}`, 'success');
    }
  } catch (error) {
    console.error('Failed to toggle extension:', error);
    showNotification('Failed to update extension', 'error');
  }
}

/**
 * Uninstall an extension
 * @param {string} extensionId - ID of the extension to uninstall
 * @param {HTMLElement} item - Extension item element
 */
async function uninstallExtension(extensionId, item) {
  try {
    // Confirm before uninstalling
    if (!confirm('Are you sure you want to uninstall this extension?')) {
      return;
    }
    
    // Show loading state
    const uninstallBtn = item.querySelector('.uninstall-btn');
    uninstallBtn.innerHTML = '<i class="material-icons loading">hourglass_empty</i>';
    uninstallBtn.disabled = true;
    
    // Uninstall extension
    await window.anistream.uninstallExtension(extensionId);
    
    // Remove from local state
    extensionsState = extensionsState.filter(ext => ext.id !== extensionId);
    
    // Remove from DOM with animation
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    
    setTimeout(() => {
      if (item && item.parentNode) {
        item.parentNode.removeChild(item);
      }
      
      // Re-render if no extensions left
      if (extensionsState.length === 0) {
        renderExtensions();
      }
    }, 300);
    
    showNotification('Extension uninstalled successfully', 'success');
  } catch (error) {
    console.error('Failed to uninstall extension:', error);
    showNotification('Failed to uninstall extension', 'error');
    
    // Reset button state
    const uninstallBtn = item.querySelector('.uninstall-btn');
    uninstallBtn.innerHTML = '<i class="material-icons">delete</i>';
    uninstallBtn.disabled = false;
  }
}

/**
 * Browse for extension directory
 */
async function browseExtensionDirectory() {
  try {
    // Call the main process to open a directory dialog
    await window.anistream.openExtensionDirectory();
    
    // Refresh the extensions list after browsing
    setTimeout(async () => {
      await loadExtensions();
    }, 1000);
  } catch (error) {
    console.error('Failed to browse for extensions:', error);
    showNotification('Failed to browse for extensions', 'error');
  }
}

/**
 * Show dialog to install a new extension
 */
function showInstallExtensionDialog() {
  // In a real app, this would show a dialog with options
  const extensionUrl = prompt('Enter the URL or ID of the extension:');
  
  if (extensionUrl) {
    installExtensionFromUrl(extensionUrl);
  }
}

/**
 * Install a new extension from URL or ID
 * @param {string} extensionUrl - URL or ID of the extension
 */
async function installExtensionFromUrl(extensionUrl) {
  try {
    // Show loading notification
    showNotification('Installing extension...', 'info');
    
    // Install extension
    const extension = await window.anistream.installExtension(extensionUrl, 'url');
    
    if (extension) {
      // Add to local state
      extensionsState.push(extension);
      
      // Update UI
      renderExtensions();
      
      showNotification('Extension installed successfully', 'success');
    } else {
      showNotification('Failed to install extension', 'error');
    }
  } catch (error) {
    console.error('Failed to install extension:', error);
    showNotification('Failed to install extension: ' + error.message, 'error');
  }
}

/**
 * Install a new extension from local directory
 * @param {string} extensionPath - Path to the extension
 */
async function installExtensionFromPath(extensionPath) {
  try {
    // Show loading notification
    showNotification('Installing extension...', 'info');
    
    // Install extension
    const extension = await window.anistream.installExtension(extensionPath, 'local');
    
    if (extension) {
      // Add to local state
      extensionsState.push(extension);
      
      // Update UI
      renderExtensions();
      
      showNotification('Extension installed successfully', 'success');
    } else {
      showNotification('Failed to install extension', 'error');
    }
  } catch (error) {
    console.error('Failed to install extension:', error);
    showNotification('Failed to install extension: ' + error.message, 'error');
  }
}

/**
 * Show a notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Use global notification system if available
  if (window.showNotification) {
    window.showNotification(message, type);
    return;
  }
  
  // Simple console notification fallback
  console.log(`Notification (${type}): ${message}`);
} 