/* Public bet-name + private payout-account layer.
   Loaded after the main app so legal/payment details stay out of public UI. */
(function(){
  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
  function mask(n){const s=String(n||"");return s.length>4?"•••• •••• "+s.slice(-4):s?"••••":"Not set";}

  async function getProfile(){
    if(!window.state?.user) return null;
    const {data,error}=await window.supabase.from("profiles").select("bet_name,legal_name_private,display_name").eq("id",window.state.user.id).single();
    if(error) return null; return data;
  }

  async function getPayout(){
    if(!window.state?.user) return null;
    const {data}=await window.supabase.from("payout_accounts").select("id,bank_name,account_number,account_name,is_default").eq("user_id",window.state.user.id).eq("is_default",true).limit(1).maybeSingle();
    return data||null;
  }

  window.saveBetProfile=async function(){
    const input=document.querySelector("#betNameInput");
    const betName=(input?.value||"").trim();
    if(betName.length<3)return alert("Choose a bet name with at least 3 characters.");
    if(betName.length>30)return alert("Bet name must be 30 characters or less.");
    const {data:dupe}=await window.supabase.from("profiles").select("id").ilike("bet_name",betName).neq("id",window.state.user.id).limit(1);
    if(dupe?.length)return alert("That bet name is already in use. Choose another one.");
    const {error}=await window.supabase.from("profiles").update({bet_name:betName,display_name:betName}).eq("id",window.state.user.id);
    if(error)return alert("Could not save bet name: "+error.message);
    alert("Bet name saved. Your legal name stays private.");
    await window.render();
  };

  window.savePayoutAccount=async function(){
    const number=(document.querySelector("#payoutAccountNumber")?.value||"").replace(/\D/g,"");
    const bank=(document.querySelector("#payoutBankName")?.value||"").trim();
    const name=(document.querySelector("#payoutAccountName")?.value||"").trim();
    if(number.length<6) return alert("Enter a valid account number.");
    const old=await getPayout();
    let q;
    if(old?.id){
      q=await window.supabase.from("payout_accounts").update({account_number:number,bank_name:bank||null,account_name:name||null,updated_at:new Date().toISOString(),is_default:true}).eq("id",old.id).eq("user_id",window.state.user.id);
    }else{
      q=await window.supabase.from("payout_accounts").insert({user_id:window.state.user.id,account_number:number,bank_name:bank||null,account_name:name||null,is_default:true});
    }
    if(q.error)return alert("Could not save payout account: "+q.error.message);
    alert("Payout account saved privately. Other players will only see your bet name.");
    await window.render();
  };

  const originalRender=window.render;
  window.render=async function(){
    await originalRender();
    try{await enhance();}catch(e){console.warn("privacy layer:",e);}
  };

  async function enhance(){
    if(!window.state?.user)return;
    const profile=await getProfile();
    const payout=await getPayout();

    if(window.state.page==="auth"){
      const name=document.querySelector("#name");
      if(name)name.placeholder="Bet name (public name)";
    }

    if(window.state.page==="wallet"){
      const wrap=document.querySelector("main.wrap"); if(!wrap)return;
      const old=document.querySelector("#privateAccountPanel"); if(old)old.remove();
      const panel=document.createElement("div"); panel.id="privateAccountPanel"; panel.className="panel"; panel.style.marginTop="16px";
      panel.innerHTML=`<h3>Account identity & payout</h3>
        <p class="muted">Your <b>Bet Name</b> is what other players see. Your legal/payment details are private and are only used for account and payout processing.</p>
        <div class="two">
          <div><label class="small">Bet Name (public)</label><input id="betNameInput" maxlength="30" value="${esc(profile?.bet_name||profile?.display_name||"")}" placeholder="Choose your bet name"><button class="primary" style="margin-top:8px" onclick="saveBetProfile()">Save bet name</button></div>
          <div><label class="small">Saved payout account</label><div class="notice">${payout?`${esc(payout.bank_name||"Bank not set")} • ${mask(payout.account_number)}`:"No payout account saved"}</div><input id="payoutBankName" placeholder="Bank / Opay / Moniepoint name" value="${esc(payout?.bank_name||"")}" style="margin-top:8px"><input id="payoutAccountNumber" inputmode="numeric" placeholder="Account number" value="${esc(payout?.account_number||"")}" style="margin-top:8px"><input id="payoutAccountName" placeholder="Account holder name (private)" value="${esc(payout?.account_name||"")}" style="margin-top:8px"><button class="secondary" style="margin-top:8px" onclick="savePayoutAccount()">Save payout account</button></div>
        </div>`;
      wrap.appendChild(panel);
    }

    if(window.state.page==="leaderboard"&&window.state.round){
      const {data,error}=await window.supabase.rpc("get_public_leaderboard",{p_round_id:window.state.round.id});
      if(!error&&data){
        const table=document.querySelector(".table");
        if(table){
          table.innerHTML=`<tr><th>#</th><th>Player</th><th>Points</th><th>Prize</th></tr>`+data.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bet_name||"Player")}</td><td>${r.total_points}</td><td>${i===0?"🏆 Cash":i===1?"🏆 Cash":i===2?"💎 Diamonds":"—"}</td></tr>`).join("");
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    const name=document.querySelector("#name"); if(name)name.placeholder="Bet name (public name)";
    if(window.state?.user) enhance();
  });
})();
