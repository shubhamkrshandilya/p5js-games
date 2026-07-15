# 🎮 Creative Coding Retro Games Arcade

Welcome to the **Retro Games Arcade** repository! This is a curated collection of classic puzzle and traditional board games from around the globe, remade with modern fluid vector animations, glassmorphism UI elements, neon cyber-arcade aesthetics, and full mobile-responsive touch controller overlays.

All games are built using **HTML5, Javascript, and p5.js**.

---

## 🕹️ Active Games Directory

### 1. 🧱 [Neon Tetris](https://shubhamkrshandilya.github.io/p5js-games/tetris/)
* **Focus**: Collision matrices, rotation translation kinematics, and block particle physics.
* **Key Features**:
  - **Ghost Drop Projection**: Real-time landing projection indicator.
  - Hold swap mechanism and side HUD previews for held/upcoming pieces.
  - Frozen line-clear flash pulse (15 frames) with neon vector particle explosions.

### 2. 🧮 [Glassmorphic 2048](https://shubhamkrshandilya.github.io/p5js-games/2048/)
* **Focus**: Vector sliding mathematics, interpolation, and history buffers.
* **Key Features**:
  - Linear vector sliding transitions and pulse scale merge feedback.
  - **HSL Color Temperature Gradient**: Shifting tile styles from ice-blue (2) to gold (2048).
  - Multi-step Undo stack history (records up to 20 moves).

### 3. 💣 [Holo Minesweeper](https://shubhamkrshandilya.github.io/p5js-games/minesweeper/)
* **Focus**: Graph traversal, radial coordinate mappings, and recursion.
* **Key Features**:
  - Matrix-green holographic grid with coordinates A-J and 1-12.
  - **Radar Sonar Scan**: Interactive hover ripple following pointer position.
  - Distance-sorted sequential chain reactions upon hitting a mine.

### 4. ☄️ [Holo Asteroids](https://shubhamkrshandilya.github.io/p5js-games/asteroids/)
* **Focus**: Physics vector dynamics, thrust friction glides, and generative noise.
* **Key Features**:
  - Space physics flight glide with inertia and particle tail exhaust.
  - Shield health mechanics with invulnerability indicators.
  - Generative noise asteroids that split sequentially on hit (Large -> Medium -> Small -> Debris).

### 5. ♟️ [Cyber Chess](https://shubhamkrshandilya.github.io/p5js-games/chess/)
* **Focus**: Game state trees, Minimax heuristics, and evaluation tables.
* **Key Features**:
  - Unicode chess pieces rendered with layered HSL drop-shadow glow overlays.
  - Integrated Captured pieces tray trackers and flashing Red Check danger indicators.
  - **Alpha-Beta Minimax AI**: Multi-level difficulty selector (Easy: depth 1, Medium: depth 2, Hard: depth 3).

### 6. 🪵 [Neon Mancala (Africa)](https://shubhamkrshandilya.github.io/p5js-games/mancala/)
* **Focus**: Counter-clockwise circular list indexing.
* **Key Features**:
  - Warm Mahogany color palette with neon pit borders and multi-colored gemstone seeds (Ruby, Emerald, Sapphire, Amethyst, Topaz).
  - Rules logic: Extra turn triggers upon landing in your store, counter-clockwise sowing, and seed captures.

### 7. 🕸️ [Holo Nine Men's Morris (Ancient Rome)](https://shubhamkrshandilya.github.io/p5js-games/morris/)
* **Focus**: Graph node topologies and game phase state machines.
* **Key Features**:
  - Concentric triple-square vector grid connecting 24 game intersections.
  - Phase flow: Phase 1 (Placing), Phase 2 (Adjacent Sliding), Phase 3 (Flying on 3 remaining stones).
  - Real-time Mill matching detection and illegal capture checkers.

### 8. ☯️ [Cyber Go (East Asia)](https://shubhamkrshandilya.github.io/p5js-games/go/)
* **Focus**: Flood-fill boundary evaluation and liberty checkers.
* **Key Features**:
  - 9x9 intersection grid mapping Cyan (Black/P1) and Magenta (White/AI) stones.
  - Group Liberties check, Ko rule prevention, and Suicide prevention logic.
  - Interactive territory boundaries score estimation using flood-fill scoring.

### 9. 🎲 [Glass Backgammon (Middle East)](https://shubhamkrshandilya.github.io/p5js-games/backgammon/)
* **Focus**: Dice state mapping, double rolls, and bear-off constraints.
* **Key Features**:
  - Standard 24 point triangles with responsive stack styling.
  - Dice rules: 3D dice rolling, double rolls getting 4 moves, blot hitting, central bar recovery, and bearing off.
  - **Movement Flow Animation**: Custom animated vectors showing checker direction guides.

---

## 🌟 Intelligent Advisory System (GET ADVISORY)
Every strategic game includes a **Get Advisory** helper button. When clicked, it evaluates the board configuration on the player's behalf:
* **Chess/Mancala/Morris/Backgammon**: Uses heuristic evaluation functions to recommend the optimal next move, highlighting starting/ending positions in a pulsing gold border.
* **Go**: Scans safe intersections and suggests coordinates to maximize liberties or captures.
* All visual advisories clear immediately when you resume playing to preserve active focus.

---

## 📖 Frosted Glass Help Modals
Each game includes a **"HOW TO PLAY"** button in the HUD sidebar. Clicking it slides in a fullscreen frosted glass overlay panel detailing:
* Complete rules and victory conditions tailored to this digital implementation.
* Coordinates and color schemes.
* An active external hyperlink to the official Wikipedia rulebook.

---

## 🛠️ Local Development & Execution

To host this repository locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shubhamkrshandilya/p5js-games.git
   cd p5js-games
   ```

2. **Launch a local server**:
   * Using Python 3:
     ```bash
     python3 -m http.server 8083
     ```
   * Using Node.js:
     ```bash
     npx live-server --port=8083
     ```

3. Open **`http://localhost:8083`** in your browser.
