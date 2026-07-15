// Neon Mancala - Classic Retro Arcade
let board = Array(14).fill(0); // 14 pits: 0-5 P1 pits, 6 P1 Store, 7-12 P2 pits, 13 P2 Store
let activePlayer = 1;          // 1: P1 (you), 2: P2 (AI)
let isGameOver = false;

// Physics seeds rendering structure
let pitSeeds = Array(14).fill().map(() => []); // List of seed objects in each pit
let travelingSeeds = [];                      // Seeds currently in flight animation

// Sowing queue states
let sowingSteps = []; // Queue of { pitIndex: int } representing sowing steps
let seedsInHand = 0;
let lastSownIndex = -1;
let sourcePitIndex = -1;       // Clicked source pit of active move
let hintPitIndex = null;       // Recommended pit to play
let isAnimating = false;
let animDelay = 18; // frames between sowing steps

// Layout sizes
let boardWidth, boardHeight;
let boardLeft, boardTop;
let pitPositions = []; // Precomputed coordinates of pits

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 340;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Button hooks
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('hint-btn').addEventListener('click', calculateHint);
    
    restartGame();
}

function draw() {
    background(2, 3, 5);

    // Dynamic Board placement calculation
    boardWidth = width * 0.94;
    boardHeight = boardWidth * 0.42;
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2 - boardHeight / 2;

    precomputeLayout();

    // 1. Draw Mancala wooden/glass board structure
    drawBoardBackdrop();

    // 2. Animate seeds in flight
    updateTravelingSeeds();

    // 3. Process sowing timer queue
    processSowingQueue();

    // 4. Draw seeds in pits
    drawSeedsInPits();

    // 5. Draw highlighted overlays for active pits
    drawActiveHUDHighlights();
}

function restartGame() {
    // 4 seeds in each small pit initially, stores are empty
    for (let i = 0; i < 14; i++) {
        if (i === 6 || i === 13) {
            board[i] = 0;
        } else {
            board[i] = 4;
        }
    }

    activePlayer = 1;
    isGameOver = false;
    travelingSeeds = [];
    sowingSteps = [];
    isAnimating = false;
    seedsInHand = 0;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('ai-store-val').textContent = 0;
    document.getElementById('player-store-val').textContent = 0;
    updateStatusHUD("YOUR TURN");

    // Populate seeds structures with initial physics coords
    precomputeLayout();
    populateInitialSeeds();
}

function precomputeLayout() {
    pitPositions = [];
    let smallPitW = boardWidth / 8;
    let smallPitH = boardHeight * 0.3;

    // 0-5 P1 pits (Bottom row: left to right)
    for (let i = 0; i < 6; i++) {
        let x = boardLeft + smallPitW * (i + 1) + smallPitW / 2;
        let y = boardTop + boardHeight * 0.7;
        pitPositions[i] = { x, y, r: smallPitW * 0.4 };
    }

    // 6 P1 Store (Right end)
    pitPositions[6] = {
        x: boardLeft + boardWidth - smallPitW / 2 - 12,
        y: boardTop + boardHeight / 2,
        rX: smallPitW * 0.45,
        rY: boardHeight * 0.4
    };

    // 7-12 P2 pits (Top row: right to left)
    for (let i = 0; i < 6; i++) {
        let x = boardLeft + smallPitW * (6 - i) + smallPitW / 2;
        let y = boardTop + boardHeight * 0.3;
        pitPositions[i + 7] = { x, y, r: smallPitW * 0.4 };
    }

    // 13 P2 Store (Left end)
    pitPositions[13] = {
        x: boardLeft + smallPitW / 2 + 12,
        y: boardTop + boardHeight / 2,
        rX: smallPitW * 0.45,
        rY: boardHeight * 0.4
    };
}

function populateInitialSeeds() {
    pitSeeds = Array(14).fill().map(() => []);
    for (let i = 0; i < 14; i++) {
        if (i !== 6 && i !== 13) {
            for (let s = 0; s < 4; s++) {
                spawnSeedInPit(i);
            }
        }
    }
}

function spawnSeedInPit(pitIndex) {
    let pos = pitPositions[pitIndex];
    let offsetRange = pitIndex === 6 || pitIndex === 13 ? 18 : 10;
    
    // Random placement offset centered in pit
    let rx = random(-offsetRange, offsetRange);
    let ry = random(-offsetRange, offsetRange);
    
    // Gemstone colors in HSL: Gold, Jade Green, Sapphire Blue, Amethyst Purple, Ruby Red
    let sHue = random([40, 145, 205, 280, 355]);

    pitSeeds[pitIndex].push({
        x: pos.x + rx,
        y: pos.y + ry,
        hue: sHue
    });
}

