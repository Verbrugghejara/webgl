
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';


const landscapeVertexShader = await fetch('./shaders/vertex.glsl').then(r => r.text());
const landscapeFragmentShader = await fetch('./shaders/fragment.glsl').then(r => r.text());



// ------------------- Game State -------------------
let gameStarted = false;
let gameTime = 0;
let animationId = null;
let gameEnded = false;
let allRingsCompleted = false;
let lastRingReached = false;
let lastRingTimer = 0;
let isFreeFlightMode = false;
let isFinishingFlight = false;
let finishTimeout = null;
let lastRingPassed = false;

// ------------------- 3D Model Loading -------------------
let playerPlane = null;
let mixer = null;
const loader = new GLTFLoader();

loader.load(
    './assets/airplane.glb',
    function (gltf) {

        const model = gltf.scene;
        
        if (playerPlane) {
            scene.remove(playerPlane);
        }
        
        model.scale.set(1.0, 1.0, 1.0);
        model.position.set(0, 0, 0);
        
        mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;
        if (clips && clips.length > 0) {
            const action = mixer.clipAction(clips[0]);
            action.play();

        }
        
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        playerPlane = model;
        scene.add(playerPlane);
    },
    function (progress) {
        // Loading progress
    },
    function (error) {
        console.warn('Failed to load from ./assets/, trying /assets/...');
        loader.load(
            '/assets/airplane.glb',
            function (gltf) {
                const model = gltf.scene;
                
                if (playerPlane) {
                    scene.remove(playerPlane);
                }
                
                model.scale.set(1.0, 1.0, 1.0);
                model.position.set(0, 0, 0);
                
                mixer = new THREE.AnimationMixer(model);
                const clips = gltf.animations;
                if (clips && clips.length > 0) {
                    const action = mixer.clipAction(clips[0]);
                    action.play();
                }
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                playerPlane = model;
                scene.add(playerPlane);
            },
            undefined,
            function (error2) {
                console.error('Failed to load from both paths:', error, error2);
                createFallbackPlane();
            }
        );
    }
);

function createFallbackPlane() {
    const planeGeometry = new THREE.BoxGeometry(0.5, 0.2, 1);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    playerPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    playerPlane.position.set(0, 0, 0);
    scene.add(playerPlane);
}

// ------------------- Screen Management -------------------
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const flyFreeButton = document.getElementById('flyFreeButton');
const gameArea = document.getElementById('gameArea');
const endScreen = document.getElementById('endScreen');
const playAgainButton = document.getElementById('playAgainButton');
const backToMenuButton = document.getElementById('backToMenuButton');
const score = document.getElementById('score');
const scoreLabel = document.getElementById('scoreLabel');
const speedDisplay = document.getElementById('speed');
const altitudeDisplay = document.getElementById('altitude');
const timerDisplay = document.getElementById('timer');
const timerLabel = document.getElementById('timerLabel');
const finalScore = document.getElementById('finalScore');
const finalSpeed = document.getElementById('finalSpeed');

const speedThrottle = document.getElementById('speedThrottle');
const throttleFill = document.getElementById('throttleFill');
const throttleHandle = document.getElementById('throttleHandle');
const throttleValue = document.getElementById('throttleValue');

const finishCountdown = document.getElementById('finishCountdown');
const countdownNumber = document.getElementById('countdownNumber');

if (startButton) {
    startButton.addEventListener('click', () => {
        startGame();
    });
}

if (flyFreeButton) {
    flyFreeButton.addEventListener('click', () => {
        startFreeFlightMode();
    });
}

if (playAgainButton) {
    playAgainButton.addEventListener('click', () => {
        startGame();
    });
}

if (backToMenuButton) {
    backToMenuButton.addEventListener('click', () => {
        backToStartScreen();
    });
}

function startGame() {
    gameStarted = true;
    isFreeFlightMode = false;
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    resetGame();
    
    updateUIForGameMode();
    
    setTimeout(() => {
        updateScore();
        updateTimerDisplay();
    }, 100);
    
    if (speedThrottle) {
        speedThrottle.style.display = 'none';
    }
    
    initializeThrottle();
}

