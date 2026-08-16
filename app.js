import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  SETUP:
  1. Create a Supabase project.
  2. Run supabase_schema.sql in SQL Editor.
  3. Replace the two placeholders below.
  4. Never put a service-role/secret key in this file.
*/
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_PUBLISHABLE_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const players = [
["Raya","Arsenal","GK"],["Saliba","Arsenal","DEF"],["Gabriel","Arsenal","DEF"],["White","Arsenal","DEF"],
["Timber","Arsenal","DEF"],["Ødegaard","Arsenal","MID"],["Rice","Arsenal","MID"],["Saka","Arsenal","MID"],
["Havertz","Arsenal","MID"],["Haaland","Man City","ST"],["Foden","Man City","MID"],["Rodri","Man City","MID"],
["Dias","Man City","DEF"],["Alisson","Liverpool","GK"],["Van Dijk","Liverpool","DEF"],["Trent","Liverpool","DEF"],
["Salah","Liverpool","MID"],["Szoboszlai","Liverpool","MID"],["Núñez","Liverpool","ST"],["Isak","Newcastle","ST"],
["Bruno Guimarães","Newcastle","MID"]
];
const need={GK:1,DEF:4,MID:4,ST:2};
const state={page:"home",mode:"league",filter:"ALL",selected:[],user:null,round:null,dbPlayers:[]};

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

window.go=p=>{state.page=p;render()};
window.start=async m=>{state.mode=m;state.selected=[];await loadRound();state.page="builder";render()};
window.filter=f=>{state.filter=f;render()};
window.signOut=async()=>{await supabase.auth.signOut();state.user=null;state.selected=[];render()};
window.signIn=async()=>{
  const email=document.querySelector("#email").value.trim(), password=document.querySelector("#password").value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return alert(error.message);
  await session(); render();
};
window.signUp=async()=>{
  const name=document.querySelector("#name").value.trim(), email=document.querySelector("#email").value.trim(), password=document.querySelector("#password").value;
  if(!name||!email||password.length<6)return alert("Enter name, email and a password of at least 6 characters.");
  const {error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
  if(error)return alert(error.message);
  alert("Account created. Check your email if confirmation is enabled.");
};
window.add=i=>{
  const p=players[i];
  if(state.selected.some(x=>x[0]===p[0]))return;
  if(state.selected.filter(x=>x[2]===p[2]).length>=need[p[2]])return alert(`4-4-2 allows ${need[p[2]]} ${p[2]} player(s).`);
  state.selected.push(p);render();
};
window.submitTeam=async()=>{
  if(!state.user)return go("auth");
  await loadRound();
  if(!state.round)return alert("No OPEN round exists in Supabase.");
  if(!Object.keys(need).every(k=>state.selected.filter(x=>x[2]===k).length===need[k]))
    return alert("Complete all 11 positions.");

  const db={}; state.dbPlayers.forEach(p=>db[p.name]=p.id);
  if(state.selected.some(p=>!db[p[0]]))
    return alert("Some selected players are not seeded in the database yet.");

  const {data:entry,error:e1}=await supabase.from("entries")
    .insert({round_id:state.round.id,user_id:state.user.id,submitted_at:new Date().toISOString()})
    .select().single();
  if(e1)return alert(e1.message);

  const rows=state.selected.map(p=>({entry_id:entry.id,player_id:db[p[0]],slot_position:p[2]}));
  const {error:e2}=await supabase.from("entry_players").insert(rows);
  if(e2){await supabase.from("entries").delete().eq("id",entry.id);return alert(e2.message);}
  alert("Team saved to Supabase.");
  state.page="leaderboard";render();
};

function nav(){return `<header class="top"><div class="brand">Football<span>Points</span></div>
<nav class="nav">${["home","rounds","friendly","leaderboard"].map(p=>`<button class="${state.page===p?"active":""}" onclick="go('${p}')">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}</nav>
${state.user?`<button class="secondary" onclick="signOut()">Sign out</button>`:`<button class="secondary" onclick="go('auth')">Login</button>`}</header>`}

function auth(){return `<div class="two"><div class="panel"><span class="badge">ACCOUNT</span><h2>Login / Register</h2>
<div class="form"><input id="name" placeholder="Name for registration"><input id="email" type="email" placeholder="Email"><input id="password" type="password" placeholder="Password">
<div class="actions"><button class="primary" onclick="signUp()">Create account</button><button class="secondary" onclick="signIn()">Sign in</button></div></div></div>
<div class="panel"><h3>Database account</h3><p class="muted">Your submitted team is associated with your authenticated user ID.</p></div></div>`}

function home(){return `<section class="hero"><div class="panel"><span class="badge">V3 • SUPABASE READY</span>
<h1>Build your team.<br><span class="green">Save it to the database.</span></h1><p class="muted">Users can register, join a shared round and submit their 4-4-2 team to Supabase.</p>
<div class="actions">${state.user?`<button class="primary" onclick="start('league')">Join League</button>`:`<button class="primary" onclick="go('auth')">Create account</button>`}<button class="secondary" onclick="start('friendly')">Friendly</button></div></div>
<div class="panel"><h3>Scoring</h3>${["Goal|+5","Assist|+3","Clean sheet|+4","Team win|+2","Yellow card|-1"].map(x=>{const [a,b]=x.split("|");return`<div class="row"><span>${a}</span><b>${b}</b></div>`}).join("")}</div></section>`}

function rounds(){return `<div class="section"><h2>Rounds</h2></div><div class="card"><span class="badge">${state.round?.status?.toUpperCase()||"NO OPEN ROUND"}</span>
<h3>${state.round?.name||"No open round"}</h3><p class="muted">${state.round?"Multiple users can enter this same shared round.":"Create an OPEN round in Supabase first."}</p><button class="primary" onclick="start('league')">Build Team</button></div>`}

function friendly(){return `<div class="section"><h2>Friendly</h2></div><div class="two"><div class="card"><span class="badge">1 VS 1</span><h3>Challenge foundation</h3><p class="muted">The backend contains a challenge table for participant-only access. Full challenge acceptance/settlement comes next.</p><button class="primary" onclick="start('friendly')">Build Team</button></div>
<div class="card"><h3>Shared competitions</h3><p class="muted">The league model supports many entrants competing in one round.</p></div></div>`}

async function leaderboard(){
 await loadRound(); let rows=[];
 if(state.round){
  const {data}=await supabase.from("entries").select("user_id,total_points,profiles(display_name)")
    .eq("round_id",state.round.id).order("total_points",{ascending:false});
  rows=data||[];
 }
 return `<div class="section"><h2>Leaderboard</h2><span class="badge">${rows.length} entrants</span></div><div class="panel"><table class="table">
<tr><th>#</th><th>Player</th><th>Points</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.profiles?.display_name||"Player"}</td><td>${r.total_points}</td></tr>`).join("")||"<tr><td colspan=3>No teams submitted.</td></tr>"}</table></div>`;
}

