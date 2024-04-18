const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const databaseFile = 'music_database.db';

if (fs.existsSync(databaseFile)) {
    connectToDatabase();
} else {
    createDatabase();
}

function connectToDatabase() {
    const db = new sqlite3.Database(databaseFile, (err) => {
        if (err) {
            console.error('Error connecting to the database:', err.message);
        } else {
            console.log('Connected to the SQLite database.');
        }
    });

    module.exports = db;
}

function createDatabase() {
    const db = new sqlite3.Database(databaseFile, (err) => {
        if (err) {
            console.error('Error connecting to the database:', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            createTables();
        }
    });

    function createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL
            )
        `;

        const createSongsTable = `
            CREATE TABLE IF NOT EXISTS Songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                genre TEXT,
                file_path TEXT NOT NULL,
                song_image BLOB -- New column for storing song image
            )
        `;

        const insertAdminUser = `
            INSERT INTO Users (username, password, email, role)
            VALUES ('admin', 'admin', 'admin@gmail.com', 'admin')
        `;

        db.serialize(() => {
            db.run(createUsersTable);
            db.run(createSongsTable, (err) => {
                if (err) {
                    console.error('Error creating songs table:', err.message);
                } else {
                    console.log('Songs table created successfully.');
                }
            });
            db.run(insertAdminUser, (err) => {
                if (err) {
                    console.error('Error inserting admin user:', err.message);
                } else {
                    console.log('Admin user inserted successfully.');
                }
            });
        });
    }

    module.exports = db;
}
