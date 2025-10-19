import * as THREE from 'three';

export function createShaderManager(landscapeVertexShader, landscapeFragmentShader) {
    let currentTimeOfDay = 1.0;
    let targetTimeOfDay = 1.0;
    const timeTransitionSpeed = 0.02;
    let shaderMaterial;
    let backgroundScene;
    let backgroundCamera;
    let shaderPlane;
    
    function setupShaderMaterial(vertexShader, fragmentShader) {
        const shaderGeometry = new THREE.PlaneGeometry(2, 2);
        shaderMaterial = new THREE.RawShaderMaterial({
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
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        });
        
        shaderPlane = new THREE.Mesh(shaderGeometry, shaderMaterial);
        shaderPlane.position.set(0, 0, 0);
    }
    
    function setupScenes() {
        backgroundScene = new THREE.Scene();
        backgroundScene.add(shaderPlane);
    }
    
    function setupCamera() {
        backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        backgroundCamera.position.z = 0.5;
    }
    
    setupShaderMaterial(landscapeVertexShader, landscapeFragmentShader);
    setupScenes();
    setupCamera();
    
    return {
        updateUniforms(time) {
            shaderMaterial.uniforms.iTime.value = time * 0.001;
            shaderMaterial.uniforms.uTimeOfDay.value = currentTimeOfDay;
            currentTimeOfDay += (targetTimeOfDay - currentTimeOfDay) * timeTransitionSpeed;
        },
        
        updateResolution(width, height) {
            shaderMaterial.uniforms.iResolution.value.set(width, height, 1);
        },
        
        setStormMode(active) {
            if (active) {
                shaderMaterial.uniforms.uSpeedMultiplier.value = 1.5;
                targetTimeOfDay = 0.2;
            } else {
                shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
                targetTimeOfDay = 0.8;
            }
        },
        
        setDayMode() {
            targetTimeOfDay = 1.0;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
        },
        
        setNightMode() {
            targetTimeOfDay = 0.1;
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
        },
        
        resetEffects() {
            currentTimeOfDay = 1.0;
            targetTimeOfDay = 1.0;
            
            shaderMaterial.uniforms.uSpeedMultiplier.value = 0.0;
            shaderMaterial.uniforms.uColorFilter.value.set(1, 1, 1);
            shaderMaterial.uniforms.uPsychedelicMode.value = 0.0;
            shaderMaterial.uniforms.uWaveIntensity.value = 0.0;
            shaderMaterial.uniforms.uGlitchMode.value = 0.0;
            shaderMaterial.uniforms.uNightVision.value = 0.0;
        },
        
        renderBackground(renderer) {
            renderer.render(backgroundScene, backgroundCamera);
        },
        
        getShaderMaterial() {
            return shaderMaterial;
        },
        
        updateCamera(planeController) {
            if (!planeController.getPlane()) return;
            
            const planePosition = planeController.getPosition();
            const planeRotation = planeController.getRotation();
            
            const planeRotationSin = Math.sin(planeRotation);
            const planeRotationCos = Math.cos(planeRotation);
            
            const cameraPos = new THREE.Vector3(
                planePosition.x + (-planeRotationSin * 3),
                planePosition.y + 1,
                planePosition.z + (planeRotationCos * 3)
            );
            
            const cameraTarget = new THREE.Vector3(
                planePosition.x + (planeRotationSin * 2),
                planePosition.y,
                planePosition.z + (-planeRotationCos * 2)
            );
            
            shaderMaterial.uniforms.uCameraPos.value.copy(cameraPos);
            shaderMaterial.uniforms.uCameraTarget.value.copy(cameraTarget);
        }
    };
}