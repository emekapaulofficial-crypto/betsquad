/* BetSquad: one simple Quick Menu. It never intercepts normal page buttons. */
(function(){
  'use strict';
  const ID='betsquad-clean-quick-menu';
  const launcherId='betsquad-clean-quick-launcher';
  const items=[['Home','home'],['Games','games'],['Football','matches'],['Rooms','rooms'],['Wallet','wallet'],['Leaderboard','leaderboard']];
  function go(page){
    if(typeof window.go==='function'){window.go(page);return;}
    if(window.state){window.state.page=page;window.state.menuOpen=false;if(typeof window.render==='function')window.render();}
  }
  function install(){
    if(!document.body||document.getElementById(ID))return;
    const style=document.createElement('style');
    style.textContent='#'+ID+'{position:fixed;right:16px;bottom:16px;z-index:100001;font-family:system-ui}#'+launcherId+'{border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px 16px;background:#102238;color:#fff;font-weight:800;cursor:pointer;touch-action:manipulation}#'+ID+' .panel{display:none;position:absolute;right:0;bottom:54px;width:220px;padding:10px;background:#0b1728;border:1px solid rgba(255,255,255,.2);border-radius:14px;box-shadow:0 12px 35px rgba(0,0,0,.45)}#'+ID+'.open .panel{display:block}#'+ID+' .title{color:#fff;font-weight:800;padding:7px 10px 10px}#'+ID+' .item{display:block;width:100%;box-sizing:border-box;margin:5px 0;padding:11px 12px;border:0;border-radius:9px;background:#fff;color:#111;font-weight:700;cursor:pointer;touch-action:manipulation}';
    document.head.appendChild(style);
    const wrap=document.createElement('div');wrap.id=ID;
    const launcher=document.createElement('button');launcher.id=launcherId;launcher.type='button';launcher.textContent='☰ Quick Menu';
    const panel=document.createElement('div');panel.className='panel';panel.innerHTML='<div class="title">Quick Menu</div>';
    launcher.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();wrap.classList.toggle('open');launcher.textContent=wrap.classList.contains('open')?'✕ Close Menu':'☰ Quick Menu';});
    items.forEach(([label,page])=>{const b=document.createElement('button');b.type='button';b.className='item';b.textContent=label;b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();wrap.classList.remove('open');launcher.textContent='☰ Quick Menu';go(page);});panel.appendChild(b)});
    wrap.append(launcher,panel);document.body.appendChild(wrap);
  }
  function removeOld(){
    document.querySelectorAll('#quickMenu,.recovery-quick-menu,#betsquad-final-quick-launcher,#betsquad-final-quick-panel,[data-quick-menu]').forEach(el=>el.remove());
    document.querySelectorAll('.quick-menu').forEach(el=>{if(!el.closest('#'+ID))el.remove()});
  }
  function run(){removeOld();install()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(()=>{if(!document.getElementById(ID))run()}).observe(document.documentElement,{childList:true,subtree:true});
})();
