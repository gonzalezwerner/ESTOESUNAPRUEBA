const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let textPoints = [];
let heartPoints = [];
let rockets = [];
let shootingStars = [];
let mainRocket;

// --- DYNAMIC Configuration ---
let FONT_SIZE;
let ROCKET_SPEED;
const EXPLOSION_FORCE = 10;
const FORMATION_SPEED = 0.03;
const TEXT_DENSITY_STEP = 3;
const WORD = "TE AMO MILY";

// Romantic Palette
const ROMANTIC_COLORS = [
    '#ff0055', // Passion Red
    '#ff3366', // Hot Pink
    '#ff99b3', // Soft Pink
    '#ffe6eb', // Pale Pink
    '#ffffff', // Pure White
    '#ffd700', // Gold
    '#ffcc00'  // Golden Yellow
];

// State Management
let isMorphingToHeart = false;
let heartCenterY;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    heartCenterY = height / 2.5;

    const maxFontSize = 150;
    const margin = 20;
    const estimatedWidthPerChar = 0.6;

    let calculatedFontSize = (width - margin * 2) / (WORD.length * estimatedWidthPerChar);
    FONT_SIZE = Math.min(calculatedFontSize, maxFontSize);

    if (width < 600) {
        ROCKET_SPEED = height * 0.015;
    } else {
        ROCKET_SPEED = 13;
    }

    init();
}

window.addEventListener('resize', resize);

// --- Helper Functions ---

function getTextPoints(text) {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = width;
    offCanvas.height = height;

    offCtx.font = `bold ${Math.floor(FONT_SIZE)}px Arial`;
    offCtx.fillStyle = 'white';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    offCtx.fillText(text, width / 2, height / 3);

    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const points = [];

    for (let y = 0; y < height; y += TEXT_DENSITY_STEP) {
        for (let x = 0; x < width; x += TEXT_DENSITY_STEP) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];

            if (alpha > 128) {
                points.push({ x, y });
            }
        }
    }
    return points;
}

function getHeartPoints(count) {
    const points = [];
    const scale = Math.min(width, height) / 35;
    const centerX = width / 2;
    const centerY = heartCenterY;

    for (let i = 0; i < count; i++) {
        const t = (Math.PI * 2) * (i / count);
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        points.push({
            x: centerX + x * scale,
            y: centerY + y * scale
        });
    }
    return points;
}

// Generate points for the letter M centered in the heart
function getInnerMPoints() {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = width;
    offCanvas.height = height;

    // Size relative to screen but smaller than main text to fit in heart
    const mSize = Math.min(width, height) / 5;

    offCtx.font = `bold ${Math.floor(mSize)}px Arial`;
    offCtx.fillStyle = 'white';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    // Draw M at heart center
    offCtx.fillText("M", width / 2, heartCenterY);

    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const points = [];

    // Scan step
    const step = 4;

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];

            if (alpha > 128) {
                points.push({ x, y });
            }
        }
    }
    return points;
}

function randomColor() {
    return ROMANTIC_COLORS[Math.floor(Math.random() * ROMANTIC_COLORS.length)];
}

// --- Classes ---

class Rocket {
    constructor(isMain = true) {
        this.isMain = isMain;
        this.x = isMain ? width / 2 : Math.random() * width;
        this.y = height;

        const baseSpeed = ROCKET_SPEED;
        this.vy = isMain ? -baseSpeed : -(Math.random() * (baseSpeed / 2) + baseSpeed / 2);

        this.color = isMain ? 'white' : randomColor();
        this.exploded = false;
        this.trail = [];
    }

    update() {
        if (this.exploded) return;

        this.y += this.vy;
        this.vy += 0.15;

        this.trail.push({ x: this.x, y: this.y, alpha: 1, color: this.color });
        this.trail.forEach(t => t.alpha -= 0.08);
        this.trail = this.trail.filter(t => t.alpha > 0);

        if (this.isMain) {
            if (this.vy >= 0 || this.y < height / 3) {
                this.explode();
            }
        } else {
            if (this.vy >= -1) {
                this.explode();
            }
        }
    }

    draw() {
        if (this.exploded) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 2, this.y - 10, 4, 15);

        this.trail.forEach(t => {
            ctx.fillStyle = this.isMain ? `rgba(255, 255, 255, ${t.alpha})` : t.color;
            ctx.globalAlpha = t.alpha;
            ctx.fillRect(t.x - 1, t.y, 2, 2);
            ctx.globalAlpha = 1;
        });
    }

    explode() {
        this.exploded = true;
        if (this.isMain) {
            createTextParticles(this.x, this.y);
            setTimeout(() => {
                startHeartMorph();
            }, 5000);
        } else {
            createRandomParticles(this.x, this.y, this.color);
        }
    }
}

