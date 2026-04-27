import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { GameControls } from './controls.js';
import * as RAPIER from "@dimforge/rapier3d";

const earthSize = 500;
const meshConfigs = [];
const playerStart = new THREE.Vector3(0, earthSize + 5, 0);
const w = window.innerWidth;
const h = window.innerHeight;
const collections = {
  meshes: [],
  lights: [],
};
let renderer, camera, scene, controls, player, playerSphere, box, earth, world;

async function initRenderer() {
  renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
  await renderer.init();
  renderer.setSize(w, h);
  document.body.appendChild(renderer.domElement);
}

async function initCamera() {
  const fov = 75;
  const aspect = w / h;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  camera.position.set(0, -5, 2);
  camera.lookAt(player.position);
  player.camRig.add(camera);
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

async function initGameControls() {
  controls = GameControls(camera, renderer, player, earth);
}

async function initLights() {

  const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
  collections.lights.push(ambientLight);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );
}

async function initPhysics() {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: 0, z: 0 });
}

async function initMeshes() {

  const geometry = new THREE.SphereGeometry( 1, 32, 16 );
  const playerMaterial = new THREE.MeshStandardNodeMaterial();
  playerMaterial.colorNode = TSL.vec3( TSL.color( 0xff0000 ) );
  playerMaterial.roughnessNode = TSL.float( 0.2 );
  playerMaterial.metalnessNode = TSL.float( 0.2 );
  const sphere = new THREE.Mesh( geometry, playerMaterial );
  sphere.visible = true;
  scene.add( sphere );
  player = new THREE.Object3D();
  scene.add( player );
  const camRig = new THREE.Object3D();
  player.add(camRig);
  player.camRig = camRig;
  playerSphere = sphere;

  // Create Rapier dynamic rigidbody for player
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.6);;
  player.rigidBody = world.createRigidBody(rigidBodyDesc);
  player.rigidBody.setTranslation(sphere.position, true);
  const colliderDesc = RAPIER.ColliderDesc.ball(1);
  player.collider = world.createCollider(colliderDesc, player.rigidBody);

  player.rigidBody.setTranslation({ x: playerStart.x, y: playerStart.y, z: 0.0 }, true);

  const earthGeo = new THREE.IcosahedronGeometry( earthSize, 30 );
  const earthMat = new THREE.MeshStandardNodeMaterial();
  earthMat.colorNode = TSL.vec3( TSL.color( 0x0000ff ) );
  earthMat.roughnessNode = TSL.float( 0.2 );
  earthMat.metalnessNode = TSL.float( 0.2 );
  earth = new THREE.Mesh( earthGeo, earthMat );
  earth.visible = true;
    
  // 3. Setup Wireframe
  const wireframeGeo = new THREE.WireframeGeometry(earthGeo);
  const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);

  // 4. Add to scene
  earth.add(wireframe);

  scene.add( earth );

  // Create Rapier rigidbody for earth
  const earthRigidBody = RAPIER.RigidBodyDesc.fixed();
  earth.rigidBody = world.createRigidBody(earthRigidBody);
  earth.rigidBody.setTranslation(sphere.position, true);
  // Access the geometry's position attribute
  const earthPos = earth.geometry.attributes.position.array;
  const earthColliderDesc = RAPIER.ColliderDesc.convexHull(earthPos);
  //const earthColliderDesc = RAPIER.ColliderDesc.ball(earthSize);
  earth.collider = world.createCollider(earthColliderDesc, earth.rigidBody);


}

async function animate() {
  requestAnimationFrame(animate);
  const origin = new THREE.Vector3(0, 0, 0);
  const gravityDir = player.position.clone().negate().normalize().multiplyScalar(5);
  player.rigidBody.applyImpulse(gravityDir, true);

  controls.update();
  world.step();
  // Sync player mesh with physics rigidbody
  player.position.copy(player.rigidBody.translation());
  playerSphere.position.copy(player.rigidBody.translation());
  playerSphere.quaternion.copy(player.rigidBody.rotation());
  //console.log(player.position);
  
  if (controls.followPlayer) {
    controls.followPlayer();
  }
  renderer.render(scene, camera);
}

// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  await initPhysics();
  await initMeshes();
  await initCamera();
  await initGameControls();
  await initLights();
  await animate();
})();
