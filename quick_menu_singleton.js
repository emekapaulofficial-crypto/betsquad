(() => {
  'use strict';
  const isQuick = el => {
    if (!el || el.id === 'quickMenuSingletonGuard') return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
    return text.includes('quick menu') || aria.includes('quick menu') || cls.includes('quick-menu') || cls.includes('quickmenu');
  };
  function clean() {
    const candidates = [...document.body.querySelectorAll('body *')].filter(isQuick);
    const top = [];
    for (const el of candidates) {
      if (top.some(parent => parent.contains(el))) continue;
      if (el.children.length === 0 && !/quick menu/i.test(el.textContent || '')) continue;
      top.push(el);
    }
    // Keep one real Quick Menu container and hide every duplicate launcher/container.
    const visible = top.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (visible.length <= 1) return;
    // Prefer the larger actual menu; if there is no large menu, keep the first launcher.
    const keep = visible.find(el => el.getBoundingClientRect().width > 180 && el.getBoundingClientRect().height > 80) || visible[0];
    visible.forEach(el => {
      if (el !== keep) {
        el.dataset.quickMenuDuplicate = '1';
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }
  const run = () => requestAnimationFrame(clean);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  new MutationObserver(run).observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener('resize', run);
})();
