// Headings highlight with a dithered block instead of the flat browser selection.
// The native highlight is hidden for headings in CSS; this paints the pattern behind
// the same client rects, so it follows wrapping and multi-line selections.
//
// The blocks live inside the heading rather than in a page-level layer: the hero is
// its own stacking context, so an overlay parented to <body> would paint over the
// hero title instead of behind it.

const HEADINGS = 'h1, h2, h3, .hero__title, .case-hero__title';

export function initDitherSelection() {
  if (typeof document === 'undefined' || !window.getSelection) return;

  let frame = 0;
  let target = null;
  const blocks = [];

  const clear = () => {
    for (const block of blocks.splice(0)) block.remove();
    if (target) {
      target.classList.remove('dither-selection-target');
      target = null;
    }
  };

  const paint = () => {
    frame = 0;
    clear();

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const start = range.startContainer;
    const element = start.nodeType === Node.ELEMENT_NODE ? start : start.parentElement;
    const heading = element && element.closest(HEADINGS);
    if (!heading) return;

    const rects = [...range.getClientRects()].filter((rect) => rect.width >= 2 && rect.height >= 2);
    if (!rects.length) return;

    const base = heading.getBoundingClientRect();
    target = heading;
    heading.classList.add('dither-selection-target');

    for (const rect of rects) {
      const block = document.createElement('span');
      block.className = 'dither-selection-block';
      block.setAttribute('aria-hidden', 'true');
      block.style.left = `${rect.left - base.left}px`;
      block.style.top = `${rect.top - base.top}px`;
      block.style.width = `${rect.width}px`;
      block.style.height = `${rect.height}px`;
      heading.append(block);
      blocks.push(block);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  };

  document.addEventListener('selectionchange', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}
