// ─── Copilot: AI setup + activation agent for the widget ─────────────────────
// Manages the onboarding session, communicates with /api/v1/session/* endpoints,
// and drives the goal-oriented UI.

import { scanPage, buildSemanticSummary } from './scanner';
import { resolveFromIndex, HealStrategy } from './resolver';
import { spotlight, beacon, arrowCallout, multiHighlight, removeSpotlight, hoverTip } from './highlighter';
import { animatedFillFields } from './cursor';

export interface CopilotStep {
  id: string;
  title: string;
  description: string;
  order: number;
  isMilestone: boolean;
  intent: string;
  targetUrl?: string | null;
}

export interface TriggerConfig {
  delayMs: number;        // ms after page load before widget fires (default 30000)
  urlPattern: string;     // comma-separated patterns, empty = all pages
  maxTriggersPerUser: number; // 0 = unlimited
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

/** Returns true if the current page URL matches any of the comma-separated patterns */
export function matchesUrlPattern(pattern: string, url: string = window.location.pathname): boolean {
  if (!pattern || pattern.trim() === '') return true; // empty = match all
  return pattern.split(',').map((p) => p.trim()).some((p) => {
    if (!p) return false;
    // Convert simple glob (*) to regex
    const regex = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return regex.test(url);
  });
}

export interface GoalPlanPhase {
  id: string;
  title: string;
  description: string;
}

export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string; shouldVerify?: boolean }
  | { type: 'complete_step'; message: string }
  | { type: 'celebrate_milestone'; headline: string; insight: string }
  | { type: 'verify_integration'; integType: string; success: boolean; message: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string }
  | { type: 'goal_complete'; summary: string }
  | { type: 'degrade_to_manual'; instruction: string; reason: string };

export class CopilotManager {
  private apiKey: string;
  private apiUrl: string;
  private userId: string | null = null;
  private session: CopilotSession | null = null;
  private triggerConfig: TriggerConfig = { delayMs: 30000, urlPattern: '', maxTriggersPerUser: 0 };
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

