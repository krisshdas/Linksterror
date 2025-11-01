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

// Check if Firebase is already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

// Get data from session storage
const originalUrl = sessionStorage.getItem('originalUrl');
const userId = sessionStorage.getItem('userId');
const userEmail = sessionStorage.getItem('userEmail');
const linkId = sessionStorage.getItem('linkId');

// Variables
let countdown = 10;
let countdownInterval;
let timerCompleted = false;

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

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing ad page...');
    
    if (!originalUrl) {
        console.error('No original URL found in session storage');
        window.location.href = 'index.html';
        return;
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
                        executeAdScript('headerAd', adConfig.header);
                    }
                    if (adConfig.side1) {
                        executeAdScript('sideAd1', adConfig.side1);
                    }
                    if (adConfig.side2) {
                        executeAdScript('sideAd2', adConfig.side2);
                    }
                    if (adConfig.bottom) {
                        executeAdScript('bottomAd', adConfig.bottom);
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
    
    // Set up skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            redirectToOriginal();
        });
    }
});

// Execute ad script properly
function executeAdScript(elementId, scriptContent) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Clear the element first
    element.innerHTML = '';
    
    // Create a temporary div to parse the script
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = scriptContent;
    
    // Find all script tags in the content
    const scripts = tempDiv.querySelectorAll('script');
    
    // Extract and execute each script
    scripts.forEach(script => {
        const newScript = document.createElement('script');
        
        // Copy all attributes from the original script
        Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy the script content
        newScript.textContent = script.textContent;
        
        // Append to the element
        element.appendChild(newScript);
    });
    
    // Add non-script content
    Array.from(tempDiv.childNodes).forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'SCRIPT') {
            element.appendChild(node.cloneNode(true));
        }
    });
}

// Load default ads (fallback)
function loadDefaultAds() {
    const adElements = ['headerAd', 'sideAd1', 'sideAd2', 'bottomAd'];
    
    adElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div style="text-align: center; padding: 20px; color: white;">Advertisement Space</div>`;
        }
    });
}

// Start countdown timer
function startCountdown() {
    console.log('Starting countdown...');
    
    // Reset countdown
    countdown = 10;
    timerCompleted = false;
    
    // Update timer display
    if (timer) {
        timer.textContent = countdown;
    }
    
    // Update progress bar
    updateProgress();
    
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Start new interval
    countdownInterval = setInterval(() => {
        countdown--;
        
        // Update timer display
        if (timer) {
            timer.textContent = countdown;
        }
        
        // Update progress bar
        updateProgress();
        
        // Check if countdown is complete
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            timerCompleted = true;
            
            // Auto-redirect after 1 second
            setTimeout(() => {
                redirectToOriginal();
            }, 1000);
        }
    }, 1000);
}

// Update progress bar
function updateProgress() {
    if (progress) {
        const progressValue = ((10 - countdown) / 10) * 100;
        progress.style.width = progressValue + '%';
    }
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

// Track ad view
function trackAdView(pageNumber) {
    if (!linkId) return;
    
    database.ref('links/' + linkId).once('value')
        .then((snapshot) => {
            const link = snapshot.val();
            if (link) {
                // Increment ad view count
                const currentAdViews = link.adViews || {};
                const pageViews = currentAdViews[`page${pageNumber}`] || 0;
                
                database.ref('links/' + linkId).update({
                    adViews: {
                        ...currentAdViews,
                        [`page${pageNumber}`]: pageViews + 1
                    }
                });
            }
        })
        .catch((error) => {
            console.error('Error tracking ad view:', error);
        });
}

// Track ad click
function trackAdClick(pageNumber) {
    if (!linkId) return;
    
    database.ref('links/' + linkId).once('value')
        .then((snapshot) => {
            const link = snapshot.val();
            if (link) {
                // Increment ad click count
                const currentAdClicks = link.adClicks || {};
                const pageClicks = currentAdClicks[`page${pageNumber}`] || 0;
                
                database.ref('links/' + linkId).update({
                    adClicks: {
                        ...currentAdClicks,
                        [`page${pageNumber}`]: pageClicks + 1
                    }
                });
            }
        })
        .catch((error) => {
            console.error('Error tracking ad click:', error);
        });
}

// Track ad view when page loads
if (targetUserId) {
    trackAdView(currentPage);
}
