import { initSite } from './ui/site.js';
import { initDitherSelection } from './ui/ditherSelection.js';
import { initAnalytics, track } from './analytics.js';
import {
  createAdaptiveUI,
  getStoredTimeOfDay,
  getTimeOfDayFromClock,
  storeTimeOfDay,
} from './ui/adaptiveUI.js';

const PHASE_PRESETS = { dawn: 0.275, day: 0.5, dusk: 0.76, night: 0.96 };

initSite();
initAnalytics();
initDitherSelection();

const adaptiveUI = createAdaptiveUI(getStoredTimeOfDay() ?? getTimeOfDayFromClock());
const phaseCycleBtn = document.querySelector('[data-phase-cycle]');

if (phaseCycleBtn) {
  phaseCycleBtn.addEventListener('click', () => {
    const phase = document.documentElement.dataset.phase || 'day';
    const order = { dawn: 'day', day: 'dusk', dusk: 'night', night: 'dawn' };
    const nextPhase = order[phase] || 'day';
    const nextTime = PHASE_PRESETS[nextPhase];
    track(`phase-${nextPhase}`);
    storeTimeOfDay(nextTime);
    adaptiveUI.update(nextTime);
  });
}

window.addEventListener('pagehide', () => {
  adaptiveUI.destroy();
}, { once: true });
