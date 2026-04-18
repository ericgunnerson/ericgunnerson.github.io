import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

const playerStart =  { x: 0, y: 0, z: 0 };

function rotateXYZ(config) {
    if (config.mesh) {
      config.mesh.rotateX(config.xRot);
      config.mesh.rotateY(config.yRot);
      config.mesh.rotateZ(config.zRot);
      // config.mesh.rotation.x += config.xRot;
      // config.mesh.rotation.y += config.yRot;
      // config.mesh.rotation.z += config.zRot;
    }
}

function rotateX90(mesh) {
  if (mesh) {
    mesh.rotateX(Math.PI/2);
  }
}

function animate(gameObject, player) {
  if (checkDistance(gameObject, player)) {
      gameObject.activateMesh(gameObject);
  } else {
      gameObject.deactivateMesh(gameObject);
  }
}

function checkDistance(gameObject, player) {
  if (player) {
    const dx = gameObject.position.x - player.position.x;
    const dy = gameObject.position.y - player.position.y;
    const dz = gameObject.position.z - player.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance <= 30;
  } else {
    return false;
  }
}

export const geometries = [
  { type: 'TorusGeometry', args: [1, .5, 10, 15] },
  { type: 'IcosahedronGeometry', args: [1.0, 1.0] },
  { type: 'OctahedronGeometry', args: [1] }
];

const cellSize = 3.8;
const b = 0, q = cellSize*.25, p = cellSize*.75, t = cellSize;


const shapeMap = {
  '┌': { type: 'ExtrudeGeometry', args: [], 
    points: [ q,b, q,p, t,p, t,q, p,q, p,b, q,b ],
    colliders: [
      [ q,b, p,b, p,q, q,q, q,b ],
      [ q,q, t,q, t,p, q,p, q,q ]
    ]
  },
  '-': { type: 'ExtrudeGeometry', args: [], 
    points: [ b,q, b,p, t,p, t,q, b,q ] 
  },
  '┐': { type: 'ExtrudeGeometry', args: [], points: [ b,q, b,p, p,p, p,b, q,b, q,q, b,q ] },
  '|': { type: 'ExtrudeGeometry', args: [], points: [ q,b, q,t, p,t, p,b, q,b ] },
  '┘': { type: 'ExtrudeGeometry', args: [], 
    points: [ b,q, b,p, q,p, q,t, p,t, p,q, b,q ],
    colliders: [
      [ b,q, b,p, p,p, p,q, b,q ],
      [ q,p, q,t, p,t, p,p, q,p ]
    ]
  },
  '└': { type: 'ExtrudeGeometry', args: [], 
    points: [ q,q, q,t, p,t, p,p, t,p, t,q, q,q ],
    colliders: [
      [ q,q, q,t, t,p, q,p, q,q ],
      [ q,p, p,p, p,t, q,t, q,p ]
    ]
  },
  '┼': { type: 'ExtrudeGeometry', args: [], 
    points: [ q,b, q,q, b,q, b,p, q,p, q,t, p,t, p,p, t,p, t,q, p,q, p,b, q,b ],
    colliders: [
      [ q,b, q,t, p,t, p,b, q,b ],
      [ b,q, b,p, q,p, q,q, b,q ],
      [ p,q, p,p, t,p, t,q, p,q ]
    ]
  },
  '├': { type: 'ExtrudeGeometry', args: [], 
    points: [ q,b, q,t, p,t, p,p, t,p, t,q, p,q, p,b, q,b ],
    colliders: [
      [ q,b, q,t, p,t, p,b, q,b ],
      [ p,q, p,p, t,p, t,q, p,q ]
    ]
  },
  '┤': { type: 'ExtrudeGeometry', args: [], 
    points: [ q,b, q,q, b,q, b,p, q,p, q,t, p,t, p,b, q,b ],
    colliders: [
      [ q,b, q,t, p,t, p,b, q,b ],
      [ b,q, b,p, q,p, q,q, b,q ]
    ]
  },
  '┬': { type: 'ExtrudeGeometry', args: [], points: [ q,b, q,q, b,q, b,p, t,p, t,q, p,q, p,b, q,b ] },
  '┴': { type: 'ExtrudeGeometry', args: [], 
    points: [ b,q, b,p, q,p, q,t, p,t, p,p, t,p, t,q, b,q ],
    colliders: [
      [ b,q, b,p, t,p, t,q, b,q ],
      [ q,q, q,t, p,t, p,q, q,q ]
    ]
  },
  '*': null,
  ' ': null
}

