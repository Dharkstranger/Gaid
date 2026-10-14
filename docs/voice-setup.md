# GAID in your own voice (an AI copy)

GAID can speak in an AI copy of a real person's voice: the owner's for now,
later a curator's or an artist's, always with that person's permission.
Until it is set up, GAID uses the most natural voice on each phone.

## What it does and does not do

- **It says only GAID's own words.** `api/speak.js` speaks an answer GAID
  itself produced and signed, or one of GAID's fixed lines. Nobody can send
  it a sentence of their own, so nobody can make the voice say something you
  never said. A test proves it, and fails when that check is removed.
- **It says it is a copy.** On a visitor's first visit GAID says: "This voice
  is an AI copy of a real person's voice, used with their permission." The
  About page says the same.
- **English, Pidgin and French.** Yoruba, Igbo and Hausa are not among the
  voice model's languages, so the phone's own voice says those.
- **Any failure, and the phone speaks instead.** No error is ever shown.

## Setting it up (about 15 minutes)

1. Make an account at ElevenLabs (elevenlabs.io). Voice cloning is on its
   paid plans; check its pricing page for the current cost.
2. In ElevenLabs, create an **Instant Voice Clone** of your own voice. Read
   the sample it asks for in a quiet room, about one to two minutes. Confirm
   that the voice is yours when it asks.
3. Copy the new voice's **Voice ID**, and create an **API key**.
4. In Vercel → the **gaid** project → **Settings → Environment Variables**,
   add both, for Production and Preview:
   - `ELEVENLABS_API_KEY` — the API key
   - `GAID_VOICE_ID` — the voice ID
5. Redeploy (any push does it). Open GAID on your phone and press ▶.

Never paste the API key into a chat, an email, the code or this repository.

## A curator's or an artist's voice

The same two settings, with their voice ID. Only with their written
permission, kept on file. To switch back to the phone's voice, delete the
two variables and redeploy.
