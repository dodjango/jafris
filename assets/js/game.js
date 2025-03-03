let grid = [];
let cols = 10;
let rows = 20;
let blockSize;

let currentPiece;
let nextPiece;
let previewCanvas;
let pauseOverlay;

let score = 0;
let level = 1;
let linesCleared = 0;
let frameCounter = 0;

const GameState = {
    INITIAL: 'INITIAL',    // Game not started yet
    PLAYING: 'PLAYING',    // Game is active and running
    PAUSED: 'PAUSED',     // Game is paused
    GAME_OVER: 'GAME_OVER' // Game is over
};

let gameState = GameState.INITIAL;
let showingQuitDialog = false;
let storedDropInterval = null;  // Store interval timing when dialog shows
let storedMoveInterval = null;

let audioManager;

// Make p5.js functions global for proper integration
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.keyReleased = keyReleased;

const tetrominoes = [
    [[1, 1, 1], [0, 1, 0]], // T-Form
    [[1, 1], [1, 1]],       // O-Form
    [[0, 1, 0], [1, 1, 1]], // L-Form
    [[1, 0], [1, 0], [1, 1]], // J-Form
    [[1, 1, 1, 1]]          // I-Form (long bar)
];

let isSoftDropActive = false;
let normalMoveInterval = 150;  // Slower than drop speed but still responsive
let moveIntervalId = null;
let currentDirection = 0;

/**
 * AudioManager class to handle all game audio functionality
 */
class AudioManager {
    constructor() {
        this.sounds = {
            theme: new Audio('assets/audio/theme-a.mp3'),
            rotate: new Audio('assets/audio/rotate.mp3'),
            clear: new Audio('assets/audio/clear.mp3'),
            drop: new Audio('assets/audio/drop.mp3'),
            levelup: new Audio('assets/audio/levelup.mp3'),
            gameover: new Audio('assets/audio/gameover.mp3')
        };
        // Loop the theme music
        this.sounds.theme.loop = true;
        
        // Set volumes
        this.sounds.theme.volume = 0.5;
        this.sounds.rotate.volume = 0.3;
        this.sounds.clear.volume = 0.4;
        this.sounds.drop.volume = 0.3;
        this.sounds.levelup.volume = 0.4;
        this.sounds.gameover.volume = 0.4;
        
        this.isMuted = false;
    }

    playTheme() {
        if (!this.isMuted) {
            this.sounds.theme.currentTime = 0;
            this.sounds.theme.play();
        }
    }

    stopTheme() {
        this.sounds.theme.pause();
        this.sounds.theme.currentTime = 0;
    }

    playSound(soundName) {
        if (!this.isMuted && this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopTheme();
        } else {
            this.playTheme();
        }
        return this.isMuted;
    }
}

/**
 * Creates a dialog box for quitting the game
 * Adds event listeners for yes/no buttons
 */
function createQuitDialog() {
    // Add event listeners for the buttons
    document.getElementById('quit-yes').addEventListener('click', () => {
        hideQuitDialog();
        quitGame();
    });
    
    document.getElementById('quit-no').addEventListener('click', () => {
        hideQuitDialog();
    });
}

/**
 * Displays the quit confirmation dialog and pauses game intervals
 */
function showQuitDialog() {
    if (!showingQuitDialog) {
        showingQuitDialog = true;
        document.getElementById('quit-dialog').style.display = 'flex';
        
        // Store and clear the intervals if game is running
        if (gameState === GameState.PLAYING) {
            // Store current intervals
            if (dropIntervalId) {
                storedDropInterval = getDropSpeed(level - 1);
                clearInterval(dropIntervalId);
                dropIntervalId = null;
            }
            if (moveIntervalId) {
                storedMoveInterval = normalMoveInterval;
                clearInterval(moveIntervalId);
                moveIntervalId = null;
            }
        }
    }
}

/**
 * Hides the quit confirmation dialog and restores game intervals
 */
