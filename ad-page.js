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
let adsClicked = new Set(); // Track which ads have been clicked
let totalAds = 6; // Total number of ads to click
let countdownInterval;
let originalUrl = '';
let adPageNumber = 1;
let timerCompleted = false;
let isChecking = false;
let adInteractions = new Map(); // Track user interactions with ads
let lastInteractedAd = null;
let pageVisibilityHidden = false;
let lastInteractionTime = 0;
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let pageFocusLost = false;
let adClickDetectionInterval;

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    adsClicked.clear();
    adInteractions.clear();
    timerCompleted = false;
    isChecking = false;
    lastInteractedAd = null;
    pageVisibilityHidden = false;
    lastInteractionTime = 0;
    pageFocusLost = false;
    
    // Clear any existing intervals
    if (adClickDetectionInterval) clearInterval(adClickDetectionInterval);
    
    // Reset progress bars
    resetProgressBars();
    
    // Update ad counter display
    updateAdCounter();
    
    // Get the original URL from session storage
    originalUrl = sessionStorage.getItem('originalUrl') || '';
    
    if (!originalUrl) {
        // If no URL, redirect to home
        window.location.href = 'index.html';
        return;
    }
    
    // Load ads from Firebase first
    loadAdsFromFirebase(pageNumber);
    
    // Start countdown
    startCountdown();
    
    // Track ad view
    trackAdView(pageNumber);
    
    // Set up ad click detection after a delay to allow ads to load
    setTimeout(() => {
        setupAdClickDetection();
    }, 3000);
}

// Reset progress bars to initial state
function resetProgressBars() {
    const progressBar = document.getElementById('progressBar');
    const mainProgressBar = document.getElementById('mainProgressBar');
    
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    if (mainProgressBar) {
        mainProgressBar.style.width = '100%';
    }
}

