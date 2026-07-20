// Cyber Hounds and Jackals - sketch.js
const TRACK_LENGTH = 30; // 30 steps per side (0 to 29)

// Generate coordinates forming the classic violin/shield shape of the 58-hole board
function generateHoundsCoords(side) {
    let coords = [];
    let scaleX = 1.85;
    let scaleY = 1.08;
    
    for (let i = 0; i < TRACK_LENGTH; i++) {
        let t = i / (TRACK_LENGTH - 1);
        let y = -140 + t * 280;
        
        let w = 45;
        if (t < 0.3) {
            w = 55 - Math.sin(t * Math.PI / 0.3) * 15;
        } else if (t >= 0.3 && t < 0.6) {
            w = 32 + Math.cos((t - 0.45) * Math.PI / 0.15) * 8;
        } else {
            w = 65 - Math.sin((t - 0.6) * Math.PI / 0.4) * 20;
        }
        
        let x = side === "left" ? -w : w;
        
        if (i >= 27) {
            x = side === "left" ? -12 + (i - 27) * 4 : 12 - (i - 27) * 4;
            y = -160 - (i - 27) * 10;
        }

        coords.push({x: x * scaleX, y: y * scaleY});
    }
    return coords;
}

const leftTrack = generateHoundsCoords("left");
const rightTrack = generateHoundsCoords("right");

// Bridges and Traps definitions
const bridges = {
    6: 20,
    8: 10
};
const traps = {
    15: 9,
    25: 18
};

// Pieces: 5 pegs per player (-1: start dock, 0-28: on track, 29: exited/escaped)
let playerPieces = Array(5).fill(-1);
let aiPieces = Array(5).fill(-1);

let activePlayer = 1; // 1: Player (Hounds), 2: AI (Jackals)
let currentRoll = -1;
let isDieCast = false;
let isGameOver = false;

// Casting animation
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600;

// Visual captures / progress particles
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

    boardLeft = width / 2;
    boardTop = height / 2.3;

    // Draw grid board layout and holes
    drawHoundsBoard();

    // Draw active pieces
    drawPieces();

    // Draw animated dice roll
    updateAndDrawDie();

    // Highlight valid moves or advisor recommendations
    drawValidMovesAndAdvisory();

    // Particle visuals
    drawParticles();
}

function restartGame() {
    playerPieces = Array(5).fill(-1);
    aiPieces = Array(5).fill(-1);
    activePlayer = 1;
    currentRoll = -1;
    isDieCast = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-home-val').textContent = "0 / 5";
    document.getElementById('ai-home-val').textContent = "0 / 5";
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: CAST DIE");
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
    if (isGameOver || isRolling || isDieCast || activePlayer !== 1) return;
    
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

// Draw/animate 3D rolling neon die in HUD
function updateAndDrawDie() {
    let dx = width / 2;
    let dy = height - 40;

    if (isRolling) {
        let elapsed = millis() - rollTimer;
        if (elapsed < rollDuration) {
            currentRoll = Math.floor(random(1, 7));
            document.getElementById('roll-val').textContent = currentRoll;
        } else {
            isRolling = false;
            isDieCast = true;
            currentRoll = Math.floor(random(1, 7));
            document.getElementById('roll-val').textContent = currentRoll;
            
            handleRollComplete();
        }
    }

    // Draw glowing die face
    push();
    translate(dx, dy);
    if (isRolling) {
        rotate(frameCount * 0.25);
    }
    
    fill(10, 20, 30, 240);
    stroke(0, 242, 254, 180);
    strokeWeight(1.5);
    rect(-15, -15, 30, 30, 4);

    // Draw dots based on currentRoll
    if (currentRoll > 0 && !isRolling) {
        fill(255);
        noStroke();
        if (currentRoll === 1) circle(0, 0, 4);
        if (currentRoll === 2) { circle(-6, -6, 3); circle(6, 6, 3); }
        if (currentRoll === 3) { circle(-6, -6, 3); circle(0, 0, 3); circle(6, 6, 3); }
        if (currentRoll === 4) { circle(-6, -6, 3); circle(6, -6, 3); circle(-6, 6, 3); circle(6, 6, 3); }
        if (currentRoll === 5) { circle(-6, -6, 3); circle(6, -6, 3); circle(0, 0, 3); circle(-6, 6, 3); circle(6, 6, 3); }
        if (currentRoll === 6) { circle(-6, -6, 3); circle(6, -6, 3); circle(-6, 0, 3); circle(6, 0, 3); circle(-6, 6, 3); circle(6, 6, 3); }
    }
    pop();
}

function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;

    const pieces = player === 1 ? playerPieces : aiPieces;
    const currentStep = pieces[pieceIndex];

    if (currentStep === 29) return false; // Already escaped

    let targetStep = currentStep + roll;

    // Must land exactly on the exit node (29) or before
    if (targetStep > 29) return false;

    if (targetStep < 29) {
        // Cannot land on another peg of your own color
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i] === targetStep && i !== pieceIndex) return false;
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
    if (hasValidMoves(activePlayer, currentRoll)) {
        updateHUDStatus("YOUR TURN: SELECT PEG");
        advisoryIndex = -1;
    } else {
        updateHUDStatus("NO VALID MOVES: PASSING...");
        setTimeout(passTurn, 800);
    }
}

function passTurn() {
    if (isGameOver) return;
    
    // Standard turn swap (Hounds & Jackals has no re-rolls except house rules, let's make it standard alternating)
    isDieCast = false;
    currentRoll = -1;
    advisoryIndex = -1;

    activePlayer = activePlayer === 1 ? 2 : 1;
    if (activePlayer === 1) {
        updateHUDStatus("YOUR TURN: CAST DIE");
        enableRollButton(true);
    } else {
        updateHUDStatus("AI THINKING...");
        setTimeout(makeAIMove, 600);
    }
}

// Mouse inputs
function mousePressed() {
    if (isGameOver || activePlayer !== 1 || isRolling || !isDieCast) return;

    // Check closest node click on left track
    let bestDist = Infinity;
    let clickedNodeIndex = -1;

    for (let i = 0; i < TRACK_LENGTH; i++) {
        let node = leftTrack[i];
        let d = dist(mouseX, mouseY, boardLeft + node.x, boardTop + node.y);
        if (d < bestDist && d < 22) {
            bestDist = d;
            clickedNodeIndex = i;
        }
    }

    // Did user click starting dock area?
    let clickedDock = dist(mouseX, mouseY, boardLeft - 150, boardTop + 130) < 30;

    // Find clicked piece
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1 && clickedDock) {
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

// Move peg, handle slides and resets
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const track = player === 1 ? leftTrack : rightTrack;
    
    const oldStep = pieces[pieceIndex];
    let newStep = oldStep + roll;

    if (newStep === 29) {
        pieces[pieceIndex] = 29;
        let node = track[oldStep];
        triggerCaptureVisual(node.x, node.y, player);
    } else {
        // Resolve bridges (shortcuts)
        if (bridges[newStep] !== undefined) {
            let target = bridges[newStep];
            // Slide ahead
            pieces[pieceIndex] = target;
            let node = track[target];
            triggerCaptureVisual(node.x, node.y, 3); // Gold slide burst
        }
        // Resolve traps (resets)
        else if (traps[newStep] !== undefined) {
            let target = traps[newStep];
            // Slide back
            pieces[pieceIndex] = target;
            let node = track[target];
            triggerCaptureVisual(node.x, node.y, 3);
        } else {
            pieces[pieceIndex] = newStep;
            let node = track[newStep];
            triggerCaptureVisual(node.x, node.y, player);
        }
    }

    // Update escape scores
    let playerHome = playerPieces.filter(s => s === 29).length;
    let aiHome = aiPieces.filter(s => s === 29).length;
    document.getElementById('player-home-val').textContent = `${playerHome} / 5`;
    document.getElementById('ai-home-val').textContent = `${aiHome} / 5`;

    // Check Win
    if (playerHome === 5) {
        endSimulation(true, "VICTORY! All hounds escaped.");
        return;
    }
    if (aiHome === 5) {
        endSimulation(false, "SYSTEM FAILURE: AI jackals escaped first.");
        return;
    }

    passTurn();
}

// AI moves
function makeAIMove() {
    if (isGameOver) return;

    // Roll AI die
    currentRoll = Math.floor(random(1, 7));
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

    // Heuristics evaluations
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let s = aiPieces[index];
        let nextStep = s + currentRoll;

        // Exit
        if (nextStep === 29) score += 1000;

        // Bridge slide
        if (bridges[nextStep] !== undefined) score += 400;

        // Avoid traps
        if (traps[nextStep] !== undefined) score -= 400;

        // Advance forward
        score += nextStep * 15;
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

// Hint advisor
function calculateAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isDieCast || currentRoll <= 0) return;

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

        if (nextStep === 29) score += 1000;
        if (bridges[nextStep] !== undefined) score += 400;
        if (traps[nextStep] !== undefined) score -= 400;
        score += nextStep * 15;
        if (s === -1) score += 50;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Draw symmetric violin boards and holes
function drawHoundsBoard() {
    // 1. Draw violin profile backplate with semi-transparent fill
    fill(8, 16, 26, 210);
    stroke(0, 242, 254, 30);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < TRACK_LENGTH; i++) {
        vertex(boardLeft + leftTrack[i].x, boardTop + leftTrack[i].y);
    }
    for (let i = TRACK_LENGTH - 1; i >= 0; i--) {
        vertex(boardLeft + rightTrack[i].x, boardTop + rightTrack[i].y);
    }
    endShape(CLOSE);
    
    // 2. Draw outer glowing neon border loops
    noFill();
    for (let w = 12; w > 2; w -= 4) {
        let alpha = map(w, 12, 2, 5, 25);
        stroke(0, 242, 254, alpha);
        strokeWeight(w);
        beginShape();
        for (let i = 0; i < TRACK_LENGTH; i++) {
            vertex(boardLeft + leftTrack[i].x, boardTop + leftTrack[i].y);
        }
        for (let i = TRACK_LENGTH - 1; i >= 0; i--) {
            vertex(boardLeft + rightTrack[i].x, boardTop + rightTrack[i].y);
        }
        endShape(CLOSE);
    }

    // 3. Draw animated glowing gold bridge lines (shortcuts)
    for (let start in bridges) {
        let end = bridges[start];
        let lNodeS = leftTrack[start];
        let lNodeE = leftTrack[end];
        let rNodeS = rightTrack[start];
        let rNodeE = rightTrack[end];

        // Background glow
        stroke(255, 215, 0, 30);
        strokeWeight(5);
        line(boardLeft + lNodeS.x, boardTop + lNodeS.y, boardLeft + lNodeE.x, boardTop + lNodeE.y);
        line(boardLeft + rNodeS.x, boardTop + rNodeS.y, boardLeft + rNodeE.x, boardTop + rNodeE.y);

        // Core line
        stroke(255, 215, 0, 160);
        strokeWeight(1.5);
        line(boardLeft + lNodeS.x, boardTop + lNodeS.y, boardLeft + lNodeE.x, boardTop + lNodeE.y);
        line(boardLeft + rNodeS.x, boardTop + rNodeS.y, boardLeft + rNodeE.x, boardTop + rNodeE.y);
        
        // Flowing light dot representing shortcut flow
        let t = (frameCount * 0.02) % 1.0;
        let lx = lerp(lNodeS.x, lNodeE.x, t);
        let ly = lerp(lNodeS.y, lNodeE.y, t);
        let rx = lerp(rNodeS.x, rNodeE.x, t);
        let ry = lerp(rNodeS.y, rNodeE.y, t);
        
        fill(255, 215, 0, 240);
        noStroke();
        circle(boardLeft + lx, boardTop + ly, 4);
        circle(boardLeft + rx, boardTop + ry, 4);
    }

    // 4. Draw pulsing traps lines (resets)
    for (let start in traps) {
        let end = traps[start];
        let lNodeS = leftTrack[start];
        let lNodeE = leftTrack[end];
        let rNodeS = rightTrack[start];
        let rNodeE = rightTrack[end];

        let pulseAlpha = 60 + Math.sin(frameCount * 0.12) * 30;
        stroke(255, 0, 127, pulseAlpha);
        strokeWeight(1.5);
        line(boardLeft + lNodeS.x, boardTop + lNodeS.y, boardLeft + lNodeE.x, boardTop + lNodeE.y);
        line(boardLeft + rNodeS.x, boardTop + rNodeS.y, boardLeft + rNodeE.x, boardTop + rNodeE.y);
    }

    // 5. Draw left holes
    for (let i = 0; i < TRACK_LENGTH; i++) {
        let node = leftTrack[i];
        let px = boardLeft + node.x;
        let py = boardTop + node.y;
        let d = i === 29 ? 24 : 18;
        
        fill(6, 12, 22, 230);
        stroke(255, 255, 255, 25);
        strokeWeight(1.5);

        if (bridges[i] !== undefined) {
            stroke(0, 255, 102, 200); // Green bridge entry
        } else if (traps[i] !== undefined) {
            stroke(255, 0, 127, 200); // Pink trap entry
        }

        circle(px, py, d);

        // Draw inner socket detail
        if (bridges[i] !== undefined) {
            fill(0, 255, 102, 100);
            circle(px, py, 6);
        } else if (traps[i] !== undefined) {
            fill(255, 0, 127, 100);
            circle(px, py, 6);
        } else {
            fill(0, 242, 254, 25);
            circle(px, py, d - 8);
        }
    }

    // 6. Draw right holes
    for (let i = 0; i < TRACK_LENGTH; i++) {
        let node = rightTrack[i];
        let px = boardLeft + node.x;
        let py = boardTop + node.y;
        let d = i === 29 ? 24 : 18;

        fill(6, 12, 22, 230);
        stroke(255, 255, 255, 25);
        strokeWeight(1.5);

        if (bridges[i] !== undefined) {
            stroke(0, 255, 102, 200);
        } else if (traps[i] !== undefined) {
            stroke(255, 0, 127, 200);
        }

        circle(px, py, d);

        // Draw inner socket detail
        if (bridges[i] !== undefined) {
            fill(0, 255, 102, 100);
            circle(px, py, 6);
        } else if (traps[i] !== undefined) {
            fill(255, 0, 127, 100);
            circle(px, py, 6);
        } else {
            fill(0, 242, 254, 25);
            circle(px, py, d - 8);
        }
    }

    // 7. Draw starting docks
    // Left side start dock (Hounds)
    fill(10, 22, 35, 185);
    stroke(0, 242, 254, 150);
    strokeWeight(1.5);
    rect(boardLeft - 170, boardTop + 115, 40, 30, 6);
    // cross hairs details
    stroke(0, 242, 254, 50);
    line(boardLeft - 150, boardTop + 115, boardLeft - 150, boardTop + 145);
    
    // Right side start dock (Jackals)
    fill(10, 22, 35, 185);
    stroke(255, 0, 127, 150);
    strokeWeight(1.5);
    rect(boardLeft + 130, boardTop + 115, 40, 30, 6);
    // cross hairs details
    stroke(255, 0, 127, 50);
    line(boardLeft + 150, boardTop + 115, boardLeft + 150, boardTop + 145);
}

