import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Firebase config
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

// Grab link ID from URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const adFrame = document.getElementById("adFrame");
const countdown = document.getElementById("countdown");

// Load your ad from GitHub
adFrame.src = "https://krisshdas.github.io/Linksterror/ad1.html";

async function redirectUser() {
  if (!id) {
    countdown.textContent = "Invalid or missing link ID.";
    return;
  }

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `links/${id}`));

    if (!snapshot.exists()) {
      countdown.textContent = "Link not found in database.";
      return;
    }

    const { longUrl } = snapshot.val();

    let timer = 8;
    countdown.textContent = `Redirecting in ${timer} seconds...`;

    const interval = setInterval(() => {
      timer--;
      countdown.textContent = `Redirecting in ${timer} seconds...`;
      if (timer <= 0) {
        clearInterval(interval);
        window.location.href = longUrl;
      }
    }, 1000);

  } catch (err) {
    console.error("Error fetching link:", err);
    countdown.textContent = "Error fetching link from Firebase.";
  }
}

redirectUser();
