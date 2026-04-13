import * as THREE from "three";

const state = {
    active: true,
    update: update,
    leftKey: false,
    rightKey: false,
    upKey: false,
    downKey: false,
    xImpluse: 0,
    yImpulse: 0,
    zImpulse: 0,
    gravitySpeed: .02,
    yMove: 0,
    moveSpeed: .3,
    onGround: false,
    stepMode: true,
    canStep: true,
    showRight: false
}

function update() {

    if (!state.player || !state.player.rigidBody) {
        console.log(`no player body YET`);
        return;
    }

    const moveSpeed = state.moveSpeed;

    // Apply movement to player.rigidBody (z locked at 0)
    const movement = new THREE.Vector3(state.xImpulse, state.yImpulse, 0).multiplyScalar(moveSpeed);
    state.yImpulse = 0;
    state.player.rigidBody.applyImpulse(movement, true);
    const newPos = state.player.rigidBody.translation();
    state.player.rigidBody.setTranslation({ x: newPos.x, y: newPos.y, z: 0.0 }, true);

    state.gameObjects.forEach(gameObject => {

        if (checkDistance(gameObject)) {
            gameObject.activateMesh(gameObject);
        } else {
            gameObject.deactivateMesh(gameObject);
        }
    });
}

function checkDistance(gameObject) {
    const dx = gameObject.position.x - state.player.position.x;
    const dy = gameObject.position.y - state.player.position.y;
    const dz = gameObject.position.z - state.player.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance <= 30;
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
    state.xImpulse = state.onGround || state.xImpluse == 10 ? 10 : 1;
}

function moveLeft() {
    state.onGround = isTouchingGround();
    state.xImpulse = state.onGround || state.xImpulse == -10 ? -10 : -1;
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
    // Cast three rays: straight down, 5° left, and 5° right
    // Check if any intersect within their respective thresholds
    
    const raycaster = new THREE.Raycaster();
    const rayOrigin = state.player.position.clone();
    
    // Three ray directions: straight down, 5° left, and 5° right
    const angle5 = 5 * Math.PI / 180; // 5 degrees in radians
    const angle10 = 10 * Math.PI / 180;
    const rayDirections = [
        { angle: new THREE.Vector3(0, -1, 0), threshold: 1.1 }
    ];
    for (let i = 1; i <= 15; i++) {
        const angle = i * Math.PI / 180;
        rayDirections.push({ angle: new THREE.Vector3(-Math.sin(angle), -Math.cos(angle), 0), threshold: 1.2 });
        rayDirections.push({ angle: new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0), threshold: 1.2 });
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

const gameControls = (camera, domElement, gameObjects, player) => {

    state.camera = camera;
    state.domElement = domElement;
    state.gameObjects = gameObjects;
    state.player = player;

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
