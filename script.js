// ============================================================
//  CONSTANTS
// ============================================================
var CHAR_LEFT   = 60, CHAR_WIDTH  = 56, CHAR_HEIGHT = 56, CHAR_CROUCH = 26;
var PIPE_WIDTH  = 54, OBS_WIDTH   = 46, AIR_OBS_W   = 50;
var GROUND_H    = 72, HIT_PAD     = 5,  FIXED_STEP  = 1000/60;
var FLY_BOTTOM  = 40;   // air-obs bottom is 40px above ground surface
var AIR_OBS_H   = 30;   // air-obs element height
var INVINCIBLE_FRAMES = 120; // 2s at 60fps

// ============================================================
//  MODES
// ============================================================
var MODES = {
  classic:{ label:'קלאסי', icon:'☀️', type:'flappy', gravity:0.42, jumpPower:8.5,  maxFallVel:9,  gapSize:195, pipeSpeed:1.0,  theme:'' },
  hard:   { label:'קשה',   icon:'🔥', type:'flappy', gravity:0.60, jumpPower:8.5,  maxFallVel:12, gapSize:145, pipeSpeed:1.7,  theme:'hard' },
  night:  { label:'לילה',  icon:'🌙', type:'flappy', gravity:0.42, jumpPower:8.5,  maxFallVel:9,  gapSize:175, pipeSpeed:1.25, theme:'night' },
  mario:  { label:'ריצה',  icon:'🏃', type:'mario',  gravity:0.55, jumpPower:13,   maxFallVel:18, gapSize:0,   pipeSpeed:0,    theme:'mario' }
};

// ============================================================
//  10 MARIO LEVELS
// ============================================================
var MARIO_LEVELS = [
  { minScore:0,  name:'🌱 שלב 1 — פארק',  baseDur:3.2,  bgClass:'',    obsPool:['obs-rock'],                             coinChance:0.6,  powerChance:0,    airObs:false, dual:false },
  { minScore:5,  name:'🌿 שלב 2 — יער',   baseDur:2.7,  bgClass:'ml2', obsPool:['obs-rock','obs-log'],                   coinChance:0.6,  powerChance:0.15, airObs:false, dual:false },
  { minScore:12, name:'🏜️ שלב 3 — מדבר', baseDur:2.2,  bgClass:'ml3', obsPool:['obs-cactus','obs-rock','obs-log'],      coinChance:0.6,  powerChance:0.2,  airObs:true,  dual:false },
  { minScore:20, name:'🌊 שלב 4 — חוף',   baseDur:1.8,  bgClass:'ml4', obsPool:['obs-cactus','obs-log','obs-rock'],      coinChance:0.55, powerChance:0.22, airObs:true,  dual:true  },
  { minScore:30, name:'🌋 שלב 5 — הר',    baseDur:1.5,  bgClass:'ml5', obsPool:['obs-lava','obs-rock','obs-cactus'],     coinChance:0.5,  powerChance:0.25, airObs:true,  dual:true  },
  { minScore:42, name:'🌃 שלב 6 — עיר',   baseDur:1.25, bgClass:'ml6', obsPool:['obs-box','obs-lava','obs-cactus'],      coinChance:0.5,  powerChance:0.28, airObs:true,  dual:true  },
  { minScore:55, name:'❄️ שלב 7 — שלג',   baseDur:1.05, bgClass:'ml7', obsPool:['obs-ice','obs-box','obs-lava'],         coinChance:0.45, powerChance:0.3,  airObs:true,  dual:true  },
  { minScore:69, name:'🌑 שלב 8 — חלל',   baseDur:0.88, bgClass:'ml8', obsPool:['obs-asteroid','obs-ice','obs-lava'],    coinChance:0.4,  powerChance:0.32, airObs:true,  dual:true  },
  { minScore:84, name:'👿 שלב 9 — מבצר',  baseDur:0.72, bgClass:'ml9', obsPool:['obs-lava','obs-asteroid','obs-box'],    coinChance:0.35, powerChance:0.35, airObs:true,  dual:true  },
  { minScore:100,name:'👑 שלב 10 — אגדה', baseDur:0.58, bgClass:'ml10',obsPool:['obs-lava','obs-asteroid','obs-ice','obs-box'], coinChance:0.3, powerChance:0.4, airObs:true, dual:true }
];

