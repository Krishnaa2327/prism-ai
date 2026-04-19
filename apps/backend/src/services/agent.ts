import OpenAI from 'openai';
import { OnboardingStep, Organization } from '@prisma/client';

import { executeApiCall, interpolate } from './apicall';
import { assertPublicUrl } from '../lib/ipGuard';
import { searchKnowledgeBase } from './knowledge';
import { loadMcpTools, toOpenAITools, callMcpTool, resolveMcpCall, ConnectorToolBundle } from './mcp';
import { logger, withRetry } from '../lib/logger';

let _openai: OpenAI | null = null;
const openai = () => { if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); return _openai; };

// ─── Tool definitions ─────────────────────────────────────────────────────────

const AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'ask_clarification',
      description:
        'Ask the user ONE focused question to collect information needed to proceed. Include 2-4 options when possible. Use at most once per turn.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
        },
        required: ['question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_page_action',
      description:
        'Perform an action on the current page. Use CSS selectors exclusively from the LIVE PAGE ELEMENTS list — never invent selectors.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['fill_form', 'click', 'navigate', 'highlight'],
          },
          selector: { type: 'string', description: 'CSS selector for click or highlight (must be from live page elements)' },
          url:      { type: 'string', description: 'URL for navigate action' },
          fields: {
            type: 'object',
            description: 'fill_form: { "CSS selector": "value" } — substitute user-provided values from collectedData',
          },
          message: { type: 'string', description: 'Short confirmation shown to the user (≤12 words)' },
          highlightMode: { type: 'string', enum: ['spotlight', 'beacon', 'arrow', 'multi'] },
          highlightLabel: { type: 'string' },
          highlightSelectors: { type: 'array', items: { type: 'string' } },
          highlightLabels: { type: 'array', items: { type: 'string' } },
          shouldVerify: {
            type: 'boolean',
            description: 'Set true for fill_form/click so the widget sends a __verify__ follow-up after execution.',
          },
        },
        required: ['type', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_step',
      description:
        'Mark this step complete and advance. Only call when the user has actually finished the step — not speculatively.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          collectedData: { type: 'object' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'celebrate_milestone',
      description: 'User reached the first-value / aha-moment milestone.',
      parameters: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          insight:  { type: 'string' },
        },
        required: ['headline', 'insight'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        'Hand off to a human agent. Only when: user explicitly asks, repeated failure to help, or billing/bug/refund issue.',
      parameters: {
        type: 'object',
        properties: {
          reason:  { type: 'string' },
          trigger: { type: 'string', enum: ['user_requested', 'agent_detected'] },
          message: { type: 'string' },
        },
        required: ['reason', 'trigger', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'call_api',
      description:
        'Make an HTTP request to verify a setup, create a resource, or fetch data. Response is returned to you for a follow-up action.',
      parameters: {
        type: 'object',
        properties: {
          url:     { type: 'string' },
          method:  { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          headers: { type: 'object' },
          body:    { type: 'object', description: 'Use {{variable}} to reference collectedData values' },
          reason:  { type: 'string' },
        },
        required: ['url', 'method', 'reason'],
      },
    },
  },
];

const AGENT_TOOLS_NO_API = AGENT_TOOLS.filter((t) => t.function.name !== 'call_api');

export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string; shouldVerify?: boolean }
  | { type: 'complete_step'; message: string; collectedData?: Record<string, unknown> }
  | { type: 'celebrate_milestone'; headline: string; insight: string }
  | { type: 'call_api'; url: string; method: string; reason: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string }
  | { type: 'goal_complete'; summary: string }
  | { type: 'degrade_to_manual'; instruction: string; reason: string };

export interface PageContext {
  url: string;
  title: string;
  headings: string[];
  elements: Array<{ tag: string; selector: string; text: string; type?: string; value?: string }>;
  semanticSummary?: string;
}

// ─── DOM text sanitizer — strips newlines/control chars to prevent prompt injection ──
function sanitizeDomText(text: string): string {
  return text.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E]/g, '').slice(0, 120);
}

