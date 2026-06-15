/* ============================================================
   atom-array.js — "Optical Tweezer Array"
   The site's quantum signature: a lattice of softly glowing
   atoms held in trap wells.

     • Ambient (default): atoms idle with Brownian jitter +
       twinkle; some wells empty ("defects"); a slow imaging
       sweep crosses the field. Pure background — never blocks
       the page (pointer-events: none, z-index: -1).

     • Play (opt-in via window.AtomArray.play()): "defect-free
       assembly" — drag reservoir atoms into the empty target
       wells before the array decoheres. Mirrors the real
       neutral-atom QC task Zoeb works on.

   Performance: capped rAF, cached glow sprite, devicePixelRatio
   handled, pauses on hidden tab. Accessibility: honors
   prefers-reduced-motion (static frame), canvas is aria-hidden,
   never traps keyboard, and a visible on/off toggle is provided.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('atom-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var STORE = 'atomArray.enabled';

  /* ── Tunables ──────────────────────────────────────────── */
  var SPACING   = 62;     // lattice pitch (px)
  var FILL_PROB = 0.5;    // ambient occupancy
  var PICK_R    = 30;     // pick-up radius (play)
  var SNAP_R    = 34;     // drop-into-well radius (play)
  var FPS_MS    = 1000 / 50;
  var AMB_BRIGHT = 0.16;  // ambient peak glow alpha
  var PLAY_BRIGHT = 0.92;

  /* ── State ─────────────────────────────────────────────── */
  var DPR = 1, W = 0, H = 0;
  var sites = [], beams = [], parts = [];
  var pointer = { x: 0, y: 0, drag: null };
  var mode = 'ambient';          // 'ambient' | 'play'
  var enabled = true;
  var raf = null, lastT = 0, clock = 0, scanX = -200, lossT = 0;
  var bright = AMB_BRIGHT, brightTarget = AMB_BRIGHT;
  var shake = 0;
  var game = { score: 0, level: 1, decoh: 1, dur: 14, targets: 0 };
  var glow = null, GR = 28;

  /* ── Cached glow sprite (biggest perf win) ─────────────── */
  function buildGlow() {
    var s = document.createElement('canvas');
    s.width = s.height = GR * 2;
    var g = s.getContext('2d');
    var grd = g.createRadialGradient(GR, GR, 0, GR, GR, GR);
    grd.addColorStop(0.0, 'rgba(200,253,255,1)');
    grd.addColorStop(0.16, 'rgba(34,211,238,0.95)');
    grd.addColorStop(0.45, 'rgba(34,211,238,0.30)');
    grd.addColorStop(1.0, 'rgba(34,211,238,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, GR * 2, GR * 2);
    glow = s;
  }

  /* ── Lattice ───────────────────────────────────────────── */
  function buildLattice() {
    sites.length = 0;
    var cols = Math.ceil(W / SPACING) + 2;
    var rows = Math.ceil(H / SPACING) + 2;
    var offX = (W - (cols - 1) * SPACING) / 2;
    var offY = (H - (rows - 1) * SPACING) / 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = offX + c * SPACING, y = offY + r * SPACING;
        sites.push({
          hx: x, hy: y, x: x, y: y, vx: 0, vy: 0,
          occ: Math.random() < FILL_PROB,
          target: false,
          phase: Math.random() * 6.28,
          tw: 0.55 + Math.random() * 0.45
        });
      }
    }
  }

  function nearest(px, py, rad, test) {
    var best = null, bd = rad * rad;
    for (var i = 0; i < sites.length; i++) {
      var s = sites[i];
      if (!test(s)) continue;
      var dx = s.x - px, dy = s.y - py, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /* ── Sizing ────────────────────────────────────────────── */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildLattice();
    if (mode === 'play') setupLevel();
    if (!running()) renderOnce();
  }

  /* ── Particles ─────────────────────────────────────────── */
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = 0.6 + Math.random() * 2.4;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: color });
    }
    if (parts.length > 120) parts.splice(0, parts.length - 120);
  }

  /* ── Game ──────────────────────────────────────────────── */
  function setupLevel() {
    // reset targets
    for (var i = 0; i < sites.length; i++) sites[i].target = false;
    var tc = Math.min(3 + game.level, 7);   // target columns
    var tr = 3;                              // target rows
    var cx = W / 2, cy = H * 0.46;
    var startX = cx - (tc - 1) * SPACING / 2;
    var startY = cy - (tr - 1) * SPACING / 2;
    game.targets = 0;
    for (var rr = 0; rr < tr; rr++) {
      for (var cc = 0; cc < tc; cc++) {
        var tx = startX + cc * SPACING, ty = startY + rr * SPACING;
        var s = nearest(tx, ty, SPACING * 0.7, function () { return true; });
        if (s) { s.target = true; s.occ = false; game.targets++; }
      }
    }
    // guarantee a reservoir of draggable atoms around the block
    var filled = 0;
    for (i = 0; i < sites.length; i++) if (sites[i].occ && !sites[i].target) filled++;
    var need = game.targets + 6 - filled;
    for (i = 0; i < sites.length && need > 0; i++) {
      var s2 = sites[i];
      if (!s2.occ && !s2.target) {
        var dy = s2.y - cy;
        if (Math.abs(dy) < H * 0.42) { s2.occ = true; need--; }
      }
    }
    game.decoh = 1;
    game.dur = Math.max(7, 15 - game.level);
  }

  function targetsLeft() {
    var n = 0;
    for (var i = 0; i < sites.length; i++) if (sites[i].target && !sites[i].occ) n++;
    return n;
  }

  function melt() {
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].target && sites[i].occ && Math.random() < 0.8) {
        sites[i].occ = false;
        burst(sites[i].x, sites[i].y, '90,100,114', 4);
      }
    }
    game.decoh = 1; shake = 10;
  }

  function complete() {
    game.score++;
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].target) burst(sites[i].x, sites[i].y, '34,211,238', 5);
    }
    game.level++;
    setupLevel();
    updateHUD();
  }

  /* ── Play / exit (public API) ──────────────────────────── */
  function play() {
    if (!enabled || reduceMQ.matches) return;
    mode = 'play';
    game.score = 0; game.level = 1;
    brightTarget = PLAY_BRIGHT;
    setupLevel();
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '80';
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    toggle.style.display = 'none';
    hud.classList.add('show');
    updateHUD();
    start();
  }
  function exit() {
    mode = 'ambient';
    pointer.drag = null;
    for (var i = 0; i < sites.length; i++) sites[i].target = false;
    brightTarget = AMB_BRIGHT;
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    canvas.style.cursor = '';
    canvas.style.touchAction = '';
    toggle.style.display = '';
    hud.classList.remove('show');
    if (reduceMQ.matches) { stop(); renderOnce(); }
  }

  /* ── Pointer (only fires in play; canvas is inert otherwise) */
  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'play') return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    var s = nearest(e.clientX, e.clientY, PICK_R, function (s) { return s.occ; });
    if (s) {
      pointer.drag = s; s.occ = false;
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (pointer.drag) e.preventDefault();
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!pointer.drag) return;
    var src = pointer.drag; pointer.drag = null;
    canvas.style.cursor = 'grab';
    var well = nearest(e.clientX, e.clientY, SNAP_R, function (s) { return s.target && !s.occ; });
    if (well) {
      well.occ = true;
      burst(well.x, well.y, '34,211,238', 8);
      beams.push({ ax: src.hx, ay: src.hy, bx: well.x, by: well.y, life: 1 });
      if (targetsLeft() === 0) complete();
    } else {
      src.occ = true; // return atom to its well
    }
  });

  /* ── Update ────────────────────────────────────────────── */
  function update(dt) {
    var f = dt / 16.67;
    clock += dt;
    bright += (brightTarget - bright) * Math.min(1, 0.06 * f);
    if (shake > 0) shake = Math.max(0, shake - 0.6 * f);

    var moving = !reduceMQ.matches;
    for (var i = 0; i < sites.length; i++) {
      var s = sites[i];
      if (moving) {
        if (Math.random() < 0.02) { s.vx += (Math.random() - 0.5) * 0.5; s.vy += (Math.random() - 0.5) * 0.5; }
        s.vx += (s.hx - s.x) * 0.012; s.vy += (s.hy - s.y) * 0.012;
        s.vx *= 0.9; s.vy *= 0.9;
        s.x += s.vx * f; s.y += s.vy * f;
      }
    }

    // imaging sweep
    scanX += 1.1 * f;
    if (scanX > W + 200) scanX = -200;

    // beams + particles (write-index compaction, no per-frame filter)
    var w = 0, k;
    for (k = 0; k < beams.length; k++) {
      var b = beams[k]; b.life -= 0.05 * f;
      if (b.life > 0) beams[w++] = b;
    }
    beams.length = w;
    w = 0;
    for (k = 0; k < parts.length; k++) {
      var p = parts[k];
      p.x += p.vx * f; p.y += p.vy * f; p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.02 * f;
      if (p.life > 0) parts[w++] = p;
    }
    parts.length = w;

    // game timers
    if (mode === 'play' && !reduceMQ.matches) {
      game.decoh -= dt / (game.dur * 1000);
      if (game.decoh <= 0) melt();
      lossT += dt;
      if (game.level >= 2 && lossT > 6000) {
        lossT = 0;
        var lost = nearest(W / 2, H * 0.46, SPACING * 6, function (s) { return s.target && s.occ; });
        if (lost) { lost.occ = false; burst(lost.x, lost.y, '90,100,114', 4); }
      }
    }
  }

  /* ── Render ────────────────────────────────────────────── */
  function atom(x, y, scale, alpha) {
    var d = GR * 2 * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(glow, x - GR * scale, y - GR * scale, d, d);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    var sx = shake ? (Math.random() - 0.5) * shake : 0;
    var sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.save();
    if (sx || sy) ctx.translate(sx, sy);

    var playing = mode === 'play';

    // imaging sweep (ambient texture)
    if (!reduceMQ.matches) {
      ctx.globalAlpha = playing ? 0.05 : 0.5;
      var g = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
      g.addColorStop(0, 'rgba(34,211,238,0)');
      g.addColorStop(0.5, 'rgba(34,211,238,' + (playing ? 0.05 : 0.04) + ')');
      g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g;
      ctx.fillRect(scanX - 60, 0, 120, H);
    }

    // wells + atoms
    for (var i = 0; i < sites.length; i++) {
      var s = sites[i];
      // faint trap-well marker (defines the lattice)
      ctx.globalAlpha = playing ? 0.5 : 0.14;
      ctx.fillStyle = 'rgba(79,70,229,1)';
      ctx.beginPath(); ctx.arc(s.hx, s.hy, 1.1, 0, 6.2832); ctx.fill();

      if (s.target && !s.occ) {
        // empty target — pulsing indigo ring (the goal)
        var pulse = 0.5 + 0.5 * Math.sin(clock / 320 + s.phase);
        ctx.globalAlpha = (0.4 + 0.45 * pulse);
        ctx.strokeStyle = 'rgba(79,70,229,1)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(s.hx, s.hy, 9 + pulse * 2, 0, 6.2832); ctx.stroke();
      } else if (s.occ) {
        var tw = reduceMQ.matches ? 0.85 : (0.72 + 0.28 * Math.sin(clock / 600 + s.phase)) * s.tw + 0.2;
        var a = Math.min(1, bright * tw * (s.target ? 1.15 : 1));
        atom(s.x, s.y, s.target ? 0.62 : 0.5, a);
      }
    }

    // drag beam + dragged atom
    if (pointer.drag) {
      ctx.globalAlpha = 0.6; ctx.strokeStyle = 'rgba(34,211,238,1)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(pointer.drag.hx, pointer.drag.hy); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      atom(pointer.x, pointer.y, 0.7, Math.min(1, bright + 0.3));
    }
    // placement beams
    for (i = 0; i < beams.length; i++) {
      var b = beams[i];
      ctx.globalAlpha = b.life * 0.7; ctx.strokeStyle = 'rgba(34,211,238,1)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(b.ax, b.ay); ctx.lineTo(b.bx, b.by); ctx.stroke();
    }
    // particles
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.globalAlpha = p.life; ctx.fillStyle = 'rgba(' + p.col + ',1)';
      ctx.fillRect(p.x - 1, p.y - 1, 2.2, 2.2);
    }

    // decoherence ring (play)
    if (playing) {
      var rx = W / 2, ry = H * 0.46, rad = SPACING * 3.6;
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(231,231,226,0.5)';
      ctx.beginPath(); ctx.arc(rx, ry, rad, 0, 6.2832); ctx.stroke();
      var col = game.decoh > 0.35 ? '34,211,238' : '244,114,90';
      ctx.strokeStyle = 'rgba(' + col + ',0.95)';
      ctx.beginPath(); ctx.arc(rx, ry, rad, -1.5708, -1.5708 + 6.2832 * game.decoh); ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function renderOnce() { if (W) render(); }

  /* ── Loop ──────────────────────────────────────────────── */
  function running() { return raf !== null; }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    var dt = t - lastT;
    if (dt < FPS_MS) return;
    lastT = t;
    update(Math.min(dt, 50));
    render();
  }
  function start() {
    if (raf === null && enabled && !document.hidden && !reduceMQ.matches) { lastT = 0; raf = requestAnimationFrame(frame); }
  }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  /* ── HUD + toggle (created here; not in every HTML) ───── */
  var hud = document.createElement('div');
  hud.className = 'atom-hud';
  hud.innerHTML =
    '<span>Drag atoms into the <b>empty wells</b></span>' +
    '<span>Arrays&nbsp;<b id="atom-score">0</b></span>' +
    '<button class="hud-reset" id="atom-exit" type="button">Exit</button>';
  document.body.appendChild(hud);
  hud.querySelector('#atom-exit').addEventListener('click', exit);
  function updateHUD() { var el = document.getElementById('atom-score'); if (el) el.textContent = game.score; }

  var toggle = document.createElement('button');
  toggle.id = 'atom-toggle';
  toggle.type = 'button';
  document.body.appendChild(toggle);
  function paintToggle() {
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    toggle.innerHTML = '<span class="dot"></span>' + (enabled ? 'Atom array' : 'Array off');
  }
  toggle.addEventListener('click', function () {
    enabled = !enabled;
    try { localStorage.setItem(STORE, enabled ? 'on' : 'off'); } catch (e) {}
    paintToggle();
    if (enabled) { canvas.classList.remove('off'); resize(); start(); }
    else { if (mode === 'play') exit(); stop(); ctx.clearRect(0, 0, W, H); canvas.classList.add('off'); }
  });

  /* ── Lifecycle ─────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (enabled) start();
  });
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function () {
    if (reduceMQ.matches) { if (mode === 'play') exit(); stop(); renderOnce(); }
    else start();
  });
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 150); }, { passive: true });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode === 'play') exit(); });

  // public API for the hero "play" button
  window.AtomArray = { play: play, exit: exit };

  /* ── Boot ──────────────────────────────────────────────── */
  function boot() {
    try { enabled = localStorage.getItem(STORE) !== 'off'; } catch (e) {}
    buildGlow();
    resize();
    paintToggle();
    if (!enabled) { canvas.classList.add('off'); return; }
    if (reduceMQ.matches) renderOnce();   // static frame, no loop
    else start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
