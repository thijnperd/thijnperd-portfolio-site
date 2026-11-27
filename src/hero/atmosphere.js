import * as THREE from 'three';

/**
 * 24-hour day-to-night-to-day atmosphere state machine driven by normalized clock
 * scalar `t` (0.00 = 00:00 midnight -> 0.275 = 06:36 dawn -> 0.50 = 12:00 daylight
 * -> 0.76 = 18:15 golden dusk -> 0.84 = twilight -> 1.00 = 24:00 midnight).
 */

const RAW_STOPS = [
  {
    t: 0.0,
    key: 'night',
    label: 'midnight',
    status: 'midnight',
    background: '#050810',
    fog: '#070b12',
    skyTop: '#010206',
    skyMid: '#040812',
    skyHorizon: '#09121e',
    sunGlowColor: '#1f2e45',
    cloudColor: '#0e1624',
    cloudStrength: 0.03,
    starOpacity: 1.0,
    fogDensity: 0.024,
    sunColor: '#9db6db',
    sunIntensity: 0.7,
    sunPosition: [7.6, 4.6, -5.2],
    ambientColor: '#1e2b3e',
    ambientIntensity: 0.62,
    hemiSky: '#162131',
    hemiGround: '#05080d',
    hemiIntensity: 0.3,
    waterDeep: '#03060b',
    waterShallow: '#102030',
    waterSky: '#0b1622',
    screenLight: 3.6,
    screenTint: '#ffc089',
    coreLight: 3.3,
    coreTint: '#ffb08a',
    coreColor: '#ff7a3d',
    shadowStrength: 0.5,
    exposure: 1.12,
    ink: '#e9eae4',
    paper: '#0a0d10',
    accent: '#f07443',
    accentWarm: '#ffb273',
    night: 1,
  },
  {
    t: 0.2,
    key: 'night',
    label: 'midnight',
    status: 'midnight',
    background: '#161b2a',
    fog: '#252538',
    skyTop: '#0d1526',
    skyMid: '#2a334e',
    skyHorizon: '#625060',
    sunGlowColor: '#db7454',
    cloudColor: '#565068',
    cloudStrength: 0.14,
    starOpacity: 0.56,
    fogDensity: 0.023,
    sunColor: '#d0bed8',
    sunIntensity: 1.15,
    sunPosition: [-5.8, 2.2, 3.2],
    ambientColor: '#3a4664',
    ambientIntensity: 0.68,
    hemiSky: '#3b4868',
    hemiGround: '#11141c',
    hemiIntensity: 0.38,
    waterDeep: '#090e19',
    waterShallow: '#283852',
    waterSky: '#3e3548',
    screenLight: 2.7,
    screenTint: '#ffbe9c',
    coreLight: 2.6,
    coreTint: '#ffbaa6',
    coreColor: '#e87e66',
    shadowStrength: 0.46,
    exposure: 1.07,
    ink: '#eceee8',
    paper: '#141925',
    accent: '#f07443',
    accentWarm: '#ffb28a',
    night: 0.72,
  },
  {
    t: 0.275,
    key: 'dawn',
    label: 'dawn',
    status: 'dawn',
    background: '#d4c9cc',
    fog: '#dfcfd0',
    skyTop: '#5d7b98',
    skyMid: '#c49899',
    skyHorizon: '#f0d7c9',
    sunGlowColor: '#ff9b7a',
    cloudColor: '#fae4da',
    cloudStrength: 0.3,
    starOpacity: 0.04,
    fogDensity: 0.02,
    sunColor: '#ffd4be',
    sunIntensity: 2.75,
    sunPosition: [-8.2, 2.8, 3.6],
    ambientColor: '#d5c7cc',
    ambientIntensity: 0.88,
    hemiSky: '#f0dde0',
    hemiGround: '#6d626a',
    hemiIntensity: 0.58,
    waterDeep: '#122634',
    waterShallow: '#7196a3',
    waterSky: '#dbc7cb',
    screenLight: 1.45,
    screenTint: '#ffd8cb',
    coreLight: 1.65,
    coreTint: '#ffd1c2',
    coreColor: '#e88c74',
    shadowStrength: 0.41,
    exposure: 1.02,
    ink: '#181c22',
    paper: '#e2e5ea',
    accent: '#a63a35',
    accentWarm: '#d4715a',
    night: 0.24,
  },
  {
    t: 0.5,
    key: 'day',
    label: 'daylight',
    status: 'daylight',
    background: '#c9d8cf',
    fog: '#e2e9e4',
    skyTop: '#68b099',
    skyMid: '#a9d3c3',
    skyHorizon: '#dcebe4',
    sunGlowColor: '#fff1cc',
    cloudColor: '#f5f9f6',
    cloudStrength: 0.24,
    starOpacity: 0.0,
    fogDensity: 0.019,
    sunColor: '#fff4dc',
    sunIntensity: 3.0,
    sunPosition: [-6.5, 9.5, 4.5],
    ambientColor: '#d6e4db',
    ambientIntensity: 1.0,
    hemiSky: '#eef6f1',
    hemiGround: '#6d8a7b',
    hemiIntensity: 0.72,
    waterDeep: '#0b3a33',
    waterShallow: '#68bda4',
    waterSky: '#bcdccc',
    screenLight: 1.0,
    screenTint: '#eafff8',
    coreLight: 1.2,
    coreTint: '#b6ffe9',
    coreColor: '#3fcfa6',
    shadowStrength: 0.38,
    exposure: 0.98,
    ink: '#121614',
    paper: '#e4e6e1',
    accent: '#a93724',
    accentWarm: '#d9683f',
    night: 0,
  },
  {
    t: 0.76,
    key: 'dusk',
    label: 'dusk',
    status: 'dusk',
    background: '#e5b288',
    fog: '#ebc39c',
    skyTop: '#8c6978',
    skyMid: '#de8f61',
    skyHorizon: '#ffd6aa',
    sunGlowColor: '#ff7b3b',
    cloudColor: '#ffdcb8',
    cloudStrength: 0.32,
    starOpacity: 0.05,
    fogDensity: 0.021,
    sunColor: '#ff9650',
    sunIntensity: 3.15,
    sunPosition: [8.4, 2.3, -2.2],
    ambientColor: '#df9f74',
    ambientIntensity: 0.72,
    hemiSky: '#ffd3a8',
    hemiGround: '#72462f',
    hemiIntensity: 0.46,
    waterDeep: '#351813',
    waterShallow: '#cb8954',
    waterSky: '#e8b68c',
    screenLight: 1.9,
    screenTint: '#ffb57e',
    coreLight: 2.3,
    coreTint: '#ffc88c',
    coreColor: '#ff9658',
    shadowStrength: 0.44,
    exposure: 1.04,
    ink: '#221609',
    paper: '#e5d2b0',
    accent: '#8f3610',
    accentWarm: '#c25a2e',
    night: 0.3,
  },
  {
    t: 0.84,
    key: 'dusk',
    label: 'dusk',
    status: 'dusk',
    background: '#171d2c',
    fog: '#262435',
    skyTop: '#0d1424',
    skyMid: '#282d46',
    skyHorizon: '#634243',
    sunGlowColor: '#db6538',
    cloudColor: '#524b61',
    cloudStrength: 0.14,
    starOpacity: 0.58,
    fogDensity: 0.023,
    sunColor: '#c8b8d6',
    sunIntensity: 1.1,
    sunPosition: [4.2, 2.4, -3.5],
    ambientColor: '#37425d',
    ambientIntensity: 0.66,
    hemiSky: '#394664',
    hemiGround: '#101219',
    hemiIntensity: 0.36,
    waterDeep: '#090e19',
    waterShallow: '#283650',
    waterSky: '#3b3242',
    screenLight: 2.9,
    screenTint: '#ffc089',
    coreLight: 2.8,
    coreTint: '#ffb488',
    coreColor: '#ff8447',
    shadowStrength: 0.48,
    exposure: 1.08,
    ink: '#eceee8',
    paper: '#161b26',
    accent: '#f07443',
    accentWarm: '#ffb273',
    night: 0.74,
  },
  {
    t: 1.0,
    key: 'night',
    label: 'midnight',
    status: 'midnight',
    background: '#050810',
    fog: '#070b12',
    skyTop: '#010206',
    skyMid: '#040812',
    skyHorizon: '#09121e',
    sunGlowColor: '#1f2e45',
    cloudColor: '#0e1624',
    cloudStrength: 0.03,
    starOpacity: 1.0,
    fogDensity: 0.024,
    sunColor: '#9db6db',
    sunIntensity: 0.7,
    sunPosition: [7.6, 4.6, -5.2],
    ambientColor: '#1e2b3e',
    ambientIntensity: 0.62,
    hemiSky: '#162131',
    hemiGround: '#05080d',
    hemiIntensity: 0.3,
    waterDeep: '#03060b',
    waterShallow: '#102030',
    waterSky: '#0b1622',
    screenLight: 3.6,
    screenTint: '#ffc089',
    coreLight: 3.3,
    coreTint: '#ffb08a',
    coreColor: '#ff7a3d',
    shadowStrength: 0.5,
    exposure: 1.12,
    ink: '#e9eae4',
    paper: '#0a0d10',
    accent: '#f07443',
    accentWarm: '#ffb273',
    night: 1,
  },
];

