// Holographic Minesweeper - Classic Retro Arcade
const COLS = 10;
const ROWS = 12;
let TOTAL_MINES = 20;

let board = [];
let firstClick = true;
let isGameOver = false;
let isGameWon = false;

// Time and Statistics Telemetry
let startTime = 0;
let elapsedTime = 0;
let finalTime = 0;
let flagsCount = 0;
let revealPercentage = 0;

// Interactive Visual Effects
let ripples = [];          // Shockwave vectors
let sonarAngle = 0;        // Sweep radial scanning line
let hoverCol = -1;
let hoverRow = -1;
let scanLineY = 0;         // Grid vertical pulse bar

// Mobile control state
let sweepMode = 'reveal'; // 'reveal' or 'flag'

// Layout sizes
let gridWidth, gridHeight;
let cellSize;
let gridLeft, gridTop;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 500;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Attach DOM listener buttons
    document.getElementById('restart-btn').addEventListener('click', resetBoard);
    document.getElementById('restart-btn-over').addEventListener('click', resetBoard);
    
    // Sweep mode toggle hooks
    const revealBtn = document.getElementById('mode-reveal');
    const flagBtn = document.getElementById('mode-flag');
    const ctrlSweep = document.getElementById('ctrl-sweep-mode');
    const ctrlFlag = document.getElementById('ctrl-flag-mode');

    const setMode = (mode) => {
        sweepMode = mode;
        if (mode === 'reveal') {
            revealBtn?.classList.add('active');
            flagBtn?.classList.remove('active');
            ctrlSweep?.classList.add('active');
            ctrlFlag?.classList.remove('active');
        } else {
            revealBtn?.classList.remove('active');
            flagBtn?.classList.add('active');
            ctrlSweep?.classList.remove('active');
            ctrlFlag?.classList.add('active');
        }
    };

    revealBtn?.addEventListener('click', () => setMode('reveal'));
    flagBtn?.addEventListener('click', () => setMode('flag'));
    ctrlSweep?.addEventListener('click', () => setMode('reveal'));
    ctrlFlag?.addEventListener('click', () => setMode('flag'));
    
    document.getElementById('ctrl-reset')?.addEventListener('click', resetBoard);

    // Disable right click context menu on the canvas
    canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());

    resetBoard();
}

function draw() {
    background(2, 4, 3);

    // Calculate layout sizing to fit standard canvas
    let sizeH = height * 0.88;
    let sizeW = sizeH * (COLS / ROWS);

    // Scaling bounds
    if (sizeW > width * 0.90) {
        sizeW = width * 0.90;
        sizeH = sizeW * (ROWS / COLS);
    }

    cellSize = sizeW / COLS;
    gridLeft = width / 2 - sizeW / 2;
    gridTop = height / 2 - sizeH / 2;

    // Draw HUD metrics
    updateTelemetry();

    // 1. Draw Holographic coordinate guides on margins
    drawCoordinateMargins();

    // 2. Draw cellular grid board
    drawBoardGrid();

    // 3. Render and animate scanning vectors
    drawSonarScanLine(sizeW, sizeH);

    // 4. Draw ripple rings
    drawRipples();
}

function resetBoard() {
    board = [];
    firstClick = true;
    isGameOver = false;
    isGameWon = false;
    startTime = 0;
    elapsedTime = 0;
    finalTime = 0;
    flagsCount = 0;
    revealPercentage = 0;
    ripples = [];
    scanLineY = 0;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('flags-val').textContent = 0;
    document.getElementById('timer-val').textContent = "000";
    document.getElementById('safe-val').textContent = "0%";

    // Initialize cells
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = {
                col: c,
                row: r,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                pulseRadius: 0
            };
        }
    }
}

// Set up mine layout on first click to guarantee safety on first click
function populateMines(avoidR, avoidC) {
    let mineCount = 0;
    while (mineCount < TOTAL_MINES) {
        let r = Math.floor(random(ROWS));
        let c = Math.floor(random(COLS));

        // Skip if cell is the starting position, adjacent, or already a mine
        if (board[r][c].isMine || (Math.abs(r - avoidR) <= 1 && Math.abs(c - avoidC) <= 1)) {
            continue;
        }

        board[r][c].isMine = true;
        mineCount++;
    }

    // Precompute neighbors counts
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countMines(r, c);
            }
        }
    }
}

function countMines(row, col) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = row + dr;
            let nc = col + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (board[nr][nc].isMine) count++;
            }
        }
    }
    return count;
}

