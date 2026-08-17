(function(){
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let started=false, lastFixtureSync=0, lastPresence=0, lastAdminCheck=0;
  const cache={players:null, fixtures:[]};

  async function presence(){
    if(!window.state?.user||!window.supabase)return;
    try{await window.supabase.rpc('touch_presence');lastPresence=Date.now();}catch(e){console.warn('presence:',e.message)}
  }
  async function activeUsers(){
    if(!window.supabase)return[];
    try{
      const {data,error}=await window.supabase.rpc('get_active_users',{p_minutes:10});
      if(!error&&data)return data;
    }catch(e){}
    try{
      const cutoff=new Date(Date.now()-10*60*1000).toISOString();
      const {data}=await window.supabase.from('profiles').select('id,bet_name,display_name,avatar_url,last_seen_at').gte('last_seen_at',cutoff).order('last_seen_at',{ascending:false}).limit(30);
      return data||[];
    }catch(e){return[]}
  }
  async function loadPlayers(){
    if(cache.players)return cache.players;
    try{
      const {data}=await window.supabase.from('players').select('id,name,real_name,photo_url,club,position').eq('active',true).order('name');
      cache.players=data||[];
    }catch(e){cache.players=[]}
    return cache.players;
  }
  async function loadFixtures(){
    try{
      const {data}=await window.supabase.from('upcoming_fixtures').select('*').eq('status','scheduled').gte('kickoff_at',new Date().toISOString()).order('kickoff_at',{ascending:true}).limit(20);
      cache.fixtures=data||[];
    }catch(e){cache.fixtures=[]}
    return cache.fixtures;
  }
  async function syncFixtures(){
    if(!window.supabase||Date.now()-lastFixtureSync<10*60*1000)return;
    lastFixtureSync=Date.now();
    try{await window.supabase.functions.invoke('sync-fixtures')}catch(e){console.warn('fixture sync:',e.message)}
  }
  function fixturePanel(fixtures){
    const rows=fixtures.map(f=>{
      const when=f.kickoff_at?new Date(f.kickoff_at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Kickoff TBA';
      return `<div class="row"><span><b>${esc(f.home_team||'Home')}</b> <span class="muted">vs</span> <b>${esc(f.away_team||'Away')}</b><br><small class="muted">${esc(when)}</small></span><button class="secondary" onclick="go('matches')">View</button></div>`;
    }).join('');
    return `<div id="fpUpcoming" class="panel" style="margin-top:16px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><span class="badge">LIVE FIXTURE FEED</span><h3 style="margin:8px 0 0">Upcoming matches</h3></div><button class="secondary" onclick="go('matches')">All matches</button></div>${rows||'<p class="muted">No upcoming matches are available yet. The fixture feed will check automatically again.</p>'}</div>`;
  }
  async function renderFixtures(){
    await syncFixtures();
    const fixtures=await loadFixtures();
    const existing=document.getElementById('fpUpcoming'); if(existing)existing.remove();
    const target=document.querySelector('main.wrap');
    if(!target)return;
    const panel=document.createElement('div');panel.innerHTML=fixturePanel(fixtures);target.appendChild(panel.firstElementChild);
  }
  function decoratePlayers(){
    const players=cache.players||[]; if(!players.length)return;
    document.querySelectorAll('button[onclick^="add("]').forEach(btn=>{
      const m=btn.getAttribute('onclick')?.match(/add\(['\"]([^'\"]+)['\"]\)/);if(!m)return;
      const p=players.find(x=>String(x.id)===m[1]);if(!p)return;
      const parent=btn.parentElement; if(!parent||parent.querySelector('.fp-real-player'))return;
      const holder=document.createElement('div');holder.className='fp-real-player';holder.style='display:flex;align-items:center;gap:10px;margin-bottom:8px';
      holder.innerHTML=`${p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.real_name||p.name)}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:1px solid #28415e">`:'<div style="width:46px;height:46px;border-radius:50%;background:#16304b;display:flex;align-items:center;justify-content:center">⚽</div>'}<div><b>${esc(p.real_name||p.name)}</b><div class="muted" style="font-size:12px">${esc(p.club||'')}${p.position?' • '+esc(p.position):''}</div></div>`;
      parent.insertBefore(holder,btn);
    });
  }
  async function profileAndSupport(){
    if(!window.supabase)return;
    const wrap=document.querySelector('main.wrap');if(!wrap)return;
    let panel=document.getElementById('communityPanel');
    if(!panel){
      panel=document.createElement('div');panel.id='communityPanel';panel.className='panel';panel.style.marginTop='16px';
      panel.innerHTML=`<span class="badge">COMMUNITY</span><h3>Players online</h3><div id="activePlayers"><p class="muted">Checking active players…</p></div><hr style="border:0;border-top:1px solid #28415e;margin:16px 0"><h3>Your profile & support</h3><p class="muted">Your Bet Name is public. Keep legal and payout details private.</p><div class="actions">${window.state?.user?`<label class="secondary" style="cursor:pointer">📷 Profile picture<input id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" style="display:none"></label><button class="secondary" onclick="openSupportTicket('deposit_delay')">💰 Deposit problem</button><button class="secondary" onclick="openSupportTicket('withdrawal_delay')">🏦 Withdrawal problem</button><button class="secondary" onclick="openSupportTicket('technical')">💬 Contact Admin</button>`:'<button class="secondary" onclick="go(\'auth\')">Login to join</button>'}</div>`;
      wrap.appendChild(panel);
      const input=panel.querySelector('#avatarFile');if(input)input.onchange=e=>uploadAvatar(e.target.files?.[0]);
    }
    const users=await activeUsers();
    const el=panel.querySelector('#activePlayers');
    if(el)el.innerHTML=users.length?`<div class="grid">${users.map(u=>`<div class="card" style="display:flex;align-items:center;gap:10px">${u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover">`:'<div style="width:38px;height:38px;border-radius:50%;background:#16304b;display:flex;align-items:center;justify-content:center">👤</div>'}<div><b>${esc(u.bet_name||u.display_name||'Player')}</b><div class="muted" style="font-size:12px">Active now</div></div></div>`).join('')}</div>`:'<p class="muted">No players are active right now.</p>';
  }
  window.openSupportTicket=async function(category){
    if(!window.state?.user)return window.go?.('auth');
    const subject=prompt('Subject:',category==='deposit_delay'?'Deposit delay':category==='withdrawal_delay'?'Withdrawal delay':'Technical problem');if(!subject)return;
    const message=prompt('Describe the problem. Include amount/reference if this is a payment issue:');if(!message)return;
    try{const {error}=await window.supabase.rpc('open_support_ticket',{p_category:category,p_subject:subject,p_message:message});alert(error?'Could not send support request: '+error.message:'Your request has been sent to the admin.');}catch(e){alert('Could not send support request: '+e.message)}
  };
  async function uploadAvatar(file){
    if(!file||!window.state?.user)return;
    if(file.size>3*1024*1024)return alert('Profile picture must be 3MB or smaller.');
    if(!/^image\/(jpeg|png|webp)$/.test(file.type))return alert('Use JPG, PNG, or WebP.');
    const uid=window.state.user.id,ext=file.type.split('/')[1].replace('jpeg','jpg'),path=uid+'/avatar.'+ext;
    try{
      const {error}=await window.supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});if(error)throw error;
      const {data}=window.supabase.storage.from('avatars').getPublicUrl(path);
      const q=await window.supabase.from('profiles').update({avatar_url:data.publicUrl+'?v='+Date.now()}).eq('id',uid);if(q.error)throw q.error;
      alert('Profile picture updated.');
    }catch(e){alert('Upload failed: '+e.message)}
  }
  async function adminNotifications(){
    if(!window.state?.user||!window.supabase||Date.now()-lastAdminCheck<30000)return;
    lastAdminCheck=Date.now();
    try{
      const {data:isAdmin}=await window.supabase.rpc('is_admin');if(!isAdmin)return;
      const [d,w,s]=await Promise.all([
        window.supabase.from('deposit_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
        window.supabase.from('withdrawal_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
        window.supabase.from('support_tickets').select('id',{count:'exact',head:true}).eq('status','open')
      ]);
      const total=(d.count||0)+(w.count||0)+(s.count||0);
      let b=document.getElementById('fpAdminAlert');
      if(!total){if(b)b.remove();return;}
      if(!b){b=document.createElement('button');b.id='fpAdminAlert';b.style='position:fixed;right:18px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:12px 16px;background:#49db8b;color:#07111f;font-weight:800;box-shadow:0 8px 30px #0008';b.onclick=()=>window.loadAdmin?.();document.body.appendChild(b)}
      b.textContent=`🔔 Admin: ${total} pending request${total===1?'':'s'}`;
      if('Notification' in window&&Notification.permission==='granted'){if(!window.__fpNotified||window.__fpNotified!==total){new Notification('FootballPoints Admin',{body:`${d.count||0} deposit, ${w.count||0} withdrawal, ${s.count||0} support request(s) pending.`});window.__fpNotified=total;}}
    }catch(e){}
  }
  async function enhance(){
    if(!window.supabase||!window.state)return;
    await loadPlayers();decoratePlayers();
    await profileAndSupport();
    await adminNotifications();
  }
  function install(){
    if(started)return; if(typeof window.render!=='function'||!window.supabase)return setTimeout(install,100);
    started=true;
    const oldRender=window.render;
    window.render=async function(){const r=oldRender.apply(this,arguments);try{await r}catch(e){};setTimeout(()=>enhance().catch(()=>{}),0);return r};
    enhance().catch(()=>{});
    setInterval(()=>{if(window.state?.user)presence()},60000);
    setInterval(()=>{renderFixtures().catch(()=>{});},10*60*1000);
    setInterval(()=>{enhance().catch(()=>{});},60*1000);
    setTimeout(()=>renderFixtures().catch(()=>{}),1500);
  }
  install();
})();