function hideQuitDialog() {
    showingQuitDialog = false;
    document.getElementById('quit-dialog').style.display = 'none';
    
    // Restore the intervals if game was running
    if (gameState === GameState.PLAYING) {
        // Restore drop interval
        if (storedDropInterval !== null) {
            dropIntervalId = setInterval(() => dropPiece(), storedDropInterval);
            storedDropInterval = null;
        }
        // Restore move interval if there was one
        if (storedMoveInterval !== null && currentDirection !== 0) {
            moveIntervalId = setInterval(() => movePiece(currentDirection), storedMoveInterval);
            storedMoveInterval = null;
        }
    }
}

/**
 * Initializes the game canvas, grid, and UI elements
 * Sets up event listeners and creates initial game state
 */
function setup() {
    let canvas = createCanvas(400, 800);
    canvas.parent('game-canvas');
    blockSize = width / cols;

    for (let i = 0; i < rows; i++) {
        grid.push(new Array(cols).fill(0));
    }

    // Set up button listeners
    document.getElementById('playBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('quitBtn').addEventListener('click', () => {
        if (gameState === GameState.PLAYING) {
            showQuitDialog();
        } else {
            quitGame();
        }
    });
    document.getElementById('muteBtn').addEventListener('click', toggleMute);

    // Create quit dialog
    createQuitDialog();

    // Initialize all buttons as disabled except Play
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('restartBtn').disabled = true;
    document.getElementById('quitBtn').disabled = true;
    document.getElementById('muteBtn').disabled = true;

    // Create preview canvas with explicit size
    previewCanvas = createGraphics(120, 120);
    let previewContainer = document.getElementById('piece-preview');
    previewContainer.innerHTML = '';
    previewContainer.appendChild(previewCanvas.canvas);
    
    // Make sure the canvas is visible
    previewCanvas.canvas.style.display = 'block';
    previewCanvas.canvas.style.width = '100%';
    previewCanvas.canvas.style.height = '100%';

    // Create pause overlay
    pauseOverlay = createGraphics(width, height);

    // Draw initial state
    background(16, 20, 28);
    drawGrid();
    drawPlayPrompt();

    // Initialize audio manager
    audioManager = new AudioManager();
}

/**
 * Main game loop function that handles rendering
 * Updates game visuals based on current state
 */
function draw() {
    if (gameState === GameState.INITIAL) {
        return; // Don't update anything until game starts
    }
    
    background(16, 20, 28);
    drawGrid();
    
    if (gameState !== GameState.GAME_OVER) {
        drawGhostPiece();  // Draw ghost piece before current piece
        drawPiece();
        drawPreview();
    }
    
    if (gameState === GameState.PAUSED) {
        // Create strong blur effect
        push();
        // First layer - strong opacity
        noStroke();
        fill(16, 20, 28, 240); // More opaque background
        rect(0, 0, width, height);
        
        // Second layer - noise pattern
        for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width; x += 4) {
                if (random() > 0.5) {
                    fill(0, 255, 242, random(5, 15));
                    noStroke();
                    rect(x, y, 4, 4);
                }
            }
        }
        
        // Third layer - scanlines
        for (let i = 0; i < height; i += 2) {
            stroke(0, 255, 242, 5);
            line(0, i, width, i);
        }
        
        // Fourth layer - diagonal lines
        stroke(0, 255, 242, 8);
        for (let i = -height; i < width; i += 20) {
            line(i, 0, i + height, height);
        }
        
        // Draw pause text with strong glow
        textSize(40);
        textAlign(CENTER, CENTER);
        
        // Outer glow
        for (let i = 6; i > 0; i--) {
            noFill();
            stroke(0, 255, 242, 20);
            text('PAUSED', width/2, height/3);
        }
        
        // Main text
        fill(0, 255, 242);
        noStroke();
        text('PAUSED', width/2, height/3);

        // Draw controls info box
        textSize(16);
        textAlign(CENTER, CENTER);
        const controls = [
            ['←/→', 'Move Left/Right'],
            ['↑', 'Rotate'],
            ['↓', 'Soft Drop'],
            ['Space', 'Hard Drop'],
            ['P', 'Pause/Resume'],
            ['Enter', 'Start/Restart'],
            ['Esc', 'Quit']
        ];

        const boxWidth = 300;
        const boxHeight = 250;
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2 + 50;

        // Draw box background with glow
        fill(16, 20, 28, 200);
        stroke(0, 255, 242, 64);
        rect(boxX, boxY, boxWidth, boxHeight, 10);

        // Draw box title
        textSize(20);
        fill(0, 255, 242);
        noStroke();
        text('GAME CONTROLS', width/2, boxY + 30);

        // Draw controls list
        textSize(16);
        textAlign(LEFT, CENTER);
        controls.forEach((control, index) => {
            const yPos = boxY + 70 + index * 25;
            
            // Draw key background
            fill(0, 255, 242, 32);
            stroke(0, 255, 242, 64);
            rect(boxX + 40, yPos - 10, 60, 20, 5);
            
            // Draw key text
            fill(0, 255, 242);
            noStroke();
            textAlign(CENTER, CENTER);
            text(control[0], boxX + 70, yPos);
            
            // Draw action text
            textAlign(LEFT, CENTER);
            text(control[1], boxX + 120, yPos);
        });
        
        pop();
    }
    
    if (gameState === GameState.GAME_OVER) {
        // Draw game over overlay
        push();
        // Semi-transparent overlay
        noStroke();
        fill(16, 20, 28, 200);
        rect(0, 0, width, height);
        
        // Draw game over text with glow effect
        textSize(40);
        textAlign(CENTER, CENTER);
        
        // Outer glow
        for (let i = 6; i > 0; i--) {
            noFill();
            stroke(0, 255, 242, 20);
            text('GAME OVER', width/2, height/2);
        }
        
        // Main text
        fill(0, 255, 242);
        noStroke();
        text('GAME OVER', width/2, height/2);
        pop();
    }
}

