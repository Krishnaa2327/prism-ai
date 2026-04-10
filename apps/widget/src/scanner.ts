// ─── Auto DOM Scanner ─────────────────────────────────────────────────────────
// Scans the live page for interactive elements and returns a semantic map.
// Sent to the agent on every message so it can reference real selectors
// without any per-flow CSS selector configuration.
//
// Each element is fingerprinted with every stable signal available
// (text, role, ariaLabel, placeholder, name, dataTestId, classes, rect)
// so the self-healing resolver can recover when a CSS selector breaks
// after a UI redesign.

export interface ScannedElement {
  tag: string;
  selector: string;       // primary CSS selector (may become stale after UI changes)
  text: string;           // visible text / button label
  type?: string;          // input[type]
  // ─── Fingerprint signals for self-healing ───────────────────────────────────
  ariaLabel?: string;     // aria-label attribute
  placeholder?: string;   // placeholder text (inputs/textareas)
  name?: string;          // name attribute
  dataTestId?: string;    // data-testid or data-cy
  role?: string;          // aria role or implicit role
  classes: string[];      // CSS classes (filtered, for fuzzy matching)
  rect: { x: number; y: number; w: number; h: number }; // viewport position
}

// Backward-compatible alias used by PageContext and the backend
export type PageElement = Pick<ScannedElement, 'tag' | 'selector' | 'text' | 'type'>;

export interface PageContext {
  url: string;
  title: string;
  headings: string[];
  elements: PageElement[]; // kept lean for the AI prompt — full data in elementIndex
}

// ─── Module-level element index ───────────────────────────────────────────────
// Updated on every scanPage() call. The resolver reads from this to find
// fingerprints by their original selector string.
let _elementIndex: Map<string, ScannedElement> = new Map();

export function getElementIndex(): ReadonlyMap<string, ScannedElement> {
  return _elementIndex;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bestSelector(el: Element): string {
  if (el.id && !el.id.startsWith('oai-')) return `#${el.id}`;
  const name = el.getAttribute('name');
  if (name) return `[name="${name}"]`;
  const testId = el.getAttribute('data-testid') || el.getAttribute('data-cy');
  if (testId) return `[data-testid="${testId}"]`;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('oai-'))
    .slice(0, 2)
    .join('.');
  return classes
    ? `${el.tagName.toLowerCase()}.${classes}`
    : el.tagName.toLowerCase();
}

function labelFor(el: Element): string {
  const id = el.id;
  if (id) {
    const label = document.querySelector<HTMLElement>(`label[for="${id}"]`);
    if (label) return label.innerText.trim();
  }
  const wrappingLabel = el.closest('label');
  if (wrappingLabel) {
    return wrappingLabel.innerText.replace((el as HTMLInputElement).value ?? '', '').trim();
  }
  return '';
}

function implicitRole(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const roleMap: Record<string, string> = {
    button: 'button', a: 'link', input: 'textbox',
    select: 'combobox', textarea: 'textbox', h1: 'heading',
    h2: 'heading', h3: 'heading', nav: 'navigation',
  };
  return el.getAttribute('role') || roleMap[tag] || tag;
}

function getRect(el: Element): ScannedElement['rect'] {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
}

function fingerprint(el: Element, tag: string, text: string, type?: string): ScannedElement {
  return {
    tag,
    selector: bestSelector(el),
    text,
    type,
    ariaLabel:   el.getAttribute('aria-label')   || undefined,
    placeholder: el.getAttribute('placeholder')  || undefined,
    name:        el.getAttribute('name')          || undefined,
    dataTestId:  el.getAttribute('data-testid') || el.getAttribute('data-cy') || undefined,
    role:        implicitRole(el),
    classes:     Array.from(el.classList).filter((c) => !c.startsWith('oai-')),
    rect:        getRect(el),
  };
}

// ─── Main scan ────────────────────────────────────────────────────────────────

export function scanPage(): PageContext {
  const elements: ScannedElement[] = [];
  const seen = new Set<string>();

  const push = (item: ScannedElement) => {
    if (seen.has(item.selector)) return;
    seen.add(item.selector);
    elements.push(item);
  };

  // Buttons
  document.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [role="button"], input[type="submit"], input[type="button"]'
  ).forEach((el) => {
    if (el.closest('#oai-root')) return;
    const text =
      el.innerText?.trim() ||
      el.getAttribute('aria-label') ||
      (el as HTMLInputElement).value ||
      '';
    if (!text) return;
    push(fingerprint(el, 'button', text));
  });

  // Inputs / textareas / selects
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  ).forEach((el) => {
    if (el.closest('#oai-root')) return;
    const text =
      labelFor(el) ||
      el.getAttribute('placeholder') ||
      el.getAttribute('aria-label') ||
      el.getAttribute('name') ||
      '';
    push(fingerprint(el, el.tagName.toLowerCase(), text, (el as HTMLInputElement).type || undefined));
  });

  // Links
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((el) => {
    if (el.closest('#oai-root')) return;
    const text = el.innerText?.trim();
    if (!text || text.length > 50) return;
    push(fingerprint(el, 'a', text));
  });

  // Update module-level index for the resolver
  _elementIndex = new Map(elements.map((e) => [e.selector, e]));

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((h) => (h as HTMLElement).innerText?.trim())
    .filter(Boolean)
    .slice(0, 6) as string[];

  return {
    url: window.location.pathname,
    title: document.title,
    headings,
    // Send lean PageElement objects to the AI (no rect/classes — keeps prompt small)
    elements: elements.slice(0, 50).map(({ tag, selector, text, type }) => ({ tag, selector, text, type })),
  };
}
