# GAID decision register

**Every open question lives here until it is closed.** Owner, 30 October
2026: "Keep track of every single open decision and make sure that it is
closed, whether we are doing it or not or in the future."

**How it works**
- Every question gets a number (D1, D2 …) the moment it is raised, in chat or
  in code. Numbers are never reused.
- A decision is **Open** until the owner closes it, as one of:
  **Doing** (with what and when), **Not doing** (with why), or
  **Later** (with the date or the event that reopens it).
- An **Action** is a decision already made that still needs somebody to do
  something. It closes when it is done.
- Every session reads this file first, after `docs/BACKLOG.md`, and every
  answer to the owner that leaves a question open adds it here.
- Closed items move to the bottom with the date and the owner's words.

Last updated: 30 October 2026.

---

## Open: decisions the owner must make

| # | Question | Options | Recommended | Raised |
|---|---|---|---|---|
| D1 | What may GAID learn from visitors? | (a) signals only: how long people listened, asked again, thumbs up or down; (b) also the wording of questions, with nothing about who asked | (a), then (b) once the privacy notice says so | 30 Oct |
| D2 | What comes first: the integration kit or the learning loop? | kit / learning / both | Conversations in the artist's voice first (D9–D14), then the kit, then learning | 30 Oct |
| D3 | Where does post-deadline work happen? | `voices` branch until judging ends / `main` | `voices` branch | 28 Oct (assumed since; not confirmed in words) |
| D4 | When does judging end, so `voices` can be merged and production promoted? | a date from Devpost | — | 28 Oct |
| D6 | GAID's default voice when no artist voice is set | Amazon Polly (needs AWS keys) / a GAID-engine voice the owner chooses / the phone | A GAID-engine voice: no AWS needed, one bill | 30 Oct |
| D7 | Tagline: "GAID: making history talk back" | use in submission, video and site / not | Use it | 17 Oct |
| D14 | Which languages after English, and in what order? | Yoruba, Igbo, Hausa, Pidgin, then contributions | That order; English first (owner, 30 Oct) | 27 Oct |
| D15 | The licence for contributed language data | CC BY 4.0 / CC0 / other | CC BY 4.0: anybody may use it, credit kept | 27 Oct |

## Open: actions (decided; somebody must do something)

| # | Action | Who | Status |
|---|---|---|---|
| A1 | Add the three GitHub secrets (Modal ID, Modal secret, GAID password) so the voice engine can be put on Modal | owner | not done (checked 30 Oct) |
| A2 | Vercel preview settings for the engine, then record the owner's voice | owner, after A1 | waiting on A1 |
| A3 | A lawyer reviews the voice consent and estate forms (`docs/legal/`) | owner | not started |
| A4 | A lawyer confirms the EU position on no credit for a copied voice (Article 50) | owner | not started |
| A5 | Galleris updates its handover: no "Generated voice" mark (owner's decision, 14 and 27 Oct) | Galleris session | not done |
| A6 | Galleris adds a WhatsApp number to the Open Access demo, so "Enquire" shows | Galleris session | not done |
| A7 | Galleris publishes `voices` and `voice` on the gallery, artists and works (`docs/voices.md` §1) | Galleris session | not built |
| A8 | After judging: merge `voices` into `main` and promote production in Vercel (the rollback stopped automatic promotion) | Claude, when D4 is known | waiting on D4 |
| A9 | Listener test page (people who know a voice judge real against copied) | Claude | not built |
| A10 | Price the GPU for the Nigerian-language model | Claude | not started |
| A11 | AWS keys for Amazon Polly, if D6 keeps Polly | owner | depends on D6 |
| A12 | Website or founder of "Whisper 360", to research the competitor | owner | not given |
| A14 | Send `docs/galleris-prompt.md` to the Galleris session; bring its reply back to GAID | owner | prompt ready 30 Oct |
| A13 | Confirm the Devpost submission was made, with the video and the team | owner | not confirmed here |

## Closed

| # | Decision | Outcome | Date |
|---|---|---|---|
| C1 | Use ElevenLabs for copied voices | **Not doing**: too expensive (owner, 28 Oct). Kept as an optional drop-in for anybody running GAID | 28 Oct |
| C2 | Build GAID's own voice engine | **Doing, done**: Chatterbox (MIT) + ECAPA likeness, on the `voices` branch | 28 Oct |
| C3 | Where the engine runs | **Doing**: Modal, free plan | 28 Oct |
| C4 | Freeze the live site at the deadline | **Done**: `main` and production at 17 Oct (b38bcc5) | 28 Oct |
| C5 | First voice to copy | **The owner's** | 28 Oct |
| C6 | Whose voices may be uploaded | **Living people who verify themselves, and estates with written permission** | 27 Oct |
| C7 | What a copied voice may say | **Any GAID answer**, including Amazon Nova's wording | 27 Oct |
| C8 | Credit for a copied voice | **None**, aloud or on screen (A4 checks the EU position) | 27 Oct |
| C9 | What GAID says it is | **"A living label"**: never "an AI", never a person | 17 Oct |
| C10 | AI disclosure on screen | **None** (owner, 14 Oct) | 14 Oct |
| C11 | The answering model | **Amazon Nova through Vercel's AI Gateway** | 14 Oct |
| C12 | The Galleris handover rules: for sale, drafts, contact offered once, two sentences, `/api/ask` reply shape | **Done** | 17 Oct |
| C13 | First conversation language | **English** (owner, 30 Oct) | 30 Oct |
| D8 | Artist's voice on which Galleris plans | **Paid plans only**, as GAID itself | 30 Oct |
| D9 | Who speaks in the artist's voice | **Mixed**: first person ("I painted this") for the artist's own written words; a narrator in their voice ("Ada painted this") for everything else | 30 Oct |
| D10 | How Galleris shows the conversation | **Galleris's own screen**, calling GAID behind it; GAID's server accepts Galleris's site only | 30 Oct |
| D5 | Unanswered questions back to the curator in Galleris (behind the edit key) | **Doing** (owner, 30 Oct: "send all the things it couldn't answer back to Galleris so the curator can view and update") | 30 Oct |
| D16 | Never invent a fact | **Doing** (owner, 30 Oct: "It just never hallucinate"). Method: a second check on every Amazon Nova answer, sentence by sentence, against the gallery's words; anything not supported is removed, and a fixed set of trick questions is run on every change to measure it | 30 Oct |
| D12 | Interrupting GAID mid-sentence | **Yes** | 30 Oct |
| D13 | Conversation memory | **The whole visit, on the phone only**, never on the server | 30 Oct |
| D18 | What the curator sees about conversations | **Whole conversations**, with nothing about who asked (owner, 30 Oct). How long they are kept and what visitors are told: D22 | 30 Oct |
| D19 | Curator testing in Galleris | **Yes, unpublished drafts too**, sent with the edit key and never stored | 30 Oct |
| D20 | Actions GAID may take | **Doing:** go to a work, play a recording; message the gallery; show on the TV or a map. **Not chosen:** save for later (Take home already does it). **Never:** take money, book or hold a place | 30 Oct |
| D21 | Directions | **Doing:** latitude and longitude outdoors and between buildings; room and floor indoors. **Later:** indoor beacons | 30 Oct |
| D22 | Keeping whole conversations | **180 days; one line on screen and in the privacy notice; phone numbers and emails removed** (owner, 30 Oct: "Okay" to the recommendation) | 30 Oct |
| D11 | Avoiding the wait when the engine is idle | **Pre-record** each work's introduction and the artist's own answers when the gallery publishes; wake the engine only for unexpected questions | 30 Oct |
