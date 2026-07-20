// Cyber Hnefatafl (Viking Board Game) - sketch.js
const BOARD_SIZE = 11;
const THRONE_X = 5;
const THRONE_Y = 5;

// Board representation
// 0: empty, 1: Defender, 2: Attacker, 3: King (Defender Faction)
let grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
let activePlayer = 1; // 1: Defenders (you), 2: Attackers (AI)
let isGameOver = false;
let gameStatusMsg = "";

// Selection state
let selectedX = -1;
let selectedY = -1;
let validMoves = [];

// Faction role info
let playerFaction = 1; // Always 1 (Defenders) for user
let aiFaction = 2;     // Always 2 (Attackers) for AI

// Captured metrics
let attackersCaptured = 0;
let defendersCaptured = 0;

// Rendering metrics
let boardPadding = 40;
let cellSize;
let boardLeft, boardTop;
let boardWidth;

// Visual effects
let particles = [];
let advisoryMove = null;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Attach DOM listeners
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('hint-btn').addEventListener('click', calculateAdvisory);

    restartGame();
}

function draw() {
    background(4, 5, 8);

    // Dynamic layout sizing
    boardWidth = Math.min(width, height) * 0.86;
    cellSize = (boardWidth - boardPadding * 2) / (BOARD_SIZE - 1);
    boardLeft = width / 2 - boardWidth / 2;
    boardTop = height / 2 - boardWidth / 2;

    // Draw Hnefatafl Board
    drawGridBoard();
    drawSpecialSquares();
    drawValidMoves();
    drawAdvisory();
    drawPieces();
    
    // Update and draw visual capture bursts
    drawParticles();
}

// Set up the Hnefatafl Board with Fetlar starting configuration
function restartGame() {
    grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    // Place King in the center
    grid[THRONE_Y][THRONE_X] = 3;

    // Place Defenders (12 pieces in a diamond)
    const defenderCoords = [
        [5,3], [5,4], [5,6], [5,7],
        [3,5], [4,5], [6,5], [7,5],
        [4,4], [4,6], [6,4], [6,6]
    ];
    for (let c of defenderCoords) {
        grid[c[1]][c[0]] = 1;
    }

    // Place Attackers (24 pieces along edges)
    const attackerCoords = [
        // Top T
        [3,0], [4,0], [5,0], [6,0], [7,0], [5,1],
        // Bottom T
        [3,10], [4,10], [5,10], [6,10], [7,10], [5,9],
        // Left T
        [0,3], [0,4], [0,5], [0,6], [0,7], [1,5],
        // Right T
        [10,3], [10,4], [10,5], [10,6], [10,7], [9,5]
    ];
    for (let c of attackerCoords) {
        grid[c[1]][c[0]] = 2;
    }

    // Reset game states
    activePlayer = 1;
    isGameOver = false;
    selectedX = -1;
    selectedY = -1;
    validMoves = [];
    attackersCaptured = 0;
    defendersCaptured = 0;
    particles = [];
    advisoryMove = null;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('attackers-captured-val').textContent = 0;
    document.getElementById('defenders-captured-val').textContent = 0;
    updateHUDStatus("YOUR TURN");
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

// Check if a coordinate is a corner escape square
function isCorner(x, y) {
    return (x === 0 || x === BOARD_SIZE - 1) && (y === 0 || y === BOARD_SIZE - 1);
}

// Check if a coordinate is the central throne square
function isThrone(x, y) {
    return x === THRONE_X && y === THRONE_Y;
}

// Generate valid moves for a piece at (x, y) on the given board
function getValidMoves(x, y, board = grid) {
    const p = board[y][x];
    if (p === 0) return [];
    
    let moves = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    for (let d of dirs) {
        let nx = x + d[0];
        let ny = y + d[1];
        
        while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            // Can't move through non-empty squares
            if (board[ny][nx] !== 0) break;
            
            // Throne and corners are restricted to King only
            if (isCorner(nx, ny) || isThrone(nx, ny)) {
                if (p === 3) {
                    moves.push({x: nx, y: ny});
                }
            } else {
                moves.push({x: nx, y: ny});
            }
            
            nx += d[0];
            ny += d[1];
        }
    }
    return moves;
}

