(() => {
"use strict";

// ============================================
// DINO RUNNER — SILVER EDITION
// ============================================

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best-score");
const overlay = document.getElementById("game-overlay");
const overlayLabel = document.getElementById("overlay-label");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startButton = document.getElementById("start-button");
const statusElement = document.getElementById("game-status");
const soundButton = document.getElementById("sound-toggle");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 300;

// Audio
const music = new Audio("assets/sfx/A Lost Soul.mp3");
const jumpSound = new Audio("assets/sfx/jump.mp3");
const deathSound = new Audio("assets/sfx/lose.mp3");

music.loop = true;
music.volume = 0.25;
jumpSound.volume = 0.55;
deathSound.volume = 0.65;

let soundEnabled = true;
let state = "menu";
let animationId = 0;
let lastTime = 0;
let elapsed = 0;
let score = 0;
let bestScore = 0;
let speed = 6;
let spawnTimer = 0;
let nextSpawn = 90;
let groundOffset = 0;
let shake = 0;

let obstacles = [];
let particles = [];
let stars = [];

try {
    bestScore = Number(
        localStorage.getItem("dinoRunnerSilverBest")
    ) || 0;
} catch {
    bestScore = 0;
}

// Dinosaurio: 60 px de ancho, 52 px de alto de pie.
const dino = {
    x: 105,
    y: GROUND_Y - 52,
    width: 60,
    height: 52,
    velocityY: 0,
    gravity: 0.72,
    jumpPower: -14.2,
    grounded: true,
    crouching: false,
    runFrame: 0
};

// ============================================
// PUNTUACIÓN
// ============================================

function formatScore(value) {
    return String(Math.floor(value)).padStart(5, "0");
}

function updateScoreDisplay() {
    scoreElement.textContent = formatScore(score);
    bestElement.textContent = formatScore(bestScore);
}

function saveBestScore() {
    try {
        localStorage.setItem(
            "dinoRunnerSilverBest",
            String(bestScore)
        );
    } catch {
        // El juego sigue funcionando sin almacenamiento.
    }
}

// ============================================
// FONDO
// ============================================

function createStars() {
    stars = [];

    for (let i = 0; i < 75; i++) {
        stars.push({
            x: Math.random() * WIDTH,
            y: Math.random() * 205,
            size: Math.random() * 1.6 + 0.4,
            alpha: Math.random() * 0.55 + 0.15,
            phase: Math.random() * Math.PI * 2
        });
    }
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#090b10");
    sky.addColorStop(0.65, "#141922");
    sky.addColorStop(1, "#222a34");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(
        720, 100, 5,
        720, 100, 360
    );

    glow.addColorStop(0, "rgba(174,194,218,0.12)");
    glow.addColorStop(1, "rgba(174,194,218,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Estrellas
    for (const star of stars) {
        const flicker =
            0.65 + Math.sin(elapsed * 0.0015 + star.phase) * 0.35;

        ctx.globalAlpha = star.alpha * flicker;
        ctx.fillStyle = "#e7edf5";
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.globalAlpha = 1;

    // Luna
    const moon = ctx.createRadialGradient(
        770, 76, 2,
        770, 76, 39
    );

    moon.addColorStop(0, "#f0f3f8");
    moon.addColorStop(0.7, "#9ba9bb");
    moon.addColorStop(1, "rgba(112,128,148,0.05)");

    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(770, 76, 39, 0, Math.PI * 2);
    ctx.fill();

    // Montañas
    ctx.fillStyle = "#171e29";
    ctx.beginPath();
    ctx.moveTo(0, 245);
    ctx.lineTo(100, 165);
    ctx.lineTo(180, 230);
    ctx.lineTo(300, 145);
    ctx.lineTo(420, 238);
    ctx.lineTo(560, 177);
    ctx.lineTo(690, 235);
    ctx.lineTo(820, 160);
    ctx.lineTo(960, 238);
    ctx.lineTo(960, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Edificios del fondo
    for (let i = 0; i < 14; i++) {
        const x = i * 82 - (groundOffset * 0.15 % 82);
        const h = 25 + ((i * 37) % 65);

        ctx.fillStyle = "rgba(95,110,130,0.13)";
        ctx.fillRect(x, GROUND_Y - h, 42, h);

        ctx.fillStyle = "rgba(190,205,225,0.12)";

        for (let wy = GROUND_Y - h + 9; wy < GROUND_Y - 5; wy += 13) {
            ctx.fillRect(x + 8, wy, 3, 4);
            ctx.fillRect(x + 23, wy, 3, 4);
        }
    }

    // Suelo
    const floor = ctx.createLinearGradient(
        0, GROUND_Y, 0, HEIGHT
    );

    floor.addColorStop(0, "#303946");
    floor.addColorStop(1, "#11151c");

    ctx.fillStyle = floor;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.fillStyle = "#c8d2df";
    ctx.fillRect(0, GROUND_Y, WIDTH, 2);

    // Marcas de movimiento
    ctx.strokeStyle = "rgba(186,201,219,0.16)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 24; i++) {
        const x = (i * 53 - groundOffset) % (WIDTH + 53);

        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 17);
        ctx.lineTo(x - 23, GROUND_Y + 17);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(215,226,240,0.07)";

    for (let x = 0; x < WIDTH; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 34);
        ctx.lineTo(x + 35, HEIGHT);
        ctx.stroke();
    }
}

// ============================================
// DINOSAURIO PIXEL ART PLATEADO
// ============================================

function drawDino() {
    const x = Math.round(dino.x);
    const y = Math.round(dino.y);
    const crouch = dino.crouching && dino.grounded;
    const airborne = !dino.grounded;
    const run = Math.floor(dino.runFrame / 2) % 2;

    ctx.save();

    // ------------------------------------------------
    // SOMBRA: se reduce cuando el dinosaurio salta.
    // ------------------------------------------------

    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(
        x + 30,
        GROUND_Y + 3,
        airborne ? 15 : crouch ? 31 : 24,
        4,
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // ------------------------------------------------
    // PALETA METÁLICA
    // ------------------------------------------------

    const metal = ctx.createLinearGradient(
        x, y, x + 60, y + dino.height
    );

    metal.addColorStop(0, "#ffffff");
    metal.addColorStop(0.18, "#e5e9f0");
    metal.addColorStop(0.48, "#aeb8c7");
    metal.addColorStop(0.72, "#7c899b");
    metal.addColorStop(1, "#dce2eb");

    const highlight = "#ffffff";
    const midSilver = "#cbd3df";
    const darkSilver = "#697789";
    const outline = "#424e60";
    const dark = "#141922";

    // Dibujar formas con bordes suaves.
    function shape(points, fill, stroke = outline, lineWidth = 1) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }

        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();

        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    function rounded(x1, y1, w, h, r, fill, stroke = outline) {
        ctx.beginPath();
        ctx.roundRect(x1, y1, w, h, r);
        ctx.fillStyle = fill;
        ctx.fill();

        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function line(x1, y1, x2, y2, color, width = 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
    }

    if (crouch) {
        // ============================================
        // POSE AGACHADA
        // ============================================

        ctx.translate(x, y);

        // Cola larga.
        shape([
            [18, 15], [8, 13], [0, 17],
            [8, 20], [21, 22], [27, 19]
        ], metal);

        line(6, 17, 19, 19, highlight, 1.5);

        // Cuerpo horizontal.
        rounded(15, 12, 31, 17, 7, metal);

        // Placas dorsales.
        shape([
            [20, 12], [23, 8], [26, 12],
            [30, 7], [33, 12], [38, 9],
            [41, 13]
        ], midSilver, darkSilver);

        // Cuello y cabeza.
        rounded(37, 5, 15, 16, 5, metal);

        shape([
            [43, 7], [48, 4], [56, 6],
            [60, 11], [59, 16], [48, 17],
            [42, 14]
        ], metal);

        // Mandíbula.
        shape([
            [42, 14], [59, 14], [59, 19],
            [53, 21], [44, 18]
        ], darkSilver);

        line(45, 15, 57, 15, highlight, 1);

        // Dientes.
        shape([[47, 15], [49, 15], [48, 18]], "#ffffff", null);
        shape([[53, 15], [55, 15], [54, 18]], "#ffffff", null);

        // Ojo.
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(51, 9, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f6fbff";
        ctx.fillRect(50, 8, 1.5, 1.5);

        // Brazos pequeños.
        shape([
            [39, 16], [43, 17], [45, 21],
            [42, 22], [39, 19]
        ], midSilver);

        line(42, 20, 44, 21, highlight, 1);

        // Piernas dobladas.
        rounded(19, 25, 13, 7, 3, darkSilver);
        rounded(34, 25, 12, 7, 3, darkSilver);

        // Pies y garras.
        shape([
            [17, 30], [31, 30], [33, 33],
            [18, 33], [15, 32]
        ], metal);

        shape([
            [32, 30], [45, 30], [48, 33],
            [34, 33], [30, 32]
        ], metal);

        line(18, 32, 22, 32, highlight, 1);
        line(35, 32, 39, 32, highlight, 1);

    } else {
        // ============================================
        // POSES DE PIE, CORRIENDO Y SALTANDO
        // ============================================

        ctx.translate(x, y);

        const legSwing = airborne ? -2 : run === 0 ? 3 : -3;
        const footLift = airborne ? -5 : 0;

        // Cola con punta afilada.
        shape([
            [20, 27], [11, 25], [3, 20],
            [0, 21], [5, 28], [14, 33],
            [25, 34]
        ], metal);

        line(5, 22, 15, 29, highlight, 1.5);

        // Cuerpo principal.
        rounded(13, 20, 30, 23, 8, metal);

        // Brillo lateral del torso.
        line(19, 25, 34, 24, highlight, 1.5);
        line(18, 29, 29, 29, "#eef2f8", 1);

        // Vientre metálico.
        shape([
            [19, 34], [37, 33], [41, 38],
            [35, 42], [22, 41]
        ], midSilver, darkSilver);

        // Placas dorsales estilo dinosaurio.
        shape([
            [18, 21], [20, 16], [24, 21],
            [28, 15], [32, 20], [36, 16],
            [40, 21]
        ], "#e8edf5", darkSilver);

        // Cuello.
        shape([
            [33, 23], [35, 15], [42, 12],
            [48, 17], [44, 27], [38, 31]
        ], metal);

        // Cabeza grande de T-Rex.
        shape([
            [35, 8], [39, 3], [48, 2],
            [55, 6], [59, 12], [58, 18],
            [53, 21], [43, 20], [37, 16]
        ], metal);

        // Reflejos de la cabeza.
        line(41, 5, 49, 4, highlight, 1.6);
        line(38, 9, 44, 7, "#f4f7fc", 1);

        // Hocico.
        shape([
            [49, 10], [57, 11], [60, 15],
            [57, 18], [48, 17], [45, 14]
        ], midSilver);

        // Fosas nasales.
        ctx.fillStyle = darkSilver;
        ctx.fillRect(55, 12, 2, 1.5);

        // Mandíbula inferior.
        shape([
            [41, 17], [57, 17], [59, 20],
            [55, 23], [45, 21], [41, 19]
        ], darkSilver);

        // Boca oscura.
        line(46, 17, 56, 17, dark, 1.5);

        // Dientes superiores e inferiores.
        shape([[47, 16], [50, 16], [49, 19]], "#ffffff", null);
        shape([[52, 16], [55, 16], [54, 19]], "#ffffff", null);
        shape([[49, 19], [51, 19], [50, 17]], "#e7edf5", null);

        // Ojo oscuro con reflejo.
        ctx.fillStyle = "#11151c";
        ctx.beginPath();
        ctx.arc(47, 9, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(46, 8, 1.5, 1.5);

        // Ceja que da expresión.
        line(43, 5, 50, 5, darkSilver, 1.8);

        // Brazos cortos característicos.
        shape([
            [35, 24], [39, 24], [42, 28],
            [40, 30], [37, 27], [34, 28]
        ], midSilver);

        line(39, 28, 41, 29, highlight, 1);

        // Patas animadas.
        if (airborne) {
            // Piernas recogidas durante el salto.
            shape([
                [22, 39], [29, 39], [31, 44],
                [27, 47], [21, 45]
            ], darkSilver);

            shape([
                [34, 39], [40, 37], [43, 42],
                [39, 45], [33, 44]
            ], metal);

            shape([
                [20, 44], [28, 45], [30, 48],
                [22, 49], [19, 47]
            ], metal);

            shape([
                [37, 42], [44, 42], [47, 45],
                [40, 47], [36, 45]
            ], metal);

        } else {
            // Pierna trasera.
            shape([
                [19, 37], [28, 36],
                [29 + legSwing, 43],
                [25 + legSwing, 49],
                [19 + legSwing, 49],
                [21, 43]
            ], darkSilver);

            // Pierna delantera.
            shape([
                [32, 37], [39, 36],
                [38 - legSwing, 43],
                [42 - legSwing, 49],
                [35 - legSwing, 49],
                [33, 43]
            ], metal);

            // Pies.
            shape([
                [17 + legSwing, 47],
                [26 + legSwing, 47],
                [29 + legSwing, 50],
                [17 + legSwing, 50]
            ], midSilver);

            shape([
                [34 - legSwing, 47],
                [42 - legSwing, 47],
                [45 - legSwing, 50],
                [33 - legSwing, 50]
            ], metal);

            // Garras.
            line(
                20 + legSwing, 49,
                22 + legSwing, 50,
                highlight, 1
            );

            line(
                37 - legSwing, 49,
                39 - legSwing, 50,
                highlight, 1
            );
        }

        // Reflejos finales para dar volumen metálico.
        line(17, 23, 22, 22, highlight, 1);
        line(23, 39, 25, 41, "#edf2f9", 1);
    }

    ctx.restore();
}

// ============================================
// OBSTÁCULOS
// ============================================

function createObstacle() {
    const roll = Math.random();
    let obstacle;

    if (roll < 0.35) {
        // Cactus
        obstacle = {
            type: "cactus",
            x: WIDTH + 30,
            y: GROUND_Y - 43,
            width: 25,
            height: 43
        };
    } else if (roll < 0.55) {
        // Roca
        obstacle = {
            type: "rock",
            x: WIDTH + 30,
            y: GROUND_Y - 26,
            width: 34,
            height: 26
        };
    } else if (roll < 0.72) {
        // Doble cactus
        obstacle = {
            type: "double",
            x: WIDTH + 30,
            y: GROUND_Y - 49,
            width: 47,
            height: 49
        };
    } else {
        // Drones en dos alturas:
        // los bajos requieren agacharse;
        // los altos se pueden esquivar saltando.
        const lowDrone = Math.random() < 0.55;

        obstacle = {
            type: "drone",
            x: WIDTH + 30,
            y: lowDrone
                ? GROUND_Y - 58
                : GROUND_Y - 92,
            width: 43,
            height: 23,
            low: lowDrone
        };
    }

    obstacles.push(obstacle);
}

function roundedRect(x, y, width, height, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

function drawObstacle(obstacle) {
    ctx.save();

    const metal = ctx.createLinearGradient(
        obstacle.x,
        obstacle.y,
        obstacle.x + obstacle.width,
        obstacle.y + obstacle.height
    );

    metal.addColorStop(0, "#f1f4f9");
    metal.addColorStop(0.45, "#8c9bad");
    metal.addColorStop(1, "#424e5d");

    if (
        obstacle.type === "cactus" ||
        obstacle.type === "double"
    ) {
        const positions = obstacle.type === "double"
            ? [obstacle.x, obstacle.x + 27]
            : [obstacle.x];

        for (const cx of positions) {
            roundedRect(
                cx + 7, obstacle.y,
                12, obstacle.height, 4, metal
            );

            roundedRect(
                cx, obstacle.y + 15,
                10, 7, 3, "#aab8c9"
            );

            roundedRect(
                cx, obstacle.y + 9,
                7, 15, 3, "#8d9db0"
            );

            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.fillRect(
                cx + 10,
                obstacle.y + 5,
                2,
                obstacle.height - 12
            );
        }
    } else if (obstacle.type === "rock") {
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x + 6, obstacle.y + 8);
        ctx.lineTo(obstacle.x + 17, obstacle.y);
        ctx.lineTo(obstacle.x + 28, obstacle.y + 7);
        ctx.lineTo(
            obstacle.x + obstacle.width,
            obstacle.y + obstacle.height
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 7, obstacle.y + 17);
        ctx.lineTo(obstacle.x + 17, obstacle.y + 5);
        ctx.stroke();
    } else {
        // Dron futurista
        roundedRect(
            obstacle.x + 5,
            obstacle.y + 5,
            obstacle.width - 10,
            13,
            5,
            metal
        );

        ctx.fillStyle = "#d9e5f3";
        ctx.fillRect(
            obstacle.x,
            obstacle.y + 2,
            obstacle.width,
            3
        );

        ctx.fillStyle = obstacle.low ? "#ffcf70" : "#8bd6ff";
        ctx.fillRect(
            obstacle.x + 17,
            obstacle.y + 9,
            8,
            3
        );

        ctx.fillStyle = "#6c7d91";
        ctx.fillRect(obstacle.x + 9, obstacle.y + 17, 4, 5);
        ctx.fillRect(obstacle.x + 30, obstacle.y + 17, 4, 5);
    }

    ctx.restore();
}

// ============================================
// PARTÍCULAS
// ============================================

function addParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 3.8 + 0.8;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * force,
            vy: Math.sin(angle) * force - 1,
            size: Math.random() * 3 + 1,
            life: 1,
            color
        });
    }
}

function updateParticles(delta) {
    for (const particle of particles) {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.08 * delta;
        particle.life -= 0.025 * delta;
    }

    particles = particles.filter(particle => particle.life > 0);
}

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
        );
    }

    ctx.globalAlpha = 1;
}

