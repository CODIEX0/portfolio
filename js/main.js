document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameOverlay = document.getElementById('game-overlay');
    const launchGameButton = document.getElementById('launch-game-button');
    const closeGameButton = document.getElementById('close-game-button');
    const touchLeftButton = document.getElementById('touch-left');
    const touchRightButton = document.getElementById('touch-right');
    const touchFireButton = document.getElementById('touch-fire');
    const tryAgainButton = SpaceGame.getTryAgainButton(); // Get from game module

    // --- Initialization ---
    BackgroundAnimation.init(); // Start background animation

    // --- Section Visibility ---
    const sections = document.querySelectorAll('.section');
    const contentContainer = document.querySelector('.content-container');
    const observerOptions = { root: contentContainer, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOptions);
    sections.forEach(section => { observer.observe(section); });
    // Ensure hero is visible on load
    const heroSection = document.getElementById('hero');
    if (heroSection) heroSection.classList.add('visible');


    // --- Event Listeners ---

    // Launch Game
    launchGameButton.addEventListener('click', () => {
        console.log("Launch button clicked"); // Debug log
        gameOverlay.classList.add('active');
        document.body.classList.add('game-active');
        BackgroundAnimation.stop(); // Pause background
        SpaceGame.init(); // Initialize and start game
        window.addEventListener('resize', SpaceGame.resizeCanvas); // Add game resize listener
    });

    // Close Game
    closeGameButton.addEventListener('click', () => {
        console.log("Close button clicked"); // Debug log
        gameOverlay.classList.remove('active');
        document.body.classList.remove('game-active');
        SpaceGame.stop(); // Ensure game loop stops
        BackgroundAnimation.start(); // Resume background
        window.removeEventListener('resize', SpaceGame.resizeCanvas); // Remove game resize listener
    });

     // Try Again Button (Listener attached here)
     if (tryAgainButton) {
         tryAgainButton.addEventListener('click', () => {
             console.log("Try Again clicked");
             SpaceGame.init(); // Re-initialize the game
         });
         tryAgainButton.addEventListener('touchstart', (e) => {
             e.preventDefault();
             console.log("Try Again touched");
             SpaceGame.init();
         });
     } else {
         console.error("Try Again button not found!");
     }


    // Keyboard Input Routing
    window.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('game-active')) {
             if (e.key === ' ') e.preventDefault(); // Prevent space scroll only during game
             SpaceGame.setKeyState(e.key, true); // Update game's key state
             // Enter to restart handled internally by game now via Try Again button
        }
    });
    window.addEventListener('keyup', (e) => {
        if (document.body.classList.contains('game-active')) {
            SpaceGame.setKeyState(e.key, false); // Update game's key state
        }
    });

    // Touch Input Routing
    function handleTouch(event, key, isPressed) {
        event.preventDefault();
        SpaceGame.setKeyState(key, isPressed); // Update game's key state
    }
    touchLeftButton.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowLeft', true));
    touchLeftButton.addEventListener('touchend', (e) => handleTouch(e, 'ArrowLeft', false));
    touchLeftButton.addEventListener('contextmenu', (e) => e.preventDefault());

    touchRightButton.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowRight', true));
    touchRightButton.addEventListener('touchend', (e) => handleTouch(e, 'ArrowRight', false));
    touchRightButton.addEventListener('contextmenu', (e) => e.preventDefault());

    touchFireButton.addEventListener('touchstart', (e) => handleTouch(e, 'Fire', true));
    touchFireButton.addEventListener('touchend', (e) => handleTouch(e, 'Fire', false));
    touchFireButton.addEventListener('contextmenu', (e) => e.preventDefault());

});
