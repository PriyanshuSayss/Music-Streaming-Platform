// Check Authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
  window.location.href = 'login.html';
}

// ==================== IndexedDB Setup ====================
const DB_NAME = 'MonkMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'songFiles';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileToDB(id, audioBlob, coverBlob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, audioBlob, coverBlob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFileFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFileFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ==================== Song Metadata (localStorage) ====================
function getLocalSongs() {
  return JSON.parse(localStorage.getItem('localSongs')) || [];
}

function saveLocalSongs(songs) {
  localStorage.setItem('localSongs', JSON.stringify(songs));
}

// Object URL cache to avoid recreating URLs
const objectURLCache = {};

async function getSongAudioURL(song) {
  // If it's an online song (iTunes), return the URL directly
  if (song.filePath && song.filePath.startsWith('http')) {
    return song.filePath;
  }
  // Local song — get from IndexedDB
  if (song._id) {
    if (objectURLCache[song._id + '_audio']) return objectURLCache[song._id + '_audio'];
    const record = await getFileFromDB(song._id);
    if (record && record.audioBlob) {
      const url = URL.createObjectURL(record.audioBlob);
      objectURLCache[song._id + '_audio'] = url;
      return url;
    }
  }
  return '';
}

async function getSongCoverURL(song) {
  // If it's an online cover, return directly
  if (song.coverImage && song.coverImage.startsWith('http')) {
    return song.coverImage;
  }
  // Local cover — get from IndexedDB
  if (song._id && song.hasCover) {
    if (objectURLCache[song._id + '_cover']) return objectURLCache[song._id + '_cover'];
    const record = await getFileFromDB(song._id);
    if (record && record.coverBlob) {
      const url = URL.createObjectURL(record.coverBlob);
      objectURLCache[song._id + '_cover'] = url;
      return url;
    }
  }
  return '';
}

// ==================== DOM Elements ====================
const form = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const songList = document.getElementById("songList");

// Player Elements
const player = document.getElementById("player");
const playerTrack = document.getElementById("player-track");
const playerArtist = document.getElementById("player-artist");
const playerArt = document.getElementById("player-art");
const playPauseBtn = document.getElementById("playPauseBtn");
const playIcon = document.getElementById("playIcon");
const pauseIcon = document.getElementById("pauseIcon");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const progressBarWrapper = document.getElementById("progressBarWrapper");
const progressBar = document.getElementById("progressBar");
const currentTimeDisplay = document.getElementById("currentTimeDisplay");
const durationDisplay = document.getElementById("durationDisplay");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

// Volume Elements
const volumeBarWrapper = document.getElementById("volumeBarWrapper");
const volumeBar = document.getElementById("volumeBar");
const muteBtn = document.getElementById("muteBtn");
const volHighIcon = document.getElementById("volHigh");
const volMuteIcon = document.getElementById("volMute");

let currentSongIndex = -1;
let currentPlaylist = [];

// Navigation Elements
const navHome = document.getElementById("nav-home");
const navSearch = document.getElementById("nav-search");
const navUpload = document.getElementById("nav-upload");
const navLiked = document.getElementById("nav-liked");
const navLocal = document.getElementById("nav-local");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const createPlaylistContainer = document.getElementById("createPlaylistContainer");
const newPlaylistName = document.getElementById("newPlaylistName");
const confirmPlaylistBtn = document.getElementById("confirmPlaylistBtn");
const userPlaylistsContainer = document.getElementById("userPlaylistsContainer");

// Views
const searchContainer = document.getElementById("search-container");
const searchInput = document.getElementById("searchInput");
const uploadSection = document.getElementById("upload-section");
const homeView = document.getElementById("home-view");
const sectionTitle = document.querySelector(".content-area h2");
const songsTitle = document.querySelector(".songs-section h3");

// State
let allSongs = [];
let likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
let userPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || {};
let playbackQueue = [];
let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];

// Navigation History
const backBtn = document.getElementById("backBtn");
const forwardBtn = document.getElementById("forwardBtn");
let viewHistory = ["home"];
let historyIndex = 0;

function updateHistoryButtons() {
  if (backBtn && forwardBtn) {
    backBtn.disabled = historyIndex <= 0;
    forwardBtn.disabled = historyIndex >= viewHistory.length - 1;
  }
}

// Navigation Logic
let activePlaylistName = null;

