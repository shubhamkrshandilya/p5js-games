// Cyber Patolli - sketch.js
const PATH_LENGTH = 52;

// Generate coordinates for the 52 cells forming the X-shaped cross board
function generatePatolliCoords() {
    let coords = [];
    
    // Each of the 4 arms has 12 squares (2 rows of 6), plus central squares linking them.
    // Let's model the path by drawing coordinates on the 4 diagonal arms of the board.
    // Center at (0, 0)
    // Arm directions: Top-Left, Top-Right, Bottom-Right, Bottom-Left
    
    // We can define the path sequence of (x, y) relative offsets manually to form a perfect X shape
    // Top-Left Arm Outward (6 cells)
    for (let i = 1; i <= 6; i++) coords.push({x: -i, y: -i * 0.4});
    // Top-Left Arm Return (6 cells)
    for (let i = 6; i >= 1; i--) coords.push({x: -i + 0.5, y: -i * 0.4 - 0.5});

    // Top-Right Arm Outward (6 cells)
    for (let i = 1; i <= 6; i++) coords.push({x: i, y: -i * 0.4});
    // Top-Right Arm Return (6 cells)
    for (let i = 6; i >= 1; i--) coords.push({x: i - 0.5, y: -i * 0.4 - 0.5});

    // Bottom-Right Arm Outward (6 cells)
    for (let i = 1; i <= 6; i++) coords.push({x: i, y: i * 0.4});
    // Bottom-Right Arm Return (6 cells)
    for (let i = 6; i >= 1; i--) coords.push({x: i - 0.5, y: i * 0.4 + 0.5});

    // Bottom-Left Arm Outward (6 cells)
    for (let i = 1; i <= 6; i++) coords.push({x: -i, y: i * 0.4});
    // Bottom-Left Arm Return (6 cells)
    for (let i = 6; i >= 1; i--) coords.push({x: -i + 0.5, y: i * 0.4 + 0.5});

    // Ensure we fill up to 52 steps by adding central connecting cells
    while (coords.length < PATH_LENGTH) {
        coords.push({x: 0, y: 0});
    }

    return coords;
}

const trackCoords = generatePatolliCoords();

// Key hazard and safe indexes (0-indexed)
// Terminal ends of arms are safe spaces: step 5, 11, 17, 23, 29, 35, 41, 47
const safeSteps = [5, 11, 17, 23, 29, 35, 41, 47];
// Central cells are hazard cells
const hazardSteps = [0, 1, 12, 13, 24, 25, 36, 37];

// Pieces (6 pieces per player, -1: start/dock, 0-51: track, 52: escaped)
let playerPieces = Array(6).fill(-1);
let aiPieces = Array(6).fill(-1);

let activePlayer = 1; // 1: Player (Blue), 2: AI (Red)
let currentRoll = -1;
let beansCast = [0, 0, 0, 0, 0]; // 5 beans
let isBeansCast = false;
let isGameOver = false;

// Roll animation states
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600;

// Visual particles for progress/captures
let particles = [];
let advisoryIndex = -1;

// Rendering sizes
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

    boardWidth = Math.min(width, height) * 0.9;
    boardLeft = width / 2;
    boardTop = height / 2.3;

    // Draw grid board layout
    drawPatolliBoard();

    // Draw animated bean casts
    updateAndDrawBeans();

    // Draw active pieces
    drawPieces();

    // Highlight valid moves or advisor recommendations
    drawValidMovesAndAdvisory();

    // Particle visuals
    drawParticles();
}

