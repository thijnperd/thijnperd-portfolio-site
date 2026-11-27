import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createGlowSprite } from './sky.js';

/**
 * Procedural 3D desk setup: slab, open laptop with live canvas terminal, mug,
 * notebook, pen, and faceted polyhedron core.
 */

const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

const COLORS = {
  deskTop: '#cbb99d',
  deskEdge: '#8d7a61',
  deskUnder: '#6b5a46',
  laptopShell: '#d3d6d0',
  laptopLid: '#242a2b',
  keyboard: '#2b312d',
  trackpad: '#3a403c',
  mug: '#efe7d8',
  coffee: '#2a1710',
  notebookCover: '#37594b',
  notebookPages: '#e7e0cf',
  notebookBand: '#1c2a24',
  pen: '#d9c9a4',
  penTip: '#242a2b',
};

/* ------------------------------------------------------------------ */
/* Terminal screen texture (a 2D canvas redrawn at ~9 fps)             */
/* ------------------------------------------------------------------ */

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

  drawTerminal(terminal, 0, 0);
  texture.needsUpdate = true;

  return terminal;
}

const TIERS = {
  dawn: { idx: 0, glow: 8, accent: '#f3a696', ink: '#f8ebe7', dim: 'rgba(248,214,205,0.44)', status: 'dawn' },
  day: { idx: 1, glow: 0, accent: '#5fd2ae', ink: '#dcf3e8', dim: 'rgba(190,230,216,0.42)', status: 'daylight' },
  dusk: { idx: 2, glow: 12, accent: '#ffb27a', ink: '#ffe9d5', dim: 'rgba(255,214,180,0.44)', status: 'dusk' },
  night: { idx: 3, glow: 18, accent: '#ff9a63', ink: '#fff2e9', dim: 'rgba(255,214,190,0.46)', status: 'midnight' },
};

