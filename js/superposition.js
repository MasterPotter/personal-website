/* ============================================================
   superposition.js, "measure me", site-wide
   A magnifying glass follows your cursor on EVERY page. Hidden
   in the background dot grid are a few of the things Zoeb spends
   his time on, each sitting in superposition (a flickering ψ).
   Pass the glass over one and it collapses into a real icon.
   The lens is pointer-events:none (never blocks the page) and
   fades out when the cursor goes idle. Inline-SVG icons, no emoji.
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

  var REVEAL_R = 72;

  // background layer (sits above the dot-grid canvas, behind page content)
  var layer = document.createElement('div');
  layer.className = 'sp-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  // the magnifying glass, on top of everything, but never blocks clicks
  var lens = document.createElement('div');
  lens.className = 'sp-lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<span class="sp-glass"></span><span class="sp-handle"></span>';
  document.body.appendChild(lens);

  var marks = [];
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function scatter() {
    layer.innerHTML = ''; marks = [];
    var w = window.innerWidth, h = window.innerHeight;
    var n = Math.max(7, Math.min(11, Math.round(w / 180)));
    var placed = [];
    for (var i = 0; i < n; i++) {
      var s = STATES[Math.floor(Math.random() * STATES.length)];  /* uniformly random, you can get two of the same */
      var x, y, t = 0, ok;
      do {
        x = 56 + Math.random() * (w - 112);
        y = 130 + Math.random() * (h - 200);
        t++; ok = true;
        for (var p = 0; p < placed.length; p++) { if (dist(placed[p].x, placed[p].y, x, y) < 170) { ok = false; break; } }
      } while (!ok && t < 60);
      placed.push({ x: x, y: y });
      var el = document.createElement('div');
      el.className = 'sp-mark';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.innerHTML = '<span class="sp-ghost">&#968;</span><span class="sp-icon">' + s.svg + '</span><span class="sp-label">' + s.label + '</span>';
      layer.appendChild(el);
      marks.push({ el: el, x: x, y: y, measured: false });
    }
  }

  var idleT;
  function onMove(e) {
    var x = e.clientX, y = e.clientY;
    lens.style.left = x + 'px';
    lens.style.top = y + 'px';
    lens.classList.add('show');
    clearTimeout(idleT);
    idleT = setTimeout(function () { lens.classList.remove('show'); }, 1500);
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i]; if (m.measured) continue;
      var d = dist(m.x, m.y, x, y);
      if (d < REVEAL_R) { m.measured = true; m.el.classList.add('measured'); }
      else m.el.classList.toggle('near', d < REVEAL_R + 44);
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });

  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(scatter, 220); }, { passive: true });

  scatter();
})();
