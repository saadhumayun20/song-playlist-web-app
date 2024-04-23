// Setup initial UI state when DOM content fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Event listeners for various buttons calling different functions through the applciation
  document.getElementById("main-content").style.display = "none";
  document.getElementById("register-section").style.display = "none";

  document
    .getElementById("login-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      login();
    });

  document
    .getElementById("register-button")
    .addEventListener("click", function () {
      document.getElementById("login-section").style.display = "none";
      document.getElementById("register-section").style.display = "block";
    });

  document
    .getElementById("registration-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      registerUser();
    });

  document
    .getElementById("submit-button")
    .addEventListener("click", searchSongs);
  document
    .getElementById("song-title")
    .addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        searchSongs();
      }
    });

  document.getElementById("logout-button").addEventListener("click", logout);

  document
    .getElementById("create-playlist-button")
    .addEventListener("click", function () {
      console.log("Create playlist button clicked");
      document.getElementById("create-playlist-modal").style.display = "block";
    });

  document
    .getElementById("create-playlist-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const playlistName = document
        .getElementById("playlist-name")
        .value.trim();
      if (playlistName) {
        createPlaylist(playlistName);
      } else {
        alert("Please enter a playlist name.");
      }
    });

  document
    .getElementById("remove-playlist-button")
    .addEventListener("click", function () {
      const playlistName = prompt("Enter the name of the playlist to remove:");
      if (playlistName) {
        removePlaylistByName(playlistName);
      }
    });
});

// Allows the user to login, afterwhich the main content is avaiable
function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Login failed");
      return response.json();
    })
    .then((data) => {
      console.log(data);
      if (data.username) {
        showMainContent(data.username, data.role);
        getPlaylists();
      } else {
        throw new Error(data.message);
      }
    })
    .catch((error) => {
      alert(error.message);
    });
}

// Allows the user to register if they have not before
function registerUser() {
  const username = document.getElementById("new-username").value;
  const password = document.getElementById("new-password").value;

  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Registration failed");
      return response.text();
    })
    .then((result) => {
      alert("Registration successful");
      document.getElementById("register-section").style.display = "none";
      document.getElementById("login-section").style.display = "block";
    })
    .catch((error) => {
      alert(error.message);
    });
}

// This simply shows the registration page if the user wants to register
function showRegisterSection() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
}

// Shows the actual content on the main page, only if the user is logged in
function showMainContent(username, role) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("main-content").style.display = "block";
  document.getElementById("user-name").textContent = username;

  if (role === "admin") {
    document.getElementById("admin-section").style.display = "block";
    const viewUsersButton = document.createElement("button");
    viewUsersButton.textContent = "View Users";
    viewUsersButton.id = "view-users-button";
    viewUsersButton.addEventListener("click", displayUsers);
    document.getElementById("header").appendChild(viewUsersButton);
  } else {
    document.getElementById("admin-section").style.display = "none";
  }
}

// Allows the user to create a new playlist
function createPlaylist(playlistName) {
  fetch("/playlists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: playlistName }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("playlist-name").value = "";
        addPlaylistToDOM(playlistName, data.playlistId);
      } else {
        alert("Failed to create playlist. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error creating playlist:", error);
      alert("Error creating playlist.");
    });
}

// This updates the playlists which were recently added and adds to DOM
function addPlaylistToDOM(playlistName, playlistId) {
  const playlistsContainer = document.getElementById("playlists");
  const newPlaylistItem = document.createElement("div");
  newPlaylistItem.textContent = playlistName;
  newPlaylistItem.className = "playlist-item";
  newPlaylistItem.dataset.playlistId = playlistId;

  newPlaylistItem.addEventListener("click", function () {
    displaySongsForPlaylist(playlistId);
  });

  playlistsContainer.appendChild(newPlaylistItem);
}

