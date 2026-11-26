/**
 * Interactive vertical day-to-night slider with pointer drag and full keyboard
 * support (`role="slider"` and `aria-valuetext`).
 * 0.0 sits at the bottom (daylight) and 1.0 at the top (midnight).
 */

const SUN_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
       stroke-linecap="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4.1" />
    <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
  </svg>
`;

const MOON_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8Z" />
  </svg>
`;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export function timeOfDayLabel(value) {
  if (value < 0.34) return 'Daylight';
  if (value < 0.72) return 'Dusk';
  return 'Midnight';
}

export function initTimeSlider(host, { value = 0, onChange = () => {} } = {}) {
  if (!host) {
    return { setValue() {}, destroy() {}, element: null };
  }

  host.innerHTML = `
    <div class="ts" role="slider" tabindex="0"
         aria-label="Time of day"
         aria-orientation="vertical"
         aria-valuemin="0" aria-valuemax="100"
         aria-valuenow="0" aria-valuetext="Daylight">
      <span class="ts__icon ts__icon--moon" aria-hidden="true">${MOON_ICON}</span>
      <div class="ts__track">
        <div class="ts__fill" aria-hidden="true"></div>
        <span class="ts__tick" aria-hidden="true"></span>
        <div class="ts__thumb" aria-hidden="true"><span class="ts__thumb-grip"></span></div>
      </div>
      <span class="ts__icon ts__icon--sun" aria-hidden="true">${SUN_ICON}</span>
    </div>
    <span class="ts__caption" aria-hidden="true">time of day</span>
  `;

  const element = host.querySelector('.ts');
  const track = host.querySelector('.ts__track');
  const controller = new AbortController();
  const { signal } = controller;

  let current = clamp01(value);
  let dragging = false;

  function paint(next, notify) {
    current = clamp01(next);
    element.style.setProperty('--p', current.toFixed(4));
    element.setAttribute('aria-valuenow', String(Math.round(current * 100)));
    element.setAttribute('aria-valuetext', timeOfDayLabel(current));
    if (notify) onChange(current);
  }

  function valueFromPointer(clientY) {
    const rect = track.getBoundingClientRect();
    if (!rect.height) return current;
    return clamp01(1 - (clientY - rect.top) / rect.height);
  }

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    element.classList.add('is-dragging');
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture can fail on synthetic events — dragging still works */
    }
    paint(valueFromPointer(event.clientY), true);
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
