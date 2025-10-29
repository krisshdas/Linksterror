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
const profileIcon = document.getElementById('profileIcon');
const profileMenu = document.getElementById('profileMenu');
const logoutBtn = document.getElementById('logoutBtn');
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');
const longUrlInput = document.getElementById('longUrl');
const shortenBtn = document.getElementById('shortenBtn');
const resultContainer = document.getElementById('resultContainer');
const shortUrlInput = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.querySelector('.notification-message');
const notificationIcon = document.querySelector('.notification-icon');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const adminBadge = document.getElementById('adminBadge');
const adsMenuItem = document.getElementById('adsMenuItem');

// User data
let currentUser = null;
let isAdmin = false;

// Check if user is logged in
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = user;
        userName.textContent = user.displayName || 'User';
        userEmail.textContent = user.email;
        
        // Check if user is admin (hardcoded for dask20080@gmail.com)
        if (user.email === 'dask20080@gmail.com') {
            isAdmin = true;
            adminBadge.style.display = 'flex';
            adsMenuItem.style.display = 'flex';
            
            // Add admin to database if not already there
            try {
                await database.ref('admins/' + user.uid).set(true);
            } catch (err) {
                console.log('Admin already exists or error adding:', err);
            }
        }
        
        // Initialize user data structure if it doesn't exist
        await initializeUserData();
        
        // Load user data
        loadUserData();
        
        // Clean expired links
        cleanExpiredLinks();
    }
});

// Initialize user data structure
async function initializeUserData() {
    try {
        const userRef = database.ref('users/' + currentUser.uid);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // Create user structure if it doesn't exist
            await userRef.set({
                email: currentUser.email,
                displayName: currentUser.displayName || 'User',
                createdAt: new Date().toISOString(),
                links: {}
            });
            console.log('User data structure created');
        }
    } catch (error) {
        console.error('Error initializing user data:', error);
    }
}

// Clean expired links
async function cleanExpiredLinks() {
    try {
        const now = new Date().getTime();
        const fortyFiveDaysInMs = 45 * 24 * 60 * 60 * 1000;
        
        const snapshot = await database.ref('users/' + currentUser.uid + '/links').once('value');
        const links = snapshot.val() || {};
        
        const deletePromises = [];
        
        Object.keys(links).forEach(linkId => {
            const link = links[linkId];
            const expirationDate = link.expirationDate || 0;
            
            if (expirationDate < now) {
                // Link is expired, delete it
                deletePromises.push(
                    database.ref('users/' + currentUser.uid + '/links/' + linkId).remove()
                );
            }
        });
        
        await Promise.all(deletePromises);
        if (deletePromises.length > 0) {
            console.log(`Cleaned ${deletePromises.length} expired links`);
        }
    } catch (error) {
        console.error('Error cleaning expired links:', error);
    }
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref('users/' + currentUser.uid + '/links').once('value');
        const links = snapshot.val() || {};
        
        const linksArray = Object.keys(links).map(key => ({
            id: key,
            ...links[key]
        })).filter(link => {
            // Filter out expired links
            const now = new Date().getTime();
            return (link.expirationDate || 0) > now;
        });
        
        // Update stats
        document.getElementById('totalLinks').textContent = linksArray.length;
        
        const totalClicks = linksArray.reduce((sum, link) => sum + (link.clicks || 0), 0);
        document.getElementById('totalClicks').textContent = totalClicks;
        
        const clickRate = linksArray.length > 0 ? 
            Math.round((totalClicks / linksArray.length) * 10) / 10 : 0;
        document.getElementById('clickRate').textContent = clickRate + '%';
        
        document.getElementById('todayClicks').textContent = Math.floor(totalClicks * 0.2);
        document.getElementById('weekClicks').textContent = Math.floor(totalClicks * 0.5);
        document.getElementById('monthClicks').textContent = Math.floor(totalClicks * 0.8);
        document.getElementById('allTimeClicks').textContent = totalClicks;
        
        // Populate tables
        populateLinksTable(linksArray);
        populateTopLinks(linksArray);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        
        // Show specific error message
        let errorMessage = 'Error loading data';
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage = 'Permission denied. Please refresh the page.';
        } else if (error.message) {
            errorMessage = 'Network error. Please check your connection.';
        }
        
        showNotification(errorMessage, 'error');
        
        // Set default values
        document.getElementById('totalLinks').textContent = '0';
        document.getElementById('totalClicks').textContent = '0';
        document.getElementById('clickRate').textContent = '0%';
        document.getElementById('todayClicks').textContent = '0';
        document.getElementById('weekClicks').textContent = '0';
        document.getElementById('monthClicks').textContent = '0';
        document.getElementById('allTimeClicks').textContent = '0';
        
        // Show empty tables
        populateLinksTable([]);
        populateTopLinks([]);
    }
}

