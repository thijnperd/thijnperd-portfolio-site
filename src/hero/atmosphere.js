import * as THREE from 'three';

/**
 * SECTION 4 — DAY-TO-NIGHT / "LOCKED IN" ATMOSPHERE STATE MACHINE
 *
 * A single normalized scalar (`t`, 0 → 1) is the one source of truth for every
 * visual in the hero: sun/moon arc, ambient fill, fog, ink colour, water palette,
 * screen glow, AI-core glow and the HTML overlay contrast. Because every value is
 * sampled from the same curve, the copy can never fall out of sync with the scene.
 *
 * Three hand-tuned keyframes sit at 0.0 (Daylight / ideating), 0.5 (Golden Hour /
 * flow state) and 1.0 (Midnight / locked in). Interpolating straight from day to
 * night would pass through muddy grey, so we explicitly interpolate through the
 * warm middle stop and smoothstep each segment. That makes dragging the slider feel
 * cinematic at every position, not just at the ends.
 */

const RAW_STOPS = [
  {
    key: 'ideating',
    label: 'ideating',
    status: 'ideating',
    background: '#c9d8cf',
    fog: '#e2e9e4',
    skyTop: '#6fb39d',
    skyHorizon: '#dcebe4',
    fogDensity: 0.02,
    sunColor: '#fff4dc',
    sunIntensity: 3.0,
    sunPosition: [-6.5, 9.5, 4.5],
    ambientColor: '#d6e4db',
    ambientIntensity: 1.0,
    hemiSky: '#eef6f1',
    hemiGround: '#6d8a7b',
    hemiIntensity: 0.7,
    waterDeep: '#0b3a33',
    waterShallow: '#68bda4',
    waterSky: '#bcdccc',
    screenLight: 1.0,
    screenTint: '#eafff8',
    coreLight: 1.2,
    coreTint: '#b6ffe9',
    coreColor: '#3fcfa6',
    shadowStrength: 0.4,
    exposure: 0.98,
    ink: '#121614',
    paper: '#e4e6e1',
    accent: '#b8402c',
    accentWarm: '#d9683f',
    night: 0,
  },
  {
    key: 'flow',
    label: 'flow state',
    status: 'flow state',
    background: '#e9bc94',
    fog: '#eec9a4',
    skyTop: '#e39a68',
    skyHorizon: '#ffe2bd',
    fogDensity: 0.022,
    sunColor: '#ff9a55',
    sunIntensity: 3.1,
    sunPosition: [-8.4, 2.5, 2.6],
    ambientColor: '#e3a97c',
    ambientIntensity: 0.75,
    hemiSky: '#ffd7ae',
    hemiGround: '#7a4d33',
    hemiIntensity: 0.48,
    waterDeep: '#371a14',
    waterShallow: '#cb8d57',
    waterSky: '#e8bc92',
    screenLight: 1.8,
    screenTint: '#ffb37c',
    coreLight: 2.4,
    coreTint: '#ffc98f',
    coreColor: '#ff9a5e',
    shadowStrength: 0.46,
    exposure: 1.04,
    ink: '#221609',
    paper: '#e5d2b0',
    accent: '#9c3f16',
    accentWarm: '#c25a2e',
    night: 0.22,
  },
  {
    key: 'locked',
    label: 'locked in',
    status: 'locked in',
    background: '#050810',
    fog: '#070b12',
    skyTop: '#020409',
    skyHorizon: '#0d1724',
    fogDensity: 0.024,
    sunColor: '#93a9c9',
    sunIntensity: 0.55,
    sunPosition: [7.6, 4.4, -5.2],
    ambientColor: '#1e2a3c',
    ambientIntensity: 0.62,
    hemiSky: '#16202f',
    hemiGround: '#05080d',
    hemiIntensity: 0.3,
    waterDeep: '#03060b',
    waterShallow: '#10202f',
    waterSky: '#0b1622',
    screenLight: 3.6,
    screenTint: '#ffc089',
    coreLight: 3.2,
    coreTint: '#ffb08a',
    coreColor: '#ff7a3d',
    shadowStrength: 0.5,
    exposure: 1.12,
    ink: '#e9eae4',
    paper: '#0a0d10',
    accent: '#f0703f',
    accentWarm: '#ffb273',
    night: 1,
  },
];

