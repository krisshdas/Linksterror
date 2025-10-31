// redirect.js

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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get short ID
const urlParams = new URLSearchParams(window.location.search);
const linkId = urlParams.get('id');

const loadingText = document.getElementById('loadingText');

if (!linkId) {
  loadingText.textContent = "Invalid or missing link ID.";
} else {
  database.ref(`links/${linkId}`).once('value').then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const originalUrl = data.originalUrl;

      // ✅ Save locally
      sessionStorage.setItem('originalUrl', originalUrl);
      sessionStorage.setItem('shortCode', linkId);

      // ✅ Create a full-screen iframe to GitHub ad page
      const adUrl = `https://krisshdas.github.io/Linksterror/ad1.html?original=${encodeURIComponent(originalUrl)}&code=${encodeURIComponent(linkId)}`;

      loadingText.textContent = "Loading advertisement...";
      setTimeout(() => {
        // Replace current page content with iframe
        document.body.innerHTML = `
          <iframe src="${adUrl}" style="width:100%;height:100vh;border:none;"></iframe>
        `;
        document.title = "Advertisement - Linksterror";
      }, 1500);
    } else {
      loadingText.textContent = "Invalid or expired short link.";
    }
  }).catch(error => {
    console.error(error);
    loadingText.textContent = "Error loading link data.";
  });
}
