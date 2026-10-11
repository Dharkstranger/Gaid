# GAID backlog

**Read this first, every session.** Then `CLAUDE.md`. Update it when anything moves.
Last updated: 11 October 2026.

## North star

| | |
|---|---|
| **Goal** | Win the Alexa+ track of "Build, Ship, Shape". Be remembered. |
| **Outcome** | Judges, galleries and Amazon want GAID + Galleris in their museums, galleries and Alexa. |
| **Deadline** | 23 Oct 2026, 12:00 Pacific = 20:00 Lagos. Aim: submit 21 Oct. |
| **Judged on** | Technical build, design, potential impact, quality of the idea (third-party listing; confirm on Devpost). |

## Outputs to submit (Devpost)

- [x] Public repo, open-source licence (MIT)
- [ ] Live site (Vercel)
- [ ] Demo video, under 3:00, English, public — the four moments
- [ ] Description (`docs/submission.md`) — rewrite for the four moments
- [ ] Feedback on Amazon tools — owner's own words
- [ ] Team on Devpost: Emeka Ugochukwu, Obianuju Nnadi

## Now — finish the project

1. **Architecture: GAID's server is the only door** (`docs/architecture.md`). Approved? → build.
   - [x] Public access to the two database functions revoked (11 Oct)
   - [ ] Functions require GAID's own server secret; secret only in Vercel
   - [ ] Phone → TV messages signed by GAID's server; TV shows only signed words
   - [ ] Rate limit per caller on /api/mcp
2. [ ] Deploy to Vercel — needs owner: reconnect connector
3. [ ] Amazon Bedrock key in Vercel — needs owner
4. [ ] Test the live site end to end: four moments, phone + TV on two devices, Nova answer
5. [ ] Video: script, screen footage (Claude), voice-over (owner)
6. [ ] Description + feedback (owner's words, Claude types)
7. [ ] Submit

## Next — after the project works (owner, 11 Oct)

- [ ] **Design must not look AI-made.** Study competing products and take what works:
      Smartify, Bloomberg Connects, STQRY, Cuseum, Musa, Gesso, Acoustiguide/Antenna,
      the Met / MoMA / Rijksmuseum apps, Alexa+ and Echo Show's own screens.
      Then redo the design system, logo, everything. Check against the AI look list in
      the artifact design guidance (cream + serif + terracotta; indigo + one accent; etc).
- [ ] Recorded audio guide on one work (owner's voice) — the video's best moment
- [ ] Yoruba translation on one work — "say it in Yoruba" for real

## Owner to do

- [ ] Reconnect Vercel connector (access to `strangers-projects`)
- [ ] Bedrock key → Vercel
- [ ] GitHub → gaid → Settings → Security → private vulnerability reporting ON
- [ ] Merge Galleris branch `claude/gaid-questions-log`
- [ ] Devpost: register, Alexa+ track, add Obianuju
- [ ] Voice-over; three answers in own words; Submit

## Watch for

- Shared database with Galleris: GAID's load and mistakes are Galleris's too. Move GAID
  to its own project when a slot frees (pause `vibes-arena` or upgrade).
- This container cannot reach Supabase, Vercel or Devpost: anything there is checked
  against stand-ins until the live site exists. Say so; never claim it.
