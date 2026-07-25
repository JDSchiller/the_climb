# The Climb

The summit is the dream. The climb is the plan.

A family-owned athlete development tracker. The athlete is the root record; clubs, coaches and seasons attach to the athlete and expire. Built for Kohen's 2026-27 season with Central Florida Hockey Club.

## What it does

- Schedule: practices, skills, lessons, games, showcases, tournaments
- Post-game evaluations on the 10-item SSMG rubric (1-5, hustle bonus at 38+)
- Skill progress check-ins on the 10-skill rubric (stages 1-4, anchored to the level)
- Coach check-ins via single-use expiring links. Coaches never get a login.
- Clips (300 MB cap, clips only, never full games)
- Ledger in the family's units (dollars for Kohen), with 10% withheld to savings
- Documents (contract, eval sheets, schedules)
- Full audit log. Every view and change is recorded.

## Architecture

Next.js 15 App Router. Database is SQLite-compatible via `@libsql/client`:
a local file in development, [Turso](https://turso.tech) in production.
Clips and documents go to local disk in development, Vercel Blob in production
(browser uploads go straight to Blob storage, so big clips never touch a
serverless function). Login is by emailed/texted code, invite-only; in
`SANDBOX_MODE` the code is shown on screen.

Repo layout: the app lives in `the-climb/`. On Vercel, set the project
**Root Directory** to `the-climb`.

## Deploy on Vercel

1. Import this repo into Vercel. Set Root Directory to `the-climb`.
2. **Storage → Create Database → Blob.** Connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN` automatically.
3. **Marketplace → Turso.** Create a free database and connect it. This adds
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. (If your integration uses
   different names, copy the values into those two names in Project Settings →
   Environment Variables.)
4. Add environment variable `SANDBOX_MODE=true`.
5. Redeploy, then visit `/api/setup` once. It loads Kohen's season and returns
   the sandbox logins plus Coach Bardaro's live check-in link. Visiting it again
   changes nothing.
6. Sign in at `/login`.

Any disk-based host (Railway, Fly, a VPS) also works with zero configuration:
without Turso/Blob variables the app falls back to a local SQLite file and disk
uploads.

## Local development

```bash
npm install
npm run seed     # loads Kohen's 2026-27 season into data/app.db
npm run dev
```

Sandbox logins after seeding: `jordan@example.com` (guardian/manager),
`kohen@example.com` (athlete), `demo@example.com` (scoping demo, sees only the
demo athlete). Login codes print on screen and in the server log.

`FORCE_SEED=true npm run seed` wipes and reseeds. The seed refuses to touch a
database that already has data otherwise.

## Replacing sandbox data with real accounts

Edit `lib/seed.ts` (emails/phones), run a forced reseed, then set
`SANDBOX_MODE=false` once an email/SMS sender is wired into `requestCode()`
in `lib/auth.ts` (Resend for email, Twilio for SMS).

## Design decisions worth keeping

- Family owns the data. Coach access is tokenized, expiring, single-use.
- Rubrics are versioned rows, not code. Old evaluations keep their meaning.
- Every evaluation stamps the level it was made at. A 3 at 12U AA is not a 3 at 14U AAA.
- Ledger units per family: dollars, points, whatever the house uses.
- No leaderboards. Ever. The only comparison is Kohen vs. last month's Kohen.
