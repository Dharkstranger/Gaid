# Devpost submission draft

Fields as the Devpost form usually asks them. Check each against the live form.

**Name:** GAID

**Tagline:** Ask the work in front of you.

**Track:** Alexa+ (simulated Alexa+ experience in a web app)

## Inspiration
In Lagos, a gallery's catalogue is a PDF sent on WhatsApp, and the wall label
carries about forty words. The story of the work is known by the artist and
the curator and almost nobody else in the room. We already build Galleris,
which gives a gallery its own viewing room opened from a code on the wall.
GAID is that viewing room you can talk to.

## What it does
Stand in front of a work and say "Alexa, tell me about the work in front of
me". GAID answers with the gallery's own story, plays the artist's recording
when there is one, and takes follow-ups: who made it, when, what it is made
of, what else is in the room, "take me to" another work, and "say it in" one
of the gallery's languages.

## How we built it
A static page and two serverless functions on Vercel. The gallery is read from
its published Galleris file. Questions are answered in two steps: the
gallery's own words by rule first, then Amazon Nova Lite through the Amazon
Bedrock Converse API, given only that gallery's facts and told to say "the
gallery has not said" rather than guess. Every failure falls back to the
gallery's words.

## Challenges
[TO FILL IN: what was hard for you two.]

## Accomplishments
A guide that cannot put words in a curator's mouth: 18 tests, including ones
that fail if a missing fact is filled in or the instruction to stay inside the
gallery's facts is removed.

## What we learned
[TO FILL IN.]

## What's next
Real recordings from galleries in Lagos; Yoruba, Igbo and Hausa guides; and
GAID inside every Galleris viewing room.

## Built with
Amazon Bedrock, Amazon Nova, AWS SDK for JavaScript, Vercel, JavaScript,
Web Speech API, Galleris.

## Feedback on the Amazon tools
[TO FILL IN from your own experience setting up Bedrock: what was easy, what
was confusing, what you would change. Judges read this; it has to be yours.]

## Links
- Code: https://github.com/Dharkstranger/gaid
- Live: [Vercel link once deployed]
- Video: [YouTube or Vimeo link, under 3 minutes]

**Team:** Emeka Ugochukwu, Obianuju Nnadi (Hoo Socials Limited, Lagos)
