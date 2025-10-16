
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

import landscapeFragmentShader from './shaders/fragment.glsl?raw';
import landscapeVertexShader from './shaders/vertex.glsl?raw';

// ------------------- Game State -------------------
let gameStarted = false;
let animationId = null;

// ------------------- Start Screen Management -------------------
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const score = document.getElementById('score');

startButton.addEventListener('click', () => {
    startGame();
});

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');

    gameArea.classList.remove('hidden');
    
    // Animatie draait al, geen nieuwe start nodig
}

// ------------------- Renderer & Scene -------------------

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ------------------- Shader Background -------------------
const shaderGeometry = new THREE.PlaneGeometry(2, 2);
const shaderMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
        iMouse: { value: new THREE.Vector2(0,0) },
        uCameraPos: { value: new THREE.Vector3(0, 2, 5) },
        uCameraTarget: { value: new THREE.Vector3(0, 2, 0) },
        uTimeOfDay: { value: 0.5 } // 0 = nacht, 1 = dag
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
const planeGeometry = new THREE.BoxGeometry(0.5,0.2,1);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const playerPlane = new THREE.Mesh(planeGeometry, planeMaterial);
playerPlane.position.set(0,0,0);
scene.add(playerPlane);



// ------------------- Ringen System -------------------
const rings = [];
const ringPositions = [
    { x: 0, y: 20, z: -10 },
    { x: 8, y: 18, z: -25 },
    { x: -5, y: 25, z: -40 },
    { x: 12, y: 30, z: -60 },
    { x: -8, y: 35, z: -80 },
    { x: 3, y: 40, z: -100 }
];

const ringGeometry = new THREE.TorusGeometry(3, 0.3, 8, 100);
const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, 
    transparent: true, 
    opacity: 0.8,
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
const mouse = new THREE.Vector2();
const planePosition = { x: 0, y: 0, z: 0 };
const velocity = { x: 0, y: 0, z: 0 };
let planeRotation = 0; 
const speed = 0.1;

window.addEventListener('mousemove', (event)=>{
    mouse.x = (event.clientX/window.innerWidth)*2-1;
    mouse.y = -(event.clientY/window.innerHeight)*2+1;
});

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
        ring.material.opacity = 0.8;
    });
    currentTimeOfDay = 1.0;
    targetTimeOfDay = 1.0;
    
    // Reset vliegtuig positie
    planePosition.x = 0;
    planePosition.y = 0;
    planePosition.z = 0;
    velocity.x = 0;
    velocity.y = 0;
    velocity.z = 0;
    planeRotation = 0;
    
    console.log('Spel gereset!');
}

function backToStartScreen() {
    gameStarted = false;
    startScreen.classList.remove('hidden');
    resetGame();
}

function updatePlaneMovement() {
    if (!gameStarted) return;
    
    if (keys['KeyA'] || keys['ArrowLeft']) {
        planeRotation -= 0.05; 
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        planeRotation += 0.05;
    }
    
    const forwardX = Math.sin(planeRotation);
    const forwardZ = -Math.cos(planeRotation); 
    
    let moveSpeed = 0;
    if (keys['KeyW'] ) {
        moveSpeed = 0.2; 
    }
    if (keys['KeyS'] ) {
        moveSpeed = -0.2; 
    }
    
    if (moveSpeed !== 0) {
        planePosition.x += forwardX * moveSpeed;
        planePosition.z += forwardZ * moveSpeed;
    }
    
    if (keys['Space']|| keys['ArrowUp']) velocity.y += 0.02; 
    if (keys['ShiftLeft']|| keys['ArrowDown']) velocity.y -= 0.02; 
    
    planePosition.y += velocity.y;
    velocity.y *= 0.95;
    
    playerPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
    
    playerPlane.rotation.y = -planeRotation; 
    
    let bankingRotation = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        bankingRotation = 0.1; 
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        bankingRotation = -0.1;     }
    
    playerPlane.rotation.z = bankingRotation; 
    playerPlane.rotation.x = 0; 
}

// ------------------- Ring Collision Check -------------------
function checkRingCollisions() {
    rings.forEach(ring => {
        if (!ring.userData.passed) {
            const distance = playerPlane.position.distanceTo(ring.position);
            
            // Check of het vliegtuig dicht genoeg bij de ring is
            if (distance < 3.5) {
                // Check of het vliegtuig door het midden van de ring vliegt
                const ringCenter = ring.position;
                const planePos = playerPlane.position;
                
                // Check hoogte verschil (Y-as)
                const heightDiff = Math.abs(planePos.y - ringCenter.y);
                
                // Check horizontale afstand van het centrum
                const horizontalDist = Math.sqrt(
                    Math.pow(planePos.x - ringCenter.x, 2) + 
                    Math.pow(planePos.z - ringCenter.z, 2)
                );
                
                if (heightDiff < 1.5 && horizontalDist < 2.5) {
                    ring.userData.passed = true;
                    ring.userData.glowIntensity = 1.0;
                    
                    // Wissel tussen dag en nacht
                    targetTimeOfDay = targetTimeOfDay > 0.5 ? 0.1 : 0.9;
                    
                    // Verander ring kleur om aan te geven dat hij gepasseerd is
                    ring.material.color.setHex(0x00ff00);
                    
                    console.log(`Ring ${ring.userData.index} gepasseerd! Tijd verandert naar ${targetTimeOfDay > 0.5 ? 'dag' : 'nacht'}`);
                    score.textContent = parseInt(score.textContent) + 1;
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

// ------------------- Resize -------------------
window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
});

// ------------------- Camera & Rendering Functions -------------------
function updateCamera() {
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
    shaderMaterial.uniforms.iMouse.value.set(mouse.x, mouse.y);
    shaderMaterial.uniforms.uTimeOfDay.value = currentTimeOfDay;
}

function animateRings(time) {
    rings.forEach((ring, index) => {
        ring.rotation.z += 0.01;
        
        // Pulseer effect voor niet-gepasseerde ringen
        if (!ring.userData.passed) {
            const pulse = Math.sin(time * 0.003 + index) * 0.1 + 1.0;
            ring.scale.setScalar(pulse);
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
    }
    
    // Visuele updates (altijd)
    updateShaderUniforms(time);
    updateCamera();
    animateRings(time);
    render();
}

// Start de animatie direct
animate();