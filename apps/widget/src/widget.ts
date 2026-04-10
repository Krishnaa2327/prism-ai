import { WidgetConfig, DEFAULT_CONFIG } from './config';
import { DropOffDetector, TriggerReason } from './detector';
import { trackEvent } from './api';
import { WidgetSocket } from './socket';
import { injectStyles } from './styles';
import { CopilotManager, AgentAction, CopilotSession } from './copilot';
import { RecaptureWatcher, RecaptureReason } from './recapture';
import {
  createRoot, createBubble, createChatWindow,
  addMessage, hideDot, tryParseSteps, addStepsCard,
  addChips, addActionToast, addCelebration, addStepPill,
  renderStepProgress, createStreamingBubble,
  showBubbleNudge, hideBubbleNudge,
} from './ui';

export class OnboardAIWidget {
  private config: Required<Omit<WidgetConfig, 'userId' | 'metadata'>> & Pick<WidgetConfig, 'userId' | 'metadata'>;
  private isOpen = false;
  private isSending = false;
  private detector: DropOffDetector | null = null;
  private socket: WidgetSocket | null = null;
  // exposed so test.html can call widget.getCopilot().fireEvent(...)
  private copilot: CopilotManager;
  private recaptureWatcher: RecaptureWatcher | null = null;

  // DOM refs
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private windowEl!: HTMLElement;
  private bubbleEl!: HTMLElement;
  private progressBarEl!: HTMLElement;
  private stepTitleEl!: HTMLElement;
  private progressTextEl!: HTMLElement;

  constructor(config: WidgetConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.copilot = new CopilotManager(config.apiKey, config.apiUrl ?? DEFAULT_CONFIG.apiUrl);
  }

