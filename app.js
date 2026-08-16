import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

/*
  SETUP:
  1. Create a Supabase project.
  2. Run supabase_schema.sql in SQL Editor.
  3. Replace the two placeholders below.
  4. Never put a service-role/secret key in this file.
*/
const SUPABASE_URL = "https://eavamfsbasjvngeqsyua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_E40QKzlb3dtIoawvmxPHfA_07t2XIxu";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.supabase = supabase;

/* ---------- VISIBLE ERROR BANNER ----------
   Since dev tools aren't always available, this shows any
   JavaScript error or failed request directly on the page,
   in a red banner at the top, instead of failing silently. */
function showErrorBanner(msg){
  let el = document.querySelector("#debugBanner");
  if(!el){
    el = document.createElement("div");
    el.id = "debugBanner";
    el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:10px 14px;font:13px monospace;white-space:pre-wrap;max-height:40vh;overflow:auto;";
    document.body.prepend(el);
  }
  const line = document.createElement("div");
  line.style.marginTop = "6px";
  line.textContent = "⚠ " + msg;
  el.appendChild(line);
}
window.addEventListener("error", e=>{
  showErrorBanner((e.message||"Unknown error") + (e.filename?` (${e.filename.split("/").pop()}:${e.lineno})`:""));
});
window.addEventListener("unhandledrejection", e=>{
  showErrorBanner("Unhandled: " + (e.reason?.message || e.reason));
});
/* ------------------------------------------ */

/* ---------- BOOT CONFIRMATION BANNER ----------
   Shows a green banner for a few seconds when app.js has
   successfully loaded and started running. If you NEVER see
   this banner on page load, app.js itself failed to load
   (wrong filename/path, GitHub Pages caching, or a network
   block) — that's a different problem than a sign-in bug. */
function showBootBanner(msg, ok){
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:99998;background:${ok?"#1f7a3f":"#c0392b"};color:#fff;padding:8px 14px;font:12px monospace;text-align:center;`;
  el.textContent = msg;
  document.body.prepend(el);
  if(ok) setTimeout(()=>el.remove(), 4000);
}
/* ------------------------------------------ */

const leagueNeed={GK:1,DEF:3,MID:2,ST:1};
const friendlyNeed={GK:1,DEF:2,MID:1,ST:1};
function currentNeed(){return state.mode==="friendly"?friendlyNeed:leagueNeed}
function teamSize(){return Object.values(currentNeed()).reduce((a,b)=>a+b,0)}
const state={page:"home",mode:"league",filter:"ALL",selected:[],user:null,round:null,dbPlayers:[],loadingPlayers:false,menuOpen:false,inQueue:false,queueCount:0,friendlyMatchId:null,friendlyMode:null,fixtures:[],selectedFixtures:[],loadingFixtures:false};
window.state = state;

async function session(){
  const {data}=await supabase.auth.getSession();
  state.user=data.session?.user||null;
}
async function loadRound(){
  const {data}=await supabase.from("rounds").select("*")
    .eq("status","open").order("created_at",{ascending:false}).limit(1);
  state.round=data?.[0]||null;
}
async function loadDbPlayers(){
  const {data}=await supabase.from("players").select("id,name,club,position")
    .eq("active",true).order("name");
  state.dbPlayers=data||[];
}
async function syncPlayers(){
  try{
    await supabase.functions.invoke("sync-players");
  }catch(e){
    console.warn("Live player sync failed, showing existing data instead:", e.message);
  }
}
async function loadFixtures(){
  const {data}=await supabase.from("upcoming_fixtures").select("*")
    .eq("status","scheduled").order("kickoff_at",{ascending:true}).limit(20);
  state.fixtures=data||[];
}
async function syncFixtures(){
  try{
    await supabase.functions.invoke("sync-fixtures");
  }catch(e){
    console.warn("Live fixture sync failed, showing existing data instead:", e.message);
  }
}

