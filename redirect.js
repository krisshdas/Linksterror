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

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('id');

// Variables
let originalUrl = '';
let countdown = 10;
let countdownInterval;
let userId = null;

// DOM elements
const loadingText = document.getElementById('loadingText');
const redirectContainer = document.getElementById('redirectContainer');
const timer = document.getElementById('timer');
const progress = document.getElementById('progress');
const adContainer = document.getElementById('adContainer');
const skipBtn = document.getElementById('skipBtn');

// Get link information
if (linkId) {
  database.ref('links/' + linkId).once('value')
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        originalUrl = data.originalUrl;
        userId = data.createdById; // Get the user ID who created this link
        
        // Increment click count
        database.ref('links/' + linkId).update({
          clicks: (data.clicks || 0) + 1
        });
        
        // Show redirect container and hide loading text
        loadingText.style.display = 'none';
        redirectContainer.style.display = 'block';
        
        // Load user's ad configuration
        if (userId) {
          loadUserAds(userId);
        } else {
          // Fallback to default ads if no user ID
          loadDefaultAds();
        }
        
        // Start countdown
        startCountdown();
      } else {
        loadingText.textContent = 'Link not found';
        timer.textContent = '0';
      }
    })
    .catch((error) => {
      console.error('Error getting link:', error);
      loadingText.textContent = 'Error loading link';
    });
} else {
  loadingText.textContent = 'Invalid link';
}

// Load user's ad configuration
function loadUserAds(userId) {
  // Get a random ad page (1-5)
  const adPageNum = Math.floor(Math.random() * 5) + 1;
  
  database.ref(`users/${userId}/ads/config/ad${adPageNum}`).once('value')
    .then((snapshot) => {
      const adConfig = snapshot.val();
      if (adConfig) {
        // Display the main ad (side1 is usually the highest value)
        if (adConfig.side1) {
          adContainer.innerHTML = adConfig.side1;
        }
        
        // Load popup ad if available
        if (adConfig.popup) {
          const popupDiv = document.createElement('div');
          popupDiv.className = 'popup-ad';
          popupDiv.innerHTML = `
            <button class="popup-close" id="popupClose">
              <i class="fas fa-times"></i>
            </button>
            ${adConfig.popup}
          `;
          document.body.appendChild(popupDiv);
          
          // Add close button functionality
          document.getElementById('popupClose').addEventListener('click', () => {
            document.body.removeChild(popupDiv);
          });
        }
      } else {
        // Fallback to default ads if user hasn't configured any
        loadDefaultAds();
      }
    })
    .catch((error) => {
      console.error('Error loading user ads:', error);
      loadDefaultAds();
    });
}

// Load default ads (fallback)
function loadDefaultAds() {
  adContainer.innerHTML = `
    <div style="padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 10px;">
      <p>Advertisement space</p>
      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.7);">No ads configured</p>
    </div>
  `;
}

// Start countdown
function startCountdown() {
  updateProgress();
  
  countdownInterval = setInterval(() => {
    countdown--;
    timer.textContent = countdown;
    updateProgress();
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      redirectToOriginal();
    }
  }, 1000);
}

// Update progress bar
function updateProgress() {
  const progressValue = ((10 - countdown) / 10) * 100;
  progress.style.width = progressValue + '%';
}

// Redirect to original URL
function redirectToOriginal() {
  if (originalUrl) {
    window.location.href = originalUrl;
  }
}

// Skip button
skipBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);
  redirectToOriginal();
});
