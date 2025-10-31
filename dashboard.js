// Firebase configuration
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
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const profileIcon = document.getElementById('profileIcon');
const profileDropdown = document.getElementById('profileDropdown');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNav = document.getElementById('mobileNav');
const adminBadge = document.getElementById('adminBadge');
const userName = document.getElementById('userName');
const longUrlInput = document.getElementById('longUrl');
const shortenBtn = document.getElementById('shortenBtn');
const resultContainer = document.getElementById('resultContainer');
const shortUrlInput = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const newLinkBtn = document.getElementById('newLinkBtn');
const customDomain = document.getElementById('customDomain');
const customAlias = document.getElementById('customAlias');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const recentLinksTable = document.getElementById('recentLinksTable');
const logoutBtn = document.getElementById('logoutBtn');

// Analytics Elements
const totalLinksEl = document.getElementById('totalLinks');
const totalClicksEl = document.getElementById('totalClicks');
const clickRateEl = document.getElementById('clickRate');
const adViewsEl = document.getElementById('adViews');

// Chart
let clickChart;

// Admin emails
const adminEmails = ['dask20080@gmail.com', 'daskris20080@gmail.com'];

// Check if user is logged in
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loadUserData(user);
        loadRecentLinks();
        initAnalyticsChart();
        updateAnalytics();
    } else {
        // User is signed out, redirect to login page
        window.location.href = 'login.html';
    }
});

// Mobile menu toggle
mobileMenuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
});

// Profile dropdown toggle
profileIcon.addEventListener('click', () => {
    profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
    
    // Close mobile menu when clicking outside
    if (!mobileMenuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('active');
    }
});

