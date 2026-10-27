/**
 * Whose voice says it. Owner, 27 October: people upload the voices they want
 * heard — an artist, a curator, a family speaking for somebody who has died —
 * and GAID speaks in that voice, by its voice ID.
 *
 * A voice is a record the gallery publishes (Galleris: `voices` on the
 * gallery; `voice` on the gallery, an artist or a work names one). GAID never
 * makes, stores or edits a voice; it only reads which one to use. Anybody
 * running GAID can publish the same shape.
 *
 *   { id, name, provider: 'elevenlabs' | 'polly', voiceId, languages,
 *     consent: { kind: 'self' | 'estate', at, ref },
 *     check: { passed, similarity, at },
 *     withdrawn }
 *
 * A voice speaks ONLY when all of these hold, and each one has a test that
 * fails with it removed (test/voices.test.js):
 * - consent: the person proved it is their own voice ('self'), or the estate
 *   of a person who has died gave written permission ('estate'), with a date
 *   and a reference to the signed form;
 * - check: it passed the likeness test (docs/voices.md) — a copy that does not
 *   sound like the person is never put in front of anybody;
 * - not withdrawn: the owner can take it back at any time, and because GAID
 *   reads the gallery again every minute, it stops within a minute;
 * - it speaks the language asked for.
 * Anything malformed is no voice at all, and GAID's own voice speaks instead.
 */

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const day = (v) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : '');

/* What each service's voice IDs look like: anything else is refused before
   it reaches a URL. */
const PROVIDERS = {
  elevenlabs: /^[A-Za-z0-9]{8,40}$/,
  polly: /^[A-Z][a-z]{2,15}$/,
};

/** One published voice record, cleaned; null if it is not a usable record. */
export function voiceOf(v) {
  if (!v || typeof v !== 'object') return null;
  const id = text(v.id, 64);
  const provider = text(v.provider, 20);
  const voiceId = text(v.voiceId, 40);
  if (!id || !PROVIDERS[provider]?.test(voiceId)) return null;
  const c = v.consent && typeof v.consent === 'object' ? v.consent : {};
  const consent = (c.kind === 'self' || c.kind === 'estate') && day(c.at) && text(c.ref, 120)
    ? { kind: c.kind, at: day(c.at), ref: text(c.ref, 120) } : null;
  const k = v.check && typeof v.check === 'object' ? v.check : {};
  const check = { passed: k.passed === true, similarity: Number.isFinite(k.similarity) ? k.similarity : null, at: day(k.at) };
  const languages = (Array.isArray(v.languages) ? v.languages : ['English']).filter((l) => typeof l === 'string').slice(0, 12);
  return { id, name: text(v.name, 120), provider, voiceId, languages, consent, check, withdrawn: v.withdrawn === true, historical: consent?.kind === 'estate' };
}

/** Every record on a gallery, by id. */
export function voicesOf(list) {
  const out = new Map();
  for (const v of Array.isArray(list) ? list.slice(0, 50) : []) {
    const clean = voiceOf(v);
    if (clean && !out.has(clean.id)) out.set(clean.id, clean);
  }
  return out;
}

/** Why a voice may not speak, or '' if it may. Exported for the tests and the curator. */
export function refusal(voice, lang = 'English') {
  if (!voice) return 'none';
  if (voice.withdrawn) return 'withdrawn';
  if (!voice.consent) return 'no-consent';
  if (!voice.check.passed) return 'not-checked';
  if (!voice.languages.includes(lang)) return 'language';
  return '';
}

/**
 * The voice for these words: the work's own, then its artist's, then the
 * gallery's. The first one that may speak wins; none means GAID's default.
 */
export function pick(gallery, work, lang = 'English') {
  const all = gallery?.voices;
  if (!(all instanceof Map) || !all.size) return null;
  for (const id of [work?.voice, work?.artistVoice, gallery.voice]) {
    const v = id ? all.get(id) : null;
    if (v && !refusal(v, lang)) return v;
  }
  return null;
}