// Handle Mouse Clicks to Select or Move Pieces
function mousePressed() {
    if (isGameOver || activePlayer !== 1) return;

    // Convert mouse to board coordinate
    let mx = mouseX - boardLeft - boardPadding;
    let my = mouseY - boardTop - boardPadding;
    
    let bx = Math.round(mx / cellSize);
    let by = Math.round(my / cellSize);

    if (bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE) {
        // If they click on a valid move destination
        let isMove = validMoves.some(m => m.x === bx && m.y === by);
        if (isMove) {
            executeMove(selectedX, selectedY, bx, by);
            selectedX = -1;
            selectedY = -1;
            validMoves = [];
            
            if (!isGameOver) {
                activePlayer = 2;
                updateHUDStatus("AI THINKING...");
                setTimeout(makeAIMove, 450); // Pause for natural effect
            }
        } else {
            // Select piece (Must be Player Faction: Defender (1) or King (3))
            const piece = grid[by][bx];
            if (piece === 1 || piece === 3) {
                selectedX = bx;
                selectedY = by;
                validMoves = getValidMoves(bx, by);
                advisoryMove = null; // Reset advisory
            } else {
                selectedX = -1;
                selectedY = -1;
                validMoves = [];
            }
        }
    }
}

// Move a piece from (sx, sy) to (ex, ey) and handle sandwich captures
function executeMove(sx, sy, ex, ey, board = grid, isReal = true) {
    const piece = board[sy][sx];
    board[sy][sx] = 0;
    board[ey][ex] = piece;

    // Capture logic
    const oppFaction = (piece === 1 || piece === 3) ? 2 : 1; // Target faction to capture
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let captures = [];

    for (let d of dirs) {
        let n1x = ex + d[0];
        let n1y = ey + d[1];
        let n2x = ex + d[0] * 2;
        let n2y = ey + d[1] * 2;

        if (n1x >= 0 && n1x < BOARD_SIZE && n1y >= 0 && n1y < BOARD_SIZE) {
            let target = board[n1y][n1x];
            
            // Check if there is an opponent piece adjacent
            if (target !== 0 && (target === oppFaction || (oppFaction === 1 && target === 3))) {
                // To sandwich, the opposite cell (n2) must be:
                // - A friendly piece (excluding the King acting as attacker, but King is a defender so yes)
                // - A corner escape square
                // - An empty Throne square
                let isSandwich = false;
                if (n2x >= 0 && n2x < BOARD_SIZE && n2y >= 0 && n2y < BOARD_SIZE) {
                    let flank = board[n2y][n2x];
                    
                    if (target === 3) {
                        // King capture requires 4-sided surround (or 3-sided if against throne/edge)
                        isSandwich = checkKingCapture(n1x, n1y, board);
                    } else {
                        // Regular piece capture
                        let flankFriendly = (flank !== 0 && flank !== oppFaction);
                        let flankHostile = isCorner(n2x, n2y) || (isThrone(n2x, n2y) && board[n2y][n2x] === 0);
                        if (flankFriendly || flankHostile) {
                            isSandwich = true;
                        }
                    }
                } else {
                    // Border capture check (regular piece cannot be captured against borders, only corners or Throne)
                    if (target === 3) {
                        isSandwich = checkKingCapture(n1x, n1y, board);
                    }
                }

                if (isSandwich) {
                    captures.push({x: n1x, y: n1y, type: target});
                }
            }
        }
    }

    // Apply captures
    for (let cap of captures) {
        board[cap.y][cap.x] = 0;
        if (isReal) {
            triggerCaptureVisual(cap.x, cap.y, cap.type);
            if (cap.type === 2) {
                attackersCaptured++;
                document.getElementById('attackers-captured-val').textContent = attackersCaptured;
            } else if (cap.type === 1) {
                defendersCaptured++;
                document.getElementById('defenders-captured-val').textContent = defendersCaptured;
            } else if (cap.type === 3) {
                // King captured - Attackers Win!
                endSimulation(false, "King Captured! Attackers Win.");
            }
        }
    }

    // Check if King escaped to a corner
    if (isReal && piece === 3 && isCorner(ex, ey)) {
        endSimulation(true, "King Escaped! Defenders Win.");
    }
}

