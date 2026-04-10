// ─── Self-Healing Element Resolver ────────────────────────────────────────────
// When a CSS selector fails (element not found), tries 7 fallback strategies
// using the element's stored fingerprint signals. This makes flows survive
// UI redesigns where IDs/classes change but the element's purpose doesn't.
//
// Strategy order (most stable → least stable):
//   primary       → exact CSS selector match
//   data-testid   → [data-testid="..."] — most stable identifier, set by devs
//   name          → [name="..."] — stable for form fields
//   aria-label    → [aria-label="..."] — semantic, rarely changes
//   placeholder   → [placeholder="..."] — stable for inputs
//   exact-text    → element with exact same visible text
//   fuzzy-class   → element whose CSS classes overlap ≥ 70% (Jaccard)
//   fuzzy-text    → element whose text matches ≥ 80% (word-overlap)

import { ScannedElement, getElementIndex } from './scanner';

export type HealStrategy =
  | 'primary'
  | 'data-testid'
  | 'name'
  | 'aria-label'
  | 'placeholder'
  | 'exact-text'
  | 'fuzzy-class'
  | 'fuzzy-text'
  | 'failed';

export interface ResolveResult {
  el: HTMLElement;
  strategy: HealStrategy;
  healed: boolean;           // true if any fallback was used
  originalSelector: string;
  usedSelector?: string;     // the selector/signal that actually found the element
}

// ─── Text normalisation ───────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(norm(a).split(' ').filter(Boolean));
  const wb = new Set(norm(b).split(' ').filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let hits = 0;
  wa.forEach((w) => { if (wb.has(w)) hits++; });
  return hits / Math.max(wa.size, wb.size);
}

// ─── Class Jaccard ────────────────────────────────────────────────────────────

function classJaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((c) => { if (sb.has(c)) inter++; });
  return inter / (sa.size + sb.size - inter);
}

// ─── Candidate scoping ────────────────────────────────────────────────────────
// Restrict fallback search to the same tag family so "Submit" doesn't match
// an <h2> with "Submit" in its text.

function tagScope(hints: Partial<ScannedElement>): string {
  const tag = hints.tag?.toLowerCase() ?? '';
  if (tag === 'button') return 'button, [role="button"], input[type="submit"], input[type="button"]';
  if (tag === 'a') return 'a[href]';
  if (tag === 'input') return `input[type="${hints.type ?? 'text'}"]`;
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'textarea';
  return '*'; // last resort
}

function candidates(hints: Partial<ScannedElement>): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(tagScope(hints)))
    .filter((el) => !el.closest('#oai-root'));
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export function resolveElement(
  selector: string,
  hints?: Partial<ScannedElement>,
): ResolveResult | null {

  // ── Strategy 1: primary ────────────────────────────────────────────────────
  const primary = document.querySelector<HTMLElement>(selector);
  if (primary) {
    return { el: primary, strategy: 'primary', healed: false, originalSelector: selector };
  }

  // No fingerprint → cannot self-heal
  if (!hints) return null;

  // ── Strategy 2: data-testid ────────────────────────────────────────────────
  if (hints.dataTestId) {
    const esc = CSS.escape(hints.dataTestId);
    const el =
      document.querySelector<HTMLElement>(`[data-testid="${esc}"]`) ??
      document.querySelector<HTMLElement>(`[data-cy="${esc}"]`);
    if (el) return { el, strategy: 'data-testid', healed: true, originalSelector: selector, usedSelector: `[data-testid="${hints.dataTestId}"]` };
  }

  // ── Strategy 3: name ───────────────────────────────────────────────────────
  if (hints.name) {
    const el = document.querySelector<HTMLElement>(`[name="${CSS.escape(hints.name)}"]`);
    if (el) return { el, strategy: 'name', healed: true, originalSelector: selector, usedSelector: `[name="${hints.name}"]` };
  }

  // ── Strategy 4: aria-label ─────────────────────────────────────────────────
  if (hints.ariaLabel) {
    const el = document.querySelector<HTMLElement>(`[aria-label="${CSS.escape(hints.ariaLabel)}"]`);
    if (el) return { el, strategy: 'aria-label', healed: true, originalSelector: selector, usedSelector: `[aria-label="${hints.ariaLabel}"]` };
  }

  // ── Strategy 5: placeholder ────────────────────────────────────────────────
  if (hints.placeholder) {
    const el = document.querySelector<HTMLElement>(`[placeholder="${CSS.escape(hints.placeholder)}"]`);
    if (el) return { el, strategy: 'placeholder', healed: true, originalSelector: selector, usedSelector: `[placeholder="${hints.placeholder}"]` };
  }

  const pool = candidates(hints);

  // ── Strategy 6: exact text match ───────────────────────────────────────────
  if (hints.text) {
    const target = norm(hints.text);
    const el = pool.find((c) => norm(c.innerText ?? c.getAttribute('aria-label') ?? '') === target);
    if (el) return { el, strategy: 'exact-text', healed: true, originalSelector: selector, usedSelector: `[text="${hints.text}"]` };
  }

  // ── Strategy 7: fuzzy class match (Jaccard ≥ 0.7) ─────────────────────────
  if (hints.classes && hints.classes.length > 0) {
    let best: { el: HTMLElement; score: number } | null = null;
    for (const c of pool) {
      const score = classJaccard(hints.classes, Array.from(c.classList));
      if (score >= 0.7 && (!best || score > best.score)) best = { el: c, score };
    }
    if (best) return { el: best.el, strategy: 'fuzzy-class', healed: true, originalSelector: selector };
  }

  // ── Strategy 8: fuzzy text match (word-overlap ≥ 0.8) ─────────────────────
  if (hints.text) {
    let best: { el: HTMLElement; score: number } | null = null;
    for (const c of pool) {
      const label = c.innerText ?? c.getAttribute('aria-label') ?? c.getAttribute('placeholder') ?? '';
      const score = wordOverlap(hints.text, label);
      if (score >= 0.8 && (!best || score > best.score)) best = { el: c, score };
    }
    if (best) return { el: best.el, strategy: 'fuzzy-text', healed: true, originalSelector: selector };
  }

  return null;
}

// ─── Convenience: resolve from live element index ─────────────────────────────
// Uses the fingerprints collected by the most recent scanPage() call.

export function resolveFromIndex(selector: string): ResolveResult | null {
  const hints = getElementIndex().get(selector);
  return resolveElement(selector, hints);
}
