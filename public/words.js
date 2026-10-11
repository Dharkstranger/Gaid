/* Every word GAID puts on a screen. Said "guide".

   The rule (the owner's): one word if you can, two words, a phrase. A noun or
   a verb before a sentence. test/words.test.js holds every label to it.
   What GAID SAYS aloud is the gallery's own words, and is not in here. */

export const W = {
  name: 'GAID',
  said: 'Guide',               // what a speech engine is given instead of the name

  // phone
  tag: 'Simulated Alexa+',
  talk: 'Talk',
  listening: 'Listening',
  speaking: 'Speaking',
  question: 'Question',
  askHint: 'Ask this work',
  ask: 'Ask',
  thinking: 'Thinking…',
  offline: 'Offline. Try again.',
  language: 'Language',
  openScreen: 'Open screen',
  screen: 'Screen',
  codeHint: 'Code',
  pair: 'Pair',
  works: 'Works',
  fromGallery: 'Gallery’s words',
  fromNova: 'Nova · gallery’s words',
  notFound: 'Gallery not found',
  notFoundHint: 'Try ?gallery=sample',
  notOn: 'GAID off',
  closedSay: (name) => `${name} has not switched GAID on.`,   // spoken
  at: (title) => `At ${title}`,
  foot: 'Not an Amazon product · Answers: gallery’s words, then Amazon Nova · Speech: your browser',

  // the chips: a short label, and the question it asks
  chips: [
    ['About', 'Tell me about the work in front of me'],
    ['Artist', 'Who made it?'],
    ['Date', 'When was it made?'],
    ['Material', 'What is it made of?'],
    ['Size', 'How big is it?'],
    ['Nearby', 'What else is here?'],
  ],
  sayIn: (lang) => `Say it in ${lang}`,

  // taking the visit home
  takeHome: 'Take home',
  visitCode: 'Visit code',
  openHome: 'Open at home',

  // at home: a simulated Alexa+ on an Echo Show
  homeTag: 'Simulated Alexa+ · Echo Show',
  homeHint: 'Ask about it',
  exampleVisit: 'Example visit',
  yourVisit: 'Your visit',
  homeChips: [
    ['My visit', 'Alexa, what did I see today?'],
    ['The sun', 'Alexa, the painting with the sun'],
    ['Tell me', 'Alexa, tell me about it'],
    ['Enquire', 'Alexa, ask the gallery about it'],
  ],
  send: (how) => `Send on ${how}`,
  notSent: 'You send it',

  // the curator's list
  curatorTag: 'For curators',
  asked: 'Asked',
  times: (n) => (n === 1 ? 'Once' : `${n} times`),
  key: 'Edit key',
  show: 'Show',
  noQuestions: 'No questions yet',
  listOffline: 'List unavailable',
  keyHint: 'Sample: no key',

  // the screen beside the work
  tvWait: 'Waiting…',
  tvAsk: 'Ask GAID',
  tvListening: 'Listening…',
  moreBy: (name) => `More by ${name}`,
  moreIn: (medium) => `More in ${medium}`,
  toScale: 'To scale',
  person: 'Person, 1.7 m',
  scaleSaid: (title, size) => `${title}, ${size}, beside a person 1.7 m tall`,   // read by a screen reader
  here: 'You are here',
  noPicture: 'No picture',
  tvFoot: 'Simulated Fire TV · Not an Amazon product',
  // what the TV shows instead of the question as typed: anyone can type anything
  topic: { about: 'About', artist: 'Artist', date: 'Date', medium: 'Material', size: 'Size', where: 'Where',
    nearby: 'Nearby', lang: 'Language', nova: 'Question', help: 'Help', hours: 'Hours', welcome: 'Welcome' },
};

/** Text for a speech engine: the name as it is said. */
export function spoken(text) {
  return String(text ?? '').replace(/\bGAID\b/gi, W.said);
}
