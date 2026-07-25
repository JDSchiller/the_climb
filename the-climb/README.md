# The Climb

The athlete-owned development record. The athlete is the root object; teams, coaches, and seasons attach to him and detach. The record carries from 12U to 18U and beyond.

*The summit is the dream. The climb is the plan.*

## Run it locally

```bash
npm install
npm run seed     # creates data/app.db with Kohen's 2026-27 season + demo athletes
npm run build
npm start        # http://localhost:3000
```

## Seeded logins

Sandbox mode shows the 6-digit code on screen after you enter an email or phone. No email/SMS account needed yet.

| Who | Login | Sees |
|---|---|---|
| Jordan (guardian + manager) | `jordan@example.com` or `+14075550100` | Kohen + Rex (demo athlete) |
| Kohen (athlete) | `kohen@example.com` or `+14075550101` | His own dashboard |
| Demo parent (scoping proof) | `demo@example.com` | Only Finn, never Kohen |

The seed also prints a live, single-use evaluation link for Coach Bardaro (a `/e/...` URL). That's the coach flow: no account, one athlete, one rubric, expires on its own.

**Before real use:** change the emails/phones in `scripts/seed.ts` to your real ones and run `npm run seed` again (wipes and rebuilds), or update the `users` table directly.

## Deploy (the live server Kohen's phone and the coach's computer share)

Any Node host with a persistent disk works. Railway and Render are the easy paths:

1. Push this folder to a GitHub repo.
2. Create a new Railway/Render web service from the repo. Build: `npm install && npm run build`. Start: `npm start`.
3. **Attach a persistent volume** mounted at `/data` (this is the one step you can't skip: SQLite and uploaded clips live on disk).
4. Set environment variables:
   - `DB_PATH=/data/app.db`
   - `UPLOAD_DIR=/data/uploads`
   - `SANDBOX_MODE=true` (leave on until email/SMS sending is configured)
5. Run the seed once: `npm run seed` from the service shell (Railway: `railway run npm run seed`).
6. Open the URL on Kohen's phone, Share > Add to Home Screen. It installs like an app.

## Turning on real login codes

`lib/auth.ts` > `requestCode()` currently returns the code to the screen in sandbox mode and logs it to the server console. When ready:

- Email: sign up for Resend, send the code there instead.
- SMS: Twilio, same spot.
- Then set `SANDBOX_MODE=false`.

## What's deliberately NOT in v1

- **Coach accounts.** Coaches get categorized, expiring, single-use links. Less onboarding, less child-safety surface.
- **Win streaks / team standings.** Cut on purpose; needs score data the feed doesn't have.
- **Leaderboards.** Never. Architectural line, not a backlog item.
- **Payments.** The ledger is a record, not a payment rail.
- **Tryouts.** Different product, later.

## Known gotchas

- **iPhone video (HEVC):** iPhones record HEVC, which some desktop browsers won't play. If a clip plays on the phone but not the coach's computer, that's why. Fix later with server-side transcoding to H.264 (ffmpeg) or an upload service like Mux. The schema already stores mime type, so nothing breaks.
- **Uploads on rink wifi:** the 300 MB clip cap helps, but uploads aren't resumable yet. If this bites, TUS or Uppy is the upgrade.
- **Backups:** the whole record is `data/app.db` + `data/uploads/`. Snapshot the volume on a schedule (Railway/Render both offer this). The record outliving teams is the entire premise; losing it is the one unrecoverable failure.

## Scaling notes (when it's more than Kohen)

- SQLite → Postgres: the query layer is plain SQL in `lib/services.ts`; the schema is portable.
- Local disk → S3/R2 for clips: swap the read/write in the two media routes.
- Units: each family's ledger already carries `unit_type` (currency | points) and a label. The big-launch switch to points is a per-family setting, not a migration.
- Rubrics, skills, stages, and levels are all rows, versioned. A new sport is data entry, not a fork. Old evaluations always render against the rubric version that scored them.

## Architecture in one paragraph

One `users` table; roles are rows in `grants` (guardian / manager / athlete / viewer), scoped to an athlete and a time window, so a 16-year-old becoming his own manager is a grant, not a rebuild. Evaluations stamp the level they were rated against (`level_context`) and reference a versioned rubric. Evaluators are a directory; access happens through tokenized `eval_links`. Media and documents are served only through access-checked routes, and views land in `audit_log`. All service logic lives in `lib/services.ts` behind `/api/*` routes, so the future iPhone app is a new client, not a rewrite.