/**
 * Draws the game grid with current block positions
 */
function drawGrid() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            stroke(0, 255, 242, 64);  // Cyan grid lines
            if (grid[y][x] === 0) {
                noFill();
            } else {
                fill(0, 255, 242, 128);  // Cyan blocks
            }
            rect(x * blockSize, y * blockSize, blockSize, blockSize);
        }
    }
}

/**
 * Draws the current active tetromino piece
 */
function drawPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] === 1) {
                stroke(0, 255, 242, 128);
                fill(0, 255, 242, 64);
                rect(
                    (currentPiece.x + x) * blockSize,
                    (currentPiece.y + y) * blockSize,
                    blockSize,
                    blockSize
                );
                
                // Add glow effect
                noFill();
                stroke(0, 255, 242, 32);
                rect(
                    (currentPiece.x + x) * blockSize - 1,
                    (currentPiece.y + y) * blockSize - 1,
                    blockSize + 2,
                    blockSize + 2
                );
            }
        }
    }
}

/**
 * Draws a ghost piece showing where the current piece will land
 */
function drawGhostPiece() {
    if (!gameState === GameState.PLAYING || gameState === GameState.GAME_OVER || !currentPiece) return;
    
    const originalY = currentPiece.y;
    currentPiece.y = findLowestPosition();
    
    // Draw ghost piece with semi-transparent effect
    push();
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] === 1) {
                // Draw ghost piece outline
                stroke(0, 255, 242, 40);
                noFill();
                rect(
                    (currentPiece.x + x) * blockSize,
                    (currentPiece.y + y) * blockSize,
                    blockSize,
                    blockSize
                );
                
                // Add subtle glow effect
                noFill();
                stroke(0, 255, 242, 20);
                rect(
                    (currentPiece.x + x) * blockSize - 1,
                    (currentPiece.y + y) * blockSize - 1,
                    blockSize + 2,
                    blockSize + 2
                );
            }
        }
    }
    pop();
    
    // Reset position
    currentPiece.y = originalY;
}

/**
 * Toggles the game's pause state
 * Handles interval management and UI updates
 */
