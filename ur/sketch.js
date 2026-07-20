// Cyber Royal Game of Ur - sketch.js
const BOARD_ROWS = 3;
const BOARD_COLS = 8;

// Board mapping paths (14 spaces + start & finish)
const playerPath = [
    {x: 3, y: 2}, {x: 2, y: 2}, {x: 1, y: 2}, {x: 0, y: 2}, // Own track (4)
    {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}, // Shared track (8)
    {x: 4, y: 1}, {x: 5, y: 1}, {x: 6, y: 1}, {x: 7, y: 1},
    {x: 7, y: 2}, {x: 6, y: 2}                             // Own exit (2)
];

const aiPath = [
    {x: 3, y: 0}, {x: 2, y: 0}, {x: 1, y: 0}, {x: 0, y: 0}, // Own track (4)
    {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}, // Shared track (8)
    {x: 4, y: 1}, {x: 5, y: 1}, {x: 6, y: 1}, {x: 7, y: 1},
    {x: 7, y: 0}, {x: 6, y: 0}                             // Own exit (2)
];

// Rosettes positions (relative to cols/rows)
const rosettes = [
    {x: 0, y: 0}, {x: 0, y: 2}, // Left rosettes
    {x: 3, y: 1},               // Middle rosette (Combat zone!)
    {x: 6, y: 0}, {x: 6, y: 2}  // Right rosettes
];

// Pieces: Array of step index (-1: start, 0-13: board path, 14: borne off)
let playerPieces = Array(7).fill(-1);
let aiPieces = Array(7).fill(-1);

let activePlayer = 1; // 1: Player (Blue), 2: AI (Red)
let currentRoll = -1;
let diceCast = [0, 0, 0, 0];
let isDiceRolled = false;
let isGameOver = false;

// Dice rolling animation state
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600; // ms

// Visual particles for capture triggers
let particles = [];
let advisoryIndex = -1; // Index of recommended player piece to move

// Layout configurations
let boardPadding = 40;
let cellSize;
let boardLeft, boardTop;
let boardWidth, boardHeight;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 450;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM bindings
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('roll-btn').addEventListener('click', startDiceRoll);
    document.getElementById('hint-btn').addEventListener('click', calculateAdvisory);

    restartGame();
}

function draw() {
    background(4, 5, 8);

    // Dynamic grid resizing (maintain standard rectangular board proportion)
    boardWidth = Math.min(width * 0.9, height * 1.8) * 0.88;
    cellSize = boardWidth / BOARD_COLS;
    boardHeight = cellSize * BOARD_ROWS;
    
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2.2 - boardHeight / 2;

    // Draw track guides, rosettes, board squares
    drawUrBoard();
    
    // Draw rotating 3D-like dice indicators
    updateAndDrawDice();

    // Draw active pieces
    drawPieces();

    // Highlight valid moves or advisory targets
    drawValidMovesAndAdvisory();

    // Capture particle systems
    drawParticles();
}

