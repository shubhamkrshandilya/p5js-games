// Holo Asteroids - Classic Retro Arcade
let ship;
let asteroids = [];
let lasers = [];
let particles = [];

// Game state variables
let score = 0;
let level = 1;
let lives = 3;
let isGameOver = false;
let highscore = 0;

// Ship dimensions and parameters
const SHIP_SIZE = 16;
const MAX_LASERS = 10;
const LASER_SPEED = 7;
const SHIELD_MAX = 100;
let shield = SHIELD_MAX;
let invulnerableTimer = 0;

// Mobile input states
let rotateInput = 0; // -1 for left, 1 for right, 0 for none
let thrustActive = false;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 500;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Load Highscore
    let stored = localStorage.getItem('asteroids_highscore');
    if (stored) {
        highscore = parseInt(stored);
    }

    // Attach buttons listeners
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);

    setupMobileControls();
    restartGame();
}

function draw() {
    background(2, 3, 5);

    if (!isGameOver) {
        // Update physics and states
        updateGame();
    }

    // Draw active elements
    drawAsteroids();
    drawLasers();
    drawParticles();

    if (!isGameOver && ship) {
        drawShip();
    }
}

class Ship {
    constructor() {
        this.pos = createVector(width / 2, height / 2);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.angle = -HALF_PI; // Facing up
        this.rotationSpeed = 0.06;
        this.drag = 0.985;
    }

    update() {
        // Apply rotation
        if (keyIsDown(LEFT_ARROW) || rotateInput === -1) {
            this.angle -= this.rotationSpeed;
        }
        if (keyIsDown(RIGHT_ARROW) || rotateInput === 1) {
            this.angle += this.rotationSpeed;
        }

        // Apply thrust
        if (keyIsDown(UP_ARROW) || thrustActive) {
            let force = p5.Vector.fromAngle(this.angle).mult(0.12);
            this.vel.add(force);
        }

        // Apply physics forces
        this.vel.add(this.acc);
        this.vel.mult(this.drag);
        this.pos.add(this.vel);
        
        // Clear acceleration
        this.acc.mult(0);

        // Screen boundaries wrap
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;

        // Invulnerability cooldown
        if (invulnerableTimer > 0) {
            invulnerableTimer--;
        }
    }
}

class Asteroid {
    constructor(pos, sizeState) {
        this.pos = pos ? pos.copy() : createVector(random(width), random(height));
        this.sizeState = sizeState || 'large'; // 'large', 'medium', 'small'
        
        // Define radii and velocities by size state
        if (this.sizeState === 'large') {
            this.r = random(35, 45);
            this.vel = p5.Vector.random2D().mult(random(0.6, 1.2));
        } else if (this.sizeState === 'medium') {
            this.r = random(20, 26);
            this.vel = p5.Vector.random2D().mult(random(1.1, 1.8));
        } else {
            this.r = random(10, 14);
            this.vel = p5.Vector.random2D().mult(random(1.7, 2.6));
        }

        // Irregular wireframe vertex offsets mapping
        this.totalVertices = Math.floor(random(8, 13));
        this.offsets = [];
        for (let i = 0; i < this.totalVertices; i++) {
            this.offsets.push(random(-this.r * 0.22, this.r * 0.22));
        }
    }

    update() {
        this.pos.add(this.vel);
        
        // Wrap around boundaries
        let buffer = this.r * 1.5;
        if (this.pos.x < -buffer) this.pos.x = width + buffer;
        if (this.pos.x > width + buffer) this.pos.x = -buffer;
        if (this.pos.y < -buffer) this.pos.y = height + buffer;
        if (this.pos.y > height + buffer) this.pos.y = -buffer;
    }
}

class Laser {
    constructor(pos, angle) {
        this.pos = pos.copy();
        this.vel = p5.Vector.fromAngle(angle).mult(LASER_SPEED);
        this.life = 75; // Frames before decaying
    }

    update() {
        this.pos.add(this.vel);
        this.life--;

        // Wrap around limits
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;
    }
}

function updateGame() {
    if (ship) {
        ship.update();
        checkCollisions();
    }

    // Update lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].update();
        if (lasers[i].life <= 0) {
            lasers.splice(i, 1);
        }
    }

    // Update asteroids
    asteroids.forEach(ast => ast.update());

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.pos.add(p.vel);
        p.life -= 4;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Spawn new wave if all asteroids are destroyed
    if (asteroids.length === 0) {
        level++;
        document.getElementById('level-val').textContent = level;
        spawnAsteroidWave();
    }
}

