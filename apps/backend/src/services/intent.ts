import OpenAI from 'openai';
import { OnboardingStep } from '@prisma/client';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Given the current page URL/path and user behavior context,
 * detect which onboarding step the user is trying to accomplish.
 * Returns the best-matching step ID, or null if none match.
 *
 * Validation: if the model returns an ID that doesn't exist in the step list,
 * fall back to fuzzy matching against step titles and intents.
 */
export async function detectIntent(
  page: string,
  behavior: string,
  steps: OnboardingStep[]
): Promise<string | null> {
  if (steps.length === 0) return null;

  const stepList = steps
    .map((s) => `ID:${s.id} order:${s.order} title:"${s.title}" intent:"${s.intent}" url:"${s.targetUrl ?? ''}"`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 64,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are an intent classifier for an onboarding system.
Given a user's current page path and behavior, identify which onboarding step they are on.
Respond with ONLY the step ID string from the list. If no step matches, respond with null.
Do not explain or add any other text.`,
      },
      {
        role: 'user',
        content: `Page: ${page}\nBehavior: ${behavior}\n\nSteps:\n${stepList}\n\nWhich step ID?`,
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? '';
  if (!raw || raw === 'null') return null;

  // ── Primary: exact ID match ───────────────────────────────────────────────
  const exact = steps.find((s) => s.id === raw);
  if (exact) return exact.id;

  // ── Fallback: fuzzy match on title / intent / targetUrl ──────────────────
  // Model sometimes returns a step title instead of an ID
  const lower = raw.toLowerCase();
  const fuzzy = steps.find(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      lower.includes(s.title.toLowerCase()) ||
      (s.intent && s.intent.toLowerCase().includes(lower)) ||
      (s.targetUrl && lower.includes(new URL(s.targetUrl, 'http://x').pathname))
  );

  return fuzzy?.id ?? null;
}
