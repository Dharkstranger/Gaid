/**
 * The owner's voice, as an AI copy (owner, 13 October: "use mine for now").
 *
 * ElevenLabs makes the copy from a sample the owner reads, in their own
 * account, where they confirm the voice is theirs. GAID holds only two
 * settings, both in Vercel's environment and never in the repository:
 * ELEVENLABS_API_KEY and GAID_VOICE_ID. Without both, `enabled()` is false
 * and every page speaks with the phone's best voice instead.
 *
 * A copy of a real person's voice must never say what GAID did not. So this
 * module is only ever handed words GAID's own server produced and signed
 * (api/speak.js checks the seal); nobody can send it a sentence of their own.
 *
 * EVERY FAILURE IS NULL: no key, a timeout, a refusal, a language the model
 * does not speak. The page falls back to the phone's voice and carries on.
 */
import { createHash } from 'node:crypto';

const MODEL = process.env.GAID_VOICE_MODEL || 'eleven_multilingual_v2';
// The model speaks English and French; Pidgin is written in English spelling.
// Yoruba, Igbo and Hausa are not among its languages, so the phone says those.
const SPEAKS = new Set(['English', 'Pidgin', 'French']);

export const enabled = () => Boolean(process.env.ELEVENLABS_API_KEY && process.env.GAID_VOICE_ID);
export const speaks = (lang) => SPEAKS.has(lang ?? 'English');

// The same story is asked for again and again: keep the last few in memory.
const cache = new Map();
const MAX_CACHE = 60;

/** Audio bytes (MP3) for the text, or null. */
export async function synth(text, lang = 'English', ms = 12000) {
  if (!enabled() || !speaks(lang)) return null;
  const words = String(text ?? '').trim().slice(0, 2000);
  if (!words) return null;
  const key = createHash('sha256').update(`${MODEL}:${process.env.GAID_VOICE_ID}:${words}`).digest('hex');
  if (cache.has(key)) return cache.get(key);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.GAID_VOICE_ID)}?output_format=mp3_44100_128`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: words, model_id: MODEL }),
    });
    if (!res.ok || !String(res.headers.get('content-type') ?? '').startsWith('audio/')) { console.error('voice:', res.status); return null; }
    const audio = new Uint8Array(await res.arrayBuffer());
    if (!audio.length) return null;
    cache.set(key, audio);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return audio;
  } catch (e) {
    console.error('voice:', e?.name ?? 'error');
    return null;
  } finally {
    clearTimeout(t);
  }
}
