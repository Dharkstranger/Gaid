# Devpost submission

Fields as the Devpost form usually asks them. Check each against the live form.
Owner's words go where it says **[YOURS]**: judges read those.

**Name:** GAID (said "guide")

**Tagline:** Ask the work in front of you.

**Track:** Alexa+. A simulated Alexa+ experience in a web app, calling GAID's
own MCP server at runtime. Not an Amazon product.

## Inspiration
In Lagos, a gallery's catalogue is a PDF sent on WhatsApp and a wall label
carries about forty words. The story of a work lives with the artist and the
curator, and almost nobody else in the room hears it. We already build
Galleris, a gallery's own viewing room opened from a code on the wall. GAID is
that viewing room you can talk to — out loud, with your eyes on the work.

## What it does
Four moments.

1. **Scan and ask.** Scan the code beside a work. Press ▶. GAID tells the
   work's story in the gallery's own words. Ask anything: who made it, when,
   what it is made of. "Look closer" walks the picture part by part. "Where
   next?" points to the next work and says why. Pidgin and Yoruba on request.
   No text on screen: the phone fades while GAID speaks ("Eyes up").
2. **The room answers.** A Fire TV beside the work pairs with a 4-character
   code. Whatever the visitor asks, the TV shows: the artist, a timeline, the
   work to scale beside a person, the room on a plan. Pictures, no reading.
3. **It follows you home.** Leaving, GAID gives three words — one per work
   seen. That evening on an Echo Show: "Alexa, ask GAID about Lagoon, Towers,
   Crossing." The visit comes back, ready for questions, and one press sends
   an enquiry to the gallery on WhatsApp or email.
4. **The gallery learns.** Every question GAID could not answer goes on the
   curator's list. Nothing else about a visitor is kept.

## How we built it
- **MCP server** (spec 2025-11-25, Streamable HTTP, stateless, official SDK)
  with eight tools: `ask_work`, `find_work`, `whats_nearby`, `recall_visit`,
  `where_next`, `look_closer`, `send_enquiry`, `visitor_questions`. The phone's
  simulated Alexa+ calls it for every question.
- **One brain** answers phone, TV and Echo Show alike: the gallery's own words
  by rule first, then Amazon Nova Lite through the Bedrock Converse API, given
  only that gallery's facts and told to say "the gallery has not said" rather
  than guess. Nova also translates into Pidgin and Yoruba.
- **A gateway**: GAID's server is the only door. The database functions need
  GAID's own secret; the TV shows only words GAID's server has signed; every
  caller is rate-limited.
- **Phone ↔ TV** over a realtime channel named by the pairing code. Stores
  nothing.
- **Galleris galleries switch GAID on** (paid plans, off by default); GAID
  reads only what a gallery has published.
- Static pages and Node functions on Vercel. 87 automated tests; each guard
  was proved by putting its bug back and watching the test fail.

## Challenges
**[YOURS]** — e.g. keeping a voice guide from inventing a price; speech voices
for Yoruba on ordinary phones; a design that does not look machine-made.

## Accomplishments
**[YOURS]** — suggestion: a guide that cannot put words in a curator's mouth,
and a visit you take home in three words.

## What we learned
**[YOURS]**

## What's next
Recorded voices from Lagos galleries; Igbo and Hausa; the Ask button inside
every paid Galleris viewing room; a QR code on the TV.

## Built with
Amazon Bedrock, Amazon Nova, Model Context Protocol, Alexa+ (simulated),
Fire TV (web), Echo Show (web), Supabase Realtime, Vercel, JavaScript,
Web Speech API, Galleris.

## Feedback on the Amazon tools
**[YOURS]** — your own experience: Amazon Developer sign-in, the Devices
Builder Tools MCP (`init-context`), Bedrock and Nova. What was easy, what was
confusing, what you would change.

## Links
- Code: https://github.com/Dharkstranger/gaid
- Live: **[Vercel link]**
- Video: **[YouTube link, public, under 3:00]**

**Team:** Emeka Ugochukwu, Obianuju Nnadi (Hoo Socials Limited, Lagos)
