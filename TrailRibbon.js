import * as THREE from 'three';

/**
 * TrailRibbon - Trail/Ribbon effect library for Three.js
 * 
 * Usage:
 *   const ribbon = new TrailRibbon({ maxPoints: 100, fadeTime: 1.0 });
 *   scene.add(ribbon.mesh);
 *   
 *   // Call every frame
 *   ribbon.addPoint(position, width);
 *   ribbon.update(deltaTime);
 */
export class TrailRibbon {
    /**
     * @param {Object} options - Configuration options
     * @param {number} options.maxPoints - Maximum number of points (default: 100)
     * @param {number} options.fadeTime - Time until fully transparent in seconds (default: 1.0)
     * @param {THREE.Color} options.color - Ribbon color (default: white)
     * @param {THREE.Texture} options.texture - Optional texture
     * @param {boolean} options.doubleSide - Double-sided rendering (default: true)
     * @param {boolean} options.billboard - Billboard mode (camera-facing) (default: false)
     * @param {number} options.normalAngle - Normal direction angle in degrees. Rotation around movement axis when billboard is OFF (default: 0)
     */
    constructor(options = {}) {
        this.maxPoints = options.maxPoints || 100;
        this.fadeTime = options.fadeTime || 1.0;
        this.color = options.color || new THREE.Color(1, 1, 1);
        this.texture = options.texture || null;
        this.doubleSide = options.doubleSide !== undefined ? options.doubleSide : true;
        this.billboard = options.billboard || false;
        this.normalAngle = (options.normalAngle || 0) * Math.PI / 180; // Convert degrees to radians
        this.camera = null; // Must be set for billboard mode

        // Point data: { position: Vector3, width: number, age: number }
        this.points = [];

        // Initialize geometry and mesh
        this._initGeometry();
        this._initMaterial();
        this._initMesh();
    }

