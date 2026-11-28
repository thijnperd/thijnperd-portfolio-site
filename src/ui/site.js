import { initI18n } from './i18n.js';
import { initLocalizedLinks } from './localizedLinks.js';
import { initTabBar } from './tabBar.js';

export function initSite() {
  initI18n();
  initLocalizedLinks();

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const printButton = document.querySelector('[data-print]');
  if (printButton) {
    printButton.addEventListener('click', () => window.print());
  }

  initTabBar();
}
