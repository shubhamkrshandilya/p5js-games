// Cyber Pente Grammai - sketch.js
const BOARD_SIZE = 5;
const SACRED_LINE = 2; // Central horizontal line (y = 2)

// Board grid: 0: empty, 1: Player (Blue), 2: AI (Red)
let grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
let activePlayer = 1; // 1: Player, 2: AI
let gamePhase = "PLACING"; // "PLACING", "MOVING"
let isGameOver = false;

// Piece counts for placement
let playerPlaced = 0;
let aiPlaced = 0;
const MAX_PIECES = 5;

// Captured scores
let playerCaptures = 0;
let aiCaptures = 0;
const WINNING_CAPTURES = 5;

// Selection coordinates for moving phase
let selectedX = -1;
let selectedY = -1;
let validMoves = [];

// Rendering sizes
let boardPadding = 50;
let cellSize;
let boardLeft, boardTop;
let boardWidth;

// Particles visual triggers
let particles = [];
let advisoryMove = null;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM hooks
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('hint-btn').addEventListener('click', calculateAdvisory);

    restartGame();
}

function draw() {
    background(4, 5, 8);

    boardWidth = Math.min(width, height) * 0.82;
    cellSize = (boardWidth - boardPadding * 2) / (BOARD_SIZE - 1);
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2.2 - boardWidth / 2;

    // Draw lines and central sacred line highlights
    drawBoardLines();

    // Draw valid moves and advisor highlights
    drawValidMovesAndAdvisory();

    // Draw placed stones
    drawStones();

    // Update and draw visual capture bursts
    drawParticles();
}

function restartGame() {
    grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    activePlayer = 1;
    gamePhase = "PLACING";
    isGameOver = false;
    playerPlaced = 0;
    aiPlaced = 0;
    playerCaptures = 0;
    aiCaptures = 0;
    selectedX = -1;
    selectedY = -1;
    validMoves = [];
    particles = [];
    advisoryMove = null;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-captures-val').textContent = 0;
    document.getElementById('ai-captures-val').textContent = 0;
    document.getElementById('state-val').textContent = "PLACING";
    updateHUDStatus("YOUR TURN: PLACE SHIELD");
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

// Generate valid orthoganal moves for moving phase
function getValidMoves(x, y, board = grid) {
    if (board[y][x] === 0) return [];
    let moves = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    for (let d of dirs) {
        let nx = x + d[0];
        let ny = y + d[1];
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (board[ny][nx] === 0) {
                moves.push({x: nx, y: ny});
            }
        }
    }
    return moves;
}

// Check if a faction has any valid moves (for block check)
function hasMoves(faction, board = grid) {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === faction) {
                let moves = getValidMoves(x, y, board);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}

// Mouse inputs
function mousePressed() {
    if (isGameOver || activePlayer !== 1) return;

    let mx = mouseX - boardLeft - boardPadding;
    let my = mouseY - boardTop - boardPadding;
    
    let bx = Math.round(mx / cellSize);
    let by = Math.round(my / cellSize);

    if (bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE) {
        if (gamePhase === "PLACING") {
            // Placing phase
            if (grid[by][bx] === 0 && playerPlaced < MAX_PIECES) {
                executePlacement(bx, by, 1);
                playerPlaced++;
                advisoryMove = null;
                
                checkPhaseChange();
                
                if (!isGameOver) {
                    activePlayer = 2;
                    updateHUDStatus("AI THINKING...");
                    setTimeout(makeAIMove, 500);
                }
            }
        } else {
            // Moving phase
            let isMove = validMoves.some(m => m.x === bx && m.y === by);
            if (isMove) {
                executeMove(selectedX, selectedY, bx, by);
                selectedX = -1;
                selectedY = -1;
                validMoves = [];
                advisoryMove = null;

                if (!isGameOver) {
                    activePlayer = 2;
                    updateHUDStatus("AI THINKING...");
                    setTimeout(makeAIMove, 500);
                }
            } else {
                if (grid[by][bx] === 1) {
                    selectedX = bx;
                    selectedY = by;
                    validMoves = getValidMoves(bx, by);
                } else {
                    selectedX = -1;
                    selectedY = -1;
                    validMoves = [];
                }
            }
        }
    }
}

