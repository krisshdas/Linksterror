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
        }).catch(err => console.log('Click update error:', err));
        
        // Get the user ID who created this link
        const userId = data.createdById || data.createdBy; // Fallback to email if ID not available
        
        // Select a random ad page (1-5)
        const adPageNum = Math.floor(Math.random() * 5) + 1;
        
        // Store data in session storage for the ad page to use
        sessionStorage.setItem('originalUrl', data.originalUrl);
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('userEmail', data.createdBy); // Store email as backup
        sessionStorage.setItem('linkId', linkId);
        
        // Debug log to verify
        console.log('Redirecting with user ID:', userId);
        console.log('User email:', data.createdBy);
        
        // Redirect to the selected ad page
        window.location.href = `ad${adPageNum}.html`;
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
