/* BetSquad Robot Engine Contract — protected specification.
 * Robots are not UI-only players. They must be server-authoritative before real-money use.
 * 1v1: never add a robot. Multiplayer: robot may fill a missing seat only when configured.
 * Display name: Emeka. Default game stake is the current game stake (Whot/Dice/Snooker: ₦500).
 * Loss streak guard: after 3 consecutive losses, robot stops/re-enters only under room rules.
 * Never manipulate outcomes to guarantee a win; RNG must remain auditable.
 */
(function(){'use strict';window.BetSquadRobotContract={name:'Emeka',oneVsOneNoBot:true,fillMissingMultiplayerSeat:true,defaultStakeNaira:500,maxConsecutiveLosses:3,authoritativeSettlementRequired:true};})();