function restartGame() {
    playerPieces = Array(6).fill(-1);
    aiPieces = Array(6).fill(-1);
    activePlayer = 1;
    currentRoll = -1;
    beansCast = [0, 0, 0, 0, 0];
    isBeansCast = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-home-val').textContent = "0 / 6";
    document.getElementById('ai-home-val').textContent = "0 / 6";
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: CAST BEANS");
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
    if (isGameOver || isRolling || isBeansCast || activePlayer !== 1) return;
    
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

// Draw/animate 5 black beans with white dots in HUD
function updateAndDrawBeans() {
    let dx = width / 2;
    let dy = height - 40;

    if (isRolling) {
        let elapsed = millis() - rollTimer;
        if (elapsed < rollDuration) {
            for (let i = 0; i < 5; i++) {
                beansCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            let tempSum = getBeansScore(beansCast);
            document.getElementById('roll-val').textContent = tempSum;
        } else {
            isRolling = false;
            isBeansCast = true;
            for (let i = 0; i < 5; i++) {
                beansCast[i] = Math.random() < 0.5 ? 0 : 1;
            }
            currentRoll = getBeansScore(beansCast);
            document.getElementById('roll-val').textContent = currentRoll;
            
            handleRollComplete();
        }
    }

    // Render 5 bean shapes
    let beanW = 10;
    let beanH = 22;
    let gap = 16;
    let startX = dx - (beanW * 2.5 + gap * 2);

    for (let i = 0; i < 5; i++) {
        let dotUp = beansCast[i] === 1;
        let px = startX + i * gap;
        
        push();
        translate(px, dy);
        if (isRolling) {
            rotate(frameCount * 0.22);
        }
        
        noStroke();
        // Base dark bean body
        fill(12, 16, 22, 240);
        stroke(255, 255, 255, 20);
        strokeWeight(1);
        ellipse(0, 0, beanW, beanH);

        if (dotUp) {
            // White neon dot mark
            noStroke();
            fill(255);
            circle(0, 0, 4);
            stroke(0, 242, 254, 150);
            strokeWeight(1);
            noFill();
            circle(0, 0, 6);
        }
        pop();
    }
}

// Sum bean marks (0-5)
function getBeansScore(beans) {
    return beans.reduce((a, b) => a + b, 0);
}

function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;

    const pieces = player === 1 ? playerPieces : aiPieces;
    const currentStep = pieces[pieceIndex];

    if (currentStep === 52) return false; // Already escaped

    let targetStep = currentStep + roll;

    // Escapes exactly at 52 or past
    if (targetStep > 52) return false;

    if (targetStep < 52) {
        // Cannot land on another piece of your own color
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i] === targetStep && i !== pieceIndex) return false;
        }

        // Cannot land on opponent if it's a safe step
        const opponentPieces = player === 1 ? aiPieces : playerPieces;
        let containsOpponent = opponentPieces.includes(targetStep);
        let isSafe = safeSteps.includes(targetStep);
        if (containsOpponent && isSafe) {
            return false; // Safe harbor cell blocks capture/overlap
        }
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
    if (currentRoll === 0) {
        updateHUDStatus("ROLLED 0: PASSING TURN");
        setTimeout(passTurn, 800);
    } else if (hasValidMoves(activePlayer, currentRoll)) {
        updateHUDStatus("YOUR TURN: SELECT PIECE");
        advisoryIndex = -1;
    } else {
        updateHUDStatus("NO VALID MOVES: PASSING...");
        setTimeout(passTurn, 800);
    }
}

function passTurn() {
    if (isGameOver) return;
    
    // In Patolli, a roll of 5 grants an extra turn
    let isExtra = (currentRoll === 5);
    isBeansCast = false;
    currentRoll = -1;
    advisoryIndex = -1;

    if (isExtra) {
        if (activePlayer === 1) {
            updateHUDStatus("ROLLED 5! EXTRA TURN: CAST BEANS");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI ROLLED 5! RE-CASTING...");
            setTimeout(makeAIMove, 600);
        }
    } else {
        activePlayer = activePlayer === 1 ? 2 : 1;
        if (activePlayer === 1) {
            updateHUDStatus("YOUR TURN: CAST BEANS");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI THINKING...");
            setTimeout(makeAIMove, 600);
        }
    }
}