window.go=p=>{
  state.page=p;state.menuOpen=false;
  if(p==="matches"){
    state.loadingFixtures=true;render();
    (async()=>{await syncFixtures();await loadFixtures();state.loadingFixtures=false;render();})();
    return;
  }
  render();
};
window.toggleFixture=id=>{
  const f=state.fixtures.find(x=>x.id===id);
  if(!f)return;
  if(state.selectedFixtures.some(x=>x.id===id)){
    state.selectedFixtures=state.selectedFixtures.filter(x=>x.id!==id);
  }else{
    state.selectedFixtures=[...state.selectedFixtures,f];
  }
  render();
};
window.buildTeamForSelectedFixtures=async()=>{
  if(!state.selectedFixtures.length)return alert("Pick at least one match first.");
  await window.start(state.mode==="friendly"?"friendly":"league");
};
window.clearFixtures=()=>{state.selectedFixtures=[];render()};
window.toggleMenu=()=>{state.menuOpen=!state.menuOpen;render()};
window.start=async m=>{
  state.mode=m;state.selected=[];state.page="builder";state.loadingPlayers=true;state.menuOpen=false;render();
  await syncPlayers();
  await loadDbPlayers();
  await loadRound();
  state.loadingPlayers=false;render();
};
window.filter=f=>{state.filter=f;render()};
window.signOut=async()=>{await supabase.auth.signOut();state.user=null;state.selected=[];state.menuOpen=false;render()};

/* signIn/signUp now wrapped in try/catch so ANY failure
   (network, typo in field id, Supabase misconfiguration, etc.)
   shows up as an alert AND in the red banner, instead of
   the button silently doing nothing. */
