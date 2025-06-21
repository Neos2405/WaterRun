// Water Run - Charity Game
// Canvas and game initialization

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

// Game state
let gameStarted = false;
let gameRunning = false;

// Player stats
let score = 0;
let lives = 3;
const MAX_LIVES = 3;

// UI settings
const UI_COLOR = '#ffe12b';
const UI_BORDER_COLOR = '#333';
const HEART_COLOR = '#ff4444';
const HEART_EMPTY_COLOR = '#666';

// Background settings
const RIVER_WIDTH = 600;
const GRASS_WIDTH = (canvas.width - RIVER_WIDTH) / 2;
const RIVER_COLOR = '#22a9e5';
const GRASS_COLOR = '#6ede71';
const ROCK_COLOR = '#8b7355';
const TREE_COLOR = '#228b22';
const TREE_TRUNK_COLOR = '#8b4513';

// Game objects settings
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 38;
const PLAYER_COLOR = '#ffd700';
const PLAYER_OUTLINE = '#333';
const PLAYER_HANDLE_COLOR = '#b8860b';

const WATER_DROP_SIZE = 24;
const WATER_DROP_COLOR = '#1a85c7'; // Darker blue than river (#22a9e5)
const WATER_DROP_HIGHLIGHT = '#87ceeb';

const LOG_WIDTH = 70;
const LOG_HEIGHT = 18;
const LOG_COLOR = '#8b4513';
const LOG_OUTLINE = '#5d2f0a';
const LOG_RINGS = '#a0522d';

// Super drop settings
const SUPER_DROP_SIZE = 36;
const SUPER_DROP_COLOR = '#0f6aa3'; // Even darker blue for super drops
const SUPER_DROP_HIGHLIGHT = '#5fa8d3';
const SUPER_DROP_GLOW = '#3eb8f0'; // Lighter glow for super drops

// Sound system (using Web Audio API for pixel-perfect game sounds)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'splash':
            // Water collection sound - gentle splash
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
            
        case 'bonk':
            // Log collision sound - dull thud
            oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
            
        case 'revival':
            // Life restoration sound - magical chime
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
            break;
            
        case 'ding':
            // Milestone achievement sound - bright ding
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1); // A6
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.6);
            break;
    }
}

// Scrolling variables
let scrollOffset = 0;
const SCROLL_SPEED = 2;

// Background decorations
const decorations = [];

// Player object
let player = {
    x: GRASS_WIDTH + RIVER_WIDTH / 2 - PLAYER_WIDTH / 2, // Center of river
    y: canvas.height - 150, // Near bottom
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    invulnerable: false,
    invulnerabilityTime: 0
};

// Game objects arrays
let waterDrops = [];
let superDrops = [];
let logs = [];

// Mouse position for player movement
let mouseX = 0;
let mouseY = 0;

// Progress and milestone system
const MILESTONES = [
    { threshold: 0, noun: "a child" },
    { threshold: 100, noun: "a family" },
    { threshold: 300, noun: "a classroom" },
    { threshold: 600, noun: "a village" },
    { threshold: 1000, noun: "a community" },
    { threshold: 1500, noun: "a town" },
    { threshold: 2500, noun: "the world" }
];

let currentMilestone = 0;
let progressPercentage = 0;

// DOM elements for progress system
const progressFill = document.getElementById('progressFill');
const milestoneNoun = document.getElementById('milestoneNoun');
const sparkleEffect = document.getElementById('sparkleEffect');

// Initialize decorations
function initDecorations() {
    decorations.length = 0;
    
    // Add rocks and trees to left grass area
    for (let i = 0; i < 15; i++) {
        decorations.push({
            type: Math.random() < 0.6 ? 'rock' : 'tree',
            x: Math.random() * (GRASS_WIDTH - 30) + 10,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 10
        });
    }
    
    // Add rocks and trees to right grass area
    for (let i = 0; i < 15; i++) {
        decorations.push({
            type: Math.random() < 0.6 ? 'rock' : 'tree',
            x: Math.random() * (GRASS_WIDTH - 30) + GRASS_WIDTH + RIVER_WIDTH + 10,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 10
        });
    }
}

