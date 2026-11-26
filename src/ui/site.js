function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!toggle || !menu) return;

  const label = toggle.querySelector('.menu-toggle__label');
  const desktopQuery = window.matchMedia('(min-width: 901px)');
  const controller = new AbortController();
  const { signal } = controller;
  let open = false;

  const setOpen = (next, { focusFirst = false } = {}) => {
    if (next && desktopQuery.matches) next = false;
    if (next === open) return;

    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;

    if (open && focusFirst) {
      menu.querySelector('a')?.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(!open, { focusFirst: !open });
  }, { signal });

  menu.addEventListener('click', (event) => {
    if (event.target.closest?.('a')) setOpen(false);
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    setOpen(false);
    toggle.focus({ preventScroll: true });
  }, { signal });

  document.addEventListener('pointerdown', (event) => {
    if (!open || menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  }, { signal });

  document.addEventListener('focusin', (event) => {
    if (!open || menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  }, { signal });

  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  }, { signal });

  window.addEventListener('pagehide', () => controller.abort(), { signal, once: true });
}

/**
 * Small page-level behaviours: year stamp and the mobile section menu.
 * The hero is the only heavy machinery on the page; everything below it renders
 * immediately, with no scroll-triggered fades.
 */
export function initSite() {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  initMobileMenu();
}
