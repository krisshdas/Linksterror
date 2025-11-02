// ad-page.js - Personalized ad pages with robust mobile/desktop click detection
// Assumptions:
// - `shortCode` and `originalUrl` are stored in sessionStorage by redirect logic.
// - Firebase SDK has been loaded and firebase.initializeApp(...) has been called before this file runs.
// - Database structure (Option A):
//   users/{userId}/links/{linkId} => { shortCode, originalUrl, ads: { header, side1, side2, side3, side4, bottom, popup }, adViews: {...}, adClicks: {...} }

// -------------------- Configuration --------------------
const database = firebase.database();
let adPageNumber = 1;
let originalUrl = '';
let countdownInterval = null;
let adClickDetectionTimeout = null;
let timerCompleted = false;
let isChecking = false;
let adsClicked = new Set();
let adInteractions = new Map();
let lastTouchTime = 0;
let lastInteractedAd = null;
let userIdForLink = null; // filled when we find the link in DB
let linkIdForLink = null; // filled when we find the link in DB
let totalAds = 0; // computed from available ad slots

// -------------------- Initialization --------------------
function initAdPage(pageNumber) {
  adPageNumber = pageNumber;

  // Reset
  resetStateForNewPage();

  originalUrl = sessionStorage.getItem('originalUrl') || '';
  const shortCode = sessionStorage.getItem('shortCode') || '';

  if (!originalUrl || !shortCode) {
    // Missing context, go home
    window.location.href = 'index.html';
    return;
  }

  // Load the link record from Firebase (find the user and link by shortCode)
  findLinkByShortCode(shortCode)
    .then(({ userId, linkId, link }) => {
      userIdForLink = userId;
      linkIdForLink = linkId;

      // Load ads into the page using the `ads` object from this link (if present)
      const ads = (link && link.ads) || {};
      injectAdsFromConfig(ads);

      // Compute total ad slots dynamically by counting .ad-wrapper elements that have data-ad-id
      computeTotalAds();

      // start countdown and detection
      startCountdown();
      setupAdClickDetection();

      // track view
      trackAdViewToFirebase(userId, linkId, adPageNumber)
        .catch(err => console.error('trackAdView error', err));
    })
    .catch((err) => {
      console.error('Error finding link for shortCode:', err);
      // If link not found, redirect home
      window.location.href = 'index.html';
    });
}

function resetStateForNewPage() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (adClickDetectionTimeout) clearTimeout(adClickDetectionTimeout);

  adsClicked.clear();
  adInteractions.clear();
  timerCompleted = false;
  isChecking = false;
  lastInteractedAd = null;
  userIdForLink = null;
  linkIdForLink = null;
  totalAds = 0;

  // UI resets
  resetProgressBars();
  updateAdCounter();
}

// -------------------- Firebase helper --------------------
function findLinkByShortCode(shortCode) {
  // Returns a Promise resolved with { userId, linkId, link }
  return new Promise((resolve, reject) => {
    database.ref('users').once('value')
      .then(snapshot => {
        const users = snapshot.val() || {};
        for (const userId in users) {
          const user = users[userId];
          const links = (user && user.links) || {};
          for (const linkId in links) {
            const link = links[linkId];
            if (link && link.shortCode === shortCode) {
              resolve({ userId, linkId, link });
              return;
            }
          }
        }
        reject(new Error('Short code not found'));
      })
      .catch(reject);
  });
}

// Increment view counter for this page in the link record
function trackAdViewToFirebase(userId, linkId, pageNumber) {
  if (!userId || !linkId) return Promise.resolve();

  const ref = database.ref(`users/${userId}/links/${linkId}`);
  return ref.once('value').then(snapshot => {
    const link = snapshot.val() || {};
    const currentAdViews = link.adViews || {};
    const pageKey = `page${pageNumber}`;
    const newVal = (currentAdViews[pageKey] || 0) + 1;
    const updatedAdViews = { ...currentAdViews, [pageKey]: newVal };
    return ref.update({ adViews: updatedAdViews });
  });
}

// Increment click counter for this page in the link record
function trackAdClickToFirebase(userId, linkId, pageNumber) {
  if (!userId || !linkId) return Promise.resolve();

  const ref = database.ref(`users/${userId}/links/${linkId}`);
  return ref.once('value').then(snapshot => {
    const link = snapshot.val() || {};
    const currentAdClicks = link.adClicks || {};
    const pageKey = `page${pageNumber}`;
    const newVal = (currentAdClicks[pageKey] || 0) + 1;
    const updatedAdClicks = { ...currentAdClicks, [pageKey]: newVal };
    return ref.update({ adClicks: updatedAdClicks });
  });
}

