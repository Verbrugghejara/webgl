// Main script.js - Coordinates all game modules
import * as THREE from 'three';

import landscapeFragmentShader from './shaders/fragment.glsl?raw';
import landscapeVertexShader from './shaders/vertex.glsl?raw';

// Import all modules
import { gameState } from './modules/GameState.js';
import { createPlaneController } from './modules/PlaneController.js';
import { initRingSystem, hideRings, showRings, resetRings, animateRings, checkCollisions, getRingsPassedCount } from './modules/RingSystem.js';
import { createUIManager } from './modules/UIManager.js';
import { createShaderManager } from './modules/ShaderManager.js';
import { getTerrainHeight } from './modules/TerrainUtils.js';

// ------------------- Core Setup -------------------
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(1)

let highQuality = true;

// ------------------- Lighting -------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// ------------------- Initialize Modules -------------------
// gameState is already imported as object
const planeController = createPlaneController(scene);
initRingSystem(scene); // Initialize functional ring system
const uiManager = createUIManager();
const shaderManager = createShaderManager(landscapeVertexShader, landscapeFragmentShader);

// ------------------- Game Functions -------------------
function startGame() {
    gameState.startGame();
    uiManager.showGameArea(false);
    showRings();
    
    resetGame();
    uiManager.initializeThrottle(gameState);
    
    setTimeout(() => {
        uiManager.updateScore(getRingsPassedCount());
        uiManager.updateTimerDisplay(gameState);
    }, 100);
}

function startFreeFlightMode() {
    gameState.startFreeFlightMode();
    uiManager.showGameArea(true);
    hideRings();
    
    resetGame();
    uiManager.initializeThrottle(gameState);
}

function backToStartScreen() {
    gameState.backToMenu();
    uiManager.showStartScreen();
    resetGame();
}

function resetGame() {
    gameState.resetGame();
    planeController.resetPosition();
    resetRings(gameState.isFreeFlightMode);
    shaderManager.resetEffects();
    
    uiManager.updateScore(getRingsPassedCount());
    uiManager.resetUIStyles();
    uiManager.updateTimerDisplay(gameState);
    uiManager.updateSpeedThrottle(gameState.speedMultiplier);
}

function showEndScreen(isSuccess = false) {
    gameState.endGame();
    uiManager.showEndScreen(isSuccess, gameState, getRingsPassedCount);
}

// ------------------- Event Handlers -------------------
uiManager.connectEventHandlers({
    startGame: startGame,
    startFreeFlightMode: startFreeFlightMode,
    backToStartScreen: backToStartScreen
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyR') {
        resetGame();
    }
    
    if (event.code === 'Escape') {
        backToStartScreen();
    }
    
    if (gameState.isFreeFlightMode) {
        if (event.code === 'Digit1') {
            shaderManager.setDayMode();
        }
        if (event.code === 'Digit2') {
            shaderManager.setNightMode();
        }
        if (event.code === 'Digit3') {
            shaderManager.setStormMode(true);
        }
        
        if (event.code === 'Equal' || event.code === 'NumpadAdd') {
            gameState.increaseSpeed(0.5);
            uiManager.updateSpeedThrottle(gameState.speedMultiplier);
        }
        if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
            gameState.decreaseSpeed(0.5);
            uiManager.updateSpeedThrottle(gameState.speedMultiplier);
        }
    }
});

// ------------------- Game Loop Functions -------------------
function updateCamera() {
    if (!planeController.getPlane()) return;
    
    const planePosition = planeController.getPosition();
    const planeRotation = planeController.getRotation();
    
    const planeRotationSin = Math.sin(planeRotation);
    const planeRotationCos = Math.cos(planeRotation);
    
    shaderManager.updateCamera(planeController);
    
    const camera3DOffset = new THREE.Vector3(
        -planeRotationSin * 5, 
        2,                             
        planeRotationCos * 5    
    );
    camera.position.copy(new THREE.Vector3(
        planePosition.x + camera3DOffset.x,
        planePosition.y + camera3DOffset.y,
        planePosition.z + camera3DOffset.z
    ));
    
    const lookTarget = new THREE.Vector3(
        planePosition.x + planeRotationSin * 3,  
        planePosition.y,
        planePosition.z - planeRotationCos * 3   
    );
    camera.lookAt(lookTarget);
}