function togglePause() {
    if (gameState === GameState.PLAYING) {
        gameState = GameState.PAUSED;
        clearInterval(dropIntervalId);
        clearInterval(moveIntervalId);
        audioManager.stopTheme();
    } else if (gameState === GameState.PAUSED) {
        gameState = GameState.PLAYING;
        dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(level - 1));
        if (currentDirection !== 0) {
            moveIntervalId = setInterval(
                () => movePiece(currentDirection), 
                normalMoveInterval
            );
        }
        audioManager.playTheme();
    }
    
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = gameState === GameState.PAUSED ? 'Resume' : 'Pause';
}

/**
 * Restarts the game, resetting all game states and scores
 */
function restartGame() {
    grid = [];
    for (let i = 0; i < rows; i++) {
        grid.push(new Array(cols).fill(0));
    }
    
    clearInterval(dropIntervalId);
    clearInterval(moveIntervalId);
    
    // Reset game states
    gameState = GameState.PLAYING;
    currentDirection = 0;
    isSoftDropActive = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    // Update button states
    document.getElementById('playBtn').style.display = 'none';
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('restartBtn').disabled = false;
    document.getElementById('quitBtn').disabled = false;
    document.getElementById('muteBtn').disabled = false;
    
    nextPiece = getRandomPiece();
    spawnPiece();
    dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(0));
    loop();
    
    score = 0;
    level = 1;
    linesCleared = 0;
    updateScoreDisplay();
    
    // Start the theme music
    audioManager.playTheme();
}

/**
 * Spawns a new tetromino piece and updates the preview
 */
function spawnPiece() {
    if (gameState === GameState.GAME_OVER) return;
    
    currentPiece = nextPiece;
    currentPiece.x = floor(cols / 2) - 1;
    currentPiece.y = 0;
    nextPiece = getRandomPiece();
    drawPreview();
}

/**
 * Returns a random tetromino piece
 * @returns {Object} A piece object with shape and position properties
 */
function getRandomPiece() {
    const index = floor(random(tetrominoes.length));
    return {
        shape: tetrominoes[index],
        x: 0,
        y: 0
    };
}

/**
 * Draws the next piece preview in the preview canvas
 */
function drawPreview() {
    if (!previewCanvas || gameState === GameState.GAME_OVER) return;
    
    // Clear the canvas first
    previewCanvas.clear();
    previewCanvas.background(16, 20, 28);
    
    if (!nextPiece || !nextPiece.shape) return;
    
    const blockSizePreview = 20;
    const offsetX = (previewCanvas.width - nextPiece.shape[0].length * blockSizePreview) / 2;
    const offsetY = (previewCanvas.height - nextPiece.shape.length * blockSizePreview) / 2;
    
    // Draw grid background
    previewCanvas.stroke(0, 255, 242, 30);
    for (let i = 0; i <= previewCanvas.width; i += blockSizePreview) {
        previewCanvas.line(i, 0, i, previewCanvas.height);
    }
    for (let i = 0; i <= previewCanvas.height; i += blockSizePreview) {
        previewCanvas.line(0, i, previewCanvas.width, i);
    }
    
    // Draw the piece with glow effect
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x] === 1) {
                // Main block
                previewCanvas.stroke(0, 255, 242, 128);
                previewCanvas.fill(0, 255, 242, 64);
                previewCanvas.rect(
                    offsetX + x * blockSizePreview,
                    offsetY + y * blockSizePreview,
                    blockSizePreview,
                    blockSizePreview
                );
                
                // Glow effect
                previewCanvas.noFill();
                previewCanvas.stroke(0, 255, 242, 32);
                for (let i = 1; i <= 3; i++) {
                    previewCanvas.rect(
                        offsetX + x * blockSizePreview - i,
                        offsetY + y * blockSizePreview - i,
                        blockSizePreview + (i * 2),
                        blockSizePreview + (i * 2)
                    );
                }
            }
        }
    }
}

/**
 * Creates an RGBA color value
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @param {number} a - Alpha value (0-1)
 * @returns {p5.Color} Color object
 */
function rgba(r, g, b, a) {
    return color(r, g, b, a * 255);
}

/**
 * Calculates the lowest possible position for the current piece
 * @returns {number} The lowest valid Y position
 */
