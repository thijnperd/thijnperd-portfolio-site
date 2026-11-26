import * as THREE from 'three';

/**
 * Infinite rippling water surface with analytic finite-difference normals,
 * synchronized sun/moon shimmer path, and up to 4 interactive click impulses.
 */

const MAX_IMPULSES = 4;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uOrigin;
  uniform vec4 uImpulses[${MAX_IMPULSES}];

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vViewDepth;
  varying float vImpulseGlow;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float impulseWave(vec2 p, vec4 imp) {
    if (imp.w <= 0.001) return 0.0;
    float age = uTime - imp.z;
    if (age < 0.0 || age > 7.5) return 0.0;

    float d = length(p - imp.xy);
    float front = age * 4.4;
    float distFromFront = d - front;
    float packet = exp(-distFromFront * distFromFront * 0.38);
    float decay = exp(-age * 0.55) * exp(-d * 0.08);
    return sin(distFromFront * 3.8) * packet * decay * 0.22 * imp.w;
  }

  float waveHeight(vec2 p, out float impSum) {
    vec2 d = p - uOrigin.xz;
    float r = length(d);

    // Concentric rings radiate outward from underneath the desk and fade with distance.
    float rings = sin(r * 1.35 - uTime * 1.0) * 0.14;
    rings *= exp(-r * 0.075);

    float ripples = sin(r * 3.1 - uTime * 1.65 + 1.7) * 0.04;
    ripples *= exp(-r * 0.17);

    // Low-frequency swell keeps the surface alive even far from the desk.
    float swell = (valueNoise(p * 0.19 + uTime * 0.03) - 0.5) * 0.2;
    float chop = (valueNoise(p * 0.46 - uTime * 0.055) - 0.5) * 0.05;

    impSum = 0.0;
    for (int i = 0; i < ${MAX_IMPULSES}; i++) {
      impSum += impulseWave(p, uImpulses[i]);
    }

    return rings + ripples + swell + chop + impSum;
  }

  void main() {
    vec3 displaced = position;
    float impSum = 0.0;
    displaced.y += waveHeight(position.xz, impSum);

    // Analytic normal from finite differences of the height field.
    float eps = 0.55;
    float dummyX = 0.0;
    float dummyZ = 0.0;
    float hx = waveHeight(position.xz + vec2(eps, 0.0), dummyX);
    float hz = waveHeight(position.xz + vec2(0.0, eps), dummyZ);
    vec3 normal = normalize(vec3(displaced.y - hx, eps, displaced.y - hz));

    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vec4 mvPosition = viewMatrix * world;

    vWorldPosition = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vHeight = displaced.y;
    vViewDepth = -mvPosition.z;
    vImpulseGlow = abs(impSum);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform vec3 uCelestialDir;
  uniform vec3 uCelestialColor;
  uniform float uCelestialPower;
  uniform vec3 uAmbient;
  uniform float uAmbientIntensity;
  uniform vec3 uLightPosA;
  uniform vec3 uLightColorA;
  uniform float uLightPowerA;
  uniform vec3 uLightPosB;
  uniform vec3 uLightColorB;
  uniform float uLightPowerB;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uNight;
  uniform vec3 uOrigin;
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vViewDepth;
  varying float vImpulseGlow;

  vec3 localGlow(vec3 base, vec3 lightPos, vec3 lightColor, float power, vec3 normal, vec3 viewDir) {
    vec3 toLight = lightPos - vWorldPosition;
    float dist = length(toLight);
    vec3 l = toLight / max(dist, 0.0001);

    float atten = power / (1.0 + dist * dist * 1.35);
    float diffuse = clamp(dot(normal, l), 0.0, 1.0);

    vec3 halfVec = normalize(l + viewDir);
    float specular = smoothstep(0.82, 1.0, dot(normal, halfVec));
    specular *= specular;

    return base + lightColor * atten * (0.1 + diffuse * 0.28 + specular * 3.2);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Cross-rippled fragment detail normal breaks up specular paths organically.
    vec2 rp = vWorldPosition.xz - uOrigin.xz;
    float p1 = length(rp) * 6.5 - uTime * 2.0;
    float p2 = dot(rp, vec2(0.75, 0.66)) * 5.2 + uTime * 1.4;
    vec3 detailNormal = normalize(vec3(
      sin(p1) * 0.1 + cos(p2) * 0.055,
      1.0,
      cos(p1) * 0.1 - sin(p2) * 0.055
    ));
    normal = normalize(mix(normal, detailNormal, 0.58));

    float facing = clamp(dot(normal, viewDir), 0.0, 1.0);

    // Height drives the two-tone palette: troughs deep, crests pale.
    float heightMix = smoothstep(-0.11, 0.16, vHeight);
    vec3 color = mix(uDeep, uShallow, heightMix);

    float crest = smoothstep(0.015, 0.14, vHeight);
    color *= 0.9 + crest * 0.3;

    vec3 sunDir = normalize(uSunDir);
    float sunDiffuse = clamp(dot(normal, sunDir), 0.0, 1.0);
    color *= (uAmbient * uAmbientIntensity + uSunColor * sunDiffuse * uSunIntensity * 0.24);

    // Grazing angles pick up the sky; stronger at night so the horizon glows.
    float fresnel = pow(1.0 - facing, 4.0);
    color = mix(color, uSky, fresnel * (0.2 + 0.32 * uNight));

    // Synchronized celestial glitter path (golden sun pillar at dusk, silver moon path at night).
    vec3 celDir = normalize(uCelestialDir);
    vec3 halfCel = normalize(celDir + viewDir);
    float celSpec = smoothstep(0.885, 1.0, dot(normal, halfCel));
    celSpec *= celSpec;
    color += uCelestialColor * celSpec * uCelestialPower * 1.45;

    // Subtle crest highlight on interactive click ripples.
    color += mix(uSky, uLightColorB, 0.45) * clamp(vImpulseGlow * 1.8, 0.0, 0.32);

    // Reflections of the laptop screen and geometric core.
    color = localGlow(color, uLightPosA, uLightColorA, uLightPowerA, normal, viewDir);
    color = localGlow(color, uLightPosB, uLightColorB, uLightPowerB, normal, viewDir);

    // Manual FogExp2 matching THREE.FogExp2 so the plane dissolves cleanly.
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDepth * vViewDepth);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 0.98));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createRipplePlane({ segments = 200, size = 260 } = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const impulses = Array.from({ length: MAX_IMPULSES }, () => new THREE.Vector4(0, 0, -100, 0));

  const uniforms = {
    uTime: { value: 0 },
    uOrigin: { value: new THREE.Vector3(0, 0, 0) },
    uImpulses: { value: impulses },
    uDeep: { value: new THREE.Color('#24675a') },
    uShallow: { value: new THREE.Color('#a9dfc8') },
    uSky: { value: new THREE.Color('#eefaf3') },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.8, 0.4) },
    uSunColor: { value: new THREE.Color('#fff3da') },
    uSunIntensity: { value: 2.5 },
    uCelestialDir: { value: new THREE.Vector3(0.2, 0.2, -1) },
    uCelestialColor: { value: new THREE.Color('#fff3da') },
    uCelestialPower: { value: 1.0 },
    uAmbient: { value: new THREE.Color('#d9ece1') },
    uAmbientIntensity: { value: 1.1 },
    uLightPosA: { value: new THREE.Vector3(0, 1.4, 0) },
    uLightColorA: { value: new THREE.Color('#d6f1e5') },
    uLightPowerA: { value: 0.6 },
    uLightPosB: { value: new THREE.Vector3(1, 2.3, 0) },
    uLightColorB: { value: new THREE.Color('#9ff0d6') },
    uLightPowerB: { value: 1.1 },
    uFogColor: { value: new THREE.Color('#e7efe7') },
    uFogDensity: { value: 0.027 },
    uNight: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    fog: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return { mesh, uniforms, material, geometry, impulses, nextImpulse: 0 };
}

