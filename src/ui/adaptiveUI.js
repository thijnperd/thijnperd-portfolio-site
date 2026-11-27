/**
 * Synchronizes page palette tokens, portrait duotone colors, tab favicon, real-time
 * local clock, phase control, and hero hint with the 3D hero time-of-day scalar.
 */

import { t } from './i18n.js';

const LIGHT_STOPS = [
  { t: 0.24, ink: '#181c22', paper: '#e2e5ea', accent: '#a63a35', muted: '#4c5563', portraitHi: '#f0c8bd', portraitLo: '#3a4b66' },
  { t: 0.5, ink: '#121614', paper: '#e4e6e1', accent: '#a93724', muted: '#464e48', portraitHi: '#c8e6d8', portraitLo: '#113c33' },
  { t: 0.8, ink: '#221609', paper: '#e5d2b0', accent: '#8f3610', muted: '#523f2b', portraitHi: '#f2c494', portraitLo: '#45221a' },
];

const DARK_MORNING_STOPS = [
  { t: 0.0, ink: '#e9eae4', paper: '#0a0d10', accent: '#f07443', muted: '#9aa3a4', portraitHi: '#ffd0a6', portraitLo: '#101f33' },
  { t: 0.24, ink: '#eceee8', paper: '#141925', accent: '#f07443', muted: '#a0a8b4', portraitHi: '#f3c6ae', portraitLo: '#222b44' },
];

const DARK_EVENING_STOPS = [
  { t: 0.8, ink: '#eceee8', paper: '#161b26', accent: '#f07443', muted: '#a0a8b4', portraitHi: '#f3c6ae', portraitLo: '#222b44' },
  { t: 1.0, ink: '#e9eae4', paper: '#0a0d10', accent: '#f07443', muted: '#9aa3a4', portraitHi: '#ffd0a6', portraitLo: '#101f33' },
];

const STATUS_ICONS = {
  dawn: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 11.8h12.4M4.4 11.8a3.6 3.6 0 0 1 7.2 0M8 2.6v2.8M6.2 4.4 8 2.6l1.8 1.8M3.3 7.2l1 1M12.7 7.2l-1 1"/></svg>',
  day: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>',
  dusk: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M1.8 11.2h12.4M4.4 11.2a3.6 3.6 0 0 1 7.2 0M8 3.2v1.6M3.4 5.5l1.1 1.1M12.6 5.5l-1.1 1.1"/></svg>',
  night: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4Z"/><path d="M11.6 3v1.8M10.7 3.9h1.8"/></svg>',
};

const PHASE_KEYS = {
  dawn: { status: 'phase.dawn', hint: 'phase.hintDawn' },
  day: { status: 'phase.day', hint: 'phase.hintDay' },
  dusk: { status: 'phase.dusk', hint: 'phase.hintDusk' },
  night: { status: 'phase.night', hint: 'phase.hintNight' },
};

const FAVICON_PALETTES = {
  dawn: { bg: '#e2e5ea', stroke: 'rgba(24,28,34,0.22)', fg: '#181c22', dot: '#a63a35' },
  day: { bg: '#e4e6e1', stroke: 'rgba(18,22,20,0.22)', fg: '#121614', dot: '#a93724' },
  dusk: { bg: '#e5d2b0', stroke: 'rgba(34,22,9,0.25)', fg: '#221609', dot: '#8f3610' },
  night: { bg: '#0a0d10', stroke: 'rgba(233,234,228,0.22)', fg: '#e9eae4', dot: '#f07443' },
};

