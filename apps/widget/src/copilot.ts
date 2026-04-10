// ─── Copilot: AI setup + activation agent for the widget ─────────────────────
// Manages the onboarding session, communicates with /api/v1/session/* endpoints,
// and drives the goal-oriented UI.

import { scanPage } from './scanner';
import { resolveFromIndex, HealStrategy } from './resolver';
import { spotlight, beacon, arrowCallout, multiHighlight, ringOnly, removeSpotlight } from './highlighter';

export interface CopilotStep {
  id: string;
  title: string;
  description: string;
  order: number;
  isMilestone: boolean;
  intent: string;
  targetUrl?: string | null;
}

export interface CopilotSession {
  id: string;
  status: string;
  currentStep: CopilotStep;
  completedStepIds: string[];
  totalSteps: number;
  collectedData: Record<string, unknown>;
  flow: { id: string; name: string; steps: CopilotStep[] };
  isReturning?: boolean;
}

export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string }
  | { type: 'complete_step'; message: string }
  | { type: 'celebrate_milestone'; headline: string; insight: string }
  | { type: 'verify_integration'; integType: string; success: boolean; message: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string };

export class CopilotManager {
  private apiKey: string;
  private apiUrl: string;
  private userId: string | null = null;
  private session: CopilotSession | null = null;
  private onActionCallbacks: Array<(action: AgentAction) => void> = [];
  private onSessionUpdateCallbacks: Array<(session: CopilotSession) => void> = [];

  // ─── Local session cache ────────────────────────────────────────────────────
  // Persists the latest known session so the widget renders instantly on page
  // load without waiting for the /start API round-trip.

  private cacheKey(userId: string): string {
    return `_oai_s_${this.apiKey.slice(0, 8)}_${userId}`;
  }

