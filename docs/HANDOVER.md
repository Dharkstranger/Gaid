# GAID: handover brief

Paste this into a new chat to carry on.

## The job
Build and submit **GAID** to the Amazon "Build, Ship, Shape" hackathon,
**Alexa+ track**, as a simulated Alexa+ experience in a web app.
- Deadline: **23 October 2026, 12:00 Pacific = 20:00 Lagos.**
- Entry needs: a public GitHub repo with an open-source licence (done: MIT),
  a demo video under 3 minutes, a description, and feedback on the Amazon tools.
- The track details came from third-party listings; confirm on the official
  Devpost page (amazonappdev2026.devpost.com) that the Alexa+ track accepts a
  simulated web app.
- Team: Emeka Ugochukwu and Obianuju Nnadi, Hoo Socials Limited, Lagos.

## What GAID is
A voice guide for galleries. You stand in front of a work and say "Alexa, tell
me about the work in front of me". GAID answers with the gallery's own story of
that work, plays the recording if there is one, and takes follow-ups: who made
it, when, what it's made of, how big, where am I, what else is here, "take me
to <title>", "say it in <language>".

It reads a gallery published with Galleris (gallerismuseum.com), the owner's
own product. The Galleris repository is private and must stay private; no
Galleris code is copied into GAID. GAID reads only the public published file.

## Where the code is
https://github.com/Dharkstranger/gaid, branch `main`. Already contains:
- `public/` — the page (index.html, app.js, style.css, icon.svg). No build step.
- `api/gallery.js` — GET `/api/gallery?slug=sample`: loads and slims a published gallery.
- `api/ask.js` — POST `/api/ask` `{slug, workId, question, lang, history}` → `{ok, say, action, source}`.
- `lib/gallery.js` — reads `https://gallerismuseum.com/demos/<slug>.json`, then the
  public bucket `https://gudymczklujytsozwrsy.supabase.co/storage/v1/object/public/museums/<slug>.json`.
  `GALLERIS_LOCAL_DIR=fixtures` reads a local copy instead (for tests).
- `lib/answer.js` — answers the common questions by rule from the gallery's words.
- `lib/bedrock.js` — anything else goes to Amazon Nova Lite (`us.amazon.nova-lite-v1:0`)
  through the Bedrock Converse API, told to use ONLY that gallery's facts and to say
  "the gallery has not said" rather than guess. Every failure returns null and GAID
  falls back to the gallery's words.
- `lib/limit.js` — at most 20 model questions per caller per minute (`GAID_PER_MINUTE`).
- `dev.mjs` — local server. `GALLERIS_LOCAL_DIR=fixtures npm run dev` → http://localhost:5173/?gallery=sample
- `test/` — 27 tests, `npm test`, no network needed. Six were proved by putting the bug
  back (wake word kept, missing artist invented, brake removed, grounding instruction
  removed); each made a test fail.
- `vercel.json` — serves `public/`, sets a strict Content-Security-Policy, allows the microphone.
- `docs/aws-setup.md`, `docs/video-script.md`, `docs/submission.md` (Devpost draft).

Address format: `/?gallery=<galleris link name>&at=<work id>` — the same work id a
Galleris wall-label code carries.

## Settings (Vercel → Project → Settings → Environment Variables)
| Name | What |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | a Bedrock long-term API key (simplest) |
| or `GAID_AWS_ACCESS_KEY_ID` + `GAID_AWS_SECRET_ACCESS_KEY` | a key pair allowed only `bedrock:InvokeModel` (not the plain `AWS_` names, which Vercel keeps for itself) |
| `GAID_AWS_REGION` | default `us-east-1` |
| `GAID_MODEL_ID` | default `us.amazon.nova-lite-v1:0` |
Never paste a key into a chat, the code or the repo.

## Done
- The page, both functions, the rule answers, the Amazon Nova path, the brake, 27 tests, and the screen beside the work (`/screen.html`).
- Checked in a browser at 390px and 1280px: no accessibility faults (axe-core), nothing
  wider than the screen, answers appear and are read aloud.

## Not done, in order
1. **Owner:** Vercel → Add New → Project → import GAID → Deploy. Note the link.
2. **Owner:** Amazon key, per `docs/aws-setup.md`, into Vercel; redeploy.
3. **Check the live site:** `/?gallery=sample` loads 9 works; "Who made it?" answers
   "Adaeze Obi…" (from the gallery); "Why those colours?" shows "Answered by Amazon Nova".
   Never tested end to end yet: there was no key, and the build machine could not reach
   gallerismuseum.com.
4. **Owner:** register on Devpost, confirm the Alexa+ track, add Obianuju to the project.
5. **Video** under 3:00 from `docs/video-script.md`: screen recording of the live site,
   voice over by a person.
6. **Description:** finish `docs/submission.md`; the three [TO FILL IN] parts (challenges,
   what we learned, feedback on the Amazon tools) must be the team's own words.
7. **Submit on Devpost** before 23 Oct, 12:00 Pacific.

## Worth adding if there is time (in this order)
- A recorded audio guide on one work, so the video plays a real voice, not the browser's.
- A Yoruba translation on one work, so "say it in Yoruba" shows the real thing.
  (Both live in the Galleris studio: record and translate there, publish, and GAID reads them.)
- A wall-label code on screen that opens `?at=<work id>`, to show the scan → ask moment.

## Rules to keep
- Answers come from the gallery's words; the model never invents names, dates, prices or owners.
- Nothing in the plumbing turns a visitor away: every failure falls back, never an error screen.
- Plain words on screen. No Amazon logos; it says "Simulated Alexa+ experience" and
  "Not an Amazon product".
- Nothing stored about visitors. Chrome's speech recognition is Google's; the page says so.
