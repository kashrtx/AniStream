/**
 * AniStream - Sources
 * Handles anime source management
 */

// Initialize sources module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initSources();
});

// Global sources state
let sourcesState = [];
let autocompleteResults = [];

/**
 * Initialize the sources module
 */
async function initSources() {
  // Get reference to DOM elements
  const addSourceButton = document.getElementById('add-source-button');
  const sourceUrlInput = document.getElementById('source-url-input');
  const sourcesGrid = document.getElementById('sources-grid');
  const autocompleteContainer = document.getElementById('source-autocomplete');
  
  // Load sources from storage
  await loadSources();
  
  // Add event listeners
  addSourceButton.addEventListener('click', () => addSource(sourceUrlInput.value));
  
  sourceUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (autocompleteResults.length > 0 && autocompleteContainer.classList.contains('active')) {
        // Select first autocomplete result if Enter pressed with autocomplete open
        selectAutocompleteItem(autocompleteResults[0]);
      } else {
        addSource(sourceUrlInput.value);
      }
    }
  });
  
  // Add autocomplete functionality
  sourceUrlInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      autocompleteContainer.classList.remove('active');
      autocompleteContainer.innerHTML = '';
      autocompleteResults = [];
      return;
    }
    
    try {
      // Search for sites that match the query
      autocompleteResults = await window.anistream.searchSites(query);
      
      if (autocompleteResults.length > 0) {
        renderAutocompleteResults(autocompleteResults, autocompleteContainer);
        autocompleteContainer.classList.add('active');
      } else {
        autocompleteContainer.classList.remove('active');
        autocompleteContainer.innerHTML = '';
      }
    } catch (error) {
      console.error('Failed to search sites:', error);
    }
  }, 300));
  
  // Close autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.source-input-wrapper')) {
      autocompleteContainer.classList.remove('active');
    }
  });
}

/**
 * Load sources from storage
 */
async function loadSources() {
  try {
    sourcesState = await window.anistream.getSources();
    renderSources();
  } catch (error) {
    console.error('Failed to load sources:', error);
    sourcesState = [];
  }
}

/**
 * Add a new source
 * @param {string} url - URL of the source to add
 */
async function addSource(url) {
  if (!url || url.trim() === '') {
    showNotification('Please enter a valid URL', 'error');
    return;
  }
  
  try {
    // Show loading state
    const sourceUrlInput = document.getElementById('source-url-input');
    const addSourceButton = document.getElementById('add-source-button');
    
    sourceUrlInput.disabled = true;
    addSourceButton.disabled = true;
    addSourceButton.innerHTML = '<i class="material-icons">hourglass_empty</i> Adding...';
    
    // Auto-complete URL if needed
    let sourceUrl = url.trim();
    if (!sourceUrl.match(/^https?:\/\//)) {
      sourceUrl = `https://${sourceUrl}`;
    }
    // Validate URL structure before fetching metadata
    try {
      new URL(sourceUrl);
    } catch (e) {
      showNotification('Invalid URL format', 'error');
      // Reset UI
      sourceUrlInput.disabled = false;
      addSourceButton.disabled = false;
      addSourceButton.innerHTML = '<i class="material-icons">add</i> Add';
      return;
    }

    // Fetch metadata
    const metadata = await window.anistream.fetchSiteMetadata(sourceUrl);

    const sourceDataPayload = {
      url: sourceUrl, // Send the validated and normalized URL
      title: metadata.title, // Already includes fallback to hostname in preload/main
      faviconUrl: metadata.faviconUrl || 'assets/images/default-favicon.png' // Use default if null/undefined
    };
    
    // Add to storage by passing the payload
    // The main process now handles ID and addedAt
    sourcesState = await window.anistream.addSource(sourceDataPayload);
    
    // Clear input and render
    sourceUrlInput.value = '';
    sourceUrlInput.disabled = false;
    addSourceButton.disabled = false;
    addSourceButton.innerHTML = '<i class="material-icons">add</i> Add';
    
    // Close autocomplete
    document.getElementById('source-autocomplete').classList.remove('active');
    
    // Update UI
    renderSources();
    showNotification('Source added successfully', 'success');
  } catch (error) {
    console.error('Failed to add source:', error);
    showNotification('Failed to add source', 'error');
    
    // Reset UI
    document.getElementById('source-url-input').disabled = false;
    document.getElementById('add-source-button').disabled = false;
    document.getElementById('add-source-button').innerHTML = '<i class="material-icons">add</i> Add';
  }
}

/**
 * Remove a source
 * @param {string} sourceId - ID of the source to remove
 */
async function removeSource(sourceId) {
  try {
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this source?')) {
      return;
    }
    
    // Remove from storage
    sourcesState = await window.anistream.removeSource(sourceId);
    
    // Update UI
    renderSources();
    showNotification('Source removed successfully', 'success');
  } catch (error) {
    console.error('Failed to remove source:', error);
    showNotification('Failed to remove source', 'error');
  }
}

