// ============================================================
//  CONSTANTS
// ============================================================
const CHAR_LEFT   = 60;
const CHAR_WIDTH  = 56;
const CHAR_HEIGHT = 56;
const PIPE_WIDTH  = 54;
const OBS_WIDTH   = 46;
const GROUND_H    = 72;
const HIT_PAD     = 5;
const FIXED_STEP  = 1000 / 60;

const MODES = {
  classic: { label:'קלאסי', icon:'☀️', type:'flappy', gravity:0.42, jumpPower:8.5, maxFallVel:9,   gapSize:195, pipeSpeed:1.0,  theme:'' },
  hard:    { label:'קשה',   icon:'🔥', type:'flappy', gravity:0.60, jumpPower:8.5, maxFallVel:12,  gapSize:145, pipeSpeed:1.7,  theme:'hard' },
  night:   { label:'לילה',  icon:'🌙', type:'flappy', gravity:0.42, jumpPower:8.5, maxFallVel:9,   gapSize:175, pipeSpeed:1.25, theme:'night' },
  mario:   { label:'ריצה',  icon:'🏃', type:'mario',  gravity:0.55, jumpPower:13,  maxFallVel:18,  gapSize:0,   pipeSpeed:0,    theme:'mario' }
};

// Mario levels — score threshold → config
const MARIO_LEVELS = [
  { minScore:0,  name:'🌱 שלב 1', baseDur:2.8, obsMinH:45, obsMaxH:75,  bgClass:'' },
  { minScore:6,  name:'🌿 שלב 2', baseDur:2.2, obsMinH:50, obsMaxH:90,  bgClass:'mario-l2' },
  { minScore:13, name:'🌳 שלב 3', baseDur:1.85,obsMinH:55, obsMaxH:110, bgClass:'mario-l3' },
  { minScore:22, name:'🏔️ שלב 4', baseDur:1.5, obsMinH:60, obsMaxH:120, bgClass:'mario-l4' },
  { minScore:33, name:'👑 שלב 5', baseDur:1.2, obsMinH:65, obsMaxH:130, bgClass:'mario-l5' },
];

// Obstacle types
const OBS_TYPES = ['obs-normal','obs-low','obs-tall','obs-normal','obs-normal'];

