// Holo Morris - Classic Retro Arcade
let nodes = []; // 24 points: index = layer * 8 + pos
let playerTurn = 1; // 1: Player (Cyan), 2: AI (Magenta)
let gamePhase = 'placing'; // 'placing', 'moving', 'removing'
let lastPhase = 'placing'; // Helper to restore state after removal

// Game scores & inventory
let playerPlaced = 0; // pieces placed so far (max 9)
let aiPlaced = 0;     // pieces placed so far (max 9)
let playerUnplaced = 9;
let aiUnplaced = 9;

let selectedNodeIndex = null; // For moving phase
let pulseAnim = 0;
let hintMoveObj = null; // Recommended move for P1

// Coordinate layout helpers
let boardSize;
let boardLeft, boardTop;

function setup() {
    const container = document.getElementById('canvas-parent');
    const w = container ? container.clientWidth : 400;
    const h = container ? container.clientHeight : 400;
    const canvas = createCanvas(w, h);
    canvas.parent('canvas-parent');

    // DOM hooks
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn-over').addEventListener('click', restartGame);
    document.getElementById('hint-btn').addEventListener('click', calculateHint);

    restartGame();
}

function draw() {
    background(2, 3, 5);

    boardSize = Math.min(width, height) * 0.85;
    boardLeft = width / 2 - boardSize / 2;
    boardTop = height / 2 - boardSize / 2;

    updateLayoutCoords();

    // 1. Draw connecting vector grid lines
    drawMorrisGrid();

    // 2. Draw active pieces on nodes
    drawNodesAndPieces();

    // 3. Highlight selected piece or indicators
    drawMoveHighlights();
}

function restartGame() {
    nodes = [];
    playerTurn = 1;
    gamePhase = 'placing';
    lastPhase = 'placing';
    playerPlaced = 0;
    aiPlaced = 0;
    playerUnplaced = 9;
    aiUnplaced = 9;
    selectedNodeIndex = null;
    hintMoveObj = null;

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('player-pieces-val').textContent = 9;
    document.getElementById('ai-pieces-val').textContent = 9;
    
    updateHUDStatus("YOUR TURN", "PLACING");

    // Initialize 24 nodes
    for (let layer = 0; layer < 3; layer++) {
        for (let pos = 0; pos < 8; pos++) {
            nodes.push({
                layer: layer,
                pos: pos,
                x: 0,
                y: 0,
                occupiedBy: 0 // 0: empty, 1: player, 2: AI
            });
        }
    }
}

function updateLayoutCoords() {
    let layersPadding = [boardSize * 0.45, boardSize * 0.30, boardSize * 0.15];
    
    for (let i = 0; i < 24; i++) {
        let layer = nodes[i].layer;
        let pos = nodes[i].pos;
        let pad = layersPadding[layer];

        let cx = width / 2;
        let cy = height / 2;

        switch (pos) {
            case 0: nodes[i].x = cx - pad; nodes[i].y = cy - pad; break; // Top-Left
            case 1: nodes[i].x = cx;       nodes[i].y = cy - pad; break; // Top-Middle
            case 2: nodes[i].x = cx + pad; nodes[i].y = cy - pad; break; // Top-Right
            case 3: nodes[i].x = cx + pad; nodes[i].y = cy;       break; // Middle-Right
            case 4: nodes[i].x = cx + pad; nodes[i].y = cy + pad; break; // Bottom-Right
            case 5: nodes[i].x = cx;       nodes[i].y = cy + pad; break; // Bottom-Middle
            case 6: nodes[i].x = cx - pad; nodes[i].y = cy + pad; break; // Bottom-Left
            case 7: nodes[i].x = cx - pad; nodes[i].y = cy;       break; // Middle-Left
        }
    }
}

function drawMorrisGrid() {
    stroke(176, 38, 255, 140); // Brighter purple connections
    strokeWeight(2.2);
    noFill();

    // 1. Draw the 3 square rings
    for (let layer = 0; layer < 3; layer++) {
        let tl = nodes[layer * 8 + 0];
        let tr = nodes[layer * 8 + 2];
        let br = nodes[layer * 8 + 4];
        let bl = nodes[layer * 8 + 6];
        rect(tl.x, tl.y, tr.x - tl.x, bl.y - tl.y);
    }

    // 2. Draw cross connecting lines (midpoints of sides)
    for (let pos of [1, 3, 5, 7]) {
        let outer = nodes[0 * 8 + pos];
        let inner = nodes[2 * 8 + pos];
        line(outer.x, outer.y, inner.x, inner.y);
    }
}