function checkCollisions() {
    if (!ship) return;

    // 1. Lasers hitting asteroids
    for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
        let laser = lasers[lIdx];
        for (let aIdx = asteroids.length - 1; aIdx >= 0; aIdx--) {
            let ast = asteroids[aIdx];
            let d = dist(laser.pos.x, laser.pos.y, ast.pos.x, ast.pos.y);
            
            if (d < ast.r) {
                // Remove laser and asteroid
                lasers.splice(lIdx, 1);
                destroyAsteroid(aIdx);
                break; // Exit inner loop for this laser
            }
        }
    }

    // 2. Ship hitting asteroids (ignore if invulnerable)
    if (invulnerableTimer === 0) {
        for (let i = 0; i < asteroids.length; i++) {
            let ast = asteroids[i];
            let d = dist(ship.pos.x, ship.pos.y, ast.pos.x, ast.pos.y);
            
            if (d < ast.r + SHIP_SIZE * 0.6) {
                damageShip(i);
                break;
            }
        }
    }
}

function destroyAsteroid(idx) {
    let ast = asteroids[idx];
    asteroids.splice(idx, 1);

    // Spawn fragments particle burst
    spawnExplosionParticles(ast.pos.x, ast.pos.y, ast.r);

    // Scoring & splitting rules
    let points = 0;
    if (ast.sizeState === 'large') {
        points = 100;
        asteroids.push(new Asteroid(ast.pos, 'medium'));
        asteroids.push(new Asteroid(ast.pos, 'medium'));
    } else if (ast.sizeState === 'medium') {
        points = 200;
        asteroids.push(new Asteroid(ast.pos, 'small'));
        asteroids.push(new Asteroid(ast.pos, 'small'));
    } else {
        points = 300;
    }

    score += points;
    document.getElementById('score-val').textContent = score;

    // Update alert status
    triggerHUDAlert("ASTEROID DISINTEGRATED");
}

function damageShip(astIdx) {
    // Deduct shields
    shield -= 25;
    
    // Spawn shield impact particles
    spawnExplosionParticles(ship.pos.x, ship.pos.y, SHIP_SIZE, true);

    if (shield <= 0) {
        lives--;
        updateLivesHUD();
        
        if (lives <= 0) {
            triggerGameOver();
        } else {
            // Respawn ship
            shield = SHIELD_MAX;
            ship = new Ship();
            invulnerableTimer = 90; // invulnerable for 1.5 seconds
            triggerHUDAlert("HULL RESTORED - SHIELD ACTIVE", true);
        }
    } else {
        invulnerableTimer = 45; // brief invulnerable phase on hit
        triggerHUDAlert("SHIELD IMPACT DETECTED", true);
    }

    // Update HTML HUD widgets
    document.getElementById('shield-val').textContent = `${shield}%`;
    document.getElementById('shield-fill').style.width = `${shield}%`;
}

function triggerHUDAlert(msg, critical = false) {
    const alertBox = document.getElementById('status-val');
    if (alertBox) {
        alertBox.textContent = msg;
        if (critical) {
            alertBox.className = "hud-value status-critical";
        } else {
            alertBox.className = "hud-value status-alert";
        }
    }
}

function spawnExplosionParticles(x, y, radius, isShield = false) {
    let pCount = radius * 0.8;
    for (let i = 0; i < pCount; i++) {
        particles.push({
            pos: createVector(x, y),
            vel: p5.Vector.random2D().mult(random(1.2, 3.5)),
            color: isShield ? [0, 242, 254] : [255, 159, 28], // Cyan shield vs Orange asteroid debris
            life: 255
        });
    }
}

function fireLaser() {
    if (isGameOver || !ship) return;
    if (lasers.length >= MAX_LASERS) return;

    // Calculate nozzle offset
    let nozzle = p5.Vector.fromAngle(ship.angle).mult(SHIP_SIZE);
    let lPos = p5.Vector.add(ship.pos, nozzle);
    lasers.push(new Laser(lPos, ship.angle));
}

function restartGame() {
    ship = new Ship();
    asteroids = [];
    lasers = [];
    particles = [];
    score = 0;
    level = 1;
    lives = 3;
    shield = SHIELD_MAX;
    isGameOver = false;
    invulnerableTimer = 90;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-val').textContent = score;
    document.getElementById('level-val').textContent = level;
    
    document.getElementById('shield-val').textContent = "100%";
    document.getElementById('shield-fill').style.width = "100%";
    
    updateLivesHUD();
    triggerHUDAlert("ALL SYSTEMS NOMINAL");
    spawnAsteroidWave();
}

