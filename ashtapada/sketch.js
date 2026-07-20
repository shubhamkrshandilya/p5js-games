// Cyber Ashtapada - sketch.js
const BOARD_GRID = 8;
const MAX_STEPS = 64;

// Safe (cross-cut) square coordinates on 8x8 board
const safeCells = [
    {x: 0, y: 0}, {x: 7, y: 0}, {x: 0, y: 7}, {x: 7, y: 7}, // Corners
    {x: 3, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}, {x: 0, y: 4}, // Mid-edges
    {x: 7, y: 3}, {x: 7, y: 4}, {x: 3, y: 7}, {x: 4, y: 7},
    {x: 3, y: 3}, {x: 3, y: 4}, {x: 4, y: 3}, {x: 4, y: 4}  // Center
];

// Generate counter-clockwise spiraling path coordinates starting from outer mid-edge (3,7)
// Traces outer ring counter-clockwise, then next ring, etc.
function generateSpiralPath(startX, startY) {
    let path = [];
    let visited = Array(BOARD_GRID).fill().map(() => Array(BOARD_GRID).fill(false));
    let x = startX;
    let y = startY;
    
    // Custom directions for counter-clockwise spiraling
    // Starting going right, then up, then left, then down
    let directions = [{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}];
    let dirIndex = 0;

    for (let step = 0; step < BOARD_GRID * BOARD_GRID; step++) {
        path.push({x: x, y: y});
        visited[y][x] = true;

        let nextX = x + directions[dirIndex].x;
        let nextY = y + directions[dirIndex].y;

        // If next step is out of bounds or visited, turn left (counter-clockwise)
        if (nextX < 0 || nextX >= BOARD_GRID || nextY < 0 || nextY >= BOARD_GRID || visited[nextY][nextX]) {
            dirIndex = (dirIndex + 1) % 4;
            nextX = x + directions[dirIndex].x;
            nextY = y + directions[dirIndex].y;
        }

        x = nextX;
        y = nextY;
    }
    return path;
}

const playerPath = generateSpiralPath(3, 7);
const aiPath = generateSpiralPath(4, 0);

// Pieces (4 pieces per player, -1: start, 0-63: steps, 64: exited center)
let playerPieces = [-1, -1, -1, -1];
let aiPieces = [-1, -1, -1, -1];

let activePlayer = 1; // 1: Player (Blue), 2: AI (Red)
let currentRoll = -1;
let shellsCast = [0, 0, 0, 0];
let isShellsCast = false;
let isGameOver = false;

// Casting animation
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600;

// Visual particles for captures
let particles = [];
let advisoryIndex = -1;

// Sizing
let boardPadding = 40;
let cellSize;
let boardLeft, boardTop;
let boardWidth;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM events
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('roll-btn').addEventListener('click', startCasting);
    document.getElementById('hint-btn').addEventListener('click', calculateAdvisory);

    restartGame();
}

function draw() {
    background(4, 5, 8);

    boardWidth = Math.min(width, height) * 0.86;
    cellSize = (boardWidth - boardPadding * 2) / (BOARD_GRID - 1);
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2.2 - boardWidth / 2;

    // Draw grid layout and cross cuts
    drawAshtapadaBoard();

    // Draw animated shells
    updateAndDrawShells();

    // Draw active pieces
    drawPieces();

    // Highlight valid moves or advisory targets
    drawValidMovesAndAdvisory();

    // Particle visuals
    drawParticles();
}

function restartGame() {
    playerPieces = [-1, -1, -1, -1];
    aiPieces = [-1, -1, -1, -1];
    activePlayer = 1;
    currentRoll = -1;
    shellsCast = [0, 0, 0, 0];
    isShellsCast = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-home-val').textContent = "0 / 4";
    document.getElementById('ai-home-val').textContent = "0 / 4";
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: CAST COWRIES");
}

