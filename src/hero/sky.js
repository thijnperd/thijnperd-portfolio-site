import * as THREE from 'three';

/**
 * Procedural sky dome, synchronized Sun & Moon arc with horizon clipping,
 * drifting cloud wisps, twinkling starfield, and subtle shooting star.
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
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlowColor;
  uniform float uSunGlowStrength;
  uniform vec3 uMoonDir;
  uniform float uMoonGlowStrength;
  uniform vec3 uCloudColor;
  uniform float uCloudStrength;
  uniform float uTime;

  varying vec3 vWorldPosition;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.45);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 dir = normalize(vWorldPosition - cameraPosition);

    // Three-band sky gradient: horizon -> mid sky -> zenith.
    float lowBand = smoothstep(-0.04, 0.22, dir.y);
    float highBand = smoothstep(0.18, 0.68, dir.y);
    vec3 color = mix(uHorizon, uMid, lowBand);
    color = mix(color, uTop, highBand);

    // Directional solar Mie glow concentrated near the horizon during dusk.
    float sunAlign = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonBand = 1.0 - smoothstep(0.0, 0.36, abs(dir.y - 0.02));
    float sunBloom = pow(sunAlign, 7.0) * 0.38 + pow(sunAlign, 28.0) * 0.55;
    color += uSunGlowColor * sunBloom * (0.35 + 0.65 * horizonBand) * uSunGlowStrength;

    // Tight cool silver-blue halo around the moon so the night sky stays deep.
    float moonAlign = max(dot(dir, normalize(uMoonDir)), 0.0);
    float moonHalo = pow(moonAlign, 42.0) * 0.14 + pow(moonAlign, 140.0) * 0.18;
    color += vec3(0.45, 0.64, 0.92) * moonHalo * uMoonGlowStrength;

    // Soft drifting procedural cloud wisps in the upper sky.
    if (dir.y > 0.015 && uCloudStrength > 0.001) {
      vec2 cloudUv = dir.xz / (dir.y + 0.16);
      vec2 drift = vec2(uTime * 0.012, uTime * 0.004);
      float n1 = noise2(cloudUv * 1.35 + drift);
      float n2 = noise2(cloudUv * 2.8 - drift * 1.4 + vec2(4.1, 1.7));
      float wisps = smoothstep(0.54, 0.84, n1 * 0.68 + n2 * 0.32);
      float cloudMask = smoothstep(0.02, 0.16, dir.y) * (1.0 - smoothstep(0.45, 0.85, dir.y));
      vec3 litCloud = mix(uCloudColor, uSunGlowColor, pow(sunAlign, 3.0) * 0.55 * uSunGlowStrength);
      color = mix(color, litCloud, wisps * cloudMask * uCloudStrength);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createSkyDome() {
  const geometry = new THREE.SphereGeometry(150, 32, 20);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color('#6fb39d') },
      uMid: { value: new THREE.Color('#a7d1c2') },
      uHorizon: { value: new THREE.Color('#dcebe4') },
      uSunDir: { value: new THREE.Vector3(0.2, 0.2, -1) },
      uSunGlowColor: { value: new THREE.Color('#ff9d5c') },
      uSunGlowStrength: { value: 0.25 },
      uMoonDir: { value: new THREE.Vector3(0.2, 0.2, -1) },
      uMoonGlowStrength: { value: 0.0 },
      uCloudColor: { value: new THREE.Color('#f4f8f5') },
      uCloudStrength: { value: 0.22 },
      uTime: { value: 0 },
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

export function updateSkyDome(dome, atm, celestial, elapsed) {
  const u = dome.uniforms;
  u.uTop.value.copy(atm.skyTop);
  u.uMid.value.copy(atm.skyMid);
  u.uHorizon.value.copy(atm.skyHorizon);
  u.uSunDir.value.copy(celestial.sunDir);
  u.uSunGlowColor.value.copy(atm.sunGlowColor);
  u.uSunGlowStrength.value = celestial.sunGlowStrength;
  u.uMoonDir.value.copy(celestial.moonDir);
  u.uMoonGlowStrength.value = celestial.moonVisibility * (0.4 + 0.6 * atm.night);
  u.uCloudColor.value.copy(atm.cloudColor);
  u.uCloudStrength.value = atm.cloudStrength;
  u.uTime.value = elapsed;
}

/* ------------------------------------------------------------------ */
/* Procedural GLSL Sun & Moon with horizon clipping                    */
/* ------------------------------------------------------------------ */

