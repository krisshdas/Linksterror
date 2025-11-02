<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
  import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

  // 🔍 Get link ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const linkId = urlParams.get("id");

  if (!linkId) {
    document.body.innerHTML = "<h3>No link ID provided!</h3>";
    throw new Error("No link ID found in URL");
  }

  // 🔎 Load link info from Firebase
  const globalRef = ref(db, `links/${linkId}`);
  get(globalRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const linkData = snapshot.val();

        // ✅ Save user-specific data to sessionStorage
        sessionStorage.setItem("userId", linkData.owner);
        sessionStorage.setItem("originalUrl", linkData.originalUrl);

        console.log("Redirecting to ad1.html for user:", linkData.owner);

        // ✅ Redirect to ad page
        window.location.href = "ad1.html";
      } else {
        document.body.innerHTML = "<h3>Invalid or expired link.</h3>";
      }
    })
    .catch((err) => {
      console.error("Error fetching link:", err);
      document.body.innerHTML = "<h3>Error loading link data.</h3>";
    });
</script>