function restartGame() {
    playerPieces = Array(7).fill(-1);
    aiPieces = Array(7).fill(-1);
    activePlayer = 1;
    currentRoll = -1;
    diceCast = [0, 0, 0, 0];
    isDiceRolled = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-home-val').textContent = "0 / 7";
    document.getElementById('ai-home-val').textContent = "0 / 7";
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: ROLL DICE");
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

// Roll 4 binary dice
function startDiceRoll() {
    if (isGameOver || isRolling || isDiceRolled || activePlayer !== 1) return;
    
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

// Animate and complete dice roll casting
function updateAndDrawDice() {
    let dx = width / 2;
    let dy = boardTop + boardHeight + cellSize * 0.8;

    if (isRolling) {
        let elapsed = millis() - rollTimer;
        if (elapsed < rollDuration) {
            // Spin visual dice values
            for (let i = 0; i < 4; i++) {
                diceCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            let tempSum = diceCast.reduce((a, b) => a + b, 0);
            document.getElementById('roll-val').textContent = tempSum;
        } else {
            // Roll complete
            isRolling = false;
            isDiceRolled = true;
            for (let i = 0; i < 4; i++) {
                diceCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            currentRoll = diceCast.reduce((a, b) => a + b, 0);
            document.getElementById('roll-val').textContent = currentRoll;
            
            handleRollComplete();
        }
    }

    // Render 4 neon diamonds for the dice
    noStroke();
    let size = cellSize * 0.45;
    let gap = size * 1.5;
    let startX = dx - (size * 2 + gap * 1.5);

    for (let i = 0; i < 4; i++) {
        let dVal = diceCast[i];
        let px = startX + i * gap;
        
        if (dVal === 1) {
            fill(0, 242, 254, 210); // Glowing Cyan
            push();
            translate(px, dy);
            rotate(isRolling ? frameCount * 0.2 : QUARTER_PI);
            rect(-size/2, -size/2, size, size, 3);
            // Dice corner markers
            fill(255);
            circle(-size/3, 0, 3);
            circle(size/3, 0, 3);
            pop();
        } else {
            fill(255, 255, 255, 20); // Dim/Off
            stroke(255, 255, 255, 40);
            strokeWeight(1.5);
            push();
            translate(px, dy);
            rotate(isRolling ? frameCount * 0.2 : QUARTER_PI);
            rect(-size/2, -size/2, size, size, 3);
            pop();
        }
    }
}

// Check if player has any valid moves with the current roll
function hasValidMoves(player, roll) {
    if (roll === 0) return false;
    const pieces = player === 1 ? playerPieces : aiPieces;
    
    for (let i = 0; i < pieces.length; i++) {
        if (isValidMove(player, i, roll)) return true;
    }
    return false;
}

// Check eligibility of moving piece index by 'roll' spaces
function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;
    
    const pieces = player === 1 ? playerPieces : aiPieces;
    const currentStep = pieces[pieceIndex];
    
    // Already borne off
    if (currentStep === 14) return false;
    
    const targetStep = currentStep + roll;
    
    // Exits off board
    if (targetStep > 14) return false;
    if (targetStep === 14) return true; // Exit always valid

    // Get board coordinates of target step
    const path = player === 1 ? playerPath : aiPath;
    const targetCell = path[targetStep];

    // Cannot land on another of your own pieces
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] === targetStep && i !== pieceIndex) return false;
    }

    // Check combat shared lane Rosette safety
    // The combat lane rosette is at (3, 1), step 7 in both tracks.
    if (targetCell.x === 3 && targetCell.y === 1) {
        const opponentPieces = player === 1 ? aiPieces : playerPieces;
        const oppPath = player === 1 ? aiPath : playerPath;
        
        // Find if opponent occupies it
        for (let op of opponentPieces) {
            if (op >= 0 && op < 14) {
                let cell = oppPath[op];
                if (cell.x === 3 && cell.y === 1) return false; // Occupied rosette is safe harbor
            }
        }
    }

    return true;
}

function handleRollComplete() {
    if (currentRoll === 0) {
        updateHUDStatus("DICE ROLL 0: PASSING TURN");
        setTimeout(passTurn, 800);
    } else {
        if (hasValidMoves(activePlayer, currentRoll)) {
            updateHUDStatus("YOUR TURN: SELECT PIECE");
            advisoryIndex = -1; // Reset hint
        } else {
            updateHUDStatus("NO VALID MOVES: PASSING...");
            setTimeout(passTurn, 800);
        }
    }
}

function passTurn() {
    if (isGameOver) return;
    activePlayer = activePlayer === 1 ? 2 : 1;
    isDiceRolled = false;
    currentRoll = -1;
    advisoryIndex = -1;

    if (activePlayer === 1) {
        updateHUDStatus("YOUR TURN: ROLL DICE");
        enableRollButton(true);
    } else {
        updateHUDStatus("AI THINKING...");
        enableRollButton(false);
        setTimeout(makeAIMove, 450);
    }
}

