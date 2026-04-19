// ─── Prism Widget — side-panel orchestrator ───────────────────────────────────
// Prism occupies the right 360px of the screen as a persistent sidebar.
// The host page body shifts left automatically via the `.__prism-open` class.
// There is no floating bubble — the panel slides in from the right when an
// active onboarding session exists, and can be collapsed to a thin tab.

import { WidgetConfig, DEFAULT_CONFIG } from './config';
import { DropOffDetector } from './detector';
import { trackEvent } from './api';
import { WidgetSocket } from './socket';
import { injectStyles } from './styles';
import { CopilotManager, AgentAction, CopilotSession } from './copilot';
import {
  createRoot, createSidePanel,
  addMessage, addFeedbackButtons, tryParseSteps, addStepsCard,
  addChips, addActionToast, addCelebration, addStepPill,
  renderStepProgress, createStreamingBubble,
} from './ui';

export class OnboardAIWidget {
  private config: Required<Omit<WidgetConfig, 'userId' | 'metadata'>> & Pick<WidgetConfig, 'userId' | 'metadata'>;
  private isVisible = false;
  private isCollapsed = false;
  private isSending = false;
  private detector: DropOffDetector | null = null;
  private socket: WidgetSocket | null = null;
  private copilot: CopilotManager;

  // ─── Goal mode state ─────────────────────────────────────────────────────
  private goalMode = false;
  private goalText = '';
  private goalTurnHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private goalTurnCount = 0;
  private goalRunning = false;

  // DOM refs
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private panelEl!: HTMLElement;
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
    injectStyles(this.config.primaryColor);

    const root = createRoot();
    this.panelEl = createSidePanel(root);

    this.messagesEl = document.getElementById('oai-messages')!;
    this.inputEl    = document.getElementById('oai-input') as HTMLTextAreaElement;
    this.sendBtn    = document.getElementById('oai-send') as HTMLButtonElement;

    this.injectProgressBar();
    this.bindEvents();
    this.connectSocket();
    this.trackPageView();
    this.startDetection();
    this.copilot.watchNavigation();

    const userId = this.config.userId ?? 'anonymous_' + this.getOrCreateAnonId();

    // Register BEFORE start() so the cache pre-warm fires synchronously
    this.copilot.onSessionUpdate((s) => this.updateProgressUI(s));

    const session = await this.copilot.start(userId, window.location.pathname, this.config.metadata ?? {});
    const active = session ?? this.copilot.getSession();

    if (!active) return; // no active flow for this user

    // Respect server-side trigger controls
    const trigger = this.copilot.getTriggerConfig();

    if (!this.copilot.shouldTriggerOnCurrentPage()) return;

    if (trigger.maxTriggersPerUser > 0) {
      const countKey = `_prism_tc_${this.config.apiKey.slice(0, 8)}_${userId}`;
      const shown = parseInt(localStorage.getItem(countKey) ?? '0', 10);
      if (shown >= trigger.maxTriggersPerUser) return;
      localStorage.setItem(countKey, String(shown + 1));
    }

    // Returning users / resuming sessions open the panel instantly
    const resuming = this.consumeResumeToken();
    const hasCached = !!this.copilot.getCachedSession(userId);
    const delay = (resuming || hasCached) ? 0 : trigger.delayMs;

