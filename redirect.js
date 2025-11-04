// redirect.js

// --- Firebase Config ---
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

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Get Short Link ID ---
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get("id");

// --- DOM Element ---
const loadingText = document.getElementById("loadingText");

// --- Handle Missing ID ---
if (!linkId) {
  loadingText.textContent = "Invalid or missing link ID.";
} else {
  database
    .ref(`links/${linkId}`)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const originalUrl = data.originalUrl;

        // Save in sessionStorage (if same origin)
        sessionStorage.setItem("originalUrl", originalUrl);
        sessionStorage.setItem("shortCode", linkId);

        // 🔥 Construct ad1.html link on the SAME domain (GitHub Pages)
        const adPageUrl = `https://krisshdas.github.io/Linksterror/ad1.html?original=${encodeURIComponent(
          originalUrl
        )}&code=${encodeURIComponent(linkId)}`;

        loadingText.textContent = "Loading advertisement page...";

        // 🔁 Open ad page in same tab, but ensure final MediaFire link opens in a new window
setTimeout(() => {
  // Open the ad page normally (no iframe)
  window.location.href = adPageUrl;

  // Optional: ensure any final redirect (MediaFire) opens in a new tab
  window.open = function (url) {
    const win = window.open(url, '_blank'); // open new tab/window
    if (win) {
      win.focus();
    }
  };
}, 1500);
      } else {
        loadingText.textContent = "Invalid or expired short link.";
      }
    })
    .catch((error) => {
      console.error(error);
      loadingText.textContent = "Error loading link data.";
    });
}

