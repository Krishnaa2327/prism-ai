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

// PageElement includes value so the agent can verify fills
export type PageElement = Pick<ScannedElement, 'tag' | 'selector' | 'text' | 'type'> & { value?: string };

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

  // Inputs / textareas / selects — sensitive fields are excluded from the
  // page context sent to the AI (password, credit card, CVV, etc.)
  const SENSITIVE_AUTOCOMPLETE = new Set([
    'current-password', 'new-password', 'cc-number', 'cc-csc',
    'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-name',
  ]);
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="password"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  ).forEach((el) => {
    if (el.closest('#oai-root')) return;
    // Skip sensitive autocomplete hints (credit card, passwords)
    const ac = el.getAttribute('autocomplete') ?? '';
    if (SENSITIVE_AUTOCOMPLETE.has(ac)) return;
    // Skip any field whose name/id looks like a password field
    const nameAttr = (el.getAttribute('name') ?? '').toLowerCase();
    const idAttr   = (el.getAttribute('id')   ?? '').toLowerCase();
    if (nameAttr.includes('password') || idAttr.includes('password')) return;

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
    // Include current field value so the agent can verify fills during __verify__ turns
    elements: elements.slice(0, 50).map(({ tag, selector, text, type }) => {
      const el = document.querySelector(selector) as HTMLInputElement | null;
      const value = (el && (el as HTMLInputElement).value) ? (el as HTMLInputElement).value : undefined;
      return { tag, selector, text, type, ...(value ? { value } : {}) };
    }),
  };
}

// ─── Semantic DOM layer ───────────────────────────────────────────────────────
// Produces a structured natural-language summary of the current page state for
// goal-mode agent turns. Gives the agent richer reasoning material than a raw
// element dump.

function detectPageType(): string {
  // Wizard / stepper
  if (document.querySelector('[class*="wizard"], [class*="stepper"], [class*="step-indicator"], [role="tablist"]')) {
    return 'Multi-step wizard';
  }
  // Settings / config
  const title = document.title.toLowerCase();
  const h1 = document.querySelector('h1')?.textContent?.toLowerCase() ?? '';
  if (title.includes('setting') || h1.includes('setting') || h1.includes('config')) return 'Settings page';
  // Dashboard
  if (title.includes('dashboard') || h1.includes('dashboard') || document.querySelectorAll('[class*="card"], [class*="metric"], [class*="stat"]').length > 3) return 'Dashboard';
  // Form-heavy
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="search"]), textarea, select');
  if (inputs.length >= 3) return 'Form';
  return 'Page';
}

function detectWizard(): { current: number; total: number; stepTitle: string } | null {
  // Look for step indicators with active/current state
  const steps = Array.from(document.querySelectorAll('[class*="step"]:not([class*="complete"]):not([class*="done"])'));
  const activeStep = steps.find((el) =>
    el.classList.toString().match(/active|current|selected/) ||
    el.getAttribute('aria-current') === 'step'
  );
  if (!activeStep) return null;
  const total = steps.length;
  if (total < 2) return null;
  const current = steps.indexOf(activeStep) + 1;
  const stepTitle = (activeStep as HTMLElement).innerText?.trim().slice(0, 50) ?? '';
  return { current, total, stepTitle };
}

function detectFormSections(): string[] {
  const sections: string[] = [];
  // fieldset legends
  document.querySelectorAll('fieldset > legend').forEach((el) => {
    const text = (el as HTMLElement).innerText?.trim();
    if (text) sections.push(text);
  });
  // section headings near forms
  document.querySelectorAll('h2, h3, h4').forEach((el) => {
    const next = el.nextElementSibling;
    if (next && (next.tagName === 'FORM' || next.querySelector('input, select, textarea'))) {
      const text = (el as HTMLElement).innerText?.trim();
      if (text) sections.push(text);
    }
  });
  return sections.slice(0, 3);
}

