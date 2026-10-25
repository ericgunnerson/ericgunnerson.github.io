import * as THREE from "three";
import { VRButton } from "jsm/webxr/VRButton.js";

const w = window.innerWidth;
const h = window.innerHeight;

let renderer, camera, cameraRig, scene, player;
let desktopCameraQuaternion;
const pressedKeys = new Set();
const xrPressedKeys = new Set();
const clock = new THREE.Clock();
let speed = 0;
const acceleration = 8;
const maxSpeed = 12;
const friction = 1;
const brakingPower = 12;
const maxTurnRadius = 5;
const turnSensitivity = 10;
const cameraRotationSpeed = 1.5;
let turnRadius = 0;
let lastTurnDirection = 0;

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    pressedKeys.add(event.key);
  } else if (["w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    pressedKeys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.startsWith("Arrow")
    ? event.key
    : event.key.toLowerCase();
  pressedKeys.delete(key);
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
});

async function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

async function initCamera() {
  const fov = 75;
  const aspect = w / h;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 0, 0);
  camera.rotation.x = -Math.atan2(3, 5);
  cameraRig = new THREE.Group();
  cameraRig.position.copy(player.position);
  cameraRig.add(camera);
  scene.add(cameraRig);

  renderer.xr.addEventListener("sessionstart", () => {
    desktopCameraQuaternion = camera.quaternion.clone();
    camera.quaternion.identity();
    for (const key of ["w", "a", "s", "d"]) {
      pressedKeys.delete(key);
    }
  });
  renderer.xr.addEventListener("sessionend", () => {
    if (desktopCameraQuaternion) {
      camera.quaternion.copy(desktopCameraQuaternion);
    }
    xrPressedKeys.clear();
  });
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  if (!renderer || renderer.xr.isPresenting || !camera) return;

  // Update Camera Aspect
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update Renderer Size
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateXrControls() {
  xrPressedKeys.clear();
  const session = renderer.xr.getSession();
  if (!session) return;

  const deadzone = 0.5;
  for (const inputSource of session.inputSources) {
    const axes = inputSource.gamepad?.axes;
    if (!axes || axes.length < 2) continue;

    // WebXR standard gamepads reserve axes 0-1 for the touchpad when present.
    const stickAxis = axes.length >= 4 ? 2 : 0;
    const x = axes[stickAxis];
    const y = axes[stickAxis + 1];
    if (x >= deadzone) xrPressedKeys.add("ArrowRight");
    if (x <= -deadzone) xrPressedKeys.add("ArrowLeft");
    if (y <= -deadzone) xrPressedKeys.add("ArrowUp");
    if (y >= deadzone) xrPressedKeys.add("ArrowDown");
  }
}

function isControlPressed(key) {
  return pressedKeys.has(key) || xrPressedKeys.has(key);
}

async function initScene() {
  scene = new THREE.Scene();
  const skybox = await new THREE.CubeTextureLoader().loadAsync([
    "sky/space01/posx.jpg",
    "sky/space01/negx.jpg",
    "sky/space01/posy.jpg",
    "sky/space01/negy.jpg",
    "sky/space01/posz.jpg",
    "sky/space01/negz.jpg",
  ]);
  skybox.colorSpace = THREE.SRGBColorSpace;
  scene.background = skybox;
  scene.environment = skybox;
}

async function initMeshes() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshPhysicalMaterial({
      color: 0x8899aa,
      metalness: 0.75,
      roughness: 0.15,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.4;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 200, 0x9bbcff, 0x526987);
  grid.position.y = -0.395;
  const gridMaterials = Array.isArray(grid.material)
    ? grid.material
    : [grid.material];
  for (const material of gridMaterials) {
    material.transparent = true;
    material.opacity = 0.45;
    material.depthWrite = false;
  }
  scene.add(grid);

  const car = new THREE.Group();
  const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 2.4);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.2,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.25;
  car.add(body);

  const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.8, 0.8]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.05, z);
      car.add(wheel);
    }
  }

  scene.add(car);
  player = car;
}

async function initLights() {

  const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  updateXrControls();
  const moveDirection =
    (isControlPressed("ArrowUp") ? 1 : 0) -
    (isControlPressed("ArrowDown") ? 1 : 0);
  const turnDirection =
    (isControlPressed("ArrowRight") ? 1 : 0) -
    (isControlPressed("ArrowLeft") ? 1 : 0);

  if (moveDirection !== 0) {
    if (speed * moveDirection < 0) {
      const braking = (friction + brakingPower) * delta;
      speed =
        speed > 0
          ? Math.max(0, speed - braking)
          : Math.min(0, speed + braking);
    } else {
      speed = THREE.MathUtils.clamp(
        speed + moveDirection * acceleration * delta,
        -maxSpeed,
        maxSpeed,
      );
    }
  } else {
    speed = THREE.MathUtils.damp(speed, 0, friction, delta);
    if (Math.abs(speed) < 0.01) speed = 0;
  }

  if (turnDirection === 0) {
    turnRadius = 0;
    lastTurnDirection = 0;
  } else {
    if (lastTurnDirection !== 0 && turnDirection !== lastTurnDirection) {
      turnRadius = 0;
    }
    turnRadius = THREE.MathUtils.clamp(
      turnRadius - turnDirection * turnSensitivity * delta,
      -maxTurnRadius,
      maxTurnRadius,
    );
    lastTurnDirection = turnDirection;
  }

  player.translateZ(-speed * delta);
  if (speed !== 0) {
    player.rotation.y +=
      (speed / maxTurnRadius) * (turnRadius / maxTurnRadius) * delta;
  }

  const cameraOffset = new THREE.Vector3(0, 3, 5).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    player.rotation.y,
  );
  cameraRig.position.copy(player.position).add(cameraOffset);
  cameraRig.rotation.y = player.rotation.y;

  if (!renderer.xr.isPresenting) {
    const horizontalCameraInput =
      (pressedKeys.has("w") ? 1 : 0) - (pressedKeys.has("s") ? 1 : 0);
    const verticalCameraInput =
      (pressedKeys.has("a") ? 1 : 0) - (pressedKeys.has("d") ? 1 : 0);
    camera.rotateY(horizontalCameraInput * cameraRotationSpeed * delta);
    camera.rotateX(verticalCameraInput * cameraRotationSpeed * delta);
  }

  renderer.render(scene, camera);
}

// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  await initMeshes();
  await initCamera();
  await initLights();
  renderer.setAnimationLoop(animate);
})();
