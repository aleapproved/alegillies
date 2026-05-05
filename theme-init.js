(function () {
  // Single source of truth for the favicon SVG. Used here for the initial
  // pre-paint set, and again from favicon.js on load and theme changes.
  window.__updateFavicon = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tag = (document.body && document.body.getAttribute('data-page')) || '';
    const path = (location.pathname || '').toLowerCase();
    const id = tag.toLowerCase() || path;
    const letter = id.includes('cv') ? 'c'
                  : id.includes('malaphors') ? 'm'
                  : id.includes('game') ? 'g'
                  : id.includes('contact') ? '@'
                  : 'a';
    const bg = isDark ? 'black' : 'white';
    const fg = isDark ? 'white' : 'black';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="68" font-size="64" text-anchor="middle" fill="${fg}" font-family="sans-serif">${letter}</text></svg>`;
    const href = 'data:image/svg+xml,' + encodeURIComponent(svg);

    let link = document.getElementById('favicon');
    if (!link) {
      link = document.createElement('link');
      link.id = 'favicon';
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  };

  try {
    // Prevent any transitions during first paint
    document.documentElement.classList.add('no-anim');

    // Decide theme before the page paints
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Set an initial favicon before paint to avoid grey globe
    window.__updateFavicon();

    // After the DOM is ready, allow transitions again
    const enableTransitions = () => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-anim');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const btn = document.getElementById('themeToggle');
        if (btn) {
          btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
          const icon = btn.querySelector('.theme-toggle__icon');
          if (icon) icon.textContent = isDark ? '🌕' : '☀️';
        }
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enableTransitions);
    } else {
      enableTransitions();
    }
  } catch (e) {
    // Fail closed: remove the guard if anything goes wrong
    document.documentElement.classList.remove('no-anim');
  }
})();