const COLOR_KEYS = [
  'background',
  'fog',
  'skyTop',
  'skyHorizon',
  'sunColor',
  'ambientColor',
  'hemiSky',
  'hemiGround',
  'waterDeep',
  'waterShallow',
  'waterSky',
  'screenTint',
  'coreTint',
  'coreColor',
  'ink',
  'paper',
  'accent',
  'accentWarm',
];

const NUMBER_KEYS = [
  'fogDensity',
  'sunIntensity',
  'ambientIntensity',
  'hemiIntensity',
  'screenLight',
  'coreLight',
  'shadowStrength',
  'exposure',
  'night',
];

/** Pre-convert every palette colour to linear working space exactly once. */
const STOPS = RAW_STOPS.map((stop) => {
  const prepared = { ...stop };
  for (const key of COLOR_KEYS) prepared[key] = new THREE.Color(stop[key]);
  prepared.sunPosition = new THREE.Vector3(...stop.sunPosition);
  return prepared;
});

const smoothstep = (x) => x * x * (3 - 2 * x);

/**
 * Create the object that `sampleAtmosphere()` writes into. Reusing one instance
 * avoids allocating dozens of THREE.Color objects on every frame.
 */
export function createAtmosphereState() {
  const state = {
    key: 'ideating',
    label: 'ideating',
    status: 'ideating',
    t: 0,
    sunPosition: new THREE.Vector3(),
  };
  for (const key of COLOR_KEYS) state[key] = new THREE.Color();
  for (const key of NUMBER_KEYS) state[key] = 0;
  return state;
}

/**
 * Piecewise, three-stop palette sampling.
 * `t = 0` → day, `t = 0.5` → golden hour, `t = 1` → midnight.
 */
export function sampleAtmosphere(t, out = createAtmosphereState()) {
  const clamped = THREE.MathUtils.clamp(Number.isFinite(t) ? t : 0, 0, 1);
  const scaled = clamped * 2;
  const index = Math.min(Math.floor(scaled), 1);
  const local = scaled - index;
  const eased = smoothstep(local);

  const a = STOPS[index];
  const b = STOPS[index + 1];

  for (const key of COLOR_KEYS) out[key].lerpColors(a[key], b[key], eased);
  for (const key of NUMBER_KEYS) out[key] = THREE.MathUtils.lerp(a[key], b[key], eased);

  out.sunPosition.lerpVectors(a.sunPosition, b.sunPosition, eased);
  out.key = b.key;
  out.label = b.label;
  out.status = clamped < 0.34 ? 'ideating' : clamped < 0.72 ? 'flow state' : 'locked in';
  out.t = clamped;

  return out;
}

/**
 * Drive the actual Three.js light rig from the sampled atmosphere.
 * The directional light arcs from high sun → low sunset → low moon rim while the
 * two local point lights (laptop screen + AI core) ramp up after t = 0.35, so at
 * night the desk and water are literally lit by the code and the co-pilot.
 */
export function updateLightRig(lights, atm) {
  const { sun, ambient, hemi, screen, core } = lights;

  sun.position.copy(atm.sunPosition);
  sun.color.copy(atm.sunColor);
  sun.intensity = atm.sunIntensity;
  if (sun.target) sun.target.position.set(0, 0.7, 0);

  ambient.color.copy(atm.ambientColor);
  ambient.intensity = atm.ambientIntensity;

  hemi.color.copy(atm.hemiSky);
  hemi.groundColor.copy(atm.hemiGround);
  hemi.intensity = atm.hemiIntensity;

  screen.color.copy(atm.screenTint);
  screen.intensity = atm.screenLight;

  core.color.copy(atm.coreTint);
  core.intensity = atm.coreLight;
}

export { STOPS as ATMOSPHERE_STOPS };
