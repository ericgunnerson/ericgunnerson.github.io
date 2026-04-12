import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { sky as Sky } from "./sky.js";
import { GameControls } from './controls.js';
import { meshConfigs } from './meshConfig.js';
import * as RAPIER from "@dimforge/rapier3d";

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

  // Prevent default touch behaviors for mobile controls
  const canvas = renderer.domElement;
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

  // Also prevent on body to avoid pull-to-refresh
  document.body.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.body.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
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
  controls = GameControls(camera, renderer.domElement, meshConfigs, player);
}

async function initMesh(config) {
  let geo = null;
  if (config.geometry.type == 'ExtrudeGeometry') {
    geo = config.geometry.geometry;
  } else {
    geo = new THREE[config.geometry.type](...config.geometry.args);
  }
  const mat = new THREE[config.material.type](config.material.options);
  const mesh = new THREE.Mesh(geo, mat);
  config.mesh = mesh;
  mesh.position.set(config.position.x, config.position.y, config.position.z);
  collections.meshes.push(mesh);
  config.scene.add(mesh);
  if (config.init) {
    config.init(mesh);
  }

  // Create Rapier convex hull collider
  config.rigidBodies = [];
  const allVerts = config.geometry.colliderGeometries;
  for (let verts of allVerts) {
    //console.log(`guess what here is the whole geometry object: `, config.geometry);
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const rigidBody = world.createRigidBody(rigidBodyDesc);
    rigidBody.setTranslation(mesh.position, true);
    rigidBody.setRotation(mesh.quaternion, true);
    const vertices = verts.attributes.position.array;
    const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
    world.createCollider(colliderDesc, rigidBody);
    config.rigidBodies.push( rigidBody );
  }
}

function destroyMesh(config) {
  const mesh = config.mesh;
  if (mesh) {

    mesh.geometry.boundsTree = null;

    // Dispose geometries and materials to free memory
    mesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    // Remove from scene
    config.scene.remove(mesh);
    // Remove from collections
    const index = collections.meshes.indexOf(mesh);
    if (index > -1) {
      collections.meshes.splice(index, 1);
    }
    // Remove rigid body from physics world
    if (config.rigidBodies) {
      for (let bod of config.rigidBodies) {
        world.removeRigidBody(bod);
      }
      config.rigidBodies = [];
    }
    // Nullify reference
    config.mesh = null;
  }
}

function activateMesh(config) {
  //config.mesh.material.color.set(0xffffff);
  if (!config.mesh) {
   initMesh(config);
  }
}

function deactivateMesh(config) {
  //config.mesh.material.color.set(config.material.options.color);
  if (config.mesh) {
   destroyMesh(config);
  }
}


async function initMeshes() {
  for (const config of meshConfigs) {
    config.scene = scene;
    config.activateMesh = activateMesh;
    config.deactivateMesh = deactivateMesh;
    await initMesh(config);
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

  player.rigidBody.setTranslation({ x: 0, y: 50, z: 0.0 }, true);
  player.onGround = false;
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
  meshConfigs.forEach(config => { config.animate(config); });
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
