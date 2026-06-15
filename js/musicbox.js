/* ============================================================
   musicbox.js — "Schrödinger's music box"
   The box holds a piece in superposition; you don't know what's
   on until you open it. Open it (hover / tap / Enter) and it
   collapses onto a random piece. No audio yet — it just shows
   what would be playing (a window into the music taste + viola).
   ============================================================ */
(function () {
  'use strict';
  var box = document.getElementById('musicbox');
  if (!box) return;

  var PIECES = [
    { by: 'Mozart',      name: 'Overture to The Marriage of Figaro' },
    { by: 'Mendelssohn', name: 'Symphony No. 4, Movement I' },
    { by: 'Mozart',      name: 'Divertimento in D major, K. 136' }
  ];

  box.innerHTML =
    '<div class="mb-lid"></div>' +
    '<div class="mb-face">' +
      '<div class="mb-closed"><span class="mb-psi">&#968;</span><span class="mb-hint">hover to open</span></div>' +
      '<div class="mb-open">' +
        '<div class="mb-eq"><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="mb-piece"><span class="mb-by"></span><span class="mb-name"></span></div>' +
        '<div class="mb-note">(no audio yet — but this is what’d be on)</div>' +
      '</div>' +
    '</div>';

  var byEl = box.querySelector('.mb-by');
  var nameEl = box.querySelector('.mb-name');
  var last = -1;

  function pick() {
    var i;
    do { i = Math.floor(Math.random() * PIECES.length); } while (PIECES.length > 1 && i === last);
    last = i;
    byEl.textContent = PIECES[i].by;
    nameEl.textContent = PIECES[i].name;
  }
  function open() { pick(); box.classList.add('open'); }
  function close() { box.classList.remove('open'); }

  box.setAttribute('role', 'button');
  box.setAttribute('tabindex', '0');
  box.setAttribute('aria-label', "Schrodinger's music box — open to reveal a random piece");

  box.addEventListener('pointerenter', open);
  box.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') close(); });
  box.addEventListener('click', open);          // re-roll / touch
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
})();
