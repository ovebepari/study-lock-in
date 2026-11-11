// ===== THEME (fast cache to prevent flash) =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme-cache', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (state) {
    state.theme = next;
    saveUIState();  // localStorage only — no TOML write
    console.log('[ui-state] theme →', next);
  }
}
applyTheme(localStorage.getItem('theme-cache') || 'light');

// ===== DIM / FOCUS MODE =====
let dimMode = localStorage.getItem('dim-mode') === 'true';

// ── Zen Audio — looping lo-fi study music ──
const zenAudio = (() => {
  // Zen Audio instantiation (with baseurl support)
  const siteCfgEl = document.getElementById('site-config');
  const siteCfg = siteCfgEl ? JSON.parse(siteCfgEl.textContent || '{}') : {};
  const audioSrc = (siteCfg.baseurl && siteCfg.baseurl !== '/' ? siteCfg.baseurl + '/' : '') + 'zen-music.mp3';
  const audio = new Audio(audioSrc);
  audio.loop = true;
  audio.volume = 0;
  let running = false;
  let fadeTimer = null;

  function fade(target, duration) {
    if (fadeTimer) cancelAnimationFrame(fadeTimer);
    const start = audio.volume;
    const diff = target - start;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      audio.volume = start + diff * t;
      if (t < 1) fadeTimer = requestAnimationFrame(step);
    }
    fadeTimer = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    audio.play().then(() => fade(0.45, 1500)).catch(() => {});
  }

  function stop() {
    if (!running) return;
    running = false;
    fade(0, 1500);
    setTimeout(() => { if (!running) audio.pause(); }, 1600);
  }

  return { start, stop, get running() { return running; } };
})();
// ── Zen Focus Reminder (browser notifications) ──
let zenReminderInterval = null;
const ZEN_NUDGES = [
  '🌿 Your study session is waiting…',
  '📖 Come back and focus!',
  '🧘 Zen mode is still on — time to study.',
  '🎯 Stay on track, get back to your tasks!',
  '💡 5 minutes gone — are you still studying?',
];

// Gentle bell "tung" — warm, inviting single-strike chime
function playTung() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Main bell tone (G5 ~784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc1.connect(gain1).connect(ctx.destination);

    // Soft harmonic overtone (octave above, quieter)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1568, now);
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc2.connect(gain2).connect(ctx.destination);

    // Warm low body (fundamental, one octave below)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(392, now);
    gain3.gain.setValueAtTime(0.15, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc3.connect(gain3).connect(ctx.destination);

    [osc1, osc2, osc3].forEach(o => { o.start(now); o.stop(now + 2.5); });
    setTimeout(() => ctx.close(), 3000);
  } catch (_) {}
}

function startZenReminder() {
  stopZenReminder();
  if (Notification.permission === 'default') Notification.requestPermission();
  zenReminderInterval = setInterval(() => {
    if (!dimMode || !document.hidden) return;
    if (Notification.permission !== 'granted') return;
    const msg = ZEN_NUDGES[Math.floor(Math.random() * ZEN_NUDGES.length)];
    new Notification('Study Tracker — Zen Mode', { body: msg, icon: '🌿', silent: true });
    playTung();
  }, 5 * 60 * 1000);
}

function stopZenReminder() {
  if (zenReminderInterval) { clearInterval(zenReminderInterval); zenReminderInterval = null; }
}

// ── Music toggle (independent of zen mode) ──
let musicOn = localStorage.getItem('music-on') === 'true';

function toggleMusic() {
  musicOn = !musicOn;
  localStorage.setItem('music-on', musicOn);
  const btn = document.getElementById('musicToggle');
  if (btn) btn.classList.toggle('active', musicOn);
  if (musicOn) zenAudio.start(); else zenAudio.stop();
}

function toggleDimMode() {
  dimMode = !dimMode;
  localStorage.setItem('dim-mode', dimMode);
  document.documentElement.classList.toggle('dim-mode', dimMode);
  const btn = document.getElementById('dimToggle');
  if (btn) btn.classList.toggle('active', dimMode);
  // Toggle zen reminders only
  if (dimMode) startZenReminder(); else stopZenReminder();
}
function setFocusedBlock(blockCard) {
  if (!dimMode) return;
  document.querySelectorAll('.block-card.focused').forEach(el => el.classList.remove('focused'));
  if (blockCard) blockCard.classList.add('focused');
}
if (dimMode) document.documentElement.classList.add('dim-mode');
if (musicOn) zenAudio.start();

// ===== PASSCODE / LOCK LOGIC =====
let _isUnlocked = false;

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========================================================
// ASCII ART BACKGROUND ENGINE FOR MINIMAL LOCK SCREEN
// Moving ambient art: Brain, Education, AI, Math
// ========================================================

const ASCII_ART_COLLECTION = [
  // --- 1. BRAIN (Cortex / Neuro / Synapse) ---
  {
    category: 'brain',
    label: '// BRAIN · CORTEX //',
    lines: [
      "      .-''''-.     .-''''-.",
      "    .'        `._.'        '.",
      "   /   .-.      :      .-.   \\",
      "  :   (   )     :     (   )   :",
      "  :    `-'      :      `-'    :",
      "   \\           / \\           /",
      "    '.____..-'     '-..____.'"
    ]
  },
  {
    category: 'brain',
    label: '// SYNAPSE MESH //',
    lines: [
      "        [🧠]",
      "      (o)=====(o)",
      "     / | \\   / | \\",
      "    *  |  * *  |  *",
      "     \\ | /   \\ | /",
      "      (o)=====(o)"
    ]
  },
  {
    category: 'brain',
    label: '// NEURAL IQ //',
    lines: [
      "      .-'\"\"'-.",
      "    .'  ____  '.",
      "   /   / __ \\   \\",
      "  |   | (__) |   |",
      "  |    \\____/    |",
      "   \\  BRAIN-AI  /",
      "    '.  PSYCHE .'",
      "      '-....-'"
    ]
  },

  // --- 2. EDUCATION (Books / Scholar / Syllabus) ---
  {
    category: 'education',
    label: '// KNOWLEDGE · STUDY //',
    lines: [
      "       ______   ______",
      "     .-\"      \\ /      \"-.",
      "    |  STUDY   |   LOCK   |",
      "    |  LEARN   |   GROW   |",
      "    |  DEEP    |   FOCUS  |",
      "    '----------'----------'"
    ]
  },
  {
    category: 'education',
    label: '// ACADEMIA · DEGREE //',
    lines: [
      "          .--------.",
      "         /          \\",
      "        /  KNOWLEDGE \\",
      "       *--------------*",
      "       | \\          / |",
      "          \\        /",
      "           '------'"
    ]
  },
  {
    category: 'education',
    label: '// SYLLABUS · ARCHIVE //',
    lines: [
      "     .-------------------.",
      "    /__KNOWLEDGE_BASE___/|",
      "   |  CURRICULUM // ML | |",
      "   |-------------------|/|",
      "   |  STUDY // LOCK-IN | |",
      "   '-------------------'/"
    ]
  },

  // --- 3. AI (Neural Nets / Transformer / Tensors) ---
  {
    category: 'ai',
    label: '// DEEP NEURAL NET //',
    lines: [
      "   [IN]     [HIDDEN]     [OUT]",
      "    (o)-------(o)--------(o)",
      "     \\       /   \\      /",
      "      \\     /     \\    /",
      "       (o)---------(o)",
      "      /   \\       /   \\",
      "    (o)-------(o)--------(o)",
      "     W·x + b   -->   ReLU(z)"
    ]
  },
  {
    category: 'ai',
    label: '// TRANSFORMER ATTENTION //',
    lines: [
      "   +-------------------------+",
      "   | ATTENTION IS ALL U NEED |",
      "   |   Q·K^T / sqrt(d_k)     |",
      "   |     [ TRANSFORMER ]     |",
      "   +-------------------------+"
    ]
  },
  {
    category: 'ai',
    label: '// AI TENSOR AGENT //',
    lines: [
      "       .------------.",
      "      /  AI AGENT   /|",
      "     +-------------+ |",
      "     |  [ 0 1 0 ]  | |",
      "     |  TENSOR_NET |/",
      "     '-------------'"
    ]
  },

  // --- 4. MATH (Calculus / Integrals / Euler / Linear Algebra) ---
  {
    category: 'math',
    label: '// CALCULUS & LIMITS //',
    lines: [
      "         b",
      "        /",
      "       |  f(x) dx = F(b) - F(a)",
      "      /",
      "     a",
      "     lim_{x→0} (sin x / x) = 1"
    ]
  },
  {
    category: 'math',
    label: '// EULER & BASEL SERIES //',
    lines: [
      "       e^(i·π) + 1 = 0",
      "         ∞",
      "        ---",
      "        \\    1       π²",
      "        /   ---  =  ----",
      "        ---  k²       6",
      "        k=1"
    ]
  },
  {
    category: 'math',
    label: '// EIGEN & GRADIENT //',
    lines: [
      "     [ cos θ  -sin θ ]",
      "     [ sin θ   cos θ ]",
      "     det(A - λI) = 0",
      "     ∇_θ L = E[ ∇ log p(x) ]"
    ]
  }
];

const ASCII_SCATTERED_SYMBOLS = [
  "∫ f(x) dx", "∑ x_i", "∂L/∂w", "σ(Wx+b)", "∇_θ L", "e^(iπ) = -1",
  "det(A)", "λ_max", "lim x→∞", "√2", "π ≈ 3.1415", "∞", "∀x ∈ ℝ",
  "∃ε > 0", "P(A|B)", "H(X)", "E=mc²", "c²=a²+b²", "Q·K^T / √d",
  "softmax", "argmax", "ReLU", "[0 1 0 1]", "loss → 0.00", "epoch++",
  "tensor", "synapse", "cortex", "axiom", "lemma", "Q.E.D.", "f: X → Y",
  "⟨u, v⟩", "∥W∥₂", "μ ± 2σ", "dx/dt", "∮ B·dl = μ₀I", "∇²ψ", "argmax_y P(y|x)"
];

const _lockAscii = {
  running: false,
  animId: null,
  canvas: null,
  ctx: null,
  sprites: [],
  particles: [],
  mouse: { x: -9999, y: -9999 },
  initialized: false
};

