# BetSquad Whot Engine — LOCKED RULE CONTRACT

This file is the protected contract for Whot gameplay. Do not change these rules while fixing unrelated features.

## Card rules
- 1 = Hold On: the same player continues.
- 2 = Pick Two: the next player draws/picks 2 and loses the normal turn according to the active stacking rules.
- 5 = Pick Three: the next player draws/picks 3 and loses the normal turn according to the active stacking rules.
- 8 = Suspension: skip the next player.
- 14 = General Market: every player draws/picks according to the market rule.
- 20 = Whot: the Whot card follows the game-choice rule and scores 20 when final cards are counted.
- A card that is not legal for the current turn must not be played.
- A legal physical card must be passed to the authoritative game engine immediately when tapped/clicked.
- Always display the player whose turn is next.

## End-of-market rule
When the draw/market/deck is exhausted before a player has emptied their hand:
1. Stop drawing.
2. Tender/reveal all remaining cards for every player in that game set.
3. Calculate each player's final card total.
4. Star cards count double under the Nigerian Whot scoring rule.
5. Whot counts as 20.
6. Lowest total is Winner 1.
7. Next-lowest total is Winner 2.
8. For four players, rank all players by their final total.
9. Display winner name, final total and winnings.
10. Settlement must credit the authoritative wallet ledger exactly once.

## Cancellation rule
- A Primary Admin/authorized Admin has a separate Close Game control.
- Closing a live/staked game is cancellation, not a win.
- Every player's stake in the cancelled game must be refunded exactly once.
- No admin percentage is taken from a cancelled game.
- The cancellation/refund must be performed by an authoritative server/database transaction, not by trusting browser-supplied wallet balances.
- The UI must clearly show the game as cancelled and refunded.
- Duplicate cancellation requests must be idempotent.

## Stability lock
Once these rules are implemented and verified, do not rewrite them while fixing navigation, wallet, rooms, chat, voice or unrelated UI.
