/* What a visitor at home means, before any tool is called. Order matters:
   "tell me about the work in front of me" is about the work on screen, and
   must never be read as a search ("the work … in …") — that sent GAID to
   the wrong work once, and test/intent.test.js holds the line. */
export const WAKE = /^\s*(hey\s+|ok\s+)?(alexa|gaid|guide)(?!\s+(me|us)\b)[\s,.!:-]*/i;

const MEANS = [
  ['here', /\b(tell me about (it|this|the work in front of me)|in front of me|what is (this|it)|who made (it|this))\b/i],
  ['visit', /\b(what (did|have) i (see|seen)|my visit|remind me|what was (there|on)|ask (gaid|guide) about)\b/i],
  ['enquire', /\b(enquir\w*|inquir\w*|ask the gallery|contact|message|buy|price|interested|available)\b/i],
  ['find', /\b(the (one|painting|picture|work|sculpture|print|mask|bronze)\b.*\b(with|of|in|by)\b|which (one|was)|find)\b/i],
];

/** 'here' | 'visit' | 'enquire' | 'find' | 'ask', and the words without the wake word. */
export function intentOf(raw) {
  const q = String(raw ?? '').replace(WAKE, '').trim();
  return { q, intent: MEANS.find(([, re]) => re.test(q))?.[0] ?? 'ask' };
}