function initLockAscii() {
  const canvas = document.getElementById('lockAsciiCanvas');
  if (!canvas) return false;
  _lockAscii.canvas = canvas;
  _lockAscii.ctx = canvas.getContext('2d');
  
  function resize() {
    if (!_lockAscii.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    _lockAscii.canvas.width = Math.floor(w * dpr);
    _lockAscii.canvas.height = Math.floor(h * dpr);
    _lockAscii.canvas.style.width = w + 'px';
    _lockAscii.canvas.style.height = h + 'px';
    _lockAscii.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();

  const lockScreen = document.getElementById('lockScreen');
  if (lockScreen) {
    lockScreen.addEventListener('click', (e) => {
      if (!e.target.closest('button, a')) {
        const input = document.getElementById('passcodeInput');
        if (input && document.activeElement !== input) input.focus();
      }
    });
    lockScreen.addEventListener('mousemove', (e) => {
      _lockAscii.mouse.x = e.clientX;
      _lockAscii.mouse.y = e.clientY;
    });
    lockScreen.addEventListener('mouseleave', () => {
      _lockAscii.mouse.x = -9999;
      _lockAscii.mouse.y = -9999;
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!_isUnlocked) {
      const input = document.getElementById('passcodeInput');
      if (input && document.activeElement !== input && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        input.focus();
      }
    }
  });

  // Create ASCII Sprites
  const W = window.innerWidth;
  const H = window.innerHeight;
  const numSprites = Math.max(6, Math.min(ASCII_ART_COLLECTION.length, Math.floor(W / 180)));
  
  _lockAscii.sprites = ASCII_ART_COLLECTION.slice(0, numSprites).map((art, idx) => {
    const maxLine = Math.max(...art.lines.map(l => l.length));
    const spriteW = maxLine * 7.2;
    const spriteH = (art.lines.length + 2) * 14;
    
    // Spread them in a grid-like distribution with random jitter
    const cols = Math.ceil(Math.sqrt(numSprites));
    const rows = Math.ceil(numSprites / cols);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    
    const startX = (col / cols) * W + (Math.random() - 0.5) * 80;
    const startY = (row / rows) * H + (Math.random() - 0.5) * 60;
    
    const speed = 0.2 + Math.random() * 0.25;
    const angle = Math.random() * Math.PI * 2;

    return {
      category: art.category,
      label: art.label,
      lines: art.lines,
      w: spriteW,
      h: spriteH,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.0012 + Math.random() * 0.001,
      amplitude: 5 + Math.random() * 6
    };
  });

  // Create scattered math & tech particles
  const numParticles = Math.min(38, Math.max(20, Math.floor(W / 45)));
  _lockAscii.particles = [];
  for (let i = 0; i < numParticles; i++) {
    const sym = ASCII_SCATTERED_SYMBOLS[i % ASCII_SCATTERED_SYMBOLS.length];
    const speed = 0.12 + Math.random() * 0.22;
    const angle = Math.random() * Math.PI * 2;
    _lockAscii.particles.push({
      text: sym,
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      seed: Math.random() * 1000,
      size: 10 + Math.random() * 2.5
    });
  }

  _lockAscii.initialized = true;
  return true;
}

function startLockAscii() {
  if (_lockAscii.running) return;
  if (!_lockAscii.initialized) {
    initLockAscii();
  }
  _lockAscii.running = true;

  function loop(time) {
    if (!_lockAscii.running) return;
    renderLockAscii(time);
    _lockAscii.animId = requestAnimationFrame(loop);
  }

  _lockAscii.animId = requestAnimationFrame(loop);
}

function stopLockAscii() {
  _lockAscii.running = false;
  if (_lockAscii.animId) {
    cancelAnimationFrame(_lockAscii.animId);
    _lockAscii.animId = null;
  }
}

function renderLockAscii(time) {
  const ctx = _lockAscii.ctx;
  const canvas = _lockAscii.canvas;
  if (!ctx || !canvas) return;

  const W = window.innerWidth;
  const H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  // 1. Draw Scattered Math & AI Particles in Background
  ctx.font = '10.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < _lockAscii.particles.length; i++) {
    const p = _lockAscii.particles[i];
    p.x += p.vx;
    p.y += p.vy;

    // Wrap boundaries
    if (p.x < -120) p.x = W + 50;
    if (p.x > W + 120) p.x = -50;
    if (p.y < -50) p.y = H + 30;
    if (p.y > H + 50) p.y = -30;

    // Gentle pulse
    const pulse = Math.sin(time * 0.0015 + p.seed) * 0.5 + 0.5;
    const alpha = isLight ? (0.08 + pulse * 0.12) : (0.12 + pulse * 0.18);

    ctx.fillStyle = isLight
      ? `rgba(50, 45, 40, ${alpha.toFixed(3)})`
      : `rgba(235, 230, 220, ${alpha.toFixed(3)})`;
    ctx.fillText(p.text, p.x, p.y);
  }

  // 2. Draw Moving Multi-line ASCII Art Sprites
  for (let i = 0; i < _lockAscii.sprites.length; i++) {
    const s = _lockAscii.sprites[i];

    // Physics update with bobbing
    s.x += s.vx;
    s.y += s.vy;

    // Boundary wrapping
    if (s.x > W + 100) s.x = -s.w - 50;
    if (s.x < -s.w - 100) s.x = W + 50;
    if (s.y > H + 80) s.y = -s.h - 50;
    if (s.y < -s.h - 80) s.y = H + 50;

    // Interactive gentle mouse push
    const centerX = s.x + s.w / 2;
    const centerY = s.y + s.h / 2;
    const dx = centerX - _lockAscii.mouse.x;
    const dy = centerY - _lockAscii.mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 180 && dist > 0) {
      const force = ((180 - dist) / 180) * 0.8;
      s.x += (dx / dist) * force;
      s.y += (dy / dist) * force;
    }

    const bobY = s.y + Math.sin(time * s.phaseSpeed + s.phase) * s.amplitude;

    // Category styling & subtle color tinting
    let artColor, labelColor;
    if (isLight) {
      if (s.category === 'brain') {
        artColor = 'rgba(2, 132, 199, 0.22)';
        labelColor = 'rgba(2, 132, 199, 0.35)';
      } else if (s.category === 'education') {
        artColor = 'rgba(180, 83, 9, 0.22)';
        labelColor = 'rgba(180, 83, 9, 0.35)';
      } else if (s.category === 'ai') {
        artColor = 'rgba(126, 34, 206, 0.22)';
        labelColor = 'rgba(126, 34, 206, 0.35)';
      } else { // math
        artColor = 'rgba(40, 35, 30, 0.25)';
        labelColor = 'rgba(40, 35, 30, 0.38)';
      }
    } else {
      if (s.category === 'brain') {
        artColor = 'rgba(56, 189, 248, 0.28)';
        labelColor = 'rgba(56, 189, 248, 0.45)';
      } else if (s.category === 'education') {
        artColor = 'rgba(251, 191, 36, 0.28)';
        labelColor = 'rgba(251, 191, 36, 0.45)';
      } else if (s.category === 'ai') {
        artColor = 'rgba(168, 85, 247, 0.28)';
        labelColor = 'rgba(168, 85, 247, 0.45)';
      } else { // math
        artColor = 'rgba(245, 240, 230, 0.32)';
        labelColor = 'rgba(217, 119, 6, 0.48)';
      }
    }

    // Render category tag
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = labelColor;
    ctx.fillText(s.label, s.x, bobY);

    // Render ASCII art body lines
    ctx.font = '10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = artColor;
    const lineHeight = 13.5;
    for (let l = 0; l < s.lines.length; l++) {
      ctx.fillText(s.lines[l], s.x, bobY + (l + 1) * lineHeight);
    }
  }
}

function getSiteConfig() {
  const el = document.getElementById('site-config');
  return el ? JSON.parse(el.textContent || '{}') : { baseurl: '', passcodeHash: '' };
}

function checkLockState() {
  const unlocked = localStorage.getItem('study-lock-in:unlocked') === 'true';
  const lockScreen = document.getElementById('lockScreen');
  if (unlocked) {
    _isUnlocked = true;
    stopLockAscii();
    if (lockScreen) lockScreen.style.display = 'none';
    return true;
  } else {
    _isUnlocked = false;
    if (lockScreen) {
      lockScreen.style.display = 'flex';
      startLockAscii();
      const input = document.getElementById('passcodeInput');
      if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
    }
    return false;
  }
}

async function handleUnlock(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('passcodeInput');
  const errorEl = document.getElementById('lockError');
  const card = document.querySelector('.lock-card');
  const entered = (input?.value || '').trim();
  
  if (!entered) {
    if (errorEl) errorEl.textContent = 'Please enter your passcode.';
    return;
  }
  
  const enteredHash = await sha256(entered);
  const cfg = getSiteConfig();
  const customHash = localStorage.getItem('study-lock-in:custom-passcode-hash');
  const targetHash = customHash || cfg.passcodeHash || 'ef537ff85794828b8460be01daab559098fb6eb696fc9df92ea8ab5c1c0e3579'; // default 'lockin'
  
  // Allow matching hash OR direct match for default 'lockin'
  if (enteredHash === targetHash || entered === 'lockin') {
    localStorage.setItem('study-lock-in:unlocked', 'true');
    _isUnlocked = true;
    stopLockAscii();
    const lockScreen = document.getElementById('lockScreen');
    if (lockScreen) {
      lockScreen.style.opacity = '0';
      lockScreen.style.transition = 'opacity 0.25s ease';
      setTimeout(() => { lockScreen.style.display = 'none'; lockScreen.style.opacity = '1'; }, 250);
    }
    if (!state) {
      await bootTracker();
    }
    showToast('🔓 Workspace unlocked');
  } else {
    if (errorEl) errorEl.textContent = 'Incorrect passcode. Try again.';
    if (card) {
      card.classList.remove('shake-anim');
      void card.offsetWidth;
      card.classList.add('shake-anim');
    }
  }
}

function lockApp() {
  localStorage.removeItem('study-lock-in:unlocked');
  _isUnlocked = false;
  if (zenAudio.running) zenAudio.stop();
  const lockScreen = document.getElementById('lockScreen');
  if (lockScreen) {
    lockScreen.style.display = 'flex';
    lockScreen.style.opacity = '1';
    startLockAscii();
    const input = document.getElementById('passcodeInput');
    if (input) { input.value = ''; input.focus(); }
    const errorEl = document.getElementById('lockError');
    if (errorEl) errorEl.textContent = '';
  }
  showToast('🔒 Workspace locked');
}

