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

// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    showError('Initialization Error', 'Failed to initialize Firebase. Please refresh the page.');
}

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

// Load ad configuration
function loadAdConfiguration() {
    console.log("Loading ad configuration...");
    database.ref('ads/config').once('value')
        .then((snapshot) => {
            const adConfig = snapshot.val() || {};
            console.log("Ad config loaded:", adConfig);
            
            // Convert ad config to array
            ads = [];
            for (let i = 1; i <= 5; i++) {
                if (adConfig[`ad${i}`]) {
                    ads.push(adConfig[`ad${i}`]);
                }
            }
            
            console.log("Ads array:", ads);
            
            // If no ads configured, redirect immediately
            if (ads.length === 0) {
                console.log("No ads configured, redirecting immediately");
                redirectToOriginalUrl();
                return;
            }
            
            // Show first ad
            showAd();
        })
        .catch((error) => {
            console.error('Error loading ad configuration:', error);
            // If error loading ads, redirect immediately
            redirectToOriginalUrl();
        });
}

// Find the original URL for the short code
function findOriginalUrl() {
    if (!shortCode) {
        console.error("No short code provided");
        showError('Invalid Link', 'No link code provided.');
        return;
    }
    
    console.log('Looking for short code:', shortCode);
    
    // First, let's check if we can access the database at all
    database.ref('.info/connected').once('value')
        .then((snapshot) => {
            console.log("Database connection status:", snapshot.val());
            
            // Now try to search for the short code
            return database.ref('users').once('value');
        })
        .then((snapshot) => {
            console.log("Users data retrieved successfully");
            const users = snapshot.val() || {};
            console.log("Users object:", users);
            
            if (Object.keys(users).length === 0) {
                console.error("No users found in database");
                showError('Database Error', 'No users found in database.');
                return;
            }
            
            let found = false;
            
            // Iterate through all users
            for (const userId in users) {
                console.log("Checking user:", userId);
                const userLinks = users[userId].links || {};
                console.log("User links:", userLinks);
                
                // Check if this user has the short code
                for (const linkId in userLinks) {
                    const link = userLinks[linkId];
                    console.log("Checking link:", link);
                    
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
                        
                        originalUrl = link.originalUrl;
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
                // Load ad configuration
                loadAdConfiguration();
            } else if (!found) {
                // Show error if link not found
                console.error("Link not found");
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

// Show an ad
function showAd() {
    if (currentAdIndex >= ads.length) {
        // All ads shown, redirect to original URL
        redirectToOriginalUrl();
        return;
    }
    
    // Hide loading screen and show ad container
    loadingScreen.style.display = 'none';
    adContainer.style.display = 'block';
    
    // Set ad content
    const ad = ads[currentAdIndex];
    
    // Check if ad is a URL or Adsterra code
    if (ad.startsWith('http://') || ad.startsWith('https://')) {
        // If it's a URL, create an iframe
        adContent.innerHTML = `<iframe src="${ad}" width="100%" height="300px" frameborder="0"></iframe>`;
    } else if (ad.includes('script') || ad.includes('adsterra')) {
        // If it's Adsterra code, inject it
        adContent.innerHTML = ad;
    } else {
        // If it's text content, display it
        adContent.innerHTML = `<h3>Advertisement</h3><p>${ad}</p>`;
    }
    
    // Reset progress bar and countdown
    progress.style.width = '0%';
    countdown.textContent = '5';
    
    // Start countdown
    let seconds = 5;
    countdownInterval = setInterval(() => {
        seconds--;
        countdown.textContent = seconds;
        
        // Update progress bar
        const progressPercent = ((5 - seconds) / 5) * 100;
        progress.style.width = progressPercent + '%';
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            currentAdIndex++;
            showAd();
        }
    }, 1000);
}

// Skip ad button
skipAd.addEventListener('click', () => {
    clearInterval(countdownInterval);
    currentAdIndex++;
    showAd();
});

// Redirect to original URL
function redirectToOriginalUrl() {
    if (originalUrl) {
        console.log("Redirecting to:", originalUrl);
        window.location.href = originalUrl;
    } else {
        console.error("No original URL found");
        showError('Error', 'No destination URL found.');
    }
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