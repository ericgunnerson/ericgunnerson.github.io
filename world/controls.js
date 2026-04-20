import * as THREE from "three";

const state = {
    gameObjects: [],
    raycaster: new THREE.Raycaster(),
    active: true,
    update: update,
    followPlayer: followPlayer,
    cameraOrbitAngle: 0,
    leftKey: false,
    rightKey: false,
    upKey: false,
    downKey: false,
    impulse: 0,
    orbitImpulse: 0,
    xImpulse: 0,
    yImpulse: 0,
    zImpulse: 0,
    groundControl: 5,
    airControl: 3,
    jumpPower: 400,
    yMove: 0,
    moveSpeed: .3,
    orbitSpeed: .04,
    maxVel: 20,
    onGround: false,
    stepMode: true,
    canStep: true,
    showRight: false,
}

function followPlayer() {
    if (!state.player || !state.camera) {
        return;
    }

    const radius = 10;
    const orbitSpeed = state.orbitSpeed * state.orbitImpulse;
    const playerPosition = state.player.position.clone();

    if (playerPosition.lengthSq() === 0) {
        return;
    }

    const axis = playerPosition.clone().normalize();
    const offset = state.camera.position.clone().sub(playerPosition);

    let orbitOffset;
    if (offset.lengthSq() < 1e-6) {
        const startPoint = Math.abs(axis.y) > 0.999 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        orbitOffset = new THREE.Vector3().crossVectors(axis, startPoint).normalize().multiplyScalar(radius);
    } else {
        const parallel = axis.clone().multiplyScalar(offset.dot(axis));
        const perp = offset.clone().sub(parallel);

        if (perp.lengthSq() < 1e-6) {
            const startPoint = Math.abs(axis.y) > 0.999 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            perp.copy(new THREE.Vector3().crossVectors(axis, startPoint));
        }

        orbitOffset = perp.normalize().multiplyScalar(radius);
    }

    orbitOffset.applyAxisAngle(axis, orbitSpeed);
    state.camera.position.copy(playerPosition).add(orbitOffset);
    state.camera.up.copy(axis);
    state.camera.lookAt(state.player.position);
}

function getSpeed(velocity) {
    // Example in 3D
    const speed = Math.sqrt(
    velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
    );
    return speed;
}

function update() {

    if (!state.player || !state.player.rigidBody) {
        console.log(`no player body YET`);
        return;
    }

    const speed = Math.abs( getSpeed( state.player.rigidBody.linvel() ) );

    const impulse = speed >= state.maxVel ? 0 : state.impulse;

    const cameraToPlayer = new THREE.Vector3().subVectors(
        state.player.position,
        state.camera.position
        ).normalize();
    const movement = cameraToPlayer.multiplyScalar(state.moveSpeed * impulse);
    state.player.rigidBody.applyImpulse(movement, true);

    if (state.yImpulse > 0) {
        const jumpDir = state.player.position.clone().normalize(). multiplyScalar(150);
        state.player.rigidBody.applyImpulse(jumpDir, true);
        
        state.yImpulse = 0;
    }
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
        orbitLeft();
    } else if (state.rightKey) {
        orbitRight();
    } else {
        stopOrbit();
    }

    if (e.key == ' ') {
        if (keyState) {
            doJump();
        } else {
            stopJump();
        }
    }

    if (state.upKey) {
        moveForward();
    } else if (state.downKey) {
        moveBackward();
    } else {
        stopMove();
        //stopJump();
    }
}

function stopJump() {
    state.yImpulse = 0;
}

function stopMove() {
    state.impulse = 0;
}

function moveForward() {
    state.onGround = isTouchingGround();
    state.impulse = state.onGround || state.impulse == state.groundControl ? state.groundControl : state.airControl;
}

function moveBackward() {
    state.onGround = isTouchingGround();
    state.impulse = state.onGround || state.impulse == -state.groundControl ? -state.groundControl : -state.airControl;
}

function orbitLeft() {
    state.orbitImpulse = 1;
}

function orbitRight() {
    state.orbitImpulse = -1;
}

function stopOrbit() {
    state.orbitImpulse = 0;
}

function doJump() {
    state.onGround = isTouchingGround();
    if ( state.onGround ) {
        state.yImpulse = state.jumpPower;
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
    const meshes = [ state.earth ];
    
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

const gameControls = (camera, renderer, player, earth) => {

    state.camera = camera;
    state.domElement = renderer.domElement;
    state.player = player;
    state.earth = earth;

    const domElement = state.domElement;

    // Touch event variables
    let touchStartTime;
    let touchStartX;
    let touchStartY;
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
        touchStartY = e.touches[0].clientY;
        isMoving = false;
    });

    domElement.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        if (Math.abs(deltaX) > moveThreshold) {
            isMoving = true;
            if (deltaX > 0) {
                orbitRight();
            } else {
                orbitLeft();
            }
        } else if (Math.abs(deltaY) > moveThreshold) {
            isMoving = true;
            if (deltaY < 0) {
                moveForward();
            } else {
                moveBackward();
            }
        }
    });

    domElement.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (isMoving) {
            stopOrbit();
            stopMove();
        } else {
            doJump();
        }
    });

    return state;
};


export const GameControls = gameControls;