export const colors = [
  // greens
  0x0E2F1E, // 
  0x13663C, // 
  0x00C963, // 

  // blues
  0x0F202B, // 
  0x0876BE, // 
  0x16415D, // 
];

function randomMeshes(xSize, ySize) {
  const configs = [];
  const spacing = 4;
  const totalSizeX = (xSize - 1) * spacing;
  const startOffsetX = -totalSizeX / 2;
  const totalSizeY = (ySize - 1) * spacing;
  const startOffsetY = -totalSizeY / 2;
  const animateFunctions = [rotateXYZ, none];
  const initFunctions = [rotateX90, none];

  for (let y = 0; y < ySize; y++) {
    for (let x = 0; x < xSize; x++) {
      const xPos = startOffsetX + x * spacing;
      const yPos = startOffsetY + y * spacing;

      const randomGeometry = geometries[Math.floor(Math.random() * geometries.length)];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomFlatShading = Math.random() > 0.5;
      const randomXRot = Math.random() > 0.1;
      const randomYRot = Math.random() > 0.1;
      const randomZRot = Math.random() > 0.1;
      const randomAnimate = animateFunctions[Math.floor(Math.random() * animateFunctions.length)];
      const randomInit = initFunctions[Math.floor(Math.random() * initFunctions.length)];

      configs.push({
        geometry: randomGeometry,
        color: randomColor,
        material: {
          type: 'MeshStandardMaterial',
          options: {
            color: randomColor,
            flatShading: false,
            transparent: true,
            opacity: 1.0,
            roughness: Math.random(), //0.3,
            metalness: .5//Math.random() //0.0
          }
        },
        position: { x: xPos, y: yPos, z: 0 },
        wireframe: false,
        init: randomInit,
        animate: randomAnimate,
        xRot: randomXRot ? (Math.random() - .5) / 15 : 0,
        yRot: randomYRot ? (Math.random() - .5) / 15 : 0,
        zRot: randomZRot ? (Math.random() - .5) / 15 : 0
      });
    }
  }

  return configs;
}

