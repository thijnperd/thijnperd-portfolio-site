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
 * Small page-level behaviours: scroll reveals, year stamp, mobile section menu.
 * Kept deliberately tiny — the hero is the only heavy machinery on the page.
 */
export function initSite() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const targets = document.querySelectorAll('[data-reveal]');
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    for (const target of targets) {
      target.classList.add('reveal');
      observer.observe(target);
    }
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  initMobileMenu();
}
