// ============= RIVER CROSSING MINI-GAME (Canvas-based) =============

let riverState = {
    gameActive: false,
    canvas: null,
    ctx: null,
    W: 660,
    H: 420,
    animFrameId: null,
    lastTime: 0,

    // Wagon
    wagonX: 0,
    wagonY: 0,
    wagonVX: 0,
    wagonVY: 0,
    wagonAngle: 0,
    keysDown: {},

    // River parameters
    waterLevel: '',
    currentStrength: '',
    difficulty: 0,
    windForce: 0,        // base wind px/s pushing RIGHT
    riverLeft: 0,
    riverRight: 0,
    nearBankY: 0,        // y of bottom (start) bank top edge
    farBankY: 0,         // y of top (destination) bank bottom edge

    // Fixed rocks
    rocks: [],

    // Waves (many, wagon-sized, drift left→right)
    waves: [],
    waveSpawnTimer: 0,

    // Wagon hit flash
    wagonHit: false,
    wagonHitTimer: 0,

    // Water ripples (scroll left→right)
    ripples: [],

    // Splash particles
    particles: [],

    // Result
    hitCount: 0,
    crossed: false,

    // Stats
    crossingAttempts: 0,
    perfectCrossings: 0,

    keydownHandler: null,
    keyupHandler: null,
    audioCtx: null,
    ambientNode: null,
    ambientGain: null,
    wagonBob: 0,       // vertical bob phase (radians)
    sprayTimer: 0,     // timer for trailing spray particles
    vegetation: [],    // pre-generated river vegetation
};

// ─── River Audio ─────────────────────────────────────────────────
function riverInitAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!riverState.audioCtx) riverState.audioCtx = new AC();
}

function riverStartAmbient() {
    const rs = riverState;
    const ac = rs.audioCtx;
    if (!ac) return;

    // White noise buffer for water sound
    const bufLen = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Low-pass filter to make it sound like rushing water, not static
    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 800;
    lpf.Q.value = 0.5;

    // High-pass to remove deep rumble
    const hpf = ac.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 200;

    const gain = ac.createGain();
    gain.gain.value = 0.12;

    src.connect(lpf).connect(hpf).connect(gain).connect(ac.destination);
    src.start();
    rs.ambientNode = src;
    rs.ambientGain = gain;
}

function riverStopAmbient() {
    const rs = riverState;
    if (!rs.ambientNode) return;
    const gain = rs.ambientGain;
    const ac = rs.audioCtx;
    gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8);
    rs.ambientNode.stop(ac.currentTime + 0.8);
    rs.ambientNode = null;
    rs.ambientGain = null;
}

function riverPlayWaveHit() {
    const ac = riverState.audioCtx;
    if (!ac) return;
    // Low thud + splash: filtered noise burst
    const bufLen = Math.floor(ac.sampleRate * 0.25);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 600;
    const gain = ac.createGain();
    gain.gain.value = 0.35;
    src.connect(lpf).connect(gain).connect(ac.destination);
    src.start();
}

function riverPlayRockHit() {
    const ac = riverState.audioCtx;
    if (!ac) return;
    // Sharp crack: short noise burst + low thud oscillator
    const bufLen = Math.floor(ac.sampleRate * 0.15);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.02));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.value = 0.5;
    src.connect(gain).connect(ac.destination);

    const osc = ac.createOscillator();
    const oscGain = ac.createGain();
    osc.frequency.setValueAtTime(120, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.12);
    oscGain.gain.setValueAtTime(0.3, ac.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    osc.connect(oscGain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.15);
    src.start();
}

function riverPlaySuccess() {
    const ac = riverState.audioCtx;
    if (!ac) return;
    // Rising two-tone chime
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ac.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.35);
    });
}

const RIVER_CFG = {
    WAGON_W: 52,
    WAGON_H: 30,
    WAGON_MAX_SPEED: 200,
    WAGON_DRIVE_FORCE: 300,
    WAGON_FRICTION: 0.87,
    BANK_WIDTH: 85,
    NEAR_BANK_H: 72,   // bottom start bank height
    FAR_BANK_H: 72,    // top destination bank height
    ROCK_COUNT_BASE: 14,
    ROCK_COUNT_PER_DIFF: 12,
};

