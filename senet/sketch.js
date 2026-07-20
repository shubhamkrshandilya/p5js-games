// Cyber Senet - sketch.js
const BOARD_ROWS = 3;
const BOARD_COLS = 10;
const BOARD_SIZE = 30;

// Coordinate path mapping (S-shaped track: left-to-right, right-to-left, left-to-right)
const pathCoords = [];
for (let r = 0; r < BOARD_ROWS; r++) {
    if (r === 1) {
        // Row 1 goes right-to-left (9 down to 0)
        for (let c = BOARD_COLS - 1; c >= 0; c--) {
            pathCoords.push({x: c, y: r});
        }
    } else {
        // Row 0 and 2 go left-to-right (0 to 9)
        for (let c = 0; c < BOARD_COLS; c++) {
            pathCoords.push({x: c, y: r});
        }
    }
}

// Key safe house indexes (0-indexed steps)
const HOUSE_BEAUTY = 25;   // Square 26: Safe stops here
const HOUSE_WATER = 26;    // Square 27: Hazard resets back to 14
const HOUSE_THREE_TRUTHS = 27; // Square 28: Safe exit track
const HOUSE_RE_ATOUM = 28; // Square 29: Safe exit track
const HOUSE_EXIT = 29;     // Square 30: Final square

// Pieces (-1: start leg, 0-29: track spaces, 30: borne off)
let playerPieces = Array(5).fill(-1);
let aiPieces = Array(5).fill(-1);

let activePlayer = 1; // 1: Player (Blue), 2: AI (Magenta)
let currentRoll = -1;
let sticksCast = [0, 0, 0, 0];
let isSticksCast = false;
let isGameOver = false;

// Stick casting animation state
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600; // ms

// Visual effects
let particles = [];
let advisoryIndex = -1;

// Rendering sizes
let boardPadding = 30;
let cellSize;
let boardLeft, boardTop;
let boardWidth, boardHeight;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 450;
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

    // Dynamic grid resizing (maintain standard rectangular board proportion)
    boardWidth = Math.min(width * 0.9, height * 2.5) * 0.88;
    cellSize = boardWidth / BOARD_COLS;
    boardHeight = cellSize * BOARD_ROWS;
    
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2.3 - boardHeight / 2;

    // Draw S-path track cells and hieroglyph detail markers
    drawSenetBoard();
    
    // Draw animated casting sticks
    updateAndDrawSticks();

    // Draw active pieces
    drawPieces();

    // Highlight valid moves or advisory targets
    drawValidMovesAndAdvisory();

    // Particle visuals
    drawParticles();
}

