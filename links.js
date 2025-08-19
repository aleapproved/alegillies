// links.js
(function(){
  const el = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const favicon = document.getElementById('favicon');

  // ---------- Favicon handling ----------
  // helper: build svg data uri for a given letter
  function makeIcon(letter, dark) {
    const bg = dark ? 'black' : 'white';
    const fg = dark ? 'white' : 'black';
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='68' font-size='64' text-anchor='middle' fill='${fg}' font-family='sans-serif'>${letter}</text></svg>`;
  }

  // decide which letter to use based on page
  function getPageLetter() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (page === '' || page === 'index.html') return 'a'; // home page fixed to 'a'
    if (page.includes('cv')) return 'c';
    if (page.includes('malaphors')) return 'm';
    return 'a'; // fallback
  }

  const pageLetter = getPageLetter();

  function updateFavicon(){
    const isDark = el.getAttribute('data-theme') === 'dark';
    if (favicon) favicon.setAttribute('href', makeIcon(pageLetter, isDark));
  }

  // ---------- Theme handling ----------
  function setPressed(){
    const isDark = el.getAttribute('data-theme') === 'dark';
    if (btn) btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
  function applyStoredTheme(){
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      el.setAttribute('data-theme','dark');
    } else {
      el.removeAttribute('data-theme');
    }
    setPressed();
    updateFavicon();
  }
  if (btn){
    applyStoredTheme();
    btn.addEventListener('click', () => {
      const isDark = el.getAttribute('data-theme') === 'dark';
      if (isDark){
        el.removeAttribute('data-theme');
        localStorage.removeItem('theme');
      } else {
        el.setAttribute('data-theme','dark');
        localStorage.setItem('theme','dark');
      }
      setPressed();
      updateFavicon();
    });
  }

  // ---------- Wandering links ----------
  function createLinks(){
    if (!window.SITE_PAGES) return;
    const here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    window.SITE_PAGES.forEach(p => {
      // Always include external links (http/https)
      if (!p.slug.startsWith('http')) {
        // For internal pages, skip if it's the current page
        if ((p.slug || '').toLowerCase() === here) return;
      }

      const a = document.createElement('a');
      a.href = p.slug;
      a.textContent = p.label;
      a.className = 'floatingLink';

      // Open external links in new tab safely
      if (p.slug.startsWith('http')) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      document.body.appendChild(a);
    });
  }

  function getWrapWidth(){
    const wrap = document.querySelector('.wrap');
    if (!wrap) return Math.min(800, window.innerWidth);
    return wrap.getBoundingClientRect().width;
  }

  function positionLinks(){
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wrapW = getWrapWidth();
    let gutter = (vw - wrapW) / 2;

    const links = document.querySelectorAll('.floatingLink');

    if (gutter <= 0){
      links.forEach(link => {
        link.style.display = 'none';
        link.classList.remove('ready');
      });
      return;
    } else {
      links.forEach(link => { link.style.display = ''; });
    }

    links.forEach(link => {
      let side     = link.dataset.side;
      let xPercent = parseFloat(link.dataset.xPercent);
      let yPercent = parseFloat(link.dataset.yPercent);

      if (!side || isNaN(xPercent) || isNaN(yPercent)){
        side     = Math.random() > 0.5 ? 'left' : 'right';
        xPercent = Math.random(); // raw 0–1, remapped later
        yPercent = 0.1 + Math.random() * 0.8; // 10–90% vertical
        link.dataset.side = side;
        link.dataset.xPercent = xPercent;
        link.dataset.yPercent = yPercent;
      }

      const y = yPercent * vh;
      link.style.top = `${y}px`;

      // measure link width
      const linkWidth = link.getBoundingClientRect().width;
      const usableWidth = gutter - linkWidth;

      // place within 10–90% of usable width
      const x = 0.1 * usableWidth + xPercent * 0.8 * usableWidth;

      if (side === 'left'){
        link.style.left  = `${x}px`;
        link.style.right = '';
      } else {
        link.style.right = `${x}px`;
        link.style.left  = '';
      }

      link.classList.add('ready');
    });
  }

  createLinks();
  window.addEventListener('resize', positionLinks);
  positionLinks();
})();