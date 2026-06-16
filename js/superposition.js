/* ============================================================
   superposition.js, "measure me", site-wide
   A magnifying glass follows your cursor on every page. Hidden
   in the empty parts of the background are a few of the things
   Zoeb spends his time on, each sitting in superposition (a
   flickering ψ). Pass the glass over one and it collapses into a
   real icon, which then fades back out after a few seconds.

   The states are placed in document space, only in spots that
   don't overlap text or cards, so they never sit behind copy.
   The lens is pointer-events:none (never blocks the page).
   Inline-SVG icons, no emoji.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body) return;

  var STATES = [
    { label: 'Quantum optics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 12c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 17c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M18 5l3-3M18 12h4M18 19l3 3"/></svg>' },
    { label: 'Robotics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="8" width="15" height="11" rx="2.5"/><path d="M12 4.4V8"/><circle cx="12" cy="3.2" r="1.3"/><circle cx="9.3" cy="13" r="1.25"/><circle cx="14.7" cy="13" r="1.25"/><path d="M9.5 16.6h5"/><path d="M2.5 12v3M21.5 12v3"/></svg>' },
    { label: 'Quantum theory', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 16l-1.6 4M16 16l1.6 4"/><text x="12" y="12.6" font-size="8" font-family="Georgia, serif" fill="currentColor" stroke="none" text-anchor="middle">&#968;</text></svg>' },
    { label: 'Cooking', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h13a6.5 6.5 0 0 1-13 0Z"/><path d="M16 12h5"/><path d="M7 5.5c0 1 1 1.2 1 2.2M11 4.8c0 1 1 1.2 1 2.2"/></svg>' },
    { label: 'Viola', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.8c-2.1.3-3.6-1.4-3-3.4.2-.7-.1-1.4-.6-1.9-1.2-1.2-.8-3.2.8-3.7.7-.2 1.2-.8 1.2-1.6 0-2 1.7-3.4 3.6-2.8"/><path d="M12.5 7.4c1.9-.6 3.6.8 3.6 2.8 0 .8.5 1.4 1.2 1.6 1.6.5 2 2.5.8 3.7-.5.5-.8 1.2-.6 1.9.6 2-.9 3.7-3 3.4"/><path d="M9.4 13.2v2.1M13.6 12.8v2.1"/><path d="M11.7 7.5 17 2.4"/><path d="M15.9 1.6c1 .2 1.6 1.1 1.3 2"/><path d="M2.8 7.8 19 19.2"/><path d="M2.8 7.8l.4-1.7 1.6-.4M19 19.2l-.4 1.7-1.6.4"/></svg>' },
    { label: 'Model UN', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="11" y="3.6" width="8.2" height="4.6" rx="1.4" transform="rotate(45 15.1 5.9)"/><path d="M12.6 9.4 6.6 15.4"/><path d="M4.4 19.6h8.4"/></svg>' }
  ];

  var REVEAL_R = 72;     // how close the lens must get to reveal
  var SHOW_MS  = 3200;   // how long a revealed icon stays before fading
  var HALF     = 42;     // half-footprint of a mark, for spacing/clearance

  var OBSTACLES = 'p,h1,h2,h3,h4,h5,h6,a,button,img,li,.card,.work-item,.range-item,' +
    '.award-item,.quick-facts,.pub-item,.blog-post,.meta-pill,.work-tag,.stat,.mbox,' +
    '#site-nav,#site-footer,.headshot,.section-label,.section-title,.section-sub,' +
    '.timeline-content,.q-tool,.contact-link,.nav-logo,.btn';

  var layer = document.createElement('div');
  layer.className = 'sp-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  var lens = document.createElement('div');
  lens.className = 'sp-lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<span class="sp-glass"></span><span class="sp-handle"></span>';
  document.body.appendChild(lens);

  var marks = [];
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function obstacleRects() {
    var sx = window.scrollX || window.pageXOffset;
    var sy = window.scrollY || window.pageYOffset;
    var pad = 16, out = [];
    var els = document.querySelectorAll(OBSTACLES);
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out.push({ l: r.left + sx - pad, t: r.top + sy - pad, r: r.right + sx + pad, b: r.bottom + sy + pad });
    }
    return out;
  }

  function blocked(x, y, rects) {
    for (var i = 0; i < rects.length; i++) {
      var o = rects[i];
      if (x + HALF > o.l && x - HALF < o.r && y + HALF > o.t && y - HALF < o.b) return true;
    }
    return false;
  }

  function scatter() {
    for (var k = 0; k < marks.length; k++) { if (marks[k].timer) clearTimeout(marks[k].timer); marks[k].el.remove(); }
    marks = [];
    var rects = obstacleRects();
    var W = window.innerWidth;
    var docH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    layer.style.height = docH + 'px';
    var n = Math.max(6, Math.min(10, Math.round(W / 200)));
    var placed = [];
    for (var i = 0; i < n; i++) {
      var x, y, t = 0, ok = false;
      while (t < 200 && !ok) {
        t++;
        x = 60 + Math.random() * (W - 120);
        y = 110 + Math.random() * (docH - 230);
        if (blocked(x, y, rects)) continue;
        ok = true;
        for (var p = 0; p < placed.length; p++) { if (dist(placed[p].x, placed[p].y, x, y) < 150) { ok = false; break; } }
      }
      if (!ok) continue;
      placed.push({ x: x, y: y });

      var el = document.createElement('div');
      el.className = 'sp-mark';
      el.style.left = x + 'px'; el.style.top = y + 'px';

      // Setup the base DOM structure with empty wrappers for icon and label
      el.innerHTML = '<span class="sp-ghost">&#968;</span><span class="sp-icon"></span><span class="sp-label"></span>';
      layer.appendChild(el);

      // Store references to the inner elements so we can swap their content on the fly
      marks.push({
        el: el,
        iconEl: el.querySelector('.sp-icon'),
        labelEl: el.querySelector('.sp-label'),
        x: x,
        y: y,
        shown: false,
        cool: false,
        timer: null
      });
    }
  }

  function hide(m) {
    m.shown = false; m.cool = true;
    m.el.classList.remove('measured');
  }

  var idleT;
  function onMove(e) {
    var cx = e.clientX, cy = e.clientY;
    lens.style.left = cx + 'px';
    lens.style.top = cy + 'px';
    lens.classList.add('show');
    clearTimeout(idleT);
    idleT = setTimeout(function () { lens.classList.remove('show'); }, 1500);

    var dx = (window.scrollX || window.pageXOffset), dy = (window.scrollY || window.pageYOffset);
    var px = cx + dx, py = cy + dy;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var d = dist(m.x, m.y, px, py);
      if (d < REVEAL_R) {
        if (!m.shown && !m.cool) {
          m.shown = true;

          // ============================================================
          // NEW: Select a new random state right at the moment of collapse
          // ============================================================
          var s = STATES[Math.floor(Math.random() * STATES.length)];
          m.iconEl.innerHTML = s.svg;
          m.labelEl.textContent = s.label;
          // ============================================================

          m.el.classList.add('measured');
          if (m.timer) clearTimeout(m.timer);
          m.timer = (function (mk) { return setTimeout(function () { hide(mk); }, SHOW_MS); })(m);
        }
      } else {
        m.cool = false;
        if (!m.shown) m.el.classList.toggle('near', d < REVEAL_R + 40);
      }
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });

  var rT;
  function reflow() { clearTimeout(rT); rT = setTimeout(scatter, 220); }
  window.addEventListener('resize', reflow, { passive: true });
  window.addEventListener('load', reflow);

  scatter();
})();