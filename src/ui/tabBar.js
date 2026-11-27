import { track } from '../analytics.js';

/**
 * Mobile bottom tab bar with a sliding indicator pill and real-time Bayer
 * icon dithering (`clip-path` synced on every animation frame with a mirrored
 * dither-masked layer). Supports tap navigation, horizontal thumb-scrubbing,
 * `scroll-target-group: auto` / `IntersectionObserver` scrollspy, and reduced motion.
 */
export function initTabBar() {
  const bar = document.querySelector('[data-tabbar]');
  if (!bar) return () => {};

  const trackEl = bar.querySelector('[data-tabbar-track]');
  const baseList = bar.querySelector('.tabbar__list--base');
  const indicator = bar.querySelector('[data-tabbar-indicator]');
  if (!trackEl || !baseList || !indicator) return () => {};

  const links = [...baseList.querySelectorAll('.tabbar__item')];
  if (links.length === 0) return () => {};

  // Clone base links as non-interactive spans so screen readers, Tab order,
  // and build link checks see only the real navigation links.
  const ditherList = document.createElement('ul');
  ditherList.className = 'tabbar__list tabbar__list--dither';
  ditherList.setAttribute('aria-hidden', 'true');

  const mirrorLabels = [];
  for (const link of links) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'tabbar__item';
    span.dataset.tabMirror = link.dataset.tabId || '';
    span.innerHTML = link.innerHTML;
    li.appendChild(span);
    ditherList.appendChild(li);

    const srcLabel = link.querySelector('.tabbar__label');
    const dstLabel = span.querySelector('.tabbar__label');
    if (srcLabel && dstLabel) mirrorLabels.push([srcLabel, dstLabel]);
  }
  trackEl.appendChild(ditherList);

  const controller = new AbortController();
  const { signal } = controller;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 960px)');
  const isHome = document.body?.dataset?.i18nPage === 'home';

  let boxes = [];
  let currentX = 0;
  let currentW = 0;
  let targetX = 0;
  let targetW = 0;
  let activeIndex = resolveInitialIndex();
  let initialized = false;
  let rafId = 0;
  let scrubbing = false;
  let scrubStartX = 0;
  let scrubStartLeft = 0;
  let scrubPointerId = -1;
  let suppressClick = false;
  let scrubPreviewIndex = -1;

  function resolveInitialIndex() {
    const preMarked = links.findIndex((a) => a.getAttribute('aria-current') === 'page');
    if (preMarked >= 0) return preMarked;

    const p = window.location.pathname;
    if (p.startsWith('/writing')) return links.findIndex((a) => a.dataset.tabId === 'writing');
    if (p.startsWith('/cv')) return links.findIndex((a) => a.dataset.tabId === 'cv');
    if (p.startsWith('/work')) return links.findIndex((a) => a.dataset.tabId === 'work');

    const hash = window.location.hash;
    if (hash) {
      const idx = links.findIndex((a) => a.getAttribute('href') === hash);
      if (idx >= 0) return idx;
    }
    return 0;
  }

  function measure() {
    const trackRect = trackEl.getBoundingClientRect();
    if (!trackRect.width) return false;
    boxes = links.map((link) => {
      const r = link.getBoundingClientRect();
      return {
        x: r.left - trackRect.left,
        w: r.width,
      };
    });
    const box = boxes[Math.max(0, Math.min(activeIndex, boxes.length - 1))];
    if (box) {
      targetX = box.x;
      targetW = box.w;
      if (!initialized) {
        currentX = targetX;
        currentW = targetW;
        initialized = true;
      }
      applyVisual(currentX, currentW, trackRect.width);
    }
    return true;
  }

  function applyVisual(x, w, trackWidth = trackEl.getBoundingClientRect().width) {
    if (!trackWidth || !w) return;
    const clampedX = Math.max(0, Math.min(x, Math.max(0, trackWidth - w)));
    const rightInset = Math.max(0, trackWidth - (clampedX + w));
    indicator.style.transform = `translate3d(${clampedX.toFixed(2)}px, 0, 0)`;
    indicator.style.width = `${w.toFixed(2)}px`;
    ditherList.style.clipPath = `inset(0px ${rightInset.toFixed(2)}px 0px ${clampedX.toFixed(2)}px round 2px)`;
    indicator.style.opacity = '1';
  }

  function stepAnimation() {
    rafId = 0;
    const trackWidth = trackEl.getBoundingClientRect().width;
    if (scrubbing) return;

    const dx = targetX - currentX;
    const dw = targetW - currentW;
    if (reducedMotion.matches || (Math.abs(dx) < 0.35 && Math.abs(dw) < 0.35)) {
      currentX = targetX;
      currentW = targetW;
      applyVisual(currentX, currentW, trackWidth);
      return;
    }

    currentX += dx * 0.24;
    currentW += dw * 0.24;
    applyVisual(currentX, currentW, trackWidth);
    rafId = requestAnimationFrame(stepAnimation);
  }

  function startAnimation() {
    if (!rafId && !scrubbing) {
      rafId = requestAnimationFrame(stepAnimation);
    }
  }

  function setActiveIndex(idx, { immediate = false, updateAria = true } = {}) {
    if (idx < 0 || idx >= links.length) return;
    activeIndex = idx;

    if (updateAria) {
      links.forEach((link, i) => {
        const isPageLink = !link.getAttribute('href')?.startsWith('#') && !link.getAttribute('href')?.startsWith('/#');
        if (i === idx) {
          link.setAttribute('aria-current', isPageLink ? 'page' : 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    if (!boxes.length && !measure()) return;
    const box = boxes[idx];
    if (!box) return;
    targetX = box.x;
    targetW = box.w;
    if (immediate || reducedMotion.matches) {
      currentX = targetX;
      currentW = targetW;
      applyVisual(currentX, currentW);
    } else {
      startAnimation();
    }
  }

  function indexAtCenterX(centerX) {
    let best = 0;
    let bestDist = Infinity;
    boxes.forEach((b, i) => {
      const d = Math.abs(centerX - (b.x + b.w / 2));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  // Horizontal thumb-scrubbing so users can slide the dither lens across icons
  trackEl.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (!boxes.length && !measure()) return;
    scrubPointerId = event.pointerId;
    scrubStartX = event.clientX;
    scrubStartLeft = currentX;
    scrubPreviewIndex = -1;
    suppressClick = false;
  }, { signal });

  trackEl.addEventListener('pointermove', (event) => {
    if (event.pointerId !== scrubPointerId) return;
    const dx = event.clientX - scrubStartX;
    if (!scrubbing && Math.abs(dx) < 8) return;

    if (!scrubbing) {
      scrubbing = true;
      suppressClick = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      try {
        trackEl.setPointerCapture(event.pointerId);
      } catch {
        /* pointer capture can fail on synthetic events */
      }
    }

    const trackWidth = trackEl.getBoundingClientRect().width;
    const w = boxes[activeIndex]?.w || currentW;
    const maxLeft = Math.max(0, trackWidth - w);
    const nextX = Math.max(0, Math.min(maxLeft, scrubStartLeft + dx));
    currentX = nextX;
    currentW = w;
    applyVisual(currentX, currentW, trackWidth);
    scrubPreviewIndex = indexAtCenterX(currentX + w / 2);
  }, { signal });

  const endScrub = (event) => {
    if (event.pointerId !== scrubPointerId) return;
    const wasScrubbing = scrubbing;
    const chosen = scrubPreviewIndex;
    scrubbing = false;
    scrubPointerId = -1;
    scrubPreviewIndex = -1;

    try {
      if (trackEl.hasPointerCapture(event.pointerId)) trackEl.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    if (wasScrubbing && chosen >= 0 && links[chosen]) {
      setActiveIndex(chosen);
      track(`tab-${links[chosen].dataset.tabId || chosen}`);
      links[chosen].click();
      setTimeout(() => { suppressClick = false; }, 0);
    } else {
      suppressClick = false;
    }
  };

  trackEl.addEventListener('pointerup', endScrub, { signal });
  trackEl.addEventListener('pointercancel', endScrub, { signal });

  baseList.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      return;
    }
    const link = event.target.closest?.('.tabbar__item');
    if (!link) return;
    const idx = links.indexOf(link);
    if (idx >= 0) {
      setActiveIndex(idx);
      track(`tab-${link.dataset.tabId || idx}`);
    }
  }, { signal });

  // Scrollspy on homepage: prefers native scroll-target-group when supported,
  // with IntersectionObserver fallback and top-of-page fallback to Work.
  if (isHome) {
    const sections = ['work', 'about', 'contact']
      .map((id) => ({ id, el: document.getElementById(id), idx: links.findIndex((a) => a.dataset.tabId === id) }))
      .filter((s) => s.el && s.idx >= 0);

    const supportsScrollTargetGroup = typeof CSS !== 'undefined' && CSS.supports?.('scroll-target-group', 'auto');

    const syncFromScrollTarget = () => {
      if (scrubbing) return;
      const targetLink = baseList.querySelector('a:target-current');
      if (targetLink) {
        const idx = links.indexOf(targetLink);
        if (idx >= 0) {
          setActiveIndex(idx);
          return;
        }
      }
      if (window.scrollY < 160 && sections[0]) {
        setActiveIndex(sections[0].idx, { updateAria: true });
      }
    };

    if (supportsScrollTargetGroup) {
      document.addEventListener('scrollend', syncFromScrollTarget, { signal });
    }

    if ('IntersectionObserver' in window && sections.length > 0) {
      const visible = new Set();
      const observer = new IntersectionObserver((entries) => {
        if (scrubbing) return;
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        if (window.scrollY < 140) {
          setActiveIndex(sections[0].idx);
          return;
        }
        for (let i = sections.length - 1; i >= 0; i -= 1) {
          if (visible.has(sections[i].el)) {
            setActiveIndex(sections[i].idx);
            return;
          }
        }
      }, { rootMargin: '-32% 0px -45% 0px', threshold: 0 });

      for (const s of sections) observer.observe(s.el);
      signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    }
  }

  window.addEventListener('thijnperd:langchange', () => {
    for (const [src, dst] of mirrorLabels) {
      dst.textContent = src.textContent;
    }
    requestAnimationFrame(() => {
      measure();
      setActiveIndex(activeIndex, { immediate: true, updateAria: false });
    });
  }, { signal });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      if (!mobileQuery.matches) return;
      if (measure()) setActiveIndex(activeIndex, { immediate: true, updateAria: false });
    });
    ro.observe(trackEl);
    signal.addEventListener('abort', () => ro.disconnect(), { once: true });
  }

  mobileQuery.addEventListener('change', (ev) => {
    if (ev.matches) {
      requestAnimationFrame(() => {
        if (measure()) setActiveIndex(activeIndex, { immediate: true, updateAria: false });
      });
    }
  }, { signal });

  document.fonts?.ready?.then(() => {
    if (mobileQuery.matches && measure()) {
      setActiveIndex(activeIndex, { immediate: true, updateAria: false });
    }
  });

  requestAnimationFrame(() => {
    measure();
    setActiveIndex(activeIndex, { immediate: true });
  });

  window.addEventListener('pagehide', () => {
    if (rafId) cancelAnimationFrame(rafId);
    controller.abort();
  }, { signal, once: true });

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    controller.abort();
  };
}
