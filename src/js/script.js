
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

import landscapeFragmentShader from './shaders/fragment.glsl?raw';
import landscapeVertexShader from './shaders/vertex.glsl?raw';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ------------------- Game State -------------------
let gameStarted = false;
let animationId = null;

// ------------------- 3D Model Loading -------------------
let playerPlane = null; // Will be replaced by loaded model
let mixer = null; // Animation mixer
const loader = new GLTFLoader();

loader.load(
    './assets/airplane.glb', // Try relative path first
    function (gltf) {
        console.log('Model loaded successfully from ./assets/airplane.glb');
        // Called when the model is loaded
        const model = gltf.scene;
        
        // Remove the old red box if it exists
        if (playerPlane) {
            scene.remove(playerPlane);
        }
        
        // Set up the airplane model
        model.scale.set(1.0, 1.0, 1.0); // Verdubbeld van 0.5 naar 1.0 = 2x groter
        model.position.set(0, 0, 0);
        
        // Set up animation mixer
        mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;
        if (clips && clips.length > 0) {
            const action = mixer.clipAction(clips[0]);
            action.play();
            console.log('Animation loaded and playing');
        } else {
            console.log('No animations found in model');
        }
        
        // Fix materials and enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        playerPlane = model;
        scene.add(playerPlane);
        
        console.log('Airplane model loaded successfully!');
    },
    function (progress) {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    function (error) {
        console.warn('Failed to load from ./assets/, trying /assets/...');
        // Try alternative path
        loader.load(
            '/assets/airplane.glb',
            function (gltf) {
                console.log('Model loaded successfully from /assets/airplane.glb');
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
                console.log('Airplane model loaded successfully!');
            },
            undefined,
            function (error2) {
                console.error('Failed to load from both paths:', error, error2);
                console.log('Using fallback red box. Make sure airplane.glb is in the public/assets/ folder');
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
    console.log('Using fallback red box plane');
}

// ------------------- Start Screen Management -------------------
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameArea = document.getElementById('gameArea');
const score = document.getElementById('score');
const speedDisplay = document.getElementById('speed');

startButton.addEventListener('click', () => {
    startGame();
});

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');
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
// Ambient light for general illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Directional light (sun)
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
        uTimeOfDay: { value: 0.5 }, // 0 = nacht, 1 = dag
        
        // Ring effecten
        uSpeedMultiplier: { value: 0.0 },    // Ring 0: Snelheidsboost
        uColorFilter: { value: new THREE.Vector3(1, 1, 1) }, // Ring 1: Kleurfilter
        uPsychedelicMode: { value: 0.0 },    // Ring 2: Psychedelische effecten
        uWaveIntensity: { value: 0.0 },      // Ring 3: Golfeffecten
        uGlitchMode: { value: 0.0 },         // Ring 4: Glitch effecten
        uNightVision: { value: 0.0 }         // Ring 5: Nachtzicht
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
// playerPlane wordt gedefinieerd in de model loading sectie hierboven

// ------------------- Ringen System -------------------
const rings = [];
const ringPositions = [
    { x: 0, y: 20, z: -30 },    // Was -20, nu -30
    { x: 8, y: 40, z: -65 },    // Was -40, nu -65  
    { x: -5, y: 50, z: -100 },  // Was -60, nu -100
    { x: 12, y: 55, z: -140 },  // Was -85, nu -140
    { x: -8, y: 70, z: -180 },  // Was -110, nu -180
    { x: 3, y: 60, z: -225 },   // Was -135, nu -225
    { x: -10, y: 70, z: -270 }, // Was -160, nu -270
    { x: 6, y: 80, z: -320 },   // Was -190, nu -320
    { x: -3, y: 60, z: -370 },  // Was -220, nu -370
    { x: 0, y: 70, z: -425 }    // Was -250, nu -425
];

const ringGeometry = new THREE.TorusGeometry(4, 0.4, 8, 100); // Groter gemaakt: radius 3->4, tube 0.3->0.4
const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, 
    transparent: true, 
    opacity: 0.9, // Meer zichtbaar gemaakt
    wireframe: true 
});

ringPositions.forEach((pos, index) => {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    ring.position.set(pos.x, pos.y, pos.z);
    ring.rotation.x = Math.PI / 90; // Roteer zodat je er doorheen kunt vliegen
    ring.userData = { 
        passed: false, 
        index: index,
        glowIntensity: 0 
    };
    rings.push(ring);
    scene.add(ring);
});

let currentTimeOfDay = 1.0; // Start bij volledig licht
let targetTimeOfDay = 1.0;
const timeTransitionSpeed = 0.02;

// ------------------- Flight Controls -------------------
const planePosition = { x: 0, y: 0, z: 0 };
const velocity = { x: 0, y: 0, z: 0 };
let planeRotation = 0;
let bankingVelocity = 0; // Smooth banking voor het kantelen van het vliegtuig
let baseSpeed = 0.15; // Basis snelheid
let speedMultiplier = 1.0; // Snelheidsmultiplier gebaseerd op ringen

const keys = {};
window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    
    // Reset alle ringen met R toets
    if (event.code === 'KeyR') {
        resetGame();
    }
    
    // Escape om terug naar startscherm te gaan
    if (event.code === 'Escape') {
        backToStartScreen();
    }
});

