# Gaid

**Ask the work in front of you.**

Gaid is a voice guide for galleries. You stand in front of a painting and say
*"Alexa, tell me about the work in front of me"*. Gaid answers with the
gallery's own story of that work, plays the artist's or curator's recording if
there is one, and takes follow-up questions: who made it, when, what it is made
of, what else is in the room, and "say it in Yoruba".

It is a web simulation of an Alexa+ experience, built for the Amazon
**Build, Ship, Shape** hackathon (Alexa+ track). It is not an Amazon product.

## Why

A work on a wall has a story and almost nobody hears it. A wall label carries
about forty words. Galleries in Lagos send PDF catalogues on WhatsApp that
nobody opens standing in front of the work.

[Galleris](https://gallerismuseum.com) gives a gallery its own viewing room:
every work with its picture, its story and an audio guide, opened from a code
on the wall label. Gaid is that viewing room you can talk to.

## How it works

```
 browser (public/)                     server (api/)                     data
 ─────────────────                     ─────────────                     ────
 microphone ──► words ──► /api/ask ──► 1. the gallery's own words ──┐
                                        (lib/answer.js)              │   published Galleris
                                       2. Amazon Nova on Bedrock  ◄──┤   viewing room (JSON)
                                        (lib/bedrock.js)             │   read like a phone
 speaker  ◄── answer ◄────────────────  only if 1 has no answer      │   reads it
                                                                     │
 the work on screen ◄── /api/gallery ◄── lib/gallery.js ◄────────────┘
```

1. **The gallery's own words answer first.** Most questions in a gallery are
   the same eight. Each has an exact answer in the gallery's published file, so
   Gaid answers those by rule: instantly, at no cost, and never with anything
   the curator did not write.
2. **Amazon Nova answers the rest**, through the Bedrock Converse API. It is
   given only that gallery's facts and told to answer from them alone, to say
   "the gallery has not said" rather than guess, and to treat the visitor's
   words as a question, never as instructions.
3. **Nothing in the plumbing turns a visitor away.** No key, a timeout, a
   refusal: Gaid falls back to the gallery's own words.

## The screen beside the work

`/screen.html?gallery=sample` is the big screen on the wall next to the work,
standing in for a Fire TV. It never listens and never speaks; it shows what
the visitor just asked about. Each kind of question has its own picture:

| Asked | The screen shows |
|---|---|
| Who made it? | the artist, and their other works in the gallery |
| When was it made? | the gallery's works in order of date, this one marked |
| What is it made of? | the material, and other works in it |
| How big is it? | the work drawn to scale beside a person 1.7 m tall |
| Where am I? / What else is here? | the rooms, with "You are here" |
| Anything else | the work and the story, large |

Where the gallery has not written what a panel needs, the screen shows the
work and the words instead of an empty panel. `public/scene.js` decides
which, with no browser needed, so it is tested.

For now the phone and the screen talk through the browser itself
(`BroadcastChannel`), so both must be windows of one browser on one machine.
That is enough to record the demo; a phone and a television in a real room
need a small relay, which comes next.

A gallery is chosen by its Galleris link name: `/?gallery=sample`. The work in
front of you is `&at=<work id>`, the same id a Galleris wall-label code
carries.

## Amazon tools used

- **Amazon Bedrock**, Converse API, `@aws-sdk/client-bedrock-runtime`.
- **Amazon Nova Lite** (`us.amazon.nova-lite-v1:0`), set by `GAID_MODEL_ID`.

## Run it

Needs Node 20 or later.

```bash
npm install
npm test                       # 27 tests, no network needed
GALLERIS_LOCAL_DIR=fixtures npm run dev   # http://localhost:5173/?gallery=sample
```

Without a key Gaid answers from the gallery's words only. To switch Amazon
Nova on, set one of these:

| Setting | What |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | a Bedrock API key (simplest) |
| `GAID_AWS_ACCESS_KEY_ID`, `GAID_AWS_SECRET_ACCESS_KEY` | an access key pair allowed only `bedrock:InvokeModel` |
| `GAID_AWS_REGION` | default `us-east-1` |
| `GAID_PER_MINUTE` | questions to the model per caller per minute, default 20 |

## Deploy

Import the repository into Vercel. `vercel.json` serves `public/` and the two
functions in `api/`. Put the key in the project's environment settings, never
in the code.

## Privacy

Gaid stores nothing. A question goes to the server, is answered and is
forgotten. The browser's own speech recognition turns your voice into words;
in Chrome that service is Google's.

## Team

Emeka Ugochukwu and Obianuju Nnadi, Hoo Socials Limited, Lagos.

## Licence

MIT. See `LICENSE`.