function builder(){
 const list=players.map((p,i)=>[p,i]).filter(([p])=>state.filter==="ALL"||p[2]===state.filter);
 const slots=["GK",...Array(4).fill("DEF"),...Array(4).fill("MID"),...Array(2).fill("ST")];
 return `<button class="back" onclick="go('${state.mode==="league"?"rounds":"friendly"}')">← Back</button>
<div class="section"><h2>Build 4-4-2</h2><span class="badge">${state.selected.length}/11</span></div>
<div class="builder"><div class="panel"><h3>Your team</h3><div class="formation">${slots.map(pos=>{const p=state.selected.filter(x=>x[2]===pos)[0];return`<div class="slot ${pos==="GK"?"gk":""} ${p?"filled":""}">${p?`<div><b>${p[0]}</b><div class="small">${p[1]}</div></div>`:pos}</div>`}).join("")}</div>
<button class="primary" style="width:100%;margin-top:12px" onclick="submitTeam()">Save team</button></div>
<div class="panel"><h3>Players</h3><div class="filters">${["ALL","GK","DEF","MID","ST"].map(f=>`<button class="${state.filter===f?"active":""}" onclick="filter('${f}')">${f}</button>`).join("")}</div>
${list.map(([p,i])=>`<div class="row"><div><b>${p[0]}</b><div class="small">${p[1]} • ${p[2]}</div></div><button class="secondary" onclick="add(${i})">${state.selected.some(x=>x[0]===p[0])?"Selected":"Pick"}</button></div>`).join("")}</div></div>`;
}

const pages={home,auth,rounds,friendly,leaderboard,builder};
async function render(){document.querySelector("#app").innerHTML=nav()+`<main class="wrap">${await pages[state.page]()}</main>`}
async function boot(){await session();await loadRound();await loadDbPlayers();await render()}
supabase.auth.onAuthStateChange(async()=>{await session();await render()});
boot();