// Load user data
function loadUserData(user) {
    const userEmail = user.email;
    
    // Set user name
    userName.textContent = user.displayName || userEmail.split('@')[0];
    
    // Check if user is admin
    if (adminEmails.includes(userEmail)) {
        adminBadge.style.display = 'block';
    }
    
    // Load additional user data from Firebase
    database.ref(`users/${user.uid}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (userData && userData.displayName) {
                userName.textContent = userData.displayName;
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
        });
}

// Shorten link functionality
shortenBtn.addEventListener('click', shortenLink);
longUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        shortenLink();
    }
});

function shortenLink() {
    const longUrl = longUrlInput.value.trim();
    
    if (!longUrl) {
        showToast('Please enter a URL');
        return;
    }
    
    // Validate URL
    if (!isValidUrl(longUrl)) {
        showToast('Please enter a valid URL');
        return;
    }
    
    // Generate short code
    let shortCode = customAlias.value.trim();
    if (!shortCode) {
        shortCode = generateShortCode();
    }
    
    // Create short URL - Updated to match redirect.js structure
    const domain = customDomain.value;
    const shortUrl = `https://${domain}/Linksterror/redirect.html?code=${shortCode}`;
    
    // Save to Firebase - Updated to match redirect.js structure
    const userId = auth.currentUser.uid;
    const linkData = {
        originalUrl: longUrl, // Changed from longUrl to originalUrl to match redirect.js
        shortCode: shortCode,
        shortUrl: shortUrl,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        clicks: 0
    };
    
    database.ref(`users/${userId}/links/${shortCode}`).set(linkData)
        .then(() => {
            // Show result
            shortUrlInput.value = shortUrl;
            resultContainer.style.display = 'block';
            
            // Reset form
            longUrlInput.value = '';
            customAlias.value = '';
            
            // Update analytics
            updateAnalytics();
            
            // Reload recent links
            loadRecentLinks();
            
            showToast('Link shortened successfully!');
        })
        .catch(error => {
            console.error('Error shortening link:', error);
            showToast('Error shortening link. Please try again.');
        });
}

// Copy to clipboard
copyBtn.addEventListener('click', () => {
    shortUrlInput.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard!');
});

// Create new link
newLinkBtn.addEventListener('click', () => {
    resultContainer.style.display = 'none';
    longUrlInput.focus();
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch(error => {
            console.error('Error signing out:', error);
            showToast('Error signing out. Please try again.');
        });
});

// Load recent links
function loadRecentLinks() {
    const userId = auth.currentUser.uid;
    database.ref(`users/${userId}/links`).orderByChild('createdAt').limitToLast(5).once('value')
        .then(snapshot => {
            recentLinksTable.innerHTML = '';
            
            if (!snapshot.exists()) {
                recentLinksTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No links created yet</td></tr>';
                return;
            }
            
            const links = [];
            snapshot.forEach(childSnapshot => {
                links.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Reverse to show newest first
            links.reverse();
            
            links.forEach(link => {
                const row = document.createElement('tr');
                
                const shortLinkCell = document.createElement('td');
                shortLinkCell.innerHTML = `<a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a>`;
                
                const originalUrlCell = document.createElement('td');
                originalUrlCell.textContent = truncateUrl(link.originalUrl, 40); // Updated to use originalUrl
                
                const clicksCell = document.createElement('td');
                clicksCell.textContent = link.clicks || 0;
                
                const createdCell = document.createElement('td');
                const date = new Date(link.createdAt);
                createdCell.textContent = date.toLocaleDateString();
                
                const actionsCell = document.createElement('td');
                actionsCell.className = 'action-btns';
                
                const viewBtn = document.createElement('button');
                viewBtn.className = 'action-btn';
                viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
                viewBtn.title = 'View';
                viewBtn.addEventListener('click', () => {
                    window.open(link.shortUrl, '_blank');
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this link?')) {
                        deleteLink(link.id);
                    }
                });
                
                actionsCell.appendChild(viewBtn);
                actionsCell.appendChild(deleteBtn);
                
                row.appendChild(shortLinkCell);
                row.appendChild(originalUrlCell);
                row.appendChild(clicksCell);
                row.appendChild(createdCell);
                row.appendChild(actionsCell);
                
                recentLinksTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading recent links:', error);
            recentLinksTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">Error loading links</td></tr>';
        });
}

// Delete link
function deleteLink(linkId) {
    const userId = auth.currentUser.uid;
    database.ref(`users/${userId}/links/${linkId}`).remove()
        .then(() => {
            showToast('Link deleted successfully');
            loadRecentLinks();
            updateAnalytics();
        })
        .catch(error => {
            console.error('Error deleting link:', error);
            showToast('Error deleting link. Please try again.');
        });
}

// Update analytics
function updateAnalytics() {
    const userId = auth.currentUser.uid;
    database.ref(`users/${userId}/links`).once('value')
        .then(snapshot => {
            let totalLinks = 0;
            let totalClicks = 0;
            
            snapshot.forEach(childSnapshot => {
                totalLinks++;
                totalClicks += childSnapshot.val().clicks || 0;
            });
            
            totalLinksEl.textContent = totalLinks;
            totalClicksEl.textContent = totalClicks;
            
            const clickRate = totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 100) : 0;
            clickRateEl.textContent = `${clickRate}%`;
            
            // Update chart
            if (clickChart) {
                updateChart();
            }
        })
        .catch(error => {
            console.error('Error updating analytics:', error);
        });
    
    // Get ad views (placeholder)
    database.ref(`users/${userId}/adViews`).once('value')
        .then(snapshot => {
            const adViews = snapshot.val() || 0;
            adViewsEl.textContent = adViews;
        })
        .catch(error => {
            console.error('Error getting ad views:', error);
            adViewsEl.textContent = '0';
        });
}

// Initialize analytics chart
function initAnalyticsChart() {
    const ctx = document.getElementById('clickChart').getContext('2d');
    
    clickChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLast7Days(),
            datasets: [{
                label: 'Clicks',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 107, 157, 0.1)',
                borderColor: 'rgba(255, 107, 157, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Clicks: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    updateChart();
}

// Update chart with data
function updateChart() {
    const userId = auth.currentUser.uid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const promises = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        promises.push(
            database.ref(`users/${userId}/dailyClicks/${dateStr}`).once('value')
                .then(snapshot => snapshot.val() || 0)
        );
    }
    
    Promise.all(promises)
        .then(data => {
            clickChart.data.datasets[0].data = data;
            clickChart.update();
        })
        .catch(error => {
            console.error('Error updating chart:', error);
        });
}

// Get last 7 days
function getLast7Days() {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    return days;
}

// Generate short code
function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

// Validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Truncate URL
function truncateUrl(url, maxLength) {
    if (url.length <= maxLength) {
        return url;
    }
    
    return url.substring(0, maxLength) + '...';
}

// Show toast notification
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Track clicks for analytics
function trackClick(shortCode) {
    const userId = auth.currentUser.uid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString().split('T')[0];
    
    // Update link click count
    database.ref(`users/${userId}/links/${shortCode}/clicks`).transaction(currentClicks => {
        return (currentClicks || 0) + 1;
    });
    
    // Update daily clicks
    database.ref(`users/${userId}/dailyClicks/${dateStr}`).transaction(currentClicks => {
        return (currentClicks || 0) + 1;
    });
}
