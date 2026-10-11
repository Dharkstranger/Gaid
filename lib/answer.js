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

function aboutWork(work, lang, gallery) {
  const head = [work.title, work.artist && `by ${work.artist}`, work.year].filter(Boolean).join(', ');
  const { words, missing } = guideIn(work, lang, gallery);
  const note = missing ? ` It is not in ${lang} yet, so here it is in ${gallery.languages[0]}.` : '';
  return `${head}.${note}${words ? ' ' + words : ''}`;
}

function findTitle(gallery, wanted) {
  const w = wanted.replace(/^the\s+/, '').trim();
  if (!w) return null;
  return gallery.works.find((x) => x.title.toLowerCase() === w)
    ?? gallery.works.find((x) => x.title.toLowerCase().includes(w))
    ?? gallery.works.find((x) => w.includes(x.title.toLowerCase()));
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

  if (/\b(what else|other works?|anything else|next|more works?|what is nearby|near me)\b/.test(q)) {
    const same = gallery.works.filter((x) => x.id !== work.id && work.room && x.room === work.room);
    const pool = (same.length ? same : gallery.works.filter((x) => x.id !== work.id)).slice(0, 4);
    if (!pool.length) return say(`${work.title} is the only work here.`, null, 'nearby');
    const where = same.length ? `Also in ${theRoom(work.room)}` : `Also in ${gallery.name}`;
    return say(`${where}: ${list(pool.map((x) => x.title))}. Say "take me to" and a title.`, null, 'nearby');
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
    return say(work.dimensions ? `${work.dimensions}.` : 'The gallery has not given its size.', null, 'size');
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