  getCopilot(): CopilotManager {
    return this.copilot;
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.mount());
    } else {
      this.mount();
    }
  }

  private async mount() {
    injectStyles(this.config.primaryColor, this.config.position);

    const root = createRoot();
    this.bubbleEl = createBubble(root);
    this.windowEl = createChatWindow(root);

    this.messagesEl = document.getElementById('oai-messages')!;
    this.inputEl = document.getElementById('oai-input') as HTMLTextAreaElement;
    this.sendBtn = document.getElementById('oai-send') as HTMLButtonElement;

    // Create copilot progress bar (injected into the chat window header)
    this.injectProgressBar();

    this.bindEvents();
    this.connectSocket();
    this.trackPageView();
    this.startDetection();

    // Hide bubble until we have a session
    this.bubbleEl.style.display = 'none';

    const resuming = this.consumeResumeToken();
    const userId = this.config.userId ?? 'anonymous_' + this.getOrCreateAnonId();

    // Register BEFORE start() — the cache pre-warm inside start() fires this
    // synchronously, so the progress bar updates before any API round-trip.
    this.copilot.onSessionUpdate((s) => this.updateProgressUI(s));

    // If a cached session exists, skip triggerDelay (user already started onboarding)
    const hasCached = !!this.copilot.getCachedSession(userId);

    // start() pre-warms from cache, then fetches fresh state from server
    const session = await this.copilot.start(userId, window.location.pathname, this.config.metadata ?? {});

    // Use fresh session, or fall back to whatever's in copilot (cached on network failure)
    const active = session ?? this.copilot.getSession();

    if (active) {
      const delay = (resuming || hasCached) ? 0 : (this.config.triggerDelay ?? 2000);
      setTimeout(() => {
        this.bubbleEl.style.display = 'flex';
        this.openCopilot();
      }, delay);
    }
  }

  // ─── Progress bar UI ─────────────────────────────────────────────────────

  private injectProgressBar() {
    const header = document.getElementById('oai-header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.id = 'oai-progress-wrap';
    bar.innerHTML = `
      <div id="oai-step-title" style="font-size:11px;color:#6366f1;font-weight:600;margin-bottom:4px;"></div>
      <div style="background:#e2e8f0;border-radius:999px;height:4px;overflow:hidden;">
        <div id="oai-progress-bar" style="height:100%;background:#6366f1;border-radius:999px;transition:width .4s ease;width:0%;"></div>
      </div>
      <div id="oai-progress-text" style="font-size:10px;color:#94a3b8;margin-top:3px;"></div>
    `;
    bar.style.cssText = 'padding:8px 12px 4px;border-bottom:1px solid #f1f5f9;';
    header.insertAdjacentElement('afterend', bar);

    this.progressBarEl = document.getElementById('oai-progress-bar')!;
    this.stepTitleEl = document.getElementById('oai-step-title')!;
    this.progressTextEl = document.getElementById('oai-progress-text')!;
  }

  private updateProgressUI(session: CopilotSession) {
    const { completed, total, percent } = this.copilot.getProgress();
    if (this.progressBarEl) this.progressBarEl.style.width = `${percent}%`;
    if (this.stepTitleEl) {
      this.stepTitleEl.textContent = session.status === 'completed'
        ? 'Onboarding complete!'
        : `Step ${session.currentStep.order + 1}: ${session.currentStep.title}`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `${completed} of ${total} steps done`;
    }

    // Render step progress stepper
    const completedIds = session.flow.steps
      .filter((_, i) => i < session.currentStep.order)
      .map((s) => s.id);
    renderStepProgress(session.flow.steps, session.currentStep.id, completedIds);

    // update bubble badge
    const badge = this.bubbleEl.querySelector<HTMLElement>('.oai-badge');
    if (badge && session.status !== 'completed') {
      badge.textContent = String(total - completed);
      badge.style.display = 'flex';
    }
  }

  // ─── WebSocket ───────────────────────────────────────────────────────────

  private connectSocket() {
    this.socket = new WidgetSocket(this.config.apiKey, this.config.apiUrl);
    this.socket.connect().catch(() => {});
  }

  // ─── Drop-off detection ───────────────────────────────────────────────────

  private startDetection() {
    this.detector = new DropOffDetector(
      this.config.idleThreshold,
      (reason, meta) => {
        if (!this.isOpen) {
          this.bubbleEl.style.display = 'flex';
          this.openCopilot(reason, meta);
        }
      },
      (eventType, props) => {
        const userId = this.config.userId ?? 'anonymous_' + this.getOrCreateAnonId();
        trackEvent(
          { apiKey: this.config.apiKey, apiUrl: this.config.apiUrl },
          userId,
          eventType as Parameters<typeof trackEvent>[2],
          props
        );
        // fire completion event to copilot session
        this.copilot.fireEvent(eventType);
      }
    );
    this.detector.start();
  }

  private trackPageView() {
    const userId = this.config.userId ?? 'anonymous_' + this.getOrCreateAnonId();
    trackEvent(
      { apiKey: this.config.apiKey, apiUrl: this.config.apiUrl },
      userId,
      'page_view',
      { path: window.location.pathname, referrer: document.referrer }
    );
  }

  // ─── Copilot chat open ───────────────────────────────────────────────────

  private async openCopilot(triggerReason?: string, triggerMeta?: Record<string, unknown>) {
    this.isOpen = true;
    this.windowEl.classList.remove('oai-hidden');
    hideDot();
    this.stopRecaptureWatch();

    const session = this.copilot.getSession();

    if (session && session.status !== 'completed') {
      const step = session.currentStep;
      const { total } = this.copilot.getProgress();

      // Show step pill + header (welcome back for returning users)
      addStepPill(this.messagesEl, `Step ${step.order + 1} of ${total}`);
      const greeting = session.isReturning
        ? `Welcome back! Continuing: ${step.title}`
        : step.title;
      addMessage(this.messagesEl, greeting, 'assistant');

      // Page mismatch: if this step has a targetUrl and we're not on it, show navigation hint
      if (step.targetUrl && !this.isOnTargetPage(step.targetUrl)) {
        addMessage(
          this.messagesEl,
          `This step happens on a different page. Want me to take you there?`,
          'assistant'
        );
        addChips(
          this.messagesEl,
          '',
          [`Go to ${this.shortUrl(step.targetUrl)}`],
          () => {
            this.copilot.executePageAction({
              type: 'execute_page_action',
              actionType: 'navigate',
              payload: { url: step.targetUrl! },
              message: `Navigating to ${step.targetUrl}…`,
            });
          }
        );
        this.enableInput();
        this.isSending = false;
        this.sendBtn.disabled = false;
        return;
      }

      // Build init message: include frustration context when available
      const frustrationCtx = triggerReason === 'rage_click'
        ? `__init__ [user is rage-clicking on "${triggerMeta?.target ?? 'unknown'}" — they are frustrated, acknowledge it and help immediately]`
        : triggerReason === 'form_abandon'
        ? `__init__ [user abandoned a form "${triggerMeta?.formId ?? ''}" without submitting — help them complete it]`
        : triggerReason === 'idle'
        ? `__init__ [user has been idle — check if they need help or have a question]`
        : '__init__';

      // Auto-trigger AI to act immediately — no user input required
      this.enableInput();
      this.isSending = true;
      this.sendBtn.disabled = true;
      const streamDiv = createStreamingBubble(this.messagesEl);
      try {
        const action = await this.copilot.sendMessage(frustrationCtx);
        if (action) {
          this.handleAgentAction(action, streamDiv);
        } else {
          streamDiv.textContent = 'Having trouble connecting. Type a message to try again.';
          streamDiv.classList.remove('oai-streaming');
          this.isSending = false;
          this.sendBtn.disabled = false;
        }
      } catch {
        streamDiv.textContent = 'Connection error. Please refresh and try again.';
        streamDiv.classList.remove('oai-streaming');
        this.isSending = false;
        this.sendBtn.disabled = false;
      }
    } else if (session?.status === 'completed') {
      addMessage(this.messagesEl, '🎉 You\'ve completed onboarding! Great work.', 'assistant');
      this.inputEl.disabled = true;
      this.inputEl.placeholder = 'Onboarding complete';
      this.sendBtn.disabled = true;
    } else {
      addMessage(this.messagesEl, 'Hi! How can I help you today?', 'assistant');
      this.enableInput();
    }

    this.inputEl.focus();
  }

  private closeChat() {
    this.isOpen = false;
    this.windowEl.classList.add('oai-hidden');
    this.startRecaptureWatch();
  }

  // ─── Recapture watcher ────────────────────────────────────────────────────
  // Started when the user closes the widget mid-flow. Watches for signals that
  // they are trying to complete the current step on their own, then shows a
  // lightweight bubble nudge (not the full chat).

  private startRecaptureWatch(): void {
    const session = this.copilot.getSession();
    if (!session || session.status === 'completed') return;

    this.stopRecaptureWatch(); // clear any previous watcher

    const step = session.currentStep;
    this.recaptureWatcher = new RecaptureWatcher({
      step,
      onTrigger: (reason: RecaptureReason) => {
        const reasonLabel =
          reason === 'page_intent' ? 'You navigated here — ' :
          reason === 'click_intent' ? 'Looks like you\'re trying this — ' :
          'Still working on this? ';
        showBubbleNudge(
          `${reasonLabel}Need help with "${step.title}"?`,
          () => {
            this.bubbleEl.style.display = 'flex';
            this.openCopilot('recapture', { reason, stepTitle: step.title });
          }
        );
      },
    });
    this.recaptureWatcher.start();
  }

  private stopRecaptureWatch(): void {
    if (this.recaptureWatcher) {
      this.recaptureWatcher.stop();
      this.recaptureWatcher = null;
    }
    hideBubbleNudge();
  }

  // ─── Message submission — routes through copilot agent ───────────────────

  private async submitMessage() {
    const content = this.inputEl.value.trim();
    if (!content || this.isSending) return;

    this.isSending = true;
    this.sendBtn.disabled = true;
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';

    addMessage(this.messagesEl, content, 'user');

    const streamDiv = createStreamingBubble(this.messagesEl);

    const session = this.copilot.getSession();

    if (session) {
      // Use the copilot agent
      const action = await this.copilot.sendMessage(content);
      if (action) {
        this.handleAgentAction(action, streamDiv);
      } else {
        streamDiv.textContent = 'Sorry, I had trouble responding. Please try again.';
        this.finishStreaming(streamDiv);
      }
    } else if (this.socket?.isConnected()) {
      // Fallback: generic streaming chat (no active session)
      // We need a conversation ID — use socket's last known one or skip
      streamDiv.textContent = 'Starting a conversation...';
      this.finishStreaming(streamDiv);
    } else {
      streamDiv.textContent = "No active onboarding session. Please refresh the page.";
      this.finishStreaming(streamDiv);
    }
  }

  private handleAgentAction(action: AgentAction, streamDiv: HTMLDivElement) {
    streamDiv.remove();

    switch (action.type) {
      case 'ask_clarification': {
        addChips(
          this.messagesEl,
          action.question,
          action.options ?? [],
          (opt) => {
            this.inputEl.value = opt;
            this.submitMessage();
          }
        );
        break;
      }

      case 'execute_page_action': {
        this.copilot.executePageAction(action);
        addActionToast(this.messagesEl, action.message);
        break;
      }

      case 'complete_step': {
        addMessage(this.messagesEl, action.message, 'assistant');
        // Step completed — session update will fire via onSessionUpdate callback
        const session = this.copilot.getSession();
        if (session) {
          setTimeout(() => {
            const next = session.flow.steps.find((s) => s.order > session.currentStep.order);
            if (next) {
              addMessage(this.messagesEl, `Next up: **${next.title}** — ${next.description || 'ready when you are!'}`, 'assistant');
            }
          }, 800);
        }
        break;
      }

      case 'celebrate_milestone': {
        addCelebration(this.messagesEl, action.headline, action.insight);
        break;
      }

      case 'verify_integration': {
        const icon = action.success ? '✅' : '❌';
        addMessage(this.messagesEl, `${icon} ${action.message}`, 'assistant');
        break;
      }

      case 'escalate_to_human': {
        addMessage(this.messagesEl, action.message, 'assistant');
        // Lock input — session is now waiting for a human
        this.inputEl.disabled = true;
        this.inputEl.placeholder = 'Waiting for a team member…';
        this.sendBtn.disabled = true;
        // Show a subtle status pill
        const pill = document.createElement('div');
        pill.style.cssText = 'margin:8px 12px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e;display:flex;align-items:center;gap:6px;';
        pill.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>Support ticket created — a team member will reach out soon.';
        this.messagesEl.appendChild(pill);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        break;
      }

      case 'chat': {
        const steps = tryParseSteps(action.content);
        if (steps) {
          addStepsCard(this.messagesEl, steps);
        } else {
          addMessage(this.messagesEl, action.content, 'assistant');
        }
        break;
      }
    }

    this.isSending = false;
    this.sendBtn.disabled = false;
    this.inputEl.focus();
  }

  private finishStreaming(div: HTMLDivElement) {
    div.classList.remove('oai-streaming');
    this.isSending = false;
    this.sendBtn.disabled = false;
    this.inputEl.focus();
  }

  // ─── DOM event bindings ───────────────────────────────────────────────────

  private bindEvents() {
    this.bubbleEl.addEventListener('click', () => {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openCopilot('manual');
      }
    });

    document.getElementById('oai-close')!.addEventListener('click', () => this.closeChat());
    this.sendBtn.addEventListener('click', () => this.submitMessage());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitMessage();
      }
    });

    this.inputEl.addEventListener('input', () => {
      this.sendBtn.disabled = this.inputEl.value.trim().length === 0;
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 100) + 'px';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.closeChat();
    });
  }

  private enableInput() {
    this.inputEl.disabled = false;
    this.inputEl.placeholder = 'Type a message…';
  }

  /** Consume the cross-page resume token from localStorage. Returns true if one was present. */
  private consumeResumeToken(): boolean {
    const raw = localStorage.getItem('_oai_resume');
    if (!raw) return false;
    localStorage.removeItem('_oai_resume');
    return true;
  }

  /** Returns true if the current page matches the step's targetUrl. */
  private isOnTargetPage(targetUrl: string): boolean {
    try {
      const target = new URL(targetUrl, window.location.origin);
      if (target.origin !== window.location.origin) {
        // cross-domain step: never on the right page unless origins match
        return target.origin === window.location.origin;
      }
      return window.location.pathname === target.pathname;
    } catch {
      return false;
    }
  }

  /** Shorten a URL for display in the navigation chip. */
  private shortUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return parsed.hostname + parsed.pathname;
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  private getOrCreateAnonId(): string {
    const KEY = '__oai_uid';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  }
}
