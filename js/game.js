/* ============================================================
   GD-lite v4 (Optimized, High-Speed Performance Edition)
   ============================================================ */

(function () {

  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let gameEnabled = true;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'game-toggle';
  toggleBtn.textContent = '▶ Game ON';
  toggleBtn.setAttribute('aria-label', 'Toggle background game');
  Object.assign(toggleBtn.style, {
    position:   'fixed',
    bottom:     '18px',
    right:      '18px',
    zIndex:     '200',
    padding:    '6px 14px',
    fontSize:   '11px',
    fontFamily: '"DM Sans", sans-serif',
    fontWeight: '600',
    letterSpacing: '0.06em',
    background: 'rgba(247,247,245,0.85)',
    border:     '1px solid #E2E8F0',
    borderRadius: '20px',
    color:      '#64748B',
    cursor:     'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s',
  });
  toggleBtn.addEventListener('mouseenter', () => { toggleBtn.style.color = '#0D9488'; toggleBtn.style.borderColor = '#99F6E4'; });
  toggleBtn.addEventListener('mouseleave', () => { toggleBtn.style.color = '#64748B'; toggleBtn.style.borderColor = '#E2E8F0'; });
  toggleBtn.addEventListener('click', () => {
    gameEnabled = !gameEnabled;
    canvas.style.opacity = gameEnabled ? '0.14' : '0';
    toggleBtn.textContent = gameEnabled ? '▶ Game ON' : '◼ Game OFF';
  });
  document.body.appendChild(toggleBtn);

  const scoreEl = document.createElement('div');
  scoreEl.id = 'game-score';
  Object.assign(scoreEl.style, {
    position:   'fixed',
    top:        '72px',
    right:      '18px',
    zIndex:     '200',
    fontSize:   '11px',
    fontFamily: '"DM Sans", sans-serif',
    fontWeight: '700',
    color:      '#0D9488',
    letterSpacing: '0.08em',
    opacity:    '0.45',
    pointerEvents: 'none',
    userSelect: 'none',
    lineHeight: '1.6',
    textAlign:  'right',
  });
  document.body.appendChild(scoreEl);

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  /* ── Speed Alterations (Faster Character) ────────────────── */
  const BASE_SPEED   = 14;      // Increased from 10 to 14
  const GRAVITY      = 2.5;    // Increased gravity to compensate for high speed
  const JUMP_VY      = -24.0;   // Higher snappy vertical jump velocity
  const JUMP_CUT     = 0.45;
  const MAX_FALL     = 18;

  let frame = 0, score = 0, deaths = 0;
  let speed = BASE_SPEED, baseSpeed = BASE_SPEED;
  let dying = false, dead = false;
  let deathTimer = 0, flashAlpha = 0;
  let reversed = false, reverseTimer = 0;
  let jumpHeld = false;
  let ballGravityDown = true;

  const ORB_TYPES = {
    ship: {
      fill:   '#818CF8',
      ring:   '#C7D2FE',
      glow:   'rgba(129,140,248,0.45)',
      symbol: '▲',
      action(p) {
        mode = 'ship';
        p.vy = -7;
        p.onGround = false;
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, 'rgba(129,140,248,0.5)', false);
      },
    },
    wave: {
      fill:   '#38BDF8',
      ring:   '#BAE6FD',
      glow:   'rgba(56,189,248,0.45)',
      symbol: '◆',
      action(p) {
        mode = 'wave';
        p.waveUp = !p.waveUp;
        p.vy = p.waveUp ? -7.2 : 7.2;
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, 'rgba(56,189,248,0.5)', false);
      },
    },
    ball: {
      fill:   '#F472B6',
      ring:   '#FBCFE8',
      glow:   'rgba(244,114,182,0.45)',
      symbol: '●',
      action(p) {
        mode = 'ball';
        ballGravityDown = !ballGravityDown;
        p.vy = ballGravityDown ? 5.5 : -5.5;
        p.onGround = false;
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, 'rgba(244,114,182,0.5)', false);
      },
    },
    cube: {
      fill:   '#0D9488',
      ring:   '#99F6E4',
      glow:   'rgba(13,148,136,0.45)',
      symbol: '■',
      action(p) {
        mode = 'cube';
        p.vy = JUMP_VY * 0.95;
        p.onGround = false;
        p.coyote = 0;
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 8, 'rgba(13,148,136,0.6)', false);
      },
    },
  };
  const ORB_TYPE_KEYS = Object.keys(ORB_TYPES);

  let W, H, groundY, ceilY;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    groundY = H - 80;
    ceilY   = 50;
    P.x = Math.round(W * 0.20);
    if (!dying && !dead) snapToGround();
  }

  const P = {
    x: 0, y: 0, w: 30, h: 30,
    vy: 0, rot: 0,
    onGround: false,
    holding: false,
    waveUp: false,
    trail: [],
    coyote: 0,
  };

  function snapToGround() {
    P.y = groundY - P.h;
    P.vy = 0;
    P.onGround = true;
    P.coyote = 0;
    ballGravityDown = true;
  }

  const MODES = ['cube', 'ship', 'wave', 'ball'];
  let mode = 'cube';
  let nextModeFrame = 700;

  let obstacles = [], platforms = [], orbs = [];
  let particles = [], stars = [], bgSquares = [];

  function init() {
    resize();
    snapToGround();
    P.rot = 0; P.trail = []; P.holding = false; P.waveUp = false; P.coyote = 0;

    obstacles.length = 0; platforms.length = 0; orbs.length = 0;
    particles.length = 0; bgSquares.length = 0;

    frame = 0; score = 0; speed = baseSpeed = BASE_SPEED;
    dying = false; dead = false; deathTimer = 0; flashAlpha = 0;
    reversed = false; reverseTimer = 0; jumpHeld = false;
    ballGravityDown = true;
    mode = 'cube'; nextModeFrame = 700;

    for (let i = 0; i < 12; i++) bgSquares.push(makeBGSquare(Math.random() * W)); // Trimmed from 18
    stars.length = 0;
    for (let i = 0; i < 35; i++) { // Trimmed background nodes from 60 to 35 for render efficiency
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8,
                   r: 0.4 + Math.random() * 1.4, sp: 0.1 + Math.random() * 0.3 });
    }
  }

  function makeBGSquare(x) {
    const s = 12 + Math.random() * 36;
    return { x, y: Math.random() * (groundY * 0.85), w: s, h: s,
             sp: 0.2 + Math.random() * 0.5, a: 0.03 + Math.random() * 0.07 };
  }