// ─── Model routing ────────────────────────────────────────────────────────────
function selectModel(opts: {
  isInit: boolean;
  isVerify: boolean;
  hasActionConfig: boolean;
  hasUnansweredQuestions: boolean;
  hasKbResults: boolean;
}): string {
  const { isInit, isVerify, hasActionConfig, hasUnansweredQuestions, hasKbResults } = opts;

  if (isVerify) return 'gpt-4o-mini';
  if (isInit && hasActionConfig && !hasUnansweredQuestions) return 'gpt-4o-mini';
  if (hasKbResults) return 'gpt-4o';
  return 'gpt-4o';
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(opts: {
  orgName: string;
  customInstructions?: string | null;
  step: OnboardingStep;
  collectedData: Record<string, unknown>;
  isLastStep: boolean;
  userMetadata?: Record<string, unknown>;
  userHistoryFormatted?: string;
  domSummary: string;
  kbSection: string;
  mcpSection: string;
  isInit: boolean;
  isVerify: boolean;
  unansweredQuestions: string[];
  actionHint: string;
  detectedLang?: string;
}): string {
  const {
    orgName, customInstructions, step, collectedData, isLastStep,
    userMetadata, userHistoryFormatted, domSummary, kbSection, mcpSection,
    isInit, isVerify, unansweredQuestions, actionHint, detectedLang,
  } = opts;

  const metaKeys = userMetadata ? Object.keys(userMetadata) : [];
  const userProfile = metaKeys.length > 0
    ? `USER PROFILE: ${JSON.stringify(userMetadata)} — match your language and depth to this user's context.`
    : '';

  const historySection = userHistoryFormatted ? `\n${userHistoryFormatted}\n` : '';

  const verifyInstructions = isVerify
    ? `
VERIFICATION TURN: The widget just executed a page action and is now reporting the updated DOM.
Examine LIVE PAGE ELEMENTS to check if the action succeeded (fields have values, button was clicked, etc.).
- If success → call complete_step immediately.
- If failed → call execute_page_action again with the corrected selector or a slightly adjusted approach.
- Do not ask questions during verification.`
    : '';

  const initInstructions = isInit && !isVerify
    ? `
INIT TURN: The user just arrived at this step. Do not greet or explain — act immediately:
1. If actionConfig has a selector/url → call execute_page_action with those values now (set shouldVerify: true for fill_form/click).
2. If there are unanswered required questions → call ask_clarification with the first one: "${unansweredQuestions[0] ?? 'none'}".
3. If nothing is needed → call complete_step now.`
    : '';

  const generalInstructions = !isInit && !isVerify
    ? `
RESPONSE TURN: The user has replied or taken an action.
- If their answer fills a required field AND actionConfig exists → call execute_page_action immediately (set shouldVerify: true for fill_form/click). Do not confirm first.
- If their answer fills the last required field AND no action needed → call complete_step immediately.
- If more info is needed → call ask_clarification (ONE question, 2-4 options).
- If step is fully done → ${isLastStep ? 'call celebrate_milestone' : 'call complete_step'}.`
    : '';

  const langInstruction = detectedLang === 'hi'
    ? '\nLANGUAGE: Always respond in Hindi (Devanagari script). Keep technical terms in English.'
    : detectedLang === 'hinglish'
    ? '\nLANGUAGE: Respond in Hinglish — natural Hindi+English mix in Roman script. Example: "Yahan click karein, phir apna naam enter karein."'
    : '';

  return `You are Prism, an AI onboarding guide inside "${orgName}". You ALWAYS call exactly one tool — never respond with plain text.
${userProfile}${historySection}
STEP: "${step.title}"
Goal: ${step.description || step.title}
${step.aiPrompt ? `Instructions: ${step.aiPrompt}` : ''}
${actionHint}${domSummary}${kbSection}${mcpSection}
Collected so far: ${JSON.stringify(collectedData)}
${isLastStep ? 'FINAL STEP: use celebrate_milestone when done (not complete_step).' : ''}
${verifyInstructions}${initInstructions}${generalInstructions}

ABSOLUTE RULES:
- Only use selectors that appear verbatim in LIVE PAGE ELEMENTS.
- Never confirm, summarise, or ask "are you ready?".
- Never call complete_step speculatively — only when the user has provably finished.
- Keep all user-facing text under 25 words.
${customInstructions ?? ''}${langInstruction}`.trim();
}

// ─── Parse tool call → AgentAction ───────────────────────────────────────────
function parseToolCall(name: string, input: Record<string, unknown>): AgentAction | null {
  if (name === 'ask_clarification') {
    return {
      type: 'ask_clarification',
      question: input.question as string,
      options: input.options as string[] | undefined,
    };
  }

  if (name === 'execute_page_action') {
    const actionType = input.type as string;
    let payload: Record<string, unknown>;

    if (actionType === 'fill_form') {
      payload = { fields: input.fields ?? {} };
    } else if (actionType === 'navigate') {
      payload = { url: input.url ?? '' };
    } else if (actionType === 'highlight') {
      payload = {
        selector: input.selector ?? '',
        mode: input.highlightMode ?? 'spotlight',
        ...(input.highlightLabel    ? { label: input.highlightLabel } : {}),
        ...(input.highlightSelectors ? { selectors: input.highlightSelectors } : {}),
        ...(input.highlightLabels    ? { labels: input.highlightLabels } : {}),
      };
    } else {
      payload = { selector: input.selector ?? '' };
    }

    return {
      type: 'execute_page_action',
      actionType,
      payload,
      message: input.message as string,
      shouldVerify: (input.shouldVerify as boolean | undefined) ?? false,
    };
  }

  if (name === 'complete_step') {
    return {
      type: 'complete_step',
      message: input.message as string,
      collectedData: input.collectedData as Record<string, unknown> | undefined,
    };
  }

  if (name === 'celebrate_milestone') {
    return {
      type: 'celebrate_milestone',
      headline: input.headline as string,
      insight: input.insight as string,
    };
  }

  if (name === 'escalate_to_human') {
    return {
      type: 'escalate_to_human',
      reason: input.reason as string,
      trigger: input.trigger as string,
      message: input.message as string,
    };
  }

  if (name === 'goal_complete') {
    return { type: 'goal_complete', summary: input.summary as string };
  }

  if (name === 'degrade_to_manual') {
    return {
      type: 'degrade_to_manual',
      instruction: input.instruction as string,
      reason: input.reason as string,
    };
  }

  return null;
}

// ─── Streaming text extractor ─────────────────────────────────────────────────
// Extracts the primary text field from a partially-built JSON argument string
// so we can stream words to the client before the full tool call is done.
function extractStreamingText(argsSoFar: string, toolName: string): string {
  let fieldName: string;
  if (toolName === 'ask_clarification') fieldName = 'question';
  else if (toolName === 'chat') fieldName = 'content';
  else if (toolName === 'celebrate_milestone') fieldName = 'headline';
  else return '';

  const key = `"${fieldName}":`;
  const keyIdx = argsSoFar.indexOf(key);
  if (keyIdx === -1) return '';

  // Find opening quote of the value
  let valueStart = argsSoFar.indexOf('"', keyIdx + key.length);
  if (valueStart === -1) return '';
  valueStart++; // skip the opening quote

  // Read until unescaped closing quote (or end of buffer)
  let text = '';
  let i = valueStart;
  while (i < argsSoFar.length) {
    const c = argsSoFar[i];
    if (c === '\\' && i + 1 < argsSoFar.length) {
      const next = argsSoFar[i + 1];
      if (next === '"') text += '"';
      else if (next === 'n') text += '\n';
      else if (next === 't') text += '\t';
      else text += next;
      i += 2;
    } else if (c === '"') {
      break;
    } else {
      text += c;
      i++;
    }
  }
  return text;
}

// ─── Shared agent setup (input processing before calling OpenAI) ───────────────
async function prepareAgentCall(opts: {
  org: Organization;
  step: OnboardingStep;
  userMessage: string;
  collectedData: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLastStep: boolean;
  pageContext?: PageContext;
  userHistoryFormatted?: string;
  userMetadata?: Record<string, unknown>;
  detectedLang?: string;
}) {
  const {
    org, step, userMessage, collectedData, conversationHistory,
    isLastStep, pageContext, userHistoryFormatted, userMetadata, detectedLang,
  } = opts;

  const isInit   = userMessage === '__init__';
  const isVerify = userMessage === '__verify__';

  const smartQuestions      = (step.smartQuestions as string[]) ?? [];
  const answeredQuestions   = Object.keys(collectedData);
  const unansweredQuestions = smartQuestions.filter((q) => !answeredQuestions.includes(q));

  const actionConfig    = step.actionConfig as Record<string, unknown> | null;
  const hasActionConfig = !!(actionConfig && Object.keys(actionConfig).length > 0);

  const actionHint = hasActionConfig
    ? `\nPRE-CONFIGURED ACTION (use these exact values with execute_page_action):
- type: "${step.actionType || 'highlight'}"
${actionConfig!.selector ? `- selector: "${actionConfig!.selector}"` : ''}
${actionConfig!.url      ? `- url: "${actionConfig!.url}"` : ''}
${actionConfig!.fields   ? `- fields: ${JSON.stringify(actionConfig!.fields)} (replace empty strings with values from collectedData or user answer)` : ''}\n`
    : '';

  const domSummary = pageContext
    ? pageContext.semanticSummary
      ? `\nPAGE SEMANTIC SUMMARY:\n${pageContext.semanticSummary}\n\nLIVE PAGE ELEMENTS (verified selectors — only use these):\nPage: ${sanitizeDomText(pageContext.title)} (${pageContext.url})\n${pageContext.headings.length ? `Headings: ${pageContext.headings.map(sanitizeDomText).join(' | ')}` : ''}\nInteractive elements:\n${pageContext.elements.slice(0,30).map((e) => `  [${e.tag}${e.type ? `[${e.type}]` : ''}] selector="${sanitizeDomText(e.selector)}" label="${sanitizeDomText(e.text)}"${e.value ? ` value="${sanitizeDomText(e.value)}"` : ''}`).join('\n')}\n`
      : pageContext.elements.length > 0
        ? `\nLIVE PAGE ELEMENTS (verified selectors — only use these):\nPage: ${sanitizeDomText(pageContext.title)} (${pageContext.url})\n${pageContext.headings.length ? `Headings: ${pageContext.headings.map(sanitizeDomText).join(' | ')}` : ''}\nInteractive elements:\n${pageContext.elements.map((e) => `  [${e.tag}${e.type ? `[${e.type}]` : ''}] selector="${sanitizeDomText(e.selector)}" label="${sanitizeDomText(e.text)}"${e.value ? ` value="${sanitizeDomText(e.value)}"` : ''}`).join('\n')}\n`
        : ''
    : '';

  // Skip KB search on init/verify turns — race with 1.5 s timeout
  const kbResults = (isInit || isVerify)
    ? []
    : await Promise.race([
        searchKnowledgeBase(org.id, userMessage).catch(() => []),
        new Promise<Awaited<ReturnType<typeof searchKnowledgeBase>>>((resolve) =>
          setTimeout(() => resolve([]), 1500)
        ),
      ]);

  const kbSection = kbResults.length > 0
    ? `\nKNOWLEDGE BASE:\n${kbResults.map((r) => `[${r.title}]\n${r.content.slice(0, 500)}`).join('\n\n')}\n`
    : '';

  // ── MCP tools ────────────────────────────────────────────────────────────────
  // Load enabled connectors and their tool lists in parallel with the KB search.
  // Skip on init/verify turns (no real user query to dispatch against).
  const mcpBundles: ConnectorToolBundle[] = (isInit || isVerify)
    ? []
    : await loadMcpTools(org.id).catch(() => []);

  const mcpOAITools = toOpenAITools(mcpBundles);

  const mcpSection = mcpBundles.length > 0
    ? `\nMCP TOOLS AVAILABLE: You have ${mcpOAITools.length} external tool(s) from ${mcpBundles.length} connector(s). Use them when they help complete this step.\n`
    : '';

  const model = selectModel({
    isInit,
    isVerify,
    hasActionConfig,
    hasUnansweredQuestions: unansweredQuestions.length > 0,
    hasKbResults: kbResults.length > 0,
  });

  const systemPrompt = buildSystemPrompt({
    orgName: org.name,
    customInstructions: org.customInstructions,
    step,
    collectedData,
    isLastStep,
    userMetadata,
    userHistoryFormatted,
    domSummary,
    kbSection,
    mcpSection,
    isInit,
    isVerify,
    unansweredQuestions,
    actionHint,
    detectedLang,
  });

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage },
  ];

  // ── Guardrails: filter tools by step.allowedActions ─────────────────────────
  const allowedActions = (step.allowedActions as string[] | undefined) ?? [];
  let baseTools: OpenAI.Chat.ChatCompletionTool[];
  if (allowedActions.length === 0) {
    baseTools = AGENT_TOOLS;
  } else {
    baseTools = AGENT_TOOLS.reduce<OpenAI.Chat.ChatCompletionTool[]>((acc, tool) => {
      if (tool.function.name !== 'execute_page_action') {
        acc.push(tool);
        return acc;
      }
      const params = tool.function.parameters as Record<string, unknown>;
      const props  = params.properties as Record<string, { type: string; enum?: string[] }>;
      const filteredEnum = (props.type.enum ?? []).filter((t) => allowedActions.includes(t));
      if (filteredEnum.length === 0) return acc;
      acc.push({
        ...tool,
        function: {
          ...tool.function,
          parameters: {
            ...params,
            properties: { ...props, type: { ...props.type, enum: filteredEnum } },
          },
        },
      });
      return acc;
    }, []);
  }

  // Append MCP tools after built-in tools
  const toolsForStep = [...baseTools, ...mcpOAITools];

  return { model, systemPrompt, messages, toolsForStep, mcpBundles, collectedData, isInit, isVerify };
}