// ============================================
// MOVIMIENTO Y CONTROLES DEL DINOSAURIO
// ============================================

function jump() {
    if (state !== "running" || !dino.grounded) return;

    dino.crouching = false;
    dino.height = 52;
    dino.y = GROUND_Y - dino.height;

    dino.velocityY = dino.jumpPower;
    dino.grounded = false;

    addParticles(dino.x + 18, GROUND_Y, 7, "#cbd7e6");

    if (soundEnabled) {
        jumpSound.currentTime = 0;
        jumpSound.play().catch(() => {});
    }
}

function setCrouching(value) {
    dino.crouching = value;

    if (dino.grounded) {
        dino.height = value ? 36 : 52;
        dino.y = GROUND_Y - dino.height;
    }
}

// ============================================
// INICIO, PAUSA Y FIN
// ============================================

function startGame() {
    if (state === "running") return;

    if (state === "paused") {
        resumeGame();
        return;
    }

    score = 0;
    speed = 6;
    spawnTimer = 0;
    nextSpawn = 90;
    obstacles = [];
    particles = [];
    elapsed = 0;
    shake = 0;

    dino.height = 52;
    dino.y = GROUND_Y - dino.height;
    dino.velocityY = 0;
    dino.grounded = true;
    dino.crouching = false;
    dino.runFrame = 0;

    state = "running";

    overlay.classList.add("hidden");
    statusElement.textContent = "SISTEMA ACTIVO";
    startButton.innerHTML = "<span>▶</span> JUGAR";

    updateScoreDisplay();

    if (soundEnabled) {
        music.play().catch(() => {});
    }

    lastTime = performance.now();

    if (!animationId) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function pauseGame() {
    if (state !== "running") return;

    state = "paused";
    music.pause();

    overlay.classList.remove("hidden");
    overlayLabel.textContent = "PARTIDA EN PAUSA";
    overlayTitle.textContent = "TÓMATE UN DESCANSO";
    overlayMessage.textContent =
        "Tu partida está en pausa. Cuando quieras, continúa.";

    startButton.innerHTML = "<span>▶</span> CONTINUAR";
    statusElement.textContent = "SISTEMA EN PAUSA";
}

function resumeGame() {
    if (state !== "paused") return;

    state = "running";

    overlay.classList.add("hidden");
    statusElement.textContent = "SISTEMA ACTIVO";

    if (soundEnabled) {
        music.play().catch(() => {});
    }

    lastTime = performance.now();

    if (!animationId) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    if (state !== "running") return;

    state = "gameover";
    shake = 8;
    dino.crouching = false;

    addParticles(dino.x + 25, dino.y + 25, 24, "#e0e7f0");

    music.pause();

    if (soundEnabled) {
        music.currentTime = 0;
        deathSound.currentTime = 0;
        deathSound.play().catch(() => {});
    }

    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
    }

    updateScoreDisplay();

    overlay.classList.remove("hidden");
    overlayLabel.textContent = "CARRERA FINALIZADA";
    overlayTitle.textContent = "FIN DE LA PARTIDA";
    overlayMessage.textContent =
        `Puntuación: ${formatScore(score)} · Récord: ${formatScore(bestScore)}`;

    startButton.innerHTML = "<span>↻</span> VOLVER A JUGAR";
    statusElement.textContent = "FIN DE LA PARTIDA";
}

