export class Scene3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.mouse = null;

        // Camera control
        this.cameraDistance = 10;
        this.cameraHeightOffset = 3; // Raise camera to see better
        this.cameraRotation = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 };

        // Objects
        this.shapes = [];
        this.waldoObject = null;

        this.initialize();
    }

    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc); // Light gray background

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = this.cameraDistance;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add gridded room
        this.createGriddedRoom();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createGridTexture(width, height, gridSize, lineColor, bgColor) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;

        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);

        return texture;
    }

    createGriddedRoom() {
        const gridTexture = this.createGridTexture(512, 512, 64, '#666666', '#f0f0f0');

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshLambertMaterial({
            map: gridTexture,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5;
        this.scene.add(floor);

        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(30, 20);
        const backWallMaterial = new THREE.MeshLambertMaterial({
            map: gridTexture,
            side: THREE.DoubleSide
        });
        const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
        backWall.position.z = -15;
        backWall.position.y = 5;
        this.scene.add(backWall);

        // Left wall
        const leftWallGeometry = new THREE.PlaneGeometry(30, 20);
        const leftWallMaterial = new THREE.MeshLambertMaterial({
            map: gridTexture,
            side: THREE.DoubleSide,
            opacity: 0.3,
            transparent: true
        });
        const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.x = -8;
        leftWall.position.y = 5;
        this.scene.add(leftWall);

        // Right wall
        const rightWallGeometry = new THREE.PlaneGeometry(30, 20);
        const rightWallMaterial = new THREE.MeshLambertMaterial({
            map: gridTexture,
            side: THREE.DoubleSide,
            opacity: 0.3,
            transparent: true
        });
        const rightWall = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.x = 8;
        rightWall.position.y = 5;
        this.scene.add(rightWall);
    }

    updateCameraFromHead(headPosition) {
        // Head-tracking parallax: camera moves WITH your head
        // Head right → camera right (see more of left side)
        // Head up → camera up (see more of bottom)
        // This simulates looking through a window at the scene

        const sensitivity = 2.5;  // Increased from 1.5 to 2.5 for more movement

        // Direct position translation (X inverted, Y not inverted)
        const targetX = -headPosition.x * sensitivity;  // Inverted for correct left/right
        const targetY = headPosition.y * sensitivity;   // NOT inverted for correct up/down

        // Smooth camera movement (increased from 0.1 to 0.2 for more responsiveness)
        this.cameraRotation.x += (targetY - this.cameraRotation.x) * 0.2;  // Using .x for Y position (reusing var)
        this.cameraRotation.y += (targetX - this.cameraRotation.y) * 0.2;  // Using .y for X position (reusing var)

        // Position camera: offset from center, fixed Z distance
        this.camera.position.x = this.cameraRotation.y;
        this.camera.position.y = this.cameraRotation.x + this.cameraHeightOffset;
        this.camera.position.z = this.cameraDistance;

        // Always look at scene center
        this.camera.lookAt(0, 0, 0);
    }

    getDebugInfo() {
        return {
            targetRotation: { x: this.cameraRotation.x, y: this.cameraRotation.y },
            cameraRotation: { x: this.camera.position.y, y: this.camera.position.x }  // Actual camera position
        };
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.scene.add(shape);
    }

    setWaldo(waldoMesh) {
        this.waldoObject = waldoMesh;
        this.scene.add(waldoMesh);
    }

    checkClick(x, y) {
        // Convert mouse coordinates to normalized device coordinates (-1 to +1)
        this.mouse.x = (x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(y / window.innerHeight) * 2 + 1;

        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check intersection with Waldo
        if (this.waldoObject) {
            const intersects = this.raycaster.intersectObject(this.waldoObject, true);
            if (intersects.length > 0) {
                return 'waldo';
            }
        }

        return null;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    findShapeAtScreenPosition(screenX, screenY) {
        // Convert screen position (0-1) to NDC (-1 to +1)
        const ndcX = screenX * 2 - 1;
        const ndcY = -(screenY * 2 - 1); // Invert Y for screen coords

        // Use raycaster to find shapes
        this.mouse.x = ndcX;
        this.mouse.y = ndcY;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check intersection with all shapes (excluding Waldo)
        const intersects = this.raycaster.intersectObjects(this.shapes, false);

        if (intersects.length > 0) {
            return intersects[0].object;
        }

        return null;
    }

    moveShapeToScreenPosition(shape, screenX, screenY) {
        // Convert screen position to world position
        // We'll keep the shape's current Z position and only update X and Y

        const ndcX = screenX * 2 - 1;
        const ndcY = -(screenY * 2 - 1);

        // Create a vector at the shape's current depth
        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(this.camera);

        // Calculate direction from camera to point
        const dir = vector.sub(this.camera.position).normalize();

        // Calculate distance to shape's Z plane
        const distance = (shape.position.z - this.camera.position.z) / dir.z;

        // Calculate new position
        const newPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        // Update shape position with smoothing
        const smoothing = 0.3;
        shape.position.x += (newPos.x - shape.position.x) * smoothing;
        shape.position.y += (newPos.y - shape.position.y) * smoothing;
    }

    highlightShape(shape, enabled) {
        if (!shape) return;

        if (enabled) {
            // Store original properties if not already stored
            if (!shape.userData.originalEmissive) {
                shape.userData.originalEmissive = shape.material.emissive ? shape.material.emissive.clone() : new THREE.Color(0x000000);
                shape.userData.originalEmissiveIntensity = shape.material.emissiveIntensity || 0;
                shape.userData.originalScale = shape.scale.clone();
            }

            // Mark as highlighted for animation
            shape.userData.isHighlighted = true;
            shape.userData.highlightTime = 0;

            // Add bright red glow effect
            shape.material.emissive = new THREE.Color(0xff0000); // Red glow
            shape.material.emissiveIntensity = 1.0;
        } else {
            // Restore original properties
            shape.userData.isHighlighted = false;

            if (shape.userData.originalEmissive) {
                shape.material.emissive = shape.userData.originalEmissive.clone();
                shape.material.emissiveIntensity = shape.userData.originalEmissiveIntensity;
            }

            if (shape.userData.originalScale) {
                shape.scale.copy(shape.userData.originalScale);
            }
        }
    }

    animate(deltaTime) {
        const time = Date.now() * 0.001;

        // Animate 3D shapes (gentle floating + rotation)
        this.shapes.forEach((shape, index) => {
            // Gentle bobbing motion (up and down)
            shape.userData.baseY = shape.userData.baseY || shape.position.y;
            shape.position.y = shape.userData.baseY + Math.sin(time + index) * 0.3;

            // Slow rotation on all axes for 3D effect
            shape.rotation.x += 0.003;
            shape.rotation.y += 0.005;
            shape.rotation.z += 0.002;

            // Pulsating effect for highlighted shapes
            if (shape.userData.isHighlighted) {
                shape.userData.highlightTime = (shape.userData.highlightTime || 0) + 0.05;

                // Pulsate scale (1.0 to 1.15)
                const pulseScale = 1.0 + Math.sin(shape.userData.highlightTime * 3) * 0.15;

                if (shape.userData.originalScale) {
                    shape.scale.set(
                        shape.userData.originalScale.x * pulseScale,
                        shape.userData.originalScale.y * pulseScale,
                        shape.userData.originalScale.z * pulseScale
                    );
                }

                // Pulsate emissive intensity (0.8 to 1.5)
                const pulseIntensity = 0.8 + Math.sin(shape.userData.highlightTime * 3) * 0.7;
                shape.material.emissiveIntensity = pulseIntensity;
            }
        });

        // Keep Waldo billboard (always facing camera)
        if (this.waldoObject) {
            this.waldoObject.lookAt(this.camera.position);
        }
    }
}
