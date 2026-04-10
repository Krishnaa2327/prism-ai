/**
 * Retry a promise-returning function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries: number; delayMs: number; label?: string }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < opts.retries) {
        const wait = opts.delayMs * Math.pow(2, attempt);
        log('warn', 'retry', { label: opts.label, attempt: attempt + 1, waitMs: wait });
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  log('error', 'retry.exhausted', { label: opts.label, retries: opts.retries });
  throw lastError;
}

/**
 * Structured JSON logger.
 * Railway captures stdout — every line here is searchable in Railway logs.
 * Format: { ts, level, event, ...fields }
 */

type Level = 'info' | 'warn' | 'error';

interface LogFields {
  [key: string]: unknown;
}

function log(level: Level, event: string, fields: LogFields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  info:  (event: string, fields?: LogFields) => log('info',  event, fields),
  warn:  (event: string, fields?: LogFields) => log('warn',  event, fields),
  error: (event: string, fields?: LogFields) => log('error', event, fields),

  // Convenience wrappers for common events
  agentAction: (orgId: string, sessionId: string, action: string, fields?: LogFields) =>
    log('info', 'agent.action', { orgId, sessionId, action, ...fields }),

  agentError: (orgId: string, sessionId: string, error: unknown, fields?: LogFields) =>
    log('error', 'agent.error', {
      orgId,
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      ...fields,
    }),

  sessionEvent: (orgId: string, sessionId: string, event: string, fields?: LogFields) =>
    log('info', `session.${event}`, { orgId, sessionId, ...fields }),

  httpError: (method: string, path: string, status: number, error: unknown) =>
    log('error', 'http.error', {
      method,
      path,
      status,
      error: error instanceof Error ? error.message : String(error),
    }),
};