function drawNodesAndPieces() {
    nodes.forEach((node, idx) => {
        // Draw empty node dots
        if (node.occupiedBy === 0) {
            fill(8, 10, 16);
            stroke(176, 38, 255, 175); // Highly visible purple dots
            strokeWeight(1.5);
            ellipse(node.x, node.y, 9);
        } else {
            // Draw active neon pieces
            let col = node.occupiedBy === 1 ? [180, 100, 50] : [320, 100, 50]; // Cyan vs Magenta
            
            colorMode(HSL, 360, 100, 100, 1.0);
            
            // Glow backdrop
            noStroke();
            fill(col[0], 95, 55, 0.22);
            ellipse(node.x, node.y, 22);

            // Piece body
            fill(col[0], 90, 48);
            stroke(col[0], 95, 75);
            strokeWeight(1.5);
            ellipse(node.x, node.y, 16);

            colorMode(RGB, 255, 255, 255, 255);
        }
    });
}

function drawMoveHighlights() {
    pulseAnim = (pulseAnim + 1) % 60;
    let pulseOpacity = 80 + Math.sin(pulseAnim / 9) * 40;

    // Draw active gold pulsing hint highlights
    if (hintMoveObj && playerTurn === 1) {
        stroke(255, 183, 3, 160 + sin(frameCount * 0.15) * 65);
        strokeWeight(2.5);
        noFill();
        if (hintMoveObj.from !== undefined && hintMoveObj.from !== null) {
            let fn = nodes[hintMoveObj.from];
            ellipse(fn.x, fn.y, 25);
            let tn = nodes[hintMoveObj.to];
            ellipse(tn.x, tn.y, 25);
            stroke(255, 183, 3, 100);
            line(fn.x, fn.y, tn.x, tn.y);
        } else {
            let tn = nodes[hintMoveObj.to];
            ellipse(tn.x, tn.y, 25);
        }
    }

    if (gamePhase === 'removing') {
        // Highlight opponent pieces that can be removed in red
        nodes.forEach(node => {
            let opponentColor = playerTurn === 1 ? 2 : 1;
            if (node.occupiedBy === opponentColor) {
                // Check that piece is not part of a mill, unless opponent only has mills
                if (opponentOnlyHasMills(opponentColor) || !isPartOfMill(node, opponentColor)) {
                    stroke(255, 42, 42, pulseOpacity);
                    strokeWeight(2);
                    noFill();
                    ellipse(node.x, node.y, 24);
                }
            }
        });
    } else if (gamePhase === 'moving' && selectedNodeIndex !== null) {
        // Highlight selected node
        let selNode = nodes[selectedNodeIndex];
        stroke(0, 242, 254, pulseOpacity);
        strokeWeight(2);
        noFill();
        ellipse(selNode.x, selNode.y, 24);

        // Highlight valid slide destination cells
        let playerColor = nodes[selectedNodeIndex].occupiedBy;
        let flightMode = countPieces(playerColor) === 3;
        
        nodes.forEach((node, idx) => {
            if (node.occupiedBy === 0) {
                if (flightMode || getNeighbors(selectedNodeIndex).includes(idx)) {
                    fill(0, 242, 254, 40);
                    stroke(0, 242, 254, 150);
                    strokeWeight(1.2);
                    ellipse(node.x, node.y, 12);
                }
            }
        });
    }
}

// Check adjacent connections by Nine Men's Morris layouts
function getNeighbors(idx) {
    let layer = Math.floor(idx / 8);
    let pos = idx % 8;
    let neighbors = [];

    // Adjacent positions in loop same layer
    neighbors.push(layer * 8 + (pos - 1 + 8) % 8);
    neighbors.push(layer * 8 + (pos + 1) % 8);

    // Cross layer connections on midpoints (odd indices: 1, 3, 5, 7)
    if (pos % 2 === 1) {
        if (layer === 0) {
            neighbors.push(1 * 8 + pos);
        } else if (layer === 1) {
            neighbors.push(0 * 8 + pos);
            neighbors.push(2 * 8 + pos);
        } else if (layer === 2) {
            neighbors.push(1 * 8 + pos);
        }
    }

    return neighbors;
}

