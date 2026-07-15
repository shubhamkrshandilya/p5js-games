// Glass Backgammon - Classic Retro Arcade
let boardPoints = Array(24).fill().map(() => ({ count: 0, player: 0 })); // 0: empty, 1: Player (Cyan), 2: AI (Magenta)
let bar = [0, 0]; // bar[0]: Player checkers on bar, bar[1]: AI checkers on bar
let off = [0, 0]; // off[0]: Player checkers born off, off[1]: AI checkers born off

let playerTurn = 1; // 1: Player (Cyan), 2: AI (Magenta)
let dice = [];      // Active dice values
let diceRolled = false;
let doubleRoll = false;

// Selected checker indices
let selectedPointIndex = null;
let selectedFromBar = false;
let validDestinations = []; // List of { pointIdx: int, dieValue: int }
let isGameOver = false;
let hintMoveObj = null; // recommended move for P1
let showRulesOverlay = false; // toggle visual guide overlay

// Rendering sizes
let boardWidth, boardHeight;
let boardLeft, boardTop;
let pointWidth;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM listeners
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('roll-btn').addEventListener('click', triggerRoll);
    document.getElementById('hint-btn').addEventListener('click', calculateHint);

    restartGame();
}

function draw() {
    background(3, 2, 5);

    boardWidth = Math.min(width, height) * 0.92;
    boardHeight = boardWidth * 0.85;
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2 - boardHeight / 2;
    pointWidth = (boardWidth - 40) / 12; // 12 points on each half

    // 1. Draw board layout (wooden bars and triangles)
    drawBackgammonBoard();

    // 2. Draw Checkers
    drawCheckers();

    // 3. Draw Highlights
    drawInteractionHighlights();
    
    // 4. Draw Animated Movement Flow overlay if rules are open
    let modalEl = document.getElementById('rules-modal');
    if (modalEl && modalEl.style.display === 'flex') {
        drawMovementDirections();
    }
}

function restartGame() {
    boardPoints = Array(24).fill().map(() => ({ count: 0, player: 0 }));
    bar = [0, 0];
    off = [0, 0];
    playerTurn = 1;
    dice = [];
    diceRolled = false;
    doubleRoll = false;
    selectedPointIndex = null;
    selectedFromBar = false;
    validDestinations = [];
    isGameOver = false;
    hintMoveObj = null;

    // Standard starting positions setup
    setupPoints(0, 2, 2);  // 2 White on Point 0
    setupPoints(5, 5, 1);  // 5 Black on Point 5
    setupPoints(7, 3, 1);  // 3 Black on Point 7
    setupPoints(11, 5, 2); // 5 White on Point 11
    setupPoints(12, 5, 1); // 5 Black on Point 12
    setupPoints(16, 3, 2); // 3 White on Point 16
    setupPoints(18, 5, 2); // 5 White on Point 18
    setupPoints(23, 2, 1); // 2 Black on Point 23

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('roll-btn').style.display = 'inline-flex';
    
    updateHUDStats();
    updateStatusHUD("ROLL DICE");
}

function setupPoints(idx, count, player) {
    boardPoints[idx] = { count, player };
}