    setTimeout(() => this.openPanel(), delay);
  }

  // ─── Progress bar ────────────────────────────────────────────────────────

  private injectProgressBar() {
    const header = document.getElementById('oai-header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.id = 'oai-progress-wrap';
    bar.innerHTML = `
      <div id="oai-step-title"></div>
      <div id="oai-progress-track">
        <div id="oai-progress-bar"></div>
      </div>
      <div id="oai-progress-text"></div>
    `;
    header.insertAdjacentElement('afterend', bar);

    this.progressBarEl  = document.getElementById('oai-progress-bar')!;
    this.stepTitleEl    = document.getElementById('oai-step-title')!;
    this.progressTextEl = document.getElementById('oai-progress-text')!;
  }

  private updateProgressUI(session: CopilotSession) {
    const { completed, total, percent } = this.copilot.getProgress();
    if (this.progressBarEl)  this.progressBarEl.style.width = `${percent}%`;
    if (this.stepTitleEl) {
      this.stepTitleEl.textContent = session.status === 'completed'
        ? 'Onboarding complete!'
        : `Step ${session.currentStep.order + 1}: ${session.currentStep.title}`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `${completed} of ${total} steps done`;
    }

    const completedIds = session.flow.steps
      .filter((_, i) => i < session.currentStep.order)
      .map((s) => s.id);
    renderStepProgress(session.flow.steps, session.currentStep.id, completedIds);
  }

  // ─── Panel open / collapse ───────────────────────────────────────────────

  private get isMobile(): boolean {
    return window.innerWidth <= 640;
  }

  private openPanel() {
    this.isVisible = true;
    this.isCollapsed = false;
    this.panelEl.classList.remove('oai-hidden', 'oai-collapsed');
    if (!this.isMobile) {
      document.body.classList.add('__prism-open');
      document.body.classList.remove('__prism-collapsed');
    }
    this.startSession();
  }

  private collapsePanel() {
    this.isCollapsed = true;
    this.panelEl.classList.add('oai-collapsed');
    if (!this.isMobile) {
      document.body.classList.remove('__prism-open');
      document.body.classList.add('__prism-collapsed');
    }
  }

  private expandPanel() {
    this.isCollapsed = false;
    this.panelEl.classList.remove('oai-collapsed');
    if (!this.isMobile) {
      document.body.classList.add('__prism-open');
      document.body.classList.remove('__prism-collapsed');
    }
  }

  private hidePanel() {
    this.isVisible = false;
    this.panelEl.classList.add('oai-hidden');
    document.body.classList.remove('__prism-open', '__prism-collapsed');
  }

  // ─── Session start message flow ──────────────────────────────────────────

  private async startSession() {
    const session = this.copilot.getSession();
    if (!session) return;

    if (session.status === 'completed') {
      addMessage(this.messagesEl, '🎉 You\'ve completed onboarding! Great work.', 'assistant');
      this.inputEl.disabled = true;
      this.inputEl.placeholder = 'Onboarding complete';
      this.sendBtn.disabled = true;
      return;
    }

    const step = session.currentStep;
    const { total } = this.copilot.getProgress();

    addStepPill(this.messagesEl, `Step ${step.order + 1} of ${total}`);
    addMessage(
      this.messagesEl,
      session.isReturning ? `Welcome back! Continuing: ${step.title}` : step.title,
      'assistant'
    );

    // Page mismatch — offer navigation
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

    // Auto-trigger agent
    this.enableInput();
    this.isSending = true;
    this.sendBtn.disabled = true;
    const streamDiv = createStreamingBubble(this.messagesEl);
    try {
      const result = await this.copilot.sendMessage('__init__');
      if (result) {
        this.handleAgentAction(result.action, streamDiv, result.messageId);
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
  }

  // ─── WebSocket ───────────────────────────────────────────────────────────

  private connectSocket() {
    this.socket = new WidgetSocket(this.config.apiKey, this.config.apiUrl);
    this.socket.connect().catch(() => {});
  }

  // ─── Drop-off detection ──────────────────────────────────────────────────
  // Even in sidebar mode, we track rage clicks / form abandonment.
  // These signals appear in the analytics dashboard.

  private startDetection() {
    this.detector = new DropOffDetector(
      this.config.idleThreshold,
      (_reason, _meta) => {
        // In sidebar mode we don't pop anything — the panel is already visible.
        // Just ensure it's expanded if collapsed.
        if (this.isVisible && this.isCollapsed) this.expandPanel();
      },
      (eventType, props) => {
        const userId = this.config.userId ?? 'anonymous_' + this.getOrCreateAnonId();
        trackEvent(
          { apiKey: this.config.apiKey, apiUrl: this.config.apiUrl },
          userId,
          eventType as Parameters<typeof trackEvent>[2],
          props
        );
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

  // ─── Message submission ───────────────────────────────────────────────────

  private async submitMessage() {
    const content = this.inputEl.value.trim();
    if (!content || this.isSending) return;

    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';

    // ── Goal mode: user replied to an ask_clarification ──────────────────────
    if (this.goalMode && !this.goalRunning) {
      this.goalTurnHistory.push({ role: 'user', content });
      this.goalRunning = true;
      addMessage(this.messagesEl, content, 'user');
      await this.runGoalTurn();
      return;
    }

    this.isSending = true;
    this.sendBtn.disabled = true;

    const session = this.copilot.getSession();

    // ── No active flow session — treat message as a goal ─────────────────────
    if (!session) {
      this.startGoalMode(content);
      return;
    }

    addMessage(this.messagesEl, content, 'user');
    const streamDiv = createStreamingBubble(this.messagesEl);

    const result = await this.copilot.sendMessage(content, (word) => {
      // Live text streaming — append words as they arrive
      streamDiv.classList.remove('oai-streaming');
      streamDiv.textContent = (streamDiv.textContent ?? '') + word;
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    });
    if (result) {
      this.handleAgentAction(result.action, streamDiv, result.messageId);
    } else {
      streamDiv.textContent = 'Sorry, I had trouble responding. Please try again.';
      this.finishStreaming(streamDiv);
    }
  }

  // ─── Goal mode orchestration ─────────────────────────────────────────────

  private async startGoalMode(goal: string) {
    if (this.goalRunning) return;
    this.goalMode = true;
    this.goalText = goal;
    this.goalTurnHistory = [];
    this.goalTurnCount = 0;
    this.goalRunning = true;

    addMessage(this.messagesEl, goal, 'user');
    await this.runGoalTurn();
  }

  private async runGoalTurn() {
    if (!this.goalRunning) return;

    const streamDiv = createStreamingBubble(this.messagesEl);
    this.isSending = true;
    this.sendBtn.disabled = true;

    const result = await this.copilot.sendGoalMessage({
      goal: this.goalText,
      turnHistory: this.goalTurnHistory,
      turnCount: this.goalTurnCount,
    });

    streamDiv.remove();
    this.isSending = false;
    this.sendBtn.disabled = false;

    if (!result) {
      addMessage(this.messagesEl, 'Something went wrong. Please try again.', 'assistant');
      this.goalRunning = false;
      return;
    }

    const { action, done, turnCount } = result;
    this.goalTurnCount = turnCount;

    // Record what the agent decided in turn history
    const actionDesc = this.describeAction(action);
    this.goalTurnHistory.push({ role: 'assistant', content: actionDesc });

    // Handle the action in UI
    this.handleAgentAction(action, document.createElement('div'), null);

    if (done) {
      this.goalRunning = false;
      this.goalMode = false;
      return;
    }

    // ReAct: observe — wait for DOM to settle after action, then loop
    const delay = action.type === 'execute_page_action' ? 2000 : 500;
    setTimeout(() => this.runGoalTurn(), delay);
  }

  private describeAction(action: AgentAction): string {
    switch (action.type) {
      case 'execute_page_action':
        return `Executed ${action.actionType} action: ${action.message}`;
      case 'ask_clarification':
        return `Asked user: "${action.question}"`;
      case 'complete_step':
        return `Completed: ${action.message}`;
      case 'goal_complete':
        return `Goal achieved: ${action.summary}`;
      case 'escalate_to_human':
        return `Escalated: ${action.reason}`;
      default:
        return `Action: ${action.type}`;
    }
  }

  private handleAgentAction(action: AgentAction, streamDiv: HTMLDivElement, messageId: string | null = null) {
    streamDiv.remove();

    switch (action.type) {
      case 'ask_clarification': {
        const chipWrap = addChips(
          this.messagesEl,
          action.question,
          action.options ?? [],
          (opt) => {
            this.inputEl.value = opt;
            this.submitMessage();
          }
        );
        if (messageId) {
          addFeedbackButtons(chipWrap, (v) => this.copilot.sendFeedback(messageId, v));
        }
        break;
      }

      case 'execute_page_action': {
        this.copilot.executePageAction(action);
        addActionToast(this.messagesEl, action.message);
        // If agent flagged verification, check the DOM after the action settles
        if (action.shouldVerify) {
          this.copilot.scheduleVerify();
        }
        break;
      }

      case 'complete_step': {
        addMessage(this.messagesEl, action.message, 'assistant');
        const session = this.copilot.getSession();
        if (session) {
          setTimeout(() => {
            const next = session.flow.steps.find((s) => s.order > session.currentStep.order);
            if (next) {
              addMessage(this.messagesEl, `Next up: ${next.title} — ${next.description || 'ready when you are!'}`, 'assistant');
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
        this.inputEl.disabled = true;
        this.inputEl.placeholder = 'Waiting for a team member…';
        this.sendBtn.disabled = true;
        const pill = document.createElement('div');
        pill.style.cssText = 'margin:8px 12px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e;display:flex;align-items:center;gap:6px;';
        pill.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>Support ticket created — a team member will reach out soon.';
        this.messagesEl.appendChild(pill);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        break;
      }

      case 'chat': {
        const steps = tryParseSteps(action.content);
        const msgEl = steps
          ? addStepsCard(this.messagesEl, steps)
          : addMessage(this.messagesEl, action.content, 'assistant');
        if (messageId) {
          addFeedbackButtons(msgEl, (v) => this.copilot.sendFeedback(messageId, v));
        }
        break;
      }

      case 'goal_complete': {
        addCelebration(this.messagesEl, '✅ Done!', action.summary);
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

  // ─── Event bindings ───────────────────────────────────────────────────────

  private bindEvents() {
    // Collapse / expand toggle tab
    document.getElementById('oai-toggle')!.addEventListener('click', () => {
      if (this.isCollapsed) {
        this.expandPanel();
      } else {
        this.collapsePanel();
      }
    });

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
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 90) + 'px';
    });
  }

  private enableInput() {
    this.inputEl.disabled = false;
    this.inputEl.placeholder = 'Type a message…';
  }

  private consumeResumeToken(): boolean {
    const raw = localStorage.getItem('_oai_resume');
    if (!raw) return false;
    localStorage.removeItem('_oai_resume');
    return true;
  }

  private isOnTargetPage(targetUrl: string): boolean {
    try {
      const target = new URL(targetUrl, window.location.origin);
      return target.origin === window.location.origin && window.location.pathname === target.pathname;
    } catch {
      return false;
    }
  }

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