// ─── Handle MCP tool call + follow-up turn ────────────────────────────────────
async function handleMcpCall(
  call: OpenAI.Chat.ChatCompletionMessageToolCall,
  mcpBundles: ConnectorToolBundle[],
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  toolsForStep: OpenAI.Chat.ChatCompletionTool[],
  model: string,
): Promise<AgentAction> {
  const resolved = resolveMcpCall(call.function.name, mcpBundles);
  if (!resolved) {
    return { type: 'chat', content: 'Could not resolve MCP tool call.' };
  }

  const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
  const result = await callMcpTool(resolved.connector, resolved.mcpToolName, args);

  const resultText = result.content.map((c) => c.text).join('\n');

  const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...messages,
    { role: 'assistant' as const, content: null, tool_calls: [call] },
    { role: 'tool' as const, tool_call_id: call.id, content: resultText },
  ];

  const followUp = await withRetry(
    () => openai().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0,
      // Remove MCP tools from follow-up to avoid infinite loops
      tools: toolsForStep.filter((t) => !t.function.name.startsWith('mcp__')),
      tool_choice: 'required',
      messages: [{ role: 'system', content: systemPrompt }, ...followUpMessages],
    }),
    { retries: 2, delayMs: 800, label: 'agent.mcp_followup' }
  );

  const fc = followUp.choices[0].message.tool_calls?.[0];
  if (fc) {
    const action = parseToolCall(fc.function.name, JSON.parse(fc.function.arguments));
    if (action) return action;
  }

  return { type: 'chat', content: followUp.choices[0].message.content ?? 'Tool call completed.' };
}

