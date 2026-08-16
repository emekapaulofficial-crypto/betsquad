/* Football Points V4 Match Rooms
   Integrates with the existing V3 Supabase client/state.
   Features: create room, generate code, select multiple fixtures,
   public/private lobby, join by code, Quick 6 / Classic 11,
   max 3 players from one club. Points-only.
*/

window.roomState={room:null,fixtures:[],members:[],availableFixtures:[]};

window.prepareRoomsPage=async function(){
  const f=await supabase.from("fixtures").select("id,home_team,away_team,kickoff_at,status")
    .eq("status","scheduled").order("kickoff_at").limit(50);
  roomState.availableFixtures=f.data||[];
  const r=await supabase.from("match_rooms").select("*").eq("status","lobby")
    .order("created_at",{ascending:false});
  roomState.rooms=r.data||[];
};

window.makeRoomCode=function(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "FP-"+Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};

window.createRoom=async function(){
  if(!state.user)return go("auth");
  const selected=[...document.querySelectorAll(".fixture-check:checked")].map(x=>x.value);
  if(!selected.length)return alert("Select at least one match.");
  const room={code:makeRoomCode(),
    name:document.querySelector("#roomName").value.trim()||"Match Room",
    visibility:document.querySelector("#roomVisibility").value,
    game_mode:document.querySelector("#roomMode").value,
    max_players:Math.max(2,Math.min(1000,+document.querySelector("#roomMax").value||10)),
    creator_id:state.user.id};
  const a=await supabase.from("match_rooms").insert(room).select().single();
  if(a.error)return alert(a.error.message);
  const b=await supabase.from("room_fixtures").insert(selected.map((id,i)=>({room_id:a.data.id,fixture_id:id,sort_order:i})));
  if(b.error)return alert(b.error.message);
  const c=await supabase.from("room_members").insert({room_id:a.data.id,user_id:state.user.id});
  if(c.error)return alert(c.error.message);
  await openRoom(a.data.id);
};

window.joinRoomByCode=async function(){
  if(!state.user)return go("auth");
  const code=document.querySelector("#joinCode").value.trim().toUpperCase();
  const q=await supabase.from("match_rooms").select("*").eq("code",code).eq("status","lobby").maybeSingle();
  if(q.error||!q.data)return alert("Room not found or closed.");
  const j=await supabase.from("room_members").insert({room_id:q.data.id,user_id:state.user.id});
  if(j.error && !j.error.message.toLowerCase().includes("duplicate"))return alert(j.error.message);
  await openRoom(q.data.id);
};

window.openRoom=async function(id){
  const r=await supabase.from("match_rooms").select("*").eq("id",id).single();
  if(r.error)return alert(r.error.message);
  const f=await supabase.from("room_fixtures").select("fixture_id,fixtures(id,home_team,away_team,kickoff_at)")
    .eq("room_id",id).order("sort_order");
  const m=await supabase.from("room_members").select("user_id,ready,profiles(display_name)")
    .eq("room_id",id).order("joined_at");
  roomState.room=r.data;roomState.fixtures=f.data||[];roomState.members=m.data||[];
  state.page="room";render();
};

window.toggleReady=async function(){
  const me=roomState.members.find(x=>x.user_id===state.user.id);
  const r=await supabase.from("room_members").update({ready:!me?.ready})
    .eq("room_id",roomState.room.id).eq("user_id",state.user.id);
  if(r.error)return alert(r.error.message);
  openRoom(roomState.room.id);
};

window.roomLobby=function(){
 const r=roomState.room;
 return `<div class="section"><div><span class="badge">ROOM ${r.code}</span><h2>${r.name}</h2></div>
 <button class="secondary" onclick="go('rooms')">← Rooms</button></div>
 <div class="room-grid">
 <div class="panel"><h3>Matches in this room</h3>
 ${roomState.fixtures.map(x=>`<div class="fixture-card"><b>${x.fixtures.home_team} vs ${x.fixtures.away_team}</b><span>${new Date(x.fixtures.kickoff_at).toLocaleString()}</span></div>`).join("")}
 <p class="muted">${r.game_mode==="quick6"?"Quick 6: 1 GK + 2 DEF + 2 MID + 1 ST":"Classic 11: 1 GK + 4 DEF + 4 MID + 2 ST"} • Maximum 3 players from one club.</p>
 <button class="primary" onclick="go('builder')">Build my team</button></div>
 <div class="panel"><h3>Players ${roomState.members.length}/${r.max_players}</h3>
 ${roomState.members.map(m=>`<div class="row"><span>${m.profiles?.display_name||"Player"}</span><span>${m.ready?"🟢 Ready":"⚪ Not ready"}</span></div>`).join("")}
 <button class="secondary" onclick="toggleReady()">Ready / Not ready</button>
 <div class="room-code"><small>Share this code</small><strong>${r.code}</strong></div></div></div>`;
};

window.roomsPage=function(){
 return `<div class="section"><div><span class="badge">MATCH LOBBY</span><h2>Create or find a room</h2></div></div>
 <div class="room-actions">
 <div class="panel"><h3>Create your room</h3>
 <input id="roomName" placeholder="Room name" value="My Match Room">
 <select id="roomVisibility"><option value="private">Private — code required</option><option value="public">Public — lobby</option></select>
 <select id="roomMode"><option value="quick6">Quick 6</option><option value="classic11">Classic 11</option></select>
 <input id="roomMax" type="number" min="2" max="1000" value="10">
 <div class="panel-inner"><b>Choose multiple matches</b>
 ${(roomState.availableFixtures||[]).map(f=>`<label class="check"><input class="fixture-check" type="checkbox" value="${f.id}"> ${f.home_team} vs ${f.away_team}</label>`).join("")||"<p class='muted'>No scheduled fixtures in the database yet.</p>"}</div>
 <button class="primary" onclick="createRoom()">Create room & generate code</button></div>
 <div class="panel"><h3>Join with code</h3><input id="joinCode" placeholder="FP-ABC123"><button class="primary" onclick="joinRoomByCode()">Join room</button>
 <hr><h3>Open rooms</h3>${(roomState.rooms||[]).map(r=>`<div class="room-card"><div><b>${r.name}</b><div class="small">${r.game_mode} • ${r.max_players} max</div></div><button class="secondary" onclick="joinRoomByCodePrefill('${r.code}')">Join</button></div>`).join("")||"<p class='muted'>No rooms waiting.</p>"}</div></div>`;
};

window.joinRoomByCodePrefill=async function(code){
 document.querySelector("#joinCode").value=code; await joinRoomByCode();
};