function updateHUDStatus(msg) {
    const statusVal = document.getElementById('status-val');
    if (statusVal) {
        statusVal.textContent = msg;
        if (msg.includes("YOUR")) {
            statusVal.style.color = "var(--neon-cyan)";
            statusVal.style.textShadow = "0 0 10px rgba(0, 242, 254, 0.4)";
        } else if (msg.includes("AI") || msg.includes("THINKING")) {
            statusVal.style.color = "var(--neon-magenta)";
            statusVal.style.textShadow = "0 0 10px rgba(255, 0, 127, 0.4)";
        } else {
            statusVal.style.color = "var(--neon-green)";
            statusVal.style.textShadow = "0 0 10px rgba(0, 255, 102, 0.4)";
        }
    }
}

function enableRollButton(enable) {
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) {
        rollBtn.disabled = !enable;
        rollBtn.style.opacity = enable ? 1 : 0.4;
    }
}

function startCasting() {
    if (isGameOver || isRolling || isShellsCast || activePlayer !== 1) return;
    
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

// Draw/animate cowry shell casts in the HUD area
function updateAndDrawShells() {
    let dx = width / 2;
    let dy = boardTop + boardWidth - boardPadding + cellSize * 0.7;

    if (isRolling) {
        let elapsed = millis() - rollTimer;
        if (elapsed < rollDuration) {
            for (let i = 0; i < 4; i++) {
                shellsCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            let tempSum = getShellsScore(shellsCast);
            document.getElementById('roll-val').textContent = tempSum;
        } else {
            isRolling = false;
            isShellsCast = true;
            for (let i = 0; i < 4; i++) {
                shellsCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            currentRoll = getShellsScore(shellsCast);
            document.getElementById('roll-val').textContent = currentRoll;
            
            handleRollComplete();
        }
    }

    // Render 4 cowries (ovals representing mouths up/down)
    let shellW = cellSize * 0.35;
    let shellH = cellSize * 0.55;
    let gap = shellW * 2.2;
    let startX = dx - (shellW * 2 + gap * 1.5);

    for (let i = 0; i < 4; i++) {
        let mouthUp = shellsCast[i] === 1;
        let px = startX + i * gap;
        
        push();
        translate(px, dy);
        if (isRolling) {
            rotate(frameCount * 0.2);
        }
        
        noStroke();
        if (mouthUp) {
            // Mouth up (Glowing cyan oval with a central split)
            fill(0, 242, 254, 210);
            ellipse(0, 0, shellW, shellH);
            stroke(255);
            strokeWeight(1.5);
            line(0, -shellH/2 + 3, 0, shellH/2 - 3);
        } else {
            // Mouth down (Rounded dark back shell)
            fill(10, 20, 30, 240);
            stroke(255, 255, 255, 30);
            strokeWeight(1.5);
            ellipse(0, 0, shellW, shellH);
        }
        pop();
    }
}

// Mouth up (0-4) mapping: 1=1, 2=2, 3=3, 4=4, 0=8
function getShellsScore(shells) {
    let ups = shells.reduce((a, b) => a + b, 0);
    return ups === 0 ? 8 : ups;
}

// Verify valid moves
function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;

    const pieces = player === 1 ? playerPieces : aiPieces;
    const currentStep = pieces[pieceIndex];

    if (currentStep === MAX_STEPS) return false; // Already exited

    const targetStep = currentStep + roll;
    
    // Must land exactly on or before the final exit step (64)
    if (targetStep > MAX_STEPS) return false;
    if (targetStep === MAX_STEPS) return true; // Exit always valid

    // Cannot land on another piece of your own color
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] === targetStep && i !== pieceIndex) return false;
    }

    // Check safe zones
    const path = player === 1 ? playerPath : aiPath;
    const targetCell = path[targetStep];
    const isTargetSafe = safeCells.some(c => c.x === targetCell.x && c.y === targetCell.y);

    if (isTargetSafe) {
        // Safe cell: multiple pieces of DIFFERENT colors can coexist!
        // So landing here is always allowed.
        return true;
    } else {
        // Non-safe cell: cannot land if occupied by your own piece (checked above)
        // Can land and capture if occupied by opponent.
        return true;
    }
}

