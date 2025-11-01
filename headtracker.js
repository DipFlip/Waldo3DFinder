export class HeadTracker {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.faceMesh = null;
        this.camera = null;
        this.isTracking = false;

        // Head position data
        this.headPosition = { x: 0, y: 0, z: 0 };
        this.smoothedPosition = { x: 0, y: 0, z: 0 };
        this.calibrationCenter = { x: 0, y: 0, z: 0 };
        this.isCalibrated = false;

        // Smoothing factor (0-1, higher = more responsive, lower = smoother but laggy)
        this.smoothing = 0.6;
    }

    async initialize() {
        // Check for getUserMedia support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia is not supported. Please use HTTPS or localhost.');
        }

        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('face-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');

        // Test camera access first
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
            console.log('Camera access granted');
        } catch (err) {
            throw new Error(`Camera access denied: ${err.message}. Please allow camera permissions and use HTTPS.`);
        }

        // Initialize MediaPipe FaceMesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onResults(results));

        // Setup camera
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
        this.isTracking = true;

        // Auto-calibrate after 1 second
        setTimeout(() => this.calibrate(), 1000);
    }

    onResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Use nose tip (landmark 1) for head position
        const noseTip = landmarks[1];

        // Calculate head position
        // X: left-right movement
        // Y: up-down movement
        // Z: forward-back movement (using nose to forehead distance as proxy)

        const foreheadCenter = landmarks[10];
        const distance = Math.sqrt(
            Math.pow(noseTip.x - foreheadCenter.x, 2) +
            Math.pow(noseTip.y - foreheadCenter.y, 2) +
            Math.pow(noseTip.z - foreheadCenter.z, 2)
        );

        // MediaPipe coordinates: x (0=left, 1=right), y (0=top, 1=bottom)
        // For 3D head tracking: x (left/right), y (down/up - inverted!), z (far/near)
        this.headPosition.x = noseTip.x;
        this.headPosition.y = -noseTip.y;  // Invert Y so up is positive
        this.headPosition.z = distance;

        // Apply smoothing
        this.smoothedPosition.x = this.lerp(
            this.smoothedPosition.x,
            this.headPosition.x,
            this.smoothing
        );
        this.smoothedPosition.y = this.lerp(
            this.smoothedPosition.y,
            this.headPosition.y,
            this.smoothing
        );
        this.smoothedPosition.z = this.lerp(
            this.smoothedPosition.z,
            this.headPosition.z,
            this.smoothing
        );
    }

    calibrate() {
        this.calibrationCenter = { ...this.smoothedPosition };
        this.isCalibrated = true;
        console.log('Head tracking calibrated at:', this.calibrationCenter);
    }

    getRelativePosition() {
        if (!this.isCalibrated) {
            return { x: 0, y: 0, z: 0 };
        }

        return {
            x: (this.smoothedPosition.x - this.calibrationCenter.x) * 3,  // Increased for more movement
            y: (this.smoothedPosition.y - this.calibrationCenter.y) * 3,  // Increased for more movement
            z: (this.smoothedPosition.z - this.calibrationCenter.z) * 5
        };
    }

    getDebugInfo() {
        return {
            raw: { ...this.headPosition },
            smoothed: { ...this.smoothedPosition },
            calibration: { ...this.calibrationCenter },
            relative: this.getRelativePosition()
        };
    }

    // Linear interpolation for smoothing
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        this.isTracking = false;
    }
}
