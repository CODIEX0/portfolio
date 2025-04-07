const BackgroundAnimation = (function() {
    // --- Scope variables ---
    let bgScene, bgCamera, bgRenderer, bgCanvas;
    let bgRain, bgUfo, bgBug;
    let bgParticlesGeometry, bgParticlesMaterial;
    let bgVelocities = [];
    let bgBugTargetPosition;
    let bgBugMoveTimer = 0;
    let bgAnimationId = null; // Animation frame ID

    // --- Constants ---
    const bgParticleCount = 8000;
    const bgParticleSize = 0.15;
    const bgFallSpeed = 0.03;
    const bgStreamLength = 25;
    const bgMatrixGreen = new THREE.Color(0x00FF41);
    const bgBrightGreen = new THREE.Color(0x90EE90);
    const bgWhite = new THREE.Color(0xFFFFFF);
    const bgBugMoveInterval = 100;
    const bgBugSpeed = 0.05;
    const bgUfoChaseSpeed = 0.03;

    function init() {
        bgCanvas = document.getElementById('matrix-canvas');
        if (!bgCanvas) {
            console.error("Matrix canvas not found!");
            return;
        }

        bgScene = new THREE.Scene();
        bgCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true });

        bgRenderer.setSize(window.innerWidth, window.innerHeight);
        bgRenderer.setPixelRatio(window.devicePixelRatio);

        // --- Lighting ---
        const bgAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
        bgScene.add(bgAmbientLight);
        const bgPointLight = new THREE.PointLight(0x00ff41, 1, 100);
        bgPointLight.position.set(0, 10, 30);
        bgScene.add(bgPointLight);

        // --- Digital Rain ---
        bgParticlesGeometry = new THREE.BufferGeometry();
        const bgPositions = [];
        const bgColors = [];
        bgVelocities = []; // Reset velocities array

        for (let i = 0; i < bgParticleCount; i++) {
            const x = THREE.MathUtils.randFloatSpread(100);
            const y = THREE.MathUtils.randFloat(0, 100);
            const z = THREE.MathUtils.randFloatSpread(50);
            bgPositions.push(x, y, z);
            bgVelocities.push({
                speed: THREE.MathUtils.randFloat(bgFallSpeed * 0.5, bgFallSpeed * 1.5),
                isLeading: Math.random() < 1 / bgStreamLength
            });
            bgColors.push(bgMatrixGreen.r, bgMatrixGreen.g, bgMatrixGreen.b);
        }
        bgParticlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bgPositions, 3));
        bgParticlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bgColors, 3));
        bgParticlesMaterial = new THREE.PointsMaterial({ size: bgParticleSize, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        bgRain = new THREE.Points(bgParticlesGeometry, bgParticlesMaterial);
        bgScene.add(bgRain);

        // --- UFO and Bug ---
        const bgUfoGeometry = new THREE.ConeGeometry(0.8, 0.3, 16);
        const bgUfoMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.4 });
        bgUfo = new THREE.Mesh(bgUfoGeometry, bgUfoMaterial);
        bgUfo.rotation.x = Math.PI;
        bgScene.add(bgUfo);

        const bgBugGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const bgBugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        bgBug = new THREE.Mesh(bgBugGeometry, bgBugMaterial);
        bgScene.add(bgBug);

        bgBugTargetPosition = new THREE.Vector3( THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloat(-20, 20), THREE.MathUtils.randFloat(5, 25) );
        bgBugMoveTimer = 0;
        bgCamera.position.z = 50;

        // --- Event Listener ---
        window.addEventListener('resize', onWindowResizeBackground, false);

        // --- Start Animation ---
        start();
    }

    function animate() {
        // --- Rain Animation ---
        const positionsAttribute = bgParticlesGeometry.getAttribute('position');
        const colorsAttribute = bgParticlesGeometry.getAttribute('color');
        const currentPositions = positionsAttribute.array;
        const currentColors = colorsAttribute.array;

        for (let i = 0; i < bgParticleCount; i++) {
            const i3 = i * 3;
            const velocityInfo = bgVelocities[i];
            currentPositions[i3 + 1] -= velocityInfo.speed;
            let color;
            if (velocityInfo.isLeading) color = bgWhite;
            else {
                const yPos = currentPositions[i3 + 1];
                const streamProgress = THREE.MathUtils.mapLinear(yPos, 50, -50, 0, 1);
                color = bgMatrixGreen.clone().lerp(bgBrightGreen, streamProgress * 0.5);
            }
            if (currentPositions[i3 + 1] < -50) {
                currentPositions[i3 + 1] = 50;
                currentPositions[i3] = THREE.MathUtils.randFloatSpread(100);
                velocityInfo.isLeading = Math.random() < 1 / bgStreamLength;
                velocityInfo.speed = THREE.MathUtils.randFloat(bgFallSpeed * 0.5, bgFallSpeed * 1.5);
            }
            currentColors[i3] = color.r; currentColors[i3 + 1] = color.g; currentColors[i3 + 2] = color.b;
        }
        positionsAttribute.needsUpdate = true;
        colorsAttribute.needsUpdate = true;

        // --- UFO/Bug Animation ---
        bgBugMoveTimer++;
        if (bgBugMoveTimer > bgBugMoveInterval) {
            bgBugTargetPosition.set( THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloat(-20, 20), THREE.MathUtils.randFloat(5, 25) );
            bgBugMoveTimer = 0;
        }
        bgBug.position.lerp(bgBugTargetPosition, bgBugSpeed);
        bgUfo.position.lerp(bgBug.position, bgUfoChaseSpeed);
        bgUfo.rotation.z += 0.02; bgUfo.rotation.y += 0.01;

        // --- Render ---
        bgRenderer.render(bgScene, bgCamera);
    }

    function loop() {
        bgAnimationId = requestAnimationFrame(loop); // Continue loop
        animate(); // Perform animation steps
    }

    function start() {
        if (!bgAnimationId) {
            console.log("Starting background animation.");
            loop();
        }
    }

    function stop() {
        if (bgAnimationId) {
            console.log("Stopping background animation.");
            cancelAnimationFrame(bgAnimationId);
            bgAnimationId = null;
        }
    }

    function onWindowResizeBackground() {
        if (!bgCamera || !bgRenderer) return;
        bgCamera.aspect = window.innerWidth / window.innerHeight;
        bgCamera.updateProjectionMatrix();
        bgRenderer.setSize(window.innerWidth, window.innerHeight);
        bgRenderer.setPixelRatio(window.devicePixelRatio);
    }

    // Public interface
    return {
        init: init,
        start: start,
        stop: stop
    };

})(); 