function hasValidMoves(player, roll) {
    if (roll <= 0) return false;
    const pieces = player === 1 ? playerPieces : aiPieces;
    for (let i = 0; i < pieces.length; i++) {
        if (isValidMove(player, i, roll)) return true;
    }
    return false;
}

function handleRollComplete() {
    if (hasValidMoves(activePlayer, currentRoll)) {
        updateHUDStatus("YOUR TURN: SELECT PIECE");
        advisoryIndex = -1;
    } else {
        updateHUDStatus("NO VALID MOVES: PASSING...");
        setTimeout(passTurn, 800);
    }
}

// Swaps turn (roll of 8 grants an extra turn)
function passTurn() {
    if (isGameOver) return;
    
    let isExtraTurn = (currentRoll === 8);
    
    isShellsCast = false;
    currentRoll = -1;
    advisoryIndex = -1;

    if (isExtraTurn) {
        if (activePlayer === 1) {
            updateHUDStatus("ROLLED 8! EXTRA TURN: CAST COWRIES");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI ROLLED 8! RE-CASTING...");
            enableRollButton(false);
            setTimeout(makeAIMove, 600);
        }
    } else {
        activePlayer = activePlayer === 1 ? 2 : 1;
        if (activePlayer === 1) {
            updateHUDStatus("YOUR TURN: CAST COWRIES");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI THINKING...");
            enableRollButton(false);
            setTimeout(makeAIMove, 600);
        }
    }
}

// User Move selections
function mousePressed() {
    if (isGameOver || activePlayer !== 1 || isRolling || !isShellsCast) return;

    let mx = mouseX - boardLeft - boardPadding;
    let my = mouseY - boardTop - boardPadding;
    
    let bx = Math.round(mx / cellSize);
    let by = Math.round(my / cellSize);

    // Click starting leg dock (coordinates outside grid range)
    let clickedStartDock = false;
    if (bx === 3 && by === 7) {
        // Player start coordinate
        clickedStartDock = true;
    }

    // Find clicked piece
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1 && clickedStartDock) {
            selectedPieceIndex = i;
            break;
        }
        if (s >= 0 && s < MAX_STEPS) {
            let cell = playerPath[s];
            if (cell.x === bx && cell.y === by) {
                selectedPieceIndex = i;
                break;
            }
        }
    }

    if (selectedPieceIndex !== -1) {
        if (isValidMove(1, selectedPieceIndex, currentRoll)) {
            movePiece(1, selectedPieceIndex, currentRoll);
        }
    }
}

// Move peg and resolve captures
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const path = player === 1 ? playerPath : aiPath;
    
    const oldStep = pieces[pieceIndex];
    const newStep = oldStep + roll;

    pieces[pieceIndex] = newStep;

    if (newStep === MAX_STEPS) {
        // Exited center!
        triggerCaptureVisual(path[oldStep].x, path[oldStep].y, player);
    } else {
        let targetCell = path[newStep];
        triggerCaptureVisual(targetCell.x, targetCell.y, player);

        // Capture check (only allowed on NON-SAFE cells)
        const isTargetSafe = safeCells.some(c => c.x === targetCell.x && c.y === targetCell.y);
        
        if (!isTargetSafe) {
            const opponentPieces = player === 1 ? aiPieces : playerPieces;
            const oppPath = player === 1 ? aiPath : playerPath;

            for (let i = 0; i < opponentPieces.length; i++) {
                let os = opponentPieces[i];
                if (os >= 0 && os < MAX_STEPS) {
                    let oCell = oppPath[os];
                    if (oCell.x === targetCell.x && oCell.y === targetCell.y) {
                        // Capture! Send back to start (-1)
                        opponentPieces[i] = -1;
                        triggerCaptureVisual(targetCell.x, targetCell.y, 3); // Gold blast
                    }
                }
            }
        }
    }

    // Update borne metrics
    let playerHome = playerPieces.filter(s => s === MAX_STEPS).length;
    let aiHome = aiPieces.filter(s => s === MAX_STEPS).length;
    document.getElementById('player-home-val').textContent = `${playerHome} / 4`;
    document.getElementById('ai-home-val').textContent = `${aiHome} / 4`;

    // Check Win
    if (playerHome === 4) {
        endSimulation(true, "VICTORY! All pegs reached center.");
        return;
    }
    if (aiHome === 4) {
        endSimulation(false, "SYSTEM FAILURE: AI reached center first.");
        return;
    }

    passTurn();
}

