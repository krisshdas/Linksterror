// ad-page.js - Fully working, mobile-optimized, personalized ads

// ----- Firebase -----
const database = firebase.database();

// ----- Global State -----
let adPageNumber = 1;
let userId = null;
let adsClicked = new Set();
let totalAds = 0;
let timer = 15;
let countdownInterval;
let timerComplete = false;

// ----- INIT -----
function initAdPage(pageNum = 1) {
  adPageNumber = pageNum;
  userId = sessionStorage.getItem("userId") || null;
  const shortCode = sessionStorage.getItem("shortCode");
  const originalUrl = sessionStorage.getItem("originalUrl");

  if (!userId || !shortCode || !originalUrl) {
    console.error("Missing session data");
    window.location.href = "index.html";
    return;
  }

  applyMobileFriendlyStyles();
  loadUserAds(userId, adPageNumber)
    .then((ads) => {
      injectAds(ads);
      totalAds = document.querySelectorAll(".ad-wrapper").length;
      setupAdDetection();
      startCountdown();
      trackAdView(userId, adPageNumber);
    })
    .catch((e) => {
      console.error("Failed to load user ads:", e);
    });
}

// ----- LOAD ADS -----
async function loadUserAds(uid, pageNum) {
  const snapshot = await database
    .ref(`users/${uid}/ads/config/ad${pageNum}`)
    .once("value");
  return snapshot.val() || {};
}

// ----- INJECT ADS -----
function injectAds(ads) {
  const map = {
    headerAd: ads.header,
    sideAd1: ads.side1,
    sideAd2: ads.side2,
    sideAd3: ads.side3,
    sideAd4: ads.side4,
    bottomAd: ads.bottom,
    popAd: ads.popup,
  };

  Object.entries(map).forEach(([id, html]) => {
    const el = document.getElementById(id);
    if (el && html) {
      el.innerHTML = html;
      executeInlineScripts(el);
    }
  });
}

// Execute inline <script> tags from injected ads
function executeInlineScripts(container) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    [...oldScript.attributes].forEach((attr) =>
      newScript.setAttribute(attr.name, attr.value)
    );
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

// ----- TIMER -----
function startCountdown() {
  const countdownEl = document.getElementById("countdown");
  const timeRemainingEl = document.getElementById("timeRemaining");
  const progressBar = document.getElementById("progressBar");
  const adCheckBtn = document.getElementById("adCheckBtn");
  const instructions = document.getElementById("instructions");

  let time = timer;
  countdownEl.textContent = time;
  timeRemainingEl.textContent = time;
  progressBar.style.width = "0%";

  countdownInterval = setInterval(() => {
    time--;
    countdownEl.textContent = time;
    timeRemainingEl.textContent = time;
    progressBar.style.width = `${((timer - time) / timer) * 100}%`;

    if (time <= 0) {
      clearInterval(countdownInterval);
      timerComplete = true;
      instructions.style.display = "block";
      adCheckBtn.style.display = "inline-flex";
      showNotification("Timer completed! Now tap on ads.", "success");
    }
  }, 1000);
}

// ----- DETECTION -----
function setupAdDetection() {
  const adWrappers = document.querySelectorAll(".ad-wrapper");
  const adsViewedEl = document.getElementById("adsViewed");

  adWrappers.forEach((el) => {
    const id = el.dataset.adId;
    ["click", "touchstart"].forEach((evt) => {
      el.addEventListener(evt, () => {
        if (timerComplete && !adsClicked.has(id)) {
          adsClicked.add(id);
          adsViewedEl.textContent = adsClicked.size;
          showNotification("Ad tapped successfully!", "success");
          trackAdClick(userId, adPageNumber, id);
        }
      });
    });
  });

  const adCheckBtn = document.getElementById("adCheckBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  adCheckBtn.addEventListener("click", () => {
    if (!timerComplete) {
      showNotification("Please wait for the timer to finish.", "error");
      return;
    }

    if (adsClicked.size < 6) {
      showNotification(
        `You must tap at least 6 ads (tapped: ${adsClicked.size})`,
        "error"
      );
      return;
    }

    downloadBtn.disabled = false;
    downloadBtn.classList.remove("locked");
    downloadBtn.innerHTML = `<i class="fas fa-unlock"></i><span>Continue</span>`;
    showNotification("Ads verified! You can continue now.", "success");

    downloadBtn.addEventListener("click", () => {
      const url = sessionStorage.getItem("originalUrl");
      if (url) window.location.href = url;
    });
  });
}

// ----- TRACKING -----
function trackAdView(uid, page) {
  database
    .ref(`users/${uid}/ads/views/ad${page}`)
    .transaction((v) => (v || 0) + 1);
}

function trackAdClick(uid, page, adId) {
  database
    .ref(`users/${uid}/ads/clicks/ad${page}/${adId}`)
    .transaction((v) => (v || 0) + 1);
}

// ----- NOTIFICATION -----
function showNotification(msg, type) {
  const notif = document.getElementById("notification");
  const text = document.getElementById("notificationText");
  text.textContent = msg;
  notif.className = `notification ${type}`;
  notif.classList.add("show");
  setTimeout(() => notif.classList.remove("show"), 3000);
}

// ----- MOBILE STYLE -----
function applyMobileFriendlyStyles() {
  const style = document.createElement("style");
  style.textContent = `
    body, html { overflow-x: hidden; }
    .ad-container { max-width: 100%; }
    .ad-wrapper iframe, .ad-wrapper ins { max-width: 100%; height: auto; }
    .download-btn, .ad-check-btn { 
      font-size: 1rem; padding: 12px 18px; border-radius: 8px;
    }
    @media (max-width: 768px) {
      .ad-left, .ad-right { display: none !important; }
      .ad-center { width: 100% !important; }
    }
  `;
  document.head.appendChild(style);
}

// ----- START -----
window.initAdPage = initAdPage;