const COLOR_KEYS = [
  'background',
  'fog',
  'skyTop',
  'skyMid',
  'skyHorizon',
  'sunGlowColor',
  'cloudColor',
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
  'cloudStrength',
  'starOpacity',
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

export function createAtmosphereState() {
  const state = {
    key: 'day',
    label: 'daylight',
    status: 'daylight',
    t: 0,
    sunPosition: new THREE.Vector3(),
  };
  for (const key of COLOR_KEYS) state[key] = new THREE.Color();
  for (const key of NUMBER_KEYS) state[key] = 0;
  return state;
}

/**
 * Piecewise, 4-stop palette sampling across Daylight -> Dusk -> Twilight -> Midnight.
 */
export function sampleAtmosphere(t, out = createAtmosphereState()) {
  const clamped = THREE.MathUtils.clamp(Number.isFinite(t) ? t : 0, 0, 1);

  let index = 0;
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    if (clamped >= STOPS[i].t) index = i;
  }

  const a = STOPS[index];
  const b = STOPS[Math.min(index + 1, STOPS.length - 1)];
  const span = Math.max(b.t - a.t, 0.0001);
  const local = THREE.MathUtils.clamp((clamped - a.t) / span, 0, 1);
  const eased = smoothstep(local);

  for (const key of COLOR_KEYS) out[key].lerpColors(a[key], b[key], eased);
  for (const key of NUMBER_KEYS) out[key] = THREE.MathUtils.lerp(a[key], b[key], eased);

  out.sunPosition.lerpVectors(a.sunPosition, b.sunPosition, eased);
  const key = (clamped < 0.21 || clamped >= 0.855)
    ? 'night'
    : clamped < 0.36
      ? 'dawn'
      : clamped < 0.70
        ? 'day'
        : 'dusk';
  const labels = { dawn: 'dawn', day: 'daylight', dusk: 'dusk', night: 'midnight' };
  out.key = key;
  out.label = labels[key];
  out.status = out.label;
  out.t = clamped;

  return out;
}

/**
 * Drive the Three.js light rig from the sampled atmosphere and live celestial arc.
 */
export function updateLightRig(lights, atm, celestial) {
  const { sun, ambient, hemi, screen, core } = lights;

  if (celestial) {
    sun.position.copy(celestial.celestialDir).multiplyScalar(14);
  } else {
    sun.position.copy(atm.sunPosition);
  }
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
