import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGlowSprite } from './sky.js';

const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

// One palette, evolved from the original: the desk edge leans a touch more
// towards rust so the warm/cool split against the water reads at night.
const COLORS = {
  deskTop: '#cbb99d',
  deskLip: '#e4d6bb',
  deskEdge: '#8d7259',
  deskUnder: '#6b5a46',
  deskGap: '#2c241d',
  laptopShell: '#d3d6d0',
  laptopLid: '#242a2b',
  keyboard: '#2b312d',
  keyWell: '#161b1a',
  trackpad: '#c2c6bf',
  grille: '#8f948e',
  hinge: '#3a403c',
  mug: '#efe7d8',
  coffee: '#2a1710',
  coaster: '#a38b6b',
  notebookCover: '#37594b',
  notebookSpine: '#2a463b',
  notebookPages: '#e7e0cf',
  notebookBand: '#1c2a24',
  ribbon: '#a2593b',
  pen: '#d9c9a4',
  penTip: '#242a2b',
  penMetal: '#a7aaa4',
};

// The mug holds coffee until the light turns, then rooibos. Interpolated so the
// drink changes over with the sky instead of switching in a single frame.
const COFFEE_LIQUID = new THREE.Color('#2a1710');
const COFFEE_SPECULAR = new THREE.Color('#7a5642');
const ROOIBOS_LIQUID = new THREE.Color('#973715');
const ROOIBOS_SPECULAR = new THREE.Color('#d9854e');

const smoothUnit = (x) => {
  const v = THREE.MathUtils.clamp(x, 0, 1);
  return v * v * (3 - 2 * v);
};

// 0 = coffee, 1 = rooibos. Coffee from dawn through the afternoon, rooibos from
// dusk until the early hours.
function rooibosMix(t) {
  if (!Number.isFinite(t)) return 0;
  if (t < 0.13) return 1;
  if (t < 0.27) return 1 - smoothUnit((t - 0.13) / 0.14);
  if (t < 0.6) return 0;
  if (t < 0.735) return smoothUnit((t - 0.6) / 0.135);
  return 1;
}

// Scale: 1 unit is roughly 37 cm. Desk 1.2 m x 0.63 m, a 13" laptop, an A5
// notebook and a 8 cm mug all follow the same ruler.
const DESK = { w: 2.95, d: 1.7, t: 0.085 };
const TOP = 0.04; // desk surface height in workstation space
const LAYOUT = {
  laptop: { x: -0.24, z: -0.08, ry: 0.06 },
  notebook: { x: -1.04, z: 0.3, ry: 0.24 },
  mug: { x: 0.78, z: 0.34, ry: -0.62 },
  orb: { x: 0.5, y: 0.82, z: -0.16 },
};

// Scratch objects for the per-frame update (no allocations in the loop).
const _color = new THREE.Color();
const _dummy = new THREE.Object3D();

// Terminal screen texture (~9 fps)
export function createTerminalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;

  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const terminal = {
    canvas,
    ctx,
    texture,
    lastDraw: -10,
    lastTier: -1,
  };

  drawTerminal(terminal, 0, 'day');
  texture.needsUpdate = true;

  return terminal;
}

const TIERS = {
  dawn: { idx: 0, glow: 8, accent: '#f3a696', ink: '#f8ebe7', dim: 'rgba(248,214,205,0.44)', status: 'dawn' },
  day: { idx: 1, glow: 0, accent: '#5fd2ae', ink: '#dcf3e8', dim: 'rgba(190,230,216,0.42)', status: 'daylight' },
  dusk: { idx: 2, glow: 12, accent: '#ffb27a', ink: '#ffe9d5', dim: 'rgba(255,214,180,0.44)', status: 'dusk' },
  night: { idx: 3, glow: 18, accent: '#ff9a63', ink: '#fff2e9', dim: 'rgba(255,214,190,0.46)', status: 'midnight' },
};

/* The laptop's screensaver: code rain, with the name stamped into it. */

const RAIN_GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789THIJNKÖHNE<>/[]{}+-=*$'.split('');

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// The word is rasterised once into a dot mask; each redraw only tints that mask
// with the hour's palette. Walking the dot grid every frame would cost more
// than the rest of the screen.
let signatureMask = null;
let signatureMaskKey = '';

function getSignatureMask(w, h) {
  const key = `${w}x${h}`;
  if (signatureMask && signatureMaskKey === key) return signatureMask;

  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mctx = mask.getContext('2d', { willReadFrequently: true });
  mctx.font = `700 104px ${MONO}`;
  if ('letterSpacing' in mctx) mctx.letterSpacing = '16px';
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  mctx.fillStyle = '#ffffff';
  mctx.fillText('THIJN', w / 2 + 8, h / 2 + 2);

  const data = mctx.getImageData(0, 0, w, h).data;

  const dots = document.createElement('canvas');
  dots.width = w;
  dots.height = h;
  const dctx = dots.getContext('2d');
  dctx.fillStyle = '#ffffff';

  const step = 6;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 150) dctx.fillRect(x, y, step - 2, step - 2);
    }
  }

  signatureMask = dots;
  signatureMaskKey = key;
  return signatureMask;
}

const _sigSource = new THREE.Color();
const _sigAccent = new THREE.Color();
const _sigHead = new THREE.Color();
const _sigTrail = new THREE.Color();
const _sigDeep = new THREE.Color();
const _sigWhite = new THREE.Color('#ffffff');