function updateHUDStats() {
    document.getElementById('player-bar-val').textContent = bar[0];
    document.getElementById('ai-bar-val').textContent = bar[1];
    document.getElementById('player-off-val').textContent = off[0];
    document.getElementById('ai-off-val').textContent = off[1];

    document.getElementById('die1-val').textContent = dice[0] !== undefined ? dice[0] : '-';
    document.getElementById('die2-val').textContent = dice[1] !== undefined ? dice[1] : '-';
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

function triggerRoll() {
    if (playerTurn !== 1 || diceRolled || isGameOver) return;

    rollDice();
    document.getElementById('roll-btn').style.display = 'none';

    // Verify if player has any legal moves available
    if (getLegalMoves(1).length === 0) {
        updateStatusHUD("NO MOVES! PASSING");
        setTimeout(passTurn, 1500);
    } else {
        updateStatusHUD("YOUR TURN");
    }
}

function rollDice() {
    let d1 = Math.floor(random(1, 7));
    let d2 = Math.floor(random(1, 7));
    
    dice = [d1, d2];
    doubleRoll = d1 === d2;

    if (doubleRoll) {
        dice = [d1, d1, d1, d1];
    }
    
    diceRolled = true;
    hintMoveObj = null; // Clear hint on new roll
    updateHUDStats();
}

function drawBackgammonBoard() {
    // Outer plate border
    // Outer plate border
    stroke(255, 0, 127, 130); // Brighter border
    strokeWeight(2.5);
    noFill();
    rect(boardLeft - 2, boardTop - 2, boardWidth + 4, boardHeight + 4, 10);

    fill(10, 5, 12, 160);
    stroke(255, 0, 127, 75);
    strokeWeight(1.5);
    rect(boardLeft + 2, boardTop + 2, boardWidth - 4, boardHeight - 4, 8);

    // Mid Bar Divider
    fill(4, 2, 6, 200);
    stroke(255, 0, 127, 80);
    rect(boardLeft + boardWidth / 2 - 12, boardTop + 4, 24, boardHeight - 8);

    // Draw the 24 point triangles
    for (let i = 0; i < 24; i++) {
        let coords = getPointGeometry(i);
        
        // Alternating colors
        let isAlt = i % 2 === 0;
        if (isAlt) {
            fill(255, 0, 127, 45); // Highly visible magenta point
            stroke(255, 0, 127, 120);
        } else {
            fill(255, 255, 255, 20); // Highly visible silver point
            stroke(255, 255, 255, 75);
        }
        
        strokeWeight(1.0);
        triangle(coords.x1, coords.y1, coords.x2, coords.y2, coords.x3, coords.y3);
    }
}

function getPointGeometry(idx) {
    let isBottom = idx < 12;
    let col = isBottom ? idx : 23 - idx; // map index
    
    let xOffset = col >= 6 ? 16 : 0; // offset for central bar divider
    
    // Calculate point triangle base coordinates
    let baseX1, baseX2;
    if (isBottom) {
        // Bottom row: right to left (idx 0 is rightmost)
        baseX1 = boardLeft + boardWidth - 20 - col * pointWidth - xOffset;
        baseX2 = baseX1 - pointWidth;
    } else {
        // Top row: left to right (idx 12 is leftmost)
        baseX1 = boardLeft + 20 + col * pointWidth + xOffset;
        baseX2 = baseX1 + pointWidth;
    }

    let baseY = isBottom ? boardTop + boardHeight - 6 : boardTop + 6;
    let tipY = isBottom ? baseY - boardHeight * 0.42 : baseY + boardHeight * 0.42;
    let tipX = (baseX1 + baseX2) / 2;

    return { x1: baseX1, y1: baseY, x2: baseX2, y2: baseY, x3: tipX, y3: tipY };
}

function drawCheckers() {
    // 1. Draw checkers on board points
    for (let i = 0; i < 24; i++) {
        let p = boardPoints[i];
        if (p.count > 0) {
            let coords = getPointGeometry(i);
            let isBottom = i < 12;
            let checkerSize = Math.min(pointWidth * 0.85, 22);

            for (let c = 0; c < p.count; c++) {
                // Stack checkers along point length
                let offset = c * (checkerSize * 0.75);
                let cx = coords.x3;
                let cy = isBottom ? coords.y1 - checkerSize / 2 - offset : coords.y1 + checkerSize / 2 + offset;

                drawSingleChecker(cx, cy, p.player);
            }
        }
    }

    // 2. Draw checkers on the central Bar
    let checkerSize = Math.min(pointWidth * 0.85, 22);
    let barX = boardLeft + boardWidth / 2;
    
    // Player 1 on bar (Cyan)
    for (let c = 0; c < bar[0]; c++) {
        drawSingleChecker(barX, boardTop + boardHeight / 2 + 20 + c * 15, 1);
    }
    // Player 2 on bar (Magenta)
    for (let c = 0; c < bar[1]; c++) {
        drawSingleChecker(barX, boardTop + boardHeight / 2 - 20 - c * 15, 2);
    }
}

function drawSingleChecker(x, y, playerCode) {
    let sColor = playerCode === 1 ? [180, 100, 50] : [320, 100, 50]; // Cyan vs Magenta
    let size = Math.min(pointWidth * 0.85, 22);
    
    colorMode(HSL, 360, 100, 100, 1.0);

    // Glow dropping
    noStroke();
    fill(sColor[0], 95, 55, 0.18);
    ellipse(x, y, size + 4);

    // Main disc
    fill(sColor[0], 85, 42, 0.85);
    stroke(sColor[0], 95, 75, 0.9);
    strokeWeight(1.2);
    ellipse(x, y, size);

    colorMode(RGB, 255, 255, 255, 255);
}

function drawInteractionHighlights() {
    if (playerTurn !== 1 || !diceRolled || isGameOver) return;

    // Draw gold pulsing hint advisor
    if (hintMoveObj) {
        stroke(255, 183, 3, 160 + sin(frameCount * 0.15) * 65);
        strokeWeight(2.5);
        noFill();
        if (hintMoveObj.fromBar) {
            let barX = boardLeft + boardWidth / 2;
            ellipse(barX, boardTop + boardHeight / 2 + 20, 26);
        } else {
            let coords = getPointGeometry(hintMoveObj.from);
            line(coords.x1, coords.y1, coords.x2, coords.y2);
            let p = boardPoints[hintMoveObj.from];
            let isBottom = hintMoveObj.from < 12;
            let size = Math.min(pointWidth * 0.85, 22);
            let offset = (p.count - 1) * (size * 0.75);
            let cx = coords.x3;
            let cy = isBottom ? coords.y1 - size / 2 - offset : coords.y1 + size / 2 + offset;
            ellipse(cx, cy, size + 6);
        }

        if (hintMoveObj.to === -1) {
            rect(boardLeft + boardWidth - 10, boardTop + boardHeight - 80, 8, 70, 3);
        } else {
            let coords = getPointGeometry(hintMoveObj.to);
            triangle(coords.x1, coords.y1, coords.x2, coords.y2, coords.x3, coords.y3);
        }
    }

    // Highlight active selected item
    if (selectedFromBar) {
        let barX = boardLeft + boardWidth / 2;
        stroke(0, 242, 254);
        strokeWeight(1.5);
        noFill();
        ellipse(barX, boardTop + boardHeight / 2 + 20, 26);
    } else if (selectedPointIndex !== null) {
        let coords = getPointGeometry(selectedPointIndex);
        stroke(0, 242, 254);
        strokeWeight(1.5);
        noFill();
        // Highlight triangle base
        line(coords.x1, coords.y1, coords.x2, coords.y2);
    }

    // Highlight legal destination points
    validDestinations.forEach(dest => {
        if (dest.pointIdx === -1) {
            // Bear off target indicator: draw outline around bearing zone
            stroke(0, 242, 254, 180);
            strokeWeight(2);
            noFill();
            rect(boardLeft + boardWidth - 10, boardTop + boardHeight - 80, 8, 70, 3);
        } else {
            let coords = getPointGeometry(dest.pointIdx);
            fill(0, 242, 254, 30);
            stroke(0, 242, 254, 150);
            strokeWeight(1.0);
            triangle(coords.x1, coords.y1, coords.x2, coords.y2, coords.x3, coords.y3);
        }
    });
}

function triggerClickSelection(idx) {
    if (selectedPointIndex === idx) {
        // Deselect
        selectedPointIndex = null;
        validDestinations = [];
        return;
    }

    // Load valid move targets for clicked checker
    selectedPointIndex = idx;
    selectedFromBar = false;
    
    validDestinations = [];
    let moves = getLegalMoves(1);
    moves.forEach(m => {
        if (m.from === idx) {
            validDestinations.push({ pointIdx: m.to, dieValue: m.die });
        }
    });
}

function triggerBarClickSelection() {
    if (bar[0] === 0) return;
    
    selectedFromBar = !selectedFromBar;
    selectedPointIndex = null;
    
    validDestinations = [];
    if (selectedFromBar) {
        let moves = getLegalMoves(1);
        moves.forEach(m => {
            if (m.fromBar) {
                validDestinations.push({ pointIdx: m.to, dieValue: m.die });
            }
        });
    }
}

function mousePressed() {
    if (playerTurn !== 1 || !diceRolled || isGameOver) return;

    hintMoveObj = null; // Clear hint Advisory on click action

    // 1. Click on central Bar
    let barX = boardLeft + boardWidth / 2;
    if (abs(mouseX - barX) < 15 && mouseY > boardTop && mouseY < boardTop + boardHeight) {
        triggerBarClickSelection();
        return;
    }

    // 2. Click on a point triangle
    for (let i = 0; i < 24; i++) {
        let coords = getPointGeometry(i);
        let checkX = mouseX;
        let checkY = mouseY;
        
        // Simple triangle boundary check
        if (checkX >= min(coords.x1, coords.x2) && checkX <= max(coords.x1, coords.x2)) {
            let isBottom = i < 12;
            let insideY = isBottom ? (checkY >= coords.y3 && checkY <= coords.y1) : (checkY >= coords.y1 && checkY <= coords.y3);
            
            if (insideY) {
                // Point selected
                if (validDestinations.some(d => d.pointIdx === i)) {
                    // Execute move to this point
                    let destObj = validDestinations.find(d => d.pointIdx === i);
                    executeCheckerMove(selectedFromBar ? -1 : selectedPointIndex, i, destObj.dieValue, 1);
                } else if (boardPoints[i].player === 1 && bar[0] === 0) {
                    triggerClickSelection(i);
                }
                return;
            }
        }
    }

    // 3. Click on Bear off zone (Right-most margin)
    if (mouseX > boardLeft + boardWidth - 15 && mouseX < boardLeft + boardWidth + 15) {
        if (validDestinations.some(d => d.pointIdx === -1)) {
            let destObj = validDestinations.find(d => d.pointIdx === -1);
            executeCheckerMove(selectedPointIndex, -1, destObj.dieValue, 1);
        }
    }
}

function executeCheckerMove(fromIdx, toIdx, dieVal, playerCode) {
    let opp = playerCode === 1 ? 2 : 1;

    // 1. Remove from starting zone
    if (fromIdx === -1) {
        // From Bar
        bar[playerCode - 1]--;
    } else {
        boardPoints[fromIdx].count--;
        if (boardPoints[fromIdx].count === 0) {
            boardPoints[fromIdx].player = 0;
        }
    }

    // 2. Add to destination zone
    if (toIdx === -1) {
        // Bear off!
        off[playerCode - 1]++;
    } else {
        let dest = boardPoints[toIdx];
        if (dest.player === opp && dest.count === 1) {
            // HIT OPPONENT BLOT!
            dest.count = 1;
            dest.player = playerCode;
            bar[opp - 1]++; // put on bar
        } else {
            dest.count++;
            dest.player = playerCode;
        }
    }

    // Consume die
    let dieIdx = dice.indexOf(dieVal);
    if (dieIdx !== -1) {
        dice.splice(dieIdx, 1);
    }

    // Clear highlights
    selectedPointIndex = null;
    selectedFromBar = false;
    validDestinations = [];

    updateHUDStats();

    // Check game over
    if (off[playerCode - 1] === 15) {
        triggerGameOver(playerCode === 1);
        return;
    }

    // Turn resolved check
    if (dice.length === 0) {
        passTurn();
    } else if (getLegalMoves(playerCode).length === 0) {
        // No moves remaining with active dice
        setTimeout(passTurn, 800);
    }
}

function passTurn() {
    dice = [];
    diceRolled = false;
    playerTurn = playerTurn === 1 ? 2 : 1;
    
    updateHUDStats();
    updateStatusHUD(playerTurn === 1 ? "YOUR TURN" : "AI THINKING");

    if (playerTurn === 1) {
        document.getElementById('roll-btn').style.display = 'inline-flex';
    } else {
        document.getElementById('roll-btn').style.display = 'none';
        setTimeout(makeAIMove, 700);
    }
}

// --------------------------------------------------------------------------
// BACKGAMMON LEGAL MOVE CALCULATORS
// --------------------------------------------------------------------------

function getLegalMoves(playerCode) {
    let moves = [];
    let opp = playerCode === 1 ? 2 : 1;
    let homePits = playerCode === 1 ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];

    // Check if player has pieces on the bar
    if (bar[playerCode - 1] > 0) {
        dice.forEach(die => {
            // P1 enters at point 24 - die (23 to 18). P2 enters at point die - 1 (0 to 5)
            let toIdx = playerCode === 1 ? 24 - die : die - 1;
            let dest = boardPoints[toIdx];
            
            // Valid if empty, own color, or 1 opponent checker (blot)
            if (dest.player === 0 || dest.player === playerCode || (dest.player === opp && dest.count === 1)) {
                moves.push({ fromBar: true, to: toIdx, die: die });
            }
        });
        return moves; // MUST clear bar first
    }

    // Check if all checkers are home for bearing off
    let allHome = true;
    let activePitsCount = 0;
    
    for (let i = 0; i < 24; i++) {
        if (boardPoints[i].player === playerCode) {
            activePitsCount += boardPoints[i].count;
            if (!homePits.includes(i)) {
                allHome = false;
            }
        }
    }
    // Total checkers home must equal 15 minus those already born off
    if (activePitsCount + off[playerCode - 1] < 15) {
        allHome = false;
    }

    // Regular board movement loops
    for (let i = 0; i < 24; i++) {
        let p = boardPoints[i];
        if (p.player === playerCode) {
            dice.forEach(die => {
                // P1 moves downwards (i - die), P2 moves upwards (i + die)
                let toIdx = playerCode === 1 ? i - die : i + die;

                if (toIdx >= 0 && toIdx < 24) {
                    let dest = boardPoints[toIdx];
                    if (dest.player === 0 || dest.player === playerCode || (dest.player === opp && dest.count === 1)) {
                        moves.push({ from: i, to: toIdx, die: die });
                    }
                } else if (allHome) {
                    // Bearing off validation
                    // Player 1 bears off by rolling beyond index 0 (toIdx < 0)
                    // Player 2 bears off by rolling beyond index 23 (toIdx >= 24)
                    let isBearingVal = playerCode === 1 ? (i - die === -1 || (i - die < -1 && isHighestPoint(i, playerCode))) : (i + die === 24 || (i + die > 24 && isHighestPoint(i, playerCode)));
                    
                    if (isBearingVal) {
                        moves.push({ from: i, to: -1, die: die });
                    }
                }
            });
        }
    }

    return moves;
}