function togglePasscodeVisibility() {
  const input = document.getElementById('passcodeInput');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function changePasscode() {
  const cur = prompt('Enter your CURRENT passcode:');
  if (!cur) return;
  const curHash = await sha256(cur.trim());
  const cfg = getSiteConfig();
  const targetHash = localStorage.getItem('study-lock-in:custom-passcode-hash') || cfg.passcodeHash || 'ef537ff85794828b8460be01daab559098fb6eb696fc9df92ea8ab5c1c0e3579';
  if (curHash !== targetHash && cur.trim() !== 'lockin') {
    alert('Incorrect current passcode.');
    return;
  }
  const next = prompt('Enter your NEW passcode:');
  if (!next || !next.trim()) return;
  const nextHash = await sha256(next.trim());
  localStorage.setItem('study-lock-in:custom-passcode-hash', nextHash);
  showToast('🔑 Passcode updated successfully');
}

// ===== STATE & DATA LAYER (CLIENT-SIDE) =====
let state = null;
let activeComposeTaskId = null;
let _allSyllabi = {};
let _activeSyllabusKey = 'math-for-ml';

function getEmbeddedSyllabi() {
  const el = document.getElementById('syllabi-data');
  try {
    return el ? JSON.parse(el.textContent || '{}') : {};
  } catch (err) {
    console.error('Failed to parse embedded syllabi', err);
    return {};
  }
}

function syllabusToState(raw) {
  const meta = raw.meta || { title: 'Study Lock-In', subtitle: '' };
  const rawState = raw.state || {};
  const days = [];
  const checked = {};
  const doneAt = {};
  const comments = {};
  const journal = {};
  const timeLog = {};
  const customResources = {};

  (raw.days || []).forEach((rawDay, di) => {
    const dayId = `day-${di + 1}`;
    if (rawDay.journal) journal[dayId] = rawDay.journal;
    if (rawDay.time_logged) timeLog[dayId] = rawDay.time_logged;

    const blocks = (rawDay.blocks || []).map((rawBlock, bi) => {
      const blockId = `${dayId}-blk-${bi + 1}`;
      const tasks = (rawBlock.tasks || []).map((rawTask, ti) => {
        const taskId = `${blockId}-task-${ti + 1}`;
        if (rawTask.done) checked[taskId] = true;
        if (rawTask.done_at) doneAt[taskId] = rawTask.done_at;
        if (rawTask.comments && rawTask.comments.length) comments[taskId] = [...rawTask.comments];
        if (rawTask.custom_resources && rawTask.custom_resources.length) customResources[taskId] = [...rawTask.custom_resources];

        return {
          id: taskId,
          text: rawTask.text || '',
          resources: rawTask.resources || [],
        };
      });

      return {
        id: blockId,
        title: rawBlock.title || '',
        badge: rawBlock.badge || 'morning',
        icon: rawBlock.icon || '📌',
        isBonus: !!rawBlock.is_bonus,
        tasks: tasks,
      };
    });

    days.push({
      id: dayId,
      title: rawDay.title || `Day ${di + 1}`,
      subtitle: rawDay.subtitle || '',
      label: rawDay.label || `Day ${di + 1}`,
      blocks: blocks,
    });
  });

  const firstDay = days.length ? days[0].id : '';

  return {
    meta,
    days,
    checked,
    doneAt,
    comments,
    customResources,
    journal,
    timeLog,
    activeDay: rawState.active_day || firstDay,
    journalDay: rawState.journal_day || firstDay,
    startDate: rawState.start_date || null,
    theme: rawState.theme || 'dark',
  };
}

function loadLocalOverrides(syllabusKey) {
  try {
    const raw = localStorage.getItem(`study-lock-in:state:${syllabusKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to parse local state', e);
    return null;
  }
}

function saveLocalState() {
  if (!state || !_activeSyllabusKey) return;
  try {
    localStorage.setItem(`study-lock-in:state:${_activeSyllabusKey}`, JSON.stringify(state));
    console.log('[storage] state saved for', _activeSyllabusKey);
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

function loadStateForSyllabus(key) {
  _allSyllabi = getEmbeddedSyllabi();
  const raw = _allSyllabi[key] || Object.values(_allSyllabi)[0] || { meta: { title: 'Study Tracker' }, days: [] };
  const baseState = syllabusToState(raw);
  const overrides = loadLocalOverrides(key);

  if (overrides) {
    // Overlay user progress onto base syllabus structure
    state = {
      ...baseState,
      checked: { ...baseState.checked, ...(overrides.checked || {}) },
      doneAt: { ...baseState.doneAt, ...(overrides.doneAt || {}) },
      journal: { ...baseState.journal, ...(overrides.journal || {}) },
      timeLog: { ...baseState.timeLog, ...(overrides.timeLog || {}) },
      comments: { ...baseState.comments, ...(overrides.comments || {}) },
      customResources: { ...baseState.customResources, ...(overrides.customResources || {}) },
      activeDay: overrides.activeDay || baseState.activeDay,
      journalDay: overrides.journalDay || baseState.journalDay,
      startDate: overrides.startDate || baseState.startDate,
      theme: overrides.theme || baseState.theme,
    };
  } else {
    state = baseState;
  }

  _activeSyllabusKey = key;
  localStorage.setItem('study-lock-in:active-syllabus', key);
  loadUIState();
}

function postEvent(event) {
  console.log('[local-event] apply:', event.op, event);
  if (!state) return Promise.resolve();

  const op = event.op;
  if (op === 'task') {
    state.checked[event.id] = event.v;
    if (event.v) {
      if (!state.doneAt) state.doneAt = {};
      state.doneAt[event.id] = new Date().toISOString();
      appendLocalActivity(findTaskText(event.id), 'done');
    } else {
      if (state.doneAt) delete state.doneAt[event.id];
      appendLocalActivity(findTaskText(event.id), 'undone');
    }
  } else if (op === 'journal') {
    const dayId = event.dayId || event.day;
    if (event.v) state.journal[dayId] = event.v; else delete state.journal[dayId];
  } else if (op === 'time') {
    const dayId = event.dayId || event.day;
    state.timeLog[dayId] = (state.timeLog[dayId] || 0) + event.v;
  } else if (op === 'set') {
    if (['activeDay', 'journalDay', 'startDate', 'theme'].includes(event.k)) {
      state[event.k] = event.v;
    }
  } else if (op === 'comment_add') {
    if (!state.comments[event.id]) state.comments[event.id] = [];
    state.comments[event.id].push(event.v);
  } else if (op === 'comment_rm') {
    if (state.comments[event.id]) {
      state.comments[event.id].splice(event.idx, 1);
      if (!state.comments[event.id].length) delete state.comments[event.id];
    }
  } else if (op === 'res_add') {
    if (!state.customResources[event.id]) state.customResources[event.id] = [];
    state.customResources[event.id].push({ label: event.label, url: event.url });
  } else if (op === 'res_rm') {
    if (state.customResources[event.id]) {
      state.customResources[event.id].splice(event.idx, 1);
      if (!state.customResources[event.id].length) delete state.customResources[event.id];
    }
  } else if (op === 'meta_edit') {
    if (!state.meta) state.meta = {};
    for (const k of ['title', 'subtitle']) if (k in event) state.meta[k] = event[k];
  } else if (op === 'day_edit') {
    const day = (state.days || []).find(d => d.id === event.id);
    if (day) for (const k of ['title', 'subtitle', 'label']) if (k in event) day[k] = event[k];
  } else if (op === 'block_edit') {
    for (const d of state.days || []) {
      const b = (d.blocks || []).find(blk => blk.id === event.id);
      if (b) { for (const k of ['title', 'badge', 'icon', 'isBonus']) if (k in event) b[k] = event[k]; break; }
    }
  } else if (op === 'task_edit') {
    for (const d of state.days || []) {
      for (const b of d.blocks || []) {
        const t = (b.tasks || []).find(tsk => tsk.id === event.id);
        if (t && 'text' in event) { t.text = event.text; break; }
      }
    }
  }

  saveLocalState();
  return Promise.resolve();
}

// ===== HELPERS =====


// ── UI State (localStorage) ─────────────────────────────────────
// activeDay, journalDay, theme are pure navigation preferences.
// They NEVER write to the TOML file — stored in localStorage only,
// keyed per-syllabus so switching syllabuses restores the right position.

const _UI_STATE_KEY = 'study-tracker-ui';

function _uiStateKey() {
  return `${_UI_STATE_KEY}:${_activeSyllabusKey || 'default'}`;
}

function saveUIState() {
  const ui = {
    activeDay:  state.activeDay  || '',
    journalDay: state.journalDay || '',
    theme:      state.theme      || 'dark',
  };
  localStorage.setItem(_uiStateKey(), JSON.stringify(ui));
  console.log('[ui-state] saved to localStorage:', ui);
}

function loadUIState() {
  try {
    const raw = localStorage.getItem(_uiStateKey());
    if (!raw) { console.log('[ui-state] no saved UI state for', _uiStateKey()); return; }
    const ui = JSON.parse(raw);
    // Only apply if the day still exists in the loaded syllabus
    const dayIds = new Set((state.days || []).map(d => d.id));
    if (ui.activeDay  && dayIds.has(ui.activeDay))  state.activeDay  = ui.activeDay;
    if (ui.journalDay && dayIds.has(ui.journalDay)) state.journalDay = ui.journalDay;
    if (ui.theme) { state.theme = ui.theme; applyTheme(ui.theme); }
    console.log('[ui-state] restored from localStorage:', ui);
  } catch (e) {
    console.warn('[ui-state] loadUIState error:', e);
  }
}

/** Measure the sticky header and write its height into --header-height so
 *  the day-nav can stick flush below it. Re-runs on resize too. */
function _syncHeaderHeight() {
  // Defer to after the browser finishes layout — rAF fires post-paint,
  // so getBoundingClientRect() returns the real rendered height, not 0.
  requestAnimationFrame(() => {
    const header = document.querySelector('.header');
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-height', h + 'px');
    console.log('[layout] _syncHeaderHeight: header height =', h + 'px');
  });
}
window.addEventListener('resize', _syncHeaderHeight);
// Store observer globally so renderApp() can re-observe the new header element after each re-render
if (typeof ResizeObserver !== 'undefined') {
  window._headerObserver = new ResizeObserver(_syncHeaderHeight);
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function findDay(id) { return state.days.find(d => d.id === id); }
function findDayIndex(id) { return state.days.findIndex(d => d.id === id); }
function getActiveDay() { return findDay(state.activeDay); }

// ===== INLINE EDITING =====
function makeEditable(el, currentValue, onSave, opts = {}) {
  if (el.querySelector('input, textarea')) return;
  const isMultiline = opts.multiline || false;
  const input = document.createElement(isMultiline ? 'textarea' : 'input');
  input.type = 'text';
  input.className = 'inline-edit-input' + (isMultiline ? ' multiline' : '');
  input.value = currentValue;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  const originalHTML = el.innerHTML;
  el.innerHTML = '';
  el.appendChild(input);
  el.classList.add('editing');
  input.focus();
  input.select();
  let saved = false;
  const save = () => {
    if (saved) return; saved = true;
    const v = input.value.trim();
    el.classList.remove('editing');
    if (v && v !== currentValue) { onSave(v); }
    else { el.innerHTML = originalHTML; }
  };
  const cancel = () => { saved = true; el.innerHTML = originalHTML; el.classList.remove('editing'); };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && !isMultiline) { e.preventDefault(); input.blur(); }
    if (e.key === 'Enter' && isMultiline && (e.ctrlKey || e.metaKey)) { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
}

function editMeta(field, el) {
  const val = (state.meta && state.meta[field]) || '';
  makeEditable(el, val, newVal => {
    state.meta[field] = newVal;
    postEvent({ op: 'meta_edit', [field]: newVal });
    if (field === 'title') document.title = newVal;
    renderApp();
  });
}

function editDayField(dayId, field, el) {
  const day = findDay(dayId);
  if (!day) return;
  makeEditable(el, day[field] || '', newVal => {
    day[field] = newVal;
    postEvent({ op: 'day_edit', id: dayId, [field]: newVal });
    if (field === 'label' || field === 'title') renderDayNav();
    renderActivePanel();
    renderJournal();
  });
}

function editBlockTitle(blockId, el) {
  for (const day of state.days) {
    for (const block of day.blocks) {
      if (block.id === blockId) {
        makeEditable(el, block.title, newVal => {
          block.title = newVal;
          postEvent({ op: 'block_edit', id: blockId, title: newVal });
          renderActivePanel();
        });
        return;
      }
    }
  }
}

function editTaskInline(taskId, el) {
  for (const day of state.days) {
    for (const block of day.blocks) {
      for (const task of block.tasks) {
        if (task.id === taskId) {
          makeEditable(el, task.text, newVal => {
            task.text = newVal;
            postEvent({ op: 'task_edit', id: taskId, text: newVal });
            renderActivePanel();
          }, { multiline: true });
          return;
        }
      }
    }
  }
}

// ===== RENDER: APP SHELL =====
function renderApp() {
  console.log('[render] renderApp: building UI, days:', state.days?.length, '| activeDay:', state.activeDay);
  const app = document.getElementById('app');
  const meta = state.meta || {};
  app.innerHTML = `
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div><h1 class="editable" onclick="editMeta('title', this)" title="Click to edit title">${escapeHtml(meta.title || 'Study Tracker')}</h1>
            <p class="subtitle editable" onclick="editMeta('subtitle', this)" title="Click to edit subtitle">${escapeHtml(meta.subtitle || 'Click to set subtitle')}</p></div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-stat"><span class="stat-label">Overall</span><span class="stat-value" id="overallPercent">0%</span></div>
          <div class="header-stat"><span class="stat-label">Streak</span><span class="stat-value" id="streakCount">0 🔥</span></div>
          <div class="syllabus-switcher" id="syllabusSwitcher" title="Switch syllabus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <select id="syllabusSelect" title="Switch active syllabus"></select>
          </div>
          <button class="btn-theme" id="musicToggle" title="Toggle study music" ${musicOn ? 'class="btn-theme active"' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </button>
          <button class="btn-theme" id="dimToggle" title="Zen mode" ${dimMode ? 'class="btn-theme active"' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22c-4-4-8-7.5-8-12a8 8 0 0 1 16 0c0 4.5-4 8-8 12z"/><path d="M12 10v6"/><path d="M9 13l3-3 3 3"/></svg>
          </button>
          <button class="btn-theme" id="themeToggle" title="Toggle theme">
            <svg class="theme-icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg class="theme-icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          <button class="btn-data" id="dataToggle" title="Export / Import">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn-reset" id="resetBtn" title="Reset all progress">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="btn-lock" id="lockBtn" onclick="lockApp()" title="Lock workspace (passcode protected)">
            🔒
          </button>
        </div>
      </div>
      <div class="data-panel" id="dataPanel" style="display:none">
        <div class="data-panel-content">
          <div class="data-section">
            <h3 class="data-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
              Export & Git Sync
            </h3>
            <div class="data-buttons">
              <button class="data-btn" onclick="exportSyllabus()" title="Download YAML file to drop into _data/syllabi/ and commit">
                <span class="data-btn-icon">💾</span>
                <span class="data-btn-text">Export for Git<small>.yml</small></span>
              </button>
              <button class="data-btn" onclick="exportState()" title="Download JSON state backup">
                <span class="data-btn-icon">📦</span>
                <span class="data-btn-text">Backup State<small>.json</small></span>
              </button>
              <button class="data-btn" onclick="exportActivity()" title="Download the merged activity log to replace _data/activity.yml and commit">
                <span class="data-btn-icon">🔥</span>
                <span class="data-btn-text">Export Activity<small>activity.yml</small></span>
              </button>
            </div>
          </div>
          <div class="data-divider"></div>
          <div class="data-section">
            <h3 class="data-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
              Import & Git Baseline
            </h3>
            <div class="data-buttons">
              <button class="data-btn import-btn" onclick="importSyllabusFile()" title="Load a .yml or .json file — replaces active syllabus data">
                <span class="data-btn-icon">📂</span>
                <span class="data-btn-text">Import File<small>.yml / .json</small></span>
              </button>
              <button class="data-btn" onclick="resetToRepoBaseline()" title="Discard unexported local progress and reload pristine YAML from Git">
                <span class="data-btn-icon">🔄</span>
                <span class="data-btn-text">Reset to Git<small>Baseline</small></span>
              </button>
            </div>
            <p class="data-hint">💡 Workflow: Export .yml → drop in <code>_data/syllabi/</code> → commit & push to GitHub Pages.</p>
          </div>
          <div class="data-divider"></div>
          <div class="data-section">
            <h3 class="data-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Security
            </h3>
            <div class="data-buttons">
              <button class="data-btn" onclick="changePasscode()" title="Change passcode">
                <span class="data-btn-icon">🔑</span>
                <span class="data-btn-text">Change Passcode</span>
              </button>
              <button class="data-btn" onclick="lockApp()" title="Lock workspace immediately">
                <span class="data-btn-icon">🔒</span>
                <span class="data-btn-text">Lock Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="overall-progress"><div class="overall-progress-bar" id="overallBar" style="width:0%"></div></div>
    </header>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-card-icon tasks-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="stat-card-info"><span class="stat-card-value" id="completedTasks">0 / 0</span><span class="stat-card-label">Tasks Completed</span></div></div>
      <div class="stat-card"><div class="stat-card-icon bonus-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="stat-card-info"><span class="stat-card-value" id="bonusDone">0 / 0</span><span class="stat-card-label">Bonus Tasks Done</span></div></div>
      <div class="stat-card"><div class="stat-card-icon days-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-card-info"><span class="stat-card-value" id="daysComplete">0 / 0</span><span class="stat-card-label">Days Completed</span></div></div>
    </div>

    <div class="activity-heatmap" id="activityHeatmap">
      <div class="heatmap-header">
        <h3 class="heatmap-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Study Activity
        </h3>
        <div class="heatmap-legend">
          <span class="heatmap-legend-label">Less</span>
          <span class="heatmap-legend-cell" data-level="0"></span>
          <span class="heatmap-legend-cell" data-level="1"></span>
          <span class="heatmap-legend-cell" data-level="2"></span>
          <span class="heatmap-legend-cell" data-level="3"></span>
          <span class="heatmap-legend-cell" data-level="4"></span>
          <span class="heatmap-legend-cell" data-level="5"></span>
          <span class="heatmap-legend-cell" data-level="6"></span>
          <span class="heatmap-legend-cell" data-level="7"></span>
          <span class="heatmap-legend-cell" data-level="8"></span>
          <span class="heatmap-legend-label">🔥</span>
        </div>
      </div>
      <div class="heatmap-body" id="heatmapBody"></div>
    </div>

    <nav class="day-nav" id="dayNav"></nav>
    <div id="addDayFormArea"></div>
    <main class="day-panels" id="dayPanels"></main>
    <section class="journal-section" id="journalSection"></section>
    <footer class="footer"><p>${escapeHtml(meta.title || 'Study Tracker')} · Data saved locally · <span class="editable footer-edit" onclick="editMeta('title', this.closest('.footer').querySelector('p'))" title="Click to edit">✏️</span></p></footer>

    <nav class="bottom-nav" id="bottomNav" aria-label="Sections">
      <button class="bottom-nav-item active" data-target="statsGrid" onclick="bottomNavGo('statsGrid')" title="Overview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Home</span>
      </button>
      <button class="bottom-nav-item" data-target="activityHeatmap" onclick="bottomNavGo('activityHeatmap')" title="Activity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Activity</span>
      </button>
      <button class="bottom-nav-item" data-target="dayPanels" onclick="bottomNavGo('dayPanels')" title="Today's tasks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span>Tasks</span>
      </button>
      <button class="bottom-nav-item" data-target="journalSection" onclick="bottomNavGo('journalSection')" title="Journal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><span>Journal</span>
      </button>
    </nav>
  `;

  // Bind static events
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('dimToggle').addEventListener('click', toggleDimMode);
  const dimBtn = document.getElementById('dimToggle');
  if (dimMode) dimBtn.classList.add('active');
  document.getElementById('musicToggle').addEventListener('click', toggleMusic);
  const musicBtn = document.getElementById('musicToggle');
  if (musicOn) musicBtn.classList.add('active');
  document.getElementById('resetBtn').addEventListener('click', resetAll);
  document.getElementById('dataToggle').addEventListener('click', toggleDataPanel);

  renderDayNav();
  renderActivePanel();
  renderJournal();
  updateStats();
  loadSyllabusList();
  // Keep day-nav sticky exactly below the header; also re-observe the new header element
  _syncHeaderHeight();
  if (typeof ResizeObserver !== 'undefined' && window._headerObserver) {
    const h = document.querySelector('.header');
    if (h) window._headerObserver.observe(h);
  }
}

// ===== BOTTOM NAV (phones) =====
function setBottomNavActive(targetId) {
  document.querySelectorAll('.bottom-nav-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.target === targetId));
}

function bottomNavGo(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  setBottomNavActive(targetId);
  window._bottomNavLockUntil = Date.now() + 800; // don't let the scroll-spy flicker mid-scroll
  if (targetId === 'statsGrid') window.scrollTo({ top: 0, behavior: 'smooth' });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Scroll-spy: highlight the section currently occupying the upper part of the screen. */
function _syncBottomNavToScroll() {
  if (Date.now() < (window._bottomNavLockUntil || 0)) return;
  const items = [...document.querySelectorAll('.bottom-nav-item')];
  if (!items.length || getComputedStyle(document.getElementById('bottomNav')).display === 'none') return;
  const probe = window.innerHeight * 0.35;
  let current = items[0].dataset.target;
  for (const btn of items) {
    const el = document.getElementById(btn.dataset.target);
    if (el && el.getBoundingClientRect().top <= probe) current = btn.dataset.target;
  }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = items[items.length - 1].dataset.target; // bottom of page → last section
  }
  setBottomNavActive(current);
}
let _bottomNavTicking = false;
window.addEventListener('scroll', () => {
  if (_bottomNavTicking) return;
  _bottomNavTicking = true;
  requestAnimationFrame(() => { _bottomNavTicking = false; _syncBottomNavToScroll(); });
}, { passive: true });

// ===== RENDER: DAY NAVIGATION =====
function renderDayNav() {
  const nav = document.getElementById('dayNav');
  let html = '';
  state.days.forEach((day, i) => {
    const isActive = day.id === state.activeDay;
    const isComplete = isDayComplete(day.id);
    const cls = ['day-pill'];
    if (isActive) cls.push('active');
    if (isComplete) cls.push('completed');
    html += `<button class="${cls.join(' ')}" data-day="${day.id}" onclick="switchDay('${day.id}')">
      <span class="day-pill-number">${i + 1}</span>
      <span class="day-pill-label">${escapeHtml(day.label || day.title)}</span>
      <div class="day-pill-progress"><div class="day-pill-bar" id="dayBar-${day.id}"></div></div>
    </button>`;
  });
  // Add day button
  html += `<button class="day-pill add-day-pill" onclick="showAddDayForm()" title="Add a new day">
    <span class="day-pill-number">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </span>
    <span class="day-pill-label">ADD DAY</span>
  </button>`;
  nav.innerHTML = html;

  // On phones the day-nav is a single horizontally scrolling row; keep the active day visible
  const activePill = nav.querySelector('.day-pill.active');
  if (activePill && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = activePill.offsetLeft - (nav.clientWidth - activePill.offsetWidth) / 2;
  }
}

// ===== RENDER: ACTIVE DAY PANEL =====
function renderActivePanel() {
  const container = document.getElementById('dayPanels');
  const day = getActiveDay();
  if (!day) { container.innerHTML = '<p class="empty-state">No days yet. Click <strong>+ ADD DAY</strong> to get started.</p>'; return; }

  let totalTasks = 0, doneTasks = 0;
  day.blocks.forEach(b => b.tasks.forEach(t => { totalTasks++; if (state.checked[t.id]) doneTasks++; }));

  let html = `<div class="day-panel active">
    <div class="day-header">
      <h2 class="day-title editable" onclick="editDayField('${day.id}', 'title', this)" title="Click to edit title">${escapeHtml(day.title)}</h2>
      <p class="day-subtitle editable" onclick="editDayField('${day.id}', 'subtitle', this)" title="Click to edit subtitle">${escapeHtml(day.subtitle || 'Click to add subtitle…')}</p>
      <div class="day-meta">
        <span class="day-progress-text">${doneTasks}/${totalTasks} tasks</span>
        <span class="day-label-tag editable" onclick="editDayField('${day.id}', 'label', this)" title="Click to edit pill label">🏷️ ${escapeHtml(day.label)}</span>
        ${state.days.length > 1 ? `<button class="meta-action-btn danger" onclick="removeDay('${day.id}')" title="Delete day">🗑️</button>` : ''}
      </div>
    </div>`;

  day.blocks.forEach(block => {
    let blockDone = 0;
    block.tasks.forEach(t => { if (state.checked[t.id]) blockDone++; });
    html += `<div class="block-card expanded" data-block="${block.id}">
      <div class="block-header" onclick="toggleBlock(this)">
        <div class="block-header-left">
          <span class="block-icon">${block.icon || '📌'}</span>
          <span class="block-title editable" onclick="event.stopPropagation(); editBlockTitle('${block.id}', this)" title="Click to edit">${escapeHtml(block.title)}</span>
          <span class="block-badge badge-${block.badge || 'morning'}">${block.badge === 'bonus' ? '★ BONUS' : (block.badge || 'morning').toUpperCase()}</span>
        </div>
        <div class="block-header-right">
          <span class="block-count">${blockDone}/${block.tasks.length}</span>
          <button class="block-action-btn danger" onclick="event.stopPropagation(); removeBlock('${block.id}')" title="Remove block">×</button>
          <span class="block-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M6 9l6 6 6-6"/></svg></span>
        </div>
      </div>
      <div class="block-content"><div class="block-tasks">`;

    block.tasks.forEach(task => {
      html += renderTask(task, day.id);
    });

    // Add task button
    html += `<div class="add-task-row">
        <button class="add-item-btn" onclick="showAddTaskForm('${block.id}')" id="add-task-trigger-${block.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add task
        </button>
        <div class="add-task-form" id="add-task-form-${block.id}" style="display:none">
          <textarea placeholder="Task description..." class="add-item-input" id="add-task-input-${block.id}" rows="2" onkeydown="handleAddTaskKey(event, '${block.id}')"></textarea>
          <div class="add-item-actions">
            <button class="resource-form-btn save" onclick="submitAddTask('${block.id}')">Add</button>
            <button class="resource-form-btn cancel" onclick="cancelAddTask('${block.id}')">Cancel</button>
          </div>
        </div>
      </div>`;

    html += '</div></div></div>';
  });

  // Add block button
  html += `<div class="add-block-area">
    <button class="add-item-btn add-block-btn" onclick="showAddBlockForm('${day.id}')" id="add-block-trigger-${day.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add block
    </button>
    <div class="add-block-form" id="add-block-form-${day.id}" style="display:none">
      <input type="text" placeholder="Block title (e.g. Morning — Theory)" class="add-item-input" id="add-block-title-${day.id}" onkeydown="handleAddBlockKey(event, '${day.id}')">
      <div class="add-block-options">
        <select class="add-block-select" id="add-block-badge-${day.id}">
          <option value="morning">☀️ Morning</option><option value="afternoon">🔧 Afternoon</option>
          <option value="evening">🌙 Evening</option><option value="bonus">⭐ Bonus</option>
        </select>
      </div>
      <div class="add-item-actions">
        <button class="resource-form-btn save" onclick="submitAddBlock('${day.id}')">Add</button>
        <button class="resource-form-btn cancel" onclick="cancelAddBlock('${day.id}')">Cancel</button>
      </div>
    </div>
  </div>`;

  html += '</div>';
  container.innerHTML = html;
}

// ===== RENDER: SINGLE TASK =====
function renderTask(task, dayId) {
  const checked = state.checked[task.id] ? 'checked' : '';
  const doneClass = state.checked[task.id] ? 'done' : '';
  const builtInRes = task.resources || [];
  const customRes = (state.customResources && state.customResources[task.id]) || [];
  const comments = (state.comments && state.comments[task.id]) || [];
  const commentCount = comments.length;
  const hasComments = commentCount > 0 ? 'has-comments' : '';
  const isComposing = activeComposeTaskId === task.id;

  let resourceHtml = '';
  if (builtInRes.length || customRes.length) {
    resourceHtml = '<div class="task-resources">';
    builtInRes.forEach(r => {
      resourceHtml += `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="resource-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${escapeHtml(r.label)}</a>`;
    });
    customRes.forEach((r, idx) => {
      resourceHtml += `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="resource-link custom-resource" onclick="event.stopPropagation()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${escapeHtml(r.label)}
        <span class="resource-remove" onclick="event.preventDefault();event.stopPropagation();removeCustomResource('${task.id}', ${idx})" title="Remove">×</span></a>`;
    });
    resourceHtml += '</div>';
  }

  // Resource add button
  resourceHtml += `<div class="add-resource-wrapper" onclick="event.stopPropagation()">
    <button class="add-resource-btn" onclick="showAddResourceForm('${task.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Resource
    </button>
    <div class="add-resource-form" id="resource-form-${task.id}" style="display:none">
      <input type="text" placeholder="Label (e.g. My Notes)" class="resource-input" id="resource-label-${task.id}" onkeydown="handleResourceKeydown(event, '${task.id}')">
      <input type="text" placeholder="https://example.com" class="resource-input" id="resource-url-${task.id}" onkeydown="handleResourceKeydown(event, '${task.id}')">
      <div class="resource-form-actions">
        <button class="resource-form-btn save" onclick="addCustomResource('${task.id}')">Save</button>
        <button class="resource-form-btn cancel" onclick="hideAddResourceForm('${task.id}')">Cancel</button>
      </div>
    </div>
  </div>`;

  // Inline comments
  let commentHtml = '';
  if (isComposing || commentCount > 0) {
    commentHtml = `<div class="inline-comments" id="comments-${task.id}" onclick="event.stopPropagation()">`;
    comments.forEach((c, i) => {
      commentHtml += `<div class="comment-item">
        <p class="comment-text">${escapeHtml(c)}</p>
        <div class="comment-meta">
          <button class="comment-delete" onclick="removeComment('${task.id}', ${i})">Delete</button>
        </div>
      </div>`;
    });
    if (isComposing) {
      commentHtml += `<div class="comment-compose">
        <textarea class="comment-input" id="commentInput" placeholder="Add a comment…" rows="2"
          onclick="event.stopPropagation()" onkeydown="handleCommentKeydown(event, '${task.id}')"></textarea>
        <div class="comment-compose-actions">
          <button class="comment-submit" onclick="event.stopPropagation(); submitComment('${task.id}')">Comment</button>
          ${commentCount > 0 ? `<button class="comment-resolve" onclick="event.stopPropagation(); resolveComments('${task.id}')">Resolve</button>` : ''}
          <button class="resource-form-btn cancel" onclick="event.stopPropagation(); closeCompose()">Cancel</button>
        </div>
      </div>`;
    }
    commentHtml += '</div>';
  }

  return `<div class="task-item ${doneClass} ${isComposing ? 'commenting' : ''}" data-task="${task.id}" id="task-${task.id}">
    <input type="checkbox" class="task-checkbox" ${checked} onchange="toggleTask('${task.id}', this)" onclick="event.stopPropagation()">
    <div class="task-info">
      <span class="task-text editable" onclick="event.stopPropagation(); editTaskInline('${task.id}', this)" title="Click to edit">${escapeHtml(task.text)}</span>
      ${resourceHtml}
    </div>
    <div class="task-actions">
      <button class="comment-trigger ${hasComments}" onclick="event.preventDefault(); event.stopPropagation(); toggleCommentCard('${task.id}')" title="Comment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="comment-count">${commentCount || ''}</span>
      </button>
      <button class="task-action-btn copy-btn" onclick="event.stopPropagation(); copyTaskText('${task.id}', this)" title="Copy text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button class="task-action-btn danger" onclick="event.stopPropagation(); removeTask('${task.id}')" title="Delete task">🗑️</button>
    </div>
    ${commentHtml}
  </div>`;
}

// ===== RENDER: JOURNAL =====
function renderJournal() {
  const section = document.getElementById('journalSection');
  if (!state.days.length) { section.innerHTML = ''; return; }

  let tabsHtml = state.days.map((d, i) => {
    const isActive = d.id === state.journalDay;
    const hasContent = state.journal[d.id] && state.journal[d.id].trim();
    return `<button class="journal-tab ${isActive ? 'active' : ''} ${hasContent ? 'has-content' : ''}"
      data-jday="${d.id}" onclick="switchJournalDay('${d.id}')">Day ${i + 1}</button>`;
  }).join('');

  const currentText = state.journal[state.journalDay] || '';

  section.innerHTML = `
    <h2 class="section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Daily Journal</h2>
    <div class="journal-tabs">${tabsHtml}</div>
    <div class="journal-area">
      <textarea id="journalText" placeholder="What did you learn today? Key takeaways, aha moments...">${escapeHtml(currentText)}</textarea>
      <button class="journal-save" id="journalSave">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Note
      </button>
    </div>`;

  document.getElementById('journalSave').addEventListener('click', function () {
    saveJournalEntry();
    this.classList.add('saved'); this.textContent = '✓ Saved';
    setTimeout(() => {
      this.classList.remove('saved');
      this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Note`;
    }, 1500);
  });
}

// ===== UPDATE STATS =====
function updateStats() {
  let totalTasks = 0, completedTasks = 0, totalBonus = 0, completedBonus = 0, daysComplete = 0;

  state.days.forEach(day => {
    let dayDone = 0, dayTotal = 0, dayAllDone = 0, dayAllTotal = 0;
    day.blocks.forEach(block => {
      block.tasks.forEach(task => {
        dayAllTotal++;
        if (state.checked[task.id]) dayAllDone++;
        if (block.isBonus) {
          totalBonus++;
          if (state.checked[task.id]) completedBonus++;
        } else {
          totalTasks++; dayTotal++;
          if (state.checked[task.id]) { completedTasks++; dayDone++; }
        }
      });
    });
    // Update day pill bar
    const bar = document.getElementById('dayBar-' + day.id);
    if (bar) bar.style.width = (dayAllTotal > 0 ? (dayAllDone / dayAllTotal) * 100 : 0) + '%';
    // Day complete check
    const pill = document.querySelector(`.day-pill[data-day="${day.id}"]`);
    if (pill) {
      if (dayTotal > 0 && dayDone === dayTotal) { pill.classList.add('completed'); daysComplete++; }
      else pill.classList.remove('completed');
    }
  });

  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const el = id => document.getElementById(id);
  el('overallPercent').textContent = pct + '%';
  el('overallBar').style.width = pct + '%';
  el('completedTasks').textContent = `${completedTasks} / ${totalTasks}`;
  el('bonusDone').textContent = `${completedBonus} / ${totalBonus}`;
  el('daysComplete').textContent = `${daysComplete} / ${state.days.length}`;

  el('streakCount').textContent = calculateStreak() + ' 🔥';
}

function isDayComplete(dayId) {
  const day = findDay(dayId);
  if (!day) return false;
  for (const block of day.blocks) {
    if (block.isBonus) continue;
    for (const task of block.tasks) { if (!state.checked[task.id]) return false; }
  }
  return day.blocks.some(b => !b.isBonus && b.tasks.length > 0);
}

function calculateStreak() {
  let streak = 0;
  for (const day of state.days) {
    if (isDayComplete(day.id)) streak++;
    else break;
  }
  return streak;
}

// ===== DAY MANAGEMENT =====
function switchDay(dayId) {
  state.activeDay = dayId;
  saveUIState();  // localStorage only — no TOML write
  console.log('[ui-state] activeDay →', dayId);
  document.querySelectorAll('.day-pill').forEach(p => p.classList.toggle('active', p.dataset.day === dayId));
  renderActivePanel();
}

function showAddDayForm() {
  const area = document.getElementById('addDayFormArea');
  area.innerHTML = `<div class="add-day-form-panel">
    <h3>Add New Day</h3>
    <input type="text" placeholder="Title (e.g. Day 3: Advanced Topics)" class="add-item-input" id="addDayTitle" autofocus>
    <input type="text" placeholder="Subtitle (e.g. Deep dive into advanced material)" class="add-item-input" id="addDaySubtitle">
    <input type="text" placeholder="Short label (e.g. Advanced)" class="add-item-input" id="addDayLabel">
    <div class="add-item-actions">
      <button class="resource-form-btn save" onclick="submitAddDay()">Add Day</button>
      <button class="resource-form-btn cancel" onclick="cancelAddDay()">Cancel</button>
    </div>
  </div>`;
  document.getElementById('addDayTitle').focus();
  document.getElementById('addDayTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAddDay();
    if (e.key === 'Escape') cancelAddDay();
  });
}

function cancelAddDay() { document.getElementById('addDayFormArea').innerHTML = ''; }

function submitAddDay() {
  const title = document.getElementById('addDayTitle').value.trim();
  if (!title) { showToast('⚠️ Title is required'); return; }
  const subtitle = document.getElementById('addDaySubtitle').value.trim();
  const label = document.getElementById('addDayLabel').value.trim() || title.split(':').pop().trim();
  const dayId = uid('day');
  const day = { id: dayId, title, subtitle, label, blocks: [] };
  state.days.push(day);
  postEvent({ op: 'day_add', day });
  cancelAddDay();
  renderDayNav();
  renderJournal();
  switchDay(dayId);
  updateStats();
  showToast('📅 Day added');
}

// editDayField, editBlockTitle, editTaskInline — defined in INLINE EDITING section above

function removeDay(dayId) {
  if (!confirm('Delete this day and all its tasks? This cannot be undone.')) return;
  state.days = state.days.filter(d => d.id !== dayId);
  postEvent({ op: 'day_rm', id: dayId });
  if (state.activeDay === dayId) state.activeDay = state.days.length ? state.days[0].id : '';
  if (state.journalDay === dayId) state.journalDay = state.days.length ? state.days[0].id : '';
  renderDayNav();
  renderActivePanel();
  renderJournal();
  updateStats();
  showToast('🗑️ Day removed');
}

// ===== BLOCK MANAGEMENT =====
function showAddBlockForm(dayId) {
  document.getElementById('add-block-trigger-' + dayId).style.display = 'none';
  document.getElementById('add-block-form-' + dayId).style.display = 'flex';
  document.getElementById('add-block-title-' + dayId).focus();
}
function cancelAddBlock(dayId) {
  document.getElementById('add-block-trigger-' + dayId).style.display = '';
  document.getElementById('add-block-form-' + dayId).style.display = 'none';
}
function handleAddBlockKey(e, dayId) {
  if (e.key === 'Enter') { e.preventDefault(); submitAddBlock(dayId); }
  if (e.key === 'Escape') cancelAddBlock(dayId);
}
function submitAddBlock(dayId) {
  const title = document.getElementById('add-block-title-' + dayId).value.trim();
  if (!title) { showToast('⚠️ Block title required'); return; }
  const badge = document.getElementById('add-block-badge-' + dayId).value;
  const icons = { morning: '☀️', afternoon: '🔧', evening: '🌙', bonus: '⭐' };
  const blockId = uid('blk');
  const block = { id: blockId, title, badge, icon: icons[badge] || '📌', isBonus: badge === 'bonus', tasks: [] };
  const day = findDay(dayId);
  if (day) { day.blocks.push(block); postEvent({ op: 'block_add', dayId, block }); }
  renderActivePanel();
  updateStats();
  showToast('📦 Block added');
}
function removeBlock(blockId) {
  if (!confirm('Remove this block and all its tasks?')) return;
  state.days.forEach(day => { day.blocks = day.blocks.filter(b => b.id !== blockId); });
  postEvent({ op: 'block_rm', id: blockId });
  renderActivePanel();
  updateStats();
  showToast('🗑️ Block removed');
}

// ===== TASK MANAGEMENT =====
function toggleBlock(header) {
  const card = header.closest('.block-card');
  card.classList.toggle('expanded');
  if (card.classList.contains('expanded')) setFocusedBlock(card);
}

function toggleTask(taskId, checkbox) {
  state.checked[taskId] = checkbox.checked;
  // Post event, then refresh heatmap after server has written activity.toml
  postEvent({ op: 'task', id: taskId, v: checkbox.checked })
    .then(() => fetchActivity())
    .then(renderHeatmap);
  if (!state.startDate && checkbox.checked) {
    state.startDate = new Date().toISOString();
    postEvent({ op: 'set', k: 'startDate', v: state.startDate });
  }
  const item = checkbox.closest('.task-item');
  setFocusedBlock(item.closest('.block-card'));
  item.classList.toggle('done', checkbox.checked);
  updateStats();
  if (checkbox.checked) {
    fireBurst(checkbox);
    // Drop task text into trophy pile
    const taskText = item.querySelector('.task-text');
    if (taskText) dropTrophy(taskText.textContent.trim());
    const dayId = findDayForTask(taskId);
    if (dayId && isDayComplete(dayId)) { fireDayComplete(); showToast('🎉 Day complete!'); }
  } else {
    // Remove from trophy pile when unchecked
    const taskText = item.querySelector('.task-text');
    if (taskText) removeTrophy(taskText.textContent.trim());
  }
}

function findDayForTask(taskId) {
  for (const day of state.days)
    for (const block of day.blocks)
      for (const task of block.tasks)
        if (task.id === taskId) return day.id;
  return null;
}

function showAddTaskForm(blockId) {
  document.getElementById('add-task-trigger-' + blockId).style.display = 'none';
  document.getElementById('add-task-form-' + blockId).style.display = 'flex';
  document.getElementById('add-task-input-' + blockId).focus();
}
function cancelAddTask(blockId) {
  document.getElementById('add-task-trigger-' + blockId).style.display = '';
  document.getElementById('add-task-form-' + blockId).style.display = 'none';
  document.getElementById('add-task-input-' + blockId).value = '';
}
function handleAddTaskKey(e, blockId) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitAddTask(blockId); }
  if (e.key === 'Escape') cancelAddTask(blockId);
}
function submitAddTask(blockId) {
  const input = document.getElementById('add-task-input-' + blockId);
  const text = input.value.trim();
  if (!text) { showToast('⚠️ Task description required'); return; }
  const taskId = uid('task');
  const task = { id: taskId, text, resources: [] };
  // Find block and add task
  for (const day of state.days) {
    for (const block of day.blocks) {
      if (block.id === blockId) { block.tasks.push(task); break; }
    }
  }
  postEvent({ op: 'task_add', blockId, task });
  input.value = '';
  renderActivePanel();
  updateStats();
  showToast('✅ Task added');
}

// editTaskInline — defined in INLINE EDITING section above

function removeTask(taskId) {
  if (!confirm('Remove this task?')) return;
  state.days.forEach(day => {
    day.blocks.forEach(block => { block.tasks = block.tasks.filter(t => t.id !== taskId); });
  });
  delete state.checked[taskId];
  if (state.customResources) delete state.customResources[taskId];
  if (state.comments) delete state.comments[taskId];
  postEvent({ op: 'task_rm', id: taskId });
  renderActivePanel();
  updateStats();
  showToast('🗑️ Task removed');
}

function copyTaskText(taskId, btn) {
  let text = '';
  state.days.forEach(day => {
    day.blocks.forEach(block => {
      block.tasks.forEach(t => { if (t.id === taskId) text = t.text; });
    });
  });
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.title = 'Copied!';
    showToast('📋 Copied to clipboard');
    setTimeout(() => { btn.classList.remove('copied'); btn.title = 'Copy text'; }, 1500);
  }).catch(() => {
    // Fallback for non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    btn.classList.add('copied');
    showToast('📋 Copied to clipboard');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  });
}

// ===== CUSTOM RESOURCES =====
function showAddResourceForm(taskId) {
  document.querySelectorAll('.add-resource-form').forEach(f => f.style.display = 'none');
  const form = document.getElementById('resource-form-' + taskId);
  if (form) { form.style.display = 'flex'; setTimeout(() => document.getElementById('resource-label-' + taskId).focus(), 50); }
}
function hideAddResourceForm(taskId) {
  const form = document.getElementById('resource-form-' + taskId);
  if (form) { form.style.display = 'none'; }
}
function addCustomResource(taskId) {
  const label = document.getElementById('resource-label-' + taskId).value.trim();
  const url = document.getElementById('resource-url-' + taskId).value.trim();
  if (!label || !url) { showToast('⚠️ Both label and URL required'); return; }
  if (!state.customResources) state.customResources = {};
  if (!state.customResources[taskId]) state.customResources[taskId] = [];
  state.customResources[taskId].push({ label, url });
  postEvent({ op: 'res_add', id: taskId, label, url });
  renderActivePanel(); showToast('🔗 Resource added');
}
function removeCustomResource(taskId, idx) {
  if (!state.customResources || !state.customResources[taskId]) return;
  postEvent({ op: 'res_rm', id: taskId, idx });
  state.customResources[taskId].splice(idx, 1);
  if (!state.customResources[taskId].length) delete state.customResources[taskId];
  renderActivePanel(); showToast('🗑️ Resource removed');
}
function handleResourceKeydown(e, taskId) {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); addCustomResource(taskId); }
  if (e.key === 'Escape') hideAddResourceForm(taskId);
}

// ===== COMMENTS (inline) =====
function toggleCommentCard(taskId) {
  if (activeComposeTaskId === taskId) closeCompose();
  else openCompose(taskId);
}
function openCompose(taskId) {
  activeComposeTaskId = taskId;
  renderActivePanel();
  setTimeout(() => { const inp = document.getElementById('commentInput'); if (inp) inp.focus(); }, 50);
}
function closeCompose() {
  activeComposeTaskId = null;
  renderActivePanel();
}
function formatCommentTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr), diff = Date.now() - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}
function handleCommentKeydown(e, taskId) {
  e.stopPropagation();
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitComment(taskId); }
  if (e.key === 'Escape') closeCompose();
}
function submitComment(taskId) {
  const input = document.getElementById('commentInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!state.comments) state.comments = {};
  if (!state.comments[taskId]) state.comments[taskId] = [];
  state.comments[taskId].push(text);
  postEvent({ op: 'comment_add', id: taskId, v: text });
  renderActivePanel(); showToast('💬 Comment added');
  // Re-open compose on same task
  setTimeout(() => { activeComposeTaskId = taskId; renderActivePanel();
    setTimeout(() => { const inp = document.getElementById('commentInput'); if (inp) inp.focus(); }, 50);
  }, 0);
}
function removeComment(taskId, idx) {
  if (!state.comments || !state.comments[taskId]) return;
  postEvent({ op: 'comment_rm', id: taskId, idx });
  state.comments[taskId].splice(idx, 1);
  if (!state.comments[taskId].length) delete state.comments[taskId];
  renderActivePanel();
}
function resolveComments(taskId) {
  if (!state.comments || !state.comments[taskId]) return;
  const count = state.comments[taskId].length;
  for (let i = count - 1; i >= 0; i--) postEvent({ op: 'comment_rm', id: taskId, idx: i });
  delete state.comments[taskId];
  closeCompose();
  showToast('✅ Resolved');
}

// ===== JOURNAL =====
function switchJournalDay(dayId) {
  saveJournalEntry();
  state.journalDay = dayId;
  saveUIState();  // localStorage only — no TOML write
  console.log('[ui-state] journalDay →', dayId);
  renderJournal();
}
function saveJournalEntry() {
  const textarea = document.getElementById('journalText');
  if (!textarea) return;
  const text = textarea.value.trim();
  const dayId = state.journalDay;
  if (text) state.journal[dayId] = text;
  else delete state.journal[dayId];
  postEvent({ op: 'journal', dayId, v: text });
}

// ===== CELEBRATIONS (Khan Academy-style particle bursts) =====
const BURST_COLORS = [
  '#F5C518', '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#96E6A1', '#DDA0DD', '#FF85A2', '#FFDAB9',
];

const SHAPES = ['circle', 'star', 'diamond', 'sparkle'];

function createBurstCanvas() {
  let canvas = document.getElementById('burstCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'burstCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return canvas;
}

let _particles = [];
let _animFrame = null;

function spawnParticles(x, y, count, opts = {}) {
  const spread = opts.spread || 1;
  const sizeMin = opts.sizeMin || 3;
  const sizeMax = opts.sizeMax || 8;
  const speedMin = opts.speedMin || 2;
  const speedMax = opts.speedMax || 8;
  const gravity = opts.gravity !== undefined ? opts.gravity : 0.12;
  const colors = opts.colors || BURST_COLORS;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * spread;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    _particles.push({
      x, y,
      vx: Math.cos(angle) * speed * (0.5 + Math.random()),
      vy: Math.sin(angle) * speed * (0.5 + Math.random()) - 2,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      gravity,
      drag: 0.97 + Math.random() * 0.02,
      life: 1,
      decay: 0.008 + Math.random() * 0.010,
      shimmer: Math.random() > 0.5,
    });
  }

  if (!_animFrame) tickBurst();
}

function drawStar(ctx, cx, cy, r, points, rotation) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = (i % 2 === 0) ? r : r * 0.4;
    const a = rotation + (Math.PI * i / points);
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawSparkle(ctx, cx, cy, r, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = rotation + (Math.PI * i / 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

function drawDiamond(ctx, cx, cy, r, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.6, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.6, 0);
  ctx.closePath();
  ctx.restore();
}

function tickBurst() {
  const canvas = createBurstCanvas();
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  _particles = _particles.filter(p => p.life > 0);

  if (_particles.length === 0) {
    _animFrame = null;
    canvas.remove();
    return;
  }

  for (const p of _particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.rotation += p.rotSpeed;
    p.life -= p.decay;

    const alpha = Math.max(0, p.life);
    const shimmerAlpha = p.shimmer ? alpha * (0.6 + 0.4 * Math.sin(Date.now() * 0.02 + p.rotation * 10)) : alpha;
    ctx.globalAlpha = shimmerAlpha;

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    } else if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, p.size, 5, p.rotation);
      ctx.fillStyle = p.color;
      ctx.fill();
    } else if (p.shape === 'sparkle') {
      drawSparkle(ctx, p.x, p.y, p.size * 1.5, p.rotation);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (p.shape === 'diamond') {
      drawDiamond(ctx, p.x, p.y, p.size, p.rotation);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  _animFrame = requestAnimationFrame(tickBurst);
}

// Small burst from a checkbox (every task tick)
function fireBurst(checkbox) {
  const rect = checkbox.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Main burst — high speed so particles fly across the whole page
  spawnParticles(x, y, 28, {
    spread: 2.0,
    sizeMin: 3, sizeMax: 9,
    speedMin: 8, speedMax: 18,
    gravity: 0.06,
  });

  // Secondary scattered bursts at random positions across the page
  for (let i = 0; i < 3; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h * 0.6;
    setTimeout(() => {
      spawnParticles(rx, ry, 10, {
        spread: 1.8,
        sizeMin: 2, sizeMax: 7,
        speedMin: 3, speedMax: 9,
        gravity: 0.07,
        colors: ['#FFD700', '#F5C518', '#fff', '#FFA500', '#4ECDC4', '#FF6B6B'],
      });
    }, 50 + i * 80);
  }

  // Glitter trail floating upward from checkbox
  spawnParticles(x, y, 8, {
    spread: 0.6,
    sizeMin: 1.5, sizeMax: 5,
    speedMin: 2, speedMax: 6,
    gravity: -0.05,
    colors: ['#FFD700', '#F5C518', '#fff', '#FFA500'],
  });
}

// Big celebration (full day complete)
function fireDayComplete() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Multiple bursts across the screen
  const burstPoints = [
    [w * 0.2, h * 0.3], [w * 0.5, h * 0.2], [w * 0.8, h * 0.3],
    [w * 0.3, h * 0.5], [w * 0.7, h * 0.5],
  ];

  burstPoints.forEach(([bx, by], i) => {
    setTimeout(() => {
      spawnParticles(bx, by, 30, {
        spread: 1.5,
        sizeMin: 3, sizeMax: 10,
        speedMin: 4, speedMax: 12,
        gravity: 0.15,
      });
    }, i * 120);
  });

  // Shower from top
  setTimeout(() => {
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        spawnParticles(Math.random() * w, -10, 3, {
          spread: 0.5,
          sizeMin: 3, sizeMax: 7,
          speedMin: 0.5, speedMax: 2,
          gravity: 0.2,
          colors: ['#F5C518', '#FFD700', '#e6b800', '#FFA500'],
        });
      }, i * 30);
    }
  }, 400);
}

// ===== TOAST =====
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

// ===== RESET =====
function resetAll() {
  if (!confirm('🗑️ Reset ALL progress for this syllabus? Checkboxes, time, journal, and comments will be cleared. Structure (days/tasks) is kept.')) return;
  state.checked = {};
  state.doneAt = {};
  state.journal = {};
  state.timeLog = {};
  state.comments = {};
  state.customResources = {};
  saveLocalState();
  activeComposeTaskId = null;
  renderApp();
  renderHeatmap(getActivityLog());
  showToast('♻️ All progress reset');
}

function resetToRepoBaseline() {
  if (!confirm(`Reset "${_activeSyllabusKey}" to the original committed git baseline? This will discard any unexported local edits on this machine.`)) return;
  localStorage.removeItem(`study-lock-in:state:${_activeSyllabusKey}`);
  loadStateForSyllabus(_activeSyllabusKey);
  renderApp();
  renderHeatmap(getActivityLog());
  showToast('🔄 Restored from Git baseline');
}

// ===== DATA PANEL (Export / Import) =====
function toggleDataPanel() {
  const panel = document.getElementById('dataPanel');
  const btn = document.getElementById('dataToggle');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.classList.add('active');
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

function stateToYaml(s) {
  const lines = [];
  lines.push('# Study Lock-In — Syllabus & State (Single Source of Truth)');
  lines.push('# Exported: ' + new Date().toISOString());
  lines.push('');
  lines.push('meta:');
  lines.push(`  title: ${JSON.stringify(s.meta?.title || 'Study Tracker')}`);
  lines.push(`  subtitle: ${JSON.stringify(s.meta?.subtitle || '')}`);
  lines.push('');
  lines.push('state:');
  lines.push(`  theme: ${JSON.stringify(s.theme || 'dark')}`);
  lines.push(`  active_day: ${JSON.stringify(s.activeDay || '')}`);
  lines.push(`  journal_day: ${JSON.stringify(s.journalDay || '')}`);
  if (s.startDate) lines.push(`  start_date: ${JSON.stringify(s.startDate)}`);
  lines.push('');
  lines.push('days:');

  for (const day of (s.days || [])) {
    lines.push(`  - title: ${JSON.stringify(day.title || '')}`);
    lines.push(`    subtitle: ${JSON.stringify(day.subtitle || '')}`);
    lines.push(`    label: ${JSON.stringify(day.label || '')}`);
    
    const j = s.journal?.[day.id] || '';
    if (j.includes('\n')) {
      lines.push('    journal: |');
      for (const line of j.split('\n')) {
        lines.push(`      ${line}`);
      }
    } else {
      lines.push(`    journal: ${JSON.stringify(j)}`);
    }

    const tl = s.timeLog?.[day.id] || 0;
    lines.push(`    time_logged: ${tl}`);
    lines.push('    blocks:');

    for (const block of (day.blocks || [])) {
      lines.push(`      - title: ${JSON.stringify(block.title || '')}`);
      lines.push(`        badge: ${JSON.stringify(block.badge || 'morning')}`);
      lines.push(`        icon: ${JSON.stringify(block.icon || '📌')}`);
      if (block.isBonus) lines.push('        is_bonus: true');
      lines.push('        tasks:');

      for (const task of (block.tasks || [])) {
        lines.push(`          - text: ${JSON.stringify(task.text || '')}`);
        const isDone = !!s.checked?.[task.id];
        lines.push(`            done: ${isDone}`);
        const doneAt = s.doneAt?.[task.id];
        if (isDone && doneAt) {
          lines.push(`            done_at: ${JSON.stringify(doneAt)}`);
        }

        const cmts = s.comments?.[task.id] || [];
        if (cmts.length) {
          lines.push('            comments:');
          for (const c of cmts) lines.push(`              - ${JSON.stringify(c)}`);
        } else {
          lines.push('            comments: []');
        }

        const resList = task.resources || [];
        if (resList.length) {
          lines.push('            resources:');
          for (const r of resList) {
            lines.push(`              - label: ${JSON.stringify(r.label || '')}`);
            lines.push(`                url: ${JSON.stringify(r.url || '')}`);
          }
        }

        const custRes = s.customResources?.[task.id] || [];
        if (custRes.length) {
          lines.push('            custom_resources:');
          for (const cr of custRes) {
            lines.push(`              - label: ${JSON.stringify(cr.label || '')}`);
            lines.push(`                url: ${JSON.stringify(cr.url || '')}`);
          }
        }
      }
    }
  }

  return lines.join("\n") + "\n";
}

function exportSyllabus() {
  if (!state) return;
  const yamlContent = stateToYaml(state);
  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
  const filename = `${_activeSyllabusKey}.yml`;
  downloadBlob(blob, filename);
  showToast(`📄 Exported ${filename} — drop into _data/syllabi/ to commit!`);
}

function exportState() {
  if (!state) return;
  const jsonContent = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `study-lock-in-${_activeSyllabusKey}-state.json`);
  showToast('📦 State backup exported');
}

function importSyllabusFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.yml,.yaml';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm(`Import "${file.name}"? This will replace your current active syllabus data on this device.`)) return;

    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const imported = JSON.parse(text);
        if (imported.days) {
          state = imported;
          saveLocalState();
          renderApp();
          showToast(`📦 Imported ${imported.days.length} days`);
        }
      } else {
        alert('To import YAML, you can replace the file in _data/syllabi/ and push to GitHub, or export as JSON.');
      }
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  input.click();
}

// ===== SYLLABUS SWITCHER =====
function loadSyllabusList() {
  _allSyllabi = getEmbeddedSyllabi();
  const keys = Object.keys(_allSyllabi);
  const sel = document.getElementById('syllabusSelect');
  if (!sel) return;

  sel.onchange = null;
  sel.innerHTML = '';

  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    const title = _allSyllabi[k]?.meta?.title || k.replace(/-/g, ' ');
    opt.textContent = title;
    if (k === _activeSyllabusKey) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.onchange = (e) => {
    const chosen = e.target.value;
    if (chosen && chosen !== _activeSyllabusKey) {
      switchSyllabus(chosen);
    }
  };
}

function switchSyllabus(key) {
  if (!key) return;
  loadStateForSyllabus(key);
  activeComposeTaskId = null;
  renderApp();
  renderHeatmap(getActivityLog());
  showToast(`📚 Switched syllabus to ${key.replace(/-/g, ' ')}`);
}

// ===== TROPHY PILE (completed tasks gravity wall) =====
const TROPHY_KEY = 'study-tracker-trophies';

function getTrophies() {
  try { return JSON.parse(localStorage.getItem(TROPHY_KEY) || '[]'); }
  catch { return []; }
}

function saveTrophies(trophies) {
  localStorage.setItem(TROPHY_KEY, JSON.stringify(trophies));
}

function ensureTrophyContainer() {
  let container = document.getElementById('trophyPile');
  if (!container) {
    container = document.createElement('div');
    container.id = 'trophyPile';
    container.className = 'trophy-pile';
    container.innerHTML = `
      <div class="trophy-header">
        <span class="trophy-counter"><span id="trophyCount">0</span> done</span>
        <button class="trophy-clear" onclick="clearTrophies()" title="Clear trophy pile">✕</button>
      </div>
      <div class="trophy-chips" id="trophyChips"></div>
    `;
    document.body.appendChild(container);
  }
  return container;
}

function renderTrophyChips(animate) {
  const container = ensureTrophyContainer();
  const chipsEl = document.getElementById('trophyChips');
  const trophies = getTrophies();
  document.getElementById('trophyCount').textContent = trophies.length;

  if (trophies.length === 0) {
    container.classList.remove('visible');
    return;
  }
  container.classList.add('visible');

  // Only render what's there — don't re-render everything for perf
  chipsEl.innerHTML = '';
  trophies.forEach((t, i) => {
    const chip = document.createElement('div');
    chip.className = 'trophy-chip';
    if (animate && i === trophies.length - 1) chip.classList.add('trophy-drop');
    // Random slight rotation for gravity-pile feel
    const rot = (Math.random() - 0.5) * 8;
    chip.style.transform = `rotate(${rot}deg)`;
    // Truncate long texts
    chip.textContent = t.text.length > 50 ? t.text.slice(0, 47) + '…' : t.text;
    chip.title = t.text;
    chipsEl.appendChild(chip);
  });
}

function dropTrophy(text) {
  const trophies = getTrophies();
  // Avoid duplicates
  if (trophies.some(t => t.text === text)) return;
  trophies.push({ text, ts: Date.now() });
  saveTrophies(trophies);
  renderTrophyChips(true);
}

function removeTrophy(text) {
  let trophies = getTrophies();
  trophies = trophies.filter(t => t.text !== text);
  saveTrophies(trophies);
  renderTrophyChips(false);
}

function clearTrophies() {
  if (!confirm('Clear all completed task trophies?')) return;
  localStorage.removeItem(TROPHY_KEY);
  renderTrophyChips(false);
  showToast('🧹 Trophy pile cleared');
}

function loadTrophyPile() {
  ensureTrophyContainer();
  renderTrophyChips(false);
}

// ===== ACTIVITY DATA & HEATMAP =====

function getEmbeddedActivity() {
  const el = document.getElementById('activity-data');
  if (!el || !el.textContent.trim()) return [];
  try {
    const parsed = JSON.parse(el.textContent);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.log)) return parsed.log;
      return Object.values(parsed);
    }
    return [];
  } catch (err) {
    console.warn('Could not parse activity data JSON:', err);
    return [];
  }
}

function getLocalActivity() {
  try {
    const raw = localStorage.getItem('study-lock-in:activity');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const _activityKey = (e) => `${e.t}|${e.syllabus}|${e.topic}|${e.action}`;

/** Base (committed) activity + device-only activity, de-duplicated and in time order.
 *  De-duplication matters once you export activity.yml and push: the same entries
 *  then exist both in the embedded data and in this device's localStorage. */
function getActivityLog() {
  const base = getEmbeddedActivity();
  const seen = new Set(base.map(_activityKey));
  const local = getLocalActivity().filter(e => !seen.has(_activityKey(e)));
  return [...base, ...local].sort((a, b) => new Date(a.t) - new Date(b.t));
}

/** Drop local entries that are already part of the committed _data/activity.yml. */
function pruneLocalActivity() {
  const local = getLocalActivity();
  if (!local.length) return;
  const seen = new Set(getEmbeddedActivity().map(_activityKey));
  const remaining = local.filter(e => !seen.has(_activityKey(e)));
  if (remaining.length !== local.length) {
    localStorage.setItem('study-lock-in:activity', JSON.stringify(remaining));
    console.log(`[activity] pruned ${local.length - remaining.length} entries already in activity.yml`);
  }
}

function activityToYaml(log) {
  const lines = [
    '# Study Lock-In — activity log (powers the contribution heatmap)',
    '# Exported: ' + new Date().toISOString(),
  ];
  for (const e of log) {
    if (!e || !e.t) continue;
    lines.push(`- t: ${JSON.stringify(e.t)}`);
    lines.push(`  syllabus: ${JSON.stringify(e.syllabus || '')}`);
    lines.push(`  topic: ${JSON.stringify(e.topic || '')}`);
    lines.push(`  action: ${JSON.stringify(e.action || 'done')}`);
  }
  return lines.join('\n') + '\n';
}

/** Download the full merged log as activity.yml — drop it into _data/ and commit. */
function exportActivity() {
  const log = getActivityLog();
  const newCount = log.length - getEmbeddedActivity().length;
  const blob = new Blob([activityToYaml(log)], { type: 'text/yaml;charset=utf-8' });
  downloadBlob(blob, 'activity.yml');
  showToast(`🔥 Exported activity.yml (${log.length} entries, ${newCount} new) — replace _data/activity.yml & commit`);
}

function appendLocalActivity(topic, action) {
  try {
    const log = getLocalActivity();
    log.push({
      t: new Date().toISOString(),
      syllabus: state?.meta?.title || _activeSyllabusKey,
      topic: topic || 'Task',
      action: action || 'done',
    });
    localStorage.setItem('study-lock-in:activity', JSON.stringify(log));
    renderHeatmap(getActivityLog());
  } catch (e) {
    console.warn('Failed to append local activity', e);
  }
}

function findTaskText(taskId) {
  if (!state || !state.days) return taskId;
  for (const d of state.days) {
    for (const b of (d.blocks || [])) {
      for (const t of (b.tasks || [])) {
        if (t.id === taskId) return t.text;
      }
    }
  }
  return taskId;
}

function fetchActivity() {
  return Promise.resolve(getActivityLog());
}

function renderHeatmap(activityLog) {
  activityLog = activityLog || getActivityLog();
  if (!Array.isArray(activityLog)) activityLog = [];

  const body = document.getElementById('heatmapBody');
  if (!body) return;

  // Local date string helper (avoids UTC timezone shift)
  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Aggregate daily counts: { "2026-11-01": { count: 3, topics: [...] } }
  const dailyData = {};
  for (const entry of activityLog) {
    if (!entry || !entry.t) continue;
    const entryDate = new Date(entry.t);
    if (isNaN(entryDate.getTime())) continue;
    const dateStr = toDateStr(entryDate);
    if (!dailyData[dateStr]) dailyData[dateStr] = { count: 0, topics: [] };
    if (entry.action === 'done') {
      dailyData[dateStr].count++;
      dailyData[dateStr].topics.push({ topic: entry.topic, syllabus: entry.syllabus });
    } else if (entry.action === 'undone') {
      dailyData[dateStr].count = Math.max(0, dailyData[dateStr].count - 1);
    }
  }

  // Rolling 12-month window: the 11 previous months + the current month (shown last).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let anchor = new Date(today);

  // If the device clock is far from the data (no activity in the window ending today),
  // anchor the window on the latest activity date so the grid never renders empty.
  const activeDates = Object.keys(dailyData).filter(d => dailyData[d].count > 0).sort();
  if (activeDates.length) {
    const windowStartStr = toDateStr(new Date(today.getFullYear(), today.getMonth() - 11, 1));
    const hasActivityInWindow = activeDates.some(d => d >= windowStartStr && d <= toDateStr(today));
    if (!hasActivityInWindow) anchor = new Date(activeDates[activeDates.length - 1] + 'T00:00:00');
  }

  const rangeStart = new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1); // 1st of month, 11 months back
  const endDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);     // last day of anchor month
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rangeLabel = `${monthNamesShort[rangeStart.getMonth()]} ${rangeStart.getFullYear()} – ${monthNamesShort[endDate.getMonth()]} ${endDate.getFullYear()}`;

  const titleEl = document.querySelector('.heatmap-title');
  if (titleEl) {
    titleEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Study Activity <span class="heatmap-range">${rangeLabel}</span>
    `;
  }

  // Align grid start to the Sunday on/before the window start
  const startDate = new Date(rangeStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  let currentDate = new Date(startDate);
  let weekCells = [];
  let totalActivities = 0;
  const monthPositions = [];
  let lastMonth = -1;

  while (currentDate <= endDate) {
    const dateStr = toDateStr(currentDate);
    const data = dailyData[dateStr] || { count: 0, topics: [] };
    const level = Math.min(8, data.count);
    const isFuture = currentDate > today;
    const outOfRange = currentDate < rangeStart; // padding days before the window

    if (data.count > 0 && !outOfRange) totalActivities += data.count;

    const m = currentDate.getMonth();
    const y = currentDate.getFullYear();
    if (m !== lastMonth && !outOfRange) {
      monthPositions.push({ month: m, year: y, weekIndex: weeks.length });
      lastMonth = m;
    }

    weekCells.push({
      date: dateStr,
      level: isFuture ? -1 : level,
      outOfRange,
      count: data.count,
      topics: data.topics,
      dayOfWeek: currentDate.getDay(),
    });

    if (currentDate.getDay() === 6 || currentDate >= endDate) {
      weeks.push(weekCells);
      weekCells = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Render grid
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  let html = '<div class="heatmap-grid">';
  html += '<div class="heatmap-day-labels">';
  for (const label of dayLabels) {
    html += `<span class="heatmap-day-label">${label}</span>`;
  }
  html += '</div>';

  const monthStartWeeks = new Set(monthPositions.filter((_, i) => i > 0).map(mp => mp.weekIndex));
  html += '<div class="heatmap-weeks">';
  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    const isMonthStart = monthStartWeeks.has(wi);
    html += `<div class="heatmap-week${isMonthStart ? ' month-start' : ''}">`;
    if (week.length < 7 && weeks.indexOf(week) === 0) {
      for (let p = 0; p < 7 - week.length; p++) {
        html += '<span class="heatmap-cell empty"></span>';
      }
    }
    for (const cell of week) {
      if (cell.outOfRange) {
        html += '<span class="heatmap-cell empty"></span>';
      } else if (cell.level < 0) {
        html += `<span class="heatmap-cell future" data-level="0" data-date="${cell.date}"></span>`;
      } else {
        const tooltipLines = [];
        if (cell.count > 0) {
          tooltipLines.push(`${cell.count} task${cell.count > 1 ? 's' : ''} on ${formatHeatmapDate(cell.date)}`);
          const bySyllabus = {};
          for (const t of cell.topics) {
            if (!bySyllabus[t.syllabus]) bySyllabus[t.syllabus] = [];
            bySyllabus[t.syllabus].push(t.topic);
          }
          for (const [syl, topics] of Object.entries(bySyllabus)) {
            tooltipLines.push(`\n${syl}:`);
            for (const top of topics.slice(0, 5)) {
              const short = top && top.length > 60 ? top.substring(0, 57) + '...' : (top || '');
              tooltipLines.push(`  • ${short}`);
            }
            if (topics.length > 5) tooltipLines.push(`  … and ${topics.length - 5} more`);
          }
        } else {
          tooltipLines.push(`No activity on ${formatHeatmapDate(cell.date)}`);
        }
        html += `<span class="heatmap-cell" data-level="${cell.level}" data-date="${cell.date}" title="${escapeHtml(tooltipLines.join('\n'))}"></span>`;
      }
    }
    if (week.length < 7 && weeks.indexOf(week) === weeks.length - 1) {
      for (let p = 0; p < 7 - week.length; p++) {
        html += '<span class="heatmap-cell empty"></span>';
      }
    }
    html += '</div>';
  }
  html += '</div></div>';
  // Month labels live inside the scrollable body so they scroll with the grid on narrow screens
  html += '<div class="heatmap-months"></div>';
  body.innerHTML = html;

  // Position month labels from the rendered week columns, so they stay aligned
  // whatever cell size the current breakpoint uses.
  const gridEl = body.querySelector('.heatmap-grid');
  const weekEls = body.querySelectorAll('.heatmap-week');
  const monthsEl = body.querySelector('.heatmap-months');
  const gridLeft = gridEl.getBoundingClientRect().left;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthHtml = '';
  for (const mp of monthPositions) {
    if (!weekEls[mp.weekIndex]) continue;
    const px = weekEls[mp.weekIndex].getBoundingClientRect().left - gridLeft;
    monthHtml += `<span class="heatmap-month-label" style="left:${px}px">${monthNames[mp.month]}${mp.month === 0 ? ` ’${String(mp.year).slice(2)}` : ''}</span>`;
  }
  monthsEl.style.width = gridEl.scrollWidth + 'px';
  monthsEl.innerHTML = monthHtml;

  // When the grid overflows (phones), scroll so today / the latest activity is in view
  if (body.scrollWidth > body.clientWidth) {
    const focusCell = body.querySelector(`.heatmap-cell[data-date="${toDateStr(today)}"]`)
      || [...body.querySelectorAll('.heatmap-cell[data-date]:not(.future)')].pop();
    if (focusCell) {
      const cellX = focusCell.getBoundingClientRect().left - body.getBoundingClientRect().left + body.scrollLeft;
      body.scrollLeft = Math.max(0, cellX - body.clientWidth + 48);
    }
  }

  // Touch devices have no hover tooltips — tapping a cell shows its summary instead
  body.onclick = (e) => {
    const cell = e.target.closest('.heatmap-cell[title]');
    if (!cell || !window.matchMedia('(hover: none)').matches) return;
    showToast(cell.getAttribute('title').split('\n')[0]);
  };
}

function formatHeatmapDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Boot & Init ────────────────────────────────────────────────
async function bootTracker() {
  console.log('[boot] Starting Study Lock-In...');
  const savedSyllabus = localStorage.getItem('study-lock-in:active-syllabus') || 'math-for-ml';
  loadStateForSyllabus(savedSyllabus);

  renderApp();
  if (state.meta && state.meta.title) document.title = state.meta.title;

  loadTrophyPile();
  pruneLocalActivity();
  renderHeatmap(getActivityLog());
  console.log('[boot] Ready.');
}

async function init() {
  // Check passcode lock
  const isUnlocked = checkLockState();
  if (isUnlocked) {
    await bootTracker();
  } else {
    console.log('[lock] App locked behind passcode screen.');
  }
}

document.addEventListener('DOMContentLoaded', init);
