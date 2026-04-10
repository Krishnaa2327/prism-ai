// Fetches and renders the org's checklist steps inside the widget panel.
// Completion state is stored in localStorage so it persists for each end user.

export interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  order: number;
  completionEvent: string | null;
  isRequired: boolean;
}

const STORAGE_PREFIX = '__oai_cl_';

function storageKey(orgKey: string) {
  return `${STORAGE_PREFIX}${orgKey}`;
}

function loadDoneIds(orgKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(orgKey));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDoneIds(orgKey: string, ids: Set<string>) {
  localStorage.setItem(storageKey(orgKey), JSON.stringify([...ids]));
}

export class ChecklistManager {
  private steps: ChecklistStep[] = [];
  private doneIds: Set<string>;
  private readonly orgKey: string;
  private panelEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;

  constructor(apiKey: string) {
    // Use first 8 chars of apiKey as the localStorage namespace
    this.orgKey = apiKey.slice(0, 8);
    this.doneIds = loadDoneIds(this.orgKey);
  }

  async fetchSteps(apiUrl: string, apiKey: string): Promise<void> {
    try {
      const res = await fetch(`${apiUrl}/api/v1/checklist`, {
        headers: { 'X-API-Key': apiKey },
      });
      if (!res.ok) return;
      const data = await res.json();
      this.steps = data.steps ?? [];
    } catch {
      // silently fail — checklist is non-critical
    }
  }

  /** Mark a step done when a matching event fires */
  onEvent(eventType: string) {
    this.steps
      .filter((s) => s.completionEvent === eventType)
      .forEach((s) => this.markDone(s.id));
  }

  markDone(stepId: string) {
    this.doneIds.add(stepId);
    saveDoneIds(this.orgKey, this.doneIds);
    this.render();
  }

  get pendingCount(): number {
    return this.steps.filter((s) => !this.doneIds.has(s.id)).length;
  }

  /** Render into #oai-checklist-panel */
  render() {
    const panel = document.getElementById('oai-checklist-panel');
    const badge = document.getElementById('oai-cl-badge');
    if (!panel) return;

    this.panelEl = panel;
    this.badgeEl = badge;
    panel.innerHTML = '';

    if (this.steps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'oai-cl-empty';
      empty.textContent = 'No checklist configured yet.';
      panel.appendChild(empty);
      return;
    }

    this.steps.forEach((step) => {
      const done = this.doneIds.has(step.id);

      const item = document.createElement('div');
      item.className = `oai-cl-item${done ? ' oai-cl-done' : ''}`;
      item.setAttribute('data-step-id', step.id);

      const check = document.createElement('div');
      check.className = 'oai-cl-check';
      check.textContent = done ? '✓' : '';

      const textBlock = document.createElement('div');
      textBlock.style.flex = '1';

      const label = document.createElement('div');
      label.className = 'oai-cl-label';
      label.textContent = step.label;

      textBlock.appendChild(label);

      if (step.description) {
        const desc = document.createElement('div');
        desc.className = 'oai-cl-desc';
        desc.textContent = step.description;
        textBlock.appendChild(desc);
      }

      item.appendChild(check);
      item.appendChild(textBlock);

      // Click to toggle done
      item.addEventListener('click', () => {
        if (this.doneIds.has(step.id)) {
          this.doneIds.delete(step.id);
        } else {
          this.doneIds.add(step.id);
        }
        saveDoneIds(this.orgKey, this.doneIds);
        this.render();
      });

      panel.appendChild(item);
    });

    // Update badge
    if (badge) {
      const pending = this.pendingCount;
      if (pending > 0) {
        badge.textContent = String(pending);
        badge.classList.remove('oai-hidden');
      } else {
        badge.classList.add('oai-hidden');
      }
    }
  }
}
