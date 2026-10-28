/**
 * A Galleris viewing room, read the way a visitor's phone reads it.
 *
 * GAID holds no collection of its own. Every gallery it speaks for is a file
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
import { voicesOf } from './voices.js';

export const SLUG = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/;

/* GAID's own demos are always on. Every other gallery chooses: GAID answers
   only when its curator switched it on (`gaid.on`) on a paid plan — the
   owner's decision, 11 October 2026: off by default, paid plans only. */
export const DEMOS = new Set((process.env.GAID_DEMOS || 'sample,openaccess').split(',').map((s) => s.trim()).filter(Boolean));
export const isOpen = (raw, slug) => DEMOS.has(slug) || (raw?.plan === 'paid' && raw?.gaid?.on === true && published(raw));

/* A gallery with no publication moment is somebody's draft, and GAID never
   answers about it (Galleris handover, 16 October, section 6). A moment that
   is not a date is a draft too: rubbish keeps a gallery private, never the
   other way round. GAID's own demos are files Galleris put beside its site,
   which Galleris counts as published by definition. */
export const published = (raw) => typeof raw?.publishedAt === 'string' && raw.publishedAt.trim() !== ''
  && Number.isFinite(Date.parse(raw.publishedAt));

/* Where Galleris is served, in the order asked. The bare gallerismuseum.com
   is not on the Vercel project (only www is), so it is not asked at all; the
   project's own address is the fallback if the custom domain ever lapses. */
const ORIGINS = (process.env.GALLERIS_ORIGIN || 'https://www.gallerismuseum.com,https://galleris.vercel.app')
  .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const ORIGIN = ORIGINS[0];
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
  for (const o of ORIGINS) {
    const got = await fetchJson(`${o}/demos/${slug}.json`);
    if (got) return got;
  }
  return fetchJson(`${BUCKET}/${slug}.json`);
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

/* A curator's questions and answers (Galleris: `faq` on a piece and on
   `info`). Malformed rows are dropped, never guessed at. */
const faqOf = (list, max) => (Array.isArray(list) ? list : [])
  .map((x) => ({ q: text(x?.q, 200), a: text(x?.a, 1200) }))
  .filter((x) => x.q && x.a)
  .slice(0, max);

/* Whether a work is for sale, and its price only if the gallery chose to
   show one. Nothing else about money is read: never `value`, never `notes`,
   never a price outside `sale.price`. */
const STATUS = new Set(['available', 'reserved', 'sold']);
function saleOf(s) {
  if (!s || typeof s !== 'object' || !STATUS.has(s.status)) return null;
  const n = typeof s.price === 'number' ? s.price : (typeof s.price === 'string' && /^\d[\d,.]*$/.test(s.price.trim()) ? Number(s.price.replace(/,/g, '')) : NaN);
  const price = s.status === 'available' && Number.isFinite(n) && n > 0 ? n : null;
  const currency = price !== null ? text(s.currency, 8).toUpperCase().replace(/[^A-Z]/g, '') : '';
  return { status: s.status, price, currency };
}

/* An exhibition a visitor could be standing in: one with something in it. */
const showOf = (x) => ({
  title: text(x?.title, 160), venue: text(x?.venue, 160),
  opens: text(x?.opens, 20), closes: text(x?.closes, 20), blurb: text(x?.blurb, 600),
});

export function slim(raw, base = ORIGIN) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pieces)) return null;
  const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
  const artists = byId(raw.artists);
  const mediums = byId(raw.mediums);
  const rooms = byId(raw.locations);
  const collections = byId(raw.collections);
  const defs = byId(raw.fieldDefs);
  const shows = (Array.isArray(raw.exhibitions) ? raw.exhibitions : [])
    .filter((x) => text(x?.title) && ((x.pieceIds ?? []).length || (x.collectionIds ?? []).length));
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
        // Everything else the gallery published about it: more for the
        // guide to draw on, never anything it made up.
        kind: text(p.classification, 80),
        accession: text(p.accession, 80),
        credit: text(p.acquired, 300),
        details: Object.entries(p.fields && typeof p.fields === 'object' ? p.fields : {})
          .map(([id, v]) => ({ label: text(defs.get(id)?.label, 60), value: text(v, 300) }))
          .filter((d) => d.label && d.value).slice(0, 12),
        collection: (() => { const c = collections.get(p.collectionId); return c ? { title: text(c.title, 160), blurb: text(c.blurb, 600) } : null; })(),
        shows: shows.filter((x) => (x.pieceIds ?? []).includes(p.id) || (p.collectionId && (x.collectionIds ?? []).includes(p.collectionId)))
          .slice(0, 4).map(showOf),
        background: text(p.background, 4000),
        faq: faqOf(p.faq, 12),
        sale: saleOf(p.sale),
        // Whose voice says it (lib/voices.js): the work's own, else its artist's.
        voice: text(p.voice, 64),
        artistVoice: text(artist?.voice, 64),
      };
    });

  return {
    slug: text(raw.slug, 48),
    name: text(raw.brand?.name, 120) || 'This gallery',
    about: text(raw.info?.about, 1200),
    welcome: text(raw.info?.welcome, 600),
    hours: text(raw.info?.hours, 200),
    background: text(raw.info?.background, 4000),
    faq: faqOf(raw.info?.faq, 20),
    shows: shows.slice(0, 8).map(showOf),
    // Published for anybody to read on the gallery's own page; used only to
    // hand a visitor a message they send themselves (lib/enquire.js).
    contact: { email: text(raw.info?.email, 200), whatsapp: text(raw.info?.whatsapp, 40) },
    accent: /^#[0-9a-f]{6}$/i.test(raw.brand?.accent ?? '') ? raw.brand.accent : '#B34A0D',
    open: isOpen(raw, text(raw.slug, 48)),
    voices: voicesOf(raw.voices),
    voice: text(raw.voice, 64),
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
  // Judged by the address it was fetched from, never by what the file says
  // its own name is: a file calling itself "sample" is not a demo.
  if (gallery) { gallery.open = isOpen(got.raw, slug); withOwnVoices(gallery, slug); cache.set(slug, { at: Date.now(), gallery }); }
  return gallery;
}

/* Voices for a gallery that GAID itself serves, set by whoever runs GAID
   (GAID_VOICES, JSON: { "<slug>": { "voice": "<id>", "voices": [records] } }).
   For GAID's own demos, and for anybody running GAID before their gallery
   software publishes voices. The gallery's own records win on a clash. */
function withOwnVoices(gallery, slug) {
  let all;
  try { all = JSON.parse(process.env.GAID_VOICES || '{}'); } catch { return; }
  const mine = all?.[slug];
  if (!mine || typeof mine !== 'object') return;
  for (const [id, v] of voicesOf(mine.voices)) if (!gallery.voices.has(id)) gallery.voices.set(id, v);
  if (!gallery.voice && typeof mine.voice === 'string') gallery.voice = mine.voice.slice(0, 64);
}
