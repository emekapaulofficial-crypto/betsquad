# FootballPoints Upgrade Setup

## What was added

1. **Football Match Engine**
   - Multi-league provider support.
   - Real fixtures only.
   - Daily fixture synchronization.
   - UTC kickoff timestamps rendered in the user's local timezone.
   - Live/status updates.
   - No fallback/fake fixtures.

2. **Football Robot Monitor**
   - Runs every 30 minutes.
   - Checks live fixtures across configured leagues.
   - Retries transient provider failures.
   - Writes robot-run history.
   - Optional admin webhook warning on failure.

3. **Security System**
   - Existing Supabase Auth remains the authentication layer.
   - Admin access is server/database checked through `admin_users` and `fp_is_admin()`.
   - Security events record login success/failure and password recovery without storing passwords, OTPs or tokens.
   - GitHub security workflow checks for obvious secret files and live-secret formats.

4. **Customer Care AI structure**
   - Account, football, wallet and security routing.
   - Deposit/withdrawal guidance without requesting credentials.
   - Admin escalation stored in `fp_support_escalations`.

5. **Match & Player System**
   - Match click shows players only from its two linked teams.
   - Provider player names, positions and photos.
   - Stable provider IDs link leagues -> fixtures -> teams -> players.

6. **Database Upgrade**
   - `footballpoints_upgrade.sql` creates the new `fp_*` tables and RLS policies.
   - `footballpoints_compatibility.sql` adds safe compatibility indexes to the existing app tables.

7. **GitHub Setup**
   - Daily sync workflow.
   - Automatic robot monitor.
   - Security workflow.

## Required GitHub configuration

Repository -> Settings -> Secrets and variables -> Actions:

### Secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_API_KEY`
- `ADMIN_ALERT_WEBHOOK_URL` (optional)

### Repository variables
- `FOOTBALL_LEAGUE_IDS` (optional; default: `39,140,2,78,61`)
- `FOOTBALL_SEASON` (optional; default: `2026`)

The default league IDs are Premier League (39), Champions League (2), La Liga (140), Bundesliga (78) and Ligue 1 (61). Change the variable if you want different competitions.

## Supabase steps

1. Back up production.
2. Run `footballpoints_upgrade.sql` in Supabase SQL Editor.
3. Run `footballpoints_compatibility.sql`.
4. Confirm the `admin_users` table contains the intended admin user.
5. Verify RLS policies.

The GitHub jobs use the service-role key only in Actions. Never put that key in `app.js` or browser code.

## Real data provider

The implementation uses API-Football's v3 REST API. Its fixtures endpoint provides fixture IDs, kickoff timestamps and status codes, and its player endpoints provide real player profile data and photos. Provider coverage varies by competition, so the app treats missing data as missing data rather than inventing it.

## Player sync and API quota

The daily fixture job keeps squad synchronization off by default to avoid wasting API quota. To populate/refresh all team squads, run the sync workflow with `SYNC_SQUADS=true` only when your provider plan has enough request capacity. The provider's free plan is currently limited to 100 requests/day and 10 requests/minute, so aggressive multi-league squad polling is intentionally avoided.

## Safe deployment

1. Run the security workflow.
2. Run the daily sync workflow manually once.
3. Confirm `fp_fixtures` contains real provider IDs and kickoff timestamps.
4. Open FootballPoints -> Matches and verify league grouping.
5. Open a match and verify only the two teams' players appear.
6. Confirm the robot workflow writes `fp_robot_runs`.
7. Only then rely on the scheduled jobs.
