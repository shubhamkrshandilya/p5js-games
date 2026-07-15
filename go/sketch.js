// Cyber Go (9x9) - Classic Retro Arcade
const BOARD_SIZE = 9;
let grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0)); // 0: empty, 1: Black (you), 2: White (AI)
let activePlayer = 1; // 1: Black, 2: White
let isGameOver = false;

// Game state metrics
let playerCaptured = 0; // Black captures White stones
let aiCaptured = 0;     // White captures Black stones
let playerPassed = false;
let aiPassed = false;
let passesCount = 0;

// Ko rule protection
let previousGridString = "";

// Scoring
let playerTerritory = 0;
let aiTerritory = 0;
const KOMI = 6.5; // Komi compensation for White

// Rendering sizes
let boardPadding = 30;
let cellSize;
let boardLeft, boardTop;
let boardWidth;

// Ripples effect
let stoneRipples = [];
let hintCoords = null; // Recommended coordinate intersection

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM hooks
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('pass-btn').addEventListener('click', triggerPass);
    document.getElementById('hint-btn').addEventListener('click', calculateHint);

    restartGame();
}

function draw() {
    background(2, 4, 3);

    // Calculate dynamic layout sizes
    boardWidth = Math.min(width, height) * 0.88;
    cellSize = (boardWidth - boardPadding * 2) / (BOARD_SIZE - 1);
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2 - boardWidth / 2;

    // 1. Draw Go Board wood/neon layout
    drawGoBoardGrid();

    // 2. Draw active stones placed
    drawStones();

    // 3. Draw hover preview indicators
    drawStoneHoverPreview();

    // 4. Render and update capturing stone ripples
    drawStoneRipples();
}

function restartGame() {
    grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    activePlayer = 1;
    isGameOver = false;
    playerCaptured = 0;
    aiCaptured = 0;
    playerPassed = false;
    aiPassed = false;
    passesCount = 0;
    previousGridString = "";
    stoneRipples = [];
    hintCoords = null;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('captured-val').textContent = 0;
    document.getElementById('player-score-val').textContent = 0;
    document.getElementById('ai-score-val').textContent = KOMI;
    
    updateHUDStatus("YOUR TURN");
}

function drawGoBoardGrid() {
    // Outer plate border
    // Outer plate border
    stroke(0, 255, 102, 120);
    strokeWeight(2);
    noFill();
    rect(boardLeft - 2, boardTop - 2, boardWidth + 4, boardWidth + 4, 10);

    fill(10, 23, 14, 160);
    stroke(0, 255, 102, 70);
    strokeWeight(1.5);
    rect(boardLeft + 2, boardTop + 2, boardWidth - 4, boardWidth - 4, 8);

    // Grid lines (intersections)
    stroke(0, 255, 102, 140); // Brighter green lines
    strokeWeight(1.5);
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        let x = boardLeft + boardPadding + i * cellSize;
        let y = boardTop + boardPadding + i * cellSize;
        
        // Vertical line
        line(x, boardTop + boardPadding, x, boardTop + boardWidth - boardPadding);
        // Horizontal line
        line(boardLeft + boardPadding, y, boardLeft + boardWidth - boardPadding, y);
    }

    // Star points (Hoshi) on 9x9 board (corners at 3rd line and center)
    fill(0, 255, 102, 220); // High visibility star points
    noStroke();
    let starIndices = [2, 4, 6];
    for (let r of starIndices) {
        for (let c of starIndices) {
            let sx = boardLeft + boardPadding + c * cellSize;
            let sy = boardTop + boardPadding + r * cellSize;
            ellipse(sx, sy, 7);
        }
    }
}

function drawStones() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let val = grid[r][c];
            if (val > 0) {
                let sx = boardLeft + boardPadding + c * cellSize;
                let sy = boardTop + boardPadding + r * cellSize;
                
                drawSingleStone(sx, sy, val);
            }
        }
    }
}

