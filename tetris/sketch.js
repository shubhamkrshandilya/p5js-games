// Neon Tetris - Classic Retro Arcade
const gridCols = 10;
const gridRows = 20;
let board = [];               // 2D Array mapping locked blocks

// Tetromino configurations
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const HUES = {
    I: 180, // Cyan
    O: 60,  // Yellow
    T: 280, // Purple
    S: 120, // Green
    Z: 0,   // Red
    J: 220, // Blue
    L: 30   // Orange
};

const SHAPE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Game State variables
let currentPiece = null;
let currentX = 0;
let currentY = 0;

let nextPieceName = "";
let heldPieceName = "";
let hasHeldThisTurn = false;

let score = 0;
let highscore = 0;
let linesCleared = 0;
let level = 1;

let dropInterval = 1000;      // milliseconds between soft gravity drops
let lastDropTime = 0;
let isGameOver = false;

// Visual Effects
let particles = [];           // Row clear particle explosions
let cellSize = 22;
let gridLeft, gridTop;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 600;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Load Highscore
    let stored = localStorage.getItem('tetris_highscore');
    if (stored) {
        highscore = parseInt(stored);
        document.getElementById('highscore-val').textContent = formatScore(highscore);
    }

    // Attach Mobile Button listeners
    setupMobileControls();

    // Restart button hook
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    restartGame();
}

function draw() {
    background(2, 3, 5);

    // Calculate layout coordinates
    let sizeH = height * 0.90;
    let sizeW = sizeH * 0.50;
    
    // Scale layout to fit canvas
    cellSize = sizeH / gridRows;
    gridLeft = width / 2 - sizeW / 2;
    gridTop = height / 2 - sizeH / 2;

    // 1. Draw static grid box boundaries & matrix grid lines
    drawPlayBoardFrame(sizeW, sizeH);

    // 2. Physics drop gravity ticks
    if (!isGameOver) {
        let now = millis();
        if (now - lastDropTime > dropInterval) {
            movePieceDown();
            lastDropTime = now;
        }
    }

    // 3. Draw static locked grid blocks
    renderLockedBlocks();

    // 4. Draw active block + ghost guide projection block
    if (currentPiece && !isGameOver) {
        renderGhostPiece();
        renderActivePiece();
    }

    // 5. Update and draw visual row-clear particles
    updateAndDrawParticles();
}

function restartGame() {
    board = Array(gridRows).fill().map(() => Array(gridCols).fill(0));
    score = 0;
    linesCleared = 0;
    level = 1;
    dropInterval = 1000;
    isGameOver = false;
    heldPieceName = "";
    hasHeldThisTurn = false;
    particles = [];

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-val').textContent = formatScore(0);
    document.getElementById('lines-val').textContent = "0";
    document.getElementById('level-val').textContent = "1";

    nextPieceName = random(SHAPE_NAMES);
    spawnPiece();
}

function spawnPiece() {
    let shapeName = nextPieceName;
    nextPieceName = random(SHAPE_NAMES);

    currentPiece = {
        name: shapeName,
        matrix: SHAPES[shapeName],
        hue: HUES[shapeName]
    };

    // Center piece horizontally at the top row
    currentX = Math.floor((gridCols - currentPiece.matrix[0].length) / 2);
    currentY = 0;

    hasHeldThisTurn = false;
    lastDropTime = millis();

    // Game Over collision check
    if (checkCollision(currentPiece.matrix, currentX, currentY)) {
        triggerGameOver();
    }
}

function drawPlayBoardFrame(w, h) {
    // Fill board background
    noStroke();
    fill(8, 12, 22, 180);
    rect(gridLeft, gridTop, w, h, 6);

    // Fine grid backdrop guides
    stroke(255, 255, 255, 3);
    strokeWeight(1);
    for (let c = 1; c < gridCols; c++) {
        line(gridLeft + c * cellSize, gridTop, gridLeft + c * cellSize, gridTop + h);
    }
    for (let r = 1; r < gridRows; r++) {
        line(gridLeft, gridTop + r * cellSize, gridLeft + w, gridTop + r * cellSize);
    }

    // Border glowing framing lines
    stroke(255, 255, 255, 8);
    noFill();
    rect(gridLeft, gridTop, w, h, 6);
}

function renderLockedBlocks() {
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            let blockHue = board[r][c];
            if (blockHue > 0) {
                drawNeonBlock(gridLeft + c * cellSize, gridTop + r * cellSize, blockHue, 255);
            }
        }
    }
}