// -------------------- Ad injection --------------------
function injectAdsFromConfig(ads) {
  // Map of slot -> element ID in DOM
  const slotMap = {
    header: 'headerAd',
    side1: 'sideAd1',
    side2: 'sideAd2',
    side3: 'sideAd3',
    side4: 'sideAd4',
    bottom: 'bottomAd',
    popup: 'popAd'
  };

  Object.keys(slotMap).forEach(slot => {
    const elementId = slotMap[slot];
    const content = ads[slot];
    if (content) {
      executeAdScript(elementId, content, slot);
    } else {
      // Ensure the slot is cleared
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = '';
    }
  });

  // Hide any loading animation
  const loadingAnimation = document.querySelector('.loading-animation');
  if (loadingAnimation) loadingAnimation.style.display = 'none';
}

function executeAdScript(elementId, scriptContent, slotName) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Clear the element
  element.innerHTML = '';

  // Create a container that will be the ad-wrapper and give it a data-ad-id
  const wrapper = document.createElement('div');
  wrapper.className = 'ad-wrapper';
  // Use a deterministic ad id from slotName so we can track which slot was clicked
  const adId = `${slotName}`;
  wrapper.setAttribute('data-ad-id', adId);
  wrapper.style.position = 'relative';

  // Create temp div to parse HTML string
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = scriptContent;

  // Move non-script nodes into wrapper first
  Array.from(tempDiv.childNodes).forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') return;
    wrapper.appendChild(node.cloneNode(true));
  });

  // Append wrapper to target element
  element.appendChild(wrapper);

  // Now add scripts (this executes inline scripts correctly)
  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach(script => {
    const newScript = document.createElement('script');
    Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    newScript.textContent = script.textContent;
    // Scripts appended to the wrapper so any document.write or DOM assumptions are relative to page
    wrapper.appendChild(newScript);
  });
}

// -------------------- UI helpers --------------------
function resetProgressBars() {
  const progressBar = document.getElementById('progressBar');
  const mainProgressBar = document.getElementById('mainProgressBar');
  if (progressBar) progressBar.style.width = '100%';
  if (mainProgressBar) mainProgressBar.style.width = '100%';
}

function updateAdCounter() {
  const adsViewedElement = document.getElementById('adsViewed');
  if (adsViewedElement) adsViewedElement.textContent = adsClicked.size;

  const timeRemainingElement = document.getElementById('timeRemaining');
  if (timeRemainingElement) {
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) timeRemainingElement.textContent = countdownElement.textContent;
  }
}

function computeTotalAds() {
  const wrappers = document.querySelectorAll('.ad-wrapper');
  totalAds = 0;
  wrappers.forEach(w => {
    const adId = w.getAttribute('data-ad-id');
    if (adId) totalAds++;
  });

  // If no ad wrappers found, set a fallback to 1 to allow progress to continue
  if (totalAds === 0) totalAds = 1;
}

function showNotification(message, ttl = 3000) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');
  if (!notification || !notificationText) return;
  notificationText.textContent = message;
  notification.style.display = 'block';
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.style.display = 'none', 300);
  }, ttl);
}

// -------------------- Countdown --------------------
function startCountdown() {
  const countdownElement = document.getElementById('countdown');
  const progressBar = document.getElementById('progressBar');
  const mainProgressBar = document.getElementById('mainProgressBar');
  if (!countdownElement) return;

  let seconds = 15;
  countdownElement.textContent = seconds;

  countdownInterval = setInterval(() => {
    seconds--;
    countdownElement.textContent = seconds;

    const progressPercent = (seconds / 15) * 100;
    if (progressBar) progressBar.style.width = progressPercent + '%';
    if (mainProgressBar) mainProgressBar.style.width = progressPercent + '%';

    updateAdCounter();

    if (seconds <= 0) {
      clearInterval(countdownInterval);
      timerCompleted = true;
      showAdCheckButton();
    }
  }, 1000);
}