function spawnAsteroidWave() {
    // Spawn count scales with levels
    let count = 3 + level;
    for (let i = 0; i < count; i++) {
        // Make sure asteroid doesn't spawn right on top of ship
        let pos;
        let d = 0;
        do {
            pos = createVector(random(width), random(height));
            d = dist(pos.x, pos.y, width / 2, height / 2);
        } while (d < 100);

        asteroids.push(new Asteroid(pos, 'large'));
    }
}

function updateLivesHUD() {
    const container = document.getElementById('lives-val');
    if (container) {
        container.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            container.innerHTML += `<i class="fa-solid fa-rocket life-icon"></i>`;
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    ship = null;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').style.display = 'flex';
    triggerHUDAlert("FLIGHT CORE DE-ACTIVATED", true);
}

// Draw Helper functions
function drawShip() {
    push();
    translate(ship.pos.x, ship.pos.y);
    rotate(ship.angle);

    // Flashing effect if invulnerable
    if (invulnerableTimer > 0 && Math.floor(millis() / 80) % 2 === 0) {
        pop();
        return;
    }

    noFill();
    
    // Draw neon cyan ship hull
    colorMode(HSL, 360, 100, 100, 1.0);
    stroke(180, 100, 50);
    strokeWeight(1.8);
    
    beginShape();
    vertex(SHIP_SIZE, 0);                 // Nose
    vertex(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6); // Rear wing left
    vertex(-SHIP_SIZE * 0.4, 0);          // Inner center
    vertex(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);  // Rear wing right
    endShape(CLOSE);

    // Draw vector thruster flame
    if ((keyIsDown(UP_ARROW) || thrustActive) && Math.floor(millis() / 50) % 2 === 0) {
        stroke(32, 100, 50); // Orange HSL
        beginShape();
        vertex(-SHIP_SIZE * 0.5, -SHIP_SIZE * 0.25);
        vertex(-SHIP_SIZE * 1.1, 0);
        vertex(-SHIP_SIZE * 0.5, SHIP_SIZE * 0.25);
        endShape(CLOSE);
    }
    pop();
}

function drawAsteroids() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noFill();
    
    // Glowing neon orange lines
    stroke(32, 100, 50);
    strokeWeight(1.5);

    asteroids.forEach(ast => {
        push();
        translate(ast.pos.x, ast.pos.y);
        
        beginShape();
        for (let i = 0; i < ast.totalVertices; i++) {
            let angle = (i * TWO_PI) / ast.totalVertices;
            let radiusOffset = ast.r + ast.offsets[i];
            let vx = cos(angle) * radiusOffset;
            let vy = sin(angle) * radiusOffset;
            vertex(vx, vy);
        }
        endShape(CLOSE);
        pop();
    });
}

function drawLasers() {
    colorMode(HSL, 360, 100, 100, 1.0);
    
    // Glowing cyan lines
    stroke(180, 100, 50);
    strokeWeight(2.0);

    lasers.forEach(laser => {
        // Draw trailing lines
        let backVector = p5.Vector.fromAngle(laser.vel.heading()).mult(-8);
        line(laser.pos.x, laser.pos.y, laser.pos.x + backVector.x, laser.pos.y + backVector.y);
    });
}

function drawParticles() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noStroke();

    particles.forEach(p => {
        fill(p.color[0], 100, 50, p.life / 255);
        ellipse(p.pos.x, p.pos.y, random(1.5, 3.5));
    });
}

// Controller key listeners
function keyPressed() {
    if (keyCode === 32) { // Space
        fireLaser();
    }
}

// Touch controls for mobile viewports
function setupMobileControls() {
    const bindBtn = (id, startAction, endAction) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startAction();
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (endAction) endAction();
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startAction();
            });
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                if (endAction) endAction();
            });
        }
    };

    bindBtn('ctrl-left', () => rotateInput = -1, () => rotateInput = 0);
    bindBtn('ctrl-right', () => rotateInput = 1, () => rotateInput = 0);
    bindBtn('ctrl-thrust', () => thrustActive = true, () => thrustActive = false);
    bindBtn('ctrl-fire', fireLaser);
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
