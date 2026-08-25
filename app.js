import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm"

/*
  SETUP:
  1. Create a Supabase project.
  2. Run supabase_schema.sql in SQL Editor.
  3. Replace the two placeholders below.
  4. Never put a service-role/secret key in this file.
  IMPORTANT: Browser Web Locks can deadlock Supabase Auth on some Chromium environments.
*/
const SUPABASE_URL = "https://eavamfsbasjvngeqsyua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_E40QKzlb3dtIoawvmxPHfA_07t2XIxu";
const noOpAuthLock = async (_name, _acquireTimeout, fn) => await fn();
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { lock: noOpAuthLock } });
window.supabase = supabase;

function showErrorBanner(msg){
  let el = document.querySelector("#debugBanner");
  if(!el){
    el = document.createElement("div"); el.id = "debugBanner";
    el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:10px 14px;font:13px monospace;white-space:pre-wrap;max-height:40vh;overflow:auto;";
    document.body.prepend(el);
  }
  const line = document.createElement("div"); line.style.marginTop = "6px"; line.textContent = "⚠ " + msg; el.appendChild(line);
}
window.addEventListener("error", e=>showErrorBanner((e.message||"Unknown error") + (e.filename?` (${e.filename.split("/").pop()}:${e.lineno})`:"")));
window.addEventListener("unhandledrejection", e=>showErrorBanner("Unhandled: " + (e.reason?.message || e.reason)));

function showAuthMessage(msg, type){
  const el = document.querySelector("#authMsg");
  if(!el) return alert(msg);
  el.textContent = msg; el.style.display = "block"; el.style.padding = "10px 12px"; el.style.borderRadius = "8px"; el.style.margin = "10px 0"; el.style.fontSize = "14px";
  if(type==="error"){ el.style.background="#fdecea"; el.style.color="#c0392b"; el.style.border="1px solid #f5b7b1"; }
  else if(type==="success"){ el.style.background="#eafaf1"; el.style.color="#1e8449"; el.style.border="1px solid #a9dfbf"; }
  else { el.style.background="#eaf2fb"; el.style.color="#1a5276"; el.style.border="1px solid #aed6f1"; }
}
function clearAuthMessage(){const el=document.querySelector("#authMsg");if(el){el.style.display="none";el.textContent="";}}
window.showAuthMessage = showAuthMessage;

const leagueNeed={GK:1,DEF:3,MID:2,ST:1};
const friendlyNeed={GK:1,DEF:2,MID:1,ST:1};
function currentNeed(){return state.mode==="friendly"?friendlyNeed:leagueNeed}
function teamSize(){return Object.values(currentNeed()).reduce((a,b)=>a+b,0)}
const state={page:"home",mode:"league",filter:"ALL",selected:[],user:null,round:null,dbPlayers:[],loadingPlayers:false,menuOpen:false,inQueue:false,queueCount:0,friendlyMatchId:null,friendlyMode:null,fixtures:[],selectedFixtures:[],loadingFixtures:false};
window.state = state;

async function session(){const {data}=await supabase.auth.getSession();state.user=data.session?.user||null;}
async function loadRound(){const {data}=await supabase.from("rounds").select("*").eq("status","open").order("created_at",{ascending:false}).limit(1);state.round=data?.[0]||null;}
async function loadDbPlayers(){const {data}=await supabase.from("players").select("id,name,club,position").eq("active",true).order("name");state.dbPlayers=data||[];}
async function syncPlayers(){try{await supabase.functions.invoke("sync-players");}catch(e){console.warn("Live player sync failed, showing existing data instead:",e.message);}}
async function loadFixtures(){const {data}=await supabase.from("upcoming_fixtures").select("*").eq("status","scheduled").order("kickoff_at",{ascending:true}).limit(20);state.fixtures=data||[];}
async function syncFixtures(){try{await supabase.functions.invoke("sync-fixtures");}catch(e){console.warn("Live fixture sync failed, showing existing data instead:",e.message);}}

window.go=p=>{state.page=p;state.menuOpen=false;if(p==="matches"){state.loadingFixtures=true;render();(async()=>{await syncFixtures();await loadFixtures();state.loadingFixtures=false;render();})();return;}render();};
window.toggleFixture=id=>{const f=state.fixtures.find(x=>x.id===id);if(!f)return;if(state.selectedFixtures.some(x=>x.id===id)){state.selectedFixtures=state.selectedFixtures.filter(x=>x.id!==id);}else{state.selectedFixtures=[...state.selectedFixtures,f];}render();};
window.buildTeamForSelectedFixtures=async()=>{if(!state.selectedFixtures.length)return alert("Pick at least one match first.");await window.start(state.mode==="friendly"?"friendly":"league");};
window.clearFixtures=()=>{state.selectedFixtures=[];render()};
window.toggleMenu=()=>{state.menuOpen=!state.menuOpen;render()};
window.start=async m=>{state.mode=m;state.selected=[];state.page="builder";state.loadingPlayers=true;state.menuOpen=false;render();await syncPlayers();await loadDbPlayers();await loadRound();state.loadingPlayers=false;render();};
window.filter=f=>{state.filter=f;render()};
window.signOut=async()=>{await supabase.auth.signOut();state.user=null;state.selected=[];state.menuOpen=false;render()};

