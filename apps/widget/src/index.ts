import { OnboardAIWidget } from './widget';
import { WidgetConfig } from './config';

// ─── Public API surface ──────────────────────────────────────────────────────
// Customers call:
//   OnboardAI('init', { apiKey: '...', userId: '...' })
//   OnboardAI('event', 'data_connected')   ← fire a step completion event

type Command = 'init' | 'event';

declare global {
  interface Window {
    OnboardAI: (cmd: Command, payload: WidgetConfig | string) => void;
    __oai_widget?: OnboardAIWidget;
  }
}

window.OnboardAI = function (cmd: Command, payload: WidgetConfig | string) {
  if (cmd === 'init') {
    if (window.__oai_widget) return; // prevent double init
    const widget = new OnboardAIWidget(payload as WidgetConfig);
    widget.init();
    window.__oai_widget = widget;
    return;
  }

  if (cmd === 'event') {
    // Fire a step completion event — call after user completes a step in the SaaS product
    // e.g. OnboardAI('event', 'data_connected')
    const eventType = payload as string;
    window.__oai_widget?.getCopilot().fireEvent(eventType);
    return;
  }
};

// Replay any queued calls made before the script loaded
if (Array.isArray((window as any).__oai_q)) {
  (window as any).__oai_q.forEach(([cmd, p]: [Command, WidgetConfig | string]) =>
    window.OnboardAI(cmd, p)
  );
}
