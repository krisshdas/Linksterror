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
let fakeAdsClicked = 0; // Track fake ad clicks
let totalAds = 6; // Total number of ads to "click"
let countdownInterval;
let fakeAdClickInterval;
let originalUrl = '';
let adPageNumber = 1;
let timerCompleted = false;
let isChecking = false;
let fakeClickProcessCompleted = false;

// Initialize ad page
function initAdPage(pageNumber) {
    adPageNumber = pageNumber;
    
    // Reset variables for new page
    fakeAdsClicked = 0;
    timerCompleted = false;
    isChecking = false;
    fakeClickProcessCompleted = false;
    
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
    
    // Start countdown (slower to feel like 25 seconds)
    startCountdown();
    
    // Track ad view
    trackAdView(pageNumber);
}

// Update ad counter display
function updateAdCounter() {
    const adsViewedElement = document.getElementById('adsViewed');
    if (adsViewedElement) {
        adsViewedElement.textContent = fakeAdsClicked;
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
            startFakeAdClickProcess();
        }
    }, 1667); // ~1000ms * 1.667 = 1667ms to make 15 seconds feel like 25 seconds
}

// Start the fake ad click process
function startFakeAdClickProcess() {
    // Show initial message
    showProcessingMessage("Processing ad interactions...");
    
    // Start the fake ad click timer
    fakeAdClickInterval = setInterval(() => {
        if (fakeAdsClicked < totalAds) {
            fakeAdsClicked++;
            updateAdCounter();
            
            // Update progress bar for each fake ad click
            updateProgressBarForAdClick();
            
            // Show message for each fake ad click
            showFakeAdClickMessage(fakeAdsClicked);
            
            // If all ads are "clicked", complete the process
            if (fakeAdsClicked >= totalAds) {
                clearInterval(fakeAdClickInterval);
                fakeClickProcessCompleted = true;
                showProcessingCompleteMessage();
            }
        }
    }, 7000); // 7 seconds between each fake ad click
}

// Update progress bar for each fake ad click
function updateProgressBarForAdClick() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        // Calculate progress based on ads clicked
        const progressPercent = (fakeAdsClicked / totalAds) * 100;
        progressBar.style.width = progressPercent + '%';
    }
}

// Show message for fake ad click
function showFakeAdClickMessage(clickCount) {
    const message = document.createElement('div');
    message.className = 'fake-ad-click-message';
    message.innerHTML = `<i class="fas fa-check-circle"></i> ${clickCount}/${totalAds} ads processed`;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Show processing message
function showProcessingMessage(text) {
    const message = document.createElement('div');
    message.className = 'processing-message';
    message.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Show processing complete message
function showProcessingCompleteMessage() {
    const message = document.createElement('div');
    message.className = 'processing-complete-message';
    message.innerHTML = `<i class="fas fa-check-circle"></i> All ads processed! You can now check the ads.`;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
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
            
            // Check if all ads have been "clicked"
            if (!fakeClickProcessCompleted) {
                // Show warning if not all ads have been "clicked"
                const warning = document.createElement('div');
                warning.className = 'warning-message';
                warning.textContent = `Please wait for all ads to be processed! (${fakeAdsClicked}/${totalAds} processed)`;
                document.body.appendChild(warning);
                
                setTimeout(() => {
                    warning.remove();
                }, 3000);
            } else {
                // All ads have been "clicked", show loading for 3 seconds
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
            if (fakeAdClickInterval) clearInterval(fakeAdClickInterval);
            
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