function renderActivePiece() {
    let mat = currentPiece.matrix;
    let hueVal = currentPiece.hue;

    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] > 0) {
                let sx = gridLeft + (currentX + c) * cellSize;
                let sy = gridTop + (currentY + r) * cellSize;
                drawNeonBlock(sx, sy, hueVal, 255);
            }
        }
    }
}

function renderGhostPiece() {
    // Calculate final landing row (ghost Y)
    let ghostY = currentY;
    while (!checkCollision(currentPiece.matrix, currentX, ghostY + 1)) {
        ghostY++;
    }

    let mat = currentPiece.matrix;
    let hueVal = currentPiece.hue;

    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] > 0) {
                let sx = gridLeft + (currentX + c) * cellSize;
                let sy = gridTop + (ghostY + r) * cellSize;
                
                // Draw outline only with low HSL opacity
                colorMode(HSL, 360, 100, 100, 1.0);
                stroke(hueVal, 95, 55, 0.4);
                strokeWeight(1.5);
                noFill();
                rect(sx + 1, sy + 1, cellSize - 2, cellSize - 2, 4);
                colorMode(RGB, 255, 255, 255, 255);
            }
        }
    }
}

function drawNeonBlock(x, y, hueVal, opacity) {
    colorMode(HSL, 360, 100, 100, 1.0);
    
    // Ambient back glow
    noStroke();
    fill(hueVal, 90, 52, opacity / 255 * 0.18);
    rect(x - 2, y - 2, cellSize + 4, cellSize + 4, 6);

    // Main solid block fill
    fill(hueVal, 85, 48, opacity / 255);
    stroke(hueVal, 95, 75, opacity / 255);
    strokeWeight(1.2);
    rect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);

    colorMode(RGB, 255, 255, 255, 255);
}

// Check matrix collision limits against static walls and locked blocks
function checkCollision(matrix, px, py) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] > 0) {
                let nextX = px + c;
                let nextY = py + r;

                // Border limits
                if (nextX < 0 || nextX >= gridCols || nextY >= gridRows) {
                    return true;
                }

                // Locked block collision check
                if (nextY >= 0 && board[nextY][nextX] > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function movePieceDown() {
    if (isGameOver) return;

    if (!checkCollision(currentPiece.matrix, currentX, currentY + 1)) {
        currentY++;
    } else {
        lockPiece();
    }
}

function lockPiece() {
    let mat = currentPiece.matrix;
    let hueVal = currentPiece.hue;

    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] > 0) {
                let boardY = currentY + r;
                let boardX = currentX + c;
                if (boardY >= 0) {
                    board[boardY][boardX] = hueVal;
                }
            }
        }
    }

    checkLineClears();
    spawnPiece();
}

function checkLineClears() {
    let linesFound = [];
    
    // Scan board bottom to top
    for (let r = gridRows - 1; r >= 0; r--) {
        let isFull = true;
        for (let c = 0; c < gridCols; c++) {
            if (board[r][c] === 0) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            linesFound.push(r);
        }
    }

    if (linesFound.length > 0) {
        // Trigger particle effects at cleared rows
        for (let r of linesFound) {
            spawnClearParticles(r);
        }

        // Shift rows down
        for (let r of linesFound) {
            // Delete row
            board.splice(r, 1);
            // Prepend new empty row at top
            board.unshift(Array(gridCols).fill(0));
            // Adjust row indices offsets for subsequent loop items
            for (let i = 0; i < linesFound.length; i++) {
                if (linesFound[i] < r) linesFound[i]++;
            }
        }

        // Scoring bonuses calculations
        let pointsEarned = 0;
        if (linesFound.length === 1) pointsEarned = 100 * level;
        else if (linesFound.length === 2) pointsEarned = 300 * level;
        else if (linesFound.length === 3) pointsEarned = 500 * level;
        else if (linesFound.length >= 4) pointsEarned = 800 * level;

        score += pointsEarned;
        linesCleared += linesFound.length;
        level = Math.floor(linesCleared / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90); // accelerate fall speed

        // Update score HUD
        document.getElementById('score-val').textContent = formatScore(score);
        document.getElementById('lines-val').textContent = linesCleared;
        document.getElementById('level-val').textContent = level;

        if (score > highscore) {
            highscore = score;
            localStorage.setItem('tetris_highscore', highscore);
            document.getElementById('highscore-val').textContent = formatScore(highscore);
        }
    }
}

