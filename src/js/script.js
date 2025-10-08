
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';


// import plasmaBufferShader from './shaders/plasma/buffer.glsl?raw';
// import landscapeFragmentShader from './shaders/fragment.glsl?raw';
import landscapeFragmentShader from './shaders/fragment.glsl?raw';
import landscapeVertexShader from './shaders/vertex.glsl?raw';

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
        uCameraTarget: { value: new THREE.Vector3(0, 2, 0) }
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
});

function updatePlaneMovement() {
    if (keys['KeyA'] || keys['ArrowLeft']) {
        planeRotation -= 0.05; 
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        planeRotation += 0.05;
    }
    
    const forwardX = Math.sin(planeRotation);
    const forwardZ = -Math.cos(planeRotation); 
    
    let moveSpeed = 0;
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveSpeed = 0.3; 
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveSpeed = -0.05; 
    }
    
    if (moveSpeed !== 0) {
        planePosition.x += forwardX * moveSpeed;
        planePosition.z += forwardZ * moveSpeed;
    }
    
    if (keys['Space']) velocity.y += 0.02; 
    if (keys['ShiftLeft']) velocity.y -= 0.002; 
    
    planePosition.y += velocity.y;
    velocity.y *= 0.95;
    
    playerPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
    
    playerPlane.rotation.y = -planeRotation; 
    
    let bankingRotation = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        bankingRotation = 0.3; 
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        bankingRotation = -0.3;     }
    
    playerPlane.rotation.z = bankingRotation; 
    playerPlane.rotation.x = 0; 
}

// ------------------- Resize -------------------
window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
});

// ------------------- Animate -------------------
function animate(time){
    requestAnimationFrame(animate);
    
    updatePlaneMovement();
    
    const cameraOffset = new THREE.Vector3(
        -Math.sin(planeRotation) * 3, 
        1,                           
        Math.cos(planeRotation) * 3   
    );
    const cameraPos = playerPlane.position.clone().add(cameraOffset);
    
    const lookAhead = new THREE.Vector3(
        Math.sin(planeRotation) * 2, 
        0,                            
        -Math.cos(planeRotation) * 2   
    );
    const cameraTarget = playerPlane.position.clone().add(lookAhead);
    
    shaderMaterial.uniforms.iTime.value = time*0.001;
    shaderMaterial.uniforms.iMouse.value.set(mouse.x, mouse.y);
    shaderMaterial.uniforms.uCameraPos.value.copy(cameraPos);
    shaderMaterial.uniforms.uCameraTarget.value.copy(cameraTarget);
    
    const camera3DOffset = new THREE.Vector3(
        -Math.sin(planeRotation) * 5, 
        2,                             
        Math.cos(planeRotation) * 5    
    );
    camera.position.copy(playerPlane.position.clone().add(camera3DOffset));
    
    const lookTarget = new THREE.Vector3(
        playerPlane.position.x + Math.sin(planeRotation) * 3,  
        playerPlane.position.y,
        playerPlane.position.z - Math.cos(planeRotation) * 3   
    );
    camera.lookAt(lookTarget);
    
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    
    renderer.clearDepth();
    renderer.render(scene, camera);
}

animate();