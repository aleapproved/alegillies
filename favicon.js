// favicon.js
(function () {
  function pageLetter() {
    const bodyAttr = document.body && document.body.getAttribute('data-page');
    const id = (bodyAttr || '').toLowerCase() || (location.pathname || '/').toLowerCase();
    if (id.includes('cv') || id.includes('/cv')) return 'c';
    if (id.includes('malaphors') || id.includes('/malaphors')) return 'm';
    if (id.includes('game') || id.includes('/game')) return 'g';
    if (id.includes('contact') || id.includes('/contact')) return '@';
    return 'a';
  }

  function makeIcon(letter, isDark) {
    const bg = isDark ? 'black' : 'white';
    const fg = isDark ? 'white' : 'black';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="68" font-size="64" text-anchor="middle" fill="${fg}" font-family="sans-serif">${letter}</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function ensureLink() {
    let link = document.getElementById('favicon');
    if (!link) {
      link = document.createElement('link');
      link.id = 'favicon';
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    return link;
  }

  function updateFavicon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ensureLink().setAttribute('href', makeIcon(pageLetter(), isDark));
  }

  // Initial set and on theme changes
  function init() {
    updateFavicon();
    window.addEventListener((window.Theme && window.Theme.EVT) || 'themechange', updateFavicon);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();