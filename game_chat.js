/* Realtime game chat for Whot, Dice and Snooker rooms. */
(function(){
  'use strict';
  let roomId=null,channel=null;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const playerName=()=>window.state?.user?.user_metadata?.name||window.state?.user?.email?.split('@')[0]||'Player';
  function stop(){if(channel&&window.supabase)window.supabase.removeChannel(channel);channel=null;roomId=null;}
  function append(box,m){box.insertAdjacentHTML('beforeend',`<div class="game-chat-line"><b>${esc(m.display_name||'Player')}:</b> ${esc(m.message)}</div>`);box.scrollTop=box.scrollHeight;}
  function mount(){
    const s=window.state,app=document.querySelector('#app');
    if(!app||s?.page!=='game_room'||!s.gameRoomId||!window.supabase||!s.user)return;
    if(roomId===s.gameRoomId&&document.querySelector('#gameChat')){repair();return;}
    stop();roomId=s.gameRoomId;
    const wrap=document.createElement('section');wrap.id='gameChat';wrap.innerHTML=`<h3>💬 Game Chat</h3><div id="gameChatMessages" aria-live="polite"></div><form id="gameChatForm" autocomplete="off"><input id="gameChatInput" type="text" maxlength="500" autocomplete="off" autocorrect="on" spellcheck="true" placeholder="Type a message…"><button id="gameChatSend" class="primary" type="submit">Send</button></form>`;
    app.appendChild(wrap);repair();
    const box=wrap.querySelector('#gameChatMessages'),form=wrap.querySelector('#gameChatForm'),input=wrap.querySelector('#gameChatInput'),send=wrap.querySelector('#gameChatSend');
    const load=async()=>{const {data}=await window.supabase.from('game_chat_messages').select('display_name,message,created_at').eq('room_id',roomId).order('created_at',{ascending:true}).limit(100);box.innerHTML='';(data||[]).forEach(m=>append(box,m));};
    const submit=async e=>{e.preventDefault();e.stopPropagation();const msg=input.value.trim();if(!msg||input.disabled)return;send.disabled=true;const {error}=await window.supabase.from('game_chat_messages').insert({room_id:roomId,user_id:s.user.id,display_name:playerName(),message:msg});send.disabled=false;if(error)alert('Chat message failed: '+error.message);else{input.value='';input.focus();}};
    form.addEventListener('submit',submit);send.addEventListener('click',e=>{e.stopPropagation()});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();}});input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>{e.stopPropagation();input.focus()});
    channel=window.supabase.channel('game-chat-'+roomId).on('postgres_changes',{event:'INSERT',schema:'public',table:'game_chat_messages',filter:'room_id=eq.'+roomId},payload=>append(box,payload.new)).subscribe();
    load();
  }
  function repair(){const wrap=document.querySelector('#gameChat');if(!wrap)return;wrap.style.cssText='position:relative;z-index:100001;margin:14px auto;max-width:900px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#0d1b2e;color:#edf5ff;pointer-events:auto;';const input=wrap.querySelector('#gameChatInput'),send=wrap.querySelector('#gameChatSend');if(input){input.disabled=false;input.readOnly=false;input.style.cssText='display:block;box-sizing:border-box;width:100%;min-height:44px;padding:10px 12px;border-radius:8px;border:1px solid #29445f;background:#091626;color:#edf5ff;pointer-events:auto;position:relative;z-index:100003;touch-action:manipulation;';}if(send){send.style.pointerEvents='auto';send.style.position='relative';send.style.zIndex='100003';}let st=document.querySelector('#gameChatCss');if(!st){st=document.createElement('style');st.id='gameChatCss';st.textContent='#gameChat h3{margin:0 0 10px}.game-chat-line{margin:5px 0;padding:7px 9px;border-radius:8px;background:rgba(0,0,0,.18);overflow-wrap:anywhere}#gameChatMessages{height:180px;overflow-y:auto;padding:8px;border-radius:10px;background:rgba(0,0,0,.18);pointer-events:auto}#gameChatForm{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px;pointer-events:auto}@media(max-width:520px){#gameChatForm{grid-template-columns:1fr}#gameChatSend{width:100%;min-height:44px}}';document.head.appendChild(st);}}
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setInterval(mount,700);window.addEventListener('beforeunload',stop);mount();
})();