const CELESTIAL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SUN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCoronaColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uHorizonY;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Clip cleanly behind the sea horizon as the sun sets.
    float horizonClip = smoothstep(uHorizonY - 0.12, uHorizonY + 0.42, vWorldPos.y);
    if (horizonClip <= 0.001 || uOpacity <= 0.001) discard;

    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    // Solar disc with subtle limb darkening.
    float disc = 1.0 - smoothstep(0.31, 0.345, r);
    float limb = smoothstep(0.35, 0.08, r);
    vec3 discColor = mix(uCoronaColor, uColor, 0.55 + 0.45 * limb);

    // Subtle animated corona rays + soft atmospheric aureole.
    float angle = atan(p.y, p.x);
    float rays = 0.88 + 0.12 * sin(angle * 7.0 + uTime * 0.45) * cos(angle * 3.0 - uTime * 0.28);
    float innerHalo = exp(-max(r - 0.3, 0.0) * 5.8) * 0.55 * rays;
    float outerHalo = exp(-r * 2.9) * 0.22;

    float alpha = clamp(disc + innerHalo + outerHalo, 0.0, 1.0) * (1.0 - smoothstep(0.75, 1.0, r));
    vec3 finalColor = mix(uCoronaColor, discColor, disc);

    gl_FragColor = vec4(finalColor, alpha * uOpacity * horizonClip);
  }
`;

const MOON_FRAGMENT = /* glsl */ `
  uniform vec3 uLitColor;
  uniform vec3 uShadowColor;
  uniform vec3 uHaloColor;
  uniform float uOpacity;
  uniform float uHorizonY;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // Clip cleanly behind the sea horizon during moonrise.
    float horizonClip = smoothstep(uHorizonY - 0.12, uHorizonY + 0.42, vWorldPos.y);
    if (horizonClip <= 0.001 || uOpacity <= 0.001) discard;

    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    float moonRadius = 0.36;
    float discMask = 1.0 - smoothstep(moonRadius - 0.015, moonRadius + 0.015, r);

    // Pseudo-3D sphere normal on the lunar disc for crisp crescent/gibbous phase.
    vec2 sp = p / moonRadius;
    float z = sqrt(max(0.0, 1.0 - dot(sp, sp)));
    vec3 normal = normalize(vec3(sp.x, sp.y, z));
    vec3 sunLight = normalize(vec3(-0.72, 0.32, 0.61));
    float phase = smoothstep(-0.08, 0.28, dot(normal, sunLight));

    // Procedural lunar maria & crater texture.
    float maria = noise2(sp * 3.1 + vec2(2.4, 5.1)) * 0.65 + noise2(sp * 6.8 + vec2(1.1, 3.7)) * 0.35;
    float surface = 0.78 + 0.22 * smoothstep(0.32, 0.72, maria);

    vec3 moonBody = mix(uShadowColor, uLitColor * surface, 0.12 + 0.88 * phase);

    // Cool atmospheric halo around the disc.
    float halo = exp(-max(r - moonRadius * 0.9, 0.0) * 4.5) * 0.38 * (1.0 - smoothstep(0.75, 1.0, r));
    vec3 color = mix(uHaloColor, moonBody, discMask);
    float alpha = max(discMask * 0.96, halo) * uOpacity * horizonClip;

    gl_FragColor = vec4(color, alpha);
  }