// ============================================================
//  SOUND ENGINE
// ============================================================
var audioCtx = null;
function getAudio(){ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function beep(freq,dur,type,vol,freqEnd,delay){
  type=type||'sine'; vol=vol||0.25; delay=delay||0;
  try{
    var ctx=getAudio(),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type=type;
    var t=ctx.currentTime+delay;
    osc.frequency.setValueAtTime(freq,t);
    if(freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd,t+dur);
    gain.gain.setValueAtTime(vol,t);
    gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.start(t); osc.stop(t+dur);
  }catch(e){}
}
var SFX = {
  jump:       function(){ beep(320,0.14,'sine',0.22,640); },
  djump:      function(){ beep(500,0.18,'sine',0.28,900); },
  coin:       function(){ beep(784,0.1,'sine',0.2); beep(1047,0.12,'sine',0.2,null,0.08); },
  score:      function(){ beep(440,0.07,'sine',0.14); },
  levelup:    function(){ [261,329,392,523].forEach(function(f,i){ beep(f,0.18,'triangle',0.28,null,i*0.1); }); },
  death:      function(){ beep(350,0.08,'square',0.3); beep(200,0.35,'sawtooth',0.3,80,0.08); },
  hit:        function(){ beep(220,0.15,'sawtooth',0.3,100); },
  powerup:    function(){ beep(523,0.1,'sine',0.25); beep(659,0.1,'sine',0.25,null,0.08); beep(784,0.18,'sine',0.3,null,0.16); },
  shieldBreak:function(){ beep(440,0.05,'square',0.3); beep(200,0.25,'sawtooth',0.25,80,0.05); },
  slowOn:     function(){ beep(300,0.3,'triangle',0.25,150); },
  starOn:     function(){ [523,659,784,1047].forEach(function(f,i){ beep(f,0.12,'sine',0.22,null,i*0.06); }); },
  lifeup:     function(){ beep(523,0.1,'sine',0.28); beep(784,0.15,'sine',0.32,null,0.1); beep(1047,0.2,'sine',0.3,null,0.22); },
  combo:      function(n){ beep(440+n*80,0.12,'sine',0.2); }
};

// ============================================================
//  STATE
// ============================================================
var currentModeName=null, currentMode=null;
var velocityY=0, charTop=0, rotation=0;
var counter=0, coins=0;
var rafId=null, lastTime=null, accumulator=0, isGameRunning=false;
var gameH=0, gameW=0, currentHoleTop=0;
var gravity=0, jumpPower=0, maxFallVel=0;

// Mario state
var isOnGround=false, isCrouching=false, jumpsLeft=2, groundY=0;
var obsDuration=3.2;
var obs1H=0, obs1Passed=false;
var obs2H=0, obs2Active=false;
var currentLevel=null;

// Lives & combo
var lives=3, invincibleFrames=0;
var hitStreak=0, comboMult=1;

// Air obstacle
var airObsActive=false;

// Coin
var coinActive=false, coinCollected=false, coinY=0;

// Power-up
var powerupActive=false, powerupCollected=false, powerupY=0, powerupType='';
var activeEffect=null, shieldActive=false, effectEndTimer=null;

// ============================================================
//  DOM
// ============================================================
var menuScreen=document.getElementById('menu-screen');
var gameDiv=document.getElementById('game');
var gameoverScr=document.getElementById('gameover-screen');
var pipeTopEl=document.getElementById('pipe-top');
var pipeBotEl=document.getElementById('pipe-bottom');
var groundEl=document.getElementById('ground');
var obstacleEl=document.getElementById('obstacle');
var obstacle2El=document.getElementById('obstacle2');
var airObsEl=document.getElementById('air-obs');
var coinWrapEl=document.getElementById('coin-wrap');
var coinEl=document.getElementById('coin');
var powerupWrapEl=document.getElementById('powerup-wrap');
var powerupEl=document.getElementById('powerup');
var powerupStatusEl=document.getElementById('powerup-status');
var levelBanner=document.getElementById('level-banner');
var jumpDot1=document.getElementById('jd1');
var jumpDot2=document.getElementById('jd2');
var characterEl=document.getElementById('character');
var liveScoreEl=document.getElementById('live-score');
var highScoreEl=document.getElementById('high-score');
var coinScoreEl=document.getElementById('coin-score');
var livesEl=document.getElementById('lives-display');
var comboEl=document.getElementById('combo-display');
var finalScoreEl=document.getElementById('final-score-display');
var hsMenuEl=document.getElementById('highscores-menu');
var tapHintEl=document.getElementById('tap-hint');
var jumpDotsEl=document.getElementById('jump-dots');
var crouchBtnEl=document.getElementById('crouch-btn');

// ============================================================
//  HIGH SCORE
// ============================================================
function getHS(m){ return parseInt(localStorage.getItem('hs_'+m)||'0'); }
function saveHS(m,s){ if(s>getHS(m)){ localStorage.setItem('hs_'+m,s); return true; } return false; }

// ============================================================
//  SCREENS
// ============================================================
function showMenu(){
  stopLoop(); stopArcade();
  document.getElementById("arcade-screen").classList.add("hidden");
  menuScreen.classList.remove("hidden");
  gameDiv.classList.add("hidden");
  gameoverScr.classList.add("hidden");
  hsMenuEl.innerHTML=Object.keys(MODES).map(function(m){
    return '<span class="hs-item">'+MODES[m].icon+' '+MODES[m].label+': '+getHS(m)+'</span>';
  }).join("")+'<span class="hs-item">🕹️ ארקייד: '+getHS("arcade")+'</span>';
}

function startGame(modeName){
  if(modeName==="arcade"){
    stopLoop(); stopArcade();
    currentModeName="arcade";
    menuScreen.classList.add("hidden"); gameoverScr.classList.add("hidden");
    gameDiv.classList.add("hidden");
    document.getElementById("arcade-screen").classList.remove("hidden");
    arcadeLives=3; arcadeScore=0; arcadeLevelIdx=0;
    if(!arcadeCanvas) initArcade(); else resizeArcade();
    beginArcadeLevel(0);
    return;
  }
  stopLoop();
  currentModeName=modeName; currentMode=MODES[modeName];
  menuScreen.classList.add('hidden'); gameoverScr.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  gameDiv.className=currentMode.theme?'theme-'+currentMode.theme:'';
  gameH=gameDiv.offsetHeight; gameW=gameDiv.offsetWidth;
  gravity=currentMode.gravity; jumpPower=currentMode.jumpPower; maxFallVel=currentMode.maxFallVel;
  counter=0; coins=0;
  liveScoreEl.textContent='ניקוד: 0';
  highScoreEl.textContent='שיא: '+getHS(modeName);
  clearTimeout(effectEndTimer);
  activeEffect=null; shieldActive=false;
  characterEl.classList.remove('shielded','starred','invincible');
  powerupStatusEl.classList.add('hidden');
  comboEl.classList.add('hidden');
  if(currentMode.type==='mario') setupMario(); else setupFlappy();
  tapHintEl.style.animation='none'; void tapHintEl.offsetWidth;
  tapHintEl.style.animation='fadeHint 3s forwards';
  isGameRunning=true; lastTime=null; accumulator=0;
  rafId=requestAnimationFrame(gameLoop);
}
function restartGame(){
  if(currentModeName==="arcade"){
    gameoverScr.classList.add("hidden");
    document.getElementById("arcade-screen").classList.remove("hidden");
    arcadeLives=3; arcadeScore=0; arcadeLevelIdx=0;
    beginArcadeLevel(0); return;
  }
  startGame(currentModeName);
}
function stopLoop(){ isGameRunning=false; if(rafId){ cancelAnimationFrame(rafId); rafId=null; } }

// ============================================================
//  FLAPPY SETUP
// ============================================================
function setupFlappy(){
  pipeTopEl.classList.remove('hidden'); pipeBotEl.classList.remove('hidden');
  groundEl.classList.add('hidden'); obstacleEl.classList.add('hidden');
  obstacle2El.classList.add('hidden'); airObsEl.classList.add('hidden');
  coinWrapEl.classList.add('hidden'); powerupWrapEl.classList.add('hidden');
  crouchBtnEl.classList.add('hidden'); jumpDotsEl.style.display='none';
  coinScoreEl.classList.add('hidden'); livesEl.classList.add('hidden');
  tapHintEl.textContent='הקש לקפוץ ✋';
  setAnimKeyframes(gameW);
  var dur=calcPipeDuration(gameW,currentMode.pipeSpeed);
  [pipeTopEl,pipeBotEl].forEach(function(el){
    el.style.animation='none'; void el.offsetWidth;
    el.style.animation='moveBlock '+dur.toFixed(2)+'s infinite linear';
  });
  setPipeHeights(randomHoleTop());
  charTop=gameH*0.25; velocityY=0; rotation=0;
  characterEl.classList.remove('running','djump','crouching','shielded','starred','invincible');
  characterEl.style.height=CHAR_HEIGHT+'px';
  characterEl.style.top=charTop+'px'; characterEl.style.transform='';
}

// ============================================================
//  MARIO SETUP
// ============================================================
function setupMario(){
  pipeTopEl.classList.add('hidden'); pipeBotEl.classList.add('hidden');
  groundEl.classList.remove('hidden');
  obstacleEl.classList.remove('hidden'); obstacle2El.classList.add('hidden');
  airObsEl.classList.add('hidden');
  coinWrapEl.classList.add('hidden'); powerupWrapEl.classList.add('hidden');
  jumpDotsEl.style.display='flex'; coinScoreEl.classList.remove('hidden');
  livesEl.classList.remove('hidden');
  coinScoreEl.textContent='🪙 0';
  crouchBtnEl.classList.remove('hidden');
  tapHintEl.textContent='הקש לקפוץ  ·  ⬇ לכפיפה';
  groundY=gameH-GROUND_H;
  isOnGround=true; jumpsLeft=2; isCrouching=false;
  charTop=groundY-CHAR_HEIGHT; velocityY=0; rotation=0;
  lives=3; invincibleFrames=0; hitStreak=0; comboMult=1;
  updateLivesDisplay();
  airObsActive=false;
  characterEl.classList.add('running');
  characterEl.classList.remove('djump','crouching','shielded','starred','invincible');
  characterEl.style.height=CHAR_HEIGHT+'px';
  characterEl.style.top=charTop+'px'; characterEl.style.transform='';
  updateJumpDots();
  currentLevel=null; obsDuration=3.2;
  coinActive=false; powerupActive=false; obs2Active=false;
  setObstacleKeyframes(); setAirObsKeyframes(); setCoinKeyframes(); setPowerupKeyframes();
  spawnObstacle(obstacleEl,false);
  checkLevelUp();
}

// ============================================================
//  LIVES & COMBO
// ============================================================
function updateLivesDisplay(){
  var h=''; for(var i=0;i<3;i++) h+=(i<lives?'❤️':'🖤');
  livesEl.textContent=h;
}

// takeHit: returns true only if player died (lives=0)
function takeHit(){
  if(invincibleFrames>0||activeEffect==='star') return false;
  if(shieldActive){
    shieldActive=false; characterEl.classList.remove('shielded');
    setPowerupStatus(null); SFX.shieldBreak();
    invincibleFrames=INVINCIBLE_FRAMES;
    hitStreak=0; comboMult=1; updateComboDisplay();
    return false;
  }
  lives--;
  hitStreak=0; comboMult=1; updateComboDisplay();
  updateLivesDisplay();
  if(lives<=0){ doGameOver(); return true; }
  SFX.hit();
  invincibleFrames=INVINCIBLE_FRAMES;
  characterEl.classList.add('invincible');
  return false;
}

function updateCombo(){
  hitStreak++;
  var prev=comboMult;
  if(hitStreak>=8)      comboMult=3;
  else if(hitStreak>=5) comboMult=2;
  else if(hitStreak>=3) comboMult=1.5;
  else                  comboMult=1;
  if(comboMult>1){ updateComboDisplay(); if(comboMult>prev) SFX.combo(hitStreak); }
}

function updateComboDisplay(){
  if(comboMult<=1){ comboEl.classList.add('hidden'); return; }
  var txt = comboMult>=3 ? '🌟 MEGA x3!' : comboMult>=2 ? '⚡ COMBO x2!' : '🔥 COMBO x1.5';
  comboEl.textContent=txt;
  comboEl.style.left=(CHAR_LEFT+64)+'px';
  comboEl.style.top=(charTop-28)+'px';
  comboEl.style.animation='none'; void comboEl.offsetWidth;
  comboEl.style.animation='comboPop 0.3s ease forwards';
  comboEl.classList.remove('hidden');
}

// ============================================================
//  OBSTACLE HELPERS
// ============================================================
function getObsH(type){
  switch(type){
    case 'obs-log':      return [30,48];
    case 'obs-cactus':   return [55,88];
    case 'obs-lava':     return [40,72];
    case 'obs-box':      return [50,82];
    case 'obs-ice':      return [55,95];
    case 'obs-asteroid': return [48,86];
    default:             return [44,78]; // obs-rock
  }
}
function getObsDur(){ return obsDuration*(activeEffect==='slow'?2:1); }

function spawnObstacle(el,isSecond){
  var lvl=currentLevel||MARIO_LEVELS[0];
  var type=lvl.obsPool[Math.floor(Math.random()*lvl.obsPool.length)];
  var r=getObsH(type);
  var h=Math.floor(Math.random()*(r[1]-r[0])+r[0]);
  el.style.height=h+'px';
  el.className=type;
  el.style.bottom=''; el.style.top=(groundY-h)+'px';
  var dur=getObsDur();
  var delay=isSecond?dur*0.52:0;
  el.style.animation='none'; void el.offsetWidth;
  el.style.animation='moveObstacle '+dur+'s '+delay+'s linear infinite';
  if(isSecond){ obs2H=h; } else { obs1H=h; obs1Passed=false; }
}

function setObstacleKeyframes(){
  var el=document.getElementById('obs-anim');
  if(!el){ el=document.createElement('style'); el.id='obs-anim'; document.head.appendChild(el); }
  el.textContent='@keyframes moveObstacle{from{left:'+(gameW+10)+'px}to{left:-70px}}';
}

// ============================================================
//  AIR OBSTACLE
// ============================================================
function spawnAirObs(){
  if(!isGameRunning||airObsActive) return;
  var top=groundY-FLY_BOTTOM-AIR_OBS_H;
  airObsEl.style.top=top+'px';
  setAirObsKeyframes();
  airObsEl.style.animationName='none'; void airObsEl.offsetWidth;
  // Use inline style to set only the horizontal animation (pulsing is via CSS)
  airObsEl.style.animation='moveAirObs '+(getObsDur()*0.85)+'s linear forwards, airObsPulse 0.35s ease-in-out infinite';
  airObsEl.classList.remove('hidden');
  airObsActive=true;
}

function setAirObsKeyframes(){
  var el=document.getElementById('airobs-anim');
  if(!el){ el=document.createElement('style'); el.id='airobs-anim'; document.head.appendChild(el); }
  el.textContent='@keyframes moveAirObs{from{left:'+(gameW+10)+'px}to{left:-70px}}';
}

airObsEl.addEventListener('animationend',function(e){
  if(e.animationName==='moveAirObs'){
    airObsActive=false; airObsEl.classList.add('hidden');
  }
});

function checkAirObs(hT,hB,hL,hR){
  if(!airObsActive||activeEffect==='star') return false;
  var aL=parseInt(getComputedStyle(airObsEl).left);
  var aTop=groundY-FLY_BOTTOM-AIR_OBS_H;
  var aBtm=groundY-FLY_BOTTOM;
  return aL<hR && aL+AIR_OBS_W>hL && hB>aTop+HIT_PAD && hT<aBtm-HIT_PAD;
}

// ============================================================
//  COIN HELPERS
// ============================================================
function spawnCoin(){
  if(!isGameRunning) return;
  coinCollected=false;
  var apex=(groundY-CHAR_HEIGHT)-(jumpPower*jumpPower)/(2*gravity);
  var minY=Math.max(apex+15,50), maxY=groundY-CHAR_HEIGHT-35;
  if(maxY<=minY) return;
  coinY=Math.random()*(maxY-minY)+minY;
  coinWrapEl.style.top=coinY+'px';
  coinWrapEl.classList.remove('hidden','collected');
  coinWrapEl.style.animation='none'; void coinWrapEl.offsetWidth;
  coinWrapEl.style.animation='moveCoin '+(getObsDur()*1.1)+'s linear forwards';
  coinActive=true;
}
function setCoinKeyframes(){
  var el=document.getElementById('coin-anim');
  if(!el){ el=document.createElement('style'); el.id='coin-anim'; document.head.appendChild(el); }
  el.textContent='@keyframes moveCoin{from{left:'+(gameW+10)+'px}to{left:-50px}}';
}
coinWrapEl.addEventListener('animationend',function(){ coinActive=false; coinWrapEl.classList.add('hidden'); });

// ============================================================
//  POWER-UP HELPERS
// ============================================================
var PU_ICONS={ shield:'🛡️', slow:'⚡', star:'🌟', life:'💊' };

function spawnPowerup(){
  if(!isGameRunning) return;
  var pool=['shield','slow','star'];
  if(lives<3) pool.push('life','life'); // life more likely when hurt
  powerupType=pool[Math.floor(Math.random()*pool.length)];
  powerupCollected=false;
  var apex=(groundY-CHAR_HEIGHT)-(jumpPower*jumpPower)/(2*gravity);
  var minY=Math.max(apex+10,40), maxY=groundY-CHAR_HEIGHT-30;
  if(maxY<=minY) return;
  powerupY=Math.random()*(maxY-minY)+minY;
  powerupWrapEl.style.top=powerupY+'px';
  powerupEl.textContent=PU_ICONS[powerupType];
  powerupEl.className=powerupType+'-p';
  powerupWrapEl.classList.remove('hidden','collected');
  powerupWrapEl.style.animation='none'; void powerupWrapEl.offsetWidth;
  powerupWrapEl.style.animation='movePowerup '+(getObsDur()*1.1)+'s linear forwards';
  powerupActive=true;
}
function setPowerupKeyframes(){
  var el=document.getElementById('pu-anim');
  if(!el){ el=document.createElement('style'); el.id='pu-anim'; document.head.appendChild(el); }
  el.textContent='@keyframes movePowerup{from{left:'+(gameW+10)+'px}to{left:-55px}}';
}
powerupWrapEl.addEventListener('animationend',function(){ powerupActive=false; powerupWrapEl.classList.add('hidden'); });

function applyEffect(type){
  clearTimeout(effectEndTimer);
  characterEl.classList.remove('shielded','starred');

  if(type==='shield'){
    shieldActive=true; characterEl.classList.add('shielded');
    setPowerupStatus('🛡️ מגן פעיל!'); SFX.powerup();

  } else if(type==='slow'){
    activeEffect='slow';
    gameDiv.classList.add('slowed');
    setPowerupStatus('⚡ האטה! 4s');
    SFX.slowOn();
    setObstacleKeyframes(); spawnObstacle(obstacleEl,false);
    if(obs2Active) spawnObstacle(obstacle2El,true);
    effectEndTimer=setTimeout(function(){
      activeEffect=null; gameDiv.classList.remove('slowed');
      setPowerupStatus(null);
      if(isGameRunning){
        setObstacleKeyframes(); spawnObstacle(obstacleEl,false);
        if(obs2Active) spawnObstacle(obstacle2El,true);
      }
    },4000);

  } else if(type==='star'){
    activeEffect='star'; characterEl.classList.add('starred');
    setPowerupStatus('🌟 חסינות x3! 3s'); SFX.starOn();
    effectEndTimer=setTimeout(function(){
      activeEffect=null; characterEl.classList.remove('starred');
      setPowerupStatus(null);
    },3000);

  } else if(type==='life'){
    lives=Math.min(3,lives+1); updateLivesDisplay();
    SFX.lifeup(); setPowerupStatus('💊 +❤️ חיים!');
    setTimeout(function(){ setPowerupStatus(null); },1500);
  }

  if(type!=='life') SFX.powerup();
}

function setPowerupStatus(txt){
  if(!txt) powerupStatusEl.classList.add('hidden');
  else{ powerupStatusEl.textContent=txt; powerupStatusEl.classList.remove('hidden'); }
}

// ============================================================
//  LEVEL SYSTEM
// ============================================================
function checkLevelUp(){
  var newLevel=null;
  for(var i=MARIO_LEVELS.length-1;i>=0;i--){
    if(counter>=MARIO_LEVELS[i].minScore){ newLevel=MARIO_LEVELS[i]; break; }
  }
  if(!newLevel) newLevel=MARIO_LEVELS[0];
  if(newLevel===currentLevel) return;
  var isFirst=currentLevel===null;
  currentLevel=newLevel; obsDuration=newLevel.baseDur;
  gameDiv.className='theme-mario'+(newLevel.bgClass?' '+newLevel.bgClass:'');
  setObstacleKeyframes(); setAirObsKeyframes(); setCoinKeyframes(); setPowerupKeyframes();
  spawnObstacle(obstacleEl,false);
  if(newLevel.dual&&!obs2Active){
    obs2Active=true; obstacle2El.classList.remove('hidden');
    spawnObstacle(obstacle2El,true);
  } else if(obs2Active){
    spawnObstacle(obstacle2El,true);
  }
  if(!isFirst){
    SFX.levelup(); showLevelBanner(newLevel.name);
    characterEl.style.animation='charFlash 0.4s ease 3';
    setTimeout(function(){ if(currentMode&&currentMode.type==='mario') characterEl.style.animation=''; },1200);
  }
}

function showLevelBanner(name){
  levelBanner.textContent=name; levelBanner.classList.add('show');
  setTimeout(function(){ levelBanner.classList.remove('show'); },1800);
}

function updateJumpDots(){
  jumpDotsEl.style.left=(CHAR_LEFT+CHAR_WIDTH/2-10)+'px';
  jumpDotsEl.style.top=(charTop+CHAR_HEIGHT+5)+'px';
  jumpDot1.className=jumpsLeft>=1?'':'used';
  jumpDot2.className=jumpsLeft>=2?'':'used';
}

// ============================================================
//  FLAPPY HELPERS
// ============================================================
function setPipeHeights(h){ currentHoleTop=h; pipeTopEl.style.height=h+'px'; pipeBotEl.style.height=(gameH-h-currentMode.gapSize)+'px'; }
function randomHoleTop(){ var m=60; return Math.random()*(gameH-currentMode.gapSize-m*2)+m; }
function setAnimKeyframes(w){ var el=document.getElementById('dyn-anim'); if(!el){ el=document.createElement('style'); el.id='dyn-anim'; document.head.appendChild(el); } el.textContent='@keyframes moveBlock{from{left:'+(w+10)+'px}to{left:-80px}}'; }
function calcPipeDuration(w,spd){ return (w+90)/((288+62)/2.7*spd); }

// ============================================================
//  GAME LOOP
// ============================================================
function gameLoop(ts){
  if(!isGameRunning) return;
  rafId=requestAnimationFrame(gameLoop);
  if(lastTime===null){ lastTime=ts; return; }
  var delta=Math.min(ts-lastTime,50); lastTime=ts; accumulator+=delta;
  while(accumulator>=FIXED_STEP){ if(currentMode.type==='mario') marioStep(); else flappyStep(); accumulator-=FIXED_STEP; }
  if(currentMode.type==='mario') marioRender(); else flappyRender();
}

// ============================================================
//  FLAPPY PHYSICS
// ============================================================
function flappyStep(){
  velocityY=Math.min(velocityY+gravity,maxFallVel); charTop+=velocityY;
  if(charTop<0){ charTop=0; velocityY=0; }
  var t=velocityY<0?-25:Math.min(90,(velocityY/maxFallVel)*90);
  rotation+=(t-rotation)*0.25;
}
function flappyRender(){
  characterEl.style.top=charTop+'px'; characterEl.style.transform='rotate('+rotation+'deg)';
  var pL=parseInt(getComputedStyle(pipeTopEl).left);
  var hT=charTop+HIT_PAD, hB=charTop+CHAR_HEIGHT-HIT_PAD;
  var hL=CHAR_LEFT+HIT_PAD, hR=CHAR_LEFT+CHAR_WIDTH-HIT_PAD;
  if(charTop+CHAR_HEIGHT>=gameH||(pL<hR&&pL+PIPE_WIDTH>hL&&!(hT>=currentHoleTop&&hB<=currentHoleTop+currentMode.gapSize))) doGameOver();
}
pipeTopEl.addEventListener('animationiteration',function(){
  if(!isGameRunning||currentMode.type!=='flappy') return;
  setPipeHeights(randomHoleTop()); counter++; liveScoreEl.textContent='ניקוד: '+counter; SFX.score();
});

obstacleEl.addEventListener('animationiteration',function(){
  if(!isGameRunning||currentMode.type!=='mario') return;
  spawnObstacle(obstacleEl,false);
});
obstacle2El.addEventListener('animationiteration',function(){
  if(!isGameRunning||currentMode.type!=='mario') return;
  spawnObstacle(obstacle2El,true);
});

// ============================================================
//  MARIO PHYSICS
// ============================================================
function marioStep(){
  if(invincibleFrames>0){
    invincibleFrames--;
    if(invincibleFrames===0) characterEl.classList.remove('invincible');
  }
  if(!isOnGround){ velocityY=Math.min(velocityY+gravity,maxFallVel); charTop+=velocityY; }
  var landH=isCrouching?CHAR_CROUCH:CHAR_HEIGHT;
  if(charTop>=groundY-landH){ charTop=groundY-landH; velocityY=0; if(!isOnGround){ isOnGround=true; jumpsLeft=2; } }
  if(charTop<0){ charTop=0; velocityY=Math.max(0,velocityY); }
}

function marioRender(){
  characterEl.style.top=charTop+'px';
  if(!isOnGround){
    characterEl.classList.remove('running');
    var t=velocityY<0?-15:Math.min(30,velocityY*2);
    rotation+=(t-rotation)*0.2; characterEl.style.transform='rotate('+rotation+'deg)';
  } else {
    if(!isCrouching&&!characterEl.classList.contains('starred')) characterEl.classList.add('running');
    rotation=0; characterEl.style.transform='';
  }
  updateJumpDots();
  if(comboMult>1){ comboEl.style.top=(charTop-28)+'px'; }

  var charH=isCrouching?CHAR_CROUCH:CHAR_HEIGHT;
  var hT=charTop+HIT_PAD, hB=charTop+charH-HIT_PAD;
  var hL=CHAR_LEFT+HIT_PAD, hR=CHAR_LEFT+CHAR_WIDTH-HIT_PAD;

  // Ground obstacle collisions
  if(checkObs(obstacleEl,obs1H,hT,hB,hL,hR)){ if(takeHit()) return; }
  if(obs2Active&&checkObs(obstacle2El,obs2H,hT,hB,hL,hR)){ if(takeHit()) return; }

  // Air obstacle collision
  if(checkAirObs(hT,hB,hL,hR)){ if(takeHit()) return; }

  // Score: obs1 passed
  if(!obs1Passed){
    var oL=parseInt(getComputedStyle(obstacleEl).left);
    if(oL+OBS_WIDTH<CHAR_LEFT){
      obs1Passed=true;
      updateCombo();
      var pts=Math.round((activeEffect==='star'?3:1)*comboMult);
      counter+=pts; liveScoreEl.textContent='ניקוד: '+counter;
      SFX.score(); checkLevelUp();
      // Schedule air obstacle (60% chance at airObs levels)
      var lvl=currentLevel||MARIO_LEVELS[0];
      if(lvl.airObs&&!airObsActive&&Math.random()<0.6){
        setTimeout(function(){ if(isGameRunning&&(currentLevel||MARIO_LEVELS[0]).airObs) spawnAirObs(); }, obsDuration*420);
      }
      // Coin or power-up
      if(!coinActive&&!powerupActive){
        var roll=Math.random();
        if(roll<lvl.powerChance){ setPowerupKeyframes(); spawnPowerup(); }
        else if(roll<lvl.powerChance+lvl.coinChance){ setCoinKeyframes(); spawnCoin(); }
      }
    }
  }

  // Coin collection
  if(coinActive&&!coinCollected){
    var cL=parseInt(getComputedStyle(coinWrapEl).left);
    if(cL<hR&&cL+34>hL&&hT<coinY+34&&hB>coinY){
      coinCollected=true; coinActive=false;
      coinWrapEl.classList.add('collected');
      setTimeout(function(){ coinWrapEl.classList.add('hidden'); },260);
      coins++; coinScoreEl.textContent='🪙 '+coins; SFX.coin();
    }
  }

  // Power-up collection
  if(powerupActive&&!powerupCollected){
    var pL=parseInt(getComputedStyle(powerupWrapEl).left);
    if(pL<hR&&pL+40>hL&&hT<powerupY+40&&hB>powerupY){
      powerupCollected=true; powerupActive=false;
      powerupWrapEl.classList.add('collected');
      setTimeout(function(){ powerupWrapEl.classList.add('hidden'); },300);
      applyEffect(powerupType);
    }
  }
}

function checkObs(el,h,hT,hB,hL,hR){
  if(activeEffect==='star') return false;
  var oL=parseInt(getComputedStyle(el).left);
  var oTop=groundY-h;
  return oL<hR&&oL+OBS_WIDTH>hL&&hB>oTop+HIT_PAD&&hT<groundY-HIT_PAD;
}

// ============================================================
//  GAME OVER
// ============================================================
function doGameOver(){
  stopLoop(); SFX.death(); clearTimeout(effectEndTimer);
  gameDiv.classList.add('shake');
  gameDiv.classList.remove('slowed');
  setTimeout(function(){ gameDiv.classList.remove('shake'); },400);
  var newRecord=saveHS(currentModeName,counter);
  setTimeout(function(){
    gameDiv.classList.add('hidden'); gameoverScr.classList.remove('hidden');
    var coinLine=currentMode.type==='mario'?'<div class="go-best">🪙 מטבעות: '+coins+'</div>':'';
    var lvlLine=(currentMode.type==='mario'&&currentLevel)?'<div class="go-best">'+currentLevel.name+'</div>':'';
    finalScoreEl.innerHTML=
      '<div class="go-mode">'+currentMode.icon+' מצב '+currentMode.label+'</div>'+
      '<div class="go-points">ניקוד: <strong>'+counter+'</strong></div>'+
      coinLine+lvlLine+
      '<div class="go-best">שיא: '+getHS(currentModeName)+'</div>'+
      (newRecord?'<div class="new-record">🎉 שיא חדש!</div>':'');
  },350);
}

// ============================================================
//  CROUCH
// ============================================================
function startCrouch(){
  if(!isGameRunning||currentMode.type!=='mario'||isCrouching) return;
  isCrouching=true; characterEl.classList.add('crouching'); characterEl.classList.remove('running');
  characterEl.style.height=CHAR_CROUCH+'px';
  if(isOnGround){ charTop=groundY-CHAR_CROUCH; characterEl.style.top=charTop+'px'; }
}
function endCrouch(){
  if(!isCrouching) return;
  isCrouching=false; characterEl.classList.remove('crouching');
  characterEl.style.height=CHAR_HEIGHT+'px';
  if(isOnGround){ charTop=groundY-CHAR_HEIGHT; characterEl.style.top=charTop+'px'; if(!characterEl.classList.contains('starred')) characterEl.classList.add('running'); }
}

// ============================================================
//  CONTROLS
// ============================================================
function jump(){
  if(!isGameRunning) return;
  if(currentMode.type==='mario'){
    if(isCrouching){ endCrouch(); return; }
    if(jumpsLeft<=0) return;
    var isDouble=!isOnGround; isOnGround=false; jumpsLeft--;
    velocityY=-jumpPower*(isDouble?0.85:1);
    if(isDouble){ SFX.djump(); characterEl.classList.add('djump'); setTimeout(function(){ characterEl.classList.remove('djump'); },350); }
    else SFX.jump();
  } else { velocityY=-jumpPower; rotation=-25; SFX.jump(); }
}

gameDiv.addEventListener('touchstart',function(e){ e.preventDefault(); jump(); },{ passive:false });
gameDiv.addEventListener('click',jump);
crouchBtnEl.addEventListener('touchstart',function(e){ e.preventDefault(); e.stopPropagation(); startCrouch(); },{ passive:false });
crouchBtnEl.addEventListener('touchend',function(e){ e.preventDefault(); e.stopPropagation(); endCrouch(); },{ passive:false });
crouchBtnEl.addEventListener('mousedown',function(e){ e.stopPropagation(); startCrouch(); });
crouchBtnEl.addEventListener('mouseup',function(e){ e.stopPropagation(); endCrouch(); });
crouchBtnEl.addEventListener('click',function(e){ e.stopPropagation(); });
document.addEventListener("keydown",function(e){
  if(arcadeRunning){
    if(e.code==="ArrowLeft"){ e.preventDefault(); aKeys.left=true; }
    if(e.code==="ArrowRight"){ e.preventDefault(); aKeys.right=true; }
    if(e.code==="Space"||e.code==="ArrowUp"){ e.preventDefault(); aKeys.jump=true; }
    if(e.code==="ArrowDown"){ e.preventDefault(); aKeys.crouch=true; }
    return;
  }
  if(e.code==="Space"||e.code==="ArrowUp"){ e.preventDefault(); jump(); }
  if(e.code==="ArrowDown"||e.code==="KeyS"){ e.preventDefault(); startCrouch(); }
});
document.addEventListener("keyup",function(e){
  if(arcadeRunning){
    if(e.code==="ArrowLeft") aKeys.left=false;
    if(e.code==="ArrowRight") aKeys.right=false;
    if(e.code==="Space"||e.code==="ArrowUp") aKeys.jump=false;
    if(e.code==="ArrowDown") aKeys.crouch=false;
    return;
  }
  if(e.code==="ArrowDown"||e.code==="KeyS") endCrouch();
});
window.addEventListener('resize',function(){
  if(!isGameRunning) return;
  gameH=gameDiv.offsetHeight; gameW=gameDiv.offsetWidth;
  if(currentMode.type==='mario'){ groundY=gameH-GROUND_H; setObstacleKeyframes(); setAirObsKeyframes(); setCoinKeyframes(); setPowerupKeyframes(); }
  else setAnimKeyframes(gameW);
});

// ============================================================
//  INIT
// ============================================================
showMenu();

// ============================================================
//  ARCADE MODE
// ============================================================
var AW=800, AH=450;
var AC_W=40, AC_H=52, AC_CH=24;
var AC_GRAV=0.55, AC_JUMP=-12.5, AC_SPD=3.8, AC_MAXFALL=15;
var AC_LVLW=1400;

var arcadeRunning=false, arcadeLevelIdx=0, arcadeLives=3, arcadeScore=0;
var arcadeRafId=null, arcadeLastTime=null;
var arcadeCanvas=null, arcadeCtx=null, arcadeFaceImg=null, arcadeImgOk=false;
var arcCam={x:0};
var arc={x:80,y:300,vx:0,vy:0,onGround:false,crouching:false,invincible:0};
var aKeys={left:false,right:false,jump:false,crouch:false};
var jumpWasHeld=false;
var arcPlats=[], arcSpikes=[], arcBars=[], arcEnems=[];
var arcGoal={x:0,y:0}, arcGoalAnim=0;
var arcBannerFrames=0, arcBannerText="";

var ARC_LEVELS=[
  {
    name:'🌿 שלב 1 — פארק',
    bg:['#87CEEB','#b8e4f8','#b0e880'],
    gcol:'#4a8020',gtop:'#6cc235',
    plats:[{x:0,y:385,w:1400,h:65},{x:220,y:300,w:120,h:18},{x:500,y:265,w:110,h:18},{x:760,y:295,w:130,h:18},{x:1050,y:280,w:120,h:18}],
    spikes:[{x:340,y:368,w:40,h:17},{x:670,y:368,w:40,h:17}],
    bars:[{x:890,y:0,w:22,h:356}],
    enems:[{x:150,y:358,px1:80,px2:210,sp:1.2,dir:1,w:27,h:27},{x:600,y:358,px1:530,px2:700,sp:1.5,dir:1,w:27,h:27}],
    spawn:{x:60,y:320},goal:{x:1330,y:385}
  },
  {
    name:'🏙️ שלב 2 — עיר',
    bg:['#2c3e50','#3a4f6e','#4a6080'],
    gcol:'#444',gtop:'#666',
    plats:[{x:0,y:385,w:280,h:65},{x:350,y:385,w:250,h:65},{x:680,y:385,w:300,h:65},{x:1060,y:385,w:340,h:65},{x:140,y:295,w:100,h:18},{x:310,y:260,w:90,h:18},{x:630,y:280,w:100,h:18},{x:960,y:265,w:120,h:18}],
    spikes:[{x:420,y:368,w:40,h:17},{x:800,y:368,w:40,h:17},{x:1150,y:368,w:40,h:17}],
    bars:[{x:560,y:0,w:22,h:356},{x:1050,y:0,w:22,h:356}],
    enems:[{x:160,y:358,px1:70,px2:270,sp:1.5,dir:1,w:27,h:27},{x:720,y:358,px1:690,px2:960,sp:1.8,dir:1,w:27,h:27},{x:1100,y:358,px1:1060,px2:1380,sp:2.0,dir:-1,w:27,h:27}],
    spawn:{x:50,y:320},goal:{x:1340,y:385}
  },
  {
    name:'🌋 שלב 3 — הר',
    bg:['#1a0800','#3d1400','#5c2200'],
    gcol:'#3a1808',gtop:'#6a2808',
    plats:[{x:0,y:385,w:200,h:65},{x:280,y:340,w:120,h:110},{x:480,y:295,w:120,h:155},{x:680,y:340,w:120,h:110},{x:880,y:385,w:200,h:65},{x:1160,y:385,w:240,h:65},{x:160,y:270,w:90,h:18},{x:380,y:230,w:80,h:18},{x:600,y:220,w:80,h:18},{x:800,y:260,w:90,h:18},{x:1000,y:290,w:100,h:18}],
    spikes:[{x:230,y:323,w:35,h:17},{x:440,y:278,w:35,h:17},{x:640,y:278,w:35,h:17},{x:840,y:323,w:35,h:17}],
    bars:[{x:550,y:0,w:22,h:270},{x:960,y:0,w:22,h:356}],
    enems:[{x:80,y:358,px1:20,px2:190,sp:1.8,dir:1,w:27,h:27},{x:520,y:268,px1:480,px2:590,sp:2.0,dir:1,w:27,h:27},{x:920,y:358,px1:880,px2:1060,sp:2.2,dir:1,w:27,h:27},{x:1200,y:358,px1:1160,px2:1380,sp:2.0,dir:-1,w:27,h:27}],
    spawn:{x:50,y:320},goal:{x:1340,y:385}
  },
  {
    name:'❄️ שלב 4 — קרח',
    bg:['#a8d8f0','#d0ecfa','#f0f8ff'],
    gcol:'#5ab0d8',gtop:'#8ad0f0',
    plats:[{x:0,y:385,w:160,h:65},{x:240,y:385,w:160,h:65},{x:490,y:385,w:160,h:65},{x:740,y:385,w:160,h:65},{x:990,y:385,w:160,h:65},{x:1240,y:385,w:160,h:65},{x:170,y:320,w:60,h:18},{x:340,y:300,w:80,h:18},{x:420,y:260,w:80,h:18},{x:620,y:290,w:80,h:18},{x:720,y:255,w:80,h:18},{x:870,y:310,w:80,h:18},{x:970,y:270,w:80,h:18},{x:1140,y:310,w:80,h:18}],
    spikes:[{x:200,y:368,w:35,h:17},{x:455,y:368,w:35,h:17},{x:705,y:368,w:35,h:17},{x:955,y:368,w:35,h:17},{x:1205,y:368,w:35,h:17}],
    bars:[{x:380,y:0,w:22,h:341},{x:680,y:0,w:22,h:356},{x:1100,y:0,w:22,h:341}],
    enems:[{x:100,y:358,px1:20,px2:155,sp:2.0,dir:1,w:27,h:27},{x:300,y:358,px1:240,px2:440,sp:2.5,dir:1,w:27,h:27},{x:570,y:358,px1:490,px2:690,sp:2.2,dir:1,w:27,h:27},{x:820,y:358,px1:740,px2:940,sp:2.8,dir:-1,w:27,h:27},{x:1070,y:358,px1:990,px2:1190,sp:2.5,dir:1,w:27,h:27}],
    spawn:{x:50,y:320},goal:{x:1360,y:385}
  },
  {
    name:'👑 שלב 5 — ארמון',
    bg:['#0a0010','#1a0030','#0d0020'],
    gcol:'#200040',gtop:'#3a0070',
    plats:[{x:0,y:385,w:130,h:65},{x:210,y:385,w:100,h:65},{x:400,y:385,w:100,h:65},{x:590,y:385,w:100,h:65},{x:780,y:385,w:100,h:65},{x:970,y:385,w:100,h:65},{x:1160,y:385,w:240,h:65},{x:140,y:320,w:60,h:18},{x:290,y:290,w:60,h:18},{x:350,y:240,w:60,h:18},{x:450,y:280,w:60,h:18},{x:510,y:230,w:60,h:18},{x:620,y:295,w:60,h:18},{x:680,y:245,w:60,h:18},{x:790,y:310,w:60,h:18},{x:850,y:260,w:60,h:18},{x:980,y:300,w:60,h:18},{x:1040,y:250,w:60,h:18}],
    spikes:[{x:145,y:368,w:30,h:17},{x:335,y:368,w:30,h:17},{x:525,y:368,w:30,h:17},{x:715,y:368,w:30,h:17},{x:905,y:368,w:30,h:17},{x:1100,y:368,w:30,h:17}],
    bars:[{x:270,y:0,w:22,h:341},{x:570,y:0,w:22,h:356},{x:850,y:0,w:22,h:341},{x:1120,y:0,w:22,h:356}],
    enems:[{x:80,y:358,px1:20,px2:125,sp:2.2,dir:1,w:27,h:27},{x:240,y:358,px1:210,px2:380,sp:3.0,dir:1,w:27,h:27},{x:430,y:358,px1:400,px2:565,sp:2.8,dir:1,w:27,h:27},{x:620,y:358,px1:590,px2:755,sp:3.2,dir:-1,w:27,h:27},{x:810,y:358,px1:780,px2:945,sp:3.0,dir:1,w:27,h:27},{x:1000,y:358,px1:970,px2:1135,sp:3.5,dir:1,w:27,h:27}],
    spawn:{x:50,y:320},goal:{x:1360,y:385}
  }
];

var arcScale=1, arcOX=0, arcOY=0;

function resizeArcade(){
  if(!arcadeCanvas) return;
  var sw=window.innerWidth, sh=window.innerHeight;
  arcadeCanvas.width=sw; arcadeCanvas.height=sh;
  arcScale=Math.min(sw/AW, sh/AH);
  arcOX=(sw-AW*arcScale)/2;
  arcOY=(sh-AH*arcScale)/2;
}

function initArcade(){
  arcadeCanvas=document.getElementById('arcade-canvas');
  arcadeCtx=arcadeCanvas.getContext('2d');
  arcadeFaceImg=new Image();
  arcadeFaceImg.src='maor.png';
  arcadeFaceImg.onload=function(){ arcadeImgOk=true; };
  resizeArcade();
  setupJoystick();
  setupArcButtons();
  window.addEventListener('resize', resizeArcade);
}

// Virtual joystick
var joyTouchId=null, joyCX=0, joyCY=0;
var JOY_R=44, JOY_DEAD=14;

function setupJoystick(){
  var outer=document.getElementById('joy-outer');
  var inner=document.getElementById('joy-inner');
  if(!outer) return;

  function joyStart(e){
    e.preventDefault(); e.stopPropagation();
    var t=e.changedTouches[0];
    joyTouchId=t.identifier;
    var rect=outer.getBoundingClientRect();
    joyCX=rect.left+rect.width/2; joyCY=rect.top+rect.height/2;
    joyMove(t.clientX, t.clientY, inner);
  }
  function joyEnd(e){
    e.preventDefault();
    for(var i=0;i<e.changedTouches.length;i++){
      if(e.changedTouches[i].identifier===joyTouchId){
        joyTouchId=null; aKeys.left=false; aKeys.right=false;
        inner.style.transform='translate(-50%,-50%)'; break;
      }
    }
  }
  function joyMoveEvt(e){
    e.preventDefault();
    for(var i=0;i<e.changedTouches.length;i++){
      if(e.changedTouches[i].identifier===joyTouchId){
        joyMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY, inner); break;
      }
    }
  }
  outer.addEventListener('touchstart', joyStart, {passive:false});
  outer.addEventListener('touchmove', joyMoveEvt, {passive:false});
  outer.addEventListener('touchend', joyEnd, {passive:false});
  outer.addEventListener('touchcancel', joyEnd, {passive:false});
  // Mouse fallback for desktop testing
  var mouseDown=false;
  outer.addEventListener('mousedown',function(e){
    mouseDown=true;
    var rect=outer.getBoundingClientRect();
    joyCX=rect.left+rect.width/2; joyCY=rect.top+rect.height/2;
    joyMove(e.clientX,e.clientY,inner);
  });
  document.addEventListener('mousemove',function(e){
    if(mouseDown&&arcadeRunning) joyMove(e.clientX,e.clientY,inner);
  });
  document.addEventListener('mouseup',function(){
    if(mouseDown){ mouseDown=false; aKeys.left=false; aKeys.right=false; inner.style.transform='translate(-50%,-50%)'; }
  });
}

