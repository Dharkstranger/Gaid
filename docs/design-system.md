# GAID design system

**GAID**, pronounced *guide*. The talking drum and the danfo, on a gallery wall.

Live: `/design` · Tokens: `public/tokens.css` · Words: `public/words.js` · Logo: `public/brand/`
Held by `test/design.test.js` and `test/words.test.js`: a page that goes round the system fails the build.

## 1. Name

| | |
|---|---|
| Written | **GAID**, always capitals |
| Said | *guide* (/ɡaɪd/) |
| Speech engine | given "Guide" (`spoken()` in `words.js`) |
| Wake word | "Guide, …" works like "Alexa, …"; "guide me to …" is a question |
| Amazon Nova | told how it is said, told never to say it |
| Package, repo, URLs | `gaid`, lower case (npm and GitHub require it) |

## 2. Logo

The mark is a **gángan**, the Yoruba talking drum: the drum built to speak words.
Two danfo-yellow heads, black cords pinched at the waist, the curved beater.

| File | Use |
|---|---|
| `gaid-wordmark.svg` | black letters. On wall white, paper. Default |
| `gaid-wordmark-night.svg` | white letters. On ink (video, slides) |
| `gaid-wordmark-ink.svg` | on white paper, print |
| `gaid-wordmark-mono.svg` | one colour. Stamp, engraving |
| `gaid-mark.svg` | the drum alone. Under 120 px wide |
| `gaid-icon.svg` (= `/icon.svg`) | app icon, favicon: danfo tile, drum, two black stripes |

- Letters: Big Shoulders Display 800, turned into shapes. They look the same everywhere.
- Clear space: one drum head all round. Minimum: 120 px wide; below, the mark.
- Never: stretch, recolour, outline, shadow, retype, put on a photo.

## 3. Colour

GAID's own colours only. A gallery's colour never appears. Why these: a screen beside a
painting should disappear into the wall (gallery white, a neutral mount, ISO 3664's neutral
surround); the one loud thing is the voice, in the yellow and black of Lagos's danfo buses.

| Token | Hex | Role | Contrast on wall |
|---|---|---|---|
| `--wall` | #F4F4F1 | ground | — |
| `--paper` | #FFFFFF | surface, cards | — |
| `--shelf` | #E9E9E4 | raised, hover | — |
| `--ink` | #141412 | text, rings, the stripes | 16.7:1 |
| `--ink-2` | #4D4D48 | quiet text | 7.7:1 |
| `--cord` | #6E6E68 | control edges | 4.7:1 |
| `--hairline` | #D5D5CE | dividers only | 1.3:1, never a control edge |
| `--danfo` | #F7C600 | the voice: talk, ▶, "you are here" | 1.5:1 alone; ink on it 11.5:1 |
| `--mount` | #D9D8D3 | under every work | — |
| `--ok` | #17703D | done | 5.6:1 |
| `--alert` | #B3261E | failed | 5.9:1 |

Rules (held by `test/design.test.js`):
- **A work is never on black.** Always on `--mount`, always `contain`, never cropped.
- **Yellow is a ground, never text or an edge on the wall.** Every yellow control is ringed in
  ink and carries ink. Links are ink, underlined in yellow.
- One light theme, on purpose: the screen sits on a lit gallery wall.
- Texture: `--stripes`, the danfo's two black bands, under a heading or plate. Used sparingly.

## 4. Type

| | Family | Weights | Use |
|---|---|---|---|
| Display | Big Shoulders Display | 800 | titles, codes, logo: tall, narrow, like bus and market signs |
| Body | Work Sans | 400, 600 | everything else |
| Backup | Noto Sans | 400, 600 | only ɓ ɗ ƙ ǹ, which Work Sans lacks |

Scale, six steps, no others (`--t-1`…`--t-6`): **13 · 16 · 20 · 26 · 36 · 56**.
The TV sets its root size from the screen width, so the same steps grow with it.

- Served from `public/fonts/`, never a font host. SIL Open Font License, files beside them.
- Three files per weight: Latin, extended Latin (Hausa, ṣ), and "Vietnamese", which carries the
  dotted vowels and tone marks of Yoruba and Igbo (ẹ ọ ị ụ, grave, acute, dot below).
- Checked in a browser: every one of ẹ ọ ṣ ị ụ ɓ ɗ ƙ à á è é ì í ò ó ù ú ń ǹ draws in GAID's type.
- Labels: 13, 600, uppercase, `--track-label` .08em. Titles: `--track-display` −.02em, balanced.

## 5. Space and shape

- Space, 4-based: **4 · 8 · 12 · 16 · 24 · 32 · 48** (`--s-1`…`--s-7`). Gutter 16, 28 from 700 px.
- Tap: every control at least **44 × 44** (`--tap`).
- Radius: **0** mounts and works (a mat is square) · **6** buttons, fields, cards · **round** dot, chips.
- Borders 1 and 2. Focus: 3 px ink outline, 2 px offset, on every control.
- Layout widths: `--page-max` 68rem, `--thumb-min` 8.5rem, `--room-min` 11rem, `--measure` 60ch.

## 6. Motion

`--m-fast` 150 · `--m-base` 300 · `--m-slow` 600 ms, one easing. Under
`prefers-reduced-motion: reduce` every duration is zero and the voice bars stop.
Motion means something: the voice bars move only while listening or speaking; a TV panel
rises once when an answer arrives.

- **Eyes up.** While GAID speaks, the phone fades to `--eyes-up` (18%) so the visitor looks up
  at the work, not the screen. The talk button stays. Not during Look closer: then the phone
  is the picture.
- **Look closer.** The picture moves to each part at the pace of the words.

## 7. Parts

| Part | States | Notes |
|---|---|---|
| Talk | idle (danfo, ink ring) · listening (ink, danfo ring) · speaking (danfo, bars moving) | the one big control |
| Ask field + Ask | rest · focus | 44 high, cord edge |
| Chips | rest · hover | one word each; the question they ask is in `words.js` |
| Answer | question · answer · source | surface card; source says whose words |
| Work card | rest · hover · current (ink edge) | thumbnail on mount |
| TV panels | about · artist · timeline · medium · scale · rooms | `public/scene.js` picks one |
| Notices | done · failed · offline | `--ok`, `--alert`, `--ink-2`; offline is never "failed" |

## 8. Screens

| Screen | File | Who |
|---|---|---|
| Phone | `/` | the visitor, in front of the work |
| Screen beside the work | `/screen` | everyone standing there (Fire TV) |
| At home | `/home?visit=<code>` | the visitor, that evening, on an Echo Show (Alexa+) |
| Asked | `/curator?gallery=<slug>` | the curator: what the gallery has not answered |
| Design | `/design` | whoever builds GAID next |

## 9. Words

The owner's rule: **one word, two words, a phrase. A noun or verb before a sentence.**

- Every label lives in `public/words.js`; a page holds none of its own.
- Labels: three words at most. Chips: one. Checked.
- What GAID *says* is the gallery's own words, never ours.
- Never invent names, dates, prices or owners. "Gallery's words" / "Nova · gallery's words" says whose.
- Every screen says "Not an Amazon product". No Amazon logos.
- British spelling. Title Case on buttons; sentence case elsewhere.

## 10. Accessibility

WCAG 2.2 AA. axe-core finds nothing on phone, TV or design page at 390 and 1280/1920.
Contrast in the table above. Tap 44. Visible focus. Reduced motion honoured.
Answers announced politely; the TV caption is a live region.
