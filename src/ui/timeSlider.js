/**
 * Interactive vertical 00:00–24:00 day/night slider with pointer drag, preset
 * stops (Midnight / Dawn / Daylight / Dusk / Midnight), and keyboard support.
 * `0.00` sits at the bottom (`00:00`) and `1.00` at the top (`24:00`).
 */

import { t } from './i18n.js';

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export function formatSliderHour(value) {
  const v = clamp01(value);
  if (v >= 0.995) return '24:00';
  const totalMins = Math.round((v * 24 * 60) / 5) * 5;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeOfDayLabel(value) {
  const clock = formatSliderHour(value);
  if (value < 0.21 || value >= 0.855) return `${clock} · ${t('phase.night')}`;
  if (value < 0.36) return `${clock} · ${t('phase.dawn')}`;
  if (value < 0.70) return `${clock} · ${t('phase.day')}`;
  return `${clock} · ${t('phase.dusk')}`;
}

export function initTimeSlider(host, { value = 0.5, onChange = () => {} } = {}) {
  if (!host) {
    return { setValue() {}, destroy() {}, element: null };
  }

  host.innerHTML = `
    <div class="ts" role="slider" tabindex="0"
         aria-label="${t('phase.sliderLabel')}"
         aria-orientation="vertical"
         aria-valuemin="0" aria-valuemax="24"
         aria-valuenow="12" aria-valuetext="${timeOfDayLabel(value)}">
      <span class="ts__end ts__end--top" aria-hidden="true">24</span>
      <div class="ts__track">
        <div class="ts__fill" aria-hidden="true"></div>
        <span class="ts__tick ts__tick--dawn" aria-hidden="true"></span>
        <span class="ts__tick ts__tick--noon" aria-hidden="true"></span>
        <span class="ts__tick ts__tick--dusk" aria-hidden="true"></span>
        <div class="ts__thumb" aria-hidden="true"><span class="ts__thumb-grip"></span></div>
      </div>
      <span class="ts__end ts__end--bottom" aria-hidden="true">00</span>
    </div>
    <span class="ts__caption" aria-hidden="true">${t('phase.sliderCaption')}</span>
  `;

  const element = host.querySelector('.ts');
  const caption = host.querySelector('.ts__caption');
  const track = host.querySelector('.ts__track');
  const topEnd = host.querySelector('.ts__end--top');
  const bottomEnd = host.querySelector('.ts__end--bottom');
  const controller = new AbortController();
  const { signal } = controller;

  let current = clamp01(value);
  let dragging = false;

  function paint(next, notify) {
    current = clamp01(next);
    element.style.setProperty('--p', current.toFixed(4));
    element.setAttribute('aria-valuenow', (current * 24).toFixed(1));
    element.setAttribute('aria-valuetext', timeOfDayLabel(current));
    if (notify) onChange(current);
  }

  function valueFromPointer(clientY) {
    const rect = track.getBoundingClientRect();
    if (!rect.height) return current;
    if (clientY <= topEnd.getBoundingClientRect().bottom + 4) return 0.98;
    if (clientY >= bottomEnd.getBoundingClientRect().top - 4) return 0.02;
    const raw = clamp01(1 - (clientY - rect.top) / rect.height);
    if (!dragging) {
      if (Math.abs(raw - 0.275) <= 0.045) return 0.275;
      if (Math.abs(raw - 0.5) <= 0.045) return 0.5;
      if (Math.abs(raw - 0.76) <= 0.045) return 0.76;
    }
    return raw;
  }

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    const target = valueFromPointer(event.clientY);
    dragging = true;
    element.classList.add('is-dragging');
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture can fail on synthetic events — dragging still works */
    }
    paint(target, true);
  }, { signal });

  element.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    paint(valueFromPointer(event.clientY), true);
  }, { signal });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    element.classList.remove('is-dragging');
    try {
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    } catch {
      /* nothing to release */
    }
  };

  element.addEventListener('pointerup', endDrag, { signal });
  element.addEventListener('pointercancel', endDrag, { signal });

  element.addEventListener('keydown', (event) => {
    let next = current;
    const step = event.shiftKey ? 0.1 : 0.04;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = current + step;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        next = current - step;
        break;
      case 'PageUp':
        next = current + 0.16;
        break;
      case 'PageDown':
        next = current - 0.16;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    paint(next, true);
  }, { signal });

  paint(current, false);

  window.addEventListener('thijnperd:langchange', () => {
    element.setAttribute('aria-label', t('phase.sliderLabel'));
    element.setAttribute('aria-valuetext', timeOfDayLabel(current));
    if (caption) caption.textContent = t('phase.sliderCaption');
  }, { signal });

  return {
    element,
    setValue(next) {
      if (!dragging) paint(next, false);
    },
    destroy() {
      controller.abort();
    },
  };
}
