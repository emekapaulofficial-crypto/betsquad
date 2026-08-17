/* Public bet-name + private payout account + manual bank-transfer wallet UI. */
(function(){
  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;","'":"&#39;","\"":"&quot;",">":"&gt;"}[c]));}
  function mask(n){const s=String(n||"");return s.length>4?"•••• •••• "+s.slice(-4):s?"••••":"Not set";}
  const DEPOSIT_ACCOUNT="9152926691";

  async function getProfile(){if(!window.state?.user)return null;const {data}=await window.supabase.from("profiles").select("bet_name,legal_name_private,display_name").eq("id",window.state.user.id).single();return data||null;}
  async function getPayout(){if(!window.state?.user)return null;const {data}=await window.supabase.from("payout_accounts").select("id,bank_name,account_number,account_name,is_default").eq("user_id",window.state.user.id).eq("is_default",true).limit(1).maybeSingle();return data||null;}

  window.saveBetProfile=async function(){
    const betName=(document.querySelector("#betNameInput")?.value||"").trim();
    if(betName.length<3)return alert("Choose a bet name with at least 3 characters.");
    if(betName.length>30)return alert("Bet name must be 30 characters or less.");
    const {data:dupe}=await window.supabase.from("profiles").select("id").ilike("bet_name",betName).neq("id",window.state.user.id).limit(1);
    if(dupe?.length)return alert("That bet name is already in use. Choose another one.");
    const {error}=await window.supabase.from("profiles").update({bet_name:betName,display_name:betName}).eq("id",window.state.user.id);
    if(error)return alert("Could not save bet name: "+error.message);
    await window.render();
  };

  window.savePayoutAccount=async function(){
    const number=(document.querySelector("#payoutAccountNumber")?.value||"").replace(/\D/g,"");
    const bank=(document.querySelector("#payoutBankName")?.value||"").trim();
    const name=(document.querySelector("#payoutAccountName")?.value||"").trim();
    if(number.length<6)return alert("Enter a valid account number.");
    const old=await getPayout();let q;
    if(old?.id)q=await window.supabase.from("payout_accounts").update({account_number:number,bank_name:bank||null,account_name:name||null,updated_at:new Date().toISOString(),is_default:true}).eq("id",old.id).eq("user_id",window.state.user.id);
    else q=await window.supabase.from("payout_accounts").insert({user_id:window.state.user.id,account_number:number,bank_name:bank||null,account_name:name||null,is_default:true});
    if(q.error)return alert("Could not save payout account: "+q.error.message);
    await window.render();
  };

  window.requestBankWithdrawal=async function(){
    const amount=Number(document.querySelector("#withdrawAmount")?.value||0);
    const account=(document.querySelector("#withdrawAccount")?.value||"").replace(/\D/g,"");
    const bank=(document.querySelector("#withdrawBank")?.value||"").trim();
    const name=(document.querySelector("#withdrawName")?.value||"").trim();
    if(!amount||amount<=0)return alert("Enter a valid withdrawal amount.");
    if(account.length<6)return alert("Enter your bank account number.");
    if(!bank)return alert("Enter your bank name.");
    if(!name)return alert("Enter the account holder name.");
    const destination=JSON.stringify({bank,account_number:account,account_name:name});
    const {error}=await window.supabase.rpc("create_withdrawal_request",{p_amount:amount,p_destination:destination});
    if(error)return alert(error.message);
    alert("Withdrawal request submitted. An admin will review it and make the bank transfer manually.");
    await window.render();
  };

  function hideOldWalletControls(){
    const wrap=document.querySelector("main.wrap");if(!wrap)return;
    [...wrap.querySelectorAll("button,input,select,textarea")].forEach(el=>{
      const t=(el.textContent||el.value||el.placeholder||"").toLowerCase();
      if(/deposit|withdraw|payout/.test(t)){
        const parent=el.closest(".panel,.card,.form,.actions");if(parent&&parent.id!=="manualBankWallet")parent.style.display="none";
      }
    });
  }

  async function enhance(){
    if(!window.state?.user)return;
    const profile=await getProfile();const payout=await getPayout();
    if(window.state.page==="auth"){const name=document.querySelector("#name");if(name)name.placeholder="Bet name (public name)";}
    if(window.state.page!=="wallet")return;
    const wrap=document.querySelector("main.wrap");if(!wrap)return;
    hideOldWalletControls();
    document.querySelector("#privateAccountPanel")?.remove();
    const panel=document.createElement("div");panel.id="privateAccountPanel";panel.className="panel";panel.style.marginTop="16px";
    panel.innerHTML=`<h3>Wallet — Bank Transfer</h3>
      <p class="muted">Deposits and withdrawals are handled by bank transfer. Other players only see your Bet Name.</p>
      <div class="two">
        <div class="panel" style="margin:0"><span class="badge">DEPOSIT</span><h3>Make a bank transfer</h3><p>Transfer your payment to the FootballPoints deposit account below, then submit your payment reference.</p><div class="notice"><b>Account number</b><br><strong style="font-size:20px">${DEPOSIT_ACCOUNT}</strong><br><span class="small">Bank name: use the bank details provided by the administrator.</span></div><input id="depositAmount" type="number" min="1" step="0.01" placeholder="Amount transferred" style="margin-top:8px"><input id="depositReference" placeholder="Transfer reference / narration" style="margin-top:8px"><button class="primary" style="margin-top:8px" onclick="submitBankDeposit()">I have made the transfer</button><p class="small muted">Your deposit stays pending until an admin verifies the transfer.</p></div>
        <div class="panel" style="margin:0"><span class="badge">WITHDRAW</span><h3>Request a bank transfer</h3><input id="withdrawAmount" type="number" min="1" step="0.01" placeholder="Amount" style="margin-top:8px"><input id="withdrawBank" placeholder="Your bank name" style="margin-top:8px"><input id="withdrawAccount" inputmode="numeric" placeholder="Your account number" style="margin-top:8px"><input id="withdrawName" placeholder="Account holder name" style="margin-top:8px"><button class="secondary" style="margin-top:8px" onclick="requestBankWithdrawal()">Submit withdrawal request</button><p class="small muted">You enter your bank details here. The admin sees the request and makes the transfer manually.</p></div>
      </div>
      <div style="margin-top:16px"><span class="badge">PUBLIC NAME</span><div class="two"><div><label class="small">Bet Name</label><input id="betNameInput" maxlength="30" value="${esc(profile?.bet_name||profile?.display_name||"")}" placeholder="Choose your public Bet Name"><button class="primary" style="margin-top:8px" onclick="saveBetProfile()">Save Bet Name</button></div><div><label class="small">Saved payout account</label><div class="notice">${payout?`${esc(payout.bank_name||"Bank not set")} • ${mask(payout.account_number)}`:"No payout account saved"}</div></div></div></div>`;
    wrap.appendChild(panel);
  }

  window.submitBankDeposit=async function(){
    const amount=Number(document.querySelector("#depositAmount")?.value||0);const reference=(document.querySelector("#depositReference")?.value||"").trim();
    if(!amount||amount<=0)return alert("Enter the amount you transferred.");
    if(!reference)return alert("Enter your transfer reference/narration.");
    const {error}=await window.supabase.rpc("create_deposit_request",{p_amount:amount,p_method:"Bank transfer",p_reference:reference});
    if(error)return alert(error.message);
    alert("Deposit submitted. Please wait for admin verification.");await window.render();
  };

  const originalRender=window.render;
  window.render=async function(){await originalRender();try{await enhance();}catch(e){console.warn("wallet privacy layer:",e);}};
  document.addEventListener("DOMContentLoaded",()=>{if(window.state?.user)enhance();});
})();