  reportSoftFailure(opts: { selector: string | null; actionType: string }): void {
    if (!this.session) return;
    fetch(`${this.apiUrl}/api/v1/session/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({
        sessionId: this.session.id,
        stepId: this.session.currentStep?.id ?? null,
        originalSelector: opts.selector ?? 'unknown',
        usedSelector: null,
        strategy: 'failed' as HealStrategy,
        actionType: opts.actionType,
        page: window.location.pathname,
        reason: 'dom_unchanged_after_action',
      }),
    }).catch(() => {}); // never interrupt the flow
  }

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;

    // Phase 5: pre-warm the backend DB connection pool during browser idle time
    // so the first real agent turn doesn't pay cold-start latency.
    // Uses requestIdleCallback if available, falls back to 2s setTimeout.
    this.scheduleWarmup();
  }

  private scheduleWarmup(): void {
    const doWarmup = () => {
      fetch(`${this.apiUrl}/api/v1/session/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: '{}',
      }).catch(() => {}); // fully fire-and-forget
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // Fire during browser idle time — zero impact on main thread
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
        .requestIdleCallback(doWarmup, { timeout: 3000 });
    } else {
      // Fallback: fire after 2 seconds (enough time for page to be interactive)
      setTimeout(doWarmup, 2000);
    }
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

  getTriggerConfig(): TriggerConfig {
    return this.triggerConfig;
  }

  /** Returns true if the current page should trigger this flow */
  shouldTriggerOnCurrentPage(): boolean {
    return matchesUrlPattern(this.triggerConfig.urlPattern);
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
      if (data.trigger) {
        this.triggerConfig = data.trigger as TriggerConfig;
      }
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

  async sendMessage(
    userMessage: string,
    onText?: (word: string) => void,
  ): Promise<{ action: AgentAction; messageId: string | null } | null> {
    if (!this.session) return null;
    const pageContext = scanPage();

    // ── Try SSE streaming first ───────────────────────────────────────────────
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/act/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session.id, userMessage, pageContext }),
      });

      if (res.ok && res.body) {
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;

              // Stream text tokens to caller for live rendering
              if (payload.word && onText) {
                onText(payload.word as string);
                continue;
              }

              if (payload.action) {
                const action = payload.action as AgentAction;
                const messageId = (payload.messageId as string | null) ?? null;
                if (action.type === 'complete_step' || action.type === 'celebrate_milestone') {
                  await this.refreshSession();
                }
                this.emit(action);
                return { action, messageId };
              }
            } catch { /* partial JSON — skip */ }
          }
        }
      }
    } catch { /* network failure — fall through to non-streaming fallback */ }

    // ── Fallback: non-streaming /act ─────────────────────────────────────────
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session.id, userMessage, pageContext }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { action: AgentAction; messageId: string | null };
      const action = data.action;
      if (action.type === 'complete_step' || action.type === 'celebrate_milestone') {
        await this.refreshSession();
      }
      this.emit(action);
      return { action, messageId: data.messageId ?? null };
    } catch {
      return null;
    }
  }

  async sendFeedback(messageId: string, value: 1 | -1): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/api/v1/session/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ messageId, value }),
      });
    } catch { /* never interrupt the flow */ }
  }

  /**
   * Notify the backend of a page change so the agent can re-evaluate which
   * step the user is on and advance the session if appropriate.
   * Called automatically on popstate / history.pushState navigation.
   */
  async notifyPageChange(newPath: string): Promise<void> {
    if (!this.session || !this.userId) return;
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/page-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session.id, page: newPath }),
      });
      const data = await res.json();
      if (data.advanced) {
        await this.refreshSession();
      }
    } catch { /* silent */ }
  }

  /**
   * Patch history.pushState and listen to popstate so SPA navigations
   * are intercepted without requiring the host app to call anything.
   */
  watchNavigation(): void {
    const notify = (path: string) => this.notifyPageChange(path);

    // Intercept pushState (React Router, Next.js, etc.)
    const origPush = history.pushState.bind(history);
    history.pushState = function (...args) {
      origPush(...args);
      notify(window.location.pathname);
    };

    // Intercept replaceState
    const origReplace = history.replaceState.bind(history);
    history.replaceState = function (...args) {
      origReplace(...args);
      notify(window.location.pathname);
    };

    // Back/forward buttons
    window.addEventListener('popstate', () => notify(window.location.pathname));
  }

  /**
   * Send a __verify__ message after a page action completes.
   * The agent checks the updated DOM and either completes the step or retries.
   * Non-blocking — fires after a 2s settle delay.
   */
  scheduleVerify(): void {
    if (!this.session) return;
    setTimeout(async () => {
      const result = await this.sendMessage('__verify__');
      if (result) this.emit(result.action);
    }, 2000);
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

  getSessionId(): string | null {
    return this.session?.id ?? null;
  }

  async sendPlanRequest(goal: string): Promise<GoalPlanPhase[] | null> {
    const pageContext = scanPage();
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/act/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({ sessionId: this.session?.id ?? 'plan_session', goal, pageContext }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { phases: GoalPlanPhase[] };
      return data.phases;
    } catch {
      return null;
    }
  }

  async sendGoalMessage(opts: {
    goal: string;
    turnHistory: Array<{ role: 'user' | 'assistant' | 'observe'; content: string }>;
    turnCount: number;
    failedSelectors?: string[];
    onText?: (word: string) => void;
  }): Promise<{ action: AgentAction; done: boolean; turnCount: number } | null> {
    const { goal, turnHistory, turnCount, failedSelectors } = opts;
    const pageContext = scanPage();
    const enrichedContext = { ...pageContext, semanticSummary: buildSemanticSummary() };

    try {
      const res = await fetch(`${this.apiUrl}/api/v1/session/act/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify({
          sessionId: this.session?.id ?? 'goal_session',
          goal,
          pageContext: enrichedContext,
          turnHistory,
          turnCount,
          failedSelectors: failedSelectors ?? [],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { action: AgentAction; done: boolean; turnCount: number };
      this.emit(data.action);
      return data;
    } catch {
      return null;
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

      // Build a resolved map: selector → value, healing as we go
      const resolvedFields: Record<string, string> = {};
      for (const [selector, value] of Object.entries(fields)) {
        const result = resolveFromIndex(selector);
        if (!result) {
          this.reportHeal({ originalSelector: selector, strategy: 'failed', actionType });
          continue;
        }
        if (result.healed) {
          this.reportHeal({ originalSelector: selector, usedSelector: result.usedSelector, strategy: result.strategy, actionType });
        }
        // Key by the effective (possibly healed) selector so getEl can find the element
        resolvedFields[result.usedSelector ?? selector] = value;
      }

      // Animate cursor to each field then type — non-blocking for the UI thread
      animatedFillFields(resolvedFields, (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      }).catch(() => {
        // If animation fails for any reason, fall back to direct fill
        for (const [sel, value] of Object.entries(resolvedFields)) {
          const el = document.querySelector(sel) as HTMLInputElement | null;
          if (!el) continue;
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
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

    if (actionType === 'hover_tip') {
      const selector = payload.selector as string;
      const text = payload.text as string;
      const tipColor = (payload.color as string) || undefined;
      if (selector && text) {
        const result = resolveFromIndex(selector);
        if (result) {
          if (result.healed) this.reportHeal({ originalSelector: selector, usedSelector: result.usedSelector, strategy: result.strategy, actionType });
          hoverTip(result.usedSelector ?? selector, text, tipColor);
        }
      }
    }
  }
}
