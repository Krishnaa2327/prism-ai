// All communication between the widget and our backend lives here

interface ApiOptions {
  apiKey: string;
  apiUrl: string;
}

export async function startConversation(
  opts: ApiOptions,
  endUserId: string,
  metadata: Record<string, unknown>,
  triggeredBy: 'idle' | 'exit_intent' | 'manual'
): Promise<{ conversationId: string }> {
  const res = await fetch(`${opts.apiUrl}/api/v1/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': opts.apiKey,
    },
    body: JSON.stringify({ endUserId, metadata, triggeredBy }),
  });

  if (!res.ok) throw new Error('Failed to start conversation');
  return res.json();
}

export async function sendMessage(
  opts: ApiOptions,
  conversationId: string,
  content: string
): Promise<{ messageId: string; content: string; tokensUsed: number }> {
  const res = await fetch(`${opts.apiUrl}/api/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': opts.apiKey,
    },
    body: JSON.stringify({ conversationId, content }),
  });

  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function trackEvent(
  opts: ApiOptions,
  endUserId: string,
  eventType: 'page_view' | 'idle' | 'exit_intent' | 'click' | 'form_start' | 'form_abandon' | 'custom',
  properties: Record<string, unknown> = {}
): Promise<void> {
  // fire-and-forget — don't await so it never blocks the UI
  fetch(`${opts.apiUrl}/api/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': opts.apiKey,
    },
    body: JSON.stringify({ endUserId, eventType, properties }),
  }).catch(() => {
    // silently ignore — tracking should never crash the host app
  });
}
