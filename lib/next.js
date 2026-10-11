/**
 * Where next? The one work to see after this one, and why — said in a
 * breath, because the visitor is about to walk. Brooklyn Museum's ASK found
 * visitors wanted recommendations more than anything (docs/product.md).
 *
 * Not seen yet, first. Then what this work has in common with it, in the
 * order a visitor cares: the same hand, the same room, the same material,
 * the same years. A reason the gallery's own file can back up, never a taste.
 */
const yearOf = (s) => { const m = String(s ?? '').match(/\b(\d{3,4})\b/); return m ? Number(m[1]) : null; };

export function nextWork(gallery, work, seen = []) {
  const pool = gallery.works.filter((w) => w.id !== work.id && !seen.includes(w.id));
  const all = pool.length ? pool : gallery.works.filter((w) => w.id !== work.id);
  if (!all.length) return null;
  const y = yearOf(work.year);
  const scored = all.map((w) => {
    const why = [];
    if (work.artist && w.artist === work.artist) why.push('artist');
    if (work.room && w.room === work.room) why.push('room');
    if (work.medium && w.medium === work.medium) why.push('medium');
    if (y !== null && yearOf(w.year) !== null && Math.abs(yearOf(w.year) - y) <= 15) why.push('years');
    const score = (why.includes('artist') ? 8 : 0) + (why.includes('room') ? 4 : 0) + (why.includes('medium') ? 2 : 0) + (why.includes('years') ? 1 : 0);
    return { work: w, why, score };
  }).sort((a, b) => b.score - a.score || gallery.works.indexOf(a.work) - gallery.works.indexOf(b.work));
  const best = scored[0];
  return { work: best.work, why: best.why[0] ?? 'gallery', sameRoom: best.work.room === work.room };
}

/** What GAID says, in one breath. */
export function sayNext(gallery, from, next) {
  const by = next.work.artist ? `, by ${next.work.artist}` : '';
  const t = next.work.title;
  const reason = {
    artist: `Next: ${t}, also by ${next.work.artist}`,
    room: `Next, in this room: ${t}${by}`,
    medium: `Next: ${t}${by}, also ${String(from.medium).toLowerCase()}`,
    years: `Next: ${t}${by}, from the same years`,
    gallery: `Next: ${t}${by}`,
  }[next.why];
  const where = !next.sameRoom && next.work.room ? `, in the ${next.work.room.replace(/^the\s+/i, '')}` : '';
  return `${reason}${where}.`;
}
