const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Path to the JSON file that stores song metadata
const SONGS_FILE = path.join(__dirname, '..', 'songs.json');

// Helper: read songs from JSON file
function readSongs() {
  try {
    if (!fs.existsSync(SONGS_FILE)) {
      fs.writeFileSync(SONGS_FILE, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(SONGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading songs.json:', err);
    return [];
  }
}

// Helper: write songs to JSON file
function writeSongs(songs) {
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2), 'utf-8');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all songs
router.get('/', (req, res) => {
  try {
    const songs = readSongs().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single song
router.get('/:id', (req, res) => {
  try {
    const songs = readSongs();
    const song = songs.find(s => s._id === req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload a new song
router.post('/', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  try {
    const audioFile = req.files && req.files['audio'] ? req.files['audio'][0].path : '';
    const coverFile = req.files && req.files['cover'] ? req.files['cover'][0].path : '';

    const song = {
      _id: crypto.randomUUID(),
      title: req.body.title,
      artist: req.body.artist,
      album: req.body.album || '',
      genre: req.body.genre || '',
      duration: req.body.duration || 0,
      filePath: audioFile,
      coverImage: coverFile || req.body.coverImage || '',
      createdAt: new Date().toISOString()
    };

    const songs = readSongs();
    songs.push(song);
    writeSongs(songs);

    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a song
router.delete('/:id', (req, res) => {
  try {
    let songs = readSongs();
    const songIndex = songs.findIndex(s => s._id === req.params.id);
    if (songIndex === -1) {
      return res.status(404).json({ message: 'Song not found' });
    }
    songs.splice(songIndex, 1);
    writeSongs(songs);
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