function isHighestPoint(pointIdx, playerCode) {
    // Check if there are any checkers further away from bearing zone
    if (playerCode === 1) {
        // Home points are 0-5. Furthest point is index 5
        for (let i = 5; i > pointIdx; i--) {
            if (boardPoints[i].player === playerCode && boardPoints[i].count > 0) {
                return false;
            }
        }
    } else {
        // Home points are 18-23. Furthest point is index 18
        for (let i = 18; i < pointIdx; i++) {
            if (boardPoints[i].player === playerCode && boardPoints[i].count > 0) {
                return false;
            }
        }
    }
    return true;
}

function triggerGameOver(playerWins) {
    isGameOver = true;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-title').textContent = playerWins ? "VICTORY" : "AI CONQUERED";
    document.getElementById('game-over-title').style.color = playerWins ? "var(--neon-cyan)" : "var(--neon-magenta)";
    document.getElementById('game-over-msg').textContent = playerWins ? "You cleared all checkers!" : "AI born off all pieces.";
    updateStatusHUD("SIM COMPLETE");
}

// --------------------------------------------------------------------------
// HEURISTIC BACKGAMMON AI (WHITE)
// --------------------------------------------------------------------------

function makeAIMove() {
    if (isGameOver) return;

    if (!diceRolled) {
        rollDice();
        if (getLegalMoves(2).length === 0) {
            updateStatusHUD("AI HAS NO MOVES! PASSING");
            setTimeout(passTurn, 1500);
            return;
        }
    }

    // Make AI Move selection
    let moves = getLegalMoves(2);
    if (moves.length > 0) {
        let bestMove = selectBestAIMove(moves);
        if (bestMove) {
            executeCheckerMove(bestMove.fromBar ? -1 : bestMove.from, bestMove.to, bestMove.die, 2);
            
            // If moves remain, schedule next step recursively
            if (dice.length > 0) {
                setTimeout(makeAIMove, 700);
            }
        }
    } else {
        passTurn();
    }
}