function joyMove(tx, ty, inner){
  var dx=tx-joyCX, dy=ty-joyCY;
  var dist=Math.sqrt(dx*dx+dy*dy);
  var clamped=Math.min(dist,JOY_R);
  var angle=Math.atan2(dy,dx);
  var kx=Math.cos(angle)*clamped, ky=Math.sin(angle)*clamped;
  inner.style.transform='translate(calc(-50% + '+kx+'px), calc(-50% + '+ky+'px))';
  aKeys.left=dx<-JOY_DEAD;
  aKeys.right=dx>JOY_DEAD;
}

function setupArcButtons(){
  var btnMap={'btn-a':'jump','btn-b':'crouch'};
  Object.keys(btnMap).forEach(function(id){
    var k=btnMap[id], el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('touchstart',function(e){e.preventDefault();e.stopPropagation();aKeys[k]=true;},{passive:false});
    el.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();aKeys[k]=false;},{passive:false});
    el.addEventListener('touchcancel',function(e){e.stopPropagation();aKeys[k]=false;},{passive:false});
    el.addEventListener('mousedown',function(e){e.stopPropagation();aKeys[k]=true;});
    el.addEventListener('mouseup',function(e){e.stopPropagation();aKeys[k]=false;});
  });
}

function beginArcadeLevel(idx){
  arcadeLevelIdx=idx;
  var lv=ARC_LEVELS[idx];
  arcPlats=lv.plats;
  arcSpikes=lv.spikes;
  arcBars=lv.bars;
  arcEnems=lv.enems.map(function(e){ return {x:e.x,y:e.y,px1:e.px1,px2:e.px2,sp:e.sp,dir:e.dir,w:e.w,h:e.h}; });
  arcGoal={x:lv.goal.x,y:lv.goal.y}; arcGoalAnim=0;
  arc.x=lv.spawn.x; arc.y=lv.spawn.y;
  arc.vx=0; arc.vy=0; arc.onGround=false; arc.crouching=false; arc.invincible=0;
  arcCam.x=0;
  aKeys={left:false,right:false,jump:false,crouch:false};
  jumpWasHeld=false;
  arcadeRunning=true; arcadeLastTime=null;
  if(arcadeRafId) cancelAnimationFrame(arcadeRafId);
  arcadeRafId=requestAnimationFrame(arcLoop);
  showArcBanner(lv.name);
}

