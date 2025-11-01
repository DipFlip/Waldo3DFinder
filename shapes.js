export class ShapeGenerator {
    constructor() {
        this.colors = [
            0xFF6B6B, // Red
            0x4ECDC4, // Cyan
            0x45B7D1, // Blue
            0xFFA07A, // Light Salmon
            0x98D8C8, // Mint
            0xF7DC6F, // Yellow
            0xBB8FCE, // Purple
            0x85C1E2  // Light Blue
        ];
    }

    createCube(size, color) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({
            color: color
        });
        return new THREE.Mesh(geometry, material);
    }

    createRectangularBox(width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({
            color: color
        });
        return new THREE.Mesh(geometry, material);
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    generateObstacles(count) {
        const obstacles = [];

        for (let i = 0; i < count; i++) {
            const shapeType = Math.random();
            const color = this.getRandomColor();
            let shape;

            if (shapeType < 0.6) {
                // Cube
                const size = 0.5 + Math.random() * 1.5;
                shape = this.createCube(size, color);
            } else {
                // Rectangular box
                const width = 0.5 + Math.random() * 2;
                const height = 0.5 + Math.random() * 2;
                const depth = 0.5 + Math.random() * 1.5;
                shape = this.createRectangularBox(width, height, depth, color);
            }

            // Position in 3D space
            // X: -4 to 4
            // Y: -3 to 3
            // Z: -12 to -3 (spread across depth)
            shape.position.x = (Math.random() - 0.5) * 8;
            shape.position.y = (Math.random() - 0.5) * 6;
            shape.position.z = -3 - Math.random() * 9;

            // Random rotation for variety
            shape.rotation.x = Math.random() * Math.PI * 2;
            shape.rotation.y = Math.random() * Math.PI * 2;
            shape.rotation.z = Math.random() * Math.PI * 2;

            obstacles.push(shape);
        }

        return obstacles;
    }

    createTextTexture(text, fontSize = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

        // Text
        ctx.fillStyle = 'black';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createWaldoPlaceholder(size = 1.5) {
        const texture = this.createTextTexture('WALDO', 72);

        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });

        const waldo = new THREE.Mesh(geometry, material);
        waldo.userData.isWaldo = true;

        return waldo;
    }

    positionWaldoBehindObstacles(waldo, obstacles) {
        // Position Waldo in a spot that's occluded from the default view
        // Place him at medium depth and offset to the side

        waldo.position.x = 2 + Math.random() * 2;
        waldo.position.y = -1 + Math.random() * 2;
        waldo.position.z = -6 - Math.random() * 3;

        // Make sure Waldo is behind at least 2-3 obstacles
        // We do this by ensuring some obstacles are in front (closer to camera)
        let obstaclesInFront = 0;
        for (let obstacle of obstacles) {
            if (obstacle.position.z > waldo.position.z &&
                Math.abs(obstacle.position.x - waldo.position.x) < 3 &&
                Math.abs(obstacle.position.y - waldo.position.y) < 3) {
                obstaclesInFront++;
            }
        }

        console.log(`Waldo positioned with ${obstaclesInFront} obstacles potentially in front`);
    }
}