  getCachedSession(userId: string): CopilotSession | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CopilotSession & { _ts?: number };
      // Expire after 7 days of inactivity
      if (parsed._ts && Date.now() - parsed._ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(this.cacheKey(userId));
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveToCache(userId: string, session: CopilotSession): void {
    try {
      localStorage.setItem(this.cacheKey(userId), JSON.stringify({ ...session, _ts: Date.now() }));
    } catch {
      // quota exceeded or storage unavailable — silent
    }
  }

  private evictCache(userId: string): void {
    localStorage.removeItem(this.cacheKey(userId));
  }

  // ─── Selector heal reporting ──────────────────────────────────────────────
  // Non-blocking. Fires when a CSS selector fails and a fallback was used (or
  // failed entirely). Backend aggregates these to power the Flow Health dashboard.

  private reportHeal(opts: {
    originalSelector: string;
    usedSelector?: string;
    strategy: HealStrategy;
    actionType: string;
  }): void {
    if (!this.session) return;
    fetch(`${this.apiUrl}/api/v1/session/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({
        sessionId: this.session.id,
        stepId: this.session.currentStep?.id,
        originalSelector: opts.originalSelector,
        usedSelector: opts.usedSelector,
        strategy: opts.strategy,
        actionType: opts.actionType,
        page: window.location.pathname,
      }),
    }).catch(() => {}); // never interrupt the flow
  }

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  onAction(cb: (action: AgentAction) => void) {
    this.onActionCallbacks.push(cb);
  }

  onSessionUpdate(cb: (session: CopilotSession) => void) {
    this.onSessionUpdateCallbacks.push(cb);
  }

  private emit(action: AgentAction) {
    this.onActionCallbacks.forEach((cb) => cb(action));
  }

  private emitSessionUpdate(session: CopilotSession) {
    this.onSessionUpdateCallbacks.forEach((cb) => cb(session));
  }

  getSession(): CopilotSession | null {
    return this.session;
  }

  getProgress(): { completed: number; total: number; percent: number } {
    if (!this.session) return { completed: 0, total: 0, percent: 0 };
    const completed = this.session.completedStepIds.length;
    const total = this.session.totalSteps;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  async start(userId: string, page: string, metadata: Record<string, unknown> = {}): Promise<CopilotSession | null> {
    this.userId = userId;

    // Pre-warm from cache synchronously (before the first await) so that any
    // onSessionUpdate listeners registered before start() fires immediately.
    const cached = this.getCachedSession(userId);
    if (cached && cached.status !== 'completed') {
      this.session = cached;
      this.emitSessionUpdate(cached);
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ userId, page, metadata }),
      });
      const data = await res.json();
      if (data.session) {
        const fresh: CopilotSession = { ...data.session, isReturning: data.isReturning ?? false };
        this.session = fresh;
        if (fresh.status === 'completed') {
          this.evictCache(userId);
        } else {
          this.saveToCache(userId, fresh);
        }
        this.emitSessionUpdate(this.session!);
        return fresh;
      } else {
        this.evictCache(userId);
        return null;
      }
    } catch {
      // Network failure — fall back to cached session so the widget stays functional
      return this.session;
    }
  }

  async sendMessage(userMessage: string): Promise<AgentAction | null> {
    if (!this.session) return null;

    const pageContext = scanPage();

    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session.id, userMessage, pageContext }),
      });
      const data = await res.json();
      const action: AgentAction = data.action;

      // Update local session state based on action
      if (action.type === 'complete_step' || action.type === 'celebrate_milestone') {
        await this.refreshSession();
      }

      this.emit(action);
      return action;
    } catch {
      return null;
    }
  }

  async fireEvent(eventType: string): Promise<void> {
    if (!this.session) return;
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session.id, eventType }),
      });
      const data = await res.json();
      if (data.advanced) {
        await this.refreshSession();
        if (data.milestone) {
          this.emit({
            type: 'celebrate_milestone',
            headline: 'First value unlocked!',
            insight: 'You have reached your first successful outcome.',
          });
        }
      }
    } catch {
      // silent
    }
  }

  private async refreshSession(): Promise<void> {
    if (!this.session || !this.userId) return;
    try {
      const res = await fetch(
        `${this.apiUrl}/api/v1/session?userId=${encodeURIComponent(this.userId)}&flowId=${this.session.flow.id}`,
        { headers: { 'X-API-Key': this.apiKey } }
      );
      const data = await res.json();
      if (data.session) {
        this.session = data.session;
        if (this.session!.status === 'completed') {
          this.evictCache(this.userId);
        } else {
          this.saveToCache(this.userId, this.session!);
        }
        this.emitSessionUpdate(this.session!);
      }
    } catch {
      // silent
    }
  }

  /**
   * Execute a page action instructed by the AI.
   * All element lookups go through resolveFromIndex() — if the primary CSS
   * selector fails, it tries 7 fallback strategies using the stored fingerprint.
   * Heals and outright failures are reported to the backend non-blocking.
   */
  executePageAction(action: { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string }): void {
    const { actionType, payload } = action;

    if (actionType === 'fill_form') {
      const fields = payload.fields as Record<string, string> ?? {};
      const selectors = Object.keys(fields);

      // Spotlight the first field using the resolved element
      if (selectors.length > 0) {
        const firstResult = resolveFromIndex(selectors[0]);
        if (firstResult) {
          if (firstResult.healed) this.reportHeal({ originalSelector: selectors[0], usedSelector: firstResult.usedSelector, strategy: firstResult.strategy, actionType });
          ringOnly(firstResult.healed ? (firstResult.usedSelector ?? selectors[0]) : selectors[0], 2000);
        }
      }

      for (const [selector, value] of Object.entries(fields)) {
        const result = resolveFromIndex(selector);
        if (!result) {
          this.reportHeal({ originalSelector: selector, strategy: 'failed', actionType });
          continue;
        }
        if (result.healed) this.reportHeal({ originalSelector: selector, usedSelector: result.usedSelector, strategy: result.strategy, actionType });
        const el = result.el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (actionType === 'click') {
      const selector = payload.selector as string;
      const result = resolveFromIndex(selector);

      if (!result) {
        this.reportHeal({ originalSelector: selector, strategy: 'failed', actionType });
        return;
      }
      if (result.healed) this.reportHeal({ originalSelector: selector, usedSelector: result.usedSelector, strategy: result.strategy, actionType });

      // Spotlight the resolved element, then click
      const effectiveSelector = result.usedSelector ?? selector;
      const cleanup = spotlight(effectiveSelector, '👆 Clicking for you…', 2200);
      setTimeout(() => {
        cleanup();
        removeSpotlight();
        result.el.click();
      }, 1800);
    }

    if (actionType === 'navigate') {
      const url = payload.url as string;
      if (url && this.session) {
        localStorage.setItem('_oai_resume', JSON.stringify({
          sessionId: this.session.id,
          flowId: this.session.flow.id,
          userId: this.userId,
        }));
        window.location.href = url;
      }
    }

    if (actionType === 'highlight') {
      const selector = payload.selector as string;
      const mode = (payload.mode as string) || 'spotlight';
      const label = (payload.label as string) || undefined;
      const duration = (payload.duration as number) || 4000;
      const color = (payload.color as string) || undefined;

      // For single-element highlight modes, resolve the selector
      if (mode !== 'multi') {
        const result = resolveFromIndex(selector);
        if (!result) {
          this.reportHeal({ originalSelector: selector, strategy: 'failed', actionType });
          return;
        }
        if (result.healed) this.reportHeal({ originalSelector: selector, usedSelector: result.usedSelector, strategy: result.strategy, actionType });
        const effectiveSelector = result.usedSelector ?? selector;

        if (mode === 'beacon') {
          beacon(effectiveSelector, label ?? '👆 Here', duration);
        } else if (mode === 'arrow') {
          arrowCallout(effectiveSelector, label ?? '👆 Here', duration, color);
        } else {
          spotlight(effectiveSelector, label ?? '👆 Here!', duration, color);
        }
        return;
      }

      // Multi-highlight: resolve each selector independently
      const rawSelectors = (payload.selectors as string[]) ?? (selector ? [selector] : []);
      const labels = (payload.labels as string[]) ?? [];
      const resolvedSelectors: string[] = [];

      for (const s of rawSelectors) {
        const result = resolveFromIndex(s);
        if (!result) {
          this.reportHeal({ originalSelector: s, strategy: 'failed', actionType });
          continue;
        }
        if (result.healed) this.reportHeal({ originalSelector: s, usedSelector: result.usedSelector, strategy: result.strategy, actionType });
        resolvedSelectors.push(result.usedSelector ?? s);
      }

      if (resolvedSelectors.length > 0) {
        multiHighlight(resolvedSelectors, labels, duration, color);
      }
    }
  }
}
