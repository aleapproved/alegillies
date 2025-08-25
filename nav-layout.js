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

    const placed = []; // track { top, bottom } for collision
    const minSpacing = 48;

    // Safe vertical band = central 80% of viewport height
    const vMin = Math.floor(0.10 * vh);
    const vMax = Math.floor(0.90 * vh);

    links.forEach(link => {
      let side     = link.dataset.side;
      let xPercent = parseFloat(link.dataset.xPercent);
      let yPercent = parseFloat(link.dataset.yPercent);

      if (!side || isNaN(xPercent) || isNaN(yPercent)) {
        side     = Math.random() > 0.5 ? 'left' : 'right';
        xPercent = Math.random();
        yPercent = Math.random();
        link.dataset.side = side;
        link.dataset.xPercent = xPercent;
        link.dataset.yPercent = yPercent;
      }

      // Measure with fallback sizes
      const rect0 = link.getBoundingClientRect();
      const linkW = rect0.width  || 120;
      const linkH = rect0.height || 32;

      // ---- Vertical (central 80% of viewport) ----
      const yMin = Math.max(8, vMin);
      const yMax = Math.max(yMin, vMax - linkH); // prevent overflow
      let y = Math.round(yMin + yPercent * (yMax - yMin));

      // De-clash with simple wrap search inside [yMin, yMax]
      let tries = 0;
      function clashes(yVal) {
        const top = yVal;
        const bottom = yVal + linkH;
        return placed.some(p => !(bottom + minSpacing <= p.top || top >= p.bottom + minSpacing));
      }
      while (tries < 24 && clashes(y)) {
        y += minSpacing;
        if (y > yMax) y = yMin; // wrap within band
        tries++;
      }
      placed.push({ top: y, bottom: y + linkH });
      link.style.top = `${y}px`;

      // ---- Horizontal (central 80% of gutter) ----
      const gutter = side === 'left' ? gutterLeft : gutterRight;

      // If gutter is too small, pin to its center to avoid overflow
      if (gutter <= linkW + 16) {
        if (side === 'left') {
          link.style.left = `${Math.max(0, Math.floor((gutter - linkW) / 2))}px`;
          link.style.right = '';
        } else {
          link.style.right = `${Math.max(0, Math.floor((gutter - linkW) / 2))}px`;
          link.style.left = '';
        }
      } else {
        // central 80% of gutter, accounting for the element width
        const gInnerStart = Math.floor(0.10 * gutter);
        const gInnerEnd   = Math.floor(0.90 * gutter);
        const xMin = gInnerStart;
        const xMax = Math.max(xMin, gInnerEnd - linkW);
        const x    = Math.round(xMin + xPercent * (xMax - xMin));

        if (side === 'left') {
          link.style.left  = `${x}px`;
          link.style.right = '';
        } else {
          link.style.right = `${x}px`;
          link.style.left  = '';
        }
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