function switchView(view, isHistoryAction = false) {
  // Reset active classes
  [navHome, navSearch, navUpload, navLiked, navLocal].forEach(btn => btn?.classList.remove("active"));
  Array.from(userPlaylistsContainer.children).forEach(li => li.classList.remove("active"));
  
  // Handle History State
  if (!isHistoryAction) {
    if (viewHistory[historyIndex] !== view) {
      viewHistory = viewHistory.slice(0, historyIndex + 1);
      viewHistory.push(view);
      historyIndex++;
    }
  }
  updateHistoryButtons();
  
  if (view === "home") {
    activePlaylistName = null;
    navHome.classList.add("active");
    document.getElementById("recently-played-section").style.display = "block";
    uploadSection.style.display = "none";
    sectionTitle.textContent = "Good evening";
    songsTitle.textContent = "Your Library";
    songsTitle.style.display = "block";
    renderRecentHistory();
    renderSongs(allSongs);
  } else if (view === "search") {
    navSearch.classList.add("active");
    document.getElementById("recently-played-section").style.display = "none";
    uploadSection.style.display = "none";
    sectionTitle.textContent = "Search Layout";
    songsTitle.style.display = "none";
    renderSongs(allSongs); // Show all initially, filter on type
  } else if (view === "upload") {
    navUpload.classList.add("active");
    document.getElementById("recently-played-section").style.display = "none";
    uploadSection.style.display = "block";
    sectionTitle.textContent = "Add Music";
    songsTitle.textContent = "Recently Uploaded";
    songsTitle.style.display = "block";
    renderSongs(allSongs);
  } else if (view === "liked") {
    navLiked.classList.add("active");
    document.getElementById("recently-played-section").style.display = "none";
    uploadSection.style.display = "none";
    sectionTitle.textContent = "Liked Songs";
    songsTitle.textContent = "Your Favorites";
    songsTitle.style.display = "block";
    renderSongs(likedSongs);
  } else if (view === "local") {
    activePlaylistName = null;
    navLocal.classList.add("active");
    document.getElementById("recently-played-section").style.display = "none";
    uploadSection.style.display = "none";
    sectionTitle.textContent = "Local Uploads";
    songsTitle.textContent = "Your Uploaded Tracks";
    songsTitle.style.display = "block";
    renderSongs(allSongs);
  } else if (view.startsWith("playlist_")) {
    const pName = view.replace("playlist_", "");
    activePlaylistName = pName;
    
    // Find the DOM element and mark active
    Array.from(userPlaylistsContainer.children).forEach(li => {
      if (li.dataset.name === pName) li.classList.add("active");
    });
    
    document.getElementById("recently-played-section").style.display = "none";
    uploadSection.style.display = "none";
    sectionTitle.textContent = pName;
    songsTitle.textContent = "Playlist Tracks";
    songsTitle.style.display = "block";
    renderSongs(userPlaylists[pName] || []);
  }
}

navHome.addEventListener("click", () => {
    searchInput.value = "";
    switchView("home");
});
navSearch.addEventListener("click", () => {
    switchView("search");
    searchInput.focus();
});
navUpload.addEventListener("click", () => switchView("upload"));
navLiked?.addEventListener("click", () => switchView("liked"));
navLocal?.addEventListener("click", () => switchView("local"));

// User Playlists Logic
function renderSidebarPlaylists() {
  userPlaylistsContainer.innerHTML = "";
  Object.keys(userPlaylists).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    li.dataset.name = name;
    li.addEventListener("click", () => switchView(`playlist_${name}`));
    userPlaylistsContainer.appendChild(li);
  });
}

createPlaylistBtn.addEventListener("click", () => {
  createPlaylistContainer.style.display = createPlaylistContainer.style.display === "none" ? "flex" : "none";
  if (createPlaylistContainer.style.display === "flex") {
    newPlaylistName.focus();
  }
});

function handleCreatePlaylist() {
  const name = newPlaylistName.value.trim();
  if (!name) return;
  if (userPlaylists[name]) {
    alert("Playlist name already exists!");
    return;
  }
  
  userPlaylists[name] = [];
  localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
  newPlaylistName.value = "";
  createPlaylistContainer.style.display = "none";
  renderSidebarPlaylists();
}

confirmPlaylistBtn.addEventListener("click", handleCreatePlaylist);
newPlaylistName.addEventListener("keyup", (e) => {
  if (e.key === "Enter") handleCreatePlaylist();
});

renderSidebarPlaylists();

if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      switchView(viewHistory[historyIndex], true);
    }
  });
}

