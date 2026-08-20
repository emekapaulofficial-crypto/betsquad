/* FootballPoints Games Hub v1
 * Shared UX/risk guardrails for Whot, Dice and Snooker.
 * Public rooms never require a PIN. Private rooms may use one.
 * House bots must be disclosed and must use the same settlement rules as humans.
 */
(() => {
  const GAMES = [
    {code:'whot', name:'Whot', icon:'🃏', fee:1000, desc:'Classic multiplayer Whot.'},
    {code:'dice', name:'Dice', icon:'🎲', fee:1000, desc:'Fast dice matches with auditable RNG.'},
    {code:'snooker', name:'Snooker', icon:'🎱', fee:1000, desc:'Competitive snooker rooms.'}
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function open(){
    let el=document.getElementById('fpGamesHub');
    if(!el){el=document.createElement('section');el.id='fpGamesHub';document.body.appendChild(el);}
    el.innerHTML=`<div class="fp-gh-head"><div><span class="fp-gh-badge">GAMES</span><h2>Choose your game</h2><p>One account. One wallet. Simple rooms.</p></div><button class="fp-gh-close" type="button">×</button></div><div class="fp-gh-grid">${GAMES.map(g=>`<article class="fp-gh-card"><div class="fp-gh-icon">${g.icon}</div><h3>${g.name}</h3><p>${esc(g.desc)}</p><div class="fp-gh-fee">₦${g.fee.toLocaleString()} entry</div><button class="fp-gh-join" data-game="${g.code}">Find a public game</button><button class="fp-gh-private" data-private="${g.code}">Private room</button></article>`).join('')}</div>`;
    el.querySelector('.fp-gh-close').onclick=close;
    el.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>rooms(b.dataset.game,false));
    el.querySelectorAll('[data-private]').forEach(b=>b.onclick=()=>rooms(b.dataset.private,true));
  }
  function close(){document.getElementById('fpGamesHub')?.remove()}
  function rooms(game,privateRoom){
    window.dispatchEvent(new CustomEvent('fp:open-game-rooms',{detail:{game,privateRoom,entryFee:1000}}));
    if(typeof window.go==='function') window.go('rooms');
    close();
  }
  const s=document.createElement('style');s.textContent=`
  #fpGamesHub{position:fixed;inset:0;z-index:10001;background:rgba(4,12,22,.96);padding:24px;overflow:auto;color:#eef6ff;font-family:system-ui,sans-serif}
  .fp-gh-head{max-width:1100px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:flex-start}.fp-gh-head h2{margin:5px 0;font-size:30px}.fp-gh-head p{margin:0;color:#9db1c9}.fp-gh-badge{font-size:11px;font-weight:900;letter-spacing:.12em;color:#55d98b}.fp-gh-close{border:1px solid #29415e;background:#142941;color:#fff;border-radius:12px;width:42px;height:42px;font-size:25px}.fp-gh-grid{max-width:1100px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.fp-gh-card{background:#0d1b2e;border:1px solid #29415e;border-radius:18px;padding:20px}.fp-gh-icon{font-size:42px}.fp-gh-card h3{font-size:22px;margin:8px 0}.fp-gh-card p{color:#9db1c9;min-height:42px}.fp-gh-fee{font-weight:900;margin:16px 0}.fp-gh-join,.fp-gh-private{width:100%;padding:12px;border-radius:11px;font-weight:800;cursor:pointer}.fp-gh-join{border:0;background:#55d98b;color:#04130b}.fp-gh-private{margin-top:8px;border:1px solid #29415e;background:#142941;color:#fff}@media(max-width:700px){#fpGamesHub{padding:14px}.fp-gh-grid{grid-template-columns:1fr}.fp-gh-head h2{font-size:25px}}
  `;document.head.appendChild(s);
  window.fpOpenGamesHub=open;
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-games-hub]'))open()});
})();
