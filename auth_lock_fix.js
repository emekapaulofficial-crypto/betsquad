/* Prevent a stale FootballPoints tab from holding Supabase's browser Web Lock forever. */
(function(){
  try{
    if(navigator.locks && typeof navigator.locks.request === 'function' && !navigator.locks.__fpOriginalRequest){
      const original=navigator.locks.request.bind(navigator.locks);
      navigator.locks.__fpOriginalRequest=original;
      navigator.locks.request=async function(name, optionsOrCallback, maybeCallback){
        const callback=typeof optionsOrCallback==='function' ? optionsOrCallback : maybeCallback;
        if(typeof callback!=='function') return original(name, optionsOrCallback, maybeCallback);
        return await callback({name,mode:'exclusive'});
      };
    }
  }catch(e){ console.warn('FootballPoints auth lock guard unavailable:',e); }
})();
