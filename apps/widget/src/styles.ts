export function injectStyles(primaryColor: string, position: 'bottom-right' | 'bottom-left') {
  const side = position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;';
  const windowSide = position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;';

  const css = `
    #oai-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

    /* ── Launcher button ─────────────────────────────────────────────────────── */
    #oai-bubble {
      position: fixed;
      bottom: 28px;
      ${side}
      display: flex;
      align-items: center;
      gap: 10px;
      background: ${primaryColor};
      border: none;
      border-radius: 50px;
      padding: 0 20px 0 6px;
      height: 52px;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(99,102,241,0.45), 0 1px 4px rgba(0,0,0,0.12);
      z-index: 99999;
      transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease;
      animation: oai-launcher-in 0.5s cubic-bezier(.34,1.56,.64,1) both;
    }
    #oai-bubble:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 8px 32px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.14);
    }
    #oai-bubble-icon {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 20px;
    }
    #oai-bubble-label {
      color: white;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    #oai-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
      animation: oai-pulse-dot 2s infinite;
    }

    /* ── Main panel ──────────────────────────────────────────────────────────── */
    #oai-window {
      position: fixed;
      bottom: 92px;
      ${windowSide}
      width: 380px;
      height: 580px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      z-index: 99998;
      overflow: hidden;
      transform-origin: bottom right;
      animation: oai-panel-in 0.3s cubic-bezier(.34,1.56,.64,1) both;
      border: 1px solid rgba(0,0,0,0.06);
    }
    #oai-window.oai-hidden {
      display: none;
    }

    /* ── Header ──────────────────────────────────────────────────────────────── */
    #oai-header {
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
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
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      position: relative;
    }
    #oai-avatar::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
    }
    #oai-header-text { flex: 1; }
    #oai-header-title { font-weight: 700; font-size: 14px; color: white; margin: 0; line-height: 1.2; }
    #oai-header-sub { font-size: 11px; color: rgba(255,255,255,0.75); margin: 2px 0 0; }
    #oai-close {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    #oai-close:hover { background: rgba(255,255,255,0.25); }

    /* ── Step progress ───────────────────────────────────────────────────────── */
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

    /* ── Messages area ───────────────────────────────────────────────────────── */
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

    /* AI message card */
    .oai-msg-ai {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px 16px 16px 4px;
      padding: 12px 14px;
      font-size: 13.5px;
      line-height: 1.55;
      color: #1e293b;
      max-width: 90%;
      align-self: flex-start;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      animation: oai-msg-in 0.2s ease both;
    }

    /* User message */
    .oai-msg-user {
      background: linear-gradient(135deg, ${primaryColor}, #8b5cf6);
      border-radius: 16px 16px 4px 16px;
      padding: 11px 14px;
      font-size: 13.5px;
      line-height: 1.55;
      color: white;
      max-width: 82%;
      align-self: flex-end;
      box-shadow: 0 2px 8px rgba(99,102,241,0.3);
      animation: oai-msg-in 0.2s ease both;
    }

    /* Step label pill above AI message */
    .oai-step-pill {
      align-self: center;
      background: ${primaryColor};
      color: white;
      font-size: 10.5px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      letter-spacing: 0.02em;
      margin-bottom: -4px;
    }

    /* ── Quick-reply chips ───────────────────────────────────────────────────── */
    .oai-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .oai-chip {
      border: 1.5px solid ${primaryColor};
      color: ${primaryColor};
      background: rgba(99,102,241,0.05);
      border-radius: 20px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      animation: oai-chip-in 0.25s ease both;
    }
    .oai-chip:hover {
      background: ${primaryColor};
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99,102,241,0.3);
    }

    /* ── Action toast (page action feedback) ────────────────────────────────── */
    .oai-action-toast {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 10px 13px;
      font-size: 12.5px;
      color: #15803d;
      display: flex;
      align-items: center;
      gap: 8px;
      align-self: flex-start;
      max-width: 90%;
      animation: oai-msg-in 0.2s ease both;
    }
    .oai-action-toast .oai-toast-icon { font-size: 14px; flex-shrink: 0; }

    /* ── Typing indicator ────────────────────────────────────────────────────── */
    .oai-typing {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px 16px 16px 4px;
      padding: 12px 16px;
      align-self: flex-start;
      display: flex;
      gap: 5px;
      align-items: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .oai-dot-bounce {
      width: 7px;
      height: 7px;
      background: #94a3b8;
      border-radius: 50%;
      animation: oai-bounce 1.2s infinite ease-in-out;
    }
    .oai-dot-bounce:nth-child(1) { animation-delay: 0s; }
    .oai-dot-bounce:nth-child(2) { animation-delay: 0.18s; }
    .oai-dot-bounce:nth-child(3) { animation-delay: 0.36s; }

    /* Streaming cursor */
    .oai-streaming::after {
      content: '▋';
      display: inline-block;
      animation: oai-cursor 0.7s steps(1) infinite;
      margin-left: 2px;
      color: ${primaryColor};
    }

    /* ── Celebration card ────────────────────────────────────────────────────── */
    .oai-celebration {
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
      border-radius: 16px;
      padding: 20px 18px;
      color: white;
      text-align: center;
      align-self: stretch;
      animation: oai-celebrate 0.5s cubic-bezier(.34,1.56,.64,1) both;
    }
    .oai-celebration-emoji { font-size: 36px; margin-bottom: 8px; display: block; }
    .oai-celebration-headline { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .oai-celebration-insight { font-size: 13px; opacity: 0.9; line-height: 1.5; }

    /* ── Input area ──────────────────────────────────────────────────────────── */
    #oai-input-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #e2e8f0;
      background: white;
      flex-shrink: 0;
    }
    #oai-input {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 9px 13px;
      font-size: 13.5px;
      outline: none;
      resize: none;
      color: #1e293b;
      background: #f8fafc;
      transition: border-color 0.15s, background 0.15s;
      line-height: 1.4;
      max-height: 100px;
    }
    #oai-input:focus { border-color: ${primaryColor}; background: white; }
    #oai-input::placeholder { color: #94a3b8; }
    #oai-input:disabled { opacity: 0.5; cursor: not-allowed; }
    #oai-send {
      width: 38px;
      height: 38px;
      border-radius: 12px;
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
    #oai-send svg { width: 16px; height: 16px; fill: white; }

    /* ── Powered by footer ───────────────────────────────────────────────────── */
    #oai-footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      padding: 6px 0 8px;
      background: white;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }
    #oai-footer a { color: #6366f1; text-decoration: none; }

    /* ── Highlight overlay (element spotlight) ───────────────────────────────── */
    @keyframes oai-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.6), 0 0 0 8px rgba(99,102,241,0.2); }
      50%       { box-shadow: 0 0 0 6px rgba(99,102,241,0.8), 0 0 0 14px rgba(99,102,241,0.1); }
    }

    /* ── Animations ──────────────────────────────────────────────────────────── */
    @keyframes oai-launcher-in {
      from { opacity: 0; transform: translateY(20px) scale(0.8); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes oai-panel-in {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes oai-msg-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes oai-chip-in {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes oai-celebrate {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes oai-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40%           { transform: translateY(-6px); }
    }
    @keyframes oai-pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%       { transform: scale(1.4); opacity: 0.7; }
    }
    @keyframes oai-cursor {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }

    /* ── Mobile ──────────────────────────────────────────────────────────────── */
    @media (max-width: 420px) {
      #oai-window { width: calc(100vw - 16px); right: 8px; left: 8px; height: 70vh; bottom: 80px; }
      #oai-bubble { padding: 0 14px 0 6px; }
      #oai-bubble-label { display: none; }
      #oai-bubble { border-radius: 50%; width: 52px; padding: 0; justify-content: center; }
    }
  `;

  const style = document.createElement('style');
  style.id = 'oai-styles';
  style.textContent = css;
  document.head.appendChild(style);
}
