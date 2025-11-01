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

// Get data from session storage
const originalUrl = sessionStorage.getItem('originalUrl');
const userId = sessionStorage.getItem('userId');
const userEmail = sessionStorage.getItem('userEmail');
const linkId = sessionStorage.getItem('linkId');

// Variables
let countdown = 10;
let countdownInterval;

// DOM elements
const timer = document.getElementById('timer');
const progress = document.getElementById('progress');
const skipBtn = document.getElementById('skipBtn');

// Get current page number (ad1, ad2, etc.)
const currentPage = window.location.pathname.split('/').pop().split('.')[0].replace('ad', '');

// Debug logs
console.log('Loading ads for user ID:', userId);
console.log('User email:', userEmail);
console.log('Current ad page:', currentPage);

// Function to get user ID from email if needed
function getUserIdFromEmail(email) {
  // This is a workaround - in a real app, you should store the UID
  // For now, we'll use the email as part of the path
  return email ? email.replace(/[.@]/g, '_') : null;
}

// Determine which user ID to use
let targetUserId = userId;
if (!targetUserId && userEmail) {
  targetUserId = getUserIdFromEmail(userEmail);
}

// Load user's ad configuration
if (targetUserId) {
  console.log('Attempting to load ads for:', targetUserId);
  
  database.ref(`users/${targetUserId}/ads/config/ad${currentPage}`).once('value')
    .then((snapshot) => {
      const adConfig = snapshot.val();
      console.log('Ad config found:', !!adConfig);
      
      if (adConfig) {
        // Load ads into their respective containers
        if (adConfig.header) {
          document.getElementById('headerAd').innerHTML = adConfig.header;
        }
        if (adConfig.side1) {
          document.getElementById('sideAd1').innerHTML = adConfig.side1;
        }
        if (adConfig.side2) {
          document.getElementById('sideAd2').innerHTML = adConfig.side2;
        }
        if (adConfig.bottom) {
          document.getElementById('bottomAd').innerHTML = adConfig.bottom;
        }
        
        // Load popup ad if available
        if (adConfig.popup) {
          setTimeout(() => {
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
          }, 2000); // Show popup after 2 seconds
        }
      } else {
        console.log('No ad config found for user, loading default ads');
        loadDefaultAds();
      }
      
      // Start countdown after ads are loaded
      startCountdown();
    })
    .catch((error) => {
      console.error('Error loading user ads:', error);
      loadDefaultAds();
      startCountdown();
    });
} else {
  console.log('No user ID found, loading default ads');
  loadDefaultAds();
  startCountdown();
}

// Load default ads (fallback)
function loadDefaultAds() {
  document.getElementById('headerAd').innerHTML = '<div style="text-align: center; padding: 20px; color: white;">Advertisement Space</div>';
  document.getElementById('sideAd1').innerHTML = '<div style="text-align: center; padding: 20px; color: white;">Side Ad 1</div>';
  document.getElementById('sideAd2').innerHTML = '<div style="text-align: center; padding: 20px; color: white;">Side Ad 2</div>';
  document.getElementById('bottomAd').innerHTML = '<div style="text-align: center; padding: 20px; color: white;">Advertisement Space</div>';
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
  // Clear session storage
  sessionStorage.clear();
  
  if (originalUrl) {
    window.location.href = originalUrl;
  } else {
    // Fallback if no URL
    window.location.href = 'https://google.com';
  }
}

// Skip button
skipBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);
  redirectToOriginal();
});