// Initialize the game
function init() {
    // Set up canvas rendering context
    ctx.imageSmoothingEnabled = false; // For pixel-art style
    
    // Initialize game stats
    resetGameStats();
    
    // Initialize background decorations
    initDecorations();
    
    // Draw initial background and UI
    drawBackground();
    drawUI();
    
    // Show start screen
    showOverlay();
    
    console.log('Water Run initialized');
}

function startGame() {
    gameStarted = true;
    gameRunning = true;
    hideOverlay();
    
    // Reset scroll offset
    scrollOffset = 0;
    
    // Reset player stats
    score = 0;
    lives = MAX_LIVES;
    
    // Reset player position and state
    player.x = GRASS_WIDTH + RIVER_WIDTH / 2 - PLAYER_WIDTH / 2;
    player.y = canvas.height - 150;
    player.invulnerable = false;
    player.invulnerabilityTime = 0;
    
    // Clear game objects
    waterDrops.length = 0;
    superDrops.length = 0;
    logs.length = 0;
    
    // Start the game loop
    gameLoop();
    
    console.log('Game started!');
}

function showOverlay() {
    overlay.classList.remove('hidden');
}

function hideOverlay() {
    overlay.classList.add('hidden');
}

function gameOver() {
    gameRunning = false;
    
    // Update overlay for game over screen
    overlay.innerHTML = `
        <h1>Game Over</h1>
        <p>Thanks for helping provide clean water!</p>
        <p>Score: ${score}</p>
        <button onclick="restartGame()">Play Again</button>
    `;
    
    showOverlay();
}

function restartGame() {
    // Reset game state
    gameStarted = false;
    gameRunning = false;
    
    // Reset overlay to start screen
    overlay.innerHTML = `
        <h1>Water Run</h1>
        <p>Help provide clean water for all!</p>
        <p>Move your jerrycan to collect water drops<br>
        and avoid the logs floating downstream.</p>
        <p>Click to start!</p>
        <button id="startBtn" onclick="startGame()">Start Game</button>
    `;
    
    showOverlay();
}

// Draw background with river and grass
function drawBackground() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw left grass area
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, 0, GRASS_WIDTH, canvas.height);
    
    // Draw river
    ctx.fillStyle = RIVER_COLOR;
    ctx.fillRect(GRASS_WIDTH, 0, RIVER_WIDTH, canvas.height);
    
    // Draw right grass area
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(GRASS_WIDTH + RIVER_WIDTH, 0, GRASS_WIDTH, canvas.height);
    
    // Draw river waves (animated white lines)
    drawRiverWaves();
    
    // Draw decorations
    drawDecorations();
}

function drawRiverWaves() {
    // Light sparks/slashes that flow down with the river
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    
    // Create vertical light streaks
    for (let i = 0; i < 12; i++) {
        const x = GRASS_WIDTH + 50 + (i * (RIVER_WIDTH - 100) / 11);
        const sparkOffset = (scrollOffset * (1 + i * 0.1)) % (canvas.height + 40);
        const y = sparkOffset - 20;
        
        // Random spark intensity
        const intensity = (Math.sin(i * 1.5 + scrollOffset * 0.02) + 1) * 0.3;
        ctx.globalAlpha = intensity;
        
        // Draw vertical light streak
        ctx.fillRect(x, y, 2, 15);
        ctx.fillRect(x - 1, y + 5, 4, 3);
        
        // Additional small sparkles
        if (Math.random() < 0.3) {
            ctx.fillRect(x + Math.random() * 20 - 10, y + Math.random() * 30, 1, 1);
        }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Occasional larger light slashes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 4; i++) {
        const x = GRASS_WIDTH + 100 + (i * (RIVER_WIDTH - 200) / 3);
        const slashOffset = (scrollOffset * (0.8 + i * 0.3)) % (canvas.height + 60);
        const y = slashOffset - 30;
        
        // Light slash effect
        ctx.globalAlpha = Math.sin(scrollOffset * 0.01 + i) * 0.3 + 0.4;
        ctx.fillRect(x - 2, y, 6, 25);
        ctx.fillRect(x - 1, y - 5, 4, 35);
        ctx.globalAlpha = 1.0;
    }
}

