// ─── API Call Service — server-side HTTP requests for the agent ───────────────
// Executes outbound HTTP requests on behalf of the AI agent.
// Handles {{variable}} interpolation from collectedData and response truncation.

export interface ApiCallParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface ApiCallResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Replace {{key}} placeholders in any JSON-serializable value using collectedData. */
export function interpolate(value: unknown, data: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data[k] ?? `{{${k}}}`));
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, data));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, interpolate(v, data)])
    );
  }
  return value;
}

/** Truncate response data to avoid flooding the AI context window. */
function truncateData(data: unknown, maxChars = 2000): unknown {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  if (str.length <= maxChars) return data;
  return str.slice(0, maxChars) + '…[truncated]';
}

export async function executeApiCall(params: ApiCallParams): Promise<ApiCallResult> {
  // Block private/loopback addresses
  try {
    const host = new URL(params.url).hostname;
    if (BLOCKED_HOSTS.test(host)) {
      return { ok: false, status: 0, error: 'Blocked: private or loopback address' };
    }
  } catch {
    return { ok: false, status: 0, error: 'Invalid URL' };
  }

  try {
    const res = await fetch(params.url, {
      method: params.method,
      headers: { 'Content-Type': 'application/json', ...(params.headers ?? {}) },
      body: ['GET', 'HEAD'].includes(params.method) ? undefined : JSON.stringify(params.body ?? {}),
      signal: AbortSignal.timeout(8000),
    });

    const ct = res.headers.get('content-type') ?? '';
    const raw = ct.includes('application/json') ? await res.json() : await res.text();
    const data = truncateData(raw);

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}