function drawSingleStone(x, y, colorCode) {
    // 1: Black stone (Cyan glow), 2: White stone (Magenta glow)
    let sColor = colorCode === 1 ? [180, 100, 50] : [320, 100, 50];
    colorMode(HSL, 360, 100, 100, 1.0);

    // Outer glow
    noStroke();
    fill(sColor[0], 95, 55, 0.18);
    ellipse(x, y, cellSize * 0.95);

    // Stone body
    fill(sColor[0], 85, 42, 0.85);
    stroke(sColor[0], 95, 75, 0.9);
    strokeWeight(1.5);
    ellipse(x, y, cellSize * 0.82);

    colorMode(RGB, 255, 255, 255, 255);
}

function drawStoneHoverPreview() {
    if (activePlayer !== 1 || isGameOver) return;

    // Draw active gold pulsing hint coordinates indicator
    if (hintCoords && grid[hintCoords.r][hintCoords.c] === 0) {
        let sx = boardLeft + boardPadding + hintCoords.c * cellSize;
        let sy = boardTop + boardPadding + hintCoords.r * cellSize;
        colorMode(HSL, 360, 100, 100, 1.0);
        stroke(40, 100, 50, 0.65 + sin(frameCount * 0.15) * 0.25); // gold pulsing in 0-1.0 HSL range
        strokeWeight(2.2);
        fill(40, 100, 50, 0.25);
        ellipse(sx, sy, cellSize * 0.82);
        colorMode(RGB, 255, 255, 255, 255);
    }

    let coords = getIntersectionFromMouse();
    if (coords && grid[coords.r][coords.c] === 0) {
        let sx = boardLeft + boardPadding + coords.c * cellSize;
        let sy = boardTop + boardPadding + coords.r * cellSize;

        // Draw translucent Cyan preview stone
        colorMode(HSL, 360, 100, 100, 1.0);
        stroke(180, 95, 75, 0.5);
        strokeWeight(1.2);
        fill(180, 85, 45, 0.25);
        ellipse(sx, sy, cellSize * 0.82);
        colorMode(RGB, 255, 255, 255, 255);
    }
}

function getIntersectionFromMouse() {
    let mouseGridX = (mouseX - boardLeft - boardPadding) / cellSize;
    let mouseGridY = (mouseY - boardTop - boardPadding) / cellSize;

    let c = Math.round(mouseGridX);
    let r = Math.round(mouseGridY);

    if (c >= 0 && c < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
        // Double check snap distance
        let sx = boardLeft + boardPadding + c * cellSize;
        let sy = boardTop + boardPadding + r * cellSize;
        let d = dist(mouseX, mouseY, sx, sy);
        if (d < cellSize * 0.45) {
            return { r, c };
        }
    }
    return null;
}

function mousePressed() {
    if (activePlayer !== 1 || isGameOver) return;

    // Check bounds
    if (mouseX < boardLeft || mouseX >= boardLeft + boardWidth ||
        mouseY < boardTop || mouseY >= boardTop + boardWidth) {
        return;
    }

    let coords = getIntersectionFromMouse();
    if (coords && grid[coords.r][coords.c] === 0) {
        // Attempt move placement
        let moveResult = attemptMove(coords.r, coords.c, 1);
        if (moveResult) {
            playerPassed = false;
            passesCount = 0;
            endTurn();
        }
    }
}

function triggerPass() {
    if (activePlayer !== 1 || isGameOver) return;
    
    playerPassed = true;
    passesCount++;
    spawnCaptureRipple(width / 2, height / 2, true); // pass alert wave
    endTurn();
}

function endTurn() {
    if (passesCount >= 2) {
        calculateScoresAndEndGame();
        return;
    }

    // Toggle turn
    activePlayer = activePlayer === 1 ? 2 : 1;
    updateHUDStatus(activePlayer === 1 ? "YOUR TURN" : "AI THINKING");

    if (activePlayer === 2) {
        setTimeout(makeAIMove, 600);
    }
}

