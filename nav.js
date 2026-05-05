// nav.js
(function () {
  function normalizeCurrentSlug() {
    const raw = window.location.pathname || '/';
    const path = raw.replace(/\/+$/, '') || '/';
    if (path === '/' || path.toLowerCase() === '/index.html') return '/';
    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1]?.toLowerCase();
    if (last === 'index.html') {
      const parent = parts.slice(0, -1).join('/');
      return parent ? `/${parent}/` : '/';
    }
    return `/${parts.join('/')}/`;
  }

  function build() {
    const pages = window.SITE_PAGES;
    if (!Array.isArray(pages)) return false;

    const here = normalizeCurrentSlug();

    // Fisher–Yates shuffle a copy so each page load gets a fresh order.
    // (Don't mutate window.SITE_PAGES — other listeners may read it.)
    const shuffled = pages.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    shuffled.forEach(p => {
      const slug = p.slug || '';
      const isExternal = slug.startsWith('http');
      const isCurrent = !isExternal && slug === here;
      if (isCurrent) return;

      const a = document.createElement('a');
      a.href = slug;
      a.textContent = p.label;
      a.className = 'floatingLink';
      a.tabIndex = 0;
      if (isExternal) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      document.body.appendChild(a);
    });
    return true;
  }

  function init() {
    build();
    window.dispatchEvent(new CustomEvent('nav:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();