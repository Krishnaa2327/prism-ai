// ─── Animated cursor — visually moves to elements before the AI fills them ────
// Creates a custom pointer SVG that glides across the screen to each target
// element, pauses, then the fill happens. Mimics the Tandem-style "pointer
// works in front of you" experience.

const CURSOR_ID = '__prism_cursor__';
const CURSOR_SIZE = 28;

// Pointer SVG — matches a standard OS cursor arrow, indigo-tinted
const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 24 24" fill="none">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
  </filter>
  <path filter="url(#shadow)" d="M4 2L4 18L7.5 14.5L10.5 21L12.5 20L9.5 13.5L14 13.5L4 2Z" fill="#6366f1" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

function getCursor(): HTMLElement | null {
  return document.getElementById(CURSOR_ID);
}

function createCursor(): HTMLElement {
  const el = document.createElement('div');
  el.id = CURSOR_ID;
  el.innerHTML = CURSOR_SVG;
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    width: `${CURSOR_SIZE}px`,
    height: `${CURSOR_SIZE}px`,
    transform: `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`,
    transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',
  });
  document.body.appendChild(el);
  return el;
}

function removeCursor(): void {
  getCursor()?.remove();
}

/** Move cursor to an element, wait for animation + pause, then resolve */
function moveCursorToElement(el: Element, cursor: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect();
    // Aim at the left-center of the field (where user would click to focus)
    const targetX = rect.left + 12;
    const targetY = rect.top + rect.height / 2 - 4;

    cursor.style.transform = `translate(${targetX}px, ${targetY}px)`;

    // Wait for CSS transition (550ms) + brief hover pause (300ms)
    setTimeout(resolve, 850);
  });
}

/** Add a subtle pulse on the field to signal "about to fill" */
function pulseField(el: HTMLElement): void {
  const prev = el.style.outline;
  const prevTransition = el.style.transition;
  el.style.transition = 'outline 0.15s ease';
  el.style.outline = '2px solid #6366f1';
  setTimeout(() => {
    el.style.outline = prev;
    el.style.transition = prevTransition;
  }, 700);
}

/** Fill a single field with a typewriter-style character-by-character effect */
function typeIntoField(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  return new Promise((resolve) => {
    if (el.tagName === 'SELECT') {
      // Selects can't be typed — just set directly
      (el as HTMLSelectElement).value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(resolve, 150);
      return;
    }

    el.focus();
    el.value = '';

    const chars = value.split('');
    let i = 0;
    // Typing speed: ~40–70ms per char, slightly randomised
    const BASE_DELAY = 55;

    function typeNext() {
      if (i >= chars.length) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(resolve, 120);
        return;
      }
      el.value += chars[i++];
      // Fire input event on every keypress so frameworks stay in sync
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const jitter = Math.random() * 30 - 15;
      setTimeout(typeNext, BASE_DELAY + jitter);
    }

    typeNext();
  });
}

/**
 * High-level: animate cursor to each field in sequence, typing each value.
 * Returns a promise that resolves when all fields are filled.
 *
 * @param fields  Map of resolved CSS selector → value to fill
 * @param getEl   Resolver: selector → element (or null on miss)
 */
export async function animatedFillFields(
  fields: Record<string, string>,
  getEl: (selector: string) => HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null,
): Promise<void> {
  // Spawn cursor at center of viewport
  let cursor = getCursor();
  if (!cursor) cursor = createCursor();

  // Tiny settle delay so the cursor appears before animating
  await new Promise((r) => setTimeout(r, 80));

  for (const [selector, value] of Object.entries(fields)) {
    const el = getEl(selector);
    if (!el) continue;

    await moveCursorToElement(el, cursor);
    pulseField(el as HTMLElement);
    await typeIntoField(el, value);

    // Small gap between fields
    await new Promise((r) => setTimeout(r, 220));
  }

  // Fade out cursor
  cursor.style.transition = 'opacity 0.3s ease';
  cursor.style.opacity = '0';
  setTimeout(removeCursor, 320);
}
