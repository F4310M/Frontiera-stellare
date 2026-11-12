// PROSSIMO PIANETA (2026-11-12, chiesto da Fabio): finita la missione a terra e tornati alla home,
// la mappa seleziona da sola il prossimo pianeta da liberare, in ordine di difficoltà crescente
// (LYRA, VESPER, NIMBUS, KHEPRI, UMBRA, poi OMEGA). Lo stesso all'avvio se il pianeta selezionato è già libero.
// Va caricato dopo mappa.js, menu-pianeti.js e partita.js.
(function(){
 if(typeof planets==='undefined'||typeof mapPlayable!=='function'||typeof selectPlanet!=='function')return;
 function ppNext(){
  let best=-1;
  planets.forEach((p,i)=>{if(mapPlayable(p)&&(best<0||(p.difficulty||0)<(planets[best].difficulty||0)))best=i});
  return best;
 }
 if(typeof mapFirstPlayable==='function')mapFirstPlayable=function(){const i=ppNext();return i<0?0:i};
 let last='';
 function ppTick(){
  const s=typeof state!=='undefined'?state:'';
  if(s==='map'&&last!=='map'){
   const allDone=typeof mapAllDone==='function'&&mapAllDone();
   if(!allDone&&!mapPlayable(planets[selected])){const i=ppNext();if(i>=0)try{selectPlanet(i)}catch(e){}}
  }
  last=s;
 }
 if(typeof setInterval==='function')setInterval(ppTick,200);
 // ritorno alla home dal riepilogo della missione
 if(typeof abort==='function'){const ab=abort;abort=function(){last='';const r=ab.apply(this,arguments);ppTick();return r}}
 if(typeof window!=='undefined')window.prossimoPianeta={ppNext,ppTick};
})();
