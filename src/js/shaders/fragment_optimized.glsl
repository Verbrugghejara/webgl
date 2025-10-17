// Optimized Rolling hills shader for better performance
precision mediump float;
uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uCameraPos;
uniform vec3 uCameraTarget;
uniform float uTimeOfDay; // 0 = nacht, 1 = dag

// Ring effecten
uniform float uSpeedMultiplier; // Ring 0: Storm effecten
uniform vec3 uColorFilter; // Ring 1: Kleurfilter
uniform float uPsychedelicMode; // Ring 2: Psychedelische effecten
uniform float uWaveIntensity; // Ring 3: Golfeffecten
uniform float uGlitchMode; // Ring 4: Glitch effecten
uniform float uNightVision; // Ring 5: Nachtzicht

varying vec2 vUv;

#define THRESHOLD .005
#define MOD2 vec2(3.07965, 7.4235)
vec3 sunLight = normalize(vec3(0.35,0.2,0.3));
vec3 cameraPos;
vec3 sunColour = vec3(1.0, .75, .6);

// Simplified Hash and Noise
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

// Simplified Terrain (reduced iterations)
vec2 Terrain(in vec2 p){
    float type=0.0;
    vec2 pos = p*0.003;
    float w = 50.0; float f = .0;
    for(int i=0;i<2;i++){ // Reduced from 3 to 2
        f+=Noise(pos)*w;
        w*=0.65;
        pos*=2.2;
    }
    return vec2(f,type);
}

vec2 Map(in vec3 p){
    vec2 h = Terrain(p.xz);
    return vec2(p.y - h.x, h.y);
}

float FractalNoise(in vec2 xy){
    float w=.7; float f=0.0;
    for(int i=0;i<2;i++){ // Reduced from 3 to 2
        f+=Noise(xy)*w; w*=0.6; xy*=2.0;
    }
    return f;
}

// Simplified Lightning (much faster)
vec3 SimpleLightning(vec2 fragCoord, vec3 iResolution, float iTime) {
    if (uSpeedMultiplier < 0.1) return vec3(0.0);
    
    vec2 p = fragCoord.xy / iResolution.xy;
    float lightning = 0.0;
    
    // Simple flash effect instead of complex lightning
    float flash = Hash(floor(iTime * 5.0));
    if (flash > 0.7) {
        lightning = smoothstep(0.8, 1.0, Hash(p + iTime)) * uSpeedMultiplier;
    }
    
    return vec3(lightning * 0.6, lightning * 0.8, lightning);
}

vec3 GetSky(in vec3 rd){
    float sunAmount = max(dot(rd,sunLight),0.0);
    float v = pow(1.0-max(rd.y,0.0),6.0);
    
    // Dag kleuren
    vec3 dayHorizon = vec3(.32,.32,.32);
    vec3 dayZenith = vec3(.1,.2,.3);
    
    // Nacht kleuren
    vec3 nightHorizon = vec3(.05,.05,.1);
    vec3 nightZenith = vec3(.01,.01,.05);
    
    // Ring 0: Storm effecten - simplified
    if (uSpeedMultiplier > 0.1) {
        vec3 stormClouds = vec3(0.1, 0.1, 0.15);
        dayHorizon = mix(dayHorizon, stormClouds, uSpeedMultiplier * 0.7);
        dayZenith = mix(dayZenith, stormClouds, uSpeedMultiplier * 0.5);
        
        // Simplified lightning
        vec2 fragCoord = vUv * iResolution.xy;
        vec3 lightningColor = SimpleLightning(fragCoord, iResolution, iTime);
        
        dayHorizon += lightningColor * 0.4;
        dayZenith += lightningColor * 0.3;
        nightHorizon += lightningColor * 0.6;
        nightZenith += lightningColor * 0.5;
    }
    
    // Ring 4: Glitch effect (simplified)
    if (uGlitchMode > 0.1) {
        float glitch = step(0.97, Hash(rd.xy + iTime * 0.1)) * uGlitchMode;
        dayHorizon += vec3(glitch * 0.3, glitch * -0.2, glitch * 0.4);
        dayZenith += vec3(glitch * -0.1, glitch * 0.2, glitch * -0.05);
    }
    
    vec3 horizon = mix(nightHorizon, dayHorizon, uTimeOfDay);
    vec3 zenith = mix(nightZenith, dayZenith, uTimeOfDay);
    
    vec3 sky = mix(zenith, horizon, v);
    
    // Sun effect (simplified)
    float sunVisibility = uSpeedMultiplier > 0.1 ? 0.3 : 1.0;
    vec3 currentSunColour = mix(vec3(0.1, 0.1, 0.3), sunColour, uTimeOfDay);
    sky += currentSunColour * sunAmount*sunAmount*0.15 * uTimeOfDay * sunVisibility;
    sky += currentSunColour * min(pow(sunAmount,400.0)*1.0,.2) * uTimeOfDay * sunVisibility;
    
    // Stars (simplified)
    if (uTimeOfDay < 0.5 && rd.y > 0.0) {
        float skyHeight = max(rd.y, 0.0);
        float starIntensity = skyHeight * skyHeight;
        float starThreshold = mix(0.99, 0.995, uTimeOfDay * 2.0);
        float nightFactor = 1.0 - (uTimeOfDay * 2.0);
        
        float stars = step(starThreshold, Hash(rd.xy * 50.0)) * nightFactor * starIntensity;
        float starBrightness = mix(1.2, 0.2, uTimeOfDay * 2.0);
        sky += vec3(stars) * starBrightness;
    }
    
    return clamp(sky,0.0,1.0);
}

