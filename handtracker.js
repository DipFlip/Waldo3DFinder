export class HandTracker {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;
        this.hands = null;
        this.camera = null;
        this.isTracking = false;
        this.isReady = false;

        // Hand tracking data
        this.handLandmarks = null;
        this.handWorldLandmarks = null;
        this.handedness = null;

        // Hand position on screen (normalized 0-1)
        this.handScreenPosition = { x: 0.5, y: 0.5 };

        // Pinch detection
        this.isPinching = false;
        this.pinchStrength = 0;
        this.pinchThreshold = 0.05; // Distance threshold for pinch detection

        // Throttling
        this.lastProcessTime = 0;
        this.processingInterval = 50; // Process every 50ms (20fps)
        this.isProcessing = false;
    }

    async initialize() {
        console.log('Initializing hand tracking...');

        // Set canvas size to match video
        if (this.canvasElement) {
            this.canvasElement.width = 640;
            this.canvasElement.height = 480;
        }

        // Wait a bit to ensure video is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onResults(results));

        // Wait for model to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.isReady = true;
        this.isTracking = true;

        console.log('Hand tracking initialized and ready');
    }

    async processFrame() {
        // Process frames from shared video element with throttling
        if (!this.isReady || !this.hands || !this.videoElement || this.isProcessing) {
            return;
        }

        // Throttle processing
        const now = Date.now();
        if (now - this.lastProcessTime < this.processingInterval) {
            return;
        }

        // Check if video is ready
        if (this.videoElement.readyState < 2) {
            return;
        }

        this.isProcessing = true;
        this.lastProcessTime = now;

        try {
            await this.hands.send({ image: this.videoElement });
        } catch (error) {
            // Silently handle errors during processing
            if (error.message && !error.message.includes('out of bounds')) {
                console.warn('Hand tracking error:', error.message);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    onResults(results) {
        // Clear canvas for debug visualization
        if (this.canvasCtx && this.canvasElement) {
            this.canvasCtx.save();
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.handLandmarks = results.multiHandLandmarks[0];
            this.handWorldLandmarks = results.multiHandWorldLandmarks ? results.multiHandWorldLandmarks[0] : null;
            this.handedness = results.multiHandedness ? results.multiHandedness[0] : null;

            // Get hand center position (use palm center - landmark 9)
            const palmCenter = this.handLandmarks[9];
            this.handScreenPosition.x = palmCenter.x;
            this.handScreenPosition.y = palmCenter.y;

            // Detect pinch gesture (thumb tip to index finger tip distance)
            this.detectPinch();

            // Draw hand landmarks for debugging
            if (this.canvasCtx) {
                this.drawHandLandmarks();
            }
        } else {
            // No hand detected
            this.handLandmarks = null;
            this.isPinching = false;
            this.pinchStrength = 0;
        }

        if (this.canvasCtx) {
            this.canvasCtx.restore();
        }
    }

    detectPinch() {
        if (!this.handLandmarks) {
            this.isPinching = false;
            this.pinchStrength = 0;
            return;
        }

        // Thumb tip (4) and index finger tip (8)
        const thumbTip = this.handLandmarks[4];
        const indexTip = this.handLandmarks[8];

        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2) +
            Math.pow(thumbTip.z - indexTip.z, 2)
        );

        // Update pinch strength (inverse of distance, normalized)
        this.pinchStrength = Math.max(0, 1 - (distance / this.pinchThreshold));

        // Pinching if distance is below threshold
        const wasPinching = this.isPinching;
        this.isPinching = distance < this.pinchThreshold;

        // Log pinch events
        if (this.isPinching && !wasPinching) {
            console.log('Pinch started');
        } else if (!this.isPinching && wasPinching) {
            console.log('Pinch released');
        }
    }

    drawHandLandmarks() {
        if (!this.canvasCtx || !this.handLandmarks) return;

        const width = this.canvasElement.width;
        const height = this.canvasElement.height;

        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17] // Palm
        ];

        this.canvasCtx.strokeStyle = this.isPinching ? '#00ff00' : '#00ffff';
        this.canvasCtx.lineWidth = 2;

        connections.forEach(([start, end]) => {
            const startPoint = this.handLandmarks[start];
            const endPoint = this.handLandmarks[end];

            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startPoint.x * width, startPoint.y * height);
            this.canvasCtx.lineTo(endPoint.x * width, endPoint.y * height);
            this.canvasCtx.stroke();
        });

        // Draw landmarks
        this.handLandmarks.forEach((landmark, index) => {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                landmark.x * width,
                landmark.y * height,
                5,
                0,
                2 * Math.PI
            );

            // Highlight thumb and index fingertips for pinch
            if (index === 4 || index === 8) {
                this.canvasCtx.fillStyle = this.isPinching ? '#00ff00' : '#ff0000';
            } else {
                this.canvasCtx.fillStyle = '#ffffff';
            }

            this.canvasCtx.fill();
        });
    }

    getHandScreenPosition() {
        return this.handLandmarks ? { ...this.handScreenPosition } : null;
    }

    getIsPinching() {
        return this.isPinching;
    }

    getPinchStrength() {
        return this.pinchStrength;
    }

    hasHandDetected() {
        return this.handLandmarks !== null;
    }

    stop() {
        this.isTracking = false;
    }
}
