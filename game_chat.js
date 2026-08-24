/* Lightweight realtime chat for Whot, Dice and Snooker rooms. */
(function(){
  'use strict';
  let roomId=null, channel=null, poll=null;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function stop(){ if(channel&&window.supabase){window.supabase.removeChannel(channel);} channel=null; if(poll){clearInterval(poll);poll=null;} roomId=null; }
  function mount(){
    const s=window.state, app=document.querySelector('#app');
    if(!app||s?.page!=='game_room'||!s.gameRoomId||!window.supabase)return;
    if(roomId===s.gameRoomId&&document.querySelector('#gameChat'))return;
    stop(); roomId=s.gameRoomId;
    const wrap=document.createElement('div'); wrap.id='gameChat'; wrap.style.cssText='margin:14px auto;max-width:900px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(0,0,0,.18);';
    wrap.innerHTML='<h3 style="margin:0 0 10px">💬 Game Chat</h3><div id="gameChatMessages" style="height:180px;overflow:auto;padding:8px;border-radius:10px;background:rgba(0,0,0,.18)"></div><form id="gameChatForm" style="display:flex;gap:8px;margin-top:10px"><input id="gameChatInput" maxlength="500" placeholder="Talk to the players…" style="flex:1"><button class="primary" type="submit">Send</button></form>';
    app.appendChild(wrap);
    const box=wrap.querySelector('#gameChatMessages');
    async function load(){const {data,error}=await window.supabase.from('game_chat_messages').select('display_name,message,created_at').eq('room_id',roomId).order('created_at',{ascending:true}).limit(100);if(error)return;box.innerHTML=(data||[]).map(m=>'<div style="margin:5px 0"><b>'+esc(m.display_name)+':</b> '+esc(m.message)+'</div>').join('');box.scrollTop=box.scrollHeight;}
    wrap.querySelector('#gameChatForm').addEventListener('submit',async e=>{e.preventDefault();const input=wrap.querySelector('#gameChatInput'),msg=input.value.trim();if(!msg)return;input.disabled=true;const name=window.state.user?.user_metadata?.name||window.state.user?.email?.split('@')[0]||'Player';const {error}=await window.supabase.from('game_chat_messages').insert({room_id:roomId,user_id:window.state.user.id,display_name:name,message:msg});input.disabled=false;if(error)alert('Chat message failed: '+error.message);else input.value='';});
    channel=window.supabase.channel('game-chat-'+roomId).on('postgres_changes',{event:'INSERT',schema:'public',table:'game_chat_messages',filter:'room_id=eq.'+roomId},payload=>{const m=payload.new;box.insertAdjacentHTML('beforeend','<div style="margin:5px 0"><b>'+esc(m.display_name)+':</b> '+esc(m.message)+'</div>');box.scrollTop=box.scrollHeight;}).subscribe();
    load();
  }
  const observer=new MutationObserver(mount); observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(mount,1000);
  window.addEventListener('beforeunload',stop);
})();
