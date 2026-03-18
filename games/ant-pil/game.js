const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Screens
const menuScreen = document.getElementById('menu-screen');
const levelScreen = document.getElementById('level-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameOverScreen = document.getElementById('game-over');
const winScreen = document.getElementById('win-screen');
const pauseScreen = document.getElementById('pause-screen');
const hud = document.getElementById('hud');

// UI Elements
const scoreEl = document.getElementById('score');
const chancesEl = document.getElementById('chances');
const stageTextEl = document.getElementById('stage-text');
const finalScoreEl = document.getElementById('final-score');
const winScoreEl = document.getElementById('win-score');
const currentLevelDisplay = document.getElementById('current-level-display');
const levelGrid = document.getElementById('level-grid');
const pageNumberEl = document.getElementById('page-number');
const soundToggle = document.getElementById('sound-toggle');

// Buttons
const playBtn = document.getElementById('play-btn');
const levelsBtn = document.getElementById('levels-btn');
const settingsBtn = document.getElementById('settings-btn');
const retryBtn = document.getElementById('retry-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');
const winMenuBtn = document.getElementById('win-menu-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const backToMenuLevels = document.getElementById('back-to-menu-levels');
const backToMenuSettings = document.getElementById('back-to-menu-settings');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

// Game Constants
const MARBLE_RADIUS = 18;
const FRICTION_BASE = 0.982;
const MIN_SPEED = 0.15;
const POWER_LIMIT = 28;
const BOUNCE = -0.6;
const SUCTION_BASE = 0.45;

// Level Data Structure (50 Levels)
const levels = [];
for (let i = 1; i <= 50; i++) {
    levels.push({
        id: i,
        holeRadius: Math.max(45 - (i * 0.5), 25),
        suction: SUCTION_BASE + (i * 0.01),
        friction: FRICTION_BASE - (i * 0.0003),
        chances: i <= 10 ? 3 : (i <= 30 ? 2 : 1),
        // Position targets and hole in safe zones (away from HUD)
        holePos: { x: 0.6 + (Math.random() * 0.25), y: 0.25 + (Math.random() * 0.5) },
        targetPos: { x: 0.5 + (Math.random() * 0.4), y: 0.2 + (Math.random() * 0.6) }
    });
}

// Level Pagination State
let currentLevelPage = 0;
const LEVELS_PER_PAGE = 25;

// Audio System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (!soundToggle.checked) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'sink') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.05);
        }
    } catch (e) { console.error("Audio failed", e); }
}

// Particles
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}
let particles = [];
function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

class Marble {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.vx = 0; this.vy = 0;
        this.radius = MARBLE_RADIUS; this.color = color;
        this.inHole = false;
        this.rotation = 0;
    }
    draw() {
        if (this.inHole) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Drop shadow
        ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowOffsetY = 8;
        
        // Main Marble Body
        ctx.beginPath(); 
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2); 
        ctx.fillStyle = this.color; 
        ctx.fill();

        // 3D Lighting & Reflection
        const grad = ctx.createRadialGradient(-this.radius/3, -this.radius/3, 2, 0, 0, this.radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)'); 
        grad.addColorStop(0.2, 'rgba(255,255,255,0.2)');
        grad.addColorStop(0.8, 'rgba(0,0,0,0.1)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner swirly patterns for more realism
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0.5, Math.PI * 0.8);
        ctx.stroke();

        ctx.restore();
    }
    update(friction) {
        if (this.inHole) return;
        
        // Update rotation based on velocity
        const speed = Math.sqrt(this.vx**2 + this.vy**2);
        this.rotation += speed * 0.05;

        this.x += this.vx; this.y += this.vy;
        this.vx *= friction; this.vy *= friction;
        
        if (Math.abs(this.vx) < MIN_SPEED) this.vx = 0;
        if (Math.abs(this.vy) < MIN_SPEED) this.vy = 0;
        
        // Wall Bounce
        if (this.x < this.radius) { this.x = this.radius; this.vx *= BOUNCE; playSound('hit'); }
        if (this.x > canvas.width - this.radius) { this.x = canvas.width - this.radius; this.vx *= BOUNCE; playSound('hit'); }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= BOUNCE; playSound('hit'); }
        if (this.y > canvas.height - this.radius) { this.y = canvas.height - this.radius; this.vy *= BOUNCE; playSound('hit'); }
    }
}

class Hole {
    constructor(x, y, radius) { this.x = x; this.y = y; this.radius = radius; }
    draw() {
        ctx.save();
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.7, this.x, this.y, this.radius);
        grad.addColorStop(0, '#000'); grad.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = grad; ctx.fill();
        ctx.restore();
    }
}

// Game State
let gameState = {
    screen: 'MENU',
    level: 1,
    unlockedLevels: parseInt(localStorage.getItem('antpil_levels')) || 1,
    stage: 1,
    score: 0,
    chances: 3,
    isAiming: false,
    isMoving: false,
    isPaused: false,
    mousePos: { x: 0, y: 0 },
    dragStart: { x: 0, y: 0 },
    gameOver: false,
    hitTarget: false,
    holeSunk: false
};