function checkPhaseChange() {
    if (playerPlaced === MAX_PIECES && aiPlaced === MAX_PIECES) {
        gamePhase = "MOVING";
        document.getElementById('state-val').textContent = "MOVING";
    }
}

function executePlacement(x, y, faction, board = grid, isReal = true) {
    board[y][x] = faction;
    if (isReal) {
        triggerCaptureVisual(x, y, faction);
    }
}

function executeMove(sx, sy, ex, ey, board = grid, isReal = true) {
    const faction = board[sy][sx];
    board[sy][sx] = 0;
    board[ey][ex] = faction;

    // Resolve captures (sandwich custody captures)
    const opponent = faction === 1 ? 2 : 1;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let captures = [];

    for (let d of dirs) {
        let n1x = ex + d[0];
        let n1y = ey + d[1];
        let n2x = ex + d[0] * 2;
        let n2y = ey + d[1] * 2;

        if (n1x >= 0 && n1x < BOARD_SIZE && n1y >= 0 && n1y < BOARD_SIZE &&
            n2x >= 0 && n2x < BOARD_SIZE && n2y >= 0 && n2y < BOARD_SIZE) {
            
            let midPiece = board[n1y][n1x];
            let flankPiece = board[n2y][n2x];

            if (midPiece === opponent && flankPiece === faction) {
                captures.push({x: n1x, y: n1y});
            }
        }
    }

    // Apply captures
    for (let cap of captures) {
        board[cap.y][cap.x] = 0;
        if (isReal) {
            triggerCaptureVisual(cap.x, cap.y, 3); // Gold explosion
            if (faction === 1) {
                playerCaptures++;
                document.getElementById('player-captures-val').textContent = playerCaptures;
            } else {
                aiCaptures++;
                document.getElementById('ai-captures-val').textContent = aiCaptures;
            }
        }
    }

    if (isReal) {
        // Check capture threshold win condition
        if (playerCaptures >= WINNING_CAPTURES) {
            endSimulation(true, "VICTORY! You captured 5 shields.");
            return;
        }
        if (aiCaptures >= WINNING_CAPTURES) {
            endSimulation(false, "SYSTEM OVERLOAD: AI captured 5 shields.");
            return;
        }

        // Check block win condition
        if (gamePhase === "MOVING") {
            const nextFaction = faction === 1 ? 2 : 1;
            if (!hasMoves(nextFaction, board)) {
                if (nextFaction === 2) {
                    endSimulation(true, "VICTORY! AI has no moves.");
                } else {
                    endSimulation(false, "SYSTEM BLOCKED: You have no moves.");
                }
            }
        }
    }
}

// AI - Minimax with Alpha-Beta Pruning (Depth 2)
function makeAIMove() {
    if (isGameOver) return;

    if (gamePhase === "PLACING") {
        // Placement AI: evaluate all empty positions
        let bestScore = -Infinity;
        let bestPos = null;

        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (grid[y][x] === 0) {
                    let score = evaluatePlacementScore(x, y);
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = {x: x, y: y};
                    }
                }
            }
        }

        if (bestPos) {
            executePlacement(bestPos.x, bestPos.y, 2);
            aiPlaced++;
            checkPhaseChange();
        }
    } else {
        // Movement AI: Minimax depth 2
        let bestScore = -Infinity;
        let bestMove = null;

        let moves = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (grid[y][x] === 2) {
                    let valids = getValidMoves(x, y);
                    for (let vm of valids) {
                        moves.push({sx: x, sy: y, ex: vm.x, ey: vm.y});
                    }
                }
            }
        }

        for (let m of moves) {
            let clone = grid.map(row => [...row]);
            executeMove(m.sx, m.sy, m.ex, m.ey, clone, false);
            
            let evalVal = minimax(clone, 1, false, -Infinity, Infinity);
            if (evalVal > bestScore) {
                bestScore = evalVal;
                bestMove = m;
            }
        }

        if (bestMove) {
            executeMove(bestMove.sx, bestMove.sy, bestMove.ex, bestMove.ey);
        }
    }

    if (!isGameOver) {
        activePlayer = 1;
        updateHUDStatus("YOUR TURN");
    }
}

