/**
 * Synchronizes page palette tokens, tab favicon, sky clock, phase control,
 * hero hint, and 3-lens project marginalia with the 3D hero time-of-day scalar
 * (0 = daylight, 0.46 = dusk, 0.66 = twilight, 1 = midnight).
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
  day: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>',
  dusk: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M1.8 11.2h12.4M4.4 11.2a3.6 3.6 0 0 1 7.2 0M8 3.2v1.6M3.4 5.5l1.1 1.1M12.6 5.5l-1.1 1.1"/></svg>',
  night: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4Z"/><path d="M11.6 3v1.8M10.7 3.9h1.8"/></svg>',
};

const PHASE_LABELS = {
  day: {
    status: 'Daylight',
    lensTag: 'Overview',
    hint: 'Drag the dial for sunset, dark mode & project notes',
  },
  dusk: {
    status: 'Dusk',
    lensTag: 'Specs',
    hint: 'Golden hour — pull higher for stars, moonlight & after-hours notes',
  },
  night: {
    status: 'Midnight',
    lensTag: 'After-hours',
    hint: 'Midnight — click the water for ripples, or pull down for daylight',
  },
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

export function formatSkyClock(value) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 1);
  const totalMinutes = Math.round(clamped * 720);
  const hour24 = (12 + Math.floor(totalMinutes / 60)) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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

export function createAdaptiveUI() {
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

  let lastPhase = '';
  let lastScheme = '';
  let lastClock = '';
  let lastKey = '';
  let switchRaf = 0;

  function update(t) {
    const value = Math.min(Math.max(Number(t) || 0, 0), 1);
    const scheme = value < 0.55 ? 'day' : 'night';
    const stops = scheme === 'day' ? LIGHT_RGB : DARK_RGB;

    const ink = samplePair(stops, 'ink', value);
    const paper = samplePair(stops, 'paper', value);
    const accent = samplePair(stops, 'accent', value);
    const muted = samplePair(stops, 'muted', value);

    const phase = value < 0.34 ? 'day' : value < 0.72 ? 'dusk' : 'night';
    const clock = formatSkyClock(value);
    const key = [
      ink.r, ink.g, ink.b,
      paper.r, paper.g, paper.b,
      accent.r, accent.g, accent.b,
      muted.r, muted.g, muted.b,
      phase,
      scheme,
      clock,
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

    if (clock !== lastClock) {
      lastClock = clock;
      for (const node of skyClockNodes) node.textContent = clock;
      for (const node of phaseLongNodes) node.textContent = `${PHASE_LABELS[phase].status} · ${clock}`;
    }

    if (phase !== lastPhase) {
      lastPhase = phase;
      root.dataset.phase = phase;

      const info = PHASE_LABELS[phase];
      if (statusText) statusText.textContent = info.status;
      if (statusIcon) statusIcon.innerHTML = STATUS_ICONS[phase];
      if (phaseCycleBtn) {
        phaseCycleBtn.setAttribute('aria-label', `Cycle time of day, currently ${info.status}`);
      }
      if (heroHint) heroHint.textContent = info.hint;
      for (const node of phaseLongNodes) node.textContent = `${info.status} · ${clock}`;
      for (const btn of phaseSetButtons) {
        btn.setAttribute('aria-pressed', String(btn.dataset.phaseSet === phase));
      }
      for (const card of lensCards) {
        const tag = card.querySelector('[data-lens-tag]');
        const text = card.querySelector('[data-lens-text]');
        if (tag) tag.textContent = info.lensTag;
        const copy = card.dataset[`lens${phase[0].toUpperCase()}${phase.slice(1)}`];
        if (text && copy) text.textContent = copy;
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

  update(0);

  return { update };
}