// AI logic loop
function makeAIMove() {
    if (isGameOver) return;

    // Roll AI cowries
    shellsCast = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        shellsCast[i] = Math.random() < 0.5 ? 0 : 1;
    }
    currentRoll = getShellsScore(shellsCast);
    document.getElementById('roll-val').textContent = currentRoll;

    // List valid moves
    let validIndices = [];
    for (let i = 0; i < aiPieces.length; i++) {
        if (isValidMove(2, i, currentRoll)) {
            validIndices.push(i);
        }
    }

    if (validIndices.length === 0) {
        updateHUDStatus("AI HAS NO MOVES: PASSING...");
        setTimeout(passTurn, 800);
        return;
    }

    // Choose best move using heuristics
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let s = aiPieces[index];
        let nextStep = s + currentRoll;

        // Reaching center (exiting)
        if (nextStep === MAX_STEPS) score += 1000;

        // Captures
        if (nextStep < MAX_STEPS) {
            let targetCell = aiPath[nextStep];
            const isTargetSafe = safeCells.some(c => c.x === targetCell.x && c.y === targetCell.y);
            if (!isTargetSafe) {
                for (let op of playerPieces) {
                    if (op >= 0 && op < MAX_STEPS) {
                        let pCell = playerPath[op];
                        if (pCell.x === targetCell.x && pCell.y === targetCell.y) {
                            score += 500; // Capture player!
                        }
                    }
                }
            }
        }

        // Landing in safe zones
        if (nextStep < MAX_STEPS) {
            let nextCell = aiPath[nextStep];
            let isSafe = safeCells.some(c => c.x === nextCell.x && c.y === nextCell.y);
            if (isSafe) score += 250;
        }

        // Advance forward
        score += nextStep * 12;

        if (s === -1) score += 50; // Enter piece

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    if (bestIndex !== -1) {
        setTimeout(() => {
            movePiece(2, bestIndex, currentRoll);
        }, 600);
    }
}

// Player hint advisor
function calculateAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isShellsCast || currentRoll <= 0) return;

    let validIndices = [];
    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            validIndices.push(i);
        }
    }

    if (validIndices.length === 0) return;

    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let s = playerPieces[index];
        let nextStep = s + currentRoll;

        if (nextStep === MAX_STEPS) score += 1000;
        
        if (nextStep < MAX_STEPS) {
            let targetCell = playerPath[nextStep];
            const isTargetSafe = safeCells.some(c => c.x === targetCell.x && c.y === targetCell.y);
            if (!isTargetSafe) {
                for (let op of aiPieces) {
                    if (op >= 0 && op < MAX_STEPS) {
                        let aCell = aiPath[op];
                        if (aCell.x === targetCell.x && aCell.y === targetCell.y) {
                            score += 500;
                        }
                    }
                }
            }
        }

        if (nextStep < MAX_STEPS) {
            let nextCell = playerPath[nextStep];
            let isSafe = safeCells.some(c => c.x === nextCell.x && c.y === nextCell.y);
            if (isSafe) score += 250;
        }

        score += nextStep * 12;
        if (s === -1) score += 50;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Draw track lines and cross safe decorations
