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
  stopLoop();
  menuScreen.classList.remove('hidden');
  gameDiv.classList.add('hidden');
  gameoverScr.classList.add('hidden');
  hsMenuEl.innerHTML=Object.keys(MODES).map(function(m){
    return '<span class="hs-item">'+MODES[m].icon+' '+MODES[m].label+': '+getHS(m)+'</span>';
  }).join('');
}

function startGame(modeName){
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
function restartGame(){ startGame(currentModeName); }
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
document.addEventListener('keydown',function(e){
  if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }
  if(e.code==='ArrowDown'||e.code==='KeyS'){ e.preventDefault(); startCrouch(); }
});
document.addEventListener('keyup',function(e){
  if(e.code==='ArrowDown'||e.code==='KeyS') endCrouch();
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