// ============================================================
//  SOUND ENGINE (Web Audio API — no files needed)
// ============================================================
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function beep(freq, dur, type='sine', vol=0.25, freqEnd=null, delay=0) {
  try {
    const ctx  = getAudio();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch(e) {}
}
const SFX = {
  jump:    () => beep(320, 0.14, 'sine',     0.22, 640),
  djump:   () => beep(500, 0.18, 'sine',     0.28, 900),
  coin:    () => { beep(784,0.1,'sine',0.2); beep(1047,0.12,'sine',0.2,null,0.08); },
  score:   () => beep(440, 0.07, 'sine',     0.14),
  levelup: () => { [261,329,392,523].forEach((f,i) => beep(f,0.18,'triangle',0.28,null,i*0.1)); },
  death:   () => { beep(350,0.08,'square',0.3); beep(200,0.35,'sawtooth',0.3,80,0.08); },
};

// ============================================================
//  STATE
// ============================================================
let currentModeName  = null;
let currentMode      = null;
let velocityY        = 0;
let charTop          = 0;
let rotation         = 0;
let counter          = 0;
let coins            = 0;
let rafId            = null;
let lastTime         = null;
let accumulator      = 0;
let isGameRunning    = false;
let gameH = 0, gameW = 0;
let currentHoleTop   = 0;
let gravity = 0, jumpPower = 0, maxFallVel = 0;

// Mario-specific
let isOnGround        = false;
let jumpsLeft         = 2;   // double-jump support
let groundY           = 0;
let obsDuration       = 2.8;
let obs1H = 0, obs2H = 0;
let obs1Type = '', obs2Type = '';
let obs1Passed = false, obs2Active = false;
let currentLevel      = null;
let coinActive        = false;
let coinCollected     = false;
let coinY             = 0;
let coinDur           = 0;

// ============================================================
//  DOM
// ============================================================
const menuScreen   = document.getElementById('menu-screen');
const gameDiv      = document.getElementById('game');
const gameoverScr  = document.getElementById('gameover-screen');
const pipeTopEl    = document.getElementById('pipe-top');
const pipeBotEl    = document.getElementById('pipe-bottom');
const groundEl     = document.getElementById('ground');
const obstacleEl   = document.getElementById('obstacle');
const obstacle2El  = document.getElementById('obstacle2');
const coinWrapEl   = document.getElementById('coin-wrap');
const coinEl       = document.getElementById('coin');
const levelBanner  = document.getElementById('level-banner');
const jumpDot1     = document.getElementById('jd1');
const jumpDot2     = document.getElementById('jd2');
const characterEl  = document.getElementById('character');
const liveScoreEl  = document.getElementById('live-score');
const highScoreEl  = document.getElementById('high-score');
const coinScoreEl  = document.getElementById('coin-score');
const finalScoreEl = document.getElementById('final-score-display');
const hsMenuEl     = document.getElementById('highscores-menu');
const tapHintEl    = document.getElementById('tap-hint');
const jumpDotsEl   = document.getElementById('jump-dots');

// ============================================================
//  HIGH SCORE
// ============================================================
function getHS(m) { return parseInt(localStorage.getItem('hs_'+m)||'0'); }
function saveHS(m, s) { if(s>getHS(m)){localStorage.setItem('hs_'+m,s);return true;} return false; }

// ============================================================
//  SCREENS
// ============================================================
function showMenu() {
  stopLoop();
  menuScreen.classList.remove('hidden');
  gameDiv.classList.add('hidden');
  gameoverScr.classList.add('hidden');
  hsMenuEl.innerHTML = Object.keys(MODES)
    .map(m=>`<span class="hs-item">${MODES[m].icon} ${MODES[m].label}: ${getHS(m)}</span>`).join('');
}

function startGame(modeName) {
  stopLoop();
  currentModeName = modeName;
  currentMode     = MODES[modeName];
  menuScreen.classList.add('hidden');
  gameoverScr.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  gameDiv.className = currentMode.theme ? 'theme-'+currentMode.theme : '';
  gameH = gameDiv.offsetHeight;
  gameW = gameDiv.offsetWidth;
  gravity    = currentMode.gravity;
  jumpPower  = currentMode.jumpPower;
  maxFallVel = currentMode.maxFallVel;

  counter = 0; coins = 0;
  liveScoreEl.textContent = 'ניקוד: 0';
  highScoreEl.textContent = 'שיא: '+getHS(modeName);

  if (currentMode.type === 'mario') { setupMario(); }
  else { setupFlappy(); }

  tapHintEl.style.animation = 'none';
  void tapHintEl.offsetWidth;
  tapHintEl.style.animation = 'fadeHint 3s forwards';
  isGameRunning = true; lastTime = null; accumulator = 0;
  rafId = requestAnimationFrame(gameLoop);
}
function restartGame() { startGame(currentModeName); }

function stopLoop() {
  isGameRunning = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// ============================================================
//  FLAPPY SETUP
// ============================================================
function setupFlappy() {
  pipeTopEl.classList.remove('hidden'); pipeBotEl.classList.remove('hidden');
  groundEl.classList.add('hidden'); obstacleEl.classList.add('hidden');
  obstacle2El.classList.add('hidden'); coinWrapEl.classList.add('hidden');
  jumpDotsEl.style.display = 'none'; coinScoreEl.classList.add('hidden');
  setAnimKeyframes(gameW);
  const dur = calcPipeDuration(gameW, currentMode.pipeSpeed);
  [pipeTopEl, pipeBotEl].forEach(el => {
    el.style.animation = 'none'; void el.offsetWidth;
    el.style.animation = `moveBlock ${dur.toFixed(2)}s infinite linear`;
  });
  setPipeHeights(randomHoleTop());
  charTop = gameH * 0.25; velocityY = 0; rotation = 0;
  characterEl.classList.remove('running','djump');
  characterEl.style.top = charTop+'px'; characterEl.style.transform = '';
}

// ============================================================
//  MARIO SETUP
// ============================================================
function setupMario() {
  pipeTopEl.classList.add('hidden'); pipeBotEl.classList.add('hidden');
  groundEl.classList.remove('hidden');
  obstacleEl.classList.remove('hidden'); obstacle2El.classList.add('hidden');
  jumpDotsEl.style.display = 'flex'; coinScoreEl.classList.remove('hidden');
  coinScoreEl.textContent = '🪙 0';
  groundY   = gameH - GROUND_H;
  isOnGround = true; jumpsLeft = 2;
  charTop    = groundY - CHAR_HEIGHT;
  velocityY  = 0; rotation = 0;
  characterEl.classList.add('running'); characterEl.classList.remove('djump');
  characterEl.style.top = charTop+'px'; characterEl.style.transform = '';
  updateJumpDots();

  currentLevel = null; obsDuration = 2.8;
  coinActive = false; coinWrapEl.classList.add('hidden');
  setObstacleKeyframes();
  spawnObstacle(obstacleEl, false);
  obstacle2El.classList.add('hidden'); obs2Active = false;
  checkLevelUp();
}

// ============================================================
//  MARIO — OBSTACLE HELPERS
// ============================================================
function randomObsType(level) {
  // More variety at higher levels
  const lvIdx = MARIO_LEVELS.indexOf(currentLevel || MARIO_LEVELS[0]);
  const pool = lvIdx >= 2
    ? ['obs-normal','obs-low','obs-tall','obs-move','obs-normal']
    : OBS_TYPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnObstacle(el, isSecond) {
  const lvl = currentLevel || MARIO_LEVELS[0];
  const type = randomObsType();
  let minH = lvl.obsMinH, maxH = lvl.obsMaxH;
  if (type === 'obs-low')  { minH = 28; maxH = 42; }
  if (type === 'obs-tall') { minH = Math.max(lvl.obsMinH + 20, 80); maxH = lvl.obsMaxH + 20; }
  const h = Math.floor(Math.random() * (maxH - minH) + minH);
  el.style.height = h + 'px';
  el.className = type;  // clears old classes, sets new
  el.style.animation = 'none'; void el.offsetWidth;
  const delay = isSecond ? obsDuration * 0.52 : 0;
  el.style.animation = `moveObstacle ${obsDuration}s ${delay}s linear infinite`;
  if (isSecond) { obs2H = h; obs2Type = type; }
  else { obs1H = h; obs1Type = type; obs1Passed = false; }
}

function setObstacleKeyframes() {
  let el = document.getElementById('obs-anim');
  if (!el) { el = document.createElement('style'); el.id = 'obs-anim'; document.head.appendChild(el); }
  el.textContent = `@keyframes moveObstacle { from { left:${gameW+10}px; } to { left:-70px; } }`;
}

// ============================================================
//  MARIO — COIN HELPERS
// ============================================================
function spawnCoin() {
  if (!isGameRunning) return;
  coinCollected = false;
  // Reachable height: above obstacle but below a single jump apex
  const jumpApex = (groundY - CHAR_HEIGHT) - (jumpPower * jumpPower) / (2 * gravity);
  const minY = Math.max(jumpApex + 20, 60);
  const maxY = groundY - CHAR_HEIGHT - 40;
  if (maxY <= minY) return;
  coinY = Math.random() * (maxY - minY) + minY;
  coinWrapEl.style.top = coinY + 'px';
  coinWrapEl.classList.remove('hidden', 'collected');
  coinWrapEl.style.animation = 'none'; void coinWrapEl.offsetWidth;
  coinWrapEl.style.animation = `moveCoin ${obsDuration * 1.1}s linear forwards`;
  coinActive = true;
}

function setCoinKeyframes() {
  let el = document.getElementById('coin-anim');
  if (!el) { el = document.createElement('style'); el.id = 'coin-anim'; document.head.appendChild(el); }
  el.textContent = `@keyframes moveCoin { from { left:${gameW+10}px; } to { left:-50px; } }`;
}

// ============================================================
//  MARIO — LEVEL SYSTEM
// ============================================================
function checkLevelUp() {
  const newLevel = [...MARIO_LEVELS].reverse().find(l => counter >= l.minScore) || MARIO_LEVELS[0];
  if (newLevel === currentLevel) return;
  const isFirst = currentLevel === null;
  currentLevel = newLevel;
  obsDuration  = newLevel.baseDur;
  // Update game background
  gameDiv.className = `theme-mario${newLevel.bgClass ? ' '+newLevel.bgClass : ''}`;
  // Restart obstacle animations at new speed
  setObstacleKeyframes(); setCoinKeyframes();
  spawnObstacle(obstacleEl, false);
  if (obs2Active) spawnObstacle(obstacle2El, true);
  // Activate second obstacle from level 2+
  if (MARIO_LEVELS.indexOf(newLevel) >= 1 && !obs2Active) {
    obs2Active = true;
    obstacle2El.classList.remove('hidden');
    spawnObstacle(obstacle2El, true);
  }
  if (!isFirst) {
    SFX.levelup();
    showLevelBanner(newLevel.name);
    characterEl.style.animation = 'charFlash 0.4s ease 3';
    setTimeout(() => characterEl.style.animation = '', 1200);
  }
}

function showLevelBanner(name) {
  levelBanner.textContent = name;
  levelBanner.classList.add('show');
  setTimeout(() => levelBanner.classList.remove('show'), 1800);
}

// ============================================================
//  JUMP INDICATOR
// ============================================================
function updateJumpDots() {
  const posLeft = CHAR_LEFT + CHAR_WIDTH / 2 - 10;
  jumpDotsEl.style.left = posLeft + 'px';
  jumpDotsEl.style.top  = (charTop + CHAR_HEIGHT + 5) + 'px';
  jumpDot1.className = jumpsLeft >= 1 ? '' : 'used';
  jumpDot2.className = jumpsLeft >= 2 ? '' : 'used';
}

// ============================================================
//  FLAPPY HELPERS
// ============================================================
function setPipeHeights(h) {
  currentHoleTop = h;
  pipeTopEl.style.height = h+'px';
  pipeBotEl.style.height = (gameH - h - currentMode.gapSize)+'px';
}
function randomHoleTop() {
  const m = 60;
  return Math.random()*(gameH - currentMode.gapSize - m*2) + m;
}
function setAnimKeyframes(w) {
  let el = document.getElementById('dyn-anim');
  if (!el) { el=document.createElement('style'); el.id='dyn-anim'; document.head.appendChild(el); }
  el.textContent = `@keyframes moveBlock{from{left:${w+10}px}to{left:-80px}}`;
}
function calcPipeDuration(w, spd) { return (w+90)/((288+62)/2.7*spd); }

// ============================================================
//  GAME LOOP
// ============================================================
function gameLoop(timestamp) {
  if (!isGameRunning) return;
  rafId = requestAnimationFrame(gameLoop);
  if (lastTime === null) { lastTime = timestamp; return; }
  const delta = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp; accumulator += delta;
  while (accumulator >= FIXED_STEP) {
    currentMode.type === 'mario' ? marioStep() : flappyStep();
    accumulator -= FIXED_STEP;
  }
  currentMode.type === 'mario' ? marioRender() : flappyRender();
}

// ============================================================
//  FLAPPY PHYSICS
// ============================================================
function flappyStep() {
  velocityY = Math.min(velocityY + gravity, maxFallVel);
  charTop  += velocityY;
  if (charTop < 0) { charTop = 0; velocityY = 0; }
  const t = velocityY < 0 ? -25 : Math.min(90, (velocityY/maxFallVel)*90);
  rotation += (t - rotation) * 0.25;
}
function flappyRender() {
  characterEl.style.top = charTop+'px';
  characterEl.style.transform = `rotate(${rotation}deg)`;
  const pL = parseInt(getComputedStyle(pipeTopEl).left);
  const hT = charTop+HIT_PAD, hB = charTop+CHAR_HEIGHT-HIT_PAD;
  const hL = CHAR_LEFT+HIT_PAD, hR = CHAR_LEFT+CHAR_WIDTH-HIT_PAD;
  const hitFloor = charTop+CHAR_HEIGHT >= gameH;
  const horizHit = pL < hR && pL+PIPE_WIDTH > hL;
  const inGap    = hT >= currentHoleTop && hB <= currentHoleTop+currentMode.gapSize;
  if (hitFloor || (horizHit && !inGap)) doGameOver();
}
pipeTopEl.addEventListener('animationiteration', () => {
  if (!isGameRunning || currentMode.type !== 'flappy') return;
  setPipeHeights(randomHoleTop());
  counter++; liveScoreEl.textContent = 'ניקוד: '+counter;
  SFX.score();
});

// ============================================================
//  MARIO PHYSICS
// ============================================================
function marioStep() {
  if (!isOnGround) {
    velocityY = Math.min(velocityY + gravity, maxFallVel);
    charTop  += velocityY;
  }
  // Land
  if (charTop >= groundY - CHAR_HEIGHT) {
    charTop = groundY - CHAR_HEIGHT;
    velocityY = 0;
    if (!isOnGround) { isOnGround = true; jumpsLeft = 2; }
  }
  if (charTop < 0) { charTop = 0; velocityY = Math.max(0, velocityY); }
}

function marioRender() {
  characterEl.style.top = charTop+'px';
  if (!isOnGround) {
    characterEl.classList.remove('running');
    const t = velocityY < 0 ? -15 : Math.min(30, velocityY*2);
    rotation += (t - rotation) * 0.2;
    characterEl.style.transform = `rotate(${rotation}deg)`;
  } else {
    characterEl.classList.add('running');
    rotation = 0; characterEl.style.transform = '';
  }
  updateJumpDots();

  const hT = charTop+HIT_PAD, hB = charTop+CHAR_HEIGHT-HIT_PAD;
  const hL = CHAR_LEFT+HIT_PAD, hR = CHAR_LEFT+CHAR_WIDTH-HIT_PAD;

  // Check obstacles
  if (checkObsCollision(obstacleEl, obs1H)) { doGameOver(); return; }
  if (obs2Active && checkObsCollision(obstacle2El, obs2H)) { doGameOver(); return; }

  // Score: obstacle 1 passed
  if (!obs1Passed) {
    const oL = parseInt(getComputedStyle(obstacleEl).left);
    if (oL + OBS_WIDTH < CHAR_LEFT) {
      obs1Passed = true; counter++;
      liveScoreEl.textContent = 'ניקוד: '+counter;
      SFX.score();
      checkLevelUp();
      // Spawn coin occasionally
      if (!coinActive && Math.random() < 0.6) {
        setCoinKeyframes(); spawnCoin();
      }
    }
  }

  // Coin collection
  if (coinActive && !coinCollected) {
    const cL = parseInt(getComputedStyle(coinWrapEl).left);
    const cT = coinY, cB = coinY+34;
    if (cL < hR && cL+34 > hL && hT < cB && hB > cT) {
      coinCollected = true; coinActive = false;
      coinWrapEl.classList.add('collected');
      setTimeout(() => coinWrapEl.classList.add('hidden'), 260);
      coins++; coinScoreEl.textContent = '🪙 '+coins;
      SFX.coin();
    }
  }
}

function checkObsCollision(el, h) {
  const oL  = parseInt(getComputedStyle(el).left);
  const oT  = groundY - h;
  const hT  = charTop + HIT_PAD, hB = charTop + CHAR_HEIGHT - HIT_PAD;
  const hLL = CHAR_LEFT + HIT_PAD, hR = CHAR_LEFT + CHAR_WIDTH - HIT_PAD;
  return oL < hR && oL + OBS_WIDTH > hLL && hB > oT + HIT_PAD;
}

obstacleEl.addEventListener('animationiteration', () => {
  if (!isGameRunning || currentMode.type !== 'mario') return;
  spawnObstacle(obstacleEl, false);
});
obstacle2El.addEventListener('animationiteration', () => {
  if (!isGameRunning || currentMode.type !== 'mario') return;
  spawnObstacle(obstacle2El, true);
});
coinWrapEl.addEventListener('animationend', () => {
  if (!isGameRunning) return;
  coinActive = false;
  coinWrapEl.classList.add('hidden');
});

// ============================================================
//  GAME OVER
// ============================================================
function doGameOver() {
  stopLoop(); SFX.death();
  // Screen shake
  gameDiv.classList.add('shake');
  setTimeout(() => gameDiv.classList.remove('shake'), 400);
  const newRecord = saveHS(currentModeName, counter);
  setTimeout(() => {
    gameDiv.classList.add('hidden');
    gameoverScr.classList.remove('hidden');
    const coinLine = currentMode.type === 'mario' ? `<div class="go-best">🪙 מטבעות: ${coins}</div>` : '';
    finalScoreEl.innerHTML = `
      <div class="go-mode">${currentMode.icon} מצב ${currentMode.label}</div>
      <div class="go-points">ניקוד: <strong>${counter}</strong></div>
      ${coinLine}
      <div class="go-best">שיא: ${getHS(currentModeName)}</div>
      ${newRecord ? '<div class="new-record">🎉 שיא חדש!</div>' : ''}
    `;
  }, 350);
}

// ============================================================
//  CONTROLS
// ============================================================
function jump() {
  if (!isGameRunning) return;
  if (currentMode.type === 'mario') {
    if (jumpsLeft <= 0) return;
    const isDouble = !isOnGround;
    isOnGround = false;
    jumpsLeft--;
    velocityY = -jumpPower * (isDouble ? 0.85 : 1);
    if (isDouble) {
      SFX.djump();
      characterEl.classList.add('djump');
      setTimeout(() => characterEl.classList.remove('djump'), 350);
    } else {
      SFX.jump();
    }
  } else {
    velocityY = -jumpPower; rotation = -25;
    SFX.jump();
  }
}

gameDiv.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive:false });
gameDiv.addEventListener('click', jump);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});

window.addEventListener('resize', () => {
  if (!isGameRunning) return;
  gameH = gameDiv.offsetHeight; gameW = gameDiv.offsetWidth;
  if (currentMode.type === 'mario') {
    groundY = gameH - GROUND_H;
    setObstacleKeyframes(); setCoinKeyframes();
  } else { setAnimKeyframes(gameW); }
});

// ============================================================
//  INIT
// ============================================================
showMenu();
