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

// DOM elements
const loadingText = document.getElementById('loadingText');

// Get link information and redirect to ad page
if (linkId) {
  database.ref('links/' + linkId).once('value')
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Increment click count
        database.ref('links/' + linkId).update({
          clicks: (data.clicks || 0) + 1
        });
        
        // Get the user ID who created this link
        const userId = data.createdById;
        
        // Always use ad page 1
        const adPageNum = 1;
        
        // Store data in session storage for the ad page to use
        sessionStorage.setItem('originalUrl', data.originalUrl);
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('linkId', linkId);
        sessionStorage.setItem('shortCode', linkId); // Your ad-page.js uses shortCode
        
        // Load user's ad configuration and update the global ads config
        if (userId) {
          database.ref(`users/${userId}/ads/config/ad${adPageNum}`).once('value')
            .then((snapshot) => {
              const adConfig = snapshot.val();
              if (adConfig) {
                // Update the global ads config with user's ads
                database.ref('ads/config/ad' + adPageNum).set(adConfig)
                  .then(() => {
                    // Always redirect to ad1.html
                    window.location.href = 'ad1.html';
                  })
                  .catch((error) => {
                    console.error('Error updating ads config:', error);
                    // Still redirect even if there's an error
                    window.location.href = 'ad1.html';
                  });
              } else {
                // No user ads configured, redirect anyway
                window.location.href = 'ad1.html';
              }
            })
            .catch((error) => {
              console.error('Error loading user ads:', error);
              // Still redirect even if there's an error
              window.location.href = 'ad1.html';
            });
        } else {
          // No user ID, redirect anyway
          window.location.href = 'ad1.html';
        }
      } else {
        loadingText.textContent = 'Link not found';
      }
    })
    .catch((error) => {
      console.error('Error getting link:', error);
      loadingText.textContent = 'Error loading link';
    });
} else {
  loadingText.textContent = 'Invalid link';
}
