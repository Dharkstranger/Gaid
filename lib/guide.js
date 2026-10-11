/**
 * One question, one answer, whoever asks: the phone page (api/ask.js) and
 * Alexa+ through the MCP server (lib/mcp.js) both come here, so the two can
 * never disagree about a work.
 *
 * The gallery's own words first (answer.js); Amazon Nova only for what they
 * do not cover (bedrock.js); and if that fails too, what GAID can do instead.
 * Never an error to the visitor.
 */
import { loadGallery, SLUG } from './gallery.js';
import { answer, noModelReply } from './answer.js';
import { askModel, enabled } from './bedrock.js';
import { allow } from './limit.js';
import { recordUnanswered, SAID_NOTHING } from './store.js';

/** { ok, say, action, topic, source, work, gallery } or { ok: false, why }. Never throws. */
export async function ask({ slug = 'sample', workId, question = '', lang, history, caller = 'unknown' }) {
  slug = String(slug);
  if (!SLUG.test(slug)) return { ok: false, why: 'bad-slug' };
  const gallery = await loadGallery(slug);
  if (!gallery) return { ok: false, why: 'not-found' };
  const work = gallery.works.find((w) => w.id === String(workId ?? '')) ?? gallery.works[0] ?? null;
  const L = gallery.languages.includes(lang) ? lang : gallery.languages[0];
  const q = String(question).slice(0, 300);

  const out = await answerOf({ gallery, work, q, L, history, caller });
  // "The gallery has not said" is the most useful thing a curator could hear:
  // keep the question (only the question) for their list. Never in the way.
  if (SAID_NOTHING.test(out.say)) {
    out.unanswered = true;
    if (q) await recordUnanswered({ slug, workId: work?.id, question: q, lang: L });
  }
  return out;
}

async function answerOf({ gallery, work, q, L, history, caller }) {
  const ruled = answer({ gallery, work, question: q, lang: L });
  if (ruled.matched) return { ok: true, say: ruled.say, action: ruled.action, topic: ruled.topic, source: 'gallery', work, gallery };

  if (enabled() && work && allow(caller)) {
    const said = await askModel({ gallery, work, question: q, lang: L, history });
    if (said) return { ok: true, say: said, action: null, topic: 'nova', source: 'nova', work, gallery };
  }
  return { ok: true, say: noModelReply(gallery), action: null, topic: 'help', source: 'gallery', work, gallery };
}