function updateHUDStatus(msg) {
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

// --------------------------------------------------------------------------
// GO RULES ENGINE (Capture checks, Liberties evaluation, Ko rule)
// --------------------------------------------------------------------------

function attemptMove(r, c, colorCode) {
    // Clear active hint coordinate guidance on player action
    hintCoords = null;

    // String representation of grid before making move
    let gridStringBefore = grid.map(row => row.join(',')).join(';');

    // Make mock placement
    grid[r][c] = colorCode;

    // Find and resolve captured opponent groups
    let opponentColor = colorCode === 1 ? 2 : 1;
    let stonesCaptured = false;
    let capturedPositions = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (grid[i][j] === opponentColor) {
                let group = getGroup(i, j);
                if (countLiberties(group) === 0) {
                    stonesCaptured = true;
                    group.forEach(pos => {
                        capturedPositions.push(pos);
                    });
                }
            }
        }
    }

    // Capture execution
    if (stonesCaptured) {
        capturedPositions.forEach(pos => {
            grid[pos.r][pos.c] = 0;
            // Spawn neon ripples at capture points
            let sx = boardLeft + boardPadding + pos.c * cellSize;
            let sy = boardTop + boardPadding + pos.r * cellSize;
            spawnCaptureRipple(sx, sy, false);
        });

        // Add to stats
        if (colorCode === 1) {
            playerCaptured += capturedPositions.length;
            document.getElementById('captured-val').textContent = playerCaptured;
        } else {
            aiCaptured += capturedPositions.length;
        }
    }

    // Suicide rule validation
    let ownGroup = getGroup(r, c);
    if (countLiberties(ownGroup) === 0) {
        // Suicide: revert mock move
        grid[r][c] = 0;
        return false;
    }

    // Ko rule validation (recreating identical previous board state)
    let gridStringAfter = grid.map(row => row.join(',')).join(';');
    if (gridStringAfter === previousGridString) {
        // Revert due to Ko rule
        grid[r][c] = 0;
        // Re-add captured stones if they were deleted
        capturedPositions.forEach(pos => {
            grid[pos.r][pos.c] = opponentColor;
        });
        return false;
    }

    // Update history
    previousGridString = gridStringBefore;
    
    // Recalculate estimated real-time board score
    estimateScores();

    return true;
}

// Flood fill adjacent stones of the same color
function getGroup(startR, startC) {
    let color = grid[startR][startC];
    if (color === 0) return [];

    let group = [];
    let visited = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    let queue = [{ r: startR, c: startC }];
    visited[startR][startC] = true;

    while (queue.length > 0) {
        let curr = queue.shift();
        group.push(curr);

        let dirs = [{r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}];
        dirs.forEach(d => {
            let nr = curr.r + d.r;
            let nc = curr.c + d.c;
            
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (grid[nr][nc] === color && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    queue.push({ r: nr, c: nc });
                }
            }
        });
    }

    return group;
}

function countLiberties(group) {
    let liberties = []; // coordinates list to avoid double counting

    group.forEach(pos => {
        let dirs = [{r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}];
        dirs.forEach(d => {
            let nr = pos.r + d.r;
            let nc = pos.c + d.c;
            
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (grid[nr][nc] === 0) {
                    let key = `${nr},${nc}`;
                    if (!liberties.includes(key)) {
                        liberties.push(key);
                    }
                }
            }
        });
    });

    return liberties.length;
}

// --------------------------------------------------------------------------
// SCORING AND RIPPLE VISUAL EFFECTS
// --------------------------------------------------------------------------

function drawStoneRipples() {
    colorMode(HSL, 360, 100, 100, 1.0);
    noFill();

    for (let i = stoneRipples.length - 1; i >= 0; i--) {
        let rip = stoneRipples[i];
        rip.radius += 2.2;
        rip.opacity -= 5;

        if (rip.opacity <= 0) {
            stoneRipples.splice(i, 1);
            continue;
        }

        stroke(rip.color[0], rip.color[1], rip.color[2], rip.opacity / 255);
        strokeWeight(1.8);
        ellipse(rip.x, rip.y, rip.radius);
    }

    colorMode(RGB, 255, 255, 255, 255);
}

