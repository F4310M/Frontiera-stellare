// Conex — CADUTE E RIENTRO DEL PILOTA A TERRA (2026-11-15, richieste di Fabio).
// 1) Cadendo da grandi altezze si perde un po' di salute: oltre CAD.da pixel di caduta libera
//    (un salto doppio arriva a circa 200) il danno cresce con l'altezza, fino a CAD.max.
//    Il jetpack acceso frena la caduta (l'altezza riparte da lì); niente danno durante la discesa
//    del pilota di riserva, nei 3 secondi di immunità, in modalità dio e cadendo in un cratere.
//    Il danno toglie salute direttamente (la barriera non para una caduta).
// 2) Pilota di riserva (anche dopo una caduta in acqua, lava o sabbie): barriera e jetpack al 100%
//    per tutta l'immunità del rientro, così riparte sempre con tutto carico.
// Va caricato dopo tempesta.js (avvolge pfUpdatePilot già avvolto da rientro.js e tempesta.js).
const CAD={da:320,perPx:.11,min:5,max:45};

function cadDanno(h){return Math.round(Math.min(CAD.max,Math.max(CAD.min,(h-CAD.da)*CAD.perPx)))}
if(typeof pfUpdatePilot==='function'){
 const cadOrig=pfUpdatePilot;
 pfUpdatePilot=function(dt){
  const P=typeof pf!=='undefined'&&pf&&pf.pilot;
  const prima=P?{ground:!!P.ground,under:!!pf.under,y:P.y}:null;
  const r=cadOrig.apply(this,arguments);
  if(!P||!pf||state!=='platform')return r;
  try{
   // rientro: barriera e jetpack pieni finché dura l'immunità (e appena il pilota ricompare)
   if((P.rientroT||0)>0||P.reserveLanding){P.shield=100;P.shieldDelay=0;P.jetHeat=0;P.jetLock=false}
   // cratere: chi passa da sopra a sotto (o risale) non si fa male per 2,5 secondi
   if(pf.under!==prima.under)P._cadNo=2.5;
   if(P._cadNo>0)P._cadNo=Math.max(0,P._cadNo-dt);
   // caduta: punto più alto da quando ha lasciato il terreno
   const salta=(P._cadNo||0)>0||!P.visible||P.hp<=0||P.landing||P.reserveLanding||(P.rientroT||0)>0||pf.under!==prima.under||(typeof godMode!=='undefined'&&godMode);
   if(P.ground){
    if(!prima.ground&&P._cadTop!==undefined&&!salta){
     const h=P.y-P._cadTop;
     if(h>CAD.da){
      const d=cadDanno(h);P.hp=Math.max(0,P.hp-d);
      if(typeof pfText==='function')pfText(P.x,P.y-70,'-'+d,'#ff8a6a');
      if(typeof pfBurst==='function')pfBurst(P.x,P.y,'#c9b79a',10,.7);
      pf.cam.shake=Math.max(pf.cam.shake||0,.25);pf.flash=Math.max(pf.flash||0,.15);
      if(typeof sfx==='function')try{sfx('hit',.8)}catch(e){}
      if(P.hp<=0&&typeof pfLoseLife==='function')pfLoseLife();
     }
    }
    P._cadTop=undefined;
   }else if(salta||P.jetOn){P._cadTop=P.y}
   else P._cadTop=P._cadTop===undefined?Math.min(P.y,prima.y):Math.min(P._cadTop,P.y);
  }catch(e){}
  return r;
 };
}