function drawDecorations() {
    decorations.forEach(decoration => {
        const y = (decoration.y + scrollOffset) % (canvas.height + decoration.size * 2) - decoration.size;
        
        if (decoration.type === 'rock') {
            drawRock(decoration.x, y, decoration.size);
        } else if (decoration.type === 'tree') {
            drawTree(decoration.x, y, decoration.size);
        }
    });
}

function drawRock(x, y, size) {
    ctx.fillStyle = ROCK_COLOR;
    
    // Draw a simple pixelated rock
    ctx.fillRect(x, y, size, size * 0.8);
    ctx.fillRect(x + size * 0.2, y - size * 0.2, size * 0.6, size * 0.4);
    
    // Add some shading
    ctx.fillStyle = '#6b5d4f';
    ctx.fillRect(x + size * 0.7, y + size * 0.1, size * 0.3, size * 0.7);
    ctx.fillRect(x + size * 0.1, y + size * 0.6, size * 0.8, size * 0.2);
}

function drawTree(x, y, size) {
    // Draw trunk
    ctx.fillStyle = TREE_TRUNK_COLOR;
    const trunkWidth = size * 0.3;
    const trunkHeight = size * 0.8;
    ctx.fillRect(x + size * 0.35, y + size * 0.4, trunkWidth, trunkHeight);
    
    // Draw leaves (crown)
    ctx.fillStyle = TREE_COLOR;
    ctx.fillRect(x, y, size, size * 0.7);
    ctx.fillRect(x + size * 0.2, y - size * 0.2, size * 0.6, size * 0.4);
    
    // Add some darker green for depth
    ctx.fillStyle = '#1e7b1e';
    ctx.fillRect(x + size * 0.7, y + size * 0.1, size * 0.3, size * 0.6);
}

// Draw UI elements (score and lives)
function drawUI() {
    // Draw score
    drawScore();
    
    // Draw lives
    drawLives();
}

function drawScore() {
    const x = 20; // Left margin on grass
    const y = 40; // Top margin
    
    // Set font properties for pixel-art style
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    
    // Draw text border (dark outline)
    ctx.fillStyle = UI_BORDER_COLOR;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            if (dx !== 0 || dy !== 0) {
                ctx.fillText(`Score: ${score}`, x + dx, y + dy);
            }
        }
    }
    
    // Draw main text
    ctx.fillStyle = UI_COLOR;
    ctx.fillText(`Score: ${score}`, x, y);
}

function drawLives() {
    const x = 20; // Left margin on grass
    const y = 75; // Below score, moved up since no text
    
    // Draw hearts only (no text)
    const heartStartX = x;
    const heartY = y;
    const heartSize = 20; // Larger hearts
    const heartSpacing = 28; // More spacing for larger hearts
    
    for (let i = 0; i < MAX_LIVES; i++) {
        const heartX = heartStartX + (i * heartSpacing);
        const filled = i < lives;
        drawHeart(heartX, heartY, heartSize, filled);
    }
}