function toggleSound() {
    soundEnabled = !soundEnabled;

    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundButton.textContent = soundEnabled ? "♫" : "♪";
    soundButton.setAttribute(
        "aria-label",
        soundEnabled ? "Desactivar sonido" : "Activar sonido"
    );

    if (!soundEnabled) {
        music.pause();
        jumpSound.pause();
        deathSound.pause();
    } else if (state === "running") {
        music.play().catch(() => {});
    }
}

// ============================================
// COLISIONES
// ============================================

function collides(a, b) {
    const horizontalPadding = 10;
    const verticalPadding = 7;

    return (
        a.x + horizontalPadding < b.x + b.width &&
        a.x + a.width - horizontalPadding > b.x &&
        a.y + verticalPadding < b.y + b.height &&
        a.y + a.height - 4 > b.y
    );
}

// ============================================
// ACTUALIZACIÓN DEL JUEGO
// ============================================

function update(delta) {
    elapsed += delta * 16.67;

    if (state !== "running") {
        updateParticles(delta);
        return;
    }

    score += delta * speed * 0.11;
    speed = Math.min(13, 6 + score / 450);

    groundOffset = (groundOffset + speed * delta) % 1000;
    dino.runFrame += 0.19 * delta;

    // Física del salto
    if (!dino.grounded) {
        dino.velocityY += dino.gravity * delta;
        dino.y += dino.velocityY * delta;

        if (dino.y + dino.height >= GROUND_Y) {
            dino.y = GROUND_Y - dino.height;
            dino.velocityY = 0;
            dino.grounded = true;

            addParticles(dino.x + 20, GROUND_Y, 5, "#aab9cb");

            // Si S sigue pulsada al aterrizar, se agacha.
            if (keys.has("s")) {
                setCrouching(true);
            }
        }
    } else {
        // Mantener el dinosaurio pegado al suelo.
        dino.height = dino.crouching ? 36 : 52;
        dino.y = GROUND_Y - dino.height;
    }

    // Crear obstáculos
    spawnTimer += delta;

    if (spawnTimer >= nextSpawn) {
        createObstacle();
        spawnTimer = 0;

        nextSpawn = Math.max(
            48,
            88 + Math.random() * 45 - speed * 2
        );
    }

    // Movimiento y colisiones
    for (const obstacle of obstacles) {
        obstacle.x -= speed * delta;

        if (collides(dino, obstacle)) {
            gameOver();
            break;
        }
    }

    obstacles = obstacles.filter(
        obstacle => obstacle.x + obstacle.width > -20
    );

    updateParticles(delta);
    updateScoreDisplay();
}

