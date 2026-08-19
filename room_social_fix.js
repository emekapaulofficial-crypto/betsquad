/* Room social fixes: provide the fixture sync hook expected by room_social_flow. */
(function(){
  'use strict';
  window.syncFixtures = window.syncFixtures || (async function(){
    if (!window.supabase) return false;
    try {
      const result = await window.supabase.functions.invoke('sync-fixtures');
      if (result.error) console.warn('Fixture sync unavailable; using verified database fixtures:', result.error.message);
      return !result.error;
    } catch (e) {
      console.warn('Fixture sync unavailable; using verified database fixtures:', e?.message || e);
      return false;
    }
  });
})();
