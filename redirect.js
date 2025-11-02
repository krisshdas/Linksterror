// redirect.js
// Include with: <script type="module" src="./redirect.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// --- Firebase config (your project) ---
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// UI helpers: show simple status to the page (if you have a custom UI, adapt)
function showMessage(text, isError = false) {
  let el = document.getElementById('redirect-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'redirect-msg';
    el.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);padding:8px 12px;border-radius:6px;font-family:system-ui,Arial;z-index:9999';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.background = isError ? '#ffdddd' : '#e6ffed';
  el.style.color = isError ? '#900' : '#064';
}

// Main flow
(async function main() {
  try {
    // get id from query ?id=...
    const params = new URLSearchParams(window.location.search);
    const shortId = params.get('id');
    if (!shortId) {
      showMessage('No link id provided in URL (use ?id=SHORTID).', true);
      console.error('redirect.js: missing id param');
      return;
    }

    showMessage('Looking up link...');

    // Read link record from /links/{shortId}
    const linkRef = ref(db, `links/${shortId}`);
    const snap = await get(linkRef);

    if (!snap.exists()) {
      // Try fallback structure: maybe stored under users/*/links with shortCode field.
      // We'll scan users node as fallback (only recommended for small DBs).
      showMessage('Link not found in /links. Trying fallback lookup...');
      console.warn(`redirect.js: link ${shortId} not found at /links/${shortId}. Falling back to users scan.`);

      const usersRef = ref(db, 'users');
      const usersSnap = await get(usersRef);
      if (!usersSnap.exists()) {
        showMessage('Link not found (no users data).', true);
        console.error('redirect.js: no users data for fallback lookup');
        return;
      }

      const users = usersSnap.val();
      let found = null;

      // iterate users and their links
      for (const uid of Object.keys(users)) {
        const userLinks = users[uid].links;
        if (!userLinks) continue;
        for (const linkKey of Object.keys(userLinks)) {
          const linkObj = userLinks[linkKey];
          // common field names: shortCode, shortId, code
          const code = linkObj.shortCode || linkObj.shortId || linkObj.code || linkObj.id;
          if (code === shortId) {
            found = { uid, linkKey, linkObj };
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        showMessage('Link not found (fallback failed).', true);
        console.error('redirect.js: fallback scan did not find link', shortId);
        return;
      }

      // found in fallback
      const owner = found.uid;
      const originalUrl = found.linkObj.originalUrl || found.linkObj.target || found.linkObj.url;
      if (!originalUrl) {
        showMessage('Link record missing target URL.', true);
        console.error('redirect.js: fallback found link but missing target/originalUrl', found);
        return;
      }

      // store and redirect to ad page with uid + target as query params
      sessionStorage.setItem('userId', owner);
      sessionStorage.setItem('originalUrl', originalUrl);

      // Redirect to ad page and pass uid + target as query params (encoded)
      const adPage = 'ad1.html';
      const qs = `?uid=${encodeURIComponent(owner)}&target=${encodeURIComponent(originalUrl)}`;
      window.location.href = adPage + qs;
      return;
    }

    // primary path: found in /links/{shortId}
    const linkData = snap.val();

    // handle different field names used previously
    const owner = linkData.owner || linkData.ownerUid || linkData.ownerId || linkData.user || linkData.uid;
    const originalUrl = linkData.originalUrl || linkData.target || linkData.url || linkData.destination;

    if (!owner || !originalUrl) {
      // if owner or target missing in /links record, try to derive: perhaps it's a nested object reference
      console.error('redirect.js: /links record missing owner or originalUrl', linkData);
      showMessage('Link record incomplete (owner or target missing).', true);
      return;
    }

    // Save to sessionStorage (so ad1.html can use it)
    sessionStorage.setItem('userId', owner);
    sessionStorage.setItem('originalUrl', originalUrl);

    // Build ad page URL with fallback query params
    const adPageUrl = `ad1.html?uid=${encodeURIComponent(owner)}&target=${encodeURIComponent(originalUrl)}`;

    showMessage('Redirecting to ad page...');
    // small delay for UX and to allow sessionStorage to persist before navigation in some browsers
    setTimeout(() => {
      window.location.href = adPageUrl;
    }, 200);

  } catch (err) {
    console.error('redirect.js error:', err);
    showMessage('Unexpected error while redirecting. Check console.', true);
  }
})();
