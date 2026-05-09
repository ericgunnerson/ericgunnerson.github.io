import * as THREE from "three/webgpu";

import { TTFLoader } from 'jsm/ttf';
import { Font } from 'jsm/font';
import { TextGeometry } from 'jsm/text';


function loadText(text, fontName, scene, material, startPos, callback) {

    const loader = new TTFLoader();

    const fonts = [
        { name: 'kenpixel', url: 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/fonts/ttf/kenpixel.ttf' },
        { name: 'liberation', url: 'https://cdn.jsdelivr.net/npm/open-fonts@1.1.1/fonts/src/liberation-serif/LiberationSerif-Regular.ttf' }
    ];

    loader.load(fonts.find((n) => n.name == fontName).url, function (json) {

        const font = new Font(json);
        const mesh = createText(text, font, scene, material, startPos);

        if (callback) {
            callback(mesh);
        }

    });
}

function createText(text, font, scene, material, startPos) {

    const textGeo = new TextGeometry(text, {

        font: font,

        size: 1,
        depth: .5,
        curveSegments: 2,

        bevelThickness: .1,
        bevelSize: .1,
        bevelEnabled: true

    });

    textGeo.computeBoundingBox();
    textGeo.computeVertexNormals();

    const centerOffset = - 0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

    const textMesh1 = new THREE.Mesh(textGeo, material);

    textMesh1.position.x = startPos.x;
    textMesh1.position.y = startPos.y;
    textMesh1.position.z = startPos.z;

    textMesh1.rotation.x = 0;
    textMesh1.rotation.y = Math.PI * 2;

    scene.add(textMesh1);
    return textMesh1;
}

export const Text3d = loadText;
