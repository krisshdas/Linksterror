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
let adWrappers = new Map(); // Map to track ad wrappers and their click status

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    adsClicked.clear();
    adWrappers.clear();
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
        
        // Store the wrapper in our map
        adWrappers.set(adId, {
            element: wrapper,
            clicked: false
        });
        
        // Monitor for clicks on iframes within the wrapper
        const iframes = wrapper.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            // Track clicks on iframes (this is a workaround since we can't directly detect iframe clicks)
            iframe.addEventListener('load', function() {
                try {
                    // Try to add a click listener to the iframe content
                    // This will likely fail due to cross-origin restrictions
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.addEventListener('click', function() {
                        handleAdClick(adId);
                    });
                } catch (e) {
                    // Cross-origin restriction, use alternative method
                    // Add a blur event listener to detect when user clicks on iframe
                    iframe.addEventListener('blur', function() {
                        // Check if the iframe is still focused after a short delay
                        setTimeout(function() {
                            if (document.activeElement !== iframe) {
                                // User clicked on the iframe
                                handleAdClick(adId);
                            }
                        }, 100);
                    });
                }
            });
        });
        
        // Monitor for clicks on other elements (a tags, img tags, etc.)
        const clickableElements = wrapper.querySelectorAll('a, img, div[onclick], button');
        clickableElements.forEach(element => {
            element.addEventListener('click', function(e) {
                handleAdClick(adId);
            });
        });
        
        // Monitor for any clicks within the wrapper
        wrapper.addEventListener('click', function(e) {
            // Check if the click is on an actual ad element
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            
            // Count clicks on iframes, links, images, or elements with specific ad attributes
            if (tagName === 'iframe' || 
                tagName === 'a' || 
                tagName === 'img' ||
                target.hasAttribute('data-ad') ||
                target.closest('[data-ad]')) {
                handleAdClick(adId);
            }
        });
        
        // Monitor for window focus changes (another way to detect iframe clicks)
        window.addEventListener('focus', function() {
            // Check if any iframe was recently clicked
            const iframes = wrapper.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (document.activeElement === iframe) {
                    handleAdClick(adId);
                }
            });
        });
    });
}

// Handle ad click
function handleAdClick(adId) {
    if (!adId) return;
    
    // Get the wrapper info
    const wrapperInfo = adWrappers.get(adId);
    if (!wrapperInfo || wrapperInfo.clicked) return;
    
    // Mark this ad as clicked
    wrapperInfo.clicked = true;
    adsClicked.add(adId);
    updateAdCounter();
    
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
