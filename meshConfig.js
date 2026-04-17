import * as THREE from "three";

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

function none() { }

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
  0xDD0000, // red
  0x00FF00, // green
  0x0000FF, // blue
  0xFFFF00, // yellow
  0xFF00FF, // magenta
  0x00FFFF, // cyan
  0xFF6600, // orange
  0xFF0066, // pink
  0x66FF00, // lime
  0x0066FF  // sky blue
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
  const animateFunctions = [none];
  const initFunctions = [none];

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
      const randomAnimate = animateFunctions[Math.floor(Math.random() * animateFunctions.length)];
      const randomInit = initFunctions[Math.floor(Math.random() * initFunctions.length)];

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
          animate: randomAnimate,
          xRot: randomXRot ? (Math.random() - .5) / 15 : 0,
          yRot: randomYRot ? (Math.random() - .5) / 15 : 0,
          zRot: randomZRot ? (Math.random() - .5) / 15 : 0
        });
      }
    }
  }

  return configs;
}

const maps = [
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