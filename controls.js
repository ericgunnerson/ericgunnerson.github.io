import * as THREE from "three";

const state = {
    raycaster: new THREE.Raycaster(),
    active: true,
    update: update,
    leftKey: false,
    rightKey: false,
    upKey: false,
    downKey: false,
    xImpulse: 0,
    yImpulse: 0,
    zImpulse: 0,
    groundControl: 5,
    airControl: 2,
    yMove: 0,
    moveSpeed: .3,
    maxVel: 16,
    onGround: false,
    stepMode: true,
    canStep: true,
    showRight: false,
}

function update() {

    if (!state.player || !state.player.rigidBody) {
        console.log(`no player body YET`);
        return;
    }

    const xVel = Math.abs(state.player.rigidBody.linvel().x);

    const xImpulse = xVel >= state.maxVel ? 0 : state.xImpulse;

    const movement = new THREE.Vector3(xImpulse, state.yImpulse, 0).multiplyScalar(state.moveSpeed);
    state.yImpulse = 0;
    state.player.rigidBody.applyImpulse(movement, true);

    // lock movement on z axis
    const newPos = state.player.rigidBody.translation();
    state.player.rigidBody.setTranslation({ x: newPos.x, y: newPos.y, z: 0.0 }, true);
}

function setKeyState(e, keyState) {
    switch (e.key) {
        case 'ArrowLeft':
            state.leftKey = keyState;
            break;
        case 'ArrowRight':
            state.rightKey = keyState;
            break;
        case 'ArrowUp':
            if (keyState) {
                state.upKey = true;
            } else {
                state.upKey = false;
            }
            break;
        case 'ArrowDown':
            state.downKey = keyState;
            break;
        default:
            doNothing();
    }

    if (state.leftKey) {
        moveLeft();
    } else if (state.rightKey) {
        moveRight();
    } else {
        stopMove();
    }

    if (state.upKey) {
        doJump();
    } else {
        stopJump();
    }
}

function stopJump() {
    state.yImpulse = 0;
}

function stopMove() {
    state.xImpulse = 0;
}

function moveRight() {
    state.onGround = isTouchingGround();
    state.xImpulse = state.onGround || state.xImpulse == state.groundControl ? state.groundControl : state.airControl;
}

function moveLeft() {
    state.onGround = isTouchingGround();
    state.xImpulse = state.onGround || state.xImpulse == -state.groundControl ? -state.groundControl : -state.airControl;
}

function doJump() {
    state.onGround = isTouchingGround();
    if ( state.onGround ) {
        state.yImpulse = 300;
    }
}

function doNothing() {

}

function isTouchingGround() {
    // Cast some sweeping rays beneath the player.
    // Check if any intersect within their respective thresholds
    
    const raycaster = state.raycaster;
    const rayOrigin = state.player.position;
    
    const rayDirections = [
        { angle: new THREE.Vector3(0, -1, 0), threshold: 1.1 }
    ];
    for (let i = .2; i <= 45; i+=.2) {
        const angle = i * Math.PI / 180;
        const threshold = 1.2;
        rayDirections.push({ angle: new THREE.Vector3(-Math.sin(angle), -Math.cos(angle), 0), threshold: threshold });
        rayDirections.push({ angle: new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0), threshold: threshold });
    }
    
    // Get all meshes from gameObjects (filter out objects without meshes)
    const meshes = state.gameObjects
        .filter(obj => obj.mesh)
        .map(obj => obj.mesh);
    
    // Check each ray
    for (let i = 0; i < rayDirections.length; i++) {
        raycaster.set(rayOrigin, rayDirections[i].angle);
        const intersections = raycaster.intersectObjects(meshes);
        
        if (intersections.length > 0 && intersections[0].distance <= rayDirections[i].threshold) {
            return true;
        }
    }
    
    return false;
}

const gameControls = (camera, renderer, gameObjects, player) => {

    state.camera = camera;
    state.domElement = renderer.domElement;
    state.gameObjects = gameObjects;
    state.player = player;

    const domElement = state.domElement;

    // Touch event variables
    let touchStartTime;
    let touchStartX;
    let isMoving = false;
    const moveThreshold = 10; // pixels

    window.addEventListener("keydown", (e) => {
        setKeyState(e, true);
    });
    window.addEventListener("keyup", (e) => {
        setKeyState(e, false);
    });

    // Prevent default touch behaviors for mobile controls
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none'; // Disable default touch actions like scrolling
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

    // Also prevent on body to avoid pull-to-refresh
    document.body.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.body.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

    // Touch event listeners
    domElement.addEventListener("touchstart", (e) => {
        e.preventDefault();
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        isMoving = false;
    });

    domElement.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > moveThreshold) {
            isMoving = true;
            if (deltaX > 0) {
                moveRight();
            } else {
                moveLeft();
            }
        }
    });

    domElement.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (isMoving) {
            stopMove();
        } else {
            doJump();
        }
    });

    return state;
};


export const GameControls = gameControls;
