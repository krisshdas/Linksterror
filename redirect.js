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

// Read the short ID from the link
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// Get long URL from Firebase
async function fetchAndRedirect() {
  if (!id) {
    document.body.innerHTML = "<h3>Invalid or missing link ID.</h3>";
    return;
  }

  try {
    const snapshot = await get(child(ref(db), `links/${id}`));

    if (!snapshot.exists()) {
      document.body.innerHTML = "<h3>Short link not found.</h3>";
      return;
    }

    const { longUrl } = snapshot.val();

    // Encode the destination and send the visitor to your GitHub ad page
    const encoded = encodeURIComponent(longUrl);
    const adPage = `https://krisshdas.github.io/Linksterror/ad1.html?dest=${encoded}`;
    window.location.href = adPage;

  } catch (err) {
    console.error("Error fetching link:", err);
    document.body.innerHTML = "<h3>Error fetching link from Firebase.</h3>";
  }
}

fetchAndRedirect();
