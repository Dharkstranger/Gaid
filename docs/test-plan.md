# Test it today: you and one other person

About 20 minutes. Two phones, one laptop. Use the live link, not localhost.
Write down anything odd; send it to Claude as it is.

`LIVE` is https://gaid-taupe.vercel.app. The gallery is `openaccess`: 24 real
paintings from the National Gallery of Art (open access). Its pictures appear
once the Galleris branch `claude/nga-photos` is merged. Until then, use
`gallery=sample` (drawn works) and every step below still works.

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
- [ ] Press Look closer (magnifier). The picture moves part by part.
- [ ] Press Language (globe). Pick Pidgin. Ask again.

## 2. The room answers — Phone A + laptop
- [ ] Press the screen icon, type the laptop's code. A dot shows: paired.
- [ ] Ask "When was it made?". The laptop changes to a timeline.
- [ ] Ask "How big is it?". The laptop shows the work beside a person.
- [ ] Look closer: the laptop moves with the phone.

## 3. Two people — Phone B
- [ ] Phone B pairs with the same code. Asks a question. The laptop answers Phone B.
- [ ] Phone B never sees Phone A's questions on its own screen.

## 4. It follows you home — Phone A
- [ ] Press Where next (arrow). Go to the next work.
- [ ] Press Take home (house). Three pictures, three words. Note the words.
- [ ] On another device open `LIVE/home?gallery=openaccess&words=<the three words>`
      (e.g. `words=Major,+Red,+Intruder`).
- [ ] Press ▶. The visit comes back. Ask "Who made it?".
- [ ] Press Enquire. A WhatsApp or email button appears. Do not send.

## 5. The gallery learns
- [ ] Open `LIVE/curator?gallery=openaccess`. The question nobody answered ("Who owns it now?") is on the list.
      (Needs `GAID_DB_SECRET` set in Vercel and its hash in the database.)

## 6. Quick checks
- [ ] `LIVE/about` — "Simulated Alexa+ · Not an Amazon product".
- [ ] `LIVE/design` — the new look.
- [ ] Airplane mode on Phone A, ask something: no error screen, GAID says it cannot reach the gallery.

If Nova is not set up (no Bedrock key), questions outside the gallery's words
get "I only know what Open Access Gallery wrote…". That is correct, not a fault.
