// Stellar Frontier — GOD MODE: pilota e nave indistruttibili, per rigiocare tutti i livelli.
// Si accende dalle IMPOSTAZIONI (localStorage stellarGodMode).
// (2026-11-11) Si SBLOCCA solo a gioco finito: dopo aver liberato tutti i pianeti, anche OMEGA.
//   Lo sblocco resta per sempre (localStorage stellarGodSbloccato), anche dopo una nuova partita.
// - Fase 1: nessun danno alla nave (urti, colpi, missili, meteoriti).
// - Fase 2: nessun danno al pilota; se cade in un burrone torna sull'ultimo terreno sicuro senza perdere salute.
// - Nessuna vita persa. Tutti i pianeti, anche OMEGA, si possono giocare e rigiocare.
// - In questa modalità non si guadagnano punti né crediti e non si spende nulla (laser, missili, granate, carburante).
// Va caricato dopo mappa.js, economia.js, terra.js e battaglia.js (avvolge le loro versioni delle funzioni).

const GOD_KEY='stellarGodMode',GOD_UNLOCK_KEY='stellarGodSbloccato';
let godMode=(()=>{try{return localStorage.getItem(GOD_KEY)==='yes'}catch(e){return false}})();
const gOrigGod={damage,explodePlayer,pfDamage,pfFell,pfLoseLife,
 scoreAdd:typeof scoreAdd==='function'?scoreAdd:null,
 ecoSpend:typeof ecoSpend==='function'?ecoSpend:null,
 ecoFuel:typeof ecoFuel==='function'?ecoFuel:null,
 pfFinish:typeof pfFinish==='function'?pfFinish:null,
 mapLocked:typeof mapLocked==='function'?mapLocked:null,
 mapPlayable:typeof mapPlayable==='function'?mapPlayable:null,
 mapAllDone:typeof mapAllDone==='function'?mapAllDone:null,
 selectPlanet};

// ---- sblocco: tutti i pianeti liberati (anche OMEGA)
function godGameFinished(){
 try{if(typeof omegaLibero==='function'&&omegaLibero())return true}catch(e){}
 try{return!!(gOrigGod.mapAllDone&&gOrigGod.mapAllDone())}catch(e){return false}
}
function godUnlocked(){
 try{if(localStorage.getItem(GOD_UNLOCK_KEY)==='yes')return true}catch(e){}
 return false;
}
// Controlla se il gioco è appena stato finito; restituisce true se lo sblocco è nuovo.
function godCheckUnlock(){
 if(godUnlocked()||!godGameFinished())return false;
 try{localStorage.setItem(GOD_UNLOCK_KEY,'yes')}catch(e){}
 return true;
}
godCheckUnlock();
if(godMode&&!godUnlocked()){godMode=false;try{localStorage.setItem(GOD_KEY,'')}catch(e){}}

// ---- fase 1: la nave non subisce danni (l'urto la scuote ancora, ma la salute resta piena)
damage=function(n,piercing=false,shieldFirst=false){
 if(!godMode)return gOrigGod.damage(n,piercing,shieldFirst);
 if(state!=='play'||player.inv>0)return;
 player.inv=.55;burst(player.x,player.y,'#ffd76a',8);
};
explodePlayer=function(){if(godMode){player.health=Math.max(player.health,1);return}return gOrigGod.explodePlayer()};

// ---- fase 2: il pilota non subisce danni e non cade nel vuoto
pfDamage=function(n,dir=1,piercing=false){
 if(!godMode)return gOrigGod.pfDamage(n,dir,piercing);
 const P=pf&&pf.pilot;if(!P||P.inv>0)return;
 P.inv=.5;pfBurst(P.x,P.y-28,'#ffd76a',6,.6);
};
pfFell=function(){
 if(!godMode)return gOrigGod.pfFell();
 const P=pf.pilot,g=pfGroundAt(P.lastGround)??PF_FLOOR;
 Object.assign(P,{x:P.lastGround,y:g,vx:0,vy:0,inv:1.2,jetOn:false});
 pfStatus('GOD MODE · RIPORTATO A TERRA',1400);
};
pfLoseLife=function(...args){
 if(!godMode)return gOrigGod.pfLoseLife(...args);
 const P=pf&&pf.pilot;if(P)P.hp=100;
};

