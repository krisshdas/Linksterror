// redirect.js
// Include this in redirect.html with:
// <script type="module" src="./redirect.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ✅ Your Firebase config
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ Get link ID from URL
const params = new URLSearchParams(window.location.search);
const linkId = params.get("id");

// ✅ Handle missing ID
if (!linkId) {
  document.body.innerHTML = "<h3>No link ID provided in the URL.</h3>";
  throw new Error("Missing ?id= parameter");
}

// ✅ Load the link data from Firebase
get(ref(db, "links/" + linkId))
  .then(snapshot => {
    if (!snapshot.exists()) {
      document.body.innerHTML = "<h3>Invalid or expired link.</h3>";
      return;
    }

    const data = snapshot.val();
    const owner = data.owner || data.userId || data.uid;
    const originalUrl = data.originalUrl || data.url || data.target;

    if (!owner || !originalUrl) {
      document.body.innerHTML = "<h3>Link data incomplete (missing owner or URL).</h3>";
      console.error("Link data missing fields:", data);
      return;
    }

    // ✅ Save info for ad1.html
    sessionStorage.setItem("userId", owner);
    sessionStorage.setItem("originalUrl", originalUrl);

    // ✅ Redirect to ad page
    window.location.href = "ad1.html";
  })
  .catch(err => {
    console.error("Error loading link:", err);
    document.body.innerHTML = "<h3>Error loading link data.</h3>";
  });