function selectBestAIMove(moves) {
    let bestMove = null;
    let maxVal = -Infinity;

    moves.forEach(move => {
        let score = 0;
        let opp = 1;

        // Heuristics checks
        if (move.to === -1) {
            score += 40; // Bear off gets high priority
        } else {
            let dest = boardPoints[move.to];
            
            // 1. Hitting opponent blot
            if (dest.player === opp && dest.count === 1) {
                score += 50;
            }

            // 2. Making a point (2+ checkers)
            if (dest.player === 2 && dest.count >= 1) {
                score += 20;
            }
        }

        // 3. Advancing progress
        let fromIdx = move.fromBar ? -1 : move.from;
        let distMoved = move.die;
        score += distMoved * 0.5;

        if (score > maxVal) {
            maxVal = score;
            bestMove = move;
        }
    });

    return bestMove;
}

function calculateHint() {
    if (playerTurn !== 1 || !diceRolled || isGameOver) return;

    let moves = getLegalMoves(1);
    if (moves.length === 0) return;

    let bestMove = null;
    let maxVal = -Infinity;

    moves.forEach(move => {
        let score = 0;
        let opp = 2;

        if (move.to === -1) {
            score += 40; // Bear off
        } else {
            let dest = boardPoints[move.to];
            if (dest.player === opp && dest.count === 1) {
                score += 50; // Hit blot
            }
            if (dest.player === 1 && dest.count >= 1) {
                score += 20; // Build point
            }
        }

        let distMoved = move.die;
        score += distMoved * 0.5;

        if (score > maxVal) {
            maxVal = score;
            bestMove = move;
        }
    });

    if (bestMove) {
        hintMoveObj = bestMove;
    }
}

