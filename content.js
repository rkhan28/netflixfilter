const API_KEY = 'c76bae03'; // Your OMDB API key
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 1 day in ms

// Fetch OMDB data with caching
async function getImdbData(title) {
  const cacheKey = `imdb_${title}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && Date.now() - cached[cacheKey].timestamp < CACHE_EXPIRY) {
    return cached[cacheKey].data;
  }

  try {
    const response = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${API_KEY}`);
    const data = await response.json();
    if (data.Response === 'True') {
      const imdbRating = parseFloat(data.imdbRating) || 0;
      const genres = data.Genre ? data.Genre.split(', ').map(g => g.trim()) : [];
      const result = { imdbRating, genres };
      chrome.storage.local.set({ [cacheKey]: { data: result, timestamp: Date.now() } });
      return result;
    }
  } catch (error) {
    console.error('OMDB fetch error:', error);
  }
  return { imdbRating: 0, genres: [], noData: true }; // Flag for games/non-movies
}

// Apply filter
async function applyFilter(settings) {
  const { minRating = 7.0, genre = '' } = settings || {};

  const titles = document.querySelectorAll('.title-card-container, .ptrack-content, .fallback-text');

  for (const titleElement of titles) {
    const titleText = titleElement.querySelector('img[alt]')?.alt || titleElement.textContent?.trim();
    if (!titleText) continue;

    const { imdbRating, genres, noData } = await getImdbData(titleText);

    if (noData) {
      titleElement.style.display = 'block'; // Show games/non-movies untouched
    } else {
      const matchesRating = imdbRating >= minRating;
      const matchesGenre = !genre || genres.includes(genre);
      titleElement.style.display = matchesRating && matchesGenre ? 'block' : 'none';
    }
  }
}

// Check if filter should be applied on load
chrome.storage.sync.get(['filterActive', 'minRating', 'genre'], (data) => {
  if (data.filterActive) {
    applyFilter(data);
  }
});

// Listen for popup triggers (for immediate apply after reload)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'applyFilter') {
    chrome.storage.sync.get(['minRating', 'genre'], applyFilter);
  }
});

// Observe DOM changes for infinite scroll
const observer = new MutationObserver(() => {
  chrome.storage.sync.get(['filterActive', 'minRating', 'genre'], (data) => {
    if (data.filterActive) {
      applyFilter(data);
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });