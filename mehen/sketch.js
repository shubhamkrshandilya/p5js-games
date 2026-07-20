// Cyber Mehen - sketch.js
const PATH_LENGTH = 40;

// Generate spiral snake coordinates using equidistant square-root spacing
function generateSnakeCoords() {
    let coords = [];
    for (let i = 0; i < PATH_LENGTH; i++) {
        // fraction goes from 1.0 (at i = 0, tail) to 0.0 (at i = 39, head)
        let fraction = (PATH_LENGTH - 1 - i) / (PATH_LENGTH - 1);
        let t = 4.5 * Math.PI * Math.sqrt(fraction);
        let r = 160 * Math.sqrt(fraction) + 26;
        
        let x = Math.cos(t) * r;
        let y = Math.sin(t) * r;
        coords.push({x: x, y: y});
    }
    return coords;
}

const trackCoords = generateSnakeCoords();

// Pieces configuration:
// Each player has 3 pieces.
// State:
// - step: -1 (start), 0 to 39 (on track), 40 (escaped/finished)
// - isLion: boolean (turned to true when reaching 39, travels backward)
let playerPieces = [
    {step: -1, isLion: false},
    {step: -1, isLion: false},
    {step: -1, isLion: false}
];

let aiPieces = [
    {step: -1, isLion: false},
    {step: -1, isLion: false},
    {step: -1, isLion: false}
];

let activePlayer = 1; // 1: Player (Blue), 2: AI (Magenta)
let currentRoll = -1;
let sticksCast = [0, 0, 0, 0];
let isSticksCast = false;
let isGameOver = false;

// Roll animation states
let isRolling = false;
let rollTimer = 0;
let rollDuration = 600;

// Visual burst particles
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

    boardWidth = Math.min(width, height) * 0.88;
    boardLeft = width / 2;
    boardTop = height / 2.3;

    // Draw the coiled neon snake spiral
    drawSnakeTrack();

    // Draw stick rollers
    updateAndDrawSticks();

    // Draw active pieces
    drawPieces();

    // Highlight valid moves or advisor hints
    drawValidMovesAndAdvisory();

    // Visual capture explosions
    drawParticles();
}

function restartGame() {
    playerPieces = [
        {step: -1, isLion: false},
        {step: -1, isLion: false},
        {step: -1, isLion: false}
    ];
    aiPieces = [
        {step: -1, isLion: false},
        {step: -1, isLion: false},
        {step: -1, isLion: false}
    ];
    activePlayer = 1;
    currentRoll = -1;
    sticksCast = [0, 0, 0, 0];
    isSticksCast = false;
    isGameOver = false;
    isRolling = false;
    particles = [];
    advisoryIndex = -1;

    document.getElementById('game-over-screen').style.display = 'none';
    updateHUDMetrics();
    document.getElementById('roll-val').textContent = "--";
    enableRollButton(true);
    updateHUDStatus("YOUR TURN: CAST STICKS");
}

function updateHUDMetrics() {
    let pActive = playerPieces.filter(p => p.step >= 0 && p.step < 40 && !p.isLion).length;
    let pLions = playerPieces.filter(p => p.isLion && p.step >= 0).length;
    let aActive = aiPieces.filter(p => p.step >= 0 && p.step < 40 && !p.isLion).length;
    let aLions = aiPieces.filter(p => p.isLion && p.step >= 0).length;

    document.getElementById('player-active-val').textContent = pActive;
    document.getElementById('player-lions-val').textContent = pLions;
    document.getElementById('ai-active-val').textContent = aActive;
    document.getElementById('ai-lions-val').textContent = aLions;
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
    if (isGameOver || isRolling || isSticksCast || activePlayer !== 1) return;
    isRolling = true;
    rollTimer = millis();
    enableRollButton(false);
}

function updateAndDrawSticks() {
    let dx = width / 2;
    let dy = height - 40; // Render below board

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

    // Render sticks
    let sW = 8;
    let sH = 36;
    let gap = 16;
    let startX = dx - (sW * 2 + gap * 1.5);

    for (let i = 0; i < 4; i++) {
        let flatUp = sticksCast[i] === 1;
        let px = startX + i * gap;
        
        push();
        translate(px, dy);
        if (isRolling) rotate(frameCount * 0.2);
        
        noStroke();
        if (flatUp) {
            fill(0, 242, 254, 210);
            rect(-sW/2, -sH/2, sW, sH, 3);
            stroke(255, 120);
            line(0, -sH/2 + 2, 0, sH/2 - 2);
        } else {
            fill(10, 20, 30, 240);
            stroke(255, 255, 255, 30);
            rect(-sW/2, -sH/2, sW, sH, 3);
        }
        pop();
    }
}