// Update ad counter display
function updateAdCounter() {
    const adsViewedElement = document.getElementById('adsViewed');
    if (adsViewedElement) {
        adsViewedElement.textContent = adsClicked.size;
    }
    
    // Update time remaining display
    const timeRemainingElement = document.getElementById('timeRemaining');
    if (timeRemainingElement) {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            timeRemainingElement.textContent = countdownElement.textContent;
        }
    }
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
            
            // Hide loading animation after ads are loaded
            const loadingAnimation = document.querySelector('.loading-animation');
            if (loadingAnimation) {
                loadingAnimation.style.display = 'none';
            }
        })
        .catch((error) => {
            console.error('Error loading ads from Firebase:', error);
            // Hide loading animation even if there's an error
            const loadingAnimation = document.querySelector('.loading-animation');
            if (loadingAnimation) {
                loadingAnimation.style.display = 'none';
            }
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

// Set up ad click detection
function setupAdClickDetection() {
    // Get all ad wrappers
    const wrappers = document.querySelectorAll('.ad-wrapper');
    
    wrappers.forEach(wrapper => {
        const adId = wrapper.getAttribute('data-ad-id');
        if (!adId) return;
        
        // Add a visual indicator that the ad is clickable
        wrapper.style.cursor = 'pointer';
        wrapper.style.position = 'relative';
        
        // Add a subtle border to indicate it's clickable
        wrapper.style.border = '1px dashed rgba(52, 152, 219, 0.3)';
        
        // Add a "Tap me" indicator for unclicked ads
        if (!adsClicked.has(adId)) {
            const indicator = document.createElement('div');
            indicator.className = 'ad-click-indicator';
            indicator.innerHTML = '<i class="fas fa-hand-pointer"></i> Tap me';
            indicator.style.position = 'absolute';
            indicator.style.top = '5px';
            indicator.style.right = '5px';
            indicator.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
            indicator.style.color = 'white';
            indicator.style.padding = '5px 10px';
            indicator.style.borderRadius = '3px';
            indicator.style.fontSize = '12px';
            indicator.style.zIndex = '1000';
            indicator.style.pointerEvents = 'none';
            wrapper.appendChild(indicator);
        }
        
        // Initialize interaction tracking for this ad
        adInteractions.set(adId, {
            entered: false,
            interacted: false,
            lastInteractionTime: 0,
            hoverTime: 0,
            hoverStartTime: null,
            touchTime: 0,
            touchStartTime: null
        });
        
        // Add event listeners for desktop
        wrapper.addEventListener('mouseenter', handleAdMouseEnter);
        wrapper.addEventListener('mouseleave', handleAdMouseLeave);
        
        // Add event listeners for mobile
        wrapper.addEventListener('touchstart', handleAdTouchStart, { passive: true });
        wrapper.addEventListener('touchend', handleAdTouchEnd, { passive: true });
        wrapper.addEventListener('touchmove', handleAdTouchMove, { passive: true });
        
        // Monitor for clicks on the ad area
        wrapper.addEventListener('click', handleAdAreaClick);
        
        // Monitor for right-clicks (which might indicate user interest)
        wrapper.addEventListener('contextmenu', handleAdRightClick);
    });
    
    // Add global event listeners to detect when user leaves the page
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Monitor for page navigation changes
    window.addEventListener('popstate', handlePopState);
    
    // Monitor for link clicks
    document.addEventListener('click', handleDocumentClick);
    
    // Monitor for mouse leaving the window (might indicate clicking an ad)
    document.addEventListener('mouseout', handleMouseLeaveWindow);
    
    // Start a periodic check for ad interactions
    adClickDetectionInterval = setInterval(checkForAdInteractions, 1000);
}

// Handle mouse enter on ad
function handleAdMouseEnter(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.entered = true;
    interaction.hoverStartTime = Date.now();
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    lastInteractionTime = Date.now();
    
    // Add visual feedback
    wrapper.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
}

// Handle mouse leave on ad
function handleAdMouseLeave(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.entered = false;
    
    // Calculate hover time
    if (interaction.hoverStartTime) {
        interaction.hoverTime += Date.now() - interaction.hoverStartTime;
        interaction.hoverStartTime = null;
    }
    
    // Remove visual feedback
    wrapper.style.backgroundColor = '';
}

// Handle touch start on ad (mobile)
function handleAdTouchStart(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    // Record touch start time and position
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    interaction.touchStartTime = Date.now();
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    lastInteractionTime = Date.now();
    
    // Add visual feedback
    wrapper.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
}

// Handle touch move on ad (mobile)
function handleAdTouchMove(e) {
    // Record the end position
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
}

// Handle touch end on ad (mobile)
function handleAdTouchEnd(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    // Calculate touch time
    if (interaction.touchStartTime) {
        interaction.touchTime += Date.now() - interaction.touchStartTime;
        interaction.touchStartTime = null;
    }
    
    // Remove visual feedback
    wrapper.style.backgroundColor = '';
    
    // Calculate touch duration and distance
    const touchDuration = Date.now() - touchStartTime;
    const touchDistance = Math.sqrt(
        Math.pow(touchEndX - touchStartX, 2) + 
        Math.pow(touchEndY - touchStartY, 2)
    );
    
    // If it was a quick tap (less than 500ms and minimal movement)
    if (touchDuration < 500 && touchDistance < 10) {
        // Mark as potentially clicked
        interaction.interacted = true;
        lastInteractedAd = adId;
        lastInteractionTime = Date.now();
    }
}

// Handle ad area click
function handleAdAreaClick(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    // Mark as interacted
    interaction.interacted = true;
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    lastInteractionTime = Date.now();
    
    // Don't immediately mark as clicked - wait to see if user leaves the page
    // This allows the ad to actually open first
}

// Handle ad right-click
function handleAdRightClick(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    // Mark as interacted
    interaction.interacted = true;
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    lastInteractionTime = Date.now();
}

// Handle document click
function handleDocumentClick(e) {
    // Check if the click is on an ad
    const wrapper = e.target.closest('.ad-wrapper');
    if (wrapper) {
        const adId = wrapper.getAttribute('data-ad-id');
        if (adId) {
            const interaction = adInteractions.get(adId);
            if (interaction) {
                interaction.interacted = true;
                interaction.lastInteractionTime = Date.now();
                lastInteractedAd = adId;
                lastInteractionTime = Date.now();
            }
        }
    }
}

// Handle mouse leaving the window
function handleMouseLeaveWindow(e) {
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        // Mouse left the window, check if it was after interacting with an ad
        if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
            const interaction = adInteractions.get(lastInteractedAd);
            if (interaction && interaction.interacted) {
                // Mark the ad as clicked
                markAdAsClicked(lastInteractedAd);
            }
        }
    }
}