// ─── Entry point ────────────────────────────────────────────────
function startRiverCrossingGame(waterLevel, currentStrength) {
    const waterScore   = waterLevel      === 'Very Wide' ? 2 : waterLevel      === 'Wide'     ? 1 : 0;
    const currentScore = currentStrength === 'Strong'    ? 2 : currentStrength === 'Moderate'  ? 1 : 0;

    riverState.difficulty      = waterScore + currentScore;
    riverState.waterLevel      = waterLevel;
    riverState.currentStrength = currentStrength;
    riverState.crossingAttempts++;
    riverState.hitCount      = 0;
    riverState.crossed       = false;
    riverState.particles     = [];
    riverState.waves         = [];
    riverState.waveSpawnTimer = 0;
    riverState.wagonHit      = false;
    riverState.wagonHitTimer = 0;
    riverState.keysDown      = {};

    // Steady current: constant rightward acceleration (always on)
    riverState.windForce = 100 + currentScore * 50;   // 100 / 150 / 200 px/s²

    // Waves spawn frequently — many on screen at once
    riverState.waveSpawnTimer = 0;

    // River channel width based on waterScore
    riverState.riverLeft  = RIVER_CFG.BANK_WIDTH - waterScore * 14;
    riverState.riverRight = 660 - riverState.riverLeft;

    // Bank Y positions (wagon travels from bottom to top)
    const canvasH = 420 + waterScore * 210;   // 420 / 630 / 840
    riverState.nearBankY = canvasH - RIVER_CFG.NEAR_BANK_H;   // bottom bank top edge
    riverState.farBankY  = RIVER_CFG.FAR_BANK_H;              // top bank bottom edge

    // Start wagon at bottom centre just inside river
    riverState.wagonX = (riverState.riverLeft + riverState.riverRight) / 2;
    riverState.wagonY = riverState.nearBankY - RIVER_CFG.WAGON_H / 2 - 4;
    riverState.wagonVX = 0;
    riverState.wagonVY = 0;
    riverState.wagonAngle = 0;

    // Place fixed rocks
    riverState.rocks = riverPlaceRocks(waterScore);

    // Generate river vegetation
    riverState.vegetation = riverGenerateVegetation();

    // Generate water ripples — 3 parallax layers (back, mid, front)
    riverState.ripples = [];
    for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 12; i++) {
            riverState.ripples.push(riverMakeRipple(true, layer));
        }
    }

    // Show canvas
    document.getElementById('huntingGame').style.display = 'none';
    document.getElementById('riverGame').style.display   = 'block';
    document.getElementById('flipInner').classList.add('flipped');

    const canvas = document.getElementById('riverCanvas');
    canvas.height = canvasH;
    riverState.canvas = canvas;
    riverState.ctx    = canvas.getContext('2d');
    riverState.W      = canvas.width;
    riverState.H      = canvasH;

    // Keyboard listeners
    riverState.keydownHandler = (e) => {
        riverState.keysDown[e.code] = true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    };
    riverState.keyupHandler = (e) => { riverState.keysDown[e.code] = false; };
    document.addEventListener('keydown', riverState.keydownHandler);
    document.addEventListener('keyup',   riverState.keyupHandler);

    // Info bar
    document.getElementById('riverInfo').innerHTML =
        '<span class="river-info-label">Width:</span> '   + coloredWidth(waterLevel)      + ' | ' +
        '<span class="river-info-label">Current:</span> ' + coloredCurrent(currentStrength) + ' | ' +
        '<span class="river-info-label">Difficulty:</span> ' + '★'.repeat(Math.max(1, riverState.difficulty));

    riverShowOverlay(true);
}

// ─── Place fixed rocks scattered across the river ───────────────
function riverPlaceRocks(waterScore) {
    const rs    = riverState;
    const count = RIVER_CFG.ROCK_COUNT_BASE + waterScore * RIVER_CFG.ROCK_COUNT_PER_DIFF;
    const rocks = [];
    const rw    = rs.riverRight - rs.riverLeft;
    const rh    = rs.nearBankY  - rs.farBankY;

    // Grid-jitter placement so rocks are spread but not clumped
    const cols = 5;
    const rows = Math.ceil(count / cols);
    const cellW = rw / cols;
    const cellH = rh / rows;

    const wagonStartX = (rs.riverLeft + rs.riverRight) / 2;
    const wagonStartY = rs.nearBankY - RIVER_CFG.WAGON_H / 2 - 4;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (rocks.length >= count) break;
            const r  = 9 + Math.random() * 12;
            const cx = rs.riverLeft + col * cellW + cellW * 0.15 + Math.random() * cellW * 0.7;
            const cy = rs.farBankY  + row * cellH + cellH * 0.15 + Math.random() * cellH * 0.7;
            // Don't place in start/end safe zone
            if (cy > rs.nearBankY - 30 || cy < rs.farBankY + 30) continue;
            // Don't place within 20px of the wagon's starting position
            const ddx = cx - wagonStartX;
            const ddy = cy - wagonStartY;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < 25) continue;
            rocks.push({
                x: cx, y: cy, r,
                hit: false,
                // subtle rock shape variation
                scaleX: 0.8 + Math.random() * 0.4,
                scaleY: 0.6 + Math.random() * 0.4,
                rot: Math.random() * Math.PI,
            });
        }
    }
    return rocks;
}

