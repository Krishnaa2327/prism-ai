// ─── UI components for the Prism side-panel widget ───────────────────────────

export interface StepsResponse {
  type: 'steps';
  title: string;
  items: string[];
}

export function tryParseSteps(text: string): StepsResponse | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.type === 'steps' && Array.isArray(parsed.items)) return parsed as StepsResponse;
  } catch { /* not JSON */ }
  return null;
}

export function createRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = 'oai-root';
  document.body.appendChild(root);
  return root;
}

// ── Side panel ─────────────────────────────────────────────────────────────────
export function createSidePanel(root: HTMLElement): HTMLDivElement {
  const win = document.createElement('div');
  win.id = 'oai-window';
  win.className = 'oai-hidden';
  win.setAttribute('role', 'complementary');
  win.setAttribute('aria-label', 'Prism onboarding guide');
  win.innerHTML = `
    <!-- Collapse/expand tab on the left edge -->
    <button id="oai-toggle" aria-label="Collapse panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>

    <div id="oai-header">
      <div id="oai-header-top">
        <div id="oai-avatar">✦</div>
        <div id="oai-header-text">
          <p id="oai-header-title">Prism</p>
          <p id="oai-header-sub">Your onboarding guide · AI</p>
        </div>
      </div>
      <div id="oai-steps-nav"></div>
    </div>

    <div id="oai-messages" role="log" aria-live="polite"></div>

    <div id="oai-input-row">
      <textarea
        id="oai-input"
        rows="1"
        placeholder="Type a message…"
        aria-label="Message input"
      ></textarea>
      <button id="oai-send" aria-label="Send" disabled>
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>

    <div id="oai-footer">Powered by <a href="https://useprism.ai" target="_blank" rel="noopener">Prism</a></div>
  `;
  root.appendChild(win);
  return win;
}

// ── Step progress nav ──────────────────────────────────────────────────────────
export function renderStepProgress(
  steps: Array<{ id: string; title: string; order: number }>,
  currentStepId: string,
  completedStepIds: string[]
) {
  const nav = document.getElementById('oai-steps-nav');
  if (!nav) return;
  nav.innerHTML = '';

  steps.forEach((step, i) => {
    const isDone = completedStepIds.includes(step.id);
    const isActive = step.id === currentStepId && !isDone;

    const node = document.createElement('div');
    node.className = `oai-step-node${isDone ? ' done' : ''}${isActive ? ' active' : ''}`;

    const circle = document.createElement('div');
    circle.className = 'oai-step-circle';
    circle.textContent = isDone ? '✓' : String(i + 1);

    const label = document.createElement('div');
    label.className = 'oai-step-label';
    label.textContent = step.title;

    node.appendChild(circle);
    node.appendChild(label);
    nav.appendChild(node);
  });
}

// ── Messages ───────────────────────────────────────────────────────────────────
export function addMessage(
  messagesEl: HTMLElement,
  content: string,
  role: 'user' | 'assistant'
) {
  const div = document.createElement('div');
  div.className = role === 'assistant' ? 'oai-msg-ai' : 'oai-msg-user';
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ── Feedback buttons (thumbs up / down on assistant messages) ─────────────────
export function addFeedbackButtons(
  msgEl: HTMLElement,
  onFeedback: (value: 1 | -1) => void
) {
  const row = document.createElement('div');
  row.className = 'oai-feedback';

  const up   = document.createElement('button');
  const down = document.createElement('button');
  up.className   = 'oai-feedback-btn';
  down.className = 'oai-feedback-btn';
  up.setAttribute('aria-label', 'Helpful');
  down.setAttribute('aria-label', 'Not helpful');
  up.textContent   = '👍';
  down.textContent = '👎';

  const handle = (value: 1 | -1, active: HTMLButtonElement, inactive: HTMLButtonElement) => {
    active.classList.add('oai-feedback-active');
    inactive.disabled = true;
    active.disabled   = true;
    onFeedback(value);
  };

  up.addEventListener('click',   () => handle(1,  up,   down));
  down.addEventListener('click', () => handle(-1, down, up));

  row.appendChild(up);
  row.appendChild(down);
  msgEl.appendChild(row);
  return row;
}

export function addStepPill(messagesEl: HTMLElement, label: string) {
  const pill = document.createElement('div');
  pill.className = 'oai-step-pill';
  pill.textContent = label;
  messagesEl.appendChild(pill);
}

// ── Action toast ───────────────────────────────────────────────────────────────
export function addActionToast(messagesEl: HTMLElement, message: string) {
  const toast = document.createElement('div');
  toast.className = 'oai-action-toast';
  toast.innerHTML = `<span class="oai-toast-icon">✅</span><span>${message}</span>`;
  messagesEl.appendChild(toast);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return toast;
}

// ── Quick-reply chips ──────────────────────────────────────────────────────────
export function addChips(
  messagesEl: HTMLElement,
  question: string,
  options: string[],
  onSelect: (opt: string) => void
) {
  const wrap = document.createElement('div');
  wrap.className = 'oai-msg-ai';

  if (question) {
    const q = document.createElement('div');
    q.style.marginBottom = '10px';
    q.textContent = question;
    wrap.appendChild(q);
  }

  const row = document.createElement('div');
  row.className = 'oai-chips';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'oai-chip';
    btn.textContent = opt;
    btn.style.animationDelay = `${i * 0.06}s`;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.oai-chip').forEach((c) => ((c as HTMLButtonElement).disabled = true));
      onSelect(opt);
    });
    row.appendChild(btn);
  });

  wrap.appendChild(row);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrap;
}

// ── Celebration card ───────────────────────────────────────────────────────────
export function addCelebration(messagesEl: HTMLElement, headline: string, insight: string) {
  const card = document.createElement('div');
  card.className = 'oai-celebration';
  card.innerHTML = `
    <span class="oai-celebration-emoji">🎉</span>
    <div class="oai-celebration-headline">${headline}</div>
    <div class="oai-celebration-insight">${insight}</div>
  `;
  messagesEl.appendChild(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return card;
}

// ── Streaming bubble ───────────────────────────────────────────────────────────
export function createStreamingBubble(messagesEl: HTMLElement): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'oai-msg-ai oai-streaming';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ── Steps card (numbered list response) ───────────────────────────────────────
export function addStepsCard(messagesEl: HTMLElement, steps: StepsResponse): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'oai-msg-ai';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:13px;';
  title.textContent = steps.title;
  card.appendChild(title);

  const ol = document.createElement('ol');
  ol.style.cssText = 'margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;';
  steps.items.forEach((item) => {
    const li = document.createElement('li');
    li.style.cssText = 'font-size:12px;color:#475569;line-height:1.45;';
    li.textContent = item;
    ol.appendChild(li);
  });
  card.appendChild(ol);

  messagesEl.appendChild(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return card;
}
