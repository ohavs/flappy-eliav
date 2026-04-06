// ===== CONSTANTS =====
const CHAR_LEFT   = 60;
const CHAR_WIDTH  = 46;
const CHAR_HEIGHT = 46;
const PIPE_WIDTH  = 54;
const HIT_PAD     = 4;

const FIXED_STEP = 1000 / 60; // ~16.67ms — פיזיקה קבועה 60fps

// ערכי פיזיקה ב-px/frame (60fps), מכוונים ישירות.
//   גובה קפיצה = jumpPower² / (2 × gravity)
//   זמן קשת   = (jumpPower / gravity) × 2 פריימים
//
//   classic:  0.42 / 8.5 → ~86px גובה, ~0.67s קשת
//   hard:     0.60 / 8.5 → ~60px גובה, ~0.47s קשת

const MODES = {
  classic: {
    label: 'קלאסי', icon: '☀️',
    gravity:    0.42,
    jumpPower:  8.5,
    maxFallVel: 9.0,
    gapSize:    195,
    pipeSpeed:  1.0,
    theme: ''
  },
  hard: {
    label: 'קשה', icon: '🔥',
    gravity:    0.60,
    jumpPower:  8.5,
    maxFallVel: 12.0,
    gapSize:    145,
    pipeSpeed:  1.7,
    theme: 'hard'
  },
  night: {
    label: 'לילה', icon: '🌙',
    gravity:    0.42,
    jumpPower:  8.5,
    maxFallVel: 9.0,
    gapSize:    175,
    pipeSpeed:  1.25,
    theme: 'night'
  }
};

// ===== STATE =====
let currentModeName = null;
let currentMode     = null;
let velocityY       = 0;
let charTop         = 0;
let rotation        = 0;
let counter         = 0;
let rafId           = null;
let lastTime        = null;
let accumulator     = 0;
let isGameRunning   = false;
let gameH           = 0;
let currentHoleTop  = 0;
let gravity         = 0;
let jumpPower       = 0;
let maxFallVel      = 0;

// ===== DOM =====
const menuScreen   = document.getElementById('menu-screen');
const gameDiv      = document.getElementById('game');
const gameoverScr  = document.getElementById('gameover-screen');
const pipeTopEl    = document.getElementById('pipe-top');
const pipeBotEl    = document.getElementById('pipe-bottom');
const characterEl  = document.getElementById('character');
const liveScoreEl  = document.getElementById('live-score');
const highScoreEl  = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score-display');
const hsMenuEl     = document.getElementById('highscores-menu');
const tapHintEl    = document.getElementById('tap-hint');

// ===== שיאים =====
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

// ===== מסכים =====
function showMenu() {
  stopLoop();
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

  gameH      = gameDiv.offsetHeight;
  gravity    = currentMode.gravity;
  jumpPower  = currentMode.jumpPower;
  maxFallVel = currentMode.maxFallVel;

  // הגדר אנימציה לפי רוחב המסך
  const gameW   = gameDiv.offsetWidth;
  const pipeDur = calcPipeDuration(gameW, currentMode.pipeSpeed);
  setAnimKeyframes(gameW);

  [pipeTopEl, pipeBotEl].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth; // reflow — מאפס אנימציה
    el.style.animation = `moveBlock ${pipeDur.toFixed(2)}s infinite linear`;
  });

  // מיקום ראשוני של הצינורות
  setPipeHeights(randomHoleTop());

  // איפוס דמות
  charTop   = gameH * 0.25;
  velocityY = 0;
  rotation  = 0;
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = '';

  // ניקוד
  counter = 0;
  liveScoreEl.textContent = 'ניקוד: 0';
  highScoreEl.textContent  = 'שיא: ' + getHS(modeName);

  // רמז הקשה
  tapHintEl.style.animation = 'none';
  void tapHintEl.offsetWidth;
  tapHintEl.style.animation = 'fadeHint 3s forwards';

  isGameRunning = true;
  lastTime      = null;
  accumulator   = 0;
  rafId = requestAnimationFrame(gameLoop);
}

