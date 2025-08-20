// links.js
// Whimsical page links that float in the left/right gutters on desktop,
// switch to a swipeable chip rail on mobile, and avoid overlapping.

(function () {
  const el = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const favicon = document.getElementById('favicon');
  let rail = null;
  let railActive = false;

  /* ---------------- Favicon handling ---------------- */
  function makeIcon(letter, dark) {
    const bg = dark ? 'black' : 'white';
    const fg = dark ? 'white' : 'black';
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='68' font-size='64' text-anchor='middle' fill='${fg}' font-family='sans-serif'>${letter}</text></svg>`;
  }
  function getPageLetter() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (page === '' || page === 'index.html') return 'a';
    if (page.includes('cv')) return 'c';
    if (page.includes('malaphors')) return 'm';
    return 'a';
  }
  const pageLetter = getPageLetter();
  function updateFavicon() {
    const isDark = el.getAttribute('data-theme') === 'dark';
    if (favicon) favicon.setAttribute('href', makeIcon(pageLetter, isDark));
  }

  /* ---------------- Theme handling ---------------- */
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
  if (btn) {
    applyStoredTheme();
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

  /* ---------------- Link creation ---------------- */
  function createLinks() {
    if (!window.SITE_PAGES) return;
    const here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    window.SITE_PAGES.forEach(p => {
      // Skip the current internal page; include external links
      if (!p.slug.startsWith('http')) {
        if ((p.slug || '').toLowerCase() === here) return;
      }
      const a = document.createElement('a');
      a.href = p.slug;
      a.textContent = p.label;
      a.className = 'floatingLink';
      a.tabIndex = 0;
      if (p.slug.startsWith('http')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      // Seed unique, but stable-ish, randoms per label (so layout doesn't jump every resize)
      const seed = hashString(p.label + '|' + p.slug);
      a.dataset.side = (seed % 2 === 0) ? 'left' : 'right';
      a.dataset.xPercent = fract(Math.sin(seed) * 10000); // 0..1
      a.dataset.yPercent = 0.10 + 0.80 * fract(Math.cos(seed) * 10000); // 10..90%
      document.body.appendChild(a);
    });
  }

  /* ---------------- Helpers ---------------- */
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
    document.querySelectorAll('.floatingLink').forEach(a => {
      a.classList.add('chip');
      a.style.top = '';
      a.style.left = '';
      a.style.right = '';
      a.style.display = '';
      rail.appendChild(a);
      a.classList.add('ready');
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

  function rectsOverlap(a, b, padding = 6) {
    return !(
      a.right + padding <= b.left ||
      a.left  >= b.right + padding ||
      a.bottom + padding <= b.top ||
      a.top >= b.bottom + padding
    );
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // Simple, deterministic hash for seeding positions
  function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function fract(x) { return x - Math.floor(x); }

  /* ---------------- Position the links (with overlap avoidance) ---------------- */
  function positionLinks() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = getWrapRect();

    const gutterLeft  = Math.max(0, rect.left);
    const gutterRight = Math.max(0, vw - rect.right);
    const largestGutter = Math.max(gutterLeft, gutterRight);
    const links = Array.from(document.querySelectorAll('.floatingLink'));

    // Use rail on narrow viewports or when gutters are too small
    const useRail = (largestGutter < 48) || (vw < 720);
    if (useRail) {
      activateRail();
      return;
    }

    deactivateRail();

    // Prepare links for measurement
    links.forEach(l => {
      l.style.position = 'absolute';
      l.style.display = '';
      l.classList.add('ready');
      l.style.transform = ''; // ensure no transforms alter measurements
    });

    // We place links one side at a time for better collision handling
    const groups = {
      left: links.filter(l => (l.dataset.side || 'left') === 'left'),
      right: links.filter(l => (l.dataset.side || 'left') !== 'left')
    };

    placeGroup(groups.left, 'left', gutterLeft, vh);
    placeGroup(groups.right, 'right', gutterRight, vh);
  }

  function placeGroup(group, side, gutter, vh) {
    const occupied = [];
    const minTop = 0.08 * vh;                 // keep a little breathing room
    const maxTop = 0.92 * vh;                 // avoid extreme bottom overlap
    const step   = Math.max(12, Math.round(vh * 0.02)); // vertical nudge step

    // Sort by initial y so adjustments cascade nicely
    group.sort((a, b) => (+a.dataset.yPercent) - (+b.dataset.yPercent));

    for (const link of group) {
      let xPercent = parseFloat(link.dataset.xPercent);
      let yPercent = parseFloat(link.dataset.yPercent);
      if (!isFinite(xPercent)) xPercent = Math.random();
      if (!isFinite(yPercent)) yPercent = 0.1 + 0.8 * Math.random();

      // Base positions
      let y = clamp(yPercent * vh, minTop, maxTop);
      const linkWidth = link.getBoundingClientRect().width || 120;
      const usable = Math.max(0, gutter - linkWidth);
      let x = 0.10 * usable + xPercent * 0.80 * usable;

      // Apply side
      if (side === 'left') {
        link.style.left  = `${x}px`;
        link.style.right = '';
      } else {
        link.style.right = `${x}px`;
        link.style.left  = '';
      }
      link.style.top = `${y}px`;

      // Collision resolution (greedy vertical nudging, then slight horizontal jitter)
      let rect = link.getBoundingClientRect();
      let attempts = 0;
      const maxAttempts = 80; // enough to scan the column
      let dir = 1;

      while (occupied.some(r => rectsOverlap(r, rect)) && attempts < maxAttempts) {
        // Alternate nudging down/up by step
        y = clamp(y + dir * step, minTop, maxTop);
        link.style.top = `${y}px`;
        rect = link.getBoundingClientRect();
        dir = -dir;

        attempts++;
        // If we hit limits repeatedly, jitter x a bit within gutter
        if (attempts % 12 === 0 && usable > 8) {
          const jitter = (Math.random() - 0.5) * Math.min(24, usable * 0.15);
          if (side === 'left') {
            x = clamp(x + jitter, 0, usable);
            link.style.left = `${x}px`;
          } else {
            x = clamp(x + jitter, 0, usable);
            link.style.right = `${x}px`;
          }
          rect = link.getBoundingClientRect();
        }
      }

      // If still overlapping after all attempts, fade this one slightly to reduce visual clash
      if (occupied.some(r => rectsOverlap(r, rect))) {
        link.style.opacity = '0.7';
      } else {
        link.style.opacity = '';
        occupied.push(rect);
      }
    }
  }

  /* ---------------- Boot ---------------- */
  createLinks();
  window.addEventListener('resize', positionLinks, { passive: true });
  window.addEventListener('orientationchange', positionLinks, { passive: true });

  // Avoid thrashing: run after fonts/layout settle
  if (document.readyState === 'complete') {
    requestAnimationFrame(positionLinks);
  } else {
    window.addEventListener('load', () => requestAnimationFrame(positionLinks), { once: true });
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(positionLinks), { once: true });
  }
})();