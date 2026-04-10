// Scans the page for form fields and offers to pre-fill them using
// the user's known metadata (passed via OnboardAI('init', { metadata: {...} }))

type Metadata = Record<string, unknown>;

// ─── Field matching heuristics ───────────────────────────────────────────────
// Maps common metadata keys → field name/id/placeholder patterns to match against

const FIELD_MAP: Record<string, string[]> = {
  name:        ['name', 'full_name', 'fullname', 'your name', 'full name'],
  firstName:   ['first_name', 'firstname', 'first name', 'given name', 'fname'],
  lastName:    ['last_name', 'lastname', 'last name', 'family name', 'lname', 'surname'],
  email:       ['email', 'e-mail', 'email address', 'your email'],
  company:     ['company', 'organization', 'org', 'company name', 'business', 'employer'],
  role:        ['role', 'job title', 'title', 'position', 'job role'],
  phone:       ['phone', 'mobile', 'telephone', 'tel', 'phone number'],
  website:     ['website', 'url', 'site', 'web', 'homepage'],
  city:        ['city', 'town'],
  country:     ['country'],
  plan:        ['plan', 'tier'],
};

interface MatchedField {
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  value: string;
}

export class FormFiller {
  private readonly metadata: Metadata;
  private matches: MatchedField[] = [];

  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  /** Scan all form fields on the page and return true if any matches found */
  scan(): boolean {
    this.matches = [];

    const fields = Array.from(
      document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select')
    ) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

    for (const el of fields) {
      const hint = this.getFieldHint(el);
      if (!hint) continue;

      const value = this.matchValue(hint);
      if (value) {
        this.matches.push({ el, value });
      }
    }

    return this.matches.length > 0;
  }

  /** Fill all matched fields */
  fill() {
    for (const { el, value } of this.matches) {
      el.value = value;
      // Trigger input/change events so React/Vue/Angular frameworks pick it up
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      // Brief highlight animation
      const orig = el.style.outline;
      el.style.outline = '2px solid #6366f1';
      setTimeout(() => { el.style.outline = orig; }, 1200);
    }
  }

  /** Extract a normalised hint string from a field element */
  private getFieldHint(el: HTMLElement): string {
    const parts: string[] = [];

    // id / name attribute
    parts.push(el.getAttribute('id') ?? '');
    parts.push(el.getAttribute('name') ?? '');
    parts.push((el as HTMLInputElement).placeholder ?? '');

    // aria-label
    parts.push(el.getAttribute('aria-label') ?? '');

    // <label> element that references this field
    const id = el.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) parts.push(label.textContent ?? '');
    }

    // Enclosing label
    const parentLabel = el.closest('label');
    if (parentLabel) parts.push(parentLabel.textContent ?? '');

    return parts.join(' ').toLowerCase().replace(/[^a-z0-9 _-]/g, ' ');
  }

  /** Check if any of the hint words match a metadata field */
  private matchValue(hint: string): string {
    for (const [metaKey, patterns] of Object.entries(FIELD_MAP)) {
      const raw = this.metadata[metaKey];
      if (!raw) continue;

      const value = String(raw);
      if (patterns.some((p) => hint.includes(p))) {
        return value;
      }
    }

    // Flatten first/last name → full name if available
    if (FIELD_MAP.name.some((p) => hint.includes(p))) {
      const first = this.metadata.firstName ?? '';
      const last = this.metadata.lastName ?? '';
      if (first || last) return `${first} ${last}`.trim();
    }

    return '';
  }
}