if (forwardBtn) {
  forwardBtn.addEventListener('click', () => {
    if (historyIndex < viewHistory.length - 1) {
      historyIndex++;
      switchView(viewHistory[historyIndex], true);
    }
  });
}

document.getElementById('topNavHome').addEventListener('click', () => {
  searchInput.value = '';
  switchView('home');
});

// ==================== Search Logic (Direct iTunes API) ====================
let searchTimeout;
searchInput.addEventListener("input", (e) => {
  const query = e.target.value;
  
  if (!navSearch.classList.contains("active") && query.length > 0) {
    switchView("search");
  }
  
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!query) {
      songsTitle.style.display = "none";
      renderSongs(allSongs);
      return;
    }
    
    songsTitle.style.display = "block";
    songsTitle.textContent = "Searching...";
    
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      const apiResults = data.results;
      
      // Map iTunes API results to our format
      const mappedResults = apiResults
        .filter(track => track.previewUrl)
        .map(track => ({
          title: track.trackName,
          artist: track.artistName,
          filePath: track.previewUrl,
          coverImage: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : ''
        }));
      
      songsTitle.textContent = "Search Results";
      renderSongs(mappedResults);
    } catch (err) {
      console.error(err);
      songsTitle.textContent = "Error fetching results";
    }
  }, 500);
});

// ==================== Upload Logic (IndexedDB + localStorage) ====================
const songFileInput = document.getElementById("songFile");
const coverFileInput = document.getElementById("coverFile");
const audioFileName = document.getElementById("audioFileName");
const coverFileName = document.getElementById("coverFileName");

songFileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    audioFileName.textContent = e.target.files[0].name;
    audioFileName.style.color = "var(--text-base)";
  } else {
    audioFileName.textContent = "Drag & Drop or Click to Upload Song (Audio)";
    audioFileName.style.color = "var(--text-subdued)";
  }
});

coverFileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    coverFileName.textContent = e.target.files[0].name;
    coverFileName.style.color = "var(--text-base)";
  } else {
    coverFileName.textContent = "Drag & Drop or Click to Upload Thumbnail";
    coverFileName.style.color = "var(--text-subdued)";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  uploadMessage.textContent = "Uploading...";
  uploadMessage.className = "upload-message";
  
  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const audioFile = document.getElementById("songFile").files[0];
  const coverFile = document.getElementById("coverFile").files[0];
  
  if (!audioFile) {
    uploadMessage.textContent = "Please select an audio file.";
    uploadMessage.className = "upload-message error";
    return;
  }

  try {
    const songId = crypto.randomUUID();

    // Store file blobs in IndexedDB
    await saveFileToDB(songId, audioFile, coverFile || null);

    // Store metadata in localStorage
    const song = {
      _id: songId,
      title: title,
      artist: artist,
      filePath: 'local', // marker for local songs
      hasCover: !!coverFile,
      coverImage: '', // will be resolved from IndexedDB
      createdAt: new Date().toISOString()
    };

    const songs = getLocalSongs();
    songs.push(song);
    saveLocalSongs(songs);

    uploadMessage.textContent = "Song uploaded successfully!";
    uploadMessage.className = "upload-message success";
    form.reset();
    audioFileName.textContent = "Drag & Drop or Click to Upload Song (Audio)";
    audioFileName.style.color = "var(--text-subdued)";
    coverFileName.textContent = "Drag & Drop or Click to Upload Thumbnail";
    coverFileName.style.color = "var(--text-subdued)";
    
    await loadSongs();
    if(navUpload.classList.contains("active")) {
        switchView("home");
    }
  } catch (error) {
    console.error("Upload error:", error);
    uploadMessage.textContent = "Error uploading song.";
    uploadMessage.className = "upload-message error";
  }
});

