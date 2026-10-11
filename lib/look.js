/**
 * Look closer: the gallery's own story, a sentence at a time, while the
 * picture moves to the part each sentence is about. Audio that tells you
 * where to look helps sighted visitors remember a work (Hutchinson &
 * Eardley 2021, docs/product.md).
 *
 * Where to look comes from data/focus/<gallery>.json — spots a person chose
 * for each work, as fractions of the picture: { x, y, w, h }. With none, the
 * picture eases through a gentle sequence (whole, centre, lower, whole) so
 * the visitor's eye still moves with the voice. The words are always the
 * gallery's; GAID never invents what is in a picture.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'focus');
const DRIFT = [{ x: 0, y: 0, w: 1, h: 1 }, { x: 0.2, y: 0.15, w: 0.6, h: 0.6 }, { x: 0.15, y: 0.4, w: 0.7, h: 0.6 }, { x: 0, y: 0, w: 1, h: 1 }];
const cache = new Map();

async function spotsFor(slug) {
  if (cache.has(slug)) return cache.get(slug);
  let spots = {};
  try { spots = JSON.parse(await readFile(path.join(ROOT, `${slug}.json`), 'utf8')); } catch { /* none set */ }
  cache.set(slug, spots);
  return spots;
}

export const sentences = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()
  .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).filter(Boolean);

const box = (b) => {
  const c = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
  const w = c(b?.w, 0.1, 1); const h = c(b?.h, 0.1, 1);
  return { x: c(b?.x, 0, 1 - w), y: c(b?.y, 0, 1 - h), w, h };
};

/** [{ say, box }] — at most five steps, the gallery's words only. */
export async function lookCloser(gallery, work, lang) {
  const words = work.guide?.[lang] ?? work.guide?.[gallery.languages[0]] ?? '';
  const parts = sentences(words).slice(0, 4);
  const set = (await spotsFor(gallery.slug))[work.id] ?? [];
  const steps = [{ say: work.title + (work.artist ? `, by ${work.artist}.` : '.'), box: { x: 0, y: 0, w: 1, h: 1 } }];
  parts.forEach((say, i) => steps.push({ say, box: box(set[i] ?? DRIFT[(i + 1) % DRIFT.length]) }));
  return steps;
}
