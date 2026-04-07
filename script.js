// ===== CONSTANTS =====
const CHAR_LEFT    = 60;
const CHAR_WIDTH   = 56;
const CHAR_HEIGHT  = 56;
const PIPE_WIDTH   = 54;
const OBS_WIDTH    = 46;
const GROUND_H     = 72;
const HIT_PAD      = 5;
const FIXED_STEP   = 1000 / 60;

const MODES = {
  classic: {
    label: 'קלאסי', icon: '☀️', type: 'flappy',
    gravity: 0.42, jumpPower: 8.5, maxFallVel: 9.0,
    gapSize: 195, pipeSpeed: 1.0, theme: ''
  },
  hard: {
    label: 'קשה', icon: '🔥', type: 'flappy',
    gravity: 0.60, jumpPower: 8.5, maxFallVel: 12.0,
    gapSize: 145, pipeSpeed: 1.7, theme: 'hard'
  },
  night: {
    label: 'לילה', icon: '🌙', type: 'flappy',
    gravity: 0.42, jumpPower: 8.5, maxFallVel: 9.0,
    gapSize: 175, pipeSpeed: 1.25, theme: 'night'
  },
  mario: {
    label: 'ריצה', icon: '🏃', type: 'mario',
    gravity: 0.55, jumpPower: 13, maxFallVel: 18,
    gapSize: 0, pipeSpeed: 0, theme: 'mario'
  }
};

// ===== STATE =====
let currentModeName  = null;
let currentMode      = null;
let velocityY        = 0;
let charTop          = 0;
let rotation         = 0;
let counter          = 0;
let rafId            = null;
let lastTime         = null;
let accumulator      = 0;
let isGameRunning    = false;
let gameH            = 0;
let currentHoleTop   = 0;
let gravity          = 0;
let jumpPower        = 0;
let maxFallVel       = 0;

// Mario-specific state
let isOnGround         = false;
let groundY            = 0;
let obsHeight          = 0;
let obsDuration        = 2.8;
let obsPassedThisCycle = false;

// ===== DOM =====
const menuScreen   = document.getElementById('menu-screen');
const gameDiv      = document.getElementById('game');
const gameoverScr  = document.getElementById('gameover-screen');
const pipeTopEl    = document.getElementById('pipe-top');
const pipeBotEl    = document.getElementById('pipe-bottom');
const groundEl     = document.getElementById('ground');
const obstacleEl   = document.getElementById('obstacle');
const characterEl  = document.getElementById('character');
const liveScoreEl  = document.getElementById('live-score');
const highScoreEl  = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score-display');
const hsMenuEl     = document.getElementById('highscores-menu');
const tapHintEl    = document.getElementById('tap-hint');

// ===== שיאים =====
function getHS(mode) { return parseInt(localStorage.getItem('hs_' + mode) || '0'); }
function saveHS(mode, score) {
  if (score > getHS(mode)) { localStorage.setItem('hs_' + mode, score); return true; }
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

  if (currentMode.type === 'mario') {
    setupMario();
  } else {
    setupFlappy();
  }

  counter = 0;
  liveScoreEl.textContent = 'ניקוד: 0';
  highScoreEl.textContent  = 'שיא: ' + getHS(modeName);

  tapHintEl.style.animation = 'none';
  void tapHintEl.offsetWidth;
  tapHintEl.style.animation = 'fadeHint 3s forwards';

  isGameRunning = true;
  lastTime      = null;
  accumulator   = 0;
  rafId = requestAnimationFrame(gameLoop);
}

// ===== הגדרת מצב פלאפי =====
function setupFlappy() {
  // הצג צינורות, הסתר מריו
  pipeTopEl.classList.remove('hidden');
  pipeBotEl.classList.remove('hidden');
  groundEl.classList.add('hidden');
  obstacleEl.classList.add('hidden');

  const gameW   = gameDiv.offsetWidth;
  const pipeDur = calcPipeDuration(gameW, currentMode.pipeSpeed);
  setAnimKeyframes(gameW);

  [pipeTopEl, pipeBotEl].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = `moveBlock ${pipeDur.toFixed(2)}s infinite linear`;
  });

  setPipeHeights(randomHoleTop());

  charTop   = gameH * 0.25;
  velocityY = 0;
  rotation  = 0;
  characterEl.classList.remove('running');
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = '';
}

