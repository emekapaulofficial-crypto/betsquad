import { secureInt } from './fairRandom.js';

export const DICE_ROUNDS = 4;
export const DICE_COUNT = 1;
export const DICE_SIDES = 6;

export function rollDice(count = DICE_COUNT, sides = DICE_SIDES) {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Invalid dice count');
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('Invalid dice sides');
  const values = Array.from({ length: count }, () => secureInt(1, sides));
  return { values, total: values.reduce((sum, value) => sum + value, 0) };
}

/** Four-round head-to-head Dice game. Each player rolls one die exactly four times. Highest cumulative total wins. */
export function createDiceState(playerIds, rounds = DICE_ROUNDS) {
  if (!Array.isArray(playerIds) || playerIds.length < 2) throw new Error('At least two players required');
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Player IDs must be unique');
  return { playerIds:[...playerIds], rounds, currentRound:1, currentPlayerIndex:0, totals:Object.fromEntries(playerIds.map(id=>[id,0])), rolls:Object.fromEntries(playerIds.map(id=>[id,[]])), lastRoll:null, status:'playing', winner:null, tie:false };
}
export function currentDicePlayer(state){return state.playerIds[state.currentPlayerIndex];}
export function applyDiceRoll(state, playerId, values){
  if(!state||state.status!=='playing')throw new Error('Game is finished');
  if(currentDicePlayer(state)!==playerId)throw new Error("Not this player's turn");
  if(!Array.isArray(values)||values.length!==1||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw new Error('Dice requires exactly one six-sided die');
  const total=values[0];state.lastRoll={playerId,round:state.currentRound,values:[...values],total};state.rolls[playerId].push({round:state.currentRound,values:[...values],total});state.totals[playerId]+=total;
  if(state.currentPlayerIndex===state.playerIds.length-1){
    if(state.currentRound>=state.rounds){const sorted=[...state.playerIds].sort((a,b)=>state.totals[b]-state.totals[a]);const high=state.totals[sorted[0]];const winners=sorted.filter(id=>state.totals[id]===high);state.status='finished';state.winner=winners.length===1?winners[0]:null;state.tie=winners.length>1;return{event:state.tie?'tie':'winner',round:state.currentRound,total,winner:state.winner,winners,finalTotals:{...state.totals}};}
    state.currentRound+=1;
  }
  state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.playerIds.length;
  return{event:'roll',round:state.currentRound,total,finalTotals:{...state.totals}};
}
export const PIG_TARGET_SCORE=100;
export function createPigState(playerIds){return createDiceState(playerIds,DICE_ROUNDS);}
export function applyPigRoll(state,playerId,values){return applyDiceRoll(state,playerId,values);}
export function holdPigTurn(){throw new Error('This Dice game has no Hold rule. Each player rolls one die four times.');}
export function getPigTurn(state){return currentDicePlayer(state);}
export function rankPigPlayers(state){return [...state.playerIds].map(pid=>({pid,score:state.totals[pid]})).sort((a,b)=>b.score-a.score);}
export function resolveHighestTotal(results){if(!Array.isArray(results)||results.length<2)throw new Error('At least two results required');const sorted=[...results].sort((a,b)=>b.total-a.total),top=sorted[0].total,winners=sorted.filter(r=>r.total===top);return{winners,tie:winners.length>1};}
