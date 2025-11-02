<script type="text/javascript">
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

    // Initialize Firebase only if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const database = firebase.database();

    // Function to load personalized ad configuration
    function loadPersonalizedAd() {
        // Get user ID from session storage (set in redirect.js)
        const userId = sessionStorage.getItem('userId');
        const linkId = sessionStorage.getItem('linkId');
        
        if (userId && linkId) {
            // Fetch personalized ad configuration from Firebase
            database.ref(`users/${userId}/ads/config/${linkId}`).once('value')
                .then((snapshot) => {
                    const adConfig = snapshot.val();
                    if (adConfig && adConfig.adKey) {
                        // Use personalized ad configuration if available
                        displayPersonalizedAd(adConfig);
                    } else {
                        // Fall back to default ad
                        displayDefaultAd();
                    }
                })
                .catch((error) => {
                    console.error('Error loading personalized ad:', error);
                    // Fall back to default ad on error
                    displayDefaultAd();
                });
        } else {
            // Fall back to default ad if user ID or link ID is not available
            displayDefaultAd();
        }
    }

    // Function to display personalized ad
    function displayPersonalizedAd(adConfig) {
        // Create a container for the ad
        const adContainer = document.createElement('div');
        adContainer.id = 'personalized-ad-container';
        document.body.appendChild(adContainer);

        // Set personalized ad options
        const personalizedAtOptions = {
            'key': adConfig.adKey || 'f0fcf291e1d265a945dbd45c1674505d',
            'format': adConfig.format || 'iframe',
            'height': adConfig.height || 250,
            'width': adConfig.width || 300,
            'params': adConfig.params || {}
        };

        // Create and append the personalized ad script
        const adScript = document.createElement('script');
        adScript.type = 'text/javascript';
        adScript.text = `
            atOptions = ${JSON.stringify(personalizedAtOptions)};
        `;
        adContainer.appendChild(adScript);

        // Create and append the ad invoke script
        const invokeScript = document.createElement('script');
        invokeScript.type = 'text/javascript';
        invokeScript.src = `//www.highperformanceformat.com/${personalizedAtOptions.key}/invoke.js`;
        adContainer.appendChild(invokeScript);

        console.log('Personalized ad loaded with key:', personalizedAtOptions.key);
    }

    // Function to display default ad
    function displayDefaultAd() {
        // Create a container for the ad
        const adContainer = document.createElement('div');
        adContainer.id = 'default-ad-container';
        document.body.appendChild(adContainer);

        // Set default ad options (your original configuration)
        const defaultAtOptions = {
            'key': 'f0fcf291e1d265a945dbd45c1674505d',
            'format': 'iframe',
            'height': 250,
            'width': 300,
            'params': {}
        };

        // Create and append the default ad script
        const adScript = document.createElement('script');
        adScript.type = 'text/javascript';
        adScript.text = `
            atOptions = ${JSON.stringify(defaultAtOptions)};
        `;
        adContainer.appendChild(adScript);

        // Create and append the ad invoke script
        const invokeScript = document.createElement('script');
        invokeScript.type = 'text/javascript';
        invokeScript.src = `//www.highperformanceformat.com/${defaultAtOptions.key}/invoke.js`;
        adContainer.appendChild(invokeScript);

        console.log('Default ad loaded');
    }

    // Load the appropriate ad when the page loads
    window.addEventListener('DOMContentLoaded', loadPersonalizedAd);
</script>
