// Cyber Chess - Classic Retro Arcade with Minimax AI
let game = new Chess();
let playerColor = 'w'; // 'w' or 'b'
let aiLevel = 2;       // Search depth (1: Easy, 2: Med, 3: Hard)

// Board Selection & Move Highlights
let selectedSquare = null;
let validMoves = [];
let lastMove = null; // { from: 'e2', to: 'e4' }
let hintMove = null; // recommended move for player

// Rendering and Layout sizes
let boardSize;
let cellSize;
let boardLeft, boardTop;
let capturedBlack = []; // White pieces captured by Black (AI)
let capturedWhite = []; // Black pieces captured by White (Player)

// PST Valuation matrices (Piece-Square Tables) for strategic AI positioning.
// From White's perspective (mirrored for Black).
const pawnPST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightPST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopPST = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookPST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenPST = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  5,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingMiddleGamePST = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Setup input listeners
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('hint-btn').addEventListener('click', calculateHint);
    
    document.getElementById('difficulty-select').addEventListener('change', (e) => {
        aiLevel = parseInt(e.target.value);
    });

    const whiteBtn = document.getElementById('side-white');
    const blackBtn = document.getElementById('side-black');
    
    whiteBtn.addEventListener('click', () => {
        if (playerColor !== 'w') {
            playerColor = 'w';
            whiteBtn.classList.add('active');
            blackBtn.classList.remove('active');
            restartGame();
        }
    });

    blackBtn.addEventListener('click', () => {
        if (playerColor !== 'b') {
            playerColor = 'b';
            blackBtn.classList.add('active');
            whiteBtn.classList.remove('active');
            restartGame();
        }
    });

    restartGame();
}

function draw() {
    background(2, 3, 5);

    // Dynamic Chessboard boundary limits scaling
    boardSize = Math.min(width, height) * 0.90;
    cellSize = boardSize / 8;
    boardLeft = width / 2 - boardSize / 2;
    boardTop = height / 2 - boardSize / 2;

    // 1. Render board grids and squares
    drawBoardGrid();

    // 2. Render Check alert overlay
    drawCheckWarning();

    // 3. Render pieces
    drawPieces();

    // 4. Render selection overlays and valid moves markers
    drawSelectionHighlights();
}

function restartGame() {
    game = new Chess();
    selectedSquare = null;
    validMoves = [];
    lastMove = null;
    hintMove = null;
    capturedWhite = [];
    capturedBlack = [];
    
    document.getElementById('game-over-screen').style.display = 'none';
    updateHUDStatus();
    updateCapturedHUD();

    // Trigger AI move first if player plays Black
    if (playerColor === 'b') {
        makeAIMove();
    }
}

function drawBoardGrid() {
    // Chessboard back plate outline
    stroke(176, 38, 255, 120); // Brighter purple board frame
    strokeWeight(2);
    noFill();
    rect(boardLeft - 2, boardTop - 2, boardSize + 4, boardSize + 4, 6);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let cx = boardLeft + c * cellSize;
            let cy = boardTop + r * cellSize;

            // Flip row display index if player is Black
            let actualRow = playerColor === 'w' ? r : 7 - r;
            let actualCol = playerColor === 'w' ? c : 7 - c;

            let isLight = (actualRow + actualCol) % 2 === 0;

            if (isLight) {
                // Light glass style
                fill(255, 255, 255, 15); // Brighter light squares
                stroke(255, 255, 255, 40);
                strokeWeight(1);
            } else {
                // Dark glass style
                fill(10, 5, 23, 140);
                stroke(176, 38, 255, 60); // Brighter purple lines
                strokeWeight(1);
            }

            rect(cx, cy, cellSize, cellSize);
        }
    }
}

