/* FootballPoints — Easy Navigation
 * Non-destructive navigation layer. Uses the existing window.go() router and
 * leaves game/wallet logic untouched.
 */
(() => {
  const NAV = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "rooms", label: "Rooms", icon: "♟" },
    { id: "matches", label: "Matches", icon: "⚽" },
    { id: "wallet", label: "Wallet", icon: "₦" },
    { id: "leaderboard", label: "Rank", icon: "🏆" }
  ];

  const style = document.createElement("style");
  style.textContent = `
    #fpEasyNav{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9000;display:flex;align-items:center;gap:6px;padding:7px;background:rgba(15,23,42,.96);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 12px 35px rgba(0,0,0,.28);backdrop-filter:blur(12px)}
    #fpEasyNav button{border:0;background:transparent;color:#cbd5e1;min-width:66px;height:52px;padding:5px 8px;border-radius:13px;font:600 11px/1.1 system-ui,sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
    #fpEasyNav button .fp-nav-icon{font-size:19px;line-height:1}
    #fpEasyNav button.active{background:#16a34a;color:#fff}
    #fpEasyNav button:hover{background:rgba(255,255,255,.09);color:#fff}
    #fpQuickNav{position:fixed;right:18px;top:84px;z-index:8999;display:flex;gap:8px}
    #fpQuickNav button{border:0;border-radius:999px;padding:10px 14px;background:#16a34a;color:#fff;font:700 12px system-ui,sans-serif;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.2)}
    #fpQuickNav button.secondary{background:#fff;color:#0f172a;border:1px solid #e2e8f0}
    body{padding-bottom:88px!important}
    @media(max-width:700px){
      #fpEasyNav{left:8px;right:8px;bottom:8px;transform:none;justify-content:space-around;border-radius:16px;padding:5px 3px}
      #fpEasyNav button{min-width:0;flex:1;height:55px}
      #fpQuickNav{left:12px;right:12px;top:auto;bottom:78px;justify-content:center}
      #fpQuickNav button{flex:1;max-width:180px}
    }
  `;
  document.head.appendChild(style);

  function navigate(page) {
    if (page === "wallet" && !window.state?.user) {
      if (typeof window.go === "function") window.go("auth");
      return;
    }
    if (typeof window.go === "function") window.go(page);
  }

  function renderNav() {
    let nav = document.getElementById("fpEasyNav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "fpEasyNav";
      nav.setAttribute("aria-label", "Main navigation");
      document.body.appendChild(nav);
    }
    const current = window.state?.page || "home";
    nav.innerHTML = NAV.map(item => `
      <button class="${current === item.id ? "active" : ""}" data-fp-page="${item.id}" aria-label="${item.label}">
        <span class="fp-nav-icon">${item.icon}</span><span>${item.label}</span>
      </button>`).join("");

    let quick = document.getElementById("fpQuickNav");
    if (!quick) {
      quick = document.createElement("div");
      quick.id = "fpQuickNav";
      quick.innerHTML = '<button data-fp-quick="rooms">Join a Room</button><button class="secondary" data-fp-quick="wallet">My Wallet</button>';
      document.body.appendChild(quick);
    }
  }

  document.addEventListener("click", e => {
    const pageButton = e.target.closest("[data-fp-page]");
    const quickButton = e.target.closest("[data-fp-quick]");
    if (pageButton) navigate(pageButton.dataset.fpPage);
    if (quickButton) navigate(quickButton.dataset.fpQuick);
  });

  // Re-render after the existing app changes pages.
  const originalGo = window.go;
  if (typeof originalGo === "function") {
    window.go = (...args) => {
      const result = originalGo(...args);
      setTimeout(renderNav, 0);
      return result;
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderNav);
  else renderNav();
  setInterval(renderNav, 1500);
})();
