// Conex — RITORNO IN GIOCO A TERRA (2026-11-10).
// Quando il pilota perde una vita e il pilota di riserva rientra (terra.js + battaglia.js):
// - appena tocca terra è immune ai colpi per 3 secondi (prima lo è già durante la discesa);
// - durante l'immunità attraversa nemici e boss: nessuna spinta, nessun danno da contatto;
// - la nave lo appoggia sempre su un terreno: se ogni punto libero è occupato dai nemici
//   lo sgancia lo stesso sul terreno (prima aspettava finché il punto non si liberava);
// - colpo speciale, jetpack e barriera ricaricati del tutto.
// Va caricato dopo vite.js e barriere.js (avvolge le versioni più esterne delle funzioni).

const RIENTRO={immune:3,blink:12,vicino:320}; // vicino: px entro cui si preferisce un punto senza nemici
const rnt={ignora:false};

// ---------------------------------------------------------------- terreno anche con i nemici
// Stessi controlli di terra.js; con rnt.ignora i nemici sopra il punto non contano.
if(typeof terraSafeGround==='function'&&typeof DROP!=='undefined'){
 const orig=terraSafeGround;
 terraSafeGround=function(x){
  if(!rnt.ignora)return orig.apply(this,arguments);
  const g=pfGroundAt(x),margin=40;
  if(g===null||!pf.solids.some(s=>s.y===g&&s.x<=x-margin&&x+margin<s.x+s.w))return null;
  const clear=solid=>solid.x<x+margin&&solid.x+solid.w>x-margin&&solid.y<g;
  if(pf.plats.some(clear)||(typeof battObstacleSolids==='function'&&battObstacleSolids(x).some(clear)))return null;
  return g;
 };
}
// Prima cerca un punto senza nemici; se non c'è, un punto qualunque sul terreno.
if(typeof terraFindDrop==='function'){
 const orig=terraFindDrop;
 terraFindDrop=function(...a){
  const was=rnt.ignora;
  try{
   // un punto libero va bene solo se è vicino a quello voluto, altrimenti si scende lì tra i nemici
   rnt.ignora=false;const spot=orig.apply(this,a);
   if(spot&&!(Math.abs(spot.x-a[0])>RIENTRO.vicino))return spot;
   rnt.ignora=true;return orig.apply(this,a)||spot;
  }finally{rnt.ignora=was}
 };
}
// Al momento dello sgancio e all'appoggio a terra contano solo il terreno e gli ostacoli.
if(typeof terraUpdateDrop==='function'){
 const orig=terraUpdateDrop;
 terraUpdateDrop=function(...a){
  const D=pf&&pf.drop,before=D&&D.released;
  rnt.ignora=true;
  try{orig.apply(this,a)}finally{rnt.ignora=false}
  if(D&&!before&&D.released&&pf.pilot)rntRicarica(pf.pilot);
 };
}

// ---------------------------------------------------------------- ricariche
function rntRicarica(P){
 Object.assign(P,{shield:100,shieldDelay:0,jetHeat:0,jetLock:false,jetMin:0});
 // colpo speciale di nuovo disponibile (se una bomba sta ancora cadendo finisce il suo giro)
 if(typeof spc!=='undefined'){spc.ground=false;if(typeof spcBadge==='function')try{spcBadge()}catch(e){}}
}

// ---------------------------------------------------------------- immunità di 3 secondi
function rntAttivo(){const P=pf&&pf.pilot;return !!(P&&P.rientroT>0)}
// appena tocca terra (fine della discesa col jetpack) parte l'immunità
if(typeof pfUpdatePilot==='function'){
 const orig=pfUpdatePilot;
 pfUpdatePilot=function(dt){
  const P=pf&&pf.pilot;
  const scende=!!(P&&P.reserveLanding);
  if(scende)rnt.ignora=true;
  try{orig.apply(this,arguments)}finally{rnt.ignora=false}
  if(!P)return;
  if(scende&&!P.reserveLanding&&!P.landing&&P.hp>0){
   P.rientroT=RIENTRO.immune;P.inv=Math.max(P.inv||0,RIENTRO.immune);
   rntRicarica(P);
   pfStatus('IMMUNE PER 3 SECONDI · ATTRAVERSI I NEMICI',2200);
  }else if(P.rientroT>0&&!paused){
   P.rientroT=Math.max(0,P.rientroT-dt);
   P.inv=Math.max(P.inv||0,P.rientroT);
  }
 };
}
// nessun danno (nemmeno sulla barriera) finché dura l'immunità
if(typeof pfDamage==='function'){
 const orig=pfDamage;
 pfDamage=function(...a){if(rntAttivo())return;return orig.apply(this,a)};
}
// attraversa nemici e boss: le spinte del contatto vengono annullate
function rntSenzaSpinte(fn){
 return function(...a){
  const P=pf&&pf.pilot;
  if(!rntAttivo())return fn.apply(this,a);
  const vx=P.vx,vy=P.vy,shove=[];
  // i soldati non vengono spinti via dal pilota (asShove di assalto.js)
  for(const e of pf.enemies){shove.push(e.shoveCd);e.shoveCd=1}
  try{return fn.apply(this,a)}
  finally{
   pf.enemies.forEach((e,i)=>{if(i<shove.length)e.shoveCd=shove[i]||0});
   if(P.hp>0){P.vx=vx;P.vy=vy}
  }
 };
}
if(typeof pfUpdateEnemies==='function')pfUpdateEnemies=rntSenzaSpinte(pfUpdateEnemies);
if(typeof pfUpdateBoss==='function')pfUpdateBoss=rntSenzaSpinte(pfUpdateBoss);

// un alone azzurro attorno al pilota mentre è immune
if(typeof drawPlatform==='function'){
 const orig=drawPlatform;
 drawPlatform=function(...a){
  const r=orig.apply(this,a);
  try{rntDisegna()}catch(e){}
  return r;
 };
}
function rntDisegna(){
 const P=pf&&pf.pilot;if(!P||!(P.rientroT>0)||!P.visible)return;
 const s=pfScale(),x=(P.x-pf.cam.x)*s,y=(P.y-28)*s,k=Math.min(1,P.rientroT/RIENTRO.immune);
 const pulse=.5+.5*Math.sin(performance.now()/1000*RIENTRO.blink);
 ctx.save();
 ctx.globalAlpha=(.35+.35*pulse)*Math.min(1,P.rientroT*2);
 ctx.strokeStyle='#8cf2ff';ctx.lineWidth=2*s;
 ctx.beginPath();ctx.ellipse(x,y,26*s,40*s,0,0,6.283);ctx.stroke();
 // arco che si consuma: quanto manca alla fine dell'immunità
 ctx.globalAlpha=.9;ctx.lineWidth=3*s;ctx.strokeStyle='#e6fdff';
 ctx.beginPath();ctx.arc(x,y-58*s,9*s,-Math.PI/2,-Math.PI/2+6.283*k);ctx.stroke();
 ctx.restore();
}

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["IMMUNE PER 3 SECONDI · ATTRAVERSI I NEMICI","INVULNERABLE FOR 3 SECONDS · YOU PASS THROUGH ENEMIES","INVULNÉRABLE 3 SECONDES · TU TRAVERSES LES ENNEMIS","INMUNE 3 SEGUNDOS · ATRAVIESAS A LOS ENEMIGOS","НЕУЯЗВИМ 3 СЕКУНДЫ · ПРОХОДИШЬ СКВОЗЬ ВРАГОВ","3 秒无敌 · 可穿过敌人","3 秒間無敵 · 敵をすり抜ける"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
