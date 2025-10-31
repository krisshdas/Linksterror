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
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let lastInteractedAd = null;
let pageVisibilityHidden = false;
let adClickTimeouts = new Map(); // Track timeouts for each ad

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
    
    // Clear any existing timeouts
    adClickTimeouts.forEach(timeout => clearTimeout(timeout));
    adClickTimeouts.clear();
    
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
            lastInteractionTime: 0
        });
        
        // Add event listeners to track when user enters the ad area
        wrapper.addEventListener('mouseenter', handleAdMouseEnter);
        wrapper.addEventListener('touchstart', handleAdTouchStart, { passive: true });
        
        // Add event listeners to track when user leaves the ad area
        wrapper.addEventListener('mouseleave', handleAdMouseLeave);
        wrapper.addEventListener('touchend', handleAdTouchEnd, { passive: true });
        
        // Add click event listener directly to the wrapper
        wrapper.addEventListener('click', handleAdWrapperClick);
        
        // For iframe ads, we need to detect clicks differently
        const iframes = wrapper.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            // Add a transparent overlay to detect clicks
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '999';
            overlay.style.backgroundColor = 'transparent';
            overlay.style.cursor = 'pointer';
            
            // Add click event to the overlay
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdClick(adId);
            });
            
            wrapper.appendChild(overlay);
        });
    });
    
    // Add global event listeners to detect when user leaves the page
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Add click event listener to detect clicks on the page
    document.addEventListener('click', handleDocumentClick);
}

// Handle mouse enter on ad
function handleAdMouseEnter(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.entered = true;
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    
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
    
    // Remove visual feedback
    wrapper.style.backgroundColor = '';
}

// Handle touch start on ad
function handleAdTouchStart(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.entered = true;
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    
    // Add visual feedback
    wrapper.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
}

// Handle touch end on ad
function handleAdTouchEnd(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.entered = false;
    
    // Remove visual feedback
    wrapper.style.backgroundColor = '';
}

// Handle ad wrapper click
function handleAdWrapperClick(e) {
    const wrapper = e.currentTarget;
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;
    
    const interaction = adInteractions.get(adId);
    if (!interaction) return;
    
    interaction.interacted = true;
    interaction.lastInteractionTime = Date.now();
    lastInteractedAd = adId;
    
    // Mark as clicked after a short delay (to allow the ad to open first)
    const timeoutId = setTimeout(() => {
        handleAdClick(adId);
    }, 500);
    
    // Store the timeout ID so we can clear it if needed
    adClickTimeouts.set(adId, timeoutId);
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
                
                // Mark as clicked after a short delay (to allow the ad to open first)
                const timeoutId = setTimeout(() => {
                    handleAdClick(adId);
                }, 500);
                
                // Store the timeout ID so we can clear it if needed
                adClickTimeouts.set(adId, timeoutId);
            }
        }
    }
}

// Handle before unload event
function handleBeforeUnload(e) {
    // If the user is leaving the page after interacting with an ad
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
        const interaction = adInteractions.get(lastInteractedAd);
        if (interaction && interaction.interacted) {
            // Mark the ad as clicked
            handleAdClick(lastInteractedAd);
        }
    }
}

// Handle window blur event
function handleWindowBlur() {
    // If the window loses focus after interacting with an ad
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
        const interaction = adInteractions.get(lastInteractedAd);
        if (interaction && interaction.interacted) {
            // Mark the ad as clicked
            handleAdClick(lastInteractedAd);
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
                handleAdClick(lastInteractedAd);
            }
        }
    } else if (!document.hidden) {
        // Page is becoming visible again
        pageVisibilityHidden = false;
    }
}

// Handle ad click
function handleAdClick(adId) {
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
        
        // Remove any overlay that might be blocking the ad
        const overlay = wrapper.querySelector('div[style*="position: absolute"][style*="z-index: 999"]');
        if (overlay) {
            overlay.style.pointerEvents = 'none';
        }
    }
    
    // Show notification
    showNotification(`Ad clicked! (${adsClicked.size}/${totalAds})`);
    
    // Track the ad click
    trackAdClick(adPageNumber);
    
    // Check if all ads have been clicked
    if (adsClicked.size >= totalAds) {
        showNotification('All ads clicked! You can now continue.');
        
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
    
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        // Update progress bar
        const progressPercent = ((15 - seconds) / 15) * 100;
        progressBar.style.width = (100 - progressPercent) + '%';
        mainProgressBar.style.width = (100 - progressPercent) + '%';
        
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
