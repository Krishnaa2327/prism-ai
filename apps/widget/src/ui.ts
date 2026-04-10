// ─── UI components for the OnboardAI widget ──────────────────────────────────

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

// ── Launcher bubble ────────────────────────────────────────────────────────────
export function createBubble(root: HTMLElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'oai-bubble';
  btn.setAttribute('aria-label', 'Open AI copilot');
  btn.innerHTML = `
    <div id="oai-bubble-icon">🤖</div>
    <span id="oai-bubble-label">Need help?</span>
    <span id="oai-dot"></span>
  `;
  root.appendChild(btn);
  return btn;
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export function createChatWindow(root: HTMLElement): HTMLDivElement {
  const win = document.createElement('div');
  win.id = 'oai-window';
  win.className = 'oai-hidden';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'AI onboarding copilot');
  win.innerHTML = `
    <div id="oai-header">
      <div id="oai-header-top">
        <div id="oai-avatar">🤖</div>
        <div id="oai-header-text">
          <p id="oai-header-title">Onboarding Copilot</p>
          <p id="oai-header-sub">AI · Online</p>
        </div>
        <button id="oai-close" aria-label="Close">✕</button>
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
    <div id="oai-footer">Powered by <a href="https://onboardai.com" target="_blank">OnboardAI</a></div>
  `;
  root.appendChild(win);
  return win;
}

// ── Step progress nav (renders inside #oai-steps-nav) ─────────────────────────
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

export function addStepPill(messagesEl: HTMLElement, label: string) {
  const pill = document.createElement('div');
  pill.className = 'oai-step-pill';
  pill.textContent = label;
  messagesEl.appendChild(pill);
}

// ── Action toast (green success card for page actions) ─────────────────────────
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

  const q = document.createElement('div');
  q.style.marginBottom = '10px';
  q.textContent = question;
  wrap.appendChild(q);

  const row = document.createElement('div');
  row.className = 'oai-chips';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'oai-chip';
    btn.textContent = opt;
    btn.style.animationDelay = `${i * 0.06}s`;
    btn.addEventListener('click', () => {
      // Disable all chips after selection
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

// ── Typing indicator ───────────────────────────────────────────────────────────
export function showTypingIndicator(messagesEl: HTMLElement): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'oai-typing';
  div.innerHTML = `
    <div class="oai-dot-bounce"></div>
    <div class="oai-dot-bounce"></div>
    <div class="oai-dot-bounce"></div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ── Streaming bubble ───────────────────────────────────────────────────────────
export function createStreamingBubble(messagesEl: HTMLElement): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'oai-msg-ai oai-streaming';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

export function hideDot() {
  const dot = document.getElementById('oai-dot');
  if (dot) dot.style.display = 'none';
}

// ── Bubble nudge (recapture) ───────────────────────────────────────────────────
// Shows a small animated message next to the launcher bubble without opening
// the full chat window. Auto-dismisses after 8 seconds.
const NUDGE_ID = 'oai-nudge';

export function showBubbleNudge(message: string, onClick: () => void): void {
  hideBubbleNudge(); // remove any existing nudge

  const nudge = document.createElement('div');
  nudge.id = NUDGE_ID;
  nudge.setAttribute('role', 'status');
  nudge.style.cssText = `
    position:fixed;
    bottom:80px;
    right:20px;
    background:#1e293b;
    color:#f8fafc;
    font-size:13px;
    font-family:inherit;
    padding:10px 14px;
    border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,.25);
    max-width:240px;
    line-height:1.45;
    cursor:pointer;
    z-index:2147483646;
    animation:oai-nudge-in .25s cubic-bezier(.34,1.56,.64,1) both;
  `;

  // Inject keyframe once
  if (!document.getElementById('oai-nudge-style')) {
    const style = document.createElement('style');
    style.id = 'oai-nudge-style';
    style.textContent = `
      @keyframes oai-nudge-in {
        from { opacity:0; transform:translateY(8px) scale(.9); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
      #oai-nudge:hover { background:#334155; }
      #oai-nudge .oai-nudge-arrow {
        display:block;
        font-size:11px;
        margin-top:5px;
        color:#94a3b8;
      }
    `;
    document.head.appendChild(style);
  }

  nudge.innerHTML = `${message}<span class="oai-nudge-arrow">Continue where you left off →</span>`;
  nudge.addEventListener('click', () => { hideBubbleNudge(); onClick(); });
  document.body.appendChild(nudge);

  // Auto-dismiss after 8 seconds
  setTimeout(hideBubbleNudge, 8000);
}

export function hideBubbleNudge(): void {
  document.getElementById(NUDGE_ID)?.remove();
}

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
    li.style.cssText = 'font-size:12.5px;color:#475569;line-height:1.45;';
    li.textContent = item;
    ol.appendChild(li);
  });
  card.appendChild(ol);
  messagesEl.appendChild(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return card;
}
