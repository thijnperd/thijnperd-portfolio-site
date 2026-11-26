import * as THREE from 'three';

/**
 * Core WebGL renderer, perspective camera, and scene fog setup.
 */

/**
 * Antialiasing is deliberately off: the custom dither pass needs hard pixel
 * clusters, and MSAA on the inner render targets would soften exactly the edges
 * the print aesthetic depends on (and cost bandwidth).
 */
export function initRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });

  // A dithered image does not need 2× retina sampling; capping at 1.5 keeps the
  // pixel blocks crisp while saving a large amount of fill rate.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  return renderer;
}

/**
 * 38° is narrow enough that the procedural geometry reads like a composed
 * editorial diorama rather than a wide-angle tech demo.
 */
export function initCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 200);
  camera.position.set(1.95, 1.95, 5.6);
  return camera;
}

/**
 * Exponential fog dissolves the far edge of the 260-unit water plane into the
 * background, so the world feels infinite with no visible geometry edge.
 */
export function initSceneEnvironment(scene) {
  scene.background = new THREE.Color('#e9f1e8');
  scene.fog = new THREE.FogExp2('#e7efe7', 0.027);
  return scene.fog;
}