// ─── Generate river vegetation (called once per game) ────────────
function riverGenerateVegetation() {
    const rs     = riverState;
    const riverW = rs.riverRight - rs.riverLeft;
    const riverH = rs.nearBankY  - rs.farBankY;
    const items  = [];
    const count  = 8 + Math.floor(riverW * riverH / 28000);

    for (let i = 0; i < count; i++) {
        const x    = rs.riverLeft + Math.random() * riverW;
        const y    = rs.farBankY  + Math.random() * riverH;
        const type = Math.random();
        if (type < 0.40) {
            // Reed cluster: 2–4 thin stems with seed pods
            const stems = 2 + Math.floor(Math.random() * 3);
            const stemList = [];
            for (let s = 0; s < stems; s++) {
                stemList.push({
                    ox: (Math.random() - 0.5) * 10,
                    h:  14 + Math.random() * 12,
                    lean: (Math.random() - 0.5) * 8,
                    seedH: 0.65 + Math.random() * 0.2,
                });
            }
            items.push({ type: 'reed', x, y, stems: stemList });
        } else if (type < 0.70) {
            // Lily pad: flat ellipse with optional flower
            const r       = 6 + Math.random() * 8;
            const flower  = Math.random() < 0.35;
            const rot     = Math.random() * Math.PI * 2;
            const notchA  = rot + Math.PI * 0.1;
            items.push({ type: 'lily', x, y, r, rot, notchA, flower });
        } else if (type < 0.88) {
            // Grass tuft: 3–5 blades fanning outward
            const blades = 3 + Math.floor(Math.random() * 3);
            const bladeList = [];
            for (let b = 0; b < blades; b++) {
                bladeList.push({
                    angle: -Math.PI * 0.6 + (b / (blades - 1)) * Math.PI * 1.2,
                    len:   10 + Math.random() * 8,
                });
            }
            items.push({ type: 'grass', x, y, blades: bladeList });
        } else {
            // Submerged log: dark elongated shape
            const len = 20 + Math.random() * 30;
            const rot = Math.random() * Math.PI;
            items.push({ type: 'log', x, y, len, rot });
        }
    }
    return items;
}

// ─── Make a single ripple (layer 0=back, 1=mid, 2=front) ─────────
function riverMakeRipple(randomY, layer) {
    const rs = riverState;
    const baseSpeed = 55 + riverState.windForce * 0.6;
    // Back layer: slow, faint, short. Front layer: fast, brighter, longer.
    const speedMult  = layer === 0 ? 0.45 : layer === 1 ? 0.75 : 1.0;
    const alphaBase  = layer === 0 ? 0.04 : layer === 1 ? 0.08 : 0.13;
    const lenBase    = layer === 0 ? 10   : layer === 1 ? 18   : 26;
    return {
        x:     randomY
              ? rs.riverLeft + Math.random() * (rs.riverRight - rs.riverLeft)
              : rs.riverLeft - 10,
        y:     rs.farBankY + Math.random() * (rs.nearBankY - rs.farBankY),
        len:   lenBase + Math.random() * 14,
        speed: baseSpeed * speedMult + Math.random() * 20,
        alpha: alphaBase + Math.random() * 0.06,
        thick: layer === 0 ? 0.6 : layer === 1 ? 0.9 : 1.2,
        layer,
    };
}

// ─── Overlay (start / end screen) ───────────────────────────────
function riverShowOverlay(isStart) {
    const overlay = document.getElementById('riverOverlay');
    overlay.classList.remove('hidden');
    if (isStart) {
        overlay.innerHTML = `
            <h1>🌊 Ford the River 🌊</h1>
            <h2>${riverState.waterLevel} river &mdash; ${riverState.currentStrength} current</h2>
            <div class="river-instructions-text">
                Drive your wagon across to the far bank.<br>
                Use <strong>↑ ↓</strong> to move forward and back.<br>
                Use <strong>← →</strong> to steer left and right.<br>
                The current constantly pushes you right — waves hit hard.
            </div>
            <button class="hunting-btn" id="riverStartBtn">Begin Crossing</button>
        `;
        document.getElementById('riverStartBtn').addEventListener('click', riverBeginGame);
    }
}

// ─── Start the game loop ─────────────────────────────────────────
function riverBeginGame() {
    document.getElementById('riverOverlay').classList.add('hidden');
    riverInitAudio();
    riverStartAmbient();
    riverState.gameActive  = true;
    riverState.lastTime    = performance.now();
    riverState.animFrameId = requestAnimationFrame(riverGameLoop);
}

// ─── Game loop ───────────────────────────────────────────────────
function riverGameLoop(ts) {
    if (!riverState.gameActive) return;
    const dt = Math.min((ts - riverState.lastTime) / 1000, 0.05);
    riverState.lastTime = ts;
    riverUpdate(dt);
    riverDraw();
    riverState.animFrameId = requestAnimationFrame(riverGameLoop);
}

