/* Personal dashboard quick room join: anyone can enter a generated room code and open that room. */
(function(){
  function render(){
    if(!window.state?.user||window.state.page!=='wallet')return;
    const main=document.querySelector('main.wrap');if(!main)return;
    let host=document.getElementById('fpPersonalRoomJoin');
    if(!host){host=document.createElement('section');host.id='fpPersonalRoomJoin';host.className='panel';host.style.cssText='margin:14px auto;max-width:1180px;border:1px solid rgba(82,224,145,.3);';host.innerHTML='<span class="badge">ROOM CODE</span><h3 style="margin:8px 0">Join a stakers room</h3><p class="muted">Enter the code shared by the room leader. You will open the tagged room directly and can chat, see the selected match and stake with the group.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="fpProfileRoomCode" placeholder="FP-ABC123" style="flex:1;min-width:180px;text-transform:uppercase"><button class="primary" id="fpProfileJoinRoom">JOIN ROOM</button></div>';main.insertBefore(host,main.firstChild);host.querySelector('#fpProfileJoinRoom').onclick=()=>{const code=host.querySelector('#fpProfileRoomCode').value.trim().toUpperCase();if(!code)return alert('Enter the room code.');if(window.joinRoomByCodePrefill)window.joinRoomByCodePrefill(code);else alert('Room service is still loading. Try again in a moment.');};}
  }
  function boot(){setInterval(render,800);render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
