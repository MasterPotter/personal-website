// ===== GEOMETRY DASH STYLE BACKGROUND GAME =====
// Runs silently behind the site at low opacity

(function() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  let running = true;
  let score = 0;
  let frameCount = 0;
  let speed = 4.5;
  let gameOver = false;
  let restartTimer = 0;

  // Colors (using accent palette at low opacity — blends with site)
  const COLORS = {
    cube: '#6366F1',
    cubeOutline: '#4F46E5',
    ground: '#6366F1',
    obstacle: '#6366F1',
    spike: '#6366F1',
    star: '#6366F1',
    trail: '#6366F1',
    orb: '#6366F1',
  };

  // Player (cube)
  const CUBE_SIZE = 36;
  const GROUND_Y_RATIO = 0.78;
  let groundY;

  const player = {
    x: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    onGround: false,
    dead: false,
    trail: [],
    particles: [],
  };

  // Obstacles
  let obstacles = [];
  let bgStars = [];
  let orbits = [];
  let spawnTimer = 0;
  let spawnInterval = 90;

  // ===== RESIZE =====
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    groundY = H * GROUND_Y_RATIO;
    player.x = W * 0.18;
    if (!player.dead && player.y === 0) player.y = groundY - CUBE_SIZE;
  }

  // ===== INIT =====
  function init() {
    resize();
    player.y = groundY - CUBE_SIZE;
    player.vy = 0;
    player.rotation = 0;
    player.onGround = true;
    player.dead = false;
    player.trail = [];
    player.particles = [];
    obstacles = [];
    score = 0;
    speed = 4.5;
    gameOver = false;
    restartTimer = 0;
    spawnTimer = 0;
    spawnInterval = 80;

    // Background stars
    bgStars = Array.from({length: 60}, () => ({
      x: Math.random() * W,
      y: Math.random() * groundY * 0.9,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.4 + 0.1,
      speed: Math.random() * 0.4 + 0.1,
    }));
  }

  // ===== JUMP =====
  const GRAVITY = 0.68;
  const JUMP_FORCE = -13.5;

  function jump() {
    if (player.onGround && !player.dead && !gameOver) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }
  }

  // ===== SPAWN OBSTACLES =====
  function spawnObstacle() {
    const types = ['spike', 'double_spike', 'block', 'tall_block'];
    const weights = [3, 2, 2, 1];
    let r = Math.random() * 8;
    let type = types[0];
    let acc = 0;
    for (let i = 0; i < types.length; i++) {
      acc += weights[i];
      if (r < acc) { type = types[i]; break; }
    }

    const base = groundY;
    if (type === 'spike') {
      obstacles.push({ type: 'spike', x: W + 40, y: base, w: 28, h: 32 });
    } else if (type === 'double_spike') {
      obstacles.push({ type: 'spike', x: W + 40, y: base, w: 28, h: 32 });
      obstacles.push({ type: 'spike', x: W + 76, y: base, w: 28, h: 32 });
    } else if (type === 'block') {
      obstacles.push({ type: 'block', x: W + 40, y: base - 36, w: 36, h: 36 });
    } else if (type === 'tall_block') {
      obstacles.push({ type: 'block', x: W + 40, y: base - 72, w: 36, h: 72 });
    }
  }

  // ===== DRAW HELPERS =====
  function hex2rgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawCube(x, y, size, rot) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rot);
    const hs = size/2;
    // Shadow
    ctx.shadowColor = COLORS.cube;
    ctx.shadowBlur = 10;
    // Fill
    ctx.fillStyle = hex2rgba(COLORS.cube, 0.55);
    ctx.strokeStyle = hex2rgba(COLORS.cubeOutline, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, size, size, 5);
    ctx.fill();
    ctx.stroke();
    // Inner cross detail
    ctx.strokeStyle = hex2rgba(COLORS.cubeOutline, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-hs*0.4, -hs*0.4);
    ctx.lineTo(hs*0.4, hs*0.4);
    ctx.moveTo(hs*0.4, -hs*0.4);
    ctx.lineTo(-hs*0.4, hs*0.4);
    ctx.stroke();
    ctx.restore();
  }

  function drawSpike(x, y, w, h) {
    ctx.save();
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 8;
    ctx.fillStyle = hex2rgba(COLORS.spike, 0.6);
    ctx.strokeStyle = hex2rgba(COLORS.spike, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w/2, y - h);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBlock(x, y, w, h) {
    ctx.save();
    ctx.shadowColor = COLORS.obstacle;
    ctx.shadowBlur = 8;
    ctx.fillStyle = hex2rgba(COLORS.obstacle, 0.45);
    ctx.strokeStyle = hex2rgba(COLORS.obstacle, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGround() {
    // Ground line
    ctx.save();
    const grad = ctx.createLinearGradient(0, groundY, W, groundY);
    grad.addColorStop(0, hex2rgba(COLORS.ground, 0.0));
    grad.addColorStop(0.15, hex2rgba(COLORS.ground, 0.7));
    grad.addColorStop(0.85, hex2rgba(COLORS.ground, 0.7));
    grad.addColorStop(1, hex2rgba(COLORS.ground, 0.0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    // Ground glow strip
    ctx.fillStyle = hex2rgba(COLORS.ground, 0.06);
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.restore();

    // Scrolling tick marks
    const tick = (frameCount * speed) % 80;
    ctx.save();
    ctx.strokeStyle = hex2rgba(COLORS.ground, 0.2);
    ctx.lineWidth = 1;
    for (let x = -tick; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBgStars() {
    bgStars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = hex2rgba(COLORS.star, s.alpha);
      ctx.fill();
      s.x -= s.speed;
      if (s.x < 0) { s.x = W; s.y = Math.random() * groundY * 0.9; }
    });
  }

  // Scrolling background grid
  let bgOffset = 0;
  function drawBgGrid() {
    bgOffset = (bgOffset + speed * 0.15) % 60;
    ctx.save();
    ctx.strokeStyle = hex2rgba(COLORS.ground, 0.04);
    ctx.lineWidth = 1;
    for (let x = -bgOffset; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, groundY); ctx.stroke();
    }
    for (let y = 0; y < groundY; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  // ===== COLLISION =====
  function checkCollision() {
    const px = player.x + 3, py = player.y + 3;
    const ps = CUBE_SIZE - 6;
    for (const obs of obstacles) {
      if (obs.type === 'spike') {
        // Triangle collision (simplified AABB shrunk)
        if (px < obs.x + obs.w - 4 && px + ps > obs.x + 4 &&
            py + ps > obs.y - obs.h * 0.7 && py < obs.y) {
          return true;
        }
      } else {
        if (px < obs.x + obs.w && px + ps > obs.x &&
            py < obs.y + obs.h && py + ps > obs.y) {
          return true;
        }
      }
    }
    return false;
  }

  // ===== DEATH PARTICLES =====
  function spawnDeathParticles() {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 / 18) * i + Math.random() * 0.3;
      const spd = Math.random() * 5 + 2;
      player.particles.push({
        x: player.x + CUBE_SIZE/2,
        y: player.y + CUBE_SIZE/2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        life: 1,
        size: Math.random() * 6 + 3,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  function updateDrawParticles() {
    player.particles = player.particles.filter(p => p.life > 0);
    player.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.rot += p.rotSpeed;
      p.life -= 0.025;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = COLORS.cube;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    });
  }

  // ===== TRAIL =====
  function updateTrail() {
    if (!player.dead) {
      player.trail.push({ x: player.x + CUBE_SIZE/2, y: player.y + CUBE_SIZE/2, age: 0 });
      if (player.trail.length > 12) player.trail.shift();
    }
    player.trail.forEach((t, i) => {
      t.age++;
      const alpha = (1 - t.age / 14) * 0.3;
      const size = (1 - t.age / 14) * 6;
      if (alpha > 0) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = hex2rgba(COLORS.trail, alpha);
        ctx.fill();
      }
    });
  }

  // ===== SCORE DISPLAY =====
  function updateScoreDisplay() {
    const el = document.getElementById('game-score');
    if (el) el.textContent = `Score: ${Math.floor(score)}`;
  }

  // ===== MAIN LOOP =====
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);

    frameCount++;

    // BG
    drawBgGrid();
    drawBgStars();

    if (!gameOver) {
      // Speed ramp
      speed = 4.5 + Math.floor(score / 200) * 0.3;

      // Gravity
      player.vy += GRAVITY;
      player.y += player.vy;

      // Ground
      if (player.y >= groundY - CUBE_SIZE) {
        player.y = groundY - CUBE_SIZE;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      // Rotation
      if (!player.onGround) {
        player.rotation += 0.08;
      } else {
        player.rotation = Math.round(player.rotation / (Math.PI/2)) * (Math.PI/2);
      }

      // Spawn obstacles
      spawnTimer++;
      if (spawnTimer >= spawnInterval) {
        spawnObstacle();
        spawnTimer = 0;
        spawnInterval = Math.max(45, 80 - Math.floor(score / 150) * 3);
      }

      // Move obstacles
      obstacles = obstacles.filter(o => o.x > -100);
      obstacles.forEach(o => { o.x -= speed; });

      // Collision
      if (checkCollision()) {
        gameOver = true;
        player.dead = true;
        spawnDeathParticles();
      }

      score += 0.08 * (speed / 4.5);
    } else {
      restartTimer++;
      if (restartTimer > 120) {
        init();
        return;
      }
    }

    // Draw ground
    drawGround();

    // Draw obstacles
    obstacles.forEach(o => {
      if (o.type === 'spike') drawSpike(o.x, o.y, o.w, o.h);
      else drawBlock(o.x, o.y, o.w, o.h);
    });

    // Trail
    updateTrail();

    // Draw cube
    if (!player.dead) {
      drawCube(player.x, player.y, CUBE_SIZE, player.rotation);
    }

    // Particles
    updateDrawParticles();

    updateScoreDisplay();
  }

  // ===== INPUT =====
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  });

  document.addEventListener('touchstart', e => {
    // Only jump if not tapping a nav/button
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
    jump();
  }, { passive: true });

  document.addEventListener('click', e => {
    if (e.target.id === 'game-toggle') return;
    jump();
  });

  // Toggle
  const toggleBtn = document.getElementById('game-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (running) {
        running = false;
        canvas.style.opacity = '0';
        toggleBtn.textContent = 'GAME: OFF';
      } else {
        running = true;
        canvas.style.opacity = '0.18';
        toggleBtn.textContent = 'GAME: ON';
        loop();
      }
    });
  }

  // ===== START =====
  window.addEventListener('resize', () => { resize(); });
  init();
  loop();
})();