async function initMesh(config, collections, world) {
  let geo = null;
  config.collections = collections;
  config.world = world;
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
    const index = config.collections.meshes.indexOf(mesh);
    if (index > -1) {
      config.collections.meshes.splice(index, 1);
    }
    // Remove rigid body from physics world
    if (config.rigidBodies) {
      for (let bod of config.rigidBodies) {
        config.world.removeRigidBody(bod);
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
   initMesh(config, config.collections, config.world);
  }
}

function deactivateMesh(config) {
  //config.mesh.material.color.set(config.material.options.color);
  if (config.mesh) {
   destroyMesh(config);
  }
}

function instantiateShapeMapGeometries() {
  for (let shapeKey in shapeMap) {
    const currentShape = shapeMap[shapeKey];
    if (shapeKey == ' ' || shapeKey == '*') {
      continue;
    }

    const points = currentShape.points;
    const shape = new THREE.Shape();
    for (let i = 0; i < points.length-1; i+=2) {
      if (i == 0) {
        shape.moveTo(points[i],points[i+1]);
      } else {
        shape.lineTo(points[i], points[i+1]);
      }
    }

    currentShape.geometry = new THREE.ExtrudeGeometry( shape );

    if (currentShape.colliders) {
      currentShape.colliderGeometries = [];
      for (let curCol of currentShape.colliders) {
        const colPoints = curCol;
        const colShape = new THREE.Shape();
        for (let i = 0; i < colPoints.length-1; i+=2) {
          if (i == 0) {
            colShape.moveTo(colPoints[i],colPoints[i+1]);
          } else {
            colShape.lineTo(colPoints[i], colPoints[i+1]);
          }
        }
        currentShape.colliderGeometries.push( new THREE.ExtrudeGeometry( colShape ) );
      }
    } else {
      currentShape.colliderGeometries = [currentShape.geometry];
    }
  }
}

function getMeshesFromMap(mapIndex) {
  instantiateShapeMapGeometries();
  const configs = [];
  const spacing = 4;
  const mapString = maps[mapIndex];
  const mapLines = mapString.split('\n').filter((p) => p.length > 0).reverse();
  const xSize = mapLines[0].length;
  const ySize = mapLines.length;
  const totalSizeX = (xSize - 1) * spacing;
  const startOffsetX = -totalSizeX / 2;
  const totalSizeY = (ySize - 1) * spacing;
  const startOffsetY = -totalSizeY / 2;

  for (let y = 0; y < ySize; y++) {
    for (let x = 0; x < xSize; x++) {
      const xPos = startOffsetX + x * spacing;
      const yPos = startOffsetY + y * spacing;

      const mapInd = mapLines[y][x];
      const mappedGeo = shapeMap[mapInd];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomXRot = Math.random() > 0.1;
      const randomYRot = Math.random() > 0.1;
      const randomZRot = Math.random() > 0.1;
      const randomInit = () => {};

      if (mapInd == '*') {
        playerStart.x = xPos;
        playerStart.y = yPos;
      } else if (mappedGeo) {
        configs.push({
          geometry: mappedGeo,
          color: randomColor,
          mapIndex: mapInd,
          material: {
            type: 'MeshStandardMaterial',
            options: {
              color: randomColor,
              flatShading: false,
              transparent: true,
              opacity: 1.0,
              roughness: .2, //0.3,
              metalness: .2//Math.random() //0.0
            }
          },
          position: { x: xPos, y: yPos, z: 0 },
          playerStart: mapInd == '*',
          wireframe: false,
          init: randomInit,
          initMesh: initMesh,
          activateMesh: activateMesh,
          deactivateMesh: deactivateMesh,
          animate: animate,
          xRot: randomXRot ? (Math.random() - .5) / 15 : 0,
          yRot: randomYRot ? (Math.random() - .5) / 15 : 0,
          zRot: randomZRot ? (Math.random() - .5) / 15 : 0
        });
      }
    }
  }

  return configs;
}

const referenceTile =
`
┌-┐
|*|
└-┘
`

const tiles = [
`
┌---┘ └--┐
|   *    |
┘        └
          
┐        ┌
|-      -|
|        |
|-      -|
|        |
└---┐ ┌--┘
`,
`
┌---┘ └--┐
| - *    |
┘     -- └
          
┐  ┌┐    ┌
|  └┘   -|
|        |
|     ---|
|        |
└---┐ ┌--┘
`,
`
┌---┘ └--┐
|   *    |
┘  -- -- └
          
┐        ┌
|  ----- |
|        |
| | -    |
|      | |
└---┐ ┌--┘
`,
`
┌---┘ └--┐
|   * -- |
┘        └
   ---    
┐        ┌
|    -  -|
|      | |
|  |     |
|  |   | |
└---┐ ┌--┘
`,
`
┌---┘ └--┐
|   *-   |
┘  -     └
     ┌-┐  
┐        ┌
|   -    |
|        |
| -      |
|        |
└---┐ ┌--┘
`,
];

function generateRandomizedMap(xTiles, yTiles) {
  // return a string that is comprised of a random assortment of tiles.
  const tileHeight =  tiles[0].slice(1).slice(0,-1).split('\n').length;
  console.log(`tileHeight is ${tileHeight}`);
  const retRows = new Array(tileHeight * yTiles);

  for (let y = 0; y < yTiles; y++) {
    for (let x = 0; x < xTiles; x++) {
      const myTileInd = Math.floor(Math.random() * tiles.length);
      const myTile = tiles[myTileInd].slice(1).slice(0,-1);
      console.log(`choosing tile ${myTileInd}`, myTile);
      const tileRows = myTile.split('\n');
      console.log(`the tile I'm on has ${tileRows.length} rows...`);
      for (let i = 0; i < tileRows.length; i++) {
        const retRowInd = y * tileHeight + i;
        let thisTileRow = tileRows[i];
        // top row: x = 0, y = 0, and i = 0;
        if ( y == 0 && i == 0) {
          thisTileRow = '-'.repeat(thisTileRow.length);
          if (x == 0) {
            thisTileRow = '┌' + thisTileRow.slice(1);
          }
          if (x == xTiles - 1) {
            thisTileRow = thisTileRow.slice(0,-1) + '┐';
          }
        } else if (y == yTiles -1 && i == tileHeight - 1) {
          thisTileRow = '-'.repeat(thisTileRow.length);
          if (x == 0) {
            thisTileRow = '└' + thisTileRow.slice(1);
          }
          if (x == xTiles - 1) {
            thisTileRow = thisTileRow.slice(0,-1) + '┘';
          }
        } else {
          if (x == 0) {
            thisTileRow = '|' + thisTileRow.slice(1);
          }
          if (x == xTiles - 1) {
            thisTileRow = thisTileRow.slice(0,-1) + '|';
          }
        }
        retRows[retRowInd] = (x == 0 ? '' : retRows[retRowInd]) + thisTileRow;
      }
    }
  }

  console.log(`here is my thing:`);
  console.log(retRows.join('\n'));

  return retRows.join('\n');
  
}

const maps = [
generateRandomizedMap(5, 5),
`
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
|                                                                                                                                           |
├ ------------------------------------------------------------------------------------------------------------------------------------------┤
|                                                                                                                                           |
├----------------------------------------------------------------------------------------------------------------------------------------- -┤
|                                                                                                                                           |
├ ------------------------------------------------------------------------------------------------------------------------------------------┤
|                                                                                                                                           |
├----------------------------------------------------------------------------------------------------------------------------------------- -┤
|                                                                                                                                           |
├ ------------------------------------------------------------------------------------------------------------------------------------------┤
|                                                                                                                                           |
├----------------------------------------------------------------------------------------------------------------------------------------- -┤
|                                                                                                                                           |
├ ------------------------------------------------------------------------------------------------------------------------------------------┤
|                                                                                                                                           |
├-----------------------------------------┬------------------------------------------------------------------------┬---------------------- -┤
|                                        ┌┘                                                                        |                        |
├ ---------------------------------------┤  ┌-----------------------------------------------┐ ┌--------------------┤ -----------------------┤
|                                        |  |                                                                      |                        |
├----------------------------------------┘ -┴------┬----------------------------------------┐ ┌--------------------┴----------------------- ┤
| *                                                |                                                                                        |
└--------------------------------------------------┴----------------------------------------------------------------------------------------┘
`,
`
|                                                                                                                       |
|                                                                                                                       |
|                                                                                                                       |
|      *                                                                                                                |
├-----┬----- ----------------------------┬-┬------------------ ----------------------  ----------------------------  ---┤
|                                          └┐                                                                           |
|     └-----┐            ┌-┐             |  └┐                     --                          --------  ------ ---     |
|   -       |            | └- -┬----┐    |   └┐                                                                       - |
|           |          ┌-┘     |    |    └┐   └┐                                                      ----              |
|      --   |        ┌-┘       |    └-- --┘    └-┐                                 ---------------                  --  |
|           └--------┤         |                 |                                                                      |
|     -              └---┐     |                -┼-┴-┬-┴-┬-┴┐                   --                                    - |
|                        └--┐  |                 |          |                                                           |
|   --                      └--┘                 ┴             ┌-┼-┐       ┌---┐                          -  |       -  |
|                                                              | | ├--┐  ┌-┘┌┐┌┘                                        |
├-                                                             ├-┼-┤  └--┘┌-┘||                        ┌ - - |        - |
|                                           -      ---   -     | | |      └┐└┘|                        ┘                |
|   -                               -                          └-┴-┘       └--┘                       ┘             -   |
|                          -                                                                         ┘                  |
| -                           -                                                                     ┘                  -┤
|                                                                                                                       |
└-----------------------------------------------------------------------------------------------------------------------┘
`
];

export const meshConfigData = {
  meshes: getMeshesFromMap(0),
  playerStart: playerStart
}