function findLowestPosition() {
    let lowestY = currentPiece.y;
    
    // Keep moving down until collision
    while (!checkCollision()) {
        currentPiece.y++;
    }
    
    // Move back up one step since we hit collision
    currentPiece.y--;
    
    // Store the lowest valid position
    const lowestPosition = currentPiece.y;
    
    // Reset to original position
    currentPiece.y = lowestY;
    
    return lowestPosition;
}

/**
 * Performs a hard drop of the current piece
 * Instantly moves piece to lowest possible position
 */
function hardDrop() {
    if (gameState !== GameState.PLAYING || showingQuitDialog) return;
    
    const startY = currentPiece.y;
    currentPiece.y = findLowestPosition();
    
    // Calculate score based on distance dropped
    const cellsDropped = currentPiece.y - startY;
    score += cellsDropped * 2; // 2 points per cell for hard drop
    
    // Visual feedback for hard drop
    push();
    stroke(0, 255, 242, 200);
    strokeWeight(2);
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] === 1) {
                line(
                    (currentPiece.x + x) * blockSize + blockSize/2,
                    startY * blockSize,
                    (currentPiece.x + x) * blockSize + blockSize/2,
                    currentPiece.y * blockSize
                );
            }
        }
    }
    pop();
    
    updateScoreDisplay();
    
    // Place the piece immediately
    placePiece();
    audioManager.playSound('drop');
}

/**
 * Handles keyboard press events for game controls
 * @param {KeyboardEvent} event - The keyboard event
 */
function keyPressed() {
    if (showingQuitDialog) {
        if (keyCode === ESCAPE) {
            hideQuitDialog();
        }
        return;
    }

    if (gameState === GameState.INITIAL) {
        if (keyCode === ENTER) {
            startGame();
            return;
        }
        return;
    }
    
    if (gameState === GameState.GAME_OVER) {
        if (keyCode === ENTER) {
            restartGame();
            return;
        }
        if (keyCode === ESCAPE) {
            quitGame();
            return;
        }
        return;
    }
    
    if (keyCode === ESCAPE) {
        showQuitDialog();
        return;
    }

    if (keyCode === 80) { // 'P' key for pause/resume
        togglePause();
        return;
    }
    
    if (gameState === GameState.PAUSED) { // Block all other keys when paused
        return;
    }
    
    if (keyCode === LEFT_ARROW) {
        if (currentDirection !== -1) {
            currentDirection = -1;
            movePiece(-1);
            clearInterval(moveIntervalId);
            moveIntervalId = setInterval(() => movePiece(-1), normalMoveInterval);
        }
    } else if (keyCode === RIGHT_ARROW) {
        if (currentDirection !== 1) {
            currentDirection = 1;
            movePiece(1);
            clearInterval(moveIntervalId);
            moveIntervalId = setInterval(() => movePiece(1), normalMoveInterval);
        }
    } else if (keyCode === DOWN_ARROW) { // Soft drop
        if (!isSoftDropActive) {
            isSoftDropActive = true;
            clearInterval(dropIntervalId);
            dropIntervalId = setInterval(() => {
                if (dropPiece()) {  // Only add score if piece actually moved down
                    score += 1;     // 1 point per cell for soft drop
                    updateScoreDisplay();
                }
            }, getDropSpeed(level - 1) / 10); // 10x faster for soft drop
        }
    } else if (keyCode === 32) { // Space bar - Hard drop
        hardDrop();
    } else if (keyCode === UP_ARROW) {
        rotatePiece();
    }
}

/**
 * Handles keyboard release events for game controls
 * @param {KeyboardEvent} event - The keyboard event
 */
function keyReleased() {
    if (gameState === GameState.GAME_OVER) return;
    
    if (keyCode === DOWN_ARROW) { // Only soft drop should reset speed
        isSoftDropActive = false;
        clearInterval(dropIntervalId);
        dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(level - 1));
    } else if (keyCode === LEFT_ARROW && currentDirection === -1) {
        currentDirection = 0;
        clearInterval(moveIntervalId);
        moveIntervalId = null;
    } else if (keyCode === RIGHT_ARROW && currentDirection === 1) {
        currentDirection = 0;
        clearInterval(moveIntervalId);
        moveIntervalId = null;
    }
}

