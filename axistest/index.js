import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { GameControls } from './controls.js';
import * as RAPIER from "@dimforge/rapier3d";
import { Noise } from './perlin.js';


const playerSize = 1;
const earthSize = 1000;
const earthDetail = 40;
const noiseFrequency = 0.015;
const noiseStrength = 10;
const camStartZ = 0;
const camMove = 0.001;
const meshConfigs = [];
const playerStart = new THREE.Vector3(0, earthSize + 20, 0);
const w = window.innerWidth;
const h = window.innerHeight;
const triangleDrawDistance = 100;
const collections = {
  triangles: [],
  lights: [],
};
let renderer, camera, camRig, scene, controls, player, playerSphere, box, world, physWorld;

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
  camera.rotation.x = -Math.PI / 25; // 10 degrees down

  camRig = new THREE.Object3D();
  camRig.add(camera);

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

  const ambientLight = new THREE.AmbientLight(0x606060); // soft white light
  collections.lights.push(ambientLight);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );

  const directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight2.position.set(-5, -10, -7);
  scene.add( directionalLight2 );
}

function drawTriangle (triangle) {
  // Only create if not already created
  if (triangle.mesh) {
    return;
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(triangle.vertices, 3);
  geometry.setAttribute('position', positionAttribute);

  // 3. Create a material and Mesh
  const material = new THREE.MeshStandardNodeMaterial({ color: 0x00cc00, metalness: .4, roughness: .1, flatShading: false });
  triangle.mesh = new THREE.Mesh(geometry, material);
  triangle.geometry = geometry;
  triangle.positionAttribute = positionAttribute;

  scene.add(triangle.mesh);
}

function destroyTriangle(triangle) {
  if (triangle.mesh) {
    scene.remove(triangle.mesh);
    
    // Dispose BufferAttribute
    if (triangle.positionAttribute) {
      triangle.positionAttribute.dispose();
      triangle.positionAttribute = null;
    }
    
    // Dispose geometry
    if (triangle.geometry) {
      triangle.geometry.dispose();
      triangle.geometry = null;
    }
    
    // Dispose material and its textures
    if (triangle.mesh.material) {
      if (triangle.mesh.material.map) {
        triangle.mesh.material.map.dispose();
      }
      triangle.mesh.material.dispose();
    }
    
    triangle.mesh = null;
  }
}

function triangleIsClose(triangle) {
  const vertices = triangle.vertices;
  const vec = new THREE.Vector3(vertices[0], vertices[1], vertices[2]);
  const worldPos = camera.getWorldPosition(new THREE.Vector3());
  if (worldPos.distanceTo(vec) < triangleDrawDistance) {
    return true;
  }
  return false;
}

function getTriangles(geometry) {
  const triangles = [];
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i += 3) {
    const vertices = new Float32Array(9);
    vertices[0] = position.array[i * 3];
    vertices[1] = position.array[i * 3 + 1];
    vertices[2] = position.array[i * 3 + 2];
    vertices[3] = position.array[(i + 1) * 3];
    vertices[4] = position.array[(i + 1) * 3 + 1];
    vertices[5] = position.array[(i + 1) * 3 + 2];
    vertices[6] = position.array[(i + 2) * 3];
    vertices[7] = position.array[(i + 2) * 3 + 1];
    vertices[8] = position.array[(i + 2) * 3 + 2];
    triangles.push({ vertices, mesh: null });
  }

  return triangles;
}

async function initMeshes() {

  const sphereGeo = new THREE.IcosahedronGeometry( playerSize, 1 );
  const sphereWireGeo = new THREE.WireframeGeometry(sphereGeo);
  const sphereWireMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.LineSegments(sphereWireGeo, sphereWireMat);
  player = new THREE.Object3D();
  player.add(sphere);
  player.position.set(playerStart.x, playerStart.y, playerStart.z);

  //scene.add( player );


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

  collections.triangles = getTriangles(worldGeo);

  // position.needsUpdate = true;
  // worldGeo.computeVertexNormals();

  // const earthMat = new THREE.MeshStandardNodeMaterial({ color: 0x00cc00, metalness: .4, roughness: .1, flatShading: false });
  // world = new THREE.Mesh( worldGeo, earthMat );
  // scene.add(world);
  // const worldWireGeo = new THREE.WireframeGeometry(worldGeo);
  // const worldWireMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  // const worldWire = new THREE.LineSegments(worldWireGeo, worldWireMat);
  //world.add(worldWire);
}

function moveCamera() {
  camRig.rotation.x -= .001;
}

async function animate() {
  requestAnimationFrame(animate);

  moveCamera();

  for (let triangle of collections.triangles) {
    if (triangleIsClose(triangle)) {
      drawTriangle(triangle);
    } else {
      destroyTriangle(triangle);
    }
  }

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
