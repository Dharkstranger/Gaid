# Voices: whose voice GAID speaks in

*Owner, 27 October 2026: "Let history be told, and let people have
conversations in the voices of the people who own them."*

People upload the voices they want heard: an artist, a curator, or a family
speaking for somebody who has died. Each voice becomes a **voice ID**. GAID
reads which voice a gallery chose for a work and speaks in it.

## The owner's decisions (27 October)

| Question | Decision |
|---|---|
| Whose voices may be uploaded | Living people who prove the voice is their own; people who have died, only with written permission from their estate |
| What a voice may say | Any of GAID's answers, including Amazon Nova's wording |
| Which service makes the voice ID first | ElevenLabs now; GAID's own open model later |
| Credit on screen or aloud | None |

**Because of the last two decisions, the consent form must say so in plain
words** (section 4). A person agrees to exactly what will happen, or not at all.

**The EU's rule, recorded so nobody is surprised.** Since 2 August 2026,
Article 50 of the EU AI Act requires anyone who publishes AI-made audio that
imitates a real person to disclose it. For artistic work the disclosure may be
discreet, but it is required. Under the decision above, GAID shows no credit.
A lawyer should confirm this before GAID is offered to galleries or visitors
in the EU. Sources:
[SRD Rechtsanwälte](https://www.srd-rechtsanwaelte.de/en/blog/deepfake-labelling-under-the-ai-act-what-the-new-eu-guidance-clarifies),
[Kovrr](https://www.kovrr.com/glossary-ai/eu-ai-act-article-50-transparency-obligations).

---

## 1. What is built (Stage 1, the voice library): `lib/voices.js`

A gallery publishes its voices. GAID never makes, stores or edits a voice; it
only reads which one to use.

```js
"voices": [{
  "id": "ada",
  "name": "Ada Obi",
  "provider": "elevenlabs",
  "voiceId": "AdaVoice0001",
  "languages": ["English"],
  "consent": { "kind": "self", "at": "2026-10-20", "ref": "consent-001" },
  "check": { "passed": true, "similarity": 0.88, "at": "2026-10-21" },
  "withdrawn": false
}],
"voice": "curator"                     // the gallery's own voice
"artists": [{ "id": "a1", "voice": "ada" }]
"pieces":  [{ "id": "w1", "voice": "ada" }]
```

**Which voice speaks a work's words:** the work's own voice, then its artist's,
then the gallery's, then GAID's default (ElevenLabs `GAID_VOICE_ID`, then Amazon
Polly, then the phone).

**A voice speaks only when every one of these is true.** Each has a test in
`test/voices.test.js`, and each test was proven by putting the bug back.

| Rule | Test |
|---|---|
| A consent record exists: `self` or `estate`, a date, and a reference to the signed form | `no-consent` |
| It passed the likeness test (`check.passed` is exactly `true`) | `not-checked` |
| It has not been withdrawn | `withdrawn` |
| It speaks the language asked for | `language` |
| Its voice ID looks like one from its service | malformed records are dropped |
| The gallery and work come from GAID's signed seal, never from the request, so one gallery's voice cannot read another gallery's words | "chosen from the seal" |

**Withdrawal takes effect within a minute.** The owner sets `withdrawn: true`
and the gallery publishes. GAID reads every gallery again once its copy is a
minute old. To finish, the owner also deletes the voice at ElevenLabs
(section 3).

**Requirement for ElevenLabs voices.** The voice must be in, or shared with,
the ElevenLabs account whose key is `ELEVENLABS_API_KEY`. A voice ID from
somebody else's account will be refused.

---

## 2. Stage 2: GAID's own voice engine (built 28 October, on the `voices` branch)

Owner, 28 October: "ElevenLabs is too expensive; do ours." Training a voice
model from nothing needs thousands of hours of speech and large computers.
GAID instead runs its **own engine on an open model**, with no per-use fee:

| Part | What | Licence |
|---|---|---|
| Copying and speaking | Chatterbox Multilingual, Resemble AI (pypi `chatterbox-tts` 0.1.7) | MIT |
| Likeness fingerprints | ECAPA-TDNN on VoxCeleb, SpeechBrain (`speechbrain/spkrec-ecapa-voxceleb`) | Apache-2.0 (check the model card before commercial use) |
| Where it runs | Modal, a T4 GPU that switches off when idle (`voice/modal_app.py`) | — |

Every clip the engine makes carries Resemble's **inaudible Perth watermark**.

**Languages:** the 23 Chatterbox speaks, among them English, French and
Swahili. Pidgin is spoken as English. **Yoruba, Igbo and Hausa are not among
them**; those wait for Stage 4.

### How a voice is made (`voice/engine.py`), and each rule's test (`voice/tests/`)

1. On `/voice`, the person fills in the consent (section 4). Then they record
   or upload at least a minute of speech: the page gives a passage to read.
   **Refused under a minute** (`too-short`).
2. A living person then **reads the consent sentence aloud, live**. The engine
   checks that it is the same voice as the recordings, by the same 90% bar as
   the copy. **Refused if somebody else reads it** (`consent-voice-differs`). An
   estate signs instead (`kind: estate`).
3. The speech is cut into five-second pieces. **Every third piece is held back**
   and never shown to the copier.
4. The two neighbouring pieces most like the person, the clearest ten seconds,
   become the reference the copier speaks from.
5. The copy says three test sentences. The likeness test (section 3) compares
   them with the held-back pieces. **A copy that fails is deleted, and nothing
   of it is kept** (`not-alike`).
6. A pass gives a **voice ID** (`gv` + 16 hex characters, random) and the voice
   record to publish (section 1, `provider: "gaid"`).

**Who may make one:** a person with the invitation the owner gives out
(`GAID_VOICE_INVITE`). GAID's server gives their browser a pass that lasts half
an hour (`/api/voice-ticket`), and the recordings go from the browser straight
to the engine. The engine's secret never reaches a browser.

**Withdrawing:** `/voice` → Withdraw (`/api/voice-withdraw`) deletes the copy,
the reference, the held-back pieces and the consent recording from the engine.
The gallery also marks the record `withdrawn`, which stops GAID within a minute.

### Setting it up (the owner, about 20 minutes)

1. Make an account at modal.com (the free plan), and install Modal's tool: `pip install modal`, then `modal setup`.
2. Make a long random secret, and keep it out of chats and the repository.
3. `modal secret create gaid-voice GAID_VOICE_TOKEN=<secret> GAID_SITE=<GAID's address>`
4. From the repository, on the `voices` branch: `modal deploy voice/modal_app.py`. Modal prints the engine's address.
5. In Vercel (preview, for the `voices` branch), set `GAID_VOICE_URL` (the address), `GAID_VOICE_TOKEN` (the same secret) and `GAID_VOICE_INVITE` (an invitation word).
6. Open `/voice` on the preview, and make your voice.
7. Put the voice record it prints into `GAID_VOICES` in Vercel, for example
   `{"openaccess":{"voice":"emeka","voices":[ <the record, with "id":"emeka"> ]}}`.
   GAID's demo gallery then speaks in your voice.

**The first request after the engine has been idle** waits while the GPU starts
and loads the models, about a minute. GAID does not make the visitor wait: after
15 seconds the Amazon voice, then the phone, speaks instead. The voice is cached
once spoken.

### A person who has died (estate permission)

The live consent check is impossible, so the estate signs
`docs/legal/estate-permission.md`, and the gallery must hold the rights to the
archive recordings. Recordings of one speaker, at least a minute, as clean as
the archive allows. The likeness test applies in full.

## 3. "The exact replica": the likeness test

No copy can be promised as exact. A copy can be measured, and one that fails
is never used. Both parts must pass.

**Part 1: by machine.**
1. Hold back 10 real sentences the person spoke, which are never used for training.
2. Have the copied voice say the same 10 sentences.
3. A speaker-verification model turns each clip into a voice fingerprint.
4. **The bar:** first measure how alike the person is to themselves, across two sets of their own real recordings. That is the ceiling. The copy must score at least **90% of that ceiling**.
5. Recorded as `check.similarity`.

**Part 2: by ear.**
1. At least 5 people who know the person's voice hear 20 clips, 10 real and 10 copied, mixed, and mark each one "real" or "copy".
2. **The bar:** they get no more than 60% right. 50% is pure guessing.
3. The result goes into the consent file, with the date.

**Run again** every time the voice is remade, and whenever the model changes.
Part 1 is built into the engine (`voice/likeness.py`); every enrolment runs it.
Part 2, the listener test, is not built yet: it needs a page that plays
real and copied clips in a random order and records the answers.

---

## 4. Consent: what the forms must say

A lawyer must review these before use. Commentators read the Nigeria Data
Protection Act 2023 as treating biometric data as sensitive data, which needs
explicit consent (section 30). Whether a voice is biometric data under the Act
is not settled
([Hogan Lovells](https://www.hoganlovells.com/en/publications/key-changes-brought-by-the-nigerian-data-protection-act-2023),
[FPF](https://fpf.org/blog/nigerias-new-data-protection-act-explained/)).

**The voice owner's form must state:**
- the copy of their voice will speak GAID's answers, including wording written by Amazon Nova, an AI model, from the gallery's words;
- GAID will not announce, aloud or on screen, that the voice is a copy;
- which galleries may use it, and for how long;
- that they can withdraw at any time, how, and that it stops within a minute of the gallery publishing the change;
- what happens to the recordings and the voice at ElevenLabs when they withdraw.

**The estate's form must also state:** who signs, on what authority, and that
the gallery holds the right to use the archive recordings.

**The consent sentence read aloud:** "I am [name]. I agree that GAID may speak
in a copy of my voice, as set out in the form I signed on [date]."

---

## 5. Stage 4: GAID's own translation for Nigerian languages (not built yet)

**The size of it.** Ethnologue counts 520 living languages in Nigeria
([Ethnologue](https://Ethnologue.com/country/NG)). Large datasets exist mainly
for Yoruba, Igbo and Hausa. The largest, NaijaVoices, has about 600 hours of
each, but its licence (CC BY-NC-SA) forbids commercial use
([NaijaVoices](https://www.isca-archive.org/interspeech_2025/emezue25_interspeech.html),
[African speech survey](https://arxiv.org/pdf/2505.18436)). Smaller languages
such as Ibibio and Efik are missing from the main translation tests
([Ibom NLP](https://arxiv.org/abs/2511.06531v1)).

**So every language is reached through contributions, one at a time.**
1. **A contribution page:** record a sentence, translate a sentence, check somebody else's.
2. **Data licence:** everything contributed is released under one open licence that allows commercial use, agreed by each contributor.
3. **Order of languages:** Yoruba, Igbo, Hausa and Nigerian Pidgin first; then any language whose community brings enough sentences.
4. **The model:** built on an open base model whose own licence allows commercial use. Several popular ones do not; each licence is read before use.
5. **A language switches on in GAID only when it passes:** native speakers rate translations of a held-back test set, and the score must meet a published bar.

**Needs:** a rented computer with a GPU (a monthly cost, to be priced before
this stage), native-speaker reviewers per language, and a contributor agreement.

---

## 6. Everything required, in one list

| Need | Who | Status |
|---|---|---|
| Modal account (free plan), the `gaid-voice` secret, `modal deploy` (section 2) | owner | not done |
| `GAID_VOICE_URL`, `GAID_VOICE_TOKEN`, `GAID_VOICE_INVITE`, then `GAID_VOICES` in Vercel | owner | not set |
| A minute or more of the owner's speech, and the signed consent form | owner | — |
| Voice consent form and estate permission form | drafted (`docs/legal/`); a lawyer to review | drafted |
| AWS keys for the default Amazon voice | owner | not set |
| ElevenLabs | not needed any more; optional for anybody running GAID | — |
| Galleris: upload, consent and voice records in the published file (section 1) | Galleris | not built |
| Likeness test, by machine (section 3) | GAID | built, in every enrolment |
| Listener test page (section 3) | GAID | not built |
| Listeners for each voice | owner, gallery | — |
| Contributor agreement and GPU for the translation model (section 5) | owner | to be priced |
| Native-speaker reviewers per language | contributors | — |