function drawBoardBackdrop() {
    noFill();
    
    // Outer glowing glass plate (Neon Amber)
    stroke(255, 159, 28, 25);
    strokeWeight(3.5);
    rect(boardLeft, boardTop, boardWidth, boardHeight, 20);

    // Mahogany cyber wood filling
    fill(36, 22, 14, 185);
    stroke(255, 159, 28, 12);
    strokeWeight(1.5);
    rect(boardLeft + 4, boardTop + 4, boardWidth - 8, boardHeight - 8, 16);

    // Draw small pits
    for (let i = 0; i < 14; i++) {
        let pos = pitPositions[i];
        
        fill(10, 5, 2, 220); // Deep hollow pits
        stroke(255, 159, 28, 22);
        strokeWeight(1.2);
        
        if (i === 6 || i === 13) {
            // Store houses: draw capsule ellipses
            ellipse(pos.x, pos.y, pos.rX * 2, pos.rY * 2);
        } else {
            // Small pits: draw circles
            ellipse(pos.x, pos.y, pos.r * 2, pos.r * 2);
        }
    }
}

function drawSeedsInPits() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noStroke();

    for (let i = 0; i < 14; i++) {
        let seeds = pitSeeds[i];
        seeds.forEach(s => {
            // Glow drop shadow
            fill(s.hue, 95, 55, 0.25);
            ellipse(s.x, s.y, 10);
            
            fill(s.hue, 85, 48);
            ellipse(s.x, s.y, 7);
        });
    }
    colorMode(RGB, 255, 255, 255, 255);
}

function updateTravelingSeeds() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noStroke();

    for (let i = travelingSeeds.length - 1; i >= 0; i--) {
        let s = travelingSeeds[i];
        
        // Linear interpolation towards target coords
        s.t += 0.08;
        let cx = lerp(s.startX, s.targetX, s.t);
        let cy = lerp(s.startY, s.targetY, s.t);

        // Glow trail
        fill(s.hue, 95, 55, 0.4);
        ellipse(cx, cy, 11);
        fill(s.hue, 90, 50);
        ellipse(cx, cy, 7);

        if (s.t >= 1.0) {
            // Settle in target pit
            travelingSeeds.splice(i, 1);
            pitSeeds[s.targetIndex].push({
                x: s.targetX,
                y: s.targetY,
                hue: s.hue
            });
        }
    }
    colorMode(RGB, 255, 255, 255, 255);
}

function drawActiveHUDHighlights() {
    if (isGameOver || isAnimating) return;

    if (activePlayer === 1) {
        // Highlight active hint recommendation in golden orange pulsing
        if (hintPitIndex !== null && board[hintPitIndex] > 0) {
            let pos = pitPositions[hintPitIndex];
            stroke(255, 183, 3, 160 + sin(frameCount * 0.15) * 65);
            strokeWeight(2.6);
            noFill();
            ellipse(pos.x, pos.y, pos.r * 2 + 8);
        }

        // Highlight player pits (0 to 5) when hovered
        let hoveredIndex = getHoveredPit();
        if (hoveredIndex >= 0 && hoveredIndex <= 5 && board[hoveredIndex] > 0) {
            let pos = pitPositions[hoveredIndex];
            stroke(255, 159, 28); // Amber gold
            strokeWeight(1.8);
            noFill();
            ellipse(pos.x, pos.y, pos.r * 2 + 4);
        }
    }
}

function getHoveredPit() {
    for (let i = 0; i < 6; i++) {
        let pos = pitPositions[i];
        let d = dist(mouseX, mouseY, pos.x, pos.y);
        if (d < pos.r) return i;
    }
    return -1;
}

function mousePressed() {
    if (isGameOver || isAnimating || activePlayer !== 1) return;

    let hoveredIndex = getHoveredPit();
    if (hoveredIndex >= 0 && hoveredIndex <= 5) {
        if (board[hoveredIndex] > 0) {
            executeMove(hoveredIndex);
        }
    }
}

function executeMove(startIndex) {
    isAnimating = true;
    sowingSteps = [];
    sourcePitIndex = startIndex;
    hintPitIndex = null; // Clear active hint Advisory on play
    
    let seeds = board[startIndex];
    board[startIndex] = 0;

    // Grab all seed elements from visual pit array
    let grabbedSeeds = pitSeeds[startIndex];
    pitSeeds[startIndex] = [];

    let currentIdx = startIndex;
    let stepCount = 1;

    while (seeds > 0) {
        currentIdx = (currentIdx + 1) % 14;

        // Skip opponent's store house
        if (activePlayer === 1 && currentIdx === 13) continue;
        if (activePlayer === 2 && currentIdx === 6) continue;

        seeds--;
        board[currentIdx]++;
        
        let targetPit = currentIdx;
        let seedObj = grabbedSeeds.pop();

        sowingSteps.push({
            targetIdx: targetPit,
            seed: seedObj,
            stepDelay: stepCount * animDelay
        });

        stepCount++;
    }

    lastSownIndex = currentIdx;
}

