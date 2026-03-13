# Music Streaming Platform 🎵

A full-stack, Spotify-inspired music streaming application built entirely with vanilla web technologies, Node.js, Express, and MongoDB.

## Features ✨

*   **Spotify-Inspired Aesthetic:** A premium, dark-themed UI featuring deep burgundy and champagne accents, complete with glassmorphism overlays and smooth micro-animations.
*   **Apple iTunes API Integration:** Search for and listen to thousands of free, high-quality 30-second music previews directly from the iTunes database.
*   **Local Music Uploads:** Upload your own personal `.mp3` files along with custom cover art directly into the player.
*   **Custom Playlists:** Create unlimited personal playlists and dynamically add tracks to them using the custom context menus.
*   **Up Next Queue:** Add specific tracks to play next, overriding the current continuous flow.
*   **Jump Back In:** A dedicated, horizontally scrolling listen history section on the home page tracking your 20 most recently played songs.
*   **Advanced Player Controls:** Fully functional *Shuffle* and *Repeat* (All/One) modes that intuitively handle linear or randomized playback.
*   **Persistent State:** User preferences (volume, shuffle/repeat states), playlists, and history are saved persistently across sessions.

## Tech Stack 🛠️

*   **Frontend**: HTML5, Vanilla JavaScript, Vanilla CSS (Grid & Flexbox). No frontend framework overhead.
*   **Backend**: Node.js & Express.js.
*   **Database**: MongoDB (via Mongoose) for tracking local song uploads.
*   **Storage**: Local `multer` file system storage for uploaded audio and cover files.

## Local Setup & Installation ⚙️

1. **Clone the repository**
   ```bash
   git clone https://github.com/PriyanshuSayss/Music-Streaming-Platform.git
   cd Music-Streaming-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start MongoDB**
   Ensure you have a local instance of MongoDB running on your machine (default port `27017`).

4. **Start the application**
   ```bash
   npm start
   ```

5. **View the app**
   Open your browser and navigate to `http://localhost:3000`.

## Deployment 🚀

This application handles raw file uploads to a local `uploads/` directory. If deploying to cloud platforms (like Render), a **Persistent Disk** mount is required to prevent uploaded `.mp3` files from being deleted during server restarts.

*Note: The project requires Node.js v20+.*
