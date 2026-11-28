import * as THREE from 'three';

const STEAM_WHITE = new THREE.Color('#ffffff');

const POINT_VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (26.0 / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float glow = smoothstep(0.5, 0.02, dist);
    gl_FragColor = vec4(uColor, glow * vAlpha * uOpacity);
  }
`;

function createPointSystem(count, color, opacity, pixelRatio) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const sizes = new Float32Array(count);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uOpacity: { value: opacity },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return { points, geometry, material, positions, alphas, sizes, count };
}

export function createPromptParticles({ start, end, count = 52, pixelRatio = 1 }) {
  const system = createPointSystem(count, new THREE.Color('#9ff0d6'), 0.7, pixelRatio);
  const seeds = [];

  for (let i = 0; i < count; i += 1) {
    seeds.push({
      u: Math.random(),
      offset: Math.random(),
      speed: 0.075 + Math.random() * 0.11,
      lift: 0.3 + Math.random() * 0.5,
      sway: 0.12 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      size: 0.7 + Math.random() * 1.0,
    });
    system.sizes[i] = seeds[i].size;
  }

  const startVec = start.clone();
  const endVec = end.clone();
  const controlA = startVec.clone().add(new THREE.Vector3(0.05, 0.55, 0.06));
  const controlB = endVec.clone().add(new THREE.Vector3(0.1, -0.18, 0.1));
  const temp = new THREE.Vector3();

  function update(elapsed, atm, deltaTime = 0) {
    const dt = Math.min(Math.max(deltaTime, 0), 0.05);
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      seed.u = (seed.u + dt * seed.speed) % 1;
      const u = seed.u;

      const inv = 1 - u;
      temp.set(0, 0, 0);
      temp.addScaledVector(startVec, inv * inv * inv);
      temp.addScaledVector(controlA, 3 * inv * inv * u);
      temp.addScaledVector(controlB, 3 * inv * u * u);
      temp.addScaledVector(endVec, u * u * u);

      temp.x += Math.sin(elapsed * 1.1 + seed.phase) * seed.sway * Math.sin(u * Math.PI);
      temp.z += Math.cos(elapsed * 0.9 + seed.phase) * seed.sway * 0.6 * Math.sin(u * Math.PI);
      temp.y += Math.sin(u * Math.PI) * seed.lift * 0.12;

      system.positions[i * 3] = temp.x;
      system.positions[i * 3 + 1] = temp.y;
      system.positions[i * 3 + 2] = temp.z;

      const fade = Math.sin(u * Math.PI);
      const shimmer = 0.8 + 0.2 * Math.sin(elapsed * 3.1 + seed.phase);
      system.alphas[i] = fade * shimmer * (0.22 + atm.night * 0.78) * (0.45 + seed.offset * 0.55);
    }

    system.geometry.attributes.position.needsUpdate = true;
    system.geometry.attributes.aAlpha.needsUpdate = true;

    system.material.uniforms.uColor.value.copy(atm.coreTint).multiplyScalar(0.6 + atm.night * 0.8);
    system.material.uniforms.uOpacity.value = 0.2 + atm.night * 0.54;
  }

  function setPixelRatio(ratio) {
    system.material.uniforms.uPixelRatio.value = ratio;
  }

  function dispose() {
    system.geometry.dispose();
    system.material.dispose();
  }

  return { points: system.points, update, setPixelRatio, dispose };
}

/* Steam: soft, noisy puffs on a layered-sine curl. One draw call, no textures. */

const STEAM_VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  attribute float aSeed;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vAlpha = aAlpha;
    vSeed = aSeed;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (26.0 / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float a = vSeed * 6.2831;
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    // Two octaves of value noise break the disc into a wispy, uneven puff.
    float n = noise(p * 3.2 + vSeed * 17.0) * 0.62 + noise(p * 6.5 - vSeed * 9.0) * 0.38;
    float r = length(p) + (n - 0.5) * 0.3;
    float puff = smoothstep(0.5, 0.0, r);
    puff *= puff;
    if (puff < 0.004) discard;
    gl_FragColor = vec4(uColor, puff * vAlpha * uOpacity);
  }
`;

