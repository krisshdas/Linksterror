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

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    adsClicked.clear();
    adInteractions.clear();
    timerCompleted = false;
    isChecking = false;
    
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
        
        // Add a "Click me" indicator for unclicked ads
        if (!adsClicked.has(adId)) {
            const indicator = document.createElement('div');
            indicator.className = 'ad-click-indicator';
            indicator.innerHTML = '<i class="fas fa-hand-pointer"></i> Click here';
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
        
        // Create a click zone overlay for this ad
        createClickZone(wrapper, adId);
        
        // Initialize interaction tracking for this ad
        adInteractions.set(adId, {
            mouseDown: false,
            mouseUp: false,
            clicked: false
        });
    });
    
    // Add global mouse event listeners
    document.addEventListener('mousedown', handleGlobalMouseDown);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('click', handleGlobalClick);
    
    // Track window focus changes for iframe clicks
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
}

// Create a click zone for an ad
function createClickZone(wrapper, adId) {
    // Create a transparent overlay that covers the entire ad
    const clickZone = document.createElement('div');
    clickZone.className = 'ad-click-zone';
    clickZone.style.position = 'absolute';
    clickZone.style.top = '0';
    clickZone.style.left = '0';
    clickZone.style.width = '100%';
    clickZone.style.height = '100%';
    clickZone.style.zIndex = '999';
    clickZone.style.backgroundColor = 'transparent';
    clickZone.style.pointerEvents = 'none'; // Initially disabled
    
    // Add the click zone to the wrapper
    wrapper.appendChild(clickZone);
    
    // Store reference to the click zone
    wrapper.clickZone = clickZone;
}

// Handle global mouse down event
function handleGlobalMouseDown(e) {
    // Find if the mouse down is on an ad
    const wrapper = e.target.closest('.ad-wrapper');
    if (wrapper) {
        const adId = wrapper.getAttribute('data-ad-id');
        if (adId) {
            const interaction = adInteractions.get(adId);
            if (interaction) {
                interaction.mouseDown = true;
                
                // Enable the click zone to capture the mouse up
                if (wrapper.clickZone) {
                    wrapper.clickZone.style.pointerEvents = 'auto';
                }
            }
        }
    }
}

// Handle global mouse up event
function handleGlobalMouseUp(e) {
    // Find if the mouse up is on an ad
    const wrapper = e.target.closest('.ad-wrapper');
    if (wrapper) {
        const adId = wrapper.getAttribute('data-ad-id');
        if (adId) {
            const interaction = adInteractions.get(adId);
            if (interaction) {
                interaction.mouseUp = true;
                
                // Disable the click zone
                if (wrapper.clickZone) {
                    wrapper.clickZone.style.pointerEvents = 'none';
                }
            }
        }
    }
}

// Handle global click event
function handleGlobalClick(e) {
    // Find if the click is on an ad
    const wrapper = e.target.closest('.ad-wrapper');
    if (wrapper) {
        const adId = wrapper.getAttribute('data-ad-id');
        if (adId) {
            const interaction = adInteractions.get(adId);
            if (interaction && interaction.mouseDown && interaction.mouseUp && !interaction.clicked) {
                // This is a valid click on the ad
                handleAdClick(adId);
                interaction.clicked = true;
                
                // Reset the interaction state after a short delay
                setTimeout(() => {
                    interaction.mouseDown = false;
                    interaction.mouseUp = false;
                    interaction.clicked = false;
                }, 1000);
            }
        }
    }
}

// Handle window focus event (for iframe clicks)
function handleWindowFocus() {
    // Check if any ad was the last active element
    document.querySelectorAll('.ad-wrapper iframe').forEach(iframe => {
        const wrapper = iframe.closest('.ad-wrapper');
        if (wrapper) {
            const adId = wrapper.getAttribute('data-ad-id');
            if (adId) {
                const interaction = adInteractions.get(adId);
                if (interaction && !interaction.clicked) {
                    // The iframe was clicked
                    handleAdClick(adId);
                    interaction.clicked = true;
                    
                    // Reset the interaction state after a short delay
                    setTimeout(() => {
                        interaction.clicked = false;
                    }, 1000);
                }
            }
        }
    });
}

// Handle window blur event
function handleWindowBlur() {
    // This is called when the user clicks on an iframe or opens a new tab
    // We'll handle the actual click detection in the focus event
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
        // Remove the "Click me" indicator
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
    
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        // Update progress bar
        const progressPercent = ((15 - seconds) / 15) * 100;
        progressBar.style.width = (100 - progressPercent) + '%';
        
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
            instructions.querySelector('p').textContent = `Please click on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
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
                showNotification(`Please click on at least ${totalAds} ads before continuing! (${adsClicked.size}/${totalAds} clicked)`);
                
                // Update instructions
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.querySelector('p').textContent = `Please click on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
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