function drawTerminal(terminal, elapsed, phaseKey = 'day') {
  const { ctx, canvas } = terminal;
  const w = canvas.width;
  const h = canvas.height;

  const { glow, accent, ink, dim, status } = TIERS[phaseKey] || TIERS.day;
  const dots = '.'.repeat(1 + (Math.floor(elapsed * 2) % 3));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Phosphor-dark terminal body.
  ctx.fillStyle = '#071712';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0c241d';
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

/**
 * Redraws are throttled to ~9 fps: enough for the cursor / progress to feel live,
 * but far cheaper on texture uploads than redrawing at 60 fps.
 */
export function updateTerminalTexture(terminal, elapsed, phaseKey = 'day') {
  const tier = (TIERS[phaseKey] || TIERS.day).idx;
  const due = elapsed - terminal.lastDraw > 1 / 9 || tier !== terminal.lastTier;
  if (!due) return;

  terminal.lastDraw = elapsed;
  terminal.lastTier = tier;
  drawTerminal(terminal, elapsed, phaseKey);
  terminal.texture.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* Procedural models                                                   */
/* ------------------------------------------------------------------ */

function createDesk() {
  const desk = new THREE.Group();

  // Lambert is plenty for matte wood under a dither pass, and far cheaper than PBR.
  const topMat = new THREE.MeshLambertMaterial({ color: COLORS.deskTop });
  const edgeMat = new THREE.MeshLambertMaterial({ color: COLORS.deskEdge });
  const underMat = new THREE.MeshLambertMaterial({ color: COLORS.deskUnder });

  const slab = new THREE.Mesh(new RoundedBoxGeometry(3.15, 0.15, 1.8, 4, 0.045), topMat);
  desk.add(slab);

  // A slightly inset top surface gives the slab an editorial two-tone edge.
  const surface = new THREE.Mesh(new RoundedBoxGeometry(3.02, 0.014, 1.68, 3, 0.03), edgeMat);
  surface.position.y = 0.078;
  desk.add(surface);

  // Recessed underside shadow / floating support.
  const under = new THREE.Mesh(new RoundedBoxGeometry(2.86, 0.055, 1.54, 3, 0.025), underMat);
  under.position.y = -0.108;
  desk.add(under);

  return desk;
}

function createLaptop(terminal) {
  const laptop = new THREE.Group();
  laptop.position.set(-0.5, 0.108, 0.1);

  const shellMat = new THREE.MeshPhongMaterial({
    color: COLORS.laptopShell,
    specular: '#8d948d',
    shininess: 42,
  });
  const lidMat = new THREE.MeshPhongMaterial({
    color: COLORS.laptopLid,
    specular: '#4f5854',
    shininess: 28,
  });
  const keyMat = new THREE.MeshLambertMaterial({ color: COLORS.keyboard });
  const darkMat = new THREE.MeshLambertMaterial({ color: '#191e1d' });

  const base = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.055, 0.84, 3, 0.022), shellMat);
  laptop.add(base);

  // Keyboard keys: one instanced mesh, 4 rows of 13, so it is a single draw call.
  const keyGeo = new THREE.BoxGeometry(0.062, 0.011, 0.046);
  const keyCount = 4 * 13;
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, keyCount);
  const dummy = new THREE.Object3D();
  let keyIndex = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 13; col += 1) {
      dummy.position.set(-0.45 + col * 0.075, 0.033, -0.2 + row * 0.062);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      keys.setMatrixAt(keyIndex, dummy.matrix);
      keyIndex += 1;
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  laptop.add(keys);

  const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.24), darkMat);
  trackpad.position.set(0, 0.032, 0.24);
  laptop.add(trackpad);

  // Glowing keyboard / under-screen accent strip.
  const glowMat = new THREE.MeshBasicMaterial({ color: '#5fd2ae' });
  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.004, 0.012), glowMat);
  glowStrip.position.set(0, 0.032, -0.335);
  laptop.add(glowStrip);

  // Hinge barrel.
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.14, 12), darkMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.028, -0.38);
  laptop.add(hinge);

  // Display lid, opened to ~110°.
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.028, -0.375);
  lidPivot.rotation.x = -0.36;
  laptop.add(lidPivot);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.8, 0.036, 3, 0.018), lidMat);
  lid.position.y = 0.4;
  lidPivot.add(lid);

  const screenMat = new THREE.MeshBasicMaterial({
    map: terminal.texture,
    toneMapped: true,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.17, 0.744), screenMat);
  screen.position.set(0, 0.4, 0.0195);
  lidPivot.add(screen);

  // A soft additive halo sits behind the display, so at night the screen blooms
  // around the bezel without washing out the terminal itself.
  const screenGlow = createGlowSprite({ color: '#ffc48a', size: 1, opacity: 0.06 });
  screenGlow.scale.set(2.9, 1.75, 1);
  screenGlow.position.set(0, 0.4, -0.075);
  lidPivot.add(screenGlow);

  // A hairline bezel highlight so the display reads as glass, not paper.
  const bezelMat = new THREE.MeshBasicMaterial({ color: '#0c1211', transparent: true, opacity: 0.9 });
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.23, 0.785), bezelMat);
  bezel.position.set(0, 0.4, 0.0184);
  lidPivot.add(bezel);

  // Anchor used to aim the screen point light and the prompt particles.
  const screenAnchor = new THREE.Object3D();
  screenAnchor.position.set(0, 0.4, 0.22);
  lidPivot.add(screenAnchor);

  const keyboardAnchor = new THREE.Object3D();
  keyboardAnchor.position.set(0, 0.06, 0.05);
  laptop.add(keyboardAnchor);

  return { laptop, screenMat, glowMat, screenAnchor, keyboardAnchor, lidPivot, screenGlow };
}

function createMug() {
  const mug = new THREE.Group();
  mug.position.set(0.98, 0.088, 0.24);

  const mugMat = new THREE.MeshLambertMaterial({ color: COLORS.mug });
  const coffeeMat = new THREE.MeshLambertMaterial({ color: COLORS.coffee });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.128, 0.24, 28, 1), mugMat);
  body.position.y = 0.12;
  mug.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.008, 8, 32), mugMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.24;
  mug.add(rim);

  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.134, 28), coffeeMat);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.227;
  mug.add(coffee);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.019, 10, 22), mugMat);
  handle.position.set(0.142, 0.125, 0);
  handle.scale.set(1, 1.05, 1);
  mug.add(handle);

  const steamAnchor = new THREE.Object3D();
  steamAnchor.position.set(0, 0.25, 0);
  mug.add(steamAnchor);

  return { mug, steamAnchor };
}

