/**
 * SECTION 6 — ADAPTIVE HERO UI / WHOLE-PAGE THEME
 *
 * The same normalized time value that drives the 3D scene also drives the HTML
 * overlay. Ink, paper, accent and rules are interpolated through daylight,
 * golden hour and midnight, so the typography inverts exactly as the room does.
 * The variables live on <html>, which means the portfolio sections below carry
 * the chosen mood with them too.
 */

const STOPS = [
  { ink: '#121614', paper: '#e4e6e1', accent: '#b8402c', muted: '#4d554f' },
  { ink: '#221609', paper: '#e5d2b0', accent: '#9c3f16', muted: '#5e4a34' },
  { ink: '#e9eae4', paper: '#0a0d10', accent: '#f0703f', muted: '#9aa3a4' },
];

const STATUS_ICONS = {
  ideating: '<span class="status-dot"></span>',
  flow: '<span class="status-dot status-dot--warm"></span>',
  locked:
    '<svg class="status-lock" viewBox="0 0 12 14" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="1.6" y="6" width="8.8" height="6.5" rx="1.4"/><path d="M3.7 6V4.2a2.3 2.3 0 0 1 4.6 0V6"/></svg>',
};

const PHASE_LABELS = {
  ideating: { short: 'Daylight', long: 'Daylight, ideating', status: 'ideating' },
  flow: { short: 'Golden hour', long: 'Golden hour, flow state', status: 'flow state' },
  locked: { short: 'Midnight', long: 'Midnight, locked in', status: 'locked in' },
};

const smoothstep = (x) => x * x * (3 - 2 * x);

function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

const STOP_RGB = STOPS.map((stop) => ({
  ink: hexToRgb(stop.ink),
  paper: hexToRgb(stop.paper),
  accent: hexToRgb(stop.accent),
  muted: hexToRgb(stop.muted),
}));

function sampleStop(key, t) {
  const scaled = Math.min(Math.max(t, 0), 1) * 2;
  const index = Math.min(Math.floor(scaled), 1);
  const local = smoothstep(scaled - index);
  const a = STOP_RGB[index][key];
  const b = STOP_RGB[index + 1][key];

  return {
    r: Math.round(a.r + (b.r - a.r) * local),
    g: Math.round(a.g + (b.g - a.g) * local),
    b: Math.round(a.b + (b.b - a.b) * local),
  };
}

function rgbCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbaCss({ r, g, b }, alpha) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createAdaptiveUI() {
  const root = document.documentElement;
  const statusText = document.querySelector('[data-status-text]');
  const statusIcon = document.querySelector('[data-status-icon]');
  const phaseLongNodes = document.querySelectorAll('[data-phase-long]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  let lastPhase = '';
  let lastKey = '';

  function update(t) {
    const value = Math.min(Math.max(Number(t) || 0, 0), 1);
    const ink = sampleStop('ink', value);
    const paper = sampleStop('paper', value);
    const accent = sampleStop('accent', value);
    const muted = sampleStop('muted', value);

    const phase = value < 0.34 ? 'ideating' : value < 0.72 ? 'flow' : 'locked';
    const key = [
      ink.r, ink.g, ink.b,
      paper.r, paper.g, paper.b,
      accent.r, accent.g, accent.b,
      muted.r, muted.g, muted.b,
      phase,
    ].join(',');

    if (key === lastKey) return;
    lastKey = key;

    root.style.setProperty('--ink', rgbCss(ink));
    root.style.setProperty('--ink-rgb', `${ink.r}, ${ink.g}, ${ink.b}`);
    root.style.setProperty('--paper', rgbCss(paper));
    root.style.setProperty('--paper-rgb', `${paper.r}, ${paper.g}, ${paper.b}`);
    root.style.setProperty('--accent', rgbCss(accent));
    root.style.setProperty('--accent-rgb', `${accent.r}, ${accent.g}, ${accent.b}`);
    root.style.setProperty('--muted', rgbCss(muted));
    root.style.setProperty('--line', rgbaCss(ink, 0.16));
    root.style.setProperty('--line-strong', rgbaCss(ink, 0.32));
    root.style.setProperty('--surface', rgbaCss(ink, 0.045));
    root.style.setProperty('--night', value.toFixed(3));

    if (phase !== lastPhase) {
      lastPhase = phase;
      root.dataset.phase = phase;

      if (statusText) statusText.textContent = PHASE_LABELS[phase].status;
      if (statusIcon) statusIcon.innerHTML = STATUS_ICONS[phase];
      for (const node of phaseLongNodes) node.textContent = PHASE_LABELS[phase].long;

      const status = document.querySelector('[data-status]');
      if (status) status.dataset.phase = phase;
    }

    if (themeMeta) themeMeta.setAttribute('content', rgbCss(paper));
  }

  update(0);

  return { update };
}
