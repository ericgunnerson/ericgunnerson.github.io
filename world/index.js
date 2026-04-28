import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { GameControls } from './controls.js';
import * as RAPIER from "@dimforge/rapier3d";
import { bloom } from 'jsm/bloom';


const playerSize = 1;
const earthSize = 1000;
const earthDetail = 20;
const meshConfigs = [];
const playerStart = new THREE.Vector3(0, earthSize + playerSize, 0);
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

  //renderer.toneMapping = THREE.ReinhardToneMapping;

  document.body.appendChild(renderer.domElement);

}

async function initCamera() {
  const fov = 75;
  const aspect = w / h;
  const near = 0.1;
  const far = 10000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  camera.position.set(0, -10, 2);
  camera.lookAt(player.position);
  player.camRig.add(camera);

  // // tryna bloom...
  // const renderPipeline = new THREE.RenderPipeline( renderer );

  // const scenePass = TSL.pass( scene, camera );
  // const scenePassColor = scenePass.getTextureNode( 'output' );

  // const bloomPass = bloom( scenePassColor );

  // renderPipeline.outputNode = scenePassColor.add( bloomPass );


  // bloomPass.threshold.value = 0.0;
  // bloomPass.strength.value = 3.0;
  // bloomPass.radius.value = 1.0;
  // renderer.toneMappingExposure = Math.pow( 1.1, 4.0 );
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

  const geometry = new THREE.IcosahedronGeometry( playerSize, 2 );
  const geoColors = new Float32Array( geometry.attributes.position.count * 3 );
  let isEven = true;
  for ( let i = 0; i < geoColors.length; i += 9 ) {
    const color = new THREE.Color( 0, isEven ? 1 : 0, 0 );
    isEven = !isEven;
    geoColors[ i + 0 ] = color.r;
    geoColors[ i + 1 ] = color.g;
    geoColors[ i + 2 ] = color.b;
    geoColors[ i + 3 ] = color.r;
    geoColors[ i + 4 ] = color.g;
    geoColors[ i + 5 ] = color.b;
    geoColors[ i + 6 ] = color.r;
    geoColors[ i + 7 ] = color.g;
    geoColors[ i + 8 ] = color.b;
  }
  geometry.setAttribute( 'color', new THREE.BufferAttribute( geoColors, 3 ) );
  
  const playerMaterial = new THREE.MeshStandardNodeMaterial();
  playerMaterial.vertexColors = true;
  playerMaterial.colorNode = TSL.attribute( 'color' );
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

  
  const playerPos = playerSphere.geometry.attributes.position.array;

  const pColliderDesc = RAPIER.ColliderDesc.convexHull(playerPos);
  const colliderDesc = RAPIER.ColliderDesc.ball(playerSize);

  player.collider = world.createCollider(colliderDesc, player.rigidBody);

  player.rigidBody.setTranslation({ x: playerStart.x, y: playerStart.y, z: 0.0 }, true);

  let earthGeo = new THREE.IcosahedronGeometry( earthSize, earthDetail );

  const earthColors = new Float32Array( earthGeo.attributes.position.count * 3 );
  for ( let i = 0; i < earthColors.length; i += 9 ) {
    const color = new THREE.Color( Math.random(), Math.random(), Math.random() );
    earthColors[ i + 0 ] = color.r;
    earthColors[ i + 1 ] = color.g;
    earthColors[ i + 2 ] = color.b;
    earthColors[ i + 3 ] = color.r;
    earthColors[ i + 4 ] = color.g;
    earthColors[ i + 5 ] = color.b;
    earthColors[ i + 6 ] = color.r;
    earthColors[ i + 7 ] = color.g;
    earthColors[ i + 8 ] = color.b;
  }
  earthGeo.setAttribute( 'color', new THREE.BufferAttribute( earthColors, 3 ) );

  const earthMat = new THREE.MeshStandardNodeMaterial();
  earthMat.vertexColors = true;
  earthMat.colorNode = TSL.attribute( 'color' );
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
  // Access the geometry's position attribute
  const earthPos = earth.geometry.attributes.position.array;
  const earthColliderDesc = RAPIER.ColliderDesc.convexHull(earthPos);
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