// ===== הגדרת מצב מריו =====
function setupMario() {
  // הסתר צינורות, הצג מריו
  pipeTopEl.classList.add('hidden');
  pipeBotEl.classList.add('hidden');
  groundEl.classList.remove('hidden');
  obstacleEl.classList.remove('hidden');

  groundY    = gameH - GROUND_H;
  isOnGround = true;
  charTop    = groundY - CHAR_HEIGHT;
  velocityY  = 0;
  rotation   = 0;

  characterEl.classList.add('running');
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = '';

  // קצב גלילת קרקע ראשוני
  obsDuration = 2.8;
  setObstacleAnim();
  randomizeObstacle();
}

function randomizeObstacle() {
  // גובה מכשול אקראי (50–110px), גדל עם הניקוד
  const minH = 50;
  const maxH = Math.min(50 + counter * 3, 120);
  obsHeight = Math.floor(Math.random() * (maxH - minH) + minH);
  obstacleEl.style.height = obsHeight + 'px';
  obsPassedThisCycle = false;
}

function setObstacleAnim() {
  const gameW = gameDiv.offsetWidth;
  let styleEl = document.getElementById('obs-anim');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'obs-anim';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @keyframes moveObstacle {
      from { left: ${gameW + 10}px; }
      to   { left: -70px; }
    }
  `;
  // גלילת קרקע באותו קצב
  groundEl.style.setProperty('--obs-dur', obsDuration + 's');

  obstacleEl.style.animation = 'none';
  void obstacleEl.offsetWidth;
  obstacleEl.style.animation = `moveObstacle ${obsDuration}s linear infinite`;
}

function restartGame() { startGame(currentModeName); }

function stopLoop() {
  isGameRunning = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// ===== פלאפי — עזר =====
function setPipeHeights(holeTop) {
  currentHoleTop = holeTop;
  pipeTopEl.style.height = holeTop + 'px';
  pipeBotEl.style.height = (gameH - holeTop - currentMode.gapSize) + 'px';
}
function randomHoleTop() {
  const margin = 60;
  return Math.random() * (gameH - currentMode.gapSize - margin * 2) + margin;
}
function setAnimKeyframes(gameWidth) {
  let el = document.getElementById('dyn-anim');
  if (!el) { el = document.createElement('style'); el.id = 'dyn-anim'; document.head.appendChild(el); }
  el.textContent = `@keyframes moveBlock { from { left: ${gameWidth + 10}px; } to { left: -80px; } }`;
}
function calcPipeDuration(gameWidth, speedFactor) {
  return (gameWidth + 90) / ((288 + 62) / 2.7 * speedFactor);
}

// ===== לולאת משחק =====
function gameLoop(timestamp) {
  if (!isGameRunning) return;
  rafId = requestAnimationFrame(gameLoop);
  if (lastTime === null) { lastTime = timestamp; return; }

  const delta = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  accumulator += delta;

  while (accumulator >= FIXED_STEP) {
    currentMode.type === 'mario' ? marioStep() : flappyStep();
    accumulator -= FIXED_STEP;
  }

  currentMode.type === 'mario' ? marioRender() : flappyRender();
}

// ===== פיזיקת פלאפי =====
function flappyStep() {
  velocityY = Math.min(velocityY + gravity, maxFallVel);
  charTop  += velocityY;
  if (charTop < 0) { charTop = 0; velocityY = 0; }
  const target = velocityY < 0 ? -25 : Math.min(90, (velocityY / maxFallVel) * 90);
  rotation += (target - rotation) * 0.25;
}

function flappyRender() {
  characterEl.style.top       = charTop + 'px';
  characterEl.style.transform = `rotate(${rotation}deg)`;

  const pipeLeft = parseInt(getComputedStyle(pipeTopEl).left);
  const hitTop    = charTop + HIT_PAD;
  const hitBottom = charTop + CHAR_HEIGHT - HIT_PAD;
  const hitRight  = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;
  const hitLeft   = CHAR_LEFT + HIT_PAD;

  const hitFloor = charTop + CHAR_HEIGHT >= gameH;
  const horizHit = pipeLeft < hitRight && pipeLeft + PIPE_WIDTH > hitLeft;
  const inGap    = hitTop >= currentHoleTop && hitBottom <= currentHoleTop + currentMode.gapSize;

  if (hitFloor || (horizHit && !inGap)) doGameOver();
}

pipeTopEl.addEventListener('animationiteration', () => {
  if (!isGameRunning || currentMode.type !== 'flappy') return;
  setPipeHeights(randomHoleTop());
  counter++;
  liveScoreEl.textContent = 'ניקוד: ' + counter;
});

// ===== פיזיקת מריו =====
function marioStep() {
  if (!isOnGround) {
    velocityY = Math.min(velocityY + gravity, maxFallVel);
    charTop  += velocityY;
  }

  // נחיתה על הקרקע
  if (charTop >= groundY - CHAR_HEIGHT) {
    charTop    = groundY - CHAR_HEIGHT;
    velocityY  = 0;
    isOnGround = true;
  }

  // גג
  if (charTop < 0) { charTop = 0; velocityY = Math.max(0, velocityY); }
}

function marioRender() {
  characterEl.style.top = charTop + 'px';

  // סיבוב קל באוויר בלבד
  if (!isOnGround) {
    characterEl.classList.remove('running');
    const target = velocityY < 0 ? -15 : Math.min(30, velocityY * 2);
    rotation += (target - rotation) * 0.2;
    characterEl.style.transform = `rotate(${rotation}deg)`;
  } else {
    characterEl.classList.add('running');
    rotation = 0;
    characterEl.style.transform = '';
  }

  const obsLeft   = parseInt(getComputedStyle(obstacleEl).left);
  const obsTop    = groundY - obsHeight; // חלק עליון של המכשול
  const hitTop    = charTop + HIT_PAD;
  const hitBottom = charTop + CHAR_HEIGHT - HIT_PAD;
  const hitLeft   = CHAR_LEFT + HIT_PAD;
  const hitRight  = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;

  const horizHit = obsLeft < hitRight && obsLeft + OBS_WIDTH > hitLeft;
  const vertHit  = hitBottom > obsTop + HIT_PAD;

  if (horizHit && vertHit) { doGameOver(); return; }

  // ניקוד: מכשול עבר את הדמות
  if (!obsPassedThisCycle && obsLeft + OBS_WIDTH < CHAR_LEFT) {
    obsPassedThisCycle = true;
    counter++;
    liveScoreEl.textContent = 'ניקוד: ' + counter;
    // האצה הדרגתית כל 5 מכשולים
    if (counter % 5 === 0 && obsDuration > 1.3) {
      obsDuration = Math.max(1.3, obsDuration - 0.18);
      setObstacleAnim();
    }
  }
}

obstacleEl.addEventListener('animationiteration', () => {
  if (!isGameRunning || currentMode.type !== 'mario') return;
  randomizeObstacle();
});

// ===== Game Over =====
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
  if (currentMode.type === 'mario') {
    if (!isOnGround) return; // קפיצה כפולה אסורה
    isOnGround = false;
    velocityY  = -jumpPower;
  } else {
    velocityY = -jumpPower;
    rotation  = -25;
  }
}

gameDiv.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
gameDiv.addEventListener('click', jump);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});

window.addEventListener('resize', () => {
  if (!isGameRunning) return;
  gameH = gameDiv.offsetHeight;
  if (currentMode.type === 'mario') {
    groundY = gameH - GROUND_H;
    setObstacleAnim();
  } else {
    setAnimKeyframes(gameDiv.offsetWidth);
  }
});

// ===== אתחול =====
showMenu();