function drawHeart(x, y, size, filled) {
    const color = filled ? HEART_COLOR : HEART_EMPTY_COLOR;
    const shadowColor = filled ? '#cc2222' : '#444';
    
    ctx.fillStyle = color;
    
    // Better pixel-art heart design
    // Top row - two separate bumps
    ctx.fillRect(x + size * 0.125, y, size * 0.25, size * 0.125);
    ctx.fillRect(x + size * 0.625, y, size * 0.25, size * 0.125);
    
    // Second row - wider bumps
    ctx.fillRect(x, y + size * 0.125, size * 0.375, size * 0.125);
    ctx.fillRect(x + size * 0.625, y + size * 0.125, size * 0.375, size * 0.125);
    
    // Third row - full width
    ctx.fillRect(x, y + size * 0.25, size, size * 0.125);
    
    // Fourth row - still full width
    ctx.fillRect(x, y + size * 0.375, size, size * 0.125);
    
    // Fifth row - slightly narrower
    ctx.fillRect(x + size * 0.0625, y + size * 0.5, size * 0.875, size * 0.125);
    
    // Sixth row - more narrow
    ctx.fillRect(x + size * 0.125, y + size * 0.625, size * 0.75, size * 0.125);
    
    // Seventh row - narrower
    ctx.fillRect(x + size * 0.25, y + size * 0.75, size * 0.5, size * 0.125);
    
    // Bottom point
    ctx.fillRect(x + size * 0.375, y + size * 0.875, size * 0.25, size * 0.125);
    
    // Add shadow/depth for filled hearts
    if (filled) {
        ctx.fillStyle = shadowColor;
        // Right edge shadow
        ctx.fillRect(x + size * 0.875, y + size * 0.25, size * 0.125, size * 0.25);
        ctx.fillRect(x + size * 0.75, y + size * 0.5, size * 0.125, size * 0.125);
        ctx.fillRect(x + size * 0.625, y + size * 0.625, size * 0.125, size * 0.125);
        ctx.fillRect(x + size * 0.5, y + size * 0.75, size * 0.125, size * 0.125);
        
        // Bottom shadow
        ctx.fillRect(x + size * 0.25, y + size * 0.875, size * 0.375, size * 0.125);
    }
    
    // Add a subtle border for empty hearts
    if (!filled) {
        ctx.fillStyle = UI_BORDER_COLOR;
        ctx.lineWidth = 1;
        
        // Simple border outline
        ctx.strokeStyle = UI_BORDER_COLOR;
        ctx.strokeRect(x, y + size * 0.25, size, size * 0.25);
    }
}

// Draw game objects
function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // Flash effect when invulnerable
    if (player.invulnerable) {
        ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.3 + 0.7; // Smooth pulsing
    }
    
    // Draw jerrycan outline
    ctx.fillStyle = PLAYER_OUTLINE;
    ctx.fillRect(x - 1, y - 1, PLAYER_WIDTH + 2, PLAYER_HEIGHT + 2);
    
    // Draw main jerrycan body
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
    
    // Draw jerrycan details
    // Top cap
    ctx.fillStyle = PLAYER_HANDLE_COLOR;
    ctx.fillRect(x + 8, y, 16, 6);
    
    // Handle
    ctx.fillRect(x + 26, y + 8, 4, 12);
    ctx.fillRect(x + 28, y + 6, 2, 2);
    ctx.fillRect(x + 28, y + 20, 2, 2);
    
    // Spout
    ctx.fillRect(x + 4, y + 2, 6, 8);
    
    // Body ridges for detail
    ctx.fillStyle = PLAYER_HANDLE_COLOR;
    ctx.fillRect(x + 2, y + 12, 28, 2);
    ctx.fillRect(x + 2, y + 20, 28, 2);
    ctx.fillRect(x + 2, y + 28, 28, 2);
    
    // Bottom detail
    ctx.fillRect(x + 4, y + 34, 24, 2);
    
    // Reset alpha after invulnerability effect
    ctx.globalAlpha = 1.0;
}

function drawWaterDrop(drop) {
    const x = drop.x;
    const y = drop.y;
    
    // Draw main drop body (no outline)
    ctx.fillStyle = WATER_DROP_COLOR;
    
    // Water drop shape (pointy top, rounded bottom)
    // Sharp point at top
    ctx.fillRect(x + 11, y, 2, 2);
    ctx.fillRect(x + 9, y + 2, 6, 2);
    ctx.fillRect(x + 7, y + 4, 10, 2);
    
    // Wide middle section
    ctx.fillRect(x + 4, y + 6, 16, 4);
    ctx.fillRect(x + 2, y + 10, 20, 6);
    ctx.fillRect(x + 4, y + 16, 16, 4);
    
    // Rounded bottom
    ctx.fillRect(x + 8, y + 20, 8, 2);
    ctx.fillRect(x + 10, y + 22, 4, 2);
    
    // Enhanced highlight on the upper-left area
    ctx.fillStyle = WATER_DROP_HIGHLIGHT;
    ctx.fillRect(x + 9, y + 3, 3, 2);
    ctx.fillRect(x + 7, y + 5, 5, 2);
    ctx.fillRect(x + 6, y + 7, 6, 2);
    ctx.fillRect(x + 5, y + 9, 4, 2);
}

