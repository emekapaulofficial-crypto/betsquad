# BetSquad Locked Features

This file is the source of truth for features that must not be silently removed or changed while stability work is in progress.

## Stability
- Authentication must remain functional for sign-in, sign-up, session restore, and sign-out.
- Navigation and scrolling must remain user-controlled; no automatic page movement.
- Realtime listeners, timers, and subscriptions must be cleaned up when their owning screen/room is left.
- Existing working features must not be replaced by speculative rewrites.

## FootballPoints
- Real football fixtures only; no invented matches.
- Fixture processing must support multiple leagues, not Premier League only.
- Team selection must enforce the configured formation and reject invalid picks.
- Completed fixture data must not be presented as upcoming scheduled fixtures.

## Games
- Dice, Whot, and Snooker remain available through the Games area.
- Game outcomes must use the existing authoritative game engines and secure randomness where applicable.
- Room state and turn order must remain deterministic and recoverable after reconnects.

## Wallet and administration
- Deposits, withdrawals, stakes, payouts, refunds, and room clearing must remain protected by authorization checks.
- Finished/cleared operational records must not be reintroduced by client-side stale state.
- Admin-only operations must never be exposed as an unauthenticated client capability.

## Change policy
1. Audit before changing behavior.
2. Add or update regression tests for every bug fixed.
3. Run the full test and syntax audit before deployment.
4. Do not deploy a change with a failing test or unresolved runtime error.
5. Do not silently change locked behavior; document intentional changes here first.
