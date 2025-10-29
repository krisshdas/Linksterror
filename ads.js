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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const saveBtn = document.getElementById('saveBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.querySelector('.notification-message');
const notificationIcon = document.querySelector('.notification-icon');

// Check if user is logged in and is admin
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else if (user.email !== 'dask20080@gmail.com') {
        window.location.href = 'dashboard.html';
    } else {
        // Load ad configuration
        loadAdConfiguration();
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

// Load ad configuration
function loadAdConfiguration() {
    database.ref('ads/config').once('value')
        .then((snapshot) => {
            const adConfig = snapshot.val() || {};
            
            // Load configuration for each ad page
            for (let i = 1; i <= 5; i++) {
                const adPage = adConfig[`ad${i}`] || {};
                
                // Set values for each ad position
                document.getElementById(`ad${i}-header`).value = adPage.header || '';
                document.getElementById(`ad${i}-side1`).value = adPage.side1 || '';
                document.getElementById(`ad${i}-side2`).value = adPage.side2 || '';
                document.getElementById(`ad${i}-bottom`).value = adPage.bottom || '';
                document.getElementById(`ad${i}-popup`).value = adPage.popup || '';
            }
        })
        .catch((error) => {
            console.error('Error loading ad configuration:', error);
            showNotification('Error loading ad configuration', 'error');
        });
}

// Save ad configuration
saveBtn.addEventListener('click', () => {
    const adConfig = {};
    
    // Collect configuration for each ad page
    for (let i = 1; i <= 5; i++) {
        adConfig[`ad${i}`] = {
            header: document.getElementById(`ad${i}-header`).value,
            side1: document.getElementById(`ad${i}-side1`).value,
            side2: document.getElementById(`ad${i}-side2`).value,
            bottom: document.getElementById(`ad${i}-bottom`).value,
            popup: document.getElementById(`ad${i}-popup`).value
        };
    }
    
    // Save to Firebase
    database.ref('ads/config').set(adConfig)
        .then(() => {
            showNotification('Ad configuration saved successfully', 'success');
        })
        .catch((error) => {
            console.error('Error saving ad configuration:', error);
            showNotification('Failed to save ad configuration', 'error');
        });
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