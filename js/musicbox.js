/* ============================================================
   musicbox.js, "Schrodinger's music box"
   A little curved-corner widget tucked into the bottom-right of
   every page. Click the button to turn it on: it collapses onto
   a random piece (you don't know what's on until you look), and
   music notes drift up into the screen and fade. No audio yet, 
   add files for the three pieces to make it actually play.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body) return;

  var PIECES = [
    { by: 'Mozart',      name: 'Overture to The Marriage of Figaro' },
    { by: 'Mendelssohn', name: 'Symphony No. 4, Movement I' },
    { by: 'Mozart',      name: 'Divertimento in D major, K. 136' }
  ];
  var GLYPHS = ['♪', '♫', '♩', '♬']; // single, beamed, quarter, beamed-16th

  var box = document.createElement('div');
  box.className = 'mbox';
  box.innerHTML =
    '<div class="mbox-notes" id="mbox-notes"></div>' +
    '<div class="mbox-panel">' +
      '<button class="mbox-btn" id="mbox-btn" type="button" aria-pressed="false" aria-label="Schrodinger’s music box, off">♪</button>' +
      '<div class="mbox-now">' +
        '<span class="mbox-cap">Schrödinger’s music box</span>' +
        '<span class="mbox-by"></span><span class="mbox-name"></span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(box);

  var btn = box.querySelector('#mbox-btn');
  var byEl = box.querySelector('.mbox-by');
  var nameEl = box.querySelector('.mbox-name');
  var notesEl = box.querySelector('#mbox-notes');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var on = false, timer = null, last = -1;

  function pick() {
    var i;
    do { i = Math.floor(Math.random() * PIECES.length); } while (PIECES.length > 1 && i === last);
    last = i;
    byEl.textContent = PIECES[i].by;
    nameEl.textContent = PIECES[i].name;
  }

  function spawnNote() {
    var n = document.createElement('span');
    n.className = 'mbox-note';
    n.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    n.style.setProperty('--dx', (-70 - Math.random() * 150) + 'px');
    n.style.setProperty('--dy', (-150 - Math.random() * 150) + 'px');
    n.style.fontSize = (0.9 + Math.random() * 0.9).toFixed(2) + 'rem';
    n.style.animationDuration = (2.3 + Math.random() * 1.5).toFixed(2) + 's';
    notesEl.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 4200);
  }

  function turnOn() {
    on = true;
    box.classList.add('on');
    btn.textContent = '♫';
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Schrodinger’s music box, on');
    pick();
    if (!reduce) { spawnNote(); timer = setInterval(spawnNote, 620); }
  }
  function turnOff() {
    on = false;
    box.classList.remove('on');
    btn.textContent = '♪';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Schrodinger’s music box, off');
    if (timer) { clearInterval(timer); timer = null; }
  }

  btn.addEventListener('click', function () { on ? turnOff() : turnOn(); });

  // pause the note stream on hidden tabs
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && timer) { clearInterval(timer); timer = null; }
    else if (on && !timer && !reduce) { timer = setInterval(spawnNote, 620); }
  });
})();