// ─── Core agent (non-streaming) ───────────────────────────────────────────────

export async function runAgent(opts: {
  org: Organization;
  step: OnboardingStep;
  userMessage: string;
  collectedData: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLastStep: boolean;
  pageContext?: PageContext;
  userHistoryFormatted?: string;
  userMetadata?: Record<string, unknown>;
  detectedLang?: string;
}): Promise<AgentAction> {
  const { model, systemPrompt, messages, toolsForStep, mcpBundles, collectedData } = await prepareAgentCall(opts);

  const response = await withRetry(
    () => openai().chat.completions.create({
      model,
      max_tokens: model === 'gpt-4o-mini' ? 512 : 1500,
      temperature: 0,
      tools: toolsForStep,
      tool_choice: 'required',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
    { retries: 2, delayMs: 800, label: `agent.openai org=${opts.org.id}` }
  );

  const msg = response.choices[0].message;
  logger.agentAction(opts.org.id, 'n/a', msg.tool_calls?.[0]?.function?.name ?? 'none', {
    stepId: opts.step.id,
    model,
    tokens: response.usage?.total_tokens,
  });

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const call  = msg.tool_calls[0];
    const name  = call.function.name;
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(call.function.arguments) as Record<string, unknown>;
    } catch {
      return { type: 'chat', content: 'Let me help you with that.' };
    }

    // ── MCP tool call ──────────────────────────────────────────────────────────
    if (name.startsWith('mcp__')) {
      return handleMcpCall(call, mcpBundles, systemPrompt, messages, toolsForStep, model);
    }

    // ── call_api tool call ─────────────────────────────────────────────────────
    if (name === 'call_api') {
      try { await assertPublicUrl(input.url as string); }
      catch (err) { return { type: 'chat', content: `Cannot reach that URL: ${(err as Error).message}` }; }

      const rawBody      = input.body as Record<string, unknown> | undefined;
      const resolvedBody = rawBody ? interpolate(rawBody, collectedData) as Record<string, unknown> : undefined;

      const apiResult = await executeApiCall({
        url:     input.url as string,
        method:  (input.method as string ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: input.headers as Record<string, string> | undefined,
        body:    resolvedBody,
      });

      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        { role: 'assistant' as const, content: null, tool_calls: [call] },
        {
          role: 'tool' as const,
          tool_call_id: call.id,
          content: JSON.stringify({
            ok: apiResult.ok,
            status: apiResult.status,
            data: apiResult.data,
            ...(apiResult.error ? { error: apiResult.error } : {}),
          }),
        },
      ];

      const followUp = await withRetry(
        () => openai().chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 1500,
          temperature: 0,
          tools: toolsForStep.filter((t) => t.function.name !== 'call_api'),
          tool_choice: 'required',
          messages: [{ role: 'system', content: systemPrompt }, ...followUpMessages],
        }),
        { retries: 2, delayMs: 800, label: `agent.call_api_followup org=${opts.org.id}` }
      );

      const fc = followUp.choices[0].message.tool_calls?.[0];
      if (fc) {
        const action = parseToolCall(fc.function.name, JSON.parse(fc.function.arguments));
        if (action) return action;
      }

      return { type: 'chat', content: followUp.choices[0].message.content ?? 'API call completed.' };
    }

    const action = parseToolCall(name, input);
    if (action) return action;
  }

  return { type: 'chat', content: msg.content ?? 'Let me help you with that.' };
}