function updateUIForGameMode() {
    if (scoreLabel) {
        scoreLabel.innerHTML = 'Ringen: <span id="score">0</span>/10';
        scoreLabel.style.color = 'white';
        const newScore = document.getElementById('score');
        if (newScore) {
            updateScore();
        }
    }
    if (timerLabel) {
        timerLabel.innerHTML = 'Tijd: <span id="timer">00:00</span>';
        const newTimer = document.getElementById('timer');
        if (newTimer) {
            updateTimerDisplay();
        }
    }
}

function startFreeFlightMode() {
    gameStarted = true;
    isFreeFlightMode = true;
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    resetGame();
    hideRings();
    
    updateUIForFreeFlightMode();
    
    if (speedThrottle) {
        speedThrottle.style.display = 'block';
    }
    
    initializeThrottle();
    

}

function updateUIForFreeFlightMode() {
    if (scoreLabel) {
        scoreLabel.textContent = "Free Flight Mode";
        scoreLabel.style.color = '#ff9900';
    }
    if (timerLabel) {
        timerLabel.textContent = "Controles: ";
    }
    updateTimerDisplay();
}

function hideRings() {
    rings.forEach(ring => {
        ring.visible = false;
    });
}

function showRings() {
    rings.forEach(ring => {
        ring.visible = true;
    });
}

function showEndScreen(isSuccess = false) {
    const currentEndScreen = document.getElementById('endScreen');
    const currentGameArea = document.getElementById('gameArea');
    const currentFinalScore = document.getElementById('finalScore');
    const currentFinalSpeed = document.getElementById('finalSpeed');
    
    const endScreenTitle = currentEndScreen?.querySelector('h1');
    const endScreenSubtitle = currentEndScreen?.querySelector('.subtitle');
    // const statusElement = currentEndScreen?.querySelector('.stat-value[style*="color: #00ff00"]');
    
    gameStarted = false;
    gameEnded = true;
    
    if (currentGameArea) {
        currentGameArea.classList.add('hidden');
    }
    
    if (currentEndScreen) {
        currentEndScreen.classList.remove('hidden');
    }
    
    const ringsPassedCount = rings.filter(r => r.userData.passed).length;
    const timeUsed = Math.floor(gameTime);
    const minutes = Math.floor(timeUsed / 60);
    const seconds = timeUsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (endScreenTitle) {
        if (isSuccess) {
            endScreenTitle.textContent = "Gefeliciteerd!";
        } else {
            endScreenTitle.textContent = "Net Niet Gelukt!";
        }
    }
    
    if (endScreenSubtitle) {
        if (isSuccess) {
            endScreenSubtitle.textContent = `Alle 10 ringen gepasseerd in ${timeString}!`;
            endScreenSubtitle.style.color = "#ffff00";
        } else {
            const ringsPassedCount = rings.filter(r => r.userData.passed).length;
            endScreenSubtitle.textContent = `${ringsPassedCount} van de 10 ringen gehaald in ${timeString}!`;
            endScreenSubtitle.style.color = "#ffaa00";
        }
    }
    
    if (currentFinalScore) {
        currentFinalScore.textContent = `${ringsPassedCount}/10`;
    }
    
    if (currentFinalSpeed) {
        currentFinalSpeed.textContent = `${speedMultiplier.toFixed(1)}x`;
    }
    
    if (statusElement) {
        if (isSuccess) {
            statusElement.textContent = `✅ Voltooid in ${timeString}!`;
            statusElement.style.color = "#00ff00";
        } else {
            const ringsPassedCount = rings.filter(r => r.userData.passed).length;
            statusElement.textContent = `🎯 ${ringsPassedCount}/10 ringen in ${timeString}`;
            statusElement.style.color = "#ff6600";
        }
    }
    

}

