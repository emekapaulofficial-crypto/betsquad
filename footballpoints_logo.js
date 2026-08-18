(function(){
  'use strict';
  const LOGO='/assets/footballpoints-logo.webp';
  function install(){
    if(document.getElementById('fp-logo-styles'))return;
    const s=document.createElement('style');s.id='fp-logo-styles';
    s.textContent=`#fp-logo-overlay{display:none!important}#fp-logo-badge{position:fixed!important;left:12px!important;bottom:12px!important;width:58px!important;height:58px!important;padding:4px!important;object-fit:contain!important;z-index:2147483000!important;border-radius:12px!important;background:rgba(4,13,27,.78)!important;border:1px solid rgba(82,224,145,.35)!important;box-shadow:0 5px 18px rgba(0,0,0,.32)!important;pointer-events:none!important;animation:none!important;transform:none!important}@media(max-width:600px){#fp-logo-badge{width:48px!important;height:48px!important;left:8px!important;bottom:8px!important;border-radius:10px!important}}`;
    document.head.appendChild(s);
    if(!document.getElementById('fp-logo-badge')){const b=document.createElement('img');b.id='fp-logo-badge';b.src=LOGO;b.alt='FootballPoints';b.title='FootballPoints';document.body.appendChild(b)}
    window.FootballPointsLogo={show:function(){},hide:function(){},loading:function(){},roundFinished:function(){}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();