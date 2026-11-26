import { HeroScene } from './hero/HeroScene.js';
import { initTimeSlider } from './ui/timeSlider.js';
import { createAdaptiveUI } from './ui/adaptiveUI.js';
import { initSite } from './ui/site.js';

const INITIAL_TIME = window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.96 : 0.02;

initSite();

const adaptiveUI = createAdaptiveUI();
adaptiveUI.update(INITIAL_TIME);

const canvasHost = document.querySelector('[data-hero-canvas]');
const dialHost = document.querySelector('[data-time-slider]');

let hero = null;
let slider = null;

function showFallback(error) {
  console.warn('[hero] Falling back to the static background:', error);
  document.documentElement.classList.add('no-webgl');
  if (canvasHost) canvasHost.querySelectorAll('canvas').forEach((node) => node.remove());
  if (dialHost) dialHost.hidden = true;
  adaptiveUI.update(INITIAL_TIME);
}

try {
  hero = new HeroScene(canvasHost, { initialTime: INITIAL_TIME });
  hero.onTimeChange = (value) => adaptiveUI.update(value);

  slider = initTimeSlider(dialHost, {
    value: INITIAL_TIME,
    onChange: (value) => hero.setTimeOfDay(value),
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

window.addEventListener('pagehide', () => {
  if (slider) slider.destroy();
  if (hero) hero.dispose();
}, { once: true });