// ------------------- Renderer & Scene -------------------

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ------------------- Lighting -------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// ------------------- Shader Background -------------------
const shaderGeometry = new THREE.PlaneGeometry(2, 2);
const shaderMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
        uCameraPos: { value: new THREE.Vector3(0, 2, 5) },
        uCameraTarget: { value: new THREE.Vector3(0, 2, 0) },
        uTimeOfDay: { value: 0.5 },
        
        uSpeedMultiplier: { value: 0.0 },
        uColorFilter: { value: new THREE.Vector3(1, 1, 1) },
        uPsychedelicMode: { value: 0.0 },
        uWaveIntensity: { value: 0.0 },
        uGlitchMode: { value: 0.0 },
        uNightVision: { value: 0.0 }
    },
    transparent: false,
    vertexShader: landscapeVertexShader,
    fragmentShader: landscapeFragmentShader,
});

const shaderPlane = new THREE.Mesh(shaderGeometry, shaderMaterial);
shaderPlane.position.set(0,0,0);

const backgroundScene = new THREE.Scene();
backgroundScene.add(shaderPlane);

const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
backgroundCamera.position.z = 0.5;

// ------------------- Player Plane -------------------

// ------------------- Ringen System -------------------
const rings = [];
const ringPositions = [
    { x: 0, y: 20, z: -30 },
    { x: 8, y: 40, z: -65 },
    { x: -5, y: 50, z: -100 },
    { x: 12, y: 55, z: -140 },
    { x: -8, y: 70, z: -180 },
    { x: 3, y: 60, z: -225 },
    { x: -10, y: 70, z: -270 },
    { x: 6, y: 80, z: -320 },
    { x: -3, y: 60, z: -370 },
    { x: 0, y: 70, z: -425 }
];

let isStorming = false;
let nextRingIndex = 0;

const ringGeometry = new THREE.TorusGeometry(4, 0.4, 8, 100);
const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, 
    transparent: true, 
    opacity: 0.9,
    wireframe: true 
});

ringPositions.forEach((pos, index) => {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    ring.position.set(pos.x, pos.y, pos.z);
    ring.rotation.x = Math.PI / 90;
    ring.userData = { 
        passed: false, 
        index: index,
        glowIntensity: 0 
    };
    rings.push(ring);
    scene.add(ring);
});

let currentTimeOfDay = 1.0;
let targetTimeOfDay = 1.0;
const timeTransitionSpeed = 0.02;

// ------------------- Flight Controls -------------------
const planePosition = { x: 0, y: 0, z: 0 };
const velocity = { x: 0, y: 0, z: 0 };
let planeRotation = 0;
let bankingVelocity = 0;
let baseSpeed = 0.15;
let speedMultiplier = 1.0;
const maxAltitude = 150;

const keys = {};
window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    
    if (event.code === 'KeyR') {
        resetGame();
    }
    
    if (event.code === 'Escape') {
        backToStartScreen();
    }
    
    if (isFreeFlightMode) {
        if (event.code === 'Digit1') {
            targetTimeOfDay = 1.0;
            isStorming = false;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;

        }
        if (event.code === 'Digit2') {
            targetTimeOfDay = 0.1;
            isStorming = false;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;

        }
        if (event.code === 'Digit3') {
            targetTimeOfDay = 0.2;
            isStorming = true;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 1.5;

        }
    }
    
    if (isFreeFlightMode) {
        if (event.code === 'Equal' || event.code === 'NumpadAdd') {
            speedMultiplier = Math.min(speedMultiplier + 0.5, 10.0);
            updateSpeedThrottle();

        }
        if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
            speedMultiplier = Math.max(speedMultiplier - 0.5, 1.0);
            updateSpeedThrottle();

        }
    }
});

function backToStartScreen() {
    gameStarted = false;
    isFreeFlightMode = false;
    
    startScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    gameArea.classList.add('hidden');
    
    if (speedThrottle) {
        speedThrottle.style.display = 'none';
    }
    
    resetGame();
    

}