function drawSelectionHighlights() {
    // Highlight active advisory hint
    if (hintMove) {
        let fromIdx = getScreenCoords(hintMove.from);
        let toIdx = getScreenCoords(hintMove.to);
        if (fromIdx && toIdx) {
            stroke(255, 183, 3, 160 + sin(frameCount * 0.15) * 65); // Pulsing gold
            strokeWeight(2.5);
            noFill();
            rect(fromIdx.x + 2, fromIdx.y + 2, cellSize - 4, cellSize - 4, 6);
            rect(toIdx.x + 2, toIdx.y + 2, cellSize - 4, cellSize - 4, 6);
        }
    }

    // Highlight last move made
    if (lastMove) {
        let fromIdx = getScreenCoords(lastMove.from);
        let toIdx = getScreenCoords(lastMove.to);
        
        if (fromIdx && toIdx) {
            stroke(0, 242, 254, 80);
            strokeWeight(1.5);
            noFill();
            rect(fromIdx.x + 2, fromIdx.y + 2, cellSize - 4, cellSize - 4, 4);
            rect(toIdx.x + 2, toIdx.y + 2, cellSize - 4, cellSize - 4, 4);
        }
    }

    // Highlight selected piece
    if (selectedSquare) {
        let coords = getScreenCoords(selectedSquare);
        if (coords) {
            stroke(176, 38, 255);
            strokeWeight(2);
            noFill();
            rect(coords.x + 1, coords.y + 1, cellSize - 2, cellSize - 2, 4);
        }
    }

    // Highlight legal target moves
    validMoves.forEach(move => {
        let coords = getScreenCoords(move.to);
        if (coords) {
            let targetPiece = game.get(move.to);
            if (targetPiece) {
                // RED Capture markers at the corners
                stroke(255, 42, 42, 180);
                strokeWeight(2);
                let cx = coords.x;
                let cy = coords.y;
                let len = cellSize * 0.18;

                // Top-Left
                line(cx + 2, cy + 2, cx + 2 + len, cy + 2);
                line(cx + 2, cy + 2, cx + 2, cy + 2 + len);

                // Top-Right
                line(cx + cellSize - 2, cy + 2, cx + cellSize - 2 - len, cy + 2);
                line(cx + cellSize - 2, cy + 2, cx + cellSize - 2, cy + 2 + len);

                // Bottom-Left
                line(cx + 2, cy + cellSize - 2, cx + 2 + len, cy + cellSize - 2);
                line(cx + 2, cy + cellSize - 2, cx + 2, cy + cellSize - 2 - len);

                // Bottom-Right
                line(cx + cellSize - 2, cy + cellSize - 2, cx + cellSize - 2 - len, cy + cellSize - 2);
                line(cx + cellSize - 2, cy + cellSize - 2, cx + cellSize - 2, cy + cellSize - 2 - len);
            } else {
                // Purple landing indicator dot
                noStroke();
                fill(176, 38, 255, 140);
                ellipse(coords.x + cellSize / 2, coords.y + cellSize / 2, cellSize * 0.18);
            }
        }
    });
}

function drawCheckWarning() {
    if (game.in_check()) {
        // Find king coordinates of active turn side
        let boardState = game.board();
        let activeTurn = game.turn();
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = boardState[r][c];
                if (piece && piece.type === 'k' && piece.color === activeTurn) {
                    // Get coordinates
                    let squareName = getSquareName(r, c);
                    let coords = getScreenCoords(squareName);
                    if (coords) {
                        // Pulsing red neon highlight on king cell
                        let pulseAlpha = 80 + Math.sin(millis() / 150) * 50;
                        noStroke();
                        fill(255, 42, 42, pulseAlpha);
                        rect(coords.x + 1, coords.y + 1, cellSize - 2, cellSize - 2, 4);
                    }
                }
            }
        }
    }
}

function drawPieces() {
    let boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let piece = boardState[r][c];
            if (piece) {
                let squareName = getSquareName(r, c);
                let coords = getScreenCoords(squareName);
                if (coords) {
                    drawGeometricPiece(piece.type, piece.color, coords.x + cellSize / 2, coords.y + cellSize / 2, cellSize * 0.7);
                }
            }
        }
    }
}

// Geometric stylized vector drawings of Chess pieces
function drawGeometricPiece(type, color, x, y, size) {
    push();
    translate(x, y);

    // Color: White = Neon Cyan (#00f2fe), Black = Neon Magenta (#ff007f)
    let pColor = color === 'w' ? [180, 100, 50] : [320, 100, 50];
    colorMode(HSL, 360, 100, 100, 1.0);

    // Sonar glow back plate
    noStroke();
    fill(pColor[0], 90, 45, 0.1);
    ellipse(0, 0, size * 0.85);

    // Font setups
    textAlign(CENTER, CENTER);
    textSize(size * 1.0);

    // Deep neon glow offset layers
    fill(pColor[0], 95, 50, 0.15);
    text(getChessSymbol(type), -2, -2);
    text(getChessSymbol(type), 2, -2);
    text(getChessSymbol(type), -2, 2);
    text(getChessSymbol(type), 2, 2);

    fill(pColor[0], 95, 60, 0.4);
    text(getChessSymbol(type), -1, 0);
    text(getChessSymbol(type), 1, 0);
    text(getChessSymbol(type), 0, -1);
    text(getChessSymbol(type), 0, 1);

    // Sharp main foreground body
    fill(pColor[0], 95, 65);
    text(getChessSymbol(type), 0, 0);
    pop();
}

