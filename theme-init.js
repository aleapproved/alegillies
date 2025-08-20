(function () {
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

    // After the DOM is ready, allow transitions again
    const enableTransitions = () => {
      // next frame avoids reflow flashes
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-anim');
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