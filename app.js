import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// match_rooms.js and admin_manual_payout.js load as plain (non-module) scripts
// and need direct access to these — module-scoped consts are NOT global by default.
window.supabase = supabase;

const leagueNeed={GK:1,DEF:3,MID:2,ST:1};
const friendlyNeed={GK:1,DEF:2,MID:1,ST:1};
function currentNeed(){return state.mode==="friendly"?friendlyNeed:leagueNeed}
function teamSize(){return Object.values(currentNeed()).reduce((a,b)=>a+b,0)}
const state={page:"home",mode:"league",filter:"ALL",selected:[],user:null,round:null,dbPlayers:[],loadingPlayers:false,menuOpen:false,inQueue:false,queueCount:0,friendlyMatchId:null,friendlyMode:null,fixtures:[],selectedFixture:null,loadingFixtures:false};
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
    // Calls the sync-players Edge Function, which pulls the full real
    // player list from the FPL API right now and updates the database.
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
window.pickFixture=async id=>{
  const f=state.fixtures.find(x=>x.id===id);
  if(!f)return;
  state.selectedFixture=f;
  await window.start(state.mode==="friendly"?"friendly":"league");
};
window.clearFixture=()=>{state.selectedFixture=null;render()};
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
window.signIn=async()=>{
  const email=document.querySelector("#email").value.trim(), password=document.querySelector("#password").value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return alert(error.message);
  await session(); state.menuOpen=false; render();
};
window.signUp=async()=>{
  const name=document.querySelector("#name").value.trim(), email=document.querySelector("#email").value.trim(), password=document.querySelector("#password").value;
  if(!name||!email||password.length<6)return alert("Enter name, email and a password of at least 6 characters.");
  const {error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
  if(error)return alert(error.message);
  alert("Account created. Check your email if confirmation is enabled.");
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
<nav class="nav">${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}</nav>
<div class="top-right">
${state.user?`<button class="secondary desktop-only" onclick="signOut()">Sign out</button>`:`<button class="secondary desktop-only" onclick="go('auth')">Login</button>`}
<button class="menu-btn" onclick="toggleMenu()" aria-label="Menu">${state.menuOpen?"✕":"☰"}</button>
</div>
</header>
<div class="mobile-menu ${state.menuOpen?"open":""}">
${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}
${state.user?`<button onclick="signOut()">Sign out</button>`:`<button onclick="go('auth')">Login</button>`}
</div>`;
}

function auth(){return `<div class="two"><div class="panel"><span class="badge">ACCOUNT</span><h2>Login / Register</h2>
<div class="form"><input id="name" placeholder="Name for registration"><input id="email" type="email" placeholder="Email"><input id="password" type="password" placeholder="Password">
<div class="actions"><button class="primary" onclick="signUp()">Create account</button><button class="secondary" onclick="signIn()">Sign in</button></div></div></div>
<div class="panel"><h3>Database account</h3><p class="muted">Your submitted team is associated with your authenticated user ID.</p></div></div>`}

function home(){return `<section class="hero"><div class="panel"><span class="badge">FREE TO PLAY • POINTS ONLY</span>
<h1>Pick real players.<br><span class="green">Score points from real matches.</span></h1>
<p class="muted">No money changes hands here — this is a free fantasy-style game. You build an 11-player team using real footballers, and when they play their real matches, their actual performance (goals, assists, clean sheets) earns you points automatically.</p>
<div class="actions">${state.user?`<button class="primary" onclick="go('matches')">Join League</button>`:`<button class="primary" onclick="go('auth')">Create account</button>`}<button class="secondary" onclick="go('friendly')">Friendly</button></div></div>
<div class="panel"><h3>Scoring</h3><p class="muted" style="margin-top:0">Points update automatically once real matches are played.</p>${["Goal|+5","Assist|+3","Clean sheet|+4","Team win|+2","Yellow card|-1"].map(x=>{const [a,b]=x.split("|");return`<div class="row"><span>${a}</span><b>${b}</b></div>`}).join("")}</div></section>

<div class="section"><h2>How it works</h2></div>
<div class="grid">
<div class="card"><span class="badge">STEP 1</span><h3>Create an account</h3><p class="muted">Sign up with your name, email and a password. This is what saves your team and points to the database.</p></div>
<div class="card"><span class="badge">STEP 2</span><h3>Build your team</h3><p class="muted">League rounds use a 7-player team (1 GK, 3 DEF, 2 MID, 1 ST). Friendly matches use a 5-player team (1 GK, 2 DEF, 1 MID, 1 ST).</p></div>
<div class="card"><span class="badge">STEP 3</span><h3>Save your team</h3><p class="muted">Once every slot is filled, save your team. It's now entered into the round or match.</p></div>
<div class="card"><span class="badge">STEP 4</span><h3>Real matches happen</h3><p class="muted">As the real fixtures are played, your picked players' real actions (goals, assists, clean sheets) earn points using the scoring table.</p></div>
<div class="card"><span class="badge">STEP 5</span><h3>Points add up</h3><p class="muted">All your players' points are added together automatically to give your total score.</p></div>
<div class="card"><span class="badge">STEP 6</span><h3>Check the leaderboard</h3><p class="muted">See where you rank against everyone else who entered the same round, ordered by total points.</p></div>
</div>

<div class="section"><h2>The sections, explained</h2></div>
<div class="grid">
<div class="card"><h3>Home</h3><p class="muted">This page — an overview of the game and how it works.</p></div>
<div class="card"><h3>Rounds</h3><p class="muted">Shows the current open round. Multiple players can all enter the same round and compete against each other.</p></div>
<div class="card"><h3>Friendly</h3><p class="muted">A smaller, head-to-head style team-building mode, separate from the shared round.</p></div>
<div class="card"><h3>Leaderboard</h3><p class="muted">Ranks every entrant in the current round by total points, highest first.</p></div>
</div>`}

function matches(){
  if(state.loadingFixtures) return `<div class="panel"><h3>Loading upcoming matches...</h3><p class="muted">Pulling the current real Premier League fixture list live.</p></div>`;
  return `<div class="section"><h2>Upcoming matches</h2></div>
<p class="muted" style="margin-top:-8px">Pick a real match — you'll then only see players from those two clubs when building your team.</p>
<div class="grid">
${state.fixtures.map(f=>`<div class="card"><span class="badge">${f.kickoff_at?new Date(f.kickoff_at).toLocaleString([], {weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"TBD"}</span>
<h3>${f.home_team} vs ${f.away_team}</h3>
<button class="primary" onclick="pickFixture('${f.id}')">Build team for this match</button></div>`).join("")||`<div class="card"><p class="muted">No upcoming fixtures found yet.</p></div>`}
</div>`;
}

function rounds(){return `<div class="section"><h2>Rounds</h2></div><div class="card"><span class="badge">${state.round?.status?.toUpperCase()||"NO OPEN ROUND"}</span>
<h3>${state.round?.name||"No open round"}</h3><p class="muted">${state.round?"Multiple users can enter this same shared round.":"Create an OPEN round in Supabase first."}</p><button class="primary" onclick="go('matches')">Pick a match</button></div>`}

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
<p class="muted">Join the queue and you'll be grouped with 4 other waiting players for a 5-a-side points match. If not enough people are around, it automatically falls back to a 1v1 after a short wait — no money involved, points only.</p>
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
<p class="muted" style="margin-top:-8px">Points update automatically as real matches are played — this refreshes every 30 seconds.</p>
<div class="panel"><table class="table">
<tr><th>#</th><th>Player</th><th>Points</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.profiles?.display_name||"Player"}</td><td>${r.total_points}</td></tr>`).join("")||"<tr><td colspan=3>No teams submitted.</td></tr>"}</table></div>`;
}

function builder(){
 if(state.loadingPlayers) return `<div class="panel"><h3>Syncing the latest players from FPL...</h3><p class="muted">This pulls the current real Premier League player list live.</p></div>`;
 const need=currentNeed(); const size=teamSize();
 const clubs=state.selectedFixture?[state.selectedFixture.home_team,state.selectedFixture.away_team]:null;
 const list=state.dbPlayers.filter(p=>(state.filter==="ALL"||p.position===state.filter)&&(!clubs||clubs.includes(p.club)));
 const slots=["GK",...Array(need.DEF).fill("DEF"),...Array(need.MID).fill("MID"),...Array(need.ST).fill("ST")];
 return `<button class="back" onclick="go('${state.mode==="league"?"rounds":"friendly"}')">← Back</button>
