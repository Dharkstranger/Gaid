# GAID — working notes

**First, every session: read `docs/BACKLOG.md`** — the goal, what is due, what is next. Keep it current.

**GAID**, said *guide*. Ask the work in front of you. Built in Lagos by Emeka
Ugochukwu and Obianuju Nnadi (Hoo Socials Limited) for the Amazon "Build,
Ship, Shape" hackathon, Alexa+ track. Deadline **23 October 2026, 12:00
Pacific = 20:00 Lagos**. Public, MIT.

## The owner's rules

- **Words: one word, two words, a phrase.** A noun or a verb before a
  sentence. Every on-screen word lives in `public/words.js`; a page holds
  none. `test/words.test.js` holds labels to three words and fails on a
  sentence hidden in a page. Talk to the owner the same way: short.
- **Written GAID, said "guide".** Capitals on screen. A speech engine is given
  "Guide" (`spoken()`); "Guide, …" is a wake word like "Alexa, …"; Amazon
  Nova is told how it is said and never to say it.
- **GAID's own look only.** Lagos made: adire indigo, palm amber, chalk.
  Every value from `public/tokens.css`; `test/design.test.js` fails on a
  hand-written colour, size or space. A gallery's colour never appears.
- **Nothing missing.** Logo, colour, type, space, motion, parts, words,
  screens, accessibility: `docs/design-system.md`, live at `/design`.
- **Galleris stays private.** No Galleris code in this repository, ever.
  GAID reads only what Galleris publishes for anybody to open.
- **Ask before building; say what will be built.** Then build it, check it,
  and report in a few lines.

## Four moments (the product and the video)

| | Page | Tools (MCP) |
|---|---|---|
| Scan and ask | `/` | `ask_work` |
| The room answers | `/screen` (Fire TV) | — paired by a 4-character code |
| It follows you home | `/home?visit=…` (Echo Show) | `recall_visit`, `find_work`, `ask_work`, `send_enquiry` |
| The gallery learns | `/curator?gallery=…` | `visitor_questions` |

## Rules that hold the product together

- **Answers come from the gallery's words.** Rules first (`lib/answer.js`),
  Amazon Nova only for the rest (`lib/bedrock.js`), told to say "the gallery
  has not said" rather than guess. Never a name, date, price or owner made up.
- **One brain.** `lib/guide.js` answers the phone and Alexa+ alike.
- **Nothing in the plumbing turns a visitor away.** Every failure — MCP,
  Nova, the store, the TV link — falls back or goes quiet. No error screen.
- **Nothing kept about a visitor.** A visit is its own code
  (`public/visit.js`). An enquiry is a button they press. The TV link stores
  nothing. The one thing kept is an unanswered question (`docs/privacy.md`).
- **MCP 2025-11-25, Streamable HTTP, stateless**, official SDK pinned
  (`@modelcontextprotocol/sdk` 1.30.1). The phone's simulated Alexa+ calls it
  for every question; that is the track's "called at runtime".
- **Not an Amazon product**, on every screen. No Amazon logos.

## The database

GAID's one table lives in **Galleris's Supabase project**, walled off in
schema `gaid` (the owner's choice: the free plan's two projects are in use).
`supabase/migrations/`. RLS on, no policy, two narrow functions, swept at
180 days. Every change to it is also logged in Galleris's
`docs/ops/production-log.md`.

- **Tests never touch production.** `test/setup.js` points every file at a
  dead address and fails any file that reaches the real one. GitHub's runners
  can reach Supabase; this container cannot.
- This container is refused by `*.supabase.co`, `*.vercel.app` and
  `amazonappdev2026.devpost.com`. What cannot be reached is checked against
  stand-ins built from the real replies, and said so.

## Checks before saying something is done

- `npm test` passes (62+). GitHub runs it on every push.
- **A check is not a check until its bug has been put back** and it failed.
- **Look at the page**, phone 390 and TV 1920, every panel. Numbers passing
  is not the page looking right: an invisible `W` once printed
  "UNDEFINED · UNDEFINED" under a passing suite.
- axe-core: zero. Tap targets 44. Visible focus. Reduced motion stops motion.
- The local server sends Vercel's own headers (`dev.mjs` reads
  `vercel.json`): a page that breaks the live policy breaks here first.
- Fonts are served from `public/fonts/`, with every Yoruba, Igbo and Hausa
  letter drawn (Noto Sans covers ɓ ɗ ƙ ǹ). Check new type the same way.

## Run

```bash
npm install && npm test
GALLERIS_LOCAL_DIR=fixtures npm run dev    # http://localhost:5173/?gallery=sample
```

## Amazon devices

Amazon's builder tools were set up with `init-context` (project id `gaid`,
`.adbt-config.json`). Their guide, for Fire TV and Vega work:

@docs/amazon/devices-context.md
