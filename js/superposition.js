/* ============================================================
   superposition.js — "measure me"
   A field of dots, with a few of Zoeb's interests hidden in it,
   each in superposition (a flickering ψ). The magnifying glass
   maps to your cursor and works anywhere on the grid — move it
   over a hidden state and it collapses into a real icon.
   Inline-SVG icons, no emoji.
   ============================================================ */
(function () {
  'use strict';
  var field = document.getElementById('qfield');
  if (!field) return;

  var STATES = [
    { label: 'Quantum optics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2 7c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 12c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 17c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M18 5l3-3M18 12h4M18 19l3 3"/></svg>' },
    { label: 'Robotics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4.5" y="8" width="15" height="11" rx="2.5"/><path d="M12 4.4V8"/><circle cx="12" cy="3.2" r="1.3"/><circle cx="9.3" cy="13" r="1.25"/><circle cx="14.7" cy="13" r="1.25"/><path d="M9.5 16.6h5"/><path d="M2.5 12v3M21.5 12v3"/></svg>' },
    { label: 'Quantum theory', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 16l-1.6 4M16 16l1.6 4"/>' +
      '<text x="12" y="12.6" font-size="8" font-family="Georgia, serif" fill="currentColor" stroke="none" text-anchor="middle">&#968;</text></svg>' },
    { label: 'Cooking', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12h13a6.5 6.5 0 0 1-13 0Z"/><path d="M16 12h5"/><path d="M7 5.5c0 1 1 1.2 1 2.2M11 4.8c0 1 1 1.2 1 2.2"/></svg>' },
    { label: 'Viola', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="9" cy="16" rx="5" ry="6"/><path d="M11.4 11.2 18.5 4"/><path d="M17 2.6 20.4 6"/><path d="M7.6 15v2.2M10.4 15v2.2"/></svg>' },
    { label: 'Model UN', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="11" y="3.6" width="8.2" height="4.6" rx="1.4" transform="rotate(45 15.1 5.9)"/><path d="M12.6 9.4 6.6 15.4"/><path d="M4.4 19.6h8.4"/></svg>' }
  ];

  var REVEAL_R = 58;
  var count = 0;
  var marks = [];

  var lens = document.createElement('div');
  lens.className = 'qlens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<span class="qlens-glass"></span><span class="qlens-handle"></span>';
  field.appendChild(lens);

  var countEl = document.getElementById('qfield-count');
  function updateCount() { if (countEl) countEl.textContent = count + ' / ' + STATES.length + ' measured'; }

  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function layout() {
    for (var m = 0; m < marks.length; m++) marks[m].el.remove();
    marks = [];
    count = 0; updateCount();
    var w = field.clientWidth, h = field.clientHeight, pad = 72;
    var placed = [];
    for (var i = 0; i < STATES.length; i++) {
      var x, y, tries = 0;
      do {
        x = pad + Math.random() * (w - 2 * pad);
        y = pad + Math.random() * (h - 2 * pad);
        tries++;
        var ok = true;
        for (var p = 0; p < placed.length; p++) { if (dist(placed[p].x, placed[p].y, x, y) < 130) { ok = false; break; } }
      } while (!ok && tries < 60);
      placed.push({ x: x, y: y });
      var el = document.createElement('div');
      el.className = 'qmark';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.innerHTML = '<span class="qmark-ghost">&#968;</span><span class="qmark-icon">' + STATES[i].svg + '</span><span class="qmark-label">' + STATES[i].label + '</span>';
      field.appendChild(el);
      marks.push({ el: el, x: x, y: y, measured: false });
    }
  }

  function scan(mx, my) {
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.measured) continue;
      var d = dist(m.x, m.y, mx, my);
      if (d < REVEAL_R) { m.measured = true; m.el.classList.add('measured'); count++; updateCount(); }
      else m.el.classList.toggle('near', d < REVEAL_R + 36);
    }
  }

  function onMove(e) {
    var r = field.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.style.opacity = '0'; return; }
    lens.style.opacity = '1';
    lens.style.left = x + 'px';
    lens.style.top = y + 'px';
    scan(x, y);
  }

  field.addEventListener('pointermove', onMove);
  field.addEventListener('pointerdown', onMove);
  field.addEventListener('pointerenter', onMove);
  field.addEventListener('pointerleave', function () {
    lens.style.opacity = '0';
    for (var i = 0; i < marks.length; i++) marks[i].el.classList.remove('near');
  });

  var rb = document.getElementById('qfield-reset');
  if (rb) rb.addEventListener('click', layout);

  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(layout, 160); });

  layout();
})();
