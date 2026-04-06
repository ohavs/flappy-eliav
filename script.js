// ===== CONSTANTS =====
const CHAR_LEFT   = 60;   // fixed x position of character
const CHAR_WIDTH  = 46;   // slightly smaller than visual for fair hitbox
const CHAR_HEIGHT = 46;
const BLOCK_WIDTH = 52;
const HIT_PAD     = 5;    // collision forgiveness (px)

const MODES = {
  classic: {
    label: 'קלאסי', icon: '☀️',
    speed: 2.2,       // pipe animation duration in seconds (higher = slower)
    gapSize: 150,     // hole height in pixels
    gravity: 0.35,    // velocity added per tick (10ms)
    jumpPower: 8,     // upward velocity on tap
    theme: ''
  },
  hard: {
    label: 'קשה', icon: '🔥',
    speed: 1.4,
    gapSize: 115,
    gravity: 0.48,
    jumpPower: 8,
    theme: 'hard'
  },
  night: {
    label: 'לילה', icon: '🌙',
    speed: 1.9,
    gapSize: 140,
    gravity: 0.35,
    jumpPower: 8,
    theme: 'night'
  }
};

// ===== STATE =====
let currentModeName = null;
let currentMode     = null;
let velocityY       = 0;
let charTop         = 0;
let counter         = 0;
let gameLoopId      = null;
let isGameRunning   = false;
let gameH           = 0;
let currentHoleTop  = 0;

// ===== DOM =====
const menuScreen   = document.getElementById('menu-screen');
const gameDiv      = document.getElementById('game');
const gameoverScr  = document.getElementById('gameover-screen');
const blockEl      = document.getElementById('block');
const holeEl       = document.getElementById('hole');
const characterEl  = document.getElementById('character');
const liveScoreEl  = document.getElementById('live-score');
const highScoreEl  = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score-display');
const hsMenuEl     = document.getElementById('highscores-menu');
const tapHintEl    = document.getElementById('tap-hint');

// ===== HIGH SCORE =====
function getHS(mode) {
  return parseInt(localStorage.getItem('hs_' + mode) || '0');
}
function saveHS(mode, score) {
  if (score > getHS(mode)) {
    localStorage.setItem('hs_' + mode, score);
    return true;
  }
  return false;
}

// ===== SCREENS =====
function showMenu() {
  stopLoop();
  isGameRunning = false;
  menuScreen.classList.remove('hidden');
  gameDiv.classList.add('hidden');
  gameoverScr.classList.add('hidden');
  hsMenuEl.innerHTML = Object.keys(MODES)
    .map(m => `<span class="hs-item">${MODES[m].icon} ${MODES[m].label}: ${getHS(m)}</span>`)
    .join('');
}

function startGame(modeName) {
  stopLoop();
  currentModeName = modeName;
  currentMode     = MODES[modeName];

  menuScreen.classList.add('hidden');
  gameoverScr.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  gameDiv.className = currentMode.theme ? 'theme-' + currentMode.theme : '';

  gameH = gameDiv.offsetHeight;

  // Inject responsive animation based on screen width
  setAnimKeyframes(gameDiv.offsetWidth);

  // Set hole size
  holeEl.style.height = currentMode.gapSize + 'px';

  // Restart pipe animation
  [blockEl, holeEl].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth; // force reflow to restart animation
    el.style.animation = `moveBlock ${currentMode.speed}s infinite linear`;
  });

  // Place hole at random starting position
  currentHoleTop = randomHoleTop();
  holeEl.style.top = currentHoleTop + 'px';

  // Reset character
  charTop   = gameH * 0.25;
  velocityY = 0;
  characterEl.style.top = charTop + 'px';
  characterEl.style.transform = '';

  // Reset scores
  counter = 0;
  liveScoreEl.textContent = 'ניקוד: 0';
  highScoreEl.textContent  = 'שיא: ' + getHS(modeName);

  // Show tap hint then fade
  tapHintEl.style.animation = 'none';
  void tapHintEl.offsetWidth;
  tapHintEl.style.animation = 'fadeHint 3s forwards';

  isGameRunning = true;
  gameLoopId = setInterval(tick, 10);
}

function restartGame() {
  startGame(currentModeName);
}

function stopLoop() {
  clearInterval(gameLoopId);
  gameLoopId = null;
}

// Inject @keyframes with exact pixel start so animation matches screen width
function setAnimKeyframes(gameWidth) {
  let styleEl = document.getElementById('dyn-anim');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dyn-anim';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @keyframes moveBlock {
      from { left: ${gameWidth + 10}px; }
      to   { left: -62px; }
    }
  `;
}

function randomHoleTop() {
  const margin = 55;
  const min = margin;
  const max = gameH - currentMode.gapSize - margin;
  return Math.random() * (max - min) + min;
}

// ===== GAME LOOP =====
function tick() {
  // Velocity-based physics — smooth parabolic arc
  velocityY += currentMode.gravity;
  charTop   += velocityY;

  // Ceiling clamp
  if (charTop < 0) {
    charTop   = 0;
    velocityY = 0;
  }

  // Rotate character: nose-up when jumping, nose-down when falling
  const angle = Math.max(-25, Math.min(45, velocityY * 4));
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = `rotate(${angle}deg)`;

  // Get pipe position from CSS animation
  const blockLeft = parseInt(getComputedStyle(blockEl).left);

  // Hitbox with forgiveness padding
  const hitTop    = charTop + HIT_PAD;
  const hitBottom = charTop + CHAR_HEIGHT - HIT_PAD;
  const hitLeft   = CHAR_LEFT + HIT_PAD;
  const hitRight  = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;

  const hitFloor   = charTop + CHAR_HEIGHT >= gameH;
  const horizHit   = blockLeft < hitRight && blockLeft + BLOCK_WIDTH > hitLeft;
  const inHole     = hitTop >= currentHoleTop && hitBottom <= currentHoleTop + currentMode.gapSize;

  if (hitFloor || (horizHit && !inHole)) {
    doGameOver();
  }
}

// Update hole position and score each time pipe loops
holeEl.addEventListener('animationiteration', () => {
  if (!isGameRunning) return;
  currentHoleTop = randomHoleTop();
  holeEl.style.top = currentHoleTop + 'px';
  counter++;
  liveScoreEl.textContent = 'ניקוד: ' + counter;
});

function doGameOver() {
  stopLoop();
  isGameRunning = false;

  const newRecord = saveHS(currentModeName, counter);

  gameDiv.classList.add('hidden');
  gameoverScr.classList.remove('hidden');

  finalScoreEl.innerHTML = `
    <div class="go-mode">${currentMode.icon} מצב ${currentMode.label}</div>
    <div class="go-points">ניקוד: <strong>${counter}</strong></div>
    <div class="go-best">שיא: ${getHS(currentModeName)}</div>
    ${newRecord ? '<div class="new-record">🎉 שיא חדש!</div>' : ''}
  `;
}

// ===== CONTROLS =====
function jump() {
  if (!isGameRunning) return;
  velocityY = -currentMode.jumpPower;
}

// Touch (prevent scroll/zoom on mobile)
gameDiv.addEventListener('touchstart', e => {
  e.preventDefault();
  jump();
}, { passive: false });

// Click (desktop)
gameDiv.addEventListener('click', jump);

// Keyboard
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
});

// Recalculate on orientation change / resize
window.addEventListener('resize', () => {
  if (isGameRunning) {
    gameH = gameDiv.offsetHeight;
    setAnimKeyframes(gameDiv.offsetWidth);
  }
});

// ===== INIT =====
showMenu();
