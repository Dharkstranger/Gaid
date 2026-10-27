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

## 2. Stage 2: from upload to voice ID (not built yet)

### A living person (ElevenLabs Professional Voice Cloning)

ElevenLabs' requirements, from its own documentation
([Professional Voice Cloning](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning),
[voice cloning](https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning)):

| Need | Detail |
|---|---|
| Audio | 30 minutes at the very least; 2 to 3 hours recommended for the closest copy. One speaker, no music, no echo, no other voices |
| Proof it is them | The person reads a prompt aloud live, and ElevenLabs compares it with the uploaded samples. Nobody can do this for somebody else |
| Plan | Creator or above (the current account refuses with "payment required") |

Steps:
1. The person signs the consent form (section 4) and reads the consent sentence aloud. That recording is kept with the form.
2. Upload the audio, then pass ElevenLabs' live check.
3. ElevenLabs trains the voice, which produces the voice ID.
4. Run the likeness test (section 3). Only a pass sets `check.passed: true`.
5. The gallery publishes the voice record. GAID uses it on the next question.

### A person who has died (estate permission)

The live check is impossible, so Professional Voice Cloning is not available.

1. The estate signs the permission form (section 4). The form names who may give permission and how that right is shown.
2. Use real recordings: archive interviews, speeches, broadcasts. The gallery must also hold the right to use those recordings.
3. Make the voice ID with ElevenLabs' Instant Voice Cloning (shorter samples), or later with GAID's own model. Instant copies are usually less exact, so the likeness test matters more here, not less.
4. Likeness test, then publish with `consent.kind: "estate"`.

---

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

**Run again** every time the voice is retrained, and whenever the service changes
its model. Tooling for Part 1 is to be built in Stage 2, on a GitHub runner,
because this container cannot reach ElevenLabs.

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
| ElevenLabs Creator plan or above | owner | refusing: payment required |
| `ELEVENLABS_API_KEY` in Vercel | owner | set |
| AWS keys for the default Amazon voice | owner | not set |
| Voice consent form, estate permission form, contributor agreement | owner, with a lawyer | not written |
| Galleris: upload, consent and voice records in the published file (section 1) | Galleris | not built |
| Likeness test tooling (section 3) | GAID, Stage 2 | not built |
| Listeners for each voice | owner, gallery | — |
| GPU for the translation model | owner | to be priced |
| Native-speaker reviewers per language | contributors | — |