// This function allows the admin to see all users registered
function displayUsers() {
  const usersListContainer = document.getElementById("users-list");

  if (usersListContainer && usersListContainer.style.display === "block") {
    renderUsersList();
    return;
  }

  fetch("/users")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch user list");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        renderUsersList(data.users);
      } else {
        alert("Failed to fetch user list: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error fetching users:", error);
      alert("Error fetching users: " + error.message);
    });
}

// This simply renders the users as a list onto the page
function renderUsersList(users) {
  let usersListContainer = document.getElementById("users-list");

  if (!usersListContainer) {
    usersListContainer = document.createElement("div");
    usersListContainer.id = "users-list";
    usersListContainer.style.display = "none";
    document.body.appendChild(usersListContainer);
  }

  if (
    usersListContainer.style.display === "none" ||
    usersListContainer.style.display === ""
  ) {
    usersListContainer.style.display = "block";
    usersListContainer.innerHTML = "";
    users.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.textContent = `ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`;
      usersListContainer.appendChild(userDiv);
    });
  } else {
    usersListContainer.style.display = "none";
  }
}

// Song search function which searches iTunes for specific song
function searchSongs() {
  let songTitle = document.getElementById("song-title").value;
  if (!songTitle.trim()) return;
  fetch(`/songs?title=${encodeURIComponent(songTitle)}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("Received data:", data);
      displaySearchResults(data);
    })
    .catch((error) => {
      console.error("Error fetching songs:", error);
      alert("Error fetching songs.");
    });
}

// Displays the songs searched as a table
function displaySearchResults(data) {
  const searchResultsHeading = document.getElementById(
    "search-results-heading"
  );
  const searchResultsTable = document.getElementById("search-results-table");
  let tbody = searchResultsTable.querySelector("tbody");
  if (!tbody) {
    tbody = searchResultsTable.createTBody();
  }
  tbody.innerHTML = "";

  if (data.results.length > 0) {
    const songTitle = document.getElementById("song-title").value;
    searchResultsHeading.textContent = `Songs matching: ${songTitle}`;

    data.results.forEach((song) => {
      let row = searchResultsTable.insertRow();
      let addButton = row.insertCell(0);
      addButton.textContent = "+";
      addButton.className = "add-song-button";
      addButton.addEventListener("click", function () {
        addToPlaylist(song);
      });

      let songTitleCell = row.insertCell(1);
      songTitleCell.textContent = song.trackName;

      let artistNameCell = row.insertCell(2);
      artistNameCell.textContent = song.artistName;

      let artworkCell = row.insertCell(3);
      let img = document.createElement("img");
      img.src = song.artworkUrl100;
      artworkCell.appendChild(img);
    });
  } else {
    searchResultsHeading.textContent = "";
  }
}

// This fetches the existing playlists which is displayed to the user
function getPlaylists() {
  fetch("/playlists")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        renderPlaylists(data.playlists);
      } else {
        console.error("Failed to load playlists:", data.message);
      }
    })
    .catch((error) => console.error("Error loading playlists:", error));
}

// This function actually renders the playlists on the page as an array (which can be clicked on to access playlist songs)
function renderPlaylists(playlists) {
  const playlistsContainer = document.getElementById("playlists");
  playlistsContainer.innerHTML = "";
  playlists.forEach((playlist) => {
    const playlistDiv = document.createElement("div");
    const playlistNameSpan = document.createElement("span");
    playlistNameSpan.textContent = playlist.name;
    playlistNameSpan.classList.add("playlist-name");
    playlistDiv.dataset.playlistId = playlist.id;
    playlistDiv.appendChild(playlistNameSpan);
    playlistDiv.classList.add("clickable-playlist", "playlist-item");
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.classList.add("remove-playlist-button");
    removeButton.dataset.playlistId = playlist.id;
    playlistsContainer.appendChild(playlistDiv);
  });

  document
    .querySelectorAll(".clickable-playlist .playlist-name")
    .forEach((item) => {
      item.addEventListener("click", function (event) {
        const playlistId = this.parentElement.dataset.playlistId;
        fetch(`/playlists/${playlistId}/songs`)
          .then((response) => response.json())
          .then((songs) => {
            displaySongsForPlaylist(songs, playlistId);
          })
          .catch((error) =>
            console.error("Failed to fetch songs for playlist:", error)
          );
      });
    });
}

// Adds a specific song in the song search to the playlist of the users choice
function addToPlaylist(song) {
  const playlistName = prompt(
    "Enter the name of the playlist to add this song to:"
  );
  if (playlistName) {
    fetch(`/playlists/${encodeURIComponent(playlistName)}/songs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ song }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Song added to playlist successfully.");
        } else {
          alert("Failed to add song to playlist. " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error adding song to playlist:", error);
        alert("Error adding song to playlist.");
      });
  }
}