// ==================== Playback Logic ====================
async function playSong(song, index = -1, playlist = null) {
  if (playlist) {
    currentPlaylist = playlist;
  }
  if (index !== -1) {
    currentSongIndex = index;
  }

  let audioSrc = song.filePath;
  
  // For local songs, get audio URL from IndexedDB
  if (!audioSrc || !audioSrc.startsWith('http')) {
    audioSrc = await getSongAudioURL(song);
  }
  
  // Save to history
  recentlyPlayed = recentlyPlayed.filter(s => (s._id || s.filePath) !== (song._id || song.filePath));
  recentlyPlayed.unshift(song);
  if (recentlyPlayed.length > 20) recentlyPlayed.pop();
  localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  
  // Update view if on home
  if (navHome.classList.contains('active')) {
    renderRecentHistory();
  }

  player.src = audioSrc;
  player.play();
  
  // Update UI Player
  playerTrack.textContent = song.title;
  playerArtist.textContent = song.artist;
  
  // Update Album Art
  const coverSrc = song.coverImage && song.coverImage.startsWith('http') 
    ? song.coverImage 
    : await getSongCoverURL(song);
    
  if (coverSrc) {
    playerArt.innerHTML = `<img src="${coverSrc}" alt="Art" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;">`;
  } else {
    playerArt.innerHTML = '';
    playerArt.textContent = song.title.charAt(0).toUpperCase();
    playerArt.style.display = "flex";
    playerArt.style.alignItems = "center";
    playerArt.style.justifyContent = "center";
    playerArt.style.fontSize = "1.5rem";
    playerArt.style.color = "#111";
  }

  updatePlayPauseUI();
  updateNextPrevButtons();
}

// Utilities for Time
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Custom Player Controls Logic
function updatePlayPauseUI() {
  if (player.paused) {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
  } else {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  }
}

playPauseBtn.addEventListener("click", () => {
  if (!player.src || player.src.endsWith(window.location.href)) return;
  if (player.paused) {
    player.play();
  } else {
    player.pause();
  }
});

player.addEventListener("play", updatePlayPauseUI);
player.addEventListener("pause", updatePlayPauseUI);

player.addEventListener("timeupdate", () => {
  const current = player.currentTime;
  const duration = player.duration;
  if (!isNaN(duration)) {
    const progressPercent = (current / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    currentTimeDisplay.textContent = formatTime(current);
    durationDisplay.textContent = formatTime(duration);
  }
});

player.addEventListener("loadedmetadata", () => {
  durationDisplay.textContent = formatTime(player.duration);
});

// Seek Logic
progressBarWrapper.addEventListener("click", (e) => {
  if (!player.duration) return;
  const rect = progressBarWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percent = clickX / width;
  player.currentTime = percent * player.duration;
});

// Next / Prev Logic
let isShuffle = localStorage.getItem('playerShuffle') === 'true';
let repeatMode = localStorage.getItem('playerRepeat') || 'none';

function updateShuffleRepeatUI() {
  if (isShuffle) {
    shuffleBtn.classList.add('active');
  } else {
    shuffleBtn.classList.remove('active');
  }

  repeatBtn.classList.remove('active');
  if (repeatMode === 'all') {
    repeatBtn.classList.add('active');
    repeatBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';
  } else if (repeatMode === 'one') {
    repeatBtn.classList.add('active');
    repeatBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="16" font-size="10" text-anchor="middle" font-weight="bold" font-family="sans-serif">1</text></svg>';
  } else {
    repeatBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';
  }
}

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  localStorage.setItem('playerShuffle', isShuffle);
  updateShuffleRepeatUI();
});

repeatBtn.addEventListener('click', () => {
  if (repeatMode === 'none') repeatMode = 'all';
  else if (repeatMode === 'all') repeatMode = 'one';
  else repeatMode = 'none';
  localStorage.setItem('playerRepeat', repeatMode);
  updateShuffleRepeatUI();
});

updateShuffleRepeatUI();

function playNext(forced = false) {
  if (playbackQueue.length > 0) {
    const nextQueuedSong = playbackQueue.shift();
    playSong(nextQueuedSong, currentSongIndex, currentPlaylist);
    return;
  }

  if (currentPlaylist.length === 0) return;

  if (!forced && repeatMode === 'one') {
    player.currentTime = 0;
    player.play();
    return;
  }

  if (isShuffle && currentPlaylist.length > 1) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * currentPlaylist.length);
    } while (randomIndex === currentSongIndex);
    playSong(currentPlaylist[randomIndex], randomIndex, currentPlaylist);
    return;
  }

  if (currentSongIndex < currentPlaylist.length - 1) {
    playSong(currentPlaylist[currentSongIndex + 1], currentSongIndex + 1, currentPlaylist);
  } else if (repeatMode === 'all') {
    playSong(currentPlaylist[0], 0, currentPlaylist);
  }
}

function playPrev() {
  if (player.currentTime > 3) {
    player.currentTime = 0;
    return;
  }

  if (currentPlaylist.length > 0 && currentSongIndex > 0) {
    playSong(currentPlaylist[currentSongIndex - 1], currentSongIndex - 1, currentPlaylist);
  } else if (currentPlaylist.length > 0 && repeatMode === 'all') {
    const lastIndex = currentPlaylist.length - 1;
    playSong(currentPlaylist[lastIndex], lastIndex, currentPlaylist);
  } else if (player.src && !player.src.endsWith(window.location.href)) {
    player.currentTime = 0;
  }
}

