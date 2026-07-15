// Glassmorphic 2048 - Classic Retro Arcade
const GRID_SIZE = 4;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;
let bestScore = 0;
let undoStack = []; // Stack storing history for undo mechanics

// Animation states
let tiles = []; // List of active tiles to animate
let animTimer = 0;
const animDuration = 10; // Frames for sliding animation
let isAnimating = false;
let isGameOver = false;
let isGameWon = false;
let hasShownWin = false;

// Layout variables
let boardSize;
let cellSize;
let boardLeft, boardTop;
let padding = 12;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // Load Best Score
    let stored = localStorage.getItem('2048_bestscore');
    if (stored) {
        bestScore = parseInt(stored);
        document.getElementById('best-val').textContent = bestScore;
    }

    // Attach listeners
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('undo-btn').addEventListener('click', triggerUndo);

    setupMobileControls();
    restartGame();
}

function draw() {
    background(2, 3, 5);

    // Calculate dynamic layout sizes
    boardSize = Math.min(width, height) * 0.88;
    cellSize = (boardSize - padding * (GRID_SIZE + 1)) / GRID_SIZE;
    boardLeft = width / 2 - boardSize / 2;
    boardTop = height / 2 - boardSize / 2;

    // 1. Draw Glassmorphic Board container
    drawBoardBackdrop();

    // 2. Animate sliding tiles
    if (isAnimating) {
        animTimer++;
        if (animTimer >= animDuration) {
            isAnimating = false;
            // Finalize grid positions
            tiles = tiles.filter(t => !t.toDelete);
            tiles.forEach(t => {
                t.prevRow = t.row;
                t.prevCol = t.col;
                t.isNew = false;
                t.isMerged = false;
            });
        }
    }

    // 3. Render Tiles
    renderTiles();
}

// Tile class helper
class Tile {
    constructor(row, col, value, isNew = true) {
        this.row = row;
        this.col = col;
        this.prevRow = row;
        this.prevCol = col;
        this.value = value;
        this.isNew = isNew;
        this.isMerged = false;
        this.toDelete = false;
    }
}

function restartGame() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    tiles = [];
    score = 0;
    undoStack = [];
    isGameOver = false;
    isGameWon = false;
    hasShownWin = false;
    isAnimating = false;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-val').textContent = score;

    addRandomTile();
    addRandomTile();
    syncTilesFromGrid();
}

// Add a random 2 or 4 tile to an empty spot
function addRandomTile() {
    let emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }

    if (emptyCells.length > 0) {
        let cell = random(emptyCells);
        let val = random(1) < 0.9 ? 2 : 4;
        grid[cell.r][cell.c] = val;
        
        let newTile = new Tile(cell.r, cell.c, val, true);
        tiles.push(newTile);
    }
}

// Synchronize visual tile list with grid logic (for resets/undos/non-animated transitions)
function syncTilesFromGrid() {
    tiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] > 0) {
                tiles.push(new Tile(r, c, grid[r][c], false));
            }
        }
    }
}

function drawBoardBackdrop() {
    // Frosted glass backing board
    noStroke();
    fill(10, 14, 23, 160);
    rect(boardLeft, boardTop, boardSize, boardSize, 14);

    // Draw empty cell slots
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let cx = boardLeft + padding + c * (cellSize + padding);
            let cy = boardTop + padding + r * (cellSize + padding);
            fill(255, 255, 255, 10); // Slightly brighter empty slots
            stroke(255, 255, 255, 35); // Brighter cell borders
            strokeWeight(1);
            rect(cx, cy, cellSize, cellSize, 8);
        }
    }
}

function renderTiles() {
    let progress = isAnimating ? animTimer / animDuration : 1.0;

    tiles.forEach(tile => {
        // Calculate interpolation positions
        let colProgress = lerp(tile.prevCol, tile.col, progress);
        let rowProgress = lerp(tile.prevRow, tile.row, progress);

        let cx = boardLeft + padding + colProgress * (cellSize + padding);
        let cy = boardTop + padding + rowProgress * (cellSize + padding);

        // Determine scale transition
        let s = 1.0;
        if (tile.isNew) {
            // Scale up from 0 to 1
            s = progress;
        } else if (tile.isMerged) {
            // Pulse bounce scale effect
            s = 1.0 + Math.sin(progress * Math.PI) * 0.15;
        }

        // Draw the tile
        drawSingleTile(cx, cy, tile.value, s);
    });
}