function resetGame() {
    rings.forEach(ring => {
        ring.userData.passed = false;
        ring.userData.glowIntensity = 0;
        ring.material.color.setHex(0x00ffff);
        ring.material.opacity = 0.9;
        ring.visible = !isFreeFlightMode;
    });
    currentTimeOfDay = 1.0;
    targetTimeOfDay = 1.0;
    
    isStorming = false;
    nextRingIndex = 0;
    
    gameTime = 0;
    gameEnded = false;
    allRingsCompleted = false;
    lastRingReached = false;
    lastRingTimer = 0;
    isFinishingFlight = false;
    lastRingPassed = false;
    
    if (finishTimeout) {
        clearTimeout(finishTimeout);
        finishTimeout = null;
    }
    
    hideFinishCountdown();
    
    updateScore();
    
    if (isFreeFlightMode) {
        speedMultiplier = 2.0;
    } else {
        speedMultiplier = 1.0;
    }
    
    shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
    shaderMaterial.uniforms.uColorFilter.value.set(1, 1, 1);
    shaderMaterial.uniforms.uPsychedelicMode.value = 0.0;
    shaderMaterial.uniforms.uWaveIntensity.value = 0.0;
    shaderMaterial.uniforms.uGlitchMode.value = 0.0;
    shaderMaterial.uniforms.uNightVision.value = 0.0;
    
    planePosition.x = 0;
    planePosition.y = 0;
    planePosition.z = 0;
    velocity.x = 0;
    velocity.y = 0;
    velocity.z = 0;
    planeRotation = 0;
    bankingVelocity = 0;
    
    updateScore();
    if (score) {
        score.style.color = 'white';
        score.style.fontSize = '1em';
        score.style.textShadow = 'none';
    }
    if (speedDisplay) speedDisplay.textContent = '1.0';
    if (altitudeDisplay) altitudeDisplay.textContent = '0';
    if (timerDisplay) {
        timerDisplay.style.fontSize = '1em';
        timerDisplay.style.color = 'white';
    }
    updateTimerDisplay();
    updateSpeedThrottle();
    

}

function updateTimerDisplay() {
    const currentTimer = document.getElementById('timer');
    
    if (currentTimer && !gameEnded) {
        if (isFreeFlightMode) {
            currentTimer.textContent = "1=Dag | 2=Nacht | 3=Storm | +=Sneller | -=Langzamer";
            currentTimer.style.color = '#ffaa00';
            currentTimer.style.fontSize = '0.8em';
        } else {
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            currentTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            currentTimer.style.color = 'white';
            currentTimer.style.fontSize = '1em';
        }
    }
}

function updateSpeedThrottle() {
    if (!throttleFill || !throttleHandle || !throttleValue) return;
    
    const minSpeed = 1.0;
    const maxSpeed = 10.0;
    const percentage = Math.min(Math.max((speedMultiplier - minSpeed) / (maxSpeed - minSpeed) * 100, 0), 100);
    
    throttleFill.style.height = `${percentage}%`;
    throttleHandle.style.bottom = `${percentage}%`;
    throttleValue.textContent = `${speedMultiplier.toFixed(1)}x`;
    
    if (speedMultiplier > 5.0) {
        throttleValue.style.color = '#ff6600';
        throttleValue.style.textShadow = '0 0 10px rgba(255, 102, 0, 0.8)';
    } else if (speedMultiplier > 2.0) {
        throttleValue.style.color = '#ffff00';
        throttleValue.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8)';
    } else {
        throttleValue.style.color = '#ffffff';
        throttleValue.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
    }
}

let isDragging = false;

