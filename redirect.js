// redirect.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

const id = new URLSearchParams(window.location.search).get("id");
const adFrame = document.getElementById("ad-frame");
const timer = document.getElementById("timer");

async function loadLink() {
  if (!id) {
    timer.textContent = "⚠️ No link ID found in URL";
    return;
  }

  try {
    const snap = await get(ref(db, `links/${id}`));
    if (!snap.exists()) {
      timer.textContent = "⚠️ This short link doesn’t exist.";
      return;
    }

    const data = snap.val();
    const adCode = data.adConfig?.snippet || "<p>No ad configured.</p>";

    // ✅ Load ad snippet into iframe (isolated sandbox)
    const doc = adFrame.contentDocument || adFrame.contentWindow.document;
    doc.open();
    doc.write(adCode);
    doc.close();

    // Countdown before redirect
    let sec = 7;
    timer.textContent = `Redirecting in ${sec}s...`;
    const interval = setInterval(() => {
      sec--;
      timer.textContent = `Redirecting in ${sec}s...`;
      if (sec <= 0) {
        clearInterval(interval);
        window.location.href = data.target;
      }
    }, 1000);
  } catch (error) {
    console.error(error);
    timer.textContent = "Error loading link data.";
  }
}

loadLink();
