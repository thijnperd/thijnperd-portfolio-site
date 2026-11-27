/**
 * Synchronizes page palette tokens, tab favicon, real-time local clock,
 * phase control, hero hint, and independently clickable 3-lens project
 * marginalia with the 3D hero time-of-day scalar
 * (0 = daylight, 0.46 = dusk, 0.66 = twilight, 1 = midnight).
 */

import { t } from './i18n.js';

const LIGHT_STOPS = [
  { t: 0.0, ink: '#121614', paper: '#e4e6e1', accent: '#a93724', muted: '#464e48' },
  { t: 0.55, ink: '#221609', paper: '#e5d2b0', accent: '#8f3610', muted: '#523f2b' },
];

const DARK_STOPS = [
  { t: 0.55, ink: '#eceee8', paper: '#161b26', accent: '#f07443', muted: '#a0a8b4' },
  { t: 1.0, ink: '#e9eae4', paper: '#0a0d10', accent: '#f07443', muted: '#9aa3a4' },
];

const STATUS_ICONS = {
  day: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>',
  dusk: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M1.8 11.2h12.4M4.4 11.2a3.6 3.6 0 0 1 7.2 0M8 3.2v1.6M3.4 5.5l1.1 1.1M12.6 5.5l-1.1 1.1"/></svg>',
  night: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4Z"/><path d="M11.6 3v1.8M10.7 3.9h1.8"/></svg>',
};

const PHASE_KEYS = {
  day: { status: 'phase.day', hint: 'phase.hintDay' },
  dusk: { status: 'phase.dusk', hint: 'phase.hintDusk' },
  night: { status: 'phase.night', hint: 'phase.hintNight' },
};

const FAVICON_PALETTES = {
  day: { bg: '#e4e6e1', stroke: 'rgba(18,22,20,0.22)', fg: '#121614', dot: '#a93724' },
  dusk: { bg: '#e5d2b0', stroke: 'rgba(34,22,9,0.25)', fg: '#221609', dot: '#8f3610' },
  night: { bg: '#0a0d10', stroke: 'rgba(233,234,228,0.22)', fg: '#e9eae4', dot: '#f07443' },
};

function buildFaviconUri({ bg, stroke, fg, dot }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="0.75" y="0.75" width="30.5" height="30.5" rx="6" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/><rect x="6.5" y="7" width="16.5" height="3.2" rx="0.5" fill="${fg}"/><rect x="13.1" y="7" width="3.3" height="17.5" rx="0.5" fill="${fg}"/><circle cx="23.2" cy="22.1" r="2.7" fill="${dot}"/><rect x="6.5" y="21.8" width="2.2" height="2.2" fill="${fg}" opacity=".48"/><rect x="9.3" y="21.8" width="2.2" height="2.2" fill="${fg}" opacity=".24"/><rect x="6.5" y="19" width="2.2" height="2.2" fill="${fg}" opacity=".24"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const FAVICON_URIS = {
  day: buildFaviconUri(FAVICON_PALETTES.day),
  dusk: buildFaviconUri(FAVICON_PALETTES.dusk),
  night: buildFaviconUri(FAVICON_PALETTES.night),
};

const NEXT_LENS = { day: 'dusk', dusk: 'night', night: 'day' };

export function formatLocalClock(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getTimeOfDayFromClock(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6 && h < 7.5) {
    return 0.54 - ((h - 6) / 1.5) * 0.16;
  }
  if (h >= 7.5 && h < 17) {
    if (h < 10) return 0.24 - ((h - 7.5) / 2.5) * 0.22;
    if (h <= 15) return 0.02;
    return 0.02 + ((h - 15) / 2) * 0.22;
  }
  if (h >= 17 && h < 20.5) {
    return 0.38 + ((h - 17) / 3.5) * 0.24;
  }
  return 0.94;
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

export function createAdaptiveUI(initialTime = getTimeOfDayFromClock()) {
  const root = document.documentElement;
  const statusText = document.querySelector('[data-status-text]');
  const statusIcon = document.querySelector('[data-status-icon]');
  const skyClockNodes = document.querySelectorAll('[data-sky-clock]');
  const phaseLongNodes = document.querySelectorAll('[data-phase-long]');
  const phaseCycleBtn = document.querySelector('[data-phase-cycle]');
  const phaseSetButtons = document.querySelectorAll('[data-phase-set]');
  const heroHint = document.querySelector('[data-hero-hint]');
  const lensCards = document.querySelectorAll('[data-lens-card]');
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

  function setCardLens(card, lensKey) {
    const key = lensKey === 'dusk' || lensKey === 'night' ? lensKey : 'day';
    const text = card.querySelector('[data-lens-text]');
    const projectKey = card.dataset.lensKey;
    const translated = projectKey ? t(`lens.${projectKey}.${key}`) : null;
    const fallback = card.dataset[`lens${key[0].toUpperCase()}${key.slice(1)}`];
    const copy = translated && translated !== `lens.${projectKey}.${key}` ? translated : fallback;
    if (text && copy) text.textContent = copy;
    card.dataset.lensActive = key;
    for (const btn of card.querySelectorAll('[data-lens-pick]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lensPick === key));
    }
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

  for (const card of lensCards) {
    for (const btn of card.querySelectorAll('[data-lens-pick]')) {
      btn.addEventListener('click', () => {
        setCardLens(card, btn.dataset.lensPick);
      }, { signal });
    }
    const text = card.querySelector('[data-lens-text]');
    if (text) {
      text.addEventListener('click', () => {
        if (window.getSelection()?.toString()) return;
        const current = card.dataset.lensActive || activePhase;
        setCardLens(card, NEXT_LENS[current] || 'dusk');
      }, { signal });
    }
  }

  const clockTimer = window.setInterval(refreshClock, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshClock();
  }, { signal });
  window.addEventListener('thijnperd:langchange', () => {
    syncPhaseCopy(activePhase);
    for (const card of lensCards) {
      setCardLens(card, card.dataset.lensActive || activePhase);
    }
  }, { signal });

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
    root.style.setProperty('--line', rgbaCss(ink, 0.16));
    root.style.setProperty('--line-strong', rgbaCss(ink, 0.34));
    root.style.setProperty('--surface', rgbaCss(ink, 0.045));
    root.style.setProperty('--night', value.toFixed(3));
    root.dataset.scheme = scheme;

    if (schemeMeta) schemeMeta.setAttribute('content', scheme === 'night' ? 'dark' : 'light');

    if (phase !== lastPhase) {
      lastPhase = phase;
      activePhase = phase;
      root.dataset.phase = phase;

      if (statusIcon) statusIcon.innerHTML = STATUS_ICONS[phase];
      syncPhaseCopy(phase);
      for (const btn of phaseSetButtons) {
        btn.setAttribute('aria-pressed', String(btn.dataset.phaseSet === phase));
      }
      for (const card of lensCards) {
        setCardLens(card, phase);
      }
      if (faviconLink) faviconLink.setAttribute('href', FAVICON_URIS[phase]);
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
