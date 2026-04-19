// ─── Styles for the Prism side-panel ──────────────────────────────────────────
// Prism occupies the right 360 px of the viewport as a persistent sidebar.
// The host page body gets `margin-right: 360px` so content is never hidden
// behind the panel.  A collapse button on the panel's left edge lets users
// temporarily tuck it into a 40 px tab.

const PANEL_WIDTH = 360;
const COLLAPSED_WIDTH = 40;

export function injectStyles(primaryColor: string) {
  const css = `
    /* ── Host-page nudge ───────────────────────────────────────────────────── */
    body.__prism-open {
      margin-right: ${PANEL_WIDTH}px !important;
      transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    body.__prism-collapsed {
      margin-right: ${COLLAPSED_WIDTH}px !important;
      transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── Root container ────────────────────────────────────────────────────── */
    #oai-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

    /* ── Side panel ────────────────────────────────────────────────────────── */
    #oai-window {
      position: fixed;
      top: 0;
      right: 0;
      width: ${PANEL_WIDTH}px;
      height: 100vh;
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      z-index: 2147483640;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #oai-window.oai-hidden {
      transform: translateX(100%);
    }
    #oai-window.oai-collapsed {
      transform: translateX(${PANEL_WIDTH - COLLAPSED_WIDTH}px);
    }

    /* ── Collapse toggle tab (on left edge of panel) ───────────────────────── */
    #oai-toggle {
      position: absolute;
      left: -1px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 56px;
      background: white;
      border: 1px solid #e2e8f0;
      border-right: none;
      border-radius: 8px 0 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1;
      box-shadow: -3px 0 10px rgba(0,0,0,0.06);
      transition: background 0.15s;
    }
    #oai-toggle:hover { background: #f8fafc; }
    #oai-toggle svg {
      width: 12px;
      height: 12px;
      color: #94a3b8;
      transition: transform 0.2s ease;
    }
    #oai-window.oai-collapsed #oai-toggle svg {
      transform: rotate(180deg);
    }

    /* ── Header ────────────────────────────────────────────────────────────── */
    #oai-header {
      background: linear-gradient(160deg, ${primaryColor} 0%, #8b5cf6 100%);
      padding: 16px 16px 14px;
      flex-shrink: 0;
    }
    #oai-header-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    #oai-avatar {
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      flex-shrink: 0;
      position: relative;
    }
    #oai-avatar::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 9px;
      height: 9px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
    }
    #oai-header-text { flex: 1; min-width: 0; }
    #oai-header-title { font-weight: 700; font-size: 14px; color: white; margin: 0; line-height: 1.2; }
    #oai-header-sub { font-size: 11px; color: rgba(255,255,255,0.75); margin: 2px 0 0; }

    /* ── Step progress nav ─────────────────────────────────────────────────── */
    #oai-steps-nav {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .oai-step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 1;
      position: relative;
    }
    .oai-step-node:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 11px;
      left: 50%;
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,0.25);
    }
    .oai-step-node.done::after { background: rgba(255,255,255,0.7); }
    .oai-step-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: white;
      z-index: 1;
      transition: all 0.3s ease;
      position: relative;
    }
    .oai-step-node.active .oai-step-circle {
      background: white;
      color: ${primaryColor};
      border-color: white;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    }
    .oai-step-node.done .oai-step-circle {
      background: rgba(255,255,255,0.9);
      color: ${primaryColor};
      border-color: white;
    }
    .oai-step-label {
      font-size: 9px;
      color: rgba(255,255,255,0.6);
      text-align: center;
      max-width: 60px;
      line-height: 1.2;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }
    .oai-step-node.active .oai-step-label { color: rgba(255,255,255,0.95); font-weight: 600; }
    .oai-step-node.done .oai-step-label { color: rgba(255,255,255,0.8); }

    /* ── Progress bar strip (below header) ────────────────────────────────── */
    #oai-progress-wrap {
      padding: 8px 14px 6px;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
      background: white;
    }
    #oai-step-title {
      font-size: 11px;
      color: ${primaryColor};
      font-weight: 600;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #oai-progress-track {
      background: #e2e8f0;
      border-radius: 999px;
      height: 4px;
      overflow: hidden;
    }
    #oai-progress-bar {
      height: 100%;
      background: ${primaryColor};
      border-radius: 999px;
      transition: width 0.4s ease;
      width: 0%;
    }
    #oai-progress-text {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 3px;
    }

    /* ── Messages area ─────────────────────────────────────────────────────── */
    #oai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    #oai-messages::-webkit-scrollbar { width: 4px; }
    #oai-messages::-webkit-scrollbar-track { background: transparent; }
    #oai-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    /* AI message */
    .oai-msg-ai {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px 14px 14px 4px;
      padding: 11px 13px;
      font-size: 13px;
      line-height: 1.55;
      color: #1e293b;
      max-width: 92%;
      align-self: flex-start;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      animation: oai-msg-in 0.2s ease both;
    }

    /* User message */
    .oai-msg-user {
      background: linear-gradient(135deg, ${primaryColor}, #8b5cf6);
      border-radius: 14px 14px 4px 14px;
      padding: 10px 13px;
      font-size: 13px;
      line-height: 1.55;
      color: white;
      max-width: 85%;
      align-self: flex-end;
      box-shadow: 0 2px 8px rgba(99,102,241,0.28);
      animation: oai-msg-in 0.2s ease both;
    }

    /* Step label pill */
    .oai-step-pill {
      align-self: center;
      background: ${primaryColor};
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 11px;
      border-radius: 999px;
      letter-spacing: 0.02em;
      margin-bottom: -4px;
    }

    /* ── Quick-reply chips ──────────────────────────────────────────────────── */
    .oai-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 8px;
    }
    .oai-chip {
      border: 1.5px solid ${primaryColor};
      color: ${primaryColor};
      background: rgba(99,102,241,0.05);
      border-radius: 20px;
      padding: 6px 13px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      animation: oai-chip-in 0.25s ease both;
    }
    .oai-chip:hover {
      background: ${primaryColor};
      color: white;
      transform: translateY(-1px);
    }

    /* ── Feedback buttons ───────────────────────────────────────────────────── */
    .oai-feedback {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }
    .oai-feedback-btn {
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      padding: 2px 6px;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.15s, border-color 0.15s;
    }
    .oai-feedback-btn:hover:not(:disabled) { opacity: 1; border-color: #94a3b8; }
    .oai-feedback-btn.oai-feedback-active  { opacity: 1; border-color: ${primaryColor}; }
    .oai-feedback-btn:disabled             { cursor: default; }

    /* ── Action toast ───────────────────────────────────────────────────────── */
    .oai-action-toast {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 12px;
      color: #15803d;
      display: flex;
      align-items: center;
      gap: 7px;
      align-self: flex-start;
      max-width: 92%;
      animation: oai-msg-in 0.2s ease both;
    }
    .oai-action-toast .oai-toast-icon { font-size: 13px; flex-shrink: 0; }

    /* ── Streaming / typing ─────────────────────────────────────────────────── */
    .oai-streaming::after {
      content: '▋';
      display: inline-block;
      animation: oai-cursor 0.7s steps(1) infinite;
      margin-left: 2px;
      color: ${primaryColor};
    }
    .oai-typing {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px 14px 14px 4px;
      padding: 12px 16px;
      align-self: flex-start;
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .oai-dot-bounce {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: oai-bounce 1.2s infinite ease-in-out;
    }
    .oai-dot-bounce:nth-child(1) { animation-delay: 0s; }
    .oai-dot-bounce:nth-child(2) { animation-delay: 0.18s; }
    .oai-dot-bounce:nth-child(3) { animation-delay: 0.36s; }

    /* ── Celebration ────────────────────────────────────────────────────────── */
    .oai-celebration {
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
      border-radius: 14px;
      padding: 18px 16px;
      color: white;
      text-align: center;
      align-self: stretch;
      animation: oai-celebrate 0.5s cubic-bezier(.34,1.56,.64,1) both;
    }
    .oai-celebration-emoji { font-size: 32px; margin-bottom: 8px; display: block; }
    .oai-celebration-headline { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
    .oai-celebration-insight { font-size: 12.5px; opacity: 0.9; line-height: 1.5; }

    /* ── Input area ─────────────────────────────────────────────────────────── */
    #oai-input-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 11px 13px;
      border-top: 1px solid #e2e8f0;
      background: white;
      flex-shrink: 0;
    }
    #oai-input {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      border-radius: 11px;
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
      resize: none;
      color: #1e293b;
      background: #f8fafc;
      transition: border-color 0.15s, background 0.15s;
      line-height: 1.4;
      max-height: 90px;
    }
    #oai-input:focus { border-color: ${primaryColor}; background: white; }
    #oai-input::placeholder { color: #94a3b8; }
    #oai-input:disabled { opacity: 0.5; cursor: not-allowed; }
    #oai-send {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
    #oai-send:hover:not(:disabled) { transform: scale(1.05); }
    #oai-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #oai-send svg { width: 15px; height: 15px; fill: white; }

    /* ── Footer ─────────────────────────────────────────────────────────────── */
    #oai-footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      padding: 5px 0 7px;
      background: white;
      flex-shrink: 0;
    }
    #oai-footer a { color: #6366f1; text-decoration: none; }

    /* ── Animations ─────────────────────────────────────────────────────────── */
    @keyframes oai-msg-in {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes oai-chip-in {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes oai-celebrate {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes oai-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40%           { transform: translateY(-5px); }
    }
    @keyframes oai-cursor {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }

    /* ── Mobile: full-width bottom sheet ────────────────────────────────────── */
    @media (max-width: 640px) {
      body.__prism-open, body.__prism-collapsed {
        margin-right: 0 !important;
        /* Prevent content shifting behind the sheet */
        padding-bottom: 55vh !important;
      }
      #oai-window {
        width: 100vw;
        top: auto;
        right: 0;
        left: 0;
        bottom: 0;
        height: 55vh;
        min-height: 320px;
        border-left: none;
        border-top: 1px solid #e2e8f0;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -8px 32px rgba(0,0,0,0.12);
        /* Slide up from the bottom */
        transform: translateY(0);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #oai-window.oai-hidden {
        transform: translateY(100%);
      }
      #oai-window.oai-collapsed {
        transform: translateY(calc(55vh - 48px));
      }
      /* Drag handle instead of arrow toggle on mobile */
      #oai-toggle {
        position: absolute;
        left: 50%;
        top: 8px;
        transform: translateX(-50%);
        width: 40px;
        height: 5px;
        background: #cbd5e1;
        border-radius: 999px;
        border: none;
        box-shadow: none;
        cursor: grab;
      }
      #oai-toggle svg { display: none; }
      /* Larger tap targets on mobile */
      .oai-chip { padding: 9px 16px; font-size: 14px; }
      #oai-input { font-size: 16px; } /* prevent iOS zoom on focus */
      .oai-msg-ai, .oai-msg-user { font-size: 14px; }
      /* Cursor animation: skip movement on mobile (too small to be meaningful) */
      #__prism_cursor__ { display: none !important; }
    }

    /* ── Degradation card ──────────────────────────────────────────────────── */
    .oai-degrade-card {
      background: #fff8e1;
      border: 1.5px solid #f59e0b;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 8px 0;
      font-size: 13px;
    }
    .oai-degrade-header {
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
    }
    .oai-degrade-instruction {
      color: #1a1a1a;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .oai-degrade-reason {
      color: #6b7280;
      font-size: 11px;
      margin-bottom: 12px;
    }
    .oai-degrade-actions { display: flex; gap: 8px; }
    .oai-degrade-done {
      background: #f59e0b;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .oai-degrade-escalate {
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 12px;
    }
  `;

  const style = document.createElement('style');
  style.id = 'oai-styles';
  style.textContent = css;
  document.head.appendChild(style);
}