// Special surround rules for capturing the King
function checkKingCapture(kx, ky, board) {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let attackersCount = 0;
    
    for (let d of dirs) {
        let nx = kx + d[0];
        let ny = ky + d[1];
        
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            let neighbor = board[ny][nx];
            // Neighbors that act as hostile/capturing elements for the King:
            // - An Attacker (2)
            // - The Throne (whether occupied or empty)
            // - The board edge
            if (neighbor === 2 || isThrone(nx, ny)) {
                attackersCount++;
            }
        } else {
            // Edge counts as a surrounding element
            attackersCount++;
        }
    }
    return attackersCount === 4;
}

// AI - Minimax with Alpha-Beta Pruning (Depth 2)
function makeAIMove() {
    if (isGameOver) return;
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Gather all valid moves for Attackers
    let moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (grid[y][x] === 2) { // Attacker
                let valids = getValidMoves(x, y);
                for (let vm of valids) {
                    moves.push({sx: x, sy: y, ex: vm.x, ey: vm.y});
                }
            }
        }
    }

    // Evaluate all attacker moves using minimax
    for (let m of moves) {
        // Clone board
        let boardClone = grid.map(row => [...row]);
        
        // Execute move on clone
        executeMove(m.sx, m.sy, m.ex, m.ey, boardClone, false);
        
        // Check immediate win
        if (isKingCapturedOnBoard(boardClone)) {
            bestMove = m;
            break;
        }

        let score = minimax(boardClone, 1, false, -Infinity, Infinity);
        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }

    if (bestMove) {
        executeMove(bestMove.sx, bestMove.sy, bestMove.ex, bestMove.ey);
    }
    
    if (!isGameOver) {
        activePlayer = 1;
        updateHUDStatus("YOUR TURN");
    }
}

// Check if King is dead on board clone
function isKingCapturedOnBoard(board) {
    let kingAlive = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === 3) kingAlive = true;
        }
    }
    return !kingAlive;
}

// Check if King has reached corners on board clone
function isKingEscapedOnBoard(board) {
    return isCorner(0, 0) && (board[0][0] === 3) ||
           isCorner(0, 10) && (board[10][0] === 3) ||
           isCorner(10, 0) && (board[0][10] === 3) ||
           isCorner(10, 10) && (board[10][10] === 3);
}

// Minimax with Alpha-Beta
function minimax(board, depth, isMaximizing, alpha, beta) {
    // Terminal state checks
    if (isKingCapturedOnBoard(board)) return 100000 + depth;
    if (isKingEscapedOnBoard(board)) return -100000 - depth;
    if (depth === 0) return evaluateBoard(board);

    if (isMaximizing) {
        // Attackers Turn
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
        // Defenders Turn
        let minEval = Infinity;
        let moves = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                let p = board[y][x];
                if (p === 1 || p === 3) {
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

// Heuristic Evaluation of the Board
// Score relative to Attackers (higher is better for Attackers/AI)
function evaluateBoard(board) {
    let score = 0;
    
    let attackers = 0;
    let defenders = 0;
    let kingX = -1, kingY = -1;

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let p = board[y][x];
            if (p === 2) attackers++;
            else if (p === 1) defenders++;
            else if (p === 3) {
                kingX = x;
                kingY = y;
            }
        }
    }

    // Count difference
    score += (attackers * 120);
    score -= (defenders * 180);

    if (kingX !== -1) {
        // King Escape distance evaluation (Defenders want distance to corner to be 0)
        let corners = [[0,0], [0,10], [10,0], [10,10]];
        let minDistance = Infinity;
        for (let c of corners) {
            let d = Math.abs(kingX - c[0]) + Math.abs(kingY - c[1]);
            minDistance = Math.min(minDistance, d);
        }
        score += minDistance * 60; // Attackers want distance to corners to be high

        // Attacker proximity to King (Attackers want to surround King)
        let surrounds = 0;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let d of dirs) {
            let nx = kingX + d[0];
            let ny = kingY + d[1];
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (board[ny][nx] === 2) surrounds++;
            }
        }
        score += surrounds * 150; // Attackers want surrounds to be high
    }

    return score;
}

