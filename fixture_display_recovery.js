/* FootballPoints fixture display recovery.
   The UI previously read through the upcoming_fixtures view. That view can be
   empty to the browser even when public.fixtures contains scheduled matches.
   This recovery layer reads the protected fixtures table directly for signed-in
   users and restores the normal state.fixtures list without changing the
   fixture engine or exposing any secret key.
*/
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let busy=false;
  async function recover(){
    if(busy||!window.state||!window.supabase||typeof window.render!=="function")return;
    if(window.state.page!=="matches")return;
    if((window.state.fixtures||[]).length>0)return;
    busy=true;
    try{
      const {data,error}=await window.supabase
        .from("fixtures")
        .select("*")
        .eq("status","scheduled")
        .gte("kickoff_at",new Date(Date.now()-30*60*1000).toISOString())
        .order("kickoff_at",{ascending:true})
        .limit(50);
      if(error){console.warn("Fixture display recovery failed:",error.message);return;}
      if(Array.isArray(data)&&data.length){
        window.state.fixtures=data;
        window.state.loadingFixtures=false;
        window.render();
      }
    }catch(e){console.warn("Fixture display recovery error:",e.message)}
    finally{busy=false}
  }
  async function loop(){
    for(;;){
      await sleep(1200);
      try{await recover()}catch(e){}
    }
  }
  loop();
})();