function updateNextPrevButtons() {
  prevBtn.disabled = currentPlaylist.length === 0;
  nextBtn.disabled = currentPlaylist.length === 0;
}

nextBtn.addEventListener("click", () => playNext(true));
prevBtn.addEventListener("click", playPrev);

player.addEventListener("ended", () => playNext(false));

// Volume Control Logic
let currentVolume = parseFloat(localStorage.getItem('playerVolume')) || 1;
let isMuted = localStorage.getItem('playerMuted') === 'true';

function updateVolumeUI() {
  if (isMuted || currentVolume === 0) {
    volHighIcon.style.display = "none";
    volMuteIcon.style.display = "block";
    volumeBar.style.width = "0%";
    player.volume = 0;
  } else {
    volHighIcon.style.display = "block";
    volMuteIcon.style.display = "none";
    volumeBar.style.width = `${currentVolume * 100}%`;
    player.volume = currentVolume;
  }
}

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem('playerMuted', isMuted);
  updateVolumeUI();
});

volumeBarWrapper.addEventListener("click", (e) => {
  const rect = volumeBarWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  let percent = clickX / rect.width;
  
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;

  currentVolume = percent;
  isMuted = false;
  
  localStorage.setItem('playerVolume', currentVolume);
  localStorage.setItem('playerMuted', false);
  updateVolumeUI();
});

updateVolumeUI();

// ==================== Render Songs ====================
function renderSongs(songsToRender) {
  songList.innerHTML = "";
  
  if (songsToRender.length === 0) {
    songList.innerHTML = "<p style='color: var(--text-subdued)'>No songs found.</p>";
    songList.style.display = "block";
    return;
  }
  
  songList.style.display = "grid";

  songsToRender.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "song-card";
    
    // Build cover HTML
    let coverHtml = "";
    if (song.coverImage && song.coverImage.startsWith('http')) {
      coverHtml = `<img src="${song.coverImage}" alt="Cover" style="width: 100%; aspect-ratio: 1; border-radius: 4px; margin-bottom: 16px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">`;
    } else if (song._id && song.hasCover) {
      // Will load async
      coverHtml = `<div class="cover" data-song-id="${song._id}" style="width: 100%; aspect-ratio: 1; border-radius: 4px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">${(song.artist || 'M').charAt(0).toUpperCase()}</div>`;
    } else {
      const initial = song.artist ? song.artist.charAt(0).toUpperCase() : "M";
      coverHtml = `<div class="cover">${initial}</div>`;
    }
    
    card.innerHTML = `
      ${coverHtml}
      <h4>${song.title}</h4>
      <p>${song.artist}</p>
      <div class="options-btn" title="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </div>
      <div class="like-button" title="Like">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="heart-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </div>
      <div class="play-button"></div>
    `;

    // Load cover image from IndexedDB if needed
    if (song._id && song.hasCover) {
      getSongCoverURL(song).then(coverUrl => {
        if (coverUrl) {
          const coverDiv = card.querySelector(`[data-song-id="${song._id}"]`);
          if (coverDiv) {
            coverDiv.outerHTML = `<img src="${coverUrl}" alt="Cover" style="width: 100%; aspect-ratio: 1; border-radius: 4px; margin-bottom: 16px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">`;
          }
        }
      });
    }

    // Options Menu Logic
    const optionsBtn = card.querySelector('.options-btn');
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
      
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      
      // Add to Queue Option
      const queueItem = document.createElement('div');
      queueItem.className = 'context-menu-item';
      queueItem.textContent = 'Add to queue';
      queueItem.addEventListener('click', (e2) => {
        e2.stopPropagation();
        playbackQueue.push(song);
        queueItem.textContent = 'Added!';
        queueItem.style.color = 'var(--accent-color)';
        setTimeout(() => menu.remove(), 800);
      });
      menu.appendChild(queueItem);

      const divider1 = document.createElement('div');
      divider1.className = 'context-menu-divider';
      menu.appendChild(divider1);
      
      // Add to Playlist Option
      const addHeader = document.createElement('div');
      addHeader.className = 'context-menu-item';
      addHeader.textContent = 'Add to playlist';
      addHeader.style.color = 'var(--text-subdued)';
      addHeader.style.pointerEvents = 'none';
      menu.appendChild(addHeader);

      const divider = document.createElement('div');
      divider.className = 'context-menu-divider';
      menu.appendChild(divider);

      if (Object.keys(userPlaylists).length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'context-menu-item';
        emptyItem.textContent = '(No playlists yet)';
        emptyItem.style.color = 'var(--text-subdued)';
        menu.appendChild(emptyItem);
      } else {
        Object.keys(userPlaylists).forEach(pName => {
          const item = document.createElement('div');
          item.className = 'context-menu-item';
          item.textContent = pName;
          
          item.addEventListener('click', (e2) => {
            e2.stopPropagation();
            const exists = userPlaylists[pName].some(s => (s._id || s.filePath) === (song._id || song.filePath));
            if (!exists) {
              userPlaylists[pName].push(song);
              localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
              alert(`Added to ${pName}`);
            } else {
              alert(`Already in ${pName}`);
            }
            menu.remove();
          });
          menu.appendChild(item);
        });
      }

      document.body.appendChild(menu);
      
      setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        });
      }, 0);
    });

    const isLiked = likedSongs.some(likedSong => (likedSong._id || likedSong.filePath) === (song._id || song.filePath));
    if (isLiked) {
      card.querySelector('.like-button').classList.add('liked');
    }

    const likeBtn = card.querySelector('.like-button');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const currentlyLiked = likeBtn.classList.contains('liked');
      if (currentlyLiked) {
        likeBtn.classList.remove('liked');
        likedSongs = likedSongs.filter(s => (s._id || s.filePath) !== (song._id || song.filePath));
      } else {
        likeBtn.classList.add('liked');
        likedSongs.push(song);
      }
      
      localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
      
      if (navLiked.classList.contains('active') && currentlyLiked) {
        renderSongs(likedSongs);
      }
    });

    card.addEventListener("click", () => playSong(song, index, songsToRender));
    songList.appendChild(card);
  });
}

