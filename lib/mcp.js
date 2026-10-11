/**
 * GAID as an MCP server: the tools Alexa+ calls.
 *
 * Model Context Protocol 2025-11-25, over Streamable HTTP (api/mcp.js), the
 * version and transport the hackathon's Alexa+ track asks for. Stateless: a
 * fresh server per request, no session, nothing kept between calls — a visit
 * travels in its own code (public/visit.js) instead.
 *
 * Every answer comes from lib/guide.js, the same brain as the phone page, so
 * Alexa+ at home and the phone in the gallery can never tell a visitor two
 * different things about one work.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadGallery, SLUG } from './gallery.js';
import { ask } from './guide.js';
import { findWorks } from './find.js';
import { enquiryFor } from './enquire.js';
import { readQuestions } from './store.js';
import { readVisit } from '../public/visit.js';
import { panelFor } from '../public/scene.js';

export const NAME = 'gaid';
export const VERSION = '0.2.0';

const INSTRUCTIONS = [
  'GAID (said "guide") is a voice guide for galleries published with Galleris.',
  'Every fact comes from the gallery\'s own words. If a tool says the gallery has not said, tell the person that; never fill the gap.',
  'Never invent names, dates, prices or owners. GAID never gives a price.',
  'Read answers aloud as given. Do not say the name GAID aloud; a speech engine says it wrongly.',
].join(' ');

const gallerySlug = z.string().regex(SLUG).describe('The gallery\'s Galleris link name, e.g. "sample".');

// What a tool returns: words to say, and the same facts as data for a screen.
const reply = (say, data = {}) => ({
  content: [{ type: 'text', text: say }],
  structuredContent: { say, ...data },
});
const card = (w) => ({ id: w.id, title: w.title, artist: w.artist, year: w.year, medium: w.medium, room: w.room, image: w.image });
const notFound = (slug) => reply(`I cannot find a published gallery called ${slug}.`, { found: false });

export function createServer({ caller = 'mcp' } = {}) {
  const server = new McpServer({ name: NAME, version: VERSION, title: 'GAID' }, { instructions: INSTRUCTIONS });
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

  server.registerTool('ask_work', {
    title: 'Ask about a work',
    description: 'Answer a visitor\'s question about one work, from the gallery\'s own words. Use for: who made it, when, what it is made of, how big, where it is, what else is here, the story behind it, or any other question about it. Returns what to say, and which panel the screen beside the work should show.',
    inputSchema: {
      gallery: gallerySlug,
      work_id: z.string().max(64).optional().describe('The work the visitor is in front of. Omit for the gallery\'s first work.'),
      question: z.string().min(1).max(300).describe('The visitor\'s question, in their words.'),
      language: z.string().max(40).optional().describe('A language the gallery offers, e.g. "Yoruba".'),
    },
    annotations: readOnly,
  }, async ({ gallery, work_id: workId, question, language }) => {
    const out = await ask({ slug: gallery, workId, question, lang: language, caller });
    if (!out.ok) return notFound(gallery);
    return reply(out.say, {
      found: true,
      source: out.source,                       // 'gallery' — its own words; 'nova' — Amazon Nova, from them
      topic: out.topic,
      action: out.action,
      unanswered: Boolean(out.unanswered),
      work: out.work ? card(out.work) : null,
      panel: out.work ? panelFor(out.gallery, out.work, out.topic).kind : 'about',
    });
  });

  server.registerTool('find_work', {
    title: 'Find a work from a description',
    description: 'Find a work from what someone remembers about it, e.g. "the painting with the sun" or "the bronze in the courtyard". Returns up to three, best first.',
    inputSchema: { gallery: gallerySlug, description: z.string().min(1).max(200) },
    annotations: readOnly,
  }, async ({ gallery: slug, description }) => {
    const gallery = await loadGallery(slug);
    if (!gallery) return notFound(slug);
    const found = findWorks(gallery, description);
    if (!found.length) return reply(`Nothing in ${gallery.name} matches that. Try the artist, the material, or a word from the title.`, { found: false, works: [] });
    const [best] = found;
    const say = `${best.work.title}${best.work.artist ? `, by ${best.work.artist}` : ''}${best.work.year ? `, ${best.work.year}` : ''}.`;
    return reply(say, { found: true, works: found.map((x) => card(x.work)) });
  });

  server.registerTool('whats_nearby', {
    title: 'What else is here',
    description: 'The other works in the same room as one work, so a visitor knows where to go next.',
    inputSchema: { gallery: gallerySlug, work_id: z.string().max(64) },
    annotations: readOnly,
  }, async ({ gallery, work_id: workId }) => {
    const out = await ask({ slug: gallery, workId, question: 'What else is here?', caller });
    if (!out.ok) return notFound(gallery);
    const near = out.gallery.works.filter((w) => w.id !== out.work.id && out.work.room && w.room === out.work.room);
    return reply(out.say, { found: true, room: out.work.room, works: near.map(card) });
  });

  server.registerTool('recall_visit', {
    title: 'Recall a visit',
    description: 'The works someone stood in front of on a visit, from the visit code their phone showed them (e.g. "sample~p1.p4.p9"). Nothing about the person is stored anywhere; the code is the whole record.',
    inputSchema: { visit: z.string().min(3).max(3000).describe('The visit code.') },
    annotations: readOnly,
  }, async ({ visit }) => {
    const v = readVisit(visit);
    if (!v) return reply('That visit code is not one I can read.', { found: false });
    const gallery = await loadGallery(v.slug);
    if (!gallery) return notFound(v.slug);
    const works = v.ids.map((id) => gallery.works.find((w) => w.id === id)).filter(Boolean);
    if (!works.length) return reply(`You visited ${gallery.name}, but none of the works you saw are still on show.`, { found: true, gallery: gallery.name, works: [] });
    const names = works.map((w) => w.title);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    return reply(`At ${gallery.name} you saw ${list}.`, { found: true, gallery: gallery.name, slug: gallery.slug, works: works.map(card) });
  });

  server.registerTool('send_enquiry', {
    title: 'Enquire about a work',
    description: 'Prepare a message to the gallery about a work, for the person to send from their own WhatsApp or email. GAID never sends it and keeps no copy. Never quote a price.',
    inputSchema: {
      gallery: gallerySlug,
      work_id: z.string().max(64),
      name: z.string().max(80).optional().describe('The person\'s name, if they want it in the message.'),
    },
    annotations: { ...readOnly, idempotentHint: true },
  }, async ({ gallery: slug, work_id: workId, name }) => {
    const gallery = await loadGallery(slug);
    if (!gallery) return notFound(slug);
    const work = gallery.works.find((w) => w.id === workId);
    if (!work) return reply('I cannot find that work in this gallery.', { found: false });
    const e = enquiryFor(gallery, work, name);
    if (!e.channel) return reply(`${gallery.name} has not published a way to reach them.`, { found: true, channel: null });
    const how = e.channel === 'whatsapp' ? 'WhatsApp' : 'email';
    return reply(`I have a message to ${gallery.name} about ${work.title}, ready to send on ${how}.`, { found: true, channel: e.channel, href: e.href, text: e.text, work: card(work) });
  });

  server.registerTool('visitor_questions', {
    title: 'What visitors asked',
    description: 'For the gallery\'s curator: the questions visitors asked that the gallery\'s own words did not answer, most asked first. Each one is a wall label waiting to be written. Needs the gallery\'s edit key, except for GAID\'s public demo galleries.',
    inputSchema: { gallery: gallerySlug, key: z.string().max(200).optional().describe('The gallery\'s Galleris edit key.') },
    annotations: readOnly,
  }, async ({ gallery: slug, key }) => {
    const [rows, gallery] = await Promise.all([readQuestions(slug, key ?? null), loadGallery(slug)]);
    if (!rows) return reply('I cannot reach the list of questions just now.', { found: false, questions: [] });
    if (!rows.length) return reply('No unanswered questions yet.', { found: true, questions: [] });
    const title = (id) => gallery?.works.find((w) => w.id === id)?.title ?? '';
    const top = rows[0];
    const times = top.times === 1 ? 'once' : `${top.times} times`;
    const say = `${rows.length} unanswered. Most asked: "${top.question}"${title(top.workId) ? `, about ${title(top.workId)}` : ''}, ${times}.`;
    return reply(say, { found: true, questions: rows.map((r) => ({ ...r, title: title(r.workId) })) });
  });

  return server;
}
