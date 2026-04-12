import * as THREE from 'three';                    // or 'three/webgpu' if you prefer

const gradientStops = [
  { y: 1,  color: new THREE.Color(0xf97316) },  // orange at top
  { y: 0.75,  color: new THREE.Color(0xf97316) },  // orange at top
  { y: 0.55,  color: new THREE.Color(0xfacc15) }, // yellow
  { y:  0.4,  color: new THREE.Color(0x60a5fa) }, // light blue
  { y: 0.3,  color: new THREE.Color(0x3b82f6) }, // blue
  { y: 0.2, color: new THREE.Color(0x1e3a8a) }, // deep blue at bottom
  { y: 0, color: new THREE.Color(0x1e3a8a) }, // deep blue at bottom
].reverse();

export const sky = (scene) => {
  const height = 400;
  const geometry = new THREE.BoxGeometry(200, height, 100);


  const m = new THREE.ShaderMaterial({
    uniforms: {
      colors: { value: gradientStops.map(stop => stop.color) },
      ys: { value: gradientStops.map(stop => stop.y) },
      numStops: { value: gradientStops.length },
      height: { value: height }
    },
    vertexShader: `
      varying float h; 

      void main() {
        h = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colors[${gradientStops.length}]; 
      uniform float ys[${gradientStops.length}];
      uniform int numStops;
      uniform float height;

      varying float h;

      void main() {
        float normalizedY = (h + height * 0.5) / height;
        normalizedY = clamp(normalizedY, 0.0, 1.0);
        
        vec3 color = colors[0];  // default to first color
        
        for(int i = 0; i < ${gradientStops.length-1}; i++) {  // loop through segments
          if(normalizedY >= ys[i] && normalizedY <= ys[i+1]) {
            float t = (normalizedY - ys[i]) / (ys[i+1] - ys[i]);
            color = mix(colors[i], colors[i+1], t);
            break;
          }
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
      side: THREE.BackSide
  });


  const material = m;

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
}