function drawAshtapadaBoard() {
    stroke(255, 255, 255, 12);
    strokeWeight(1.5);
    
    // Draw cells
    for (let r = 0; r < BOARD_GRID; r++) {
        for (let c = 0; c < BOARD_GRID; c++) {
            let cx = boardLeft + boardPadding + c * cellSize;
            let cy = boardTop + boardPadding + r * cellSize;

            // Box
            fill(10, 20, 30, 160);
            stroke(255, 255, 255, 15);
            rect(cx - cellSize/2, cy - cellSize/2, cellSize, cellSize, 4);

            // Safe cross marks check
            let isSafe = safeCells.some(sc => sc.x === c && sc.y === r);
            if (isSafe) {
                stroke(255, 215, 0, 100);
                strokeWeight(1.5);
                fill(255, 215, 0, 10);
                rect(cx - cellSize/2 + 2, cy - cellSize/2 + 2, cellSize - 4, cellSize - 4, 4);
                // Draw cross lines
                stroke(255, 215, 0, 140);
                line(cx - cellSize/3, cy - cellSize/3, cx + cellSize/3, cy + cellSize/3);
                line(cx + cellSize/3, cy - cellSize/3, cx - cellSize/3, cy + cellSize/3);
            }
        }
    }
}

// Highlight valid moves or advisory
function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isShellsCast || currentRoll <= 0) return;

    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let s = playerPieces[i];
            let cx, cy;
            
            if (s === -1) {
                // Dock node at (3, 7)
                cx = boardLeft + boardPadding + 3 * cellSize;
                cy = boardTop + boardPadding + 7 * cellSize;
            } else {
                let cell = playerPath[s];
                cx = boardLeft + boardPadding + cell.x * cellSize;
                cy = boardTop + boardPadding + cell.y * cellSize;
            }

            if (i === advisoryIndex) {
                stroke(0, 255, 102, 240);
                strokeWeight(2.5);
                fill(0, 255, 102, 35);
            } else {
                stroke(0, 242, 254, 150);
                strokeWeight(1.5);
                fill(0, 242, 254, 25);
            }
            circle(cx, cy, cellSize * 0.72);
        }
    }
}

// Render player and AI pieces on track
function drawPieces() {
    // 1. Draw Player Pieces
    let unenteredCount = 0;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1) {
            // Draw stacked in starting safe square (3, 7) with tiny offset
            let cx = boardLeft + boardPadding + 3 * cellSize + (unenteredCount - 1.5) * 5;
            let cy = boardTop + boardPadding + 7 * cellSize;
            drawPieceToken(cx, cy, 1);
            unenteredCount++;
        } else if (s >= 0 && s < MAX_STEPS) {
            let cell = playerPath[s];
            let cx = boardLeft + boardPadding + cell.x * cellSize;
            let cy = boardTop + boardPadding + cell.y * cellSize;
            
            // Offset slightly if multiple pieces occupy the same safe square
            let offsetIndex = getSafeOccupancyOffset(cx, cy, i, 1);
            drawPieceToken(cx + offsetIndex * 5, cy, 1);
        }
    }

    // 2. Draw AI Pieces
    let aiUnenteredCount = 0;
    for (let i = 0; i < aiPieces.length; i++) {
        let s = aiPieces[i];
        if (s === -1) {
            // Draw stacked in starting safe square (4, 0) with tiny offset
            let cx = boardLeft + boardPadding + 4 * cellSize + (aiUnenteredCount - 1.5) * 5;
            let cy = boardTop + boardPadding + 0 * cellSize;
            drawPieceToken(cx, cy, 2);
            aiUnenteredCount++;
        } else if (s >= 0 && s < MAX_STEPS) {
            let cell = aiPath[s];
            let cx = boardLeft + boardPadding + cell.x * cellSize;
            let cy = boardTop + boardPadding + cell.y * cellSize;
            
            // Offset slightly if multiple pieces occupy the same safe square
            let offsetIndex = getSafeOccupancyOffset(cx, cy, i, 2);
            drawPieceToken(cx + offsetIndex * 5, cy, 2);
        }
    }
}

