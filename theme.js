// theme.js
(function () {
  const ROOT = document.documentElement;
  const EVT = 'themechange';

  function getTheme() {
    return ROOT.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTheme(next) {
    const value = next === 'dark' ? 'dark' : 'light';
    if (value === 'dark') {
      ROOT.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      ROOT.removeAttribute('data-theme');
      localStorage.removeItem('theme');
    }

    // Reflect on the toggle if present
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-pressed', value === 'dark' ? 'true' : 'false');

    // Notify listeners
    window.dispatchEvent(new CustomEvent(EVT, { detail: { theme: value } }));
  }

  // Expose small API
  window.Theme = { getTheme, setTheme, EVT };

  // Wire up the toggle button if present
  function initToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
    // Ensure correct aria-pressed on load
    btn.setAttribute('aria-pressed', getTheme() === 'dark' ? 'true' : 'false');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggle, { once: true });
  } else {
    initToggle();
  }
})();