vec3 ApplyFog(in vec3 rgb, in float dis, in vec3 dir){
    float fogAmount = clamp(dis*dis*0.000001,0.0,1.0);
    return mix(rgb, GetSky(dir), fogAmount);
}

// Simplified Grass (much faster)
vec3 SimpleGrass(in vec3 rO, in vec3 rD, in vec3 mat, in float dist){
    float grassFactor = smoothstep(0.0, 20.0, dist);
    vec3 grassColor = mix(vec3(.0,.25,.0), vec3(.15,.35,.05), Hash(rO.xz * 0.1));
    
    // Ring effects on grass
    if (uPsychedelicMode > 0.1) {
        float psychTime = iTime * 0.3;
        grassColor = vec3(
            sin(psychTime + rO.x*0.05)*0.5+0.5, 
            cos(psychTime + rO.z*0.05)*0.5+0.5, 
            sin(psychTime*1.2)*0.5+0.5
        ) * 0.3;
    }
    
    if (uWaveIntensity > 0.1) {
        float wave = sin(rO.x * 0.3 + iTime) * sin(rO.z * 0.2 + iTime * 0.8) * uWaveIntensity;
        grassColor += vec3(wave * 0.2, wave * 0.3, wave * 0.1);
    }
    
    return mix(grassColor, mat, grassFactor);
}

void DoLighting(inout vec3 mat,in vec3 pos,in vec3 normal,in vec3 eyeDir,in float dis){
    float h = dot(sunLight,normal);
    vec3 currentSunColour = mix(vec3(0.1, 0.1, 0.3), sunColour, uTimeOfDay);
    float lightIntensity = mix(0.3, 1.0, uTimeOfDay);
    mat = mat * currentSunColour * (max(h,0.0) * lightIntensity + 0.25);
}

vec3 TerrainColour(vec3 pos, vec3 dir, vec3 normal,float dis,float type){
    vec3 mat;
    if(type==0.0){
        vec3 dayGrass1 = vec3(.0,.3,.0);
        vec3 dayGrass2 = vec3(.2,.3,.0);
        vec3 nightGrass1 = vec3(.0,.1,.0);
        vec3 nightGrass2 = vec3(.1,.15,.0);
        
        // Storm effects (simplified)
        if (uSpeedMultiplier > 0.1) {
            float wetness = uSpeedMultiplier * 0.5;
            dayGrass1 = mix(dayGrass1, vec3(0.05, 0.15, 0.05), wetness);
            dayGrass2 = mix(dayGrass2, vec3(0.1, 0.2, 0.1), wetness);
            nightGrass1 = mix(nightGrass1, vec3(0.02, 0.08, 0.02), wetness);
            nightGrass2 = mix(nightGrass2, vec3(0.05, 0.12, 0.05), wetness);
        }
        
        vec3 grass1 = mix(nightGrass1, dayGrass1, uTimeOfDay);
        vec3 grass2 = mix(nightGrass2, dayGrass2, uTimeOfDay);
        
        mat = mix(grass1, grass2, Noise(pos.xz*.02));
        mat = SimpleGrass(pos, dir, mat, dis);
        DoLighting(mat,pos,normal,dir,dis);
        
        // Ring effects
        mat *= uColorFilter;
        
        if (uNightVision > 0.1) {
            float brightness = dot(mat, vec3(0.299, 0.587, 0.114));
            mat = vec3(brightness * 0.2, brightness, brightness * 0.2) * (1.0 + uNightVision);
        }
    }
    return ApplyFog(mat, dis, dir);
}

