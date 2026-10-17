# GAID's voice

**The Amazon voice is the default** (owner, 17 October: "use an Amazon voice
always"). GAID speaks with Amazon Polly's voice **Ruth**, on its generative
engine, on every phone, TV and Echo Show, so the guide sounds the same in
every hand. Before this, each device used its own voice: a man on one phone,
a woman on the next.

It is **not Alexa's own voice**. Amazon does not let anybody else use that;
on a real Echo, Alexa speaks with her own.

**A gallery's own voice is a drop-in.** GAID is open source: put an
ElevenLabs key and voice ID in (below) and GAID speaks in that voice. If it
refuses (a wrong key, an unpaid plan), the Amazon voice speaks instead.
Until either is set up, the phone speaks, choosing a woman's voice to match.

## Setting up the Amazon voice (about 10 minutes)

1. Sign in to the AWS console (console.aws.amazon.com).
2. Open **IAM → Users → Create user**. Name it `gaid-voice`. No console access.
3. **Attach policies directly** → choose **AmazonPollyReadOnlyAccess**
   (it includes `polly:SynthesizeSpeech`, which is all GAID uses).
4. Open the user → **Security credentials → Create access key** →
   "Application running outside AWS". Copy both values once.
5. In Vercel → the **gaid** project → **Settings → Environment Variables**,
   add for Production:
   - `GAID_AWS_ACCESS_KEY_ID`
   - `GAID_AWS_SECRET_ACCESS_KEY`
   - optional: `GAID_POLLY_VOICE` (default `Ruth`; e.g. `Danielle`, `Joanna`)
6. Redeploy. The live check prints `voice copy: 200` when it speaks.

Never paste the keys into a chat, the code or the repository.

# A gallery's own voice (ElevenLabs, optional)

## What it does and does not do

- **It says only GAID's own words.** `api/speak.js` speaks an answer GAID
  itself produced and signed, or one of GAID's fixed lines. Nobody can send
  it a sentence of their own, so nobody can make the voice say something you
  never said. A test proves it, and fails when that check is removed.
- **No announcement.** The owner decided (14 October) that GAID does not
  announce the voice is a copy. Use only a voice whose owner has agreed.
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