// ─── Update ─────────────────────────────────────────────────────
function riverUpdate(dt) {
    const rs   = riverState;
    const keys = rs.keysDown;
    const HW   = RIVER_CFG.WAGON_W / 2;
    const HH   = RIVER_CFG.WAGON_H / 2;

    // Player input (↑ = move toward top/far bank = decrease Y)
    if (keys['ArrowUp'])    rs.wagonVY -= RIVER_CFG.WAGON_DRIVE_FORCE * 2 * dt;
    if (keys['ArrowDown'])  rs.wagonVY += RIVER_CFG.WAGON_DRIVE_FORCE * 2 * 0.55 * dt;
    if (keys['ArrowLeft'])  rs.wagonVX -= RIVER_CFG.WAGON_DRIVE_FORCE * 2 * dt;
    if (keys['ArrowRight']) rs.wagonVX += RIVER_CFG.WAGON_DRIVE_FORCE * 2 * dt;

    // Base wind pushes RIGHT continuously
    rs.wagonVX += rs.windForce * dt;

    // Apply wave acceleration while wagon overlaps (must overlap both axes)
    for (const w of rs.waves) {
        const dx = rs.wagonX - w.x;
        const dy = rs.wagonY - w.y;
        if (Math.abs(dx) < w.r + RIVER_CFG.WAGON_W / 2 &&
            Math.abs(dy) < w.r + RIVER_CFG.WAGON_H / 2) {
            rs.wagonVX += w.force * dt;
            if (!w.soundPlayed) { riverPlayWaveHit(); w.soundPlayed = true; }
        }
    }

    // Friction
    rs.wagonVX *= Math.pow(RIVER_CFG.WAGON_FRICTION, dt * 60);
    rs.wagonVY *= Math.pow(RIVER_CFG.WAGON_FRICTION, dt * 60);

    // Clamp speed
    const spd = Math.hypot(rs.wagonVX, rs.wagonVY);
    if (spd > RIVER_CFG.WAGON_MAX_SPEED) {
        rs.wagonVX = (rs.wagonVX / spd) * RIVER_CFG.WAGON_MAX_SPEED;
        rs.wagonVY = (rs.wagonVY / spd) * RIVER_CFG.WAGON_MAX_SPEED;
    }

    rs.wagonX += rs.wagonVX * dt;
    rs.wagonY += rs.wagonVY * dt;

    // Vertical bob
    rs.wagonBob += dt * (2.5 + spd * 0.012);

    // Spray particles trailing wagon when moving
    rs.sprayTimer -= dt;
    if (spd > 20 && rs.sprayTimer <= 0) {
        rs.sprayTimer = 0.06;
        for (let i = 0; i < 2; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * 1.2;
            const s     = 20 + Math.random() * 40;
            rs.particles.push({
                x: rs.wagonX + (Math.random() - 0.5) * RIVER_CFG.WAGON_W * 0.6,
                y: rs.wagonY + RIVER_CFG.WAGON_H * 0.3,
                vx: Math.cos(angle) * s + rs.wagonVX * 0.3,
                vy: Math.sin(angle) * s - 15,
                life: 0.15 + Math.random() * 0.2,
                maxLife: 0.35,
                r: 1.5 + Math.random() * 2,
            });
        }
    }

    // Lean angle with horizontal speed
    const targetAngle = rs.wagonVX * 0.0018;
    rs.wagonAngle += (targetAngle - rs.wagonAngle) * 0.12;

    // Left/right bank walls
    if (rs.wagonX - HW < rs.riverLeft) {
        rs.wagonX  = rs.riverLeft + HW;
        rs.wagonVX = Math.abs(rs.wagonVX) * 0.25;
        riverSpawnSplash(rs.wagonX, rs.wagonY, 5);
    }
    if (rs.wagonX + HW > rs.riverRight) {
        rs.wagonX  = rs.riverRight - HW;
        rs.wagonVX = -Math.abs(rs.wagonVX) * 0.25;
        riverSpawnSplash(rs.wagonX, rs.wagonY, 5);
    }

    // Can't go back past start bank
    if (rs.wagonY + HH > rs.nearBankY) {
        rs.wagonY  = rs.nearBankY - HH;
        rs.wagonVY = -Math.abs(rs.wagonVY) * 0.2;
    }

    // Rock collisions — flash wagon red, no rock color change
    for (const rock of rs.rocks) {
        const dx   = rs.wagonX - rock.x;
        const dy   = rs.wagonY - rock.y;
        const dist = Math.hypot(dx, dy);
        const minD = rock.r + Math.max(HW, HH) - 5;
        if (dist < minD && dist > 0) {
            // Push wagon away from rock
            const nx = dx / dist;
            const ny = dy / dist;
            // Separate overlap
            rs.wagonX = rock.x + nx * minD;
            rs.wagonY = rock.y + ny * minD;
            const impact = Math.hypot(rs.wagonVX, rs.wagonVY);
            if (impact > 8) {
                rs.wagonVX = nx * Math.max(impact, 120);
                rs.wagonVY = ny * Math.max(impact * 0.5, 60);
                rs.hitCount++;
                rs.wagonHit      = true;
                rs.wagonHitTimer = 0.45;
                riverSpawnSplash(rock.x, rock.y, 12);
                riverPlayRockHit();
            }
        }
    }

    // Wagon hit flash timer
    if (rs.wagonHit) {
        rs.wagonHitTimer -= dt;
        if (rs.wagonHitTimer <= 0) rs.wagonHit = false;
    }

    // Wave spawn — more waves at higher difficulty, strength is fixed
    rs.waveSpawnTimer -= dt;
    const targetWaves = 1 + rs.difficulty;
    if (rs.waveSpawnTimer <= 0 || rs.waves.length < targetWaves) {
        rs.waveSpawnTimer = Math.max(1.2, 2.5 - rs.difficulty * 0.2) + Math.random() * 0.8;
        riverSpawnWave();
    }

    // Update waves; spawn foam when passing over rocks
    for (let i = rs.waves.length - 1; i >= 0; i--) {
        const w = rs.waves[i];
        w.x    += w.speed * dt;
        w.life += dt;
        if (w.x - w.rx > rs.riverRight) { rs.waves.splice(i, 1); continue; }
        for (const rock of rs.rocks) {
            const dx = rock.x - w.x;
            const dy = rock.y - w.y;
            if (Math.abs(dx) < w.rx + rock.r && Math.abs(dy) < w.ry + rock.r) {
                if (Math.random() < dt * 18) {
                    const foamAngle = Math.random() * Math.PI * 2;
                    riverSpawnSplash(
                        rock.x + Math.cos(foamAngle) * rock.r * 0.7,
                        rock.y + Math.sin(foamAngle) * rock.r * 0.7,
                        3
                    );
                }
            }
        }
    }

    // Update ripples (scroll left → right)
    for (let i = 0; i < rs.ripples.length; i++) {
        const r = rs.ripples[i];
        r.x += r.speed * dt;
        if (r.x > rs.riverRight + 10) {
            rs.ripples[i] = riverMakeRipple(false, r.layer);
        }
    }

    // Update splash particles
    for (let i = rs.particles.length - 1; i >= 0; i--) {
        const p = rs.particles[i];
        p.vx   += rs.windForce * 0.08 * dt;  // current pushes particles right
        for (const w of rs.waves) {           // waves push particles they overlap
            const dx = p.x - w.x;
            const dy = p.y - w.y;
            if (Math.abs(dx) < w.rx && Math.abs(dy) < w.ry) {
                p.vx += w.force * 0.004 * dt;
            }
        }
        p.x    += p.vx * dt;
        p.y    += p.vy * dt;
        p.vx   *= Math.pow(0.88, dt * 60);  // drag
        p.vy   *= Math.pow(0.88, dt * 60);
        p.vy   += 60 * dt;
        p.life -= dt;
        if (p.life <= 0) rs.particles.splice(i, 1);
    }

    // Win: wagon reaches far (top) bank
    if (rs.wagonY - HH <= rs.farBankY && !rs.crossed) {
        rs.crossed = true;
        riverEndGame();
    }
}

