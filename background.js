// background.js (MV3 service worker)
console.log("[bg] service worker started");

// 🔐 Put your real OMDb key here (no quotes/spaces around).
const OMDB_API_KEY = "c76bae03";

// Helper: normalize for simple fuzzy ranking
const norm = s => (s || "")
  .toLowerCase()
  .replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Pick best match from OMDb search results
function pickBestMatch(queryTitle, items = []) {
  const nq = norm(queryTitle);
  let best = null, score = -1;
  for (const it of items) {
    const nt = norm(it.Title);
    let s = 0;
    if (nt === nq) s = 3;
    else if (nt.startsWith(nq)) s = 2;
    else if (nt.includes(nq)) s = 1;
    if (s > score) { score = s; best = it; }
  }
  return best;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "fetchImdb") {
    (async () => {
      try {
        const raw = (message.title || "").trim();
        if (!raw) {
          sendResponse({ success: false, error: "Empty title" });
          return;
        }

        // 1) exact title query
        const urlExact = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(raw)}`;
        let res = await fetch(urlExact);
        let data = await res.json();

        if (data?.Response === "True") {
          sendResponse({ success: true, data });
          return;
        }

        // 2) fallback search
        const urlSearch = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(raw)}`;
        res = await fetch(urlSearch);
        data = await res.json();

        if (data?.Response === "True" && Array.isArray(data.Search) && data.Search.length) {
          const best = pickBestMatch(raw, data.Search);
          if (best?.imdbID) {
            const byId = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${best.imdbID}`;
            const r2 = await fetch(byId);
            const d2 = await r2.json();
            sendResponse({ success: d2?.Response === "True", data: d2 });
            return;
          }
        }

        sendResponse({ success: false, error: "Movie not found (exact+search)" });
      } catch (err) {
        console.error("[bg] OMDb fetch err:", err);
        sendResponse({ success: false, error: String(err) });
      }
    })();

    // Keep the message port open for async reply
    return true;
  }
});
