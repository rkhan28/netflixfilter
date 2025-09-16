document.addEventListener('DOMContentLoaded', () => {
  const minRatingInput = document.getElementById('minRating');
  const genreSelect = document.getElementById('genre');
  const saveButton = document.getElementById('save');
  const status = document.getElementById('status');

  // Genre to Netflix ID map (based on Netflix hidden codes)
  const genreIds = {
    '': 'https://www.netflix.com/browse', // Any: Home page
    'Action': 1365,
    'Adventure': 1365,
    'Animation': 4698,
    'Biography': 1096,
    'Comedy': 6548,
    'Crime': 5824,
    'Documentary': 6839,
    'Drama': 5763,
    'Family': 783,
    'Fantasy': 9744,
    'Film-Noir': 7687,
    'History': 6384,
    'Horror': 8711,
    'Music': 1701,
    'Musical': 13335,
    'Mystery': 9994,
    'Romance': 8883,
    'Sci-Fi': 1492,
    'Sport': 4370,
    'Thriller': 8933,
    'War': 3373,
    'Western': 7700
  };

  // Load saved settings
  chrome.storage.sync.get(['minRating', 'genre'], (data) => {
    minRatingInput.value = data.minRating || 7.0;
    genreSelect.value = data.genre || '';
  });

  // Save settings and trigger filter
  saveButton.addEventListener('click', () => {
    const minRating = parseFloat(minRatingInput.value);
    const genre = genreSelect.value;

    if (minRating < 0 || minRating > 10) {
      status.textContent = 'Rating must be between 0 and 10';
      return;
    }

    chrome.storage.sync.set({ minRating, genre, filterActive: true }, () => {
      status.textContent = 'Settings saved! Reloading and applying filter...';
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const genreId = genreIds[genre];
        const reloadUrl = genre ? `https://www.netflix.com/browse/genre/${genreId}` : 'https://www.netflix.com/browse';
        chrome.tabs.update(tabs[0].id, { url: reloadUrl });
      });
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});