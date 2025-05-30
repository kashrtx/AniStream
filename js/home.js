/**
 * AniStream - Home
 * Handles the home screen with bookmarks and continue watching
 */

// Initialize home module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initHome();
});

// Global state
let bookmarksState = [];
let historyState = [];

/**
 * Initialize the home module
 */
async function initHome() {
  // Load data
  await Promise.all([
    loadBookmarks(),
    loadHistory()
  ]);
  
  // Set up search
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });
  
  searchButton.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
}

/**
 * Load bookmarks from storage
 */
async function loadBookmarks() {
  try {
    bookmarksState = await window.anistream.getBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    bookmarksState = [];
  }
}

/**
 * Load watch history from storage
 */
async function loadHistory() {
  try {
    historyState = await window.anistream.getHistory();
    // Sort by last watched, most recent first
    historyState.sort((a, b) => b.lastWatched - a.lastWatched);
    renderHistory();
  } catch (error) {
    console.error('Failed to load history:', error);
    historyState = [];
  }
}

/**
 * Render bookmarks section
 */
function renderBookmarks() {
  const bookmarksList = document.getElementById('bookmarks-list');
  
  // Clear current content
  bookmarksList.innerHTML = '';
  
  // Show empty state if no bookmarks
  if (bookmarksState.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="material-icons">bookmark</i>
      <p>Your bookmarked anime will appear here</p>
    `;
    bookmarksList.appendChild(emptyState);
    return;
  }
  
  // Filter only anime bookmarks
  const animeBookmarks = bookmarksState.filter(bookmark => bookmark.type === 'anime');
  
  // Create bookmark cards
  animeBookmarks.forEach(bookmark => {
    const bookmarkCard = createAnimeCard(bookmark);
    bookmarksList.appendChild(bookmarkCard);
  });
}

/**
 * Render watch history section
 */
function renderHistory() {
  const historyList = document.getElementById('continue-watching-list');
  
  // Clear current content
  historyList.innerHTML = '';
  
  // Show empty state if no history
  if (historyState.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="material-icons">movie</i>
      <p>Your recently watched anime will appear here</p>
    `;
    historyList.appendChild(emptyState);
    return;
  }
  
  // Only show most recent 10 items
  const recentHistory = historyState.slice(0, 10);
  
  // Create history cards
  recentHistory.forEach(historyItem => {
    const historyCard = createAnimeCard(historyItem, true);
    historyList.appendChild(historyCard);
  });
}

/**
 * Create an anime card element
 * @param {Object} anime - Anime object (bookmark or history item)
 * @param {boolean} isHistory - Whether this is a history item
 * @returns {HTMLElement} Anime card element
 */
function createAnimeCard(anime, isHistory = false) {
  // Clone the template
  const template = document.getElementById('anime-card-template');
  const animeCard = template.content.cloneNode(true).querySelector('.anime-card');
  
  // Set anime data
  animeCard.dataset.id = anime.id;
  animeCard.dataset.animeId = anime.animeId || anime.id;
  animeCard.dataset.url = anime.url || '';
  
  // Set anime info
  animeCard.querySelector('.anime-title').textContent = anime.title || 'Unknown Anime';
  
  // Set episode info if available
  if (anime.episodeNumber) {
    animeCard.querySelector('.anime-episode').textContent = `Episode ${anime.episodeNumber}`;
  } else {
    animeCard.querySelector('.anime-episode').textContent = '';
  }
  
  // Set thumbnail
  const thumbnail = anime.thumbnail || anime.image || 'assets/images/default-thumbnail.png';
  animeCard.querySelector('.anime-thumbnail img').src = thumbnail;
  animeCard.querySelector('.anime-thumbnail img').alt = anime.title || 'Anime Thumbnail';
  
  // Set progress bar if it's a history item
  if (isHistory && anime.progress) {
    const progressBar = animeCard.querySelector('.progress-bar');
    progressBar.style.width = `${anime.progress}%`;
  }
  
  // Add event listeners
  animeCard.querySelector('.play-btn').addEventListener('click', () => {
    if (anime.url) {
      openBrowser(anime.url);
    }
  });
  
  const bookmarkBtn = animeCard.querySelector('.bookmark-btn');
  
  // Handle bookmark button based on whether it's already bookmarked
  if (isHistory) {
    // Check if this history item is also bookmarked
    const isBookmarked = bookmarksState.some(bookmark => 
      bookmark.animeId === anime.animeId || bookmark.id === anime.animeId
    );
    
    if (isBookmarked) {
      bookmarkBtn.classList.add('active');
      bookmarkBtn.querySelector('i').textContent = 'bookmark';
    } else {
      bookmarkBtn.querySelector('i').textContent = 'bookmark_border';
    }
    
    bookmarkBtn.addEventListener('click', () => toggleBookmark(anime, bookmarkBtn));
  } else {
    // It's already a bookmark, so add option to remove
    bookmarkBtn.classList.add('active');
    bookmarkBtn.querySelector('i').textContent = 'bookmark';
    
    bookmarkBtn.addEventListener('click', () => removeBookmark(anime.id, animeCard));
  }
  
  return animeCard;
}

/**
 * Toggle bookmark status for an anime
 * @param {Object} anime - Anime object
 * @param {HTMLElement} button - Bookmark button element
 */
async function toggleBookmark(anime, button) {
  try {
    // Check if already bookmarked
    const isBookmarked = bookmarksState.some(bookmark => 
      bookmark.animeId === anime.animeId || bookmark.id === anime.animeId
    );
    
    if (isBookmarked) {
      // Find the bookmark ID
      const bookmark = bookmarksState.find(bookmark => 
        bookmark.animeId === anime.animeId || bookmark.id === anime.animeId
      );
      
      if (bookmark) {
        // Remove bookmark
        await window.anistream.removeBookmark(bookmark.id);
        bookmarksState = await window.anistream.getBookmarks();
        
        // Update button
        button.classList.remove('active');
        button.querySelector('i').textContent = 'bookmark_border';
        
        showNotification('Removed from bookmarks', 'success');
      }
    } else {
      // Create bookmark from anime/history item
      const bookmark = {
        animeId: anime.animeId || anime.id,
        title: anime.title,
        thumbnail: anime.thumbnail || anime.image,
        url: anime.url,
        type: 'anime'
      };
      
      // Add bookmark
      await window.anistream.addBookmark(bookmark);
      bookmarksState = await window.anistream.getBookmarks();
      
      // Update button
      button.classList.add('active');
      button.querySelector('i').textContent = 'bookmark';
      
      showNotification('Added to bookmarks', 'success');
    }
    
    // Re-render bookmarks section
    renderBookmarks();
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
    showNotification('Failed to update bookmark', 'error');
  }
}

/**
 * Remove a bookmark
 * @param {string} bookmarkId - ID of the bookmark to remove
 * @param {HTMLElement} card - Card element to remove from DOM
 */
async function removeBookmark(bookmarkId, card) {
  try {
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this bookmark?')) {
      return;
    }
    
    // Remove from storage
    await window.anistream.removeBookmark(bookmarkId);
    bookmarksState = await window.anistream.getBookmarks();
    
    // Remove from DOM
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
    
    // Re-render if no cards left
    if (bookmarksState.length === 0) {
      renderBookmarks();
    }
    
    showNotification('Bookmark removed successfully', 'success');
  } catch (error) {
    console.error('Failed to remove bookmark:', error);
    showNotification('Failed to remove bookmark', 'error');
  }
}

/**
 * Perform search for anime
 * @param {string} query - Search query
 */
function performSearch(query) {
  if (!query || query.trim() === '') {
    showNotification('Please enter a search term', 'error');
    return;
  }
  
  // In a real app, this would search through your sources
  // For now, just open a search on a default site
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' anime watch online')}`;
  openBrowser(searchUrl);
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