const hexColor = (color) => `#${color.getHexString()}`;
const hexAlpha = (color, alpha) => {
  const a = Math.round(THREE.MathUtils.clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${color.getHexString()}${a}`;
};

// The name wears the hour: mint at noon, coral at dawn, ember after dusk. The
// palette follows the atmosphere continuously, so the time slider moves it too.
function signaturePalette(source) {
  _sigSource.set(source);
  _sigAccent.copy(_sigSource);
  _sigHead.copy(_sigAccent).lerp(_sigWhite, 0.82);
  _sigTrail.copy(_sigAccent).multiplyScalar(0.72);
  _sigDeep.copy(_sigAccent).multiplyScalar(0.085);
  return _sigAccent.getHexString() + _sigHead.getHexString();
}

function getTintedSignature(terminal, w, h, paletteKey) {
  if (!terminal.signatureCanvas || terminal.signatureCanvas.width !== w) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    terminal.signatureCanvas = canvas;
    terminal.signatureCtx = canvas.getContext('2d');
    terminal.signatureKey = '';
  }
  if (terminal.signatureKey === paletteKey) return terminal.signatureCanvas;

  terminal.signatureKey = paletteKey;
  const ctx = terminal.signatureCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, h * 0.28, 0, h * 0.74);
  gradient.addColorStop(0, hexColor(_sigHead));
  gradient.addColorStop(0.42, hexColor(_sigAccent));
  gradient.addColorStop(1, hexColor(_sigTrail));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(getSignatureMask(w, h), 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return terminal.signatureCanvas;
}

function drawSignature(terminal, elapsed, paletteKey, tier) {
  const { ctx, canvas } = terminal;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = hexColor(_sigDeep);
  ctx.fillRect(0, 32, w, h - 32);

  // Falling columns; each head drags a short tail of glyphs behind it.
  const cellW = 22;
  const cellH = 16;
  const rows = Math.floor((h - 42) / cellH);
  const tick = Math.floor(elapsed * 6);
  ctx.font = `500 13px ${MONO}`;
  ctx.textAlign = 'center';
  for (let c = 0; c < Math.floor(w / cellW); c += 1) {
    const span = rows + 9;
    const head = ((elapsed * (5 + hash2(c, 3) * 9) + hash2(c, 7) * span) % span) - 4;
    const first = Math.max(0, Math.floor(head) - 7);
    const last = Math.min(rows - 1, Math.floor(head));
    for (let r = first; r <= last; r += 1) {
      const behind = head - r;
      if (behind < 0) continue;
      const glyph = RAIN_GLYPHS[Math.floor(hash2(c * 5.3, r + tick) * 1000) % RAIN_GLYPHS.length];
      ctx.fillStyle = behind < 1
        ? hexColor(_sigHead)
        : hexAlpha(_sigTrail, 0.5 * (1 - behind / 7));
      ctx.fillText(glyph, c * cellW + cellW / 2, 40 + r * cellH);
    }
  }

  // Dot-matrix name: a soft bloom pass, then the crisp dots on top.
  const stamp = getTintedSignature(terminal, w, h, paletteKey);
  ctx.save();
  ctx.shadowColor = hexColor(_sigAccent);
  ctx.shadowBlur = 18;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(stamp, 0, 0);
  ctx.restore();
  ctx.drawImage(stamp, 0, 0);

  ctx.fillStyle = hexColor(_sigAccent);
  ctx.globalAlpha = 0.8;
  ctx.fillRect(w / 2 - 58, h - 48, 116, 2);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = `400 12px ${MONO}`;
  ctx.fillStyle = tier.dim;
  ctx.fillText('local-first · 4 projects', w / 2, h - 26);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let sy = 32; sy < h; sy += 4) ctx.fillRect(0, sy, w, 1);
}

function drawTerminal(terminal, elapsed, phaseKey = 'day', atm = null) {
  const { ctx, canvas } = terminal;
  const w = canvas.width;
  const h = canvas.height;

  const tier = TIERS[phaseKey] || TIERS.day;
  const { glow, accent, ink, dim, status } = tier;
  const signatureKey = signaturePalette(atm ? atm.coreColor : accent);
  const dots = '.'.repeat(1 + (Math.floor(elapsed * 2) % 3));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';

  // Phosphor-dark terminal body; the signature screen is tinted with the hour.
  ctx.fillStyle = '#071712';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = terminal.signature ? hexColor(_sigDeep) : '#0c241d';
  ctx.fillRect(0, 0, w, 32);

  // Window dots.
  const dotsColors = ['#ff7a6b', '#ffc66b', '#63d7b4'];
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(18 + i * 15, 16, 4, 0, Math.PI * 2);
    ctx.fillStyle = dotsColors[i];
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = dim;
  ctx.fillText('thijn@dev  ~/projects', 72, 20);

  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ctx.fillText(clock, w - 54, 20);

  // The laptop answers a click with the name instead of the build log.
  if (terminal.signature) {
    drawSignature(terminal, elapsed, signatureKey, tier);
    return;
  }

  // Accent rail down the left edge.
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = accent;
  ctx.fillRect(20, 52, 2, h - 92);
  ctx.globalAlpha = 1;

  ctx.font = `500 16px ${MONO}`;
  let y = 84;

  ctx.fillStyle = accent;
  ctx.fillText('>', 34, y);
  ctx.fillStyle = ink;
  ctx.fillText(`building${dots}`, 54, y);

  y += 31;
  ctx.font = `400 12px ${MONO}`;
  ctx.fillStyle = dim;
  ctx.fillText('dither-studio · cortex · w3plan · papersplease', 34, y);

  y += 52;
  ctx.font = `500 14px ${MONO}`;
  ctx.fillStyle = dim;
  ctx.fillText('> light:', 34, y);

  y += 34;
  ctx.font = `600 27px ${MONO}`;
  ctx.fillStyle = accent;
  if (glow > 0) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = glow;
  }
  ctx.fillText(status, 34, y);
  ctx.shadowBlur = 0;

  y += 44;
  const barWidth = 176;
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(34, y, barWidth, 5);
  const progress = 0.28 + 0.68 * ((elapsed * 0.055) % 1);
  ctx.fillStyle = accent;
  ctx.fillRect(34, y, barWidth * progress, 5);

  ctx.font = `400 10.5px ${MONO}`;
  ctx.fillStyle = dim;
  ctx.fillText('build', 34, y - 9);
  ctx.fillText(`${Math.round(progress * 100)}%`, 34 + barWidth + 12, y + 5);

  // Subtle live telemetry activity bars on the right side of the terminal.
  const barX = 324;
  for (let b = 0; b < 8; b += 1) {
    const amp = 0.25 + 0.75 * Math.abs(Math.sin(elapsed * 2.1 + b * 0.85));
    const bh = Math.round(amp * 18);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.22 + amp * 0.48;
    ctx.fillRect(barX + b * 11, y + 5 - bh, 6, bh);
  }
  ctx.globalAlpha = 1;

  y += 42;
  ctx.fillStyle = accent;
  ctx.globalAlpha = Math.floor(elapsed * 1.8) % 2 === 0 ? 0.95 : 0.12;
  ctx.fillRect(34, y - 13, 9, 16);
  ctx.globalAlpha = 1;
  ctx.font = `400 11.5px ${MONO}`;
  ctx.fillStyle = dim;
  ctx.fillText('local-first · 4 projects', 52, y);

  // Print-style scanlines, drawn last so the screen feels physical.
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let sy = 0; sy < h; sy += 4) ctx.fillRect(0, sy, w, 1);

  // Slight top shading.
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(0,0,0,0.24)');
  gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

// Throttled to ~9 fps so cursor/progress feels live without 60 fps texture uploads.
export function updateTerminalTexture(terminal, elapsed, atm = null) {
  const phaseKey = (atm && atm.key) || 'day';
  const tier = (TIERS[phaseKey] || TIERS.day).idx;
  const signature = Boolean(terminal.signature);
  const signatureKey = signature
    ? signaturePalette(atm ? atm.coreColor : TIERS[phaseKey].accent)
    : '';
  const due =
    elapsed - terminal.lastDraw > 1 / 9 ||
    tier !== terminal.lastTier ||
    signature !== terminal.lastSignature ||
    signatureKey !== terminal.lastSignatureKey;
  if (!due) return;

  terminal.lastDraw = elapsed;
  terminal.lastTier = tier;
  terminal.lastSignature = signature;
  terminal.lastSignatureKey = signatureKey;
  drawTerminal(terminal, elapsed, phaseKey, atm);
  terminal.texture.needsUpdate = true;
}

/* Generated textures (created once per workstation, disposed with it) */

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Broad, low-frequency grain: anything finer would only fight the dither.
function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f2ec';
  ctx.fillRect(0, 0, 256, 128);

  const rand = seededRandom(11);
  for (let i = 0; i < 26; i += 1) {
    const y = rand() * 128;
    const amp = 1.5 + rand() * 4;
    const freq = 1 + Math.floor(rand() * 2);
    const dark = rand() > 0.42;
    ctx.strokeStyle = dark
      ? `rgba(118,92,64,${0.05 + rand() * 0.09})`
      : `rgba(255,255,255,${0.08 + rand() * 0.1})`;
    ctx.lineWidth = 1.5 + rand() * 5;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + Math.sin((x / 256) * Math.PI * 2 * freq + i * 1.7) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// White radial falloff: the alpha source for contact decals and light spill.
function createRadialTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.62)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Page layers on the notebook's block edge.
function createPageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(120,108,88,0.22)';
  for (let y = 3; y < 32; y += 6) ctx.fillRect(0, y, 32, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* The notebook's first page: the Antigravity mark, drawn on the paper. */

// The open "A" of the Antigravity mark, traced at 640 x 640.
const ANTIGRAVITY_PATH = `
  M 28 594
  C 12 606 16 620 34 626
  C 66 636 104 624 132 600
  C 162 580 186 538 208 490
  C 230 428 260 390 294 370
  C 320 356 346 360 370 380
  C 396 404 416 444 434 482
  C 452 520 470 556 488 580
  C 510 614 552 630 584 620
  C 608 612 624 600 618 580
  C 600 548 578 514 558 474
  C 534 424 512 366 494 310
  C 474 248 456 186 436 134
  C 414 82 382 38 344 20
  C 324 11 306 11 290 11
  C 250 11 222 50 206 108
  C 186 168 174 238 160 300
  C 142 374 118 452 92 506
  C 74 548 50 578 26 600
  Z
`;

function drawAntigravityMark(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  // A hair off-square, like it was placed by hand.
  ctx.rotate(-0.028);
  ctx.scale(size / 640, size / 640);
  ctx.translate(-320, -320);
  ctx.clip(new Path2D(ANTIGRAVITY_PATH));

  const wash = ctx.createLinearGradient(190, 0, 390, 640);
  wash.addColorStop(0, '#a8c85c');
  wash.addColorStop(0.34, '#7cc07a');
  wash.addColorStop(0.62, '#5d9ad8');
  wash.addColorStop(1, '#3f7dcb');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 640, 640);

  const blobs = [
    [226, 118, 170, '#cbd250', 0.95],
    [372, 78, 150, '#e4643f', 0.95],
    [452, 208, 150, '#b25a86', 0.72],
    [330, 380, 210, '#3f7fd2', 0.85],
    [54, 566, 100, '#d2e8f7', 0.85],
    [586, 548, 105, '#d2e8f7', 0.8],
  ];
  for (const [x, y, r, color, alpha] of blobs) {
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, color);
    blob.addColorStop(1, `${color}00`);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, 640, 640);
  }

  ctx.restore();
}

function createNotebookPageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f2ebdb';
  ctx.fillRect(0, 0, 512, 720);

  // Gutter shadow along the spine, then a soft vignette: the page is not a plane.
  const gutter = ctx.createLinearGradient(0, 0, 64, 0);
  gutter.addColorStop(0, 'rgba(112,92,64,0.24)');
  gutter.addColorStop(1, 'rgba(112,92,64,0)');
  ctx.fillStyle = gutter;
  ctx.fillRect(0, 0, 64, 720);

  const vignette = ctx.createRadialGradient(250, 360, 130, 250, 360, 560);
  vignette.addColorStop(0, 'rgba(255,255,255,0.12)');
  vignette.addColorStop(1, 'rgba(104,84,58,0.16)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 512, 720);

  drawAntigravityMark(ctx, 236, 300, 318);

  // Paper grain: sparse specks so the ink and the page share one surface.
  const rand = seededRandom(23);
  for (let i = 0; i < 2600; i += 1) {
    const x = rand() * 512;
    const y = rand() * 720;
    ctx.fillStyle = rand() > 0.45
      ? `rgba(255,255,255,${(0.05 + rand() * 0.1).toFixed(3)})`
      : `rgba(104,88,62,${(0.03 + rand() * 0.06).toFixed(3)})`;
    ctx.fillRect(x, y, 1 + rand() * 1.6, 1 + rand() * 1.4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* Geometry helpers */

function paint(geometry, hex) {
  const color = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function place(geometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  _dummy.position.set(x, y, z);
  _dummy.rotation.set(rx, ry, rz);
  _dummy.scale.set(1, 1, 1);
  _dummy.updateMatrix();
  geometry.applyMatrix4(_dummy.matrix);
  return geometry;
}

function merge(parts) {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

// Zero-cost hit proxy: never drawn (material.visible = false) but still raycast,
// so small props get a generous, honest click target.
function createHitProxy(geometry, hitMat) {
  const mesh = new THREE.Mesh(geometry, hitMat);
  mesh.userData.hitProxy = true;
  return mesh;
}

/* Procedural models */

function paintDeskSlab(geometry) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const top = new THREE.Color(COLORS.deskTop);
  const lip = new THREE.Color(COLORS.deskLip);
  const edge = new THREE.Color(COLORS.deskEdge);
  const under = new THREE.Color(COLORS.deskUnder);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const ny = nor.getY(i);
    const y = pos.getY(i);
    if (ny > 0.94) c.copy(top);
    else if (ny > 0.2) c.copy(lip); // bevel catches light: the bright front edge
    else if (ny > -0.35) c.copy(edge).lerp(under, THREE.MathUtils.clamp(0.5 - y / DESK.t, 0, 1) * 0.6);
    else c.copy(under);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function createDesk(textures) {
  const desk = new THREE.Group();

  // Lambert is plenty for matte wood under a dither pass, and far cheaper than PBR.
  const slabGeo = new RoundedBoxGeometry(DESK.w, DESK.t, DESK.d, 4, 0.024);
  paintDeskSlab(slabGeo);
  const slabMat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    vertexColors: true,
    map: textures.wood,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = TOP - DESK.t / 2;
  desk.add(slab);

  // Recessed apron: the shadow gap that makes the top read thin and floating.
  const apronMat = new THREE.MeshLambertMaterial({ color: COLORS.deskGap });
  const apron = new THREE.Mesh(
    new RoundedBoxGeometry(DESK.w - 0.24, 0.075, DESK.d - 0.26, 2, 0.02),
    apronMat,
  );
  apron.position.y = TOP - DESK.t - 0.032;
  desk.add(apron);

  const plane = new THREE.PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);

  // Soft contact shadows under each prop: one instanced draw.
  const aoMat = new THREE.MeshBasicMaterial({
    color: '#000000',
    map: textures.radial,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const ao = new THREE.InstancedMesh(plane, aoMat, 3);
  const L = LAYOUT;
  const aoSpecs = [
    [L.laptop.x, L.laptop.z + 0.02, L.laptop.ry, 1.25, 0.95],
    [L.mug.x, L.mug.z, 0, 0.5, 0.5],
    [L.notebook.x, L.notebook.z, L.notebook.ry, 0.62, 0.82],
  ];
  aoSpecs.forEach(([x, z, ry, sx, sz], i) => {
    _dummy.position.set(x, TOP + 0.0015, z);
    _dummy.rotation.set(0, ry, 0);
    _dummy.scale.set(sx, 1, sz);
    _dummy.updateMatrix();
    ao.setMatrixAt(i, _dummy.matrix);
  });
  ao.instanceMatrix.needsUpdate = true;
  ao.renderOrder = 1;
  desk.add(ao);

  // Light spill: the screen's cool pool and the orb's warm one, additive, one draw.
  const spillMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    map: textures.radial,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const spill = new THREE.InstancedMesh(plane, spillMat, 2);
  const spillSpecs = [
    [L.laptop.x + 0.04, L.laptop.z + 0.42, L.laptop.ry, 1.9, 1.35],
    [L.orb.x, L.orb.z, 0, 1.45, 1.45],
  ];
  spillSpecs.forEach(([x, z, ry, sx, sz], i) => {
    _dummy.position.set(x, TOP + 0.002, z);
    _dummy.rotation.set(0, ry, 0);
    _dummy.scale.set(sx, 1, sz);
    _dummy.updateMatrix();
    spill.setMatrixAt(i, _dummy.matrix);
    spill.setColorAt(i, _color.setRGB(0, 0, 0));
  });
  spill.instanceMatrix.needsUpdate = true;
  spill.renderOrder = 2;
  desk.add(spill);

  return { desk, spill };
}

function createLaptop(terminal, detailMat, textures) {
  const laptop = new THREE.Group();
  laptop.position.set(LAYOUT.laptop.x, TOP, LAYOUT.laptop.z);
  laptop.rotation.y = LAYOUT.laptop.ry;

  const W = 0.86;
  const D = 0.6;
  const H = 0.026;
  const deckY = H + 0.0005;
  const wellZ = -0.085;

  // Aluminium: a broad, soft Phong highlight stands in for a clearcoat.
  const shellMat = new THREE.MeshPhongMaterial({
    color: COLORS.laptopShell,
    specular: '#7d837e',
    shininess: 58,
  });
  const keyMat = new THREE.MeshPhongMaterial({
    color: COLORS.keyboard,
    specular: '#3a403c',
    shininess: 24,
  });

  const base = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 3, 0.009), shellMat);
  base.position.y = H / 2;
  laptop.add(base);

  // Key well, trackpad, speaker grilles, vent and hinge: one vertex-coloured draw.
  const deck = new THREE.Mesh(
    merge([
      place(paint(new THREE.BoxGeometry(0.74, 0.0012, 0.29), COLORS.keyWell), 0, deckY, wellZ),
      place(paint(new THREE.BoxGeometry(0.27, 0.0012, 0.158), COLORS.trackpad), 0, deckY, 0.172),
      place(paint(new THREE.BoxGeometry(0.032, 0.0012, 0.27), COLORS.grille), -0.398, deckY, wellZ),
      place(paint(new THREE.BoxGeometry(0.032, 0.0012, 0.27), COLORS.grille), 0.398, deckY, wellZ),
      place(paint(new THREE.BoxGeometry(0.1, 0.004, 0.004), COLORS.keyWell), 0, H * 0.55, D / 2 + 0.0005),
      place(
        paint(new THREE.CylinderGeometry(0.0115, 0.0115, 0.74, 12), COLORS.hinge),
        0, 0.018, -D / 2 + 0.004, 0, 0, Math.PI / 2,
      ),
    ]),
    detailMat,
  );
  laptop.add(deck);

  // Keys sit in the well with visible gaps; 5 rows, spacebar row included.
  const pitchX = 0.74 / 13.4;
  const pitchZ = 0.054;
  const keyGeo = new RoundedBoxGeometry(0.044, 0.0045, 0.042, 1, 0.0016);
  const rows = [
    new Array(13).fill(1),
    new Array(13).fill(1),
    new Array(13).fill(1),
    new Array(13).fill(1),
    [1, 1, 1.5, 6, 1.5, 1, 1],
  ];
  const keyCount = rows.reduce((sum, row) => sum + row.length, 0);
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, keyCount);
  let keyIndex = 0;
  const rowWidth = 13 * pitchX;
  rows.forEach((row, r) => {
    let cursor = -rowWidth / 2;
    for (const units of row) {
      const width = units * pitchX;
      _dummy.position.set(cursor + width / 2, deckY + 0.0028, wellZ + (r - 2) * pitchZ);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set((width - 0.011) / 0.044, 1, r === 0 ? 0.62 : 1);
      _dummy.updateMatrix();
      keys.setMatrixAt(keyIndex, _dummy.matrix);
      keyIndex += 1;
      cursor += width;
    }
  });
  keys.instanceMatrix.needsUpdate = true;
  laptop.add(keys);

  // Backlight seam between keyboard and hinge (the original accent strip).
  const glowMat = new THREE.MeshBasicMaterial({ color: '#5fd2ae' });
  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.0014, 0.0045), glowMat);
  glowStrip.position.set(0, deckY + 0.0004, -0.255);
  laptop.add(glowStrip);

  // Display lid, opened to ~107 degrees around the hinge axis.
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.019, -D / 2 + 0.004);
  lidPivot.rotation.x = -0.3;
  laptop.add(lidPivot);

  const LW = W;
  const LH = 0.57;
  const LT = 0.011;
  const lidY = LH / 2 + 0.004;

  const lid = new THREE.Mesh(new RoundedBoxGeometry(LW, LH, LT, 3, 0.005), shellMat);
  lid.position.y = lidY;
  lidPivot.add(lid);

  // Glass bezel inset from the aluminium rim, so the lid has a lip.
  const bezelMat = new THREE.MeshPhongMaterial({
    color: '#0b100f',
    specular: '#59605d',
    shininess: 90,
  });
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.014, LH - 0.014), bezelMat);
  bezel.position.set(0, lidY, LT / 2 + 0.0006);
  lidPivot.add(bezel);

  const screenMat = new THREE.MeshBasicMaterial({
    map: terminal.texture,
    toneMapped: true,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.775, 0.484), screenMat);
  screen.position.set(0, lidY + 0.012, LT / 2 + 0.0013);
  lidPivot.add(screen);

  // A broad, low-opacity halo behind the lid: the screen spills light around
  // the bezel at night without becoming a bright rectangle. It lies in the lid
  // plane on purpose: a camera-facing sprite tilts into the panel and cuts a
  // hard diagonal across the screen at most view angles.
  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.9),
    new THREE.MeshBasicMaterial({
      color: '#ffc48a',
      map: textures.radial,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  screenGlow.position.set(0, lidY, -0.06);
  lidPivot.add(screenGlow);

  // Anchor used to aim the screen point light and the prompt particles.
  const screenAnchor = new THREE.Object3D();
  screenAnchor.position.set(0, lidY, 0.2);
  lidPivot.add(screenAnchor);

  const keyboardAnchor = new THREE.Object3D();
  keyboardAnchor.position.set(0, 0.05, -0.04);
  laptop.add(keyboardAnchor);

  return { laptop, screenMat, glowMat, screenAnchor, keyboardAnchor, lidPivot, screenGlow };
}

function createMug(hitMat) {
  const mug = new THREE.Group();
  mug.position.set(LAYOUT.mug.x, TOP, LAYOUT.mug.z);

  const coasterMat = new THREE.MeshLambertMaterial({ color: COLORS.coaster });
  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.155, 0.01, 40), coasterMat);
  coaster.position.y = 0.005;
  mug.add(coaster);

  const body = new THREE.Group();
  body.position.y = 0.01;
  body.rotation.y = LAYOUT.mug.ry;
  mug.add(body);

  // Lathe profile: foot chamfer, a gentle taper, a rounded rim and a real wall.
  const profile = [
    [0.0001, 0.0], [0.086, 0.0], [0.095, 0.008], [0.099, 0.04],
    [0.104, 0.14], [0.108, 0.226], [0.107, 0.236], [0.103, 0.24],
    [0.098, 0.236], [0.096, 0.21], [0.092, 0.06], [0.082, 0.03], [0.0001, 0.026],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = new THREE.LatheGeometry(profile, 44);

  const arc = Math.PI * 1.22;
  const handle = new THREE.TorusGeometry(0.056, 0.0135, 10, 26, arc);
  handle.rotateZ(-arc / 2);
  handle.translate(0.128, 0.128, 0);

  // Glazed ceramic: soft, wide specular.
  const mugMat = new THREE.MeshPhongMaterial({
    color: COLORS.mug,
    specular: '#5d5a54',
    shininess: 46,
  });
  const shell = new THREE.Mesh(merge([lathe, handle]), mugMat);
  body.add(shell);

  const coffeeMat = new THREE.MeshPhongMaterial({
    color: COLORS.coffee,
    specular: '#7a5642',
    shininess: 110,
  });
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0955, 36), coffeeMat);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.198;
  body.add(coffee);

  const hit = createHitProxy(new THREE.CylinderGeometry(0.175, 0.175, 0.34, 12), hitMat);
  hit.position.y = 0.17;
  mug.add(hit);

  const steamAnchor = new THREE.Object3D();
  steamAnchor.position.set(0, 0.205, 0);
  body.add(steamAnchor);

  return { mug, steamAnchor, coffeeMat };
}

function createNotebookAndPen(textures, detailMat, hitMat) {
  const group = new THREE.Group();
  group.position.set(LAYOUT.notebook.x, TOP, LAYOUT.notebook.z);
  group.rotation.y = LAYOUT.notebook.ry;

  const NW = 0.42;
  const ND = 0.58;

  const coverMat = new THREE.MeshLambertMaterial({ color: COLORS.notebookCover });

  const back = new THREE.Mesh(
    place(new RoundedBoxGeometry(NW, 0.006, ND, 2, 0.0025), 0, 0.003, 0),
    coverMat,
  );
  group.add(back);

  // The lid and its elastic share a hinge on the spine, so a click can swing
  // the whole cover open instead of sliding a flat panel sideways.
  const hinge = new THREE.Group();
  hinge.position.set(-NW / 2 + 0.004, 0.042, 0);
  group.add(hinge);

  const front = new THREE.Mesh(
    place(new RoundedBoxGeometry(NW, 0.006, ND, 2, 0.0025), NW / 2 - 0.004, -0.003, 0),
    coverMat,
  );
  hinge.add(front);

  const pagesMat = new THREE.MeshLambertMaterial({
    color: COLORS.notebookPages,
    map: textures.pages,
  });
  const pages = new THREE.Mesh(new RoundedBoxGeometry(NW - 0.016, 0.031, ND - 0.014, 1, 0.003), pagesMat);
  pages.position.set(0.006, 0.0215, 0);
  group.add(pages);

  // The first page only exists once the cover is open. It fades in with the lid
  // and carries the Antigravity mark, so a closed book shows nothing odd.
  const pageMat = new THREE.MeshLambertMaterial({
    map: textures.notebookPage,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pageGeometry = new THREE.PlaneGeometry(NW - 0.026, ND - 0.026);
  pageGeometry.rotateX(-Math.PI / 2);
  const page = new THREE.Mesh(pageGeometry, pageMat);
  page.position.set(0.006, 0.0373, 0);
  page.renderOrder = 1;
  page.visible = false;
  group.add(page);

  // Spine, elastic band and the ribbon marker hanging over the front edge.
  const details = new THREE.Mesh(
    merge([
      place(
        paint(new THREE.CylinderGeometry(0.0215, 0.0215, ND, 16), COLORS.notebookSpine),
        -NW / 2 + 0.004, 0.0215, 0, Math.PI / 2, 0, 0,
      ),
      place(paint(new THREE.BoxGeometry(0.014, 0.0446, ND + 0.004), COLORS.notebookBand), NW / 2 - 0.05, 0.0215, 0),
      place(paint(new THREE.BoxGeometry(0.013, 0.0016, 0.08), COLORS.ribbon), 0.07, 0.011, ND / 2 + 0.036, 0.24, 0.12, 0),
    ]),
    detailMat,
  );
  group.add(details);

  // The pen lies on the desk just beside the book's long edge, flat and still,
  // aligned with the cover, the way it was set down after the last note.
  const pen = new THREE.Group();
  pen.position.set(NW / 2 + 0.19, 0.0086, 0.09);
  pen.rotation.y = 0.25;

  // A soft contact shadow grounds the pen the same way the prop decals do.
  const penShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.1),
    new THREE.MeshBasicMaterial({
      color: '#000000',
      map: textures.radial,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  penShadow.rotation.x = -Math.PI / 2;
  penShadow.position.y = -0.0068;
  pen.add(penShadow);
  const barrelMat = new THREE.MeshPhongMaterial({ color: COLORS.pen, specular: '#6c6455', shininess: 52 });
  const barrel = new THREE.Mesh(
    place(new THREE.CylinderGeometry(0.0085, 0.0085, 0.3, 14), 0, 0, 0, 0, 0, Math.PI / 2),
    barrelMat,
  );
  pen.add(barrel);
  const penParts = new THREE.Mesh(
    merge([
      place(paint(new THREE.ConeGeometry(0.0085, 0.04, 14), COLORS.penTip), 0.17, 0, 0, 0, 0, -Math.PI / 2),
      place(paint(new THREE.CylinderGeometry(0.0089, 0.0089, 0.05, 14), COLORS.penTip), -0.165, 0, 0, 0, 0, Math.PI / 2),
      place(paint(new THREE.CylinderGeometry(0.0092, 0.0092, 0.008, 14), COLORS.penMetal), -0.136, 0, 0, 0, 0, Math.PI / 2),
      place(paint(new THREE.BoxGeometry(0.085, 0.0028, 0.0042), COLORS.penMetal), -0.13, 0.0098, 0),
    ]),
    detailMat,
  );
  pen.add(penParts);
  group.add(pen);

  // A generous, invisible target: the book is small and nearly flat on the desk.
  const hit = createHitProxy(new THREE.BoxGeometry(NW + 0.08, 0.16, ND + 0.08), hitMat);
  hit.position.set(0, 0.07, 0);
  group.add(hit);

  return { notebook: group, hinge, page };
}

/* Orb: faceted core, fresnel glass shell, comet rings, satellites, halos */

const SHELL_VERTEX = /* glsl */ `
  varying vec3 vViewPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const SHELL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vViewPos;
  void main() {
    // Flat facet normals from screen derivatives: a cut-crystal shell.
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    vec3 v = normalize(-vViewPos);
    float facing = abs(dot(n, v));
    float rim = pow(1.0 - facing, 2.8);
    float glint = pow(max(dot(n, normalize(vec3(-0.35, 0.75, 0.55))), 0.0), 34.0);
    vec3 col = uColor * (0.02 + rim * 0.7) + vec3(glint * 0.28);
    gl_FragColor = vec4(col, uIntensity);
  }
`;

const RING_VERTEX = /* glsl */ `
  varying float vU;
  void main() {
    vU = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTrail;
  uniform float uBase;
  varying float vU;
  void main() {
    // Bright head at u = 1, an exponential tail behind it.
    float head = exp(-uTrail * (1.0 - vU));
    float alpha = uOpacity * (uBase + (1.0 - uBase) * head);
    gl_FragColor = vec4(uColor * (0.82 + 0.35 * head), alpha);
  }
`;

const GLINT_VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (26.0 / max(-mv.z, 0.1));
    gl_Position = projectionMatrix * mv;
  }
`;

const GLINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float g = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, g * g * vAlpha);
  }
`;

function createCometRing(radius, tube) {
  const geometry = new THREE.TorusGeometry(radius, tube, 6, 150);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const u = uv.getX(i) * Math.PI * 2;
    const cx = Math.cos(u) * radius;
    const cy = Math.sin(u) * radius;
    const tail = 1 - uv.getX(i);
    const s = 0.45 + 0.55 * Math.exp(-1.9 * tail);
    pos.setXYZ(i, cx + (pos.getX(i) - cx) * s, cy + (pos.getY(i) - cy) * s, pos.getZ(i) * s);
  }
  pos.needsUpdate = true;

  const uniforms = {
    uColor: { value: new THREE.Color('#9ff0d6') },
    uOpacity: { value: 0.6 },
    uTrail: { value: 5 },
    uBase: { value: 0.82 },
  };
  // Normal blending, not additive: an additive ring disappears against the
  // near-white daylight sky, and these rings have to read at every hour.
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  return { mesh: new THREE.Mesh(geometry, material), uniforms, material };
}

const RING_TILT_A = [1.08, 0.12, 0.38];
const RING_TILT_B = [-1.02, -0.42, -0.5];

export function createGeometricCore(hitMat = new THREE.MeshBasicMaterial({ visible: false })) {
  const group = new THREE.Group();
  group.position.set(LAYOUT.orb.x, LAYOUT.orb.y, LAYOUT.orb.z);

  const coreGeo = new THREE.IcosahedronGeometry(0.135, 0);
  const coreMat = new THREE.MeshPhongMaterial({
    color: '#146b58',
    emissive: '#5fd2ae',
    emissiveIntensity: 1.1,
    specular: '#ffffff',
    shininess: 90,
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const edgesMat = new THREE.LineBasicMaterial({
    color: '#b6ffe9',
    transparent: true,
    opacity: 0.3,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), edgesMat);
  core.add(edges);

  const shellUniforms = {
    uColor: { value: new THREE.Color('#b6ffe9') },
    uIntensity: { value: 0.5 },
  };
  const shellMat = new THREE.ShaderMaterial({
    uniforms: shellUniforms,
    vertexShader: SHELL_VERTEX,
    fragmentShader: SHELL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), shellMat);
  group.add(shell);

  const ringPartsA = createCometRing(0.3, 0.012);
  const ringA = new THREE.Group();
  ringA.rotation.set(...RING_TILT_A);
  ringA.add(ringPartsA.mesh);
  group.add(ringA);

  const ringPartsB = createCometRing(0.385, 0.0095);
  const ringB = new THREE.Group();
  ringB.rotation.set(...RING_TILT_B);
  ringB.add(ringPartsB.mesh);
  group.add(ringB);

  // Layered halo: a broad, quiet outer bloom and a tighter warm one.
  const glow = createGlowSprite({ color: '#7cf7d9', size: 1.15, opacity: 0.08 });
  group.add(glow);
  const glowInner = createGlowSprite({ color: '#7cf7d9', size: 0.38, opacity: 0.16 });
  group.add(glowInner);

  // Three orbiting micro-octahedra, one instanced draw.
  const satelliteMat = new THREE.MeshBasicMaterial({ color: '#c9fff1' });
  const satellites = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.019, 0), satelliteMat, 3);
  satellites.frustumCulled = false;
  group.add(satellites);

  const hit = createHitProxy(new THREE.SphereGeometry(0.42, 14, 10), hitMat);
  group.add(hit);

  const coreAnchor = new THREE.Object3D();
  group.add(coreAnchor);

  return {
    group,
    core,
    edgesMat,
    shell,
    shellUniforms,
    ringA,
    ringB,
    ringSpinA: ringPartsA.mesh,
    ringSpinB: ringPartsB.mesh,
    ringUniformsA: ringPartsA.uniforms,
    ringUniformsB: ringPartsB.uniforms,
    satellites,
    satelliteMat,
    coreMat,
    coreAnchor,
    glow,
    glowInner,
    baseY: group.position.y,
  };
}

// Satellite glints plus a few dust motes in the screen light: one points draw.
const MOTE_COUNT = 4;
function createGlints(pixelRatio) {
  const count = 3 + MOTE_COUNT;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) sizes[i] = i < 3 ? 2.4 : 0.9;
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#ffd2b0') },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: GLINT_VERTEX,
    fragmentShader: GLINT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, positions, alphas, material, geometry };
}

/* Assembly & per-frame update */

export function createWorkstationGroup({ pixelRatio = 1 } = {}) {
  const group = new THREE.Group();
  group.position.y = 1.02;

  const textures = {
    wood: createWoodTexture(),
    radial: createRadialTexture(),
    pages: createPageTexture(),
    notebookPage: createNotebookPageTexture(),
  };
  const detailMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  const terminal = createTerminalTexture();
  const deskParts = createDesk(textures);
  const laptopParts = createLaptop(terminal, detailMat, textures);
  const mugParts = createMug(hitMat);
  const notebookParts = createNotebookAndPen(textures, detailMat, hitMat);
  const coreParts = createGeometricCore(hitMat);
  const glints = createGlints(pixelRatio);

  group.add(
    deskParts.desk,
    laptopParts.laptop,
    mugParts.mug,
    notebookParts.notebook,
    coreParts.group,
    glints.points,
  );

  // Resolve anchors through the real transforms (the props are rotated).
  group.updateMatrixWorld(true);
  const toLocal = (object) => group.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
  const keyboardLocal = toLocal(laptopParts.keyboardAnchor);
  const steamLocal = toLocal(mugParts.steamAnchor);
  const screenLocal = toLocal(laptopParts.screenAnchor);

  // Which part of the scene answers a click, found by walking up from the hit mesh.
  coreParts.group.userData.interactive = 'orb';
  mugParts.mug.userData.interactive = 'mug';
  laptopParts.laptop.userData.interactive = 'laptop';
  notebookParts.notebook.userData.interactive = 'notebook';

  const workstation = {
    group,
    terminal,
    desk: deskParts.desk,
    spill: deskParts.spill,
    core: coreParts,
    glints,
    textures,
    notebook: notebookParts.notebook,
    notebookHinge: notebookParts.hinge,
    notebookPage: notebookParts.page,
    coffeeMat: mugParts.coffeeMat,
    interact: { ringClicks: 0, steamClicks: 0, signature: false, notebookOpen: false },
    screenAnchor: laptopParts.screenAnchor,
    screenMat: laptopParts.screenMat,
    screenGlow: laptopParts.screenGlow,
    glowMat: laptopParts.glowMat,
    screenMesh: laptopParts.laptop,
    baseY: group.position.y,
    localPoints: {
      keyboard: keyboardLocal,
      core: coreParts.group.position.clone(),
      steam: steamLocal,
      screen: screenLocal,
    },
    anim: {
      coreAngle: 0,
      innerAngle: 0,
      ringAngleA: 0.2,
      ringAngleB: 0.75,
      ringOrbitA: 0.4,
      ringOrbitB: 2.1,
      orbitAngle: 0,
      notebookOpen: 0,
    },
    pixelRatio,
  };

  return workstation;
}

// Satellites ride the ring paths, not loose curves, so the particles and their
// paths move as one system.
const RING_SATELLITES = [
  { ring: 'a', radius: 0.3, offset: 0 },
  { ring: 'b', radius: 0.385, offset: 1.15 },
  { ring: 'a', radius: 0.3, offset: Math.PI * 1.06 },
];
const _sat = new THREE.Vector3();

const MOTE_SEEDS = [
  [-0.62, 0.34, 0.34, 0.3],
  [-0.18, 0.52, 0.22, 1.9],
  [-0.4, 0.66, 0.46, 3.4],
  [0.05, 0.3, 0.4, 4.8],
];

export function updateWorkstation(workstation, elapsed, deltaTime, timeOfDay, atm, pointer) {
  const { group, core, terminal, screenMat, glowMat, anim, spill, glints } = workstation;
  const dt = Math.min(Math.max(deltaTime || 0, 0), 0.05);
  const night = timeOfDay;

  // The mug changes with the hour: coffee in the morning and at midday,
  // rooibos from dusk on. It blends with the sky instead of snapping.
  const tea = rooibosMix(atm ? atm.t : 0.5);
  workstation.coffeeMat.color.lerpColors(COFFEE_LIQUID, ROOIBOS_LIQUID, tea);
  workstation.coffeeMat.specular.lerpColors(COFFEE_SPECULAR, ROOIBOS_SPECULAR, tea);

  // Smooth levitation coupled with subtle pointer-reactive tilt.
  const px = pointer ? pointer.x : 0;
  const py = pointer ? pointer.y : 0;
  group.position.y = workstation.baseY + Math.sin(elapsed * 0.85) * 0.045;
  group.rotation.z = Math.sin(elapsed * 0.5) * 0.0085 - px * 0.016;
  group.rotation.x = Math.cos(elapsed * 0.42) * 0.006 + py * 0.012;

  // Integrate rotation angles via deltaTime so time-of-day shifts never jump rotation.
  anim.coreAngle += dt * (0.34 + night * 0.72);
  anim.innerAngle += dt * (0.78 + night * 1.15);
  // Each click on the orb doubles the ring spin, and the third click is the ceiling.
  const clicks = Math.min(3, workstation.interact?.ringClicks ?? 0);
  const ringBoost = 2 ** clicks;
  anim.ringAngleA += dt * (0.48 + night * 0.34) * ringBoost;
  anim.ringAngleB += dt * (0.38 + night * 0.28) * ringBoost;
  // The ring planes themselves revolve around the orb.
  anim.ringOrbitA += dt * (0.19 + night * 0.09);
  anim.ringOrbitB -= dt * (0.15 + night * 0.08);
  anim.orbitAngle += dt * (0.68 + night * 0.42);

  // The notebook lid eases open and shut; with reduced motion the delta is
  // always zero, so snap to the target instead of never arriving.
  const openTarget = workstation.interact?.notebookOpen ? 1 : 0;
  const openK = dt > 0 ? 1 - Math.exp(-7 * dt) : 1;
  anim.notebookOpen += (openTarget - anim.notebookOpen) * openK;
  workstation.notebookHinge.rotation.z = anim.notebookOpen * 1.95;

  const page = workstation.notebookPage;
  page.visible = anim.notebookOpen > 0.02;
  page.material.opacity = anim.notebookOpen;

  // Slow breathing that every glow shares.
  const breath = 0.5 + 0.5 * Math.sin(elapsed * 1.15);

  core.group.position.y = core.baseY + Math.sin(elapsed * 1.25 + 0.8) * 0.05;
  core.core.rotation.y = anim.coreAngle;
  core.core.rotation.x = Math.sin(elapsed * 0.42) * 0.16;
  core.shell.rotation.y = -anim.innerAngle * 0.3;
  core.shell.rotation.z = anim.coreAngle * 0.2;

  // Ring planes revolve around the orb while the comet heads spin along them.
  core.ringA.rotation.set(
    RING_TILT_A[0] + Math.sin(elapsed * 0.34) * 0.08,
    RING_TILT_A[1] + anim.ringOrbitA,
    RING_TILT_A[2] + Math.cos(elapsed * 0.23) * 0.05,
  );
  core.ringB.rotation.set(
    RING_TILT_B[0] + Math.cos(elapsed * 0.28) * 0.07,
    RING_TILT_B[1] + anim.ringOrbitB,
    RING_TILT_B[2] + Math.sin(elapsed * 0.19) * 0.1,
  );
  core.ringSpinA.rotation.z = anim.ringAngleA * 2.2;
  core.ringSpinB.rotation.z = -anim.ringAngleB * 2.2;

  // Satellites (instanced) and their glints (points, workstation space). Each
  // rides a ring path, so the particles travel the orbit they outline while
  // that orbit revolves around the core.
  const orbit = anim.orbitAngle;
  const cx = core.group.position.x;
  const cy = core.group.position.y;
  const cz = core.group.position.z;
  const gp = glints.positions;
  for (let i = 0; i < 3; i += 1) {
    const spec = RING_SATELLITES[i];
    const onB = spec.ring === 'b';
    const theta = (onB ? -anim.ringAngleB * 2.2 : anim.ringAngleA * 2.2) + spec.offset;
    _sat
      .set(Math.cos(theta) * spec.radius, Math.sin(theta) * spec.radius, 0)
      .applyEuler((onB ? core.ringB : core.ringA).rotation);
    const x = _sat.x;
    const y = _sat.y;
    const z = _sat.z;
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(orbit * 1.7 + i, orbit * 2.3, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    core.satellites.setMatrixAt(i, _dummy.matrix);
    gp[i * 3] = cx + x;
    gp[i * 3 + 1] = cy + y;
    gp[i * 3 + 2] = cz + z;
    glints.alphas[i] = 0.16 + night * 0.5;
  }
  core.satellites.instanceMatrix.needsUpdate = true;

  // Dust motes drifting through the screen light, only really visible after dark.
  const lx = workstation.screenMesh.position.x;
  const lz = workstation.screenMesh.position.z;
  for (let m = 0; m < MOTE_COUNT; m += 1) {
    const [ox, oy, oz, ph] = MOTE_SEEDS[m];
    const k = (3 + m) * 3;
    gp[k] = lx + ox + Math.sin(elapsed * 0.23 + ph) * 0.12;
    gp[k + 1] = oy + Math.sin(elapsed * 0.17 + ph * 1.3) * 0.08;
    gp[k + 2] = lz + oz + Math.cos(elapsed * 0.19 + ph) * 0.1;
    glints.alphas[3 + m] = night * (0.18 + 0.16 * Math.sin(elapsed * 0.9 + ph));
  }
  glints.geometry.attributes.position.needsUpdate = true;
  glints.geometry.attributes.aAlpha.needsUpdate = true;
  glints.material.uniforms.uColor.value.copy(atm.coreTint);

  // Material energy follows the atmosphere: quiet in daylight, luminous at night.
  core.coreMat.emissive.copy(atm.coreColor);
  // A hot emissive clips every facet to one flat shape; let the lit base colour
  // carry the crystal and use the emissive only to lift it after dark.
  core.coreMat.emissiveIntensity = (0.1 + night * 0.5) * (0.94 + breath * 0.06);
  core.coreMat.color.copy(atm.coreColor).multiplyScalar(0.34 + night * 0.26);
  core.edgesMat.color.copy(atm.coreTint);
  core.edgesMat.opacity = 0.45 + night * 0.28;
  core.shellUniforms.uColor.value.copy(atm.coreTint);
  core.shellUniforms.uIntensity.value = 0.26 + night * 0.3;
  core.satelliteMat.color.copy(atm.coreTint);

  // Boosted rings burn brighter and leave a longer afterimage.
  const boost = clicks / 3;
  const ua = core.ringUniformsA;
  ua.uColor.value.copy(atm.coreColor).multiplyScalar(0.9 + night * 0.25);
  ua.uOpacity.value = 0.7 + night * 0.2 + boost * 0.1;
  ua.uTrail.value = 5.2 - boost * 3.7;
  const ub = core.ringUniformsB;
  // The pale tint alone vanishes on the near-white daylight sky, so the second
  // ring keeps most of the saturated core colour and only leans warm at night.
  ub.uColor.value.copy(atm.coreColor).lerp(atm.coreTint, 0.4 + night * 0.2);
  ub.uOpacity.value = 0.58 + night * 0.25 + boost * 0.1;
  ub.uTrail.value = 4.4 - boost * 3.1;

  core.glow.material.color.copy(atm.coreTint);
  core.glow.material.opacity = (0.02 + night * 0.1) * (0.88 + breath * 0.12);
  core.glow.scale.setScalar(0.95 + night * 0.3 + breath * 0.05);
  core.glowInner.material.color.copy(atm.coreColor).lerp(atm.coreTint, 0.5);
  core.glowInner.material.opacity = (0.05 + night * 0.2) * (0.9 + breath * 0.1);
  core.glowInner.scale.setScalar(0.5 + breath * 0.04);

  // Screen illuminates the desk as daylight drops.
  const screenScalar = 1.08 + night * 0.45;
  screenMat.color.setRGB(screenScalar, screenScalar, screenScalar);
  glowMat.color.copy(atm.screenTint).multiplyScalar(0.5 + night * 2.4);

  workstation.screenGlow.material.color.copy(atm.screenTint);
  workstation.screenGlow.material.opacity = 0.02 + night * 0.16;

  // Light pools on the wood: cool-ish screen spill, warm breathing orb pool.
  spill.setColorAt(0, _color.copy(atm.screenTint).multiplyScalar(0.03 + night * 0.26));
  spill.setColorAt(1, _color.copy(atm.coreTint).multiplyScalar((0.03 + night * 0.3) * (0.85 + breath * 0.15)));
  spill.instanceColor.needsUpdate = true;

  updateTerminalTexture(terminal, elapsed, atm);
}

/* Contact shadow decal */

export function createContactShadow() {
  const geometry = new THREE.PlaneGeometry(6.6, 3.0);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = {
    uStrength: { value: 0.3 },
    uColor: { value: new THREE.Color('#000000') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float d = length(p * vec2(1.0, 0.74));
        float a = smoothstep(1.0, 0.02, d);
        a *= a;
        gl_FragColor = vec4(uColor, a * uStrength);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-0.45, 0.12, 0.05);
  mesh.renderOrder = 1;

  return { mesh, uniforms, material };
}

export function updateContactShadow(shadow, atm, celestial) {
  const dir = celestial ? celestial.celestialDir : atm.sunPosition;
  const elevation = celestial
    ? Math.max(celestial.sunElevation, celestial.moonElevation * 0.85, 0.12)
    : THREE.MathUtils.clamp(dir.y / 9.5, 0.08, 1);
  const low = 1 - elevation;
  shadow.uniforms.uStrength.value = atm.shadowStrength;
  shadow.mesh.scale.set(1 + low * 0.72, 1, 1 + low * 0.18);
  shadow.mesh.position.x = -0.35 - Math.sign(dir.x || -1) * low * 0.85;
  shadow.mesh.position.z = 0.05 + low * 0.22;
}

export function disposeWorkstation(workstation) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set(Object.values(workstation.textures || {}));
  workstation.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.isInstancedMesh) object.dispose();
    if (!object.material) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      materials.add(material);
      if (material.map) textures.add(material.map);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  workstation.terminal.texture.dispose();
}
