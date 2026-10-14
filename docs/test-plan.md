# Test it today: you and one other person

About 20 minutes. Two phones, one laptop. Use the live link, not localhost.
Write down anything odd; send it to Claude as it is.

`LIVE` is https://gaid-taupe.vercel.app. The gallery is `openaccess`: 24 real
paintings from the National Gallery of Art (open access). If the pictures are
grey, wait a few minutes for Galleris to rebuild, or use `gallery=sample`
(drawn works): every step below still works.

## Set up
- Laptop (the TV): open `LIVE/screen?gallery=openaccess`, full screen (F11). A code shows bottom right.
- Phone A (you): open `LIVE/?gallery=openaccess`. Volume up.
- Phone B (other person): same link.

## 1. Scan and ask — Phone A
- [ ] Press ▶. GAID speaks the story. The phone fades while it speaks.
- [ ] Hold talk, say "Who made it?". Answer is spoken.
- [ ] Say "Who owns it now?". Answer: "I only know what Open Access Gallery wrote…" (with Nova: "the gallery has not said"). Never an invented owner.
- [ ] Say "How big is it?". One size, in centimetres.
- [ ] Press CC. Words appear. Press again: gone.
- [ ] Press Look closer (magnifier). The picture zooms at once, then moves part by part.
- [ ] No globe button: languages appear only when they can really play (needs Amazon Nova).

## 2. The room answers — Phone A + laptop
- [ ] Point Phone A's camera at the QR code on the laptop. Tap the link. GAID opens, already paired (a yellow dot on the screen icon).
      No camera reader? Press the screen icon and type the four letters.
- [ ] Ask "When was it made?". The laptop changes to a timeline.
- [ ] Ask "How big is it?". The laptop shows the work beside a person.
- [ ] Look closer: the laptop moves with the phone.

## 3. Two people — Phone B
- [ ] Phone B scans the same QR code. Asks a question. The laptop answers Phone B.
- [ ] Phone B never sees Phone A's questions on its own screen.

## 4. It follows you home — Phone A
- [ ] Press Where next (arrow). Go to the next work.
- [ ] Press Take home (house). Pictures with a word under each, and the sentence to say at home. Press Save.
- [ ] On another device open `LIVE/home?gallery=openaccess&words=<the three words>`
      (e.g. `words=Major,+Red,+Intruder`).
- [ ] Press ▶. The visit comes back. Ask "Who made it?".
- [ ] Press Enquire. GAID says the gallery has not published a way to reach
      them (true for this gallery). To see the button: open
      `LIVE/home?gallery=sample`, press Enquire. An email button appears. Do not send.

## 4b. The TV on its own (no phone)
- [ ] Open `LIVE/screen` on the Fire TV (Silk browser) or laptop. "Press OK" shows.
- [ ] Press OK (Enter on a laptop): GAID tells the painting's story aloud.
- [ ] Up: Look closer. Down: stop. Left/right: the next painting. Play: a tour of the room.

## 4c. One TV, two paintings
- [ ] Open `LIVE/screen?at=p1`: this TV belongs beside Saint James Major.
- [ ] Phone A scans it (opens at Saint James Major). Phone B opens `LIVE/?gallery=openaccess&at=p5` and types the same four letters.
- [ ] Phone B asks and presses Look closer: the TV does not move. Phone A does the same: the TV follows.

## 5. The gallery learns
- [ ] Open `LIVE/curator?gallery=openaccess`. The question nobody answered ("Who owns it now?") is on the list.
      (Needs `GAID_DB_SECRET` set in Vercel and its hash in the database.)

## 6. Quick checks
- [ ] `LIVE/about` — "Simulated Alexa+ · Not an Amazon product".
- [ ] `LIVE/design` — the new look.
- [ ] Airplane mode on Phone A, ask something: no error screen, GAID says it cannot reach the gallery.

If Nova is not set up (no Bedrock key), questions outside the gallery's words
get "I only know what Open Access Gallery wrote…". That is correct, not a fault.