// Helper to determine offset if safe cells host multiple pieces
function getSafeOccupancyOffset(cx, cy, pieceIndex, faction) {
    let offset = 0;
    const myPieces = faction === 1 ? playerPieces : aiPieces;
    const oppPieces = faction === 1 ? aiPieces : playerPieces;
    const myPath = faction === 1 ? playerPath : aiPath;
    const oppPath = faction === 1 ? aiPath : playerPath;

    // Count how many prior pieces are at the same coordinates
    for (let i = 0; i < pieceIndex; i++) {
        let s = myPieces[i];
        if (s >= 0 && s < MAX_STEPS) {
            let cell = myPath[s];
            let px = boardLeft + boardPadding + cell.x * cellSize;
            let py = boardTop + boardPadding + cell.y * cellSize;
            if (px === cx && py === cy) offset++;
        }
    }

    // Include opponent pieces on safe squares
    for (let i = 0; i < oppPieces.length; i++) {
        let os = oppPieces[i];
        if (os >= 0 && os < MAX_STEPS) {
            let cell = oppPath[os];
            let px = boardLeft + boardPadding + cell.x * cellSize;
            let py = boardTop + boardPadding + cell.y * cellSize;
            if (px === cx && py === cy) offset++;
        }
    }

    return offset - 1; // Center the distribution
}

function drawPieceToken(cx, cy, faction) {
    noStroke();
    if (faction === 1) {
        // Player (Blue glass)
        fill(0, 242, 254, 50);
        circle(cx, cy, cellSize * 0.58);
        fill(0, 242, 254, 210);
        circle(cx, cy, cellSize * 0.38);
        // Detail circle
        stroke(255, 120);
        strokeWeight(1);
        noFill();
        circle(cx, cy, cellSize * 0.2);
    } else {
        // AI (Red glass)
        fill(255, 0, 127, 50);
        circle(cx, cy, cellSize * 0.58);
        fill(255, 0, 127, 210);
        circle(cx, cy, cellSize * 0.38);
        // Detail cross
        stroke(255, 120);
        strokeWeight(1);
        line(cx - 2, cy - 2, cx + 2, cy + 2);
        line(cx + 2, cy - 2, cx - 2, cy + 2);
    }
}

function triggerCaptureVisual(bx, by, type) {
    let px = boardLeft + boardPadding + bx * cellSize;
    let py = boardTop + boardPadding + by * cellSize;
    let col = color(255, 0, 127); // AI
    if (type === 1) col = color(0, 242, 254); // Player
    if (type === 3) col = color(255, 215, 0); // Capture

    for (let i = 0; i < 15; i++) {
        particles.push({
            x: px,
            y: py,
            vx: random(-3.5, 3.5),
            vy: random(-3.5, 3.5),
            alpha: 255,
            size: random(3, 8),
            color: col
        });
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 6;
        p.size *= 0.95;
        
        noStroke();
        let c = color(red(p.color), green(p.color), blue(p.color), p.alpha);
        fill(c);
        circle(p.x, p.y, p.size);

        if (p.alpha <= 0 || p.size < 0.5) {
            particles.splice(i, 1);
        }
    }
}

function endSimulation(playerVictory, msg) {
    isGameOver = true;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-msg').textContent = msg;
    
    if (playerVictory) {
        document.getElementById('game-over-title').textContent = "SIMULATION COMPLETE";
        document.getElementById('game-over-title').style.color = "var(--neon-cyan)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(0, 242, 254, 0.6)";
        updateHUDStatus("YOU BORE OFF ALL PEGS!");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("AI BORE OFF ALL PEGS!");
    }
}