class TextParticle {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * EXPLOSION_FORCE;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.targetX = targetX;
        this.targetY = targetY;

        this.heartTargetX = null;
        this.heartTargetY = null;

        this.baseColor = randomColor();
        this.color = this.baseColor;
        this.friction = 0.94;
        this.arrived = false;
        this.isGlittering = true;
    }

    update(heartPulseScale) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        let tx = this.targetX;
        let ty = this.targetY;

        if (isMorphingToHeart && this.heartTargetX != null) {
            const centerX = width / 2;
            const centerY = heartCenterY;

            const dx = this.heartTargetX - centerX;
            const dy = this.heartTargetY - centerY;

            tx = centerX + dx * heartPulseScale;
            ty = centerY + dy * heartPulseScale;
        }

        if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
            const dx = tx - this.x;
            const dy = ty - this.y;
            this.x += dx * FORMATION_SPEED;
            this.y += dy * FORMATION_SPEED;
        }

        if (this.isGlittering && Math.random() < 0.05) {
            this.color = Math.random() < 0.5 ? '#fff' : '#ffd700';
        } else if (Math.random() < 0.05) {
            this.color = this.baseColor;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
    }
}

class RandomParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.alpha = 1;
        this.friction = 0.95;
        this.gravity = 0.05;
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.015;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

class ShootingStar {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * (height / 2);
        this.length = Math.random() * 80 + 20;
        this.speed = Math.random() * 10 + 10;
        this.angle = Math.PI / 4;
        this.opacity = 1;
        this.dead = false;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.02;
        if (this.opacity <= 0 || this.x > width || this.y > height) {
            this.dead = true;
        }
    }

    draw() {
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
        ctx.stroke();
    }
}

// --- Main Loop ---

let animationId;

function init() {
    particles = [];
    rockets = [];
    textPoints = [];
    shootingStars = [];
    isMorphingToHeart = false;

    textPoints = getTextPoints(WORD);

    mainRocket = null;
    setTimeout(() => {
        mainRocket = new Rocket(true);
    }, 1000);
}

function createTextParticles(x, y) {
    // Generate heart outline
    const heartContour = getHeartPoints(Math.floor(textPoints.length * 0.6)); // Use 60% for outline?
    // Generate inner M
    const innerM = getInnerMPoints();

    // Combine targets (Heart Outline + Inner M)
    // We want to make sure the M is fully filled

    textPoints.forEach((point, index) => {
        const p = new TextParticle(x, y, point.x, point.y);

        // Target assignment logic
        // Prioritize M filling if we have enough points, rest go to heart

        let hPoint;
        if (index < innerM.length) {
            // First particles fill the M
            hPoint = innerM[index];
            // Make M particles Gold/White specifically?
            p.baseColor = Math.random() < 0.5 ? '#fff' : '#ffd700';
            p.color = p.baseColor;
        } else {
            // Rest fill the heart outline
            // Map remaining index to heart contour
            const heartIndex = (index - innerM.length) % heartContour.length;
            hPoint = heartContour[heartIndex];
            // Heart outline Red/Pink
            p.baseColor = Math.random() < 0.5 ? '#ff0055' : '#ff99b3';
            p.color = p.baseColor;
        }

        if (hPoint) {
            p.heartTargetX = hPoint.x;
            p.heartTargetY = hPoint.y;
        } else {
            // Fallback if something weird happens (e.g. innerM empty)
            const fallback = heartContour[index % heartContour.length];
            p.heartTargetX = fallback.x;
            p.heartTargetY = fallback.y;
        }

        particles.push(p);
    });
}

function createRandomParticles(x, y, color) {
    for (let i = 0; i < 50; i++) {
        particles.push(new RandomParticle(x, y, color));
    }
}

function startHeartMorph() {
    isMorphingToHeart = true;
    particles.forEach(p => {
        if (p instanceof TextParticle) {
            p.vx = (Math.random() - 0.5) * 5;
            p.vy = (Math.random() - 0.5) * 5;
        }
    });
}

function loop() {
    animationId = requestAnimationFrame(loop);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const time = Date.now() * 0.003;
    const beatScale = 1 + Math.pow(Math.sin(time), 3) * 0.05;

    if (mainRocket) {
        if (!mainRocket.exploded) {
            mainRocket.update();
            mainRocket.draw();
        }
    }

    if (Math.random() < 0.04) {
        rockets.push(new Rocket(false));
    }

    if (Math.random() < 0.01) {
        shootingStars.push(new ShootingStar());
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.update();
        r.draw();
        if (r.exploded) {
            rockets.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(beatScale);
        p.draw();
        if (p instanceof RandomParticle && p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.update();
        s.draw();
        if (s.dead) {
            shootingStars.splice(i, 1);
        }
    }
}

resize();
loop();
