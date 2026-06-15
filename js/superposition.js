/* ============================================================
   superposition.js — "measure me"
   Each tile is a superposition of everything Zoeb is. Drag the
   magnifying glass over a tile (or click it) to "measure" it —
   the superposition collapses to one definite answer.
   Icons are inline SVG (no emoji, themeable via currentColor).
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('superpos');
  if (!root) return;

  var STATES = [
    { key: 'optics', label: 'Quantum optics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2 7c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 12c2-3.5 5-3.5 7 0s5 3.5 7 0"/><path d="M2 17c2-3.5 5-3.5 7 0s5 3.5 7 0"/>' +
      '<path d="M18 5l3-3M18 12h4M18 19l3 3"/></svg>' },
    { key: 'robot', label: 'Robotics', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4.5" y="8" width="15" height="11" rx="2.5"/><path d="M12 4.4V8"/><circle cx="12" cy="3.2" r="1.3"/>' +
      '<circle cx="9.3" cy="13" r="1.25"/><circle cx="14.7" cy="13" r="1.25"/><path d="M9.5 16.6h5"/><path d="M2.5 12v3M21.5 12v3"/></svg>' },
    { key: 'theory', label: 'Quantum theory', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 16l-1.6 4M16 16l1.6 4"/>' +
      '<text x="12" y="12.6" font-size="8" font-family="Georgia, serif" fill="currentColor" stroke="none" text-anchor="middle">&#968;</text></svg>' },
    { key: 'cook', label: 'Cooking', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12h13a6.5 6.5 0 0 1-13 0Z"/><path d="M16 12h5"/><path d="M7 5.5c0 1 1 1.2 1 2.2M11 4.8c0 1 1 1.2 1 2.2"/></svg>' },
    { key: 'viola', label: 'Viola', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="9" cy="16" rx="5" ry="6"/><path d="M11.4 11.2 18.5 4"/><path d="M17 2.6 20.4 6"/>' +
      '<path d="M7.6 15v2.2M10.4 15v2.2"/></svg>' },
    { key: 'mun', label: 'Model UN', svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="11" y="3.6" width="8.2" height="4.6" rx="1.4" transform="rotate(45 15.1 5.9)"/>' +
      '<path d="M12.6 9.4 6.6 15.4"/><path d="M4.4 19.6h8.4"/></svg>' }
  ];

  var N = 6;
  var nodes = [];

  for (var i = 0; i < N; i++) {
    var b = document.createElement('button');
    b.className = 'qubit';
    b.type = 'button';
    b.setAttribute('aria-label', 'Unmeasured — measure to reveal');
    var stack = '';
    for (var j = 0; j < STATES.length; j++) {
      stack += '<span class="q-icon" data-k="' + STATES[j].key + '" style="animation-delay:' + (-j * 0.5) + 's">' + STATES[j].svg + '</span>';
    }
    b.innerHTML = '<span class="q-psi">&#968;</span><span class="q-stack">' + stack + '</span><span class="q-label"></span>';
    root.appendChild(b);
    nodes.push(b);
    b.addEventListener('click', function () { measure(this); });
  }

  // magnifying glass
  var lens = document.createElement('div');
  lens.className = 'lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<span class="lens-glass"></span><span class="lens-handle"></span>';
  root.appendChild(lens);

  function measure(node) {
    if (node.classList.contains('measured')) return;
    var pick = STATES[Math.floor(Math.random() * STATES.length)];
    var icons = node.querySelectorAll('.q-icon');
    for (var k = 0; k < icons.length; k++) {
      icons[k].classList.toggle('is-on', icons[k].getAttribute('data-k') === pick.key);
    }
    node.querySelector('.q-label').textContent = pick.label;
    node.classList.add('measured');
    node.setAttribute('aria-label', 'Measured: ' + pick.label);
  }

  function reset() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.classList.remove('measured', 'focusing');
      n.setAttribute('aria-label', 'Unmeasured — measure to reveal');
      var icons = n.querySelectorAll('.q-icon');
      for (var k = 0; k < icons.length; k++) icons[k].classList.remove('is-on');
      n.querySelector('.q-label').textContent = '';
    }
    placeLens(70, 48);
  }
  var rb = document.getElementById('superpos-reset');
  if (rb) rb.addEventListener('click', reset);

  /* ── lens drag + measure-on-release ─────────────────────── */
  var dragging = false;

  function placeLens(x, y) { lens.style.left = x + 'px'; lens.style.top = y + 'px'; }

  function nodeUnderLens() {
    var lr = lens.getBoundingClientRect();
    var cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return nodes[i];
    }
    return null;
  }
  function clearFocus() { for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('focusing'); }

  lens.addEventListener('pointerdown', function (e) {
    dragging = true;
    lens.classList.add('grabbing');
    try { lens.setPointerCapture(e.pointerId); } catch (x) {}
    e.preventDefault();
  });
  lens.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var r = root.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    placeLens(x, y);
    clearFocus();
    var n = nodeUnderLens();
    if (n && !n.classList.contains('measured')) n.classList.add('focusing');
  });
  lens.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    lens.classList.remove('grabbing');
    var n = nodeUnderLens();
    clearFocus();
    if (n) measure(n);
  });
})();