function initializeThrottle() {
    if (!speedThrottle) return;
    
    function handleThrottleInteraction(event) {
        const throttleTrack = speedThrottle.querySelector('.throttle-track');
        if (!throttleTrack) return;
        
        const rect = throttleTrack.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const height = rect.height;
        
        let percentage = Math.max(0, Math.min(100, (height - y) / height * 100));
        
        const minSpeed = 1.0;
        const maxSpeed = 10.0;
        speedMultiplier = minSpeed + (percentage / 100) * (maxSpeed - minSpeed);
        
        speedMultiplier = Math.round(speedMultiplier * 10) / 10;
        
        updateSpeedThrottle();

    }
    
    speedThrottle.addEventListener('mousedown', (event) => {
        isDragging = true;
        handleThrottleInteraction(event);
        event.preventDefault();
    });
    
    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            handleThrottleInteraction(event);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    speedThrottle.addEventListener('touchstart', (event) => {
        isDragging = true;
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleThrottleInteraction(mouseEvent);
        event.preventDefault();
    });
    
    document.addEventListener('touchmove', (event) => {
        if (isDragging && event.touches.length > 0) {
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleThrottleInteraction(mouseEvent);
        }
    });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function startFinishCountdown() {
    if (!finishCountdown || !countdownNumber) return;
    
    let count = 3;
    finishCountdown.classList.remove('hidden');
    
    function updateCountdown() {
        countdownNumber.textContent = count;
        countdownNumber.style.animation = 'none';
        // Force reflow to restart animation
        countdownNumber.offsetHeight;
        countdownNumber.style.animation = 'numberPulse 1s ease-in-out';
        
        if (count > 1) {
            count--;
            setTimeout(updateCountdown, 1000);
        } else {
            setTimeout(() => {
                if (finishCountdown) {
                    finishCountdown.classList.add('hidden');
                }
            }, 1000);
        }
    }
    
    updateCountdown();
}

function hideFinishCountdown() {
    if (finishCountdown) {
        finishCountdown.classList.add('hidden');
    }
}

function updateScore() {
    const ringsPassedCount = rings.filter(r => r.userData.passed).length;
    const currentScore = document.getElementById('score');
    if (currentScore) {
        currentScore.textContent = ringsPassedCount;
    }
    return ringsPassedCount;
}

function updatePlaneMovement() {
    if ((!gameStarted && !isFinishingFlight) || !playerPlane) return;
    
    if (keys['KeyA'] || keys['ArrowLeft']) {
        planeRotation -= 0.05; 
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        planeRotation += 0.05;
    }
    
    const forwardX = Math.sin(planeRotation);
    const forwardZ = -Math.cos(planeRotation); 
    
    let moveSpeed = baseSpeed * speedMultiplier;
    
    if (keys['KeyW'] ) {
        moveSpeed = moveSpeed * 1.5; 
    }
    if (keys['KeyS'] ) {
        moveSpeed = moveSpeed * 0.3; 
    }
    
    planePosition.x += forwardX * moveSpeed;
    planePosition.z += forwardZ * moveSpeed;
    
    if (keys['Space']|| keys['ArrowUp']) velocity.y += 0.02; 
    if (keys['ShiftLeft']|| keys['ArrowDown']) velocity.y -= 0.02; 
    
    planePosition.y += velocity.y;
    velocity.y *= 0.95;
    
    if (planePosition.y > maxAltitude) {
        planePosition.y = maxAltitude;
        velocity.y = Math.min(0, velocity.y);
        
        if (velocity.y >= 0) {
            velocity.y = -0.01;
        }
        
        if (!window.altitudeLimitWarningShown) {

            window.altitudeLimitWarningShown = true;
            
            setTimeout(() => {
                window.altitudeLimitWarningShown = false;
            }, 5000);
        }
    }
    
    const terrainHeight = getTerrainHeight(planePosition.x, planePosition.z);
    const minHeightAboveTerrain = 0.5;
    const minGroundLevel = terrainHeight + minHeightAboveTerrain;
    
    if (planePosition.y < minGroundLevel) {
        planePosition.y = minGroundLevel;
        velocity.y = Math.max(0, velocity.y);
        
        if (velocity.y <= 0) {
            velocity.y = 0.01;
        }
    }
    
    playerPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
    
    let targetBanking = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        targetBanking = 0.3;
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        targetBanking = -0.3;
    }
    
    const bankingDifference = targetBanking - (bankingVelocity * 15);
    bankingVelocity += bankingDifference * 0.008;
    bankingVelocity *= 0.9;
    
    const bankingRotation = bankingVelocity * 15;
    
    let pitchRotation = 0;
    if (keys['Space']|| keys['ArrowUp']) {
        pitchRotation = 0.15;
    } else if (keys['ShiftLeft']|| keys['ArrowDown']) {
        pitchRotation = -0.15;
    }
    
    pitchRotation += velocity.y * 2.0;
    
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -planeRotation);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRotation);
    const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankingRotation);
    
    const finalQuaternion = new THREE.Quaternion()
        .multiplyQuaternions(yawQuaternion, pitchQuaternion)
        .multiply(rollQuaternion);
    
    playerPlane.quaternion.copy(finalQuaternion);
}

