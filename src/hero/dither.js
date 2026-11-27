import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const DitherShader = {
  name: 'DitherShader',

  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelSize: { value: 2.0 },
    uLevels: { value: 12.0 },
    uStrength: { value: 1.0 },
    uVignette: { value: 0.17 },
    uTime: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uPixelSize;
    uniform float uLevels;
    uniform float uStrength;
    uniform float uVignette;
    uniform float uTime;
    varying vec2 vUv;

    // Compact recursive Bayer construction (2×2 → 4×4 → 8×8) without arrays.
    float bayer2(vec2 a) {
      a = floor(a);
      return fract(a.x / 2.0 + a.y * a.y * 0.75);
    }
    #define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
    #define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))

    float paperGrain(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Snap to a device-pixel block so the dither grid is stable and crisp.
      vec2 block = floor(gl_FragCoord.xy / uPixelSize);
      vec2 blockUv = (block * uPixelSize + uPixelSize * 0.5) / uResolution;

      vec3 color = texture2D(tDiffuse, blockUv).rgb;

      // Perceptual vignette before quantisation (so it dithers too).
      vec2 centred = vUv - 0.5;
      color *= 1.0 - uVignette * dot(centred, centred) * 1.55;

      float threshold = bayer8(block) - 0.5;
      vec3 quantized = floor(color * uLevels + threshold * uStrength + 0.5) / uLevels;

      // Fixed per-block grain, not per-frame: paper tooth without flicker.
      quantized += (paperGrain(block) - 0.5) * 0.009;

      gl_FragColor = vec4(clamp(quantized, 0.0, 1.0), 1.0);
    }
  `,
};

export function createDitherPass() {
  return new ShaderPass(DitherShader);
}

/**
 * Keeps the dot size visually consistent across 1080p, 4K retina and phones:
 * uResolution is in device pixels and uPixelSize is scaled by DPR, so a block is
 * always ~2.2 CSS pixels. Without the DPR scale, retina screens would show a
 * nearly invisible dither grid.
 */
export function updateDitherUniforms(pass, width, height, dpr) {
  pass.uniforms.uResolution.value.set(width * dpr, height * dpr);
  pass.uniforms.uPixelSize.value = 2.0 * dpr;
}

export function setDitherPixelSize(pass, cssPixels, dpr) {
  pass.uniforms.uPixelSize.value = cssPixels * dpr;
}
