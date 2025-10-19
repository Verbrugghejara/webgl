import * as THREE from 'three';

export const ringSystemState = {
    rings: [],
    nextRingIndex: 0,
    isStorming: false,
    scene: null
};

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

export function initRingSystem(scene) {
    ringSystemState.scene = scene;
    createRings();
}

function createRings() {
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
        ringSystemState.rings.push(ring);
        ringSystemState.scene.add(ring);
    });
}

export function hideRings() {
    ringSystemState.rings.forEach(ring => {
        ring.visible = false;
    });
}

export function showRings() {
    ringSystemState.rings.forEach(ring => {
        ring.visible = true;
    });
}

export function resetRings(isFreeFlightMode = false) {
    ringSystemState.rings.forEach(ring => {
        ring.userData.passed = false;
        ring.userData.glowIntensity = 0;
        ring.material.color.setHex(0x00ffff);
        ring.material.opacity = 0.9;
        ring.visible = !isFreeFlightMode;
    });
    
    ringSystemState.nextRingIndex = 0;
    ringSystemState.isStorming = false;
}

export function animateRings(time, playerPlane, isFreeFlightMode) {
    if (isFreeFlightMode) return;
    
    ringSystemState.rings.forEach((ring, index) => {
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
        
        if (ring.userData.glowIntensity > 0) {
            ring.userData.glowIntensity *= 0.95;
            ring.material.opacity = 0.8 + ring.userData.glowIntensity * 0.2;
        }
    });
}

export function checkCollisions(playerPlane, gameState, shaderMaterial) {
    if (!playerPlane || gameState.isFreeFlightMode) return null;
    
    let collisionResult = null;
    
    ringSystemState.rings.forEach((ring, index) => {
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
                    handleRingPassed(ring, index, shaderMaterial);
                    collisionResult = {
                        type: 'ringPassed',
                        ringIndex: index,
                        ringsPassedCount: getRingsPassedCount()
                    };
                }
            }
        }
    });
    
    checkMissedRings(playerPlane, gameState, shaderMaterial);
    return collisionResult;
}

function handleRingPassed(ring, index, shaderMaterial) {
    ring.userData.passed = true;
    ring.userData.glowIntensity = 1.0;
    
    if (index === ringSystemState.nextRingIndex) {
        if (ringSystemState.isStorming) {
            ringSystemState.isStorming = false;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
        }
        ringSystemState.nextRingIndex++;
    } else {
        if (index > ringSystemState.nextRingIndex && ringSystemState.isStorming) {
            ringSystemState.isStorming = false;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
        }
        ringSystemState.nextRingIndex = index + 1;
    }
    
    ring.material.color.setHex(0x00ff00);
}

function checkMissedRings(playerPlane, gameState, shaderMaterial) {
    if (!playerPlane || gameState.isFreeFlightMode) return;
    
    if (ringSystemState.nextRingIndex < ringSystemState.rings.length) {
        const nextRing = ringSystemState.rings[ringSystemState.nextRingIndex];
        const planeZ = playerPlane.position.z;
        const ringZ = nextRing.position.z;
        
        if (planeZ < ringZ - 15 && !nextRing.userData.passed) {
            nextRing.material.color.setHex(0xff0000);
            
            if (ringSystemState.nextRingIndex === 9 && !gameState.lastRingReached) {
                return {
                    type: 'lastRingMissed',
                    ringIndex: ringSystemState.nextRingIndex
                };
            } else {
                if (!ringSystemState.isStorming) {
                    ringSystemState.isStorming = true;
                    shaderMaterial.uniforms.uSpeedMultiplier.value = 1.5;
                }
            }
            
            ringSystemState.nextRingIndex++;
        }
    }
    
    return null;
}

export function getRingsPassedCount() {
    return ringSystemState.rings.filter(r => r.userData.passed).length;
}