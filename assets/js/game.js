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

const tetrominoes = [
    [[1, 1, 1], [0, 1, 0]], // T-Form
    [[1, 1], [1, 1]],       // O-Form
    [[0, 1, 0], [1, 1, 1]], // L-Form
    [[1, 0], [1, 0], [1, 1]], // J-Form
    [[1, 1, 1, 1]]          // I-Form (long bar)
];

let isSpacePressed = false;
let normalMoveInterval = 150;  // Slower than drop speed but still responsive
let moveIntervalId = null;
let currentDirection = 0;
let isPaused = false;
let gameOver = false;
let gameStarted = false;

let audioManager;

class AudioManager {
    constructor() {
        this.sounds = {
            theme: new Audio('/assets/audio/theme-a.mp3'),
            rotate: new Audio('/assets/audio/rotate.mp3'),
            clear: new Audio('/assets/audio/clear.mp3'),
            drop: new Audio('/assets/audio/drop.mp3'),
            levelup: new Audio('/assets/audio/levelup.mp3'),
            gameover: new Audio('/assets/audio/gameover.mp3')
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
            if (gameStarted && !gameOver && !isPaused) {
                this.playTheme();
            }
        }
        return this.isMuted;
    }
}

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
    document.getElementById('quitBtn').addEventListener('click', quitGame);
    document.getElementById('muteBtn').addEventListener('click', toggleMute);

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

function draw() {
    if (!gameStarted) {
        return; // Don't update anything until game starts
    }
    
    background(16, 20, 28);
    drawGrid();
    drawPiece();
    drawPreview();
    
    if (isPaused) {
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
            text('PAUSED', width/2, height/2);
        }
        
        // Main text
        fill(0, 255, 242);
        noStroke();
        text('PAUSED', width/2, height/2);
        
        pop();
    }
}

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

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    
    if (isPaused) {
        clearInterval(dropIntervalId);
        clearInterval(moveIntervalId);
        audioManager.stopTheme();
    } else {
        dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(level - 1));
        if (currentDirection !== 0) {
            moveIntervalId = setInterval(
                () => movePiece(currentDirection), 
                normalMoveInterval
            );
        }
        audioManager.playTheme();
    }
}

function restartGame() {
    grid = [];
    for (let i = 0; i < rows; i++) {
        grid.push(new Array(cols).fill(0));
    }
    
    clearInterval(dropIntervalId);
    clearInterval(moveIntervalId);
    
    isPaused = false;
    gameOver = false;
    currentDirection = 0;
    isSpacePressed = false;
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
}

function spawnPiece() {
    if (gameOver) return;
    
    currentPiece = nextPiece;
    currentPiece.x = floor(cols / 2) - 1;
    currentPiece.y = 0;
    nextPiece = getRandomPiece();
    drawPreview();
}

function getRandomPiece() {
    const index = floor(random(tetrominoes.length));
    return {
        shape: tetrominoes[index],
        x: 0,
        y: 0
    };
}

function drawPreview() {
    if (!previewCanvas || gameOver) return;
    
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

function rgba(r, g, b, a) {
    return color(r, g, b, a * 255);
}

function keyPressed() {
    if (!gameStarted || isPaused) return;
    
    if (keyCode === LEFT_ARROW) {
        if (currentDirection !== -1) {  // Only set up interval if not already moving left
            currentDirection = -1;
            movePiece(-1);
            clearInterval(moveIntervalId);
            moveIntervalId = setInterval(() => movePiece(-1), normalMoveInterval);
        }
    } else if (keyCode === RIGHT_ARROW) {
        if (currentDirection !== 1) {  // Only set up interval if not already moving right
            currentDirection = 1;
            movePiece(1);
            clearInterval(moveIntervalId);
            moveIntervalId = setInterval(() => movePiece(1), normalMoveInterval);
        }
    } else if (keyCode === DOWN_ARROW || keyCode === 32) { // Down arrow or Space bar
        if (!isSpacePressed) {
            isSpacePressed = true;
            clearInterval(dropIntervalId);
            dropIntervalId = setInterval(() => dropPiece(), getDropSpeed(level - 1) / 20); // 20x faster
        }
    } else if (keyCode === UP_ARROW) {
        rotatePiece();
    }
    
    if (keyCode === DOWN_ARROW) {
        score += 1; // Add 1 point for soft drop
        updateScoreDisplay();
    } else if (keyCode === 32) { // Space bar
        score += 2; // Add 2 points for hard drop
        updateScoreDisplay();
    }
}

function keyReleased() {
    if (keyCode === 32 || keyCode === DOWN_ARROW) { // Space bar or Down arrow
        isSpacePressed = false;
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

function movePiece(dir) {
    if (!gameStarted || isPaused) return;
    
    currentPiece.x += dir;

    if (checkCollision()) {
        currentPiece.x -= dir;
    }
}

function dropPiece() {
    if (!gameStarted || isPaused) return;
    
    currentPiece.y++;

    if (checkCollision()) {
        currentPiece.y--;
        placePiece();
    }
}

function rotatePiece() {
    if (!gameStarted || isPaused) return;
    
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

function placePiece() {
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
            spawnPiece();
            if (checkCollision()) { 
                handleGameOver();
            }
        }, 100);
    } else {
        spawnPiece();
        if (checkCollision()) { 
            handleGameOver();
        }
    }
}

function handleGameOver() {
    gameOver = true;
    noLoop();
    audioManager.stopTheme();
    audioManager.playSound('gameover');
    console.log("Game Over!");
    
    // Draw game over text with glow effect
    push();
    textSize(40);
    textAlign(CENTER, CENTER);
    
    // Add glow effect
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

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = score;
    document.getElementById('level-display').textContent = `Level: ${level} (${linesCleared} lines)`;
}

function startGame() {
    gameStarted = true;
    
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
    gameStarted = false;
    gameOver = false;
    isPaused = false;
    currentDirection = 0;
    isSpacePressed = false;
    
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

function toggleMute() {
    const isMuted = audioManager.toggleMute();
    document.getElementById('muteBtn').textContent = isMuted ? 'Unmute' : 'Mute';
}