function resetGame() {
    rings.forEach(ring => {
        ring.userData.passed = false;
        ring.userData.glowIntensity = 0;
        ring.material.color.setHex(0x00ffff);
        ring.material.opacity = 0.9; // Updated naar nieuwe default opacity
    });
    currentTimeOfDay = 1.0;
    targetTimeOfDay = 1.0;
    
    // Reset snelheid
    speedMultiplier = 1.0;
    
    // Reset alle ring effecten
    shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
    shaderMaterial.uniforms.uColorFilter.value.set(1, 1, 1);
    shaderMaterial.uniforms.uPsychedelicMode.value = 0.0;
    shaderMaterial.uniforms.uWaveIntensity.value = 0.0;
    shaderMaterial.uniforms.uGlitchMode.value = 0.0;
    shaderMaterial.uniforms.uNightVision.value = 0.0;
    
    // Reset vliegtuig positie
    planePosition.x = 0;
    planePosition.y = 0;
    planePosition.z = 0;
    velocity.x = 0;
    velocity.y = 0;
    velocity.z = 0;
    planeRotation = 0;
    bankingVelocity = 0; // Reset ook de banking velocity
    
    console.log('Spel gereset!');
}

function backToStartScreen() {
    gameStarted = false;
    startScreen.classList.remove('hidden');
    resetGame();
}

function updatePlaneMovement() {
    if (!gameStarted || !playerPlane) return; // Check if plane model is loaded
    
    if (keys['KeyA'] || keys['ArrowLeft']) {
        planeRotation -= 0.05; 
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        planeRotation += 0.05;
    }
    
    const forwardX = Math.sin(planeRotation);
    const forwardZ = -Math.cos(planeRotation); 
    
    // Automatische voorwaartse beweging met snelheidsmultiplier
    let moveSpeed = baseSpeed * speedMultiplier;
    
    // W toets voor extra snelheid
    if (keys['KeyW'] ) {
        moveSpeed = moveSpeed * 1.5; 
    }
    // S toets voor remmen/achteruit
    if (keys['KeyS'] ) {
        moveSpeed = moveSpeed * 0.3; 
    }
    
    planePosition.x += forwardX * moveSpeed;
    planePosition.z += forwardZ * moveSpeed;
    
    if (keys['Space']|| keys['ArrowUp']) velocity.y += 0.02; 
    if (keys['ShiftLeft']|| keys['ArrowDown']) velocity.y -= 0.02; 
    
    planePosition.y += velocity.y;
    velocity.y *= 0.95;
    
    // Dynamische grondcollisie - nu met echte shader terrein hoogte
    const terrainHeight = getTerrainHeight(planePosition.x, planePosition.z);
    const minHeightAboveTerrain = 0.5;
    const minGroundLevel = terrainHeight + minHeightAboveTerrain;
    
    if (planePosition.y < minGroundLevel) {
        planePosition.y = minGroundLevel;
        velocity.y = Math.max(0, velocity.y); // Stop negatieve velocity bij grond
        
        // Zachte bounce effect bij grondcontact
        if (velocity.y <= 0) {
            velocity.y = 0.01; // Kleine upward bounce
        }
    }
    
    playerPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
    
    // Banking rotatie voor links/rechts draaien (nu met smooth velocity)
    let targetBanking = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        targetBanking = 0.3; // Links kantelen
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        targetBanking = -0.3;  // Rechts kantelen
    }
    
    // Smooth banking met velocity (net zoals bij verticale beweging)
    const bankingDifference = targetBanking - (bankingVelocity * 15); // 15 is scale factor
    bankingVelocity += bankingDifference * 0.008; // Geleidelijke aanpassing
    bankingVelocity *= 0.9; // Smooth fade out
    
    const bankingRotation = bankingVelocity * 15;
    
    // Pitch rotatie voor omhoog/omlaag beweging
    let pitchRotation = 0;
    if (keys['Space']|| keys['ArrowUp']) {
        pitchRotation = 0.15;
    } else if (keys['ShiftLeft']|| keys['ArrowDown']) {
        pitchRotation = -0.15;
    }
    
    // Ook gebaseerd op verticale snelheid
    pitchRotation += velocity.y * 2.0;
    
    // Gebruik quaternions voor correcte rotatie combinatie
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -planeRotation);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRotation);
    const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankingRotation);
    
    // Combineer de rotaties in de juiste volgorde: eerst yaw, dan pitch, dan roll
    const finalQuaternion = new THREE.Quaternion()
        .multiplyQuaternions(yawQuaternion, pitchQuaternion)
        .multiply(rollQuaternion);
    
    playerPlane.quaternion.copy(finalQuaternion);
}

