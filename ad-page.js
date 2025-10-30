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
let checkButtonTimer;
let originalUrl = '';
let adPageNumber = 1;
let timerCompleted = false;
let isChecking = false;
let checkButtonTimerCompleted = false;

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    adClicked = false;
    timerCompleted = false;
    isChecking = false;
    checkButtonTimerCompleted = false;
    
    // Get the original URL from session storage
    originalUrl = sessionStorage.getItem('originalUrl') || '';
    
    if (!originalUrl) {
        // If no URL, redirect to home
        window.location.href = 'index.html';
        return;
    }
    
    // Load ads from Firebase first
    loadAdsFromFirebase(pageNumber);
    
    // Start countdown (slower to feel like 25 seconds)
    startCountdown();
    
    // Track ad view
    trackAdView(pageNumber);
    
    // Add click listeners to all ads
    addAdClickListeners();
}

// Load ads from Firebase for the current page
function loadAdsFromFirebase(pageNumber) {
    database.ref('ads/config/ad' + pageNumber).once('value')
        .then((snapshot) => {
            const adConfig = snapshot.val() || {};
            
            // Load header ad
            if (adConfig.header) {
                executeAdScript('headerAd', adConfig.header);
            }
            
            // Load side ads
            if (adConfig.side1) {
                executeAdScript('sideAd1', adConfig.side1);
            }
            if (adConfig.side2) {
                executeAdScript('sideAd2', adConfig.side2);
            }
            if (adConfig.side3) {
                executeAdScript('sideAd3', adConfig.side3);
            }
            if (adConfig.side4) {
                executeAdScript('sideAd4', adConfig.side4);
            }
            
            // Load bottom ad
            if (adConfig.bottom) {
                executeAdScript('bottomAd', adConfig.bottom);
            }
            
            // Load pop ad
            if (adConfig.popup) {
                executeAdScript('popAd', adConfig.popup);
            }
        })
        .catch((error) => {
            console.error('Error loading ads from Firebase:', error);
        });
}

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

// Add click listeners to all ads (enhanced for mobile)
function addAdClickListeners() {
    // Get all ad containers
    const adContainers = document.querySelectorAll('.ad-header, .ad-banner, .ad-footer, .pop-ad, .hardcoded-ad');
    
    // Add both click and touch event listeners to each ad container
    adContainers.forEach(container => {
        // Handle click events (for desktop)
        container.addEventListener('click', (e) => {
            handleAdInteraction(e, container);
        });
        
        // Handle touch events (for mobile)
        container.addEventListener('touchstart', (e) => {
            // Mark the touch start time
            container.dataset.touchStartTime = Date.now();
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            // Calculate touch duration
            const touchDuration = Date.now() - (container.dataset.touchStartTime || 0);
            
            // Only consider it a valid interaction if it's a quick tap (less than 500ms)
            if (touchDuration < 500) {
                handleAdInteraction(e, container);
            }
        }, { passive: true });
        
        // Prevent context menu on long press (mobile)
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
}

// Handle ad interaction (both click and touch)
function handleAdInteraction(e, container) {
    // Check if the interaction is on an actual ad element
    const target = e.target;
    
    // Check if the target is an iframe, a, img, or a child of these elements
    let isAdElement = false;
    
    if (target.tagName === 'IFRAME' || target.tagName === 'A' || target.tagName === 'IMG') {
        isAdElement = true;
    } else {
        // Check if the target is inside an iframe, a, or img
        const parentAdElement = target.closest('iframe, a, img');
        if (parentAdElement) {
            isAdElement = true;
        }
    }
    
    // Check if the clicked element is a direct child of the container
    if (container.contains(target) && isAdElement) {
        // Mark ad as clicked
        if (!adClicked) {
            adClicked = true;
            trackAdClick(adPageNumber);
            console.log('Ad clicked on page', adPageNumber);
            
            // Visual feedback for ad click
            showAdClickFeedback();
            
            // Show interaction indicator
            const indicatorId = container.id + 'Indicator';
            const indicator = document.getElementById(indicatorId);
            if (indicator) {
                indicator.classList.add('show');
            }
        }
    }
}

// Show visual feedback when an ad is clicked
function showAdClickFeedback() {
    const feedback = document.createElement('div');
    feedback.className = 'ad-click-feedback';
    feedback.innerHTML = '<i class="fas fa-check-circle"></i> Ad clicked successfully!';
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 3000);
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
            startCheckButtonTimer();
        }
    }, 1667); // ~1000ms * 1.667 = 1667ms to make 15 seconds feel like 25 seconds
}

// Start the 30-second timer for the check button
function startCheckButtonTimer() {
    let seconds = 30;
    
    checkButtonTimer = setInterval(() => {
        seconds--;
        
        if (seconds <= 0) {
            clearInterval(checkButtonTimer);
            checkButtonTimerCompleted = true;
            
            // Force unlock download button if no ad was clicked
            if (!adClicked) {
                unlockDownloadButton();
                showTimerCompletedMessage();
            }
        }
    }, 1000); // Normal 1-second interval for the 30-second timer
}

// Show message when timer completes without ad click
function showTimerCompletedMessage() {
    const message = document.createElement('div');
    message.className = 'timer-completed-message';
    message.innerHTML = '<i class="fas fa-clock"></i> Time\'s up! You can now proceed to the next page.';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
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

// Handle ad check button click
document.addEventListener('DOMContentLoaded', () => {
    const adCheckBtn = document.getElementById('adCheckBtn');
    
    if (adCheckBtn) {
        adCheckBtn.addEventListener('click', () => {
            if (isChecking) return;
            
            if (!adClicked) {
                // Show warning if ad hasn't been clicked
                const warning = document.createElement('div');
                warning.className = 'warning-message';
                warning.textContent = 'Please click on an advertisement first!';
                document.body.appendChild(warning);
                
                setTimeout(() => {
                    warning.remove();
                }, 3000);
            } else {
                // Ad has been clicked, show loading for 3 seconds
                isChecking = true;
                adCheckBtn.disabled = true;
                adCheckBtn.classList.add('checking');
                adCheckBtn.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Checking...</span>
                `;
                
                setTimeout(() => {
                    unlockDownloadButton();
                }, 3000);
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
        downloadBtn.classList.remove('left');
        downloadBtn.classList.add('unlocked');
        
        // Different button text for the last page
        if (adPageNumber === 5) {
            downloadBtn.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Final Download</span>
            `;
        } else {
            downloadBtn.innerHTML = `
                <i class="fas fa-unlock"></i>
                <span>Continue to Next Page</span>
            `;
        }
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
            if (checkButtonTimer) clearInterval(checkButtonTimer);
            
            // Redirect based on current page
            if (adPageNumber === 1) {
                window.location.href = 'ad2.html';
            } else if (adPageNumber === 2) {
                window.location.href = 'ad3.html';
            } else if (adPageNumber === 3) {
                window.location.href = 'ad4.html';
            } else if (adPageNumber === 4) {
                window.location.href = 'ad5.html';
            } else if (adPageNumber === 5) {
                // Last page, redirect to original URL
                window.location.href = originalUrl;
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
