// ============= HUNTING MINI-GAME (Canvas-based) =============

const CARRY_LIMIT = 100;

// Hunting mini-game state
let huntingState = {
    gameActive: false,
    canvas: null,
    ctx: null,
    W: 660,
    H: 420,
    ammo: 20,
    startingAmmo: 20,
    shotsHit: 0,
    timeLeft: 45,
    totalMeat: 0,
    lastTime: 0,
    spawnTimer: 0,
    mouseX: 330,
    mouseY: 210,
    animals: [],
    bullets: [],
    particles: [],
    floatingTexts: [],
    clouds: [],
    grassTufts: [],
    trees: [],
    audioCtx: null,
    animFrameId: null
};

// ─── Audio Context (simple synth sounds) ─────────
function huntInitAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!huntingState.audioCtx) huntingState.audioCtx = new AudioCtx();
}

function huntPlayGunshot() {
    if (!huntingState.audioCtx) return;
    const ac = huntingState.audioCtx;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.04));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.value = 0.25;
    src.connect(gain).connect(ac.destination);
    src.start();
}

function huntPlayHit() {
    if (!huntingState.audioCtx) return;
    const ac = huntingState.audioCtx;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.setValueAtTime(250, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.2);
}

// ─── Scenery Generation ──────────────────────────
function huntGenerateScenery() {
    const W = huntingState.W;
    const H = huntingState.H;

    huntingState.clouds = [];
    for (let i = 0; i < 6; i++) {
        huntingState.clouds.push({
            x: Math.random() * W,
            y: 20 + Math.random() * 60,
            w: 40 + Math.random() * 80,
            h: 14 + Math.random() * 18,
            speed: 4 + Math.random() * 8
        });
    }

    huntingState.grassTufts = [];
    for (let i = 0; i < 60; i++) {
        huntingState.grassTufts.push({
            x: Math.random() * W,
            y: 240 + Math.random() * 180,
            h: 4 + Math.random() * 12,
            sway: Math.random() * Math.PI * 2
        });
    }

    huntingState.trees = [];
    for (let i = 0; i < 6; i++) {
        huntingState.trees.push({
            x: Math.random() * W,
            y: 195 + Math.random() * 30,
            scale: 0.3 + Math.random() * 0.25,
            layer: 0
        });
    }
    for (let i = 0; i < 3; i++) {
        huntingState.trees.push({
            x: Math.random() * W,
            y: 255 + Math.random() * 60,
            scale: 0.5 + Math.random() * 0.4,
            layer: 1
        });
    }
    huntingState.trees.sort((a, b) => a.y - b.y);
}

// ─── Animal Definitions ──────────────────────────
const ANIMAL_TYPES = {
    deer: {
        name: 'Deer', meat: 20, speed: 80, fleeSpeed: 200,
        w: 50, h: 40, color: '#a0784a',
        spawnY: [225, 345], drawFn: drawDeer
    },
    bison: {
        name: 'Bison', meat: 35, speed: 40, fleeSpeed: 120,
        w: 70, h: 50, color: '#5a3e28',
        spawnY: [255, 350], drawFn: drawBison
    },
    rabbit: {
        name: 'Rabbit', meat: 4, speed: 120, fleeSpeed: 240,
        w: 20, h: 16, color: '#b0a088',
        spawnY: [300, 390], drawFn: drawRabbit
    },
    eagle: {
        name: 'Eagle', meat: 8, speed: 100, fleeSpeed: 220,
        w: 40, h: 20, color: '#4a3828',
        spawnY: [60, 150], drawFn: drawEagle
    }
};