function drawSingleTile(x, y, val, scaleVal) {
    push();
    translate(x + cellSize / 2, y + cellSize / 2);
    scale(scaleVal);

    let tileHue = getTileHue(val);
    colorMode(HSL, 360, 100, 100, 1.0);

    // Ambient background glow
    noStroke();
    let glowOpacity = val >= 1024 ? 0.35 : 0.15;
    fill(tileHue, 95, 55, glowOpacity);
    rect(-cellSize / 2 - 3, -cellSize / 2 - 3, cellSize + 6, cellSize + 6, 10);

    // Main body
    fill(tileHue, 80, 45, 0.85);
    stroke(tileHue, 95, 70, 0.9);
    strokeWeight(1.5);
    rect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 8);

    // Dynamic Text size based on value digits length
    colorMode(RGB, 255, 255, 255, 255);
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    
    let digits = String(val).length;
    let txtSize = cellSize * 0.45;
    if (digits === 3) txtSize = cellSize * 0.35;
    else if (digits >= 4) txtSize = cellSize * 0.28;
    
    textFont('Outfit');
    textSize(txtSize);
    textStyle(BOLD);
    text(val, 0, 0);
    pop();
}

// Vibrant HSL temperature shifting from cold blue (2) to hot magenta/gold (2048+)
function getTileHue(val) {
    switch (val) {
        case 2: return 200;    // Sky Blue
        case 4: return 215;    // Deep Sky Blue
        case 8: return 235;    // Royal Blue
        case 16: return 260;   // Violet
        case 32: return 285;   // Deep Purple
        case 64: return 320;   // Magenta
        case 128: return 340;  // Hot Pink
        case 256: return 355;  // Red-Pink
        case 512: return 12;   // Glowing Coral Orange
        case 1024: return 32;  // Gold-Orange
        case 2048: return 48;  // Brilliant Gold
        default: return 0;     // Crimson (higher powers)
    }
}

// Save board state to undo history
function saveHistory() {
    let gridCopy = grid.map(row => [...row]);
    undoStack.push({
        grid: gridCopy,
        score: score
    });
    // Cap undo stack at 20 steps
    if (undoStack.length > 20) {
        undoStack.shift();
    }
}

function triggerUndo() {
    if (undoStack.length === 0 || isAnimating) return;

    let prevState = undoStack.pop();
    grid = prevState.grid.map(row => [...row]);
    score = prevState.score;

    document.getElementById('score-val').textContent = score;
    isGameOver = false;
    document.getElementById('game-over-screen').style.display = 'none';

    syncTilesFromGrid();
}

// 2048 Game Sliding Engine
function slide(dir) {
    if (isAnimating || isGameOver) return;

    let moved = false;
    saveHistory(); // Save state before making a move

    // Create a new fresh list of tiles for slide tracking
    // Keep reference of current tiles
    let activeTiles = tiles.filter(t => !t.toDelete);
    activeTiles.forEach(t => {
        t.prevRow = t.row;
        t.prevCol = t.col;
        t.isNew = false;
        t.isMerged = false;
    });

    let mergedCells = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));

    // Slide implementation along vectors
    if (dir.x !== 0) {
        // Horizontal Slide
        let startCol = dir.x === 1 ? GRID_SIZE - 2 : 1;
        let endCol = dir.x === 1 ? -1 : GRID_SIZE;
        let step = dir.x === 1 ? -1 : 1;

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = startCol; c !== endCol; c += step) {
                if (grid[r][c] > 0) {
                    let val = grid[r][c];
                    let currentC = c;

                    // Find furthest zero column in slide direction
                    while (currentC + dir.x >= 0 && currentC + dir.x < GRID_SIZE && grid[r][currentC + dir.x] === 0) {
                        currentC += dir.x;
                    }

                    // Check if adjacent column matches value and hasn't merged yet
                    let nextC = currentC + dir.x;
                    if (nextC >= 0 && nextC < GRID_SIZE && grid[r][nextC] === val && !mergedCells[r][nextC]) {
                        // Merge tiles!
                        grid[r][c] = 0;
                        grid[r][nextC] = val * 2;
                        score += val * 2;
                        mergedCells[r][nextC] = true;
                        moved = true;

                        // Animate merge visually
                        let movingTile = activeTiles.find(t => t.row === r && t.col === c && !t.toDelete);
                        let targetTile = activeTiles.find(t => t.row === r && t.col === nextC && !t.toDelete);
                        
                        if (movingTile) {
                            movingTile.col = nextC;
                            movingTile.toDelete = true;
                        }
                        if (targetTile) {
                            targetTile.value = val * 2;
                            targetTile.isMerged = true;
                        }
                    } else if (currentC !== c) {
                        // Just slide to empty cell
                        grid[r][c] = 0;
                        grid[r][currentC] = val;
                        moved = true;

                        let movingTile = activeTiles.find(t => t.row === r && t.col === c && !t.toDelete);
                        if (movingTile) {
                            movingTile.col = currentC;
                        }
                    }
                }
            }
        }
    } else if (dir.y !== 0) {
        // Vertical Slide
        let startRow = dir.y === 1 ? GRID_SIZE - 2 : 1;
        let endRow = dir.y === 1 ? -1 : GRID_SIZE;
        let step = dir.y === 1 ? -1 : 1;

        for (let c = 0; c < GRID_SIZE; c++) {
            for (let r = startRow; r !== endRow; r += step) {
                if (grid[r][c] > 0) {
                    let val = grid[r][c];
                    let currentR = r;

                    // Find furthest zero row in slide direction
                    while (currentR + dir.y >= 0 && currentR + dir.y < GRID_SIZE && grid[currentR + dir.y][c] === 0) {
                        currentR += dir.y;
                    }

                    // Check if adjacent matches
                    let nextR = currentR + dir.y;
                    if (nextR >= 0 && nextR < GRID_SIZE && grid[nextR][c] === val && !mergedCells[nextR][c]) {
                        // Merge tiles!
                        grid[r][c] = 0;
                        grid[nextR][c] = val * 2;
                        score += val * 2;
                        mergedCells[nextR][c] = true;
                        moved = true;

                        let movingTile = activeTiles.find(t => t.row === r && t.col === c && !t.toDelete);
                        let targetTile = activeTiles.find(t => t.row === nextR && t.col === c && !t.toDelete);
                        
                        if (movingTile) {
                            movingTile.row = nextR;
                            movingTile.toDelete = true;
                        }
                        if (targetTile) {
                            targetTile.value = val * 2;
                            targetTile.isMerged = true;
                        }
                    } else if (currentR !== r) {
                        // Slide to empty cell
                        grid[r][c] = 0;
                        grid[currentR][c] = val;
                        moved = true;

                        let movingTile = activeTiles.find(t => t.row === r && t.col === c && !t.toDelete);
                        if (movingTile) {
                            movingTile.row = currentR;
                        }
                    }
                }
            }
        }
    }

    if (moved) {
        // Play motion sound trigger or pulse animation frames
        isAnimating = true;
        animTimer = 0;

        addRandomTile();
        document.getElementById('score-val').textContent = score;

        // Update High score
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('2048_bestscore', bestScore);
            document.getElementById('best-val').textContent = bestScore;
        }

        checkGameState();
    } else {
        // Discard the saved history state if no tiles actually moved
        undoStack.pop();
    }
}

