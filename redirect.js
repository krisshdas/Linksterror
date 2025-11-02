// redirect.js
// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBMSFIlfrXV9vPdpXUJm3HkaFVJwXeB0h8",
    authDomain: "link-shortner-2898c.firebaseapp.com",
    databaseURL: "https://link-shortner-2898c-default-rtdb.firebaseio.com",
    projectId: "link-shortner-2898c",
    storageBucket: "link-shortner-2898c.firebasestorage.app",
    messagingSenderId: "283153832071",
    appId: "1:283153832071:web:8704bb833305447d4f8022",
    measurementId: "G-J3XWHEX759"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get the short code from the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const shortCode = urlParams.get('id');

// If no short code, redirect to home
if (!shortCode) {
    window.location.href = 'index.html';
}

// Find the link in the database
database.ref('users').once('value')
    .then((snapshot) => {
        const users = snapshot.val() || {};
        let linkFound = false;
        
        for (const userId in users) {
            const userLinks = users[userId].links || {};
            
            for (const linkId in userLinks) {
                const link = userLinks[linkId];
                
                if (link.shortCode === shortCode) {
                    linkFound = true;
                    
                    // Increment click count
                    database.ref('users/' + userId + '/links/' + linkId).update({
                        clicks: (link.clicks || 0) + 1
                    });
                    
                    // Store the original URL and short code in session storage
                    sessionStorage.setItem('originalUrl', link.originalUrl);
                    sessionStorage.setItem('shortCode', shortCode);
                    
                    // Redirect to the first ad page
                    window.location.href = 'ad1.html';
                    
                    return;
                }
            }
        }
        
        // If no link found with the short code, show error
        if (!linkFound) {
            document.getElementById('error-message').textContent = 'Link not found or has been removed';
            document.getElementById('error-container').style.display = 'block';
        }
    })
    .catch((error) => {
        console.error('Error finding link:', error);
        document.getElementById('error-message').textContent = 'Error loading link';
        document.getElementById('error-container').style.display = 'block';
    });