// Populate links table
function populateLinksTable(links) {
    const tableBody = document.getElementById('linksTableBody');
    tableBody.innerHTML = '';
    
    if (links.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No links found</td></tr>';
        return;
    }
    
    links.forEach(link => {
        const row = document.createElement('tr');
        
        const originalUrl = document.createElement('td');
        originalUrl.textContent = link.originalUrl.length > 30 ? 
            link.originalUrl.substring(0, 30) + '...' : link.originalUrl;
        originalUrl.title = link.originalUrl;
        
        const shortUrl = document.createElement('td');
        const shortUrlLink = document.createElement('a');
        shortUrlLink.href = '#';
        shortUrlLink.textContent = window.location.origin + '/redirect.html/' + link.shortCode;
        shortUrlLink.addEventListener('click', (e) => {
            e.preventDefault();
            copyToClipboard(window.location.origin + '/redirect.html/' + link.shortCode);
        });
        shortUrl.appendChild(shortUrlLink);
        
        const clicks = document.createElement('td');
        clicks.textContent = link.clicks || 0;
        
        const created = document.createElement('td');
        created.textContent = new Date(link.createdAt).toLocaleDateString();
        
        const expires = document.createElement('td');
        const expirationDate = new Date(link.expirationDate);
        const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
        expires.textContent = daysLeft + ' days';
        expires.style.color = daysLeft < 7 ? '#dc3545' : '#6c757d';
        
        const actions = document.createElement('td');
        actions.style.display = 'flex';
        actions.style.gap = '5px';
        
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'edit-btn';
        editBtn.addEventListener('click', () => editLink(link.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => deleteLink(link.id));
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        row.appendChild(originalUrl);
        row.appendChild(shortUrl);
        row.appendChild(clicks);
        row.appendChild(created);
        row.appendChild(expires);
        row.appendChild(actions);
        
        tableBody.appendChild(row);
    });
}

// Populate top links
function populateTopLinks(links) {
    const topLinksList = document.getElementById('topLinksList');
    topLinksList.innerHTML = '';
    
    if (links.length === 0) {
        topLinksList.innerHTML = '<p>No links found</p>';
        return;
    }
    
    const sortedLinks = [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    const top5 = sortedLinks.slice(0, 5);
    
    top5.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'top-link-item';
        
        const url = document.createElement('div');
        url.className = 'top-link-url';
        url.textContent = link.originalUrl.length > 40 ? 
            link.originalUrl.substring(0, 40) + '...' : link.originalUrl;
        url.title = link.originalUrl;
        
        const clicks = document.createElement('div');
        clicks.className = 'top-link-clicks';
        clicks.textContent = (link.clicks || 0) + ' clicks';
        
        linkItem.appendChild(url);
        linkItem.appendChild(clicks);
        topLinksList.appendChild(linkItem);
    });
}