function stopArcade(){
  arcadeRunning=false;
  if(arcadeRafId){ cancelAnimationFrame(arcadeRafId); arcadeRafId=null; }
}

function arcLoop(ts){
  if(!arcadeRunning) return;
  arcadeRafId=requestAnimationFrame(arcLoop);
  var dt=arcadeLastTime?Math.min(ts-arcadeLastTime,50):16.67;
  arcadeLastTime=ts;
  var steps=Math.max(1,Math.round(dt/16.67));
  for(var i=0;i<steps;i++) arcStep();
  arcDraw();
}

function arcStep(){
  // Physics always uses AC_H so arc.y never teleports on crouch toggle
  var spd=arc.crouching?AC_SPD*0.55:AC_SPD;
  if(aKeys.left) arc.vx=-spd;
  else if(aKeys.right) arc.vx=spd;
  else arc.vx=0;

  if(aKeys.jump&&!jumpWasHeld&&!arc.crouching&&arc.onGround){
    arc.vy=AC_JUMP; arc.onGround=false; SFX.jump();
  }
  jumpWasHeld=aKeys.jump;

  arc.crouching=aKeys.crouch&&arc.onGround;
  arc.vy=Math.min(arc.vy+AC_GRAV,AC_MAXFALL);
  arc.x+=arc.vx; arc.y+=arc.vy;
  if(arc.x<0) arc.x=0;
  if(arc.x+AC_W>AC_LVLW) arc.x=AC_LVLW-AC_W;

  // Platform collision always uses full height (no y-jump on crouch)
  arc.onGround=false;
  for(var i=0;i<arcPlats.length;i++){
    var p=arcPlats[i];
    if(arcRect(arc.x,arc.y,AC_W,AC_H,p.x,p.y,p.w,p.h)){
      var oT=(arc.y+AC_H)-p.y, oB=p.y+p.h-arc.y;
      var oL=(arc.x+AC_W)-p.x, oR=p.x+p.w-arc.x;
      var mo=Math.min(oT,oB,oL,oR);
      if(mo===oT&&arc.vy>=0){ arc.y=p.y-AC_H; arc.vy=0; arc.onGround=true; }
      else if(mo===oB&&arc.vy<0){ arc.y=p.y+p.h; arc.vy=0; }
      else if(mo===oL&&arc.vx>0){ arc.x=p.x-AC_W; arc.vx=0; }
      else if(mo===oR&&arc.vx<0){ arc.x=p.x+p.w; arc.vx=0; }
    }
  }

  if(arc.y>AH+80){ arcHit(); return; }
  if(arc.invincible>0) arc.invincible--;

  // For hazards: when crouching, effective top shifts DOWN (char squishes from top)
  // effTop = arc.y + (AC_H - AC_CH) when crouching, so effBottom = arc.y + AC_H always
  var effOff=arc.crouching?(AC_H-AC_CH):0;
  var effH=arc.crouching?AC_CH:AC_H;

  for(var i=0;i<arcSpikes.length;i++){
    var s=arcSpikes[i];
    if(arcRect(arc.x+4,arc.y+effOff+4,AC_W-8,effH-4,s.x,s.y,s.w,s.h)){ arcHit(); return; }
  }

  for(var i=0;i<arcBars.length;i++){
    var b=arcBars[i];
    // Barrier only blocks if effective top is inside it (crouching shifts top below barrier bottom)
    if(arcRect(arc.x+2,arc.y+effOff,AC_W-4,effH,b.x,b.y,b.w,b.h)){
      if(arc.x+AC_W/2<b.x+b.w/2){ arc.x=b.x-AC_W-2; } else { arc.x=b.x+b.w+2; }
      arc.vx=0;
    }
  }

  if(arc.invincible===0){
    for(var i=0;i<arcEnems.length;i++){
      var e=arcEnems[i];
      if(arcRect(arc.x+4,arc.y+effOff+4,AC_W-8,effH-8,e.x,e.y,e.w,e.h)){ arcHit(); return; }
    }
  }

  if(arcRect(arc.x,arc.y+effOff,AC_W,effH,arcGoal.x-20,arcGoal.y-55,50,55)){ arcLevelDone(); return; }

  for(var i=0;i<arcEnems.length;i++){
    var e=arcEnems[i];
    e.x+=e.sp*e.dir;
    if(e.x<=e.px1){ e.x=e.px1; e.dir=1; }
    if(e.x+e.w>=e.px2){ e.x=e.px2-e.w; e.dir=-1; }
  }

  arcCam.x=Math.max(0,Math.min(arc.x+AC_W/2-AW/2,AC_LVLW-AW));
  arcGoalAnim+=0.04;
  if(arcBannerFrames>0) arcBannerFrames--;
}

