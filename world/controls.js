import * as THREE from "three/nodes";

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
    impulseF: 0,
    impulseR: 0,
    impulse: 0,
    orbitImpulseL: 0,
    orbitImpulseR: 0,
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

    const start = new THREE.Vector3(0, 0, 0);
    const end   = state.player.position.clone();
    const axis = end.clone().normalize();

    
    const player = state.player;

    player.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), axis);
    player.camRig.rotateOnAxis(new THREE.Vector3(0,0,1), (state.orbitImpulseL + state.orbitImpulseR) * -.01);

    state.camera.up.copy(axis);
    state.camera.lookAt(state.player.position);


}

function followPlayerzzz() {
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
    state.camera.position.copy(playerPosition.clone().addScalar(4)).add(orbitOffset);
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

let tickCounter = 0;
function update() {
    tickCounter += tickCounter == 30 ? -30 : 1;
    if (tickCounter == 0) {
        console.log(`tick`);
    }

    if (!state.player || !state.player.rigidBody) {
        console.log(`no player body YET`);
        return;
    }

    const speed = 0;// Math.abs( getSpeed( state.player.rigidBody.linvel() ) );

    state.impulse = (state.impulseF + state.impulseR) * state.groundControl;

    const impulse = speed >= state.maxVel ? 0 : state.impulse;

    const playerPos = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();

    state.player.getWorldPosition(playerPos);
    state.camera.getWorldPosition(cameraPos);

    const cameraToPlayer = new THREE.Vector3().subVectors(
        playerPos,
        cameraPos
        ).normalize();

    const movement = cameraToPlayer.multiplyScalar(state.moveSpeed * impulse);
    state.player.rigidBody.applyImpulse(movement, true);

    if (state.yImpulse > 0) {
        const jumpDir = state.player.position.clone().normalize().multiplyScalar(150);
        state.player.rigidBody.applyImpulse(jumpDir, true);
        
        state.yImpulse = 0;
    }
}

function setKeyState(e, isKeyDown) {
    isTouchingGround();
    switch (e.key) {
        case 'ArrowLeft':
            setOrbitL(isKeyDown);
            break;
        case 'ArrowRight':
            setMoveF(isKeyDown);
            break;
        case 'ArrowUp':
            setMoveF(isKeyDown);
            break;
        case 'ArrowDown':
            setMoveR(isKeyDown);
            break;
        case ' ':
            if (isKeyDown) {
                doJump();
            } else {
                stopJump();
            }
            break;
        default:
            doNothing();
            break;
    }
}

function setMoveF(isOn) {
    state.impulseF = isOn ? 1 : 0;
}

function setMoveR(isOn) {
    state.impulseR = isOn ? -1 : 0;
}

function setOrbitR(isOn) {
    state.orbitImpulseR = isOn ? 1 : 0;
}

function setOrbitL(isOn) {
    state.orbitImpulseL = isOn ? -1 : 0;
}

function stopMove() {
    setMoveF(false);
    setMoveR(false);
}

function stopOrbit() {
    setOrbitL(false);
    setOrbitR(false);
}

function stopJump() {
    console.log(`stopJump`);
    state.yImpulse = 0;
}

function doJump() {
    console.log(`doJump`);
    if ( state.onGround ) {
        console.log(`doJump onGround`);
        state.yImpulse = state.jumpPower;
    }
}

function doNothing() {

}

function isTouchingGround() {

    const playerPosition = state.player.position.clone();
    const axis = playerPosition.clone().normalize().negate();
    
    const raycaster = state.raycaster;
    const rayOrigin = state.player.position;
    
    const rayDirections = [
        { angle: axis, threshold: 1.1 }
    ];
    const step = 12; // kill this for now
    for (let i = step; i <= 10; i+=step) {
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
            state.onGround = true;
            return true;
        }
    }
    
    state.onGround = false;
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
    const moveThreshold = 20; // pixels

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
                setOrbitR(true);
            } else {
                setOrbitL(true);
            }
        } else if (Math.abs(deltaY) > moveThreshold) {
            isMoving = true;
            if (deltaY < 0) {
                setMoveF(true);
            } else {
                setMoveR(true);
            }
        }
    });

    domElement.addEventListener("touchend", (e) => {
        e.preventDefault();
        isTouchingGround();
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