function renderRecentHistory() {
  const container = document.getElementById("recentList");
  const section = document.getElementById("recently-played-section");
  if (!container || !section) return;

  if (recentlyPlayed.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  container.innerHTML = "";
  
  recentlyPlayed.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "song-card recent-card";
    
    let coverHtml = "";
    if (song.coverImage && song.coverImage.startsWith('http')) {
      coverHtml = `<img src="${song.coverImage}" alt="Cover" style="width: 100%; aspect-ratio: 1; border-radius: 4px; margin-bottom: 12px; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">`;
    } else if (song._id && song.hasCover) {
      coverHtml = `<div class="cover recent-cover" data-recent-id="${song._id}">${(song.artist || 'M').charAt(0).toUpperCase()}</div>`;
    } else {
      const initial = song.artist ? song.artist.charAt(0).toUpperCase() : "M";
      coverHtml = `<div class="cover recent-cover">${initial}</div>`;
    }
    
    card.innerHTML = `
      ${coverHtml}
      <h4>${song.title}</h4>
      <p>${song.artist}</p>
      <div class="play-button recent-play-button"></div>
    `;

    // Load cover from IndexedDB if local
    if (song._id && song.hasCover) {
      getSongCoverURL(song).then(coverUrl => {
        if (coverUrl) {
          const coverDiv = card.querySelector(`[data-recent-id="${song._id}"]`);
          if (coverDiv) {
            coverDiv.outerHTML = `<img src="${coverUrl}" alt="Cover" style="width: 100%; aspect-ratio: 1; border-radius: 4px; margin-bottom: 12px; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">`;
          }
        }
      });
    }

    card.addEventListener("click", () => playSong(song, 0, [song]));
    container.appendChild(card);
  });
}

// ==================== Load Songs (from localStorage) ====================
async function loadSongs() {
  try {
    allSongs = getLocalSongs().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (navSearch.classList.contains("active") && !searchInput.value) {
        renderSongs(allSongs);
    } else if (!navSearch.classList.contains("active")) {
        renderSongs(allSongs);
    }
  } catch (error) {
    console.error("Failed to load songs:", error);
  }
}

// Initial Load
loadSongs();

// User Profile & Logout Logic
const userAvatar = document.querySelector('.user-profile .avatar');
if (userAvatar) {
  const storedUser = localStorage.getItem('username');
  if (storedUser) {
    userAvatar.textContent = storedUser.charAt(0).toUpperCase();
  }
  
  userAvatar.addEventListener('click', () => {
    if(confirm(`Logged in as ${storedUser || 'User'}\nAre you sure you want to log out?`)) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      window.location.href = 'login.html';
    }
  });
}