function restartGame() {
    playerPieces = [-1, -1, -1, -1, -1];
    aiPieces = [-1, -1, -1, -1, -1];
    activePlayer = 1;
    currentRoll = -1;
    sticksCast = [0, 0, 0, 0];
    isSticksCast = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    // Set starting positions on the first 10 squares alternating
    // Player on even, AI on odd
    let pIdx = 0, aIdx = 0;
    for (let s = 0; s < 10; s++) {
        if (s % 2 === 0) {
            playerPieces[pIdx++] = s;
        } else {
            aiPieces[aIdx++] = s;
        }
    }

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-home-val').textContent = "0 / 5";
    document.getElementById('ai-home-val').textContent = "0 / 5";
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: CAST STICKS");
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

// Trigger animated sticks roll
function startCasting() {
    if (isGameOver || isRolling || isSticksCast || activePlayer !== 1) return;
    
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

// Draw/animate Senet casting sticks in the HUD area below board
function updateAndDrawSticks() {
    let dx = width / 2;
    let dy = boardTop + boardHeight + cellSize * 0.7;

    if (isRolling) {
        let elapsed = millis() - rollTimer;
        if (elapsed < rollDuration) {
            for (let i = 0; i < 4; i++) {
                sticksCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            let tempSum = getCastingScore(sticksCast);
            document.getElementById('roll-val').textContent = tempSum;
        } else {
            isRolling = false;
            isSticksCast = true;
            for (let i = 0; i < 4; i++) {
                sticksCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            currentRoll = getCastingScore(sticksCast);
            document.getElementById('roll-val').textContent = currentRoll;
            
            handleRollComplete();
        }
    }

    // Render 4 glowing casting sticks
    let stickWidth = cellSize * 0.16;
    let stickHeight = cellSize * 0.95;
    let gap = stickWidth * 2.5;
    let startX = dx - (stickWidth * 2 + gap * 1.5);

    for (let i = 0; i < 4; i++) {
        let flatSideUp = sticksCast[i] === 1;
        let px = startX + i * gap;
        
        push();
        translate(px, dy);
        if (isRolling) {
            rotate(frameCount * 0.25);
        }
        
        if (flatSideUp) {
            // Flat side up (Light with cross-mark lines)
            fill(0, 242, 254, 210);
            stroke(255);
            strokeWeight(1);
            rect(-stickWidth/2, -stickHeight/2, stickWidth, stickHeight, 4);
            // Detail lines
            stroke(255, 100);
            line(-stickWidth/2, 0, stickWidth/2, 0);
            line(-stickWidth/2, -stickHeight/4, stickWidth/2, -stickHeight/4);
            line(-stickWidth/2, stickHeight/4, stickWidth/2, stickHeight/4);
        } else {
            // Dark side up (round dark back side)
            fill(10, 20, 30, 240);
            stroke(255, 255, 255, 30);
            strokeWeight(1.5);
            rect(-stickWidth/2, -stickHeight/2, stickWidth, stickHeight, 4);
        }
        pop();
    }
}

// Convert stick configurations to scores (1-5)
// 1 flat side up = 1, 2 = 2, 3 = 3, 4 = 4, 0 flat sides up = 5
function getCastingScore(sticks) {
    let flats = sticks.reduce((a, b) => a + b, 0);
    return flats === 0 ? 5 : flats;
}

// Verify if a move is valid
function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;

    const pieces = player === 1 ? playerPieces : aiPieces;
    const currentStep = pieces[pieceIndex];

    // Already borne off
    if (currentStep === 30) return false;

    const targetStep = currentStep + roll;

    // Exits off board
    if (targetStep > 30) return false;
    if (targetStep === 30) {
        // Must bear off exactly from the final safe row/exits
        return currentStep >= HOUSE_THREE_TRUTHS;
    }

    // Cannot land on another piece of your own color
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] === targetStep && i !== pieceIndex) return false;
    }

    // Rules for Safe House of Beauty (Must land here exactly to proceed)
    if (currentStep < HOUSE_BEAUTY && targetStep > HOUSE_BEAUTY) {
        return false; // Cannot skip House of Beauty
    }

    // Check opponent protection block
    const opponentPieces = player === 1 ? aiPieces : playerPieces;
    let containsOpponent = opponentPieces.includes(targetStep);
    
    if (containsOpponent) {
        // Opponent is protected if they have an adjacent piece of their color (form block of 2 or more)
        let isProtected = false;
        // Check adjacent coordinates
        if (opponentPieces.includes(targetStep - 1) || opponentPieces.includes(targetStep + 1)) {
            isProtected = true;
        }
        if (isProtected) return false; // Protected cell cannot be swapped/attacked
    }

    return true;
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

// Swaps turn (rolls of 1, 4, and 5 grant an extra turn in Senet)
function passTurn() {
    if (isGameOver) return;
    
    let isExtraTurn = (currentRoll === 1 || currentRoll === 4 || currentRoll === 5);
    
    isSticksCast = false;
    currentRoll = -1;
    advisoryIndex = -1;

    if (isExtraTurn) {
        if (activePlayer === 1) {
            updateHUDStatus("EXTRA TURN! CAST STICKS");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI ROLLED EXTRA TURN: RE-CASTING...");
            enableRollButton(false);
            setTimeout(makeAIMove, 600);
        }
    } else {
        activePlayer = activePlayer === 1 ? 2 : 1;
        if (activePlayer === 1) {
            updateHUDStatus("YOUR TURN: CAST STICKS");
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
    if (isGameOver || activePlayer !== 1 || isRolling || !isSticksCast) return;

    let mx = mouseX - boardLeft;
    let my = mouseY - boardTop;
    
    let bx = Math.floor(mx / cellSize);
    let by = Math.floor(my / cellSize);

    // Find if user clicked on any of their pieces
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s >= 0 && s < 30) {
            let cell = pathCoords[s];
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

// Move a piece and handle swaps, safe houses, reset trap
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const opponentPieces = player === 1 ? aiPieces : playerPieces;
    
    const oldStep = pieces[pieceIndex];
    const newStep = oldStep + roll;

    if (newStep === 30) {
        // Bear off!
        pieces[pieceIndex] = 30;
        triggerCaptureVisual(pathCoords[oldStep].x, pathCoords[oldStep].y, player);
    } else {
        // Check swaps
        let oppIdx = opponentPieces.indexOf(newStep);
        if (oppIdx !== -1) {
            // Swap positions
            opponentPieces[oppIdx] = oldStep;
            triggerCaptureVisual(pathCoords[newStep].x, pathCoords[newStep].y, 3); // Swapping gold burst
        }
        
        pieces[pieceIndex] = newStep;

        // Reset rule: House of Water resets back to House of Rebirth (14)
        if (newStep === HOUSE_WATER) {
            setTimeout(() => {
                pieces[pieceIndex] = 14; // Back to square 15 (14 in index)
                triggerCaptureVisual(pathCoords[14].x, pathCoords[14].y, 3);
            }, 500);
        }
    }

    // Update borne metrics
    let playerHome = playerPieces.filter(s => s === 30).length;
    let aiHome = aiPieces.filter(s => s === 30).length;
    document.getElementById('player-home-val').textContent = `${playerHome} / 5`;
    document.getElementById('ai-home-val').textContent = `${aiHome} / 5`;

    // Check Win
    if (playerHome === 5) {
        endSimulation(true, "VICTORY! All pieces borne off.");
        return;
    }
    if (aiHome === 5) {
        endSimulation(false, "SYSTEM FAILURE: AI bore off all pieces.");
        return;
    }

    passTurn();
}

// AI logic loop
function makeAIMove() {
    if (isGameOver) return;

    // Roll AI sticks
    sticksCast = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        sticksCast[i] = Math.random() < 0.5 ? 0 : 1;
    }
    currentRoll = getCastingScore(sticksCast);
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

        // Bear off is highest priority
        if (nextStep === 30) score += 1000;

        // Captures/Swaps
        if (playerPieces.includes(nextStep)) score += 400;

        // Landing in safe houses
        if (nextStep === HOUSE_BEAUTY || nextStep === HOUSE_THREE_TRUTHS || nextStep === HOUSE_RE_ATOUM) {
            score += 300;
        }

        // Avoid House of Water reset trap
        if (nextStep === HOUSE_WATER) score -= 800;

        // Keep pieces close to shield them
        if (aiPieces.includes(nextStep - 1) || aiPieces.includes(nextStep + 1)) {
            score += 150;
        }

        // Advance forward
        score += nextStep * 10;

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
    if (isGameOver || activePlayer !== 1 || !isSticksCast || currentRoll <= 0) return;

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

        if (nextStep === 30) score += 1000;
        if (aiPieces.includes(nextStep)) score += 400;
        if (nextStep === HOUSE_BEAUTY || nextStep === HOUSE_THREE_TRUTHS || nextStep === HOUSE_RE_ATOUM) {
            score += 300;
        }
        if (nextStep === HOUSE_WATER) score -= 800;
        if (playerPieces.includes(nextStep - 1) || playerPieces.includes(nextStep + 1)) {
            score += 150;
        }
        score += nextStep * 10;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Draw track cells and hieroglyph detail markers
function drawSenetBoard() {
    stroke(255, 255, 255, 12);
    strokeWeight(1);
    
    for (let s = 0; s < BOARD_SIZE; s++) {
        let cell = pathCoords[s];
        let cx = boardLeft + cell.x * cellSize;
        let cy = boardTop + cell.y * cellSize;

        // Custom base backing
        fill(10, 20, 30, 160);
        stroke(255, 255, 255, 15);
        strokeWeight(1.5);
        rect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 6);

        // Track path index display labels
        noStroke();
        fill(255, 255, 255, 25);
        textSize(8);
        textAlign(CENTER, CENTER);
        text(s + 1, cx + cellSize - 10, cy + cellSize - 10);

        // Draw symbols for special safe/hazard houses
        if (s === HOUSE_BEAUTY) {
            stroke(255, 215, 0, 180);
            strokeWeight(1.5);
            fill(255, 215, 0, 15);
            circle(cx + cellSize/2, cy + cellSize/2, cellSize * 0.65);
            noStroke();
            fill(255, 215, 0, 200);
            textSize(10);
            text("NFR", cx + cellSize/2, cy + cellSize/2); // Hieroglyph for Beauty
        } else if (s === HOUSE_WATER) {
            stroke(255, 0, 127, 180);
            strokeWeight(1.5);
            fill(255, 0, 127, 15);
            rect(cx + cellSize*0.18, cy + cellSize*0.18, cellSize*0.64, cellSize*0.64, 4);
            noStroke();
            fill(255, 0, 127, 200);
            text("H2O", cx + cellSize/2, cy + cellSize/2); // Hazard trap
        } else if (s >= HOUSE_THREE_TRUTHS && s <= HOUSE_EXIT) {
            // Safe exit zone indicators (3, 2, 1 dots)
            let dots = 3 - (s - HOUSE_THREE_TRUTHS);
            fill(0, 242, 254, 180);
            noStroke();
            for (let d = 0; d < dots; d++) {
                circle(cx + cellSize/2 + (d - (dots-1)/2) * 10, cy + cellSize/2, 5);
            }
        }
    }
}

// Show selection outlines
function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isSticksCast || currentRoll <= 0) return;

    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let s = playerPieces[i];
            let cell = pathCoords[s];
            let cx = boardLeft + cell.x * cellSize + cellSize/2;
            let cy = boardTop + cell.y * cellSize + cellSize/2;

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

// Draw pieces on track
function drawPieces() {
    for (let y = 0; y < BOARD_ROWS; y++) {
        for (let x = 0; x < BOARD_COLS; x++) {
            // Find if there is a player/AI piece at (x, y)
            let cellIndex = pathCoords.findIndex(c => c.x === x && c.y === y);
            if (cellIndex === -1) continue;

            let playerPiece = playerPieces.includes(cellIndex);
            let aiPiece = aiPieces.includes(cellIndex);

            let cx = boardLeft + x * cellSize + cellSize/2;
            let cy = boardTop + y * cellSize + cellSize/2;

            if (playerPiece) {
                // Blue spool-shaped tokens
                fill(0, 242, 254, 50);
                circle(cx, cy, cellSize * 0.58);
                fill(0, 242, 254, 210);
                circle(cx, cy, cellSize * 0.38);
                // Center line
                stroke(255);
                strokeWeight(1.5);
                line(cx - 3, cy, cx + 3, cy);
            } else if (aiPiece) {
                // Magenta cone-shaped tokens
                fill(255, 0, 127, 50);
                circle(cx, cy, cellSize * 0.58);
                fill(255, 0, 127, 210);
                circle(cx, cy, cellSize * 0.38);
                // Center cross
                stroke(255);
                strokeWeight(1.5);
                line(cx - 2, cy - 2, cx + 2, cy + 2);
                line(cx + 2, cy - 2, cx - 2, cy + 2);
            }
        }
    }
}

function triggerCaptureVisual(bx, by, type) {
    let px = boardLeft + bx * cellSize + cellSize/2;
    let py = boardTop + by * cellSize + cellSize/2;
    let col = color(255, 0, 127); // AI
    if (type === 1) col = color(0, 242, 254); // Player
    if (type === 3) col = color(255, 215, 0); // Swap

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
        updateHUDStatus("YOU BORE OFF ALL PIECES!");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("AI BORE OFF ALL PIECES!");
    }
}
