/**
 * "The painting with the sun." A visitor at home remembers a work by what was
 * in it, not by its title. Score each work on the words in the question:
 * a word in the title counts most, then the artist, the material and the
 * gallery's own story. "sun" finds "Sunrise": a word may be the start of one.
 */
const STOP = new Set(('a an and are as at be by for from has have i in is it its me my of on one or ' +
  'that the this to was what which with work works piece painting picture saw seen see').split(' '));

const words = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

function hits(query, text) {
  const t = words(text);
  return query.filter((q) => t.some((w) => w === q || (q.length >= 3 && w.startsWith(q)))).length;
}

/** The best matches, best first, each with its score. Nothing scores nothing. */
export function findWorks(gallery, query, n = 3) {
  const q = words(query);
  if (!q.length) return [];
  return gallery.works
    .map((w) => ({
      work: w,
      score: 3 * hits(q, w.title) + 2 * hits(q, w.artist) + hits(q, w.medium)
        + hits(q, w.room) + hits(q, Object.values(w.guide).join(' ')),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
