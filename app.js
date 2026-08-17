import { createClient } from "https://esm.sh/@supabase/supabase-js@2.111.0"

/*
  SETUP:
  1. Create a Supabase project.
  2. Run supabase_schema.sql in SQL Editor.
  3. Replace the two placeholders below.
  4. Never put a service-role/secret key in this file.

  IMPORTANT: Browser Web Locks can deadlock Supabase Auth on some Chromium
  environments. Use the documented custom no-op lock so authentication cannot
  remain stuck before the /auth/v1/token request is made.
*/
const SUPABASE_URL = "https://eavamfsbasjvngeqsyua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_E40QKzlb3dtIoawvmxPHfA_07t2XIxu";
const noOpAuthLock = async (_name, _acquireTimeout, fn) => await fn();
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { lock: noOpAuthLock }
});
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

/* ---------- ON-PAGE STATUS MESSAGE ----------
   Some mobile browsers (in-app browsers like WhatsApp/Instagram/
   Facebook, some PWAs) silently block window.alert(), which made
   sign-in/sign-up look "dead" even when it worked or failed.
   This shows a message directly in the page instead, so it is
   never dependent on native alert() support. */
function showAuthMessage(msg, type){
  const el = document.querySelector("#authMsg");
  if(!el) return alert(msg); // fallback if called from a page without the box
  el.textContent = msg;
  el.style.display = "block";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "8px";
  el.style.margin = "10px 0";
  el.style.fontSize = "14px";
  if(type==="error"){ el.style.background="#fdecea"; el.style.color="#c0392b"; el.style.border="1px solid #f5b7b1"; }
  else if(type==="success"){ el.style.background="#eafaf1"; el.style.color="#1e8449"; el.style.border="1px solid #a9dfbf"; }
  else { el.style.background="#eaf2fb"; el.style.color="#1a5276"; el.style.border="1px solid #aed6f1"; }
}
function clearAuthMessage(){
  const el = document.querySelector("#authMsg");
  if(el){ el.style.display="none"; el.textContent=""; }
}
window.showAuthMessage = showAuthMessage;
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
  const btn=document.querySelector("#signInBtn");
  if(btn && btn.disabled) return; // guard against double-tap
  try{
    clearAuthMessage();
    const emailEl=document.querySelector("#email"), passEl=document.querySelector("#password");
    if(!emailEl||!passEl){ showAuthMessage("Sign-in form fields not found on page.","error"); return; }
    const email=emailEl.value.trim(), password=passEl.value;
    if(!email||!password){ showAuthMessage("Enter both email and password.","error"); return; }
    if(btn){ btn.disabled=true; btn.textContent="Signing in..."; }
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){
      if(/confirm/i.test(error.message)){
        showAuthMessage("Please confirm your email first — check your inbox (and spam folder) for the confirmation link.","error");
      } else if(/invalid login/i.test(error.message)){
        showAuthMessage("Incorrect email or password.","error");
      } else {
        showAuthMessage("Sign in failed: "+error.message,"error");
      }
      return;
    }
    await session(); state.menuOpen=false; showAuthMessage("Signed in.","success"); render();
  }catch(e){
    showAuthMessage("Something went wrong signing in: " + e.message, "error");
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="Sign in"; }
  }
};
window.signUp=async()=>{
  const btn=document.querySelector("#signUpBtn");
  if(btn && btn.disabled) return; // guard against double-tap
  try{
    clearAuthMessage();
    const name=document.querySelector("#name").value.trim(), email=document.querySelector("#email").value.trim(), password=document.querySelector("#password").value;
    if(!name||!email||password.length<6){ showAuthMessage("Enter name, email and a password of at least 6 characters.","error"); return; }
    if(btn){ btn.disabled=true; btn.textContent="Creating account..."; }
    const {error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
    if(error){
      if(/already registered|already exists|already been registered/i.test(error.message)){
        showAuthMessage("An account with this email already exists. Try 'Sign in' instead, or use a different email. If you never confirmed this email before, ask an admin to reset it.","error");
      } else {
        showAuthMessage("Sign up failed: "+error.message,"error");
      }
      return;
    }
    showAuthMessage("Account created! Check your email (and spam folder) for a confirmation link before signing in.","success");
  }catch(e){
    showAuthMessage("Something went wrong signing up: " + e.message, "error");
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="Create account"; }
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
  }