// Evaluate best spots for placing shields
function evaluatePlacementScore(x, y) {
    let score = 0;
    
    // Favor central Sacred Line
    if (y === SACRED_LINE) score += 50;

    // Check adjacent empty cell counts (placements near center are better)
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (let d of dirs) {
        let nx = x + d[0];
        let ny = y + d[1];
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (grid[ny][nx] === 0) score += 10;
            if (grid[ny][nx] === 1) score += 5; // Place near player for trapping potential
        }
    }

    return score;
}

// Minimax with Alpha-Beta
function minimax(board, depth, isMaximizing, alpha, beta) {
    if (depth === 0) return evaluateBoard(board);

    if (isMaximizing) {
        let maxEval = -Infinity;
        let moves = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] === 2) {
                    let valids = getValidMoves(x, y, board);
                    for (let vm of valids) {
                        moves.push({sx: x, sy: y, ex: vm.x, ey: vm.y});
                    }
                }
            }
        }
        for (let m of moves) {
            let clone = board.map(row => [...row]);
            executeMove(m.sx, m.sy, m.ex, m.ey, clone, false);
            let evalVal = minimax(clone, depth - 1, false, alpha, beta);
            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        let moves = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] === 1) {
                    let valids = getValidMoves(x, y, board);
                    for (let vm of valids) {
                        moves.push({sx: x, sy: y, ex: vm.x, ey: vm.y});
                    }
                }
            }
        }
        for (let m of moves) {
            let clone = board.map(row => [...row]);
            executeMove(m.sx, m.sy, m.ex, m.ey, clone, false);
            let evalVal = minimax(clone, depth - 1, true, alpha, beta);
            minEval = Math.min(minEval, evalVal);
            beta = Math.min(beta, evalVal);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Heuristic Evaluation of Pente Grammai grid state
function evaluateBoard(board) {
    let score = 0;

    let aiStones = 0;
    let playerStones = 0;
    
    // Count pieces on the Sacred Line (y = 2)
    let aiOnSacred = 0;
    let playerOnSacred = 0;

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let p = board[y][x];
            if (p === 2) {
                aiStones++;
                if (y === SACRED_LINE) aiOnSacred++;
            } else if (p === 1) {
                playerStones++;
                if (y === SACRED_LINE) playerOnSacred++;
            }
        }
    }

    // Weight capture states
    score += (aiCaptures - playerCaptures) * 400;

    // Weight active stone counts (losing stones is bad)
    score += (aiStones - playerStones) * 200;

    // Sacred line domination
    score += (aiOnSacred - playerOnSacred) * 60;

    return score;
}

// Calculate advisory hint recommendation
function calculateAdvisory() {
    if (isGameOver || activePlayer !== 1) return;

    if (gamePhase === "PLACING") {
        // Placement advice
        let bestScore = -Infinity;
        let bestPos = null;
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (grid[y][x] === 0) {
                    let score = evaluatePlacementScore(x, y);
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = {x: x, y: y};
                    }
                }
            }
        }
        if (bestPos) {
            advisoryMove = {sx: bestPos.x, sy: bestPos.y, ex: bestPos.x, ey: bestPos.y};
        }
    } else {
        // Movement advice
        let bestScore = Infinity; // Player wants to MINIMIZE score relative to AI
        let bestMove = null;

        let moves = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (grid[y][x] === 1) {
                    let valids = getValidMoves(x, y);
                    for (let vm of valids) {
                        moves.push({sx: x, sy: y, ex: vm.x, ey: vm.y});
                    }
                }
            }
        }

        for (let m of moves) {
            let clone = grid.map(row => [...row]);
            executeMove(m.sx, m.sy, m.ex, m.ey, clone, false);
            
            let evalVal = minimax(clone, 1, true, -Infinity, Infinity);
            if (evalVal < bestScore) {
                bestScore = evalVal;
                bestMove = m;
            }
        }

        if (bestMove) {
            advisoryMove = bestMove;
        }
    }
}