function switchMode() {
    if (frame < nextModeFrame) return;
    const others = MODES.filter(m => m !== mode);
    const next = others[Math.floor(Math.random() * others.length)];
    mode = next;

    if (mode === 'ship' || mode === 'wave') {
      if (P.y > groundY - P.h - 60) { P.y = groundY - P.h - 90; }
    } else if (mode === 'ball') {
      ballGravityDown = true;
      snapToGround();
    } else {
      snapToGround();
    }
    P.vy = 0;
    nextModeFrame = frame + 500 + Math.floor(Math.random() * 400);
    // Fixed: Changed lowercase p to uppercase P here
    spawnParticles(P.x + P.w / 2, P.y + P.h / 2, 6, modeColor(), false);
  }
  function modeColor() {
    return { cube: 'rgba(13,148,136,0.5)', ship: 'rgba(129,140,248,0.5)',
             wave: 'rgba(56,189,248,0.5)',  ball: 'rgba(244,114,182,0.5)' }[mode];
  }

  function maybeSpawn() {
    if (reversed) return;
    const last = obstacles.length ? obstacles[obstacles.length - 1].x : 0;
    if (last < W * 0.88) spawnSegment();
  }

  function spawnSegment() {
    const gap = 330 + Math.random() * 200;
    const ox  = W + gap;
    const r   = Math.random();

    if (mode === 'ship' || mode === 'wave') {
      if (r < 0.5) {
        obstacles.push({ type: 'block', x: ox, y: ceilY, w: 28, h: 28 + Math.random() * 40 });
      } else {
        const fy = ceilY + 40 + Math.random() * (groundY - ceilY - 120);
        obstacles.push({ type: 'block', x: ox, y: fy, w: 26, h: 26 });
      }
    }
    else if (mode === 'ball') {
      if (r < 0.35) {
        obstacles.push({ type: 'spike', x: ox, y: groundY, w: 28, h: 36 });
      } else if (r < 0.70) {
        obstacles.push({ type: 'ceilSpike', x: ox, y: ceilY, w: 28, h: 36 });
      } else {
        obstacles.push({ type: 'spike', x: ox, y: groundY, w: 28, h: 36 });
        obstacles.push({ type: 'ceilSpike', x: ox + 60, y: ceilY, w: 28, h: 36 });
      }

      if (Math.random() < 0.3) {
        platforms.push({ x: ox + 80, y: groundY - 100, w: 70, h: 12 });
        platforms.push({ x: ox + 140, y: ceilY + 100, w: 70, h: 12 });
      }

      if (Math.random() < 0.25) {
        const orbKey = ORB_TYPE_KEYS[Math.floor(Math.random() * ORB_TYPE_KEYS.length)];
        orbs.push({ x: ox + 90, y: (groundY + ceilY) / 2 + (Math.random() * 60 - 30), r: 12, hit: false, kind: orbKey });
      }
    }
    else {
      if (r < 0.28) {
        obstacles.push({ type: 'spike', x: ox, y: groundY, w: 28, h: 36 });
      } else if (r < 0.50) {
        obstacles.push({ type: 'spike', x: ox,      y: groundY, w: 28, h: 36 });
        obstacles.push({ type: 'spike', x: ox + 40, y: groundY, w: 28, h: 36 });
      } else if (r < 0.65) {
        obstacles.push({ type: 'block', x: ox, y: groundY - 32, w: 32, h: 32 });
      } else if (r < 0.80) {
        obstacles.push({ type: 'block', x: ox, y: groundY - 64, w: 32, h: 64 });
      } else {
        obstacles.push({ type: 'block', x: ox,      y: groundY - 32, w: 32, h: 32 });
        obstacles.push({ type: 'spike', x: ox + 50, y: groundY,      w: 28, h: 36 });
      }

      if (Math.random() < 0.35) {
        platforms.push({ x: ox + 100 + Math.random() * 100, y: groundY - 105 - Math.random() * 60, w: 55 + Math.random() * 45, h: 12 });
      }
      if (Math.random() < 0.30) {
        const orbKey = ORB_TYPE_KEYS[Math.floor(Math.random() * ORB_TYPE_KEYS.length)];
        orbs.push({ x: ox + 70 + Math.random() * 60, y: groundY - 115 - Math.random() * 50, r: 12, hit: false, kind: orbKey });
      }
    }
  }

  function press() {
    if (dead)  { if (deathTimer > 50) init(); return; }
    if (dying) return;
    P.holding = true;
    jumpHeld  = true;

    if (mode === 'cube') {
      if (P.onGround || P.coyote > 0) {
        P.vy = JUMP_VY;
        P.onGround = false;
        P.coyote = 0;
        spawnParticles(P.x + P.w / 2, P.y + P.h, 4, modeColor(), false);
      }
    }
    if (mode === 'ball') {
      if (P.onGround) {
        ballGravityDown = !ballGravityDown;
        P.onGround = false;
        spawnParticles(P.x + P.w / 2, P.y + P.h / 2, 4, modeColor(), false);
      }
    }
    P.waveUp = true;
  }

  function release() {
    P.holding = false;
    P.waveUp  = false;
    jumpHeld  = false;
    if (mode === 'cube' && P.vy < 0) {
      P.vy *= JUMP_CUT;
    }
  }

  function die() {
    if (dying || dead) return;
    dying = true; deaths++;
    flashAlpha = 0.55;
    spawnParticles(P.x + P.w / 2, P.y + P.h / 2, 20, modeColor(), true); // Lowered count from 32
  }

  function spawnParticles(x, y, n, color, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = big ? 2 + Math.random() * 6.5 : 0.8 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (big ? 1.5 : 0.3),
        r:    big ? 3 + Math.random() * 5 : 1.5 + Math.random() * 2.5,
        life: big ? 0.85 + Math.random() * 0.5 : 0.55 + Math.random() * 0.3,
        color,
      });
    }
  }

  function overlaps(ax, ay, aw, ah, bx, by, bw, bh, pad) {
    pad = pad || 3;
    return !(ax + pad > bx + bw || ax + aw - pad < bx ||
             ay + pad > by + bh || ay + ah - pad < by);
  }

  /* ── GC-friendly Array Pruning (Eliminated .filter performance traps) ── */
  function pruneArrays() {
    let writeIdx = 0;
    for (let i = 0; i < obstacles.length; i++) {
      if (obstacles[i].x + obstacles[i].w > -60 && obstacles[i].x < W + 500) {
        obstacles[writeIdx++] = obstacles[i];
      }
    }
    obstacles.length = writeIdx;

    writeIdx = 0;
    for (let i = 0; i < platforms.length; i++) {
      if (platforms[i].x + platforms[i].w > -60) {
        platforms[writeIdx++] = platforms[i];
      }
    }
    platforms.length = writeIdx;

    writeIdx = 0;
    for (let i = 0; i < orbs.length; i++) {
      if (orbs[i].x > -60) {
        orbs[writeIdx++] = orbs[i];
      }
    }
    orbs.length = writeIdx;
  }

  function update() {
    if (!gameEnabled) return;

    if (dying) {
      deathTimer++;
      flashAlpha = Math.max(0, flashAlpha - 0.022);
      tickParticles();

      // 60 frames = exactly 1 second at 60FPS
      if (deathTimer >= 60) {
        init();
      }
      return;
    }
    if (dead) { deathTimer++; tickParticles(); return; }

    frame++; score++;

    if (frame % 320 === 0 && baseSpeed < 12.0) {
      baseSpeed += 0.18;
      if (!reversed) speed = baseSpeed;
    }

    switchMode();

    if (!reversed && frame > 900 && Math.random() < 0.0003) {
      reversed = true; reverseTimer = 140;
      speed = -baseSpeed * 0.65;
    }
    if (reversed) {
      reverseTimer--;
      if (reverseTimer <= 0) { reversed = false; speed = baseSpeed; }
    }

    if (mode === 'cube') {
      P.vy += GRAVITY;
      P.vy  = Math.min(P.vy, MAX_FALL);
      P.y  += P.vy;
      if (P.onGround) P.coyote = 6; else if (P.coyote > 0) P.coyote--;
      P.onGround = false;
    }
    else if (mode === 'ship') {
      const thrust = P.holding ? -0.85 : 0; // scaled for performance gravity changes
      P.vy += GRAVITY * 0.4 + thrust;
      P.vy  = Math.max(-11, Math.min(11, P.vy));
      P.y  += P.vy;
    }
    else if (mode === 'wave') {
      P.vy  = P.waveUp ? -7.2 : 7.2;
      P.y  += P.vy;
    }
    else if (mode === 'ball') {
      const ballGravityForce = 1.2;
      P.vy += ballGravityDown ? ballGravityForce : -ballGravityForce;
      P.vy  = Math.max(-15, Math.min(15, P.vy));
      P.y  += P.vy;
      P.onGround = false;
    }

    if (P.y + P.h >= groundY) {
      P.y = groundY - P.h; P.vy = 0;
      if (mode === 'ship' || mode === 'wave') { die(); return; }
      if (mode === 'ball' && !ballGravityDown) { die(); return; }
      P.onGround = true;
    }

    if (P.y <= ceilY) {
      P.y = ceilY; P.vy = 0;
      if (mode === 'ship' || mode === 'wave') { die(); return; }
      if (mode === 'ball' && ballGravityDown) { die(); return; }
      if (mode === 'ball' && !ballGravityDown) { P.onGround = true; }
    }

    if (mode === 'cube') {
      if (!P.onGround) P.rot += reversed ? -6 : 6;
      else P.rot = Math.round(P.rot / 90) * 90;
    } else if (mode === 'ship') {
      P.rot = P.vy * 3;
    } else if (mode === 'ball') {
      P.rot += reversed ? -8 : 8;
    } else {
      P.rot = P.waveUp ? -30 : 30;
    }

    P.trail.push({ x: P.x + P.w / 2, y: P.y + P.h / 2, life: 1 });
    if (P.trail.length > 10) P.trail.shift(); // Optimized queue lengths down from 14
    for (let i = 0; i < P.trail.length; i++) { P.trail[i].life -= 0.1; }

    for(let i=0; i<obstacles.length; i++) obstacles[i].x -= speed;
    for(let i=0; i<platforms.length; i++) platforms[i].x -= speed;
    for(let i=0; i<orbs.length; i++) orbs[i].x -= speed;

    bgSquares.forEach(b => {
      b.x -= b.sp * (reversed ? -1 : 1);
      if (b.x + b.w < 0) { b.x = W + b.w; b.y = Math.random() * groundY * 0.85; }
      if (b.x > W + b.w) { b.x = -b.w; }
    });
    stars.forEach(s => {
      s.x -= s.sp;
      if (s.x < 0) { s.x = W; s.y = Math.random() * H * 0.8; }
    });

    pruneArrays();
    maybeSpawn();

    platforms.forEach(pl => {
      if (mode === 'cube') {
        if (P.vy >= 0 && P.x + P.w > pl.x + 4 && P.x < pl.x + pl.w - 4 &&
            P.y + P.h >= pl.y && P.y + P.h <= pl.y + pl.h + Math.abs(P.vy) + 2) {
          P.y = pl.y - P.h; P.vy = 0; P.onGround = true;
        }
      }
      else if (mode === 'ball') {
        if (ballGravityDown && P.vy >= 0 && P.x + P.w > pl.x + 4 && P.x < pl.x + pl.w - 4 &&
            P.y + P.h >= pl.y && P.y + P.h <= pl.y + pl.h + P.vy + 2) {
          P.y = pl.y - P.h; P.vy = 0; P.onGround = true;
        }
        else if (!ballGravityDown && P.vy <= 0 && P.x + P.w > pl.x + 4 && P.x < pl.x + pl.w - 4 &&
                 P.y <= pl.y + pl.h && P.y >= pl.y - Math.abs(P.vy) - 2) {
          P.y = pl.y + pl.h; P.vy = 0; P.onGround = true;
        }
      }
    });

    orbs.forEach(orb => {
      if (orb.hit) return;
      if (Math.hypot(P.x + P.w / 2 - orb.x, P.y + P.h / 2 - orb.y) < orb.r + P.w * 0.4) {
        orb.hit = true;
        const def = ORB_TYPES[orb.kind];
        def.action(P);
        spawnParticles(orb.x, orb.y, 6, def.glow, false);
      }
    });

    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      let hx = o.x, hy = o.y, hw = o.w, hh = o.h;
      if (o.type === 'spike') { hx += 5; hy = o.y - o.h; hw -= 10; }
      else if (o.type === 'ceilSpike') { hx += 5; hw -= 10; hh = o.h; }

      if (overlaps(P.x, P.y, P.w, P.h, hx, hy, hw, hh)) { die(); return; }
    }

    tickParticles();

    if (frame % 8 === 0) { // Throttled updates slightly to cut DOM reflow layouts
      const modeLabel = { cube:'■ CUBE', ship:'▲ SHIP', wave:'◆ WAVE', ball:'● BALL' };
      scoreEl.innerHTML = (modeLabel[mode] || '') + '<br>' + score + ' pts &nbsp;✦&nbsp; ' + deaths + '✕';
    }
  }

  function tickParticles() {
    let writeIdx = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
      if (p.life > 0) {
        particles[writeIdx++] = p;
      }
    }
    particles.length = writeIdx;
  }

  function draw() {
    if (!gameEnabled) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);

    // Grouped paths for optimization
    ctx.beginPath();
    ctx.fillStyle = 'rgba(13,148,136,0.4)';
    stars.forEach(s => {
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, Math.max(0.1, s.r), 0, Math.PI * 2);
    });
    ctx.fill();

    ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 1;
    bgSquares.forEach(b => {
      ctx.globalAlpha = b.a;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0D9488'; ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, W, ceilY);
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ceilY); ctx.lineTo(W, ceilY); ctx.stroke();

    ctx.globalAlpha = 0.08; ctx.lineWidth = 0.8;
    const gs = 36, gox = (frame * Math.abs(speed) * 0.18) % gs;
    ctx.beginPath();
    for (let gx = -gox; gx < W; gx += gs) {
      ctx.moveTo(gx, groundY); ctx.lineTo(gx, H);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    platforms.forEach(pl => {
      ctx.fillStyle = '#99F6E4'; ctx.globalAlpha = 0.55;
      rr(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
      ctx.globalAlpha = 1;
    });

    orbs.forEach(orb => {
      if (orb.hit) return;
      const def  = ORB_TYPES[orb.kind];
      const t    = frame * 0.12;
      const pulse = 1 + 0.15 * Math.sin(t);
      let baseR = typeof orb.r === 'number' && orb.r > 0 ? orb.r : 12;
      const R = Math.max(0.1, baseR * pulse);
      if (isNaN(R) || R <= 0) return;

      const rStart = Math.max(0.1, R * 0.4);
      const rEnd = Math.max(0.2, R * 2.2);

      const grd = ctx.createRadialGradient(orb.x, orb.y, rStart, orb.x, orb.y, rEnd);
      grd.addColorStop(0, def.glow);
      grd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(orb.x, orb.y, rEnd, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.globalAlpha = 0.6; ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(orb.x, orb.y, R, 0, Math.PI * 2);
      ctx.strokeStyle = def.ring; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.85; ctx.stroke();

      ctx.beginPath();
      ctx.arc(orb.x, orb.y, Math.max(0.1, R * 0.62), 0, Math.PI * 2);
      ctx.fillStyle = def.fill; ctx.globalAlpha = 0.9; ctx.fill();

      ctx.globalAlpha = 0.92;
      ctx.font = `bold ${Math.round(Math.max(1, R * 0.95))}px "DM Sans", sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, orb.x, orb.y + 1);
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    });

    obstacles.forEach(o => {
      if (o.type === 'spike' || o.type === 'ceilSpike') {
        ctx.beginPath();
        if(o.type === 'spike') {
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w / 2, o.y - o.h); ctx.lineTo(o.x + o.w, o.y);
        } else {
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w / 2, o.y + o.h); ctx.lineTo(o.x + o.w, o.y);
        }
        ctx.closePath(); ctx.fillStyle = '#0F766E'; ctx.globalAlpha = 0.75; ctx.fill();
        ctx.strokeStyle = '#14B8A6'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      else {
        ctx.fillStyle = '#0F766E'; ctx.globalAlpha = 0.65;
        rr(o.x, o.y, o.w, o.h, 3); ctx.fill();
        ctx.globalAlpha = 0.3; ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(o.x + 5, o.y + 5);       ctx.lineTo(o.x + o.w - 5, o.y + o.h - 5);
        ctx.moveTo(o.x + o.w - 5, o.y + 5); ctx.lineTo(o.x + 5, o.y + o.h - 5);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    });

    P.trail.forEach((t, i) => {
      const a = t.life * 0.38 * (i / P.trail.length);
      const trailRadius = Math.max(0.1, P.w * 0.28 * t.life);
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
      ctx.fillStyle = modeColor(); ctx.globalAlpha = Math.max(0, a); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (!dying && !dead) {
      ctx.save();
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2);
      ctx.rotate(P.rot * Math.PI / 180);

      const gc = { cube:'rgba(13,148,136,', ship:'rgba(129,140,248,', wave:'rgba(56,189,248,', ball:'rgba(244,114,182,' }[mode];
      const grd2 = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(1, P.w));
      grd2.addColorStop(0, gc + '0.42)'); grd2.addColorStop(1, gc + '0)');
      ctx.fillStyle = grd2; ctx.fillRect(-P.w, -P.h, P.w * 2, P.h * 2);

      const mc = { cube:'#0D9488', ship:'#818CF8', wave:'#38BDF8', ball:'#F472B6' }[mode];
      ctx.fillStyle = mc;

      if (mode === 'cube') {
        rr(-P.w/2, -P.h/2, P.w, P.h, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 1.8;
        rr(-P.w/2+6, -P.h/2+6, P.w-12, P.h-12, 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
      }
      else if (mode === 'ball') {
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, P.w/2), 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, P.w/2 - 5), 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
      }
      else if (mode === 'ship') {
        ctx.beginPath();
        ctx.moveTo(P.w*0.5, 0); ctx.lineTo(-P.w*0.38, -P.h*0.42);
        ctx.lineTo(-P.w*0.12, 0); ctx.lineTo(-P.w*0.38, P.h*0.42);
        ctx.closePath(); ctx.fill();
        if (P.holding) {
          ctx.fillStyle = 'rgba(251,146,60,0.92)';
          ctx.beginPath(); ctx.ellipse(-P.w*0.5, 0, Math.max(1, P.w*0.24), Math.max(1, P.h*0.15), 0, 0, Math.PI*2); ctx.fill();
        }
      }
      else if (mode === 'wave') {
        ctx.beginPath();
        ctx.moveTo(0, -P.h*0.5); ctx.lineTo(P.w*0.5, 0);
        ctx.lineTo(0, P.h*0.5); ctx.lineTo(-P.w*0.5, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // High performance batch canvas particle processing
    particles.forEach(p => {
      const particleRadius = Math.max(0.1, p.r * p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleRadius, 0, Math.PI*2);
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(13,148,136,' + flashAlpha + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (reversed) {
      ctx.font = '700 10px "DM Sans", sans-serif'; ctx.fillStyle = '#F43F5E';
      ctx.globalAlpha = 0.5; ctx.textAlign = 'center';
      ctx.fillText('◀ REVERSED', W/2, ceilY - 6);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  /* ── Smooth RequestAnimationFrame Loop ────────────────────── */
  let lastTime = performance.now();
  const fpsInterval = 1000 / 60; // Locked engine update ticks targeting standard 60hz base matrices

  function loop(currentTime) {
    requestAnimationFrame(loop);

    const elapsed = currentTime - lastTime;
    if (elapsed > fpsInterval) {
      // Compensate for potential monitor variable refresh rate variances or system hitches
      lastTime = currentTime - (elapsed % fpsInterval);
      update();
    }
    draw();
  }

  window.addEventListener('resize', resize);
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { press(); }  /* no preventDefault: keep page scroll working */
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') release();
  });
  document.addEventListener('mousedown', () => press());
  document.addEventListener('mouseup',   () => release());
  document.addEventListener('touchstart', () => press(), { passive: true });
  document.addEventListener('touchend',   () => release(), { passive: true });

  function startRunningGame() {
    if (window.__gameStarted) return;
    window.__gameStarted = true;
    init();
    requestAnimationFrame(loop);
  }

  window.addEventListener('siteLayoutReady', startRunningGame);
  window.addEventListener('load', startRunningGame);

})();