// ============================================
// DIBUJO Y BUCLE PRINCIPAL
// ============================================

function render() {
    ctx.save();

    if (shake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
        );

        shake *= 0.82;

        if (shake < 0.3) shake = 0;
    }

    drawBackground();

    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }

    drawDino();
    drawParticles();

    if (state === "running" && score > 100) {
        ctx.fillStyle = "rgba(230,238,248,0.7)";
        ctx.font = "11px monospace";
        ctx.textAlign = "right";

        ctx.fillText(
            `VELOCIDAD ${speed.toFixed(1)}x`,
            WIDTH - 24,
            HEIGHT - 16
        );
    }

    ctx.restore();
}

function gameLoop(timestamp) {
    animationId = 0;

    const delta = Math.min(
        (timestamp - (lastTime || timestamp)) / 16.67,
        2
    );

    lastTime = timestamp;

    update(delta);
    render();

    if (
        state === "running" ||
        particles.length > 0 ||
        shake > 0
    ) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ============================================
// CONTROLES
// ============================================

const keys = new Set();

startButton.addEventListener("click", startGame);
soundButton.addEventListener("click", toggleSound);

canvas.addEventListener("pointerdown", event => {
    event.preventDefault();

    if (state === "running") {
        jump();
    } else if (state === "menu" || state === "gameover") {
        startGame();
    }
});

document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (
        key === " " ||
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "w"
    ) {
        event.preventDefault();
    }

    if (
        key === " " ||
        key === "arrowup" ||
        key === "w"
    ) {
        if (state === "running") {
            jump();
        } else if (state === "menu" || state === "gameover") {
            startGame();
        }
    }

    // Agacharse con S: mantener pulsada.
    if (key === "s" && state === "running") {
        event.preventDefault();
        keys.add("s");

        if (dino.grounded) {
            setCrouching(true);
        }
    }

    if (key === "escape" || key === "p") {
        if (state === "running") {
            pauseGame();
        } else if (state === "paused") {
            resumeGame();
        }
    }

    if (key === "r") {
        startGame();
    }
});

document.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "s") {
        keys.delete("s");

        if (dino.grounded) {
            setCrouching(false);
        }
    }
});

// Evitar que S quede pulsada al cambiar de ventana.
window.addEventListener("blur", () => {
    keys.delete("s");

    if (dino.grounded) {
        setCrouching(false);
    }
});

// Pausar al cambiar de pestaña.
document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") {
        pauseGame();
    }
});

// ============================================
// INICIALIZACIÓN
// ============================================

createStars();
updateScoreDisplay();
render();

statusElement.textContent = "SISTEMA EN ESPERA";

})();