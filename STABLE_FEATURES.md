# BetSquad Stable Feature Contract

This file is the regression guard for features that have already been repaired and verified.

## Rule: DO NOT casually rewrite working features

Once a feature is marked **STABLE**, future changes must not rewrite, replace, or remove its working behavior just to fix an unrelated feature. Make the smallest additive change possible and test the affected feature plus the stable features below.

## Current STABLE areas

- Core startup and Home rendering
- Main navigation
- Rooms navigation and room recovery
- Resume/Continue existing game flow
- Wallet navigation
- Leaderboard navigation
- Back navigation
- Physical Whot card rendering and touch/click play
- Whot legality checks, Pick 2, and General Market rules
- In-room realtime chat
- Voice-chat controls and voice signaling
- BetSquad branding

## Required regression checks before changing stable code

1. Home loads without a blank/loading-only screen.
2. Rooms opens and Back returns to the previous page.
3. Resume Game returns to the existing room without charging a second stake.
4. Wallet opens and Back works.
5. Leaderboard opens and Back works.
6. Whot physical cards are visible and clickable/tappable.
7. Illegal Whot cards remain in the player's hand.
8. Legal Whot cards are sent to the game engine.
9. Pick 2 and General Market behavior remains intact.
10. Players in the same room can see room chat messages.
11. Voice controls remain visible and do not block page navigation.

## Change policy

- Do not add another duplicate recovery/menu script when an existing module can be fixed.
- Do not remove a script from `index.html` without checking which stable feature depends on it.
- Do not change working Whot card interaction while fixing navigation, wallet, rooms, chat, or voice.
- Do not change working chat while fixing cards or voice.
- Do not change working voice while fixing rooms or navigation.
- Cache-bust changed browser scripts when deploying a frontend fix.
- If a change breaks a stable feature, fix or revert that change before continuing with unrelated work.

## Important

This is a project-level lock/contract, not a substitute for GitHub branch protection. The implementation rule for future BetSquad work is: **repair once, verify, then freeze that working path unless a new bug specifically requires changing it.**