function spawnCaptureRipple(x, y, isGreen = false) {
    stoneRipples.push({
        x: x,
        y: y,
        radius: 6,
        opacity: 255,
        color: isGreen ? [120, 100, 50] : [320, 100, 50] // green pass ripple vs red/magenta capture ripple
    });
}

// Real-time territory evaluation using flood-fills
function estimateScores() {
    let scoreBlack = playerCaptured;
    let scoreWhite = aiCaptured + KOMI;

    let visited = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] === 1) {
                scoreBlack++; // points for stones on board
            } else if (grid[r][c] === 2) {
                scoreWhite++;
            } else if (grid[r][c] === 0 && !visited[r][c]) {
                // Empty cell: check surrounded territory
                let territoryObj = getTerritory(r, c, visited);
                if (territoryObj.owner === 1) {
                    scoreBlack += territoryObj.cells.length;
                } else if (territoryObj.owner === 2) {
                    scoreWhite += territoryObj.cells.length;
                }
            }
        }
    }

    document.getElementById('player-score-val').textContent = scoreBlack.toFixed(1);
    document.getElementById('ai-score-val').textContent = scoreWhite.toFixed(1);
}

function getTerritory(startR, startC, visited) {
    let cells = [];
    let queue = [{ r: startR, c: startC }];
    visited[startR][startC] = true;

    let borderingColors = []; // tracks surrounding stone colors

    while (queue.length > 0) {
        let curr = queue.shift();
        cells.push(curr);

        let dirs = [{r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}];
        dirs.forEach(d => {
            let nr = curr.r + d.r;
            let nc = curr.c + d.c;
            
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                let cellVal = grid[nr][nc];
                if (cellVal === 0) {
                    if (!visited[nr][nc]) {
                        visited[nr][nc] = true;
                        queue.push({ r: nr, c: nc });
                    }
                } else {
                    if (!borderingColors.includes(cellVal)) {
                        borderingColors.push(cellVal);
                    }
                }
            }
        });
    }

    // Owner is 1 (Black) if only Black stones border, 2 (White) if only White border, 0 otherwise
    let owner = 0;
    if (borderingColors.length === 1) {
        owner = borderingColors[0];
    }

    return { cells, owner };
}

function calculateScoresAndEndGame() {
    isGameOver = true;
    estimateScores();

    let scoreBlack = parseFloat(document.getElementById('player-score-val').textContent);
    let scoreWhite = parseFloat(document.getElementById('ai-score-val').textContent);

    let msg = `You: ${scoreBlack.toFixed(1)} pts | AI: ${scoreWhite.toFixed(1)} pts`;
    let title = "DRAW STATE";

    if (scoreBlack > scoreWhite) {
        title = "VICTORY";
        document.getElementById('game-over-title').style.color = "var(--neon-green)";
    } else if (scoreBlack < scoreWhite) {
        title = "DEFEAT";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
    }

    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-msg').textContent = msg;
    document.getElementById('game-over-screen').style.display = 'flex';
    updateHUDStatus("SIM COMPLETE");
}

// --------------------------------------------------------------------------
// GO HEURISTIC AI (WHITE)
// --------------------------------------------------------------------------

function makeAIMove() {
    if (isGameOver) return;

    let bestMove = null;
    let maxScore = -Infinity;

    // Scan all intersections
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] === 0) {
                // Check if playing here is legal
                let isLegal = checkLegalMoveMock(r, c, 2);
                if (isLegal) {
                    let score = evaluateGoMove(r, c);
                    if (score > maxScore) {
                        maxScore = score;
                        bestMove = { r, c };
                    }
                }
            }
        }
    }

    if (bestMove && maxScore > -10) {
        attemptMove(bestMove.r, bestMove.c, 2);
        aiPassed = false;
        passesCount = 0;
    } else {
        // AI passes
        aiPassed = true;
        passesCount++;
        spawnCaptureRipple(width / 2, height / 2, true);
        triggerHUDAlert("AI PASSED");
    }

    endTurn();
}