const MOD2 = { x: 3.07965, y: 7.4235 };

function fract(x) {
    return x - Math.floor(x);
}



function Hash(p) {
    if (typeof p === 'number') {
        
        let p2 = {
            x: fract(p / MOD2.x),
            y: fract(p / MOD2.y)
        };
        
        const dotVal = p2.y * (p2.x + 19.19) + p2.x * (p2.y + 19.19);
        p2.x += dotVal;
        p2.y += dotVal;
        
        return fract(p2.x * p2.y);
    } else {
        
        let px = fract(p.x / MOD2.x);
        let py = fract(p.y / MOD2.y);
        
        const dotVal = px * (py + 19.19) + py * (px + 19.19);
        px += dotVal;
        py += dotVal;
        
        return fract(px * py);
    }
}

function Noise(x) {
    const p = { x: Math.floor(x.x), y: Math.floor(x.y) };
    const f = { x: x.x - p.x, y: x.y - p.y };
    
    f.x = f.x * f.x * (3.0 - 2.0 * f.x);
    f.y = f.y * f.y * (3.0 - 2.0 * f.y);
    
    const n = p.x + p.y * 57.0;
    
    const h1 = Hash(n + 0.0);
    const h2 = Hash(n + 1.0);
    const h3 = Hash(n + 57.0);
    const h4 = Hash(n + 58.0);
    
    const mix1 = h1 + f.x * (h2 - h1);
    const mix2 = h3 + f.x * (h4 - h3);
    
    return mix1 + f.y * (mix2 - mix1);
}

function getTerrainHeight(x, z) {
    let pos = { x: x * 0.003, y: z * 0.003 };
    let w = 50.0;
    let f = 0.0;
    
    for (let i = 0; i < 3; i++) {
        f += Noise(pos) * w;
        w *= 0.62;
        pos.x *= 2.5;
        pos.y *= 2.5;
    }
    
    return f;
}

function checkRingCollisions() {
    if (!playerPlane || isFreeFlightMode) return;
    
    rings.forEach((ring, index) => {
        if (!ring.userData.passed) {
            const ringCenter = ring.position;
            const planePos = playerPlane.position;
            
            const dx = planePos.x - ringCenter.x;
            const dy = planePos.y - ringCenter.y;
            const dz = planePos.z - ringCenter.z;
            
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            const collisionRadius = 6.0;
            
            if (distance < collisionRadius) {
                const heightDiff = Math.abs(dy);
                const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                
                if (heightDiff < 4.0 && horizontalDist < 6.0) {
                    ring.userData.passed = true;
                    ring.userData.glowIntensity = 1.0;
                    
                    if (index === nextRingIndex) {
                        if (isStorming) {
                            isStorming = false;
                            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
                            targetTimeOfDay = 0.8;

                        }
                        nextRingIndex++;

                    } else {

                        
                        if (index > nextRingIndex && isStorming) {
                            isStorming = false;
                            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
                            targetTimeOfDay = 0.8;

                        }
                        
                        nextRingIndex = index + 1;
                    }
                    
                    const ringsPassedCount = rings.filter(r => r.userData.passed).length;
                    speedMultiplier = 1.0 + (ringsPassedCount * 0.5);
                    updateSpeedThrottle();
                    
                    ring.material.color.setHex(0x00ff00);
                    

                    updateScore();
                    
                    if (ringsPassedCount >= 10 && !allRingsCompleted) {
                        allRingsCompleted = true;
                        gameEnded = true;

                        
                        if (finishTimeout) {
                            clearTimeout(finishTimeout);
                        }
                        
                        isFinishingFlight = true;
                        startFinishCountdown();
                        
                        finishTimeout = setTimeout(() => {
                            isFinishingFlight = false;
                            finishTimeout = null;
                            hideFinishCountdown();
                            showEndScreen(true);
                        }, 3000);
                    }
                    
                    if (ring.userData.index === 9 && !lastRingReached) {
                        lastRingReached = true;
                        lastRingPassed = true;
                        lastRingTimer = 0;

                        
                        startFinishCountdown();
                        
                        if (timerDisplay) {
                            timerDisplay.style.color = '#00ff00';
                            timerDisplay.style.fontSize = '1.2em';
                        }
                    }
                }
            }
        }
        
        if (ring.userData.glowIntensity > 0) {
            ring.userData.glowIntensity *= 0.95;
            ring.material.opacity = 0.8 + ring.userData.glowIntensity * 0.2;
        }
    });
    
    checkMissedRings();
}