function drawSuperDrop(drop) {
    const x = drop.x;
    const y = drop.y;
    
    // Animated glow effect
    const glowIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    
    // Draw subtle glow around the drop (no outline)
    ctx.fillStyle = SUPER_DROP_GLOW;
    ctx.globalAlpha = glowIntensity * 0.3;
    ctx.fillRect(x - 1, y - 1, SUPER_DROP_SIZE + 2, SUPER_DROP_SIZE + 2);
    
    // Reset alpha and draw main drop body
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = SUPER_DROP_COLOR;
    
    // Super drop shape (larger pointy teardrop)
    // Sharp point at top
    ctx.fillRect(x + 17, y, 2, 2);
    ctx.fillRect(x + 15, y + 2, 6, 2);
    ctx.fillRect(x + 12, y + 4, 12, 3);
    
    // Wide upper section
    ctx.fillRect(x + 8, y + 7, 20, 6);
    ctx.fillRect(x + 6, y + 13, 24, 6);
    ctx.fillRect(x + 3, y + 19, 30, 8);
    
    // Rounded bottom
    ctx.fillRect(x + 6, y + 27, 24, 4);
    ctx.fillRect(x + 12, y + 31, 12, 3);
    ctx.fillRect(x + 15, y + 34, 6, 2);
    
    // Enhanced highlight
    ctx.fillStyle = SUPER_DROP_HIGHLIGHT;
    ctx.fillRect(x + 14, y + 3, 4, 2);
    ctx.fillRect(x + 11, y + 5, 8, 3);
    ctx.fillRect(x + 9, y + 8, 10, 4);
    ctx.fillRect(x + 7, y + 12, 8, 4);
    
    // Inner sparkle effect
    ctx.fillStyle = SUPER_DROP_GLOW;
    ctx.globalAlpha = glowIntensity * 0.6;
    ctx.fillRect(x + 16, y + 15, 4, 4);
    ctx.fillRect(x + 18, y + 20, 2, 2);
    ctx.globalAlpha = 1.0;
}

function drawLog(log) {
    const x = log.x;
    const y = log.y;
    
    // Draw outline
    ctx.fillStyle = LOG_OUTLINE;
    ctx.fillRect(x - 1, y - 1, LOG_WIDTH + 2, LOG_HEIGHT + 2);
    
    // Draw main log body
    ctx.fillStyle = LOG_COLOR;
    ctx.fillRect(x, y, LOG_WIDTH, LOG_HEIGHT);
    
    // Draw tree rings for detail
    ctx.fillStyle = LOG_RINGS;
    ctx.fillRect(x + 8, y + 2, 2, LOG_HEIGHT - 4);
    ctx.fillRect(x + 20, y + 1, 2, LOG_HEIGHT - 2);
    ctx.fillRect(x + 35, y + 2, 2, LOG_HEIGHT - 4);
    ctx.fillRect(x + 50, y + 1, 2, LOG_HEIGHT - 2);
    ctx.fillRect(x + 62, y + 2, 2, LOG_HEIGHT - 4);
    
    // End caps (darker)
    ctx.fillStyle = LOG_OUTLINE;
    ctx.fillRect(x, y + 2, 2, LOG_HEIGHT - 4);
    ctx.fillRect(x + LOG_WIDTH - 2, y + 2, 2, LOG_HEIGHT - 4);
}

// Mouse input handling
function setupMouseControls() {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
}

