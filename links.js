// links.js
(function () {
  const el = document.documentElement;
  const btn = document.getElementById('themeToggle');
  let rail = null;
  let railActive = false;

  // ---------- Favicon handling ----------
  function makeIcon(letter, dark) {
    const bg = dark ? 'black' : 'white';
    const fg = dark ? 'white' : 'black';
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='68' font-size='64' text-anchor='middle' fill='${fg}' font-family='sans-serif'>${letter}</text></svg>`;
  }
  function getPageLetter() {
    const path = (window.location.pathname || '/').toLowerCase();
    if (path.includes('/cv')) return 'c';
    if (path.includes('/malaphors')) return 'm';
    if (path.includes('/game')) return 'g';
    return 'a'; // home / other
  }
  const pageLetter = getPageLetter();
  function updateFavicon() {
    const isDark = el.getAttribute('data-theme') === 'dark';
    const link = document.getElementById('favicon');
    if (link) link.setAttribute('href', makeIcon(pageLetter, isDark));
  }

  // ---------- Theme handling ----------
  function setPressed() {
    const isDark = el.getAttribute('data-theme') === 'dark';
    if (btn) btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
  function applyStoredTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      el.setAttribute('data-theme', 'dark');
    } else {
      el.removeAttribute('data-theme');
    }
    setPressed();
    updateFavicon();
  }

  // Always apply once, even if there’s no toggle on this page
  applyStoredTheme();

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = el.getAttribute('data-theme') === 'dark';
      if (isDark) {
        el.removeAttribute('data-theme');
        localStorage.removeItem('theme');
      } else {
        el.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      setPressed();
      updateFavicon();
    });
  }

  // ---------- Link creation ----------
  function normalizeCurrentSlug() {
    // Normalise the current path to '/', '/malaphors/', '/cv/', etc.
    const raw = window.location.pathname || '/';
    const path = raw.replace(/\/+$/, '') || '/'; // strip trailing slash; fallback to '/'

    // Home, whether served as '/' or '/index.html'
    if (path === '/' || path.toLowerCase() === '/index.html') return '/';

    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1]?.toLowerCase();

    // e.g. /malaphors/index.html -> '/malaphors/'
    if (last === 'index.html') {
      const parent = parts.slice(0, -1).join('/');
      return parent ? `/${parent}/` : '/';
    }

    // e.g. /malaphors -> '/malaphors/'
    return `/${parts.join('/')}/`;
  }

  function createLinks() {
    if (!window.SITE_PAGES) return;

    const here = normalizeCurrentSlug();

    window.SITE_PAGES.forEach(p => {
      // Skip the current internal page; always include external links
      if (!p.slug.startsWith('http')) {
        if ((p.slug || '') === here) return;
      }

      const a = document.createElement('a');
      a.href = p.slug; // absolute paths for internal links
      a.textContent = p.label;
      a.className = 'floatingLink';
      a.tabIndex = 0;

      if (p.slug.startsWith('http')) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      document.body.appendChild(a);
    });
  }

  // ---------- Helpers for layouts ----------
  function getWrapRect() {
    const wrap = document.querySelector('.wrap');
    if (!wrap) {
      const w = Math.min(800, window.innerWidth);
      const left = (window.innerWidth - w) / 2;
      return { left, right: left + w, width: w };
    }
    return wrap.getBoundingClientRect();
  }

  function ensureRail() {
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'linkRail';
      rail.setAttribute('aria-label', 'site links');
      document.body.appendChild(rail);
    }
    return rail;
  }

  function activateRail() {
    if (railActive) return;
    ensureRail();
    const links = Array.from(document.querySelectorAll('.floatingLink'));

    // Shuffle the links randomly for the mobile rail
    for (let i = links.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [links[i], links[j]] = [links[j], links[i]];
    }

    links.forEach(a => {
      a.classList.add('chip');
      a.style.top = '';
      a.style.left = '';
      a.style.right = '';
      rail.appendChild(a);
      a.classList.add('ready');
      a.style.display = '';
    });
    document.body.classList.add('rail-active');
    railActive = true;
  }

  function deactivateRail() {
    if (!railActive) return;
    document.querySelectorAll('#linkRail .floatingLink').forEach(a => {
      a.classList.remove('chip');
      document.body.appendChild(a);
    });
    if (rail) {
      rail.remove();
      rail = null;
    }
    document.body.classList.remove('rail-active');
    railActive = false;
  }

  // ---------- Position the links (desktop wandering layout) ----------
  function positionLinks() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = getWrapRect();

    const gutterLeft  = Math.max(0, rect.left);
    const gutterRight = Math.max(0, vw - rect.right);
    const largestGutter = Math.max(gutterLeft, gutterRight);

    const links = document.querySelectorAll('.floatingLink');

    const useRail = (largestGutter < 48) || (vw < 720);
    if (useRail) {
      activateRail();
      return;
    }

    deactivateRail();

    // Keep a sensible minimum vertical spacing so links don’t stack too close
    const minSpacing = 48;
    const placedYs = [];

    links.forEach(link => {
      let side     = link.dataset.side;
      let xPercent = parseFloat(link.dataset.xPercent);
      let yPercent = parseFloat(link.dataset.yPercent);

      if (!side || isNaN(xPercent) || isNaN(yPercent)) {
        side     = Math.random() > 0.5 ? 'left' : 'right';
        xPercent = Math.random();
        yPercent = 0.10 + Math.random() * 0.80;
        link.dataset.side = side;
        link.dataset.xPercent = xPercent;
        link.dataset.yPercent = yPercent;
      }

      const maxY = vh - 16;
      let y = Math.min(maxY, Math.max(8, yPercent * vh));
      let tries = 0;

      while (tries < 20) {
        const clash = placedYs.some(otherY => Math.abs(y - otherY) < minSpacing);
        if (!clash) break;
        y += minSpacing;
        if (y > maxY) y = 8;
        tries++;
      }
      placedYs.push(y);
      link.style.top = `${y}px`;

      const linkWidth = link.getBoundingClientRect().width || 120;
      const gutter = side === 'left' ? gutterLeft : gutterRight;
      const usable = Math.max(0, gutter - linkWidth);

      const x = 0.10 * usable + xPercent * 0.80 * usable;

      if (side === 'left') {
        link.style.left  = `${x}px`;
        link.style.right = '';
      } else {
        link.style.right = `${x}px`;
        link.style.left  = '';
      }

      link.classList.add('ready');
      link.style.display = '';
    });
  }

  createLinks();

  // Debounce resize with rAF
  let resizeRAF;
  window.addEventListener('resize', () => {
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(positionLinks);
  });
  window.addEventListener('orientationchange', positionLinks);

  // Re-position once fonts are ready (widths can change)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionLinks);
  }

  // Extra safety on slow connections
  window.addEventListener('load', positionLinks);

  positionLinks();
})();