function arcRect(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}

function arcHit(){
  if(arc.invincible>0) return;
  arcadeLives--; SFX.hit();
  if(arcadeLives<=0){ arcGameOver(); return; }
  arc.invincible=120;
  var sp=ARC_LEVELS[arcadeLevelIdx].spawn;
  arc.x=sp.x; arc.y=sp.y; arc.vx=0; arc.vy=0; arc.onGround=false; arcCam.x=0;
}

function arcLevelDone(){
  arcadeScore+=(arcadeLevelIdx+1)*10; SFX.levelup(); stopArcade();
  if(arcadeLevelIdx+1>=ARC_LEVELS.length){ arcWin(); }
  else { setTimeout(function(){ beginArcadeLevel(arcadeLevelIdx+1); },1400); }
}

function arcGameOver(){
  stopArcade(); saveHS('arcade',arcadeScore);
  setTimeout(function(){
    document.getElementById('arcade-screen').classList.add('hidden');
    gameoverScr.classList.remove('hidden');
    finalScoreEl.innerHTML='<div class="go-mode">🕹️ ארקייד</div><div class="go-points">ניקוד: <strong>'+arcadeScore+'</strong></div><div class="go-best">שלב: '+(arcadeLevelIdx+1)+' / 5</div><div class="go-best">שיא: '+getHS('arcade')+'</div>';
  },400);
}