function restartGame() { startGame(currentModeName); }

function stopLoop() {
  isGameRunning = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// מגדיר גובה שני הצינורות לפי מיקום הפתח
function setPipeHeights(holeTop) {
  currentHoleTop = holeTop;
  pipeTopEl.style.height = holeTop + 'px';
  pipeBotEl.style.height = (gameH - holeTop - currentMode.gapSize) + 'px';
}

function randomHoleTop() {
  const margin = 60;
  return Math.random() * (gameH - currentMode.gapSize - margin * 2) + margin;
}

// keyframes דינמיים לפי רוחב המסך
function setAnimKeyframes(gameWidth) {
  let el = document.getElementById('dyn-anim');
  if (!el) {
    el = document.createElement('style');
    el.id = 'dyn-anim';
    document.head.appendChild(el);
  }
  el.textContent = `
    @keyframes moveBlock {
      from { left: ${gameWidth + 10}px; }
      to   { left: -80px; }
    }
  `;
}

// Flappy Bird מקורי: 288px ב-2.7s (~130px/s)
function calcPipeDuration(gameWidth, speedFactor) {
  const origPxPerSec = (288 + 62) / 2.7;
  return (gameWidth + 90) / (origPxPerSec * speedFactor);
}

// ===== לולאת משחק — timestep קבוע 60fps =====
function gameLoop(timestamp) {
  if (!isGameRunning) return;
  rafId = requestAnimationFrame(gameLoop);

  if (lastTime === null) { lastTime = timestamp; return; }

  const delta = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  accumulator += delta;

  while (accumulator >= FIXED_STEP) {
    physicsStep();
    accumulator -= FIXED_STEP;
  }

  renderAndCheck();
}

function physicsStep() {
  velocityY = Math.min(velocityY + gravity, maxFallVel);
  charTop  += velocityY;

  if (charTop < 0) { charTop = 0; velocityY = 0; }

  // סיבוב: קפיצה → -25°, נפילה → עד 90°
  const targetRot = velocityY < 0
    ? -25
    : Math.min(90, (velocityY / maxFallVel) * 90);
  rotation += (targetRot - rotation) * 0.25;
}

function renderAndCheck() {
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = `rotate(${rotation}deg)`;

  // קריאת מיקום צינור מהאנימציה
  const pipeLeft = parseInt(getComputedStyle(pipeTopEl).left);

  // hitbox מרוחק (סלחני)
  const hitTop    = charTop + HIT_PAD;
  const hitBottom = charTop + CHAR_HEIGHT - HIT_PAD;
  const hitLeft   = CHAR_LEFT + HIT_PAD;
  const hitRight  = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;

  const hitFloor = charTop + CHAR_HEIGHT >= gameH;
  const horizHit = pipeLeft < hitRight && pipeLeft + PIPE_WIDTH > hitLeft;
  const inGap    = hitTop >= currentHoleTop && hitBottom <= currentHoleTop + currentMode.gapSize;

  if (hitFloor || (horizHit && !inGap)) {
    doGameOver();
  }
}

// בכל סיבוב צינור — מיקום חדש + ניקוד
pipeTopEl.addEventListener('animationiteration', () => {
  if (!isGameRunning) return;
  setPipeHeights(randomHoleTop());
  counter++;
  liveScoreEl.textContent = 'ניקוד: ' + counter;
});

function doGameOver() {
  stopLoop();
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

// ===== שליטה =====
function jump() {
  if (!isGameRunning) return;
  velocityY = -jumpPower;
  rotation  = -25;
}

gameDiv.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
gameDiv.addEventListener('click', jump);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});

window.addEventListener('resize', () => {
  if (!isGameRunning) return;
  gameH = gameDiv.offsetHeight;
  setAnimKeyframes(gameDiv.offsetWidth);
});

// ===== אתחול =====
showMenu();