// Update player position based on mouse
function updatePlayer() {
    if (gameRunning) {
        // Keep player within river bounds
        const riverLeft = GRASS_WIDTH + 5;
        const riverRight = GRASS_WIDTH + RIVER_WIDTH - PLAYER_WIDTH - 5;
        
        player.x = Math.max(riverLeft, Math.min(riverRight, mouseX - PLAYER_WIDTH / 2));
        
        // Update invulnerability
        if (player.invulnerable) {
            player.invulnerabilityTime -= 16; // Assuming 60fps (16ms per frame)
            if (player.invulnerabilityTime <= 0) {
                player.invulnerable = false;
            }
        }
    }
}

// Spawn water drops
function spawnWaterDrop() {
    if (Math.random() < 0.02) { // 2% chance per frame
        const riverLeft = GRASS_WIDTH + 10;
        const riverRight = GRASS_WIDTH + RIVER_WIDTH - WATER_DROP_SIZE - 10;
        
        waterDrops.push({
            x: riverLeft + Math.random() * (riverRight - riverLeft),
            y: -WATER_DROP_SIZE,
            width: WATER_DROP_SIZE,
            height: WATER_DROP_SIZE
        });
    }
}

// Spawn logs
function spawnLog() {
    if (Math.random() < 0.008) { // 0.8% chance per frame
        const riverLeft = GRASS_WIDTH + 10;
        const riverRight = GRASS_WIDTH + RIVER_WIDTH - LOG_WIDTH - 10;
        
        logs.push({
            x: riverLeft + Math.random() * (riverRight - riverLeft),
            y: -LOG_HEIGHT,
            width: LOG_WIDTH,
            height: LOG_HEIGHT
        });
    }
}

// Spawn super drops (rare life-restoring drops)
function spawnSuperDrop() {
    if (Math.random() < 0.001) { // 0.1% chance per frame (very rare)
        const riverLeft = GRASS_WIDTH + 10;
        const riverRight = GRASS_WIDTH + RIVER_WIDTH - SUPER_DROP_SIZE - 10;
        
        superDrops.push({
            x: riverLeft + Math.random() * (riverRight - riverLeft),
            y: -SUPER_DROP_SIZE,
            width: SUPER_DROP_SIZE,
            height: SUPER_DROP_SIZE
        });
    }
}

// Update game objects
function updateGameObjects() {
    // Move water drops down
    for (let i = waterDrops.length - 1; i >= 0; i--) {
        waterDrops[i].y += SCROLL_SPEED + 1;
        
        // Remove if off screen
        if (waterDrops[i].y > canvas.height) {
            waterDrops.splice(i, 1);
        }
    }
    
    // Move super drops down
    for (let i = superDrops.length - 1; i >= 0; i--) {
        superDrops[i].y += SCROLL_SPEED + 0.5;
        
        // Remove if off screen
        if (superDrops[i].y > canvas.height) {
            superDrops.splice(i, 1);
        }
    }
    
    // Move logs down
    for (let i = logs.length - 1; i >= 0; i--) {
        logs[i].y += SCROLL_SPEED;
        
        // Remove if off screen
        if (logs[i].y > canvas.height) {
            logs.splice(i, 1);
        }
    }
}

// Check collisions
function checkCollisions() {
    // Water drop collection
    for (let i = waterDrops.length - 1; i >= 0; i--) {
        const drop = waterDrops[i];
        if (isColliding(player, drop)) {
            waterDrops.splice(i, 1);
            addScore(10);
            playSound('splash');
        }
    }
    
    // Super drop collection (life restoration)
    for (let i = superDrops.length - 1; i >= 0; i--) {
        const superDrop = superDrops[i];
        if (isColliding(player, superDrop)) {
            superDrops.splice(i, 1);
            if (lives < MAX_LIVES) {
                lives++;
                playSound('revival');
            } else {
                // Give bonus points if already at max lives
                addScore(100);
                playSound('splash');
            }
        }
    }
    
    // Log collision (only if not invulnerable)
    if (!player.invulnerable) {
        for (let i = logs.length - 1; i >= 0; i--) {
            const log = logs[i];
            if (isColliding(player, log)) {
                logs.splice(i, 1);
                loseLife();
                playSound('bonk');
                // Make player invulnerable for 2 seconds
                player.invulnerable = true;
                player.invulnerabilityTime = 2000;
            }
        }
    }
}