// Game State Verification: Win or Loss checks
function checkGameState() {
    // 1. Check for 2048 Win condition
    if (!hasShownWin) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === 2048) {
                    isGameWon = true;
                    hasShownWin = true;
                    triggerGameOverScreen(true);
                    return;
                }
            }
        }
    }

    // 2. Check for game-over moves remaining
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return; // Empty spaces remain
            
            // Check adjacent values
            if (r + 1 < GRID_SIZE && grid[r][c] === grid[r+1][c]) return;
            if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c+1]) return;
        }
    }

    // No empty cells and no adjacent merges possible - Loss!
    isGameOver = true;
    triggerGameOverScreen(false);
}

function triggerGameOverScreen(won) {
    document.getElementById('final-score').textContent = score;
    const title = document.getElementById('game-over-title');
    if (won) {
        title.textContent = "YOU WIN!";
        title.style.color = "var(--neon-cyan)";
    } else {
        title.textContent = "GAME OVER";
        title.style.color = "var(--neon-magenta)";
    }
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Input Controllers
function keyPressed() {
    if (isGameOver) return;

    if (keyCode === LEFT_ARROW) {
        slide({ x: -1, y: 0 });
    } else if (keyCode === RIGHT_ARROW) {
        slide({ x: 1, y: 0 });
    } else if (keyCode === UP_ARROW) {
        slide({ x: 0, y: -1 });
    } else if (keyCode === DOWN_ARROW) {
        slide({ x: 0, y: 1 });
    } else if (key === 'u' || key === 'U') {
        triggerUndo();
    }
}

// Touch Swipes and Mobile Controls binding
function setupMobileControls() {
    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                action();
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                action();
            });
        }
    };

    bindBtn('ctrl-left', () => slide({ x: -1, y: 0 }));
    bindBtn('ctrl-right', () => slide({ x: 1, y: 0 }));
    bindBtn('ctrl-up', () => slide({ x: 0, y: -1 }));
    bindBtn('ctrl-down', () => slide({ x: 0, y: 1 }));
    bindBtn('ctrl-undo', triggerUndo);

    // Touch swipes on canvasParent
    const canvasParent = document.getElementById('canvas-parent');
    if (canvasParent) {
        canvasParent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        canvasParent.addEventListener('touchend', (e) => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;

            let dx = touchEndX - touchStartX;
            let dy = touchEndY - touchStartY;

            // Threshold checks
            if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) slide({ x: 1, y: 0 });
                    else slide({ x: -1, y: 0 });
                } else {
                    if (dy > 0) slide({ x: 0, y: 1 });
                    else slide({ x: 0, y: -1 });
                }
            }
        }, { passive: true });
    }
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
