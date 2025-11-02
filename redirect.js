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
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.log('Firebase already initialized');
}

// DOM elements
const skipBtn = document.getElementById('skipBtn');
const timerElement = document.getElementById('timer');
const adContainer = document.getElementById('adContainer');
const adTitle = document.getElementById('adTitle');
const adDescription = document.getElementById('adDescription');

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

// Load personalized ads based on the user who created the link
function loadPersonalizedAds() {
  if (!userId) {
    console.log('No user ID found, showing default ad');
    showDefaultAd();
    return;
  }
  
  const database = firebase.database();
  
  // Get user's personalized ads
  database.ref(`users/${userId}/ads/content`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const ads = snapshot.val();
        console.log('Found personalized ads:', ads);
        
        // Display the first ad or a random one
        const adKeys = Object.keys(ads);
        if (adKeys.length > 0) {
          const randomAdKey = adKeys[Math.floor(Math.random() * adKeys.length)];
          const ad = ads[randomAdKey];
          displayAd(ad);
        } else {
          showDefaultAd();
        }
      } else {
        console.log('No personalized ads found, showing default ad');
        showDefaultAd();
      }
    })
    .catch((error) => {
      console.error('Error loading personalized ads:', error);
      showDefaultAd();
    });
}

// Display an ad
function displayAd(ad) {
  if (adContainer) {
    adContainer.innerHTML = `
      <div class="ad-content">
        ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Advertisement" style="max-width: 100%; height: auto;">` : ''}
        <h2>${ad.title || 'Advertisement'}</h2>
        <p>${ad.description || 'This is a personalized advertisement.'}</p>
        ${ad.linkUrl ? `<a href="${ad.linkUrl}" target="_blank" class="ad-link">Learn More</a>` : ''}
      </div>
    `;
  }
  
  if (adTitle && ad.title) {
    adTitle.textContent = ad.title;
  }
  
  if (adDescription && ad.description) {
    adDescription.textContent = ad.description;
  }
}

// Show default ad
function showDefaultAd() {
  if (adContainer) {
    adContainer.innerHTML = `
      <div class="ad-content">
        <img src="https://picsum.photos/seed/defaultad/800/600.jpg" alt="Advertisement" style="max-width: 100%; height: auto;">
        <h2>Check Out Our Services!</h2>
        <p>This is a default advertisement. You will be redirected to your destination shortly.</p>
      </div>
    `;
  }
  
  if (adTitle) {
    adTitle.textContent = 'Advertisement';
  }
  
  if (adDescription) {
    adDescription.textContent = 'You will be redirected to your destination shortly.';
  }
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
  
  // Load personalized ads
  loadPersonalizedAds();
  
  // Log the ad view
  logAdView();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdPage);
