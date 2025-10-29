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

// DOM elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const notification = document.getElementById('notification');
const notificationMessage = document.querySelector('.notification-message');
const notificationIcon = document.querySelector('.notification-icon');

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Change icon
    const icon = togglePasswordBtn.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
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

// Handle login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Show loading state
    const submitBtn = loginForm.querySelector('.btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    // Sign in with Firebase
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully
            showNotification('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        })
        .catch((error) => {
            // Handle errors
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Please try again later.';
            }
            
            showNotification(errorMessage, 'error');
            
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
});