export function createSteamParticles({ origin, count = 40, pixelRatio = 1 }) {
  const total = Math.max(24, Math.min(48, count));
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(total * 3);
  const alphas = new Float32Array(total);
  const sizes = new Float32Array(total);
  const seedsAttr = new Float32Array(total);

  const seeds = [];
  for (let i = 0; i < total; i += 1) {
    seeds.push({
      u: i / total + Math.random() * (0.6 / total),
      speed: 0.16 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      swirl: 0.7 + Math.random() * 0.6,
      size: 2.6 + Math.random() * 2.4,
      side: Math.random() * 2 - 1,
    });
    seedsAttr[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seedsAttr, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#f5efe2') },
      uOpacity: { value: 0.4 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: STEAM_VERTEX,
    fragmentShader: STEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  let intensity = 1;
  let gust = 0;

  function update(elapsed, atm, deltaTime = 0) {
    const dt = Math.min(Math.max(deltaTime, 0), 0.05);
    gust = Math.max(0, gust - dt * 0.55);

    const level = (intensity - 1) / 1.6; // 0 … 1 over the three clicks
    const g = gust * gust;
    const height = 0.5 + level * 0.26 + g * 0.12;
    const width = 1 + level * 0.55 + g * 0.6;
    const speedScale = 1 + level * 0.25 + g * 0.6;
    // Density: more of the pool is alive with each click.
    const alive = total * (0.55 + 0.45 * level);
    const windX = 0.05 + g * 0.06 * Math.sin(elapsed * 2.3);
    const night = atm.night;

    for (let i = 0; i < total; i += 1) {
      const seed = seeds[i];
      seed.u += dt * seed.speed * speedScale;
      if (seed.u >= 1) {
        seed.u -= 1;
        seed.side = Math.random() * 2 - 1;
        seed.phase = Math.random() * Math.PI * 2;
      }
      const u = seed.u;

      // Layered sine curl: a slow wander plus a faster, smaller eddy, both
      // widening as the puff rises and cools.
      const spread = (0.01 + u * 0.1) * width;
      const t = elapsed * seed.swirl;
      const curlX =
        Math.sin(u * 5.5 + t * 1.2 + seed.phase) * spread +
        Math.sin(u * 13.0 - t * 2.4 + seed.phase * 1.7) * spread * 0.35 +
        seed.side * spread * 0.45;
      const curlZ =
        Math.cos(u * 4.6 + t * 1.0 + seed.phase * 1.3) * spread * 0.8 +
        Math.cos(u * 11.0 + t * 2.0 + seed.phase) * spread * 0.3;

      const k = i * 3;
      positions[k] = origin.x + curlX + windX * u * u;
      positions[k + 1] = origin.y + height * (u * 0.85 + u * u * 0.3);
      positions[k + 2] = origin.z + curlZ - 0.02 * u * u;

      sizes[i] = seed.size * (0.35 + 1.75 * u) * (1 + level * 0.25 + g * 0.2);

      const fadeIn = Math.min(1, u / 0.14);
      const fadeOut = Math.pow(1 - u, 1.6);
      const active = Math.min(1, Math.max(0, alive - i));
      alphas[i] = fadeIn * fadeIn * fadeOut * active * (0.75 + level * 0.25 + g * 0.3);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;

    // Steam takes the colour of the light around it: warm screen at night.
    material.uniforms.uColor.value.copy(atm.screenTint).lerp(STEAM_WHITE, 0.5);
    material.uniforms.uOpacity.value = (0.2 + night * 0.08) * (1 + level * 0.45);
  }

  // Clicking the mug thickens the plume: denser, taller, wider, plus a gust.
  function setIntensity(value) {
    const next = Math.max(1, Math.min(2.6, value));
    if (Math.abs(next - intensity) < 0.001) return;
    if (next > intensity) gust = 1;
    intensity = next;
  }

  function setPixelRatio(ratio) {
    material.uniforms.uPixelRatio.value = ratio;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, setIntensity, setPixelRatio, dispose };
}
