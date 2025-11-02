<script type="module">
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

  const urlParams = new URLSearchParams(window.location.search);
  const linkId = urlParams.get("id");

  if (!linkId) {
    document.body.innerHTML = "<h3>No link ID provided!</h3>";
    throw new Error("Missing link id");
  }

  const globalRef = ref(db, "links/" + linkId);

  get(globalRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();

      if (!data.owner || !data.originalUrl) {
        document.body.innerHTML = "<h3>Invalid link data.</h3>";
        return;
      }

      // 🔥 Save locally for ad1.html
      sessionStorage.setItem("userId", data.owner);
      sessionStorage.setItem("originalUrl", data.originalUrl);

      // ✅ Safer: also include UID + URL in query string for fallback
      const adPageUrl = `ad1.html?uid=${encodeURIComponent(data.owner)}&target=${encodeURIComponent(data.originalUrl)}`;
      window.location.href = adPageUrl;
    } else {
      document.body.innerHTML = "<h3>Invalid or expired link.</h3>";
    }
  }).catch(err => {
    console.error(err);
    document.body.innerHTML = "<h3>Error fetching link.</h3>";
  });
</script>
