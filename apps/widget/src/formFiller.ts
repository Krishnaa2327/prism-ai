// Scans the page for form fields and offers to pre-fill them using
// the user's known metadata (passed via Prism('init', { metadata: {...} }))

import { animatedFillFields } from './cursor';

type Metadata = Record<string, unknown>;

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
  selector: string;
  value: string;
}

export class FormFiller {
  private readonly metadata: Metadata;
  private matches: MatchedField[] = [];

  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

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
        this.matches.push({ el, selector: this.selectorFor(el), value });
      }
    }

    return this.matches.length > 0;
  }

  /** Fill all matched fields — uses animated cursor for visual feedback */
  async fill(): Promise<void> {
    if (this.matches.length === 0) return;

    const fields: Record<string, string> = {};
    for (const { selector, value } of this.matches) {
      fields[selector] = value;
    }

    await animatedFillFields(fields, (sel) => {
      const el = document.querySelector(sel);
      return el ? el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement : null;
    });
  }

  private selectorFor(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    const name = el.getAttribute('name');
    if (name) return `[name="${name}"]`;
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;
    return el.tagName.toLowerCase();
  }

  private getFieldHint(el: HTMLElement): string {
    const parts: string[] = [];
    parts.push(el.getAttribute('id') ?? '');
    parts.push(el.getAttribute('name') ?? '');
    parts.push((el as HTMLInputElement).placeholder ?? '');
    parts.push(el.getAttribute('aria-label') ?? '');

    const id = el.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) parts.push(label.textContent ?? '');
    }

    const parentLabel = el.closest('label');
    if (parentLabel) parts.push(parentLabel.textContent ?? '');

    return parts.join(' ').toLowerCase().replace(/[^a-z0-9 _-]/g, ' ');
  }

  private matchValue(hint: string): string {
    for (const [metaKey, patterns] of Object.entries(FIELD_MAP)) {
      const raw = this.metadata[metaKey];
      if (!raw) continue;

      const value = String(raw);
      if (patterns.some((p) => hint.includes(p))) {
        return value;
      }
    }

    if (FIELD_MAP.name.some((p) => hint.includes(p))) {
      const first = this.metadata.firstName ?? '';
      const last  = this.metadata.lastName  ?? '';
      if (first || last) return `${first} ${last}`.trim();
    }

    return '';
  }
}
