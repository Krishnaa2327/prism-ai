// ─── Recapture Trigger ────────────────────────────────────────────────────────
// When a user dismisses the widget mid-flow, a background watcher monitors
// for signals that they are trying to do the next step on their own.
// Three signals: navigation to the step's targetUrl, idle on the relevant page,
// or a direct click that matches the step's action selector.
// On trigger: a small "bubble nudge" appears near the launcher — not the full
// chat window — giving the user a lightweight re-engagement prompt.

import { CopilotStep } from './copilot';

export type RecaptureReason = 'page_intent' | 'click_intent' | 'idle_intent';

export interface RecaptureOptions {
  step: CopilotStep;
  /** Selector to watch for click intent (optional — from step actionConfig) */
  actionSelector?: string | null;
  /** Seconds idle on the relevant page before triggering. Default: 60 */
  idleSeconds?: number;
  onTrigger: (reason: RecaptureReason) => void;
}

export class RecaptureWatcher {
  private step: CopilotStep;
  private actionSelector: string | null;
  private idleMs: number;
  private onTrigger: (reason: RecaptureReason) => void;

  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private popstateHandler: (() => void) | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private triggered = false;
  private active = false;

  constructor(opts: RecaptureOptions) {
    this.step = opts.step;
    this.actionSelector = opts.actionSelector ?? null;
    this.idleMs = (opts.idleSeconds ?? 60) * 1000;
    this.onTrigger = opts.onTrigger;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.triggered = false;

    // ── 1. Page intent: check immediately + on every navigation ──────────────
    if (this.step.targetUrl) {
      this.checkPageMatch();
      this.popstateHandler = () => this.checkPageMatch();
      window.addEventListener('popstate', this.popstateHandler);
    }

    // ── 2. Click intent: watch for clicks matching the action selector ────────
    if (this.actionSelector) {
      this.clickHandler = (e: MouseEvent) => {
        const target = e.target as Element | null;
        if (!target) return;
        try {
          if (target.closest(this.actionSelector!)) {
            this.fire('click_intent');
          }
        } catch {
          // invalid selector — ignore
        }
      };
      document.addEventListener('click', this.clickHandler, true);
    }

    // ── 3. Idle intent: user sits on the relevant page without opening chat ───
    this.resetIdleTimer();
    document.addEventListener('click', this.resetIdleTimerBound);
    document.addEventListener('keydown', this.resetIdleTimerBound);
    document.addEventListener('scroll', this.resetIdleTimerBound, { passive: true });
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }
    document.removeEventListener('click', this.resetIdleTimerBound);
    document.removeEventListener('keydown', this.resetIdleTimerBound);
    document.removeEventListener('scroll', this.resetIdleTimerBound);
    this.clearIdleTimer();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private checkPageMatch(): void {
    if (!this.step.targetUrl) return;
    const currentPath = window.location.pathname + window.location.search;
    const targetPath = this.step.targetUrl.replace(/^https?:\/\/[^/]+/, '');
    if (currentPath.startsWith(targetPath) || targetPath === window.location.pathname) {
      this.fire('page_intent');
    }
  }

  private fire(reason: RecaptureReason): void {
    if (this.triggered || !this.active) return;
    this.triggered = true;
    this.stop();
    this.onTrigger(reason);
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.fire('idle_intent'), this.idleMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Arrow function so `this` is bound for removeEventListener
  private resetIdleTimerBound = () => this.resetIdleTimer();
}