// This displays the songs inside a playlist (and follows by also displaying a remove song button)
function displaySongsForPlaylist(songs, playlistId) {
  const songsDisplayArea = document.getElementById("songs-display-area");
  songsDisplayArea.innerHTML = "";
  const songsContainer = document.createElement("div");
  songsContainer.classList.add("playlist-songs-container");

  const removeSongButton = document.createElement("button");
  removeSongButton.textContent = "Remove a Song";
  removeSongButton.classList.add("remove-song-button");
  removeSongButton.addEventListener("click", function () {
    removeSongByTitlePrompt(playlistId);
  });
  songsDisplayArea.appendChild(removeSongButton);

  songs.forEach((song) => {
    const songItem = document.createElement("div");
    songItem.classList.add("song-item");
    songItem.textContent = song.trackName;
    songsContainer.appendChild(songItem);
  });

  songsDisplayArea.appendChild(songsContainer);
}

// This function prompts the user asking them which song they want to remove from a playlist
function removeSongByTitlePrompt(playlistId) {
  const songTitle = prompt("Enter the name of the song to remove:");
  if (songTitle) {
    removeSongFromPlaylistByName(songTitle, playlistId);
  }
}

// This function actually removes the song from the requested playlist
function removeSongFromPlaylistByName(songTitle, playlistId) {
  fetch(`/playlists/${playlistId}/songs`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: songTitle }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to remove song");
      }
      return response.json();
    })
    .then((data) => {
      alert(data.message);
      return fetch(`/playlists/${playlistId}/songs`);
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch updated songs list");
      }
      return response.json();
    })
    .then((updatedSongs) => {
      displaySongsForPlaylist(updatedSongs);
    })
    .catch((error) => {
      console.error("Error removing song:", error);
      alert("Error removing song: " + error.message);
    });
}

// This function prompts the user asking them which playlist they want to remove
function removePlaylistByName(playlistName) {
  if (playlistName) {
    fetch(`/playlists/name/${encodeURIComponent(playlistName)}`, {
      method: "GET",
      headers: {},
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.playlistId) {
          removePlaylist(data.playlistId);
        } else {
          throw new Error("Playlist not found");
        }
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });
  }
}

// This function removes a whole playlist which the user requested
function removePlaylist(playlistId) {
  fetch(`/playlists/${playlistId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to delete playlist");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        const playlistElement = document.querySelector(
          `.playlist-item[data-playlist-id="${playlistId}"]`
        );
        if (playlistElement) {
          playlistElement.remove();
        }
        alert("Playlist removed successfully");
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((error) => {
      alert("An error occurred: " + error.message);
    });
}

// This function logs the user out and clears everything
function logout() {
  fetch("/logout", { method: "GET", credentials: "include" })
    .then((response) => {
      if (response.ok) {
        window.location.href = "/";
      } else {
        alert("Logout failed, please try again.");
      }
    })
    .catch((error) => {
      console.error("Error logging out:", error);
      alert("An error occurred during logout. Please try again.");
    });
}
