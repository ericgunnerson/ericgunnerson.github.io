import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { GameControls } from './controls.js';
import * as RAPIER from "@dimforge/rapier3d";
import { Noise } from './perlin.js';


const playerSize = 1;
const earthSize = 1000;
const earthDetail = 80;
const noiseFrequency = 0.015;
const noiseStrength = 40;
const camStartZ = 600;
const meshConfigs = [];
const playerStart = new THREE.Vector3(0, earthSize + playerSize, 0);
const w = window.innerWidth;
const h = window.innerHeight;
const collections = {
  meshes: [],
  lights: [],
};
let renderer, camera, scene, controls, player, playerSphere, box, world, physWorld;

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

  camera.position.set(playerStart.x, playerStart.y, playerStart.z - camStartZ);
  camera.lookAt(player.position);

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
  controls = GameControls(camera, renderer, player, world);
}

async function initLights() {

  const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
  collections.lights.push(ambientLight);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );
}

async function initMeshes() {

  const sphereGeo = new THREE.IcosahedronGeometry( playerSize, 1 );
  const sphereWireGeo = new THREE.WireframeGeometry(sphereGeo);
  const sphereWireMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.LineSegments(sphereWireGeo, sphereWireMat);
  player = new THREE.Object3D();
  player.add(sphere);
  player.position.set(playerStart.x, playerStart.y, playerStart.z);

  scene.add( player );


  const worldGeo = new THREE.IcosahedronGeometry( earthSize, earthDetail );

  const position = worldGeo.attributes.position;
  const vertex = new THREE.Vector3();
  Noise.seed(100);

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const noiseValue = Noise.perlin3(
      vertex.x * noiseFrequency,
      vertex.y * noiseFrequency,
      vertex.z * noiseFrequency
    );
    const radius = earthSize + noiseValue * noiseStrength;
    vertex.normalize().multiplyScalar(radius);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  //position.needsUpdate = true;
  worldGeo.computeVertexNormals();

  const earthMat = new THREE.MeshStandardNodeMaterial({ color: 0x009900, metalness: .4, roughness: .1, flatShading: false });
  world = new THREE.Mesh( worldGeo, earthMat );
  scene.add(world);
  const worldWireGeo = new THREE.WireframeGeometry(worldGeo);
  const worldWireMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const worldWire = new THREE.LineSegments(worldWireGeo, worldWireMat);
  //world.add(worldWire);
}

async function animate() {
  requestAnimationFrame(animate);

  world.rotation.x -= .001;

  renderer.render(scene, camera);
}


// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  await initMeshes();
  await initCamera();
  await initGameControls();
  await initLights();
  await animate();
})();
