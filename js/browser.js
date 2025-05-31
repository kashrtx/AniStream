// js/browser.js

let activeWebview = null;
let browserViewEl = null;
let webviewContainerEl = null;
let backButtonEl, forwardButtonEl, reloadButtonEl, closeButtonEl, addressBarEl = null;

// Expose functions to global window object for access from other scripts
window.openBrowser = openBrowser;
window.closeBrowser = closeBrowser;

document.addEventListener('DOMContentLoaded', () => {
  // Get references to browser view elements once DOM is loaded
  browserViewEl = document.getElementById('browser-view');
  webviewContainerEl = document.getElementById('webview-container');
  backButtonEl = document.getElementById('browser-back-button');
  forwardButtonEl = document.getElementById('browser-forward-button');
  reloadButtonEl = document.getElementById('browser-reload-button');
  closeButtonEl = document.getElementById('browser-close-button');
  addressBarEl = document.getElementById('browser-address-bar');

  // Attach event listeners for controls
  if(backButtonEl) {
    backButtonEl.addEventListener('click', () => {
      if (activeWebview && activeWebview.canGoBack()) {
        activeWebview.goBack();
      }
    });
  }

  if(forwardButtonEl) {
    forwardButtonEl.addEventListener('click', () => {
      if (activeWebview && activeWebview.canGoForward()) {
        activeWebview.goForward();
      }
    });
  }

  if(reloadButtonEl) {
    reloadButtonEl.addEventListener('click', () => {
      if (activeWebview) {
        activeWebview.reload();
      }
    });
  }

  if(closeButtonEl) {
    closeButtonEl.addEventListener('click', () => {
      closeBrowser();
    });
  }
});

function openBrowser(url) {
  // Ensure elements are fetched (they might not be if openBrowser is called prematurely)
  if (!browserViewEl) browserViewEl = document.getElementById('browser-view');
  if (!webviewContainerEl) webviewContainerEl = document.getElementById('webview-container');
  if (!backButtonEl) backButtonEl = document.getElementById('browser-back-button');
  if (!forwardButtonEl) forwardButtonEl = document.getElementById('browser-forward-button');
  if (!reloadButtonEl) reloadButtonEl = document.getElementById('browser-reload-button');
  if (!closeButtonEl) closeButtonEl = document.getElementById('browser-close-button');
  if (!addressBarEl) addressBarEl = document.getElementById('browser-address-bar');

  if (!browserViewEl || !webviewContainerEl) {
    console.error('Browser view critical elements not found. Check HTML structure and IDs.');
    return;
  }

  if (!activeWebview) {
    const webview = document.createElement('webview');
    webview.id = 'site-webview';
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('partition', 'persist:default'); // For extensions in default session
    webview.style.width = '100%';
    webview.style.height = '100%';
    const webviewPartition = webview.getAttribute('partition');
    console.log(`Webview created for ${url} with partition: ${webviewPartition}. Extensions from this session should be available.`);
    
    // Clear previous webview if any, before appending a new one
    while (webviewContainerEl.firstChild) {
        webviewContainerEl.removeChild(webviewContainerEl.firstChild);
    }
    webviewContainerEl.appendChild(webview);
    activeWebview = webview; // Assign to activeWebview AFTER it's added to DOM and configured

    // Attach webview event listeners
    activeWebview.addEventListener('did-navigate', (event) => {
      if (addressBarEl) addressBarEl.value = event.url;
      updateNavButtonsState();
    });

    activeWebview.addEventListener('page-title-updated', (event) => {
      console.log('Page title:', event.title);
      // Potentially: document.title = event.title; // If we want to change main window title
    });

    activeWebview.addEventListener('dom-ready', () => {
      updateNavButtonsState();
    });

    activeWebview.addEventListener('enter-html-full-screen', () => {
      console.log('Webview requested full screen.');
      // IPC call to main process would be needed here:
      // if (window.anistream && window.anistream.setMainFullScreen) window.anistream.setMainFullScreen(true);
    });

    activeWebview.addEventListener('leave-html-full-screen', () => {
      console.log('Webview left full screen.');
      // IPC call to main process would be needed here:
      // if (window.anistream && window.anistream.setMainFullScreen) window.anistream.setMainFullScreen(false);
    });

    activeWebview.addEventListener('new-window', (event) => {
      event.preventDefault(); // Prevent new Electron window
      if (activeWebview) {
        activeWebview.loadURL(event.url); // Load in the current webview
      }
      console.log('Prevented new window; loading in current webview:', event.url);
    });
  }

  if (url) {
    activeWebview.src = url;
  }

  browserViewEl.style.display = 'flex'; // Show the browser view
  updateNavButtonsState(); // Update button states
}

function closeBrowser() {
  if (browserViewEl) {
    browserViewEl.style.display = 'none'; // Hide the browser view
  }
  if (activeWebview) {
    activeWebview.src = 'about:blank'; // Clear the page to free up resources
    // Optionally, remove the webview from DOM if it's recreated each time openBrowser is called
    // if (webviewContainerEl) webviewContainerEl.innerHTML = '';
    // activeWebview = null;
  }
}

function updateNavButtonsState() {
  if (!activeWebview) { // If no webview, disable all
    if (backButtonEl) backButtonEl.disabled = true;
    if (forwardButtonEl) forwardButtonEl.disabled = true;
    // reloadButtonEl might still be enabled or disabled based on preference
    return;
  }
  // Enable/disable based on webview's navigation state
  if (backButtonEl) backButtonEl.disabled = !activeWebview.canGoBack();
  if (forwardButtonEl) forwardButtonEl.disabled = !activeWebview.canGoForward();
}
