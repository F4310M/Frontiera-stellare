// Conex — BILANCIAMENTO DI FINE CAMPAGNA (2026-11-12, chiesto da Fabio).
// 1) ECONOMIA: finita la storia (5 pianeti + OMEGA) si arriva a comprare circa il 40-50% dei potenziamenti,
//    non tutti. Stima di una campagna completa con i numeri di prima: ~95.000 CR guadagnati contro
//    ~40.000 CR di potenziamenti (si compravano tutti). Ora: premi dei pianeti a metà (OMEGA a un quarto), bonus ostaggi
//    100×difficoltà (era 150), taglie 8/12 (erano 10/15) => ~42.000 CR; potenziamenti ×2,2 => ~88.000 CR.
//    I potenziamenti restano permanenti: si completano rigiocando la campagna (×2, ×3…).
// 2) NEMICI PIÙ DURI con laser e barriera potenziati: la salute dei nemici cresce con il livello del laser
//    (e con il doppio laser), i danni delle loro armi crescono con il livello della barriera. Tutto cresce
//    ancora a ogni campagna rigiocata (ciclo N di classifica-personale.js).
// 3) PIÙ NAVI AMMIRAGLIE, soprattutto negli ultimi pianeti: fino a 1/1/2/2/3 navi da guerra insieme
//    (LYRA…UMBRA) e 4 su OMEGA, che arrivano più spesso.
// Va caricato dopo mercato-plus.js (prezzi del JETPACK), facile.js, spazio.js e classifica-personale.js.

const BIL={
 // economia
 prezzi:2.2,premi:.5,premioOmega:.25,ostaggio:100,taglia:{1:8,2:12},
 // nemici: salute = base + laser×livello + doppio laser, danni = base + barriera×livello; poi × ciclo
 hpBase:1.15,hpLaser:.3,hpTwin:.3,hpBoss:.7,
 dmgBase:1.15,dmgShield:.22,
 ciclo:{hp:.3,dmg:.2},
 // navi ammiraglie insieme, per difficoltà del pianeta (OMEGA = 7), e ogni quanto ne arriva un'altra
 ammiraglie:d=>d>=7?4:d>=5?3:d>=3?2:1,
 ammPrima:[22,34],ammNext:[30,48],
 ammTimer:0,extra:[]
};

// ---------------------------------------------------------------- 1) economia
function bilTondo(n){return Math.max(50,Math.round(n/50)*50)}
if(typeof ECO_ITEMS!=='undefined'&&!ECO_ITEMS.bilancio){
 ECO_ITEMS.bilancio=true;
 for(const it of ECO_ITEMS)it.prices=it.prices.map(p=>bilTondo(p*BIL.prezzi));
}
function bilCR(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' CR'}
if(typeof planets!=='undefined'){
 const tutti=planets.slice();
 if(typeof FINAL_PLANET!=='undefined'&&!tutti.includes(FINAL_PLANET))tutti.push(FINAL_PLANET);
 for(const p of tutti){
  if(p.bilPremio)continue;
  const v=parseInt(String(p.reward).replace(/\D/g,''),10)||0;
  p.bilPremio=true;p.reward=bilCR(bilTondo(v*(p.final?BIL.premioOmega:BIL.premi)));
 }
}
if(typeof ECO_BOUNTY!=='undefined')Object.assign(ECO_BOUNTY,BIL.taglia);
if(typeof ecoHostageBonus==='function')ecoHostageBonus=function(p){return BIL.ostaggio*p.difficulty};

// ---------------------------------------------------------------- 2) nemici più resistenti e più forti
function bilCiclo(){
 try{if(typeof cpCicloLoad==='function')return cpCicloLoad().n}catch(e){}
 return 1;
}
function bilUpg(id){try{return typeof upg==='function'?upg(id):0}catch(e){return 0}}
function bilHpK(){
 const c=bilCiclo();
 return (BIL.hpBase+BIL.hpLaser*bilUpg('laser')+(bilUpg('twin')>0?BIL.hpTwin:0))*(1+BIL.ciclo.hp*(c-1));
}
function bilDmgK(){
 const c=bilCiclo();
 return (BIL.dmgBase+BIL.dmgShield*bilUpg('shield'))*(1+BIL.ciclo.dmg*(c-1));
}
function bilGod(){return typeof godMode!=='undefined'&&godMode}
function bilSalute(e,k){
 if(!e||typeof e.hp!=='number'||!(e.hp>0)||e.bilHp)return;
 e.bilHp=true;
 const hp=Math.max(1,Math.round(e.hp*k));
 e.hp=hp;if('maxHp' in e)e.maxHp=hp;if('max' in e)e.max=hp;
}
const bilOrig={damage,pfDamage,spawnEnemy,pfSpawnEnemy,pfSpawnBoss:typeof pfSpawnBoss==='function'?pfSpawnBoss:null,
 battSpawnCover:typeof battSpawnCover==='function'?battSpawnCover:null,spSpawnBig:typeof spSpawnBig==='function'?spSpawnBig:null,
 spUpdate:typeof spUpdate==='function'?spUpdate:null,spReset:typeof spReset==='function'?spReset:null};
