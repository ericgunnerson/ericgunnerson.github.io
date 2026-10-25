import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

let renderer, camera, scene, player;

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

async function initMeshes() {

  const geometry = new THREE.SphereGeometry( 1, 32, 16 );
  const material = new THREE.MeshStandardMaterial( { color: 0xff0000, roughness: .2, metalness: .2 } );
  const sphere = new THREE.Mesh( geometry, material );
  sphere.visible = true;
  scene.add( sphere );
  player = sphere;
}

async function initLights() {

  const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(5, 10, 7);
  scene.add( directionalLight );
}

async function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Initialize everything
(async () => {
  await initRenderer();
  await initScene();
  await initMeshes();
  await initCamera();
  await initLights();
  await animate();
})();