function getChessSymbol(type) {
    const symbols = {
        p: '♟',
        r: '♜',
        n: '♞',
        b: '♝',
        q: '♛',
        k: '♚'
    };
    return symbols[type] || '';
}

// Convert board algebraic coordinate to 2D pixel coordinates on active viewport
function getScreenCoords(square) {
    let cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    let c = cols.indexOf(square[0]);
    let r = 8 - parseInt(square[1]);

    if (c === -1 || isNaN(r)) return null;

    // Flip index representation if player side is Black
    let renderCol = playerColor === 'w' ? c : 7 - c;
    let renderRow = playerColor === 'w' ? r : 7 - r;

    return {
        x: boardLeft + renderCol * cellSize,
        y: boardTop + renderRow * cellSize
    };
}

function getSquareName(row, col) {
    let cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return cols[col] + (8 - row);
}

function mousePressed() {
    if (game.game_over() || isAIThinking()) return;

    // Boundary limits check
    if (mouseX < boardLeft || mouseX >= boardLeft + boardSize ||
        mouseY < boardTop || mouseY >= boardTop + boardSize) {
        return;
    }

    let c = Math.floor((mouseX - boardLeft) / cellSize);
    let r = Math.floor((mouseY - boardTop) / cellSize);

    // Adjust grid cell indexes if playing as Black
    let gridCol = playerColor === 'w' ? c : 7 - c;
    let gridRow = playerColor === 'w' ? r : 7 - r;

    let clickedSquare = getSquareName(gridRow, gridCol);
    let piece = game.get(clickedSquare);

    if (selectedSquare === clickedSquare) {
        // Deselect
        selectedSquare = null;
        validMoves = [];
    } else if (selectedSquare && validMoves.some(m => m.to === clickedSquare)) {
        // Make move!
        let moveObj = validMoves.find(m => m.to === clickedSquare);
        executeMove({
            from: selectedSquare,
            to: clickedSquare,
            promotion: 'q' // Auto-promote to queen for ease of play
        });
    } else if (piece && piece.color === playerColor) {
        // Select piece and load legal target positions
        selectedSquare = clickedSquare;
        validMoves = game.moves({ square: clickedSquare, verbose: true });
    } else {
        selectedSquare = null;
        validMoves = [];
    }
}

function executeMove(moveObj) {
    let captured = game.get(moveObj.to);
    
    let result = game.move(moveObj);
    if (result) {
        lastMove = moveObj;
        hintMove = null; // Clear hint on action
        selectedSquare = null;
        validMoves = [];
        
        // Track captures
        if (captured) {
            if (captured.color === 'w') {
                capturedBlack.push(captured.type);
            } else {
                capturedWhite.push(captured.type);
            }
            updateCapturedHUD();
        }

        updateHUDStatus();

        if (game.game_over()) {
            triggerGameOver();
        } else {
            // Trigger AI Move only if it is now the AI's turn
            if (game.turn() !== playerColor) {
                setTimeout(makeAIMove, 400);
            }
        }
    }
}

function isAIThinking() {
    return game.turn() !== playerColor && !game.game_over();
}

function updateHUDStatus() {
    const status = document.getElementById('status-val');
    if (game.game_over()) {
        status.textContent = "SIM ENDED";
        status.classList.remove('status-thinking');
        return;
    }

    if (game.turn() === playerColor) {
        status.textContent = "YOUR TURN";
        status.className = "hud-value status-neon";
    } else {
        status.textContent = "AI THINKING";
        status.className = "hud-value status-thinking";
    }
}

