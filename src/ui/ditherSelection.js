// Headings highlight with a dithered block instead of the flat browser selection.
// The native highlight is hidden for headings in CSS; this paints the pattern over
// the same client rects, so it follows wrapping and multi-line selections.

const HEADINGS = 'h1, h2, h3, .hero__title, .case-hero__title';

export function initDitherSelection() {
  if (typeof document === 'undefined' || !window.getSelection) return;

  const layer = document.createElement('div');
  layer.className = 'dither-selection';
  layer.setAttribute('aria-hidden', 'true');

  let frame = 0;

  const clear = () => {
    if (layer.childElementCount) layer.replaceChildren();
  };

  const paint = () => {
    frame = 0;
    clear();

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const start = range.startContainer;
    const element = start.nodeType === Node.ELEMENT_NODE ? start : start.parentElement;
    if (!element || !element.closest(HEADINGS)) return;

    for (const rect of range.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) continue;
      const block = document.createElement('span');
      block.style.left = `${rect.left}px`;
      block.style.top = `${rect.top}px`;
      block.style.width = `${rect.width}px`;
      block.style.height = `${rect.height}px`;
      layer.append(block);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  };

  document.addEventListener('selectionchange', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  // Created lazily so an unselected page carries no extra node.
  const ensureLayer = () => {
    if (!layer.isConnected) document.body.append(layer);
    schedule();
  };

  document.addEventListener('pointerup', ensureLayer, { passive: true });
  document.addEventListener('keyup', ensureLayer);
  document.addEventListener('selectionchange', () => {
    if (!layer.isConnected) document.body.append(layer);
  });
}