// Trigger Visual Explosion of Capture particles
function triggerCaptureVisual(bx, by, type) {
    let px = boardLeft + boardPadding + bx * cellSize;
    let py = boardTop + boardPadding + by * cellSize;
    let col = color(255, 0, 127); // Magenta for attackers
    if (type === 1) col = color(0, 242, 254); // Cyan for defenders
    if (type === 3) col = color(255, 215, 0); // Gold for King

    for (let i = 0; i < 18; i++) {
        particles.push({
            x: px,
            y: py,
            vx: random(-3, 3),
            vy: random(-3, 3),
            alpha: 255,
            size: random(3, 8),
            color: col
        });
    }
}

// Draw board lines and cells
function drawGridBoard() {
    stroke(255, 255, 255, 10);
    strokeWeight(1);
    
    // Draw cells
    for (let i = 0; i < BOARD_SIZE; i++) {
        let x = boardLeft + boardPadding + i * cellSize;
        let y = boardTop + boardPadding + i * cellSize;
        
        // Vertical lines
        line(x, boardTop + boardPadding, x, boardTop + boardWidth - boardPadding);
        // Horizontal lines
        line(boardLeft + boardPadding, y, boardLeft + boardWidth - boardPadding, y);
    }
}

// Special Throne and Corners layout
function drawSpecialSquares() {
    // Corner crosshairs
    const corners = [
        [0, 0], [0, BOARD_SIZE-1], 
        [BOARD_SIZE-1, 0], [BOARD_SIZE-1, BOARD_SIZE-1]
    ];
    
    strokeWeight(2);
    for (let c of corners) {
        let cx = boardLeft + boardPadding + c[0] * cellSize;
        let cy = boardTop + boardPadding + c[1] * cellSize;
        
        stroke(255, 215, 0, 140);
        noFill();
        rect(cx - cellSize/2 + 2, cy - cellSize/2 + 2, cellSize - 4, cellSize - 4, 4);
        
        // Cross lines inside corner
        stroke(255, 215, 0, 180);
        line(cx - cellSize/3, cy - cellSize/3, cx + cellSize/3, cy + cellSize/3);
        line(cx + cellSize/3, cy - cellSize/3, cx - cellSize/3, cy + cellSize/3);
    }

    // Central Throne
    let tx = boardLeft + boardPadding + THRONE_X * cellSize;
    let ty = boardTop + boardPadding + THRONE_Y * cellSize;
    stroke(0, 242, 254, 120);
    fill(0, 242, 254, 15);
    rect(tx - cellSize/2 + 2, ty - cellSize/2 + 2, cellSize - 4, cellSize - 4, 4);
    
    // Cross design on Throne
    stroke(0, 242, 254, 150);
    line(tx - cellSize/4, ty, tx + cellSize/4, ty);
    line(tx, ty - cellSize/4, tx, ty + cellSize/4);
}

// Draw valid moves for selected piece
function drawValidMoves() {
    if (selectedX !== -1) {
        noStroke();
        fill(0, 242, 254, 45);
        for (let m of validMoves) {
            let cx = boardLeft + boardPadding + m.x * cellSize;
            let cy = boardTop + boardPadding + m.y * cellSize;
            circle(cx, cy, cellSize * 0.35);
        }
    }
}

