// Conex — FASE FINALE DELLA MISSIONE A TERRA (2026-11-10).
// Quando il boss esplode:
// - gli ostaggi liberati entrano dal bordo destro dello schermo e scappano verso sinistra;
// - le navi nemiche in fuga (navi-in-fuga.js) partono solo quando tutti gli ostaggi sono usciti dallo schermo.
// La missione finisce dopo le navi (pfFinish aspetta), con un tempo massimo di sicurezza.
// Va caricato dopo navi-in-fuga.js.

const FF={
 gap:46,        // px tra un colono e l'altro in fila
 spread:22,     // variazione casuale della distanza
 entra:40,      // px oltre il bordo destro da cui partono
 corsa:.45,     // velocità in più dei coloni nella fuga finale (0.45 = +45%)
 fuori:30,      // px oltre il bordo sinistro per considerarli usciti
 dopoNavi:.8,   // s di attesa dopo l'ultima nave prima del riepilogo
 max:30         // s massimi di scena finale
};

function ffVisibile(h){
 if(h.state==='salvo'||h.state==='evacuato'||h.state==='legato')return false;
 if(h.crowd&&h.t<0)return false;
 return h.x>pf.cam.x-FF.fuori;
}
// tutti i coloni liberi sono già usciti a sinistra?
function ffUsciti(){
 for(const h of [...pf.hostages,...(pf.crowd||[])])if(ffVisibile(h))return false;
 return true;
}

if(typeof pfFreeColony==='function'){
 const orig=pfFreeColony;
 pfFreeColony=function(...a){
  const launch=typeof nfLaunch==='function'?nfLaunch:null;
  const before=pf.crowd?pf.crowd.length:0;
  if(launch)nfLaunch=function(){};
  try{orig.apply(this,a)}finally{if(launch)nfLaunch=launch}
  // la folla appena liberata entra da destra e corre subito a sinistra
  const VW=Math.min(pfViewW(),1500),right=(pf.cam.lock?pf.cam.lockX:pf.cam.x)+Math.min(pfViewW(),VW);
  const added=pf.crowd.slice(before);
  let x=right+FF.entra;
  for(const h of added){
   x+=FF.gap+pf.rnd()*FF.spread;
   const g=pfGroundAt(x);
   Object.assign(h,{x,y:g??PF_FLOOR,state:'fuga',t:0,ffFinale:true,air:false,hop:0,jy:undefined});
  }
  pf.ffFuga={t:0,navi:false,fine:null};
 };
}
// un po' più veloci, così la scena non si allunga troppo
if(typeof pfUpdateHostages==='function'){
 const orig=pfUpdateHostages;
 pfUpdateHostages=function(dt){
  const r=orig.apply(this,arguments);
  if(pf&&pf.ffFuga&&pf.crowd)for(const h of pf.crowd)if(h.ffFinale&&h.state==='fuga'&&h.speed){
   h.x-=h.speed*FF.corsa*dt;h.stride=(h.stride||0)+h.speed*FF.corsa*dt;
   if(h.x<pf.cam.x-160)h.state='salvo';
  }
  return r;
 };
}
// le navi partono solo a ostaggi usciti
if(typeof updatePlatform==='function'){
 const orig=updatePlatform;
 updatePlatform=function(dt){
  const r=orig.apply(this,arguments);
  const F=typeof pf!=='undefined'&&pf&&pf.ffFuga;
  if(F&&state==='platform'&&!paused){
   F.t+=dt;
   if(!F.navi&&(ffUsciti()||F.t>FF.max*.6)){F.navi=true;if(typeof nfLaunch==='function')nfLaunch()}
   if(F.navi&&!pf.naviFuga&&F.fine===null)F.fine=F.t;
  }
  return r;
 };
}
// il riepilogo della vittoria aspetta la fine della scena
if(typeof pfFinish==='function'){
 const orig=pfFinish;
 pfFinish=function(win,...a){
  const F=typeof pf!=='undefined'&&pf&&pf.ffFuga;
  if(win&&F&&pf.phase==='vittoria'&&F.t<FF.max&&(F.fine===null||F.t<F.fine+FF.dopoNavi))return;
  return orig.call(this,win,...a);
 };
}
