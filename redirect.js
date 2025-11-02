// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('id');

// DOM elements
const loadingText = document.getElementById('loadingText');

// Simple Firebase config
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
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.log('Firebase already initialized');
}

const database = firebase.database();

// Set a timeout for the entire operation
const operationTimeout = setTimeout(() => {
  loadingText.textContent = 'Taking too long to connect. Please try again.';
  
  // Add a retry button
  const retryButton = document.createElement('button');
  retryButton.textContent = 'Retry';
  retryButton.style.marginTop = '20px';
  retryButton.style.padding = '10px 20px';
  retryButton.style.backgroundColor = '#4CAF50';
  retryButton.style.color = 'white';
  retryButton.style.border = 'none';
  retryButton.style.borderRadius = '4px';
  retryButton.style.cursor = 'pointer';
  
  retryButton.addEventListener('click', () => {
    window.location.reload();
  });
  
  document.body.appendChild(retryButton);
}, 8000); // 8 seconds timeout

// Function to redirect to ad page
function redirectToAdPage(linkData) {
  clearTimeout(operationTimeout);
  
  // Store data in session storage
  sessionStorage.setItem('originalUrl', linkData.originalUrl);
  sessionStorage.setItem('userId', linkData.userId);
  sessionStorage.setItem('userEmail', linkData.createdBy);
  sessionStorage.setItem('linkId', linkId);
  
  // Redirect to ad1.html
  window.location.href = 'ad1.html';
}

// Process the link
if (linkId) {
  loadingText.textContent = 'Finding your link...';
  
  // Try to get the link from the old structure
  database.ref('links/' + linkId).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Update click count
        database.ref('links/' + linkId).update({
          clicks: (data.clicks || 0) + 1
        });
        
        // Redirect to ad page
        redirectToAdPage({
          originalUrl: data.originalUrl,
          userId: data.createdById || data.createdBy,
          createdBy: data.createdBy
        });
      } else {
        // Try the new structure
        loadingText.textContent = 'Searching in user database...';
        
        database.ref('users').once('value')
          .then((usersSnapshot) => {
            let found = false;
            
            usersSnapshot.forEach((userSnapshot) => {
              if (found) return;
              
              const userId = userSnapshot.key;
              const adConfig = userSnapshot.child('ads/config');
              
              if (adConfig.exists()) {
                adConfig.forEach((linkSnapshot) => {
                  if (linkSnapshot.key === linkId) {
                    const linkData = linkSnapshot.val();
                    
                    // Update click count
                    database.ref(`users/${userId}/ads/config/${linkId}`).update({
                      clicks: (linkData.clicks || 0) + 1
                    });
                    
                    // Redirect to ad page
                    redirectToAdPage({
                      originalUrl: linkData.originalUrl,
                      userId: userId,
                      createdBy: linkData.createdBy
                    });
                    
                    found = true;
                  }
                });
              }
            });
            
            if (!found) {
              clearTimeout(operationTimeout);
              loadingText.textContent = 'Link not found or has expired';
            }
          })
          .catch((error) => {
            clearTimeout(operationTimeout);
            console.error('Error:', error);
            loadingText.textContent = 'Error loading link';
          });
      }
    })
    .catch((error) => {
      clearTimeout(operationTimeout);
      console.error('Error:', error);
      loadingText.textContent = 'Error loading link';
    });
} else {
  clearTimeout(operationTimeout);
  loadingText.textContent = 'Invalid link';
}