function buildFaviconUri({ bg, stroke, fg, dot }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="0.75" y="0.75" width="30.5" height="30.5" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/><polygon points="16,5.5 25.1,10.75 16,16 6.9,10.75" fill="${dot}"/><polygon points="6.9,10.75 16,16 16,26.5 6.9,21.25" fill="${fg}"/><polygon points="16,16 25.1,10.75 25.1,21.25 16,26.5" fill="${fg}" opacity=".14"/><rect x="16.2" y="16.4" width="2" height="2" fill="${fg}"/><rect x="16.2" y="20.8" width="2" height="2" fill="${fg}"/><rect x="18.4" y="17.3" width="2" height="2" fill="${fg}"/><rect x="18.4" y="21.7" width="2" height="2" fill="${fg}"/><rect x="20.6" y="13.8" width="2" height="2" fill="${fg}"/><rect x="20.6" y="18.2" width="2" height="2" fill="${fg}"/><rect x="22.8" y="14.8" width="2" height="2" fill="${fg}"/><rect x="22.8" y="19.2" width="2" height="2" fill="${fg}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const FAVICON_URIS = {
  dawn: buildFaviconUri(FAVICON_PALETTES.dawn),
  day: buildFaviconUri(FAVICON_PALETTES.day),
  dusk: buildFaviconUri(FAVICON_PALETTES.dusk),
  night: buildFaviconUri(FAVICON_PALETTES.night),
};

export function formatLocalClock(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getTimeOfDayFromClock(date = new Date()) {
  return (date.getHours() + date.getMinutes() / 60) / 24;
}

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
    portraitHi: hexToRgb(stop.portraitHi),
    portraitLo: hexToRgb(stop.portraitLo),
  }));
}

const LIGHT_RGB = compileStops(LIGHT_STOPS);
const DARK_MORNING_RGB = compileStops(DARK_MORNING_STOPS);
const DARK_EVENING_RGB = compileStops(DARK_EVENING_STOPS);

function samplePair(stops, key, t) {
  let index = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (t >= stops[i].t) index = i;
  }
  const aStop = stops[index];
  const bStop = stops[Math.min(index + 1, stops.length - 1)];
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

