import { initI18n } from './i18n.js';
import { initTabBar } from './tabBar.js';

/**
 * Small page-level behaviours: year stamp, print button, and mobile tab bar.
 * The hero is the only heavy machinery on the page; everything below it renders
 * immediately, with no scroll-triggered fades.
 */
export function initSite() {
  initI18n();

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const printButton = document.querySelector('[data-print]');
  if (printButton) {
    printButton.addEventListener('click', () => window.print());
  }

  initTabBar();
}
