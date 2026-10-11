/**
 * A Galleris viewing room, read the way a visitor's phone reads it.
 *
 * Gaid holds no collection of its own. Every gallery it speaks for is a file
 * that Galleris has already published for anybody to open: first beside the
 * site (gallerismuseum.com/demos/<slug>.json), then in the public bucket where
 * a curator's own publish lands. Nothing here can write to either.
 *
 * `slim()` turns that file into the only thing the guide needs: the gallery's
 * name and about, and per work its words, its picture, and its recordings.
 * Everything a guide may say comes out of this object and nowhere else.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SLUG = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/;

const ORIGIN = process.env.GALLERIS_ORIGIN || 'https://gallerismuseum.com';
const BUCKET = process.env.GALLERIS_BUCKET
  || 'https://gudymczklujytsozwrsy.supabase.co/storage/v1/object/public/museums';
/* For tests and for a machine with no network: a folder holding <slug>.json. */
const LOCAL = process.env.GALLERIS_LOCAL_DIR || '';

const cache = new Map();          // slug -> { at, gallery }
const FRESH_MS = 60_000;          // the bucket's own cache is a minute too

async function fetchJson(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return { raw: await res.json(), base: url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchRaw(slug) {
  if (LOCAL) {
    try {
      const file = path.join(LOCAL, `${slug}.json`);
      return { raw: JSON.parse(await readFile(file, 'utf8')), base: `${ORIGIN}/demos/${slug}.json` };
    } catch {
      return null;
    }
  }
  return (await fetchJson(`${ORIGIN}/demos/${slug}.json`))
    ?? (await fetchJson(`${BUCKET}/${slug}.json`));
}

/** A media id to something a browser can open, or ''. */
function srcOf(raw, id, base) {
  if (!id) return '';
  const m = raw.media?.[id] ?? raw.images?.[id];
  const src = typeof m === 'string' ? m : (m?.src ?? m?.url ?? '');
  if (!src || typeof src !== 'string') return '';
  if (/^(https:|data:image\/|data:audio\/)/.test(src)) return src;
  try { return new URL(src, base).href; } catch { return ''; }
}

const text = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function slim(raw, base = ORIGIN) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pieces)) return null;
  const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
  const artists = byId(raw.artists);
  const mediums = byId(raw.mediums);
  const rooms = byId(raw.locations);
  const languages = (Array.isArray(raw.languages) && raw.languages.length ? raw.languages : ['English'])
    .filter((l) => typeof l === 'string').slice(0, 12);

  const works = raw.pieces
    .filter((p) => p && p.onDisplay !== false && text(p.title))
    .map((p) => {
      const artist = artists.get(p.artistId);
      const medium = mediums.get(p.mediumId);
      const room = rooms.get(p.locationId);
      const guide = { [languages[0]]: text(p.description) };
      for (const [lang, words] of Object.entries(p.translations ?? {})) {
        if (text(words)) guide[lang] = text(words);
      }
      const audio = {};
      for (const [lang, r] of Object.entries(p.recordings ?? {})) {
        const src = srcOf(raw, r?.clipId, base);
        if (src) audio[lang] = { src, text: text(r.text) };
      }
      return {
        id: String(p.id),
        title: text(p.title, 200),
        artist: text(artist?.name, 120),
        artistBio: text(artist?.bio, 800),
        year: text(p.year, 40),
        medium: text(medium?.name, 120),
        mediumNote: text(medium?.description, 400),
        dimensions: text(p.dimensions, 300),
        room: text(room?.name, 120),
        floor: text(room?.floor, 80),
        guide,
        audio,
        image: srcOf(raw, (p.imageIds ?? [])[0], base),
      };
    });

  return {
    slug: text(raw.slug, 48),
    name: text(raw.brand?.name, 120) || 'This gallery',
    about: text(raw.info?.about, 1200),
    welcome: text(raw.info?.welcome, 600),
    hours: text(raw.info?.hours, 200),
    accent: /^#[0-9a-f]{6}$/i.test(raw.brand?.accent ?? '') ? raw.brand.accent : '#B34A0D',
    languages,
    works,
  };
}

/** The gallery at a link name, or null. Never throws. */
export async function loadGallery(slug) {
  if (!SLUG.test(slug)) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.gallery;
  const got = await fetchRaw(slug);
  const gallery = got ? slim(got.raw, got.base) : null;
  if (gallery) cache.set(slug, { at: Date.now(), gallery });
  return gallery;
}
