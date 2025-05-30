// UI interactions for AniStream

// Initialize UI components
function initUI() {
  try {
    // Setup tab navigation
    setupTabNavigation();
    
    // Setup modal interactions
    setupModals();
    
    // Setup source form
    setupSourceForm();
    
    // Add CSS for toast notifications
    addToastStyles();
    
    console.log('UI initialized successfully');
  } catch (error) {
    console.error('Error initializing UI:', error);
  }
}

// Setup tab navigation
function setupTabNavigation() {
  try {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and panes
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding tab pane
        const tabName = tab.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  } catch (error) {
    console.error('Error setting up tab navigation:', error);
  }
}

// Setup modal interactions
function setupModals() {
  try {
    // Setup close buttons for all modals
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        modal.classList.remove('show');
      });
    });
    
    // Close modal when clicking outside content
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
    
    // Setup add source button
    const addSourceBtn = document.getElementById('add-source-button');
    if (addSourceBtn) {
      addSourceBtn.addEventListener('click', () => {
        clearSourceForm();
        document.getElementById('add-source-modal').classList.add('show');
      });
    }
    
    // Setup Cloudflare modal continue button
    const cloudflareBtn = document.getElementById('cloudflare-continue');
    if (cloudflareBtn) {
      cloudflareBtn.addEventListener('click', () => {
        const modal = document.getElementById('cloudflare-modal');
        modal.classList.remove('show');
        window.dispatchEvent(new CustomEvent('cloudflare-challenge-completed'));
      });
    }
  } catch (error) {
    console.error('Error setting up modals:', error);
  }
}

// Setup source form
function setupSourceForm() {
  try {
    const saveSourceBtn = document.getElementById('save-source');
    const cancelBtn = document.getElementById('cancel-add-source');
    const modal = document.getElementById('add-source-modal');
    const urlInput = document.getElementById('source-url');
    
    // Add URL input event for auto-detection
    if (urlInput) {
      urlInput.addEventListener('blur', () => {
        const url = urlInput.value.trim();
        if (url) {
          autoFillSourceInfo(url);
        }
      });
    }
    
    if (saveSourceBtn) {
      saveSourceBtn.addEventListener('click', async () => {
        try {
          const nameInput = document.getElementById('source-name');
          const urlInput = document.getElementById('source-url');
          const autoDetectInput = document.getElementById('source-auto-detect');
          
          const name = nameInput.value.trim();
          const url = urlInput.value.trim();
          const autoDetect = autoDetectInput.checked;
          
          // Validate inputs
          if (!name) {
            window.showToast('Please enter a name for the source', 'error');
            return;
          }
          
          if (!url) {
            window.showToast('Please enter a URL for the source', 'error');
            return;
          }
          
          try {
            // Validate URL format
            new URL(url);
          } catch (e) {
            window.showToast('Please enter a valid URL', 'error');
            return;
          }
          
          // Check if we're editing an existing source
          const editId = modal.dataset.editId;
          
          // Get source info (icon, etc) from URL
          let sourceInfo = window.getSourceInfoFromUrl ? window.getSourceInfoFromUrl(url) : null;
          if (!sourceInfo) {
            sourceInfo = {
              name: name,
              icon: null,
              autoDetect: autoDetect
            };
          }
          
          // Initialize appState if not available
          window.appState = window.appState || {};
          window.appState.sources = window.appState.sources || [];
          
          if (editId) {
            // Update existing source
            const index = window.appState.sources.findIndex(s => s.id === editId);
            if (index >= 0) {
              window.appState.sources[index].name = name;
              window.appState.sources[index].url = url;
              window.appState.sources[index].autoDetect = autoDetect;
              
              // Update icon if available from sourceInfo
              if (sourceInfo && sourceInfo.icon) {
                window.appState.sources[index].icon = sourceInfo.icon;
              }
              
              // Save to store if API available
              if (window.api && window.api.setStoreValue) {
                await window.api.setStoreValue('sources', window.appState.sources);
              }
              
              window.showToast(`Source "${name}" updated`, 'success');
            }
          } else {
            // Add new source
            const newSource = {
              id: generateId(),
              name: name,
              url: url,
              autoDetect: autoDetect,
              icon: sourceInfo ? sourceInfo.icon : null
            };
            
            // Add to sources
            window.appState.sources.push(newSource);
            
            // Save to store if API available
            if (window.api && window.api.setStoreValue) {
              await window.api.setStoreValue('sources', window.appState.sources);
            }
            
            window.showToast(`Source "${name}" added`, 'success');
          }
          
          // Update UI
          if (window.updateSourcesTab) {
            window.updateSourcesTab();
          }
          
          // Close modal
          modal.classList.remove('show');
          
          // Clear form
          clearSourceForm();
        } catch (error) {
          console.error('Error saving source:', error);
          window.showToast('Error saving source', 'error');
        }
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        clearSourceForm();
      });
    }
  } catch (error) {
    console.error('Error setting up source form:', error);
  }
}

// Auto-fill source information based on URL
function autoFillSourceInfo(url) {
  if (!url) return;
  
  try {
    // Use the window.getSourceInfoFromUrl function from sources.js
    if (window.getSourceInfoFromUrl) {
      const sourceInfo = window.getSourceInfoFromUrl(url);
      if (sourceInfo) {
        document.getElementById('source-name').value = sourceInfo.name;
        document.getElementById('source-auto-detect').checked = sourceInfo.autoDetect;
        window.showToast(`Source "${sourceInfo.name}" detected`, 'success');
      }
    }
  } catch (error) {
    console.error('Error auto-filling source info:', error);
  }
}

// Clear source form
function clearSourceForm() {
  const nameInput = document.getElementById('source-name');
  const urlInput = document.getElementById('source-url');
  const autoDetectInput = document.getElementById('source-auto-detect');
  const modal = document.getElementById('add-source-modal');
  
  if (nameInput) nameInput.value = '';
  if (urlInput) urlInput.value = '';
  if (autoDetectInput) autoDetectInput.checked = true;
  
  // Clear edit ID
  if (modal) delete modal.dataset.editId;
}

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Add toast notification styles
function addToastStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    .toast-content {
      display: flex;
      align-items: center;
    }
    
    .toast-content i {
      margin-right: 10px;
    }
    
    .toast.success {
      border-left: 4px solid var(--success-color);
    }
    
    .toast.error {
      border-left: 4px solid var(--error-color);
    }
    
    .toast.warning {
      border-left: 4px solid var(--warning-color);
    }
    
    .toast.info {
      border-left: 4px solid var(--accent-color);
    }
    
    .source-selection-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 15px 0;
    }
    
    .source-selection-item {
      display: flex;
      align-items: center;
      padding: 10px;
      background-color: var(--bg-tertiary);
      border-radius: 4px;
      cursor: pointer;
    }
    
    .source-selection-item:hover {
      background-color: var(--control-bg);
    }
    
    .source-selection-item img {
      width: 24px;
      height: 24px;
      margin-right: 10px;
      border-radius: 4px;
    }
  `;
  
  document.head.appendChild(styleEl);
}

// Export the initUI function for use in other modules
window.initUI = initUI; 