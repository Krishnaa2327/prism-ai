import OpenAI from 'openai';
import { OnboardingStep, Organization } from '@prisma/client';

import { executeApiCall, interpolate } from './apicall';
import { searchKnowledgeBase } from './knowledge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Tool definitions — what the AI can do on a step ─────────────────────────

const AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'ask_clarification',
      description:
        'Ask the user one smart clarifying question needed to complete this step. Use sparingly — at most 1-2 questions per step.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question to ask the user' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional quick-reply options (2-4 choices)',
          },
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
        'Instruct the widget to perform an action on the current page — fill a form, click a button, highlight an element, or navigate.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['fill_form', 'click', 'navigate', 'highlight'],
            description: 'The action type',
          },
          selector: {
            type: 'string',
            description: 'CSS selector for click or single-element highlight actions (e.g. "#upload-btn")',
          },
          url: {
            type: 'string',
            description: 'URL for navigate action',
          },
          fields: {
            type: 'object',
            description: 'For fill_form: map of CSS selector → value (e.g. {"#dashboard-name": "Revenue"})',
          },
          message: {
            type: 'string',
            description: 'Message to show the user explaining what the AI just did',
          },
          highlightMode: {
            type: 'string',
            enum: ['spotlight', 'beacon', 'arrow', 'multi'],
            description: 'For highlight actions — how to visually indicate the element. spotlight: dark backdrop with cutout + ring (maximum attention, use for critical actions). beacon: pulsing dot badge + tooltip (non-intrusive, use for passive hints). arrow: floating speech bubble with directional arrow + ring (use for explanatory callouts). multi: numbered rings on several elements at once (use when pointing out a sequence of things). Default: spotlight.',
          },
          highlightLabel: {
            type: 'string',
            description: 'For highlight actions — custom tooltip or callout text. Keep it short (< 40 chars).',
          },
          highlightSelectors: {
            type: 'array',
            items: { type: 'string' },
            description: 'For multi-highlight only — list of CSS selectors to highlight simultaneously.',
          },
          highlightLabels: {
            type: 'array',
            items: { type: 'string' },
            description: 'For multi-highlight only — labels for each selector (same order). Shown as numbered step names.',
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
        'Mark the current onboarding step as complete and advance to the next step. Call this when the user has successfully finished the step.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Congratulatory message to show the user',
          },
          collectedData: {
            type: 'object',
            description: 'Key-value pairs of data collected during this step',
          },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'celebrate_milestone',
      description:
        'Called when the user reaches the first-value milestone (the "aha moment"). Show celebration UI.',
      parameters: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: 'Short celebration headline' },
          insight: { type: 'string', description: 'The value/insight the user just unlocked' },
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
        'Hand the user off to a human support agent. Use when: (1) the user explicitly asks to speak to a human, (2) they are clearly frustrated and the AI cannot resolve their issue, (3) the issue is outside the scope of onboarding (billing, bugs, refunds). Do NOT use for questions you can answer.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Brief description of why escalation was triggered (shown to the support team)',
          },
          trigger: {
            type: 'string',
            enum: ['user_requested', 'agent_detected'],
            description: '"user_requested" if they asked for a human, "agent_detected" if you detected they need one',
          },
          message: {
            type: 'string',
            description: 'Empathetic message to show the user — confirm help is on the way, set expectations',
          },
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
        'Make an HTTP request to an external API endpoint — e.g. to verify a user\'s setup, create a resource, check integration status, or fetch data that will help guide the user. The full response is returned to you so you can decide what to do next.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The endpoint URL to call' },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            description: 'HTTP method',
          },
          headers: {
            type: 'object',
            description: 'Optional additional HTTP headers (e.g. Authorization)',
          },
          body: {
            type: 'object',
            description: 'Request body for POST/PUT/PATCH. Use {{variable}} to reference collectedData values.',
          },
          reason: {
            type: 'string',
            description: 'Brief description of why you are calling this endpoint',
          },
        },
        required: ['url', 'method', 'reason'],
      },
    },
  },
];

export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string }
  | { type: 'complete_step'; message: string; collectedData?: Record<string, unknown> }
  | { type: 'celebrate_milestone'; headline: string; insight: string }

  | { type: 'call_api'; url: string; method: string; reason: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string };

/**
 * The AI setup + activation agent.
 *
 * Given the current onboarding step, the user's message, and collected data so far,
 * the agent decides what to do next: ask a question, execute a page action,
 * complete the step, celebrate a milestone, or just chat.
 */
