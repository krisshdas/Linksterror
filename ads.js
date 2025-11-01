// Initialize Firebase
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

const auth = firebase.auth();
const database = firebase.database();

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.querySelector('.notification-message');
const notificationIcon = document.querySelector('.notification-icon');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const profileIcon = document.getElementById('profileIcon');
const profilePopup = document.getElementById('profilePopup');
const logoutBtn = document.getElementById('logoutBtn');

// Current user
let currentUser = null;

// Check if user is logged in
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = {
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            uid: user.uid
        };
        
        // Update UI with user info
        userName.textContent = currentUser.name;
        userEmail.textContent = currentUser.email;
        
        // Debug log
        console.log('Current user:', currentUser);
        
        // Load ad configuration
        loadAdConfiguration();
    }
});

// Profile popup toggle
profileIcon.addEventListener("click", (e) => {
    e.stopPropagation();
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
        auth.signOut().then(() => {
            localStorage.clear();
            sessionStorage.clear();
            showNotification("Logged out successfully!", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        }).catch((error) => {
            showNotification("Failed to logout. Please try again.", "error");
            console.error("Logout error:", error);
        });
    }
});

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab pane
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// Load ad configuration for the current user
function loadAdConfiguration() {
    if (!currentUser) return;
    
    // Use UID as primary path, with email as backup
    const userPath = currentUser.uid || currentUser.email.replace(/[.@]/g, '_');
    
    console.log('Loading ads for path:', userPath);
    
    database.ref(`users/${userPath}/ads/config`).once('value')
        .then((snapshot) => {
            const adConfig = snapshot.val() || {};
            console.log('Loaded ad config:', adConfig);
            
            // Load configuration for each ad page
            for (let i = 1; i <= 5; i++) {
                const adPage = adConfig[`ad${i}`] || {};
                
                // Set values for each ad position
                document.getElementById(`ad${i}-header`).value = adPage.header || '';
                document.getElementById(`ad${i}-side1`).value = adPage.side1 || '';
                document.getElementById(`ad${i}-side2`).value = adPage.side2 || '';
                document.getElementById(`ad${i}-side3`).value = adPage.side3 || '';
                document.getElementById(`ad${i}-side4`).value = adPage.side4 || '';
                document.getElementById(`ad${i}-bottom`).value = adPage.bottom || '';
                document.getElementById(`ad${i}-popup`).value = adPage.popup || '';
            }
        })
        .catch((error) => {
            console.error('Error loading ad configuration:', error);
            showNotification('Error loading ad configuration', 'error');
        });
}

// Save ad configuration for the current user
saveBtn.addEventListener('click', () => {
    if (!currentUser) return;
    
    const adConfig = {};
    
    // Collect configuration for each ad page
    for (let i = 1; i <= 5; i++) {
        adConfig[`ad${i}`] = {
            header: document.getElementById(`ad${i}-header`).value,
            side1: document.getElementById(`ad${i}-side1`).value,
            side2: document.getElementById(`ad${i}-side2`).value,
            side3: document.getElementById(`ad${i}-side3`).value,
            side4: document.getElementById(`ad${i}-side4`).value,
            bottom: document.getElementById(`ad${i}-bottom`).value,
            popup: document.getElementById(`ad${i}-popup`).value
        };
    }
    
    // Use UID as primary path, with email as backup
    const userPath = currentUser.uid || currentUser.email.replace(/[.@]/g, '_');
    
    console.log('Saving ads for path:', userPath);
    console.log('Ad config:', adConfig);
    
    // Save to Firebase under user's path
    database.ref(`users/${userPath}/ads/config`).set(adConfig)
        .then(() => {
            showNotification('Ad configuration saved successfully', 'success');
            console.log('Ads saved successfully');
        })
        .catch((error) => {
            console.error('Error saving ad configuration:', error);
            showNotification('Failed to save ad configuration', 'error');
        });
});

// Test ad pages
testBtn.addEventListener('click', () => {
    if (!currentUser) return;
    
    // Set test data in session storage
    sessionStorage.setItem('originalUrl', 'https://google.com');
    sessionStorage.setItem('shortCode', 'test123');
    sessionStorage.setItem('userId', currentUser.uid || currentUser.email.replace(/[.@]/g, '_'));
    
    // Open first ad page in new tab
    window.open('ad1.html', '_blank');
    
    showNotification('Test mode activated. Check the new tab.', 'success');
});

// Show notification
function showNotification(message, type) {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    
    // Set icon based on type
    if (type === 'success') {
        notificationIcon.className = 'notification-icon fas fa-check-circle';
    } else if (type === 'error') {
        notificationIcon.className = 'notification-icon fas fa-exclamation-circle';
    }
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
                                       }
