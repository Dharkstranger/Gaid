# GAID architecture

**Status, 11 Oct:** built and tested; the two secrets go into Vercel when it is connected.

GAID, pronounced *guide*. One rule: **GAID's server is the only door.** Browsers,
TVs and Alexa+ talk to GAID's server. Only GAID's server talks to the
database, to Amazon Nova, and signs what a TV may show.

This is the "wrapper" idea: a gateway (also called a backend-for-frontend).
Nobody calls the database directly; they call GAID, and GAID decides.

```
 phone (visitor)  ─┐                         ┌─► Galleris published files (public, read-only)
 Echo Show (home) ─┼─► GAID server (Vercel) ─┼─► Amazon Nova on Bedrock   (AWS key: Vercel only)
 Alexa+ (MCP)     ─┤    /api/mcp, /api/*     └─► database: gaid.* only    (GAID secret: Vercel only)
 curator          ─┘          │
                              └─ signs ─► TV (Fire TV) shows only what GAID signed
```

## Open source is not the risk

The code being public is fine: security must never depend on hiding code.
What matters is **what a public key can do**. Secrets live only in Vercel's
environment settings, never in the repository.

## What was wrong, and the fix

| Risk | Before | After |
|---|---|---|
| Anyone writes to the database | The publishable key could call `gaid_record_question` for any made-up gallery: 300 rows an hour, each, unbounded | **Revoked 11 Oct.** Next: the function also requires GAID's own secret (`GAID_DB_SECRET`, checked against a hash in `private`), held only by GAID's server |
| Anyone reads a list | Demo lists open to all; real lists need the gallery's edit key | Same, but only through GAID's server |
| Anyone puts words on a gallery's TV | Public channel `gaid-<gallery>-<code>`; any text sent there was shown | Every message carries GAID's signature (HMAC, secret in Vercel). The TV shows only signed words; unsigned messages are dropped |
| One caller runs up the bill | Nova limited to 20 a minute per caller | Same, plus a limit on `/api/mcp` itself |
| GAID's mistakes hurt Galleris | Shared Supabase project (free plan full) | Walled schema, no Galleris tables touched, nothing callable without GAID's secret. Own project when a slot frees |

## Why not Galleris's own secret key?

A Supabase secret key opens the **whole** database. Putting it in GAID would
mean a fault in GAID could read Galleris's members, payments and accounts.
GAID gets its **own** secret, which opens GAID's two functions and nothing
else.

## Keys

| Key | Where | Opens |
|---|---|---|
| Supabase publishable | code (public, by design) | nothing of GAID's after the lock; the TV channel (signed messages only) |
| `GAID_DB_SECRET` | Vercel only | GAID's two database functions |
| `GAID_SIGNING_SECRET` | Vercel only | signing what a TV may show |
| Bedrock key | Vercel only | `bedrock:InvokeModel` for Amazon Nova |
