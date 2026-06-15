/* ============================================================
   GD-lite v5.4 - Natural Transitions & Ball Ground-Lock Fix
   ============================================================ */

(function () {

  /* ── Canvas ────────────────────────────────────────────────── */
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Toggle button ─────────────────────────────────────────── */
  let gameEnabled = true;
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'game-toggle';
  toggleBtn.textContent = '▶ Game ON';
  toggleBtn.setAttribute('aria-label', 'Toggle background game');
  Object.assign(toggleBtn.style, {
    position: 'fixed', bottom: '18px', right: '18px', zIndex: '200',
    padding: '6px 14px', fontSize: '11px', fontFamily: '"DM Sans", sans-serif',
    fontWeight: '600', letterSpacing: '0.06em',
    background: 'rgba(247,247,245,0.85)', border: '1px solid #E2E8F0',
    borderRadius: '20px', color: '#64748B', cursor: 'pointer',
    backdropFilter: 'blur(8px)', transition: 'all 0.2s',
  });
  toggleBtn.addEventListener('mouseenter', () => { toggleBtn.style.color = '#0D9488'; toggleBtn.style.borderColor = '#99F6E4'; });
  toggleBtn.addEventListener('mouseleave', () => { toggleBtn.style.color = '#64748B'; toggleBtn.style.borderColor = '#E2E8F0'; });
  toggleBtn.addEventListener('click', () => {
    gameEnabled = !gameEnabled;
    canvas.style.opacity = gameEnabled ? '0.14' : '0';
    toggleBtn.textContent = gameEnabled ? '▶ Game ON' : '◼ Game OFF';
  });
  document.body.appendChild(toggleBtn);

  /* ── Score display ─────────────────────────────────────────── */
  const scoreEl = document.createElement('div');
  scoreEl.id = 'game-score';
  Object.assign(scoreEl.style, {
    position: 'fixed', top: '72px', right: '18px', zIndex: '200',
    fontSize: '11px', fontFamily: '"DM Sans", sans-serif', fontWeight: '700',
    color: '#0D9488', letterSpacing: '0.08em', opacity: '0.45',
    pointerEvents: 'none', userSelect: 'none', lineHeight: '1.6', textAlign: 'right',
  });
  document.body.appendChild(scoreEl);

  /* ── roundRect polyfill ────────────────────────────────────── */
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

  /* ── Physics constants ─────────────────────────────────────── */
  const BASE_SPEED = 5.5;
  const GRAVITY    = 0.82;
  const JUMP_VY    = -16.5;
  const JUMP_CUT   = 0.42;
  const MAX_FALL   = 16;

  /* ── Mode colors ───────────────────────────────────────────── */
  const MODE_COLOR = {
    cube: { fill: '#0D9488', glow: 'rgba(13,148,136,',  ring: '#99F6E4',  label: '■ CUBE'  },
    ship: { fill: '#818CF8', glow: 'rgba(129,140,248,', ring: '#C7D2FE',  label: '▲ SHIP'  },
    wave: { fill: '#38BDF8', glow: 'rgba(56,189,248,',  ring: '#BAE6FD',  label: '◆ WAVE'  },
    ball: { fill: '#F472B6', glow: 'rgba(244,114,182,', ring: '#FBCFE8',  label: '● BALL'  },
  };

  /* ── ORB definitions ───────────────────────────────────────── */
  const ORB_DEFS = {
    jump: {
      fill: '#F59E0B', ring: '#FDE68A', glow: 'rgba(245,158,11,0.5)',
      symbol: '↑', label: 'JUMP',
      action(p) { p.vy = JUMP_VY * 1.1; p.onGround = false; p.gravFlipped = false; },
    },
    gravity: {
      fill: '#EC4899', ring: '#FBCFE8', glow: 'rgba(236,72,153,0.5)',
      symbol: '↕', label: 'FLIP',
      action(p) { p.gravFlipped = !p.gravFlipped; p.vy = p.gravFlipped ? 8 : -8; p.onGround = false; },
    },
    dash: {
      fill: '#38BDF8', ring: '#BAE6FD', glow: 'rgba(56,189,248,0.5)',
      symbol: '→', label: 'DASH',
      action() { speed = baseSpeed * 2.0; setTimeout(() => { if (!dying && !dead) speed = baseSpeed; }, 1000); },
    },
    spider: {
      fill: '#34D399', ring: '#A7F3D0', glow: 'rgba(52,211,153,0.5)',
      symbol: '⇅', label: 'TELE',
      action(p) {
        const mid = (groundY + ceilY) / 2;
        p.y = p.y < mid ? groundY - p.h - 4 : ceilY + 4;
        p.vy = 0; p.onGround = false; p.gravFlipped = p.y <= mid;
      },
    },
  };
  const ORB_KEYS = Object.keys(ORB_DEFS);

  /* ── Dimensions ────────────────────────────────────────────── */
  let W, H, groundY, ceilY;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    groundY = H - 80;
    ceilY   = 70;
    P.x = Math.round(W * 0.20);
    if (!dying && !dead) snapToGround();
  }

  /* ── Player ────────────────────────────────────────────────── */
  const P = {
    x: 0, y: 0, w: 30, h: 30,
    vy: 0, rot: 0,
    onGround: false,
    holding: false,
    waveUp: false,
    gravFlipped: false,
    trail: [],
    coyote: 0,
  };

  function snapToGround() {
    P.y = groundY - P.h;
    P.vy = 0; P.onGround = true; P.coyote = 0; P.gravFlipped = false;
  }

  /* ── Game state ────────────────────────────────────────────── */
  let mode = 'cube';
  let frame = 0, score = 0, deaths = 0;
  let speed = BASE_SPEED, baseSpeed = BASE_SPEED;
  let dying = false, dead = false;
  let deathTimer = 0, flashAlpha = 0;
  let reversed = false, reverseTimer = 0;
  let ballSwitched = false;

  let obstacles = [], platforms = [], orbs = [], portals = [];
  let particles = [], stars = [], bgSquares = [];

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    resize();
    snapToGround();
    P.rot = 0; P.trail = []; P.holding = false; P.waveUp = false;
    ballSwitched = false;

    obstacles.length = 0; platforms.length = 0;
    orbs.length = 0; portals.length = 0;
    particles.length = 0; bgSquares.length = 0;

    frame = 0; score = 0; speed = baseSpeed = BASE_SPEED;
    dying = false; dead = false; deathTimer = 0; flashAlpha = 0;
    reversed = false; reverseTimer = 0;
    mode = 'cube';

    for (let i = 0; i < 14; i++) bgSquares.push(makeBGSq(Math.random() * W));
    stars.length = 0;
    for (let i = 0; i < 40; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8,
                   r: 0.4 + Math.random() * 1.4, sp: 0.1 + Math.random() * 0.3 });
    }
  }

  function makeBGSq(x) {
    const s = 12 + Math.random() * 36;
    return { x, y: Math.random() * (groundY * 0.85), w: s, h: s,
             sp: 0.2 + Math.random() * 0.5, a: 0.03 + Math.random() * 0.07 };
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  function mc() { return MODE_COLOR[mode] || MODE_COLOR.cube; }
  function modeGlow(a) { return mc().glow + a + ')'; }

  /* ── Spawning ──────────────────────────────────────────────── */
  function maybeSpawn() {
    if (reversed) return;
    const lastObs = obstacles.length ? obstacles[obstacles.length - 1].x : 0;
    const lastPort = portals.length  ? portals[portals.length - 1].x    : 0;
    const lastX = Math.max(lastObs, lastPort);
    if (lastX < W * 0.85) spawnSegment();
  }

  function spawnSegment() {
    const gap = 340 + Math.random() * 180;
    const ox  = W + gap;
    const r   = Math.random();

    if (Math.random() < 0.38) {
      const MODES_LIST = ['cube', 'ship', 'wave', 'ball'];
      const nextMode = MODES_LIST.filter(m => m !== mode)[Math.floor(Math.random() * 3)];
      const portalY = (mode === 'ship' || mode === 'wave')
        ? ceilY + (groundY - ceilY) * 0.4
        : groundY - P.h / 2 - 25;
      portals.push({
        x: ox - 60,
        y: portalY,
        r: 36,
        newMode: nextMode,
        passed: false,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    if (mode === 'ship' || mode === 'wave') {
      if (r < 0.45) {
        const bh = 28 + Math.random() * 36;
        obstacles.push({ type: 'block', x: ox, y: ceilY, w: 26, h: bh });
      } else if (r < 0.75) {
        const fy = ceilY + 50 + Math.random() * ((groundY - ceilY) * 0.5 - 30);
        obstacles.push({ type: 'block', x: ox, y: fy, w: 26, h: 26 });
      } else {
        const bh = 22 + Math.random() * 24;
        obstacles.push({ type: 'block', x: ox, y: ceilY,       w: 26, h: bh });
        obstacles.push({ type: 'block', x: ox, y: groundY - bh, w: 26, h: bh });
      }
    } else if (mode === 'ball') {
      if (r < 0.35) {
        obstacles.push({ type: 'spike',     x: ox,      y: groundY, w: 28, h: 34 });
      } else if (r < 0.65) {
        obstacles.push({ type: 'ceilSpike', x: ox,      y: ceilY,   w: 28, h: 34 });
      } else {
        obstacles.push({ type: 'spike',     x: ox,      y: groundY, w: 28, h: 34 });
        obstacles.push({ type: 'ceilSpike', x: ox + 55, y: ceilY,   w: 28, h: 34 });
      }
    } else {
      if (!P.gravFlipped) {
        if (r < 0.28) {
          obstacles.push({ type: 'spike', x: ox, y: groundY, w: 28, h: 34 });
        } else if (r < 0.50) {
          obstacles.push({ type: 'spike', x: ox,      y: groundY, w: 28, h: 34 });
          obstacles.push({ type: 'spike', x: ox + 42, y: groundY, w: 28, h: 34 });
        } else if (r < 0.65) {
          obstacles.push({ type: 'block', x: ox, y: groundY - 32, w: 32, h: 32 });
        } else if (r < 0.80) {
          obstacles.push({ type: 'block', x: ox, y: groundY - 64, w: 32, h: 64 });
        } else {
          obstacles.push({ type: 'block', x: ox,      y: groundY - 32, w: 32, h: 32 });
          obstacles.push({ type: 'spike', x: ox + 52, y: groundY,      w: 28, h: 34 });
        }
      } else {
        if (r < 0.28) {
          obstacles.push({ type: 'ceilSpike', x: ox, y: ceilY, w: 28, h: 34 });
        } else if (r < 0.50) {
          obstacles.push({ type: 'ceilSpike', x: ox,      y: ceilY, w: 28, h: 34 });
          obstacles.push({ type: 'ceilSpike', x: ox + 42, y: ceilY, w: 28, h: 34 });
        } else if (r < 0.65) {
          obstacles.push({ type: 'block', x: ox, y: ceilY, w: 32, h: 32 });
        } else if (r < 0.80) {
          obstacles.push({ type: 'block', x: ox, y: ceilY, w: 32, h: 64 });
        } else {
          obstacles.push({ type: 'block',     x: ox,      y: ceilY, w: 32, h: 32 });
          obstacles.push({ type: 'ceilSpike', x: ox + 52, y: ceilY, w: 28, h: 34 });
        }
      }
    }

    if ((mode === 'cube' || mode === 'ball') && Math.random() < 0.32) {
      const jumpReach = Math.floor((JUMP_VY * JUMP_VY) / (2 * GRAVITY));
      if (!P.gravFlipped) {
        const platY = groundY - 60 - Math.random() * (jumpReach * 0.7);
        platforms.push({ x: ox + 80 + Math.random() * 80, y: platY, w: 55 + Math.random() * 40, h: 12 });
      } else {
        const platY = ceilY + 50 + Math.random() * (jumpReach * 0.7);
        platforms.push({ x: ox + 80 + Math.random() * 80, y: platY, w: 55 + Math.random() * 40, h: 12 });
      }
    }

    if (Math.random() < 0.28) {
      const orbKey = ORB_KEYS[Math.floor(Math.random() * ORB_KEYS.length)];
      let orbY;
      if (mode === 'ship' || mode === 'wave') {
        orbY = ceilY + (groundY - ceilY) * (0.25 + Math.random() * 0.5);
      } else if (P.gravFlipped) {
        const jumpReach = Math.floor((JUMP_VY * JUMP_VY) / (2 * GRAVITY));
        orbY = ceilY + 60 + Math.random() * (jumpReach * 0.55);
      } else {
        const jumpReach = Math.floor((JUMP_VY * JUMP_VY) / (2 * GRAVITY));
        orbY = groundY - 80 - Math.random() * (jumpReach * 0.55);
      }
      orbs.push({ x: ox + 50 + Math.random() * 40, y: orbY, r: 12, hit: false, kind: orbKey });
    }
  }

  /* ── Input ─────────────────────────────────────────────────── */
  function press() {
    if (dead)  { if (deathTimer > 50) init(); return; }
    if (dying) return;
    P.holding = true;

    if (mode === 'cube') {
      if (P.onGround || P.coyote > 0) {
        P.vy = P.gravFlipped ? Math.abs(JUMP_VY) : JUMP_VY;
        P.onGround = false; P.coyote = 0;
        spawnParts(P.x + P.w / 2, P.y + P.h / 2, 4, modeGlow(0.5), false);
      }
    }

    // FIXED: Added P.onGround condition so you cannot cheese the game by flipping mid-air
    if (mode === 'ball' && P.onGround && !ballSwitched) {
      P.gravFlipped = !P.gravFlipped;
      P.vy = P.gravFlipped ? Math.abs(JUMP_VY) * 0.55 : -Math.abs(JUMP_VY) * 0.55;
      P.onGround = false;
      ballSwitched = true;
      spawnParts(P.x + P.w / 2, P.y + P.h / 2, 4, modeGlow(0.5), false);
    }
    P.waveUp = true;
  }

  function release() {
    P.holding = false; P.waveUp = false;
    ballSwitched = false;
    if (mode === 'cube' && !P.gravFlipped && P.vy < 0) P.vy *= JUMP_CUT;
    if (mode === 'cube' &&  P.gravFlipped && P.vy > 0) P.vy *= JUMP_CUT;
  }

  /* ── Die ───────────────────────────────────────────────────── */
  function die() {
    if (dying || dead) return;
    dying = true; deaths++;
    flashAlpha = 0.5;
    spawnParts(P.x + P.w / 2, P.y + P.h / 2, 22, modeGlow(0.6), true);
  }

  /* ── Particles ─────────────────────────────────────────────── */
  function spawnParts(x, y, n, color, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = big ? 2 + Math.random() * 6 : 0.8 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-(big?1.5:0.3),
                       r: big?3+Math.random()*5:1.5+Math.random()*2.5,
                       life: big?0.8+Math.random()*0.5:0.55+Math.random()*0.3, color });
    }
  }

  /* ── Collision Detection ───────────────────────────────────── */
  function blockCollision(px, py, pw, ph, bx, by, bw, bh) {
    const pad = 2;
    if (px + pw - pad <= bx || px + pad >= bx + bw) return null;
    if (py + ph - pad <= by || py + pad >= by + bh) return null;

    const overlapLeft  = (px + pw) - bx;
    const overlapRight = (bx + bw) - px;
    const overlapTop   = (py + ph) - by;
    const overlapBot   = (by + bh) - py;

    const minH = Math.min(overlapLeft, overlapRight);
    const minV = Math.min(overlapTop, overlapBot);

    if (minV < minH) {
      if (overlapTop < overlapBot) return 'top';
      return 'bottom';
    }
    return 'side';
  }

  /* ── Spike Detection ───────────────────────────────────────── */
  function spikeHit(px, py, pw, ph, sx, sy, sw, sh, ceil) {
    const hx = sx + 5, hw = sw - 10;
    const hy = ceil ? sy : sy - sh;
    const hh = sh - 4;
    const pad = 3;
    return !(px+pad > hx+hw || px+pw-pad < hx || py+pad > hy+hh || py+ph-pad < hy);
  }

  /* ── Update ────────────────────────────────────────────────── */
  function update() {
    if (!gameEnabled) return;

    if (dying) {
      deathTimer++;
      flashAlpha = Math.max(0, flashAlpha - 0.02);
      tickParticles();
      if (deathTimer >= 55) { dying = false; dead = true; deathTimer = 0; }
      return;
    }
    if (dead) { deathTimer++; tickParticles(); return; }

    frame++; score++;

    if (frame % 340 === 0 && baseSpeed < 9.0) {
      baseSpeed += 0.15;
      if (!reversed) speed = baseSpeed;
    }

    if (!reversed && frame > 800 && Math.random() < 0.0003) {
      reversed = true; reverseTimer = 130;
      speed = -baseSpeed * 0.6;
    }
    if (reversed) { reverseTimer--; if (reverseTimer <= 0) { reversed = false; speed = baseSpeed; } }

    /* ── Physics ─────────────────────────────────────────────── */
    const gDir = (mode === 'cube' && P.gravFlipped) ? -1
               : (mode === 'ball' && P.gravFlipped) ? -1 : 1;

    if (mode === 'cube') {
      P.vy += GRAVITY * gDir;
      P.vy = Math.max(-MAX_FALL, Math.min(MAX_FALL, P.vy));
      P.y += P.vy;
      if (P.onGround) P.coyote = 6; else if (P.coyote > 0) P.coyote--;
      P.onGround = false;
    } else if (mode === 'ship') {
      const thrust = P.holding ? -0.75 : 0;
      P.vy += GRAVITY * 0.38 + thrust;
      P.vy = Math.max(-10, Math.min(10, P.vy));
      P.y += P.vy;
    } else if (mode === 'wave') {
      P.vy = P.waveUp ? -5.8 : 5.8;
      P.y += P.vy;
    } else if (mode === 'ball') {
      P.vy += GRAVITY * 0.9 * gDir;
      P.vy = Math.max(-14, Math.min(14, P.vy));
      P.y += P.vy;
      P.onGround = false;
    }

    /* ── Ground boundary ─────────────────────────────────────── */
    if (P.y + P.h >= groundY) {
      P.y = groundY - P.h;
      if (mode === 'ship' || mode === 'wave') { die(); return; }
      P.vy = 0; P.onGround = true;
    }

/* ── Ceiling boundary ────────────────────────────────────── */
if (P.y <= ceilY) {

  if (mode === 'ship' || mode === 'wave') {
    die();
    return;
  }

  // stick to ceiling when gravity is inverted
  if (mode === 'ball' || P.gravFlipped) {
    P.y = ceilY;
    P.vy = 0;
    P.onGround = true;
  } else {
    P.y = ceilY;
    P.vy = Math.abs(P.vy) * 0.3;
  }
}
    /* ── Rotation ────────────────────────────────────────────── */
    if (mode === 'cube') {
      const spin = reversed ? -5 : 5;
      if (!P.onGround) P.rot += P.gravFlipped ? -spin : spin;
      else P.rot = Math.round(P.rot / 90) * 90;
    } else if (mode === 'ship') {
      P.rot = P.vy * 3.2;
    } else if (mode === 'ball') {
      P.rot += (reversed ? -7 : 7) * (P.gravFlipped ? -1 : 1);
    } else {
      P.rot = P.waveUp ? -32 : 32;
    }

    /* ── Trail ───────────────────────────────────────────────── */
    P.trail.push({ x: P.x + P.w / 2, y: P.y + P.h / 2, life: 1 });
    if (P.trail.length > 12) P.trail.shift();
    for (let i = 0; i < P.trail.length; i++) P.trail[i].life -= 0.09;

    /* ── Move world ──────────────────────────────────────────── */
    for (let i = 0; i < obstacles.length; i++) obstacles[i].x -= speed;
    for (let i = 0; i < platforms.length; i++) platforms[i].x -= speed;
    for (let i = 0; i < orbs.length;      i++) orbs[i].x      -= speed;
    for (let i = 0; i < portals.length;   i++) portals[i].x   -= speed;
    for (let i = 0; i < bgSquares.length; i++) {
      const b = bgSquares[i];
      b.x -= b.sp * (reversed ? -1 : 1);
      if (b.x + b.w < 0) { b.x = W + b.w; b.y = Math.random() * groundY * 0.85; }
      if (b.x > W + b.w) { b.x = -b.w; }
    }
    for (let i = 0; i < stars.length; i++) {
      stars[i].x -= stars[i].sp;
      if (stars[i].x < 0) { stars[i].x = W; stars[i].y = Math.random() * H * 0.8; }
    }

    prune(obstacles, o => o.x + o.w > -60 && o.x < W + 500);
    prune(platforms, p => p.x + p.w > -60);
    prune(orbs,      o => o.x > -60);
    prune(portals,   p => p.x > -p.r * 3);

    maybeSpawn();

    /* ── Platform collision ──────────────────────────────────── */
    for (let i = 0; i < platforms.length; i++) {
      const pl = platforms[i];
      if (mode === 'cube' || mode === 'ball') {
        if (!P.gravFlipped) {
          if (P.vy >= 0 && P.x + P.w > pl.x + 3 && P.x < pl.x + pl.w - 3 &&
              P.y + P.h >= pl.y && P.y + P.h <= pl.y + pl.h + Math.abs(P.vy) + 2) {
            P.y = pl.y - P.h; P.vy = 0; P.onGround = true;
          }
        } else {
          if (P.vy <= 0 && P.x + P.w > pl.x + 3 && P.x < pl.x + pl.w - 3 &&
              P.y <= pl.y + pl.h && P.y >= pl.y - Math.abs(P.vy) - 2) {
            P.y = pl.y + pl.h; P.vy = 0; P.onGround = true;
          }
        }
      }
    }

    /* ── Orb collision ───────────────────────────────────────── */
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      if (o.hit) continue;
      if (Math.hypot(P.x + P.w / 2 - o.x, P.y + P.h / 2 - o.y) < o.r + P.w * 0.38) {
        o.hit = true;
        ORB_DEFS[o.kind].action(P);
        spawnParts(o.x, o.y, 8, ORB_DEFS[o.kind].glow, false);
      }
    }

    /* ── Portal collision ────────────────────────────────────── */
    for (let i = 0; i < portals.length; i++) {
      const port = portals[i];
      if (port.passed) continue;
      const dx = P.x + P.w / 2 - port.x;
      const dy = P.y + P.h / 2 - port.y;
      if (Math.hypot(dx, dy) < port.r + 4) {
        port.passed = true;
        changeMode(port.newMode);
      }
    }

    /* ── Obstacle collision ──────────────────────────────────── */
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];

      if (o.type === 'spike') {
        if (spikeHit(P.x, P.y, P.w, P.h, o.x, o.y, o.w, o.h, false)) { die(); return; }
        continue;
      }
      if (o.type === 'ceilSpike') {
        if (spikeHit(P.x, P.y, P.w, P.h, o.x, o.y, o.w, o.h, true)) { die(); return; }
        continue;
      }

      const face = blockCollision(P.x, P.y, P.w, P.h, o.x, o.y, o.w, o.h);
      if (face === 'top') {
        if (!P.gravFlipped) {
          P.y = o.y - P.h; P.vy = 0; P.onGround = true;
        } else if (P.gravFlipped && mode === 'ball') {
          P.y = o.y - P.h; P.vy = 0; P.onGround = true;
        } else {
          die(); return;
        }
      } else if (face === 'bottom') {
        if (P.gravFlipped) {
          P.y = o.y + o.h; P.vy = 0; P.onGround = true;
        } else if (!P.gravFlipped && mode === 'ball') {
          P.y = o.y + o.h; P.vy = 0; P.onGround = true;
        } else {
          die(); return;
        }
      } else if (face === 'side') {
        die(); return;
      }
    }

    tickParticles();

    if (frame % 8 === 0) {
      scoreEl.innerHTML = mc().label + '<br>' + score + ' pts &nbsp;✦&nbsp; ' + deaths + '✕';
    }
  }

  /* ── Mode change ───────────────────────────────────────────── */
  function changeMode(newMode) {
    mode = newMode;
    if (mode === 'cube') {
      P.gravFlipped = false;
    }
    spawnParts(P.x + P.w / 2, P.y + P.h / 2, 12, modeGlow(0.55), false);
  }

  function prune(arr, keep) {
    let w = 0;
    for (let i = 0; i < arr.length; i++) { if (keep(arr[i])) arr[w++] = arr[i]; }
    arr.length = w;
  }

  function tickParticles() {
    let w = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life -= 0.025;
      if (p.life > 0) particles[w++] = p;
    }
    particles.length = w;
  }

  /* ── Draw ──────────────────────────────────────────────────── */
  function draw() {
    if (!gameEnabled) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);

    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /* Stars */
    ctx.fillStyle = 'rgba(13,148,136,0.4)';
    ctx.beginPath();
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, Math.max(0.1, s.r), 0, Math.PI * 2);
    }
    ctx.fill();

    /* BG squares */
    ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 1;
    for (let i = 0; i < bgSquares.length; i++) {
      const b = bgSquares[i];
      ctx.globalAlpha = b.a;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    ctx.globalAlpha = 1;

    /* Ceiling & ground fills */
    ctx.fillStyle = '#0D9488'; ctx.globalAlpha = 0.09;
    ctx.fillRect(0, 0, W, ceilY);
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.globalAlpha = 1;

    /* Ground & ceiling lines */
    ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 2; ctx.globalAlpha = 0.38;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ceilY);   ctx.lineTo(W, ceilY);   ctx.stroke();
    ctx.globalAlpha = 1;

    /* Ground grid */
    ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.07;
    const gs = 36, gox = (frame * Math.abs(speed) * 0.18) % gs;
    ctx.beginPath();
    for (let gx = -gox; gx < W; gx += gs) { ctx.moveTo(gx, groundY); ctx.lineTo(gx, H); }
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* Platforms */
    for (let i = 0; i < platforms.length; i++) {
      const pl = platforms[i];
      ctx.fillStyle = '#99F6E4';
      ctx.globalAlpha = 1.0;
      rr(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* Mode portals */
    for (let i = 0; i < portals.length; i++) {
      const port = portals[i];
      if (port.passed) continue;
      const mc2   = MODE_COLOR[port.newMode];
      const pulse = 1 + 0.12 * Math.sin(frame * 0.1 + port.pulse);
      const R     = port.r * pulse;

      const g1 = ctx.createRadialGradient(port.x, port.y, R * 0.3, port.x, port.y, R * 2.5);
      g1.addColorStop(0, mc2.glow + '0.5)');
      g1.addColorStop(1, mc2.glow + '0)');
      ctx.beginPath(); ctx.arc(port.x, port.y, R * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = g1; ctx.globalAlpha = 1; ctx.fill();

      ctx.beginPath(); ctx.arc(port.x, port.y, R, 0, Math.PI * 2);
      ctx.strokeStyle = mc2.ring; ctx.lineWidth = 5;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      ctx.beginPath(); ctx.arc(port.x, port.y, R * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = mc2.fill; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.stroke();

      ctx.beginPath(); ctx.arc(port.x, port.y, R * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = mc2.fill;
      ctx.globalAlpha = 0.5;
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.font = `700 ${Math.round(R * 0.38)}px "DM Sans", sans-serif`;
      ctx.fillStyle = mc2.fill;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mc2.label.split(' ')[1], port.x, port.y);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }

    /* Orbs */
    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];
      if (orb.hit) continue;
      const def   = ORB_DEFS[orb.kind];
      const pulse = 1 + 0.15 * Math.sin(frame * 0.12 + i);
      const R     = Math.max(0.1, orb.r * pulse);

      const grd = ctx.createRadialGradient(orb.x, orb.y, R * 0.3, orb.x, orb.y, R * 2.2);
      grd.addColorStop(0, def.glow); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(orb.x, orb.y, R * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.globalAlpha = 0.8;
      ctx.fill();

      ctx.beginPath(); ctx.arc(orb.x, orb.y, R, 0, Math.PI * 2);
      ctx.strokeStyle = def.ring; ctx.lineWidth = 3.5;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      ctx.beginPath(); ctx.arc(orb.x, orb.y, R * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = def.fill;
      ctx.globalAlpha = 1.0;
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.font = `bold ${Math.max(8, Math.round(R * 0.95))}px "DM Sans", sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, orb.x, orb.y + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }

    /* Obstacles */
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.type === 'spike' || o.type === 'ceilSpike') {
        ctx.beginPath();
        if (o.type === 'spike') {
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w / 2, o.y - o.h); ctx.lineTo(o.x + o.w, o.y);
        } else {
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w / 2, o.y + o.h); ctx.lineTo(o.x + o.w, o.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#0F766E';
        ctx.globalAlpha = 1.0;
        ctx.fill();
        ctx.strokeStyle = '#14B8A6'; ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#0F766E';
        ctx.globalAlpha = 1.0;
        rr(o.x, o.y, o.w, o.h, 3); ctx.fill();
        ctx.strokeStyle = '#0D9488'; ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(o.x+5, o.y+5); ctx.lineTo(o.x+o.w-5, o.y+o.h-5);
        ctx.moveTo(o.x+o.w-5, o.y+5); ctx.lineTo(o.x+5, o.y+o.h-5);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    /* Particles rendering */
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* Player Rendering */
    if (!dying && !dead) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2);
      ctx.rotate(P.rot * Math.PI / 180);

      const haloR = Math.max(1, P.w * 0.95);
      const g2 = ctx.createRadialGradient(0, 0, 2, 0, 0, haloR);
      g2.addColorStop(0, modeGlow(0.4));
      g2.addColorStop(1, modeGlow(0));
      ctx.fillStyle = g2;
      ctx.fillRect(-P.w, -P.h, P.w * 2, P.h * 2);

      ctx.fillStyle = mc().fill;

      if (mode === 'cube') {
        rr(-P.w/2, -P.h/2, P.w, P.h, 5); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.strokeRect(-P.w/4, -P.h/4, P.w/2, P.h/2);
      } else if (mode === 'ship') {
        ctx.beginPath();
        ctx.moveTo(-P.w/2, P.h/3); ctx.lineTo(P.w/2, 0); ctx.lineTo(-P.w/2, -P.h/3);
        ctx.lineTo(-P.w/4, 0); ctx.closePath(); ctx.fill();
      } else if (mode === 'wave') {
        ctx.beginPath();
        ctx.moveTo(-P.w/2, 0); ctx.lineTo(0, -P.h/3); ctx.lineTo(P.w/2, 0); ctx.lineTo(0, P.h/3);
        ctx.closePath(); ctx.fill();
      } else if (mode === 'ball') {
        ctx.beginPath();
        ctx.arc(0, 0, P.w/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-P.w/2, 0); ctx.lineTo(P.w/2, 0); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ── Engine Loop ───────────────────────────────────────────── */
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Run
  init();
  loop();

  // Global listeners
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') press(); });
  window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') release(); });
  window.addEventListener('mousedown', press);
  window.addEventListener('mouseup', release);
  window.addEventListener('touchstart', e => {
    if (e.target.tagName !== 'BUTTON') { press(); }
  }, { passive: false });
  window.addEventListener('touchend', release);

})();