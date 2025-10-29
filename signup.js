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
const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const termsCheckbox = document.getElementById('terms');
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

// Toggle confirm password visibility
toggleConfirmPasswordBtn.addEventListener('click', () => {
    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPasswordInput.setAttribute('type', type);
    
    // Change icon
    const icon = toggleConfirmPasswordBtn.querySelector('i');
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

// Validate password strength
function validatePassword(password) {
    // At least 6 characters
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    
    // Check for at least one number
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number.' };
    }
    
    return { valid: true };
}

// Handle signup form submission
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate terms checkbox
    if (!termsCheckbox.checked) {
        showNotification('Please accept the terms of service and privacy policy.', 'error');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return;
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        showNotification(passwordValidation.message, 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = signupForm.querySelector('.btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    // Create user with Firebase
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Update user profile with name
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Account created successfully
            showNotification('Account created successfully! Redirecting...', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        })
        .catch((error) => {
            // Handle errors
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already in use. Please use a different email or log in.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection and try again.';
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