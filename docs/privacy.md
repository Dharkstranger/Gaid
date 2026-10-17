# What GAID keeps

GAID, pronounced *guide*. Plain answers, for a gallery, a visitor, or a regulator
(Nigeria's NDPA; the GDPR).

| | Kept? | Where | How long |
|---|---|---|---|
| A question GAID answered | No | — | — |
| A question GAID could **not** answer | The words, the gallery, the work, the language, the moment | `gaid.questions`, Supabase (EU, Ireland) | 180 days, swept daily |
| Who asked | **Never**: no device id, IP, name, email, account | — | — |
| The visit | No | in its own code, on the visitor's screen | as long as they keep it |
| An enquiry | No | sent by the visitor, from their own app | — |
| The phone-to-TV link | No | a broadcast channel; nothing is written | — |
| Speech | Not by GAID | the visitor's browser (Chrome sends audio to Google) | per the browser |
| Questions sent to Amazon Nova | Not by GAID | Amazon Bedrock, per its terms | per AWS |

Who can read the unanswered questions: the holder of that gallery's Galleris
edit key, and anyone for GAID's public demo galleries (`sample`,
`openaccess`).

Someone could type something personal as a question. It is then kept, like
any other unanswered question, for 180 days, and seen by that gallery's
curator. It is never shown to another visitor.


## The Amazon voice (added 17 October)

The words GAID is about to say are sent to Amazon Polly to be turned into
speech. Only GAID's own words go: never the visitor's question, their voice,
or anything that identifies them. Amazon returns the audio and GAID keeps
nothing.

## The voice copy (optional, added 13 October)

When the owner turns on an AI copy of a voice (`docs/voice-setup.md`), the
words GAID is about to say are sent to ElevenLabs to be turned into speech.
Those words are the gallery's own and GAID's answers. Nothing about the
visitor goes with them: not their question, not their phone, not their
visit. With the voice off, nothing is sent.


## Page views (Vercel Web Analytics, added 14 October)

Vercel counts page views on GAID's pages: which page, roughly where from,
which kind of device. It sets no cookies. It does not receive anything a
visitor says or asks, which works they looked at, or their visit words.
