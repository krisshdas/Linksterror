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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let adClicked = false;
let countdownInterval;
let originalUrl = '';
let adPageNumber = 1;

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Get the original URL from session storage
    originalUrl = sessionStorage.getItem('originalUrl') || '';
    
    if (!originalUrl) {
        // If no URL, redirect to home
        window.location.href = 'index.html';
        return;
    }
    
    // Start countdown
    startCountdown();
    
    // Track ad view
    trackAdView(pageNumber);
    
    // Add click listeners to all ads
    addAdClickListeners();
}

// Add click listeners to all ads
function addAdClickListeners() {
    const adElements = document.querySelectorAll('.ad-header, .ad-banner, .ad-footer, .pop-ad');
    
    adElements.forEach(element => {
        element.addEventListener('click', () => {
            if (!adClicked) {
                adClicked = true;
                unlockContinueButton();
                trackAdClick(adPageNumber);
                
                // Scroll to bottom to show continue button
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Start countdown timer
function startCountdown() {
    let seconds = 15;
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        // Update progress bar
        const progressPercent = ((15 - seconds) / 15) * 100;
        progressBar.style.width = (100 - progressPercent) + '%';
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            // Check if this is the last ad page
            if (adPageNumber === 5) {
                // Redirect to original URL
                window.location.href = originalUrl;
            } else {
                // Go to next ad page
                window.location.href = `ad${adPageNumber + 1}.html`;
            }
        }
    }, 1000);
}

// Unlock continue button
function unlockContinueButton() {
    const continueBtn = document.getElementById('continueBtn');
    continueBtn.disabled = false;
    continueBtn.innerHTML = `
        <i class="fas fa-unlock"></i>
        <span>Continue to destination</span>
    `;
    
    // Add click event to continue button
    continueBtn.addEventListener('click', () => {
        if (adClicked) {
            clearInterval(countdownInterval);
            
            // Check if this is the last ad page
            if (adPageNumber === 5) {
                // Redirect to original URL
                window.location.href = originalUrl;
            } else {
                // Go to next ad page
                window.location.href = `ad${adPageNumber + 1}.html`;
            }
        }
    });
}

// Track ad view
function trackAdView(pageNumber) {
    // Get the short code from session storage
    const shortCode = sessionStorage.getItem('shortCode') || '';
    
    if (shortCode) {
        // Find the link in the database
        database.ref('users').once('value')
            .then((snapshot) => {
                const users = snapshot.val() || {};
                
                for (const userId in users) {
                    const userLinks = users[userId].links || {};
                    
                    for (const linkId in userLinks) {
                        const link = userLinks[linkId];
                        
                        if (link.shortCode === shortCode) {
                            // Increment ad view count
                            const currentAdViews = link.adViews || {};
                            const pageViews = currentAdViews[`page${pageNumber}`] || 0;
                            
                            database.ref('users/' + userId + '/links/' + linkId).update({
                                adViews: {
                                    ...currentAdViews,
                                    [`page${pageNumber}`]: pageViews + 1
                                }
                            });
                            
                            return;
                        }
                    }
                }
            })
            .catch((error) => {
                console.error('Error tracking ad view:', error);
            });
    }
}

// Track ad click
function trackAdClick(pageNumber) {
    // Get the short code from session storage
    const shortCode = sessionStorage.getItem('shortCode') || '';
    
    if (shortCode) {
        // Find the link in the database
        database.ref('users').once('value')
            .then((snapshot) => {
                const users = snapshot.val() || {};
                
                for (const userId in users) {
                    const userLinks = users[userId].links || {};
                    
                    for (const linkId in userLinks) {
                        const link = userLinks[linkId];
                        
                        if (link.shortCode === shortCode) {
                            // Increment ad click count
                            const currentAdClicks = link.adClicks || {};
                            const pageClicks = currentAdClicks[`page${pageNumber}`] || 0;
                            
                            database.ref('users/' + userId + '/links/' + linkId).update({
                                adClicks: {
                                    ...currentAdClicks,
                                    [`page${pageNumber}`]: pageClicks + 1
                                }
                            });
                            
                            return;
                        }
                    }
                }
            })
            .catch((error) => {
                console.error('Error tracking ad click:', error);
            });
    }
}