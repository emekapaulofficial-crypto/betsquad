/* BetSquad: one simple Quick Menu. No global click interception. */
(function(){
  'use strict';
  let panel=null, launcher=null, open=false;
  const items=[['Home','home'],['Games','games'],['Football','matches'],['Rooms','rooms'],['Wallet','wallet'],['Leaderboard','leaderboard']];
  function go(page){
    close();
    if(typeof window.go==='function') window.go(page);
    else if(window.state){window.state.page=page; if(typeof window.render==='function')window.render();}
  }
  function close(){open=false;if(panel)panel.style.display='none';if(launcher)launcher.textContent='☰ Quick Menu';}
  function openMenu(){open=true;if(panel)panel.style.display='block';if(launcher)launcher.textContent='✕ Close Menu';}
  function build(){
    if(!document.body||document.getElementById('betsquad-simple-quick-launcher'))return;
    launcher=document.createElement('button');launcher.id='betsquad-simple-quick-launcher';launcher.type='button';launcher.textContent='☰ Quick Menu';launcher.setAttribute('aria-expanded','false');
    launcher.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9990;padding:11px 15px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:#102238;color:#fff;font-weight:800;cursor:pointer;touch-action:manipulation;';
    launcher.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open?close():openMenu();launcher.setAttribute('aria-expanded',String(open));});
    panel=document.createElement('div');panel.id='betsquad-simple-quick-panel';panel.style.cssText='display:none;position:fixed;right:16px;bottom:64px;z-index:9989;width:210px;padding:9px;background:#0b1728;border:1px solid rgba(255,255,255,.2);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.4);';
    const title=document.createElement('div');title.textContent='Quick Menu';title.style.cssText='color:#fff;font-weight:800;padding:6px 8px 8px';panel.appendChild(title);
    items.forEach(([label,page])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='display:block;width:100%;margin:5px 0;padding:10px;border:0;border-radius:8px;background:#fff;color:#111;font-weight:700;cursor:pointer;touch-action:manipulation;';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();go(page);});panel.appendChild(b);});
    document.body.appendChild(panel);close();
  }
  document.addEventListener('DOMContentLoaded',build);
  setTimeout(build,1000);
})();
