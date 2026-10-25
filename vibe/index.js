import * as THREE from "three";
import { VRButton } from "jsm/webxr/VRButton.js";
import { createMenu } from "./ui.js";

const w = window.innerWidth;
const h = window.innerHeight;

let renderer, camera, cameraRig, scene, player, car;
const xrControllers = [];
let menu;
let desktopCameraQuaternion;
const pressedKeys = new Set();
const xrPressedKeys = new Set();
const clock = new THREE.Clock();
let speed = 0;
const settings = {
  acceleration: 8,
  maxSpeed: 12,
  friction: 1,
  brakingPower: 12,
  maxTurnRadius: 8,
  turnSensitivity: 20,
  cameraRotationSpeed: 1.5,
  cameraOffsetY: 3,
  cameraOffsetZ: 5,
};
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

function initXrControllers() {
  for (let index = 0; index < 2; index++) {
    const controller = renderer.xr.getController(index);
    const pointerGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -3),
    ]);
    const pointer = new THREE.Line(
      pointerGeometry,
      new THREE.LineBasicMaterial({ color: 0x9bc2ff }),
    );
    pointer.frustumCulled = false;
    controller.add(pointer);
    xrControllers.push(controller);
  }
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
  let detectedAxisCount = 0;

  if (session) {
    const deadzone = 0.5;
    for (const inputSource of session.inputSources) {
      const axes = inputSource.gamepad?.axes;
      if (!axes) continue;
      detectedAxisCount += axes.length;

      for (let axis = 0; axis < axes.length; axis++) {
        const value = axes[axis];
        if (axis % 2 === 0) {
          if (value >= deadzone) xrPressedKeys.add("ArrowRight");
          if (value <= -deadzone) xrPressedKeys.add("ArrowLeft");
        } else {
          if (value <= -deadzone) xrPressedKeys.add("ArrowUp");
          if (value >= deadzone) xrPressedKeys.add("ArrowDown");
        }
      }
    }
  }

  car
    ?.getObjectByName("body")
    ?.material.color.setHex(detectedAxisCount > 0 ? 0x00ff00 : 0xff0000);
}

function isControlPressed(key) {
  return pressedKeys.has(key) || xrPressedKeys.has(key);
}

function updateFrontWheelRotation() {
  const steeringPercentage = THREE.MathUtils.clamp(
    turnRadius / settings.maxTurnRadius,
    -1,
    1,
  );
  const steeringAngle = steeringPercentage * THREE.MathUtils.degToRad(20);

  for (const wheel of car.userData.frontWheels) {
    wheel.rotation.y = steeringAngle;
  }
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

  car = new THREE.Group();
  car.userData.frontWheels = [];
  const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 2.4);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.2,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.name = "body";
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
      if (z < 0) car.userData.frontWheels.push(wheel);
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
      const braking = (settings.friction + settings.brakingPower) * delta;
      speed =
        speed > 0
          ? Math.max(0, speed - braking)
          : Math.min(0, speed + braking);
    } else {
      speed = THREE.MathUtils.clamp(
        speed + moveDirection * settings.acceleration * delta,
        -settings.maxSpeed,
        settings.maxSpeed,
      );
    }
  } else {
    speed = THREE.MathUtils.damp(speed, 0, settings.friction, delta);
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
      turnRadius - turnDirection * settings.turnSensitivity * delta,
      -settings.maxTurnRadius,
      settings.maxTurnRadius,
    );
    lastTurnDirection = turnDirection;
  }
  updateFrontWheelRotation();

  player.translateZ(-speed * delta);
  if (speed !== 0) {
    player.rotation.y +=
      (speed / settings.maxTurnRadius) *
      (turnRadius / settings.maxTurnRadius) *
      delta;
  }

  const cameraOffset = new THREE.Vector3(
    0,
    settings.cameraOffsetY,
    settings.cameraOffsetZ,
  ).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  cameraRig.position.copy(player.position).add(cameraOffset);
  cameraRig.rotation.y = player.rotation.y;
  for (const controller of xrControllers) {
    if (controller.parent !== cameraRig) {
      cameraRig.add(controller);
    }
  }

  if (!renderer.xr.isPresenting) {
    const horizontalCameraInput =
      (pressedKeys.has("a") ? 1 : 0) - (pressedKeys.has("d") ? 1 : 0);
    const verticalCameraInput =
      (pressedKeys.has("w") ? 1 : 0) - (pressedKeys.has("s") ? 1 : 0);
    const yawRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      horizontalCameraInput * settings.cameraRotationSpeed * delta,
    );
    const pitchRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      verticalCameraInput * settings.cameraRotationSpeed * delta,
    );
    const parentWorldQuaternion = cameraRig.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const cameraWorldQuaternion = camera.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    cameraWorldQuaternion.premultiply(yawRotation);
    camera.quaternion
      .copy(parentWorldQuaternion.invert())
      .multiply(cameraWorldQuaternion);
    camera.quaternion.multiply(pitchRotation);
  }

  menu?.update();
  renderer.render(scene, camera);
}

// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  initXrControllers();
  await initMeshes();
  await initCamera();
  await initLights();
  menu = createMenu({
    renderer,
    camera,
    controllers: xrControllers,
    parent: car,
    settings,
  });
  menu.update();
  renderer.setAnimationLoop(animate);
})();
