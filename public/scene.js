/* What the screen beside the work shows, worked out from the gallery alone.
   No DOM in here, so the rules can be tested without a browser.

   The phone says the answer; the screen shows it. Each kind of question has
   its own picture: who made it shows the artist's other works, when shows
   the gallery's works in order of date, how big draws the work beside a
   person, where shows the rooms. Anything else shows the work and the words. */

export const CHANNEL = 'gaid-screen';

/** The first year in a date as the gallery wrote it ("c. 1950", "1974–76"), or null. */
export function yearOf(s) {
  const m = String(s ?? '').match(/\b(\d{3,4})\b/);
  return m ? Number(m[1]) : null;
}

const TO_CM = { mm: 0.1, cm: 1, m: 100, in: 2.54, inches: 2.54, ft: 30.48 };

/**
 * Height and width in centimetres from a size as a registrar writes it:
 * "92 x 122 cm", "48 × 64 cm (sheet)", "38 cm high", "12 x 9 in".
 * Height comes first, as it does on a wall label. null when it cannot tell.
 */
export function sizeOf(s) {
  const t = String(s ?? '').toLowerCase().replace(/,/g, '.');
  const unitOf = (u) => TO_CM[u] ?? null;
  const two = t.match(/(\d+(?:\.\d+)?)\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)(?:\s*(?:x|×|by)\s*\d+(?:\.\d+)?)?\s*(mm|cm|m|in|inches|ft)\b/);
  if (two) {
    const k = unitOf(two[3]);
    return { h: Number(two[1]) * k, w: Number(two[2]) * k };
  }
  const one = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inches|ft)\b\s*(high|tall|h\b|height)?/);
  if (one && (one[3] || /\b(high|tall|height)\b/.test(t))) {
    return { h: Number(one[1]) * unitOf(one[2]), w: null };
  }
  return null;
}

const others = (gallery, work, same) => gallery.works.filter((x) => x.id !== work.id && same(x));

/**
 * The panel for a topic. Falls back to 'about' whenever the gallery has not
 * written what the panel would need — an empty panel reads as a fault.
 */
export function panelFor(gallery, work, topic) {
  if (!gallery || !work) return { kind: 'about' };

  if (topic === 'artist' && work.artist) {
    return { kind: 'artist', name: work.artist, bio: work.artistBio,
      works: others(gallery, work, (x) => x.artist === work.artist) };
  }

  if (topic === 'date' && yearOf(work.year) !== null) {
    const dated = gallery.works.filter((x) => yearOf(x.year) !== null)
      .sort((a, b) => yearOf(a.year) - yearOf(b.year));
    return { kind: 'timeline', works: dated, first: yearOf(dated[0].year), last: yearOf(dated[dated.length - 1].year) };
  }

  if (topic === 'medium' && work.medium) {
    return { kind: 'medium', name: work.medium, note: work.mediumNote,
      works: others(gallery, work, (x) => x.medium === work.medium) };
  }

  if (topic === 'size') {
    const size = sizeOf(work.dimensions);
    if (size) return { kind: 'scale', size, label: work.dimensions };
  }

  if ((topic === 'where' || topic === 'nearby') && work.room) {
    const rooms = [];
    for (const x of gallery.works) {
      if (!x.room) continue;
      let r = rooms.find((y) => y.name === x.room);
      if (!r) { r = { name: x.room, floor: x.floor, works: [] }; rooms.push(r); }
      r.works.push(x);
    }
    // The visitor's own room first: it is the one the answer is about.
    rooms.sort((a, b) => (b.name === work.room) - (a.name === work.room));
    return { kind: 'rooms', rooms, here: work.room };
  }

  return { kind: 'about' };
}
