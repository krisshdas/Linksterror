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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elements
const loadingScreen = document.getElementById('loadingScreen');
const adContainer = document.getElementById('adContainer');
const errorContainer = document.getElementById('errorContainer');
const progress = document.getElementById('progress');
const countdown = document.getElementById('countdown');
const skipAd = document.getElementById('skipAd');
const adContent = document.getElementById('adContent');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');

// Get the short code from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const shortCode = urlParams.get('code');

// Ad configuration
let ads = [];
let currentAdIndex = 0;
let originalUrl = '';
let countdownInterval;
let timeLeft = 15;

// Find the original URL for the short code
function findOriginalUrl() {
    if (!shortCode) {
        console.error("No short code provided");
        showError('Invalid Link', 'No link code provided.');
        return;
    }
    
    console.log('Looking for short code:', shortCode);
    
    // Search all users for the short code
    database.ref('users').once('value')
        .then((snapshot) => {
            const users = snapshot.val() || {};
            let found = false;
            
            // Iterate through all users
            for (const userId in users) {
                const userLinks = users[userId].links || {};
                
                // Check if this user has the short code
                for (const linkId in userLinks) {
                    const link = userLinks[linkId];
                    
                    if (link.shortCode === shortCode) {
                        console.log('Found link:', link);
                        
                        // Check if link is expired
                        const now = new Date().getTime();
                        const expirationDate = link.expirationDate || 0;
                        
                        if (expirationDate < now) {
                            console.log("Link is expired");
                            // Link is expired, delete it and show error
                            database.ref('users/' + userId + '/links/' + linkId).remove();
                            showError('Link Expired', 'This link has expired and is no longer available.');
                            found = true;
                            break;
                        }
                        
                        // Fixed: Use longUrl instead of originalUrl
                        originalUrl = link.longUrl;
                        console.log("Original URL:", originalUrl);
                        
                        // Increment click count
                        incrementClickCount(userId, linkId);
                        
                        found = true;
                        break;
                    }
                }
                
                if (found) break;
            }
            
            if (found && originalUrl) {
                // Store data in session storage
                sessionStorage.setItem('originalUrl', originalUrl);
                sessionStorage.setItem('shortCode', shortCode);
                
                // Redirect to the first ad page
                window.location.href = 'ad1.html';
            } else if (!found) {
                // Show error if link not found
                showError('Link Not Found', 'The link you\'re looking for doesn\'t exist or has been removed.');
            }
        })
        .catch((error) => {
            console.error('Error finding original URL:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Show more specific error message
            let errorMessage = 'An error occurred while processing your request.';
            if (error.code === 'PERMISSION_DENIED') {
                errorMessage = 'Permission denied. You may not have access to view this link.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            showError('Database Error', errorMessage);
        });
}

// Increment click count for a link
function incrementClickCount(userId, linkId) {
    database.ref('users/' + userId + '/links/' + linkId).once('value')
        .then((snapshot) => {
            const link = snapshot.val();
            if (link) {
                const currentClicks = link.clicks || 0;
                database.ref('users/' + userId + '/links/' + linkId).update({
                    clicks: currentClicks + 1
                });
            }
        })
        .catch((error) => {
            console.error('Error incrementing click count:', error);
        });
}

// Show error page
function showError(title = 'Link Not Found', message = 'The link you\'re looking for doesn\'t exist or has been removed.') {
    loadingScreen.style.display = 'none';
    adContainer.style.display = 'none';
    errorContainer.style.display = 'block';
    errorTitle.textContent = title;
    errorMessage.textContent = message;
}

// Start the process
findOriginalUrl();
