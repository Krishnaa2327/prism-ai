// Drop-off & behavior detection
// Triggers: idle timer · exit intent · rage clicks · scroll depth · form abandonment

export type TriggerReason =
  | 'idle'
  | 'exit_intent'
  | 'rage_click'
  | 'form_abandon'
  | 'scroll_depth';

type TriggerCallback = (reason: TriggerReason, meta?: Record<string, unknown>) => void;

// ─── Main DropOffDetector ────────────────────────────────────────────────────
// Orchestrates all sub-detectors and fires the single onTrigger callback

export class DropOffDetector {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private triggered = false;
  private readonly idleThreshold: number;
  private readonly onTrigger: TriggerCallback;

  private rageClickDetector: RageClickDetector;
  private scrollDepthTracker: ScrollDepthTracker;
  private formAbandonDetector: FormAbandonDetector;

  constructor(
    idleThresholdMs: number,
    onTrigger: TriggerCallback,
    onBehaviorEvent?: (type: string, props: Record<string, unknown>) => void
  ) {
    this.idleThreshold = idleThresholdMs;
    this.onTrigger = onTrigger;

    this.rageClickDetector = new RageClickDetector((target) => {
      onBehaviorEvent?.('rage_click', { target });
      this.fire('rage_click', { target });
    });

    this.scrollDepthTracker = new ScrollDepthTracker((depth) => {
      onBehaviorEvent?.('scroll_depth', { depth });
    });

    this.formAbandonDetector = new FormAbandonDetector((formId) => {
      onBehaviorEvent?.('form_abandon', { formId });
      this.fire('form_abandon', { formId });
    });
  }

  start() {
    this.resetIdleTimer();

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach((evt) =>
      document.addEventListener(evt, this.handleActivity, { passive: true })
    );

    document.addEventListener('mouseleave', this.handleMouseLeave);

    this.rageClickDetector.start();
    this.scrollDepthTracker.start();
    this.formAbandonDetector.start();
  }

  stop() {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach((evt) =>
      document.removeEventListener(evt, this.handleActivity)
    );
    document.removeEventListener('mouseleave', this.handleMouseLeave);

    this.rageClickDetector.stop();
    this.scrollDepthTracker.stop();
    this.formAbandonDetector.stop();
  }

  private resetIdleTimer = () => {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.fire('idle'), this.idleThreshold);
  };

  private handleActivity = () => {
    if (!this.triggered) this.resetIdleTimer();
  };

  private handleMouseLeave = (e: MouseEvent) => {
    if (e.clientY <= 0 && !this.triggered) {
      this.fire('exit_intent');
    }
  };

  private fire(reason: TriggerReason, meta?: Record<string, unknown>) {
    if (this.triggered) return;
    this.triggered = true;
    this.stop();
    this.onTrigger(reason, meta);
  }
}

// ─── RageClickDetector ───────────────────────────────────────────────────────
// Fires when user clicks 3+ times within 600ms in a 30px radius

const RAGE_CLICK_COUNT = 3;
const RAGE_CLICK_MS = 600;
const RAGE_CLICK_RADIUS = 30;

class RageClickDetector {
  private clicks: Array<{ x: number; y: number; t: number }> = [];
  private readonly onRageClick: (target: string) => void;

  constructor(onRageClick: (target: string) => void) {
    this.onRageClick = onRageClick;
  }

  start() {
    document.addEventListener('click', this.handleClick, { passive: true });
  }

  stop() {
    document.removeEventListener('click', this.handleClick);
  }

  private handleClick = (e: MouseEvent) => {
    const now = Date.now();
    this.clicks.push({ x: e.clientX, y: e.clientY, t: now });

    // Remove clicks older than the time window
    this.clicks = this.clicks.filter((c) => now - c.t <= RAGE_CLICK_MS);

    // Check if last N clicks are within radius
    if (this.clicks.length >= RAGE_CLICK_COUNT) {
      const recent = this.clicks.slice(-RAGE_CLICK_COUNT);
      const first = recent[0];
      const allClose = recent.every(
        (c) => Math.hypot(c.x - first.x, c.y - first.y) <= RAGE_CLICK_RADIUS
      );

      if (allClose) {
        this.clicks = []; // reset so we don't fire multiple times
        const target =
          (e.target as HTMLElement)?.getAttribute?.('id') ||
          (e.target as HTMLElement)?.tagName?.toLowerCase() ||
          'unknown';
        this.onRageClick(target);
      }
    }
  };
}

// ─── ScrollDepthTracker ──────────────────────────────────────────────────────
// Fires at 25 / 50 / 75 / 100% scroll depth (each milestone fires once)

class ScrollDepthTracker {
  private milestones = [25, 50, 75, 100];
  private fired = new Set<number>();
  private readonly onMilestone: (depth: number) => void;

  constructor(onMilestone: (depth: number) => void) {
    this.onMilestone = onMilestone;
  }

  start() {
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  stop() {
    window.removeEventListener('scroll', this.handleScroll);
  }

  private handleScroll = () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    if (total === 0) return;

    const pct = Math.round((scrolled / total) * 100);

    for (const milestone of this.milestones) {
      if (pct >= milestone && !this.fired.has(milestone)) {
        this.fired.add(milestone);
        this.onMilestone(milestone);
      }
    }
  };
}

// ─── FormAbandonDetector ─────────────────────────────────────────────────────
// Fires when a user focuses a form input but navigates away without submitting

class FormAbandonDetector {
  private touchedForms = new Set<string>();
  private submittedForms = new Set<string>();
  private readonly onAbandon: (formId: string) => void;

  constructor(onAbandon: (formId: string) => void) {
    this.onAbandon = onAbandon;
  }

  start() {
    document.addEventListener('focusin', this.handleFocusIn, { passive: true });
    document.addEventListener('submit', this.handleSubmit, { passive: true });
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('pagehide', this.handleBeforeUnload);
  }

  stop() {
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('submit', this.handleSubmit);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handleBeforeUnload);
  }

  private handleFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const form = target.closest('form');
    const formId = form?.id || form?.getAttribute('name') || 'form_' + this.getFormIndex(form);
    this.touchedForms.add(formId);
  };

  private handleSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement;
    const formId = form?.id || form?.getAttribute('name') || 'unknown';
    this.submittedForms.add(formId);
  };

  private handleBeforeUnload = () => {
    this.touchedForms.forEach((formId) => {
      if (!this.submittedForms.has(formId)) {
        this.onAbandon(formId);
      }
    });
  };

  private getFormIndex(form: HTMLFormElement | null): string {
    if (!form) return 'unknown';
    const forms = Array.from(document.querySelectorAll('form'));
    return String(forms.indexOf(form));
  }
}