// Handle clicking on pieces to execute moves
function mousePressed() {
    if (isGameOver || activePlayer !== 1 || isRolling || !isDiceRolled) return;

    let mx = mouseX - boardLeft;
    let my = mouseY - boardTop;
    
    let bx = Math.floor(mx / cellSize);
    let by = Math.floor(my / cellSize);

    // Check if player clicked the starting dock area (represents s = -1 pieces)
    let clickedStartDock = false;
    if (bx === 4 || bx === 5) {
        if (by === 2) clickedStartDock = true;
    }

    // Find if clicked coordinates match any piece
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1 && clickedStartDock) {
            selectedPieceIndex = i;
            break;
        }
        if (s >= 0 && s < 14) {
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

// Move piece index of player by 'roll' steps
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const path = player === 1 ? playerPath : aiPath;
    const oldStep = pieces[pieceIndex];
    const newStep = oldStep + roll;
    
    pieces[pieceIndex] = newStep;

    // Trigger visual move particles
    if (newStep < 14) {
        let targetCell = path[newStep];
        triggerCaptureVisual(targetCell.x, targetCell.y, player);
    }

    // Check Captures (only in the middle combat row: y === 1)
    if (newStep >= 4 && newStep <= 11) {
        let targetCell = path[newStep];
        const opponentPieces = player === 1 ? aiPieces : playerPieces;
        const oppPath = player === 1 ? aiPath : playerPath;

        for (let i = 0; i < opponentPieces.length; i++) {
            let os = opponentPieces[i];
            if (os >= 4 && os <= 11) {
                let oCell = oppPath[os];
                if (oCell.x === targetCell.x && oCell.y === targetCell.y) {
                    // Capture! Send back to start (-1)
                    opponentPieces[i] = -1;
                    triggerCaptureVisual(targetCell.x, targetCell.y, 3); // Gold explosion on capture
                }
            }
        }
    }

    // Update borne off display values
    let playerHome = playerPieces.filter(s => s === 14).length;
    let aiHome = aiPieces.filter(s => s === 14).length;
    document.getElementById('player-home-val').textContent = `${playerHome} / 7`;
    document.getElementById('ai-home-val').textContent = `${aiHome} / 7`;

    // Check Win
    if (playerHome === 7) {
        endSimulation(true, "VICTORY! All pieces borne off.");
        return;
    }
    if (aiHome === 7) {
        endSimulation(false, "SYSTEM FAILURE: AI bore off all pieces.");
        return;
    }

    // If landed on a Rosette, keep the turn!
    if (newStep < 14) {
        let finalCell = path[newStep];
        let isRosette = rosettes.some(r => r.x === finalCell.x && r.y === finalCell.y);
        
        if (isRosette) {
            isDiceRolled = false;
            currentRoll = -1;
            advisoryIndex = -1;
            if (player === 1) {
                updateHUDStatus("ROSETTE! ROLL AGAIN");
                enableRollButton(true);
            } else {
                updateHUDStatus("AI LANDED ON ROSETTE! RE-ROLLING");
                setTimeout(makeAIMove, 600);
            }
            return;
        }
    }

    // Swaps turn
    passTurn();
}

