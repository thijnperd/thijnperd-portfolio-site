import { HeroScene } from './hero/HeroScene.js';
import { initTimeSlider } from './ui/timeSlider.js';
import { createAdaptiveUI, getTimeOfDayFromClock } from './ui/adaptiveUI.js';
import { initSite } from './ui/site.js';

const PHASE_PRESETS = { day: 0.02, dusk: 0.47, night: 0.94 };
const INITIAL_TIME = getTimeOfDayFromClock();

initSite();

const adaptiveUI = createAdaptiveUI(INITIAL_TIME);

const canvasHost = document.querySelector('[data-hero-canvas]');
const dialHost = document.querySelector('[data-time-slider]');
const phaseCycleBtn = document.querySelector('[data-phase-cycle]');
const phaseSetBtns = document.querySelectorAll('[data-phase-set]');

let hero = null;
let slider = null;
let currentTarget = INITIAL_TIME;

function setTime(next, { immediate = false } = {}) {
  const clamped = Math.min(Math.max(Number(next) || 0, 0), 1);
  currentTarget = clamped;
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
    onChange: (value) => setTime(value),
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
    setTime(PHASE_PRESETS[nextPhase]);
  });
}

for (const btn of phaseSetBtns) {
  btn.addEventListener('click', () => {
    const target = PHASE_PRESETS[btn.dataset.phaseSet];
    if (target !== undefined) setTime(target, { immediate: true });
  });
}

window.addEventListener('pagehide', () => {
  adaptiveUI.destroy();
  if (slider) slider.destroy();
  if (hero) hero.dispose();
}, { once: true });