// Simple collision detection
function isColliding(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Progress and milestone management
function updateProgress() {
    // Calculate progress based on current milestone
    const currentThreshold = MILESTONES[currentMilestone].threshold;
    const nextThreshold = currentMilestone < MILESTONES.length - 1 ? 
        MILESTONES[currentMilestone + 1].threshold : currentThreshold + 500;
    
    const progressInSegment = score - currentThreshold;
    const segmentSize = nextThreshold - currentThreshold;
    progressPercentage = Math.min(100, (progressInSegment / segmentSize) * 100);
    
    // Update progress bar
    progressFill.style.width = progressPercentage + '%';
    
    // Check for milestone advancement
    checkMilestoneAdvancement();
}

function checkMilestoneAdvancement() {
    // Check if we've reached the next milestone
    if (currentMilestone < MILESTONES.length - 1) {
        const nextMilestone = currentMilestone + 1;
        if (score >= MILESTONES[nextMilestone].threshold) {
            advanceToMilestone(nextMilestone);
        }
    }
}

function advanceToMilestone(newMilestone) {
    currentMilestone = newMilestone;
    
    // Play milestone sound
    playSound('ding');
    
    // Create sparkle effect
    createSparkleEffect();
    
    // Animate milestone text change
    animateMilestoneText(MILESTONES[currentMilestone].noun);
    
    // Reset progress bar for new milestone
    progressPercentage = 0;
    progressFill.style.width = '0%';
}

function animateMilestoneText(newNoun) {
    milestoneNoun.classList.add('milestone-animate');
    
    setTimeout(() => {
        milestoneNoun.textContent = newNoun;
    }, 750); // Change text at the middle of animation
    
    setTimeout(() => {
        milestoneNoun.classList.remove('milestone-animate');
    }, 1500); // Remove animation class after completion
}

function createSparkleEffect() {
    sparkleEffect.classList.remove('hidden');
    sparkleEffect.innerHTML = ''; // Clear previous sparkles
    
    // Create multiple sparkles
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        
        // Random position within sparkle container
        const angle = (360 / 8) * i;
        const radius = 30 + Math.random() * 20;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        sparkle.style.left = (50 + x) + 'px';
        sparkle.style.top = (20 + y) + 'px';
        sparkle.style.animationDelay = (i * 0.1) + 's';
        
        sparkleEffect.appendChild(sparkle);
    }
    
    // Hide sparkle effect after animation
    setTimeout(() => {
        sparkleEffect.classList.add('hidden');
    }, 1500);
}

function resetProgress() {
    currentMilestone = 0;
    progressPercentage = 0;
    progressFill.style.width = '0%';
    milestoneNoun.textContent = MILESTONES[0].noun;
    sparkleEffect.classList.add('hidden');
}

// Game utility functions
function addScore(points) {
    score += points;
    updateProgress();
}

function loseLife() {
    if (lives > 0) {
        lives--;
        if (lives <= 0) {
            gameOver();
            playSound('revival'); // Play sound on game over
        }
    }
}

function resetGameStats() {
    score = 0;
    lives = MAX_LIVES;
    resetProgress();
}

// Game loop
function gameLoop() {
    if (gameRunning) {
        // Update scroll offset for vertical movement
        scrollOffset += SCROLL_SPEED;
        
        // Update player position
        updatePlayer();
        
        // Spawn game objects
        spawnWaterDrop();
        spawnLog();
        spawnSuperDrop();
        
        // Update game objects
        updateGameObjects();
        
        // Check collisions
        checkCollisions();
        
        // Draw everything
        drawBackground();
        
        // Draw UI elements
        drawUI();
        
        // Draw game objects
        drawPlayer();
        waterDrops.forEach(drawWaterDrop);
        superDrops.forEach(drawSuperDrop);
        logs.forEach(drawLog);
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    init();
    setupMouseControls();
});