let player, target, hole;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameState.screen === 'GAME') {
        // Recalculate positions based on new screen size
        const lData = levels[gameState.level - 1];
        player.x = canvas.width * 0.2;
        player.y = canvas.height * 0.5;
        target.x = canvas.width * lData.targetPos.x;
        target.y = canvas.height * lData.targetPos.y;
        hole.x = canvas.width * lData.holePos.x;
        hole.y = canvas.height * lData.holePos.y;
    }
}
window.addEventListener('resize', resize);
resize();

function generateLevelGrid() {
    levelGrid.innerHTML = '';
    const start = currentLevelPage * LEVELS_PER_PAGE;
    const end = Math.min(start + LEVELS_PER_PAGE, levels.length);
    
    for (let i = start + 1; i <= end; i++) {
        const div = document.createElement('div');
        div.className = `level-item ${i > gameState.unlockedLevels ? 'locked' : ''}`;
        div.innerText = i;
        div.onclick = () => { if (i <= gameState.unlockedLevels) startLevel(i); };
        levelGrid.appendChild(div);
    }
    pageNumberEl.innerText = `${currentLevelPage + 1} / ${Math.ceil(levels.length / LEVELS_PER_PAGE)}`;
}

window.showScreen = function(name) {
    gameState.screen = name;
    [menuScreen, levelScreen, settingsScreen, gameOverScreen, winScreen, pauseScreen, hud].forEach(s => s.classList.add('hidden'));
    
    if (name === 'MENU') menuScreen.classList.remove('hidden');
    else if (name === 'LEVELS') { levelScreen.classList.remove('hidden'); generateLevelGrid(); }
    else if (name === 'SETTINGS') settingsScreen.classList.remove('hidden');
    else if (name === 'GAME') { hud.classList.remove('hidden'); gameState.isPaused = false; }
    else if (name === 'GAMEOVER') gameOverScreen.classList.remove('hidden');
    else if (name === 'WIN') winScreen.classList.remove('hidden');
    else if (name === 'PAUSE') pauseScreen.classList.remove('hidden');
};

function startLevel(num) {
    gameState.level = num;
    const lData = levels[num - 1];
    player = new Marble(canvas.width * 0.2, canvas.height * 0.5, '#e74c3c');
    target = new Marble(canvas.width * lData.targetPos.x, canvas.height * lData.targetPos.y, '#3498db');
    hole = new Hole(canvas.width * lData.holePos.x, canvas.height * lData.holePos.y, lData.holeRadius);
    
    gameState.stage = 1;
    gameState.chances = lData.chances;
    gameState.gameOver = false;
    gameState.isMoving = false;
    gameState.score = 0;
    gameState.isPaused = false;
    updateHUD();
    showScreen('GAME');
}

function updateHUD() {
    scoreEl.innerText = gameState.score;
    chancesEl.innerText = gameState.chances;
    currentLevelDisplay.innerText = gameState.level;
    stageTextEl.innerText = gameState.stage === 1 ? 'STAGE 1: INTO THE HOLE' : 'STAGE 2: HIT TARGET';
}

function gameLoop() {
    if ((gameState.screen === 'GAME' || gameState.screen === 'PAUSE') && !gameState.isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hole.draw();
        if (gameState.isAiming) drawAimLine();
        const lData = levels[gameState.level - 1];
        player.update(lData.friction);
        target.update(lData.friction);
        checkPhysics(lData);
        player.draw(); target.draw();
        
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(); particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        
        if (gameState.isMoving && player.vx === 0 && player.vy === 0 && target.vx === 0 && target.vy === 0) {
            gameState.isMoving = false;
            handleTurnEnd();
        }
    }
    requestAnimationFrame(gameLoop);
}

