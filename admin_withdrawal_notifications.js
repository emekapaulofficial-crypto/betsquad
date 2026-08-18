/* Admin-only withdrawal requests. Uses the protected admin withdrawal RPC. */
(function(){'use strict';
async function refresh(){
 if(!window.state?.user||!window.supabase||!window.state?.isAdmin)return;
 const {data,error}=await window.supabase.from('withdrawal_requests').select('id,user_id,amount,destination,status,created_at').eq('status','pending').order('created_at',{ascending:false});
 if(error)return;
 const ids=[...new Set((data||[]).map(x=>x.user_id))];let names={};
 if(ids.length){const r=await window.supabase.from('profiles').select('id,display_name,username,email').in('id',ids);(r.data||[]).forEach(p=>names[p.id]=p.display_name||p.username||p.email||'Player');}
 let box=document.getElementById('fpAdminWithdrawals');
 if(!box){box=document.createElement('section');box.id='fpAdminWithdrawals';box.className='panel';box.style.cssText='position:fixed;right:12px;top:calc(74px + min(70vh,520px));width:min(380px,calc(100vw - 24px));max-height:55vh;overflow:auto;z-index:99989;border:2px solid rgba(82,224,145,.65);background:#07182a;box-shadow:0 15px 45px rgba(0,0,0,.45);';document.body.appendChild(box);}
 box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><span class="badge">ADMIN WITHDRAWALS</span><h3 style="margin:7px 0">Pending withdrawals ('+(data?.length||0)+')</h3></div><button id="fpCloseWithdrawAlerts" class="secondary">×</button></div>'+(data||[]).map(x=>'<article style="padding:12px;margin:8px 0;border:1px solid rgba(255,255,255,.1);border-radius:10px"><b>'+String(names[x.user_id]||'Player').replace(/[<>]/g,'')+'</b><div>Requested: <strong>'+Number(x.amount).toLocaleString()+'</strong></div><div>Destination: '+String(x.destination||'Not supplied').replace(/[<>]/g,'')+'</div><div class="small muted">'+new Date(x.created_at).toLocaleString()+'</div><div style="display:flex;gap:8px;margin-top:9px"><button class="primary" data-grant="'+x.id+'">GRANT AMOUNT</button><button class="secondary" data-deny="'+x.id+'">REJECT</button></div></article>').join('')+(data?.length?'':'<p class="muted">No pending withdrawals.</p>');
 box.querySelector('#fpCloseWithdrawAlerts').onclick=()=>box.remove();
 box.querySelectorAll('[data-grant]').forEach(b=>b.onclick=async()=>{if(!confirm('Grant this withdrawal amount? The player wallet will be settled by the protected admin function.'))return;b.disabled=true;const r=await window.supabase.rpc('admin_approve_withdrawal',{p_request_id:b.dataset.grant});if(r.error){alert(r.error.message);b.disabled=false;return;}alert('Withdrawal granted.');await refresh();});
 box.querySelectorAll('[data-deny]').forEach(b=>b.onclick=async()=>{const reason=prompt('Reason for rejecting this withdrawal:')||'';b.disabled=true;const r=await window.supabase.rpc('admin_reject_withdrawal',{p_request_id:b.dataset.deny,p_reason:reason});if(r.error){alert(r.error.message);b.disabled=false;return;}await refresh();});
}
function start(){setInterval(refresh,5000);refresh();} function wait(){if(window.supabase&&window.state)start();else setTimeout(wait,500);} wait();
})();
