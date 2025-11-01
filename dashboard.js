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

// Check if Firebase is already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

// Admins
const adminEmails = ["dask20080@gmail.com", "daskris20080@gmail.com"];

// Check if user is logged in
auth.onAuthStateChanged((user) => {
  if (!user) {
    // User is not logged in, redirect to login page
    window.location.href = "login.html";
  } else {
    // User is logged in, set current user
    window.currentUser = {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      uid: user.uid
    };
    
    console.log('Current user logged in:', window.currentUser);
    
    // Initialize the dashboard with the logged-in user
    initializeDashboard();
  }
});

// Initialize dashboard function
function initializeDashboard() {
  // UI elements
  const profileIcon = document.getElementById("profileIcon");
  const profilePopup = document.getElementById("profilePopup");
  const adminCrown = document.getElementById("adminCrown");
  const userName = document.getElementById("userName");
  const shortenBtn = document.getElementById("shortenBtn");
  const originalUrlInput = document.getElementById("originalUrl");
  const shortenedLinkDiv = document.getElementById("shortenedLink");
  const linksBody = document.getElementById("linksBody");
  const logoutBtn = document.getElementById("logoutBtn");
  const editModal = document.getElementById("editModal");
  const closeModal = document.getElementById("closeModal");
  const cancelEdit = document.getElementById("cancelEdit");
  const saveEdit = document.getElementById("saveEdit");
  const editOriginalUrl = document.getElementById("editOriginalUrl");
  const editCustomId = document.getElementById("editCustomId");
  const editExpiry = document.getElementById("editExpiry");
  const loadingOverlay = document.getElementById("loadingOverlay");

  // Stats elements
  const totalLinksEl = document.getElementById("totalLinks");
  const totalClicksEl = document.getElementById("totalClicks");
  const activeLinksEl = document.getElementById("activeLinks");

  // Filter buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  let currentFilter = "all";

  // Current editing link
  let currentEditingLink = null;

  // Show crown if admin
  if (adminEmails.includes(window.currentUser.email)) {
    adminCrown.classList.remove("hidden");
  }

  // Show username
  userName.textContent = window.currentUser.name;

  // Profile popup toggle
  profileIcon.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent event bubbling
    profilePopup.classList.toggle("hidden");
  });

  // Close profile popup when clicking outside
  document.addEventListener("click", (e) => {
    if (!profileIcon.contains(e.target) && !profilePopup.contains(e.target)) {
      profilePopup.classList.add("hidden");
    }
  });

  // Prevent popup from closing when clicking inside it
  profilePopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Logout functionality
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Are you sure you want to logout?")) {
      // Show loading overlay
      loadingOverlay.classList.remove("hidden");
      
      // Sign out from Firebase Auth
      auth.signOut().then(() => {
        // Clear any local storage or session data
        localStorage.clear();
        sessionStorage.clear();
        
        // Show success message
        showToast("Logged out successfully!");
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1000);
      }).catch((error) => {
        // Hide loading overlay
        loadingOverlay.classList.add("hidden");
        
        // Show error message
        showToast("Failed to logout. Please try again.");
        console.error("Logout error:", error);
      });
    }
  });

  // Shorten link
  shortenBtn.addEventListener("click", async () => {
    const originalUrl = originalUrlInput.value.trim();
    if (!originalUrl) {
      showToast("Please enter a valid URL.");
      return;
    }
    
    // Validate URL
    try {
      new URL(originalUrl);
    } catch (e) {
      showToast("Please enter a valid URL with http:// or https://");
      return;
    }

    const linkId = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now();
    const expiry = timestamp + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Save link with user's ID
    const linkData = {
      originalUrl,
      createdBy: window.currentUser.email,
      createdById: window.currentUser.uid, // This is crucial for ad separation
      createdAt: timestamp,
      expiry,
      clicks: 0
    };
    
    console.log('Creating link with data:', linkData);
    
    await db.ref("links/" + linkId).set(linkData);

    const shortUrl = `https://krisshdas.github.io/Linksterror/redirect.html?id=${linkId}`;
    shortenedLinkDiv.innerHTML = `
      <div class="result-content">
        <p>Your shortened link:</p>
        <a href="${shortUrl}" target="_blank">${shortUrl}</a>
        <button class="copy-btn action-btn" onclick="copyToClipboard('${shortUrl}')">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    `;

    originalUrlInput.value = "";
    loadLinks();
    updateStats();
    showToast("Link created successfully!");
  });

  // Copy to clipboard function
  window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Link copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy link.");
    });
  };

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      loadLinks();
    });
  });

  // Load user/admin links
  function loadLinks() {
    db.ref("links").once("value", (snapshot) => {
      linksBody.innerHTML = "";
      const now = Date.now();
      let totalLinks = 0;
      let totalClicks = 0;
      let activeLinks = 0;
      
      snapshot.forEach((child) => {
        const data = child.val();
        const id = child.key;
        const shortUrl = `https://krisshdas.github.io/Linksterror/redirect.html?id=${id}`;
        const expireDate = new Date(data.expiry).toLocaleDateString();
        const isExpired = data.expiry < now;
        const canView =
          data.createdBy === window.currentUser.email ||
          adminEmails.includes(window.currentUser.email);
        
        // Update stats
        if (canView) {
          totalLinks++;
          totalClicks += data.clicks || 0;
          if (!isExpired) activeLinks++;
        }

        // Apply filter
        if (currentFilter === "active" && isExpired) return;
        if (currentFilter === "expired" && !isExpired) return;

        if (canView) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>
              <a href="${shortUrl}" target="_blank">${id}</a>
              <button class="copy-btn action-btn" onclick="copyToClipboard('${shortUrl}')" title="Copy">
                <i class="fas fa-copy"></i>
              </button>
            </td>
            <td>${data.originalUrl.length > 30 ? data.originalUrl.substring(0, 30) + "..." : data.originalUrl}</td>
            <td>${data.clicks || 0}</td>
            <td class="${isExpired ? 'expired' : ''}">${expireDate}</td>
            <td>
              <button class="edit-btn action-btn" onclick="editLink('${id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              ${
                data.createdBy === window.currentUser.email || adminEmails.includes(window.currentUser.email)
                  ? `<button class="delete-btn action-btn" onclick="deleteLink('${id}')" title="Delete">
                       <i class="fas fa-trash"></i>
                     </button>`
                  : ""
              }
            </td>
          `;
          linksBody.appendChild(tr);
        }
      });
      
      // Update stats
      totalLinksEl.textContent = totalLinks;
      totalClicksEl.textContent = totalClicks;
      activeLinksEl.textContent = activeLinks;
    });
  }

  // Update stats separately
  function updateStats() {
    db.ref("links").once("value", (snapshot) => {
      const now = Date.now();
      let totalLinks = 0;
      let totalClicks = 0;
      let activeLinks = 0;
      
      snapshot.forEach((child) => {
        const data = child.val();
        const canView =
          data.createdBy === window.currentUser.email ||
          adminEmails.includes(window.currentUser.email);
        
        if (canView) {
          totalLinks++;
          totalClicks += data.clicks || 0;
          if (data.expiry > now) activeLinks++;
        }
      });
      
      totalLinksEl.textContent = totalLinks;
      totalClicksEl.textContent = totalClicks;
      activeLinksEl.textContent = activeLinks;
    });
  }

  // Delete link
  window.deleteLink = (id) => {
    if (confirm("Are you sure you want to delete this link?")) {
      db.ref("links/" + id).remove().then(() => {
        loadLinks();
        showToast("Link deleted successfully!");
      }).catch(error => {
        showToast("Failed to delete link.");
        console.error(error);
      });
    }
  };

  // Edit link
  window.editLink = (id) => {
    db.ref("links/" + id).once("value", (snapshot) => {
      const data = snapshot.val();
      const canEdit =
        data.createdBy === window.currentUser.email ||
        adminEmails.includes(window.currentUser.email);
      
      if (canEdit) {
        currentEditingLink = id;
        editOriginalUrl.value = data.originalUrl;
        editCustomId.value = ""; // Leave empty by default
        editExpiry.value = new Date(data.expiry).toISOString().split('T')[0];
        editModal.classList.remove("hidden");
      } else {
        showToast("You don't have permission to edit this link.");
      }
    });
  };

  // Close modal
  closeModal.addEventListener("click", () => {
    editModal.classList.add("hidden");
    currentEditingLink = null;
  });

  cancelEdit.addEventListener("click", () => {
    editModal.classList.add("hidden");
    currentEditingLink = null;
  });

  // Save edit
  saveEdit.addEventListener("click", async () => {
    if (!currentEditingLink) return;
    
    const newOriginalUrl = editOriginalUrl.value.trim();
    if (!newOriginalUrl) {
      showToast("Please enter a valid URL.");
      return;
    }
    
    // Validate URL
    try {
      new URL(newOriginalUrl);
    } catch (e) {
      showToast("Please enter a valid URL with http:// or https://");
      return;
    }
    
    const newCustomId = editCustomId.value.trim();
    const newExpiry = new Date(editExpiry.value).getTime();
    
    // If custom ID is provided, check if it's already in use
    if (newCustomId && newCustomId !== currentEditingLink) {
      const snapshot = await db.ref("links/" + newCustomId).once("value");
      if (snapshot.exists()) {
        showToast("This custom ID is already in use.");
        return;
      }
      
      // Move the link to the new ID
      const data = (await db.ref("links/" + currentEditingLink).once("value")).val();
      await db.ref("links/" + newCustomId).set({
        ...data,
        originalUrl: newOriginalUrl,
        expiry: newExpiry
      });
      await db.ref("links/" + currentEditingLink).remove();
      currentEditingLink = newCustomId;
    } else {
      // Just update the existing link
      await db.ref("links/" + currentEditingLink).update({
        originalUrl: newOriginalUrl,
        expiry: newExpiry
      });
    }
    
    editModal.classList.add("hidden");
    currentEditingLink = null;
    loadLinks();
    showToast("Link updated successfully!");
  });

  // Show toast notification
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }

  // Initial load
  loadLinks();
}

// Make sure we have a fallback for when the page loads without Firebase auth
// This handles the case where the auth state doesn't change immediately
window.addEventListener('load', () => {
  // If auth hasn't initialized in 2 seconds, check if we have a user
  setTimeout(() => {
    if (!window.currentUser) {
      // Try to get the current user synchronously
      const user = auth.currentUser;
      if (user) {
        window.currentUser = {
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          uid: user.uid
        };
        initializeDashboard();
      } else {
        // No user found, redirect to login
        window.location.href = "login.html";
      }
    }
  }, 2000);
});
