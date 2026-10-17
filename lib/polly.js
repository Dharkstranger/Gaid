/**
 * GAID's own voice: Amazon Polly (owner, 17 October: "use an Amazon voice
 * always"). One voice on every phone, TV and Echo Show, instead of whatever
 * each device happens to carry — which was a man on one phone and a woman on
 * the next.
 *
 * Polly's generative engine is its most natural. It is not Alexa's own voice:
 * Amazon does not offer that to anybody else.
 *
 * Settings live in Vercel's environment, never in the repository:
 *   GAID_AWS_ACCESS_KEY_ID, GAID_AWS_SECRET_ACCESS_KEY  an IAM user allowed
 *                                                        polly:SynthesizeSpeech
 *   GAID_AWS_REGION    default us-east-1 (generative voices live there)
 *   GAID_POLLY_VOICE   default Ruth (US English)
 *   GAID_POLLY=off     switches it off
 *
 * Like every voice in GAID it is only handed words GAID's server produced and
 * signed (api/speak.js). EVERY FAILURE IS NULL and the page carries on.
 */
import { createHash } from 'node:crypto';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

/* The languages Polly reads, and the voice for each. Pidgin is written in
   English spelling. Yoruba, Igbo and Hausa are not Polly languages, so the
   phone (or the gallery's own recording) says those. */
const VOICES = {
  English: () => process.env.GAID_POLLY_VOICE || 'Ruth',
  Pidgin: () => process.env.GAID_POLLY_VOICE || 'Ruth',
  French: () => 'Lea',
};

export const enabled = () => process.env.GAID_POLLY !== 'off'
  && Boolean(process.env.GAID_AWS_ACCESS_KEY_ID && process.env.GAID_AWS_SECRET_ACCESS_KEY);
export const speaks = (lang) => Object.hasOwn(VOICES, lang ?? 'English');

/** Why the last request failed: an error name, never a secret. */
export let lastProblem = '';

const cache = new Map();
const MAX_CACHE = 80;

let client = null;
let sender = null;           // tests put a stand-in here
export function useSender(fn) { sender = fn; cache.clear(); }
function send(input, signal) {
  if (sender) return sender(input);
  client ??= new PollyClient({
    region: process.env.GAID_AWS_REGION || 'us-east-1',
    maxAttempts: 2,
    credentials: { accessKeyId: process.env.GAID_AWS_ACCESS_KEY_ID, secretAccessKey: process.env.GAID_AWS_SECRET_ACCESS_KEY },
  });
  return client.send(new SynthesizeSpeechCommand(input), { abortSignal: signal });
}

/** Audio bytes (MP3) for the text, or null. */
export async function synth(text, lang = 'English', ms = 10000) {
  if (!enabled() || !speaks(lang)) return null;
  const words = String(text ?? '').trim().slice(0, 2900);
  if (!words) return null;
  const voice = VOICES[lang ?? 'English']();
  const key = createHash('sha256').update(`${voice}:${words}`).digest('hex');
  if (cache.has(key)) return cache.get(key);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    // Generative first; a voice or region without it falls back to neural.
    for (const Engine of ['generative', 'neural']) {
      try {
        const out = await send({ Engine, VoiceId: voice, OutputFormat: 'mp3', SampleRate: '24000', Text: words, TextType: 'text' }, ctl.signal);
        const audio = out?.AudioStream?.transformToByteArray ? await out.AudioStream.transformToByteArray() : out?.AudioStream;
        if (audio?.length) {
          lastProblem = '';
          cache.set(key, audio);
          if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
          return audio;
        }
        lastProblem = 'empty';
      } catch (e) {
        lastProblem = ctl.signal.aborted ? 'timeout' : String(e?.name ?? 'error').replace(/[^a-z]/gi, '').slice(0, 40);
        if (ctl.signal.aborted || !/Engine|Voice|Validation|LanguageNotSupported/i.test(lastProblem)) break;
      }
    }
    console.error('polly:', lastProblem);
    return null;
  } finally {
    clearTimeout(t);
  }
}