function showAdCheckButton() {
  const adCheckBtn = document.getElementById('adCheckBtn');
  const instructions = document.getElementById('instructions');
  if (!adCheckBtn || !instructions) return;

  adCheckBtn.style.display = 'flex';
  instructions.style.display = 'block';

  if (adsClicked.size >= totalAds) {
    instructions.querySelector('p').textContent = `Great! You've clicked all the ads. Click the button below to continue.`;
  } else {
    instructions.querySelector('p').textContent = `Please tap on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
  }

  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 500);
}

// -------------------- Ad click detection (unified) --------------------
function setupAdClickDetection() {
  // Attach handlers to existing wrappers now
  const wrappers = document.querySelectorAll('.ad-wrapper');
  wrappers.forEach(wrapper => {
    const adId = wrapper.getAttribute('data-ad-id');
    if (!adId) return;

    addVisualIndicatorIfNeeded(wrapper, adId);

    // Prepare interaction tracking
    adInteractions.set(adId, { interacted: false, lastInteractionTime: 0 });

    // Direct events we control
    wrapper.addEventListener('click', (e) => {
      handleDirectAdInteraction(adId, e);
    }, { passive: true });

    wrapper.addEventListener('touchend', (e) => {
      handleDirectAdInteraction(adId, e);
    }, { passive: true });

    // Catch anchors inside wrapper (some ad scripts create <a> tags)
    wrapper.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a) {
        // If the anchor opens in a new tab or triggers navigation, treat as click
        markAdAsClicked(adId);
      }
    }, { passive: true });
  });

  // Global fallback: touchstart timestamp to correlate with visibilitychange
  document.addEventListener('touchstart', (e) => {
    lastTouchTime = Date.now();
  }, { passive: true });

  // When page becomes hidden shortly after a touch, it's likely the user opened an ad
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Date.now() - lastTouchTime < 1000) {
      // Use last touched element to infer ad wrapper
      // elementFromPoint may not work reliably if touch coordinates aren't available; try best-effort
      try {
        // For many devices, last touch coordinates are not directly exposed; instead use lastInteractedAd
        if (lastInteractedAd) markAdAsClicked(lastInteractedAd);
        else {
          // As a fallback, mark the first unclicked ad as clicked
          const first = Array.from(document.querySelectorAll('.ad-wrapper')).find(w => !adsClicked.has(w.getAttribute('data-ad-id')));
          if (first) markAdAsClicked(first.getAttribute('data-ad-id'));
        }
      } catch (err) {
        console.warn('visibilitychange fallback failed', err);
      }
    }
  });

  // Also cover blur/pagehide (some browsers fire these)
  window.addEventListener('blur', () => {
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
      markAdAsClicked(lastInteractedAd);
    }
  });

  window.addEventListener('pagehide', () => {
    if (lastInteractedAd && !adsClicked.has(lastInteractedAd)) {
      markAdAsClicked(lastInteractedAd);
    }
  });

  // Periodic check for adInteractions to confirm clicks
  adClickDetectionTimeout = setInterval(() => {
    adInteractions.forEach((int, adId) => {
      if (int.interacted && !adsClicked.has(adId) && Date.now() - int.lastInteractionTime > 500) {
        markAdAsClicked(adId);
      }
    });
  }, 700);
}

function addVisualIndicatorIfNeeded(wrapper, adId) {
  // Add "Tap me" indicator for unclicked ads
  if (!adsClicked.has(adId) && !wrapper.querySelector('.ad-click-indicator')) {
    const indicator = document.createElement('div');
    indicator.className = 'ad-click-indicator';
    indicator.innerHTML = '<i class="fas fa-hand-pointer"></i> Tap me';
    Object.assign(indicator.style, {
      position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(52,152,219,0.8)', color: 'white', padding: '5px 10px', borderRadius: '3px', fontSize: '12px', zIndex: '1000', pointerEvents: 'none'
    });
    wrapper.appendChild(indicator);
  }
}

function handleDirectAdInteraction(adId, event) {
  lastInteractedAd = adId;
  const interaction = adInteractions.get(adId) || { interacted: false, lastInteractionTime: 0 };
  interaction.interacted = true;
  interaction.lastInteractionTime = Date.now();
  adInteractions.set(adId, interaction);

  // If the event is a click/touchend, immediately mark as clicked (fast and reliable)
  markAdAsClicked(adId);
}

// -------------------- Mark as clicked --------------------
function markAdAsClicked(adId, showNotif = true) {
  if (!adId) return;
  if (adsClicked.has(adId)) return;

  adsClicked.add(adId);
  updateAdCounter();

  // Update UI
  const wrapper = document.querySelector(`[data-ad-id="${adId}"]`);
  if (wrapper) {
    const indicator = wrapper.querySelector('.ad-click-indicator');
    if (indicator) indicator.remove();

    const clickedIndicator = document.createElement('div');
    clickedIndicator.className = 'ad-clicked-indicator';
    clickedIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Clicked';
    Object.assign(clickedIndicator.style, { position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(46,204,113,0.8)', color: 'white', padding: '5px 10px', borderRadius: '3px', fontSize: '12px', zIndex: '1000', pointerEvents: 'none' });
    wrapper.appendChild(clickedIndicator);
    wrapper.style.border = '1px solid rgba(46,204,113,0.5)';
  }

  if (showNotif) showNotification(`Ad clicked! (${adsClicked.size}/${totalAds})`);

  // Persist to session storage so reloads keep state
  try {
    sessionStorage.setItem('adsClicked', JSON.stringify([...adsClicked]));
  } catch (e) { /* ignore */ }

  // Track in Firebase (increment click for this page)
  if (userIdForLink && linkIdForLink) {
    trackAdClickToFirebase(userIdForLink, linkIdForLink, adPageNumber)
      .catch(err => console.error('trackAdClick error', err));
  }

  // If all clicked and timer is done, update instructions
  if (adsClicked.size >= totalAds) {
    if (timerCompleted) {
      const instructions = document.getElementById('instructions');
      if (instructions) instructions.querySelector('p').textContent = `Great! You've clicked all the ads. Click the button below to continue.`;
    }
  }
}