// ─── Spawn a wave (wagon-sized, drifts left→right) ───────────────
function riverSpawnWave() {
    const rs = riverState;
    const r  = RIVER_CFG.WAGON_W * 0.55 + Math.random() * RIVER_CFG.WAGON_W * 0.35; // ~29–47px radius
    // Interpolate wave body color: calm blue (diff 0) → murky green-grey (diff 4)
    const t  = Math.min(rs.difficulty / 4, 1);
    const wR = Math.round(160 + t * (100 - 160));
    const wG = Math.round(210 + t * (170 - 210));
    const wB = Math.round(240 + t * (150 - 240));
    const waveBodyColor = `${wR},${wG},${wB}`;
    rs.waves.push({
        x:     rs.riverLeft - r,
        y:     rs.farBankY + r + Math.random() * (rs.nearBankY - rs.farBankY - r * 2),
        r,
        rx:    r * (2.2 + Math.random() * 0.8),  // wide horizontal extent
        ry:    r * (1.2 + Math.random() * 0.6),  // tall vertical extent
        speed: 70 + rs.windForce * 0.9 + Math.random() * 50,
        force: 900,
        alpha: 0.28 + Math.random() * 0.22,
        life:        0,  // seconds alive, used for fade-in
        soundPlayed: false,
        color: waveBodyColor,
    });
}

// ─── Spawn splash particles ──────────────────────────────────────
function riverSpawnSplash(x, y, count) {
    const wind = riverState.windForce;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = 30 + Math.random() * 90;
        const life  = 0.25 + Math.random() * 0.35;
        riverState.particles.push({
            x, y,
            vx: Math.cos(angle) * spd + wind * 0.15,
            vy: Math.sin(angle) * spd - 40,
            life,
            maxLife: life,
            r: 2 + Math.random() * 3,
            rot: Math.random() * Math.PI * 2,
        });
    }
}

