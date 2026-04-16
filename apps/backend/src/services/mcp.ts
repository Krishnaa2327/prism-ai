// ─── MCP (Model Context Protocol) client ─────────────────────────────────────
// Fetches tool lists from configured MCP servers and proxies tool calls back.
// Tool lists are cached per connector for 5 minutes — avoids a network round-
// trip on every agent call while staying reasonably fresh.
//
// JSON-RPC 2.0 over HTTP (stateless transport, no SSE session required):
//   tools/list  → returns available tools with their input schemas
//   tools/call  → executes a tool and returns content[]

import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface ConnectorRow {
  id: string;
  name: string;
  serverUrl: string;
  authType: string;
  authValue: string | null;
}

export interface ConnectorToolBundle {
  connector: ConnectorRow;
  tools: McpTool[];
  // Lookup: openai tool name → original MCP tool name
  nameMap: Map<string, string>;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
const toolListCache = new Map<string, { tools: McpTool[]; fetchedAt: number }>();
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes

// ─── Auth headers ─────────────────────────────────────────────────────────────
function authHeaders(authType: string, authValue: string | null): Record<string, string> {
  if (authType === 'bearer' && authValue) return { Authorization: `Bearer ${authValue}` };
  if (authType === 'api_key' && authValue)  return { 'X-API-Key': authValue };
  return {};
}

// ─── JSON-RPC helper ──────────────────────────────────────────────────────────
async function rpc<T>(
  serverUrl: string,
  auth: { type: string; value: string | null },
  method: string,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<T | null> {
  try {
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth.type, auth.value) },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: T; error?: { message: string } };
    if (data.error) { logger.warn('[mcp] RPC error', { method, error: data.error.message }); return null; }
    return data.result ?? null;
  } catch (err) {
    logger.warn('[mcp] RPC failed', { method, serverUrl, err: (err as Error).message });
    return null;
  }
}

// ─── Tool name sanitiser ──────────────────────────────────────────────────────
// OpenAI function names: ^[a-zA-Z0-9_-]{1,64}$
// We prefix with mcp__ + first 8 chars of connector UUID to namespace tools.
function toOpenAIName(connectorId: string, toolName: string): string {
  const prefix = `mcp__${connectorId.replace(/-/g, '').slice(0, 8)}`;
  const safe   = toolName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return `${prefix}__${safe}`;
}

// ─── Fetch tools for one connector ───────────────────────────────────────────
async function fetchConnectorTools(c: ConnectorRow): Promise<McpTool[]> {
  const cached = toolListCache.get(c.id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.tools;

  const result = await rpc<{ tools: McpTool[] }>(
    c.serverUrl,
    { type: c.authType, value: c.authValue },
    'tools/list',
    {},
    3000, // 3 s — skip slow servers
  );

  const tools = result?.tools ?? [];
  toolListCache.set(c.id, { tools, fetchedAt: Date.now() });
  return tools;
}

// ─── Load all MCP tools for an org ───────────────────────────────────────────
export async function loadMcpTools(orgId: string): Promise<ConnectorToolBundle[]> {
  const connectors = await prisma.mcpConnector.findMany({
    where: { organizationId: orgId, enabled: true },
    select: { id: true, name: true, serverUrl: true, authType: true, authValue: true },
  });

  if (connectors.length === 0) return [];

  // Fetch tool lists in parallel — silently skip any that fail
  const settled = await Promise.allSettled(
    connectors.map(async (c) => ({
      connector: c,
      tools: await fetchConnectorTools(c),
    }))
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<{ connector: ConnectorRow; tools: McpTool[] }> =>
      r.status === 'fulfilled' && r.value.tools.length > 0
    )
    .map(({ value: { connector, tools } }) => {
      const nameMap = new Map<string, string>();
      for (const t of tools) nameMap.set(toOpenAIName(connector.id, t.name), t.name);
      return { connector, tools, nameMap };
    });
}

// ─── Convert MCP tool list → OpenAI tool definitions ─────────────────────────
export function toOpenAITools(bundles: ConnectorToolBundle[]): OpenAI.Chat.ChatCompletionTool[] {
  const out: OpenAI.Chat.ChatCompletionTool[] = [];
  for (const { connector, tools, nameMap } of bundles) {
    for (const tool of tools) {
      const oaiName = [...nameMap.entries()].find(([, v]) => v === tool.name)?.[0];
      if (!oaiName) continue;
      out.push({
        type: 'function',
        function: {
          name: oaiName,
          description: `[${connector.name}] ${tool.description}`,
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      });
    }
  }
  return out;
}

// ─── Execute a tool call on an MCP server ────────────────────────────────────
export async function callMcpTool(
  connector: ConnectorRow,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const result = await rpc<McpToolResult>(
    connector.serverUrl,
    { type: connector.authType, value: connector.authValue },
    'tools/call',
    { name: toolName, arguments: args },
    10_000, // 10 s for tool execution
  );

  return result ?? {
    content: [{ type: 'text', text: 'MCP tool call failed or timed out.' }],
    isError: true,
  };
}

// ─── Lookup: given an OpenAI function name, find the connector + tool ─────────
export function resolveMcpCall(
  openAIName: string,
  bundles: ConnectorToolBundle[],
): { connector: ConnectorRow; mcpToolName: string } | null {
  for (const { connector, nameMap } of bundles) {
    const mcpToolName = nameMap.get(openAIName);
    if (mcpToolName) return { connector, mcpToolName };
  }
  return null;
}
