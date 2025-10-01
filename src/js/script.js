
import * as THREE from 'three';
// ------------------- Renderer & Scene -------------------

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ------------------- Shader Background -------------------
const shaderGeometry = new THREE.PlaneGeometry(2, 2);
const shaderMaterial = new THREE.RawShaderMaterial({
    vertexShader: `
    precision mediump float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    fragmentShader: `
// Rolling hills shader (Shadertoy port)
precision mediump float;
uniform float iTime;
uniform vec3 iResolution;
uniform vec2 iMouse;
uniform vec3 uCameraPos;
uniform vec3 uCameraTarget;
varying vec2 vUv;

#define THRESHOLD .003
#define MOD2 vec2(3.07965, 7.4235)
vec3 sunLight = normalize(vec3(0.35,0.2,0.3));
vec3 cameraPos;
vec3 sunColour = vec3(1.0, .75, .6);
float PI = 3.1415926;

// Hash and Noise
float Hash(float p){
    vec2 p2 = fract(vec2(p)/MOD2);
    p2 += dot(p2.yx, p2.xy+19.19);
    return fract(p2.x*p2.y);
}
float Hash(vec2 p){
    p  = fract(p / MOD2);
    p += dot(p.xy, p.yx+19.19);
    return fract(p.x * p.y);
}
float Noise(in vec2 x){
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0;
    float res = mix(mix(Hash(n+0.0), Hash(n+1.0), f.x),
                    mix(Hash(n+57.0), Hash(n+58.0), f.x), f.y);
    return res;
}
vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031,.1030,.0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}
vec2 Voronoi(in vec2 x){
    vec2 p = floor(x);
    vec2 f = fract(x);
    float res=100.0; vec2 id;
    for(int j=-1;j<=1;j++)
    for(int i=-1;i<=1;i++){
        vec2 b = vec2(float(i), float(j));
        vec2 r = b-f+hash22(p+b);
        float d = dot(r,r);
        if(d<res){ res=d; id.x=Hash(p+b);}
    }
    return vec2(max(.4-sqrt(res),0.0),id.x);
}
vec2 Terrain(in vec2 p){
    float type=0.0;
    vec2 pos = p*0.003;
    float w = 50.0; float f = .0;
    for(int i=0;i<3;i++){
        f+=Noise(pos)*w;
        w*=0.62;
        pos*=2.5;
    }
    return vec2(f,type);
}
vec2 Map(in vec3 p){
    vec2 h = Terrain(p.xz);
    return vec2(p.y - h.x, h.y);
}
float FractalNoise(in vec2 xy){
    float w=.7; float f=0.0;
    for(int i=0;i<3;i++){ f+=Noise(xy)*w; w*=0.6; xy*=2.0;}
    return f;
}
vec3 GetSky(in vec3 rd){
    float sunAmount = max(dot(rd,sunLight),0.0);
    float v = pow(1.0-max(rd.y,0.0),6.0);
    vec3 sky = mix(vec3(.1,.2,.3), vec3(.32,.32,.32), v);
    sky += sunColour * sunAmount*sunAmount*0.25;
    sky += sunColour * min(pow(sunAmount,800.0)*1.5,.3);
    return clamp(sky,0.0,1.0);
}
vec3 ApplyFog(in vec3 rgb, in float dis, in vec3 dir){
    float fogAmount = clamp(dis*dis*0.0000012,0.0,1.0);
    return mix(rgb, GetSky(dir), fogAmount);
}
vec3 DE(vec3 p){
    float base = Terrain(p.xz).x - 1.9;
    float height = Noise(p.xz*2.0)*.75 + Noise(p.xz)*.35 + Noise(p.xz*.5)*.2;
    float y = p.y-base-height; y=y*y;
    vec2 ret = Voronoi((p.xz*2.5+sin(y*2.0+p.zx*12.3)*.12+vec2(sin(iTime*1.3+1.5*p.z),sin(iTime*2.6+1.5*p.x))*y*.5));
    float f=ret.x*0.65 + y*0.5;
    return vec3(y-f*1.4, clamp(f*1.1,0.0,1.0), ret.y);
}
float CircleOfConfusion(float t){ return max(t*.04,(2.0/iResolution.y)*(1.0+t)); }
float Linstep(float a,float b,float t){ return clamp((t-a)/(b-a),0.,1.); }
vec3 GrassBlades(in vec3 rO, in vec3 rD, in vec3 mat, in float dist){
    float d=0.0; float rCoC=CircleOfConfusion(dist*.3); float alpha=0.0;
    vec4 col = vec4(mat*0.15,0.0);
    for(int i=0;i<15;i++){
        if(col.w>.99) break;
        vec3 p = rO + rD*d;
        vec3 ret = DE(p);
        ret.x += .5*rCoC;
        if(ret.x<rCoC){
            alpha=(1.0-col.y)*Linstep(-rCoC,rCoC,-ret.x);
            vec3 gra = mix(mat, vec3(.35,.35,min(pow(ret.z,4.0)*35.0,.35)), pow(ret.y,9.0)*.7)*ret.y;
            col += vec4(gra*alpha,alpha);
        }
        d += max(ret.x*0.7,.1);
    }
    if(col.w<.2) col.xyz=vec3(0.1,.15,0.05);
    return col.xyz;
}
void DoLighting(inout vec3 mat,in vec3 pos,in vec3 normal,in vec3 eyeDir,in float dis){
    float h = dot(sunLight,normal);
    mat = mat*sunColour*(max(h,0.0)+.2);
}
vec3 TerrainColour(vec3 pos, vec3 dir, vec3 normal,float dis,float type){
    vec3 mat;
    if(type==0.0){
        mat = mix(vec3(.0,.3,.0), vec3(.2,.3,.0), Noise(pos.xz*.025));
        float t = FractalNoise(pos.xz*.1)+.5;
        mat = GrassBlades(pos, dir, mat, dis)*t;
        DoLighting(mat,pos,normal,dir,dis);
    }
    return ApplyFog(mat, dis, dir);
}
float BinarySubdivision(in vec3 rO,in vec3 rD,float t,float oldT){
    float halfwayT=0.0;
    for(int n=0;n<5;n++){
        halfwayT=(oldT+t)*.5;
        float h = Map(rO+halfwayT*rD).x;
        (h<THRESHOLD)?t=halfwayT:oldT=halfwayT;
    }
    return t;
}
bool Scene(in vec3 rO,in vec3 rD,out float resT,out float type){
    float t=5.; float oldT=0.0; bool hit=false; float h=0.0;
    for(int j=0;j<60;j++){
        vec3 p=rO+t*rD;
        h = Map(p).x;
        if(h<THRESHOLD){hit=true;break;}
        oldT=t;
        t+=h+(t*0.04);
    }
    type=0.0;
    resT=BinarySubdivision(rO,rD,t,oldT);
    return hit;
}
vec3 CameraPath(float t){
    vec2 p = vec2(200.0*sin(3.54*t),200.0*cos(2.0*t));
    return vec3(p.x+55.0,12.0+sin(t*.3)*6.5,-94.0+p.y);
}
vec3 PostEffects(vec3 rgb, vec2 xy){
    rgb=pow(rgb,vec3(0.45));
    #define CONTRAST 1.1
    #define SATURATION 1.3
    #define BRIGHTNESS 1.3
    rgb = mix(vec3(.5), mix(vec3(dot(vec3(.2125,.7154,.0721), rgb*BRIGHTNESS)), rgb*BRIGHTNESS, SATURATION), CONTRAST);
    rgb *= .4+0.5*pow(40.0*xy.x*xy.y*(1.0-xy.x)*(1.0-xy.y),0.2);
    return rgb;
}
void main(){
    vec2 fragCoord = vUv*iResolution.xy;
    vec4 fragColor;
    vec2 xy = fragCoord.xy/iResolution.xy;
    vec2 uv = (-1.0+2.0*xy)*vec2(iResolution.x/iResolution.y,1.0);
    
    // Use provided camera position instead of automatic path
    cameraPos = uCameraPos;
    vec3 camTar = uCameraTarget;
    
    float roll = 0.0; // No automatic roll
    vec3 cw=normalize(camTar-cameraPos);
    vec3 cp=vec3(sin(roll),cos(roll),0.0);
    vec3 cu=cross(cw,cp);
    vec3 cv=cross(cu,cw);
    vec3 dir=normalize(uv.x*cu+uv.y*cv+1.3*cw);
    vec3 col;
    float distance; float type;
    if(!Scene(cameraPos,dir,distance,type)) col=GetSky(dir);
    else{
        vec3 pos=cameraPos+distance*dir;
        vec2 p=vec2(0.1,0.0);
        vec3 nor=vec3(0.0,Terrain(pos.xz).x,0.0);
        vec3 v2=nor-vec3(p.x,Terrain(pos.xz+p).x,0.0);
        vec3 v3=nor-vec3(0.0,Terrain(pos.xz-p.yx).x,-p.x);
        nor=cross(v2,v3); nor=normalize(nor);
        col=TerrainColour(pos,dir,nor,distance,type);
    }
    col=PostEffects(col,xy);
    gl_FragColor=vec4(col,1.0);
}
    `,
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
        iMouse: { value: new THREE.Vector2(0,0) },
        uCameraPos: { value: new THREE.Vector3(0, 2, 5) },
        uCameraTarget: { value: new THREE.Vector3(0, 2, 0) }
    },
    transparent: false
});

const shaderPlane = new THREE.Mesh(shaderGeometry, shaderMaterial);
shaderPlane.position.set(0,0,0);

// Create separate scene for background shader
const backgroundScene = new THREE.Scene();
backgroundScene.add(shaderPlane);

// Set up orthographic camera for fullscreen shader effect
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
let planeRotation = 0; // Track plane's Y rotation
const speed = 0.1;

window.addEventListener('mousemove', (event)=>{
    mouse.x = (event.clientX/window.innerWidth)*2-1;
    mouse.y = -(event.clientY/window.innerHeight)*2+1;
});

// Keyboard controls for flight
const keys = {};
window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

function updatePlaneMovement() {
    // Mouse controls for banking/turning
    // velocity.x += mouse.x * 0.002;
    // velocity.y += mouse.y * 0.002;
    
    // Keyboard controls
    if (keys['KeyW'] || keys['ArrowUp']) {
        // Move forward in the direction the plane is facing
        velocity.x += Math.sin(planeRotation) * 0.005;
        velocity.z -= Math.cos(planeRotation) * 0.005; // Negative Z is forward
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        // Move backward
        velocity.x -= Math.sin(planeRotation) * 0.003;
        velocity.z += Math.cos(planeRotation) * 0.003; // Positive Z is backward
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        planeRotation -= 0.05; // Turn left
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        planeRotation += 0.05; // Turn right
    }
    if (keys['Space']) velocity.y += 0.005; // Up
    if (keys['ShiftLeft']) velocity.y -= 0.002; // Down
    
    // 180 degree turn (U-turn)
    if (keys['KeyR']) {
        planeRotation += Math.PI; // Add 180 degrees (π radians)
    }
    
    // Apply velocity with damping
    planePosition.x += velocity.x;
    planePosition.y += velocity.y;
    planePosition.z += velocity.z;
    
    // Damping
    velocity.x *= 0.95;
    velocity.y *= 0.95;
    velocity.z *= 0.98;
    
    // Update plane visual position and rotation
    playerPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
    
    // Base rotation: point in flight direction
    playerPlane.rotation.y = -planeRotation; // Point where we're flying
    
    // Banking effect only during turns
    let bankingRotation = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        bankingRotation = 0.3; // Bank left while turning
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        bankingRotation = -0.3; // Bank right while turning
    }
    
    playerPlane.rotation.z = bankingRotation; // Banking during turns
    playerPlane.rotation.x = 0; // Keep nose level
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
    
    // Update plane movement
    updatePlaneMovement();
    
    // Update shader camera to follow plane with rotation
    // Camera behind and above plane - correct orientation
    const cameraOffset = new THREE.Vector3(
        -Math.sin(planeRotation) * 3,  // X offset (behind plane)
        1,                             // Y offset (height)
        Math.cos(planeRotation) * 3    // Z offset (behind plane)
    );
    const cameraPos = playerPlane.position.clone().add(cameraOffset);
    
    // Calculate camera target - look ahead of plane in flight direction
    const lookAhead = new THREE.Vector3(
        Math.sin(planeRotation) * 2,   // X target (ahead of plane)
        0,                             // Y target (same level)
        -Math.cos(planeRotation) * 2   // Z target (forward direction)
    );
    const cameraTarget = playerPlane.position.clone().add(lookAhead);
    
    shaderMaterial.uniforms.iTime.value = time*0.001;
    shaderMaterial.uniforms.iMouse.value.set(mouse.x, mouse.y);
    shaderMaterial.uniforms.uCameraPos.value.copy(cameraPos);
    shaderMaterial.uniforms.uCameraTarget.value.copy(cameraTarget);
    
    // Update 3D camera to follow plane from behind with rotation
    const camera3DOffset = new THREE.Vector3(
        -Math.sin(planeRotation) * 5,  // X offset (behind plane)
        2,                             // Y offset (height)
        Math.cos(planeRotation) * 5    // Z offset (behind plane)
    );
    camera.position.copy(playerPlane.position.clone().add(camera3DOffset));
    
    // Look ahead of the plane in flight direction
    const lookTarget = new THREE.Vector3(
        playerPlane.position.x + Math.sin(planeRotation) * 2,  // X ahead
        playerPlane.position.y,
        playerPlane.position.z - Math.cos(planeRotation) * 2   // Z ahead
    );
    camera.lookAt(lookTarget);
    
    // Render shader background first with orthographic camera (fullscreen)
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    
    // Then render the 3D scene with perspective camera on top
    renderer.clearDepth();
    renderer.render(scene, camera);
}

animate();