// ─── Streaming agent — yields word tokens then the final action ───────────────
// Uses GPT-4o native streaming. Words are extracted from the JSON argument
// string as it builds so the user sees text appear immediately rather than
// waiting for the full tool call to complete.
//
// Yields: { type: 'word', word: string } | { type: 'action', action: AgentAction }

export async function* runAgentStream(
  opts: Parameters<typeof runAgent>[0],
): AsyncGenerator<{ type: 'word'; word: string } | { type: 'action'; action: AgentAction }> {
  const { model, systemPrompt, messages, toolsForStep, mcpBundles, collectedData } = await prepareAgentCall(opts);

  // call_api and mcp__ calls need a follow-up turn — fall back to non-streaming
  // for those to keep the code paths simple. They're rare and fast.
  const stream = await openai().chat.completions.create({
    model,
    max_tokens: model === 'gpt-4o-mini' ? 512 : 1500,
    temperature: 0,
    tools: toolsForStep,
    tool_choice: 'required',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  });

  let toolName = '';
  let argsSoFar = '';
  let yieldedTextLength = 0;
  // Accumulate the final message ourselves since there's no .finalMessage()
  let finishReason = '';
  const accToolCalls: Array<{
    id: string;
    function: { name: string; arguments: string };
    type: 'function';
  }> = [];

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (!choice) continue;
    if (choice.finish_reason) finishReason = choice.finish_reason;

    const delta = choice.delta;
    if (!delta?.tool_calls?.[0]) continue;

    const tc = delta.tool_calls[0];
    const idx = tc.index ?? 0;

    // Accumulate tool call
    if (!accToolCalls[idx]) {
      accToolCalls[idx] = { id: tc.id ?? '', function: { name: '', arguments: '' }, type: 'function' };
    }
    if (tc.id) accToolCalls[idx].id = tc.id;
    if (tc.function?.name) accToolCalls[idx].function.name += tc.function.name;
    if (tc.function?.arguments) accToolCalls[idx].function.arguments += tc.function.arguments;

    // Track current tool for text extraction
    if (tc.function?.name) toolName += tc.function.name;
    if (tc.function?.arguments) {
      argsSoFar += tc.function.arguments;

      // Stream words from the primary text field as the JSON builds
      const currentText = extractStreamingText(argsSoFar, toolName);
      if (currentText.length > yieldedTextLength) {
        const newChars = currentText.slice(yieldedTextLength);
        yieldedTextLength = currentText.length;

        // Split on spaces — yield complete words only
        const words = newChars.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (!word) continue;
          // Last segment may be mid-word — hold it for the next chunk
          if (i === words.length - 1 && !newChars.endsWith(' ')) {
            yieldedTextLength -= word.length; // re-wind so we re-stream it
            break;
          }
          yield { type: 'word', word: word + ' ' };
        }
      }
    }
  }

  // Build action from accumulated streaming state
  const call = accToolCalls[0];

  logger.agentAction(opts.org.id, 'n/a', call?.function?.name ?? 'none', {
    stepId: opts.step.id,
    model,
    streaming: true,
  });

  if (!call) {
    yield { type: 'action', action: { type: 'chat', content: '' } };
    return;
  }

  const name  = call.function.name;
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(call.function.arguments) as Record<string, unknown>;
  } catch {
    yield { type: 'action', action: { type: 'chat', content: 'Let me help you with that.' } };
    return;
  }

  // MCP and call_api follow-up turns — resolve synchronously now
  if (name.startsWith('mcp__')) {
    const action = await handleMcpCall(
      call as OpenAI.Chat.ChatCompletionMessageToolCall,
      mcpBundles, systemPrompt, messages, toolsForStep, model,
    );
    yield { type: 'action', action };
    return;
  }

  if (name === 'call_api') {
    try { await assertPublicUrl(input.url as string); }
    catch (err) { yield { type: 'action', action: { type: 'chat', content: `Cannot reach that URL: ${(err as Error).message}` } }; return; }

    const rawBody      = input.body as Record<string, unknown> | undefined;
    const resolvedBody = rawBody ? interpolate(rawBody, collectedData) as Record<string, unknown> : undefined;

    const apiResult = await executeApiCall({
      url:     input.url as string,
      method:  (input.method as string ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      headers: input.headers as Record<string, string> | undefined,
      body:    resolvedBody,
    });

    const oaiCall = call as OpenAI.Chat.ChatCompletionMessageToolCall;
    const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...messages,
      { role: 'assistant' as const, content: null, tool_calls: [oaiCall] },
      {
        role: 'tool' as const,
        tool_call_id: oaiCall.id,
        content: JSON.stringify({ ok: apiResult.ok, status: apiResult.status, data: apiResult.data }),
      },
    ];

    const followUp = await withRetry(
      () => openai().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        temperature: 0,
        tools: toolsForStep.filter((t) => t.function.name !== 'call_api'),
        tool_choice: 'required',
        messages: [{ role: 'system', content: systemPrompt }, ...followUpMessages],
      }),
      { retries: 2, delayMs: 800, label: `agent.call_api_followup org=${opts.org.id}` }
    );

    const fc = followUp.choices[0].message.tool_calls?.[0];
    const action = fc
      ? (parseToolCall(fc.function.name, JSON.parse(fc.function.arguments)) ?? { type: 'chat' as const, content: '' })
      : { type: 'chat' as const, content: followUp.choices[0].message.content ?? 'API call completed.' };

    yield { type: 'action', action };
    return;
  }

  const action = parseToolCall(name, input);
  yield { type: 'action', action: action ?? { type: 'chat', content: 'Let me help you with that.' } };
}