// ---- punti e crediti: in god mode non si guadagna e non si spende nulla
if(gOrigGod.scoreAdd)scoreAdd=function(n){if(!godMode)gOrigGod.scoreAdd(n)};
if(gOrigGod.ecoSpend)ecoSpend=function(kind,n=1){return godMode?true:gOrigGod.ecoSpend(kind,n)};
if(gOrigGod.ecoFuel)ecoFuel=function(units){if(!godMode)gOrigGod.ecoFuel(units)};
// (taglia nemici e premio missione sono già a zero in economia.js quando godMode è acceso)

// ---- fine missione: liberato OMEGA si sblocca il god mode
if(gOrigGod.pfFinish)pfFinish=function(...args){
 const r=gOrigGod.pfFinish.apply(this,args);
 if(godCheckUnlock()){
  godSync();
  if(typeof profToast==='function')try{profToast('GOD MODE SBLOCCATA · ATTIVALA DALLE IMPOSTAZIONI')}catch(e){}
 }
 return r;
};

// ---- mappa
if(gOrigGod.mapLocked)mapLocked=function(p){return godMode?false:gOrigGod.mapLocked(p)};
if(gOrigGod.mapPlayable)mapPlayable=function(p){return godMode?!!p:gOrigGod.mapPlayable(p)};
if(gOrigGod.mapAllDone)mapAllDone=function(){return godMode?false:gOrigGod.mapAllDone()};
selectPlanet=function(i){
 gOrigGod.selectPlanet(i);
 if(!godMode)return;
 const btn=$('launchBtn');if(!btn)return;
 btn.disabled=false;if(btn.classList)btn.classList.remove('done');
 const label=btn.querySelector&&btn.querySelector('span');if(label)label.textContent='INIZIA LA MISSIONE';
};

// ---- interruttore nelle impostazioni e scritta sullo schermo
const GOD_DESC_ON='Pilota e nave indistruttibili: nessun danno e nessuna vita persa, tutti i pianeti (anche OMEGA) si possono giocare e rigiocare. In GOD MODE non si guadagnano punti né crediti e non si spende nulla.';
let godDescOpen=null;
const GOD_DESC_LOCK='Si sblocca solo a gioco finito, dopo aver liberato tutti i pianeti (anche OMEGA). In GOD MODE non si guadagnano punti né crediti e non si spende nulla.';
function godSync(){
 const open=godUnlocked(),b=$('godToggle');
 if(b&&b.classList){
  b.classList.toggle('active',godMode);b.classList.toggle('locked',!open);
  b.setAttribute('aria-checked',String(godMode));b.setAttribute('aria-disabled',String(!open));
  const s=b.querySelector('span');if(s)s.textContent=!open?'BLOCCATA':godMode?'ATTIVA':'DISATTIVATA'
 }
 const row=typeof document!=='undefined'&&document.querySelector?document.querySelector('.god-row'):null;
 if(row&&row.classList)row.classList.toggle('locked',!open);
 const p=row&&row.querySelector?row.querySelector('p'):null;
 if(p&&godDescOpen!==open){godDescOpen=open;p.textContent=open?GOD_DESC_ON:GOD_DESC_LOCK}
 if(document.body&&document.body.classList)document.body.classList.toggle('god',godMode);
}
function setGodMode(on){
 if(on&&!godUnlocked()){
  godMode=false;godSync();
  if(typeof profToast==='function')try{profToast('GOD MODE BLOCCATA · LIBERA TUTTI I PIANETI, ANCHE OMEGA')}catch(e){}
  if(typeof sfx==='function')sfx('ui');
  return false;
 }
 godMode=!!on;try{localStorage.setItem(GOD_KEY,godMode?'yes':'')}catch(e){}
 godSync();
 if(state==='map'&&$('starMap')&&$('starMap').appendChild){initMap();selectPlanet(selected)}
 if(typeof sfx==='function')sfx('ui');
 return godMode;
}