function categorizeFields(): { required: string[]; optional: string[]; filled: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  const filled: string[] = [];

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  ).forEach((el) => {
    if (el.closest('#oai-root')) return;
    const label = fieldLabel(el);
    if (!label) return;

    const value = (el as HTMLInputElement).value?.trim();
    const isRequired = el.required || el.getAttribute('aria-required') === 'true' || !!el.closest('[data-required]');

    if (value) {
      filled.push(`${label}="${value.slice(0, 30)}"`);
    } else if (isRequired) {
      required.push(label);
    } else {
      optional.push(label);
    }
  });

  return { required: required.slice(0, 8), optional: optional.slice(0, 5), filled: filled.slice(0, 8) };
}

function fieldLabel(el: Element): string {
  const id = el.id;
  if (id) {
    const lbl = document.querySelector<HTMLElement>(`label[for="${id}"]`);
    if (lbl) return lbl.innerText.trim().replace(/[*:]/g, '').trim();
  }
  const wrapping = el.closest('label');
  if (wrapping) return (wrapping as HTMLElement).innerText.replace((el as HTMLInputElement).value ?? '', '').trim().replace(/[*:]/g, '').trim();
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';
}

function detectPrimaryButton(): { label: string; disabled: boolean } | null {
  // Submit buttons and primary-styled buttons
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
    'button[type="submit"], input[type="submit"], button.primary, button[class*="primary"], button[class*="submit"], button[class*="save"], button[class*="continue"], button[class*="next"]'
  )).filter((el) => !el.closest('#oai-root'));

  if (candidates.length === 0) return null;
  const btn = candidates[0];
  const label = (btn as HTMLButtonElement).innerText?.trim() || (btn as HTMLInputElement).value || btn.getAttribute('aria-label') || 'Submit';
  return { label: label.slice(0, 40), disabled: (btn as HTMLButtonElement).disabled };
}

function detectErrors(): string[] {
  const errors: string[] = [];
  document.querySelectorAll<HTMLElement>(
    '[role="alert"], [class*="error"]:not([class*="oai"]), [class*="invalid"]:not([class*="oai"]), .field-error, [aria-invalid="true"] + *, [data-error]'
  ).forEach((el) => {
    if (el.closest('#oai-root')) return;
    const text = el.innerText?.trim();
    if (text && text.length < 120) errors.push(text);
  });
  return [...new Set(errors)].slice(0, 5);
}

export function buildSemanticSummary(): string {
  const lines: string[] = [];

  // ── Page type detection ──────────────────────────────────────────────────────
  const pageType = detectPageType();
  lines.push(`PAGE TYPE: ${pageType}`);

  // ── Wizard / stepper detection ───────────────────────────────────────────────
  const wizard = detectWizard();
  if (wizard) lines.push(`WIZARD: Step ${wizard.current} of ${wizard.total} — "${wizard.stepTitle}"`);

  // ── Form sections ────────────────────────────────────────────────────────────
  const sections = detectFormSections();
  if (sections.length > 0) {
    lines.push(`ACTIVE SECTION: "${sections[0]}"`);
  }

  // ── Field states ─────────────────────────────────────────────────────────────
  const { required, optional, filled } = categorizeFields();
  if (required.length > 0) lines.push(`REQUIRED (empty): ${required.join(', ')}`);
  if (filled.length > 0)   lines.push(`FILLED: ${filled.join(', ')}`);
  if (optional.length > 0 && optional.length <= 5) lines.push(`OPTIONAL: ${optional.join(', ')}`);

  // ── Submit / primary action ───────────────────────────────────────────────────
  const primaryBtn = detectPrimaryButton();
  if (primaryBtn) lines.push(`PRIMARY ACTION: "${primaryBtn.label}" (${primaryBtn.disabled ? 'disabled' : 'enabled'})`);

  // ── Errors ───────────────────────────────────────────────────────────────────
  const errors = detectErrors();
  if (errors.length > 0) lines.push(`ERRORS: ${errors.slice(0, 3).join('; ')}`);
  else lines.push('ERRORS: None');

  return lines.join('\n');
}
