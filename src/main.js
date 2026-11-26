import { HeroScene } from './hero/HeroScene.js';
import { initTimeSlider } from './ui/timeSlider.js';
import { createAdaptiveUI } from './ui/adaptiveUI.js';
import { initSite } from './ui/site.js';

const STORAGE_KEY = 'thijnperd-time';
const PHASE_PRESETS = { day: 0.02, dusk: 0.47, night: 0.96 };

function readStoredTime() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : null;
  } catch {
    return null;
  }
}

function writeStoredTime(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value.toFixed(3));
  } catch {
    /* ignore storage blocks */
  }
}

const storedTime = readStoredTime();
const INITIAL_TIME = storedTime !== null
  ? storedTime
  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.96 : 0.02);

initSite();

const adaptiveUI = createAdaptiveUI();
adaptiveUI.update(INITIAL_TIME);

const canvasHost = document.querySelector('[data-hero-canvas]');
const dialHost = document.querySelector('[data-time-slider]');
const phaseCycleBtn = document.querySelector('[data-phase-cycle]');
const phaseSetBtns = document.querySelectorAll('[data-phase-set]');

let hero = null;
let slider = null;
let currentTarget = INITIAL_TIME;

function setTime(next, { persist = true, immediate = false } = {}) {
  const clamped = Math.min(Math.max(Number(next) || 0, 0), 1);
  currentTarget = clamped;
  if (persist) writeStoredTime(clamped);
  if (slider) slider.setValue(clamped);
  if (hero) {
    hero.setTimeOfDay(clamped, { immediate });
  } else {
    adaptiveUI.update(clamped);
  }
}

function showFallback(error) {
  console.warn('[hero] Falling back to the static background:', error);
  document.documentElement.classList.add('no-webgl');
  if (canvasHost) canvasHost.querySelectorAll('canvas').forEach((node) => node.remove());
  if (dialHost) dialHost.hidden = true;
  adaptiveUI.update(currentTarget);
}

try {
  hero = new HeroScene(canvasHost, { initialTime: INITIAL_TIME });
  hero.onTimeChange = (value) => adaptiveUI.update(value);

  slider = initTimeSlider(dialHost, {
    value: INITIAL_TIME,
    onChange: (value) => setTime(value, { persist: true }),
  });

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

if (phaseCycleBtn) {
  phaseCycleBtn.addEventListener('click', () => {
    const phase = document.documentElement.dataset.phase || 'day';
    const nextPhase = phase === 'day' ? 'dusk' : phase === 'dusk' ? 'night' : 'day';
    setTime(PHASE_PRESETS[nextPhase], { persist: true });
  });
}

for (const btn of phaseSetBtns) {
  btn.addEventListener('click', () => {
    const target = PHASE_PRESETS[btn.dataset.phaseSet];
    if (target !== undefined) setTime(target, { persist: true, immediate: true });
  });
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || event.newValue === null) return;
  const synced = parseFloat(event.newValue);
  if (Number.isFinite(synced)) setTime(synced, { persist: false });
});

window.addEventListener('pagehide', () => {
  if (slider) slider.destroy();
  if (hero) hero.dispose();
}, { once: true });
