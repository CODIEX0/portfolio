const SpaceGame = (function() {
    // --- DOM Elements ---
    let gameCanvas, ctx, scoreDisplay, livesDisplayContainer, lifeBarInner,
        gameOverMessage, tryAgainButton;

    // --- Game State Variables ---
    let score = 0;
    let player = {};
    let lasers = [];
    let bugs = [];
    let stars = [];
    let boss = null;
    let bossLasers = [];
    let keys = {}; // Input state (shared with main.js)
    let bugSpawnTimer = 0;
    let bugSpawnIntervalBase = 90;
    let bugSpawnInterval = bugSpawnIntervalBase;
    let bugSpeedBase = 1;
    let bugSpeed = bugSpeedBase;
    let gameOver = false;
    let gameAnimationId = null;
    let playerWidth = 40;
    let playerHeight = 40;
    let bugSize = 35;
    let bossSize = 60;
    const initialLives = 10;
    let difficultyThreshold = 200;
    let difficultyLevel = 0;
    let bossIncoming = false;
    let bossActive = false;
    const finalLevel = 5;

    function initDOM() {
        // Get references to DOM elements used by the game
        gameCanvas = document.getElementById('space-game-canvas');
        if (!gameCanvas) { console.error("Game canvas not found!"); return false; }
        ctx = gameCanvas.getContext('2d');
        scoreDisplay = document.getElementById('score-display');
        livesDisplayContainer = document.getElementById('lives-display');
        lifeBarInner = document.getElementById('life-bar-inner');
        gameOverMessage = document.getElementById('game-over-message');
        tryAgainButton = document.getElementById('try-again-button');
        return true; // Indicate success
    }

    // --- Starfield ---
    function createStars(count) {
        if (!gameCanvas) return;
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.3 + 0.1
            });
        }
    }

    function updateStars() {
        if (!gameCanvas) return;
        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > gameCanvas.height + star.radius) {
                star.y = -star.radius;
                star.x = Math.random() * gameCanvas.width;
            }
        });
    }

    function drawStars() {
        if (!ctx) return;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function resizeGameCanvas() {
        const gameOverlay = document.getElementById('game-overlay'); // Need overlay ref here
        if (!gameOverlay || !gameCanvas) return;

        const overlayRect = gameOverlay.getBoundingClientRect();
        const aspectRatio = 16 / 9;
        let newWidth = overlayRect.width * 0.95;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > overlayRect.height * 0.70) {
            newHeight = overlayRect.height * 0.70;
            newWidth = newHeight * aspectRatio;
        }
        gameCanvas.width = Math.floor(newWidth);
        gameCanvas.height = Math.floor(newHeight);

        playerWidth = Math.max(25, Math.min(50, gameCanvas.height * 0.08));
        playerHeight = playerWidth;
        bugSize = Math.max(20, Math.min(45, gameCanvas.height * 0.07));
        bossSize = Math.max(40, Math.min(70, gameCanvas.height * 0.12));

        bugSpeedBase = gameCanvas.height * 0.002 * (1 + difficultyLevel * 0.1);
        bugSpeed = bugSpeedBase;

        createStars(100);

        if (player.x) { // Check if player exists before repositioning
            player.x = gameCanvas.width / 2 - playerWidth / 2;
            player.y = gameCanvas.height - playerHeight - 10;
            player.width = playerWidth;
            player.height = playerHeight;
        }
         if (bossActive && boss) {
             boss.x = Math.min(boss.x, gameCanvas.width - boss.size);
             boss.y = Math.min(boss.y, gameCanvas.height * 0.3);
             boss.size = bossSize;
         }
    }

    function init() {
        if (!initDOM()) return; // Ensure DOM elements are ready

        console.log("Initializing Game..."); // Debug log
        difficultyLevel = 0;
        difficultyThreshold = 200;
        bugSpawnIntervalBase = 90;
        bugSpawnInterval = bugSpawnIntervalBase;
        bossIncoming = false;
        bossActive = false;
        boss = null;

        resizeGameCanvas(); // Sets initial size, speeds, stars

        score = 0;
        lasers = [];
        bugs = [];
        bossLasers = [];
        bugSpawnTimer = 0;
        gameOver = false;
        scoreDisplay.textContent = `Score: ${score}`;
        gameOverMessage.style.display = 'none';
        tryAgainButton.style.display = 'none';

        player = {
            x: gameCanvas.width / 2 - playerWidth / 2,
            y: gameCanvas.height - playerHeight - 10,
            width: playerWidth,
            height: playerHeight,
            speed: 6,
            laserCooldown: 12,
            laserTimer: 0,
            lives: initialLives
        };
        keys = {}; // Reset keys state
        drawLives();

        if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
        gameLoop();
    }

    // --- Drawing Functions ---
    function drawPlayer() {
        if (!ctx || !player) return;
        ctx.font = `${player.height}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛸', player.x + player.width / 2, player.y + player.height / 2);
    }

    function drawLaser(laser) {
        if (!ctx) return;
        ctx.fillStyle = '#00FF41';
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    }

     function drawBossLaser(laser) {
        if (!ctx) return;
        ctx.fillStyle = '#FF8C00';
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    }

    function drawBug(bug) {
        if (!ctx) return;
        ctx.font = `${bug.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👾', bug.x + bug.size / 2, bug.y + bug.size / 2);
    }

    function drawBoss() {
        if (!ctx || !bossActive || !boss) return;
        ctx.font = `${boss.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👽', boss.x + boss.size / 2, boss.y + boss.size / 2);

        // Draw boss health bar
        const barWidth = boss.size * 0.8;
        const barHeight = 8;
        const barX = boss.x + (boss.size - barWidth) / 2;
        const barY = boss.y - barHeight - 5;
        const healthPercent = boss.health / boss.maxHealth;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        ctx.strokeStyle = '#FFF';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    function drawLives() {
        if (!lifeBarInner || !player) return;
        const lifePercent = Math.max(0, player.lives / initialLives) * 100;
        lifeBarInner.style.width = `${lifePercent}%`;
    }

    // --- Update Functions ---
    function increaseDifficulty() {
         difficultyLevel++;
         difficultyThreshold += 200;
         bugSpeedBase = gameCanvas.height * 0.002 * (1 + difficultyLevel * 0.1);
         bugSpawnIntervalBase = Math.max(25, bugSpawnIntervalBase - 4);
         console.log(`Level Up! Level: ${difficultyLevel}, Score Threshold: ${difficultyThreshold}`);
         bossIncoming = true;
    }

    function fireLaser() {
        if (!player || player.laserTimer > 0) return; // Check player exists
        const laserHeight = 15;
        lasers.push({
            x: player.x + player.width / 2 - 2,
            y: player.y - 5,
            width: 4,
            height: laserHeight,
            speed: 8
        });
        player.laserTimer = player.laserCooldown;
    }

    function updatePlayer() {
        if (!player) return; // Check player exists
        if (player.laserTimer > 0) player.laserTimer--;

        // Read shared keys state
        if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
        if (keys['ArrowRight'] && player.x < gameCanvas.width - player.width) player.x += player.speed;
        if (keys[' '] || keys['Fire']) fireLaser();
    }

    function updateLasers(laserArray, speedMultiplier = 1) {
        if (!gameCanvas) return;
        for (let i = laserArray.length - 1; i >= 0; i--) {
            laserArray[i].y += laserArray[i].speed * speedMultiplier;
            if (laserArray[i].y < -laserArray[i].height || laserArray[i].y > gameCanvas.height) {
                laserArray.splice(i, 1);
            }
        }
    }

    function spawnBug() {
         if (!gameCanvas || bossIncoming || bossActive) return;
         bugSpawnTimer++;
         if (bugSpawnTimer >= bugSpawnInterval) {
            const x = Math.random() * (gameCanvas.width - bugSize);
            bugs.push({ x: x, y: -bugSize, size: bugSize, speed: bugSpeed });
            bugSpawnTimer = 0;
            bugSpeed = bugSpeedBase + Math.random() * 0.5;
            bugSpawnInterval = bugSpawnIntervalBase - Math.random() * 10;
         }
    }

    function updateBugs() {
        if (!gameCanvas || !player) return; // Check required objects exist
        for (let i = bugs.length - 1; i >= 0; i--) {
            const bug = bugs[i];
            bug.y += bug.speed;

            const playerHitbox = { x: player.x + player.width * 0.1, y: player.y + player.height * 0.1, width: player.width * 0.8, height: player.height * 0.8 };
            const bugHitbox = { x: bug.x + bug.size * 0.1, y: bug.y + bug.size * 0.1, width: bug.size * 0.8, height: bug.size * 0.8 };

            if (
                bugHitbox.x < playerHitbox.x + playerHitbox.width && bugHitbox.x + bugHitbox.width > playerHitbox.x &&
                bugHitbox.y < playerHitbox.y + playerHitbox.height && bugHitbox.y + bugHitbox.height > playerHitbox.y
            ) {
                bugs.splice(i, 1);
                player.lives--;
                drawLives();
                if (player.lives <= 0) { gameOver = true; break; }
            }
            else if (bug.y > gameCanvas.height) {
                 bugs.splice(i, 1);
            }
        }
    }

     function spawnBoss() {
         if (!gameCanvas) return;
         console.log("Spawning Boss for Level", difficultyLevel);
         bossIncoming = false;
         bossActive = true;
         bugs = [];
         bossLasers = [];
         let bossHealth = 50 + difficultyLevel * 20;
         let bossSpeed = 2 + difficultyLevel * 0.5;
         let bossShootInterval = Math.max(30, 60 - difficultyLevel * 5);
         if (difficultyLevel >= finalLevel) {
             console.log("FINAL BOSS!"); bossHealth *= 2; bossSpeed *= 1.5;
             bossShootInterval = Math.max(20, bossShootInterval - 10);
         }
         boss = {
             x: gameCanvas.width / 2 - bossSize / 2, y: 50, size: bossSize,
             speed: bossSpeed, direction: 1, health: bossHealth, maxHealth: bossHealth,
             shootTimer: 0, shootInterval: bossShootInterval
         };
     }

     function updateBoss() {
         if (!bossActive || !boss || !gameCanvas) return;
         boss.x += boss.speed * boss.direction;
         if (boss.x <= 0 || boss.x + boss.size >= gameCanvas.width) {
             boss.direction *= -1;
             boss.x = Math.max(0, Math.min(boss.x, gameCanvas.width - boss.size));
         }
         boss.shootTimer++;
         if (boss.shootTimer >= boss.shootInterval) {
             const laserWidth = 5; const laserHeight = 15;
             bossLasers.push({
                 x: boss.x + boss.size / 2 - laserWidth / 2, y: boss.y + boss.size,
                 width: laserWidth, height: laserHeight, speed: 4 + difficultyLevel * 0.3
             });
             boss.shootTimer = 0;
         }
     }

    // --- Collision Detection ---
    function checkCollisions() {
        if (!player) return; // Check player exists

        // 1. Player Lasers vs Bugs
        for (let i = lasers.length - 1; i >= 0; i--) {
            const laser = lasers[i];
            if (laser.y < -laser.height) continue;
            for (let j = bugs.length - 1; j >= 0; j--) {
                const bug = bugs[j];
                const bugHitbox = { x: bug.x + bug.size * 0.1, y: bug.y + bug.size * 0.1, width: bug.size * 0.8, height: bug.size * 0.8 };
                if (laser.x < bugHitbox.x + bugHitbox.width && laser.x + laser.width > bugHitbox.x && laser.y < bugHitbox.y + bugHitbox.height && laser.y + laser.height > bugHitbox.y) {
                    lasers.splice(i, 1); bugs.splice(j, 1); score += 10; scoreDisplay.textContent = `Score: ${score}`;
                    if (score >= difficultyThreshold && !bossActive && !bossIncoming) { increaseDifficulty(); }
                    break;
                }
            }
        }

        // 2. Player Lasers vs Boss
        if (bossActive && boss) {
             const bossHitbox = { x: boss.x + boss.size * 0.1, y: boss.y + boss.size * 0.1, width: boss.size * 0.8, height: boss.size * 0.8 };
             for (let i = lasers.length - 1; i >= 0; i--) {
                 const laser = lasers[i];
                 if (laser.x < bossHitbox.x + bossHitbox.width && laser.x + laser.width > bossHitbox.x && laser.y < bossHitbox.y + bossHitbox.height && laser.y + laser.height > bossHitbox.y) {
                     lasers.splice(i, 1); boss.health -= 10; console.log("Boss Health:", boss.health);
                     if (boss.health <= 0) {
                         console.log("Boss Defeated!"); score += 100 * difficultyLevel; scoreDisplay.textContent = `Score: ${score}`;
                         bossActive = false; boss = null;
                         if (difficultyLevel >= finalLevel) { console.log("Final Boss Defeated! You Win (for now)!"); }
                         if (score >= difficultyThreshold && !bossActive && !bossIncoming) { increaseDifficulty(); }
                         break;
                     }
                 }
             }
        }

        // 3. Boss Lasers vs Player
         const playerHitbox = { x: player.x + player.width * 0.1, y: player.y + player.height * 0.1, width: player.width * 0.8, height: player.height * 0.8 };
         for (let i = bossLasers.length - 1; i >= 0; i--) {
             const laser = bossLasers[i];
             if (laser.x < playerHitbox.x + playerHitbox.width && laser.x + laser.width > playerHitbox.x && laser.y < playerHitbox.y + playerHitbox.height && laser.y + laser.height > playerHitbox.y) {
                 bossLasers.splice(i, 1); player.lives--; drawLives();
                 if (player.lives <= 0) { gameOver = true; break; }
             }
         }
    }

    // --- Game Loop ---
    function gameLoop() {
        if (gameOver) {
            gameOverMessage.style.display = 'block';
            tryAgainButton.style.display = 'inline-block';
            return;
        }

        gameAnimationId = requestAnimationFrame(gameLoop);
        if (!ctx) return; // Ensure context exists
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        updateStars(); drawStars(); // Background first
        updatePlayer();
        updateLasers(lasers, -1);

        if (bossActive) { updateBoss(); updateLasers(bossLasers, 1); }
        else if (bossIncoming) { spawnBoss(); }
        else { spawnBug(); }
        updateBugs();

        if (gameOver) { // Check again after updates
             gameOverMessage.style.display = 'block';
             tryAgainButton.style.display = 'inline-block';
             cancelAnimationFrame(gameAnimationId);
             return;
        }

        checkCollisions();

        drawPlayer();
        lasers.forEach(drawLaser);
        bugs.forEach(drawBug);
        drawBoss();
        bossLasers.forEach(drawBossLaser);
        // Lives bar updated by drawLives() when lives change
    }

    function stop() {
        gameOver = true; // Ensure loop stops
        if (gameAnimationId) {
            cancelAnimationFrame(gameAnimationId);
            gameAnimationId = null;
        }
        console.log("Game stopped.");
    }

    // --- Public Interface ---
    return {
        init: init,
        stop: stop,
        resizeCanvas: resizeGameCanvas,
        setKeyState: function(key, isPressed) { // Allow main.js to update keys
            keys[key] = isPressed;
        },
        // Expose Try Again button for main.js listener
        getTryAgainButton: function() { return tryAgainButton; }
    };

})(); 