function processSowingQueue() {
    if (!isAnimating || sowingSteps.length === 0) return;

    // Trigger flight animation based on step delay schedules
    for (let i = sowingSteps.length - 1; i >= 0; i--) {
        let step = sowingSteps[i];
        step.stepDelay--;
        
        if (step.stepDelay <= 0) {
            // Remove from queue and place in flight list
            sowingSteps.splice(i, 1);

            let pos = pitPositions[step.targetIdx];
            let offsetRange = step.targetIdx === 6 || step.targetIdx === 13 ? 16 : 8;
            let targetX = pos.x + random(-offsetRange, offsetRange);
            let targetY = pos.y + random(-offsetRange, offsetRange);

            travelingSeeds.push({
                startX: pitPositions[sourcePitIndex].x, // originate from clicked source pit
                startY: pitPositions[sourcePitIndex].y,
                targetX: targetX,
                targetY: targetY,
                targetIndex: step.targetIdx,
                hue: step.seed ? step.seed.hue : 200,
                t: 0
            });
        }
    }

    // Sowing finished check
    if (sowingSteps.length === 0 && travelingSeeds.length === 0) {
        resolveTurn();
    }
}

function resolveTurn() {
    isAnimating = false;

    // Update HTML Store counts
    document.getElementById('player-store-val').textContent = board[6];
    document.getElementById('ai-store-val').textContent = board[13];

    // 1. Capture rule
    // Lands in an empty pit on player's own side, and opposite pit has seeds
    let isOnPlayerSide = activePlayer === 1 ? (lastSownIndex >= 0 && lastSownIndex <= 5) : (lastSownIndex >= 7 && lastSownIndex <= 12);
    
    if (isOnPlayerSide && board[lastSownIndex] === 1) {
        let oppositeIndex = 12 - lastSownIndex;
        let oppositeSeeds = board[oppositeIndex];

        if (oppositeSeeds > 0) {
            // Capture!
            board[oppositeIndex] = 0;
            board[lastSownIndex] = 0;

            let storeIndex = activePlayer === 1 ? 6 : 13;
            board[storeIndex] += (oppositeSeeds + 1);

            // Animate seeds captured
            let capSeeds = [...pitSeeds[oppositeIndex], ...pitSeeds[lastSownIndex]];
            pitSeeds[oppositeIndex] = [];
            pitSeeds[lastSownIndex] = [];

            capSeeds.forEach(s => {
                let pos = pitPositions[storeIndex];
                travelingSeeds.push({
                    startX: s.x,
                    startY: s.y,
                    targetX: pos.x + random(-18, 18),
                    targetY: pos.y + random(-18, 18),
                    targetIndex: storeIndex,
                    hue: s.hue,
                    t: 0
                });
            });

            isAnimating = true;
            document.getElementById('player-store-val').textContent = board[6];
            document.getElementById('ai-store-val').textContent = board[13];
        }
    }

    // Check game over
    if (checkGameEnd()) {
        triggerGameOver();
        return;
    }

    // 2. Extra turn rule
    // Lands in own store
    let landedInOwnStore = (activePlayer === 1 && lastSownIndex === 6) || (activePlayer === 2 && lastSownIndex === 13);
    
    if (landedInOwnStore) {
        // Keeps turn
        updateStatusHUD(activePlayer === 1 ? "YOUR TURN (EXTRA!)" : "AI THINKING (EXTRA!)");
        if (activePlayer === 2) {
            setTimeout(makeAIMove, 700);
        }
    } else {
        // Toggle player turn
        activePlayer = activePlayer === 1 ? 2 : 1;
        updateStatusHUD(activePlayer === 1 ? "YOUR TURN" : "AI THINKING");
        
        if (activePlayer === 2) {
            setTimeout(makeAIMove, 700);
        }
    }
}

function updateStatusHUD(msg) {
    const statusBox = document.getElementById('status-val');
    if (statusBox) {
        statusBox.textContent = msg;
        if (msg.includes("AI")) {
            statusBox.className = "hud-value status-thinking";
        } else {
            statusBox.className = "hud-value status-neon";
        }
    }
}

