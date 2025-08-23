// nav-layout.js
(function () {
  let rail = null;
  let railActive = false;

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
    const links = Array.from(document.querySelectorAll('.floatingLink'));
    if (links.length === 0) { deactivateRail(); return; }

    ensureRail();
    // Shuffle for variety
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
    if (rail) { rail.remove(); rail = null; }
    document.body.classList.remove('rail-active');
    railActive = false;
  }

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
      if (links.length > 0) activateRail(); else deactivateRail();
      return;
    }

    deactivateRail();

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

  // Reposition on:
  window.addEventListener('resize', () => requestAnimationFrame(positionLinks));
  window.addEventListener('orientationchange', positionLinks);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionLinks);
  }
  window.addEventListener('load', positionLinks);
  window.addEventListener('nav:ready', positionLinks);
})();