// Highlight valid targets or advisor recommendations
function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isDieCast || currentRoll <= 0) return;

    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let s = playerPieces[i];
            let cx, cy;

            if (s === -1) {
                cx = boardLeft - 150;
                cy = boardTop + 130;
            } else {
                let node = leftTrack[s];
                cx = boardLeft + node.x;
                cy = boardTop + node.y;
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
            circle(cx, cy, 26);
        }
    }
}

// Draw player Hounds (Blue) and AI Jackals (Red)
function drawPieces() {
    // 1. Draw Hounds (Player)
    let unenteredCount = 0;
    for (let i = 0; i < playerPieces.length; i++) {
        let s = playerPieces[i];
        if (s === -1) {
            // Draw inside start dock
            let cx = boardLeft - 150 + (unenteredCount - 2) * 5;
            let cy = boardTop + 130;
            drawPieceToken(cx, cy, 1);
            unenteredCount++;
        } else if (s >= 0 && s < 29) {
            let node = leftTrack[s];
            drawPieceToken(boardLeft + node.x, boardTop + node.y, 1);
        }
    }

    // 2. Draw Jackals (AI)
    let aiUnenteredCount = 0;
    for (let i = 0; i < aiPieces.length; i++) {
        let s = aiPieces[i];
        if (s === -1) {
            // Draw inside start dock
            let cx = boardLeft + 150 + (aiUnenteredCount - 2) * 5;
            let cy = boardTop + 130;
            drawPieceToken(cx, cy, 2);
            aiUnenteredCount++;
        } else if (s >= 0 && s < 29) {
            let node = rightTrack[s];
            drawPieceToken(boardLeft + node.x, boardTop + node.y, 2);
        }
    }
}

function drawPieceToken(cx, cy, faction) {
    noStroke();
    if (faction === 1) {
        // Player Hound (Cyan peg)
        fill(0, 242, 254, 60);
        circle(cx, cy, 18);
        fill(0, 242, 254, 220);
        circle(cx, cy, 10);
    } else {
        // AI Jackal (Red/Magenta peg with inner cross)
        fill(255, 0, 127, 60);
        circle(cx, cy, 18);
        fill(255, 0, 127, 220);
        circle(cx, cy, 10);
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
