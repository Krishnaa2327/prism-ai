import OpenAI from 'openai';
import { OnboardingStep } from '@prisma/client';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Given the current page URL/path and user behavior context,
 * detect which onboarding step the user is trying to accomplish.
 * Returns the best-matching step ID, or null if none match.
 */
export async function detectIntent(
  page: string,
  behavior: string, // e.g. "idle_30s" | "exit_intent" | "rage_click" | "page_view"
  steps: OnboardingStep[]
): Promise<string | null> {
  if (steps.length === 0) return null;

  const stepList = steps
    .map((s) => `ID:${s.id} order:${s.order} title:"${s.title}" intent:"${s.intent}"`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 64,
    messages: [
      {
        role: 'system',
        content: `You are an intent classifier for an onboarding system.
Given a user's current page and behavior, identify which onboarding step they are on.
Respond with ONLY the step ID string, nothing else. If no step matches, respond with null.`,
      },
      {
        role: 'user',
        content: `Page: ${page}\nBehavior: ${behavior}\n\nSteps:\n${stepList}\n\nWhich step ID matches?`,
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? '';
  if (!raw || raw === 'null') return null;

  const match = steps.find((s) => s.id === raw);
  return match?.id ?? null;
}