function drawMovementDirections() {
    push();
    let topLeft = getPointGeometry(23);
    let topRight = getPointGeometry(12);
    let bottomLeft = getPointGeometry(11);
    let bottomRight = getPointGeometry(0);

    let yTop = topLeft.y1 + boardHeight * 0.22;
    let yBottom = bottomLeft.y1 - boardHeight * 0.22;
    
    let xLeftLimit = topLeft.x3;
    let xRightLimit = topRight.x3;
    
    let flowOffset = (frameCount * 1.5) % 40;

    // 1. Draw CYAN path (Player 1)
    stroke(0, 242, 254, 180);
    strokeWeight(3.5);
    noFill();
    
    // Top row: left to right
    line(xLeftLimit, yTop - 15, xRightLimit, yTop - 15);
    // Wrap-down curve
    bezier(xRightLimit, yTop - 15, xRightLimit + 90, yTop + 40, xLeftLimit - 90, yBottom - 40, xLeftLimit, yBottom - 15);
    // Bottom row: left to right
    line(xLeftLimit, yBottom - 15, xRightLimit, yBottom - 15);
    
    // Cyan flow dots
    fill(0, 242, 254);
    noStroke();
    for (let x = xLeftLimit + flowOffset; x < xRightLimit; x += 40) {
        ellipse(x, yTop - 15, 6);
    }
    for (let x = xLeftLimit + flowOffset; x < xRightLimit; x += 40) {
        ellipse(x, yBottom - 15, 6);
    }
    
    // 2. Draw MAGENTA path (AI)
    stroke(255, 0, 127, 180);
    strokeWeight(3.5);
    noFill();
    
    // Bottom row: right to left
    line(xRightLimit, yBottom + 15, xLeftLimit, yBottom + 15);
    // Wrap-up curve
    bezier(xLeftLimit, yBottom + 15, xLeftLimit - 90, yBottom - 40, xRightLimit + 90, yTop + 40, xRightLimit, yTop + 15);
    // Top row: right to left
    line(xRightLimit, yTop + 15, xLeftLimit, yTop + 15);
    
    // Magenta flow dots
    fill(255, 0, 127);
    noStroke();
    for (let x = xRightLimit - flowOffset; x > xLeftLimit; x -= 40) {
        ellipse(x, yBottom + 15, 6);
    }
    for (let x = xRightLimit - flowOffset; x > xLeftLimit; x -= 40) {
        ellipse(x, yTop + 15, 6);
    }
    
    pop();
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