// ------------------- Terrain Height Calculation -------------------
// Exacte implementatie van shader Hash en Noise functies
const MOD2 = { x: 3.07965, y: 7.4235 };

function fract(x) {
    return x - Math.floor(x);
}



function Hash(p) {
    if (typeof p === 'number') {
        // Hash(float p) GLSL: 
        // vec2 p2 = fract(vec2(p)/MOD2);
        // p2 += dot(p2.yx, p2.xy+19.19);
        // return fract(p2.x*p2.y);
        
        let p2 = {
            x: fract(p / MOD2.x),
            y: fract(p / MOD2.y)
        };
        
        // dot(p2.yx, p2.xy+19.19) waar p2.yx = (p2.y, p2.x) en p2.xy+19.19 = (p2.x + 19.19, p2.y + 19.19)
        // dot product: p2.y * (p2.x + 19.19) + p2.x * (p2.y + 19.19)
        const dotVal = p2.y * (p2.x + 19.19) + p2.x * (p2.y + 19.19);
        p2.x += dotVal;
        p2.y += dotVal;
        
        return fract(p2.x * p2.y);
    } else {
        // Hash(vec2 p) GLSL:
        // p = fract(p / MOD2);
        // p += dot(p.xy, p.yx+19.19);
        // return fract(p.x * p.y);
        
        let px = fract(p.x / MOD2.x);
        let py = fract(p.y / MOD2.y);
        
        // dot(p.xy, p.yx+19.19) waar p.xy = (px, py) en p.yx+19.19 = (py + 19.19, px + 19.19) 
        // dot product: px * (py + 19.19) + py * (px + 19.19)
        const dotVal = px * (py + 19.19) + py * (px + 19.19);
        px += dotVal;
        py += dotVal;
        
        return fract(px * py);
    }
}

function Noise(x) {
    const p = { x: Math.floor(x.x), y: Math.floor(x.y) };
    const f = { x: x.x - p.x, y: x.y - p.y };
    
    // Smooth interpolation f = f*f*(3.0-2.0*f)
    f.x = f.x * f.x * (3.0 - 2.0 * f.x);
    f.y = f.y * f.y * (3.0 - 2.0 * f.y);
    
    const n = p.x + p.y * 57.0;
    
    // Bilinear interpolation zoals in shader
    const h1 = Hash(n + 0.0);
    const h2 = Hash(n + 1.0);
    const h3 = Hash(n + 57.0);
    const h4 = Hash(n + 58.0);
    
    const mix1 = h1 + f.x * (h2 - h1);
    const mix2 = h3 + f.x * (h4 - h3);
    
    return mix1 + f.y * (mix2 - mix1);
}