float BinarySubdivision(in vec3 rO,in vec3 rD,float t,float oldT){
    float halfwayT=0.0;
    for(int n=0;n<3;n++){ // Reduced from 5 to 3
        halfwayT=(oldT+t)*.5;
        float h = Map(rO+halfwayT*rD).x;
        (h<THRESHOLD)?t=halfwayT:oldT=halfwayT;
    }
    return t;
}

bool Scene(in vec3 rO,in vec3 rD,out float resT,out float type){
    float t=5.; float oldT=0.0; bool hit=false; float h=0.0;
    for(int j=0;j<30;j++){ // Reduced from 60 to 30
        vec3 p=rO+t*rD;
        h = Map(p).x;
        if(h<THRESHOLD){hit=true;break;}
        oldT=t;
        t+=h+(t*0.06); // Slightly increased step size
    }
    type=0.0;
    resT=BinarySubdivision(rO,rD,t,oldT);
    return hit;
}

vec3 PostEffects(vec3 rgb, vec2 xy){
    rgb=pow(rgb,vec3(0.5)); // Simplified gamma
    #define CONTRAST 1.05
    #define SATURATION 1.2
    #define BRIGHTNESS 1.2
    rgb = mix(vec3(.5), mix(vec3(dot(vec3(.2125,.7154,.0721), rgb*BRIGHTNESS)), rgb*BRIGHTNESS, SATURATION), CONTRAST);
    rgb *= .5+0.5*pow(20.0*xy.x*xy.y*(1.0-xy.x)*(1.0-xy.y),0.15); // Reduced vignette calculation
    return rgb;
}

void main(){
    vec2 fragCoord = vUv*iResolution.xy;
    vec4 fragColor;
    vec2 xy = fragCoord.xy/iResolution.xy;
    vec2 uv = (-1.0+2.0*xy)*vec2(iResolution.x/iResolution.y,1.0);
    
    cameraPos = uCameraPos;
    vec3 camTar = uCameraTarget;
    
    float roll = 0.0;
    vec3 cw=normalize(camTar-cameraPos);
    vec3 cp=vec3(sin(roll),cos(roll),0.0);
    vec3 cu=cross(cw,cp);
    vec3 cv=cross(cu,cw);
    vec3 dir=normalize(uv.x*cu+uv.y*cv+1.2*cw); // Slightly reduced FOV
    vec3 col;
    float distance; float type;
    
    if(!Scene(cameraPos,dir,distance,type)) {
        col=GetSky(dir);
    } else {
        vec3 pos=cameraPos+distance*dir;
        vec2 p=vec2(0.15,0.0); // Increased normal calculation step
        vec3 nor=vec3(0.0,Terrain(pos.xz).x,0.0);
        vec3 v2=nor-vec3(p.x,Terrain(pos.xz+p).x,0.0);
        vec3 v3=nor-vec3(0.0,Terrain(pos.xz-p.yx).x,-p.x);
        nor=cross(v2,v3); nor=normalize(nor);
        col=TerrainColour(pos,dir,nor,distance,type);
    }
    
    // Simplified rain effect
    if (uSpeedMultiplier > 0.1) {
        vec2 p = vUv;
        float time = iTime;
        float q_y = p.y;
        
        vec2 st = 128. * (p * vec2(.5, .01) + vec2(time * .1 - q_y * .15, time * .1));
        float f = Noise(st) * 0.8;
        f = 0.2 + clamp(pow(abs(f), 8.0) * 8.0, 0.0, q_y * .1);
        
        float rainIntensity = uSpeedMultiplier * 0.6;
        f *= rainIntensity;
        
        col += 0.15 * f * (0.15 + col) * rainIntensity;
        col *= (1.0 - uSpeedMultiplier * 0.05);
    }
    
    col=PostEffects(col,xy);
    gl_FragColor=vec4(col,1.0);
}