import * as THREE from 'three';                    // or 'three/webgpu' if you prefer
import { WebGPURenderer } from 'three/webgpu';
import { Fn, vec3, mix, cameraPosition, screenUV, float, array } from 'three/tsl';


// import {
//   Fn, vec3, mix, cameraPosition,
//   float, If, Else, Break, Continue,
//   array, uniformArray   // for cleaner uniform handling if needed
// } from 'three/tsl';


const gradientStops = [
  { y: -20, color: new THREE.Color(0x1e3a8a) }, // deep blue at low Y
  { y: -5,  color: new THREE.Color(0x3b82f6) }, // blue
  { y:  0,  color: new THREE.Color(0x60a5fa) }, // light blue
  { y: 10,  color: new THREE.Color(0xfacc15) }, // yellow
  { y: 25,  color: new THREE.Color(0xf97316) }  // orange at high Y
];

export const sky = (scene) => {

  // Convert stops to TSL-friendly arrays (do this once)
  const stopYs = gradientStops.map(stop => float(stop.y));
  const stopColors = gradientStops.map(stop => vec3(
    stop.color.r, stop.color.g, stop.color.b
  ));

  const ysNode = array(stopYs);           // or uniformArray if you want to update later
  const colorsNode = array(stopColors);

  scene.backgroundNode = Fn(() => {
    const camY = cameraPosition.y;
    let color = colorsNode.element(0).toVar();

    for (let i = 1; i < gradientStops.length; i++) {
      const y0 = ysNode.element(i - 1);
      const y1 = ysNode.element(i);
      const c0 = colorsNode.element(i - 1);
      const c1 = colorsNode.element(i);

      const segmentT = camY.sub(y0).div(y1.sub(y0)).clamp(0, 1);

      // Only blend if we're past the previous stop
      color = mix(color, c1, segmentT);
    }

    return color;
  })();

}