// Traduzioni delle frasi nuove (i18n.js arriva dopo questo file).
const GOD_I18N=[
 ['BLOCCATA','LOCKED','VERROUILLÉ','BLOQUEADO','ЗАБЛОКИРОВАНО','已锁定','ロック中'],
 [GOD_DESC_ON,'Pilot and ship are indestructible: no damage and no lives lost, every planet (OMEGA too) can be played and replayed. In GOD MODE you earn no points or credits and spend nothing.','Pilote et vaisseau indestructibles : aucun dégât et aucune vie perdue, toutes les planètes (OMEGA aussi) peuvent être jouées et rejouées. En GOD MODE on ne gagne ni points ni crédits et on ne dépense rien.','Piloto y nave indestructibles: sin daño y sin perder vidas, todos los planetas (también OMEGA) se pueden jugar y volver a jugar. En GOD MODE no se ganan puntos ni créditos y no se gasta nada.','Пилот и корабль неуязвимы: никакого урона и потерь жизней, все планеты (и OMEGA) можно играть и переигрывать. В GOD MODE не начисляются очки и кредиты и ничего не тратится.','飞行员和飞船无敌：不受伤害、不损失生命，所有星球（包括 OMEGA）都可以游玩和重玩。GOD MODE 下不获得分数和积分，也不消耗任何东西。','パイロットと宇宙船は無敵：ダメージもライフの減少もなく、すべての惑星（OMEGAも）を何度でもプレイできます。GOD MODEではポイントもクレジットも得られず、何も消費しません。'],
 [GOD_DESC_LOCK,'Unlocks only when the game is finished, after freeing every planet (OMEGA too). In GOD MODE you earn no points or credits and spend nothing.','Se débloque seulement à la fin du jeu, après avoir libéré toutes les planètes (OMEGA aussi). En GOD MODE on ne gagne ni points ni crédits et on ne dépense rien.','Se desbloquea solo al terminar el juego, tras liberar todos los planetas (también OMEGA). En GOD MODE no se ganan puntos ni créditos y no se gasta nada.','Открывается только после прохождения игры, когда освобождены все планеты (и OMEGA). В GOD MODE не начисляются очки и кредиты и ничего не тратится.','只有通关后才会解锁：解放所有星球（包括 OMEGA）。GOD MODE 下不获得分数和积分，也不消耗任何东西。','ゲームクリア後、すべての惑星（OMEGAも）を解放すると解除されます。GOD MODEではポイントもクレジットも得られず、何も消費しません。'],
 ['GOD MODE SBLOCCATA · ATTIVALA DALLE IMPOSTAZIONI','GOD MODE UNLOCKED · TURN IT ON IN SETTINGS','GOD MODE DÉBLOQUÉ · ACTIVEZ-LE DANS LES PARAMÈTRES','GOD MODE DESBLOQUEADO · ACTÍVALO EN AJUSTES','GOD MODE ОТКРЫТ · ВКЛЮЧИТЕ В НАСТРОЙКАХ','GOD MODE 已解锁 · 在设置中开启','GOD MODE 解除 · 設定でオンにできます'],
 ['GOD MODE BLOCCATA · LIBERA TUTTI I PIANETI, ANCHE OMEGA','GOD MODE LOCKED · FREE EVERY PLANET, OMEGA TOO','GOD MODE VERROUILLÉ · LIBÉREZ TOUTES LES PLANÈTES, OMEGA AUSSI','GOD MODE BLOQUEADO · LIBERA TODOS LOS PLANETAS, TAMBIÉN OMEGA','GOD MODE ЗАБЛОКИРОВАН · ОСВОБОДИТЕ ВСЕ ПЛАНЕТЫ, И OMEGA','GOD MODE 已锁定 · 解放所有星球，包括 OMEGA','GOD MODE ロック中 · すべての惑星を解放（OMEGAも）']
];
function godI18n(){
 if(typeof I18N_ROWS==='undefined')return false;
 for(const r of GOD_I18N)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
 if(typeof i18nApply==='function')try{i18nApply()}catch(e){}
 return true;
}

if(typeof document!=='undefined'&&document.createElement&&document.body&&document.body.appendChild){
 if(document.head&&document.head.appendChild&&!$('godStile')){
  const st=document.createElement('style');st.id='godStile';
  st.textContent='.god-row.locked .setting-title span{color:#8a8f9c}.god-row.locked p{color:#ffd76a}#godToggle.locked{opacity:.55;cursor:not-allowed}';
  document.head.appendChild(st);
 }
 if(!$('godBadge')||!$('godBadge').classList){
  const d=document.createElement('div');d.id='godBadge';d.className='god-badge';
  d.innerHTML=(typeof ico==='function'?ico('god'):'')+'<span>GOD MODE</span>';document.body.appendChild(d);
 }
 const b=$('godToggle');if(b)b.onclick=()=>setGodMode(!godMode);
 godSync();
 if(godMode&&state==='map'&&$('starMap')&&$('starMap').appendChild){initMap();selectPlanet(selected)}
 if(typeof addEventListener==='function')addEventListener('load',()=>{godI18n();godCheckUnlock();godSync()});
}