function updateTelemetry() {
    if (startTime > 0 && !isGameOver && !isGameWon) {
        elapsedTime = Math.floor((millis() - startTime) / 1000);
        let timerStr = String(elapsedTime).padStart(3, '0');
        document.getElementById('timer-val').textContent = timerStr;
    }

    // Safe reveal percentage
    let revealed = 0;
    let totalSafe = ROWS * COLS - TOTAL_MINES;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isRevealed && !board[r][c].isMine) revealed++;
        }
    }
    revealPercentage = Math.floor((revealed / totalSafe) * 100);
    document.getElementById('safe-val').textContent = `${revealPercentage}%`;

    // Coordinates radar hover log
    if (mouseX >= gridLeft && mouseX < gridLeft + COLS * cellSize &&
        mouseY >= gridTop && mouseY < gridTop + ROWS * cellSize) {
        hoverCol = Math.floor((mouseX - gridLeft) / cellSize);
        hoverRow = Math.floor((mouseY - gridTop) / cellSize);
        let letter = String.fromCharCode(65 + hoverCol); // A, B, C...
        let num = hoverRow + 1;
        document.getElementById('radar-val').textContent = `SECTOR ${letter}${num}`;
    } else {
        hoverCol = -1;
        hoverRow = -1;
        document.getElementById('radar-val').textContent = "SCANNING...";
    }
}

function drawCoordinateMargins() {
    textAlign(CENTER, CENTER);
    textSize(cellSize * 0.28);
    textFont('Press Start 2P');
    
    // Holographic green markers
    fill(0, 255, 102, 120);

    // Columns: A-J
    for (let c = 0; c < COLS; c++) {
        let label = String.fromCharCode(65 + c);
        text(label, gridLeft + c * cellSize + cellSize / 2, gridTop - 12);
    }
    
    // Rows: 1-12
    for (let r = 0; r < ROWS; r++) {
        let label = r + 1;
        text(label, gridLeft - 15, gridTop + r * cellSize + cellSize / 2);
    }
}

function drawBoardGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let cell = board[r][c];
            let cx = gridLeft + c * cellSize;
            let cy = gridTop + r * cellSize;

            // Draw cell backing
            if (cell.isRevealed) {
                if (cell.isMine) {
                    fill(255, 42, 42, 100);
                } else {
                    fill(0, 255, 102, 12);
                }
            } else {
                fill(10, 23, 14, 150);
            }

            // Radar scan highlighting
            if (c === hoverCol || r === hoverRow) {
                fill(0, 255, 102, 25);
            }

            stroke(0, 255, 102, 120); // High visibility green grid cell border
            strokeWeight(1.4);
            rect(cx + 1, cy + 1, cellSize - 2, cellSize - 2, 4);

            // Draw contents
            if (cell.isRevealed) {
                if (cell.isMine) {
                    // Draw vector mine
                    drawVectorMine(cx + cellSize / 2, cy + cellSize / 2);
                } else if (cell.neighborMines > 0) {
                    // Draw neighbor mine numbers
                    drawHoloNumber(cx + cellSize / 2, cy + cellSize / 2, cell.neighborMines);
                }
            } else if (cell.isFlagged) {
                // Draw holographic vector flag
                drawVectorFlag(cx + cellSize / 2, cy + cellSize / 2);
            }
        }
    }
}

function drawVectorMine(x, y) {
    push();
    translate(x, y);
    stroke(255, 42, 42);
    strokeWeight(1.8);
    noFill();

    // Pulse core
    ellipse(0, 0, cellSize * 0.4);
    
    // Radial spikes
    for (let a = 0; a < 360; a += 45) {
        let rad = radians(a);
        let x1 = cos(rad) * (cellSize * 0.15);
        let y1 = sin(rad) * (cellSize * 0.15);
        let x2 = cos(rad) * (cellSize * 0.32);
        let y2 = sin(rad) * (cellSize * 0.32);
        line(x1, y1, x2, y2);
    }
    pop();
}

function drawVectorFlag(x, y) {
    push();
    translate(x, y);
    stroke(255, 159, 28);
    strokeWeight(1.5);
    fill(255, 159, 28, 40);

    // Pole
    line(-cellSize * 0.15, cellSize * 0.3, -cellSize * 0.15, -cellSize * 0.3);
    // Banner triangle
    beginShape();
    vertex(-cellSize * 0.15, -cellSize * 0.3);
    vertex(cellSize * 0.25, -cellSize * 0.12);
    vertex(-cellSize * 0.15, 0.0);
    endShape(CLOSE);
    // Base plate
    line(-cellSize * 0.3, cellSize * 0.3, 0.0, cellSize * 0.3);
    pop();
}

function drawHoloNumber(x, y, val) {
    textAlign(CENTER, CENTER);
    textSize(cellSize * 0.42);
    textFont('Press Start 2P');
    textStyle(BOLD);

    // Heat maps for numbers
    if (val === 1) fill(0, 242, 254);        // Cyan
    else if (val === 2) fill(0, 255, 102);   // Green
    else if (val === 3) fill(255, 159, 28);  // Orange
    else fill(255, 42, 42);                  // Red/Pink

    text(val, x, y);
}

