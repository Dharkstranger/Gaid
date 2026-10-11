# GAID backlog

**Read this first, every session.** Then `CLAUDE.md`. Update it when anything moves.
Last updated: 11 October 2026.

## North star

| | |
|---|---|
| **Goal** | Win the Alexa+ track of "Build, Ship, Shape". Be remembered. |
| **Outcome** | Judges, galleries and Amazon want GAID + Galleris in their museums, galleries and Alexa. |
| **Deadline** | 23 Oct 2026, 12:00 Pacific = 20:00 Lagos. Aim: submit 21 Oct. |
| **Judged on** | Technical build, design, potential impact, quality of the idea (third-party listing; confirm on Devpost). |

## Outputs to submit (Devpost)

- [x] Public repo, open-source licence (MIT)
- [x] Live site: https://gaid-taupe.vercel.app (11 Oct; not openable from this container)
- [ ] Demo video, under 3:00, English, public — the four moments
- [ ] Description (`docs/submission.md`) — rewrite for the four moments
- [ ] Feedback on Amazon tools — owner's own words
- [ ] Team on Devpost: Emeka Ugochukwu, Obianuju Nnadi

## Now — finish the project

1. **Architecture: GAID's server is the only door** (`docs/architecture.md`). Approved? → build.
   - [x] Public access to the two database functions revoked (11 Oct)
   - [x] Functions require GAID's own server secret (applied 11 Oct; refuse all until the hash is set)
   - [ ] Set `GAID_DB_SECRET` + `GAID_SIGNING_SECRET` in Vercel, hash in `gaid.settings` — when Vercel is connected
   - [x] Phone → TV messages signed by GAID's server; TV shows only signed words (forged: dropped, checked)
   - [x] Rate limit per caller: /api/mcp 120/min, /api/ask 120/min, /api/seal 240/min, Nova 20/min
1b. **Galleris curators choose GAID** (owner, 11 Oct). Decided: **off by default; paid plans only;
   an Ask button on each object; after the gateway.**
   - [ ] Galleris studio: "Voice guide" panel, GAID switch → `gaid: { on }` in the published file
   - [x] GAID gateway: answers only galleries with `plan: paid` AND `gaid.on`; GAID's demos always on (judged by address, not by the file's own name)
   - [ ] Galleris visitor app: Ask button on each object → GAID at that work
   - [ ] Galleris dashboard: the curator's "Asked" list (edit key, through GAID)
   - [ ] Switch off: stops within a minute; offer to delete stored questions
   - [ ] Switch text says the gallery's words go to Amazon Nova
1c. **GAID, voice-first, end to end** (owner, 11 Oct; `docs/product.md`)
   - [x] Phone: work full screen, one ▶/talk, voice as movement, icons not words, captions behind one icon
   - [x] Three words: the visit as one word per work; `recall_visit` takes words
   - [x] Where next?: next work and why; phone + TV point the way; MCP tool
   - [x] Look closer: the story sentence by sentence; the picture moves to each spot (phone + TV)
   - [x] Pidgin + Yoruba: Nova translates; Pidgin by phone voice; no voice → said so, then English
   - [ ] Yoruba recording on one work (owner, in Galleris studio) — needs a person
   - [x] TV: pictures only (pairing code the one exception)
   - [x] Echo Show at home: voice-first, three words
   - [x] Said once, first time: "I only tell you what the gallery wrote"
   - [x] Footer text off the visitor's screens; "Not an Amazon product" on /about
   - [x] /design rebuilt on the new identity (motion: eyes up, look closer)
   - [ ] TV shows a code to scan (QR) as well as type
2. [ ] Deploy to Vercel — needs owner: reconnect connector
3. [ ] Amazon Bedrock key in Vercel — needs owner
4. [ ] Test the live site end to end: four moments, phone + TV on two devices, Nova answer
5. [ ] Video: script, screen footage (Claude), voice-over (owner)
6. [ ] Description + feedback (owner's words, Claude types)
7. [ ] Submit

## Next — after the project works (owner, 11 Oct)

- [x] **Design must not look AI-made** (done 11 Oct). Talking drum mark, danfo yellow/black on
      gallery-wall white, Big Shoulders Display, "Eyes up". Tokens, logo, fonts, /design,
      docs. axe zero on every page; yellow never text or edge (test).
- [ ] Recorded audio guide on one work (owner's voice) — the video's best moment
- [ ] Yoruba translation on one work — "say it in Yoruba" for real

## Owner to do

- [ ] Merge Galleris branch `claude/nga-photos`: 24 open-access paintings for the `openaccess` demo (fetched by a GitHub runner, 11 Oct)
- [ ] Bedrock: needs an AWS account (not the Amazon Developer one) — or submit without Nova

- [ ] Bedrock key → Vercel
- [ ] GitHub → gaid → Settings → Security → private vulnerability reporting ON
- [ ] Merge Galleris branch `claude/gaid-questions-log`
- [ ] Devpost: register, Alexa+ track, add Obianuju
- [ ] Voice-over; three answers in own words; Submit

## Watch for

- Commit e4a0acd carries a wrong message (a tangled shell command); its files are right:
  the backlog, `docs/architecture.md`, the lock migration. Not rewritten: it is on `main`.
  Lesson: one heredoc per shell command, never two.

- Shared database with Galleris: GAID's load and mistakes are Galleris's too. Move GAID
  to its own project when a slot frees (pause `vibes-arena` or upgrade).
- This container cannot reach Supabase, Vercel or Devpost: anything there is checked
  against stand-ins until the live site exists. Say so; never claim it.
