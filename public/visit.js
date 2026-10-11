/* A visit, carried in its own code. No server keeps a list of who saw what:
   the phone writes the works it stood in front of into a short code, and at
   home Alexa+ reads them back out of it. Nothing about the visitor is in it.
   Shape: <gallery>~<id>.<id>.<id>   e.g. sample~p1.p4.p9
   Runs in the browser and in Node, so the phone and the MCP server agree. */

export const MAX_WORKS = 40;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/;

export function visitCode(slug, ids) {
  const seen = [...new Set(ids.map(String))].filter((id) => ID.test(id)).slice(-MAX_WORKS);
  return `${slug}~${seen.join('.')}`;
}

/** { slug, ids } or null. Never throws. */
export function readVisit(code) {
  const m = String(code ?? '').trim().match(/^([a-z0-9-]+)~([A-Za-z0-9_.-]*)$/);
  if (!m || !SLUG.test(m[1])) return null;
  const ids = m[2].split('.').filter((id) => ID.test(id)).slice(0, MAX_WORKS);
  return { slug: m[1], ids };
}

/* ---------------------------------------------------------------- three words
   A visit you can say out loud: one word from each work, the last three seen.
   "Sunrise, Mask, Crossing." At home: "Alexa, ask GAID about Sunrise, Mask,
   Crossing." Nothing is stored: the words are the visit.

   The word is the title's last real word — in English titles that is usually
   the thing itself (Ceremonial MASK, Compound WALL) — unless another work in
   the gallery ends the same way; then its longest word nobody else uses. */
const STOP = new Set('a an and at by for from in into of on or the to with'.split(' '));
const wordsOf = (title) => String(title ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** The one word a visitor can remember a work by, unique in its gallery. */
export function keywordOf(work, works) {
  const mine = wordsOf(work.title);
  const others = works.filter((w) => w.id !== work.id).map((w) => new Set(wordsOf(w.title)));
  const free = (word) => !others.some((o) => o.has(word));
  const last = mine[mine.length - 1];
  if (last && free(last)) return cap(last);
  const unique = mine.filter(free).sort((a, b) => b.length - a.length)[0];
  return cap(unique ?? last ?? String(work.id));
}

/** Up to three words for the works seen, most recent last. */
export function visitWords(works, ids, n = 3) {
  return ids.slice(-n).map((id) => works.find((w) => w.id === id)).filter(Boolean).map((w) => keywordOf(w, works));
}

/** The works a visitor's words name, in the order said. Unknown words are skipped. */
export function worksFromWords(works, words) {
  const said = (Array.isArray(words) ? words : String(words ?? '').split(/[\s,.;]+|\band\b/i))
    .map((w) => String(w).toLowerCase().trim()).filter(Boolean);
  const out = [];
  for (const s of said) {
    const hit = works.find((w) => keywordOf(w, works).toLowerCase() === s);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}