// Edit link
async function editLink(linkId) {
    try {
        const snapshot = await database.ref('users/' + currentUser.uid + '/links/' + linkId).once('value');
        const link = snapshot.val();
        
        if (link) {
            const newUrl = prompt('Edit URL:', link.originalUrl);
            if (newUrl && newUrl.trim()) {
                try {
                    new URL(newUrl.trim());
                    
                    // Update link and reset expiration
                    const updatedLink = {
                        ...link,
                        originalUrl: newUrl.trim(),
                        expirationDate: new Date().getTime() + (45 * 24 * 60 * 60 * 1000), // Reset to 45 days
                        lastModified: new Date().toISOString()
                    };
                    
                    await database.ref('users/' + currentUser.uid + '/links/' + linkId).update(updatedLink);
                    showNotification('Link updated successfully', 'success');
                    loadUserData();
                } catch (e) {
                    showNotification('Please enter a valid URL', 'error');
                }
            }
        }
    } catch (error) {
        console.error('Error editing link:', error);
        showNotification('Failed to edit link', 'error');
    }
}

// Delete link
async function deleteLink(linkId) {
    if (confirm('Are you sure you want to delete this link?')) {
        try {
            await database.ref('users/' + currentUser.uid + '/links/' + linkId).remove();
            showNotification('Link deleted successfully', 'success');
            loadUserData();
        } catch (error) {
            console.error('Error deleting link:', error);
            showNotification('Failed to delete link', 'error');
        }
    }
}

// Toggle profile menu
profileIcon.addEventListener('click', () => {
    profileMenu.classList.toggle('active');
});

// Close profile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.remove('active');
    }
});

// Handle menu item clicks
menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (item.classList.contains('logout')) {
            auth.signOut()
                .then(() => {
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error('Error signing out:', error);
                    showNotification('Failed to sign out', 'error');
                });
            return;
        }
        
        if (item.id === 'adsMenuItem') {
            window.location.href = 'ads.html';
            return;
        }
        
        const pageName = item.getAttribute('data-page');
        if (pageName) {
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(page => page.style.display = 'none');
            document.getElementById(pageName + 'Page').style.display = 'block';
            
            profileMenu.classList.remove('active');
        }
    });
});

// Handle shorten button click
shortenBtn.addEventListener('click', shortenUrl);

longUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        shortenUrl();
    }
});

// Shorten URL function
async function shortenUrl() {
    const longUrl = longUrlInput.value.trim();
    
    if (!longUrl) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    try {
        new URL(longUrl);
    } catch (e) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    const shortCode = generateShortCode();
    
    shortenBtn.textContent = 'Shortening...';
    shortenBtn.disabled = true;
    
    try {
        // Calculate expiration date (45 days from now)
        const expirationDate = new Date().getTime() + (45 * 24 * 60 * 60 * 1000);
        
        const linkData = {
            originalUrl: longUrl,
            shortCode: shortCode,
            createdAt: new Date().toISOString(),
            expirationDate: expirationDate,
            clicks: 0
        };
        
        const snapshot = await database.ref('users/' + currentUser.uid + '/links').push(linkData);
        const shortUrl = 'https://krisshdas.github.io/Linksterror/redirect.html?code=' + shortCode;
        shortUrlInput.value = shortUrl;
        resultContainer.style.display = 'block';
        longUrlInput.value = '';
        
        showNotification('Link shortened successfully (expires in 45 days)', 'success');
        loadUserData();
    } catch (error) {
        console.error('Error shortening URL:', error);
        let errorMessage = 'Failed to shorten URL';
        
        if (error.code === 'PERMISSION_DENIED') {
            errorMessage = 'Permission denied. Please check your database rules.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        shortenBtn.textContent = 'Shorten';
        shortenBtn.disabled = false;
    }
}

// Generate short code
function generateShortCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Copy to clipboard
copyBtn.addEventListener('click', () => {
    copyToClipboard(shortUrlInput.value);
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showNotification('Copied to clipboard', 'success');
        })
        .catch((error) => {
            console.error('Error copying to clipboard:', error);
            showNotification('Failed to copy to clipboard', 'error');
        });
}

// Show notification
function showNotification(message, type) {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    
    if (type === 'success') {
        notificationIcon.className = 'notification-icon fas fa-check-circle';
    } else if (type === 'error') {
        notificationIcon.className = 'notification-icon fas fa-exclamation-circle';
    }
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}