/**
 * The gallery's words in the visitor's language. The Met found 90% of
 * English speakers rated its guide well against 73% of everyone else
 * (docs/product.md): language is the gap, not decoration.
 *
 * Amazon Nova translates; it is told to keep every name, title, date and
 * number exactly and to add nothing. The phone says it is a translation.
 * A curator's own recording in that language always comes first — that is
 * played, not this. No key, a failure: null, and the original is used.
 */
import { converse } from './bedrock.js';

export const LANGS = ['English', 'Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French'];
const NAME = { Pidgin: 'Nigerian Pidgin English', Yoruba: 'Yoruba, with full tone marks', Igbo: 'Igbo, with its dotted vowels', Hausa: 'Hausa', French: 'French', English: 'English' };

const cache = new Map();

export function systemFor(lang) {
  return [
    `Translate the gallery's words into ${NAME[lang] ?? lang}.`,
    'Keep every name, title, place, date and number exactly as written.',
    'Add nothing, explain nothing, leave nothing out. Plain spoken sentences: it will be read aloud.',
    'Reply with the translation only.',
  ].join(' ');
}

/** The text in `lang`, or null. */
export async function translate(text, lang) {
  if (!LANGS.includes(lang) || !text) return null;
  const key = `${lang}\u0000${text}`;
  if (cache.has(key)) return cache.get(key);
  const out = await converse(systemFor(lang), text, { maxTokens: 500 });
  if (out) { cache.set(key, out); if (cache.size > 500) cache.delete(cache.keys().next().value); }
  return out;
}