// -------------------- Restore state --------------------
function restoreStateFromSessionStorage() {
  const saved = sessionStorage.getItem('adsClicked');
  if (!saved) return;
  try {
    const arr = JSON.parse(saved);
    arr.forEach(adId => {
      if (!adsClicked.has(adId)) markAdAsClicked(adId, false);
    });
    sessionStorage.removeItem('adsClicked');
  } catch (e) {
    console.error('restoreState error', e);
  }
}

// -------------------- Buttons and flow --------------------
document.addEventListener('DOMContentLoaded', () => {
  const adCheckBtn = document.getElementById('adCheckBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  if (adCheckBtn) {
    adCheckBtn.addEventListener('click', () => {
      if (isChecking) return;
      if (adsClicked.size < totalAds) {
        showNotification(`Please tap on at least ${totalAds} ads before continuing! (${adsClicked.size}/${totalAds} clicked)`);
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.querySelector('p').textContent = `Please tap on at least ${totalAds} ads before continuing. (${adsClicked.size}/${totalAds} clicked)`;
        return;
      }

      // All ads clicked -> show loading and unlock
      isChecking = true;
      adCheckBtn.disabled = true;
      adCheckBtn.classList.add('checking');
      adCheckBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Checking...</span>`;

      setTimeout(() => {
        unlockDownloadButton();
      }, 1500);
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (downloadBtn.disabled) return;

      // Stop intervals
      if (countdownInterval) clearInterval(countdownInterval);
      if (adClickDetectionTimeout) clearInterval(adClickDetectionTimeout);

      // Redirect logic based on adPageNumber
      if (adPageNumber === 1) window.location.href = 'ad2.html';
      else if (adPageNumber === 2) window.location.href = 'ad3.html';
      else if (adPageNumber === 3) window.location.href = 'ad4.html';
      else if (adPageNumber === 4) window.location.href = 'ad5.html';
      else if (adPageNumber === 5) window.location.href = originalUrl;
    });
  }

  // Try to restore previous ad clicks if any
  restoreStateFromSessionStorage();
});

function unlockDownloadButton() {
  const downloadBtn = document.getElementById('downloadBtn');
  const adCheckBtn = document.getElementById('adCheckBtn');
  if (!downloadBtn || !adCheckBtn) return;

  adCheckBtn.style.display = 'none';
  downloadBtn.style.display = 'flex';
  downloadBtn.disabled = false;
  downloadBtn.classList.remove('locked');
  downloadBtn.classList.add('unlocked');

  if (adPageNumber === 5) {
    downloadBtn.innerHTML = `<i class="fas fa-download"></i><span>Final Download</span>`;
  } else {
    downloadBtn.innerHTML = `<i class="fas fa-unlock"></i><span>Continue to Next Page</span>`;
  }
}

// -------------------- Export for manual init --------------------
// Call initAdPage(pageNumber) from your adN.html pages (e.g. onload or script)
window.initAdPage = initAdPage;

// End of file
