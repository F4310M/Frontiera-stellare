// Conex — GLI OSTAGGI APPAIONO SOLO A BOSS POLVERIZZATO (2026-11-11).
// Prima la folla degli ostaggi liberati entrava nel momento esatto del grande scoppio del boss,
// mentre palle di fuoco e onde d'urto erano ancora sullo schermo.
// Ora la liberazione aspetta che l'esplosione sia finita (niente più palle di fuoco né onde),
// poi gli ostaggi entrano da destra e scappano come prima (finale-fuga.js).
// Va caricato dopo finale-fuga.js.

const ODB={
 min:1.8,   // s minimi dopo lo scoppio finale
 max:4.5    // s massimi di attesa, per sicurezza
};

// l'esplosione del boss è finita?
function odbPolverizzato(A){
 if(A.t<ODB.min)return false;
 if(A.t>=ODB.max)return true;
 const K=pf.boom;
 if(!K)return true;
 return !(K.balls&&K.balls.length)&&!(K.rings&&K.rings.length)&&!(K.white>.05);
}

if(typeof pfFreeColony==='function'){
 const orig=pfFreeColony;
 pfFreeColony=function(...a){
  // chiamata dallo scoppio del boss: si rimanda
  if(pf&&pf.phase==='vittoria'&&!pf.odbVia){pf.odbAttesa={t:0,a};return}
  return orig.apply(this,a);
 };
 if(typeof updatePlatform==='function'){
  const up=updatePlatform;
  updatePlatform=function(dt){
   const r=up.apply(this,arguments);
   const A=typeof pf!=='undefined'&&pf&&pf.odbAttesa;
   if(A&&state==='platform'&&!paused){
    A.t+=dt;
    if(odbPolverizzato(A)){pf.odbAttesa=null;pf.odbVia=true;orig.apply(null,A.a)}
   }
   return r;
  };
 }
 // il riepilogo della vittoria non parte prima della liberazione
 if(typeof pfFinish==='function'){
  const fin=pfFinish;
  pfFinish=function(win,...a){
   if(win&&typeof pf!=='undefined'&&pf&&pf.odbAttesa)return;
   return fin.call(this,win,...a);
  };
 }
}