function drawValidMovesAndAdvisory() {
    // 1. Draw valid move circles
    if (selectedX !== -1) {
        noStroke();
        fill(0, 242, 254, 45);
        for (let m of validMoves) {
            let cx = boardLeft + boardPadding + m.x * cellSize;
            let cy = boardTop + boardPadding + m.y * cellSize;
            circle(cx, cy, cellSize * 0.35);
        }
    }

    // 2. Highlight advisory recommendations
    if (advisoryMove) {
        stroke(0, 255, 102, 200);
        strokeWeight(2.5);
        noFill();
        
        let sx = boardLeft + boardPadding + advisoryMove.sx * cellSize;
        let sy = boardTop + boardPadding + advisoryMove.sy * cellSize;
        let ex = boardLeft + boardPadding + advisoryMove.ex * cellSize;
        let ey = boardTop + boardPadding + advisoryMove.ey * cellSize;

        circle(sx, sy, cellSize * 0.85);
        if (gamePhase === "MOVING") {
            circle(ex, ey, cellSize * 0.85);
            stroke(0, 255, 102, 120);
            line(sx, sy, ex, ey);
        }
    }
}

// Draw the parallel lines (Pente Grammai layout)
function drawBoardLines() {
    stroke(255, 255, 255, 12);
    strokeWeight(1.5);
    
    // Draw vertical guidelines
    for (let c = 0; c < BOARD_SIZE; c++) {
        let x = boardLeft + boardPadding + c * cellSize;
        line(x, boardTop + boardPadding, x, boardTop + boardWidth - boardPadding);
    }

    // Draw horizontal grid lines
    for (let r = 0; r < BOARD_SIZE; r++) {
        let y = boardTop + boardPadding + r * cellSize;
        
        if (r === SACRED_LINE) {
            // Draw central Sacred Line highlighted
            stroke(255, 215, 0, 180);
            strokeWeight(3);
            line(boardLeft + boardPadding, y, boardLeft + boardWidth - boardPadding, y);
            
            // Draw label
            noStroke();
            fill(255, 215, 0, 150);
            textSize(8);
            textAlign(LEFT, CENTER);
            text("SACRED LINE", boardLeft + boardPadding + 10, y - 10);
            
            stroke(255, 255, 255, 12);
            strokeWeight(1.5);
        } else {
            line(boardLeft + boardPadding, y, boardLeft + boardWidth - boardPadding, y);
        }
    }
}

function drawStones() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let piece = grid[y][x];
            if (piece === 0) continue;

            let cx = boardLeft + boardPadding + x * cellSize;
            let cy = boardTop + boardPadding + y * cellSize;

            // Highlight selection
            if (x === selectedX && y === selectedY) {
                stroke(255, 255, 255, 220);
                strokeWeight(2.5);
                noFill();
                ellipse(cx, cy, cellSize * 0.82);
            }

            noStroke();
            if (piece === 1) {
                // Player (Cyan glass)
                fill(0, 242, 254, 50);
                circle(cx, cy, cellSize * 0.7);
                fill(0, 242, 254, 210);
                circle(cx, cy, cellSize * 0.46);
                stroke(255, 120);
                strokeWeight(1);
                noFill();
                circle(cx, cy, cellSize * 0.22);
            } else {
                // AI (Red glass)
                fill(255, 0, 127, 50);
                circle(cx, cy, cellSize * 0.7);
                fill(255, 0, 127, 210);
                circle(cx, cy, cellSize * 0.46);
                stroke(255, 120);
                strokeWeight(1);
                line(cx - 3, cy - 3, cx + 3, cy + 3);
                line(cx + 3, cy - 3, cx - 3, cy + 3);
            }
        }
    }
}

function triggerCaptureVisual(bx, by, type) {
    let px = boardLeft + boardPadding + bx * cellSize;
    let py = boardTop + boardPadding + by * cellSize;
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
        updateHUDStatus("SYSTEM FAILURE!");
    }
}
