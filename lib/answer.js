/**
 * The questions a visitor actually asks in front of a work, answered from
 * the gallery's own words and nothing else.
 *
 * This runs first, before any AI. Most questions in a gallery are the same
 * eight — what is it, who made it, when, what of, how big, where am I, what
 * else, say it in my language — and each has an exact answer sitting in the
 * gallery's file. Answering those from the file is instant, costs nothing,
 * and cannot be wrong in a way the curator did not write. Only a question
 * none of these match goes to the model (see bedrock.js).
 *
 * Returns { say, action, topic, matched }. `action` tells the screen what to
 * do as well as speak: { type: 'goto', id } | { type: 'play' } |
 * { type: 'stop' } | { type: 'lang', lang }. `topic` names what was asked
 * about, so the screen beside the work can show it as well as say it.
 * `matched: false` means "ask the model".
 */
import { plainSize } from '../public/scene.js';

const clean = (q) => String(q ?? '')
  .toLowerCase()
  // The wake word is not the question: "Alexa", or GAID itself, which speech
  // recognition writes as "guide". "Guide me to …" is a question, not a wake word.
  .replace(/^\s*(hey\s+|ok\s+)?(alexa|gaid|guide)(?!\s+(me|us)\b)[\s,.!:-]*/i, '')
  .replace(/[?!.]+$/g, '')
  .trim();

export function wakeless(q) {
  return clean(q);
}

function guideIn(work, lang, gallery) {
  const first = gallery.languages[0];
  if (work.guide[lang]) return { words: work.guide[lang], missing: false };
  return { words: work.guide[first] ?? '', missing: lang !== first };
}

/* A sentence that guesses is not a fact: "perhaps indicating a halo". The
   gallery's words are kept as they are, but a sentence that says it is
   unsure is left out of what is read aloud. Nothing is added. */
const GUESS = /\b(perhaps|possibly|probably|maybe|might|may be|appears to|seems to|it is (likely|thought|believed))\b/i;
export const sure = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()
  .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).filter((x) => x && !GUESS.test(x)).join(' ');

/** "c. 1310" is read as "about 1310", not "c". */
const spokenYear = (y) => String(y ?? '').replace(/^c\.\s*/i, 'about ').replace(/\bca?\.\s*/gi, 'about ');

function aboutWork(work, lang, gallery) {
  const head = [work.title, work.artist && `by ${work.artist}`, spokenYear(work.year)].filter(Boolean).join(', ');
  const made = work.medium ? ` ${work.medium.charAt(0).toUpperCase()}${work.medium.slice(1)}.` : '';
  const { words, missing } = guideIn(work, lang, gallery);
  const note = missing ? ` It is not in ${lang} yet, so here it is in ${gallery.languages[0]}.` : '';
  const story = sure(words);
  return `${head}.${made}${note}${story ? ' ' + story : ''}`;
}

/** One line per work: what it is, who made it, when. */
const line = (w) => [w.title, w.artist && `by ${w.artist}`, spokenYear(w.year)].filter(Boolean).join(', ');

function findTitle(gallery, wanted) {
  const w = wanted.replace(/^the\s+/, '').trim();
  if (!w) return null;
  return gallery.works.find((x) => x.title.toLowerCase() === w)
    ?? gallery.works.find((x) => x.title.toLowerCase().includes(w))
    ?? gallery.works.find((x) => w.includes(x.title.toLowerCase()));
}

/* A curator's own question and answer, matched on the words that carry the
   meaning. Most of the curator's question has to be in the visitor's, and at
   least two of its words (one, when the curator's question has only one), so
   "is it for sale" never picks up "is it a copy". */
const STOP = new Set('a an and are as at be by can did do does for from has have how i in is it its me my of on or so that the their there this to was we what when where which who why will with you your'.split(' '));
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff ]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
  .map((w) => w.slice(0, 5)));   // a rough stem: photo, photos, photographs