    _initGeometry() {
        this.geometry = new THREE.BufferGeometry();

        // Pre-allocate buffers based on maximum vertex count
        // Two vertices (left and right) are needed for each point
        const maxVertices = this.maxPoints * 2;
        const maxTriangles = (this.maxPoints - 1) * 2;

        this.positions = new Float32Array(maxVertices * 3);
        this.uvs = new Float32Array(maxVertices * 2);
        this.colors = new Float32Array(maxVertices * 4); // RGBA
        this.indices = new Uint32Array(maxTriangles * 3);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
        this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));

        // Set draw range to 0 (no points yet)
        this.geometry.setDrawRange(0, 0);
    }

    _initMaterial() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: this.texture },
                uUseTexture: { value: this.texture !== null },
                uBaseColor: { value: this.color }
            },
            vertexShader: `
                attribute vec4 color;
                varying vec2 vUv;
                varying vec4 vColor;

                void main() {
                    vUv = uv;
                    vColor = color;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                uniform bool uUseTexture;
                uniform vec3 uBaseColor;
                varying vec2 vUv;
                varying vec4 vColor;

                void main() {
                    vec4 texColor = uUseTexture ? texture2D(uTexture, vUv) : vec4(1.0);
                    vec3 finalColor = uBaseColor * vColor.rgb * texColor.rgb;
                    float finalAlpha = vColor.a * texColor.a;
                    
                    if (finalAlpha < 0.01) discard;
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: this.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
            blending: THREE.NormalBlending
        });
    }

    _initMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false; // Disable culling for dynamic mesh
    }

    /**
     * Add a new point to the ribbon
     * @param {THREE.Vector3} position - Center position
     * @param {number} width - Ribbon width
     */
    addPoint(position, width) {
        const point = {
            position: position.clone(),
            width: width,
            age: 0
        };

        this.points.push(point);

        // Remove oldest point if exceeding max points
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }

        this._updateGeometry();
    }

    /**
     * Update ribbon (call every frame)
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        if (this.points.length === 0) return;

        // Update age of each point
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].age += deltaTime;
        }

        // Remove fully transparent points
        while (this.points.length > 0 && this.points[0].age >= this.fadeTime) {
            this.points.shift();
        }

        this._updateGeometry();
    }

    /**
     * Set camera for billboard mode
     * @param {THREE.Camera} camera - Camera
     */
    setCamera(camera) {
        this.camera = camera;
    }

    /**
     * Set normal direction angle (only effective when billboard is OFF)
     * @param {number} degrees - Angle in degrees
     */
    setNormalAngle(degrees) {
        this.normalAngle = degrees * Math.PI / 180;
    }

    _updateGeometry() {
        const numPoints = this.points.length;

        if (numPoints < 2) {
            this.geometry.setDrawRange(0, 0);
            return;
        }

        // For direction vector calculation
        const tempVec = new THREE.Vector3();
        const perpVec = new THREE.Vector3();
        const upVec = new THREE.Vector3(0, 1, 0);
        const cameraDir = new THREE.Vector3();

        for (let i = 0; i < numPoints; i++) {
            const point = this.points[i];
            const pos = point.position;

            // Calculate direction (to next point, or from previous point)
            if (i < numPoints - 1) {
                tempVec.subVectors(this.points[i + 1].position, pos);
            } else {
                tempVec.subVectors(pos, this.points[i - 1].position);
            }
            tempVec.normalize();

            if (this.billboard && this.camera) {
                // Billboard mode: Calculate perpendicular vector using cross product of camera direction and movement direction
                cameraDir.subVectors(this.camera.position, pos).normalize();
                perpVec.crossVectors(tempVec, cameraDir).normalize();
                
                // Fallback when cross product is small (camera is on movement axis)
                if (perpVec.lengthSq() < 0.01) {
                    perpVec.crossVectors(tempVec, upVec).normalize();
                }
            } else {
                // Normal mode: Calculate perpendicular vector with Y-axis as up
                perpVec.crossVectors(tempVec, upVec).normalize();

                // Use different axis if direction is nearly vertical
                if (perpVec.lengthSq() < 0.01) {
                    perpVec.crossVectors(tempVec, new THREE.Vector3(1, 0, 0)).normalize();
                }

                // If normalAngle is specified, rotate around movement axis
                if (this.normalAngle !== 0) {
                    const quaternion = new THREE.Quaternion();
                    quaternion.setFromAxisAngle(tempVec, this.normalAngle);
                    perpVec.applyQuaternion(quaternion);
                }
            }

            const halfWidth = point.width * 0.5;

            // Set left and right vertices
            const leftIndex = i * 2;
            const rightIndex = i * 2 + 1;

            // Left vertex
            this.positions[leftIndex * 3] = pos.x - perpVec.x * halfWidth;
            this.positions[leftIndex * 3 + 1] = pos.y - perpVec.y * halfWidth;
            this.positions[leftIndex * 3 + 2] = pos.z - perpVec.z * halfWidth;

            // Right vertex
            this.positions[rightIndex * 3] = pos.x + perpVec.x * halfWidth;
            this.positions[rightIndex * 3 + 1] = pos.y + perpVec.y * halfWidth;
            this.positions[rightIndex * 3 + 2] = pos.z + perpVec.z * halfWidth;

            // UV coordinates (V direction based on elapsed time)
            const u = i / (numPoints - 1);
            this.uvs[leftIndex * 2] = u;
            this.uvs[leftIndex * 2 + 1] = 0;
            this.uvs[rightIndex * 2] = u;
            this.uvs[rightIndex * 2 + 1] = 1;

            // Calculate opacity (older points are more transparent)
            const alpha = 1.0 - (point.age / this.fadeTime);
            const clampedAlpha = Math.max(0, Math.min(1, alpha));

            // Vertex color (RGBA)
            this.colors[leftIndex * 4] = 1;
            this.colors[leftIndex * 4 + 1] = 1;
            this.colors[leftIndex * 4 + 2] = 1;
            this.colors[leftIndex * 4 + 3] = clampedAlpha;

            this.colors[rightIndex * 4] = 1;
            this.colors[rightIndex * 4 + 1] = 1;
            this.colors[rightIndex * 4 + 2] = 1;
            this.colors[rightIndex * 4 + 3] = clampedAlpha;
        }

        // Set indices
        let indexOffset = 0;
        for (let i = 0; i < numPoints - 1; i++) {
            const bl = i * 2;       // bottom-left
            const br = i * 2 + 1;   // bottom-right
            const tl = (i + 1) * 2; // top-left
            const tr = (i + 1) * 2 + 1; // top-right

            // Triangle 1
            this.indices[indexOffset++] = bl;
            this.indices[indexOffset++] = tl;
            this.indices[indexOffset++] = br;

            // Triangle 2
            this.indices[indexOffset++] = br;
            this.indices[indexOffset++] = tl;
            this.indices[indexOffset++] = tr;
        }

        // Update geometry attributes
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.index.needsUpdate = true;

        // Set draw range
        this.geometry.setDrawRange(0, (numPoints - 1) * 6);
        this.geometry.computeBoundingSphere();
    }

    /**
     * Set ribbon color
     * @param {THREE.Color} color - New color
     */
    setColor(color) {
        this.color = color;
        this.material.uniforms.uBaseColor.value = color;
    }

    /**
     * Set texture
     * @param {THREE.Texture} texture - Texture
     */
    setTexture(texture) {
        this.texture = texture;
        this.material.uniforms.uTexture.value = texture;
        this.material.uniforms.uUseTexture.value = texture !== null;
    }

    /**
     * Clear ribbon
     */
    clear() {
        this.points = [];
        this.geometry.setDrawRange(0, 0);
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        if (this.texture) {
            this.texture.dispose();
        }
    }
}

export default TrailRibbon;