function handleRingCollisions() {
    const collisionResult = checkCollisions(
        planeController.getPlane(), 
        gameState, 
        shaderManager.getShaderMaterial()
    );
    
    if (collisionResult) {
        if (collisionResult.type === 'ringPassed') {
            const ringsPassedCount = collisionResult.ringsPassedCount;
            gameState.setSpeedFromRings(ringsPassedCount);
            uiManager.updateSpeedThrottle(gameState.speedMultiplier);
            uiManager.updateScore(ringsPassedCount);
            
            if (ringsPassedCount >= 10 && !gameState.allRingsCompleted) {
                gameState.setAllRingsCompleted();
                uiManager.startFinishCountdown();
                
                gameState.finishTimeout = setTimeout(() => {
                    gameState.isFinishingFlight = false;
                    gameState.finishTimeout = null;
                    uiManager.hideFinishCountdown();
                    showEndScreen(true);
                }, 3000);
            }
            
            if (collisionResult.ringIndex === 9 && !gameState.lastRingReached) {
                gameState.setLastRingReached(true);
                uiManager.startFinishCountdown();
            }
        } else if (collisionResult.type === 'lastRingMissed') {
            gameState.setLastRingReached(false);
            uiManager.startFinishCountdown();
        }
    }
}

function render() {
    renderer.autoClear = false;
    renderer.clear();
    
    shaderManager.renderBackground(renderer);
    
    renderer.clearDepth();
    renderer.render(scene, camera);
}

// ------------------- Main Animation Loop -------------------
let animationId = null;

function animate(time) {
    animationId = requestAnimationFrame(animate);
    
    gameState.updateGameTime();
    
    if ((gameState.gameStarted && !gameState.gameEnded) || gameState.isFinishingFlight) {
        uiManager.updateTimerDisplay(gameState);
        
        if (!gameState.isFreeFlightMode) {
            if (gameState.lastRingReached) {
                const timeExpired = gameState.updateLastRingTimer();
                uiManager.updateLastRingTimer(gameState);
                
                if (timeExpired) {
                    const ringsPassedCount = getRingsPassedCount();
                    
                    if (gameState.finishTimeout) {
                        clearTimeout(gameState.finishTimeout);
                    }
                    
                    uiManager.hideFinishCountdown();
                    showEndScreen(ringsPassedCount >= 10);
                    return;
                }
            }
            
            handleRingCollisions();
        }
        
        planeController.updateMovement(gameState, getTerrainHeight);
        
        uiManager.updateSpeedDisplay(gameState.speedMultiplier);
        
        if (planeController.getPlane()) {
            const altitude = planeController.getPosition().y;
            uiManager.updateAltitudeDisplay(altitude, planeController.getMaxAltitude());
        }
    }
    
    shaderManager.updateUniforms(time);
    
    planeController.updateAnimation(0.016);
    
    updateCamera();
    
    animateRings(time, planeController.getPlane(), gameState.isFreeFlightMode);
    
    render();
}

// ------------------- Window Resize Handler -------------------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderManager.updateResolution(window.innerWidth, window.innerHeight);
    
    const pixelRatio = highQuality ? 1 : window.devicePixelRatio;

    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
});

// ------------------- Initialize Game -------------------
async function initializeGame() {
    try {
        await planeController.loadAirplaneModel();
        console.log('Airplane model loaded successfully');
    } catch (error) {
        console.warn('Could not load airplane model, using fallback');
    }
    
    animate();
}

initializeGame();