function checkMissedRings() {
    if (!playerPlane || isFreeFlightMode) return;
    
    if (nextRingIndex < rings.length) {
        const nextRing = rings[nextRingIndex];
        const planeZ = playerPlane.position.z;
        const ringZ = nextRing.position.z;
        
        if (planeZ < ringZ - 15 && !nextRing.userData.passed) {

            
            nextRing.material.color.setHex(0xff0000);
            
            if (nextRingIndex === 9 && !lastRingReached) {
                lastRingReached = true;
                lastRingPassed = false;
                lastRingTimer = 0;

                
                startFinishCountdown();
                
                if (timerDisplay) {
                    timerDisplay.textContent = `Laatste ring gemist! Tijd: 3.0s`;
                    timerDisplay.style.color = '#ff6600';
                    timerDisplay.style.fontSize = '1.2em';
                }
            } else {
                if (!isStorming) {
                    isStorming = true;
                    shaderMaterial.uniforms.uSpeedMultiplier.value = 1.5;
                    targetTimeOfDay = 0.1;

                }
            }
            
            nextRingIndex++;
        }
    }
}

// ------------------- Resize -------------------
window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
});

// ------------------- Camera & Rendering Functions -------------------
function updateCamera() {
    if (!playerPlane) return;
    
    const planeRotationSin = Math.sin(planeRotation);
    const planeRotationCos = Math.cos(planeRotation);
    
    const cameraOffset = new THREE.Vector3(
        -planeRotationSin * 3, 
        1,                           
        planeRotationCos * 3   
    );
    const cameraPos = playerPlane.position.clone().add(cameraOffset);
    
    const lookAhead = new THREE.Vector3(
        planeRotationSin * 2, 
        0,                            
        -planeRotationCos * 2   
    );
    const cameraTarget = playerPlane.position.clone().add(lookAhead);
    
    shaderMaterial.uniforms.uCameraPos.value.copy(cameraPos);
    shaderMaterial.uniforms.uCameraTarget.value.copy(cameraTarget);
    
    const camera3DOffset = new THREE.Vector3(
        -planeRotationSin * 5, 
        2,                             
        planeRotationCos * 5    
    );
    camera.position.copy(playerPlane.position.clone().add(camera3DOffset));
    
    const lookTarget = new THREE.Vector3(
        playerPlane.position.x + planeRotationSin * 3,  
        playerPlane.position.y,
        playerPlane.position.z - planeRotationCos * 3   
    );
    camera.lookAt(lookTarget);
}

function updateShaderUniforms(time) {
    shaderMaterial.uniforms.iTime.value = time * 0.001;
    shaderMaterial.uniforms.uTimeOfDay.value = currentTimeOfDay;
    
    if (mixer) {
        mixer.update(0.016);
    }
}

