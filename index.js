const express = require('express');
const multer  = require('multer');
const bodyParser = require('body-parser');
const crud = require('./crud');
const db = require('./database');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Serve static files from the 'public' directory
app.use(express.static('static'));

// Set up storage using multer.diskStorage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Specify the destination folder based on file type
        if (file.fieldname === 'musicFile') {
            cb(null, 'music/'); // Music files destination
        } else if (file.fieldname === 'imageFile') {
            cb(null, 'static/images/'); // Image files destination
        }
    },
    filename: function (req, file, cb) {
        // Rename the uploaded file (you can customize this as needed)
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Create multer instance with the configured storage
const upload = multer({ storage: storage });

const session = require('express-session');

// Add this before defining your routes
app.use(session({
    secret: 'your-secret-key', // Change this to a random secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000, // Session duration in milliseconds (e.g., 1 hour)
        // Other cookie options as needed
    }
}));


app.get('/', (req, res) => {
    res.render('login');
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Implement logic to authenticate user from the database
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Error during login:', err);
            res.status(500).send('Internal server error');
            return;
        }
        
        if (!user || user.password !== password) {
            // Invalid username or password, render login page with error message
            res.render('login', { error: 'Invalid username or password' });
            return;
        }

        // Set user data in session
        req.session.user = user;

        // Redirect user based on role
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// Logout endpoint
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal server error');
            return;
        }
        res.redirect('/'); // Redirect to login page after logout
    });
});

// Endpoint to render the user profile page
app.get('/profile', (req, res) => {
    // Retrieve the username and email of the logged-in user from the session
    const { username, email } = req.session.user;

    // Render the profile.ejs template and pass the username and email to it
    res.render('profile', { username, email });
});




app.get('/signup', (req, res) => {
    res.render('signup');
});

// Signup endpoint
app.post('/signup', (req, res) => {
    const { username, password, email } = req.body;
    const role = 'customer'; // Default role for signup

    // Check if the username or email already exists in the database
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
        if (err) {
            console.error('Error during signup:', err);
            res.status(500).send('Internal server error');
            return;
        }
        
        if (existingUser) {
            // User with the same username or email already exists, redirect back to signup page with an error message
            res.render('signup', { error: 'Username or email already exists' });
            return;
        }

        // Insert the new user into the database with default role
        db.run('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', [username, password, email, role], (err) => {
            if (err) {
                console.error('Error during signup:', err);
                res.status(500).send('Internal server error');
                return;
            }

            // Signup successful, redirect to the login page with a success message
            res.render('login', { success: 'Signup successful! You can now login' });
        });
    });
});

// Endpoint to render admin page and fetch all songs
app.get('/admin', (req, res) => {
    // Use the getAllSongs function to fetch all songs
    crud.getAllSongs((err, songs) => {
        if (err) {
            // Handle error
            res.status(500).send('Error fetching songs');
        } else {
            // Render the admin view and pass the songs context
            res.render('admin', { songs: songs });
        }
    });
});


app.get('/add-music', (req, res) => {
    res.render('add-music');
});

// Endpoint to save music data
app.post('/save-music', upload.fields([{ name: 'musicFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), (req, res) => {
    const { title, artist, album, genre } = req.body;
    const musicFilePath = req.files['musicFile'][0].path;
    const imageFilePath = req.files['imageFile'][0].path;

    const imageName = imageFilePath.split('\\').pop();

    // Call the function to create a new song
    crud.createSong(title, artist, album, genre, musicFilePath, imageName);

    // Redirect to admin page or any other appropriate page after saving the song
    res.redirect('/admin');
});

// Endpoint to delete a song by ID
app.post('/delete-song/:id', (req, res) => {
    const id = req.params.id;

    // Call the function to delete the song by ID
    crud.deleteSong(id);

    // Redirect to admin page or any other appropriate page after deleting the song
    res.redirect('/admin');
});

// Endpoint to render the edit song page
app.get('/edit-song/:id', (req, res) => {
    const id = req.params.id;

    // Fetch the song details by ID
    crud.getSongById(id, (err, song) => {
        if (err) {
            console.error('Error fetching song:', err.message);
            // Handle error (e.g., render an error page)
            res.status(500).send('Internal server error');
            return;
        }

        // Render the edit song page with the song details
        res.render('edit-song', { song: song });
    });
});

// Endpoint to handle song edit form submission
app.post('/edit-song/:id', upload.fields([{ name: 'musicFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), (req, res) => {
    const id = req.params.id;
    const { title, artist, album, genre } = req.body;
    const newMusicFilePath = req.files['musicFile'] ? req.files['musicFile'][0].path : null;
    const newImageFilePath = req.files['imageFile'] ? req.files['imageFile'][0].path : null;
    const currentMusicFilePath = req.body.currentMusicPath;
    const currentImageFilePath = req.body.currentImagePath;

    // Determine the file paths to update in the database
    const updatedMusicFilePath = newMusicFilePath ? newMusicFilePath : currentMusicFilePath;
    const updatedImageFilePath = newImageFilePath ? newImageFilePath : currentImageFilePath;

    const imageName = updatedImageFilePath.split('\\').pop();

    // Call the function to update the song by ID
    crud.updateSong(id, title, artist, album, genre, updatedMusicFilePath, imageName);

    // Redirect to admin page or any other appropriate page after updating the song
    res.redirect('/admin');
});

// Endpoint to render the dashboard page
app.get('/dashboard', (req, res) => {
    // Assuming you have a function to fetch all music data from the database
    crud.getAllSongs((err, songs) => {
        if (err) {
            console.error('Error fetching music data:', err.message);
            res.status(500).send('Internal Server Error');
        } else {
            // Render the dashboard page and pass the music data to the template
            res.render('dashboard', { musics: songs });
        }
    });
});

// Define the route to handle music playback
app.get('/play/:id', async (req, res) => {
    const musicId = req.params.id;

    try {
        // Retrieve the file path from the database based on the music ID
        const filePath = await crud.getMusicFilePathFromDatabase(musicId);

        console.log(filePath);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Set the appropriate content type header
            res.set('Content-Type', 'audio/mpeg');

            // Stream the audio file to the response
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});





app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
