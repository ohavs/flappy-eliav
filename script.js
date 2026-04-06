// ===== CONSTANTS =====
const CHAR_LEFT   = 60;
const CHAR_WIDTH  = 46;   // hitbox קצת קטן מהויזואל
const CHAR_HEIGHT = 46;
const BLOCK_WIDTH = 52;
const HIT_PAD     = 4;    // פיקסלים של סלחנות בפגיעה

// פיזיקת Flappy Bird המקורית (60fps, 512px גובה)
const BASE_HEIGHT   = 512;
const BASE_GRAVITY  = 0.5;   // תאוצה לפריים
const BASE_JUMP     = 9.0;   // מהירות קפיצה (כלפי מעלה)
const BASE_TERMINAL = 10.0;  // מהירות נפילה מקסימלית

const FIXED_STEP = 1000 / 60; // ~16.67ms — לולאת פיזיקה קבועה

const MODES = {
  classic: {
    label: 'קלאסי', icon: '☀️',
    gapSize: 150,
    pipeSpeed: 1.0,   // מכפיל מהירות הצינורות יחסית למקור
    gravMult: 1.0,    // מכפיל כוח משיכה
    theme: ''
  },
  hard: {
    label: 'קשה', icon: '🔥',
    gapSize: 115,
    pipeSpeed: 1.7,
    gravMult: 1.4,    // כוח משיכה כבד יותר
    theme: 'hard'
  },
  night: {
    label: 'לילה', icon: '🌙',
    gapSize: 140,
    pipeSpeed: 1.25,
    gravMult: 1.0,
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

// ערכי פיזיקה מסוכלמים לגובה המסך הנוכחי
let gravity    = 0;
let jumpPower  = 0;
let maxFallVel = 0;

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

  gameH = gameDiv.offsetHeight;

  // סכלום פיזיקה לגובה המסך + רמת קושי
  const scale = gameH / BASE_HEIGHT;
  gravity    = BASE_GRAVITY  * scale * currentMode.gravMult;
  jumpPower  = BASE_JUMP     * scale;
  maxFallVel = BASE_TERMINAL * scale * currentMode.gravMult;

  // אנימציית צינורות — רספונסיבית לרוחב המסך
  const gameW       = gameDiv.offsetWidth;
  const pipeDur     = calcPipeDuration(gameW, currentMode.pipeSpeed);
  setAnimKeyframes(gameW);
  holeEl.style.height = currentMode.gapSize + 'px';

  [blockEl, holeEl].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth; // reflow — מאפס את האנימציה
    el.style.animation = `moveBlock ${pipeDur.toFixed(2)}s infinite linear`;
  });

  // מיקום חור התחלתי
  currentHoleTop = randomHoleTop();
  holeEl.style.top = currentHoleTop + 'px';

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

  // הפעל לולאת משחק
  isGameRunning = true;
  lastTime      = null;
  accumulator   = 0;
  rafId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  startGame(currentModeName);
}

function stopLoop() {
  isGameRunning = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// הזרקת keyframes דינמיים לפי רוחב המסך
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
      to   { left: -62px; }
    }
  `;
}

// משך אנימציה — מבוסס על מהירות המקור (Flappy Bird: 288px ב-2.7 שניות)
function calcPipeDuration(gameWidth, speedFactor) {
  const origPxPerSec = (288 + 62) / 2.7; // ~130 px/s במקור
  return (gameWidth + 72) / (origPxPerSec * speedFactor);
}

function randomHoleTop() {
  const margin = 55;
  return Math.random() * (gameH - currentMode.gapSize - margin * 2) + margin;
}

// ===== לולאת משחק — timestep קבוע 60fps =====
function gameLoop(timestamp) {
  if (!isGameRunning) return;
  rafId = requestAnimationFrame(gameLoop);

  if (lastTime === null) { lastTime = timestamp; return; }

  const delta = Math.min(timestamp - lastTime, 50); // מניעת קפיצות ענק אחרי pause
  lastTime = timestamp;
  accumulator += delta;

  // כמה צעדי פיזיקה צריך לבצע לתוך הפריים הזה
  while (accumulator >= FIXED_STEP) {
    physicsStep();
    accumulator -= FIXED_STEP;
  }

  renderAndCheck();
}

// ===== פיזיקת Flappy Bird המדויקת =====
function physicsStep() {
  // כוח משיכה — מוגבל למהירות נפילה מקסימלית (terminal velocity)
  velocityY = Math.min(velocityY + gravity, maxFallVel);
  charTop  += velocityY;

  // גג
  if (charTop < 0) {
    charTop   = 0;
    velocityY = 0;
  }

  // סיבוב חלק (lerp) — כמו במקור:
  // קפיצה → -25°, נפילה → עד 90°
  const targetRot = velocityY < 0
    ? -25
    : Math.min(90, (velocityY / maxFallVel) * 90);
  rotation += (targetRot - rotation) * 0.25;
}

function renderAndCheck() {
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = `rotate(${rotation}deg)`;

  // גילוי פגיעות
  const blockLeft = parseInt(getComputedStyle(blockEl).left);

  const hitTop    = charTop + HIT_PAD;
  const hitBottom = charTop + CHAR_HEIGHT - HIT_PAD;
  const hitLeft   = CHAR_LEFT + HIT_PAD;
  const hitRight  = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;

  const hitFloor = charTop + CHAR_HEIGHT >= gameH;
  const horizHit = blockLeft < hitRight && blockLeft + BLOCK_WIDTH > hitLeft;
  const inHole   = hitTop >= currentHoleTop && hitBottom <= currentHoleTop + currentMode.gapSize;

  if (hitFloor || (horizHit && !inHole)) {
    doGameOver();
  }
}

// עדכון ניקוד + מיקום חור בכל מחזור צינור
holeEl.addEventListener('animationiteration', () => {
  if (!isGameRunning) return;
  currentHoleTop = randomHoleTop();
  holeEl.style.top = currentHoleTop + 'px';
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
  rotation  = -25; // נטייה מיידית כלפי מעלה בקפיצה — כמו במקור
}

gameDiv.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
gameDiv.addEventListener('click', jump);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});

window.addEventListener('resize', () => {
  if (!isGameRunning) return;
  gameH = gameDiv.offsetHeight;
  const scale = gameH / BASE_HEIGHT;
  gravity    = BASE_GRAVITY  * scale * currentMode.gravMult;
  jumpPower  = BASE_JUMP     * scale;
  maxFallVel = BASE_TERMINAL * scale * currentMode.gravMult;
  setAnimKeyframes(gameDiv.offsetWidth);
});

// ===== אתחול =====
showMenu();
