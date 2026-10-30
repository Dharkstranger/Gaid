# Prompt for the Galleris session (30 October 2026)

Paste everything inside the box into the Galleris chat.

```
GAID → Galleris: sync and debate, 30 October 2026

You are the Galleris session. This comes from the GAID session, through the
owner. Read all of it, then DEBATE it before building anything: for every
numbered point below, answer AGREE, DISAGREE (and why), or PROPOSE (a better
way). Then list risks, then the order you would build in. Do not build
anything that changes the GAID–Galleris contract until the owner confirms
your reply. The owner relays your reply back to GAID.

Ground rules that do not change:
- Galleris stays private. No Galleris code goes into GAID. GAID reads only
  what Galleris publishes, plus the calls listed below.
- GAID's live site and main branch are frozen at 17 October for hackathon
  judging. GAID's new work is on its `voices` branch. Galleris builds behind
  the `gaid` feature switch.
- Every database change goes in docs/ops/production-log.md, as always.
- Conversations start in English. Other languages come later.

THE GOAL (owner's words): a visitor holds a full conversation with an
artwork, in the artist's own voice, from inside Galleris. It feels alive and
human, knows everything the gallery fed it, never invents anything, takes
actions, gives directions, and sends what it could not answer and what was
talked about back to the curator, who can also test it at any time.

THE OWNER'S DECISIONS (closed; GAID's docs/DECISIONS.md)
- Voices: GAID runs its own voice engine (open model, Chatterbox, MIT; on
  Modal). ElevenLabs is dropped. A voice ID is made only with consent and only
  if the copy passes a likeness test (90% as like the person as they are to
  themselves, measured on held-back recordings). A failed copy is deleted.
- Whose voices: living people who verify themselves (they read a consent
  sentence aloud, checked against their recordings), or estates with written
  permission for people who have died.
- What a voice may say: any GAID answer, including Amazon Nova's wording.
- No credit and no "Generated voice" mark, aloud or on screen. Please update
  your 16 October handover, section 5.4, which says otherwise.
- Who speaks (D9): first person ("I painted this") ONLY for the artist's own
  written words; a narrator in the artist's voice ("Ada painted this") for
  everything else.
- Plan (D8): the artist's voice is for paid plans only, as GAID is today
  (plan: paid AND gaid.on AND a valid publishedAt).
- Speed (D11): when a gallery publishes, GAID pre-records each work's
  introduction and the artist's own answers, so they play instantly. Only
  unexpected questions wake the engine.
- Never invent (D16): every Amazon Nova answer is checked sentence by
  sentence against the gallery's words; anything unsupported is removed.
- Memory (D13): for the whole visit, on the visitor's phone only.
- Interrupting (D12): the visitor can cut GAID off mid-sentence.
- Actions (D20): go to a work, play a recording, message the gallery
  (WhatsApp or email, the visitor presses send), show on the TV or a map.
  Never take money, never book or hold a place.
- Directions (D21): latitude and longitude outdoors and between buildings;
  room and floor indoors. Indoor beacons later.
- The curator sees (D18): unanswered questions AND whole conversations, with
  nothing about who asked. Kept 180 days. Phone numbers and email addresses a
  visitor says are removed before anything is kept. Visitors are told in one
  line on screen and in the privacy notice (D22).
- Curator testing (D19): a "Try it" panel in the studio, including
  unpublished drafts, which GAID never stores.

WHAT GALLERIS WOULD BUILD (debate each)
1. Artist voice in the studio. On an artist: "Voice" — invite the artist,
   who records at least one minute and reads the consent sentence live; the
   signed form's number is kept by Galleris. GAID's form texts are in its
   repository: docs/legal/voice-consent.md and estate-permission.md.
2. Publish voice records. In the published document:
     voices: [{ id, name, provider: "gaid", voiceId: "gv" + 16 hex,
                languages: ["English"],
                consent: { kind: "self" | "estate", at: "YYYY-MM-DD", ref },
                check: { passed: true, similarity, at },
                withdrawn: false }]
     voice: "<id>"                 on the gallery (its default voice)
     artists[].voice: "<id>"       the artist's voice
     pieces[].voice: "<id>"        optional, overrides the artist's
   Never publish audio, and never the consent recording. Withdrawing sets
   withdrawn: true and publishes; GAID stops within a minute.
3. Mark the artist's own words, so first person is used only for them.
   Proposal: artists[].statement (up to 2,000 characters), and faq rows
   carry by: "artist" | "gallery" (default "gallery").
4. The conversation screen on each work (Ask), Galleris's own screen.
   It calls GAID; GAID will accept calls from gallerismuseum.com only.
     POST https://<gaid>/api/ask
       { slug, at, lang: "English", question, history: [{role, text}],
         offered: boolean }
     → { ok: boolean, answer, sources, unknown, action, enquire, seal }
     POST https://<gaid>/api/speak  { voice: <seal>, lang }
     → audio/mpeg, or 204 meaning "use the phone's voice"
   Speech to text on the phone (the browser's own). Interrupting stops the
   audio. ok must be a boolean; any failure shows nothing broken, only the
   gallery's WhatsApp. Timeout 8 seconds for text; audio streams per sentence.
5. Tell GAID when a gallery publishes, so it can pre-record.
   Proposal: Galleris calls POST https://<gaid>/api/prepare { slug, key }
   after a publish; GAID checks the edit key and records in the background.
   Alternative: GAID notices a new publishedAt itself within a minute.
6. Curator: "Asked, not answered" and "Conversations".
     GET https://<gaid>/api/unanswered?slug=&key=
     GET https://<gaid>/api/conversations?slug=&key=&since=
   GAID checks the edit key the way Galleris does (sha256). This needs one
   narrow database function in Galleris's Supabase project that tells GAID
   whether a key hash matches a slug, and nothing else. A wrong key and an
   unknown gallery answer the same. The curator answers a question by adding
   a faq row and publishing; GAID uses it within a minute.
7. Curator "Try it" in the studio, including drafts:
     POST https://<gaid>/api/ask { ..., draft: <the whole document>, key }
   GAID answers from the draft and stores nothing from it.
8. Directions. Optional coordinates:
     locations[]: lat, lng (the room's or building's)
     pieces[]: lat, lng (outdoor works only)
   GAID gives walking direction and distance outdoors; room and floor
   indoors, starting from the label the visitor scanned.
9. Privacy. One line on the conversation screen, for example
   "Conversations are shared with the gallery, without your name", and the
   privacy notice updated (Galleris's and GAID's), 180 days.
10. Two small fixes already owed: remove the "Generated voice" mark from the
    handover (5.4), and add a WhatsApp number to the Open Access demo so the
    Enquire button shows.

QUESTIONS FOR YOU TO SETTLE OR CHALLENGE
a. Should Galleris's server, not the visitor's browser, call GAID (hiding
   GAID's address and adding rate limits per gallery)? Cost: one more hop.
b. Should voice enrolment happen on Galleris's own page (calling GAID's
   engine with a pass Galleris gets using the edit key) or on GAID's /voice
   page with an invitation? GAID's page exists today.
c. Is 180 days right for whole conversations under the NDPA for your
   clients? Is "without your name" enough notice?
d. Anything in the published document today that GAID should read and does
   not, or should NOT read and does?
e. What you would cut if this had to ship in two weeks.

Reply in this shape:
  1 AGREE | DISAGREE | PROPOSE — one or two sentences
  … through 10
  a–e answers
  RISKS
  BUILD ORDER for Galleris, with what you need from GAID first
```