function mousePressed() {
    if (playerTurn !== 1 || isGameOver) return;

    let clickedIdx = getClickedNode();
    if (clickedIdx === -1) return;

    hintMoveObj = null; // Clear hint Advisory on click action

    let clickedNode = nodes[clickedIdx];

    if (gamePhase === 'placing') {
        if (clickedNode.occupiedBy === 0 && playerUnplaced > 0) {
            clickedNode.occupiedBy = 1;
            playerUnplaced--;
            playerPlaced++;
            document.getElementById('player-pieces-val').textContent = playerUnplaced;

            // Check if mill formed
            if (checkForNewMill(clickedIdx, 1)) {
                triggerPieceRemovalPhase();
            } else {
                endTurn();
            }
        }
    } else if (gamePhase === 'moving') {
        if (selectedNodeIndex === null) {
            // Select one of own pieces to move
            if (clickedNode.occupiedBy === 1) {
                selectedNodeIndex = clickedIdx;
            }
        } else {
            // Picked destination target node
            if (clickedNode.occupiedBy === 0) {
                let flightMode = countPieces(1) === 3;
                if (flightMode || getNeighbors(selectedNodeIndex).includes(clickedIdx)) {
                    // Execute move slide
                    nodes[selectedNodeIndex].occupiedBy = 0;
                    clickedNode.occupiedBy = 1;
                    selectedNodeIndex = null;

                    // Check for mill
                    if (checkForNewMill(clickedIdx, 1)) {
                        triggerPieceRemovalPhase();
                    } else {
                        endTurn();
                    }
                } else {
                    selectedNodeIndex = null; // invalid move
                }
            } else if (clickedNode.occupiedBy === 1) {
                selectedNodeIndex = clickedIdx; // switch selection
            } else {
                selectedNodeIndex = null;
            }
        }
    } else if (gamePhase === 'removing') {
        if (clickedNode.occupiedBy === 2) {
            // Verify removal is valid (must not be in mill unless no other pieces exist)
            if (opponentOnlyHasMills(2) || !isPartOfMill(clickedNode, 2)) {
                clickedNode.occupiedBy = 0;
                gamePhase = lastPhase; // restore phase
                endTurn();
            }
        }
    }
}

function getClickedNode() {
    for (let i = 0; i < 24; i++) {
        let node = nodes[i];
        let d = dist(mouseX, mouseY, node.x, node.y);
        if (d < 15) return i;
    }
    return -1;
}

function triggerPieceRemovalPhase() {
    lastPhase = gamePhase;
    gamePhase = 'removing';
    updateHUDStatus(playerTurn === 1 ? "YOUR TURN (REMOVE PIECE)" : "AI REMOVING PIECE", "MILL FORMED!");
}

function endTurn() {
    // Check win conditions before switching turns
    if (checkGameEndConditions()) {
        return;
    }

    // Toggle Turn
    playerTurn = playerTurn === 1 ? 2 : 1;
    
    // Auto shift to moving phase once all 18 pieces are placed
    if (playerUnplaced === 0 && aiUnplaced === 0 && gamePhase === 'placing') {
        gamePhase = 'moving';
    }

    let phaseLabel = gamePhase.toUpperCase();
    
    updateHUDStatus(playerTurn === 1 ? "YOUR TURN" : "AI THINKING", phaseLabel);

    if (playerTurn === 2) {
        setTimeout(makeAIMove, 700);
    }
}

function updateHUDStatus(turnText, phaseText) {
    const turnVal = document.getElementById('status-val');
    const phaseVal = document.getElementById('phase-val');

    if (turnVal) {
        turnVal.textContent = turnText;
        if (turnText.includes("AI")) {
            turnVal.className = "hud-value status-thinking";
        } else {
            turnVal.className = "hud-value status-neon";
        }
    }
    if (phaseVal) {
        phaseVal.textContent = phaseText;
    }
}

function countPieces(playerColor) {
    return nodes.filter(n => n.occupiedBy === playerColor).length;
}

