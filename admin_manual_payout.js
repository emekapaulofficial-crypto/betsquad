/* V6 Admin Dashboard + Manual Payouts
   Manual payout workflow:
   Pending -> Approved -> (admin sends money externally) -> Paid
   No bank credentials are collected or stored.
*/

window.adminState = { isAdmin:false, requests:[], rooms:[], filter:"pending" };

/* FIXED: your database uses an admin_users table + is_admin() function,
   not a profiles.is_admin column. This now checks the right place. */
async function checkAdmin(){
  if(!state.user) return false;
  const q=await supabase.rpc("is_admin");
  adminState.isAdmin = !!q.data && !q.error;
  if(q.error) console.warn("Admin check failed:", q.error.message);
  return adminState.isAdmin;
}

async function loadAdmin(){
  if(!await checkAdmin()) { alert("Admin access required."); return go("home"); }
  const q=await supabase.from("withdrawal_requests")
    .select("id,user_id,amount,status,destination,created_at,processed_at,profiles(display_name,email)")
    .order("created_at",{ascending:false}).limit(200);
  if(q.error) return alert(q.error.message);
  adminState.requests=q.data||[];
  const r=await supabase.rpc("admin_room_summary");
  if(r.error) return alert(r.error.message);
  adminState.rooms=r.data||[];
  state.page="admin"; render();
}

async function approveWithdrawal(id){
  if(!confirm("Approve this withdrawal request?")) return;
  const q=await supabase.rpc("admin_approve_withdrawal",{p_request_id:id});
  if(q.error) return alert(q.error.message);
  await loadAdmin();
}

async function rejectWithdrawal(id){
  const reason=prompt("Reason for rejection (optional):")||"";
  const q=await supabase.rpc("admin_reject_withdrawal",{p_request_id:id,p_reason:reason});
  if(q.error) return alert(q.error.message);
  await loadAdmin();
}

async function markPaid(id){
  const reference=prompt("Enter your manual transfer/reference number. Only do this AFTER you have sent the money externally:");
  if(reference===null) return;
  if(!confirm("Confirm the external payment has already been sent?")) return;
  const q=await supabase.rpc("admin_mark_withdrawal_paid",{p_request_id:id,p_reference:reference});
  if(q.error) return alert(q.error.message);
  await loadAdmin();
}

function adminRequestRow(x){
  const who=x.profiles?.display_name||x.profiles?.email||x.user_id;
  const date=new Date(x.created_at).toLocaleString();
  let actions="";
  if(x.status==="pending")
    actions=`<button class="secondary" onclick="approveWithdrawal('${x.id}')">Approve</button>
             <button class="danger" onclick="rejectWithdrawal('${x.id}')">Reject</button>`;
  if(x.status==="approved")
    actions=`<button class="primary" onclick="markPaid('${x.id}')">Mark PAID</button>
             <button class="danger" onclick="rejectWithdrawal('${x.id}')">Reject</button>`;
  return `<div class="admin-row">
    <div><b>${who}</b><div class="small">${date}</div></div>
    <div><b>${Number(x.amount).toFixed(2)}</b><div class="small">${x.destination||"No destination note"}</div></div>
    <span class="status ${x.status}">${x.status.toUpperCase()}</span>
    <div class="admin-actions">${actions}</div>
  </div>`;
}

function adminDashboard(){
  const pending=adminState.requests.filter(x=>x.status==="pending");
  const approved=adminState.requests.filter(x=>x.status==="approved");
  const paid=adminState.requests.filter(x=>x.status==="paid");
  const rejected=adminState.requests.filter(x=>x.status==="rejected");
  return `<div class="section">
    <div><span class="badge">ADMIN</span><h2>Control Dashboard</h2>
    <p class="muted">Manual payout management • no bank credentials stored</p></div>
    <button class="secondary" onclick="go('home')">Exit Admin</button>
  </div>
  <div class="admin-stats">
    <div class="stat"><b>${pending.length}</b><span>Pending</span></div>
    <div class="stat"><b>${approved.length}</b><span>Approved</span></div>
    <div class="stat"><b>${paid.length}</b><span>Paid</span></div>
    <div class="stat"><b>${rejected.length}</b><span>Rejected</span></div>
  </div>
  <div class="panel"><h3>Withdrawal Requests</h3>
    ${adminState.requests.length?adminState.requests.map(adminRequestRow).join(""):"<p class='muted'>No withdrawal requests.</p>"}
  </div>
  <div class="panel"><h3>Room & Prize Overview</h3>
    ${adminState.rooms.length?adminState.rooms.map(r=>`<div class="admin-row">
      <div><b>${r.room_name}</b><div class="small">${r.room_code} • ${r.game_mode}</div></div>
      <span class="status ${r.status}">${r.status}</span>
      <div>Players: ${r.members}</div>
      <div>Pool: ${Number(r.prize_pool||0).toFixed(2)}</div>
      <div>Fee: ${Number(r.platform_fee||0).toFixed(2)}</div>
      <div>1st: ${Number(r.first_place||0).toFixed(2)} • 2nd: ${Number(r.second_place||0).toFixed(2)}</div>
    </div>`).join(""):"<p class='muted'>No rooms found.</p>"}
  </div>`;
}

window.loadAdmin=loadAdmin;
window.approveWithdrawal=approveWithdrawal;
window.rejectWithdrawal=rejectWithdrawal;
window.markPaid=markPaid;
window.adminDashboard=adminDashboard;
