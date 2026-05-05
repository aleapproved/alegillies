// favicon.js — keeps the favicon in sync with the current theme.
// The SVG-generation logic lives in theme-init.js (window.__updateFavicon)
// so there is one source of truth.
(function () {
  function init() {
    window.__updateFavicon();
    window.addEventListener((window.Theme && window.Theme.EVT) || 'themechange', window.__updateFavicon);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
