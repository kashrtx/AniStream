// Browser automation module for AniStream
// This is a frontend interface to the backend Puppeteer functionality

// Initialize browser automation module
document.addEventListener('DOMContentLoaded', () => {
  // Listen for browser automation events
  setupBrowserEventListeners();
});

// Setup browser event listeners
function setupBrowserEventListeners() {
  // Listen for Cloudflare challenge completion
  window.addEventListener('cloudflare-challenge-completed', () => {
    // Notify the main process that the challenge has been completed
    window.api.browse('continue', { continueNavigation: true });
  });
}

// Handle a Cloudflare challenge
function handleCloudflareChallenge(url) {
  return new Promise((resolve) => {
    // Get the Cloudflare modal
    const modal = document.getElementById('cloudflare-modal');
    const webview = document.getElementById('cloudflare-webview');
    
    // Set the webview source to the Cloudflare challenge URL
    webview.src = url;
    
    // Show the modal
    modal.classList.add('show');
    
    // Listen for completion
    const handleCompletion = () => {
      window.removeEventListener('cloudflare-challenge-completed', handleCompletion);
      resolve();
    };
    
    window.addEventListener('cloudflare-challenge-completed', handleCompletion);
  });
}

// Export the Cloudflare challenge handler for use in other modules
window.handleCloudflareChallenge = handleCloudflareChallenge; 