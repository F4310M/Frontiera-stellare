// Stellar Frontier — GOD MODE: pilota e nave indistruttibili, per vedere tutti i livelli.
// Si accende dalle IMPOSTAZIONI (localStorage stellarGodMode).
// - Fase 1: nessun danno alla nave (urti, colpi, missili, meteoriti).
// - Fase 2: nessun danno al pilota; se cade in un burrone torna sull'ultimo terreno sicuro senza perdere salute.
// - Nessuna vita persa. Tutti i pianeti, anche OMEGA, si possono giocare e rigiocare.
// - In questa modalità non si guadagnano punti per la classifica.
// Va caricato dopo mappa.js, terra.js e battaglia.js (avvolge le loro versioni delle funzioni).

let godMode=(()=>{try{return localStorage.getItem('stellarGodMode')==='yes'}catch(e){return false}})();
const gOrigGod={damage,explodePlayer,pfDamage,pfFell,pfLoseLife,
 scoreAdd:typeof scoreAdd==='function'?scoreAdd:null,
 mapLocked:typeof mapLocked==='function'?mapLocked:null,
 mapPlayable:typeof mapPlayable==='function'?mapPlayable:null,
 mapAllDone:typeof mapAllDone==='function'?mapAllDone:null,
 selectPlanet};

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
pfLoseLife=function(){
 if(!godMode)return gOrigGod.pfLoseLife();
 const P=pf&&pf.pilot;if(P)P.hp=100;
};

// ---- punti e mappa
if(gOrigGod.scoreAdd)scoreAdd=function(n){if(!godMode)gOrigGod.scoreAdd(n)};
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
function godSync(){
 const b=$('godToggle');
 if(b&&b.classList){b.classList.toggle('active',godMode);b.setAttribute('aria-checked',String(godMode));const s=b.querySelector('span');if(s)s.textContent=godMode?'ATTIVA':'DISATTIVATA'}
 if(document.body&&document.body.classList)document.body.classList.toggle('god',godMode);
}
function setGodMode(on){
 godMode=!!on;try{localStorage.setItem('stellarGodMode',godMode?'yes':'')}catch(e){}
 godSync();
 if(state==='map'&&$('starMap')&&$('starMap').appendChild){initMap();selectPlanet(selected)}
 if(typeof sfx==='function')sfx('ui');
}
if(typeof document!=='undefined'&&document.createElement&&document.body&&document.body.appendChild){
 if(!$('godBadge')||!$('godBadge').classList){
  const d=document.createElement('div');d.id='godBadge';d.className='god-badge';
  d.innerHTML=(typeof ico==='function'?ico('god'):'')+'<span>GOD MODE</span>';document.body.appendChild(d);
 }
 const b=$('godToggle');if(b)b.onclick=()=>setGodMode(!godMode);
 godSync();
 if(godMode&&state==='map'&&$('starMap')&&$('starMap').appendChild){initMap();selectPlanet(selected)}
}
