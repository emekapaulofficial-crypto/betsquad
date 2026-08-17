(function(){
  'use strict';
  const LOGO='/assets/footballpoints-logo.webp';
  let active=false, timer=null, lastRoundKey='', lastOnline=false;

  function installStyles(){
    if(document.getElementById('fp-logo-styles')) return;
    const s=document.createElement('style'); s.id='fp-logo-styles';
    s.textContent=`
      #fp-logo-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(2,8,20,.94);backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .25s ease}
      #fp-logo-overlay.fp-show{opacity:1;pointer-events:auto}
      #fp-logo-stage{width:min(78vw,430px);aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;position:relative}
      #fp-logo-stage:before{content:"";position:absolute;inset:10%;border-radius:50%;background:radial-gradient(circle,rgba(82,224,145,.22),transparent 68%);animation:fpLogoGlow 1.8s ease-in-out infinite}
      #fp-logo-img{position:relative;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 24px rgba(82,224,145,.35));animation:fpLogoFloat 1.7s ease-in-out infinite}
      #fp-logo-label{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font:700 14px system-ui,sans-serif;letter-spacing:.12em;color:#e8f1ff;white-space:nowrap;text-shadow:0 2px 10px #000}
      @keyframes fpLogoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-9px) scale(1.025)}}
      @keyframes fpLogoGlow{0%,100%{transform:scale(.9);opacity:.55}50%{transform:scale(1.08);opacity:1}}
      @media (prefers-reduced-motion:reduce){#fp-logo-img,#fp-logo-stage:before{animation:none!important}}
    `;
    document.head.appendChild(s);
  }
  function ensure(){
    installStyles();
    let o=document.getElementById('fp-logo-overlay');
    if(o) return o;
    o=document.createElement('div'); o.id='fp-logo-overlay'; o.setAttribute('aria-hidden','true');
    o.innerHTML='<div id="fp-logo-stage"><img id="fp-logo-img" src="'+LOGO+'" alt="FootballPoints"><div id="fp-logo-label">FOOTBALLPOINTS</div></div>';
    document.body.appendChild(o);
    if(!document.getElementById('fp-logo-badge')){
      const b=document.createElement('img'); b.id='fp-logo-badge'; b.src=LOGO; b.alt='FootballPoints'; b.title='FootballPoints';
      b.style.cssText='position:fixed;left:14px;bottom:14px;width:62px;height:62px;object-fit:contain;z-index:2147483000;border-radius:16px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.45));animation:fpLogoFloat 2.4s ease-in-out infinite;pointer-events:none';
      document.body.appendChild(b);
    }
    return o;
  }
  function show(label,ms){
    const o=ensure(), img=document.getElementById('fp-logo-img'), lab=document.getElementById('fp-logo-label');
    if(img && !img.complete) img.decode?.().catch(()=>{});
    if(lab) lab.textContent=label||'FOOTBALLPOINTS';
    o.classList.add('fp-show'); o.setAttribute('aria-hidden','false'); active=true;
    clearTimeout(timer); timer=setTimeout(hide,ms||1200);
  }
  function hide(){const o=document.getElementById('fp-logo-overlay'); if(!o)return; o.classList.remove('fp-show'); o.setAttribute('aria-hidden','true'); active=false}
  window.FootballPointsLogo={show,hide,loading:(label)=>show(label||'LOADING…',1400),roundFinished:(label)=>show(label||'ROUND FINISHED',2200)};

  function textOf(el){return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
  function maybeAuthOrLoad(){
    const t=textOf(document.body);
    if(/\b(Signing in\.\.\.|Creating account\.\.\.|Loading\.\.\.|Checking session\.\.\.)\b/i.test(t)) show('LOADING…',1200);
    const online=/\bSign out\b/i.test(t);
    if(online && !lastOnline){ lastOnline=true; show('WELCOME BACK',1700); }
    if(!online) lastOnline=false;
  }
  function maybeRound(){
    const t=textOf(document.body);
    if(!/round/i.test(t) || !/(finished|complete|completed|final results|final standings)/i.test(t)) return;
    const key=location.pathname+'|'+t.match(/round[^.!?]{0,80}(finished|complete|completed)/i)?.[0];
    if(key && key!==lastRoundKey){lastRoundKey=key;show('ROUND FINISHED',2200)}
  }
  function start(){
    ensure();
    show('WELCOME TO FOOTBALLPOINTS',1300);
    document.addEventListener('click',e=>{
      const el=e.target.closest?.('button,a'); if(!el)return;
      const t=textOf(el);
      if(/^(sign in|create account|join league|friendly|1v1|rooms|submit|finish round|view results)/i.test(t)) show(/sign in|create account/i.test(t)?'SIGNING IN…':'LOADING…',1000);
    },true);
    const mo=new MutationObserver(()=>{maybeAuthOrLoad();maybeRound()});
    mo.observe(document.body,{subtree:true,childList:true,characterData:true});
    setInterval(()=>{maybeAuthOrLoad();maybeRound()},900);
    window.addEventListener('footballpoints:round-finished',e=>window.FootballPointsLogo.roundFinished(e.detail?.label));
    window.addEventListener('pageshow',()=>show('WELCOME TO FOOTBALLPOINTS',900));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();