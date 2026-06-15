/* ============================================================
   musicbox.js, "Schrodinger's music box"
   A little curved-corner widget tucked into the bottom-right of
   every page. Click the button to turn it on: it collapses onto
   a random piece (you don't know what's on until you look), and
   music notes drift up into the screen and fade. Now with working audio!

   DISCLAIMER: The audio tracks used in this widget are for
   demonstration purposes only. All music rights, recordings,
   and copyrights belong to their respective owners, performers,
   and publishers. No copyright infringement is intended.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body) return;

  // Added 'file' property placeholders for your audio tracks
  var PIECES = [
    { by: 'Mozart',      name: 'Overture to The Marriage of Figaro', file: '/assets/audio3.mp3' },
    { by: 'Mendelssohn', name: 'Symphony No. 4, Movement I',         file: '/assets/audio1.mp3' },
    { by: 'Mozart',      name: 'Divertimento in D major, K. 136',    file: '/assets/audio2.mp3' }
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

  // currentAudio keeps track of the HTML5 Audio instance
  var on = false, timer = null, last = -1, currentAudio = null;

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

    // Setup and play the chosen audio track
    var currentPiece = PIECES[last];
    if (currentPiece && currentPiece.file) {
      currentAudio = new Audio(currentPiece.file);
      currentAudio.loop = true; // Optional: loops the track if it finishes
      currentAudio.play().catch(function (err) {
        console.warn("Audio play blocked or file not found:", err);
      });
    }

    if (!reduce) { spawnNote(); timer = setInterval(spawnNote, 620); }
  }

  function turnOff() {
    on = false;
    box.classList.remove('on');
    btn.textContent = '♪';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Schrodinger’s music box, off');

    // Stop and clear the audio track
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    if (timer) { clearInterval(timer); timer = null; }
  }

  btn.addEventListener('click', function () { on ? turnOff() : turnOn(); });

  // Pause the note stream AND the audio on hidden tabs
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (timer) { clearInterval(timer); timer = null; }
      if (currentAudio) { currentAudio.pause(); }
    } else if (on) {
      if (!timer && !reduce) { timer = setInterval(spawnNote, 620); }
      if (currentAudio) {
        currentAudio.play().catch(function(err) { console.warn(err); });
      }
    }
  });
})();