// AI Turn Logic
function makeAIMove() {
    if (isGameOver) return;

    // Roll AI dice automatically
    diceCast = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        diceCast[i] = Math.random() < 0.5 ? 0 : 1;
    }
    currentRoll = diceCast.reduce((a, b) => a + b, 0);
    document.getElementById('roll-val').textContent = currentRoll;

    if (currentRoll === 0) {
        updateHUDStatus("AI ROLLED 0: PASSING...");
        setTimeout(passTurn, 800);
        return;
    }

    // List all valid moves for AI
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

    // Evaluate AI moves using heuristic weightings
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let s = aiPieces[index];
        let nextStep = s + currentRoll;

        // 1. Escaping a piece (bear off)
        if (nextStep === 14) score += 1000;
        
        // 2. Capture opponent piece
        if (nextStep >= 4 && nextStep <= 11) {
            let targetCell = aiPath[nextStep];
            for (let op of playerPieces) {
                if (op >= 4 && op <= 11) {
                    let pCell = playerPath[op];
                    if (pCell.x === targetCell.x && pCell.y === targetCell.y) {
                        score += 600; // Capture!
                    }
                }
            }
        }

        // 3. Rosette landing (safe haven + extra roll)
        if (nextStep < 14) {
            let nextCell = aiPath[nextStep];
            let isRosette = rosettes.some(r => r.x === nextCell.x && r.y === nextCell.y);
            if (isRosette) score += 400;
        }

        // 4. Moving a piece that is currently in danger of being captured
        if (s >= 4 && s <= 11) {
            let cell = aiPath[s];
            let isThreatened = false;
            for (let op of playerPieces) {
                if (op >= 4 && op < 12) {
                    let pCell = playerPath[op];
                    // Opponent pieces behind this peg in combat corridor
                    if (pCell.x < cell.x) isThreatened = true;
                }
            }
            if (isThreatened) score += 200;
        }

        // 5. Piece progress weight (advance piece furthest forward)
        score += nextStep * 15;

        // 6. Enter a new piece if roll allows it
        if (s === -1) score += 50;

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
    if (isGameOver || activePlayer !== 1 || !isDiceRolled || currentRoll <= 0) return;

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

        if (nextStep === 14) score += 1000;
        
        // Capture opponent
        if (nextStep >= 4 && nextStep <= 11) {
            let targetCell = playerPath[nextStep];
            for (let op of aiPieces) {
                if (op >= 4 && op <= 11) {
                    let aCell = aiPath[op];
                    if (aCell.x === targetCell.x && aCell.y === targetCell.y) {
                        score += 600;
                    }
                }
            }
        }

        // Landing on Rosette
        if (nextStep < 14) {
            let nextCell = playerPath[nextStep];
            let isRosette = rosettes.some(r => r.x === nextCell.x && r.y === nextCell.y);
            if (isRosette) score += 400;
        }

        // Escape danger
        if (s >= 4 && s <= 11) {
            let cell = playerPath[s];
            let isThreatened = false;
            for (let op of aiPieces) {
                if (op >= 4 && op < 12) {
                    let aCell = aiPath[op];
                    if (aCell.x < cell.x) isThreatened = true;
                }
            }
            if (isThreatened) score += 200;
        }

        score += nextStep * 15;
        if (s === -1) score += 50;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Drawing core Ur Board layouts
function drawUrBoard() {
    stroke(255, 255, 255, 12);
    strokeWeight(1);
    
    // Draw cells
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            // Exclude empty board cutouts (columns 4, 5 on top and bottom rows)
            if ((r === 0 || r === 2) && (c === 4 || c === 5)) continue;

            let cx = boardLeft + c * cellSize;
            let cy = boardTop + r * cellSize;

            // Box backing
            fill(10, 20, 30, 160);
            stroke(255, 255, 255, 15);
            strokeWeight(1.5);
            rect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 6);

            // Is Rosette cell?
            let isRosette = rosettes.some(rs => rs.x === c && rs.y === r);
            if (isRosette) {
                // Draw glowing Rosette pattern
                stroke(255, 215, 0, 150);
                strokeWeight(1.5);
                fill(255, 215, 0, 15);
                circle(cx + cellSize/2, cy + cellSize/2, cellSize * 0.72);
                
                // Draw inner rosette crosshairs
                line(cx + cellSize/2, cy + cellSize*0.15, cx + cellSize/2, cy + cellSize*0.85);
                line(cx + cellSize*0.15, cy + cellSize/2, cx + cellSize*0.85, cy + cellSize/2);
            }
        }
    }

    // Draw Starting Dock areas
    // Player dock (Cyan outline near bottom columns 4,5)
    let pdx = boardLeft + 4 * cellSize;
    let pdy = boardTop + 2 * cellSize;
    stroke(0, 242, 254, 80);
    fill(0, 242, 254, 10);
    rect(pdx + 2, pdy + 2, cellSize * 2 - 4, cellSize - 4, 8);
    
    // AI dock (Magenta outline near top columns 4,5)
    let adx = boardLeft + 4 * cellSize;
    let ady = boardTop + 0 * cellSize;
    stroke(255, 0, 127, 80);
    fill(255, 0, 127, 10);
    rect(adx + 2, ady + 2, cellSize * 2 - 4, cellSize - 4, 8);

    // Text labels inside docks
    noStroke();
    fill(0, 242, 254, 150);
    textSize(10);
    textAlign(CENTER, CENTER);
    text("DOCK", pdx + cellSize, pdy + cellSize/2);

    fill(255, 0, 127, 150);
    text("DOCK", adx + cellSize, ady + cellSize/2);
}