function checkGameEndConditions() {
    if (playerUnplaced === 0 && aiUnplaced === 0) {
        let pCount = countPieces(1);
        let aiCount = countPieces(2);

        // A player loses if reduced to 2 pieces
        if (pCount <= 2) {
            triggerGameOver(false);
            return true;
        }
        if (aiCount <= 2) {
            triggerGameOver(true);
            return true;
        }

        // A player loses if they have no legal moves
        if (gamePhase === 'moving') {
            let activeColor = playerTurn;
            let movesLeft = false;

            nodes.forEach((node, idx) => {
                if (node.occupiedBy === activeColor) {
                    let neighbors = getNeighbors(idx);
                    if (neighbors.some(n => nodes[n].occupiedBy === 0)) {
                        movesLeft = true;
                    }
                }
            });

            if (!movesLeft) {
                // Game over for current player
                triggerGameOver(activeColor === 2); // if AI has no moves, player wins
                return true;
            }
        }
    }
    return false;
}

function triggerGameOver(playerWins) {
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-title').textContent = playerWins ? "VICTORY" : "SYSTEM LOSS";
    document.getElementById('game-over-title').style.color = playerWins ? "var(--neon-cyan)" : "var(--neon-magenta)";
    document.getElementById('game-over-msg').textContent = playerWins ? "You formed dominant mills!" : "AI blocked your pieces.";
    updateHUDStatus("SIM COMPLETE", "ENDED");
}

// --------------------------------------------------------------------------
// MILL DETECTION MATHEMATICS
// --------------------------------------------------------------------------

// List of all 16 possible mills on a Nine Men's Morris board
const MILL_DEFINITIONS = [
    // Outer Ring
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    // Middle Ring
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    // Inner Ring
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    // Cross connections
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]
];

function isPartOfMill(node, color) {
    let nodeIdx = nodes.indexOf(node);
    return MILL_DEFINITIONS.some(mill => {
        return mill.includes(nodeIdx) && mill.every(idx => nodes[idx].occupiedBy === color);
    });
}

function checkForNewMill(nodeIdx, color) {
    // Check if the node is part of any mill of the same color
    return MILL_DEFINITIONS.some(mill => {
        return mill.includes(nodeIdx) && mill.every(idx => nodes[idx].occupiedBy === color);
    });
}

function opponentOnlyHasMills(color) {
    // Returns true if all opponent pieces are currently in mills
    return nodes.filter(n => n.occupiedBy === color).every(n => isPartOfMill(n, color));
}

// --------------------------------------------------------------------------
// HEURISTIC AI FOR NINE MEN'S MORRIS
// --------------------------------------------------------------------------

function makeAIMove() {
    if (isGameOver) return;

    if (gamePhase === 'placing') {
        let bestIdx = -1;
        let bestVal = -Infinity;

        // Try placing on every empty node
        nodes.forEach((node, idx) => {
            if (node.occupiedBy === 0) {
                let score = evaluatePlacement(idx);
                if (score > bestVal) {
                    bestVal = score;
                    bestIdx = idx;
                }
            }
        });

        if (bestIdx !== -1) {
            nodes[bestIdx].occupiedBy = 2;
            aiUnplaced--;
            aiPlaced++;
            document.getElementById('ai-pieces-val').textContent = aiUnplaced;

            if (checkForNewMill(bestIdx, 2)) {
                triggerPieceRemovalPhase();
                setTimeout(executeAIRemoval, 700);
            } else {
                endTurn();
            }
        }
    } else if (gamePhase === 'moving') {
        let bestMove = null; // { from: idx, to: idx }
        let bestVal = -Infinity;

        // Scan all AI pieces
        nodes.forEach((node, fromIdx) => {
            if (node.occupiedBy === 2) {
                let neighbors = getNeighbors(fromIdx);
                let flightMode = countPieces(2) === 3;

                nodes.forEach((destNode, toIdx) => {
                    if (destNode.occupiedBy === 0 && (flightMode || neighbors.includes(toIdx))) {
                        // Mock the move
                        node.occupiedBy = 0;
                        destNode.occupiedBy = 2;
                        
                        let score = evaluatePosition(toIdx);
                        
                        // Undo mock
                        node.occupiedBy = 2;
                        destNode.occupiedBy = 0;

                        if (score > bestVal) {
                            bestVal = score;
                            bestMove = { from: fromIdx, to: toIdx };
                        }
                    }
                });
            }
        });

        if (bestMove) {
            nodes[bestMove.from].occupiedBy = 0;
            nodes[bestMove.to].occupiedBy = 2;

            if (checkForNewMill(bestMove.to, 2)) {
                triggerPieceRemovalPhase();
                setTimeout(executeAIRemoval, 700);
            } else {
                endTurn();
            }
        }
    }
}