// Mouse inputs
function mousePressed() {
    if (isGameOver || activePlayer !== 1 || isRolling || !isBeansCast) return;

    // Check closest node click
    let bestDist = Infinity;
    let clickedNodeIndex = -1;

    for (let i = 0; i < PATH_LENGTH; i++) {
        let node = trackCoords[i];
        let d = dist(mouseX, mouseY, boardLeft + node.x * (boardWidth * 0.4), boardTop + node.y * (boardWidth * 0.4));
        if (d < bestDist && d < 22) {
            bestDist = d;
            clickedNodeIndex = i;
        }
    }

    // Did user click starting dock area at center?
    let clickedStart = dist(mouseX, mouseY, boardLeft, boardTop) < 26;

    // Find clicked piece
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1 && clickedStart) {
            selectedPieceIndex = i;
            break;
        }
        if (s === clickedNodeIndex && s >= 0) {
            selectedPieceIndex = i;
            break;
        }
    }

    if (selectedPieceIndex !== -1) {
        if (isValidMove(1, selectedPieceIndex, currentRoll)) {
            movePiece(1, selectedPieceIndex, currentRoll);
        }
    }
}

// Move piece, resolve hazard/safe rules, captures
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const oldStep = pieces[pieceIndex];
    const newStep = oldStep + roll;

    pieces[pieceIndex] = newStep;

    if (newStep === 52) {
        // Escaped center!
        let node = trackCoords[oldStep];
        triggerCaptureVisual(node.x * (boardWidth * 0.4), node.y * (boardWidth * 0.4), player);
    } else {
        let node = trackCoords[newStep];
        triggerCaptureVisual(node.x * (boardWidth * 0.4), node.y * (boardWidth * 0.4), player);

        // Capture check (only allowed on NON-SAFE steps)
        let isSafe = safeSteps.includes(newStep);
        if (!isSafe) {
            const opponentPieces = player === 1 ? aiPieces : playerPieces;
            for (let i = 0; i < opponentPieces.length; i++) {
                if (opponentPieces[i] === newStep) {
                    // Capture! Send back to start (-1)
                    opponentPieces[i] = -1;
                    triggerCaptureVisual(node.x * (boardWidth * 0.4), node.y * (boardWidth * 0.4), 3); // Gold blast
                }
            }
        }
    }

    // Update escaped metrics
    let playerHome = playerPieces.filter(s => s === 52).length;
    let aiHome = aiPieces.filter(s => s === 52).length;
    document.getElementById('player-home-val').textContent = `${playerHome} / 6`;
    document.getElementById('ai-home-val').textContent = `${aiHome} / 6`;

    // Check Win
    if (playerHome === 6) {
        endSimulation(true, "VICTORY! All pieces safely escaped.");
        return;
    }
    if (aiHome === 6) {
        endSimulation(false, "SYSTEM OVERLOAD: AI escaped all pieces first.");
        return;
    }

    passTurn();
}

// AI moves
function makeAIMove() {
    if (isGameOver) return;

    // Roll AI beans
    beansCast = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
        beansCast[i] = Math.random() < 0.5 ? 0 : 1;
    }
    currentRoll = getBeansScore(beansCast);
    document.getElementById('roll-val').textContent = currentRoll;

    if (currentRoll === 0) {
        updateHUDStatus("AI ROLLED 0: PASSING TURN");
        setTimeout(passTurn, 800);
        return;
    }

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

    // Heuristics evaluations
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let s = aiPieces[index];
        let nextStep = s + currentRoll;

        // Escape goal
        if (nextStep === 52) score += 1000;

        // Capture opportunities
        if (nextStep < 52) {
            let containsOpponent = playerPieces.includes(nextStep);
            let isSafe = safeSteps.includes(nextStep);
            if (containsOpponent && !isSafe) {
                score += 500;
            }
        }

        // Safe landing zones
        if (safeSteps.includes(nextStep)) score += 200;

        // Avoid hazard zones
        if (hazardSteps.includes(nextStep)) score -= 150;

        // Advance forward
        score += nextStep * 10;
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

// Hint advisor
function calculateAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isBeansCast || currentRoll <= 0) return;

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

        if (nextStep === 52) score += 1000;
        if (nextStep < 52) {
            let containsOpponent = aiPieces.includes(nextStep);
            let isSafe = safeSteps.includes(nextStep);
            if (containsOpponent && !isSafe) score += 500;
        }
        if (safeSteps.includes(nextStep)) score += 200;
        if (hazardSteps.includes(nextStep)) score -= 150;
        score += nextStep * 10;
        if (s === -1) score += 50;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Draw X-shape cross grid