function updateCapturedHUD() {
    const trayW = document.getElementById('tray-white');
    const trayB = document.getElementById('tray-black');
    
    // Map piece types to unicode characters or short stylized labels
    const icons = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛' };

    if (trayW) {
        trayW.innerHTML = capturedWhite.map(type => 
            `<span class="captured-piece">${icons[type] || type.toUpperCase()}</span>`
        ).join('');
    }
    if (trayB) {
        trayB.innerHTML = capturedBlack.map(type => 
            `<span class="captured-piece" style="color:var(--neon-magenta)">${icons[type] || type.toUpperCase()}</span>`
        ).join('');
    }
}

function triggerGameOver() {
    let msg = "Simulation ended in a draw.";
    let title = "DRAW STATE";
    
    if (game.in_checkmate()) {
        let winner = game.turn() === 'w' ? 'Black' : 'White';
        if ((winner === 'White' && playerColor === 'w') || (winner === 'Black' && playerColor === 'b')) {
            title = "VICTORY";
            msg = "You have cleared the board simulation!";
            document.getElementById('game-over-title').style.color = "var(--neon-cyan)";
        } else {
            title = "GRID DEFEAT";
            msg = "AI successfully checkmated your system.";
            document.getElementById('game-over-title').style.color = "var(--neon-red)";
        }
    }

    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-msg').textContent = msg;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// ==========================================================================
// MINIMAX AI CHESS ENGINE IMPLEMENTATION
// ==========================================================================

function makeAIMove() {
    if (game.game_over()) return;

    let bestMove = getBestMove(game, aiLevel);
    if (bestMove) {
        executeMove(bestMove);
    }
}

function getBestMove(currentGame, depth) {
    let moves = currentGame.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Shuffle moves to add randomness/natural feel to identical evaluations
    moves.sort(() => 0.5 - Math.random());

    let bestMove = null;
    let bestValue = currentGame.turn() === 'b' ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {
        let move = moves[i];
        currentGame.move(move);
        
        let boardValue = minimax(currentGame, depth - 1, -Infinity, Infinity, currentGame.turn() === 'b');
        currentGame.undo();

        if (currentGame.turn() === 'b') { // Black is maximizing (standard AI side)
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        } else { // White is minimizing
            if (boardValue < bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
    }

    return bestMove;
}

// Alpha-Beta Minimax search tree
function minimax(currentGame, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || currentGame.game_over()) {
        return evaluateBoard(currentGame.board());
    }

    let moves = currentGame.moves({ verbose: true });

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            currentGame.move(moves[i]);
            let evaluate = minimax(currentGame, depth - 1, alpha, beta, false);
            currentGame.undo();
            maxEval = Math.max(maxEval, evaluate);
            alpha = Math.max(alpha, evaluate);
            if (beta <= alpha) break; // Pruning
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < moves.length; i++) {
            currentGame.move(moves[i]);
            let evaluate = minimax(currentGame, depth - 1, alpha, beta, true);
            currentGame.undo();
            minEval = Math.min(minEval, evaluate);
            beta = Math.min(beta, evaluate);
            if (beta <= alpha) break; // Pruning
        }
        return minEval;
    }
}

// Chess Engine Evaluation Functions
function evaluateBoard(boardState) {
    let totalEvaluation = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            totalEvaluation += getPieceValue(boardState[r][c], r, c);
        }
    }
    return totalEvaluation;
}

function getPieceValue(piece, row, col) {
    if (!piece) return 0;

    let absoluteValue = 0;
    switch (piece.type) {
        case 'p': absoluteValue = 100 + pawnPST[piece.color === 'b' ? row : 7 - row][col]; break;
        case 'r': absoluteValue = 500 + rookPST[piece.color === 'b' ? row : 7 - row][col]; break;
        case 'n': absoluteValue = 320 + knightPST[piece.color === 'b' ? row : 7 - row][col]; break;
        case 'b': absoluteValue = 330 + bishopPST[piece.color === 'b' ? row : 7 - row][col]; break;
        case 'q': absoluteValue = 900 + queenPST[piece.color === 'b' ? row : 7 - row][col]; break;
        case 'k': absoluteValue = 20000 + kingMiddleGamePST[piece.color === 'b' ? row : 7 - row][col]; break;
    }

    // Positive scores for Black (AI standard maximizes), negative for White
    return piece.color === 'b' ? absoluteValue : -absoluteValue;
}

function calculateHint() {
    if (game.game_over() || game.turn() !== playerColor) return;
    
    // Calculate best move for the player color with depth 2 minimax search
    let best = getBestMove(game, 2);
    if (best) {
        hintMove = best;
    }
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
