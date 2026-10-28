/* POST /api/speak — { voice, lang } or { phrase, words, lang } -> audio/mpeg, or 204.

   Whose voice: a gallery's own ElevenLabs voice if one is set (drop in
   ELEVENLABS_API_KEY and GAID_VOICE_ID), else the Amazon voice (lib/polly.js).
   If the first refuses, the second speaks. Either speaks only what GAID
   itself produced:
   - `voice`: a seal from one of GAID's own answers (lib/seal.js), or
   - `phrase`: one of GAID's fixed lines in public/words.js, by name.
   Anything else is refused, so nobody can make the voice say a sentence of
   their own. 204 means "use the phone's voice": not set up, a language the
   copy does not speak, a limit reached, or a failure. Never an error page. */
import { unseal } from '../lib/seal.js';
import * as clone from '../lib/clone.js';
import * as polly from '../lib/polly.js';
import * as own from '../lib/ownvoice.js';
import { loadGallery, SLUG } from '../lib/gallery.js';
import { pick } from '../lib/voices.js';
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

/** Is any voice set up? The pages ask, through /api/gallery. */
export const enabled = () => own.enabled() || clone.ready() || polly.enabled();

/* The person whose voice the gallery chose for this work, if they may speak
   (lib/voices.js: consent, likeness checked, not withdrawn, the language). */
async function chosen(slug, workId, lang) {
  if (!slug || !SLUG.test(slug)) return null;
  const gallery = await loadGallery(slug);
  if (!gallery?.open) return null;
  return pick(gallery, gallery.works.find((w) => w.id === workId) ?? null, lang);
}
const sayIn = (v, text, lang) => (v.provider === 'gaid' ? own.synth(text, lang, v.voiceId)
  : v.provider === 'elevenlabs' ? clone.synth(text, lang, v.voiceId) : polly.synth(text, lang, v.voiceId));

export async function POST(request) {
  if (!enabled()) return none();
  if (!allow(caller(request), Date.now(), 40, 'speak')) return none();
  let body;
  try { body = await request.json(); } catch { return none(); }
  const lang = typeof body?.lang === 'string' ? body.lang : 'English';
  let text = null; let where = null;
  if (typeof body?.voice === 'string') { where = unseal(body.voice); text = where?.say ?? null; }
  else if (typeof body?.phrase === 'string' && Object.hasOwn(PHRASES, body.phrase)) text = PHRASES[body.phrase](body.words);
  if (!text) return none();
  // The gallery's chosen person first — the gallery and work come from the
  // seal, never from the request, so one gallery's voice cannot be made to
  // read another's words. Then GAID's own voice, then the Amazon voice.
  const person = where ? await chosen(where.slug, where.workId, lang) : null;
  const audio = (person ? await sayIn(person, text, lang) : null)
    ?? (clone.enabled() ? await clone.synth(text, lang) : null) ?? (await polly.synth(text, lang));
  // Why each voice refused, as status codes and error names: no secret in it.
  if (!audio) {
    const why = [person && `person:${person.provider}:${(person.provider === 'gaid' ? own.lastProblem : clone.lastProblem) || 'none'}`, clone.enabled() && `own:${clone.lastProblem || 'none'}`, polly.enabled() && `amazon:${polly.lastProblem || 'none'}`].filter(Boolean).join(' ');
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-gaid-voice': why } });
  }
  return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=3600' } });
}
