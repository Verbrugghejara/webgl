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

in vec2 vUv;
out vec4 fragColor;

#define THRESHOLD .003
#define MOD2 vec2(3.07965, 7.4235)
vec3 sunLight = normalize(vec3(0.35,0.2,0.3));
vec3 cameraPos;
vec3 sunColour = vec3(1.0, .75, .6);

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

// Geavanceerde bliksem functies
float lightningHash(float x) {
    return fract(21654.6512 * sin(385.51 * x));
}

float lightningHash(vec2 p) {
    return fract(1654.65157 * sin(15.5134763 * p.x + 45.5173247 * p.y + 5.21789));
}

vec2 lightningHash2(vec2 p) {
    return vec2(lightningHash(p * .754), lightningHash(1.5743 * p + 4.5476351));
}

vec2 lightningNoise2(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    vec2 add = vec2(1.0, 0.0);
    vec2 res = mix(mix(lightningHash2(p), lightningHash2(p + add.xy), f.x),
                   mix(lightningHash2(p + add.yx), lightningHash2(p + add.xx), f.x), f.y);
    return res;
}

vec2 lightningFbm2(vec2 x) {
    vec2 r = vec2(0.0);
    float a = 1.0;
    
    for (int i = 0; i < 6; i++) { // Minder iteraties voor performance
        r += lightningNoise2(x) * a;
        x *= 2.;
        a *= .5;
    }
    
    return r;
}

float lightningSegment(vec2 ba, vec2 pa) {
    float h = clamp(dot(pa, ba) / dot(ba, ba), -0.2, 1.);
    return length(pa - ba * h);
}

