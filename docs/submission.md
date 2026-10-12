# Devpost submission

Paste each part into the Devpost field of the same name. **[YOURS]** marks
the four answers judges expect in your own words.

**Name:** GAID (pronounced "guide")

**Tagline:** Ask the work in front of you.

**Track:** Alexa+. A simulated Alexa+ experience in a web app that calls
GAID's own MCP server at runtime. Not an Amazon product.

## Inspiration
In Lagos, a gallery's catalogue is a PDF sent on WhatsApp, and a wall label
carries about forty words. The story of a work stays with the artist and the
curator; almost nobody else in the room hears it. We already build Galleris,
a gallery's own viewing room opened from a code on the wall. GAID is that
viewing room you can talk to, with your eyes on the work instead of a screen.

## What it does
Four moments, on the devices Alexa+ already lives on.

1. **Scan and ask (phone).** Scan the code beside a painting and press ▶.
   GAID tells its story in the gallery's own words. Hold the button and ask:
   who made it, when, what it is made of, how big. While GAID speaks the phone
   fades, so you look up at the painting ("Eyes up"). **Look closer** zooms
   into the painting part by part as the story is told. **Where next** points
   to the next work and says why.
2. **The room answers (Fire TV).** The screen beside the work shows a square
   code. Point your phone's camera at it and you are paired: no typing, no app.
   Ask a question and the TV answers in pictures: the artist, a timeline, the
   work to scale beside a person, the room on a plan. Look closer moves on the
   TV and the phone together.
3. **It follows you home (Echo Show).** Leaving, GAID gives you three words,
   one for each work you stood in front of. That evening: "Alexa, ask GAID
   about Major, Red, Intruder." The visit comes back, ready for questions, and
   one press sends an enquiry to the gallery on WhatsApp or email.
4. **The gallery learns (curator).** Every question GAID could not answer goes
   on the curator's list, so the next wall label answers it. Nothing else
   about a visitor is kept.

The demo gallery is 24 real paintings from the National Gallery of Art's
open-access programme (public domain; not affiliated with or endorsed by the
Gallery).

## How we built it
- **An MCP server** (spec 2025-11-25, Streamable HTTP, stateless, the official
  SDK) with eight tools: `ask_work`, `find_work`, `whats_nearby`,
  `recall_visit`, `where_next`, `look_closer`, `send_enquiry`,
  `visitor_questions`. The phone's simulated Alexa+ calls it for every
  question, the way Alexa+ would call a connected service.
- **One brain** answers phone, TV and Echo Show alike: the gallery's own words
  by rule first, then Amazon Nova Lite through the Bedrock Converse API, given
  only that gallery's facts and told to say "the gallery has not said" rather
  than guess. It never invents a name, a date, a price or an owner.
- **Honest by design.** A language is offered only when it can really be
  spoken. Every failure (network, model, database, TV link) falls back
  quietly; a visitor never sees an error screen.
- **A gateway.** GAID's server is the only door: the database functions need
  GAID's own secret, the TV shows only words GAID's server has signed, and
  every caller is rate-limited.
- **Phone and TV** talk over a realtime channel named by the pairing code;
  nothing is stored.
- **Galleris galleries switch GAID on** (paid plans, off by default). GAID
  reads only what a gallery has published.
- Static pages and Node functions on Vercel; 89 automated tests, each one
  proved by putting its bug back and watching it fail.

## Challenges
**[YOURS]** (ideas: keeping a voice guide from inventing a price; pairing a
phone to a TV without typing; making a design that does not look
machine-made; Yoruba voices on ordinary phones).

## Accomplishments
**[YOURS]** (ideas: a guide that cannot put words in a curator's mouth; a
visit you take home in three words; pairing by pointing a camera).

## What we learned
**[YOURS]**

## What's next
Recorded voices from Lagos galleries; Yoruba, Igbo and Hausa through Amazon
Nova; the Ask button in every paid Galleris viewing room; GAID as a real
Alexa+ connection, so "Alexa, ask GAID…" works on any Echo.

## Built with
Amazon Bedrock, Amazon Nova, Model Context Protocol, Alexa+ (simulated),
Fire TV (web), Echo Show (web), Supabase Realtime, Vercel, JavaScript,
Web Speech API, Galleris.

## Feedback on the Amazon tools
**[YOURS]**: your own experience of the Amazon Developer sign-in, the
Devices Builder Tools (`init-context`), and trying to reach Bedrock and Nova
(including that an AWS account is separate from an Amazon Developer
account). What was easy, what was confusing, what you would change.

## Links
- Live: https://gaid-taupe.vercel.app
- Code: https://github.com/Dharkstranger/gaid
- Video: **[YouTube link, public, under 3:00]**

**Team:** Emeka Ugochukwu, Obianuju Nnadi (Hoo Socials Limited, Lagos)