function evaluatePlacement(nodeIdx) {
    let score = 0;
    
    // 1. Prioritize forming an AI mill
    nodes[nodeIdx].occupiedBy = 2;
    if (checkForNewMill(nodeIdx, 2)) score += 100;
    nodes[nodeIdx].occupiedBy = 0;

    // 2. Prioritize blocking a Player mill
    nodes[nodeIdx].occupiedBy = 1;
    if (checkForNewMill(nodeIdx, 1)) score += 80;
    nodes[nodeIdx].occupiedBy = 0;

    // Prefer midpoints over corners for connection opportunities
    if (nodeIdx % 2 === 1) score += 5;

    return score;
}

function evaluatePosition(nodeIdx) {
    let score = 0;
    
    // Prioritize forming an AI mill on this move
    if (checkForNewMill(nodeIdx, 2)) score += 100;
    
    // Prefer nodes that block opponent's adjacent shapes
    let neighbors = getNeighbors(nodeIdx);
    neighbors.forEach(n => {
        if (nodes[n].occupiedBy === 1) score += 10;
    });

    return score;
}

function executeAIRemoval() {
    let removeIdx = -1;
    let maxSeeds = -Infinity;

    // Find an opponent (player 1) piece to remove
    nodes.forEach((node, idx) => {
        if (node.occupiedBy === 1) {
            if (opponentOnlyHasMills(1) || !isPartOfMill(node, 1)) {
                // Prefer removing nodes that are adjacent to empty cells (active pieces)
                let score = getNeighbors(idx).filter(n => nodes[n].occupiedBy === 0).length;
                if (score > maxSeeds) {
                    maxSeeds = score;
                    removeIdx = idx;
                }
            }
        }
    });

    if (removeIdx !== -1) {
        nodes[removeIdx].occupiedBy = 0;
        gamePhase = lastPhase;
        endTurn();
    }
}

function calculateHint() {
    if (playerTurn !== 1 || isGameOver) return;

    if (gamePhase === 'placing') {
        let bestIdx = -1;
        let bestVal = -Infinity;

        nodes.forEach((node, idx) => {
            if (node.occupiedBy === 0) {
                let score = 0;
                node.occupiedBy = 1;
                if (checkForNewMill(idx, 1)) score += 100;
                node.occupiedBy = 0;

                node.occupiedBy = 2;
                if (checkForNewMill(idx, 2)) score += 80;
                node.occupiedBy = 0;

                if (idx % 2 === 1) score += 5;
                
                if (score > bestVal) {
                    bestVal = score;
                    bestIdx = idx;
                }
            }
        });

        if (bestIdx !== -1) {
            hintMoveObj = { to: bestIdx };
        }
    } else if (gamePhase === 'moving') {
        let bestMove = null;
        let bestVal = -Infinity;
        let flightMode = countPieces(1) === 3;

        nodes.forEach((node, fromIdx) => {
            if (node.occupiedBy === 1) {
                let neighbors = getNeighbors(fromIdx);
                nodes.forEach((destNode, toIdx) => {
                    if (destNode.occupiedBy === 0 && (flightMode || neighbors.includes(toIdx))) {
                        node.occupiedBy = 0;
                        destNode.occupiedBy = 1;
                        
                        let score = 0;
                        if (checkForNewMill(toIdx, 1)) score += 100;

                        let nList = getNeighbors(toIdx);
                        nList.forEach(n => {
                            if (nodes[n].occupiedBy === 2) score += 10;
                        });

                        node.occupiedBy = 1;
                        destNode.occupiedBy = 0;

                        if (score > bestVal) {
                            bestVal = score;
                            bestMove = { from: fromIdx, to: toIdx };
                        }
                    }
                });
            }
        });

        if (bestMove) {
            hintMoveObj = bestMove;
        }
    }
}

function windowResized() {
    const container = document.getElementById('canvas-parent');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    }
}
