const db = require('./database'); 

// Function to create a new song
function createSong(title, artist, album, genre, file_path, song_image) {
    const sql = `INSERT INTO Songs (title, artist, album, genre, file_path, song_image) VALUES (?, ?, ?, ?, ?,?)`;
    db.run(sql, [title, artist, album, genre, file_path, song_image], (err) => {
        if (err) {
            console.error('Error creating song:', err.message);
        } else {
            console.log('Song created successfully.');
        }
    });
}

// Function to delete a song by ID
function deleteSong(id) {
    const sql = `DELETE FROM Songs WHERE id = ?`;
    db.run(sql, [id], (err) => {
        if (err) {
            console.error('Error deleting song:', err.message);
        } else {
            console.log('Song deleted successfully.');
        }
    });
}

// Function to update a song by ID
function updateSong(id, title, artist, album, genre, file_path, song_image) {
    const sql = `UPDATE Songs SET title = ?, artist = ?, album = ?, genre = ?, file_path = ?, song_image = ? WHERE id = ?`;
    db.run(sql, [title, artist, album, genre, file_path,song_image, id], (err) => {
        if (err) {
            console.error('Error updating song:', err.message);
        } else {
            console.log('Song updated successfully.');
        }
    });
}

// Function to get all songs
function getAllSongs(callback) {
    const sql = `SELECT * FROM Songs`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error getting songs:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

// Function to get a song by ID
function getSongById(id, callback) {
    const sql = `SELECT * FROM Songs WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error getting song by ID:', err.message);
            callback(err, null);
            return;
        }
        // If the song is found, return it
        if (row) {
            callback(null, row);
        } else {
            // If no song is found with the given ID, return null
            callback(null, null);
        }
    });
}

// Function to retrieve the file path from the database based on the music ID
function getMusicFilePathFromDatabase(musicId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT file_path FROM Songs WHERE id = ?';
        db.get(sql, [musicId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                reject(new Error('Music not found'));
                return;
            }
            resolve(row.file_path);
        });
    });
}

// Export CRUD functions
module.exports = {
    createSong,
    deleteSong,
    updateSong,
    getAllSongs,
    getSongById,
    getMusicFilePathFromDatabase
};
