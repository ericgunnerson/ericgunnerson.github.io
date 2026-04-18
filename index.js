import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { sky as Sky } from "./sky.js";
import { GameControls } from './controls.js';
import { meshConfigData } from './meshConfig.js';
import * as RAPIER from "@dimforge/rapier3d";

const meshConfigs = meshConfigData.meshes;
const playerStart = meshConfigData.playerStart;
const w = window.innerWidth;
const h = window.innerHeight;
const collections = {
  meshes: [],
  lights: [],
};
let renderer, camera, scene, controls, player, world, sky;

async function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  document.body.appendChild(renderer.domElement);
}

async function initCamera() {
  const fov = 75;
  const aspect = w / h;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 5;
  camera.position.y = -.5;
  camera.lookAt(player.position);

  sky = Sky(scene);
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    // Update Camera Aspect
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update Renderer Size
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function initScene() {
  scene = new THREE.Scene();
}

async function initOrbitControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.03;
}

async function initGameControls() {
  controls = GameControls(camera, renderer, meshConfigs, player);
}

async function initMeshes() {
  for (const config of meshConfigs) {
    config.scene = scene;
    await config.initMesh(config, collections, world);
  }

  const geometry = new THREE.SphereGeometry( 1, 32, 16 );
  const material = new THREE.MeshStandardMaterial( { color: 0xff0000, roughness: .2, metalness: .2 } );
  const sphere = new THREE.Mesh( geometry, material );
  sphere.visible = true;
  scene.add( sphere );
  player = sphere;

  // Create Rapier dynamic rigidbody for player
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.6);;
  player.rigidBody = world.createRigidBody(rigidBodyDesc);
  player.rigidBody.setTranslation(sphere.position, true);
  const colliderDesc = RAPIER.ColliderDesc.ball(1);
  player.collider = world.createCollider(colliderDesc, player.rigidBody);

  player.rigidBody.setTranslation({ x: playerStart.x, y: playerStart.y, z: 0.0 }, true);
}

async function initLights() {
  // const hemiLight = new THREE.HemisphereLight(0xffffff, 0xff0000);
  // collections.lights.push(hemiLight);
  // scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
  collections.lights.push(ambientLight);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );
}

async function initPhysics() {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
}

async function animate() {
  requestAnimationFrame(animate);
  controls.update();
  world.step();
  // Sync player mesh with physics rigidbody
  player.position.copy(player.rigidBody.translation());
  player.quaternion.copy(player.rigidBody.rotation());
  // Move camera with player
  camera.position.x = player.position.x;
  camera.position.y = player.position.y + 2;
  camera.position.z = player.position.z + 10;
  camera.lookAt(player.position);
  sky.position.x = camera.position.x;
  meshConfigs.forEach(config => { config.animate(config, player); });
  renderer.render(scene, camera);
}

// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  await initPhysics();
  await initMeshes();
  await initGameControls();
  await initCamera();
  await initLights();
  await animate();
})();