function drawPatolliBoard() {
    let scale = boardWidth * 0.4;
    stroke(255, 255, 255, 12);
    strokeWeight(1.5);
    
    // Draw continuous board connection outline lines
    for (let i = 0; i < PATH_LENGTH; i++) {
        let node = trackCoords[i];
        let px = boardLeft + node.x * scale;
        let py = boardTop + node.y * scale;

        // Base cell filling
        fill(10, 20, 30, 160);
        stroke(255, 255, 255, 15);
        
        let isSafe = safeSteps.includes(i);
        let isHazard = hazardSteps.includes(i);
        
        if (isSafe) {
            stroke(0, 255, 102, 120); // Glowing green safe terminal borders
            fill(0, 255, 102, 10);
            rect(px - 9, py - 9, 18, 18, 4);
            // safe cross
            stroke(0, 255, 102, 140);
            line(px - 5, py - 5, px + 5, py + 5);
            line(px + 5, py - 5, px - 5, py + 5);
        } else if (isHazard) {
            stroke(255, 0, 127, 120); // Neon pink warning colors
            fill(255, 0, 127, 10);
            rect(px - 9, py - 9, 18, 18, 4);
        } else {
            rect(px - 9, py - 9, 18, 18, 4);
        }
    }

    // Draw central hub
    stroke(0, 242, 254, 120);
    fill(10, 20, 30, 200);
    ellipse(boardLeft, boardTop, 28, 28);
}

// Highlight valid targets or advisors
function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isBeansCast || currentRoll <= 0) return;

    let scale = boardWidth * 0.4;
    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let s = playerPieces[i];
            let cx, cy;
            
            if (s === -1) {
                cx = boardLeft;
                cy = boardTop;
            } else {
                let node = trackCoords[s];
                cx = boardLeft + node.x * scale;
                cy = boardTop + node.y * scale;
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
            circle(cx, cy, 22);
        }
    }
}

// Draw player/AI tokens on cells
function drawPieces() {
    let scale = boardWidth * 0.4;
    
    // Draw Player Pieces
    let unenteredCount = 0;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1) {
            // Draw inside central hub with offset
            let cx = boardLeft + (unenteredCount - 2.5) * 4;
            let cy = boardTop - 4;
            drawPieceToken(cx, cy, 1);
            unenteredCount++;
        } else if (s >= 0 && s < 52) {
            let node = trackCoords[s];
            drawPieceToken(boardLeft + node.x * scale, boardTop + node.y * scale, 1);
        }
    }

    // Draw AI Pieces
    let aiUnenteredCount = 0;
    for (let i = 0; i < aiPieces.length; i++) {
        let s = aiPieces[i];
        if (s === -1) {
            // Draw inside central hub with offset
            let cx = boardLeft + (aiUnenteredCount - 2.5) * 4;
            let cy = boardTop + 4;
            drawPieceToken(cx, cy, 2);
            aiUnenteredCount++;
        } else if (s >= 0 && s < 52) {
            let node = trackCoords[s];
            drawPieceToken(boardLeft + node.x * scale, boardTop + node.y * scale, 2);
        }
    }
}

function drawPieceToken(cx, cy, faction) {
    noStroke();
    if (faction === 1) {
        // Player (Blue glass sphere)
        fill(0, 242, 254, 60);
        circle(cx, cy, 14);
        fill(0, 242, 254, 220);
        circle(cx, cy, 8);
    } else {
        // AI (Red glass sphere)
        fill(255, 0, 127, 60);
        circle(cx, cy, 14);
        fill(255, 0, 127, 220);
        circle(cx, cy, 8);
    }
}

function triggerCaptureVisual(x, y, type) {
    let px = boardLeft + x;
    let py = boardTop + y;
    let col = color(255, 0, 127);
    if (type === 1) col = color(0, 242, 254);
    if (type === 3) col = color(255, 215, 0);

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
        updateHUDStatus("VICTORY ACHIEVED!");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("SYSTEM BLOCKED!");
    }
}