function getCastingScore(sticks) {
    let flats = sticks.reduce((a, b) => a + b, 0);
    return flats === 0 ? 5 : flats;
}

// Check move validity
function isValidMove(player, pieceIndex, roll) {
    if (roll <= 0) return false;

    const pieces = player === 1 ? playerPieces : aiPieces;
    const piece = pieces[pieceIndex];

    if (piece.step === 40) return false; // Already escaped

    if (!piece.isLion) {
        // Normal piece: moves FORWARD towards center (39)
        let nextStep = piece.step + roll;
        if (nextStep > 39) return false; // Must land exactly on head (39) to transform
        
        // Cannot land on another of your own pieces
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].step === nextStep && i !== pieceIndex) return false;
        }
        return true;
    } else {
        // Lion piece: moves BACKWARD towards tail (0)
        let nextStep = piece.step - roll;
        
        // Exits/escapes when moving past tail (< 0)
        if (nextStep < -1) return false; // Safe exit exactly at -1 or less
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

function passTurn() {
    if (isGameOver) return;
    
    let isExtra = (currentRoll === 1 || currentRoll === 4 || currentRoll === 5);
    isSticksCast = false;
    currentRoll = -1;
    advisoryIndex = -1;

    if (isExtra) {
        if (activePlayer === 1) {
            updateHUDStatus("EXTRA TURN! CAST STICKS");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI EXTRA TURN: CASTING...");
            setTimeout(makeAIMove, 600);
        }
    } else {
        activePlayer = activePlayer === 1 ? 2 : 1;
        if (activePlayer === 1) {
            updateHUDStatus("YOUR TURN: CAST STICKS");
            enableRollButton(true);
        } else {
            updateHUDStatus("AI THINKING...");
            setTimeout(makeAIMove, 600);
        }
    }
}

// Mouse inputs
function mousePressed() {
    if (isGameOver || activePlayer !== 1 || isRolling || !isSticksCast) return;

    // Find closest node to click
    let bestDist = Infinity;
    let clickedNodeIndex = -1;

    for (let i = 0; i < PATH_LENGTH; i++) {
        let node = trackCoords[i];
        let d = dist(mouseX, mouseY, boardLeft + node.x, boardTop + node.y);
        if (d < bestDist && d < 24) {
            bestDist = d;
            clickedNodeIndex = i;
        }
    }

    // Did user click starting tail area?
    let clickedStartLeg = dist(mouseX, mouseY, boardLeft + trackCoords[0].x - 30, boardTop + trackCoords[0].y + 10) < 25;

    // Find clicked piece
    let selectedPieceIndex = -1;
    for (let i = 0; i < playerPieces.length; i++) {
        let p = playerPieces[i];
        if (p.step === -1 && clickedStartLeg) {
            selectedPieceIndex = i;
            break;
        }
        if (p.step === clickedNodeIndex && p.step >= 0) {
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

// Move piece, handle Lion hunts, capture overlaps
function movePiece(player, pieceIndex, roll) {
    const pieces = player === 1 ? playerPieces : aiPieces;
    const opponentPieces = player === 1 ? aiPieces : playerPieces;
    
    const p = pieces[pieceIndex];
    const oldStep = p.step;
    
    let newStep;
    if (!p.isLion) {
        newStep = oldStep + roll;
        p.step = newStep;
        
        // Gold explosion animation on path progress
        let node = trackCoords[newStep];
        triggerCaptureVisual(node.x, node.y, player);

        // Turn to Lion at center
        if (newStep === 39) {
            p.isLion = true;
            triggerCaptureVisual(node.x, node.y, 3); // Royal Gold transformation burst
        }
    } else {
        newStep = oldStep - roll;
        
        if (newStep <= -1) {
            // Escapes/finished off board!
            p.step = 40;
            let node = trackCoords[0];
            triggerCaptureVisual(node.x, node.y, player);
        } else {
            p.step = newStep;
            let node = trackCoords[newStep];
            triggerCaptureVisual(node.x, node.y, player);

            // Hunter Lion Captures: Landed on or passed over any opponent normal pieces
            // A Lion eats normal opponent pegs in its path between oldStep and newStep
            for (let i = 0; i < opponentPieces.length; i++) {
                let op = opponentPieces[i];
                if (!op.isLion && op.step >= newStep && op.step <= oldStep) {
                    // Capture! Remove permanently (move to step 40 but not as a finished/escaped piece)
                    op.step = -2; // Captured/eliminated state
                    let capNode = trackCoords[op.step === -2 ? 0 : op.step]; // Visual at tail
                    triggerCaptureVisual(capNode.x, capNode.y, 3); // Gold capture burst
                }
            }
        }
    }

    updateHUDMetrics();

    // Check game termination:
    // A player wins if they have successfully escaped all surviving pieces/Lions,
    // or if the opponent has no active pieces left on the track
    let pSurviving = playerPieces.filter(p => p.step >= -1 && p.step < 40).length;
    let aSurviving = aiPieces.filter(p => p.step >= -1 && p.step < 40).length;

    if (pSurviving === 0) {
        endSimulation(false, "SYSTEM FAILURE: All your pieces captured!");
        return;
    }
    if (aSurviving === 0) {
        endSimulation(true, "VICTORY! All AI pieces captured.");
        return;
    }

    // Check if player has escaped all pieces successfully
    let pEscaped = playerPieces.filter(p => p.step === 40).length;
    let aEscaped = aiPieces.filter(p => p.step === 40).length;

    if (pEscaped === playerPieces.length) {
        endSimulation(true, "VICTORY! All pieces escaped.");
        return;
    }
    if (aEscaped === aiPieces.length) {
        endSimulation(false, "SYSTEM FAILURE: AI escaped all pieces first.");
        return;
    }

    passTurn();
}

// AI moves
function makeAIMove() {
    if (isGameOver) return;

    // Cast AI sticks
    sticksCast = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        sticksCast[i] = Math.random() < 0.5 ? 0 : 1;
    }
    currentRoll = getCastingScore(sticksCast);
    document.getElementById('roll-val').textContent = currentRoll;

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

    // Evaluate heuristics
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index of validIndices) {
        let score = 0;
        let p = aiPieces[index];
        let s = p.step;

        if (!p.isLion) {
            let nextStep = s + currentRoll;
            if (nextStep === 39) score += 800; // Transform to Lion!
            score += nextStep * 10;            // Advance forward
        } else {
            let nextStep = s - currentRoll;
            if (nextStep <= -1) score += 600;  // Escape Lion

            // Target overlaps: count players in path of reverse movement
            for (let op of playerPieces) {
                if (!op.isLion && op.step >= nextStep && op.step <= s) {
                    score += 400; // Capture player piece!
                }
            }
            score += (40 - nextStep) * 15; // Move closer to tail to escape
        }

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
        let p = playerPieces[index];
        let s = p.step;

        if (!p.isLion) {
            let nextStep = s + currentRoll;
            if (nextStep === 39) score += 800;
            score += nextStep * 10;
        } else {
            let nextStep = s - currentRoll;
            if (nextStep <= -1) score += 600;
            for (let op of aiPieces) {
                if (!op.isLion && op.step >= nextStep && op.step <= s) {
                    score += 400;
                }
            }
            score += (40 - nextStep) * 15;
        }

        if (s === -1) score += 50;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    advisoryIndex = bestIndex;
}

// Draw spiral path
function drawSnakeTrack() {
    // 1. Draw glowing background path (neon glow shadow)
    noFill();
    for (let weight = 24; weight > 4; weight -= 4) {
        let alpha = map(weight, 24, 4, 5, 20);
        stroke(0, 255, 102, alpha);
        strokeWeight(weight);
        beginShape();
        for (let i = 0; i < PATH_LENGTH; i++) {
            vertex(boardLeft + trackCoords[i].x, boardTop + trackCoords[i].y);
        }
        endShape();
    }

    // 2. Draw thin bright center line linking segments
    stroke(0, 255, 102, 160);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < PATH_LENGTH; i++) {
        vertex(boardLeft + trackCoords[i].x, boardTop + trackCoords[i].y);
    }
    endShape();

    // 3. Draw individual nodes/cells (Snake scales)
    for (let i = 0; i < PATH_LENGTH; i++) {
        let node = trackCoords[i];
        let px = boardLeft + node.x;
        let py = boardTop + node.y;

        // Taper node sizes from tail (size 26) to head (size 18)
        let nodeSize = map(i, 0, PATH_LENGTH - 1, 26, 18);

        // Cell background
        fill(6, 12, 18, 240);
        stroke(0, 255, 102, i === 39 ? 240 : 80);
        strokeWeight(i === 39 ? 2.5 : 1.5);
        circle(px, py, nodeSize);

        // Minor scale segments details
        if (i < 39) {
            stroke(0, 255, 102, 40);
            strokeWeight(1);
            let nextNode = trackCoords[i+1];
            let angle = atan2(nextNode.y - node.y, nextNode.x - node.x);
            // Draw scale separator perpendicular lines
            line(
                px + cos(angle + HALF_PI) * (nodeSize/2 - 2), 
                py + sin(angle + HALF_PI) * (nodeSize/2 - 2), 
                px + cos(angle - HALF_PI) * (nodeSize/2 - 2), 
                py + sin(angle - HALF_PI) * (nodeSize/2 - 2)
            );
        }
    }

    // 4. Draw detailed neon snake head at center (step 39)
    let head = trackCoords[39];
    let hx = boardLeft + head.x;
    let hy = boardTop + head.y;
    
    // Draw glowing eyes on the head
    noStroke();
    fill(255, 215, 0, 230); // Gold eyes
    circle(hx - 4, hy - 3, 4);
    circle(hx + 4, hy - 3, 4);
    
    // Little glowing tongue
    stroke(255, 0, 127, 200); // Red tongue
    strokeWeight(1.5);
    line(hx, hy - 6, hx, hy - 11);
    line(hx, hy - 11, hx - 2, hy - 13);
    line(hx, hy - 11, hx + 2, hy - 13);

    // 5. Draw starting tail dock area
    let tailNode = trackCoords[0];
    stroke(0, 242, 254, 80);
    fill(0, 242, 254, 15);
    rect(boardLeft + tailNode.x - 45, boardTop + tailNode.y - 12, 30, 24, 6);
    noStroke();
    fill(0, 242, 254, 150);
    textSize(8);
    textAlign(CENTER, CENTER);
    text("START", boardLeft + tailNode.x - 30, boardTop + tailNode.y);
}

function drawValidMovesAndAdvisory() {
    if (isGameOver || activePlayer !== 1 || !isSticksCast || currentRoll <= 0) return;

    for (let i = 0; i < playerPieces.length; i++) {
        if (isValidMove(1, i, currentRoll)) {
            let p = playerPieces[i];
            let cx, cy;

            if (p.step === -1) {
                cx = boardLeft + trackCoords[0].x - 30;
                cy = boardTop + trackCoords[0].y;
            } else {
                let node = trackCoords[p.step];
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

// Draw pieces
function drawPieces() {
    let unenteredCount = 0;
    for (let i = 0; i < playerPieces.length; i++) {
        let p = playerPieces[i];
        if (p.step === -1) {
            let cx = boardLeft + trackCoords[0].x - 30 + (unenteredCount - 1) * 4;
            let cy = boardTop + trackCoords[0].y;
            drawToken(cx, cy, 1, false);
            unenteredCount++;
        } else if (p.step >= 0 && p.step < 40) {
            let node = trackCoords[p.step];
            drawToken(boardLeft + node.x, boardTop + node.y, 1, p.isLion);
        }
    }

    let aiUnenteredCount = 0;
    for (let i = 0; i < aiPieces.length; i++) {
        let p = aiPieces[i];
        if (p.step === -1) {
            // AI shares tail area
            let cx = boardLeft + trackCoords[0].x - 30 + (aiUnenteredCount - 1) * 4;
            let cy = boardTop + trackCoords[0].y + 6;
            drawToken(cx, cy, 2, false);
            aiUnenteredCount++;
        } else if (p.step >= 0 && p.step < 40) {
            let node = trackCoords[p.step];
            drawToken(boardLeft + node.x, boardTop + node.y, 2, p.isLion);
        }
    }
}

function drawToken(cx, cy, faction, isLion) {
    noStroke();
    if (faction === 1) {
        if (isLion) {
            // Player Lion: Glowing Gold beast
            fill(255, 215, 0, 50);
            circle(cx, cy, 18);
            fill(255, 215, 0, 220);
            circle(cx, cy, 12);
            // Draw cross detail
            stroke(255);
            line(cx - 3, cy, cx + 3, cy);
            line(cx, cy - 3, cx, cy + 3);
        } else {
            // Player prey (Cyan glass)
            fill(0, 242, 254, 50);
            circle(cx, cy, 16);
            fill(0, 242, 254, 210);
            circle(cx, cy, 10);
        }
    } else {
        if (isLion) {
            // AI Lion (Glowing Purple beast)
            fill(176, 38, 255, 50);
            circle(cx, cy, 18);
            fill(176, 38, 255, 220);
            circle(cx, cy, 12);
            // Draw diagonal cross detail
            stroke(255);
            line(cx - 2, cy - 2, cx + 2, cy + 2);
            line(cx + 2, cy - 2, cx - 2, cy + 2);
        } else {
            // AI prey (Magenta glass)
            fill(255, 0, 127, 50);
            circle(cx, cy, 16);
            fill(255, 0, 127, 210);
            circle(cx, cy, 10);
        }
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
        updateHUDStatus("VICTORY! ALL PIECES SAFELY ESCAPED.");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("SYSTEM FAILURE!");
    }
}