// Check for ad interactions periodically
function checkForAdInteractions() {
    // Check if any ad has been interacted with but not yet marked as clicked
    adInteractions.forEach((interaction, adId) => {
        if (interaction.interacted && !adsClicked.has(adId)) {
            // If the user interacted with an ad more than 2 seconds ago, mark it as clicked
            if (Date.now() - interaction.lastInteractionTime > 2000) {
                markAdAsClicked(adId);
            }
        }
    });
}

// Handle before unload event
function handleBeforeUnload(e) {
    // If the user is leaving the page after interacting with an ad
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
        const interaction = adInteractions.get(lastInteractedAd);
        if (interaction && interaction.interacted) {
            // Mark the ad as clicked
            markAdAsClicked(lastInteractedAd);
            
            // Save the state to session storage in case the page reloads
            sessionStorage.setItem('adsClicked', JSON.stringify([...adsClicked]));
            sessionStorage.setItem('lastInteractedAd', lastInteractedAd);
        }
    }
}

// Handle window blur event
function handleWindowBlur() {
    pageFocusLost = true;
    
    // If the window loses focus after interacting with an ad
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
        const interaction = adInteractions.get(lastInteractedAd);
        if (interaction && interaction.interacted) {
            // Mark the ad as clicked
            markAdAsClicked(lastInteractedAd);
            
            // Save the state to session storage in case the page reloads
            sessionStorage.setItem('adsClicked', JSON.stringify([...adsClicked]));
            sessionStorage.setItem('lastInteractedAd', lastInteractedAd);
        }
    }
}

// Handle visibility change event
function handleVisibilityChange() {
    if (document.hidden && !pageVisibilityHidden) {
        // Page is becoming hidden
        pageVisibilityHidden = true;
        
        // If the page becomes hidden after interacting with an ad
        if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
            const interaction = adInteractions.get(lastInteractedAd);
            if (interaction && interaction.interacted) {
                // Mark the ad as clicked
                markAdAsClicked(lastInteractedAd);
                
                // Save the state to session storage in case the page reloads
                sessionStorage.setItem('adsClicked', JSON.stringify([...adsClicked]));
                sessionStorage.setItem('lastInteractedAd', lastInteractedAd);
            }
        }
    } else if (!document.hidden) {
        // Page is becoming visible again
        pageVisibilityHidden = false;
        
        // Check if we need to restore state from session storage
        restoreStateFromSessionStorage();
    }
}

// Handle popstate event (browser back/forward buttons)
function handlePopState(e) {
    // If the user navigates away after interacting with an ad
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
        const interaction = adInteractions.get(lastInteractedAd);
        if (interaction && interaction.interacted) {
            // Mark the ad as clicked
            markAdAsClicked(lastInteractedAd);
            
            // Save the state to session storage in case the page reloads
            sessionStorage.setItem('adsClicked', JSON.stringify([...adsClicked]));
            sessionStorage.setItem('lastInteractedAd', lastInteractedAd);
        }
    }
}

// Restore state from session storage
function restoreStateFromSessionStorage() {
    const savedAdsClicked = sessionStorage.getItem('adsClicked');
    const savedLastInteractedAd = sessionStorage.getItem('lastInteractedAd');
    
    if (savedAdsClicked) {
        try {
            const savedAds = JSON.parse(savedAdsClicked);
            savedAds.forEach(adId => {
                if (!adsClicked.has(adId)) {
                    markAdAsClicked(adId, false); // Don't show notification for restored ads
                }
            });
        } catch (e) {
            console.error('Error parsing saved ads clicked:', e);
        }
    }
    
    if (savedLastInteractedAd) {
        lastInteractedAd = savedLastInteractedAd;
    }
    
    // Clear the saved state
    sessionStorage.removeItem('adsClicked');
    sessionStorage.removeItem('lastInteractedAd');
}

