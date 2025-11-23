import { HeadTracker } from './headtracker.js';
import { HandTracker } from './handtracker.js';
import { Scene3D } from './scene.js';
import { ShapeGenerator } from './shapes.js';

class Game {
    constructor() {
        this.headTracker = null;
        this.handTracker = null;
        this.scene3D = null;
        this.shapeGenerator = null;

        this.isPlaying = false;
        this.startTime = 0;
        this.timerInterval = null;

        // Hand interaction state
        this.selectedShape = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0, z: 0 };

        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            gameContainer: document.getElementById('game-container'),
            instructions: document.getElementById('instructions'),
            gameUI: document.getElementById('game-ui'),
            winScreen: document.getElementById('win-screen'),
            startBtn: document.getElementById('start-btn'),
            playAgainBtn: document.getElementById('play-again-btn'),
            canvas: document.getElementById('game-canvas'),
            timeDisplay: document.getElementById('time'),
            finalTimeDisplay: document.getElementById('final-time'),
            webcam: document.getElementById('webcam'),
            handCanvas: document.getElementById('hand-canvas'),
            handCursor: document.getElementById('hand-cursor')
        };

        this.init();
    }

    async init() {
        console.log('Initializing game...');

        try {
            // Initialize head tracking
            this.headTracker = new HeadTracker();
            await this.headTracker.initialize();

            console.log('Head tracking initialized');

            // Initialize hand tracking
            this.handTracker = new HandTracker(this.elements.webcam, this.elements.handCanvas);
            await this.handTracker.initialize();

            console.log('Hand tracking initialized');

            // Initialize 3D scene
            this.scene3D = new Scene3D(this.elements.canvas);
            console.log('3D scene initialized');

            // Initialize shape generator
            this.shapeGenerator = new ShapeGenerator();

            // Hide loading screen, show instructions
            this.elements.loadingScreen.style.display = 'none';
            this.elements.gameContainer.style.display = 'block';

            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize. Please ensure webcam access is allowed.');
        }
    }

    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.startGame());
        this.elements.playAgainBtn.addEventListener('click', () => this.resetGame());

        // Click detection
        this.elements.canvas.addEventListener('click', (event) => {
            if (this.isPlaying) {
                this.handleClick(event.clientX, event.clientY);
            }
        });
    }

    startGame() {
        console.log('Starting game...');

        // Hide instructions, show game UI
        this.elements.instructions.style.display = 'none';
        this.elements.gameUI.style.display = 'block';

        // Generate game scene
        this.generateLevel();

        // Start game loop
        this.isPlaying = true;
        this.startTime = Date.now();
        this.startTimer();
        this.gameLoop();
    }

    generateLevel() {
        // Clear previous level
        this.scene3D.shapes.forEach(shape => this.scene3D.scene.remove(shape));
        this.scene3D.shapes = [];
        if (this.scene3D.waldoObject) {
            this.scene3D.scene.remove(this.scene3D.waldoObject);
        }

        // Generate obstacles (increased for 3D effect)
        const obstacles = this.shapeGenerator.generateObstacles(12);
        obstacles.forEach(obstacle => this.scene3D.addShape(obstacle));

        // Create and position Waldo
        const waldo = this.shapeGenerator.createWaldoPlaceholder();
        this.shapeGenerator.positionWaldoBehindObstacles(waldo, obstacles);
        this.scene3D.setWaldo(waldo);

        console.log('Level generated with', obstacles.length, 'obstacles');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.elements.timeDisplay.textContent = elapsed;
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    handleClick(x, y) {
        const result = this.scene3D.checkClick(x, y);

        if (result === 'waldo') {
            this.onWaldoFound();
        }
    }

    onWaldoFound() {
        console.log('Waldo found!');
        this.isPlaying = false;
        this.stopTimer();

        const finalTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.elements.finalTimeDisplay.textContent = finalTime;

        // Show win screen
        this.elements.winScreen.style.display = 'flex';
    }

    resetGame() {
        // Hide win screen
        this.elements.winScreen.style.display = 'none';

        // Show instructions
        this.elements.gameUI.style.display = 'none';
        this.elements.instructions.style.display = 'block';
    }

    gameLoop() {
        if (!this.isPlaying && this.elements.gameUI.style.display === 'none') {
            return;
        }

        // Process hand tracking frame
        if (this.handTracker) {
            this.handTracker.processFrame();
        }

        // Update camera from head tracking
        if (this.headTracker.isCalibrated) {
            const headPos = this.headTracker.getRelativePosition();
            this.scene3D.updateCameraFromHead(headPos);

            // Update debug panel
            this.updateDebugPanel();
        }

        // Handle hand interactions
        this.updateHandInteraction();

        // Animate shapes
        this.scene3D.animate();

        // Render scene
        this.scene3D.render();

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    updateDebugPanel() {
        const headDebug = this.headTracker.getDebugInfo();
        const sceneDebug = this.scene3D.getDebugInfo();

        const fmt = (num) => num.toFixed(3);

        document.getElementById('debug-raw').textContent =
            `x:${fmt(headDebug.raw.x)} y:${fmt(headDebug.raw.y)} z:${fmt(headDebug.raw.z)}`;

        document.getElementById('debug-smoothed').textContent =
            `x:${fmt(headDebug.smoothed.x)} y:${fmt(headDebug.smoothed.y)} z:${fmt(headDebug.smoothed.z)}`;

        document.getElementById('debug-relative').textContent =
            `x:${fmt(headDebug.relative.x)} y:${fmt(headDebug.relative.y)} z:${fmt(headDebug.relative.z)}`;

        document.getElementById('debug-target').textContent =
            `x:${fmt(sceneDebug.targetRotation.x)} y:${fmt(sceneDebug.targetRotation.y)}`;

        document.getElementById('debug-camera').textContent =
            `x:${fmt(sceneDebug.cameraRotation.x)} y:${fmt(sceneDebug.cameraRotation.y)}`;
    }

    updateHandInteraction() {
        if (!this.handTracker || !this.handTracker.hasHandDetected()) {
            // No hand detected, clear selection and hide cursor
            this.clearSelection();
            this.elements.handCursor.classList.remove('active');
            return;
        }

        const handPos = this.handTracker.getHandScreenPosition();
        if (!handPos) return;

        // Invert X coordinate because webcam is mirrored (scaleX(-1))
        // When hand moves right in real life, we want to select right side of screen
        const screenX = 1 - handPos.x;
        const screenY = handPos.y;

        // Get hand depth for Z-axis movement
        const handDepth = this.handTracker.getHandDepth();

        // Update cursor position on screen
        this.elements.handCursor.classList.add('active');
        this.elements.handCursor.style.left = `${screenX * window.innerWidth}px`;
        this.elements.handCursor.style.top = `${screenY * window.innerHeight}px`;

        // Find the shape closest to hand position on screen
        const closestShape = this.scene3D.findShapeAtScreenPosition(screenX, screenY);

        // Check pinch state
        const isPinching = this.handTracker.getIsPinching();

        if (isPinching) {
            if (!this.isDragging && closestShape) {
                // Start dragging
                this.isDragging = true;
                this.selectedShape = closestShape;
                console.log('Started dragging shape');
            }

            if (this.isDragging && this.selectedShape) {
                // Continue dragging - move shape based on hand position and depth
                this.scene3D.moveShapeToScreenPosition(this.selectedShape, screenX, screenY, handDepth);
            }
        } else {
            // Not pinching
            if (this.isDragging) {
                // Stop dragging
                this.isDragging = false;
                if (this.selectedShape) {
                    this.selectedShape.userData.isDragging = false;
                }
                console.log('Stopped dragging shape');
            }

            // Update selection (just highlight, don't drag)
            if (closestShape !== this.selectedShape) {
                this.clearSelection();
                this.selectedShape = closestShape;
                if (this.selectedShape) {
                    this.scene3D.highlightShape(this.selectedShape, true);
                }
            }
        }
    }

    clearSelection() {
        if (this.selectedShape) {
            this.scene3D.highlightShape(this.selectedShape, false);
            // Clear dragging flag so shape can animate again
            this.selectedShape.userData.isDragging = false;
            this.selectedShape = null;
        }
        this.isDragging = false;
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
