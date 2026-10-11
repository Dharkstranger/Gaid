# GAID design system

**GAID**, said *guide*. Lagos made.

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

| File | Use |
|---|---|
| `gaid-wordmark.svg` | chalk letters, amber dot. On indigo. Default |
| `gaid-wordmark-ink.svg` | indigo letters, deep amber dot. On chalk, paper |
| `gaid-wordmark-mono.svg` | one colour. Fax, stamp, engraving |
| `gaid-mark.svg` | the dot alone. Under 120 px wide |
| `gaid-icon.svg` (= `/icon.svg`) | app icon, favicon. 512 square, rounded |

- Letters drawn as shapes, not set in a font: they look the same everywhere.
- **The dot**: adire resist-dye circle above the I. The voice. Always amber.
- Clear space: one dot all round. Minimum: 120 px wide; below, the mark.
- Never: stretch, recolour, outline, shadow, set in type, put on a photo.

## 3. Colour

GAID's own colours only. A gallery's colour never appears.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--indigo` | #14204A | ground | — |
| `--indigo-2` | #1D2C5E | surface | — |
| `--indigo-3` | #26376E | raised, hover | — |
| `--indigo-line` | #3A4C8A | dividers only | 1.9:1, never a control edge |
| `--chalk` | #F4EFE4 | text on indigo | 13.7:1 |
| `--chalk-2` | #B9BFD6 | quiet text, control edges | 8.6:1 |
| `--amber` | #F0A43A | the voice: talk, dot, focus | 7.6:1 on indigo |
| `--amber-deep` | #9A5205 | amber as text on chalk | 5.1:1 |
| `--mount` | #E6E1D6 | under every work | indigo on it 12.1:1 |
| `--ink` / `--ink-2` | #14204A / #3E4A72 | text on chalk or mount | 13.7:1 / 7.5:1 on chalk, 6.6:1 on mount |
| `--ok` | #8FD9AE | done | 9.5:1 |
| `--alert` | #FFA494 | failed | 8.2:1 |

Rules:
- **A work is never on indigo.** Always on `--mount`, always `contain`, never cropped.
- **Bright amber never on chalk** (1.8:1). Use `--amber-deep`.
- Roles (`--bg`, `--text`, `--accent`…) flip under `.on-chalk` for print and light panels.
- One theme, on purpose: a dark screen glares less in a gallery and keeps the eye on the lit work.
- Texture: `--adire`, dots at 5–6% chalk. Indigo grounds only. Felt, not seen.

## 4. Type

| | Family | Weights | Use |
|---|---|---|---|
| Display | Unbounded | 600, 800 | titles, panel heads, logo lockups |
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
- Borders 1 and 2. Focus: 3 px amber outline, 2 px offset, on every control.
- Layout widths: `--page-max` 68rem, `--thumb-min` 8.5rem, `--room-min` 11rem, `--measure` 60ch.

## 6. Motion

`--m-fast` 150 · `--m-base` 300 · `--m-slow` 600 ms, one easing. Under
`prefers-reduced-motion: reduce` every duration is zero and the voice bars stop.
Motion means something: the voice bars move only while listening or speaking; a TV panel
rises once when an answer arrives.

## 7. Parts

| Part | States | Notes |
|---|---|---|
| Talk | idle (amber) · listening (chalk, amber ring) · speaking (amber, bars moving) | the one big control |
| Ask field + Ask | rest · focus | 44 high, chalk-2 edge |
| Chips | rest · hover | one word each; the question they ask is in `words.js` |
| Answer | question · answer · source | surface card; source says whose words |
| Work card | rest · hover · current (amber edge) | thumbnail on mount |
| TV panels | about · artist · timeline · medium · scale · rooms | `public/scene.js` picks one |
| Notices | done · failed · offline | `--ok`, `--alert`, `--chalk-2`; offline is never "failed" |

## 8. Screens

| Screen | File | Who |
|---|---|---|
| Phone | `/` | the visitor, in front of the work |
| Screen beside the work | `/screen` | everyone standing there (Fire TV) |
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
