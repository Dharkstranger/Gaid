# GAID

Pronounced *guide*. [Design system](docs/design-system.md).

**Ask the work in front of you.**

GAID is a voice guide for galleries. You stand in front of a painting and say
*"Alexa, tell me about the work in front of me"*. GAID answers with the
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
on the wall label. GAID is that viewing room you can talk to.

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
   GAID answers those by rule: instantly, at no cost, and never with anything
   the curator did not write.
2. **Amazon Nova answers the rest**, through the Bedrock Converse API. It is
   given only that gallery's facts and told to answer from them alone, to say
   "the gallery has not said" rather than guess, and to treat the visitor's
   words as a question, never as instructions.
3. **Nothing in the plumbing turns a visitor away.** No key, a timeout, a
   refusal: GAID falls back to the gallery's own words.

## GAID for Alexa+: the MCP server

`POST /api/mcp`. Model Context Protocol **2025-11-25**, Streamable HTTP, stateless,
built on the official SDK (`@modelcontextprotocol/sdk` 1.30.1). The phone page's
simulated Alexa+ calls it for every question; `test/mcp.test.js` drives it with a
real MCP client over HTTP.

| Tool | Does |
|---|---|
| `ask_work` | answers a question about a work from the gallery's words; says which screen panel fits |
| `find_work` | finds a work from a memory: "the painting with the sun" |
| `whats_nearby` | the other works in the same room |
| `recall_visit` | the works on a visit, from its code (`sample~p1.p4.p9`); nothing about the person is stored |
| `send_enquiry` | a message to the gallery for the person to send themselves; GAID sends nothing |

Every tool is read-only. Every fact is the gallery's own; where it has said
nothing, the tool says so.

Try it with any MCP client, or by hand:

```bash
curl -s -X POST https://<your-gaid>/api/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"find_work","arguments":{"gallery":"sample","description":"the one with the sun"}}}'
```

## Four moments

| | Where | What happens |
|---|---|---|
| 1. Scan and ask | `/?gallery=sample&at=p1` | ask out loud, in English or Yoruba; the gallery's words answer |
| 2. The room answers | `/screen` | the TV beside the work shows the answer; pair a phone with the 4-character code |
| 3. It follows you home | `/home?visit=sample~p1.p4.p9` | Alexa+ on an Echo Show: your visit, "the one with the sun", enquire |
| 4. The gallery learns | `/curator?gallery=sample` | every question GAID could not answer, most asked first |

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
- **Alexa+**: an MCP server (2025-11-25, Streamable HTTP), the track's own technology.
- **Amazon Devices Builder Tools**: `.adbt-config.json`, `docs/amazon/devices-context.md`.

## Run it

Needs Node 20 or later.

```bash
npm install
npm test                       # 48 tests, no network needed
GALLERIS_LOCAL_DIR=fixtures npm run dev   # http://localhost:5173/?gallery=sample
```

Without a key GAID answers from the gallery's words only. To switch Amazon
Nova on, set one of these:

| Setting | What |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | a Bedrock API key (simplest) |
| `GAID_AWS_ACCESS_KEY_ID`, `GAID_AWS_SECRET_ACCESS_KEY` | an access key pair allowed only `bedrock:InvokeModel` |
| `GAID_AWS_REGION` | default `us-east-1` |
| `GAID_PER_MINUTE` | questions to the model per caller per minute, default 20 |
| `GAID_DB_SECRET` | GAID's own database secret; without it nothing is recorded or read |
| `GAID_SIGNING_SECRET` | signs what a TV may show; set it, or several Vercel copies disagree |
| `GAID_MCP_PER_MINUTE` | calls to `/api/mcp` per caller per minute, default 120 |
| `GAID_DEMOS` | galleries always on, default `sample,openaccess`; every other needs `plan: paid` and `gaid.on` |

## Deploy

Import the repository into Vercel. `vercel.json` serves `public/` and the two
functions in `api/`. Put the key in the project's environment settings, never
in the code.

## Privacy

GAID stores nothing. A question goes to the server, is answered and is
forgotten. The browser's own speech recognition turns your voice into words;
in Chrome that service is Google's.

## Team

Emeka Ugochukwu and Jessica Obianuju Nnadi, Hoo Socials Limited, Lagos.

## Licence

MIT. See `LICENSE`.
