// theme-init.js
(function () {
  try {
    // 1) Prevent transitions during first paint
    document.documentElement.classList.add('no-anim');

    // 2) Decide theme before the page paints
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 3) Set the favicon immediately (before the parser reaches your <link id="favicon">)
    const makeIcon = (letter, dark) => {
      const bg = dark ? 'black' : 'white';
      const fg = dark ? 'white' : 'black';
      // Keep it simple and cache-friendly: an inline SVG data URL
      return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='68' font-size='64' text-anchor='middle' fill='${fg}' font-family='sans-serif'>${letter}</text></svg>`;
    };

    const path = (location.pathname || '/').toLowerCase();
    const pageLetter = path.includes('/cv')
      ? 'c'
      : path.includes('/malaphors')
      ? 'm'
      : 'a';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Create an early favicon that we can replace later if the page declares its own
    const earlyFav = document.createElement('link');
    earlyFav.id = 'favicon-early';
    earlyFav.rel = 'icon';
    earlyFav.type = 'image/svg+xml';
    earlyFav.href = makeIcon(pageLetter, isDark);
    document.head.appendChild(earlyFav);

    // If/when the real <link id="favicon"> from HTML appears, swap over cleanly
    const headObserver = new MutationObserver(() => {
      const realFav = document.getElementById('favicon');
      if (realFav) {
        realFav.setAttribute('type', 'image/svg+xml');
        realFav.setAttribute('href', makeIcon(pageLetter, document.documentElement.getAttribute('data-theme') === 'dark'));
        // Remove the temporary one to avoid duplicates
        earlyFav.remove();
        headObserver.disconnect();
      }
    });
    headObserver.observe(document.head, { childList: true });

    // Also react to theme changes very early (in case another script toggles the theme)
    const themeObserver = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      // Prefer the real favicon if it exists; otherwise keep the early one updated
      const favEl = document.getElementById('favicon') || document.getElementById('favicon-early');
      if (favEl) favEl.setAttribute('href', makeIcon(pageLetter, dark));
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 4) After the DOM is ready, allow transitions again
    const enableTransitions = () => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-anim');
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enableTransitions, { once: true });
    } else {
      enableTransitions();
    }
  } catch (e) {
    // Fail closed: remove the guard if anything goes wrong
    document.documentElement.classList.remove('no-anim');
  }
})();