/**
 * Moves the current piece horizontally
 * @param {number} dir - Direction (-1 for left, 1 for right)
 */
function movePiece(dir) {
    if (gameState !== GameState.PLAYING || showingQuitDialog) return;
    
    currentPiece.x += dir;

    if (checkCollision()) {
        currentPiece.x -= dir;
    }
}

/**
 * Moves the current piece down one position
 * @returns {boolean} True if piece was moved, false if piece was placed
 */
function dropPiece() {
    if (gameState !== GameState.PLAYING || showingQuitDialog) return;
    
    const previousY = currentPiece.y;
    currentPiece.y++;

    if (checkCollision()) {
        currentPiece.y = previousY;
        placePiece();
        return false;
    }
    return true;
}

/**
 * Rotates the current piece clockwise
 */
function rotatePiece() {
    if (gameState !== GameState.PLAYING || showingQuitDialog) return;
    
    const rotated = [];
    
    const shape = currentPiece.shape;
    
    for (let x = 0; x < shape[0].length; x++) {
        rotated.push([]);
        for (let y = shape.length - 1; y >= 0; y--) {
            rotated[x].push(shape[y][x]);
        }
    }

    const prevShape = currentPiece.shape;
    
    currentPiece.shape = rotated;

    if (checkCollision()) {
        currentPiece.shape = prevShape;
    }

    if (!checkCollision()) {
        audioManager.playSound('rotate');
    }
}

/**
 * Checks if the current piece collides with walls or other pieces
 * @returns {boolean} True if collision detected, false otherwise
 */
function checkCollision() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (
                currentPiece.shape[y][x] === 1 &&
                (
                    currentPiece.x + x < 0 ||
                    currentPiece.x + x >= cols ||
                    currentPiece.y + y >= rows ||
                    grid[currentPiece.y + y][currentPiece.x + x] === 1
                )
            ) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Places the current piece on the grid and handles line clearing
 */
function placePiece() {
    // Don't proceed if game is already over
    if (gameState === GameState.GAME_OVER) return;
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] === 1) {
                grid[currentPiece.y + y][currentPiece.x + x] = 1;
            }
        }
    }

    audioManager.playSound('drop');
    
    if (clearRows()) {
        setTimeout(() => {
            if (gameState !== GameState.GAME_OVER) {  // Check again after timeout
                spawnPiece();
                if (checkCollision()) { 
                    handleGameOver();
                }
            }
        }, 100);
    } else {
        spawnPiece();
        if (checkCollision()) { 
            handleGameOver();
        }
    }
}

/**
 * Handles game over state
 * Stops intervals and updates UI
 */
function handleGameOver() {
    if (gameState === GameState.GAME_OVER) return;  // Prevent multiple calls
    
    gameState = GameState.GAME_OVER;
    audioManager.stopTheme();
    audioManager.playSound('gameover');
    console.log("Game Over!");
    
    // Clear any active intervals
    clearInterval(dropIntervalId);
    clearInterval(moveIntervalId);
    moveIntervalId = null;

    // Stop the draw loop
    noLoop();

    // Disable pause button in game over state
    document.getElementById('pauseBtn').disabled = true;
}

/**
 * Checks and clears completed rows
 * Updates score and level based on cleared lines
 * @returns {boolean} True if any rows were cleared
 */
function clearRows() {
    let rowsCleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell === 1)) { 
            grid.splice(y, 1);
            grid.unshift(new Array(cols).fill(0));
            rowsCleared++;
            y++;
        }
    }
    
    if (rowsCleared > 0) {
        // Calculate score based on number of lines cleared
        let points = 0;
        switch(rowsCleared) {
            case 1: points = 40; break;
            case 2: points = 100; break;
            case 3: points = 300; break;
            case 4: points = 1200; break;
        }
        score += points * level;
        
        // Update total lines cleared and level
        linesCleared += rowsCleared;
        let newLevel = Math.floor(linesCleared / 10) + 1;
        
        // If level increased, update drop speed and play sound
        if (newLevel !== level) {
            level = newLevel;
            clearInterval(dropIntervalId);
            dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(level - 1));
            audioManager.playSound('levelup');
        }
        
        // Update display
        updateScoreDisplay();
    }
    
    return rowsCleared > 0;
}

