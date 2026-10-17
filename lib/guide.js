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
import { answer, noModelReply, upTo } from './answer.js';
import { enquiryFor } from './enquire.js';
import { askModel, enabled } from './bedrock.js';
import { allow } from './limit.js';
import { recordUnanswered, SAID_NOTHING } from './store.js';
import { seal } from './seal.js';
import { translate, LANGS } from './translate.js';
import { W } from '../public/words.js';

/** { ok, say, action, topic, source, work, gallery } or { ok: false, why }. Never throws. */
export async function ask({ slug = 'sample', workId, question = '', lang, history, offered = false, caller = 'unknown' }) {
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
  // Somebody to ask instead: the gallery's WhatsApp, else its email — a
  // button the visitor presses, offered aloud only once a conversation.
  // A question about buying gets it too: that is a conversation to have
  // with the gallery, with the work named in the message.
  if ((out.unanswered || out.topic === 'sale') && work) {
    const e = enquiryFor(gallery, work);
    if (e.channel) {
      out.enquire = { channel: e.channel, href: e.href };
      const told = offered || (Array.isArray(history) && history.some((h) => /\bPress Enquire\b/.test(String(h?.text ?? ''))));
      if (!told) out.say = `${out.say} ${W.say.askGallery(e.channel === 'whatsapp' ? 'WhatsApp' : 'email')}`;
    }
  }
  if (want && !work?.audio?.[want]) {
    const t = await translate(out.say, want);
    if (t) { out.original = out.say; out.say = t; out.lang = want; out.translated = true; }
    else out.lang = L;
  } else out.lang = want ?? L;
  // The work the answer is about: after "next artwork", the new one, so a TV follows.
  out.seal = seal({ slug, workId: out.action?.type === 'goto' ? out.action.id : work?.id, topic: out.topic, say: out.say });
  return out;
}

/* "Tell me about it", when Amazon Nova is on: an introduction made from the
   gallery's facts, the way a good guide would say it, rather than the
   description read out as written (often alt text for blind visitors). */
const INTRODUCE = 'Introduce the work in front of me as a guide would, aloud: what it is, who made it and when, what it is made of, and what to look at. Four or five short sentences. Use only the facts. No guesses, no filler, no questions back.';

async function answerOf({ gallery, work, q, L, history, caller }) {
  const ruled = answer({ gallery, work, question: q, lang: L });
  // The work being introduced: this one, or the one "next artwork" moved to.
  const to = ruled.action?.type === 'goto' ? gallery.works.find((x) => x.id === ruled.action.id) : ruled.action?.type === 'play' ? work : null;
  if (ruled.matched && to && ruled.topic === 'about' && !to.audio?.[L] && enabled() && allow(caller)) {
    const told = await askModel({ gallery, work: to, question: INTRODUCE, lang: L });
    if (told) return { ok: true, say: told, action: ruled.action, topic: 'about', source: 'nova', from: 'label', work, gallery };
  }
  if (ruled.matched) return { ok: true, say: ruled.say, action: ruled.action, topic: ruled.topic, source: 'gallery', from: ruled.from, work, gallery };

  if (enabled() && work && allow(caller)) {
    const said = await askModel({ gallery, work, question: q, lang: L, history });
    // Two sentences, then stop: a visitor is standing up.
    if (said) return { ok: true, say: upTo(said, 2), action: null, topic: 'nova', source: 'nova', from: 'nova', work, gallery };
  }
  return { ok: true, say: noModelReply(gallery), action: null, topic: 'help', source: 'gallery', from: 'none', work, gallery };
}
