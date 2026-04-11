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
    state.onGround = isTouchingGround();
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
        state.xImpulse = state.onGround || state.xImpulse == -10 ? -10 : -1;
    } else if (state.rightKey) {
        state.xImpulse = state.onGround || state.xImpluse == 10 ? 10 : 1;
    } else {
        state.xImpulse = 0;
    }

    if (state.upKey && state.onGround) {
        if ( state.onGround ) {
            state.yImpulse = 300;
        }
    } else if (state.downKey) {
        // gravity will pull us down, no need for input...
    } else {
        state.yImpulse = 0;
    }
}

function doNothing() {

}

function isTouchingGround() {
    // cast a ray straight down from the center of player.position
    // if it intersects with the mesh of any of gameObjects, with a
    // length of 1, then return true, else return false
    
    const raycaster = new THREE.Raycaster();
    const rayOrigin = state.player.position.clone();
    const rayDirection = new THREE.Vector3(0, -1, 0); // Point straight down
    
    raycaster.set(rayOrigin, rayDirection);
    
    // Get all meshes from gameObjects (filter out objects without meshes)
    const meshes = state.gameObjects
        .filter(obj => obj.mesh)
        .map(obj => obj.mesh);
    
    // Check for intersections
    const intersections = raycaster.intersectObjects(meshes);
    
    // Return true if there's an intersection within distance 1
    if (intersections.length > 0 && intersections[0].distance <= 1) {
        return true;
    }
    
    return false;
}

const gameControls = (camera, domElement, gameObjects, player) => {

    state.camera = camera;
    state.domElement = domElement;
    state.gameObjects = gameObjects;
    state.player = player;
    console.log(`i initted the player: `, state.player);

    window.addEventListener("keydown", (e) => {
        setKeyState(e, true);
    });
    window.addEventListener("keyup", (e) => {
        setKeyState(e, false);
    });

    return state;
};


export const GameControls = gameControls;
