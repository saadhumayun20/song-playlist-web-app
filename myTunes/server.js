// Server code used takes most of the work done in Assignment 4 
// and expands upon it

// This application allows users to create and store their playlists
// along with their songs

const express = require('express');
const session = require('express-session');
const http = require('http');
const pug = require('pug');
const db = require('./data/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Setting up Pug as the view engine
app.set('view engine', 'pug');
app.set('views', './views');

// Middleware for parsing request bodies and managing sessions
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Route handlers
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;
    db.all('SELECT * FROM playlists WHERE userId = ?', [userId], (err, playlists) => {
      if (err) {
        console.error(err);
        res.render('index', { title: 'MyTunes', playlists: [] });
      } else {
        res.render('index', { title: 'MyTunes', playlists: playlists });
      }
    });
  } else {
    res.render('index', { title: 'MyTunes', playlists: [] });
  }
});

// Fetching songs using iTunes API (taken and worked off of Assignment)
app.get('/songs', (request, response) => {
  let songTitle = request.query.title;
  if (!songTitle) {
    response.json({ message: 'Please enter a song title' });
    return;
  }

  const titleWithPlusSigns = songTitle.split(' ').join('+');
  let options = {
    method: "GET",
    hostname: "itunes.apple.com",
    path: `/search?term=${titleWithPlusSigns}&entity=musicTrack&limit=20`
  };

  const req = http.request(options, function (apiResponse) {
    let songData = '';
    apiResponse.on('data', function (chunk) {
      songData += chunk;
    });
    apiResponse.on('end', function () {
      let data = JSON.parse(songData);
      data.results = data.results.slice(0, 20);
      response.contentType('application/json').json(data);
    });
  });

  req.end();
});

// Register a new user
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).send('Error checking user existence');
    }

    if (row) {
      return res.status(409).send('User already exists');
    }

    const role = username === 'yourAdminUsername' ? 'admin' : 'guest';
    const insert = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
    db.run(insert, [username, password, role], function (err) {
      if (err) {
        return res.status(500).send('Error registering new user');
      }
      res.send('User registered successfully');
    });
  });
});

// Authenticate user and initialize session
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (row) {
      req.session.user = { id: row.id, username: row.username, role: row.role };
      res.json({ message: 'Login successful', username: row.username, role: row.role });
    } else {
      res.status(401).json({ message: 'Login failed' });
    }
  });
});

// Logout user by destroying session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(`Error during session destruction: ${err}`);
      return res.status(500).send('Could not log out, please try again.');
    }
    res.redirect('/');
  });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).send('Unauthorized');
}

// Middleware to check if authenticated user is an admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied');
}

// Fetch and return users part of the admin privelages
app.get('/users', isAdmin, (req, res) => {
  db.all('SELECT id, username, role FROM users', [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error fetching users' });
    }
    res.json({ success: true, users: rows });
  });
});

// Fetch and return playlists for logged-in user
app.get('/playlists', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }

  const userId = req.session.user.id;
  db.all('SELECT * FROM playlists WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error retrieving playlists' });
    }

    res.json({ success: true, playlists: rows });
  });
});

// Create a new playlist for logged-in user
app.post('/playlists', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { name } = req.body;
  const userId = req.session.user.id;

  const sql = 'INSERT INTO playlists (name, userId) VALUES (?, ?)';

  db.run(sql, [name, userId], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create playlist' });
    }
    res.json({ success: true, playlistId: this.lastID });
  });
});

// Add a song to a specific playlist
app.post('/playlists/:playlistName/songs', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { playlistName } = req.params;
  const { song } = req.body;
  const userId = req.session.user.id;

  db.get(`SELECT id FROM playlists WHERE name = ? AND userId = ?`, [playlistName, userId], (err, playlist) => {
    if (err || !playlist) {
      console.error('Database error or playlist not found:', err);
      return res.status(500).json({ success: false, message: 'Playlist not found or server error' });
    }

    const songId = song.trackId;
    const songData = JSON.stringify(song);

    db.run(`INSERT INTO playlist_songs (playlistId, songId, songData) VALUES (?, ?, ?)`, [playlist.id, songId, songData], function (err) {
      if (err) {
        console.error('Failed to add song to playlist:', err);
        return res.status(500).json({ success: false, message: 'Failed to add song to playlist' });
      }
      res.json({ success: true, message: 'Song added to playlist successfully' });
    });
  });
});

// Fetch songs for a specific playlist
app.get('/playlists/:playlistId/songs', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }

  const playlistId = req.params.playlistId;
  const sql = `SELECT songData FROM playlist_songs WHERE playlistId = ?`;

  db.all(sql, [playlistId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error fetching songs');
    } else {
      const songs = rows.map(row => JSON.parse(row.songData));
      res.json(songs);
    }
  });
});

// Delete a specific playlist
app.delete('/playlists/:playlistId', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { playlistId } = req.params;

  const sql = 'DELETE FROM playlists WHERE id = ? AND userId = ?';

  db.run(sql, [playlistId, req.session.user.id], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete playlist' });
    }
    if (this.changes > 0) {
      res.json({ success: true, message: 'Playlist deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Playlist not found or belongs to another user' });
    }
  });
});

// Remove a specific song from a playlist
app.delete('/playlists/:playlistId/songs', (req, res) => {
  const { playlistId } = req.params;
  const songTitle = req.body.title;

  const deleteQuery = `DELETE FROM playlist_songs WHERE playlistId = ? AND songData LIKE ?`;
  db.run(deleteQuery, [playlistId, `%${songTitle}%`], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete song from playlist' });
    }
    res.json({ success: true, message: 'Song removed successfully' });
  });
});

// Fetch a specific playlist by name
app.get('/playlists/name/:name', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const playlistName = req.params.name;
  const userId = req.session.user.id;

  const sql = 'SELECT id FROM playlists WHERE name = ? AND userId = ? LIMIT 1';

  db.get(sql, [playlistName, userId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    if (row) {
      res.json({ success: true, playlistId: row.id });
    } else {
      res.status(404).json({ success: false, message: 'Playlist not found' });
    }
  });
});

// Start the server
app.listen(PORT, err => {
  if (err) console.log(err)
  else {
    console.log(`Server listening on port: ${PORT}`)
    console.log(`To Test:`)
    console.log(`http://localhost:3000`)
  }
})
