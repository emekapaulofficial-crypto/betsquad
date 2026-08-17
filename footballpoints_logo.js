(function(){
  'use strict';
  const LOGO='/assets/footballpoints-logo.webp';
  const MIN_SHOW=3200;
  let timer=null, lastRoundKey='', lastOnline=false;

  function installStyles(){
    if(document.getElementById('fp-logo-styles')) return;
    const s=document.createElement('style'); s.id='fp-logo-styles';
    s.textContent=`
      #fp-logo-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 42%,rgba(20,70,55,.72),rgba(1,5,15,.97) 68%);backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .35s ease}
      #fp-logo-overlay.fp-show{opacity:1;pointer-events:auto}
      #fp-logo-stage{width:min(86vw,500px);aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;position:relative}
      #fp-logo-stage:before,#fp-logo-stage:after{content:"";position:absolute;border-radius:50%;pointer-events:none}
      #fp-logo-stage:before{inset:4%;border:2px solid rgba(82,224,145,.22);box-shadow:0 0 55px rgba(82,224,145,.2),inset 0 0 45px rgba(255,196,45,.12);animation:fpLogoRing 2.2s ease-in-out infinite}
      #fp-logo-stage:after{inset:15%;background:radial-gradient(circle,rgba(82,224,145,.24),rgba(255,196,45,.08) 36%,transparent 70%);animation:fpLogoGlow 1.7s ease-in-out infinite}
      #fp-logo-img{position:relative;width:94%;height:94%;object-fit:contain;z-index:2;filter:drop-shadow(0 0 18px rgba(82,224,145,.45)) drop-shadow(0 10px 25px rgba(0,0,0,.65));animation:fpLogoFloat 1.8s ease-in-out infinite}
      #fp-logo-label{position:absolute;z-index:3;bottom:1%;left:50%;transform:translateX(-50%);font:800 clamp(12px,3vw,17px)/1 system-ui,sans-serif;letter-spacing:.16em;color:#fff;white-space:nowrap;text-shadow:0 2px 14px #000,0 0 18px rgba(82,224,145,.55)}
      #fp-logo-label:after{content:"";display:block;width:70%;height:3px;margin:10px auto 0;border-radius:99px;background:linear-gradient(90deg,transparent,#52e091,#ffd02f,#52e091,transparent);animation:fpLogoShine 1.5s linear infinite}
      #fp-logo-badge{position:fixed!important;left:12px!important;bottom:12px!important;width:72px!important;height:72px!important;padding:5px!important;object-fit:contain!important;z-index:2147483000!important;border-radius:18px!important;background:rgba(4,13,27,.86)!important;border:1px solid rgba(82,224,145,.45)!important;box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 22px rgba(82,224,145,.2)!important;animation:fpLogoFloat 2.5s ease-in-out infinite!important;pointer-events:none!important}
      @keyframes fpLogoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.035)}}
      @keyframes fpLogoGlow{0%,100%{transform:scale(.9);opacity:.45}50%{transform:scale(1.08);opacity:1}}
      @keyframes fpLogoRing{0%,100%{transform:scale(.94) rotate(0deg);opacity:.55}50%{transform:scale(1.04) rotate(8deg);opacity:1}}
      @keyframes fpLogoShine{0%{opacity:.35;transform:scaleX(.65)}50%{opacity:1;transform:scaleX(1)}100%{opacity:.35;transform:scaleX(.65)}}
      @media(max-width:600px){#fp-logo-stage{width:min(94vw,430px)}#fp-logo-badge{width:58px!important;height:58px!important;left:8px!important;bottom:8px!important;border-radius:14px!important}#fp-logo-label{bottom:0}}
      @media(prefers-reduced-motion:reduce){#fp-logo-img,#fp-logo-stage:before,#fp-logo-stage:after,#fp-logo-label:after,#fp-logo-badge{animation:none!important}}
    `;
    document.head.appendChild(s);
  }

  function ensure(){
    installStyles();
    let o=document.getElementById('fp-logo-overlay');
    if(o) return o;
    o=document.createElement('div'); o.id='fp-logo-overlay'; o.setAttribute('aria-hidden','true');
    o.innerHTML='<div id="fp-logo-stage"><img id="fp-logo-img" src="'+LOGO+'" alt="FootballPoints logo"><div id="fp-logo-label">FOOTBALLPOINTS</div></div>';
    document.body.appendChild(o);
    if(!document.getElementById('fp-logo-badge')){
      const b=document.createElement('img'); b.id='fp-logo-badge'; b.src=LOGO; b.alt='FootballPoints logo'; b.title='FootballPoints';
      document.body.appendChild(b);
    }
    return o;
  }

  function show(label,ms){
    const o=ensure(), img=document.getElementById('fp-logo-img'), lab=document.getElementById('fp-logo-label');
    if(img && !img.complete) img.decode?.().catch(()=>{});
    if(lab) lab.textContent=label||'FOOTBALLPOINTS';
    o.classList.add('fp-show'); o.setAttribute('aria-hidden','false');
    clearTimeout(timer);
    timer=setTimeout(hide,Math.max(MIN_SHOW,ms||MIN_SHOW));
  }
  function hide(){const o=document.getElementById('fp-logo-overlay');if(!o)return;o.classList.remove('fp-show');o.setAttribute('aria-hidden','true')}

  window.FootballPointsLogo={
    show:(label,ms)=>show(label,ms),
    hide,
    loading:(label)=>show(label||'LOADING FOOTBALLPOINTS…',MIN_SHOW),
    roundFinished:(label)=>show(label||'ROUND FINISHED',4000)
  };

  function textOf(el){return(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
  function maybeAuthOrLoad(){
    const t=textOf(document.body);
    if(/\b(Signing in\.\.\.|Creating account\.\.\.|Loading\.\.\.|Checking session\.\.\.)\b/i.test(t)) show('LOADING FOOTBALLPOINTS…',MIN_SHOW);
    const online=/\bSign out\b/i.test(t);
    if(online&&!lastOnline){lastOnline=true;show('WELCOME BACK',MIN_SHOW)}
    if(!online)lastOnline=false;
  }
  function maybeRound(){
    const t=textOf(document.body);
    if(!/round/i.test(t)||!/(finished|complete|completed|final results|final standings)/i.test(t))return;
    const m=t.match(/round[^.!?]{0,80}(finished|complete|completed)/i); const key=location.pathname+'|'+(m?.[0]||'');
    if(key&&key!==lastRoundKey){lastRoundKey=key;show('ROUND FINISHED',4000)}
  }

  function start(){
    ensure();
    // Every page gets a clear branded entrance animation.
    show('WELCOME TO FOOTBALLPOINTS',3500);
    document.addEventListener('click',e=>{
      const el=e.target.closest?.('button,a');if(!el)return;
      const t=textOf(el);
      if(/^(sign in|create account|join league|friendly|1v1|rooms|submit|finish round|view results)/i.test(t)){
        show(/sign in|create account/i.test(t)?'SIGNING IN…':'LOADING FOOTBALLPOINTS…',MIN_SHOW);
      }
    },true);
    const mo=new MutationObserver(()=>{maybeAuthOrLoad();maybeRound()});
    mo.observe(document.body,{subtree:true,childList:true,characterData:true});
    setInterval(()=>{maybeAuthOrLoad();maybeRound()},900);
    window.addEventListener('footballpoints:round-finished',e=>window.FootballPointsLogo.roundFinished(e.detail?.label));
    window.addEventListener('pageshow',()=>show('WELCOME TO FOOTBALLPOINTS',3500));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();