vec3 AdvancedLightning(vec2 fragCoord, vec3 iResolution, float iTime) {
    vec2 p = 2. * fragCoord.xy / iResolution.yy - 1.;
    vec2 d;
    vec2 tgt = vec2(1., -1.);
    float c = 0.;
    
    if (p.y >= 0.)
        c = (1. - (lightningFbm2((p + .2) * p.y + .1 * iTime)).x) * p.y;
    else 
        c = (1. - (lightningFbm2(p + .2 + .1 * iTime)).x) * p.y * p.y;
    
    vec3 col = vec3(0.);
    vec3 col1 = c * vec3(.3, .5, 1.);
    float mdist = 100000.;
    
    float t = lightningHash(floor(5. * iTime));
    tgt += 4. * lightningHash2(tgt + t) - 1.5;
    
    if (lightningHash(t + 2.3) > .6) {
        for (int i = 0; i < 50; i++) { // Minder iteraties voor performance
            vec2 dtgt = tgt - p;
            d = .05 * (vec2(-.5, -1.) + lightningHash2(vec2(float(i), t)));
            float dist = lightningSegment(d, dtgt);
            mdist = min(mdist, dist);
            tgt -= d;
            c = exp(-.5 * dist) + exp(-55. * mdist);
            col = c * vec3(.7, .8, 1.);
        }
    }
    col += col1;
    return col;
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
    
    // Ring 0: Storm effecten
    if (uSpeedMultiplier > 0.1) {
        // Simpele donkere wolken
        vec3 stormClouds = vec3(0.1, 0.1, 0.15);
        dayHorizon = mix(dayHorizon, stormClouds, uSpeedMultiplier * 0.7);
        dayZenith = mix(dayZenith, stormClouds, uSpeedMultiplier * 0.5);
        
        // Geavanceerde bliksem met realistische takken
        vec2 fragCoord = vUv * iResolution.xy;
        vec3 lightningColor = AdvancedLightning(fragCoord, iResolution, iTime) * uSpeedMultiplier;
        
        // Voeg bliksem toe aan hemel kleuren
        dayHorizon += lightningColor * 0.8;
        dayZenith += lightningColor * 0.6;
        nightHorizon += lightningColor * 1.2;
        nightZenith += lightningColor * 1.0;
    }
    
    // Ring 4: Glitch effect op hemelkleuren
    if (uGlitchMode > 0.1) {
        float glitch = step(0.97, Hash(rd.xy + iTime * 0.1)) * uGlitchMode;
        dayHorizon += vec3(glitch * 0.5, glitch * -0.3, glitch * 0.8);
        dayZenith += vec3(glitch * -0.2, glitch * 0.4, glitch * -0.1);
    }
    
    // Mix tussen dag en nacht op basis van uTimeOfDay
    vec3 horizon = mix(nightHorizon, dayHorizon, uTimeOfDay);
    vec3 zenith = mix(nightZenith, dayZenith, uTimeOfDay);
    
    vec3 sky = mix(zenith, horizon, v);
    
    // Zon effect (alleen overdag zichtbaar en minder bij storm)
    float sunVisibility = uSpeedMultiplier > 0.1 ? 0.3 : 1.0; // Zon wordt gedimpt bij storm
    vec3 currentSunColour = mix(vec3(0.1, 0.1, 0.3), sunColour, uTimeOfDay);
    sky += currentSunColour * sunAmount*sunAmount*0.25 * uTimeOfDay * sunVisibility;
    sky += currentSunColour * min(pow(sunAmount,800.0)*1.5,.3) * uTimeOfDay * sunVisibility;
    
    // Sterren effect (alleen 's nachts EN alleen in de hemel)
    if (uTimeOfDay < 0.5 && rd.y > 0.0) { // rd.y > 0.0 betekent dat we naar boven kijken
        float stars = 0.0;
        vec3 starPos = rd * 100.0;
        
        // Meer sterren hoger in de hemel
        float skyHeight = max(rd.y, 0.0); // 0.0 tot 1.0
        float starIntensity = skyHeight * skyHeight; // Kwadratisch voor meer concentratie hoger
        
        // Verhoogde ster helderheid en meer sterren
        float starThreshold = mix(0.985, 0.995, uTimeOfDay * 2.0); // Meer sterren bij donkerder
        float nightFactor = 1.0 - (uTimeOfDay * 2.0); // Sterker effect bij minder licht
        
        stars += step(starThreshold, Hash(starPos.xy + starPos.z)) * nightFactor * starIntensity;
        
        // Extra helderheid voor sterren in het donker
        float starBrightness = mix(1.5, 0.3, uTimeOfDay * 2.0);
        sky += vec3(stars) * starBrightness;
    }
    
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
    
    // Pas animatiesnelheid aan met ring effecten
    float timeSpeed = iTime * (1.0 + uSpeedMultiplier * 2.0);
    
    // Ring 0: Storm wind effecten op gras
    vec2 windOffset = vec2(0.0);
    if (uSpeedMultiplier > 0.1) {
        float windStrength = uSpeedMultiplier * 0.3;
        windOffset = vec2(
            sin(timeSpeed * 3.0 + p.x * 0.1) * windStrength,
            cos(timeSpeed * 2.5 + p.z * 0.1) * windStrength
        );
    }
    
    vec2 ret = Voronoi((p.xz*2.5+windOffset+sin(y*2.0+p.zx*12.3)*.12+vec2(sin(timeSpeed*3.5+1.5*p.z),sin(timeSpeed*6.0+1.5*p.x))*y*.5));
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
    
    // Pas licht intensiteit aan op basis van tijd van dag
    vec3 currentSunColour = mix(vec3(0.1, 0.1, 0.3), sunColour, uTimeOfDay);
    float lightIntensity = mix(0.2, 1.0, uTimeOfDay); // Minder licht 's nachts
    
    mat = mat * currentSunColour * (max(h,0.0) * lightIntensity + 0.2);
}
vec3 TerrainColour(vec3 pos, vec3 dir, vec3 normal,float dis,float type){
    vec3 mat;
    if(type==0.0){
        // Basis gras kleuren
        vec3 dayGrass1 = vec3(.0,.3,.0);
        vec3 dayGrass2 = vec3(.2,.3,.0);
        vec3 nightGrass1 = vec3(.0,.1,.0);
        vec3 nightGrass2 = vec3(.1,.15,.0);
        
        // Ring 0: Storm effecten - donkerder gras en nat effect
        if (uSpeedMultiplier > 0.1) {
            float wetness = uSpeedMultiplier * 0.8;
            dayGrass1 = mix(dayGrass1, vec3(0.05, 0.15, 0.05), wetness); // Donkerder en natter
            dayGrass2 = mix(dayGrass2, vec3(0.1, 0.2, 0.1), wetness);
            nightGrass1 = mix(nightGrass1, vec3(0.02, 0.08, 0.02), wetness);
            nightGrass2 = mix(nightGrass2, vec3(0.05, 0.12, 0.05), wetness);
        }
        
        // Ring 2: Psychedelische kleuren
        if (uPsychedelicMode > 0.1) {
            float psychTime = iTime * 0.5;
            dayGrass1 = vec3(sin(psychTime + pos.x*0.1)*0.5+0.5, cos(psychTime + pos.z*0.1)*0.5+0.5, sin(psychTime*1.5)*0.5+0.5);
            dayGrass2 = vec3(cos(psychTime*1.2 + pos.x*0.1)*0.5+0.5, sin(psychTime*0.8 + pos.z*0.1)*0.5+0.5, cos(psychTime*2.0)*0.5+0.5);
            nightGrass1 = dayGrass1 * 0.3;
            nightGrass2 = dayGrass2 * 0.3;
        }
        
        vec3 grass1 = mix(nightGrass1, dayGrass1, uTimeOfDay);
        vec3 grass2 = mix(nightGrass2, dayGrass2, uTimeOfDay);
        
        // Ring 3: Golfeffecten
        if (uWaveIntensity > 0.1) {
            float wave = sin(pos.x * 0.5 + iTime * 2.0) * sin(pos.z * 0.3 + iTime * 1.5) * uWaveIntensity;
            grass1 += vec3(wave * 0.3, wave * 0.5, wave * 0.2);
            grass2 += vec3(wave * 0.2, wave * 0.4, wave * 0.3);
        }
        
        mat = mix(grass1, grass2, Noise(pos.xz*.025));
        float t = FractalNoise(pos.xz*.1)+.5;
        mat = GrassBlades(pos, dir, mat, dis)*t;
        DoLighting(mat,pos,normal,dir,dis);
        
        // Ring 1: Kleurfilter toepassen
        mat *= uColorFilter;
        
        // Ring 5: Nachtzicht effect
        if (uNightVision > 0.1) {
            float brightness = dot(mat, vec3(0.299, 0.587, 0.114));
            mat = vec3(brightness * 0.2, brightness, brightness * 0.2) * (1.0 + uNightVision);
        }
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
    
    // Ring 0: Storm regen effect - Dave Hoskins style
    if (uSpeedMultiplier > 0.1) {
        vec2 p = vUv;
        float time = iTime;
        float q_y = p.y; // Gebruik UV y-component
        
        // Dave Hoskins rain algorithm
        vec2 st = 256. * (p * vec2(.5, .01) + vec2(time * .13 - q_y * .2, time * .13));
        float f = Noise(st) * Noise(st * 0.773) * 1.55;
        f = 0.25 + clamp(pow(abs(f), 13.0) * 13.0, 0.0, q_y * .14);
        
        // Rain intensity gebaseerd op storm effect
        float rainIntensity = uSpeedMultiplier * 0.8;
        f *= rainIntensity;
        
        // Voeg regen toe aan de scene kleur
        col += 0.25 * f * (0.2 + col) * rainIntensity;
        
        // Lichte atmosferische verdonkering
        col *= (1.0 - uSpeedMultiplier * 0.1);
    }
    
    col=PostEffects(col,xy);
    fragColor=vec4(col,1.0);
}