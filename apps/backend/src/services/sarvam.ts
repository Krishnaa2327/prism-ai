// ─── Sarvam AI — India multilingual layer ─────────────────────────────────────
// Handles translation, language detection, and STT/TTS for Indian languages.
// API key: SARVAM_API_KEY  |  Docs: https://docs.sarvam.ai

const SARVAM_BASE = 'https://api.sarvam.ai';
const SARVAM_KEY  = process.env.SARVAM_API_KEY;

export const SARVAM_LANGUAGES: Record<string, string> = {
  en:       'en-IN',
  hi:       'hi-IN',
  hinglish: 'hi-IN',
  bn:       'bn-IN',
  ta:       'ta-IN',
  te:       'te-IN',
  mr:       'mr-IN',
  gu:       'gu-IN',
  kn:       'kn-IN',
  ml:       'ml-IN',
  pa:       'pa-IN',
};

export function isSarvamEnabled(): boolean { return !!SARVAM_KEY; }

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string> {
  if (!SARVAM_KEY || sourceLang === targetLang) return text;
  try {
    const res = await fetch(`${SARVAM_BASE}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_KEY,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: SARVAM_LANGUAGES[sourceLang] ?? 'en-IN',
        target_language_code: SARVAM_LANGUAGES[targetLang] ?? 'hi-IN',
        model: 'mayura:v2',
        enable_preprocessing: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return text;
    const data = await res.json() as { translated_text?: string };
    return data.translated_text ?? text;
  } catch { return text; }
}

export async function detectLanguage(text: string): Promise<string> {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const hinglishWords = ['karo','kya','hai','nahi','hona','aap','yahan','wahan','abhi','phir'];
  if (hinglishWords.some(w => text.toLowerCase().includes(w))) return 'hinglish';
  return 'en';
}

export async function transcribeAudio(audioBase64: string, languageCode = 'hi-IN'): Promise<string> {
  if (!SARVAM_KEY) throw new Error('SARVAM_API_KEY not set');
  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': SARVAM_KEY },
    body: JSON.stringify({ model: 'saaras:v2', language_code: languageCode, audio: audioBase64 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Sarvam STT failed: ${res.status}`);
  const data = await res.json() as { transcript?: string };
  return data.transcript ?? '';
}

export async function synthesizeSpeech(text: string, languageCode = 'hi-IN'): Promise<Buffer> {
  if (!SARVAM_KEY) throw new Error('SARVAM_API_KEY not set');
  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': SARVAM_KEY },
    body: JSON.stringify({ inputs: [text], target_language_code: languageCode, model: 'bulbul:v2', speech_sample_rate: 22050 }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Sarvam TTS failed: ${res.status}`);
  const data = await res.json() as { audios?: string[] };
  return Buffer.from(data.audios?.[0] ?? '', 'base64');
}
