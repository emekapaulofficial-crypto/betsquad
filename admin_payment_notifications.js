/* Admin-only payment notification panel. Uses existing RLS and admin RPCs. */
(function(){'use strict';
async function refresh(){
 if(!window.state?.user||!window.supabase||!window.state?.isAdmin)return;
 const {data,error}=await window.supabase.from('deposit_requests').select('id,user_id,amount,method,reference,status,created_at').eq('status','pending').order('created_at',{ascending:false});
 if(error)return;
 const ids=[...new Set((data||[]).map(x=>x.user_id))];let names={};
 if(ids.length){const r=await window.supabase.from('profiles').select('id,display_name,username,email').in('id',ids);(r.data||[]).forEach(p=>names[p.id]=p.display_name||p.username||p.email||'Player');}
 let box=document.getElementById('fpAdminPayments');if(!box){box=document.createElement('section');box.id='fpAdminPayments';box.className='panel';box.style.cssText='position:fixed;right:12px;top:74px;width:min(380px,calc(100vw - 24px));max-height:70vh;overflow:auto;z-index:99990;border:2px solid rgba(255,196,45,.7);background:#07182a;box-shadow:0 15px 45px rgba(0,0,0,.45);';document.body.appendChild(box);}
 box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><span class="badge">ADMIN PAYMENT ALERTS</span><h3 style="margin:7px 0">Pending bank payments ('+(data?.length||0)+')</h3></div><button id="fpClosePayAlerts" class="secondary">×</button></div>'+(data||[]).map(x=>'<article style="padding:12px;margin:8px 0;border:1px solid rgba(255,255,255,.1);border-radius:10px"><b>'+String(names[x.user_id]||'Player').replace(/[<>]/g,'')+'</b><div>Amount: <strong>'+Number(x.amount).toLocaleString()+'</strong></div><div>Reference: '+String(x.reference||'Not supplied').replace(/[<>]/g,'')+'</div><div class="small muted">'+new Date(x.created_at).toLocaleString()+'</div><div style="display:flex;gap:8px;margin-top:9px"><button class="primary" data-approve="'+x.id+'">ACCEPT</button><button class="secondary" data-reject="'+x.id+'">REJECT</button></div></article>').join('')+(data?.length?'':'<p class="muted">No pending payments.</p>');
 box.querySelector('#fpClosePayAlerts').onclick=()=>box.remove();
 box.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await window.supabase.rpc('admin_approve_deposit',{p_request_id:b.dataset.approve});if(r.error)alert(r.error.message);await refresh();});
 box.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('Reason for rejecting this payment:')||'';b.disabled=true;const r=await window.supabase.rpc('admin_reject_deposit',{p_request_id:b.dataset.reject,p_reason:reason});if(r.error)alert(r.error.message);await refresh();});
}
function start(){setInterval(refresh,5000);refresh();}
function wait(){if(window.supabase&&window.state)start();else setTimeout(wait,500)}wait();
})();
