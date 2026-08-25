/* BetSquad Whot special-card rules: 1 hold, 2 pick-two, 8 skip, 14 general market. */
(function(){
  'use strict';
  const RULES={hold:1,pick2:2,skip:8,generalMarket:14};
  function nextIndex(players,current,offset=1){
    if(!players.length)return -1;
    return (current+offset)%players.length;
  }
  function applySpecial(state,cardIndex){
    if(!state||!Array.isArray(state.players)||!state.players.length)return state;
    const card=state.discard?.[state.discard.length-1]||state.lastCard;
    const n=Number(card?.number??card?.value);
    if(!Number.isFinite(n))return state;
    const players=state.players;
    const current=Math.max(0,players.indexOf(state.currentPlayerId));
    state.specialRule=null;
    if(n===RULES.hold){
      state.specialRule='hold';
      state.holdPlayerId=players[current];
      state.currentPlayerId=players[current];
    } else if(n===RULES.pick2){
      state.specialRule='pick2';
      state.pick2Pending=(Number(state.pick2Pending)||0)+2;
      state.currentPlayerId=players[nextIndex(players,current,1)];
      state.autoDrawForPick2=true;
    } else if(n===RULES.skip){
      state.specialRule='skip';
      state.skippedPlayerId=players[nextIndex(players,current,1)];
      state.currentPlayerId=players[nextIndex(players,current,2)];
    } else if(n===RULES.generalMarket){
      state.specialRule='general_market';
      state.generalMarketPending=true;
      state.generalMarketDraw=1;
      state.currentPlayerId=players[nextIndex(players,current,1)];
    }
    return state;
  }
  window.betSquadWhotSpecialRules={RULES,applySpecial};
})();
