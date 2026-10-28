/**
 * GAID's own voice engine (voice/, on Modal): a voice ID made from a person's
 * own recordings, with no per-use fee. Owner, 28 October: "ElevenLabs is too
 * expensive; do ours."
 *
 * Settings in Vercel's environment, never in the repository:
 *   GAID_VOICE_URL    the engine's address (Modal prints it on deploy)
 *   GAID_VOICE_TOKEN  the secret shared with the engine
 *
 * Like every voice in GAID it is only handed words GAID's server signed
 * (api/speak.js). EVERY FAILURE IS NULL: a cold engine, a timeout, a refusal.
 * The next voice in line speaks instead.
 */
const VOICE_ID = /^gv[0-9a-f]{16}$/;

export const enabled = () => Boolean(process.env.GAID_VOICE_URL && process.env.GAID_VOICE_TOKEN);
export let lastProblem = '';

const cache = new Map();
const MAX_CACHE = 80;

/** MP3 bytes in the voice, or null. */
export async function synth(text, lang = 'English', voiceId = '', ms = 15000) {
  if (!enabled() || !VOICE_ID.test(String(voiceId))) return null;
  const words = String(text ?? '').trim().slice(0, 1200);
  if (!words) return null;
  const key = `${voiceId}:${lang}:${words}`;
  if (cache.has(key)) return cache.get(key);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${process.env.GAID_VOICE_URL.replace(/\/$/, '')}/speak`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { authorization: `Bearer ${process.env.GAID_VOICE_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ voiceId, text: words, lang }),
    });
    if (!res.ok || res.headers.get('content-type') !== 'audio/mpeg') { lastProblem = String(res.status); return null; }
    const audio = new Uint8Array(await res.arrayBuffer());
    if (!audio.length) return null;
    lastProblem = '';
    cache.set(key, audio);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return audio;
  } catch (e) {
    lastProblem = e?.name === 'AbortError' ? 'timeout' : 'network';
    return null;
  } finally {
    clearTimeout(t);
  }
}
