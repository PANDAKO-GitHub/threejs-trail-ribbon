# threejs-trail-ribbon

A lightweight trail and ribbon effect library for Three.js.

![Three.js](https://img.shields.io/badge/Three.js-r160+-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Easy to use** - Simple API for creating trail/ribbon effects
- **Automatic fade-out** - Points fade out over time automatically
- **Billboard mode** - Ribbon always faces the camera
- **Custom textures** - Apply any texture to the ribbon
- **Customizable** - Control width, color, fade time, and more
- **Performance optimized** - Pre-allocated buffers for smooth rendering

## Demo

- [English Demo](demo-en.html)
- [日本語デモ](demo-ja.html)

## Installation

### Using ES Modules (CDN)

```html
<script type="importmap">
{
    "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    }
}
</script>

<script type="module">
    import * as THREE from 'three';
    import { TrailRibbon } from './TrailRibbon.js';
    
    // Your code here
</script>
```

### Using npm (coming soon)

```bash
npm install threejs-trail-ribbon
```

## Quick Start

```javascript
import * as THREE from 'three';
import { TrailRibbon } from './TrailRibbon.js';

// Create a ribbon
const ribbon = new TrailRibbon({
    maxPoints: 100,
    fadeTime: 2.0,
    color: new THREE.Color(0x00ffff),
    billboard: true
});

// For billboard mode, set the camera
ribbon.setCamera(camera);

// Add to scene
scene.add(ribbon.mesh);

// In your animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Add points as the object moves
    ribbon.addPoint(objectPosition, 0.5); // position, width
    
    // Update ribbon (handles fade-out)
    ribbon.update(deltaTime);
    
    renderer.render(scene, camera);
}
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxPoints` | number | 100 | Maximum number of points in the ribbon |
| `fadeTime` | number | 1.0 | Time in seconds until a point becomes fully transparent |
| `color` | THREE.Color | white | Base color of the ribbon |
| `texture` | THREE.Texture | null | Optional texture to apply |
| `doubleSide` | boolean | true | Whether to render both sides |
| `billboard` | boolean | false | If true, ribbon always faces the camera |
| `normalAngle` | number | 0 | Rotation angle (degrees) around movement axis (only when billboard is OFF) |

### Methods

#### `addPoint(position, width)`
Add a new point to the ribbon.
- `position` (THREE.Vector3) - Center position of the point
- `width` (number) - Width of the ribbon at this point

#### `update(deltaTime)`
Update the ribbon. Call this every frame.
- `deltaTime` (number) - Time elapsed since last frame in seconds

#### `setCamera(camera)`
Set the camera for billboard mode.
- `camera` (THREE.Camera) - The camera to face

#### `setColor(color)`
Change the ribbon color.
- `color` (THREE.Color) - New color

#### `setTexture(texture)`
Set or change the texture.
- `texture` (THREE.Texture | null) - Texture to apply, or null to remove

#### `setNormalAngle(degrees)`
Set the normal direction angle (only effective when billboard is OFF).
- `degrees` (number) - Rotation angle in degrees

#### `clear()`
Remove all points from the ribbon.

#### `dispose()`
Dispose of geometry, material, and texture resources. Call this when removing the ribbon.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `mesh` | THREE.Mesh | The mesh to add to your scene |
| `points` | Array | Current point data |
| `color` | THREE.Color | Current color |
| `texture` | THREE.Texture | Current texture |

## Examples

### Basic Trail Effect

```javascript
const ribbon = new TrailRibbon({
    maxPoints: 200,
    fadeTime: 1.5,
    color: new THREE.Color(0xff6600)
});
scene.add(ribbon.mesh);
```

### Billboard Mode (Camera-Facing)

```javascript
const ribbon = new TrailRibbon({
    billboard: true,
    fadeTime: 2.0
});
ribbon.setCamera(camera);
scene.add(ribbon.mesh);
```

### With Texture

```javascript
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('trail.png');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

const ribbon = new TrailRibbon({
    texture: texture,
    fadeTime: 3.0
});
scene.add(ribbon.mesh);
```

### Variable Width

```javascript
// In animation loop - vary width based on speed or time
const speed = velocity.length();
const width = 0.2 + speed * 0.1;
ribbon.addPoint(position, width);
```

## Browser Support

Works in all modern browsers that support WebGL and ES6 modules.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

PANDAKO-GitHub