function arcWin(){
  var nr=saveHS('arcade',arcadeScore);
  setTimeout(function(){
    document.getElementById('arcade-screen').classList.add('hidden');
    gameoverScr.classList.remove('hidden');
    finalScoreEl.innerHTML='<div class="go-mode">🕹️ ארקייד</div><div class="go-points">🏆 ניצחת! ניקוד: <strong>'+arcadeScore+'</strong></div><div class="new-record">כל 5 השלבים הושלמו!</div><div class="go-best">שיא: '+getHS('arcade')+'</div>'+(nr?'<div class="new-record">🎉 שיא חדש!</div>':'');
  },400);
}

var arcBannerTimer=null;
function showArcBanner(name){
  arcBannerText=name; arcBannerFrames=150;
}

function arcDraw(){
  var ctx=arcadeCtx, lv=ARC_LEVELS[arcadeLevelIdx];
  // Black letterbox fill
  ctx.fillStyle='#000'; ctx.fillRect(0,0,arcadeCanvas.width,arcadeCanvas.height);
  // Scale game to fill screen (letterbox)
  ctx.save();
  ctx.translate(arcOX,arcOY); ctx.scale(arcScale,arcScale);
  ctx.beginPath(); ctx.rect(0,0,AW,AH); ctx.clip();
  var grad=ctx.createLinearGradient(0,0,0,AH);
  var bg=lv.bg;
  for(var i=0;i<bg.length;i++) grad.addColorStop(i/(bg.length-1),bg[i]);
  ctx.fillStyle=grad; ctx.fillRect(0,0,AW,AH);
  ctx.save(); ctx.translate(-arcCam.x,0);

  for(var i=0;i<arcPlats.length;i++){
    var p=arcPlats[i];
    ctx.fillStyle=lv.gcol; ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle=lv.gtop; ctx.fillRect(p.x,p.y,p.w,6);
  }

  for(var i=0;i<arcBars.length;i++){
    var b=arcBars[i];
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.fillStyle='#1a1a1a';
    for(var iy=0;iy<b.h;iy+=18) ctx.fillRect(b.x,b.y+iy,b.w,2);
    for(var ix=0;ix<b.w+12;ix+=8){
      ctx.fillStyle=(Math.floor(ix/8)%2===0)?'#FFD700':'#222';
      ctx.fillRect(b.x-5+ix,b.h-8,8,8);
    }
    ctx.fillStyle='rgba(255,215,0,.9)'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText('↓',b.x+b.w/2,b.h-14);
  }

  for(var i=0;i<arcSpikes.length;i++){
    var s=arcSpikes[i];
    var n=Math.max(1,Math.floor(s.w/14)), sw=s.w/n;
    ctx.fillStyle='#cc2200';
    for(var k=0;k<n;k++){
      ctx.beginPath(); ctx.moveTo(s.x+k*sw,s.y+s.h); ctx.lineTo(s.x+k*sw+sw/2,s.y); ctx.lineTo(s.x+(k+1)*sw,s.y+s.h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle='rgba(255,100,50,.4)';
    for(var k=0;k<n;k++){
      ctx.beginPath(); ctx.moveTo(s.x+k*sw,s.y+s.h); ctx.lineTo(s.x+k*sw+sw*0.32,s.y+s.h*0.35); ctx.lineTo(s.x+k*sw+sw*0.22,s.y+s.h); ctx.closePath(); ctx.fill();
    }
  }

  // Goal
  var gx=arcGoal.x, gy=arcGoal.y, bob=Math.sin(arcGoalAnim*2.5)*5;
  ctx.fillStyle='#888'; ctx.fillRect(gx-2,gy-60+bob,5,60);
  ctx.fillStyle='#FF5722';
  ctx.beginPath(); ctx.moveTo(gx+3,gy-60+bob); ctx.lineTo(gx+24,gy-50+bob); ctx.lineTo(gx+3,gy-40+bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#FFD700'; ctx.shadowBlur=12+Math.sin(arcGoalAnim*3)*5; ctx.shadowColor='#FFD700';
  arcDrawStar(ctx,gx,gy-70+bob,16,5); ctx.shadowBlur=0;

  // Enemies
  for(var i=0;i<arcEnems.length;i++){
    var e=arcEnems[i], ex=e.x+e.w/2, ey=e.y+e.h/2, er=e.w/2, ed=e.dir>0?1:-1;
    ctx.fillStyle='#e53935'; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex+ed*7,ey-5,4.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(ex+ed*8,ey-5,2.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#111'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(ex+ed*3,ey-11); ctx.lineTo(ex+ed*12,ey-9); ctx.stroke();
  }

  // Character — draw bottom-aligned, squish to 60% when crouching (no y-glitch)
  var drawH=arc.crouching?Math.round(AC_H*0.6):AC_H;
  var drawY=arc.y+AC_H-drawH; // always bottom-aligned to arc.y+AC_H
  var flash=arc.invincible>0&&Math.floor(arc.invincible/5)%2===1;
  if(flash) ctx.globalAlpha=0.25;
  if(arcadeImgOk&&arcadeFaceImg){
    var bob2=arc.onGround&&!arc.crouching?Math.sin(Date.now()*0.012)*2:0;
    ctx.drawImage(arcadeFaceImg,arc.x,drawY+bob2,AC_W,drawH);
  } else {
    ctx.fillStyle='#4fc3f7'; ctx.fillRect(arc.x,drawY,AC_W,drawH);
    ctx.fillStyle='#fff'; ctx.fillRect(arc.x+8,drawY+8,9,9); ctx.fillRect(arc.x+AC_W-17,drawY+8,9,9);
    ctx.fillStyle='#111'; ctx.fillRect(arc.x+11,drawY+11,4,4); ctx.fillRect(arc.x+AC_W-14,drawY+11,4,4);
  }
  ctx.globalAlpha=1;
  ctx.restore();

  // HUD
  ctx.fillStyle='rgba(0,0,0,.6)';
  ctx.beginPath(); arcRR(ctx,7,7,210,48,10); ctx.fill();
  ctx.fillStyle='#FFD700'; ctx.font='bold 13px sans-serif'; ctx.textAlign='left';
  ctx.fillText(lv.name,14,27);
  for(var i=0;i<3;i++){
    ctx.fillStyle=i<arcadeLives?'#f44':'#444';
    ctx.beginPath(); ctx.arc(14+i*22,42,7,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='right';
  ctx.fillText('ניקוד: '+arcadeScore,AW-10,27);
  var pw=AW-20;
  ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(10,AH-12,pw,5);
  ctx.fillStyle='#FFD700'; ctx.fillRect(10,AH-12,pw*Math.min(1,(arc.x+AC_W/2)/AC_LVLW),5);
  arcDrawBanner(ctx);
  ctx.restore(); // scale wrapper
}

function arcDrawStar(ctx,cx,cy,r,pts){
  var ir=r*0.42;
  ctx.beginPath();
  for(var i=0;i<pts*2;i++){
    var rad=i%2===0?r:ir, ang=(i*Math.PI/pts)-Math.PI/2;
    if(i===0) ctx.moveTo(cx+rad*Math.cos(ang),cy+rad*Math.sin(ang));
    else ctx.lineTo(cx+rad*Math.cos(ang),cy+rad*Math.sin(ang));
  }
  ctx.closePath(); ctx.fill();
}
function arcRR(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function arcDrawBanner(ctx){
  if(arcBannerFrames<=0) return;
  var alpha=arcBannerFrames>30?1:arcBannerFrames/30;
  ctx.save(); ctx.globalAlpha=alpha;
  var bw=360, bh=52, bx=(AW-bw)/2, by=(AH-bh)/2-20;
  ctx.fillStyle='rgba(0,0,0,.75)';
  arcRR(ctx,bx,by,bw,bh,14); ctx.fill();
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=2;
  arcRR(ctx,bx,by,bw,bh,14); ctx.stroke();
  ctx.fillStyle='#FFD700'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center';
  ctx.fillText(arcBannerText,AW/2,by+34);
  ctx.restore();
}