function checkLegalMoveMock(r, c, colorCode) {
    // Mock the move and return true if legal
    let opponentColor = colorCode === 1 ? 2 : 1;
    let gridCopy = grid.map(row => [...row]);
    
    grid[r][c] = colorCode;

    // Resolve captures
    let stonesCaptured = false;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (grid[i][j] === opponentColor) {
                let group = getGroup(i, j);
                if (countLiberties(group) === 0) {
                    stonesCaptured = true;
                    group.forEach(pos => {
                        grid[pos.r][pos.c] = 0;
                    });
                }
            }
        }
    }

    let ownGroup = getGroup(r, c);
    let liberties = countLiberties(ownGroup);

    // Revert grid
    grid = gridCopy;

    // Legal if has liberties
    return liberties > 0;
}

function evaluateGoMove(r, c) {
    let score = 0;
    let opponentColor = 1;

    // Mock move
    let gridCopy = grid.map(row => [...row]);
    grid[r][c] = 2;

    // Heuristic 1. Does it capture opponent stones?
    let capturesCount = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (grid[i][j] === opponentColor) {
                let group = getGroup(i, j);
                if (countLiberties(group) === 0) {
                    capturesCount += group.length;
                }
            }
        }
    }
    score += capturesCount * 45; // large capture bonus

    // Heuristic 2. Liberties count of own group after move
    let ownGroup = getGroup(r, c);
    let libs = countLiberties(ownGroup);
    score += libs * 2.5;

    // Avoid self-atari moves (suicide-adjacent)
    if (libs === 1) {
        score -= 30;
    }

    // Revert
    grid = gridCopy;

    // Prefer playing near existing friendly stones
    let dirs = [{r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}];
    dirs.forEach(d => {
        let nr = r + d.r;
        let nc = c + d.c;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (grid[nr][nc] === 2) score += 4;
            else if (grid[nr][nc] === 1) score += 2; // adjacent block
        }
    });

    return score;
}

function triggerHUDAlert(msg) {
    const alertBox = document.getElementById('status-val');
    if (alertBox) {
        alertBox.textContent = msg;
        alertBox.className = "hud-value status-thinking";
        setTimeout(() => {
            if (!isGameOver) updateHUDStatus("YOUR TURN");
        }, 1500);
    }
}

function calculateHint() {
    if (isGameOver || activePlayer !== 1) return;

    let bestMove = null;
    let maxScore = -Infinity;

    // Scan all empty intersections for Player 1 (Black, value 1)
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] === 0) {
                let isLegal = checkLegalMoveMock(r, c, 1);
                if (isLegal) {
                    let score = evaluateP1GoMove(r, c);
                    if (score > maxScore) {
                        maxScore = score;
                        bestMove = { r, c };
                    }
                }
            }
        }
    }

    if (bestMove) {
        hintCoords = bestMove;
    }
}

function evaluateP1GoMove(r, c) {
    let score = 0;
    let opponentColor = 2;

    // Mock move
    let gridCopy = grid.map(row => [...row]);
    grid[r][c] = 1;

    // 1. Check captures
    let capturesCount = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (grid[i][j] === opponentColor) {
                let group = getGroup(i, j);
                if (countLiberties(group) === 0) {
                    capturesCount += group.length;
                }
            }
        }
    }
    score += capturesCount * 45;

    // 2. Liberties count of own group
    let ownGroup = getGroup(r, c);
    let libs = countLiberties(ownGroup);
    score += libs * 2.5;

    // Avoid self-atari
    if (libs === 1) {
        score -= 30;
    }

    grid = gridCopy;

    // Prefer near own friendly stones
    let dirs = [{r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1}];
    dirs.forEach(d => {
        let nr = r + d.r;
        let nc = c + d.c;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (grid[nr][nc] === 1) score += 4;
            else if (grid[nr][nc] === 2) score += 2;
        }
    });

    return score;
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
