// Firebase setup
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// DOM refs
const dynamicAdsEl = document.getElementById("dynamicAds");
const continueBtn = document.getElementById("continueBtn");

let clickCount = 0;
const REQUIRED_CLICKS = 6;
let finalDestination = "#";

// Extract short code from URL (example: /ad1.html?code=abc123)
const params = new URLSearchParams(window.location.search);
const shortCode = params.get("code");

// Load ad data and destination
async function loadAdData() {
  try {
    const snap = await db.ref("links/" + shortCode).once("value");
    const linkData = snap.val();
    if (!linkData) {
      alert("Invalid link code");
      return;
    }
    finalDestination = linkData.originalUrl;
    const adSnap = await db.ref("ads").once("value");
    const ads = adSnap.val() || {};

    // Show up to 6 dynamic ads
    const entries = Object.entries(ads).slice(0, 6);
    dynamicAdsEl.innerHTML = "";
    for (const [id, ad] of entries) {
      const card = document.createElement("div");
      card.className = "ad-card";
      card.dataset.url = ad.url;
      card.innerHTML = `
        <img src="${ad.image || 'https://placehold.co/200x120'}" alt="Ad">
        <p>${ad.title || 'Sponsored Ad'}</p>
      `;
      dynamicAdsEl.appendChild(card);
    }

    bindClicks();
  } catch (err) {
    console.error(err);
  }
}

// Attach click handlers for all ads
function bindClicks() {
  const adCards = document.querySelectorAll(".ad-card");
  adCards.forEach(card => {
    card.addEventListener("click", () => handleAdClick(card));
  });
}

async function handleAdClick(card) {
  const url = card.dataset.url;
  if (!url) return;

  // Avoid double counting clicks
  if (card.classList.contains("clicked")) return;
  card.classList.add("clicked");
  clickCount++;

  // Log click to Firebase
  try {
    await db.ref(`linkClicks/${shortCode}/clicks`).push({
      adUrl: url,
      timestamp: Date.now(),
      ip: "client", // optional, backend can enrich later
    });
  } catch (err) {
    console.error("Failed to log click", err);
  }

  // Update button state
  continueBtn.textContent = `Continue (${clickCount} / ${REQUIRED_CLICKS})`;
  if (clickCount >= REQUIRED_CLICKS) {
    continueBtn.classList.add("enabled");
    continueBtn.disabled = false;
  }

  // Open ad in new tab
  window.open(url, "_blank");
}

// Continue to final destination
continueBtn.addEventListener("click", () => {
  if (clickCount < REQUIRED_CLICKS) {
    alert(`Please click ${REQUIRED_CLICKS - clickCount} more ads to continue`);
    return;
  }
  window.location.href = finalDestination;
});

// Init
loadAdData();
