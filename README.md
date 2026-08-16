# Football Points V3 — Supabase Connected

This is the next coding phase of the supplied Football Points project.

## What is connected
- Supabase Auth (email/password)
- User profiles
- Shared open rounds
- Database-backed players
- 4-4-2 team selection
- Team submission to `entries` + `entry_players`
- Database-backed leaderboard
- Multi-player shared-round architecture

## Setup
1. Create a Supabase project.
2. Run `supabase_schema.sql` in Supabase SQL Editor.
3. Seed `players` and create an `open` row in `rounds`.
4. Replace `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `app.js`.
5. Deploy the static files.

IMPORTANT: Never place a Supabase service-role/secret key in browser code.

The real-money wagering/payout layer is intentionally not activated in this phase.