// ─── Goal mode ────────────────────────────────────────────────────────────────

export interface GoalTurn {
  role: 'user' | 'assistant' | 'observe';
  content: string;
}

export async function runAgentGoal(opts: {
  org: Organization;
  goal: string;
  pageContext: PageContext;
  turnHistory: GoalTurn[];
  sessionId: string;
}): Promise<AgentAction> {
  const { org, goal, pageContext, turnHistory } = opts;

  const goalCompleteTool: OpenAI.Chat.ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'goal_complete',
      description: 'Call this when the user goal is fully achieved. Summarize what was accomplished.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'What was accomplished, under 20 words' },
        },
        required: ['summary'],
      },
    },
  };

  // Build domSummary the same way as prepareAgentCall
  const domSummary = pageContext
    ? pageContext.semanticSummary
      ? `\nPAGE SEMANTIC SUMMARY:\n${pageContext.semanticSummary}\n\nLIVE PAGE ELEMENTS (verified selectors — only use these):\nPage: ${sanitizeDomText(pageContext.title)} (${pageContext.url})\n${pageContext.headings.length ? `Headings: ${pageContext.headings.map(sanitizeDomText).join(' | ')}` : ''}\nInteractive elements:\n${pageContext.elements.slice(0,30).map((e) => `  [${e.tag}${e.type ? `[${e.type}]` : ''}] selector="${sanitizeDomText(e.selector)}" label="${sanitizeDomText(e.text)}"${e.value ? ` value="${sanitizeDomText(e.value)}"` : ''}`).join('\n')}\n`
      : pageContext.elements.length > 0
        ? `\nLIVE PAGE ELEMENTS (verified selectors — only use these):\nPage: ${sanitizeDomText(pageContext.title)} (${pageContext.url})\n${pageContext.headings.length ? `Headings: ${pageContext.headings.map(sanitizeDomText).join(' | ')}` : ''}\nInteractive elements:\n${pageContext.elements.map((e) => `  [${e.tag}${e.type ? `[${e.type}]` : ''}] selector="${sanitizeDomText(e.selector)}" label="${sanitizeDomText(e.text)}"${e.value ? ` value="${sanitizeDomText(e.value)}"` : ''}`).join('\n')}\n`
        : ''
    : '';

  const historyText = turnHistory.length === 0
    ? 'None yet.'
    : turnHistory.map((t, i) => `Turn ${i + 1} [${t.role}]: ${t.content}`).join('\n');

  const systemPrompt = `You are Prism, an AI agent inside "${org.name}".

GOAL: ${goal}

TURN HISTORY (what you have done so far):
${historyText}

CURRENT PAGE:
${domSummary}

You must look at the current page and decide the single best next action to make progress toward the goal.

RULES:
- Call goal_complete ONLY when the goal is provably achieved based on what you can see on the page
- Call ask_clarification ONLY when you genuinely cannot proceed without user input — one question max
- Call escalate_to_human ONLY if you are completely stuck after multiple attempts
- Only use selectors that appear verbatim in LIVE PAGE ELEMENTS
- Keep all user-facing text under 25 words
- Never repeat an action that already failed — try a different approach
- Do not call complete_step or celebrate_milestone in goal mode — use goal_complete instead

${org.customInstructions ?? ''}`.trim();

  const degradeToManualTool: OpenAI.Chat.ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'degrade_to_manual',
      description:
        'When you cannot complete an action after multiple attempts, produce a precise manual instruction for the user. Do NOT escalate — instruct. Use specific visual landmarks: color, position, label text.',
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'Exact step-by-step manual instruction, e.g. "Click the blue Save button in the top-right of the Payroll Settings page"',
          },
          reason: {
            type: 'string',
            description: 'One sentence explaining why automation failed, e.g. "The page element changed since this flow was configured."',
          },
        },
        required: ['instruction', 'reason'],
      },
    },
  };

  // Filter out call_api (too risky in autonomous mode)
  const tools = [...AGENT_TOOLS, goalCompleteTool, degradeToManualTool].filter((t) => t.function.name !== 'call_api');

  const response = await withRetry(
    () => openai().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0,
      tools,
      tool_choice: 'required',
      messages: [{ role: 'system', content: systemPrompt }],
    }),
    { retries: 2, delayMs: 800, label: `agent.goal org=${org.id}` }
  );

  const msg = response.choices[0].message;
  logger.agentAction(org.id, opts.sessionId, msg.tool_calls?.[0]?.function?.name ?? 'none', {
    goalMode: true,
    model: 'gpt-4o',
    tokens: response.usage?.total_tokens,
  });

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const call = msg.tool_calls[0];
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(call.function.arguments) as Record<string, unknown>;
    } catch {
      return { type: 'chat', content: 'Let me help you with that.' };
    }

    const action = parseToolCall(call.function.name, input);
    if (action) return action;
  }

  return { type: 'chat', content: msg.content ?? 'Let me help you with that.' };
}

// ─── Safe wrapper ─────────────────────────────────────────────────────────────

export async function runAgentSafe(
  opts: Parameters<typeof runAgent>[0] & { sessionId?: string }
): Promise<AgentAction> {
  try {
    return await runAgent(opts);
  } catch (err) {
    logger.agentError(opts.org.id, opts.sessionId ?? 'unknown', err, {
      stepId: opts.step.id,
      fallback: true,
    });

    const fallbackText = opts.step.description
      ? `Here's how to do this step manually:\n\n${opts.step.description}`
      : `I'm having trouble. Please try: ${opts.step.title}`;

    return {
      type: 'ask_clarification',
      question: fallbackText,
      options: ['Got it, continue', 'I need more help'],
    };
  }
}
