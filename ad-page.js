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
let timerCompleted = false;
let adCheckTimer = null;
let adCheckSeconds = 15;
let warningShown = false;

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    adClicked = false;
    timerCompleted = false;
    adCheckSeconds = 15;
    warningShown = false;
    
    // Get the original URL from session storage
    originalUrl = sessionStorage.getItem('originalUrl') || '';
    
    if (!originalUrl) {
        // If no URL, redirect to home
        window.location.href = 'index.html';
        return;
    }
    
    // Start countdown (slower to feel like 25 seconds)
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
        element.addEventListener('click', (e) => {
            // Check if the click is actually on an ad element, not just the container
            if (e.target.tagName === 'IFRAME' || e.target.tagName === 'A' || e.target.tagName === 'IMG') {
                if (!adClicked) {
                    adClicked = true;
                    trackAdClick(adPageNumber);
                }
            }
        });
    });
}

// Start countdown timer (slower to feel like 25 seconds)
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
            timerCompleted = true;
            showAdCheckButton();
        }
    }, 1667); // ~1000ms * 1.667 = 1667ms to make 15 seconds feel like 25 seconds
}

// Show ad check button when timer completes
function showAdCheckButton() {
    const adCheckBtn = document.getElementById('adCheckBtn');
    const instructions = document.getElementById('instructions');
    
    if (adCheckBtn && instructions) {
        adCheckBtn.style.display = 'flex';
        instructions.style.display = 'block';
        
        // Scroll to bottom to show button
        setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }, 500);
    }
}

// Start ad check timer
function startAdCheckTimer() {
    const adCheckBtn = document.getElementById('adCheckBtn');
    const adCheckTimerElement = document.getElementById('adCheckTimer');
    
    if (!adCheckBtn || !adCheckTimerElement) return;
    
    // Disable button and show timer
    adCheckBtn.disabled = true;
    adCheckBtn.classList.add('checking');
    
    adCheckTimer = setInterval(() => {
        adCheckSeconds--;
        adCheckTimerElement.textContent = adCheckSeconds;
        
        if (adCheckSeconds <= 0) {
            clearInterval(adCheckTimer);
            unlockDownloadButton();
        }
    }, 1000);
}

// Handle ad check button click
document.addEventListener('DOMContentLoaded', () => {
    const adCheckBtn = document.getElementById('adCheckBtn');
    
    if (adCheckBtn) {
        adCheckBtn.addEventListener('click', () => {
            if (adCheckBtn.disabled) return;
            
            if (!adClicked) {
                // Show warning if ad hasn't been clicked
                if (!warningShown) {
                    warningShown = true;
                    adCheckSeconds += 10; // Add 10 more seconds
                    
                    const warning = document.createElement('div');
                    warning.className = 'warning-message';
                    warning.textContent = 'Please click on an advertisement first! Timer extended by 10 seconds.';
                    document.body.appendChild(warning);
                    
                    setTimeout(() => {
                        warning.remove();
                    }, 5000);
                    
                    // Restart timer with additional 10 seconds
                    if (adCheckTimer) clearInterval(adCheckTimer);
                    startAdCheckTimer();
                }
            } else {
                // Ad has been clicked, start the check timer
                startAdCheckTimer();
            }
        });
    }
});

// Unlock download button when ad check is complete
function unlockDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    const adCheckBtn = document.getElementById('adCheckBtn');
    
    if (downloadBtn && adCheckBtn) {
        // Hide ad check button and show download button
        adCheckBtn.style.display = 'none';
        downloadBtn.style.display = 'flex';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('locked');
        downloadBtn.classList.add('unlocked');
        downloadBtn.innerHTML = `
            <i class="fas fa-unlock"></i>
            <span>Download</span>
        `;
    }
}

// Handle download button click
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (downloadBtn.disabled) return;
            
            // Clear any running timers
            if (countdownInterval) clearInterval(countdownInterval);
            if (adCheckTimer) clearInterval(adCheckTimer);
            
            // Check if this is the last ad page
            if (adPageNumber === 5) {
                // Redirect to original URL
                window.location.href = originalUrl;
            } else {
                // Go to next ad page
                window.location.href = `ad${adPageNumber + 1}.html`;
            }
        });
    }
});

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
