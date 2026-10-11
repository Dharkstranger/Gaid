# GAID — the product

GAID, said *guide*. **Look and listen.** A visitor in front of a work should
not read: GAID speaks, and pictures show. Owner's decisions, 11 October 2026.

## What visitors and museums actually do

| Finding | Source | So GAID… |
|---|---|---|
| ~3% of visitors use a museum audio guide, "standard across the sector" | [British Museum, MW2015](https://mw2015.museumsandtheweb.com/paper/an-audio-state-of-mind-understanding-behviour-around-audio-guides-and-visitor-media/index.html) | removes the start-up friction, not adds content |
| 2.47% download museum guide apps (vendor analysis, 175 apps) | [Nubart](https://www.nubart.eu/audio-guides/museum-audio-guide-app-adoption-rates.html) | is never an app: one scan |
| Complaints: a code to type at every work; weak signal | [Bloomberg Connects reviews](https://play.google.com/store/apps/details?id=org.bloomberg.connects.docent&hl=en_US) | has no codes, no typing, a light page |
| Median ~21 s looking at a work; almost half don't read labels | [Smith, Smith & Tinio 2017](https://digitalcommons.montclair.edu/educ-fdns-facpubs/106/) | speaks within 3 s; the story fits 20 s |
| Visitors want conversation and recommendations; pre-written cards were "mostly useless" | [Brooklyn Museum ASK](https://mw2016.museumsandtheweb.com/glami/ask-brooklyn-museum/index.html) | answers questions, and says where next |
| ASK users sent 13 messages a visit; curators learned from the questions | [Hyperallergic](https://hyperallergic.com/a-brooklyn-museum-app-encourages-visitors-to-ask-questions/) | keeps the unanswered ones for the curator |
| 90% satisfied in English, 73% in other languages | [The Met](https://www.metmuseum.org/perspectives/improving-the-audio-guide-a-look-at-our-visitors) | speaks Pidgin and Yoruba |
| Audio that guides the eye helps sighted visitors remember | [Hutchinson & Eardley 2021](https://www.tandfonline.com/doi/full/10.1080/09647775.2021.1891563) | has Look closer |

## Rules

- **No text for the visitor.** Picture, voice, movement, icons. One exception:
  **captions**, off until tapped — for deaf visitors and loud rooms (WCAG 2.2, 1.2).
- **One tap to start.** Browsers will not play sound before a tap; the scan
  opens the work full screen with one ▶.
- **Speak within 3 seconds; the story within 20.**
- **The visit is three words**, one from each work ("Sunrise, Mask, Crossing").
  Said to Alexa at home. Nothing stored: the words are the visit.
- **Said once, first time:** "I only tell you what the gallery wrote."

## The lifecycle

| Who | Moment | GAID |
|---|---|---|
| Visitor | Scan | ▶, then the story in their language |
| | Ask | out loud; the TV beside the work shows it |
| | Look closer | the story sentence by sentence; the picture moves to each spot |
| | Where next? | the next work and why; phone and TV point the way |
| | Leave | three words to say at home |
| At home | Alexa+ | "Alexa, ask GAID about Sunrise, Mask, Crossing" — Echo Show replays it |
| | Enquire | a message to the gallery, sent by the visitor |
| Curator | Morning | what visitors asked that the gallery has not answered |
| Gallery owner | Galleris | GAID is on paid plans: the reason to upgrade; enquiries are sales |
| Amazon | Devices | Fire TV in the room, Echo Show at home, Alexa+ between them |
| Developers | Open source | any collection behind one MCP server |

**The loop:** visitors ask → curators answer → GAID knows more → visitors stay
and enquire → the gallery sells → it pays for Galleris.

## The demo (under 3:00)

A visitor in a Lagos gallery: scan → story in Pidgin → "who made it?" (TV
shows) → Look closer → Where next? → leaves with three words → at home,
"Alexa, ask GAID about…" → Echo Show → enquire → the curator's list.