/**
 * Render the sources list
 */
function renderSources() {
  const sourcesGrid = document.getElementById('sources-grid');
  
  // Clear current content
  sourcesGrid.innerHTML = '';
  
  // Show empty state if no sources
  if (sourcesState.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="material-icons">language</i>
      <p>Add anime sources to get started</p>
      <p class="sub-text">Try adding popular sites like animepahe.ru or hianime.to</p>
    `;
    sourcesGrid.appendChild(emptyState);
    return;
  }
  
  // Create source cards for each source
  sourcesState.forEach(source => {
    const sourceCard = createSourceCard(source);
    sourcesGrid.appendChild(sourceCard);
  });
}

/**
 * Create a source card element
 * @param {Object} source - Source object
 * @returns {HTMLElement} Source card element
 */
function createSourceCard(source) {
  // Clone the template
  const template = document.getElementById('source-card-template');
  const sourceCard = template.content.cloneNode(true).querySelector('.source-card');
  
  // Set source data
  sourceCard.dataset.id = source.id;
  
  // Set source info
  sourceCard.querySelector('.source-title').textContent = source.title || 'Unknown Source';
  sourceCard.querySelector('.source-url').textContent = source.url;
  
  // Set favicon
  const favicon = source.favicon || 'assets/images/default-favicon.png';
  sourceCard.querySelector('.source-icon img').src = favicon;
  sourceCard.querySelector('.source-icon img').alt = source.title || 'Source Icon';
  
  // Add event listeners
  sourceCard.querySelector('.browse-btn').addEventListener('click', () => {
    openBrowser(source.url);
  });
  
  sourceCard.querySelector('.remove-btn').addEventListener('click', () => {
    removeSource(source.id);
  });
  
  return sourceCard;
}

/**
 * Render autocomplete results
 * @param {Array} results - Autocomplete results
 * @param {HTMLElement} container - Container element
 */
function renderAutocompleteResults(results, container) {
  container.innerHTML = '';
  
  results.forEach(result => {
    const itemElement = createAutocompleteItem(result);
    container.appendChild(itemElement);
  });
}

/**
 * Create an autocomplete item element
 * @param {Object} item - Autocomplete item
 * @returns {HTMLElement} Autocomplete item element
 */
function createAutocompleteItem(item) {
  // Clone the template
  const template = document.getElementById('autocomplete-item-template');
  const itemElement = template.content.cloneNode(true).querySelector('.autocomplete-item');
  
  // Set item data
  itemElement.dataset.url = item.url;
  
  // Set item info
  itemElement.querySelector('.autocomplete-title').textContent = item.title;
  itemElement.querySelector('.autocomplete-url').textContent = item.url;
  
  // Set favicon
  itemElement.querySelector('.autocomplete-icon img').src = item.favicon || 'assets/images/default-favicon.png';
  itemElement.querySelector('.autocomplete-icon img').alt = item.title || 'Site Icon';
  
  // Add event listener
  itemElement.addEventListener('click', () => {
    selectAutocompleteItem(item);
  });
  
  return itemElement;
}

/**
 * Select an autocomplete item
 * @param {Object} item - Selected autocomplete item
 */
function selectAutocompleteItem(item) {
  const sourceUrlInput = document.getElementById('source-url-input');
  sourceUrlInput.value = item.url;
  
  // Close autocomplete
  document.getElementById('source-autocomplete').classList.remove('active');
  
  // Add source with selected item
  addSource(item.url);
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
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