// Draw indicators for valid moves and recommended piece
function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isDiceRolled || currentRoll <= 0) return;

    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let s = playerPieces[i];
            let cx, cy;
            
            if (s === -1) {
                // Draw circle in Starting Dock
                cx = boardLeft + 4.5 * cellSize;
                cy = boardTop + 2.5 * cellSize;
            } else {
                let cell = playerPath[s];
                cx = boardLeft + cell.x * cellSize + cellSize/2;
                cy = boardTop + cell.y * cellSize + cellSize/2;
            }

            // Green/glowing circle if it's the recommended advisory piece
            if (i === advisoryIndex) {
                stroke(0, 255, 102, 240);
                strokeWeight(2.5);
                fill(0, 255, 102, 35);
                circle(cx, cy, cellSize * 0.76);
            } else {
                stroke(0, 242, 254, 150);
                strokeWeight(1.5);
                fill(0, 242, 254, 25);
                circle(cx, cy, cellSize * 0.76);
            }
        }
    }
}

// Draw player and AI pieces on the board
function drawPieces() {
    // 1. Draw Player Pieces
    let unenteredCount = 0;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1) {
            // Draw stacked in start dock (4.5, 2.5) with tiny offset
            let cx = boardLeft + 4.5 * cellSize + unenteredCount * 5;
            let cy = boardTop + 2.5 * cellSize;
            drawPieceToken(cx, cy, 1);
            unenteredCount++;
        } else if (s >= 0 && s < 14) {
            let cell = playerPath[s];
            let cx = boardLeft + cell.x * cellSize + cellSize/2;
            let cy = boardTop + cell.y * cellSize + cellSize/2;
            drawPieceToken(cx, cy, 1);
        }
    }

    // 2. Draw AI Pieces
    let aiUnenteredCount = 0;
    for (let i = 0; i < aiPieces.length; i++) {
        let s = aiPieces[i];
        if (s === -1) {
            // Draw stacked in AI dock (4.5, 0.5) with tiny offset
            let cx = boardLeft + 4.5 * cellSize + aiUnenteredCount * 5;
            let cy = boardTop + 0.5 * cellSize;
            drawPieceToken(cx, cy, 2);
            aiUnenteredCount++;
        } else if (s >= 0 && s < 14) {
            let cell = aiPath[s];
            let cx = boardLeft + cell.x * cellSize + cellSize/2;
            let cy = boardTop + cell.y * cellSize + cellSize/2;
            drawPieceToken(cx, cy, 2);
        }
    }
}

function drawPieceToken(cx, cy, faction) {
    noStroke();
    if (faction === 1) {
        // Player (Blue glass)
        fill(0, 242, 254, 50);
        circle(cx, cy, cellSize * 0.62);
        fill(0, 242, 254, 210);
        circle(cx, cy, cellSize * 0.42);
        // Inner detail dot
        fill(255);
        circle(cx, cy, 4);
    } else {
        // AI (Red glass)
        fill(255, 0, 127, 50);
        circle(cx, cy, cellSize * 0.62);
        fill(255, 0, 127, 210);
        circle(cx, cy, cellSize * 0.42);
        // Inner detail dot
        fill(255);
        circle(cx, cy, 4);
    }
}

function triggerCaptureVisual(cx, cy, type) {
    let px = boardLeft + cx * cellSize + cellSize/2;
    let py = boardTop + cy * cellSize + cellSize/2;
    let col = color(255, 0, 127); // AI (Red)
    if (type === 1) col = color(0, 242, 254); // Player (Blue)
    if (type === 3) col = color(255, 215, 0); // Capture blast (Gold)

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
        updateHUDStatus("YOU ESCAPED ALL PIECES!");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("AI ESCAPED ALL PIECES!");
    }
}
