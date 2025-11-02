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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// DOM elements
const skipBtn = document.getElementById('skipBtn');
const timerElement = document.getElementById('timer');
const adContainer = document.getElementById('adContainer');

// Get data from session storage
const originalUrl = sessionStorage.getItem('originalUrl');
const userId = sessionStorage.getItem('userId');
const userEmail = sessionStorage.getItem('userEmail');
const linkId = sessionStorage.getItem('linkId');

// Timer settings
let countdown = 10; // 10 seconds countdown
let timerInterval;

// Start countdown timer
function startTimer() {
  timerInterval = setInterval(() => {
    countdown--;
    timerElement.textContent = countdown;
    
    if (countdown <= 0) {
      clearInterval(timerInterval);
      redirectToOriginalUrl();
    }
  }, 1000);
}

// Redirect to original URL
function redirectToOriginalUrl() {
  if (originalUrl) {
    window.location.href = originalUrl;
  } else {
    // Fallback if originalUrl is not available
    window.location.href = 'https://krisshdas.github.io/Linksterror/';
  }
}

// Skip button click handler
if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    redirectToOriginalUrl();
  });
}

// Log ad view to Firebase
function logAdView() {
  if (!userId || !linkId) return;
  
  const database = firebase.database();
  const timestamp = Date.now();
  
  // Log the ad view in the user's ad analytics
  database.ref(`users/${userId}/ads/analytics/${linkId}`).push({
    type: 'view',
    timestamp: timestamp,
    adPage: 'ad1'
  }).catch(err => console.log('Error logging ad view:', err));
  
  // Also update a counter for total views
  database.ref(`users/${userId}/ads/analytics/${linkId}/totalViews`).transaction((currentViews) => {
    return (currentViews || 0) + 1;
  }).catch(err => console.log('Error updating total views:', err));
}

// Initialize the ad page
function initAdPage() {
  // Start the countdown timer
  startTimer();
  
  // Log the ad view
  logAdView();
  
  // Load ad content (you can customize this part)
  if (adContainer) {
    // Example: Load an image ad
    adContainer.innerHTML = `
      <div class="ad-content">
        <img src="https://picsum.photos/seed/ad1/800/600.jpg" alt="Advertisement" style="max-width: 100%; height: auto;">
        <h2>Special Offer!</h2>
        <p>This is a personalized advertisement. You will be redirected to your destination shortly.</p>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdPage);