<div class="section"><h2>Build your ${size}</h2><span class="badge">${state.selected.length}/${size}</span></div>
${state.selectedFixture?`<p class="notice">Building for: <b>${state.selectedFixture.home_team} vs ${state.selectedFixture.away_team}</b> — <a href="#" onclick="clearFixture();return false;" style="color:#75e7a2">show all players instead</a></p>`:""}
<div class="builder"><div class="panel"><h3>Your team</h3><div class="formation">${slots.map(pos=>{const p=state.selected.filter(x=>x.position===pos)[0];return`<div class="slot ${pos==="GK"?"gk":""} ${p?"filled":""}">${p?`<div><b>${p.name}</b><div class="small">${p.club||""}</div></div>`:pos}</div>`}).join("")}</div>
<button class="primary" style="width:100%;margin-top:12px" onclick="submitTeam()">Save team</button></div>
<div class="panel"><h3>Players</h3><div class="filters">${["ALL","GK","DEF","MID","ST"].map(f=>`<button class="${state.filter===f?"active":""}" onclick="filter('${f}')">${f}</button>`).join("")}</div>
${list.map(p=>`<div class="row"><div><b>${p.name}</b><div class="small">${p.club||""} • ${p.position}</div></div><button class="secondary" onclick="add('${p.id}')">${state.selected.some(x=>x.id===p.id)?"Selected":"Pick"}</button></div>`).join("")}</div></div>`;
}

const rooms=async()=>{await prepareRoomsPage();return roomsPage()};
const room=async()=>roomLobby();
const admin=async()=>{await loadAdmin();return adminDashboard()};
const pages={home,auth,rooms,room,admin,rounds,friendly,leaderboard,builder,matches};
async function render(){document.querySelector("#app").innerHTML=nav()+`<main class="wrap">${await pages[state.page]()}</main>`}
window.render = render;
async function boot(){await session();await loadRound();await loadDbPlayers();await render()}
supabase.auth.onAuthStateChange(async()=>{await session();await render()});
boot();
