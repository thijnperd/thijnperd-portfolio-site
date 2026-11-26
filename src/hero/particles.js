import * as THREE from 'three';

/**
 * Two lightweight point systems drawn with a soft radial falloff shader:
 * rising embers/sparks between the laptop and floating core, and steam curls
 * off the coffee mug. Both advance smoothly via deltaTime.
 */

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

export function createSteamParticles({ origin, count = 12, pixelRatio = 1 }) {
  const system = createPointSystem(count, new THREE.Color('#f5efe2'), 0.4, pixelRatio);
  const seeds = [];

  for (let i = 0; i < count; i += 1) {
    seeds.push({
      u: Math.random(),
      speed: 0.14 + Math.random() * 0.12,
      drift: 0.05 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      size: 2.2 + Math.random() * 2.6,
      rise: 0.45 + Math.random() * 0.35,
    });
    system.sizes[i] = seeds[i].size;
  }

  function update(elapsed, atm, deltaTime = 0) {
    const dt = Math.min(Math.max(deltaTime, 0), 0.05);
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      seed.u = (seed.u + dt * seed.speed) % 1;
      const u = seed.u;
      const curl = Math.sin(u * 5.2 + seed.phase) * seed.drift * u;

      system.positions[i * 3] = origin.x + curl;
      system.positions[i * 3 + 1] = origin.y + u * seed.rise;
      system.positions[i * 3 + 2] = origin.z + Math.cos(u * 4.4 + seed.phase) * seed.drift * u;

      system.alphas[i] = Math.sin(u * Math.PI) * (0.62 - atm.night * 0.16);
    }

    system.geometry.attributes.position.needsUpdate = true;
    system.geometry.attributes.aAlpha.needsUpdate = true;

    system.material.uniforms.uColor.value.copy(atm.screenTint).lerp(STEAM_WHITE, 0.55);
    system.material.uniforms.uOpacity.value = 0.32 + atm.night * 0.12;
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