window.signIn=async()=>{
  console.log("[signIn] button clicked");
  try{
    const emailEl=document.querySelector("#email"), passEl=document.querySelector("#password");
    if(!emailEl||!passEl){ showErrorBanner("Sign-in form fields not found on page."); return; }
    const email=emailEl.value.trim(), password=passEl.value;
    if(!email||!password){ alert("Enter both email and password."); return; }
    if(!window.supabase){ showErrorBanner("Supabase client not ready yet. Wait a second and try again."); return; }
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){ alert(error.message); showErrorBanner("Sign in failed: "+error.message); return; }
    await session(); state.menuOpen=false; state.page="home"; render();
  }catch(e){
    showErrorBanner("Sign in crashed: " + e.message);
    alert("Something went wrong signing in: " + e.message);
  }
};
window.signUp=async()=>{
  console.log("[signUp] button clicked");
  try{
    const nameEl=document.querySelector("#name"), emailEl=document.querySelector("#email"), passEl=document.querySelector("#password");
    if(!nameEl||!emailEl||!passEl){ showErrorBanner("Sign-up form fields not found on page."); return; }
    const name=nameEl.value.trim(), email=emailEl.value.trim(), password=passEl.value;
    if(!name||!email||password.length<6)return alert("Enter name, email and a password of at least 6 characters.");
    if(!window.supabase){ showErrorBanner("Supabase client not ready yet. Wait a second and try again."); return; }
    const {error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
    if(error){ alert(error.message); showErrorBanner("Sign up failed: "+error.message); return; }
    alert("Account created. Check your email if confirmation is enabled.");
  }catch(e){
    showErrorBanner("Sign up crashed: " + e.message);
    alert("Something went wrong signing up: " + e.message);
  }
};
window.add=id=>{
  const p=state.dbPlayers.find(x=>x.id===id);
  if(!p)return;
  if(state.selected.some(x=>x.id===p.id))return;
  const need=currentNeed();
  if(!need[p.position])return alert(`No ${p.position} slot in this team size.`);
  if(state.selected.filter(x=>x.position===p.position).length>=need[p.position])return alert(`This team allows ${need[p.position]} ${p.position} player(s).`);
  state.selected.push(p);render();
};
window.submitTeam=async()=>{
  if(!state.user)return go("auth");
  const need=currentNeed();
  if(!Object.keys(need).every(k=>state.selected.filter(x=>x.position===k).length===need[k]))
    return alert(`Complete all ${teamSize()} positions.`);

  if(state.mode==="friendly"&&state.friendlyMatchId){
    const {data:entry,error:e1}=await supabase.from("friendly_match_entries")
      .insert({match_id:state.friendlyMatchId,user_id:state.user.id,submitted_at:new Date().toISOString()})
      .select().single();
    if(e1)return alert(e1.message);
    const rows=state.selected.map(p=>({entry_id:entry.id,player_id:p.id,slot_position:p.position}));
    const {error:e2}=await supabase.from("friendly_match_entry_players").insert(rows);
    if(e2){await supabase.from("friendly_match_entries").delete().eq("id",entry.id);return alert(e2.message);}
    alert("Team saved. Waiting for real matches to be played to see your points.");
    state.page="friendly";render();
    return;
  }

  await loadRound();
  if(!state.round)return alert("No OPEN round exists in Supabase.");

  const {data:entry,error:e1}=await supabase.from("entries")
    .insert({round_id:state.round.id,user_id:state.user.id,submitted_at:new Date().toISOString()})
    .select().single();
  if(e1)return alert(e1.message);

  const rows=state.selected.map(p=>({entry_id:entry.id,player_id:p.id,slot_position:p.position}));
  const {error:e2}=await supabase.from("entry_players").insert(rows);
  if(e2){await supabase.from("entries").delete().eq("id",entry.id);return alert(e2.message);}
  alert("Team saved to Supabase.");
  state.page="leaderboard";render();
};

function nav(){
  const links=["home","rooms","rounds","friendly","leaderboard"];
  return `<header class="top">
<div class="brand">Football<span>Points</span></div>
<nav class="nav">${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}
${state.user?`<button class="${state.page==="wallet"?"active":""}" onclick="go('wallet')">Wallet</button><button class="${state.page==="admin"?"active":""}" onclick="loadAdmin()">Admin</button>`:""}</nav>
<div class="top-right">
${state.user?`<button class="secondary desktop-only" onclick="signOut()">Sign out</button>`:`<button class="secondary desktop-only" onclick="go('auth')">Login</button>`}
<button class="menu-btn" onclick="toggleMenu()" aria-label="Menu">${state.menuOpen?"✕":"☰"}</button>
</div>
</header>
<div class="mobile-menu ${state.menuOpen?"open":""}">
${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}
${state.user?`<button onclick="go('wallet')">Wallet</button><button onclick="loadAdmin()">Admin</button><button onclick="signOut()">Sign out</button>`:`<button onclick="go('auth')">Login</button>`}
</div>`;
}

function auth(){return `<div class="two"><div class="panel"><span class="badge">ACCOUNT</span><h2>Login / Register</h2>
<div class="form"><input id="name" placeholder="Name for registration"><input id="email" type="email" placeholder="Email"><input id="password" type="password" placeholder="Password">
<div class="actions"><button class="primary" onclick="signUp()">Create account</button><button class="secondary" onclick="signIn()">Sign in</button></div></div></div>
<div class="panel"><h3>Database account</h3><p class="muted">Your submitted team is associated with your authenticated user ID.</p></div></div>`}

function home(){return `<section class="hero"><div class="panel"><span class="badge">REAL FOOTBALL • REAL POINTS</span>
<h1>Pick real players.<br><span class="green">Win based on real points.</span></h1>
<p class="muted">You build a team using real footballers. When they play their real matches, their actual performance (goals, assists, clean sheets) earns you points automatically — no odds, no bookmaker.</p>
<div class="actions">${state.user?`<button class="primary" onclick="go('matches')">Join League</button>`:`<button class="primary" onclick="go('auth')">Create account</button>`}<button class="secondary" onclick="go('friendly')">Friendly</button></div></div>
<div class="panel"><h3>Scoring</h3><p class="muted" style="margin-top:0">Points update automatically once real matches are played.</p>${["Goal|+5","Assist|+3","Clean sheet|+4","Team win|+2","Yellow card|-1"].map(x=>{const [a,b]=x.split("|");return`<div class="row"><span>${a}</span><b>${b}</b></div>`}).join("")}</div></section>

<div class="panel" style="margin-top:16px"><h3>How prizes work in League rounds</h3>
<p class="muted">Some rounds carry a real prize pool. When they do: <b>1st place wins cash</b>, <b>2nd place wins cash</b>, and <b>3rd place onward earns Diamonds</b> — a non-cash reward you keep in your wallet. Every entrant always keeps the points they earned, win or not.</p></div>

<div class="section"><h2>How it works</h2></div>
<div class="grid">
<div class="card"><span class="badge">STEP 1</span><h3>Create an account</h3><p class="muted">Sign up with your name, email and a password. This is what saves your team and points to the database.</p></div>
<div class="card"><span class="badge">STEP 2</span><h3>Pick real matches</h3><p class="muted">Browse upcoming real fixtures and select as many as you want to build your team around.</p></div>
<div class="card"><span class="badge">STEP 3</span><h3>Build your team</h3><p class="muted">League rounds use a 7-player team (1 GK, 3 DEF, 2 MID, 1 ST). Friendly matches use a 5-player team (1 GK, 2 DEF, 1 MID, 1 ST).</p></div>
<div class="card"><span class="badge">STEP 4</span><h3>Real matches happen</h3><p class="muted">As the real fixtures are played, your picked players' real actions earn points automatically using the scoring table.</p></div>
<div class="card"><span class="badge">STEP 5</span><h3>Check the leaderboard</h3><p class="muted">See where you rank against everyone else who entered, ordered by total points, updating live.</p></div>
<div class="card"><span class="badge">STEP 6</span><h3>Get paid</h3><p class="muted">If the round has a prize pool: 1st & 2nd win cash to your Wallet. 3rd onward earns Diamonds. Manage both from the Wallet page.</p></div>
</div>

<div class="section"><h2>The sections, explained</h2></div>
<div class="grid">
<div class="card"><h3>Home</h3><p class="muted">This page — an overview of the game and how it works.</p></div>
<div class="card"><h3>Rooms</h3><p class="muted">Create or join a smaller room with friends around specific fixtures.</p></div>
<div class="card"><h3>Rounds</h3><p class="muted">Shows the current open round. Multiple players all enter the same round and compete.</p></div>
<div class="card"><h3>Friendly</h3><p class="muted">Random matchmaking — join a queue and get grouped into a live head-to-head or small group match.</p></div>
<div class="card"><h3>Leaderboard</h3><p class="muted">Ranks every entrant in the current round by total points, highest first, live.</p></div>
<div class="card"><h3>Wallet</h3><p class="muted">Your cash, points, and Diamonds. Request withdrawals here.</p></div>
</div>`}

function matches(){
  if(state.loadingFixtures) return `<div class="panel"><h3>Loading upcoming matches...</h3><p class="muted">Pulling the current real Premier League fixture list live.</p></div>`;
  return `<div class="section"><h2>Upcoming matches</h2></div>
<p class="muted" style="margin-top:-8px">Pick as many real matches as you want — you'll then only see players from those clubs when building your team.</p>
<div class="grid">
${state.fixtures.map(f=>{const picked=state.selectedFixtures.some(x=>x.id===f.id);return `<div class="card ${picked?"filled":""}"><span class="badge">${f.kickoff_at?new Date(f.kickoff_at).toLocaleString([], {weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"TBD"}</span>
<h3>${f.home_team} vs ${f.away_team}</h3>
<button class="${picked?"primary":"secondary"}" onclick="toggleFixture('${f.id}')">${picked?"✓ Selected":"Select this match"}</button></div>`}).join("")||`<div class="card"><p class="muted">No upcoming fixtures found yet.</p></div>`}
</div>
${state.selectedFixtures.length?`<div class="notice" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center">
<span>${state.selectedFixtures.length} match${state.selectedFixtures.length>1?"es":""} selected</span>
<span><button class="secondary" onclick="clearFixtures()">Clear</button> <button class="primary" onclick="buildTeamForSelectedFixtures()">Build team →</button></span>
</div>`:""}`;
}

function rounds(){return `<div class="section"><h2>Rounds</h2></div><div class="card"><span class="badge">${state.round?.status?.toUpperCase()||"NO OPEN ROUND"}</span>
<h3>${state.round?.name||"No open round"}</h3><p class="muted">${state.round?"Multiple users can enter this same shared round. 1st & 2nd place win cash, 3rd onward earns Diamonds.":"Create an OPEN round in Supabase first."}</p><button class="primary" onclick="go('matches')">Pick a match</button></div>`}

let lobbyTimer=null;
function stopLobbyTimer(){if(lobbyTimer){clearInterval(lobbyTimer);lobbyTimer=null;}}

window.joinFriendlyQueue=async()=>{
  if(!state.user)return go("auth");
  await supabase.from("friendly_lobby").insert({user_id:state.user.id,status:"waiting"});
  state.inQueue=true;render();
  pollLobby();
};
window.leaveFriendlyQueue=async()=>{
  stopLobbyTimer();
  await supabase.from("friendly_lobby").update({status:"cancelled"}).eq("user_id",state.user.id).eq("status","waiting");
  state.inQueue=false;state.queueCount=0;render();
};
async function pollLobby(){
  stopLobbyTimer();
  lobbyTimer=setInterval(async()=>{
    if(state.page!=="friendly"||!state.inQueue){stopLobbyTimer();return;}
    const {count}=await supabase.from("friendly_lobby").select("id",{count:"exact",head:true}).eq("status","waiting");
    state.queueCount=count||0;
    await supabase.rpc("try_form_friendly_match");
    const {data:mine}=await supabase.from("friendly_lobby").select("match_id,status").eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(1);
    const row=mine?.[0];
    if(row?.status==="matched"&&row.match_id){
      stopLobbyTimer();
      state.inQueue=false;
      state.friendlyMatchId=row.match_id;
      const {data:m}=await supabase.from("friendly_matches").select("mode").eq("id",row.match_id).single();
      state.friendlyMode=m?.mode||"room5";
      state.mode="friendly";state.selected=[];state.page="builder";state.loadingPlayers=true;render();
      await syncPlayers();await loadDbPlayers();
      state.loadingPlayers=false;render();
      return;
    }
    render();
  },3000);
}

function friendly(){return `<div class="section"><h2>Friendly</h2></div>
<div class="two">
<div class="card"><span class="badge">ROOM OF 5</span><h3>Random matchmaking</h3>
<p class="muted">Join the queue and you'll be grouped with 4 other waiting players for a 5-a-side points match. If not enough people are around, it automatically falls back to a 1v1 after a short wait — points only, bragging rights and Diamonds on the line, not cash.</p>
${state.inQueue?`<p class="notice">Waiting for players… ${state.queueCount||1} in queue right now.</p><button class="secondary" onclick="leaveFriendlyQueue()">Cancel</button>`
:`<button class="primary" onclick="joinFriendlyQueue()">Find a match</button>`}
</div>
<div class="card"><h3>How matching works</h3><p class="muted">The queue checks every few seconds. As soon as 5 people are waiting, a room forms automatically. If only 2 people have been waiting a short while, it becomes a 1v1 instead so nobody waits forever.</p></div>
</div>`}

let leaderboardTimer=null;
async function leaderboard(){
 await loadRound(); let rows=[];
 if(state.round){
  const {data}=await supabase.from("entries").select("user_id,total_points,profiles(display_name)")
    .eq("round_id",state.round.id).order("total_points",{ascending:false});
  rows=data||[];
 }
 if(!leaderboardTimer){
   leaderboardTimer=setInterval(()=>{if(state.page==="leaderboard")render();else{clearInterval(leaderboardTimer);leaderboardTimer=null;}},30000);
 }
 return `<div class="section"><h2>Leaderboard</h2><span class="badge">🔴 LIVE • ${rows.length} entrants</span></div>
<p class="muted" style="margin-top:-8px">Points update automatically as real matches are played — this refreshes every 30 seconds. 1st & 2nd win cash, 3rd onward earns Diamonds.</p>
<div class="panel"><table class="table">
<tr><th>#</th><th>Player</th><th>Points</th><th>Prize</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.profiles?.display_name||"Player"}</td><td>${r.total_points}</td><td>${i===0?"🏆 Cash":i===1?"🏆 Cash":i===2?"💎 Diamonds":"—"}</td></tr>`).join("")||"<tr><td colspan=4>No teams submitted.</td></tr>"}</table></div>`;
}

function builder(){
 if(state.loadingPlayers) return `<div class="panel"><h3>Syncing the latest players from FPL...</h3><p class="muted">This pulls the current real Premier League player list live.</p></div>`;
 const need=currentNeed(); const size=teamSize();
 const clubs=state.selectedFixtures.length?state.selectedFixtures.flatMap(f=>[f.home_team,f.away_team]):null;
 const list=state.dbPlayers.filter(p=>(state.filter==="ALL"||p.position===state.filter)&&(!clubs||clubs.includes(p.club)));
 const slots=["GK",...Array(need.DEF).fill("DEF"),...Array(need.MID).fill("MID"),...Array(need.ST).fill("ST")];
 return `<button class="back" onclick="go('${state.mode==="league"?"rounds":"friendly"}')">← Back</button>
<div class="section"><h2>Build your ${size}</h2><span class="badge">${state.selected.length}/${size}</span></div>
${clubs?`<p class="notice">Building from: <b>${clubs.join(", ")}</b> — <a href="#" onclick="clearFixtures();render();return false;" style="color:#75e7a2">show all players instead</a></p>`:""}
<div class="builder"><div class="panel"><h3>Your team</h3><div class="formation">${slots.map(pos=>{const p=state.selected.filter(x=>x.position===pos)[0];return`<div class="slot ${pos==="GK"?"gk":""} ${p?"filled":""}">${p?`<div><b>${p.name}</b><div class="small">${p.club||""}</div></div>`:pos}</div>`}).join("")}</div>
<button class="primary" style="width:100%;margin-top:12px" onclick="submitTeam()">Save team</button></div>
<div class="panel"><h3>Players</h3><div class="filters">${["ALL","GK","DEF","MID","ST"].map(f=>`<button class="${state.filter===f?"active":""}" onclick="filter('${f}')">${f}</button>`).join("")}</div>
${list.map(p=>`<div class="row"><div><b>${p.name}</b><div class="small">${p.club||""} • ${p.position}</div></div><button class="secondary" onclick="add('${p.id}')">${state.selected.some(x=>x.id===p.id)?"Selected":"Pick"}</button></div>`).join("")}</div></div>`;
}

async function wallet(){
  if(!state.user)return go("auth");
  const {data:w}=await supabase.from("game_wallets").select("points,diamonds,cash_balance").eq("user_id",state.user.id).single();
  const {data:reqs}=await supabase.from("withdrawal_requests").select("id,amount,status,created_at").eq("user_id",state.user.id).order("created_at",{ascending:false});
  return `<div class="section"><h2>Wallet</h2></div>
  <div class="grid">
    <div class="card"><b>Cash balance</b><p class="muted" style="font-size:22px;color:#55d98b">${Number(w?.cash_balance||0).toFixed(2)}</p></div>
    <div class="card"><b>Points</b><p class="muted" style="font-size:22px">${w?.points||0}</p></div>
    <div class="card"><b>💎 Diamonds</b><p class="muted" style="font-size:22px">${w?.diamonds||0}</p></div>
  </div>
  <p class="muted" style="margin-top:10px">Cash comes from winning 1st or 2nd place in a prize round. Diamonds come from finishing 3rd or lower in a prize round — a non-cash reward you can spend on future contests.</p>
  <div class="two" style="margin-top:16px">
    <div class="panel"><h3>Request a withdrawal</h3>
      <p class="muted">Withdrawals are reviewed and paid manually by an admin. Enter an amount and where to send it (bank/Opay/Moniepoint details).</p>
      <input id="wdAmount" type="number" step="0.01" min="1" placeholder="Amount">
      <input id="wdDestination" placeholder="Destination (e.g. Opay - 08xxxxxxxxx - Your Name)" style="margin-top:8px">
      <button class="primary" style="margin-top:10px" onclick="requestWithdrawal()">Request withdrawal</button>
      <h4 style="margin-top:18px">Your requests</h4>
      ${(reqs||[]).map(r=>`<div class="row"><span>${Number(r.amount).toFixed(2)} • ${new Date(r.created_at).toLocaleDateString()}</span><span class="badge">${r.status.toUpperCase()}</span></div>`).join("")||"<p class='muted'>No withdrawal requests yet.</p>"}
    </div>
    <div class="panel"><h3>How to deposit</h3>
      <p class="muted">Automatic deposits aren't live yet. For now, deposits are handled manually:</p>
      <div class="notice">1. Send your desired amount via bank transfer or Opay/Moniepoint to the account shown on our support page.<br>2. Send proof of payment to our support contact.<br>3. An admin will credit your wallet within 24 hours.</div>
    </div>
  </div>`;
}
window.requestWithdrawal=async()=>{
  const amount=parseFloat(document.querySelector("#wdAmount").value);
  const destination=document.querySelector("#wdDestination").value.trim();
  if(!amount||amount<=0)return alert("Enter a valid amount.");
  if(!destination)return alert("Enter where the payout should be sent.");
  const {error}=await supabase.from("withdrawal_requests").insert({user_id:state.user.id,amount,destination,status:"pending"});
  if(error)return alert(error.message);
  alert("Withdrawal requested. An admin will review it.");
  render();
};

const rooms=async()=>{await prepareRoomsPage();return roomsPage()};
const room=async()=>roomLobby();
const admin=async()=>{await loadAdmin();return adminDashboard()};
const pages={home,auth,rooms,room,admin,rounds,friendly,leaderboard,builder,matches,wallet};
async function render(){document.querySelector("#app").innerHTML=nav()+`<main class="wrap">${await pages[state.page]()}</main>`}
window.render = render;
async function boot(){
  try{
    await render();
    showBootBanner("✓ App loaded successfully (app.js is running)", true);
    await session();
    await loadRound();
    await loadDbPlayers();
    await render();
  }catch(e){
    showBootBanner("✗ Startup failed — see red banner below", false);
    showErrorBanner("Startup failed: " + e.message);
  }
}
supabase.auth.onAuthStateChange(async()=>{await session();await render()});

/* Run boot() reliably even if this module executes before or
   after the DOM is fully parsed. */
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", boot);
}else{
  boot();
}