window.signIn=async()=>{
  const btn=document.querySelector("#signInBtn"); if(btn&&btn.disabled)return;
  try{clearAuthMessage();const emailEl=document.querySelector("#email"),passEl=document.querySelector("#password");
    if(!emailEl||!passEl){showAuthMessage("Sign-in form fields not found on page.","error");return;}
    const email=emailEl.value.trim(),password=passEl.value;if(!email||!password){showAuthMessage("Enter both email and password.","error");return;}
    if(btn){btn.disabled=true;btn.textContent="Signing in...";}
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){if(/confirm/i.test(error.message))showAuthMessage("Please confirm your email first — check your inbox (and spam folder) for the confirmation link.","error");else if(/invalid login/i.test(error.message))showAuthMessage("Incorrect email or password.","error");else showAuthMessage("Sign in failed: "+error.message,"error");return;}
    await session();state.menuOpen=false;showAuthMessage("Signed in.","success");render();
  }catch(e){showAuthMessage("Something went wrong signing in: "+e.message,"error");}finally{if(btn){btn.disabled=false;btn.textContent="Sign in";}}
};
window.signUp=async()=>{
  const btn=document.querySelector("#signUpBtn");if(btn&&btn.disabled)return;
  try{clearAuthMessage();const name=document.querySelector("#name").value.trim(),email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value;
    if(!name||!email||password.length<6){showAuthMessage("Enter name, email and a password of at least 6 characters.","error");return;}
    if(btn){btn.disabled=true;btn.textContent="Creating account...";}
    const {error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
    if(error){if(/already registered|already exists|already been registered/i.test(error.message))showAuthMessage("An account with this email already exists. Try 'Sign in' instead, or use a different email.","error");else showAuthMessage("Sign up failed: "+error.message,"error");return;}
    showAuthMessage("Account created! Check your email (and spam folder) for a confirmation link.","success");
  }catch(e){showAuthMessage("Something went wrong signing up: "+e.message,"error");}finally{if(btn){btn.disabled=false;btn.textContent="Create account";}}
};
window.add=id=>{const p=state.dbPlayers.find(x=>x.id===id);if(!p)return;if(state.selected.some(x=>x.id===p.id))return;const need=currentNeed();if(!need[p.position])return alert(`No ${p.position} slot in this team size.`);if(state.selected.filter(x=>x.position===p.position).length>=need[p.position])return alert(`This team allows ${need[p.position]} ${p.position} player(s).`);state.selected.push(p);render();};
window.submitTeam=async()=>{if(!state.user)return go("auth");const need=currentNeed();if(!Object.keys(need).every(k=>state.selected.filter(x=>x.position===k).length===need[k]))return alert(`Complete all ${teamSize()} positions.`);await loadRound();if(!state.round)return alert("No OPEN round exists in Supabase.");const {data:entry,error:e1}=await supabase.from("entries").insert({round_id:state.round.id,user_id:state.user.id,submitted_at:new Date().toISOString()}).select().single();if(e1)return alert(e1.message);const rows=state.selected.map(p=>({entry_id:entry.id,player_id:p.id,slot_position:p.position}));const {error:e2}=await supabase.from("entry_players").insert(rows);if(e2){await supabase.from("entries").delete().eq("id",entry.id);return alert(e2.message);}alert("Team saved to Supabase.");state.page="leaderboard";render();};

function games(){return `<div class="section"><h2>Games</h2></div><p class="muted">Play Whot, Dice or Snooker against other stakers. Entry is ₦500.</p><div class="grid">${[["whot","🃏","Whot","Fast-paced card battles, up to 4 players"],["dice","🎲","Dice","Roll two dice, highest total wins"],["snooker","🎱","Snooker","1v1 skill-based scoring"]].map(([id,icon,name,desc])=>`<div class="card"><span class="badge">${icon} ₦500 ENTRY</span><h3>${name}</h3><p class="muted">${desc}</p><button class="primary" style="width:100%;margin-top:10px" onclick="playGame('${id}')">Find a room</button></div>`).join("")}</div>`;}
function nav(){const links=["home","games","rooms","rounds","friendly","leaderboard"];return `<header class="top"><div class="brand">Football<span>Points</span></div><nav class="nav">${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}${state.user?`<button class="${state.page==="wallet"?"active":""}" onclick="go('wallet')">Wallet</button>`:""}</nav><div class="top-right">${state.user?`<button class="secondary desktop-only" onclick="signOut()">Sign out</button>`:`<button class="secondary desktop-only" onclick="go('auth')">Login</button>`}<button class="menu-btn" onclick="toggleMenu()" aria-label="Menu">${state.menuOpen?"✕":"☰"}</button></div></header><div class="mobile-menu ${state.menuOpen?"open":""}">${links.map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}${state.user?`<button onclick="go('wallet')">Wallet</button><button onclick="signOut()">Sign out</button>`:`<button onclick="go('auth')">Login</button>`}</div>`;}
function auth(){return `<div class="two"><div class="panel"><span class="badge">ACCOUNT</span><h2>Login / Register</h2><div id="authMsg" class="auth-msg" style="display:none"></div><div class="form"><input id="name" placeholder="Name for registration"><input id="email" type="email" placeholder="Email"><input id="password" type="password" placeholder="Password"><div class="actions"><button id="signUpBtn" class="primary" onclick="signUp()">Create account</button><button id="signInBtn" class="secondary" onclick="signIn()">Sign in</button></div></div></div><div class="panel"><h3>Database account</h3><p class="muted">Your submitted team is associated with your authenticated user ID.</p></div></div>`;}
function home(){return `<section class="hero"><div class="panel"><span class="badge">REAL FOOTBALL • REAL POINTS</span><h1>Pick real players.<br><span class="green">Win based on real points.</span></h1><p class="muted">You build a team using real footballers. When they play their real matches, their actual performance earns you points automatically.</p><div class="actions">${state.user?`<button class="primary" onclick="go('matches')">Join League</button>`:`<button class="primary" onclick="go('auth')">Create account</button>`}<button class="secondary" onclick="go('friendly')">Friendly</button></div></div><div class="panel"><h3>Scoring</h3><div class="row"><span>Goal</span><b>+5</b></div><div class="row"><span>Assist</span><b>+3</b></div><div class="row"><span>Clean sheet</span><b>+4</b></div></div></section>`;}
function matches(){if(state.loadingFixtures)return `<div class="panel"><h3>Loading upcoming matches...</h3></div>`;return `<div class="section"><h2>Upcoming matches</h2></div><div class="card"><p class="muted">Pick real fixtures and build your team.</p><button class="primary" onclick="buildTeamForSelectedFixtures()">Build team</button></div>`;}
function rounds(){return `<div class="section"><h2>Rounds</h2></div><div class="card"><span class="badge">${state.round?.status?.toUpperCase()||"NO OPEN ROUND"}</span><h3>${state.round?.name||"No open round"}</h3><button class="primary" onclick="go('matches')">Pick a match</button></div>`;}
function friendly(){return `<div class="section"><h2>Friendly</h2></div><div class="card"><h3>Random matchmaking</h3><p class="muted">Join the queue and play other players.</p><button class="primary" onclick="go('games')">Go to Games</button></div>`;}
async function leaderboard(){await loadRound();return `<div class="section"><h2>Leaderboard</h2></div><div class="card"><p class="muted">Leaderboard updates live.</p></div>`;}
function builder(){if(state.loadingPlayers)return `<div class="panel"><h3>Syncing players...</h3></div>`;return `<div class="panel"><h2>Build your team</h2><p>Select your players.</p></div>`;}
async function wallet(){if(!state.user)return go("auth");const {data:w}=await supabase.from("game_wallets").select("points,diamonds,cash_balance").eq("user_id",state.user.id).single();return `<div class="section"><h2>Wallet</h2></div><div class="grid"><div class="card"><b>Cash balance</b><p style="font-size:22px">${Number(w?.cash_balance||0).toFixed(2)}</p></div><div class="card"><b>Points</b><p style="font-size:22px">${w?.points||0}</p></div><div class="card"><b>💎 Diamonds</b><p style="font-size:22px">${w?.diamonds||0}</p></div></div>`;}
const rooms=async()=>prepareRoomsPage().then(()=>roomsPage());const room=async()=>roomLobby();const pages={home,auth,rooms,room,rounds,friendly,leaderboard,builder,matches,wallet,games};
async function render(){const app=document.querySelector("#app");if(!app)throw new Error("App container missing");app.innerHTML=nav()+`<main class="wrap">${await pages[state.page]()}</main>`;}window.render=render;
async function boot(){try{await render();await session();await loadRound();await render();}catch(e){showErrorBanner("Startup failed: "+e.message);const app=document.querySelector("#app");if(app)app.innerHTML='<div class="panel" style="margin:40px auto;max-width:700px"><h2>BetSquad is having trouble loading</h2><p>Please check your connection and try again.</p><button class="primary" onclick="location.reload()">Retry</button></div>';}}
supabase.auth.onAuthStateChange(async()=>{try{await session();await render();}catch(e){showErrorBanner("Auth refresh failed: "+e.message);}});
if(document.readyState === "loading"){document.addEventListener("DOMContentLoaded",boot);}else{boot();}