function checkGameEnd() {
    let p1Empty = board.slice(0, 6).every(val => val === 0);
    let p2Empty = board.slice(7, 13).every(val => val === 0);

    if (p1Empty || p2Empty) {
        // Collect remaining seeds
        if (p1Empty) {
            // AI gets remaining seeds on P2 side
            for (let i = 7; i <= 12; i++) {
                board[13] += board[i];
                board[i] = 0;
                
                // Animate remaining seeds to store 13
                let pos = pitPositions[13];
                pitSeeds[i].forEach(s => {
                    travelingSeeds.push({
                        startX: s.x, startY: s.y,
                        targetX: pos.x + random(-18, 18), targetY: pos.y + random(-18, 18),
                        targetIndex: 13, hue: s.hue, t: 0
                    });
                });
                pitSeeds[i] = [];
            }
        } else {
            // Player gets remaining seeds on P1 side
            for (let i = 0; i <= 5; i++) {
                board[6] += board[i];
                board[i] = 0;

                // Animate remaining seeds to store 6
                let pos = pitPositions[6];
                pitSeeds[i].forEach(s => {
                    travelingSeeds.push({
                        startX: s.x, startY: s.y,
                        targetX: pos.x + random(-18, 18), targetY: pos.y + random(-18, 18),
                        targetIndex: 6, hue: s.hue, t: 0
                    });
                });
                pitSeeds[i] = [];
            }
        }
        return true;
    }
    return false;
}

function triggerGameOver() {
    isGameOver = true;
    
    document.getElementById('player-store-val').textContent = board[6];
    document.getElementById('ai-store-val').textContent = board[13];

    let msg = `You: ${board[6]} seeds | AI: ${board[13]} seeds`;
    let title = "DRAW STATE";
    
    if (board[6] > board[13]) {
        title = "VICTORY";
        document.getElementById('game-over-title').style.color = "var(--neon-cyan)";
    } else if (board[6] < board[13]) {
        title = "DEFEAT";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
    }

    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-msg').textContent = msg;
    document.getElementById('game-over-screen').style.display = 'flex';
    updateStatusHUD("SIM COMPLETE");
}

// Heuristic Minimax AI for Mancala
function makeAIMove() {
    if (isGameOver) return;

    let bestMove = -1;
    let bestScore = -Infinity;

    // AI pits are 7 to 12
    for (let pit = 7; pit <= 12; pit++) {
        if (board[pit] > 0) {
            // Heuristic evaluation score
            let score = evaluateMancalaMove(pit);
            if (score > bestScore) {
                bestScore = score;
                bestMove = pit;
            }
        }
    }

    if (bestMove !== -1) {
        executeMove(bestMove);
    }
}

function evaluateMancalaMove(pitIdx) {
    let score = 0;
    let seeds = board[pitIdx];
    let finalIdx = (pitIdx + seeds) % 13; // rough final index calculations

    // 1. Prioritize extra turn moves
    if (finalIdx === 13) {
        score += 50;
    }

    // 2. Prioritize capture moves
    let targetIdx = (pitIdx + seeds) % 14;
    if (targetIdx >= 7 && targetIdx <= 12 && board[targetIdx] === 0) {
        let oppositeIdx = 12 - targetIdx;
        if (board[oppositeIdx] > 0) {
            score += (board[oppositeIdx] + 15);
        }
    }

    // 3. Maximize seed collection difference
    score += seeds * 0.5;

    return score;
}

function calculateHint() {
    if (isGameOver || isAnimating || activePlayer !== 1) return;

    let bestMove = -1;
    let bestScore = -Infinity;

    // Player 1 pits are 0 to 5
    for (let pit = 0; pit <= 5; pit++) {
        if (board[pit] > 0) {
            let score = evaluateP1Move(pit);
            if (score > bestScore) {
                bestScore = score;
                bestMove = pit;
            }
        }
    }

    if (bestMove !== -1) {
        hintPitIndex = bestMove;
    }
}

function evaluateP1Move(pitIdx) {
    let score = 0;
    let seeds = board[pitIdx];
    let finalIdx = (pitIdx + seeds) % 13;

    // 1. Extra turn: lands in P1 store (index 6)
    if (finalIdx === 6) {
        score += 50;
    }

    // 2. Capture: lands in own empty pit, and opposite pit has seeds
    let targetIdx = (pitIdx + seeds) % 14;
    if (targetIdx >= 0 && targetIdx <= 5 && board[targetIdx] === 0) {
        let oppositeIdx = 12 - targetIdx;
        if (board[oppositeIdx] > 0) {
            score += (board[oppositeIdx] + 15);
        }
    }

    score += seeds * 0.5;
    return score;
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