export function faqHit(faq, question) {
  const asked = words(question);
  let best = null; let bestScore = 0;
  for (const item of faq ?? []) {
    const theirs = words(item.q);
    if (!theirs.size) continue;
    const shared = [...theirs].filter((w) => asked.has(w)).length;
    const score = shared / theirs.size;
    if (shared >= Math.min(2, theirs.size) && score >= 0.6 && score > bestScore) { best = item; bestScore = score; }
  }
  return best;
}

/** "the Main hall", but never "the The courtyard". */
const theRoom = (room) => (/^the\s/i.test(room) ? room : `the ${room}`);

const list = (names) => (names.length <= 1 ? names.join('')
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export function answer({ gallery, work, question, lang }) {
  const q = clean(question);
  const L = gallery.languages.includes(lang) ? lang : gallery.languages[0];
  const say = (s, action = null, topic = 'about') => ({ say: s, action, topic, matched: true });

  if (!work) return say(`Welcome to ${gallery.name}. Stand in front of a work and ask me about it.`, null, 'welcome');
  if (!q) return say(aboutWork(work, L, gallery), { type: 'play' });

  // Language first: "say it in Yoruba", "in Igbo please", "switch to French".
  const langHit = gallery.languages.find((x) => new RegExp(`\\b${x.toLowerCase()}\\b`).test(q));
  if (langHit && /\b(in|to|speak|say|switch|language)\b/.test(q)) {
    const { missing } = guideIn(work, langHit, gallery);
    if (missing && !work.audio[langHit]) {
      return say(`This work is not in ${langHit} yet. Here it is in ${gallery.languages[0]}.`, { type: 'lang', lang: langHit }, 'lang');
    }
    return say(aboutWork(work, langHit, gallery), { type: 'lang', lang: langHit }, 'lang');
  }

  if (/^(stop|quiet|pause|be quiet|enough)\b/.test(q)) return say('Stopped.', { type: 'stop' }, 'stop');

  if (/\b(play|listen|hear)\b.*\b(guide|recording|audio|story)\b|^play\b/.test(q)) {
    return say(aboutWork(work, L, gallery), { type: 'play' });
  }

  const goto = q.match(/\b(?:take me to|go to|show me|open|find)\s+(.+)$/);
  if (goto) {
    const hit = findTitle(gallery, goto[1]);
    if (hit) return say(aboutWork(hit, L, gallery), { type: 'goto', id: hit.id });
  }

  // The curator's own answer, word for word, before any rule of ours.
  const faq = faqHit(work.faq, q) ?? faqHit(gallery.faq, q);
  if (faq) return say(faq.a, null, 'about');

  if (/\b(tell me more|more about|background|story behind|history of|the story)\b/.test(q) && work.background) {
    return say(work.background, null, 'about');
  }

  if (/\b(credit|credit line|where (did|does) it come from|provenance|acquired|accession)\b/.test(q)) {
    const bits = [work.credit && `The gallery's credit line: ${work.credit}`, work.accession && `Accession number ${work.accession}`].filter(Boolean);
    return say(bits.length ? `${bits.join('. ')}.` : 'The gallery has not said where it came from.', null, 'about');
  }

  if (/\b(exhibitions?|which show|what show|on show|part of a show)\b/.test(q)) {
    if (!work.shows?.length) return say(`${work.title} is not in an exhibition the gallery has listed.`, null, 'about');
    const s0 = work.shows[0];
    return say(`${work.title} is in ${s0.title}${s0.venue ? `, ${s0.venue}` : ''}.${s0.blurb ? ' ' + s0.blurb : ''}`, null, 'about');
  }

  // "Next artwork", "next one", "previous painting", "go back": move, then tell.
  const thing = '(art)?works?|paintings?|pieces?|objects?|ones?';
  const forward = new RegExp(`^(next|forward)$|\\b(next|following)\\s+(${thing})\\b|\\b(switch|move|go|skip)\\s+(on\\s+)?(to\\s+)?(the\\s+)?next\\b`).test(q);
  const back = new RegExp(`^(previous|back)$|\\b(previous|last)\\s+(${thing})\\b|\\b(go|move|switch)\\s+back\\b|\\b(switch|move|go)\\s+(to\\s+)?(the\\s+)?previous\\b`).test(q);
  if (forward || back) {
    const all = gallery.works;
    const i = all.findIndex((x) => x.id === work.id);
    const to = all[(i + (forward ? 1 : -1) + all.length) % all.length];
    if (to && to.id !== work.id) return say(aboutWork(to, L, gallery), { type: 'goto', id: to.id });
  }

  if (/\b(what else|anything else|nearby|near me|around (me|here)|in this room)\b/.test(q)
    || /\bother\s+(art)?(works?|pieces?|paintings?|objects?|things)\b/.test(q)
    || /\b(more|the)\s+(art)?works?\s+(here|nearby|around)\b/.test(q)) {
    const same = gallery.works.filter((x) => x.id !== work.id && work.room && x.room === work.room);
    const pool = (same.length ? same : gallery.works.filter((x) => x.id !== work.id)).slice(0, 3);
    if (!pool.length) return say(`${work.title} is the only work here.`, null, 'nearby');
    const where = same.length ? `Also in ${theRoom(work.room)}` : `Also in ${gallery.name}`;
    return say(`${where}: ${pool.map(line).join('. ')}. Say "take me to" and a title.`, null, 'nearby');
  }

  if (/\b(who (made|painted|carved|created|did|is the artist)|artist|maker|sculptor|painter|photographer)\b/.test(q)) {
    if (!work.artist) return say('The gallery has not said who made it.', null, 'artist');
    return say(work.artistBio ? `${work.artist}. ${work.artistBio}` : `${work.artist}.`, null, 'artist');
  }

  if (/\b(when|what year|how old|date)\b/.test(q)) {
    return say(work.year ? `${work.title} is from ${work.year}.` : 'The gallery has not given a date for it.', null, 'date');
  }

  if (/\b(made (of|from|with)|material|medium|what is it made|technique)\b/.test(q)) {
    if (!work.medium) return say('The gallery has not said what it is made of.', null, 'medium');
    return say(work.mediumNote ? `${work.medium}. ${work.mediumNote}` : `${work.medium}.`, null, 'medium');
  }

  if (/\b(how big|size|dimensions|how tall|how wide|how large)\b/.test(q)) {
    return say(work.dimensions ? `${plainSize(work.dimensions)}.` : 'The gallery has not given its size.', null, 'size');
  }

  if (/\b(where (am i|is (it|this))|which room|what room|floor)\b/.test(q)) {
    if (!work.room) return say(`You are in ${gallery.name}.`, null, 'where');
    return say(`You are in ${theRoom(work.room)}${work.floor ? `, ${work.floor.toLowerCase()}` : ''}, at ${work.title}.`, null, 'where');
  }

  if (/\b(open|opening|hours|close|closing)\b/.test(q) && gallery.hours) return say(gallery.hours, null, 'hours');

  if (/\b(help|what can (i|you))\b/.test(q)) {
    return say('Ask me about the work in front of you: who made it, when, what it is made of, or what else is here. You can also say "say it in" and a language.', null, 'help');
  }

  if (/\b(tell me about|what is (this|it)|describe|what am i looking at|in front of me|about (this|it))\b/.test(q)) {
    return say(aboutWork(work, L, gallery), { type: 'play' });
  }

  return { say: '', action: null, topic: null, matched: false };
}

/** What GAID says when nothing matched and no model is switched on. */
export function noModelReply(gallery) {
  return `I only know what ${gallery.name} wrote about this work. Try: who made it, when was it made, or what else is here.`;
}
