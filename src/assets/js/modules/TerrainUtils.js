const MOD2 = { x: 3.07965, y: 7.4235 };

function fract(x) {
    return x - Math.floor(x);
}

function Hash(p) {
    if (typeof p === 'number') {
        let p2 = {
            x: fract(p / MOD2.x),
            y: fract(p / MOD2.y)
        };
        
        const dotVal = p2.y * (p2.x + 19.19) + p2.x * (p2.y + 19.19);
        p2.x += dotVal;
        p2.y += dotVal;
        
        return fract(p2.x * p2.y);
    } else {
        let px = fract(p.x / MOD2.x);
        let py = fract(p.y / MOD2.y);
        
        const dotVal = px * (py + 19.19) + py * (px + 19.19);
        px += dotVal;
        py += dotVal;
        
        return fract(px * py);
    }
}

function Noise(x) {
    const p = { x: Math.floor(x.x), y: Math.floor(x.y) };
    const f = { x: x.x - p.x, y: x.y - p.y };
    
    f.x = f.x * f.x * (3.0 - 2.0 * f.x);
    f.y = f.y * f.y * (3.0 - 2.0 * f.y);
    
    const n = p.x + p.y * 57.0;
    
    const h1 = Hash(n + 0.0);
    const h2 = Hash(n + 1.0);
    const h3 = Hash(n + 57.0);
    const h4 = Hash(n + 58.0);
    
    const mix1 = h1 + f.x * (h2 - h1);
    const mix2 = h3 + f.x * (h4 - h3);
    
    return mix1 + f.y * (mix2 - mix1);
}

export function getTerrainHeight(x, z) {
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