export interface PageContext {
  url: string;
  title: string;
  headings: string[];
  elements: Array<{ tag: string; selector: string; text: string; type?: string }>;
}

// Tools for the follow-up turn after call_api — excludes call_api to prevent loops
const AGENT_TOOLS_NO_API: OpenAI.Chat.ChatCompletionTool[] = AGENT_TOOLS.filter(
  (t) => t.function.name !== 'call_api'
);

export async function runAgent(opts: {
  org: Organization;
  step: OnboardingStep;
  userMessage: string;
  collectedData: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLastStep: boolean;
  pageContext?: PageContext;
  userHistoryFormatted?: string;
}): Promise<AgentAction> {
  const { org, step, userMessage, collectedData, conversationHistory, isLastStep, pageContext, userHistoryFormatted } = opts;

  const smartQuestions = (step.smartQuestions as string[]) ?? [];
  const answeredQuestions = Object.keys(collectedData);
  const unansweredQuestions = smartQuestions.filter((q) => !answeredQuestions.includes(q));

  const actionConfig = step.actionConfig as Record<string, unknown> | null;
  const hasActionConfig = actionConfig && Object.keys(actionConfig).length > 0;
  const actionHint = hasActionConfig
    ? `\nPage action config for this step (use execute_page_action with these exact values):
- type: "${step.actionType || 'highlight'}"
${actionConfig!.selector ? `- selector: "${actionConfig!.selector}"` : ''}
${actionConfig!.url ? `- url: "${actionConfig!.url}"` : ''}
${actionConfig!.fields ? `- fields: ${JSON.stringify(actionConfig!.fields)} (replace empty string values with what the user told you — use collectedData)` : ''}`
    : '';

  const isInit = userMessage === '__init__';

  // Search knowledge base for relevant context (skip on __init__ — no real user query yet)
  const kbResults = isInit ? [] : await searchKnowledgeBase(org.id, userMessage).catch(() => []);
  const kbSection = kbResults.length > 0
    ? `\nKNOWLEDGE BASE (use this to answer questions or guide the user through this step):\n${
        kbResults.map((r) => `[${r.title}]\n${r.content.slice(0, 600)}`).join('\n\n')
      }`
    : '';

  // Build a compact element map from the live page so the agent can pick real selectors
  const domSummary = pageContext && pageContext.elements.length > 0
    ? `\nLIVE PAGE ELEMENTS (use these selectors — they are real and verified on the current page):
Page: ${pageContext.title} (${pageContext.url})
${pageContext.headings.length ? `Headings: ${pageContext.headings.join(' | ')}` : ''}
Interactive elements:
${pageContext.elements.map((e) =>
  `  [${e.tag}${e.type ? `[${e.type}]` : ''}] selector="${e.selector}" label="${e.text}"`
).join('\n')}
When calling execute_page_action, ALWAYS use selectors from this list. Do not invent selectors.`
    : '';

  const systemPrompt = `You are an AI onboarding copilot inside "${org.name}". You ALWAYS call a tool — never respond with plain text.
${userHistoryFormatted ? `\n${userHistoryFormatted}\n` : ''}
CURRENT STEP: "${step.title}"
Description: ${step.description || ''}
${step.aiPrompt ? `Instructions: ${step.aiPrompt}` : ''}
${actionHint}${domSummary}${kbSection}
Collected so far: ${JSON.stringify(collectedData)}
${isLastStep ? 'FINAL STEP: call celebrate_milestone when done.' : ''}

DECISION RULES — follow in order:
1. If this is the __init__ trigger AND actionConfig has a selector/url → call execute_page_action immediately with those values.
2. If this is the __init__ trigger AND there are unanswered smart questions → call ask_clarification with the first one: ${unansweredQuestions[0] ?? 'none'}.
3. If this is the __init__ trigger AND no questions needed → call complete_step immediately.
4. If user just answered a question AND actionConfig exists → call execute_page_action right now using the actionConfig values. Do not confirm first.
5. If user just answered a question AND no actionConfig → call complete_step immediately with a short congratulation.
6. If the step is done → ${isLastStep ? 'call celebrate_milestone' : 'call complete_step'}.
7. If you need one more piece of info → call ask_clarification (max 1 question, include 2-4 options).

NEVER: chat, explain, confirm back what you're doing, or ask if the user is ready. Just act.
${org.customInstructions ?? ''}`.trim();

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversationHistory.slice(-6), // keep last 6 messages for context
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    tools: AGENT_TOOLS,
    tool_choice: 'required', // always call a tool — never plain text
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });

  const msg = response.choices[0].message;

  // ─── Parse tool calls ─────────────────────────────────────────────────────
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const call = msg.tool_calls[0];
    const name = call.function.name;
    const input = JSON.parse(call.function.arguments) as Record<string, unknown>;

    if (name === 'ask_clarification') {
      return {
        type: 'ask_clarification',
        question: input.question as string,
        options: input.options as string[] | undefined,
      };
    }

    if (name === 'execute_page_action') {
      const actionType = input.type as string;
      // Build payload from flat fields (GPT-4o doesn't nest into a payload object)
      let payload: Record<string, unknown>;
      if (actionType === 'fill_form') {
        payload = { fields: input.fields ?? {} };
      } else if (actionType === 'navigate') {
        payload = { url: input.url ?? '' };
      } else if (actionType === 'highlight') {
        payload = {
          selector: input.selector ?? '',
          mode: input.highlightMode ?? 'spotlight',
          ...(input.highlightLabel   ? { label: input.highlightLabel } : {}),
          ...(input.highlightSelectors ? { selectors: input.highlightSelectors } : {}),
          ...(input.highlightLabels    ? { labels: input.highlightLabels } : {}),
        };
      } else {
        // click
        payload = { selector: input.selector ?? '' };
      }
      return {
        type: 'execute_page_action',
        actionType,
        payload,
        message: input.message as string,
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

    if (name === 'call_api') {
      // Interpolate {{variable}} placeholders in body using collectedData
      const rawBody = input.body as Record<string, unknown> | undefined;
      const resolvedBody = rawBody
        ? interpolate(rawBody, collectedData) as Record<string, unknown>
        : undefined;

      const apiResult = await executeApiCall({
        url: input.url as string,
        method: (input.method as string ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: input.headers as Record<string, string> | undefined,
        body: resolvedBody,
      });

      // Feed the API result back to the model and get a final action
      // Use AGENT_TOOLS_NO_API to prevent infinite call_api loops
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

      const followUp = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 512,
        tools: AGENT_TOOLS_NO_API,
        tool_choice: 'required',
        messages: [{ role: 'system', content: systemPrompt }, ...followUpMessages],
      });

      const followUpMsg = followUp.choices[0].message;
      if (followUpMsg.tool_calls && followUpMsg.tool_calls.length > 0) {
        const fc = followUpMsg.tool_calls[0];
        const fname = fc.function.name;
        const finput = JSON.parse(fc.function.arguments) as Record<string, unknown>;

        if (fname === 'ask_clarification') {
          return { type: 'ask_clarification', question: finput.question as string, options: finput.options as string[] | undefined };
        }
        if (fname === 'execute_page_action') {
          const at = finput.type as string;
          let fp: Record<string, unknown>;
          if (at === 'fill_form') {
            fp = { fields: finput.fields ?? {} };
          } else if (at === 'navigate') {
            fp = { url: finput.url ?? '' };
          } else if (at === 'highlight') {
            fp = {
              selector: finput.selector ?? '',
              mode: finput.highlightMode ?? 'spotlight',
              ...(finput.highlightLabel     ? { label: finput.highlightLabel } : {}),
              ...(finput.highlightSelectors ? { selectors: finput.highlightSelectors } : {}),
              ...(finput.highlightLabels    ? { labels: finput.highlightLabels } : {}),
            };
          } else {
            fp = { selector: finput.selector ?? '' };
          }
          return { type: 'execute_page_action', actionType: at, payload: fp, message: finput.message as string };
        }
        if (fname === 'complete_step') {
          return { type: 'complete_step', message: finput.message as string, collectedData: finput.collectedData as Record<string, unknown> | undefined };
        }
        if (fname === 'celebrate_milestone') {
          return { type: 'celebrate_milestone', headline: finput.headline as string, insight: finput.insight as string };
        }

      }

      const fallback = followUpMsg.content ?? 'API call completed.';
      return { type: 'chat', content: fallback };
    }
  }

  // ─── Fallback: plain text response ───────────────────────────────────────
  const content = msg.content ?? "Let me help you with that step.";
  return { type: 'chat', content };
}
