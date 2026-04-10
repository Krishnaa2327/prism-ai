// WebSocket client — manages the persistent connection to the backend
// The widget uses this instead of fetch for sending messages,
// so the AI response streams token-by-token in real time.

type TokenCallback = (token: string) => void;
type DoneCallback = (messageId: string, tokensUsed: number) => void;
type ErrorCallback = (message: string) => void;

interface PendingMessage {
  onToken: TokenCallback;
  onDone: DoneCallback;
  onError: ErrorCallback;
}

export class WidgetSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private wsUrl: string;
  private authenticated = false;
  private pending: PendingMessage | null = null;

  // Queue messages sent before the socket is ready
  private queue: Array<() => void> = [];

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    // Convert http(s):// → ws(s)://
    this.wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        // Auth immediately on connect
        this.ws!.send(JSON.stringify({ type: 'auth', apiKey: this.apiKey }));
      };

      this.ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'connected':
            break;

          case 'auth_ok':
            this.authenticated = true;
            // Flush any messages that were queued before auth completed
            this.queue.forEach((fn) => fn());
            this.queue = [];
            resolve();
            break;

          case 'stream_start':
            // Server is about to start streaming — nothing to do, UI already shows cursor
            break;

          case 'token':
            // A new text chunk arrived — call the pending message's handler
            if (this.pending) {
              this.pending.onToken(msg.content as string);
            }
            break;

          case 'done':
            if (this.pending) {
              this.pending.onDone(msg.messageId as string, msg.tokensUsed as number);
              this.pending = null;
            }
            break;

          case 'error':
            if (this.pending) {
              this.pending.onError(msg.message as string);
              this.pending = null;
            } else if (!this.authenticated) {
              reject(new Error(msg.message as string));
            }
            break;
        }
      };

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.authenticated = false;
        this.ws = null;
        // Reconnect after 3s if the connection drops unexpectedly
        setTimeout(() => this.connect().catch(() => {}), 3000);
      };
    });
  }

  sendMessage(
    conversationId: string,
    content: string,
    callbacks: PendingMessage
  ) {
    const send = () => {
      this.pending = callbacks;
      this.ws!.send(JSON.stringify({ type: 'message', conversationId, content }));
    };

    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      send();
    } else {
      this.queue.push(send);
    }
  }

  isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }
}