function createNotebookAndPen() {
  const group = new THREE.Group();
  group.position.set(-1.22, 0.088, 0.06);
  group.rotation.y = 0.09;

  const pagesMat = new THREE.MeshLambertMaterial({ color: COLORS.notebookPages });
  const coverMat = new THREE.MeshLambertMaterial({ color: COLORS.notebookCover });
  const bandMat = new THREE.MeshLambertMaterial({ color: COLORS.notebookBand });

  const pages = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.04, 0.72, 2, 0.01), pagesMat);
  pages.position.y = 0.02;
  group.add(pages);

  const cover = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.012, 0.74, 2, 0.012), coverMat);
  cover.position.y = 0.047;
  group.add(cover);

  const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.75), bandMat);
  band.position.set(0.16, 0.054, 0);
  group.add(band);

  const pen = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.4, 10),
    new THREE.MeshPhongMaterial({ color: COLORS.pen, shininess: 45 }),
  );
  barrel.rotation.z = Math.PI / 2;
  pen.add(barrel);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.011, 0.045, 10),
    new THREE.MeshPhongMaterial({ color: COLORS.penTip, shininess: 30 }),
  );
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.222;
  pen.add(tip);
  pen.position.set(-0.02, 0.075, 0.32);
  pen.rotation.y = -0.12;
  group.add(pen);

  return group;
}

export function createGeometricCore() {
  const group = new THREE.Group();
  group.position.set(0.46, 0.94, -0.02);

  const coreGeo = new THREE.IcosahedronGeometry(0.17, 0);
  const coreMat = new THREE.MeshPhongMaterial({
    color: '#146b58',
    emissive: '#5fd2ae',
    emissiveIntensity: 1.1,
    specular: '#e6fff8',
    shininess: 70,
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const edgesMat = new THREE.LineBasicMaterial({
    color: '#b6ffe9',
    transparent: true,
    opacity: 0.34,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), edgesMat);
  core.add(edges);

  const innerMat = new THREE.MeshBasicMaterial({ color: '#9ff0d6' });
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), innerMat);
  group.add(inner);

  const ringMatA = new THREE.MeshBasicMaterial({
    color: '#9ff0d6',
    transparent: true,
    opacity: 0.55,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.0125, 8, 84), ringMatA);
  ringA.rotation.set(0.62, 0.2, 0.25);
  group.add(ringA);

  const ringMatB = new THREE.MeshBasicMaterial({
    color: '#c9fff1',
    transparent: true,
    opacity: 0.35,
  });
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.0085, 8, 84), ringMatB);
  ringB.rotation.set(-0.5, 0.75, 0.5);
  group.add(ringB);

  const glow = createGlowSprite({ color: '#7cf7d9', size: 1.5, opacity: 0.16 });
  group.add(glow);

  // Three orbiting micro-octahedra around the core.
  const satelliteGeo = new THREE.OctahedronGeometry(0.021, 0);
  const satelliteMat = new THREE.MeshBasicMaterial({ color: '#c9fff1' });
  const satellites = [
    new THREE.Mesh(satelliteGeo, satelliteMat),
    new THREE.Mesh(satelliteGeo, satelliteMat),
    new THREE.Mesh(satelliteGeo, satelliteMat),
  ];
  group.add(...satellites);

  const coreAnchor = new THREE.Object3D();
  group.add(coreAnchor);

  return {
    group,
    core,
    edgesMat,
    inner,
    ringA,
    ringB,
    satellites,
    satelliteMat,
    coreMat,
    innerMat,
    ringMatA,
    ringMatB,
    coreAnchor,
    glow,
    baseY: group.position.y,
  };
}

/* ------------------------------------------------------------------ */
/* Assembly + per-frame update                                         */
/* ------------------------------------------------------------------ */

export function createWorkstationGroup({ pixelRatio = 1 } = {}) {
  const group = new THREE.Group();
  group.position.y = 1.02;

  const terminal = createTerminalTexture();
  const desk = createDesk();
  const laptopParts = createLaptop(terminal);
  const mugParts = createMug();
  const notebook = createNotebookAndPen();
  const coreParts = createGeometricCore();

  group.add(desk, laptopParts.laptop, mugParts.mug, notebook, coreParts.group);

  const keyboardWorldLocal = laptopParts.laptop.position.clone().add(laptopParts.keyboardAnchor.position);
  const steamLocal = mugParts.mug.position.clone().add(mugParts.steamAnchor.position);

  const workstation = {
    group,
    terminal,
    desk,
    core: coreParts,
    screenAnchor: laptopParts.screenAnchor,
    screenMat: laptopParts.screenMat,
    screenGlow: laptopParts.screenGlow,
    glowMat: laptopParts.glowMat,
    screenMesh: laptopParts.laptop,
    baseY: group.position.y,
    localPoints: {
      keyboard: keyboardWorldLocal,
      core: coreParts.group.position.clone(),
      steam: steamLocal,
    },
    anim: {
      coreAngle: 0,
      innerAngle: 0,
      ringAngleA: 0.2,
      ringAngleB: 0.75,
      orbitAngle: 0,
    },
    pixelRatio,
  };

  return workstation;
}

