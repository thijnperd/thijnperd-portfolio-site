import * as THREE from 'three';

/**
 * SECTION 1 / 4 — PROCEDURAL SKY
 *
 * The scene needs a horizon with depth, a visible sun (rising and setting with the
 * dial) and cheap emissive halos for the two light sources. All three are generated
 * here: a BackSide gradient dome, a canvas-drawn sun/moon billboard, and reusable
 * additive glow sprites. No textures are fetched.
 */

const DOME_VERTEX = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const DOME_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying vec3 vWorldPosition;

  void main() {
    vec3 direction = normalize(vWorldPosition - cameraPosition);
    // A soft, slightly warm haze sits just above the horizon.
    float h = smoothstep(-0.04, 0.62, direction.y);
    vec3 color = mix(uHorizon, uTop, h);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createSkyDome() {
  const geometry = new THREE.SphereGeometry(150, 32, 20);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color('#d8f0e1') },
      uHorizon: { value: new THREE.Color('#f3fbf6') },
    },
    vertexShader: DOME_VERTEX,
    fragmentShader: DOME_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;

  return { mesh, uniforms: material.uniforms, material, geometry };
}

export function updateSkyDome(dome, atm) {
  dome.uniforms.uTop.value.copy(atm.skyTop);
  dome.uniforms.uHorizon.value.copy(atm.skyHorizon);
}

/* ------------------------------------------------------------------ */
/* Sun / moon                                                          */
/* ------------------------------------------------------------------ */

function createSkyBodyTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const centre = size / 2;
  const gradient = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre);

  // Hard-ish disc (dithers into a beautiful edge) wrapped in a soft halo.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.34, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.38, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

const SKY_BODY_STOPS = [
  // High, pale-gold noon sun, kept clear of both the nav and the AI core.
  { position: new THREE.Vector3(-4.2, 8.6, -40), scale: 8.0, color: new THREE.Color('#ffcf8a'), opacity: 1 },
  // Setting sun swings left of the headline so the warm light has room to read.
  { position: new THREE.Vector3(-24, 5.0, -38), scale: 8.5, color: new THREE.Color('#ff9a52'), opacity: 1 },
  { position: new THREE.Vector3(-6.5, 9.5, -42), scale: 3.4, color: new THREE.Color('#d9e8ff'), opacity: 0.95 },
];

export function createSkyBody() {
  const material = new THREE.SpriteMaterial({
    map: createSkyBodyTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    // The sun is a light source, not an object in the fog — without this the
    // exp2 fog washes its disc into the horizon.
    fog: false,
    opacity: 0.92,
    color: new THREE.Color('#fff4d8'),
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(8.0);
  sprite.position.copy(SKY_BODY_STOPS[0].position);
  sprite.renderOrder = -5;

  return { sprite, material };
}

export function updateSkyBody(body, t) {
  const scaled = Math.min(Math.max(t, 0), 1) * 2;
  const index = Math.min(Math.floor(scaled), 1);
  const local = scaled - index;
  const eased = local * local * (3 - 2 * local);
  const a = SKY_BODY_STOPS[index];
  const b = SKY_BODY_STOPS[index + 1];

  body.sprite.position.lerpVectors(a.position, b.position, eased);
  body.sprite.scale.setScalar(THREE.MathUtils.lerp(a.scale, b.scale, eased));
  body.material.color.lerpColors(a.color, b.color, eased);
  body.material.opacity = THREE.MathUtils.lerp(a.opacity, b.opacity, eased);
}

/* ------------------------------------------------------------------ */
/* Additive halos for the screen and AI core                           */
/* ------------------------------------------------------------------ */

export function createGlowSprite({ color = '#ffffff', size = 1, opacity = 0.3 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.26, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}
