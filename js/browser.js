/**
 * AniStream - Browser
 * Handles the in-app browser with webview
 */

// Initialize browser when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initBrowser();
});

// Global state
let currentWebview = null;

/**
 * Initialize the browser module
 */
function initBrowser() {
  // Get reference to DOM elements
  const browserContainer = document.getElementById('browser-container');
  const browserBack = document.getElementById('browser-back');
  const browserForward = document.getElementById('browser-forward');
  const browserRefresh = document.getElementById('browser-refresh');
  const browserClose = document.getElementById('browser-close');
  const browserUrl = document.getElementById('browser-url');
  
  // Add event listeners
  browserBack.addEventListener('click', goBack);
  browserForward.addEventListener('click', goForward);
  browserRefresh.addEventListener('click', refresh);
  browserClose.addEventListener('click', closeBrowser);
}

/**
 * Open the browser with a URL
 * @param {string} url - URL to open
 */
function openBrowser(url) {
  // Get reference to DOM elements
  const browserContainer = document.getElementById('browser-container');
  const webviewContainer = document.getElementById('webview-container');
  const browserUrl = document.getElementById('browser-url');
  
  // Clear previous webview
  webviewContainer.innerHTML = '';
  
  // Create new webview
  const webview = document.createElement('webview');
  webview.src = url;
  webview.allowpopups = true;
  
  // Set up webview events
  webview.addEventListener('dom-ready', () => {
    // Update URL display
    browserUrl.value = webview.getURL();
    
    // Enable/disable navigation buttons based on webview state
    updateNavButtons(webview);
  });
  
  webview.addEventListener('did-navigate', () => {
    browserUrl.value = webview.getURL();
    updateNavButtons(webview);
  });
  
  webview.addEventListener('did-navigate-in-page', () => {
    browserUrl.value = webview.getURL();
    updateNavButtons(webview);
  });
  
  webview.addEventListener('page-title-updated', (event) => {
    // Save the title for history/bookmark purposes
    webview.pageTitle = event.title;
  });
  
  webview.addEventListener('page-favicon-updated', (event) => {
    // Save favicon URL for history/bookmark purposes
    if (event.favicons && event.favicons.length > 0) {
      webview.favicon = event.favicons[0];
    }
  });
  
  // Add webview to container
  webviewContainer.appendChild(webview);
  currentWebview = webview;
  
  // Show browser container
  browserContainer.classList.remove('hidden');
}

/**
 * Update navigation buttons based on webview state
 * @param {HTMLElement} webview - The webview element
 */
function updateNavButtons(webview) {
  const browserBack = document.getElementById('browser-back');
  const browserForward = document.getElementById('browser-forward');
  
  // Enable/disable back button
  browserBack.disabled = !webview.canGoBack();
  browserBack.classList.toggle('disabled', !webview.canGoBack());
  
  // Enable/disable forward button
  browserForward.disabled = !webview.canGoForward();
  browserForward.classList.toggle('disabled', !webview.canGoForward());
}

/**
 * Navigate back in webview history
 */
function goBack() {
  if (currentWebview && currentWebview.canGoBack()) {
    currentWebview.goBack();
  }
}

/**
 * Navigate forward in webview history
 */
function goForward() {
  if (currentWebview && currentWebview.canGoForward()) {
    currentWebview.goForward();
  }
}

/**
 * Refresh the current page
 */
function refresh() {
  if (currentWebview) {
    currentWebview.reload();
  }
}

/**
 * Close the browser
 */
function closeBrowser() {
  const browserContainer = document.getElementById('browser-container');
  browserContainer.classList.add('hidden');
  
  // Optionally stop the webview
  if (currentWebview) {
    currentWebview.stop();
    // You might want to destroy or cleanup the webview here
  }
}

/**
 * Add current page to bookmarks
 */
function addToBookmarks() {
  if (!currentWebview) return;
  
  const url = currentWebview.getURL();
  const title = currentWebview.pageTitle || url;
  const favicon = currentWebview.favicon || window.anistream.urlToFaviconUrl(url);
  
  const bookmark = {
    url,
    title,
    favicon,
    type: 'website'
  };
  
  window.anistream.addBookmark(bookmark)
    .then(() => {
      showNotification('Added to bookmarks', 'success');
    })
    .catch(error => {
      console.error('Failed to add bookmark:', error);
      showNotification('Failed to add bookmark', 'error');
    });
}

/**
 * Update watch history
 * @param {Object} animeInfo - Information about the anime being watched
 */
function updateWatchHistory(animeInfo) {
  if (!animeInfo || !animeInfo.animeId) return;
  
  const historyItem = {
    ...animeInfo,
    url: currentWebview ? currentWebview.getURL() : '',
    lastWatched: Date.now()
  };
  
  window.anistream.addHistory(historyItem)
    .catch(error => {
      console.error('Failed to update watch history:', error);
    });
} 