// ─── Draw ────────────────────────────────────────────────────────
function riverDraw() {
    const rs  = riverState;
    const ctx = rs.ctx;
    const W   = rs.W;
    const H   = rs.H;

    // Difficulty-tinted background and water (sunny blue → stormy grey-green)
    const dt2 = Math.min(rs.difficulty / 4, 1);
    const bgR = Math.round(30  + dt2 * (45  - 30));
    const bgG = Math.round(80  + dt2 * (65  - 80));
    const bgB = Math.round(128 + dt2 * (80  - 128));
    ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
    ctx.fillRect(0, 0, W, H);

    // River water area (between banks)
    const wR1 = Math.round(22  + dt2 * (35  - 22));
    const wG1 = Math.round(61  + dt2 * (52  - 61));
    const wB1 = Math.round(96  + dt2 * (62  - 96));
    const wR2 = Math.round(30  + dt2 * (42  - 30));
    const wG2 = Math.round(90  + dt2 * (75  - 90));
    const wB2 = Math.round(138 + dt2 * (90  - 138));
    const waterGrad = ctx.createLinearGradient(rs.riverLeft, 0, rs.riverRight, 0);
    waterGrad.addColorStop(0,    `rgb(${wR1},${wG1},${wB1})`);
    waterGrad.addColorStop(0.25, `rgb(${wR2},${wG2},${wB2})`);
    waterGrad.addColorStop(0.75, `rgb(${wR2},${wG2},${wB2})`);
    waterGrad.addColorStop(1,    `rgb(${wR1},${wG1},${wB1})`);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(rs.riverLeft, rs.farBankY, rs.riverRight - rs.riverLeft, rs.nearBankY - rs.farBankY);

    // Water ripples flowing LEFT → RIGHT (3 parallax layers)
    const rippleColors = ['#4a9ab8', '#6ab8d8', '#90d0e8'];
    for (const rip of rs.ripples) {
        ctx.save();
        ctx.globalAlpha = rip.alpha;
        ctx.strokeStyle = rippleColors[rip.layer];
        ctx.lineWidth   = rip.thick;
        ctx.beginPath();
        ctx.moveTo(rip.x,           rip.y);
        ctx.lineTo(rip.x + rip.len, rip.y + 2);
        ctx.stroke();
        ctx.restore();
    }

    // Waves — elongated crests drifting left → right
    for (const w of rs.waves) {
        const fadeIn = Math.min(1, w.life / 0.3);
        const alpha  = w.alpha * fadeIn;
        ctx.save();
        ctx.translate(w.x, w.y);

        // Body: horizontal linear gradient, bright leading edge fading to wake
        ctx.globalAlpha = alpha * 0.55;
        const bodyGrad = ctx.createLinearGradient(-w.rx, 0, w.rx * 0.4, 0);
        bodyGrad.addColorStop(0,    'rgba(255,255,255,0)');
        bodyGrad.addColorStop(0.55, `rgba(${w.color},0.25)`);
        bodyGrad.addColorStop(0.82, `rgba(${w.color},0.55)`);
        bodyGrad.addColorStop(1,    `rgba(${w.color},0.7)`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, w.rx, w.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Foam crest: bright horizontal line at the leading edge
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgba(240,252,255,0.92)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w.rx * 0.75, -w.ry * 0.2);
        ctx.lineTo( w.rx * 0.95, -w.ry * 0.2);
        ctx.stroke();

        // Secondary softer crest line behind the first
        ctx.globalAlpha = alpha * 0.45;
        ctx.strokeStyle = 'rgba(200,238,255,0.7)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(-w.rx * 0.6,  w.ry * 0.25);
        ctx.lineTo( w.rx * 0.75, w.ry * 0.25);
        ctx.stroke();

        ctx.restore();
    }

    // Far (top) bank — destination
    riverDrawHorizBank(ctx, 0, 0, W, rs.farBankY, false);

    // Near (bottom) bank — start
    riverDrawHorizBank(ctx, 0, rs.nearBankY, W, H - rs.nearBankY, true);

    // River vegetation (behind rocks and wagon)
    riverDrawVegetation(ctx, rs.vegetation);


    // Rocks (fixed)
    for (const rock of rs.rocks) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.rot);
        ctx.scale(rock.scaleX, rock.scaleY);

        // Rock shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 5, rock.r, rock.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body (no color change on hit)
        ctx.fillStyle = '#6a6258';
        ctx.beginPath();
        ctx.ellipse(0, 0, rock.r, rock.r * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock edge
        ctx.strokeStyle = '#4a4238';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath();
        ctx.ellipse(-rock.r * 0.28, -rock.r * 0.28, rock.r * 0.38, rock.r * 0.22, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Splash particles
    for (const p of rs.particles) {
        ctx.save();
        ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
        ctx.fillStyle   = '#b8ddf0';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Wagon (with vertical bob)
    const bobY = Math.sin(rs.wagonBob) * 2.5;
    riverDrawWagon(ctx, rs.wagonX, rs.wagonY + bobY, rs.wagonAngle, rs.wagonHit);

    // HUD
    riverDrawHUD(ctx);
}

// ─── Draw horizontal bank (top or bottom strip) ──────────────────
function riverDrawHorizBank(ctx, x, y, w, h, isNear) {
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    if (isNear) {
        // bottom start bank: lighter at top edge (water interface)
        grad.addColorStop(0,   '#7a5a3a');
        grad.addColorStop(0.3, '#5a3e22');
        grad.addColorStop(1,   '#3a2810');
    } else {
        // top far bank: lighter at bottom edge
        grad.addColorStop(0,   '#3a2810');
        grad.addColorStop(0.7, '#5a3e22');
        grad.addColorStop(1,   '#7a5a3a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Sandy strip along water edge with wavy curve
    const edgeY = isNear ? y : y + h;
    const sandH = isNear ? -14 : 14;
    ctx.save();
    ctx.fillStyle = '#b89558';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, edgeY);
    for (let sx = x; sx <= x + w; sx += 8) {
        const wave = Math.sin(sx * 0.08) * 4 + Math.sin(sx * 0.033) * 3;
        ctx.lineTo(sx, edgeY + sandH + wave);
    }
    ctx.lineTo(x + w, edgeY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Label on near bank
    if (isNear) {
        ctx.fillStyle = '#f4e8d0';
        ctx.font      = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('START — CROSS THE RIVER', w / 2, y + 16);
    }
}

// ─── Draw river vegetation ────────────────────────────────────────
function riverDrawVegetation(ctx, items) {
    for (const v of items) {
        ctx.save();
        if (v.type === 'reed') {
            for (const s of v.stems) {
                const tx = v.x + s.ox;
                const ty = v.y;
                // Stem
                ctx.strokeStyle = '#5a8030';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.quadraticCurveTo(tx + s.lean * 0.5, ty - s.h * s.seedH, tx + s.lean, ty - s.h);
                ctx.stroke();
                // Seed pod
                ctx.fillStyle = '#7a5018';
                ctx.beginPath();
                ctx.ellipse(tx + s.lean, ty - s.h, 2, 5, 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (v.type === 'lily') {
            // Pad
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#3a7a28';
            ctx.strokeStyle = '#2a5a18';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(v.x, v.y, v.r, v.r * 0.6, v.rot, v.notchA + 0.25, v.notchA + Math.PI * 2 - 0.25);
            ctx.lineTo(v.x, v.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (v.flower) {
                // Flower
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#f8e8c0';
                ctx.beginPath();
                ctx.arc(v.x, v.y - v.r * 0.15, v.r * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#f0c040';
                ctx.beginPath();
                ctx.arc(v.x, v.y - v.r * 0.15, v.r * 0.14, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (v.type === 'grass') {
            ctx.strokeStyle = '#6a9030';
            ctx.lineWidth = 1.5;
            for (const b of v.blades) {
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.quadraticCurveTo(
                    v.x + Math.cos(b.angle) * b.len * 0.5,
                    v.y + Math.sin(b.angle) * b.len * 0.5 - 4,
                    v.x + Math.cos(b.angle) * b.len,
                    v.y + Math.sin(b.angle) * b.len
                );
                ctx.stroke();
            }
        } else if (v.type === 'log') {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#4a3018';
            ctx.strokeStyle = '#2a1808';
            ctx.lineWidth = 1;
            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.rot);
            ctx.beginPath();
            ctx.ellipse(0, 0, v.len / 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Bark lines
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#2a1808';
            ctx.lineWidth = 0.7;
            for (let i = -v.len * 0.3; i < v.len * 0.3; i += v.len * 0.2) {
                ctx.beginPath();
                ctx.moveTo(i, -3);
                ctx.lineTo(i + 3, 3);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }
}

// ─── Draw the wagon (no wheels) ──────────────────────────────────
function riverDrawWagon(ctx, x, y, angle, isHit) {
    const BW     = RIVER_CFG.WAGON_W;
    const BH     = 18;
    const coverH = 22;

    // Hit flash: alternate red tint
    const flashOn  = isHit && Math.floor(Date.now() / 80) % 2 === 0;
    const bodyColor  = flashOn ? '#cc2020' : '#7a4e24';
    const coverColor = flashOn ? '#ff8888' : '#f0e8d4';
    const borderColor = flashOn ? '#880000' : '#4a2e0e';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow on water
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(2, BH / 2 + 5, BW / 2 + 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wagon body
    ctx.fillStyle   = bodyColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(-BW / 2, -BH / 2, BW, BH, 3);
    ctx.fill();
    ctx.stroke();

    // Body plank lines
    ctx.strokeStyle = flashOn ? 'rgba(255,100,100,0.3)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth   = 1;
    for (let px = -BW / 2 + 10; px < BW / 2 - 4; px += 10) {
        ctx.beginPath();
        ctx.moveTo(px, -BH / 2);
        ctx.lineTo(px,  BH / 2);
        ctx.stroke();
    }

    // Canvas cover (bonnet)
    ctx.fillStyle   = coverColor;
    ctx.strokeStyle = flashOn ? '#cc6666' : '#b8a078';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(-BW / 2 + 4, -BH / 2);
    ctx.bezierCurveTo(
        -BW / 2 + 4, -BH / 2 - coverH,
         BW / 2 - 4, -BH / 2 - coverH,
         BW / 2 - 4, -BH / 2
    );
    ctx.fill();
    ctx.stroke();

    // Cover ribs
    ctx.strokeStyle = flashOn ? 'rgba(200,80,80,0.2)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth   = 1;
    for (let rib = -BW / 2 + 14; rib < BW / 2 - 4; rib += 12) {
        const t  = (rib + BW / 2 - 4) / (BW - 8);
        const ty = -BH / 2 - coverH * Math.sin(Math.PI * t) * 0.92;
        ctx.beginPath();
        ctx.moveTo(rib, -BH / 2);
        ctx.lineTo(rib, ty);
        ctx.stroke();
    }

    ctx.restore();
}

// ─── Draw HUD ────────────────────────────────────────────────────
function riverDrawHUD(ctx) {
    const rs = riverState;
    const W  = rs.W;

    // Top bar
    ctx.fillStyle = 'rgba(8,5,2,0.75)';
    ctx.fillRect(0, 0, W, 38);

    // Hits
    ctx.font      = '11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a08c6a';
    ctx.fillText('HITS', 14, 14);
    ctx.font      = '18px Courier New';
    ctx.fillStyle = rs.hitCount > 0 ? '#ff6b6b' : '#f0e6d0';
    ctx.fillText(rs.hitCount, 14, 32);

    // Centre instructions
    ctx.textAlign = 'center';
    ctx.font      = '11px Courier New';
    ctx.fillStyle = '#a08c6a';
    ctx.fillText('ARROW KEYS TO STEER', W / 2, 14);
    ctx.font      = '13px Courier New';
    ctx.fillStyle = '#f0e6d0';
    ctx.fillText('↑ forward  ↓ back  ← → steer', W / 2, 30);

    // Progress bar (0 = at bottom start, 1 = at top far bank)
    const riverH   = rs.nearBankY - rs.farBankY;
    const progress = Math.max(0, Math.min(1,
        1 - (rs.wagonY - rs.farBankY) / (riverH - RIVER_CFG.WAGON_H)
    ));
    const barW = 120;
    const barX = W - barW - 14;
    ctx.textAlign = 'right';
    ctx.font      = '11px Courier New';
    ctx.fillStyle = '#a08c6a';
    ctx.fillText('PROGRESS', W - 14, 14);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(barX, 20, barW, 10);
    ctx.fillStyle = '#51cf66';
    ctx.fillRect(barX, 20, barW * progress, 10);
    ctx.strokeStyle = '#4a7a4a';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX, 20, barW, 10);

}

// ─── End game ────────────────────────────────────────────────────
function riverEndGame() {
    const rs = riverState;
    rs.gameActive = false;
    cancelAnimationFrame(rs.animFrameId);
    document.removeEventListener('keydown', rs.keydownHandler);
    document.removeEventListener('keyup',   rs.keyupHandler);
    riverStopAmbient();
    riverPlaySuccess();

    let outcome;
    if      (rs.hitCount === 0) { outcome = 'perfect'; rs.perfectCrossings++; }
    else if (rs.hitCount <= 1)  { outcome = 'good'; }
    else if (rs.hitCount <= 3)  { outcome = 'ok'; }
    else                         { outcome = 'bad'; }

    gameState.day++;

    const wl  = rs.waterLevel;
    const cur = rs.currentStrength;
    let message = '', statusTitle = '', statusColor = '#51cf66';

    // Food loss: 5% per rock hit, capped at 60%
    const foodPct  = Math.min(rs.hitCount * 0.05, 0.60);
    const foodLoss = Math.floor(gameState.food * foodPct);
    if (foodLoss > 0) gameState.food = Math.max(0, gameState.food - foodLoss);
    const foodMsg  = foodLoss > 0 ? ', -' + foodLoss + ' lbs food' : '';

    // Health loss: 5 per rock hit, capped at 30
    const healthLoss = Math.min(rs.hitCount * 5, 30);
    const rankMsg    = healthLoss > 0 ? applyHealthChange(-healthLoss) : '';
    const healthMsg  = healthLoss > 0 ? ', -' + healthLoss + ' health' : '';

    switch (outcome) {
        case 'perfect':
            statusTitle = '🎉 PERFECT CROSSING!';
            statusColor = '#51cf66';
            message = 'Flawless! Avoided every rock in the river. (' + wl + ', ' + cur + ' wind) Everyone is safe!';
            if (rs.difficulty >= 3) {
                const morale   = Math.floor(Math.random() * 5) + 5;
                const moraleMsg = applyHealthChange(morale);
                message += ' Skill in dangerous conditions boosted morale! +' + morale + ' health' + moraleMsg;
            }
            break;
        case 'good':
            statusTitle = '✅ Safe Crossing';
            statusColor = '#80cf80';
            message = 'Made it across with only a glancing blow. (' + wl + ', ' + cur + ' wind) No serious losses' + healthMsg + foodMsg + rankMsg + '.';
            break;
        case 'ok':
            statusTitle = '⚠️ Rough Crossing';
            statusColor = '#ffc107';
            message = 'Hit several rocks crossing. (' + wl + ', ' + cur + ' wind) Exhausting journey' + healthMsg + foodMsg + rankMsg + '.';
            break;
        case 'bad':
            statusTitle = '💥 DISASTROUS CROSSING!';
            statusColor = '#ff6b6b';
            message = 'Battered by rocks and wind gusts! (' + wl + ', ' + cur + ' wind)' + healthMsg + foodMsg + rankMsg + '.';
            break;
    }

    logEntry(message, 'event');

    setTimeout(() => {
        const overlay = document.getElementById('riverOverlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <h1 style="color:${statusColor}">${statusTitle}</h1>
            <div class="river-instructions-text" style="margin-bottom:18px">${message}</div>
            <button class="hunting-btn" id="riverDoneBtn">Continue Journey</button>
        `;
        document.getElementById('riverDoneBtn').addEventListener('click', riverFinish);
    }, 600);
}

// ─── Finish and return to main game ─────────────────────────────
function riverFinish() {
    gameState.atRiver            = false;
    gameState.awaitingChoice     = false;
    gameState.currentRiverName   = null;
    gameState.currentStrength    = null;
    gameState.riverLockedWidth   = false;
    gameState.riverLockedCurrent = false;
    gameState.riverScoutAttempts = 0;
    gameState.riverWaitAttempts  = 0;

    document.getElementById('flipInner').classList.remove('flipped');

    setTimeout(() => {
        const el = document.querySelector('#riverOverlay .river-instructions-text');
        showMessage(el ? el.textContent : '');
        restoreNormalButtons();
        checkGameState();
        updateDisplay();
    }, 850);
}

// ─── Stats helpers ───────────────────────────────────────────────
function getCrossingStats() {
    return {
        attempts:    riverState.crossingAttempts,
        perfect:     riverState.perfectCrossings,
        successRate: riverState.crossingAttempts > 0
            ? ((riverState.perfectCrossings / riverState.crossingAttempts) * 100).toFixed(1) + '%'
            : 'N/A',
    };
}

function resetRiverStats() {
    riverState.crossingAttempts = 0;
    riverState.perfectCrossings = 0;
}
