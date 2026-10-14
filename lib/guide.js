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
import { seal } from './seal.js';
import { translate, LANGS } from './translate.js';
import { W } from '../public/words.js';

/** { ok, say, action, topic, source, work, gallery } or { ok: false, why }. Never throws. */
export async function ask({ slug = 'sample', workId, question = '', lang, history, caller = 'unknown' }) {
  slug = String(slug);
  if (!SLUG.test(slug)) return { ok: false, why: 'bad-slug' };
  const gallery = await loadGallery(slug);
  if (!gallery) return { ok: false, why: 'not-found' };
  // A gallery that has not switched GAID on gets one sentence, and nothing
  // else: no answer, no Nova, nothing recorded.
  if (!gallery.open) return { ok: true, closed: true, say: W.closedSay(gallery.name), action: null, topic: 'help', source: 'gallery', work: null, gallery };
  const work = gallery.works.find((w) => w.id === String(workId ?? '')) ?? gallery.works[0] ?? null;
  const L = gallery.languages.includes(lang) ? lang : gallery.languages[0];
  // A language the gallery has not written in, but GAID can speak: answer
  // from the gallery's words, then translate — said to be a translation.
  const want = LANGS.includes(lang) && lang !== L ? lang : null;
  const q = String(question).slice(0, 300);

  const out = await answerOf({ gallery, work, q, L, history, caller });
  // "The gallery has not said" is the most useful thing a curator could hear:
  // keep the question (only the question) for their list. Never in the way.
  if (SAID_NOTHING.test(out.say)) {
    out.unanswered = true;
    if (q) await recordUnanswered({ slug, workId: work?.id, question: q, lang: L });
  }
  if (want && !work?.audio?.[want]) {
    const t = await translate(out.say, want);
    if (t) { out.original = out.say; out.say = t; out.lang = want; out.translated = true; }
    else out.lang = L;
  } else out.lang = want ?? L;
  out.seal = seal({ slug, workId: work?.id, topic: out.topic, say: out.say });
  return out;
}

/* "Tell me about it", when Amazon Nova is on: an introduction made from the
   gallery's facts, the way a good guide would say it, rather than the
   description read out as written (often alt text for blind visitors). */
const INTRODUCE = 'Introduce the work in front of me as a guide would, aloud: what it is, who made it and when, what it is made of, and what to look at. Four or five short sentences. Use only the facts. No guesses, no filler, no questions back.';

async function answerOf({ gallery, work, q, L, history, caller }) {
  const ruled = answer({ gallery, work, question: q, lang: L });
  if (ruled.matched && ruled.action?.type === 'play' && ruled.topic === 'about' && work && !work.audio?.[L] && enabled() && allow(caller)) {
    const told = await askModel({ gallery, work, question: INTRODUCE, lang: L });
    if (told) return { ok: true, say: told, action: ruled.action, topic: 'about', source: 'nova', work, gallery };
  }
  if (ruled.matched) return { ok: true, say: ruled.say, action: ruled.action, topic: ruled.topic, source: 'gallery', work, gallery };

  if (enabled() && work && allow(caller)) {
    const said = await askModel({ gallery, work, question: q, lang: L, history });
    if (said) return { ok: true, say: said, action: null, topic: 'nova', source: 'nova', work, gallery };
  }
  return { ok: true, say: noModelReply(gallery), action: null, topic: 'help', source: 'gallery', work, gallery };
}