// ─── Animal Drawing Functions ────────────────────
function drawDeer(a) {
    const ctx = huntingState.ctx;
    const dir = a.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(dir, 1);

    ctx.fillStyle = a.type.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b8906a';
    ctx.beginPath();
    ctx.ellipse(22, -10, 10, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(28, -12, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8a7050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, -18); ctx.lineTo(20, -30); ctx.lineTo(15, -26);
    ctx.moveTo(20, -30); ctx.lineTo(25, -34);
    ctx.moveTo(26, -18); ctx.lineTo(30, -28); ctx.lineTo(35, -24);
    ctx.stroke();

    ctx.strokeStyle = a.type.color;
    ctx.lineWidth = 3;
    const legAnim = Math.sin(Date.now() * 0.01 * a.animSpeed) * 8;
    ctx.beginPath();
    ctx.moveTo(-10, 12); ctx.lineTo(-12, 12 + 16 + legAnim);
    ctx.moveTo(10, 12); ctx.lineTo(12, 12 + 16 - legAnim);
    ctx.moveTo(-4, 12); ctx.lineTo(-6, 12 + 14 - legAnim);
    ctx.moveTo(4, 12); ctx.lineTo(6, 12 + 14 + legAnim);
    ctx.stroke();

    ctx.fillStyle = '#d8c8a8';
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 6, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#f0e8d8';
    ctx.beginPath();
    ctx.ellipse(-26, -4, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawBison(a) {
    const ctx = huntingState.ctx;
    const dir = a.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(dir, 1);

    ctx.fillStyle = a.type.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a3420';
    ctx.beginPath();
    ctx.ellipse(10, -18, 18, 12, 0.2, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a2818';
    ctx.beginPath();
    ctx.ellipse(30, -4, 14, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a1c10';
    ctx.beginPath();
    ctx.ellipse(34, 8, 8, 10, 0.2, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#8a8070';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, -16); ctx.quadraticCurveTo(22, -28, 26, -30);
    ctx.moveTo(34, -16); ctx.quadraticCurveTo(40, -28, 38, -30);
    ctx.stroke();

    ctx.fillStyle = '#0a0804';
    ctx.beginPath();
    ctx.arc(36, -8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 5;
    const legAnim = Math.sin(Date.now() * 0.008 * a.animSpeed) * 6;
    ctx.beginPath();
    ctx.moveTo(-16, 18); ctx.lineTo(-18, 18 + 18 + legAnim);
    ctx.moveTo(16, 18); ctx.lineTo(18, 18 + 18 - legAnim);
    ctx.moveTo(-6, 18); ctx.lineTo(-8, 18 + 16 - legAnim);
    ctx.moveTo(6, 18); ctx.lineTo(8, 18 + 16 + legAnim);
    ctx.stroke();

    ctx.restore();
}

function drawRabbit(a) {
    const ctx = huntingState.ctx;
    const dir = a.vx >= 0 ? 1 : -1;
    const hop = Math.abs(Math.sin(Date.now() * 0.012 * a.animSpeed)) * 8;
    ctx.save();
    ctx.translate(a.x, a.y - hop);
    ctx.scale(dir, 1);

    ctx.fillStyle = a.type.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b8a890';
    ctx.beginPath();
    ctx.ellipse(10, -4, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c0b098';
    ctx.beginPath();
    ctx.ellipse(8, -14, 3, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(13, -13, 3, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d8a8a0';
    ctx.beginPath();
    ctx.ellipse(8, -14, 1.5, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(14, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.arc(-11, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawEagle(a) {
    const ctx = huntingState.ctx;
    const dir = a.vx >= 0 ? 1 : -1;
    const wingFlap = Math.sin(Date.now() * 0.008 * a.animSpeed) * 12;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(dir, 1);

    ctx.fillStyle = a.type.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-20, -8 + wingFlap, -30, -4 + wingFlap);
    ctx.quadraticCurveTo(-20, 4, 0, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20, -8 - wingFlap, 30, -4 - wingFlap);
    ctx.quadraticCurveTo(20, 4, 0, 2);
    ctx.fill();

    ctx.fillStyle = '#3a2818';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath();
    ctx.ellipse(12, -2, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c8a020';
    ctx.beginPath();
    ctx.moveTo(17, -2); ctx.lineTo(22, -1); ctx.lineTo(17, 1);
    ctx.fill();

    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(14, -3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a3828';
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-20, -3); ctx.lineTo(-18, 2);
    ctx.lineTo(-20, 5); ctx.lineTo(-12, 2);
    ctx.fill();

    ctx.restore();
}

// ─── Spawn Animals ───────────────────────────────
function huntSpawnAnimal() {
    const W = huntingState.W;
    const types = ['deer', 'deer', 'bison', 'rabbit', 'rabbit', 'rabbit', 'eagle'];
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = ANIMAL_TYPES[typeKey];
    const fromLeft = Math.random() > 0.5;
    const y = type.spawnY[0] + Math.random() * (type.spawnY[1] - type.spawnY[0]);

    huntingState.animals.push({
        x: fromLeft ? -60 : W + 60,
        y: y,
        vx: (fromLeft ? 1 : -1) * (type.speed + Math.random() * 20),
        vy: typeKey === 'eagle' ? (Math.random() - 0.5) * 20 : 0,
        type: type,
        typeKey: typeKey,
        fleeing: false,
        alive: true,
        animSpeed: 0.8 + Math.random() * 0.6,
        hitRadius: Math.max(type.w, type.h) * 0.45
    });
}

// ─── Particles ───────────────────────────────────
function huntSpawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 80;
        huntingState.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 0.5 + Math.random() * 0.5,
            size: 2 + Math.random() * 4,
            color: color
        });
    }
}

function huntSpawnDustTrail(x, y) {
    for (let i = 0; i < 3; i++) {
        huntingState.particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + 10,
            vx: (Math.random() - 0.5) * 15,
            vy: -5 - Math.random() * 15,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.3 + Math.random() * 0.3,
            size: 3 + Math.random() * 5,
            color: '#a09878'
        });
    }
}

function huntAddFloatingText(x, y, text, color) {
    huntingState.floatingTexts.push({
        x, y, text, color,
        life: 1.5, maxLife: 1.5, vy: -40
    });
}

// ─── Shooting ────────────────────────────────────
function huntShoot(mx, my) {
    const hs = huntingState;
    if (hs.ammo <= 0 || !hs.gameActive) return;
    hs.ammo--;
    huntInitAudio();
    huntPlayGunshot();

    huntSpawnParticles(mx, my, '#f8e8a0', 3);

    const speed = 600;
    const dx = mx - hs.W / 2;
    const dy = my - hs.H * 0.9;
    const dist = Math.sqrt(dx * dx + dy * dy);
    hs.bullets.push({
        x: hs.W / 2, y: hs.H * 0.9,
        vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        targetX: mx, targetY: my, life: 1.2
    });

    hs.animals.forEach(a => {
        if (!a.alive) return;
        const d = Math.sqrt((a.x - mx) ** 2 + (a.y - my) ** 2);
        if (d < 250) {
            a.fleeing = true;
            const fleeAngle = Math.atan2(a.y - my, a.x - mx);
            a.vx = Math.cos(fleeAngle) * a.type.fleeSpeed;
            if (a.typeKey !== 'eagle') {
                a.vy = 0;
            } else {
                a.vy = Math.sin(fleeAngle) * a.type.fleeSpeed * 0.5;
            }
        }
    });

    huntUpdateHUD();
}

// ─── Drawing Helpers ─────────────────────────────
function huntDrawSky() {
    const ctx = huntingState.ctx;
    const W = huntingState.W;
    const grad = ctx.createLinearGradient(0, 0, 0, 225);
    grad.addColorStop(0, '#4a6e8a');
    grad.addColorStop(0.4, '#7a9ab0');
    grad.addColorStop(0.7, '#c8b898');
    grad.addColorStop(1, '#d8c8a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 225);
}

function huntDrawSun() {
    const ctx = huntingState.ctx;
    const sunX = 555;
    const sunY = 52;
    const grad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 60);
    grad.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 220, 140, 0.3)');
    grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sunX - 60, sunY - 60, 120, 120);

    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
    ctx.fill();
}

function huntDrawMountains() {
    const ctx = huntingState.ctx;
    const W = huntingState.W;
    ctx.fillStyle = '#6a7a68';
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.lineTo(60, 135); ctx.lineTo(135, 180); ctx.lineTo(225, 120);
    ctx.lineTo(315, 172); ctx.lineTo(375, 142); ctx.lineTo(465, 165);
    ctx.lineTo(562, 127); ctx.lineTo(637, 157); ctx.lineTo(W, 187);
    ctx.lineTo(W, 225); ctx.lineTo(0, 225);
    ctx.fill();

    ctx.fillStyle = '#e8e8e0';
    ctx.beginPath();
    ctx.moveTo(217, 124); ctx.lineTo(225, 120); ctx.lineTo(233, 125); ctx.lineTo(225, 131);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(368, 146); ctx.lineTo(375, 142); ctx.lineTo(382, 148); ctx.lineTo(375, 152);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(555, 131); ctx.lineTo(562, 127); ctx.lineTo(569, 133); ctx.lineTo(562, 137);
    ctx.fill();
}

function huntDrawGround() {
    const ctx = huntingState.ctx;
    const W = huntingState.W;
    const H = huntingState.H;
    const grad = ctx.createLinearGradient(0, 210, 0, H);
    grad.addColorStop(0, '#7a8a50');
    grad.addColorStop(0.15, '#6a7a40');
    grad.addColorStop(0.5, '#5a6a35');
    grad.addColorStop(1, '#4a5a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 210, W, H - 210);

    ctx.fillStyle = 'rgba(120, 100, 70, 0.25)';
    ctx.beginPath();
    ctx.moveTo(260, H);
    ctx.quadraticCurveTo(300, 315, 345, 225);
    ctx.lineTo(360, 225);
    ctx.quadraticCurveTo(330, 315, 310, H);
    ctx.fill();
}

function huntDrawTree(t) {
    const ctx = huntingState.ctx;
    const s = t.scale;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(s, s);

    const alpha = t.layer === 0 ? 0.6 : 1;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = '#5a4430';
    ctx.fillRect(-5, -10, 10, 50);

    const colors = ['#3a5a28', '#4a6a30', '#3a5020'];
    colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, -50 - i * 5);
        ctx.lineTo(-22 + i * 3, -10 + i * 8);
        ctx.lineTo(22 - i * 3, -10 + i * 8);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.restore();
}

function huntDrawClouds(dt) {
    const ctx = huntingState.ctx;
    const W = huntingState.W;
    ctx.fillStyle = 'rgba(240, 235, 225, 0.5)';
    huntingState.clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > W + c.w) c.x = -c.w;

        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w * 0.5, c.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x - c.w * 0.25, c.y + 4, c.w * 0.3, c.h * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.w * 0.25, c.y + 2, c.w * 0.35, c.h * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

function huntDrawGrassTufts(dt) {
    const ctx = huntingState.ctx;
    ctx.strokeStyle = '#6a8a40';
    ctx.lineWidth = 1.5;
    const t = Date.now() * 0.001;
    huntingState.grassTufts.forEach(g => {
        const sway = Math.sin(t + g.sway) * 3;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.quadraticCurveTo(g.x + sway, g.y - g.h * 0.6, g.x + sway * 1.5, g.y - g.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(g.x + 3, g.y);
        ctx.quadraticCurveTo(g.x + 3 - sway * 0.5, g.y - g.h * 0.5, g.x + 3 - sway, g.y - g.h * 0.8);
        ctx.stroke();
    });
}

function huntDrawCrosshair() {
    const ctx = huntingState.ctx;
    const mx = huntingState.mouseX;
    const my = huntingState.mouseY;
    ctx.save();
    ctx.strokeStyle = 'rgba(240, 230, 200, 0.9)';
    ctx.lineWidth = 1.5;
    const r = 14;

    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx - r - 6, my); ctx.lineTo(mx - r + 4, my);
    ctx.moveTo(mx + r + 6, my); ctx.lineTo(mx + r - 4, my);
    ctx.moveTo(mx, my - r - 6); ctx.lineTo(mx, my - r + 4);
    ctx.moveTo(mx, my + r + 6); ctx.lineTo(mx, my + r - 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(240, 200, 140, 0.8)';
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ─── HUD ─────────────────────────────────────────
function huntUpdateHUD() {
    const hs = huntingState;
    document.getElementById('hunting-hud-ammo').textContent = hs.ammo;
    const mins = Math.floor(hs.timeLeft / 60);
    const secs = Math.floor(hs.timeLeft % 60);
    document.getElementById('hunting-hud-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('hunting-hud-meat').textContent = hs.totalMeat;
}

// ─── End Hunting & Return to Main Game ───────────
function huntEndGame() {
    const hs = huntingState;
    hs.gameActive = false;

    if (hs.animFrameId) {
        cancelAnimationFrame(hs.animFrameId);
        hs.animFrameId = null;
    }

    const leaveBtn = document.getElementById('hunting-leave-btn');
    if (leaveBtn) leaveBtn.style.display = 'none';

    gameState.bullets = hs.ammo;

    const carried = Math.min(hs.totalMeat, CARRY_LIMIT);
    const wasted = hs.totalMeat - carried;
    const foodFound = carried;

    const shotsFired = hs.startingAmmo - hs.ammo;
    const misses = Math.max(0, shotsFired - hs.shotsHit);
    const missConsequence = rollHuntMissConsequence(misses, foodFound);

    // Show results overlay briefly, then return to main game
    const overlay = document.getElementById('hunting-message-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    const reachedCarryLimit = hs.totalMeat >= CARRY_LIMIT;
    let html = `<h1>Hunt Complete</h1>`;
    html += reachedCarryLimit 
        ? `<h2>You have killed all the meat you can carry, no need to waste any more ammo tonight.</h2>`
        : `<h2>The sun dips below the horizon...</h2>`;
    html += `<div class="hunting-results">`;
    html += `Total meat killed: <span class="hunting-highlight">${hs.totalMeat} lbs</span><br>`;
    html += `Carried back to wagon: <span class="hunting-highlight">${carried} lbs</span><br>`;
    html += `Bullets remaining: <span class="hunting-highlight">${hs.ammo}</span>`;
    html += `</div>`;

    if (wasted > 0) {
        html += `<div class="hunting-carry-warning">You couldn't carry ${wasted} lbs. It was left to rot on the trail.</div>`;
    }

    if (missConsequence) {
        html += `<div class="hunting-carry-warning">${missConsequence.message}</div>`;
    }

    html += `<button class="hunting-btn" id="huntingReturnBtn">Return to Trail</button>`;
    overlay.innerHTML = html;

    document.getElementById('huntingReturnBtn').addEventListener('click', () => {
        // Apply results to main game state
        gameState.day++;
        gameState.food += foodFound;

        if (missConsequence) {
            if (missConsequence.healthLoss) {
                applyHealthChange(-missConsequence.healthLoss);
            }
            if (missConsequence.foodLoss) {
                gameState.food = Math.max(0, gameState.food - missConsequence.foodLoss);
                checkFoodWarnings();
            }
            logEntry(missConsequence.message, "danger");
        }

        let message = '';
        if (foodFound === 0) {
            message = `The hunt was unsuccessful. No food brought back.`;
        } else if (foodFound < 50) {
            message = `Slim pickings. Brought back ${foodFound} lbs of food.`;
        } else if (foodFound < 100) {
            message = `A decent hunt! Brought back ${foodFound} lbs of food.`;
        } else {
            message = `An excellent hunt! Brought back ${foodFound} lbs of food!`;
        }

        if (wasted > 0) {
            message += ` (${wasted} lbs left behind — can only carry ${CARRY_LIMIT} lbs.)`;
        }

        // Log the result
        logEntry(message, "event");

        // Flip back to main game
        const flipInner = document.getElementById('flipInner');
        flipInner.classList.remove('flipped');

        setTimeout(() => {
            // Reset canvas cursor
            const canvas = document.getElementById('huntingCanvas');
            if (canvas) canvas.style.cursor = 'default';
            document.body.style.cursor = 'default';

            showMessage(message);
            checkGameState();
            updateDisplay();

            // Resume auto-travel
            if (!gameState.gameOver && !gameState.awaitingChoice) {
                travelEngine.resume();
                showTravelingButtons();
            }
        }, 800);
    });
}

// ─── Game Loop ───────────────────────────────────
function huntGameLoop(timestamp) {
    const hs = huntingState;
    if (!hs.gameActive) return;

    const ctx = hs.ctx;
    const W = hs.W;
    const H = hs.H;
    const dt = Math.min((timestamp - hs.lastTime) / 1000, 0.05);
    hs.lastTime = timestamp;

    // Update time
    hs.timeLeft -= dt;
    if (hs.timeLeft <= 0 || hs.ammo <= 0 || hs.totalMeat >= CARRY_LIMIT) {
        hs.timeLeft = Math.max(0, hs.timeLeft);
        huntUpdateHUD();
        huntEndGame();
        return;
    }
    huntUpdateHUD();

    // Spawn animals
    hs.spawnTimer -= dt;
    if (hs.spawnTimer <= 0) {
        huntSpawnAnimal();
        hs.spawnTimer = 1.5 + Math.random() * 2.5;
    }

    // Update bullets
    hs.bullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
    });

    // Check bullet-animal collisions
    hs.bullets.forEach(b => {
        if (b.life <= 0) return;
        hs.animals.forEach(a => {
            if (!a.alive) return;
            const d = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
            if (d < a.hitRadius) {
                a.alive = false;
                b.life = 0;
                hs.totalMeat += a.type.meat;
                hs.shotsHit++;
                huntInitAudio();
                huntPlayHit();
                huntSpawnParticles(a.x, a.y, '#c84030', 12);
                huntSpawnParticles(a.x, a.y, a.type.color, 6);
                huntAddFloatingText(a.x, a.y - 20, `+${a.type.meat} lbs`, '#e8c86a');
            }
        });
    });

    // Update animals
    hs.animals.forEach(a => {
        if (!a.alive) return;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.typeKey === 'eagle' && !a.fleeing) {
            a.y += Math.sin(Date.now() * 0.002 + a.animSpeed) * 0.5;
        }
        if (a.fleeing && a.typeKey !== 'eagle' && Math.random() < 0.3) {
            huntSpawnDustTrail(a.x, a.y);
        }
    });

    // Remove off-screen / dead
    hs.animals = hs.animals.filter(a => a.x > -100 && a.x < W + 100 && a.y > -50 && a.y < H + 50);
    hs.bullets = hs.bullets.filter(b => b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

    // Update particles
    hs.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 60 * dt;
        p.life -= dt;
    });
    hs.particles = hs.particles.filter(p => p.life > 0);

    // Update floating texts
    hs.floatingTexts.forEach(f => {
        f.y += f.vy * dt;
        f.life -= dt;
    });
    hs.floatingTexts = hs.floatingTexts.filter(f => f.life > 0);

    // ─── Render ────────────────────────────────
    huntDrawSky();
    huntDrawSun();
    huntDrawClouds(dt);
    huntDrawMountains();
    huntDrawGround();

    hs.trees.filter(t => t.layer === 0).forEach(huntDrawTree);
    huntDrawGrassTufts(dt);

    const sortedAnimals = hs.animals.filter(a => a.alive).sort((a, b) => a.y - b.y);
    const fgTrees = hs.trees.filter(t => t.layer === 1);
    const allDrawables = [
        ...sortedAnimals.map(a => ({ y: a.y, draw: () => a.type.drawFn(a) })),
        ...fgTrees.map(t => ({ y: t.y, draw: () => huntDrawTree(t) }))
    ].sort((a, b) => a.y - b.y);
    allDrawables.forEach(d => d.draw());

    // Bullets
    ctx.fillStyle = '#f0e0a0';
    hs.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(240, 220, 160, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
        ctx.stroke();
    });

    // Particles
    hs.particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    hs.floatingTexts.forEach(f => {
        ctx.globalAlpha = f.life / f.maxLife;
        ctx.font = 'bold 16px "Cinzel", serif';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    // Vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // Crosshair
    huntDrawCrosshair();

    hs.animFrameId = requestAnimationFrame(huntGameLoop);
}

// ─── Draw menu background for hunting canvas ─────
function huntDrawMenuBg() {
    const hs = huntingState;
    if (!hs.ctx) return;
    huntDrawSky();
    huntDrawSun();
    huntDrawClouds(0.016);
    huntDrawMountains();
    huntDrawGround();
    hs.trees.forEach(huntDrawTree);
    huntDrawGrassTufts(0.016);

    const ctx = hs.ctx;
    const W = hs.W;
    const H = hs.H;
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    if (!hs.gameActive) {
        hs.animFrameId = requestAnimationFrame(huntDrawMenuBg);
    }
}

// ─── Leave Hunt Early ─────────────────────────────
function huntLeaveEarly() {
    if (!huntingState.gameActive) return;
    huntEndGame();
}

// ─── Abort Hunt (return to trail without hunting) ─
function huntAbort() {
    if (huntingState.animFrameId) {
        cancelAnimationFrame(huntingState.animFrameId);
        huntingState.animFrameId = null;
    }
    huntingState.gameActive = false;

    const canvas = document.getElementById('huntingCanvas');
    if (canvas) canvas.style.cursor = 'default';
    document.body.style.cursor = 'default';

    const flipInner = document.getElementById('flipInner');
    flipInner.classList.remove('flipped');

    if (!gameState.gameOver && !gameState.awaitingChoice) {
        travelEngine.resume();
        showTravelingButtons();
    }
}

// ─── Start Hunting Game (canvas version) ─────────
function startHuntingCanvasGame() {
    const hs = huntingState;
    hs.gameActive = true;
    hs.ammo = gameState.bullets;
    hs.startingAmmo = gameState.bullets;
    hs.shotsHit = 0;
    hs.timeLeft = 45;
    hs.totalMeat = 0;
    hs.animals = [];
    hs.bullets = [];
    hs.particles = [];
    hs.floatingTexts = [];
    hs.spawnTimer = 0.5;

    huntGenerateScenery();

    const overlay = document.getElementById('hunting-message-overlay');
    overlay.classList.add('hidden');
    overlay.style.display = 'none';

    document.getElementById('hunting-leave-btn').style.display = 'block';

    huntUpdateHUD();
    hs.lastTime = performance.now();
    hs.animFrameId = requestAnimationFrame(huntGameLoop);
}

// ─── Main hunt() function called from game buttons ─
function hunt() {
    if (gameState.gameOver || gameState.awaitingChoice) return;

    // Pause auto-travel (may already be paused by wrapHunt in game.js)
    travelEngine.pause('hunt');

    // Hide river game, show hunting game
    document.getElementById('riverGame').style.display = 'none';
    document.getElementById('huntingGame').style.display = 'block';

    // Initialize canvas if needed
    const canvas = document.getElementById('huntingCanvas');
    if (!huntingState.canvas) {
        huntingState.canvas = canvas;
        huntingState.ctx = canvas.getContext('2d');
        huntingState.W = canvas.width;
        huntingState.H = canvas.height;

        // Mouse tracking
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            huntingState.mouseX = (e.clientX - rect.left) * (huntingState.W / rect.width);
            huntingState.mouseY = (e.clientY - rect.top) * (huntingState.H / rect.height);
        });

        canvas.addEventListener('click', e => {
            if (!huntingState.gameActive) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (huntingState.W / rect.width);
            const my = (e.clientY - rect.top) * (huntingState.H / rect.height);
            huntShoot(mx, my);
        });
    }

    // Show the start overlay
    const overlay = document.getElementById('hunting-message-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    const hasBullets = gameState.bullets > 0;
    overlay.innerHTML = `
        <h1>Hunting Grounds</h1>
        <h2>The prairie stretches before you...</h2>
        <div class="hunting-instructions-overlay">
            Aim with your mouse and click to fire.<br>
            Lead your shots — bullets take time to travel.<br>
            Animals will flee at the sound of gunfire.<br>
            You have <strong>${gameState.bullets} bullet${gameState.bullets !== 1 ? 's' : ''}</strong> remaining.
        </div>
        <div class="hunting-animal-legend">
            <div class="hunting-legend-item">🦌 Deer<span>20 lbs</span></div>
            <div class="hunting-legend-item">🦬 Bison<span>35 lbs</span></div>
            <div class="hunting-legend-item">🐇 Rabbit<span>4 lbs</span></div>
            <div class="hunting-legend-item">🦅 Eagle<span>8 lbs</span></div>
        </div>
        ${hasBullets
            ? `<button class="hunting-btn" id="huntingStartBtn">Begin Hunt</button>`
            : `<div style="color:#c0392b;font-family:'Cinzel',serif;font-size:14px;margin-top:12px;">No bullets! Buy more at a fort.</div>
               <button class="hunting-btn" id="huntingStartBtn" onclick="huntAbort()" style="background:#5c4a2a;">Return to Trail</button>`
        }
    `;

    // Generate scenery and draw menu background
    huntGenerateScenery();

    // Cancel any previous animation frame
    if (huntingState.animFrameId) {
        cancelAnimationFrame(huntingState.animFrameId);
        huntingState.animFrameId = null;
    }
    huntingState.gameActive = false;
    huntDrawMenuBg();

    // Wire up start button (only if player has bullets)
    if (hasBullets) {
        document.getElementById('huntingStartBtn').addEventListener('click', () => {
            huntInitAudio();
            canvas.style.cursor = 'none';
            startHuntingCanvasGame();
        });
    }

    // Flip to hunting game
    const flipInner = document.getElementById('flipInner');
    flipInner.classList.add('flipped');
}
