/* Primary-admin-only management of secondary administrators. */
(function(){'use strict';
let tries=0;
function removeDuplicateAdminControls(){
  const nodes=[...document.querySelectorAll('button,a')].filter(el=>/^\s*manage admins\s*$/i.test(el.textContent||''));
  nodes.forEach((el,i)=>{if(i>0)el.remove();});
}
async function install(){
 if(!window.supabase||!window.state||typeof window.render!=='function'){if(tries++<150)setTimeout(install,100);return;}
 if(window.__fpAdminManagementInstalled)return; window.__fpAdminManagementInstalled=true;
 async function isOwner(){try{const {data,error}=await supabase.rpc('is_owner_admin');return !error&&data===true}catch(e){return false}}
 async function list(){const {data,error}=await supabase.rpc('admin_list_users');if(error)throw error;return data||[]}
 async function refresh(){
   removeDuplicateAdminControls();
   if(state.page!=='admin'||!state.isAdmin)return;
   let panel=document.getElementById('fp-admin-management');
   if(!panel){panel=document.createElement('section');panel.id='fp-admin-management';panel.className='panel';panel.style.marginTop='16px';document.getElementById('app')?.appendChild(panel);}
   const owner=await isOwner();
   let admins=[];
   try{admins=await list()}catch(e){panel.innerHTML='<h3>👑 Administrators</h3><p class="muted">Unable to load administrators: '+String(e.message||e).replace(/[<>&]/g,'')+'</p>';return;}
   panel.innerHTML='<h3>👑 Administrators</h3><p class="muted">Your Primary Admin account is permanently protected. Only the Primary Admin can add or remove secondary admins.</p>'+
   (owner?'<div class="form" style="margin-bottom:12px"><input id="fp-admin-email" type="email" placeholder="Registered user email"><button class="primary" id="fp-add-admin">Add Secondary Admin</button></div>':'')+
   '<div>'+admins.map(a=>'<div class="row" style="margin:6px 0"><span><b>'+((a.display_name||'User').replace(/[<>&]/g,''))+'</b><br><span class="small muted">'+((a.email||'No email').replace(/[<>&]/g,''))+'</span></span><span>'+ (a.is_owner?'<b>PRIMARY ADMIN — LOCKED</b>':(a.active?(owner?'<button class="secondary fp-remove-admin" data-id="'+a.user_id+'">Remove</button>':'SECONDARY ADMIN'):'Inactive'))+'</span></div>').join('')+'</div>';
   if(owner){document.getElementById('fp-add-admin')?.addEventListener('click',async()=>{const email=document.getElementById('fp-admin-email').value.trim();if(!email)return alert('Enter the registered user email.');const {error}=await supabase.rpc('admin_add_by_email',{p_email:email});if(error)return alert(error.message);document.getElementById('fp-admin-email').value='';await refresh();});document.querySelectorAll('.fp-remove-admin').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Remove this secondary admin?'))return;const {error}=await supabase.rpc('admin_remove_admin',{p_user_id:b.dataset.id});if(error)return alert(error.message);await refresh();}));}
 }
 const originalRender=window.render;
 window.render=function(){const r=originalRender.apply(this,arguments);setTimeout(refresh,0);return r;};
 install();
}
install();
})();