// Mark ad as clicked
function markAdAsClicked(adId, showNotif = true) {
    if (!adId) return;
    
    // Check if this ad has already been clicked
    if (adsClicked.has(adId)) {
        return; // Don't show notification for duplicate clicks
    }
    
    // Mark this ad as clicked
    adsClicked.add(adId);
    updateAdCounter();
    
    // Update the visual indicator for this ad
    const wrapper = document.querySelector(`[data-ad-id="${adId}"]`);
    if (wrapper) {
        // Remove the "Tap me" indicator
        const indicator = wrapper.querySelector('.ad-click-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Add a "Clicked" indicator
        const clickedIndicator = document.createElement('div');
        clickedIndicator.className = 'ad-clicked-indicator';
        clickedIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Clicked';
        clickedIndicator.style.position = 'absolute';
        clickedIndicator.style.top = '5px';
        clickedIndicator.style.right = '5px';
        clickedIndicator.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
        clickedIndicator.style.color = 'white';
        clickedIndicator.style.padding = '5px 10px';
        clickedIndicator.style.borderRadius = '3px';
        clickedIndicator.style.fontSize = '12px';
        clickedIndicator.style.zIndex = '1000';
        clickedIndicator.style.pointerEvents = 'none';
        wrapper.appendChild(clickedIndicator);
        
        // Update the border to indicate it's been clicked
        wrapper.style.border = '1px solid rgba(46, 204, 113, 0.5)';
    }
    
    // Show notification
    if (showNotif) {
        showNotification(`Ad clicked! (${adsClicked.size}/${totalAds})`);
    }
    
    // Track the ad click
    trackAdClick(adPageNumber);
    
    // Check if all ads have been clicked
    if (adsClicked.size >= totalAds) {
        if (showNotif) {
            showNotification('All ads clicked! You can now continue.');
        }
        
        // If timer is already completed, enable the check button
        if (timerCompleted) {
            const instructions = document.getElementById('instructions');
            if (instructions) {
                instructions.querySelector('p').textContent = `Great! You've clicked all the ads. Click the button below to continue.`;
            }
        }
    }
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.style.display = 'block';
        notification.classList.add('show');
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// Start countdown timer
function startCountdown() {
    let seconds = 15;
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    const mainProgressBar = document.getElementById('mainProgressBar');
    
    // Ensure countdown element exists
    if (!countdownElement) {
        console.error('Countdown element not found');
        return;
    }
    
    // Initialize countdown display
    countdownElement.textContent = seconds;
    
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        // Calculate progress percentage (remaining time / total time)
        const progressPercent = (seconds / 15) * 100;
        
        // Update progress bars
        if (progressBar) {
            progressBar.style.width = progressPercent + '%';
        }
        
        if (mainProgressBar) {
            mainProgressBar.style.width = progressPercent + '%';
        }
        
        // Update time remaining display
        updateAdCounter();
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            timerCompleted = true;
            showAdCheckButton();
        }
    }, 1000);
}

// Show ad check button when timer completes
function showAdCheckButton() {
    const adCheckBtn = document.getElementById('adCheckBtn');
    const instructions = document.getElementById('instructions');
    
    if (adCheckBtn && instructions) {
        adCheckBtn.style.display = 'flex';
        instructions.style.display = 'block';
        
        // Update instructions based on ads clicked
        if (adsClicked.size >= totalAds) {
            instructions.querySelector('p').textContent = `Great! You've clicked all the ads. Click the button below to continue.`;
        } else {
            instructions.querySelector('p').textContent = `Please tap on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
        }
        
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
            
            // Check if all ads have been clicked
            if (adsClicked.size < totalAds) {
                // Show warning if not all ads have been clicked
                showNotification(`Please tap on at least ${totalAds} ads before continuing! (${adsClicked.size}/${totalAds} clicked)`);
                
                // Update instructions
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.querySelector('p').textContent = `Please tap on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
                }
            } else {
                // All ads have been clicked, show loading for 3 seconds
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
        downloadBtn.classList.remove('locked');
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
            if (adClickDetectionInterval) clearInterval(adClickDetectionInterval);
            
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
