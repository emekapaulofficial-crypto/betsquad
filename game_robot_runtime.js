/* Protected game-robot runtime contract. Actual game outcomes remain server-authoritative. */
(function(){'use strict';
 const C=window.BetSquadRobotContract||{};
 window.BetSquadGameRobot={
  name:C.name||'Emeka',
  canJoin:function(gameType,playerCount){return !!C.fillMissingMultiplayerSeat && playerCount>1 && playerCount<4},
  chooseRandom:function(items){return items.length?items[Math.floor(Math.random()*items.length)]:null},
  finalResult:function(players){return [...players].sort((a,b)=>Number(a.total||0)-Number(b.total||0))}
 };
})();
