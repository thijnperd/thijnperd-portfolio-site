/**
 * Synchronizes page palette tokens and light-phase labels with the 3D hero
 * time-of-day scalar (0 = daylight, 0.46 = dusk, 0.66 = twilight, 1 = midnight).
 * Light and dark text palettes flip cleanly around dusk-to-twilight (0.55) so
 * foreground typography never passes through a low-contrast grey midpoint.
 */

const LIGHT_STOPS = [
  { t: 0.0, ink: '#121614', paper: '#e4e6e1', accent: '#a93724', muted: '#464e48' },
  { t: 0.55, ink: '#221609', paper: '#e5d2b0', accent: '#8f3610', muted: '#523f2b' },
];

const DARK_STOPS = [
  { t: 0.55, ink: '#eceee8', paper: '#161b26', accent: '#f07443', muted: '#a0a8b4' },
  { t: 1.0, ink: '#e9eae4', paper: '#0a0d10', accent: '#f07443', muted: '#9aa3a4' },
];

const STATUS_ICONS = {
  day: '<span class="status-dot"></span>',
  dusk: '<span class="status-dot status-dot--warm"></span>',
  night:
    '<svg class="status-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 9.8A5.7 5.7 0 0 1 6.2 2.5a5.7 5.7 0 1 0 7.3 7.3Z"/></svg>',
};

const PHASE_LABELS = {
  day: { short: 'Daylight', long: 'Daylight', status: 'daylight' },
  dusk: { short: 'Dusk', long: 'Dusk', status: 'dusk' },
  night: { short: 'Midnight', long: 'Midnight', status: 'midnight' },
};

const smoothstep = (x) => x * x * (3 - 2 * x);

function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function compileStops(stops) {
  return stops.map((stop) => ({
    t: stop.t,
    ink: hexToRgb(stop.ink),
    paper: hexToRgb(stop.paper),
    accent: hexToRgb(stop.accent),
    muted: hexToRgb(stop.muted),
  }));
}

const LIGHT_RGB = compileStops(LIGHT_STOPS);
const DARK_RGB = compileStops(DARK_STOPS);

function samplePair(stops, key, t) {
  const aStop = stops[0];
  const bStop = stops[1];
  const span = Math.max(bStop.t - aStop.t, 0.0001);
  const local = smoothstep(Math.min(Math.max((t - aStop.t) / span, 0), 1));
  const a = aStop[key];
  const b = bStop[key];

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
    const scheme = value < 0.55 ? 'day' : 'night';
    const stops = scheme === 'day' ? LIGHT_RGB : DARK_RGB;

    const ink = samplePair(stops, 'ink', value);
    const paper = samplePair(stops, 'paper', value);
    const accent = samplePair(stops, 'accent', value);
    const muted = samplePair(stops, 'muted', value);

    const phase = value < 0.34 ? 'day' : value < 0.72 ? 'dusk' : 'night';
    const key = [
      ink.r, ink.g, ink.b,
      paper.r, paper.g, paper.b,
      accent.r, accent.g, accent.b,
      muted.r, muted.g, muted.b,
      phase,
      scheme,
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
    root.style.setProperty('--line-strong', rgbaCss(ink, 0.34));
    root.style.setProperty('--surface', rgbaCss(ink, 0.045));
    root.style.setProperty('--night', value.toFixed(3));
    root.dataset.scheme = scheme;

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
