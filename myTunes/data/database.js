// This file creates the sqlite tables used to store the data in this program

const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./data/mytunes.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the mytunes SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    userId INTEGER,
    FOREIGN KEY (userId) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY,
    playlistId INTEGER,
    songId TEXT NOT NULL,
    songData TEXT NOT NULL,
    FOREIGN KEY (playlistId) REFERENCES playlists (id)
  )`);
});

module.exports = db;
