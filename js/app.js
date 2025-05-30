/**
 * AniStream - Main App
 * Entry point for the application
 */

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * Initialize the application
 */
function initApp() {
  // Set up notification system
  setupNotifications();
  
  // Set up keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Create default assets
  createDefaultAssets();
}

/**
 * Set up the notification system
 */
function setupNotifications() {
  // Create notification container if it doesn't exist
  if (!document.getElementById('notification-container')) {
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Define global showNotification function
    window.showNotification = (message, type = 'info') => {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      
      // Create notification content
      notification.innerHTML = `
        <div class="notification-content">
          <i class="material-icons notification-icon">${getNotificationIcon(type)}</i>
          <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">
          <i class="material-icons">close</i>
        </button>
      `;
      
      // Add notification to container
      notificationContainer.appendChild(notification);
      
      // Add close button listener
      notification.querySelector('.notification-close').addEventListener('click', () => {
        closeNotification(notification);
      });
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        closeNotification(notification);
      }, 5000);
      
      return notification;
    };
  }
}

/**
 * Close a notification with animation
 * @param {HTMLElement} notification - Notification element to close
 */
function closeNotification(notification) {
  if (!notification || notification.classList.contains('fade-out')) return;
  
  notification.classList.add('fade-out');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 300);
}

/**
 * Get icon for notification type
 * @param {string} type - Notification type
 * @returns {string} Icon name
 */
function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'check_circle';
    case 'error': return 'error';
    case 'warning': return 'warning';
    default: return 'info';
  }
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle if not in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ctrl+F for search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
    
    // Escape to close browser
    if (e.key === 'Escape') {
      const browserContainer = document.getElementById('browser-container');
      if (!browserContainer.classList.contains('hidden')) {
        closeBrowser();
      }
    }
    
    // Alt+1-3 for tabs
    if (e.altKey && e.key === '1') {
      switchToTab('home');
    } else if (e.altKey && e.key === '2') {
      switchToTab('sources');
    } else if (e.altKey && e.key === '3') {
      switchToTab('settings');
    }
  });
}

/**
 * Create default assets if they don't exist
 */
function createDefaultAssets() {
  // Create SVG logo if not exists
  createDefaultLogo();
  
  // Create default favicon icon
  createDefaultFavicon();
}

/**
 * Create default logo SVG if it doesn't exist
 */
function createDefaultLogo() {
  // In a production app, we would check if the file exists and create it if not
  // For now, we'll just create a logo element in memory to display as fallback
  const logo = document.querySelector('.logo img');
  
  if (logo && !logo.complete) {
    logo.onerror = () => {
      // Create fallback SVG logo
      const svgLogo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgLogo.setAttribute('width', '32');
      svgLogo.setAttribute('height', '32');
      svgLogo.setAttribute('viewBox', '0 0 100 100');
      svgLogo.innerHTML = `
        <rect width="100" height="100" rx="20" fill="#8C52FF"/>
        <path d="M22 30H78V70H22V30Z" fill="#121212"/>
        <path d="M30 40L50 30L70 40V60L50 70L30 60V40Z" fill="#B388FF"/>
        <path d="M42 48L58 48L50 40L42 48Z" fill="white"/>
        <path d="M42 52L42 60L50 56L58 60L58 52L50 48L42 52Z" fill="white"/>
      `;
      
      // Replace the img with the SVG
      logo.parentNode.replaceChild(svgLogo, logo);
    };
  }
}

/**
 * Create default favicon icon
 */
function createDefaultFavicon() {
  // This would create a default favicon icon for source cards
  const defaultFavicon = new Image();
  defaultFavicon.src = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="6" fill="#f0f0f0"/>
      <text x="16" y="22" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="#555">W</text>
    </svg>
  `);
  
  // Preload the image
  defaultFavicon.style.display = 'none';
  document.body.appendChild(defaultFavicon);
  
  setTimeout(() => {
    document.body.removeChild(defaultFavicon);
  }, 1000);
}

/**
 * Global utility functions
 */

// Format time in seconds to MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Format date to relative time (e.g., "2 days ago")
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else {
    return 'Just now';
  }
} 