function drawSonarScanLine(w, h) {
    // 1. Pulsing coordinate cursor sonar circles
    if (hoverCol !== -1 && hoverRow !== -1) {
        let scx = gridLeft + hoverCol * cellSize + cellSize / 2;
        let scy = gridTop + hoverRow * cellSize + cellSize / 2;
        
        let pulseRadius = (millis() / 5) % (cellSize * 1.5);
        let pulseOpacity = map(pulseRadius, 0, cellSize * 1.5, 180, 0);

        stroke(0, 255, 102, pulseOpacity);
        strokeWeight(1.2);
        noFill();
        ellipse(scx, scy, pulseRadius);
    }

    // 2. Vertical line scanning pulse bar
    scanLineY += 2;
    if (scanLineY > h) scanLineY = 0;

    stroke(0, 255, 102, 110); // Highly visible scan line
    strokeWeight(1.5);
    line(gridLeft, gridTop + scanLineY, gridLeft + w, gridTop + scanLineY);
}

function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
        let rip = ripples[i];
        rip.radius += 3;
        rip.opacity -= 6;

        if (rip.opacity <= 0) {
            ripples.splice(i, 1);
            continue;
        }

        stroke(rip.color[0], rip.color[1], rip.color[2], rip.opacity);
        strokeWeight(1.5);
        noFill();
        ellipse(rip.x, rip.y, rip.radius);
    }
}

function spawnRipple(x, y, isGreen = true) {
    ripples.push({
        x: x,
        y: y,
        radius: 5,
        opacity: 200,
        color: isGreen ? [0, 255, 102] : [255, 159, 28] // Green reveal vs Orange flag ripples
    });
}

function mousePressed() {
    if (isGameOver || isGameWon) return;

    // Check bounds
    if (mouseX < gridLeft || mouseX >= gridLeft + COLS * cellSize ||
        mouseY < gridTop || mouseY >= gridTop + ROWS * cellSize) {
        return;
    }

    let c = Math.floor((mouseX - gridLeft) / cellSize);
    let r = Math.floor((mouseY - gridTop) / cellSize);

    // Left click or sweep mode
    if (mouseButton === LEFT && sweepMode === 'reveal') {
        revealCell(r, c);
    } else {
        // Right click, shift click, or flag mode
        toggleFlag(r, c);
    }
}

function revealCell(row, col) {
    let cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    if (firstClick) {
        firstClick = false;
        startTime = millis();
        populateMines(row, col);
    }

    cell.isRevealed = true;
    spawnRipple(gridLeft + col * cellSize + cellSize / 2, gridTop + row * cellSize + cellSize / 2, true);

    if (cell.isMine) {
        triggerLoss(row, col);
        return;
    }

    // Auto expand neighbors
    if (cell.neighborMines === 0) {
        expandBlankCells(row, col);
    }

    checkWinState();
}

function toggleFlag(row, col) {
    let cell = board[row][col];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    flagsCount += cell.isFlagged ? 1 : -1;
    document.getElementById('flags-val').textContent = flagsCount;

    spawnRipple(gridLeft + col * cellSize + cellSize / 2, gridTop + row * cellSize + cellSize / 2, false);
}

// Flood fill reveal
function expandBlankCells(row, col) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = row + dr;
            let nc = col + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                let neighbor = board[nr][nc];
                if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                    neighbor.isRevealed = true;
                    if (neighbor.neighborMines === 0) {
                        expandBlankCells(nr, nc);
                    }
                }
            }
        }
    }
}

function checkWinState() {
    let unrevealedSafe = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine && !board[r][c].isRevealed) {
                unrevealedSafe++;
            }
        }
    }

    if (unrevealedSafe === 0) {
        isGameWon = true;
        finalTime = Math.floor((millis() - startTime) / 1000);
        document.getElementById('final-time').textContent = finalTime;
        
        const title = document.getElementById('game-over-title');
        title.textContent = "FIELD CLEARED";
        title.style.color = "var(--neon-green)";
        document.getElementById('game-over-screen').style.display = 'flex';

        // Auto flag all mines
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].isMine) {
                    board[r][c].isFlagged = true;
                }
            }
        }
    }
}

// Sequential reveal of mines upon losing
function triggerLoss(loseRow, loseCol) {
    isGameOver = true;
    finalTime = Math.floor((millis() - startTime) / 1000);
    document.getElementById('final-time').textContent = finalTime;
    
    const title = document.getElementById('game-over-title');
    title.textContent = "GRID COMPROMISED";
    title.style.color = "var(--neon-red)";
    
    // Wave reveal animation of all other mines
    let minesToReveal = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine && !(r === loseRow && c === loseCol)) {
                // Calculate distance from detonation point
                let d = dist(c, r, loseCol, loseRow);
                minesToReveal.push({ r, c, d });
            }
        }
    }

    // Sort by distance
    minesToReveal.sort((a, b) => a.d - b.d);

    // Schedule delayed sequential reveals
    minesToReveal.forEach((m, idx) => {
        setTimeout(() => {
            if (isGameOver) {
                board[m.r][m.c].isRevealed = true;
                spawnRipple(gridLeft + m.c * cellSize + cellSize / 2, gridTop + m.r * cellSize + cellSize / 2, false);
            }
        }, 150 + idx * 80);
    });

    // Display screen overlay after a small delay
    setTimeout(() => {
        if (isGameOver) {
            document.getElementById('game-over-screen').style.display = 'flex';
        }
    }, 1500);
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