damage=function(n,...a){if(n>0&&!bilGod())n=Math.max(1,Math.round(n*bilDmgK()));return bilOrig.damage.call(this,n,...a)};
pfDamage=function(n,...a){if(n>0&&!bilGod())n=Math.max(1,Math.round(n*bilDmgK()));return bilOrig.pfDamage.call(this,n,...a)};
spawnEnemy=function(...a){
 const n=enemies.length,r=bilOrig.spawnEnemy.apply(this,a),k=bilHpK();
 for(let i=n;i<enemies.length;i++)if(!enemies[i].big)bilSalute(enemies[i],k);
 return r;
};
pfSpawnEnemy=function(...a){
 const n=typeof pf!=='undefined'&&pf?pf.enemies.length:0,r=bilOrig.pfSpawnEnemy.apply(this,a);
 if(typeof pf!=='undefined'&&pf){const k=bilHpK();for(let i=n;i<pf.enemies.length;i++)bilSalute(pf.enemies[i],k)}
 return r;
};
if(bilOrig.battSpawnCover)battSpawnCover=function(...a){
 const n=pf.enemies.length,r=bilOrig.battSpawnCover.apply(this,a),k=bilHpK();
 for(let i=n;i<pf.enemies.length;i++)bilSalute(pf.enemies[i],k);
 return r;
};
if(bilOrig.pfSpawnBoss)pfSpawnBoss=function(...a){
 const r=bilOrig.pfSpawnBoss.apply(this,a),B=typeof pf!=='undefined'&&pf&&pf.boss;
 if(B&&B.max>0&&!B.bilHp){B.bilHp=true;const k=1+(bilHpK()-1)*BIL.hpBoss;B.max=Math.max(1,Math.round(B.max*k));B.hp=Math.min(B.max,Math.round(B.hp*k))}
 return r;
};

// ---------------------------------------------------------------- 3) più navi ammiraglie
function bilDiff(){return(typeof world!=='undefined'&&world&&world.p&&world.p.difficulty)||(typeof planets!=='undefined'&&planets[selected]&&planets[selected].difficulty)||1}
function bilRand(a){return a[0]+Math.random()*(a[1]-a[0])}
if(bilOrig.spSpawnBig){
 spSpawnBig=function(){
  const r=bilOrig.spSpawnBig.apply(this,arguments),e=SP.big;
  if(e&&!e.bilHp){e.bilHp=true;const hp=Math.max(1,Math.round(e.hp*bilHpK()));e.hp=hp;e.maxHp=hp}
  return r;
 };
}
// un'altra nave da guerra oltre a quella di spazio.js (SP.big resta quella "principale")
function bilSpawnExtra(){
 const main=SP.big;
 spSpawnBig();
 const e=SP.big;SP.big=main;
 if(e&&e!==main){BIL.extra.push(e);if(!main)SP.big=null}
 return e;
}
function bilBigCount(){return enemies.filter(e=>e.big&&e.hp>0).length}
function bilUpdateExtra(dt){
 // ammiraglie in più abbattute: stesso premio della principale
 for(const e of BIL.extra){
  if(e.hp<=0&&!e.bilMorta){
   e.bilMorta=true;
   if(typeof shipBlast==='function')shipBlast(e.x,e.y,1.4);
   pickups.push({x:e.x-14,y:e.y,kind:'repair',life:24,r:12},{x:e.x+14,y:e.y,kind:'energy',life:24,r:12});
   if(typeof scoreAdd==='function'&&typeof SCORE_PTS!=='undefined')scoreAdd(SCORE_PTS.nemico*4*(typeof scoreDiff==='function'?scoreDiff(world&&world.p):1));
   status('NAVE DA GUERRA DISTRUTTA',2200);
  }
 }
 BIL.extra=BIL.extra.filter(e=>e.hp>0&&enemies.includes(e));
 // ne arriva un'altra se ce ne sono meno del massimo del pianeta (solo dopo la prima)
 const max=BIL.ammiraglie(bilDiff());
 if(max<=1)return;
 if(SP.big)BIL.primaVista=true;
 if(!BIL.primaVista)return;
 BIL.ammTimer-=dt;
 if(BIL.ammTimer<=0){
  BIL.ammTimer=bilRand(BIL.ammNext)*(bilDiff()>=7?.7:1);
  if(bilBigCount()<max)bilSpawnExtra();
 }
}
if(bilOrig.spUpdate){
 spUpdate=function(dt){
  const r=bilOrig.spUpdate.apply(this,arguments);
  if(state==='play'&&!paused&&!(arrivalRemaining>0))try{bilUpdateExtra(dt)}catch(e){console.error(e)}
  return r;
 };
 // gli altri file chiamano spUpdate da update (spazio.js lo aggancia per nome)
}
if(bilOrig.spReset){
 spReset=function(){
  const r=bilOrig.spReset.apply(this,arguments);
  BIL.extra=[];BIL.primaVista=false;BIL.ammTimer=bilRand(BIL.ammPrima);
  // negli ultimi pianeti la prima nave da guerra arriva prima
  const d=(planets[selected]&&planets[selected].difficulty)||1;if(d>=4&&typeof SP!=='undefined')SP.bigTimer=Math.min(SP.bigTimer,bilRand(SP_BIG.first)*(d>=7?.45:.65));
  return r;
 };
}