// Draw piece tokens
function drawPieces() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const piece = grid[y][x];
            if (piece === 0) continue;

            let cx = boardLeft + boardPadding + x * cellSize;
            let cy = boardTop + boardPadding + y * cellSize;

            // Highlight selected piece
            if (x === selectedX && y === selectedY) {
                stroke(255, 255, 255, 220);
                strokeWeight(2);
                noFill();
                ellipse(cx, cy, cellSize * 0.85);
            }

            noStroke();
            if (piece === 1) {
                // Defender
                fill(0, 242, 254, 50);
                circle(cx, cy, cellSize * 0.72);
                fill(0, 242, 254, 220);
                circle(cx, cy, cellSize * 0.48);
                // Inner shield detail
                stroke(255, 255, 255, 120);
                strokeWeight(1);
                noFill();
                circle(cx, cy, cellSize * 0.25);
            } else if (piece === 2) {
                // Attacker
                fill(255, 0, 127, 50);
                circle(cx, cy, cellSize * 0.72);
                fill(255, 0, 127, 220);
                circle(cx, cy, cellSize * 0.48);
                // Inner cross detail
                stroke(255, 255, 255, 120);
                strokeWeight(1);
                line(cx - 3, cy - 3, cx + 3, cy + 3);
                line(cx + 3, cy - 3, cx - 3, cy + 3);
            } else if (piece === 3) {
                // King
                fill(255, 215, 0, 60);
                circle(cx, cy, cellSize * 0.84);
                fill(255, 215, 0, 230);
                circle(cx, cy, cellSize * 0.58);
                // Crown shape/star detail
                fill(255, 255, 255, 200);
                noStroke();
                ellipse(cx, cy, cellSize * 0.2);
            }
        }
    }
}

// Particle system updates
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 6;
        p.size *= 0.96;
        
        noStroke();
        let c = color(red(p.color), green(p.color), blue(p.color), p.alpha);
        fill(c);
        circle(p.x, p.y, p.size);

        if (p.alpha <= 0 || p.size < 0.5) {
            particles.splice(i, 1);
        }
    }
}

// End Simulation Overlay popup
function endSimulation(defendersEscaped, msg) {
    isGameOver = true;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-msg').textContent = msg;
    
    if (defendersEscaped) {
        document.getElementById('game-over-title').textContent = "SIMULATION COMPLETE";
        document.getElementById('game-over-title').style.color = "var(--neon-cyan)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(0, 242, 254, 0.6)";
        updateHUDStatus("DEFENDERS ESCAPED!");
    } else {
        document.getElementById('game-over-title').textContent = "SYSTEM OVERLOADED";
        document.getElementById('game-over-title').style.color = "var(--neon-magenta)";
        document.getElementById('game-over-title').style.textShadow = "0 0 15px rgba(255, 0, 127, 0.6)";
        updateHUDStatus("KING CAPTURED!");
    }
}

// Hint Button Advisory - runs MiniMax evaluation for the player to recommend the best move
function calculateAdvisory() {
    if (isGameOver || activePlayer !== 1) return;

    let bestScore = Infinity; // Defenders want to MINIMIZE the score
    let bestMove = null;

    let moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let p = grid[y][x];
            if (p === 1 || p === 3) {
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
        
        // If it is an immediate escape, choose it immediately
        if (isKingEscapedOnBoard(clone)) {
            bestMove = m;
            break;
        }

        let score = minimax(clone, 1, true, -Infinity, Infinity);
        if (score < bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }

    if (bestMove) {
        advisoryMove = bestMove;
    }
}

// Highlight the advisory move if present
function drawAdvisory() {
    if (advisoryMove) {
        stroke(0, 255, 102, 200);
        strokeWeight(2.5);
        noFill();
        
        let sx = boardLeft + boardPadding + advisoryMove.sx * cellSize;
        let sy = boardTop + boardPadding + advisoryMove.sy * cellSize;
        let ex = boardLeft + boardPadding + advisoryMove.ex * cellSize;
        let ey = boardTop + boardPadding + advisoryMove.ey * cellSize;

        // Draw selection circle on start
        circle(sx, sy, cellSize * 0.9);
        
        // Draw target circle on end
        circle(ex, ey, cellSize * 0.9);
        
        // Draw connecting arrow
        stroke(0, 255, 102, 120);
        line(sx, sy, ex, ey);
    }
}
