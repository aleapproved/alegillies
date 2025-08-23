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

    pages.forEach(p => {
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
    if (build()) {
      // Let layout decide where they live
      window.dispatchEvent(new CustomEvent('nav:ready'));
    } else {
      // Retry once when pages arrive
      window.addEventListener('pages:ready', () => { build(); window.dispatchEvent(new CustomEvent('nav:ready')); }, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();