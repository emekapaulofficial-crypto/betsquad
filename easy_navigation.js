/* FootballPoints — Easy Navigation v3
 * Mobile-first navigation layer. Uses the existing window.go() router.
 * Does not replace game, wallet, authentication, or settlement logic.
 */
(() => {
  const NAV = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "rooms", label: "Games", icon: "🎮" },
    { id: "matches", label: "Matches", icon: "⚽" },
    { id: "wallet", label: "Wallet", icon: "₦" },
    { id: "leaderboard", label: "Rank", icon: "🏆" }
  ];

  const style = document.createElement("style");
  style.textContent = `
    #fpEasyNav{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9000;display:flex;align-items:center;gap:4px;width:min(560px,calc(100% - 24px));padding:6px;background:rgba(10,23,40,.98);border:1px solid #29415e;border-radius:18px;box-shadow:0 14px 40px rgba(0,0,0,.38);backdrop-filter:blur(14px)}
    #fpEasyNav button{appearance:none;border:0;background:transparent;color:#9db1c9;min-width:0;flex:1;height:54px;padding:5px 6px;border-radius:13px;font:700 11px/1.1 system-ui,sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:transform .12s,background .12s,color .12s}
    #fpEasyNav button .fp-nav-icon{font-size:19px;line-height:1}
    #fpEasyNav button.active{background:#55d98b;color:#04130b}
    #fpEasyNav button:hover{background:#142941;color:#fff}
    #fpEasyNav button:active{transform:scale(.96)}
    #fpQuickNav{position:fixed;right:18px;top:82px;z-index:8999;display:flex;gap:8px}
    #fpQuickNav button{border:0;border-radius:999px;padding:10px 14px;background:#55d98b;color:#04130b;font:800 12px system-ui,sans-serif;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.24)}
    #fpQuickNav button.secondary{background:#142941;color:#fff;border:1px solid #28415e}
    #fpNavMenu{position:fixed;right:18px;top:138px;width:230px;z-index:8998;display:none;background:#0d1b2e;border:1px solid #29415e;border-radius:14px;padding:8px;box-shadow:0 18px 45px rgba(0,0,0,.35)}
    #fpNavMenu.open{display:block}
    #fpNavMenu button{width:100%;text-align:left;border:0;border-radius:9px;background:transparent;color:#d8e4f1;padding:12px;font:700 13px system-ui,sans-serif;cursor:pointer}
    #fpNavMenu button:hover{background:#142941}
    body{padding-bottom:88px!important}
    @media(max-width:700px){
      #fpEasyNav{left:8px;right:8px;bottom:7px;transform:none;width:auto;justify-content:space-around;border-radius:16px;padding:5px 3px}
      #fpEasyNav button{height:56px}
      #fpQuickNav{left:10px;right:10px;top:auto;bottom:76px;justify-content:center}
      #fpQuickNav button{flex:1;max-width:170px;min-height:44px}
      #fpNavMenu{left:10px;right:10px;top:auto;bottom:140px;width:auto}
    }
  `;
  document.head.appendChild(style);

  function navigate(page) {
    if (page === "wallet" && !window.state?.user) {
      if (typeof window.go === "function") window.go("auth");
      closeMenu();
      return;
    }
    if (typeof window.go === "function") window.go(page);
    closeMenu();
  }

  function closeMenu() {
    const menu = document.getElementById("fpNavMenu");
    if (menu) menu.classList.remove("open");
  }

  function toggleMenu() {
    const menu = document.getElementById("fpNavMenu");
    if (menu) menu.classList.toggle("open");
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
      quick.innerHTML = '<button data-fp-quick="rooms">Join a Game</button><button class="secondary" data-fp-quick="wallet">My Wallet</button><button class="secondary" id="fpNavMenuToggle" type="button">More</button>';
      document.body.appendChild(quick);
    }

    let menu = document.getElementById("fpNavMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "fpNavMenu";
      menu.setAttribute("role", "menu");
      menu.innerHTML = `
        <button data-fp-menu="friendly">🤝 Friendly</button>
        <button data-fp-menu="rooms">🎮 All Games & Rooms</button>
        <button data-fp-menu="matches">⚽ Football Matches</button>
        <button data-fp-menu="leaderboard">🏆 Leaderboard</button>
        <button data-fp-menu="auth">👤 Account / Sign in</button>`;
      document.body.appendChild(menu);
    }
  }

  document.addEventListener("click", e => {
    const pageButton = e.target.closest("[data-fp-page]");
    const quickButton = e.target.closest("[data-fp-quick]");
    const menuButton = e.target.closest("[data-fp-menu]");
    if (pageButton) navigate(pageButton.dataset.fpPage);
    if (quickButton) navigate(quickButton.dataset.fpQuick);
    if (menuButton) navigate(menuButton.dataset.fpMenu);
    if (e.target.closest("#fpNavMenuToggle")) toggleMenu();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("#fpNavMenu") && !e.target.closest("#fpNavMenuToggle")) closeMenu();
  });

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