function drawAimLine() {
    const dx = gameState.dragStart.x - gameState.mousePos.x;
    const dy = gameState.dragStart.y - gameState.mousePos.y;
    const power = Math.min(Math.sqrt(dx*dx + dy*dy) / 10, POWER_LIMIT);
    const angle = Math.atan2(dy, dx);
    ctx.save(); ctx.setLineDash([10, 5]); ctx.beginPath(); ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * power * 12, player.y + Math.sin(angle) * power * 12);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + (power/POWER_LIMIT) * 0.7})`;
    ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
}

function checkPhysics(lData) {
    const dx = player.x - target.x, dy = player.y - target.y, dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < player.radius + target.radius) {
        playSound('hit'); createExplosion((player.x+target.x)/2, (player.y+target.y)/2, '#fff', 8);
        const angle = Math.atan2(dy, dx), overlap = (player.radius + target.radius - dist) / 2;
        player.x += Math.cos(angle) * overlap; player.y += Math.sin(angle) * overlap;
        target.x -= Math.cos(angle) * overlap; target.y -= Math.sin(angle) * overlap;
        const nx = dx/dist, ny = dy/dist, rv = (player.vx-target.vx)*nx + (player.vy-target.vy)*ny;
        if (rv < 0) { player.vx -= rv*nx; player.vy -= rv*ny; target.vx += rv*nx; target.vy += rv*ny; }
        if (gameState.stage === 2) gameState.hitTarget = true;
    }
    if (gameState.stage === 1 && !player.inHole) {
        const hdx = player.x - hole.x, hdy = player.y - hole.y, hdist = Math.sqrt(hdx*hdx + hdy*hdy);
        if (hdist < hole.radius * 2.0) {
            const force = (1 - hdist / (hole.radius * 2.0)) * lData.suction;
            player.vx -= (hdx/hdist) * force; player.vy -= (hdy/hdist) * force;
            player.vx *= 0.95; player.vy *= 0.95;
            if (hdist < hole.radius * 0.6 && Math.sqrt(player.vx**2 + player.vy**2) < 5) {
                player.inHole = true; player.vx = 0; player.vy = 0;
                player.x = hole.x; player.y = hole.y; gameState.holeSunk = true;
                playSound('sink'); createExplosion(hole.x, hole.y, '#f1c40f', 15);
            }
        }
    }
}

function handleTurnEnd() {
    if (gameState.stage === 1) {
        if (gameState.holeSunk) {
            gameState.stage = 2; gameState.chances = 2; gameState.score += 100;
            gameState.holeSunk = false; player.inHole = false; player.x = hole.x; player.y = hole.y;
            updateHUD();
        } else {
            gameState.chances--; updateHUD();
            if (gameState.chances <= 0) endGame('GAME OVER!');
            else { player.x = canvas.width * 0.2; player.y = canvas.height * 0.5; }
        }
    } else {
        if (gameState.hitTarget) {
            gameState.score += 250;
            if (gameState.level === gameState.unlockedLevels && gameState.level < 50) {
                gameState.unlockedLevels++;
                localStorage.setItem('antpil_levels', gameState.unlockedLevels);
            }
            winScoreEl.innerText = gameState.score;
            showScreen('WIN');
        } else {
            gameState.chances--; updateHUD();
            if (gameState.chances <= 0) endGame('GAME OVER!');
            else { player.x = hole.x; player.y = hole.y; player.vx = 0; player.vy = 0; }
        }
    }
}

function endGame(msg) {
    gameState.gameOver = true; finalScoreEl.innerText = gameState.score;
    document.getElementById('game-over-title').innerText = msg; showScreen('GAMEOVER');
}

canvas.addEventListener('mousedown', (e) => {
    if (gameState.screen !== 'GAME' || gameState.isMoving || gameState.gameOver || gameState.isPaused) return;
    const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (Math.sqrt((x-player.x)**2 + (y-player.y)**2) < 60) {
        gameState.isAiming = true; gameState.dragStart = { x, y }; gameState.mousePos = { x, y };
        playSound('click');
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (!gameState.isAiming) return;
    const rect = canvas.getBoundingClientRect(); gameState.mousePos = { x: e.clientX-rect.left, y: e.clientY-rect.top };
});
canvas.addEventListener('mouseup', () => {
    if (!gameState.isAiming) return;
    const dx = gameState.dragStart.x-gameState.mousePos.x, dy = gameState.dragStart.y-gameState.mousePos.y;
    const p = Math.min(Math.sqrt(dx*dx+dy*dy)/10, POWER_LIMIT), a = Math.atan2(dy, dx);
    player.vx = Math.cos(a)*p; player.vy = Math.sin(a)*p;
    gameState.isAiming = false; gameState.isMoving = true; gameState.hitTarget = false;
});

playBtn.onclick = () => startLevel(gameState.unlockedLevels);
levelsBtn.onclick = () => showScreen('LEVELS');
settingsBtn.onclick = () => showScreen('SETTINGS');
backToMenuLevels.onclick = () => showScreen('MENU');
backToMenuSettings.onclick = () => showScreen('MENU');
retryBtn.onclick = () => startLevel(gameState.level);
mainMenuBtn.onclick = () => showScreen('MENU');
winMenuBtn.onclick = () => showScreen('MENU');
nextLevelBtn.onclick = () => { if (gameState.level < 50) startLevel(gameState.level + 1); else showScreen('MENU'); };

// Pagination buttons
prevPageBtn.onclick = () => {
    if (currentLevelPage > 0) {
        currentLevelPage--;
        generateLevelGrid();
        playSound('click');
    }
};
nextPageBtn.onclick = () => {
    if ((currentLevelPage + 1) * LEVELS_PER_PAGE < levels.length) {
        currentLevelPage++;
        generateLevelGrid();
        playSound('click');
    }
};

// Pause logic
pauseBtn.onclick = () => {
    if (gameState.screen === 'GAME') {
        gameState.isPaused = true;
        showScreen('PAUSE');
        playSound('click');
    }
};
resumeBtn.onclick = () => {
    gameState.isPaused = false;
    showScreen('GAME');
    playSound('click');
};
pauseMenuBtn.onclick = () => showScreen('MENU');

requestAnimationFrame(gameLoop);
showScreen('MENU');
