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
const database = firebase.database();

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('id');

// DOM elements
const loadingText = document.getElementById('loadingText');

// Get link information and redirect to ad page
if (linkId) {
  // First try to get the link from the old structure
  database.ref('links/' + linkId).once('value')
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Increment click count in the old structure
        database.ref('links/' + linkId).update({
          clicks: (data.clicks || 0) + 1
        }).catch(err => console.log('Click update error:', err));
        
        // Get the user ID who created this link
        const userId = data.createdById || data.createdBy; // Fallback to email if ID not available
        
        // Also try to update the click count in the new structure if it exists
        if (data.createdById) {
          database.ref(`users/${data.createdById}/ads/config/${linkId}`).once('value')
            .then((newSnapshot) => {
              if (newSnapshot.exists()) {
                database.ref(`users/${data.createdById}/ads/config/${linkId}`).update({
                  clicks: (newSnapshot.val().clicks || 0) + 1
                }).catch(err => console.log('Click update error in new structure:', err));
              }
            });
        }
        
        // Store data in session storage for the ad page to use
        sessionStorage.setItem('originalUrl', data.originalUrl);
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('userEmail', data.createdBy); // Store email as backup
        sessionStorage.setItem('linkId', linkId);
        
        // Debug log to verify
        console.log('Redirecting with user ID:', userId);
        console.log('User email:', data.createdBy);
        
        // Always redirect to ad1.html (not random)
        window.location.href = 'ad1.html';
      } else {
        // If not found in old structure, try the new structure
        database.ref('users').once('value')
          .then((usersSnapshot) => {
            let linkFound = false;
            
            usersSnapshot.forEach((userSnapshot) => {
              if (linkFound) return;
              
              const userId = userSnapshot.key;
              const adConfig = userSnapshot.child('ads/config');
              
              if (adConfig.exists()) {
                adConfig.forEach((linkSnapshot) => {
                  if (linkSnapshot.key === linkId) {
                    const linkData = linkSnapshot.val();
                    
                    // Increment click count
                    database.ref(`users/${userId}/ads/config/${linkId}`).update({
                      clicks: (linkData.clicks || 0) + 1
                    }).catch(err => console.log('Click update error:', err));
                    
                    // Store data in session storage for the ad page to use
                    sessionStorage.setItem('originalUrl', linkData.originalUrl);
                    sessionStorage.setItem('userId', userId);
                    sessionStorage.setItem('userEmail', linkData.createdBy); // Store email as backup
                    sessionStorage.setItem('linkId', linkId);
                    
                    // Debug log to verify
                    console.log('Redirecting with user ID:', userId);
                    console.log('User email:', linkData.createdBy);
                    
                    // Always redirect to ad1.html (not random)
                    window.location.href = 'ad1.html';
                    linkFound = true;
                  }
                });
              }
            });
            
            if (!linkFound) {
              loadingText.textContent = 'Link not found';
            }
          })
          .catch((error) => {
            console.error('Error searching for link:', error);
            loadingText.textContent = 'Error loading link';
          });
      }
    })
    .catch((error) => {
      console.error('Error getting link:', error);
      loadingText.textContent = 'Error loading link';
    });
} else {
  loadingText.textContent = 'Invalid link';
}
