/* BetSquad unified admin notification hub. Keeps payment and withdrawal tools
   but presents them through one notification button/panel instead of two floating alerts. */
(() => {
  'use strict';
  let open = false;

  function isAdmin() { return !!window.state?.isAdmin; }

  function ensureHub() {
    if (!isAdmin()) return null;
    let hub = document.getElementById('betsquadNotificationHub');
    if (hub) return hub;

    hub = document.createElement('div');
    hub.id = 'betsquadNotificationHub';
    hub.innerHTML = `
      <button id="betsquadNotificationButton" type="button" aria-label="Notifications">
        🔔 <span>Notifications</span><b id="betsquadNotificationCount">0</b>
      </button>
      <div id="betsquadNotificationPanel" aria-hidden="true">
        <div class="betsquad-notification-head">
          <strong>Notifications</strong>
          <button id="betsquadNotificationClose" type="button">×</button>
        </div>
        <div id="betsquadNotificationContent"></div>
      </div>`;
    document.body.appendChild(hub);

    const style = document.createElement('style');
    style.id = 'betsquadNotificationHubStyle';
    style.textContent = `
      #betsquadNotificationHub{position:fixed;right:16px;bottom:16px;z-index:100500;font-family:inherit}
      #betsquadNotificationButton{border:1px solid rgba(82,224,145,.65);background:#07182a;color:#fff;border-radius:12px;padding:11px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;font-weight:700}
      #betsquadNotificationButton b{display:inline-flex;min-width:20px;height:20px;align-items:center;justify-content:center;margin-left:7px;border-radius:10px;background:#52e091;color:#062015;font-size:12px}
      #betsquadNotificationPanel{display:none;position:absolute;right:0;bottom:54px;width:min(390px,calc(100vw - 24px));max-height:72vh;overflow:auto;background:#07182a;border:1px solid #29415c;border-radius:14px;box-shadow:0 18px 55px rgba(0,0,0,.55);padding:12px}
      #betsquadNotificationPanel.open{display:block}
      .betsquad-notification-head{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 10px;font-size:18px}
      .betsquad-notification-head button{border:0;background:#19304a;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer}
      #betsquadNotificationContent #fpAdminPayments,#betsquadNotificationContent #fpAdminWithdrawals{position:static!important;top:auto!important;right:auto!important;width:100%!important;max-width:none!important;max-height:none!important;border:0!important;box-shadow:none!important;background:transparent!important;margin:0!important;padding:0!important}
      #betsquadNotificationContent #fpAdminPayments{border-bottom:1px solid rgba(255,255,255,.12)!important;margin-bottom:10px!important;padding-bottom:10px!important}
    `;
    document.head.appendChild(style);

    hub.querySelector('#betsquadNotificationButton').onclick = () => toggle(true);
    hub.querySelector('#betsquadNotificationClose').onclick = () => toggle(false);
    return hub;
  }

  function toggle(value) {
    open = value;
    const panel = document.getElementById('betsquadNotificationPanel');
    if (!panel) return;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) movePanels();
  }

  function movePanels() {
    const hub = ensureHub();
    const content = document.getElementById('betsquadNotificationContent');
    if (!hub || !content) return;
    ['fpAdminPayments','fpAdminWithdrawals'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== content) content.appendChild(el);
    });

    const pay = document.getElementById('fpAdminPayments');
    const withdraw = document.getElementById('fpAdminWithdrawals');
    const paymentEmpty = !pay || /Pending bank payments \(0\)/.test(pay.textContent || '');
    const withdrawalEmpty = !withdraw || /Pending withdrawals \(0\)/.test(withdraw.textContent || '');
    const count = (paymentEmpty ? 0 : 1) + (withdrawalEmpty ? 0 : 1);
    const badge = document.getElementById('betsquadNotificationCount');
    if (badge) badge.textContent = String(count);
  }

  function scan() {
    if (!isAdmin()) return;
    ensureHub();
    movePanels();
    if (!open) toggle(false);
  }

  new MutationObserver(scan).observe(document.documentElement, { childList:true, subtree:true });
  setInterval(scan, 1500);
  setTimeout(scan, 500);
})();