export function triggerRipple(ripple, worldX, worldZ, elapsed, strength = 1.0) {
  const slot = ripple.impulses[ripple.nextImpulse];
  slot.set(worldX, worldZ, elapsed, strength);
  ripple.nextImpulse = (ripple.nextImpulse + 1) % MAX_IMPULSES;
}

export function updateRipple(ripple, atm, lightA, lightB, celestial) {
  const u = ripple.uniforms;
  u.uDeep.value.copy(atm.waterDeep);
  u.uShallow.value.copy(atm.waterShallow);
  u.uSky.value.copy(atm.waterSky);
  u.uSunColor.value.copy(atm.sunColor);
  u.uSunIntensity.value = atm.sunIntensity;
  if (celestial) {
    u.uSunDir.value.copy(celestial.celestialDir);
    u.uCelestialDir.value.copy(celestial.celestialDir);
    u.uCelestialColor.value.copy(celestial.celestialColor);
    u.uCelestialPower.value = celestial.celestialPower;
  } else {
    u.uSunDir.value.copy(atm.sunPosition).normalize();
  }
  u.uAmbient.value.copy(atm.ambientColor);
  u.uAmbientIntensity.value = atm.ambientIntensity;
  u.uFogColor.value.copy(atm.fog);
  u.uFogDensity.value = atm.fogDensity;
  u.uNight.value = atm.night;

  if (lightA) u.uLightPosA.value.copy(lightA);
  if (lightB) u.uLightPosB.value.copy(lightB);
  u.uLightColorA.value.copy(atm.screenTint);
  u.uLightPowerA.value = atm.screenLight * 0.9;
  u.uLightColorB.value.copy(atm.coreTint);
  u.uLightPowerB.value = atm.coreLight * 0.9;
}
