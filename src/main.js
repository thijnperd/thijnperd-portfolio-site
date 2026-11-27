import { initTimeSlider, initHorizontalTimeSlider } from './ui/timeSlider.js';
import { createAdaptiveUI, getTimeOfDayFromClock } from './ui/adaptiveUI.js';
import { initSite } from './ui/site.js';
import { initAnalytics, track } from './analytics.js';

const PHASE_PRESETS = { dawn: 0.275, day: 0.5, dusk: 0.76, night: 0.96 };
const INITIAL_TIME = getTimeOfDayFromClock();

initSite();
initAnalytics();

const adaptiveUI = createAdaptiveUI(INITIAL_TIME);

const canvasHost = document.querySelector('[data-hero-canvas]');
const dialHost = document.querySelector('[data-time-slider]');
const hDialHost = document.querySelector('[data-time-slider-horizontal]');
const phaseCycleBtn = document.querySelector('[data-phase-cycle]');
const phaseSetBtns = document.querySelectorAll('[data-phase-set]');

let hero = null;
let slider = null;
let hSlider = null;
let heroRequested = false;
let currentTarget = INITIAL_TIME;

function setTime(next, { immediate = false } = {}) {
  const clamped = Math.min(Math.max(Number(next) || 0, 0), 1);
  currentTarget = clamped;
  if (slider) slider.setValue(clamped);
  if (hSlider) hSlider.setValue(clamped);
  if (hero) {
    hero.setTimeOfDay(clamped, { immediate });
  } else {
    adaptiveUI.update(clamped);
  }
}

function showFallback(error, { warn = true } = {}) {
  if (warn) console.warn('[hero] Falling back to the static background:', error);
  document.documentElement.classList.add('no-webgl');
  if (canvasHost) canvasHost.querySelectorAll('canvas').forEach((node) => node.remove());
  if (dialHost) dialHost.hidden = true;
  adaptiveUI.update(currentTarget);
}

/**
 * Three.js and the scene graph are the heaviest thing on the page, and the
 * above-the-fold content is text. The hero module is loaded on idle so the name
 * and tagline paint first; the scene fades in when it is ready. Save-Data
 * visitors get the static background instead.
 */
async function loadHero() {
  if (heroRequested || hero) return;
  heroRequested = true;

  try {
    const { HeroScene } = await import('./hero/HeroScene.js');
    if (!canvasHost) throw new Error('Missing hero canvas host.');

    hero = new HeroScene(canvasHost, { initialTime: currentTarget });
    hero.onTimeChange = (value) => adaptiveUI.update(value);
    hero.setTimeOfDay(currentTarget, { immediate: true });
    hero.start();
    document.documentElement.classList.add('has-webgl');
  } catch (error) {
    if (hero) {
      try {
        hero.dispose();
      } catch {
        /* best effort */
      }
      hero = null;
    }
    showFallback(error);
  }
}

try {
  slider = initTimeSlider(dialHost, {
    value: INITIAL_TIME,
    onChange: (value) => setTime(value, { immediate: true }),
  });
} catch (error) {
  showFallback(error);
}

try {
  hSlider = initHorizontalTimeSlider(hDialHost, {
    value: INITIAL_TIME,
    onChange: (value) => setTime(value, { immediate: true }),
  });
} catch {
  /* mobile horizontal slider falls back silently */
}

const saveData = navigator.connection && navigator.connection.saveData === true;

if (saveData) {
  document.documentElement.classList.add('no-webgl');
  if (dialHost) dialHost.hidden = true;
} else if ('requestIdleCallback' in window) {
  requestIdleCallback(() => loadHero(), { timeout: 800 });
} else {
  setTimeout(loadHero, 120);
}

if (phaseCycleBtn) {
  phaseCycleBtn.addEventListener('click', () => {
    const phase = document.documentElement.dataset.phase || 'day';
    const order = { dawn: 'day', day: 'dusk', dusk: 'night', night: 'dawn' };
    const nextPhase = order[phase] || 'day';
    track(`phase-${nextPhase}`);
    setTime(PHASE_PRESETS[nextPhase]);
  });
}

for (const btn of phaseSetBtns) {
  btn.addEventListener('click', () => {
    const target = PHASE_PRESETS[btn.dataset.phaseSet];
    if (target !== undefined) {
      track(`phase-${btn.dataset.phaseSet}`);
      setTime(target, { immediate: true });
    }
  });
}

window.addEventListener('pagehide', () => {
  adaptiveUI.destroy();
  if (slider) slider.destroy();
  if (hSlider) hSlider.destroy();
  if (hero) hero.dispose();
}, { once: true });
