# Contributing to GAID

GAID, pronounced *guide*. Read `CLAUDE.md` first: it holds the rules and why.

```bash
npm install
npm test                                   # no network needed
GALLERIS_LOCAL_DIR=fixtures npm run dev    # http://localhost:5173/?gallery=sample
```

## Before a pull request

1. `npm test` passes. GitHub runs it on every push.
2. A new check is proved by putting its bug back and watching it fail.
3. The page is looked at on a phone (390 px) and a TV (1920 px), not only measured.
4. Every on-screen word is in `public/words.js`: one word, two words, a phrase.
5. Every colour, size and space is a token in `public/tokens.css`.
6. Nothing invents a fact about a work. The gallery's words, or "the gallery has not said".

## Licence

MIT. By contributing you agree your work is released under it.