/**
 * Updates the score and level display in the UI
 */
function updateScoreDisplay() {
    document.getElementById('score-display').textContent = score;
    document.getElementById('level-display').textContent = `Level: ${level} (${linesCleared} lines)`;
}

/**
 * Starts a new game
 * Initializes game state and starts intervals
 */
function startGame() {
    gameState = GameState.PLAYING;
    
    // Reset game stats
    score = 0;
    level = 1;
    linesCleared = 0;
    
    // Enable game control buttons
    document.getElementById('playBtn').style.display = 'none';
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('restartBtn').disabled = false;
    document.getElementById('quitBtn').disabled = false;
    document.getElementById('muteBtn').disabled = false;
    
    // Initialize game pieces
    nextPiece = getRandomPiece();
    spawnPiece();
    
    // Start the game loop with initial speed
    dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(0)); // Level 1 speed
    
    updateScoreDisplay();

    audioManager.playTheme();
}

/**
 * Draws the initial play prompt screen
 */
function drawPlayPrompt() {
    push();
    // Add glow effect background
    noStroke();
    fill(0, 255, 242, 20);
    for(let i = 0; i < 3; i++) {
        ellipse(width/2, height/2, 300 + i * 20, 300 + i * 20);
    }
    
    // Draw text with glow
    textSize(40);
    textAlign(CENTER, CENTER);
    
    // Outer glow
    for (let i = 6; i > 0; i--) {
        noFill();
        stroke(0, 255, 242, 20);
        text('JAFRIS', width/2, height/2 - 50);
    }
    
    // Main text
    fill(0, 255, 242);
    noStroke();
    text('JAFRIS', width/2, height/2 - 50);
    
    textSize(20);
    text('Press Play to Start', width/2, height/2 + 50);
    pop();
}

/**
 * Quits the current game and resets to initial state
 */
function quitGame() {
    // Clear intervals
    clearInterval(dropIntervalId);
    clearInterval(moveIntervalId);
    
    // Reset game state
    grid = [];
    for (let i = 0; i < rows; i++) {
        grid.push(new Array(cols).fill(0));
    }
    
    // Reset game variables
    gameState = GameState.INITIAL;
    currentDirection = 0;
    isSoftDropActive = false;
    
    // Reset button states
    document.getElementById('playBtn').style.display = 'block';
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('restartBtn').disabled = true;
    document.getElementById('quitBtn').disabled = true;
    document.getElementById('muteBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    // Clear preview
    if (previewCanvas) {
        previewCanvas.clear();
        previewCanvas.background(16, 20, 28);
    }
    
    // Draw initial state
    background(16, 20, 28);
    drawGrid();
    drawPlayPrompt();
    
    // Ensure game loop continues
    loop();
    
    score = 0;
    level = 1;
    linesCleared = 0;
    updateScoreDisplay();

    audioManager.stopTheme();
}

/**
 * Calculates the piece drop speed based on current level
 * @param {number} level - Current game level
 * @returns {number} Drop speed in milliseconds
 */
function getDropSpeed(level) {
    // NES Tetris speed formula (frames per grid cell)
    // Level 0-8: 48, 43, 38, 33, 28, 23, 18, 13, 8
    // Level 9+: 6
    // We need to convert frames (1/60 sec) to milliseconds
    if (level < 9) {
        return (48 - 5 * level) * (1000 / 60);
    }
    return 6 * (1000 / 60); // About 100ms for level 9 and up
}

/**
 * Toggles game audio mute state
 */
function toggleMute() {
    const isMuted = audioManager.toggleMute();
    document.getElementById('muteBtn').textContent = isMuted ? 'Unmute' : 'Mute';
}
