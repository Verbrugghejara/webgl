import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createPlaneController(scene) {
    let playerPlane = null;
    let mixer = null;
    const loader = new GLTFLoader();
    
    const planePosition = { x: 0, y: 0, z: 0 };
    const velocity = { y: 0 };
    let planeRotation = 0;
    let bankingVelocity = 0;
    const maxAltitude = 150;
    
    const keys = {};
    
    const setupInputHandlers = () => {
        window.addEventListener('keydown', (event) => {
            keys[event.code] = true;
        });
        
        window.addEventListener('keyup', (event) => {
            keys[event.code] = false;
        });
    };
    
    const setupLoadedModel = (model, gltf) => {
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
    };
    
    const tryFallbackPaths = () => {
        return new Promise((resolve, reject) => {
            loader.load(
                './assets/airplane.glb',
                (gltf) => {
                    const model = gltf.scene;
                    setupLoadedModel(model, gltf);
                    resolve(model);
                },
                undefined,
                () => {
                    loader.load(
                        './src/assets/blender/airplane.glb',
                        (gltf) => {
                            const model = gltf.scene;
                            setupLoadedModel(model, gltf);
                            resolve(model);
                        },
                        undefined,
                        reject
                    );
                }
            );
        });
    };
    
    const createFallbackPlane = () => {
        const planeGeometry = new THREE.BoxGeometry(0.5, 0.2, 1);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        playerPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        playerPlane.position.set(0, 0, 0);
        scene.add(playerPlane);
    };
    
    const loadAirplaneModel = async () => {
        return new Promise((resolve, reject) => {
            loader.load(
                './src/assets/blender/airplane.glb',
                (gltf) => {
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
                    resolve(model);
                },
                undefined,
                (error) => {
                    console.warn('Failed to load from ./assets/, trying fallback paths...');
                    tryFallbackPaths().then(resolve).catch(() => {
                        console.error('Failed to load airplane model:', error);
                        createFallbackPlane();
                        resolve(playerPlane);
                    });
                }
            );
        });
    };
    
    const updateBankingAndRotation = () => {
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
        if (keys['Space'] || keys['ArrowUp']) {
            pitchRotation = 0.15;
        } else if (keys['ShiftLeft'] || keys['ArrowDown']) {
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
    };
    
    const updateMovement = (gameState, getTerrainHeight) => {
        if ((!gameState.gameStarted && !gameState.isFinishingFlight) || !playerPlane) return;
        
        if (keys['KeyA'] || keys['ArrowLeft']) {
            planeRotation -= 0.05;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            planeRotation += 0.05;
        }
        
        const forwardX = Math.sin(planeRotation);
        const forwardZ = -Math.cos(planeRotation);
        
        let moveSpeed = gameState.baseSpeed * gameState.speedMultiplier;
        
        if (keys['KeyW']) {
            moveSpeed = moveSpeed * 1.5;
        }
        if (keys['KeyS']) {
            moveSpeed = moveSpeed * 0.3;
        }
        
        planePosition.x += forwardX * moveSpeed;
        planePosition.z += forwardZ * moveSpeed;
        
        if (keys['Space'] || keys['ArrowUp']) velocity.y += 0.02;
        if (keys['ShiftLeft'] || keys['ArrowDown']) velocity.y -= 0.02;
        
        planePosition.y += velocity.y;
        velocity.y *= 0.95;
        
        if (planePosition.y > maxAltitude) {
            planePosition.y = maxAltitude;
            velocity.y = Math.min(0, velocity.y);
            
            if (velocity.y >= 0) {
                velocity.y = -0.01;
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
        
        updateBankingAndRotation();
    };
    
    const updateAnimation = (deltaTime = 0.016) => {
        if (mixer) {
            mixer.update(deltaTime);
        }
    };
    
    const resetPosition = () => {
        planePosition.x = 0;
        planePosition.y = 0;
        planePosition.z = 0;
        velocity.y = 0;
        planeRotation = 0;
        bankingVelocity = 0;
        
        if (playerPlane) {
            playerPlane.position.set(0, 0, 0);
            playerPlane.quaternion.set(0, 0, 0, 1);
        }
    };
    
    const getPosition = () => {
        return planePosition;
    };
    
    const getRotation = () => {
        return planeRotation;
    };
    
    const getPlane = () => {
        return playerPlane;
    };
    
    const getMaxAltitude = () => {
        return maxAltitude;
    };
    
    setupInputHandlers();
    
    return {
        loadAirplaneModel,
        updateMovement,
        updateAnimation,
        resetPosition,
        getPosition,
        getRotation,
        getPlane,
        getMaxAltitude
    };
}