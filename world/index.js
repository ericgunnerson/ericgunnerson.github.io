import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { GameControls } from './controls.js';
import * as RAPIER from "@dimforge/rapier3d";
import { bloom } from 'jsm/bloom';

import { Text3d } from './text.js';


const playerSize = 1;
const earthSize = 50;
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

  camera.position.set(0, -8, 2);
  camera.lookAt(player.position);
  player.camRig.add(camera);
  player.camRig.camera = camera;

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

function getRandomVertexMaterial(earthGeo) {

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
  return earthMat;

}

function getFractalMaterial() {

  const planeMaterial = new THREE.MeshPhongNodeMaterial();
  planeMaterial.color.setHex( 0x999999 );
  planeMaterial.shininess = 0;
  planeMaterial.specular.setHex( 0x111111 );

  planeMaterial.colorNode = TSL.Fn( () => {

    const pos = TSL.positionLocal.toVar();
    pos.xz.addAssign( TSL.mx_fractal_noise_vec3( TSL.positionLocal.mul( 2 ) ).saturate().xz );
    return TSL.mx_fractal_noise_vec3( TSL.positionLocal.mul( 2 ) ).saturate().zzz.mul( 0.2 ).add( .5 );

  } )();

  return planeMaterial;
}

function getBallMaterial() {
  const material = new THREE.MeshPhongNodeMaterial( {
    color: 0x999999,
    shininess: 0,
    specular: 0x222222
  } );

  material.transparent = true;

  const discardNode = TSL.mx_fractal_noise_float( TSL.positionLocal.mul( 0.01 ) ).x;

  material.maskNode = discardNode;

  return material;
}

function getPositionColorMaterialSmooth() {

  const material = new THREE.MeshStandardNodeMaterial();
  material.roughnessNode = TSL.float( 0.2 );
  material.metalnessNode = TSL.float( 0.2 );

  const normalizedPos = TSL.positionLocal.normalize();
  const hue = normalizedPos.y.mul( TSL.float( 0.5 ) ).add( TSL.float( 0.5 ) );
  const hueAngle = hue.mul( TSL.TWO_PI );
  const baseColor = TSL.color( 1, 0.2, 0.2 );

  material.colorNode = TSL.hue( baseColor, hueAngle );

  return material;

}

function getPositionColorMaterial() {
  const material = new THREE.MeshStandardNodeMaterial();
  material.roughnessNode = TSL.float(0.2);
  material.metalnessNode = TSL.float(0.2);

  const normalizedPos = TSL.positionLocal.normalize();
  const y = normalizedPos.y;                    // -1 to 1

  // Map Y to 0-1 range
  const hue01 = y.mul(0.5).add(0.5);            // 0 at bottom, 1 at top

  // === Parameters you can tweak ===
  const numBands = TSL.float(8);                // number of color bands
  const lineWidth = TSL.float(0.015);           // thickness of white lines (in 0-1 space)

  // Create stepped hue (discrete colors)
  const stepped = hue01.mul(numBands).floor().div(numBands);
  
  // Create white lines at the boundaries
  const frac = hue01.mul(numBands).fract();     // 0 to 1 within each band
  const lineMask = TSL.abs(frac.sub(0.5)).mul(2).lessThan(lineWidth)
                     .mix(TSL.float(0), TSL.float(1));   // 1 = white line

  const baseColor = TSL.color(1, 0.2, 0.2);
  let colorNode = TSL.hue(baseColor, stepped.mul(TSL.TWO_PI));

  // Apply white lines
  colorNode = lineMask.mix(colorNode, TSL.color(1, 1, 1));

  material.colorNode = colorNode;

  return material;
}

function getSlimeMaterial() {

  const material = new THREE.MeshStandardNodeMaterial( { color: '#271442', roughness: 0.15 } );

  const emissiveColor = TSL.uniform( TSL.color( '#ff0a81' ) );
  const emissiveLow = TSL.uniform( - 0.227 );
  const emissiveHigh = TSL.uniform( 1 );
  const emissivePower = TSL.uniform( 10 );
  const largeWavesFrequency = TSL.uniform( TSL.vec2( 3, 1 ) );
  const largeWavesSpeed = TSL.uniform( 0 );
  const largeWavesMultiplier = TSL.uniform( 0 );
  const smallWavesIterations = TSL.uniform( 5 );
  const smallWavesFrequency = TSL.uniform( 4 );
  const smallWavesSpeed = TSL.uniform( 1 );
  const smallWavesMultiplier = TSL.uniform( 0.09 );
  const normalComputeShift = TSL.uniform( 0.01 );

  // TSL functions

  const wavesElevation = TSL.Fn( ( [ position ] ) => {

    // large waves

    const elevation = TSL.mul(
      TSL.sin( position.x.mul( largeWavesFrequency.x ).add( TSL.time.mul( largeWavesSpeed ) ) ),
      TSL.sin( position.z.mul( largeWavesFrequency.y ).add( TSL.time.mul( largeWavesSpeed ) ) ),
      largeWavesMultiplier
    ).toVar();

    TSL.Loop( { start: TSL.float( 1 ), end: smallWavesIterations.add( 1 ) }, ( { i } ) => {

      const noiseInput = TSL.vec3(
        position.xz
          .add( 2 ) // avoids a-hole pattern
          .mul( smallWavesFrequency )
          .mul( i ),
        TSL.time.mul( smallWavesSpeed )
      );

      const wave = TSL.mx_noise_float( noiseInput, 1, 0 )
        .mul( smallWavesMultiplier )
        .div( i )
        .abs();

      elevation.subAssign( wave );

    } );

    return elevation;

  } );

  // position

  const elevation = wavesElevation( TSL.positionLocal );
  const position = TSL.positionLocal.add( TSL.vec3( 0, elevation, 0 ) );

  material.positionNode = position;

  // normals

  let positionA = TSL.positionLocal.add( TSL.vec3( normalComputeShift, 0, 0 ) );
  let positionB = TSL.positionLocal.add( TSL.vec3( 0, 0, normalComputeShift.negate() ) );

  positionA = positionA.add( TSL.vec3( 0, wavesElevation( positionA ), 0 ) );
  positionB = positionB.add( TSL.vec3( 0, wavesElevation( positionB ), 0 ) );

  const toA = positionA.sub( position ).normalize();
  const toB = positionB.sub( position ).normalize();
  const normal = toA.cross( toB );

  material.normalNode = TSL.transformNormalToView( normal );

  // emissive

  const emissive = elevation.remap( emissiveHigh, emissiveLow ).pow( emissivePower );
  material.emissiveNode = emissiveColor.mul( emissive );

  return material;
}

function getPhongMaterial() {

  const material = new THREE.MeshPhongNodeMaterial( { color: 0x00ff00, flatShading: false } );
  return material;
}

function getEvenOddMaterial(geometry) {
  
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

  return playerMaterial;
}


async function initMeshes() {

  const geometry = new THREE.IcosahedronGeometry( playerSize, 2 );
  const geoColors = new Float32Array( geometry.attributes.position.count * 3 );
  const sphere = new THREE.Mesh( geometry, getFractalMaterial() );
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

  //const earthMat = getRandomVertexMaterial(earthGeo);
  const earthMat = getPositionColorMaterial();
  earth = new THREE.Mesh( earthGeo, earthMat );
  earth.visible = true;
    
  // 3. Setup Wireframe
  const wireframeGeo = new THREE.WireframeGeometry(earthGeo);
  const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
  wireframe.visible = false;

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
  Text3d('Yo it\'s me, your 3D text!!!', 'kenpixel', scene, getPhongMaterial(), playerStart);
  await animate();
})();
