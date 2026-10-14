/* Every word GAID puts on a screen. Pronounced "guide".

   The rule (the owner's): one word if you can, two words, a phrase. A noun or
   a verb before a sentence. test/words.test.js holds every label to it.
   What GAID SAYS aloud is the gallery's own words, and is not in here. */

export const W = {
  name: 'GAID',
  said: 'Guide',               // what a speech engine is given instead of the name

  // phone
  talk: 'Talk',
  listening: 'Listening',
  speaking: 'Speaking',
  thinking: 'Thinking…',
  language: 'Language',
  screen: 'Screen',
  pair: 'Pair',
  works: 'Works',
  notFound: 'Gallery not found',
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

  // taking the visit home

  // at home: a simulated Alexa+ on an Echo Show
  yourVisit: 'Your visit',

  // the curator's list
  curatorTag: 'For curators',
  asked: 'Asked',
  times: (n) => (n === 1 ? 'Once' : `${n} times`),
  key: 'Edit key',
  show: 'Show',
  noQuestions: 'No questions yet',
  listOffline: 'List unavailable',
  keyHint: 'Demo: no key',

  // voice-first: what each icon is called (read by screen readers, never shown)
  listen: 'Listen',
  look: 'Look closer',
  next: 'Where next',
  home: 'Take home',
  enquire: 'Enquire',
  sendOn: (how) => `Send on ${how}`,
  captions: 'Captions',
  pairScreen: 'Pair a screen',
  scanToPair: 'Scan to pair',
  pressOk: 'Press OK',
  hearAgain: 'Hear again',
  save: 'Save',
  sayAtHome: (words) => `“Alexa, ask GAID about ${words}”`,
  close: 'Close',
  about: 'About',
  goTo: (title) => `Go to ${title}`,

  // the About page: the one place GAID explains itself in writing
  aboutTitle: 'About GAID',
  aboutSaid: 'Pronounced “guide”',
  aboutIcons: [
    ['listen', 'Listen'], ['talk', 'Ask'], ['look', 'Look closer'], ['lang', 'Language'],
    ['next', 'Where next'], ['home', 'Take home'], ['cc', 'Captions'], ['pair', 'Pair a screen'],
  ],
  aboutFacts: [
    'Answers: the gallery’s own words, then Amazon Nova',
    'Never invents a name, date or price',
    'Keeps nothing about you',
    'Voice: your phone, or an AI copy, with permission',
    'Simulated Alexa+ · Not an Amazon product',
    'Demo works: National Gallery of Art, open access',
    'Not endorsed by the Gallery',
  ],
  source: 'Open source',
  privacy: 'Privacy',
  madeWith: 'Galleris',

  // what GAID says, not shows
  say: {
    first: 'I only tell you what the gallery wrote.',
    home: (words) => `Your three words: ${words}. At home, say: Alexa, ask GAID about ${words}. Or press Save.`,
    offline: 'I cannot reach the gallery right now.',
    paired: 'The screen is with you.',
    cloned: 'This voice is an AI copy of a real person’s voice, used with their permission.',
    pairHow: 'Point your phone camera at the QR code on the TV. Or type the four letters under it.',
    saved: 'Link copied. Open it at home, or say the three words to Alexa.',
    noVoice: (lang) => `This phone cannot speak ${lang}. Here it is in English.`,
  },

  // the screen beside the work
  tvWait: 'Waiting…',
  tvAsk: 'Ask GAID',
  tvListening: 'Listening…',
  toScale: 'To scale',
  person: 'Person, 1.7 m',
  scaleSaid: (title, size) => `${title}, ${size}, beside a person 1.7 m tall`,   // read by a screen reader
  here: 'You are here',
  noPicture: 'No picture',
  // what the TV shows instead of the question as typed: anyone can type anything
  topic: { about: 'About', artist: 'Artist', date: 'Date', medium: 'Material', size: 'Size', where: 'Where',
    nearby: 'Nearby', lang: 'Language', nova: 'Question', help: 'Help', hours: 'Hours', welcome: 'Welcome' },
};

/** Text for a speech engine: the name as it is said. */
export function spoken(text) {
  return String(text ?? '').replace(/\bGAID\b/gi, W.said);
}