function formatScore(num) {
    return String(num).padStart(6, '0');
}

function triggerHoldSwap() {
    if (hasHeldThisTurn || isGameOver) return;

    let tempName = heldPieceName;
    heldPieceName = currentPiece.name;

    if (tempName === "") {
        spawnPiece();
    } else {
        currentPiece = {
            name: tempName,
            matrix: SHAPES[tempName],
            hue: HUES[tempName]
        };
        currentX = Math.floor((gridCols - currentPiece.matrix[0].length) / 2);
        currentY = 0;
    }

    hasHeldThisTurn = true;
}

// Matrix Rotate Clockwise 90deg
function rotatePiece() {
    let mat = currentPiece.matrix;
    let n = mat.length;
    let m = mat[0].length;
    
    // Transpose and reverse rows
    let rotated = Array(m).fill().map(() => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < m; c++) {
            rotated[c][n - 1 - r] = mat[r][c];
        }
    }

    // Wall kicks: shift piece horizontally if collision occurs near board borders
    let kicks = [0, -1, 1, -2, 2];
    for (let dx of kicks) {
        if (!checkCollision(rotated, currentX + dx, currentY)) {
            currentPiece.matrix = rotated;
            currentX += dx;
            break;
        }
    }
}

function triggerHardDrop() {
    if (isGameOver) return;

    let ghostY = currentY;
    while (!checkCollision(currentPiece.matrix, currentX, ghostY + 1)) {
        ghostY++;
    }

    // Snap score bonus (2 pts per dropped row)
    score += (ghostY - currentY) * 2;
    document.getElementById('score-val').textContent = formatScore(score);

    currentY = ghostY;
    lockPiece();
}

function triggerGameOver() {
    isGameOver = true;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Row Clear Vector Particle Bursts
function spawnClearParticles(rowIdx) {
    let sy = gridTop + rowIdx * cellSize + cellSize / 2;
    for (let c = 0; c < gridCols; c++) {
        let sx = gridLeft + c * cellSize + cellSize / 2;
        let colorHue = board[rowIdx][c] || 320;
        
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: sx,
                y: sy,
                vx: random(-2.5, 2.5),
                vy: random(-3.5, 0.5),
                hue: colorHue,
                life: 255
            });
        }
    }
}

function updateAndDrawParticles() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noStroke();

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // slow fall gravity vector
        p.life -= 8;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        fill(p.hue, 95, 55, p.life / 255);
        ellipse(p.x, p.y, random(2.5, 5.0));
    }

    colorMode(RGB, 255, 255, 255, 255);
}

// Controller hooks mapping arrow keys
function keyPressed() {
    if (isGameOver) return;

    if (keyCode === LEFT_ARROW) {
        if (!checkCollision(currentPiece.matrix, currentX - 1, currentY)) {
            currentX--;
        }
    } else if (keyCode === RIGHT_ARROW) {
        if (!checkCollision(currentPiece.matrix, currentX + 1, currentY)) {
            currentX++;
        }
    } else if (keyCode === DOWN_ARROW) {
        movePieceDown();
        score += 1; // Soft drop point bonus
        document.getElementById('score-val').textContent = formatScore(score);
    } else if (keyCode === UP_ARROW || key === 'x' || key === 'X') {
        rotatePiece();
    } else if (keyCode === 32) { // Space
        triggerHardDrop();
    } else if (key === 'c' || key === 'C' || keyCode === SHIFT) {
        triggerHoldSwap();
    }
}

function setupMobileControls() {
    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Touchstart handles instant click latency maps
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                action();
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                action();
            });
        }
    };

    bindBtn('ctrl-left', () => {
        if (currentPiece && !checkCollision(currentPiece.matrix, currentX - 1, currentY)) {
            currentX--;
        }
    });

    bindBtn('ctrl-right', () => {
        if (currentPiece && !checkCollision(currentPiece.matrix, currentX + 1, currentY)) {
            currentX++;
        }
    });

    bindBtn('ctrl-rotate', () => {
        if (currentPiece) rotatePiece();
    });

    bindBtn('ctrl-soft', () => {
        if (currentPiece) {
            movePieceDown();
            score += 1;
            document.getElementById('score-val').textContent = formatScore(score);
        }
    });

    bindBtn('ctrl-hard', () => {
        if (currentPiece) triggerHardDrop();
    });

    bindBtn('ctrl-hold', () => {
        if (currentPiece) triggerHoldSwap();
    });
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
