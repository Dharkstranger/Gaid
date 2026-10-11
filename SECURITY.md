# Security

Report a problem privately: this repository's **Security** tab → **Report a
vulnerability**. Please do not open a public issue for it.

## What GAID holds

- **Questions GAID could not answer**: the question, the gallery, the work, the
  language and the moment. No device, address, name or IP. Deleted after 180
  days. Readable only with the gallery's edit key. See `docs/privacy.md`.
- **Nothing else.** A visit lives in its own code. An enquiry is sent by the
  visitor from their own WhatsApp or email. The phone-to-TV link stores nothing.

## Keys

- The Supabase key in `public/config.js` and `lib/store.js` is the
  **publishable** one, on purpose. It reaches two database functions, each of
  which checks its own arguments.
- Amazon Bedrock keys live only in Vercel's environment settings. Never in the
  code, the repository, or a chat.

## Policy

`vercel.json` sets a strict Content-Security-Policy: GAID's own scripts,
styles and fonts only; one WebSocket host for the phone-to-TV link.
