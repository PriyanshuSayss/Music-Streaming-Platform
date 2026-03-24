# Monk 🎵

A full-stack music streaming platform built entirely with vanilla web technologies — no server required.

## Features ✨

*   **Premium Aesthetic:** A sleek, dark-themed UI featuring deep burgundy and champagne accents, complete with glassmorphism overlays and smooth micro-animations.
*   **Apple iTunes API Integration:** Search for and listen to thousands of free, high-quality 30-second music previews directly from the iTunes database.
*   **Local Music Uploads:** Upload your own personal `.mp3` files along with custom cover art. Files are stored in your browser's IndexedDB.
*   **Custom Playlists:** Create unlimited personal playlists and dynamically add tracks to them using the custom context menus.
*   **Up Next Queue:** Add specific tracks to play next, overriding the current continuous flow.
*   **Jump Back In:** A dedicated, horizontally scrolling listen history section on the home page tracking your 20 most recently played songs.
*   **Advanced Player Controls:** Fully functional *Shuffle* and *Repeat* (All/One) modes that intuitively handle linear or randomized playback.
*   **Persistent State:** All data — uploaded songs, playlists, preferences, and history — is saved persistently in your browser across sessions.

## Tech Stack 🛠️

*   **Frontend**: HTML5, Vanilla JavaScript, Vanilla CSS (Grid & Flexbox). No frontend framework overhead.
*   **Storage**: Browser IndexedDB for audio/cover files, localStorage for metadata and preferences.
*   **API**: Apple iTunes Search API (called directly from the browser).

## Live Demo 🌐

👉 [https://priyanshusayss.github.io/Music-Streaming-Platform/](https://priyanshusayss.github.io/Music-Streaming-Platform/)

## Local Setup ⚙️

No server or dependencies needed! Just open `docs/index.html` in your browser, or use a local file server:

```bash
# Using Python
cd docs && python -m http.server 3000

# Using VS Code Live Server extension
# Right-click docs/index.html → Open with Live Server
```

Then navigate to `http://localhost:3000`.

*Note: The app runs entirely in the browser. Your uploaded songs are stored locally in IndexedDB.*

