/* Realtime room chat for Whot, Dice and Snooker. Uses both durable DB history and
   Supabase Broadcast so messages appear immediately even when Postgres realtime
   is not enabled for the chat table. */
(function(){
  'use strict';
  let roomId=null,channel=null;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const playerName=()=>window.state?.user?.user_metadata?.name||window.state?.user?.email?.split('@')[0]||'Player';
  function stop(){if(channel&&window.supabase)window.supabase.removeChannel(channel);channel=null;roomId=null;}
  function append(box,m){
    if(!box||!m?.message)return;
    const key=m.id||`${m.created_at||''}-${m.user_id||''}-${m.message}`;
    if(box.querySelector(`[data-message-key="${CSS.escape(key)}"]`))return;
    box.insertAdjacentHTML('beforeend',`<div class="game-chat-line" data-message-key="${esc(key)}"><b>${esc(m.display_name||'Player')}:</b> ${esc(m.message)}</div>`);
    box.scrollTop=box.scrollHeight;
  }
  function mount(){
    const s=window.state,app=document.querySelector('#app');
    if(!app||s?.page!=='game_room'||!s.gameRoomId||!window.supabase||!s.user)return;
    if(roomId===s.gameRoomId&&document.querySelector('#gameChat')){repair();return;}
    stop();roomId=s.gameRoomId;
    const wrap=document.createElement('section');wrap.id='gameChat';
    wrap.innerHTML=`<h3>💬 Game Chat</h3><div id="gameChatMessages" aria-live="polite"></div><form id="gameChatForm" autocomplete="off"><input id="gameChatInput" type="text" maxlength="500" autocomplete="off" autocorrect="on" spellcheck="true" placeholder="Type a message…"><button id="gameChatSend" class="primary" type="submit">Send</button></form>`;
    app.appendChild(wrap);repair();
    const box=wrap.querySelector('#gameChatMessages'),form=wrap.querySelector('#gameChatForm'),input=wrap.querySelector('#gameChatInput'),send=wrap.querySelector('#gameChatSend');
    const load=async()=>{const {data,error}=await window.supabase.from('game_chat_messages').select('id,user_id,display_name,message,created_at').eq('room_id',roomId).order('created_at',{ascending:true}).limit(200);if(!error){box.innerHTML='';(data||[]).forEach(m=>append(box,m));}};
    const submit=async e=>{e.preventDefault();e.stopPropagation();const msg=input.value.trim();if(!msg||input.disabled)return;send.disabled=true;const message={room_id:roomId,user_id:s.user.id,display_name:playerName(),message:msg};const {data,error}=await window.supabase.from('game_chat_messages').insert(message).select('id,user_id,display_name,message,created_at').single();send.disabled=false;if(error){alert('Chat message failed: '+error.message);return;}input.value='';input.focus();append(box,data||message);if(channel){channel.send({type:'broadcast',event:'game-chat-message',payload:data||message}).catch(()=>{});}};
    form.addEventListener('submit',submit);send.addEventListener('click',e=>e.stopPropagation());input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();}});input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>{e.stopPropagation();input.focus();});
    channel=window.supabase.channel('game-chat-v2-'+roomId,{config:{broadcast:{self:false}}});
    channel.on('broadcast',{event:'game-chat-message'},({payload})=>{if(payload?.room_id===roomId)append(box,payload);});
    channel.on('broadcast',{event:'game-chat-refresh'},()=>load());
    channel.subscribe(status=>{if(status==='SUBSCRIBED')load();});
    load();
  }
  function repair(){const wrap=document.querySelector('#gameChat');if(!wrap)return;wrap.style.cssText='position:relative;z-index:100001;margin:14px auto;max-width:900px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#0d1b2e;color:#edf5ff;pointer-events:auto;';const input=wrap.querySelector('#gameChatInput'),send=wrap.querySelector('#gameChatSend');if(input){input.disabled=false;input.readOnly=false;input.style.cssText='display:block;box-sizing:border-box;width:100%;min-height:44px;padding:10px 12px;border-radius:8px;border:1px solid #29445f;background:#091626;color:#edf5ff;pointer-events:auto;position:relative;z-index:100003;touch-action:manipulation;';}if(send){send.style.pointerEvents='auto';send.style.position='relative';send.style.zIndex='100003';}let st=document.querySelector('#gameChatCss');if(!st){st=document.createElement('style');st.id='gameChatCss';st.textContent='#gameChat h3{margin:0 0 10px}.game-chat-line{margin:5px 0;padding:7px 9px;border-radius:8px;background:rgba(0,0,0,.18);overflow-wrap:anywhere}#gameChatMessages{height:180px;overflow-y:auto;padding:8px;border-radius:10px;background:rgba(0,0,0,.18);pointer-events:auto}#gameChatForm{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px;pointer-events:auto}@media(max-width:520px){#gameChatForm{grid-template-columns:1fr}#gameChatSend{width:100%;min-height:44px}}';document.head.appendChild(st);}}
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setInterval(mount,700);window.addEventListener('beforeunload',stop);mount();
})();