export function updateWorkstation(workstation, elapsed, deltaTime, timeOfDay, atm, pointer) {
  const { group, core, terminal, screenMat, glowMat, anim } = workstation;
  const dt = Math.min(Math.max(deltaTime || 0, 0), 0.05);

  // Smooth levitation coupled with subtle pointer-reactive tilt.
  const px = pointer ? pointer.x : 0;
  const py = pointer ? pointer.y : 0;
  group.position.y = workstation.baseY + Math.sin(elapsed * 0.85) * 0.045;
  group.rotation.z = Math.sin(elapsed * 0.5) * 0.0085 - px * 0.016;
  group.rotation.x = Math.cos(elapsed * 0.42) * 0.006 + py * 0.012;

  // Integrate rotation angles via deltaTime so time-of-day shifts never jump rotation.
  anim.coreAngle += dt * (0.34 + timeOfDay * 0.72);
  anim.innerAngle += dt * (0.78 + timeOfDay * 1.15);
  anim.ringAngleA += dt * (0.48 + timeOfDay * 0.34);
  anim.ringAngleB += dt * (0.38 + timeOfDay * 0.28);
  anim.orbitAngle += dt * (0.68 + timeOfDay * 0.42);

  core.group.position.y = core.baseY + Math.sin(elapsed * 1.25 + 0.8) * 0.055;
  core.core.rotation.y = anim.coreAngle;
  core.core.rotation.x = Math.sin(elapsed * 0.42) * 0.16;
  core.inner.rotation.y = -anim.innerAngle;
  core.inner.rotation.z = anim.coreAngle * 0.65;

  core.ringA.rotation.set(0.62 + Math.sin(elapsed * 0.34) * 0.14, anim.ringAngleA, 0.25);
  core.ringB.rotation.set(-0.5 + Math.cos(elapsed * 0.28) * 0.1, 0.75 - anim.ringAngleB, 0.5);

  const orbit = anim.orbitAngle;
  core.satellites[0].position.set(
    Math.cos(orbit) * 0.46,
    Math.sin(orbit * 1.4) * 0.24,
    Math.sin(orbit) * 0.46,
  );
  core.satellites[1].position.set(
    Math.cos(orbit + Math.PI * 0.68) * 0.39,
    Math.sin(orbit * 1.1 + 2.1) * 0.29,
    Math.sin(orbit + Math.PI * 0.68) * 0.39,
  );
  core.satellites[2].position.set(
    Math.cos(-orbit * 0.85 + 4.1) * 0.34,
    Math.cos(orbit * 1.3 + 0.7) * 0.22,
    Math.sin(-orbit * 0.85 + 4.1) * 0.34,
  );

  // Material energy follows the atmosphere: quiet in daylight, luminous at night.
  core.coreMat.emissive.copy(atm.coreColor);
  core.coreMat.emissiveIntensity = 0.18 + timeOfDay * 1.55;
  core.edgesMat.color.copy(atm.coreTint);
  core.edgesMat.opacity = 0.24 + timeOfDay * 0.52;
  core.innerMat.color.copy(atm.coreTint).multiplyScalar(0.55 + timeOfDay * 0.55);
  core.satelliteMat.color.copy(atm.coreTint);
  core.ringMatA.color.copy(atm.coreColor).multiplyScalar(0.9 + timeOfDay * 0.5);
  core.ringMatA.opacity = 0.55 + timeOfDay * 0.35;
  core.ringMatB.color.copy(atm.coreColor).multiplyScalar(0.7 + timeOfDay * 0.45);
  core.ringMatB.opacity = 0.34 + timeOfDay * 0.28;

  core.glow.material.color.copy(atm.coreTint);
  core.glow.material.opacity = 0.04 + timeOfDay * 0.46;
  core.glow.scale.setScalar(1.2 + timeOfDay * 0.5 + Math.sin(elapsed * 1.5) * 0.05);

  // Screen illuminates the desk as daylight drops.
  const screenScalar = 1.08 + timeOfDay * 0.45;
  screenMat.color.setRGB(screenScalar, screenScalar, screenScalar);
  glowMat.color.copy(atm.screenTint).multiplyScalar(0.5 + timeOfDay * 2.4);

  workstation.screenGlow.material.color.copy(atm.screenTint);
  workstation.screenGlow.material.opacity = 0.04 + timeOfDay * 0.28;

  updateTerminalTexture(terminal, elapsed, atm.key || 'day');
}

/* ------------------------------------------------------------------ */
/* Fake contact shadow decal on the water                              */
/* ------------------------------------------------------------------ */

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
  workstation.group.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
  workstation.terminal.texture.dispose();
}
