// Live 8x8 Bayer plate at 1 canvas pixel per dither cell.

const BAYER8 = (() => {
  const bayer2 = (x, y) => {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const value = fx / 2 + fy * fy * 0.75;
    return value - Math.floor(value);
  };
  const bayer4 = (x, y) => bayer2(x * 0.5, y * 0.5) * 0.25 + bayer2(x, y);

  const table = new Float32Array(64);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      table[y * 8 + x] = bayer4(x * 0.5, y * 0.5) * 0.25 + bayer2(x, y);
    }
  }
  return table;
})();

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function readColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue('--ink').trim() || '#121614',
    paper: styles.getPropertyValue('--paper').trim() || '#e4e6e1',
  };
}

export function initNotFoundSignal(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;

  let cols = 0;
  let rows = 0;
  let mask = null;
  let colors = readColors();
  let frameId = 0;
  let last = 0;
  let carry = 0;
  let time = 0;
  let visible = true;
  let running = false;
  let resizeFrame = 0;

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    const cell = rect.width < 560 ? 4 : 5;
    cols = Math.max(64, Math.round(rect.width / cell));
    rows = Math.max(40, Math.round((rect.height || 240) / cell));

    canvas.width = cols;
    canvas.height = rows;

    const glyph = document.createElement('canvas');
    glyph.width = cols;
    glyph.height = rows;
    const g = glyph.getContext('2d', { willReadFrequently: true });

    let size = Math.min(rows * 0.74, 80);
    g.font = `500 ${size}px "Clash Display", "Cabinet Grotesk", sans-serif`;
    const measured = g.measureText('404').width || 1;
    const target = cols * 0.64;
    if (measured > target) {
      size *= target / measured;
      g.font = `500 ${size}px "Clash Display", "Cabinet Grotesk", sans-serif`;
    }

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText('404', cols / 2, rows * 0.52);

    const data = g.getImageData(0, 0, cols, rows).data;
    mask = new Uint8Array(cols * rows);
    for (let i = 0; i < mask.length; i += 1) {
      mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
    }
    colors = readColors();
  };

  const field = (u, v, t) => {
    const ax = 0.5 + 0.17 * Math.cos(t * 0.23);
    const ay = 0.5 + 0.13 * Math.sin(t * 0.19);
    const bx = 0.5 + 0.21 * Math.cos(t * 0.11 + 2.4);
    const by = 0.5 + 0.17 * Math.sin(t * 0.15 + 1.1);
    const d1 = Math.hypot(u - ax, (v - ay) * 1.7);
    const d2 = Math.hypot(u - bx, (v - by) * 1.5);
    return (
      0.5 +
      0.25 * Math.sin(d1 * 26 - t * 1.2) +
      0.25 * Math.sin(d2 * 19 + t * 0.9)
    );
  };

  const render = (t) => {
    if (!cols || !rows || !mask) return;
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, cols, rows);
    ctx.fillStyle = colors.ink;

    const denomX = Math.max(cols - 1, 1);
    const denomY = Math.max(rows - 1, 1);

    for (let y = 0; y < rows; y += 1) {
      const v = y / denomY;
      const horizon = smoothstep(0.55, 1, v);
      for (let x = 0; x < cols; x += 1) {
        const u = x / denomX;
        const f = field(u, v, t);
        const inside = mask[y * cols + x] === 1;
        const density = inside
          ? 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.8 + u * 4 + f * 2))
          : 0.012 + 0.3 * horizon * (0.3 + 0.7 * f);

        if (BAYER8[(y & 7) * 8 + (x & 7)] < density) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  };

  const frame = (now) => {
    if (!running) return;
    frameId = requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    carry += delta;
    if (carry < 1 / 30) return;
    time += carry;
    carry = 0;
    render(time);
  };

  const start = () => {
    if (running || reduceMotion || saveData) return;
    if (!visible || document.hidden) return;
    running = true;
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const sync = () => {
    if (visible && !document.hidden) start();
    else stop();
  };

  const scheduleBuild = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      build();
      render(time);
    });
  };

  build();
  render(time);

  if (reduceMotion || saveData) return;

  document.fonts?.ready.then(() => {
    build();
    render(time);
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleBuild).observe(canvas);
  } else {
    window.addEventListener('resize', scheduleBuild, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0 },
    ).observe(canvas);
  }

  document.addEventListener('visibilitychange', sync);
  start();
}

initNotFoundSignal(document.querySelector('[data-notfound-canvas]'));
