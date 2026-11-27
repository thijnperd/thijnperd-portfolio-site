import { track } from '../analytics.js';

/**
 * Floating mobile pill tab bar with an M3 Expressive spring-physics pill selector
 * (`k = 800, zeta = 0.6` Fast Spatial) and real-time Bayer icon dithering inside
 * the selector pill. On the home page the bar stays tucked below the viewport
 * until leaving `.hero` (with focus + `inert` management); on subpages it shows
 * immediately.
 */

const SPRING_K = 800;
const SPRING_ZETA = 0.6;
const SPRING_C = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);

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
  let trackPad = 5;
  let currentX = 0;
  let currentW = 0;
  let velX = 0;
  let velW = 0;
  let targetX = 0;
  let targetW = 0;
  let activeIndex = resolveInitialIndex();
  let initialized = false;
  let rafId = 0;
  let lastTs = 0;
  let barVisible = !isHome;

  let scrubbing = false;
  let scrubStartX = 0;
  let scrubStartLeft = 0;
  let scrubPointerId = -1;
  let suppressClick = false;
  let scrubPreviewIndex = -1;
  let lastPointerX = 0;
  let lastPointerTs = 0;
  let scrubVelX = 0;

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

  function setBarVisible(next) {
    const visible = Boolean(next);
    barVisible = visible;
    bar.classList.toggle('is-visible', visible);
    if (visible) {
      bar.inert = false;
      requestAnimationFrame(() => {
        if (mobileQuery.matches) measure();
      });
    } else {
      if (bar.contains(document.activeElement)) {
        document.getElementById('main')?.focus({ preventScroll: true });
      }
      if (isHome) bar.inert = true;
    }
  }

  function measure() {
    const trackRect = trackEl.getBoundingClientRect();
    if (!trackRect.width) return false;
    trackPad = parseFloat(getComputedStyle(trackEl).paddingLeft) || 5;
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
        velX = 0;
        velW = 0;
        initialized = true;
      }
      applyVisual(currentX, currentW, trackRect.width);
    }
    return true;
  }

  function applyVisual(x, w, trackWidth = trackEl.getBoundingClientRect().width) {
    if (!trackWidth || !w) return;
    // Allow minor M3 spring overshoot inside middle track while staying cleanly inside outer pill border
    const minLeft = Math.max(2, trackPad - 2);
    const maxRight = Math.max(minLeft + w, trackWidth - Math.max(2, trackPad - 2));
    const stretch = reducedMotion.matches ? 0 : Math.min(8, Math.abs(velX) * 0.011);
    const stretchedW = Math.min(w + stretch, maxRight - minLeft);
    const center = x + w / 2;
    const renderX = Math.max(minLeft, Math.min(center - stretchedW / 2, maxRight - stretchedW));
    const rightInset = Math.max(0, trackWidth - (renderX + stretchedW));

    indicator.style.transform = `translate3d(${renderX.toFixed(2)}px, 0, 0)`;
    indicator.style.width = `${stretchedW.toFixed(2)}px`;
    ditherList.style.clipPath = `inset(${trackPad}px ${rightInset.toFixed(2)}px ${trackPad}px ${renderX.toFixed(2)}px round 9999px)`;
    indicator.style.opacity = '1';
  }

  function stepAnimation(now) {
    rafId = 0;
    if (scrubbing) {
      lastTs = 0;
      return;
    }

    const dtTotal = lastTs ? Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000)) : 1 / 60;
    lastTs = now;

    const trackWidth = trackEl.getBoundingClientRect().width;
    if (reducedMotion.matches) {
      currentX = targetX;
      currentW = targetW;
      velX = 0;
      velW = 0;
      lastTs = 0;
      applyVisual(currentX, currentW, trackWidth);
      return;
    }

    // Semi-implicit Euler integration in <= 8ms sub-steps for stable k=800 spring across refresh rates
    const steps = Math.max(1, Math.ceil(dtTotal / 0.008));
    const dt = dtTotal / steps;
    for (let i = 0; i < steps; i += 1) {
      const ax = SPRING_K * (targetX - currentX) - SPRING_C * velX;
      const aw = SPRING_K * (targetW - currentW) - SPRING_C * velW;
      velX += ax * dt;
      velW += aw * dt;
      currentX += velX * dt;
      currentW += velW * dt;
    }

    const settled =
      Math.abs(targetX - currentX) < 0.25 &&
      Math.abs(targetW - currentW) < 0.25 &&
      Math.abs(velX) < 4 &&
      Math.abs(velW) < 4;

    if (settled) {
      currentX = targetX;
      currentW = targetW;
      velX = 0;
      velW = 0;
      lastTs = 0;
      applyVisual(currentX, currentW, trackWidth);
      return;
    }

    applyVisual(currentX, currentW, trackWidth);
    rafId = requestAnimationFrame(stepAnimation);
  }

  function startAnimation() {
    if (!rafId && !scrubbing) {
      lastTs = 0;
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
      velX = 0;
      velW = 0;
      lastTs = 0;
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

  // Horizontal thumb-scrubbing across the floating pill with momentum handoff into M3 spring
  trackEl.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (isHome && !barVisible) return;
    if (!boxes.length && !measure()) return;
    scrubPointerId = event.pointerId;
    scrubStartX = event.clientX;
    lastPointerX = event.clientX;
    lastPointerTs = performance.now();
    scrubVelX = 0;
    scrubStartLeft = currentX;
    scrubPreviewIndex = -1;
    suppressClick = false;
  }, { signal });

  trackEl.addEventListener('pointermove', (event) => {
    if (event.pointerId !== scrubPointerId) return;
    const dx = event.clientX - scrubStartX;
    if (!scrubbing && Math.abs(dx) < 8) return;

    const now = performance.now();
    const dt = Math.max(0.008, (now - lastPointerTs) / 1000);
    const instantVel = (event.clientX - lastPointerX) / dt;
    scrubVelX = Math.max(-1200, Math.min(1200, scrubVelX * 0.4 + instantVel * 0.6));
    lastPointerX = event.clientX;
    lastPointerTs = now;

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
    const minLeft = trackPad;
    const maxLeft = Math.max(minLeft, trackWidth - trackPad - w);
    const nextX = Math.max(minLeft, Math.min(maxLeft, scrubStartLeft + dx));
    currentX = nextX;
    currentW = w;
    velX = scrubVelX * 0.45;
    applyVisual(currentX, currentW, trackWidth);
    scrubPreviewIndex = indexAtCenterX(currentX + w / 2);
  }, { signal });

  const endScrub = (event) => {
    if (event.pointerId !== scrubPointerId) return;
    const wasScrubbing = scrubbing;
    const chosen = scrubPreviewIndex;
    const handoffVel = scrubVelX;
    scrubbing = false;
    scrubPointerId = -1;
    scrubPreviewIndex = -1;
    scrubVelX = 0;

    try {
      if (trackEl.hasPointerCapture(event.pointerId)) trackEl.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    if (wasScrubbing && chosen >= 0 && links[chosen]) {
      velX = Math.max(-900, Math.min(900, handoffVel * 0.65));
      setActiveIndex(chosen);
      track(`tab-${links[chosen].dataset.tabId || chosen}`);
      links[chosen].click();
      setTimeout(() => { suppressClick = false; }, 0);
    } else {
      velX = 0;
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

  // Hero-leave reveal & section scrollspy on `/`
  if (isHome) {
    const heroEl = document.querySelector('#top');
    const syncHeroVisibility = () => {
      if (!heroEl) {
        setBarVisible(true);
        return;
      }
      const rect = heroEl.getBoundingClientRect();
      const leftHero = rect.bottom <= window.innerHeight * 0.28;
      if (leftHero !== barVisible) setBarVisible(leftHero);
    };

    if (heroEl && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const leftHero = !entry.isIntersecting || entry.intersectionRatio < 0.2;
          if (leftHero !== barVisible) setBarVisible(leftHero);
        }
      }, { threshold: [0, 0.2, 0.35] });
      heroObserver.observe(heroEl);
      signal.addEventListener('abort', () => heroObserver.disconnect(), { once: true });
    }

    setBarVisible(heroEl ? heroEl.getBoundingClientRect().bottom <= window.innerHeight * 0.28 : true);
    window.addEventListener('scroll', syncHeroVisibility, { passive: true, signal });

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
  } else {
    setBarVisible(true);
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