function animateRings(time) {
    if (isFreeFlightMode) return;
    
    rings.forEach((ring, index) => {
        ring.rotation.z += 0.01;
        
        if (!ring.userData.passed) {
            const pulse = Math.sin(time * 0.003 + index) * 0.1 + 1.0;
            ring.scale.setScalar(pulse);
            
            if (playerPlane) {
                const distance = playerPlane.position.distanceTo(ring.position);
                if (distance < 10.0) {
                    const proximity = 1.0 - (distance / 10.0);
                    ring.material.opacity = 0.9 + proximity * 0.4;
                    
                    if (distance < 6.0) {
                        const planeZ = playerPlane.position.z;
                        const ringZ = ring.position.z;
                        
                        if (planeZ < ringZ - 15) {
                            ring.material.color.setHex(0xff4444);
                        } else {
                            ring.material.color.setHex(0x00ffaa);
                        }
                        
                        const glowPulse = Math.sin(time * 0.02) * 0.3 + 0.7;
                        ring.scale.setScalar(pulse + glowPulse * 0.3);
                    }
                } else {
                    if (!ring.userData.passed) {
                        ring.material.opacity = 0.9;
                        const planeZ = playerPlane.position.z;
                        const ringZ = ring.position.z;
                        
                        if (planeZ < ringZ - 15) {
                            ring.material.color.setHex(0xff0000);
                        } else {
                            ring.material.color.setHex(0x00ffff);
                        }
                    }
                }
            }
        }
    });
}

function render() {
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    
    renderer.clearDepth();
    renderer.render(scene, camera);
}

function animate(time){
    animationId = requestAnimationFrame(animate);
    
    if ((gameStarted && !gameEnded) || isFinishingFlight) {
        gameTime += 0.016;
        updateTimerDisplay();
        
        if (!isFreeFlightMode) {
            if (lastRingReached) {
                lastRingTimer += 0.016;
                
                if (timerDisplay) {
                    const remainingTime = Math.max(0, 3 - lastRingTimer);
                    if (lastRingPassed) {
                        timerDisplay.textContent = `Eindigt in: ${remainingTime.toFixed(1)}s`;
                        timerDisplay.style.color = '#00ff00';
                    } else {
                        timerDisplay.textContent = `Laatste kans: ${remainingTime.toFixed(1)}s`;
                        timerDisplay.style.color = '#ff6600';
                    }
                    timerDisplay.style.fontSize = '1.2em';
                }
                
                if (lastRingTimer >= 3.0) {
                    gameEnded = true;
                    
                    const ringsPassedCount = rings.filter(r => r.userData.passed).length;
                    
                    if (finishTimeout) {
                        clearTimeout(finishTimeout);
                    }
                    
                    hideFinishCountdown();
                    if (ringsPassedCount >= 10) {
                        showEndScreen(true);
                    } else {
                        showEndScreen(false);
                    }
                    return;
                }
            }
            
            checkRingCollisions();
        }
        updatePlaneMovement();
        currentTimeOfDay += (targetTimeOfDay - currentTimeOfDay) * timeTransitionSpeed;
        
        if (speedDisplay) {
            speedDisplay.textContent = speedMultiplier.toFixed(1);
            if (speedMultiplier > 5.0) {
                speedDisplay.style.color = '#ff6600';
            } else if (speedMultiplier > 2.0) {
                speedDisplay.style.color = '#ffff00';
            } else {
                speedDisplay.style.color = 'white';
            }
        }
        
        if (altitudeDisplay && playerPlane) {
            const currentAltitude = Math.max(0, Math.floor(playerPlane.position.y));
            altitudeDisplay.textContent = currentAltitude;
            
            const altitudePercentage = currentAltitude / maxAltitude;
            if (altitudePercentage > 0.9) {
                altitudeDisplay.style.color = '#ff3300';
            } else if (altitudePercentage > 0.7) {
                altitudeDisplay.style.color = '#ff6600';
            } else if (altitudePercentage > 0.4) {
                altitudeDisplay.style.color = '#ffff00';
            } else {
                altitudeDisplay.style.color = 'white';
            }
        }
    }
    
    updateShaderUniforms(time);
    updateCamera();
    animateRings(time);
    render();
}

animate();