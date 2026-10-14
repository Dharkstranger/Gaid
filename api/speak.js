/* POST /api/speak — { voice, lang } or { phrase, words, lang } -> audio/mpeg, or 204.

   The owner's voice copy speaks only what GAID itself produced:
   - `voice`: a seal from one of GAID's own answers (lib/seal.js), or
   - `phrase`: one of GAID's fixed lines in public/words.js, by name.
   Anything else is refused, so nobody can make the voice say a sentence of
   their own. 204 means "use the phone's voice": not set up, a language the
   copy does not speak, a limit reached, or a failure. Never an error page. */
import { unseal } from '../lib/seal.js';
import { synth, enabled } from '../lib/clone.js';
import { allow } from '../lib/limit.js';
import { W } from '../public/words.js';

const PHRASES = {
  first: () => W.say.first,
  offline: () => W.say.offline,
  paired: () => W.say.paired,
  noScreen: () => W.say.noScreen,
  noCamera: () => W.say.noCamera,
  pairHow: () => W.say.pairHow,
  saved: () => W.say.saved,
  // The three words to take home: letters only, three at most.
  home: (words) => (Array.isArray(words) && words.length >= 1 && words.length <= 3
    && words.every((w) => typeof w === 'string' && /^[\p{L}' -]{1,40}$/u.test(w)) ? W.say.home(words.join(', ')) : null),
};

const none = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
const caller = (r) => r.headers.get('x-real-ip') || r.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';

export async function POST(request) {
  if (!enabled()) return none();
  if (!allow(caller(request), Date.now(), 40, 'speak')) return none();
  let body;
  try { body = await request.json(); } catch { return none(); }
  const lang = typeof body?.lang === 'string' ? body.lang : 'English';
  let text = null;
  if (typeof body?.voice === 'string') text = unseal(body.voice)?.say ?? null;
  else if (typeof body?.phrase === 'string' && Object.hasOwn(PHRASES, body.phrase)) text = PHRASES[body.phrase](body.words);
  if (!text) return none();
  const audio = await synth(text, lang);
  if (!audio) return none();
  return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=3600' } });
}