export function createAdaptiveUI(initialTime = getTimeOfDayFromClock()) {
  const root = document.documentElement;
  const statusText = document.querySelector('[data-status-text]');
  const statusIcon = document.querySelector('[data-status-icon]');
  const skyClockNodes = document.querySelectorAll('[data-sky-clock]');
  const phaseLongNodes = document.querySelectorAll('[data-phase-long]');
  const phaseCycleBtn = document.querySelector('[data-phase-cycle]');
  const phaseSetButtons = document.querySelectorAll('[data-phase-set]');
  const heroHint = document.querySelector('[data-hero-hint]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const schemeMeta = document.querySelector('meta[name="color-scheme"]');
  const faviconLink = document.querySelector('link[rel="icon"]');

  const controller = new AbortController();
  const { signal } = controller;

  let activePhase = 'day';
  let currentClock = formatLocalClock();
  let lastPhase = '';
  let lastScheme = '';
  let lastKey = '';
  let switchRaf = 0;

  function phaseStatusText(phase) {
    return t(PHASE_KEYS[phase]?.status || 'phase.day');
  }

  function syncClockNodes() {
    for (const node of skyClockNodes) node.textContent = currentClock;
    const label = phaseStatusText(activePhase);
    for (const node of phaseLongNodes) node.textContent = `${label} · ${currentClock}`;
  }

  function refreshClock() {
    const next = formatLocalClock();
    if (next === currentClock) return;
    currentClock = next;
    syncClockNodes();
  }

  function syncPhaseCopy(phase) {
    const keys = PHASE_KEYS[phase] || PHASE_KEYS.day;
    const statusLabel = t(keys.status);
    if (statusText) statusText.textContent = statusLabel;
    if (phaseCycleBtn) {
      phaseCycleBtn.setAttribute('aria-label', `${t('phase.cycleAriaPrefix')} ${statusLabel}`);
    }
    if (heroHint) heroHint.textContent = t(keys.hint);
    syncClockNodes();
  }

  const clockTimer = window.setInterval(refreshClock, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshClock();
  }, { signal });
  window.addEventListener('thijnperd:langchange', () => {
    syncPhaseCopy(activePhase);
  }, { signal });

  function update(t) {
    const value = Math.min(Math.max(Number(t) || 0, 0), 1);
    const scheme = value >= 0.24 && value < 0.80 ? 'day' : 'night';
    const stops = scheme === 'day'
      ? LIGHT_RGB
      : value < 0.24
        ? DARK_MORNING_RGB
        : DARK_EVENING_RGB;

    const ink = samplePair(stops, 'ink', value);
    const paper = samplePair(stops, 'paper', value);
    const accent = samplePair(stops, 'accent', value);
    const muted = samplePair(stops, 'muted', value);
    const portraitHi = samplePair(stops, 'portraitHi', value);
    const portraitLo = samplePair(stops, 'portraitLo', value);

    const phase = (value < 0.21 || value >= 0.855)
      ? 'night'
      : value < 0.36
        ? 'dawn'
        : value < 0.70
          ? 'day'
          : 'dusk';
    const nightLinear = value < 0.5
      ? Math.max(0, 1 - value / 0.34)
      : Math.max(0, (value - 0.66) / 0.34);
    const nightScalar = smoothstep(Math.min(nightLinear, 1));
    const key = [
      ink.r, ink.g, ink.b,
      paper.r, paper.g, paper.b,
      accent.r, accent.g, accent.b,
      muted.r, muted.g, muted.b,
      portraitHi.r, portraitHi.g, portraitHi.b,
      portraitLo.r, portraitLo.g, portraitLo.b,
      phase,
      scheme,
    ].join(',');

    if (key === lastKey) return;
    lastKey = key;

    const schemeChanged = lastScheme !== '' && scheme !== lastScheme;
    if (schemeChanged) {
      if (switchRaf) cancelAnimationFrame(switchRaf);
      root.classList.add('scheme-switching');
    }
    lastScheme = scheme;

    root.style.setProperty('--ink', rgbCss(ink));
    root.style.setProperty('--ink-rgb', `${ink.r}, ${ink.g}, ${ink.b}`);
    root.style.setProperty('--paper', rgbCss(paper));
    root.style.setProperty('--paper-rgb', `${paper.r}, ${paper.g}, ${paper.b}`);
    root.style.setProperty('--accent', rgbCss(accent));
    root.style.setProperty('--accent-rgb', `${accent.r}, ${accent.g}, ${accent.b}`);
    root.style.setProperty('--muted', rgbCss(muted));
    root.style.setProperty('--portrait-hi', rgbCss(portraitHi));
    root.style.setProperty('--portrait-lo', rgbCss(portraitLo));
    root.style.setProperty('--line', rgbaCss(ink, 0.16));
    root.style.setProperty('--line-strong', rgbaCss(ink, 0.34));
    root.style.setProperty('--surface', rgbaCss(ink, 0.045));
    root.style.setProperty('--night', nightScalar.toFixed(3));
    root.dataset.scheme = scheme;

    if (schemeMeta) schemeMeta.setAttribute('content', scheme === 'night' ? 'dark' : 'light');

    if (phase !== lastPhase) {
      lastPhase = phase;
      activePhase = phase;
      root.dataset.phase = phase;

      if (statusIcon) statusIcon.innerHTML = STATUS_ICONS[phase] || STATUS_ICONS.day;
      syncPhaseCopy(phase);
      for (const btn of phaseSetButtons) {
        btn.setAttribute('aria-pressed', String(btn.dataset.phaseSet === phase));
      }
      if (faviconLink) faviconLink.setAttribute('href', FAVICON_URIS[phase] || FAVICON_URIS.day);
    }

    if (schemeChanged) {
      void root.offsetHeight;
      switchRaf = requestAnimationFrame(() => {
        switchRaf = 0;
        root.classList.remove('scheme-switching');
      });
    }

    if (themeMeta) themeMeta.setAttribute('content', rgbCss(paper));
  }

  syncClockNodes();
  update(initialTime);

  return {
    update,
    destroy() {
      window.clearInterval(clockTimer);
      controller.abort();
      if (switchRaf) cancelAnimationFrame(switchRaf);
    },
  };
}