function getTerrainHeight(x, z) {
    // Exacte implementatie van shader Terrain functie (Map gebruikt p.y - Terrain(p.xz).x)
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

// ------------------- Ring Collision Check -------------------
function checkRingCollisions() {
    if (!playerPlane) return; // Check if plane model is loaded
    
    rings.forEach(ring => {
        if (!ring.userData.passed) {
            const ringCenter = ring.position;
            const planePos = playerPlane.position;
            
            // Simpele en betrouwbare collision detectie
            const dx = planePos.x - ringCenter.x;
            const dy = planePos.y - ringCenter.y;
            const dz = planePos.z - ringCenter.z;
            
            // Afstand tot ring centrum
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Veel ruimere en simpelere check - gewoon binnen een sphere rond de ring
            const collisionRadius = 6.0; // Grote collision zone
            
            if (distance < collisionRadius) {
                // Extra check: zijn we redelijk binnen het vlak van de ring? (Y hoogte)
                const heightDiff = Math.abs(dy);
                const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                
                // Veel ruimere toleranties
                if (heightDiff < 4.0 && horizontalDist < 6.0) {
                    ring.userData.passed = true;
                    ring.userData.glowIntensity = 1.0;
                    
                    // Verhoog snelheid bij elke ring (max 10 ringen)
                    const ringsPassedCount = rings.filter(r => r.userData.passed).length;
                    speedMultiplier = 1.0 + (ringsPassedCount * 0.5); // +50% per ring
                    
                    // Unieke effecten per ring
                    activateRingEffect(ring.userData.index);
                    
                    // Verander ring kleur per type
                    const ringColors = [0xff4444, 0x44ff44, 0xff44ff, 0x4444ff, 0xffff44, 0x44ffff, 0xff8844, 0x88ff44, 0xff4488, 0x4488ff];
                    ring.material.color.setHex(ringColors[ring.userData.index] || 0x00ff00);
                    
                    console.log(`🎯 Ring ${ring.userData.index + 1}/10 gepasseerd! Snelheid: ${speedMultiplier.toFixed(1)}x`);
                    score.textContent = ringsPassedCount;
                    
                    // Check voor game completion
                    if (ringsPassedCount >= 10) {
                        console.log("🎉 Gefeliciteerd! Alle ringen gepasseerd!");
                        setTimeout(() => {
                            alert("Gefeliciteerd! Je hebt alle 10 ringen gepasseerd!\nDruk op R om opnieuw te spelen.");
                        }, 1000);
                    }
                }
            }
        }
        
        // Animeer de glow intensity
        if (ring.userData.glowIntensity > 0) {
            ring.userData.glowIntensity *= 0.95;
            ring.material.opacity = 0.8 + ring.userData.glowIntensity * 0.2;
        }
    });
}

function activateRingEffect(ringIndex) {
    // Reset alle effecten eerst (behalve tijdelijk effecten)
    const effects = {
        speed: shaderMaterial.uniforms.uSpeedMultiplier,
        color: shaderMaterial.uniforms.uColorFilter,
        psychedelic: shaderMaterial.uniforms.uPsychedelicMode,
        waves: shaderMaterial.uniforms.uWaveIntensity,
        glitch: shaderMaterial.uniforms.uGlitchMode,
        nightVision: shaderMaterial.uniforms.uNightVision
    };
    
    switch(ringIndex) {
        case 0: // Storm effecten - rood
            effects.speed.value = 1.0;
            setTimeout(() => { effects.speed.value = 0.0; }, 8000);
            console.log("⛈️ Storm geactiveerd!");
            break;
            
        case 1: // Kleurfilter - groen  
            effects.color.value.set(0.3, 1.2, 0.7);
            setTimeout(() => { effects.color.value.set(1, 1, 1); }, 8000);
            console.log("🎨 Groen kleurfilter geactiveerd!");
            break;
            
        case 2: // Psychedelische modus - magenta
            effects.psychedelic.value = 1.0;
            setTimeout(() => { effects.psychedelic.value = 0.0; }, 10000);
            console.log("🌈 Psychedelische modus geactiveerd!");
            break;
            
        case 3: // Golfeffecten - blauw
            effects.waves.value = 0.8;
            setTimeout(() => { effects.waves.value = 0.0; }, 7000);
            console.log("🌊 Golfeffecten geactiveerd!");
            break;
            
        case 4: // Glitch modus - geel
            effects.glitch.value = 0.6;
            setTimeout(() => { effects.glitch.value = 0.0; }, 6000);
            console.log("⚡ Glitch modus geactiveerd!");
            break;
            
        case 5: // Nachtzicht - cyaan  
            effects.nightVision.value = 1.5;
            setTimeout(() => { effects.nightVision.value = 0.0; }, 12000);
            console.log("👁️ Nachtzicht geactiveerd!");
            break;
            
        case 6: // Extra storm - oranje
            effects.speed.value = 1.2;
            effects.color.value.set(1.3, 0.8, 0.4);
            setTimeout(() => { 
                effects.speed.value = 0.0; 
                effects.color.value.set(1, 1, 1); 
            }, 6000);
            console.log("🌪️ Intense storm geactiveerd!");
            break;
            
        case 7: // Groene mist - lichtgroen
            effects.color.value.set(0.5, 1.5, 0.8);
            effects.waves.value = 0.4;
            setTimeout(() => { 
                effects.color.value.set(1, 1, 1); 
                effects.waves.value = 0.0; 
            }, 9000);
            console.log("🌫️ Groene mist geactiveerd!");
            break;
            
        case 8: // Roze droomwereld - roze
            effects.psychedelic.value = 0.7;
            effects.color.value.set(1.4, 0.6, 1.2);
            setTimeout(() => { 
                effects.psychedelic.value = 0.0; 
                effects.color.value.set(1, 1, 1); 
            }, 8000);
            console.log("💗 Roze droomwereld geactiveerd!");
            break;
            
        case 9: // Finale effect - blauw
            effects.glitch.value = 0.8;
            effects.nightVision.value = 1.0;
            effects.waves.value = 0.6;
            setTimeout(() => { 
                effects.glitch.value = 0.0; 
                effects.nightVision.value = 0.0; 
                effects.waves.value = 0.0; 
            }, 15000);
            console.log("🎆 FINALE EFFECT! Alle effecten gecombineerd!");
            break;
    }
    
    // Dag/nacht wissel blijft voor alle ringen
    targetTimeOfDay = targetTimeOfDay > 0.5 ? 0.1 : 0.9;
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
    if (!playerPlane) return; // Check if plane model is loaded
    
    const planeRotationSin = Math.sin(planeRotation);
    const planeRotationCos = Math.cos(planeRotation);
    
    // Camera positie voor shader
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
    
    // Update shader uniforms
    shaderMaterial.uniforms.uCameraPos.value.copy(cameraPos);
    shaderMaterial.uniforms.uCameraTarget.value.copy(cameraTarget);
    
    // 3D Camera positie
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
    
    // Update animation mixer
    if (mixer) {
        mixer.update(0.016); // ~60fps
    }
}

function animateRings(time) {
    rings.forEach((ring, index) => {
        ring.rotation.z += 0.01;
        
        // Pulseer effect voor niet-gepasseerde ringen
        if (!ring.userData.passed) {
            const pulse = Math.sin(time * 0.003 + index) * 0.1 + 1.0;
            ring.scale.setScalar(pulse);
            
            // Visuele feedback als vliegtuig dichtbij is
            if (playerPlane) {
                const distance = playerPlane.position.distanceTo(ring.position);
                if (distance < 10.0) { // Ruimere detection zone voor visuele feedback
                    const proximity = 1.0 - (distance / 10.0); // 0 tot 1
                    ring.material.opacity = 0.9 + proximity * 0.4; // Wordt veel helderder
                    
                    // Extra glow effect voor zeer dichtbije ringen
                    if (distance < 6.0) {
                        ring.material.color.setHex(0x00ffaa); // Groeniger glow
                        const glowPulse = Math.sin(time * 0.02) * 0.3 + 0.7;
                        ring.scale.setScalar(pulse + glowPulse * 0.3);
                    }
                } else {
                    // Reset naar normale staat als je verder weg bent
                    if (!ring.userData.passed) {
                        ring.material.opacity = 0.9;
                        ring.material.color.setHex(0x00ffff);
                    }
                }
            }
        }
    });
}

function render() {
    // Render shader achtergrond eerst
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    
    // Render 3D objecten eroverheen
    renderer.clearDepth();
    renderer.render(scene, camera);
}

// ------------------- Animate -------------------
function animate(time){
    animationId = requestAnimationFrame(animate);
    
    // Game logic (alleen als spel gestart is)
    if (gameStarted) {
        updatePlaneMovement();
        checkRingCollisions();
        currentTimeOfDay += (targetTimeOfDay - currentTimeOfDay) * timeTransitionSpeed;
        
        // Update speed display
        if (speedDisplay) {
            speedDisplay.textContent = speedMultiplier.toFixed(1);
        }
    }
    
    // Visuele updates (altijd)
    updateShaderUniforms(time);
    updateCamera();
    animateRings(time);
    render();
}

// Start de animatie direct
animate();