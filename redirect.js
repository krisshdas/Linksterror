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

// Get the link ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('id');

// Global variables
let linkData = null;
let userAdConfig = null;

// Initialize the redirect page
document.addEventListener('DOMContentLoaded', () => {
    if (linkId) {
        // Show loading state
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error-container').style.display = 'none';
        
        // Fetch link data
        fetchLinkData();
    } else {
        showError('Invalid link. No ID provided.');
    }
});

// Fetch link data from Firebase
function fetchLinkData() {
    database.ref('links/' + linkId).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                linkData = snapshot.val();
                
                // Store the original URL in session storage
                sessionStorage.setItem('originalUrl', linkData.originalUrl);
                sessionStorage.setItem('shortCode', linkId);
                
                // Fetch user data to get ad configuration
                fetchUserData(linkData.userId);
            } else {
                showError('Link not found or has been removed.');
            }
        })
        .catch((error) => {
            console.error('Error fetching link data:', error);
            showError('Error loading link. Please try again later.');
        });
}

// Fetch user data from Firebase
function fetchUserData(userId) {
    database.ref('users/' + userId).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                
                // Get user's ad configuration
                userAdConfig = userData.adConfig || {};
                
                // Store ad configuration in session storage
                sessionStorage.setItem('userAdConfig', JSON.stringify(userAdConfig));
                
                // Redirect to ad page after a short delay
                setTimeout(() => {
                    window.location.href = 'ad1.html';
                }, 2000);
            } else {
                showError('User data not found.');
            }
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
            showError('Error loading user data. Please try again later.');
        });
}

// Show error message
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-container').style.display = 'block';
}