`;

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export function createCelestialSystem() {
  const sunGeo = new THREE.PlaneGeometry(1, 1);
  const sunMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#fff3d4') },
      uCoronaColor: { value: new THREE.Color('#ffbe6e') },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uHorizonY: { value: 0 },
    },
    vertexShader: CELESTIAL_VERTEX,
    fragmentShader: SUN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.renderOrder = -6;
  sunMesh.frustumCulled = false;

  const moonGeo = new THREE.PlaneGeometry(1, 1);
  const moonMat = new THREE.ShaderMaterial({
    uniforms: {
      uLitColor: { value: new THREE.Color('#eef4ff') },
      uShadowColor: { value: new THREE.Color('#1a2638') },
      uHaloColor: { value: new THREE.Color('#7ca3d6') },
      uOpacity: { value: 0 },
      uHorizonY: { value: 0 },
    },
    vertexShader: CELESTIAL_VERTEX,
    fragmentShader: MOON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.renderOrder = -5;
  moonMesh.frustumCulled = false;

  const group = new THREE.Group();
  group.add(sunMesh, moonMesh);

  const state = {
    group,
    sunMesh,
    moonMesh,
    sunMat,
    moonMat,
    sunDir: new THREE.Vector3(0.2, 0.2, -1),
    moonDir: new THREE.Vector3(0.2, 0.2, -1),
    celestialDir: new THREE.Vector3(-0.5, 0.7, 0.35),
    celestialColor: new THREE.Color('#fff4dc'),
    celestialPower: 1.0,
    sunGlowStrength: 0.25,
    moonVisibility: 0,
    sunElevation: 1,
    moonElevation: 0,
  };

  // Pre-allocated scratch vectors to avoid per-frame allocations.
  state._forward = new THREE.Vector3();
  state._right = new THREE.Vector3();
  state._anchor = new THREE.Vector3();
  state._up = new THREE.Vector3(0, 1, 0);
  state._sunLightDir = new THREE.Vector3();
  state._moonLightDir = new THREE.Vector3();

  return state;
}

/**
 * Compute camera-relative orbital arc positions so the Sun sets smoothly across
 * the sky and slips beneath the sea horizon as the Moon emerges on the right.
 */
export function updateCelestialSystem(celestial, camera, cameraBase, cameraLook, t, elapsed, compact) {
  const forward = celestial._forward
    .set(cameraLook.x - cameraBase.x, 0, cameraLook.z - cameraBase.z)
    .normalize();
  const right = celestial._right.crossVectors(forward, celestial._up).normalize();

  // Place celestial bodies near the far ocean edge so the water plane clips
  // sunset and moonrise behind the real sea horizon on both desktop and mobile.
  const dist = 114;
  const distRatio = dist / 54;
  const xSpan = (compact ? 0.34 : 1.0) * distRatio;
  const ySpan = (compact ? 0.72 : 1.0) * distRatio;
  const horizonY = cameraBase.y * Math.max(1 - dist / 130, 0.06);

  // 1. Sun trajectory (t = 0.0 -> 0.64): high right -> setting left behind horizon.
  const sunU = clamp01(t / 0.64);
  const sunEased = sunU * sunU * (3 - 2 * sunU);
  const sunRight = THREE.MathUtils.lerp(11.5, -14.8, sunEased) * xSpan;
  const sunArcY = (12.0 * Math.cos(sunU * Math.PI * 0.56) - (sunU > 0.72 ? (sunU - 0.72) * 14.0 : 0)) * ySpan;

  celestial._anchor
    .copy(cameraBase)
    .addScaledVector(forward, dist)
    .addScaledVector(right, sunRight);
  celestial.sunMesh.position.set(celestial._anchor.x, sunArcY, celestial._anchor.z);
  celestial.sunMesh.quaternion.copy(camera.quaternion);

  // Subtle refractive enlargement as the sun approaches the horizon.
  const duskProximity = Math.exp(-Math.pow((t - 0.44) / 0.14, 2));
  const sunScale = ((compact ? 10.5 : 13.5) + duskProximity * 2.8) * distRatio;
  celestial.sunMesh.scale.setScalar(sunScale);

  const sunColorDay = celestial.sunMat.uniforms.uColor.value;
  sunColorDay.set('#fff4d6').lerp(new THREE.Color('#ff8947'), smoothstep(0.18, 0.52, t));
  celestial.sunMat.uniforms.uCoronaColor.value
    .set('#ffcf86')
    .lerp(new THREE.Color('#e84a28'), smoothstep(0.22, 0.54, t));

  const sunOpacity = 1.0 - smoothstep(0.55, 0.64, t);
  celestial.sunMat.uniforms.uOpacity.value = sunOpacity;
  celestial.sunMat.uniforms.uTime.value = elapsed;
  celestial.sunMat.uniforms.uHorizonY.value = horizonY;
  celestial.sunMesh.visible = sunOpacity > 0.005;

  celestial.sunDir.copy(celestial.sunMesh.position).sub(cameraBase).normalize();
  celestial.sunElevation = clamp01((sunArcY / ySpan + 1.0) / 12.0);
  celestial.sunGlowStrength = (0.2 + 0.9 * duskProximity) * (1.0 - smoothstep(0.58, 0.74, t));

  // 2. Moon trajectory (t = 0.46 -> 1.0): rises out of the sea on the right into upper-right sky.
  const moonU = clamp01((t - 0.46) / 0.54);
  const moonEased = moonU * moonU * (3 - 2 * moonU);
  const moonRight = THREE.MathUtils.lerp(13.2, 9.6, moonEased) * xSpan;
  const moonY = THREE.MathUtils.lerp(-3.2, 9.8, Math.sin(moonU * Math.PI * 0.5)) * ySpan;

  celestial._anchor
    .copy(cameraBase)
    .addScaledVector(forward, dist)
    .addScaledVector(right, moonRight);
  celestial.moonMesh.position.set(celestial._anchor.x, moonY, celestial._anchor.z);
  celestial.moonMesh.quaternion.copy(camera.quaternion);
  celestial.moonMesh.scale.setScalar((compact ? 5.6 : 6.8) * distRatio);

  const moonVis = smoothstep(0.47, 0.62, t);
  celestial.moonMat.uniforms.uOpacity.value = moonVis;
  celestial.moonMat.uniforms.uHorizonY.value = horizonY;
  celestial.moonMesh.visible = moonVis > 0.005;

  celestial.moonDir.copy(celestial.moonMesh.position).sub(cameraBase).normalize();
  celestial.moonVisibility = moonVis;
  celestial.moonElevation = clamp01((moonY / ySpan + 1.0) / 10.5);

  // 3. Unified celestial light direction for water glitter & scene highlights.
  const handoff = smoothstep(0.5, 0.66, t);
  celestial._sunLightDir.copy(celestial.sunDir);
  celestial._sunLightDir.y = Math.max(celestial._sunLightDir.y, 0.08);
  celestial._moonLightDir.copy(celestial.moonDir);
  celestial._moonLightDir.y = Math.max(celestial._moonLightDir.y, 0.12);

  celestial.celestialDir
    .copy(celestial._sunLightDir)
    .lerp(celestial._moonLightDir, handoff)
    .normalize();

  celestial.celestialColor
    .copy(sunColorDay)
    .lerp(new THREE.Color('#b9d2f4'), handoff);

  celestial.celestialPower = THREE.MathUtils.lerp(
    0.85 + duskProximity * 0.75,
    0.72 * moonVis,
    handoff,
  );
}

/* ------------------------------------------------------------------ */
/* Twinkling procedural starfield & periodic shooting star             */
/* ------------------------------------------------------------------ */

const STAR_VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute vec3 aTint;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vTint;

  void main() {
    float twinkle = 0.62 + 0.38 * sin(uTime * 1.9 + aPhase * 6.28318);
    vAlpha = uOpacity * twinkle;
    vTint = aTint;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (110.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vTint;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float core = smoothstep(0.48, 0.05, d);
    if (core * vAlpha <= 0.005) discard;
    gl_FragColor = vec4(vTint, core * vAlpha);
  }
`;

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createStarfield({ count = 210, pixelRatio = 1 } = {}) {
  const rand = seededRandom(20261126);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const tints = new Float32Array(count * 3);

  const warm = new THREE.Color('#ffe8cb');
  const pure = new THREE.Color('#eef3ff');
  const cool = new THREE.Color('#b6d4ff');
  const c = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const theta = rand() * Math.PI * 2;
    const elev = 0.08 + Math.pow(rand(), 0.72) * 0.85;
    const radius = 122;
    const cosElev = Math.sqrt(1 - elev * elev);

    positions[i * 3] = Math.cos(theta) * cosElev * radius;
    positions[i * 3 + 1] = elev * radius;
    positions[i * 3 + 2] = Math.sin(theta) * cosElev * radius;

    phases[i] = rand();
    sizes[i] = 1.2 + Math.pow(rand(), 2.2) * 2.4;

    const pick = rand();
    if (pick < 0.2) c.copy(warm);
    else if (pick < 0.7) c.copy(pure);
    else c.copy(cool);

    tints[i * 3] = c.r;
    tints[i * 3 + 1] = c.g;
    tints[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0 },
    },
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -8;

  // Periodic subtle shooting star streak across the upper night sky.
  const meteorPositions = new Float32Array(6);
  const meteorGeo = new THREE.BufferGeometry();
  meteorGeo.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3));
  const meteorMat = new THREE.LineBasicMaterial({
    color: '#e8f1ff',
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const meteor = new THREE.Line(meteorGeo, meteorMat);
  meteor.frustumCulled = false;
  meteor.renderOrder = -7;
  meteor.visible = false;

  const group = new THREE.Group();
  group.add(points, meteor);

  return { group, points, meteor, meteorGeo, meteorMat, material, geometry };
}

export function updateStarfield(starfield, atm, elapsed, t, reducedMotion) {
  const opacity = atm.starOpacity;
  starfield.points.visible = opacity > 0.01;
  starfield.points.rotation.y = elapsed * 0.004;
  starfield.material.uniforms.uTime.value = elapsed;
  starfield.material.uniforms.uOpacity.value = opacity;

  // Shooting star appears briefly (~0.7s) every 11s in deep night when motion is allowed.
  if (reducedMotion || t < 0.78) {
    starfield.meteor.visible = false;
    return;
  }

  const cycle = elapsed % 11.0;
  const duration = 0.72;
  if (cycle > duration) {
    starfield.meteor.visible = false;
    return;
  }

  const p = cycle / duration;
  const idx = Math.floor(elapsed / 11.0);
  const lane = ((idx * 37) % 11) - 5;
  const startX = -18 + lane * 2.2;
  const startY = 18 + (idx % 3) * 2.5;
  const startZ = -65;

  const headX = startX + p * 18;
  const headY = startY - p * 8.5;
  const tailLen = 0.16;
  const tailP = Math.max(0, p - tailLen);
  const tailX = startX + tailP * 18;
  const tailY = startY - tailP * 8.5;

  const attr = starfield.meteorGeo.attributes.position;
  attr.setXYZ(0, tailX, tailY, startZ);
  attr.setXYZ(1, headX, headY, startZ);
  attr.needsUpdate = true;

  starfield.meteorMat.opacity = Math.sin(p * Math.PI) * 0.75 * opacity;
  starfield.meteor.visible = true;
}

export function setStarfieldPixelRatio(starfield, ratio) {
  starfield.material.uniforms.uPixelRatio.value = ratio;
}

/* ------------------------------------------------------------------ */
/* Additive halos for the laptop screen and geometric core             */
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
