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

// ROTTA (2026-11-12): nella schermata ROTTA PER … in fondo alla linea c'è il pianeta di destinazione, non il puntino.
(function(){
 if(typeof brief!=='function'||typeof document==='undefined'||!document.createElement)return;
 function rottaPianeta(){
  const p=typeof planets!=='undefined'&&planets[selected];
  const b=document.querySelector&&document.querySelector('#briefing .ship-line b');
  if(!p||!b)return;
  let o=b.querySelector('.rotta-pianeta');
  if(!o){b.textContent='';b.classList.add('rotta-fine');o=document.createElement('span');o.className='rotta-pianeta';b.appendChild(o)}
  o.style.setProperty('--planet',p.color);o.style.setProperty('--glow',p.glow);
  if(o.dataset.code!==p.code){o.dataset.code=p.code;o.innerHTML='';if(typeof mpSpin==='function')try{mpSpin(o,p,30)}catch(e){}}
 }
 const br=brief;brief=function(){const r=br.apply(this,arguments);rottaPianeta();return r};
 if(document.head){
  const css=document.createElement('style');
  css.textContent='#briefing .ship-line b.rotta-fine{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;font-size:0;flex:none}'+
   '#briefing .rotta-pianeta{position:relative;display:block;width:34px;height:34px;border-radius:50%;overflow:hidden;background:var(--planet);'+
   'box-shadow:inset -8px -5px 12px rgba(0,0,0,.7),inset 4px 3px 7px rgba(255,255,255,.2),0 0 18px var(--glow);animation:rotta-arrivo 2.4s ease-in-out infinite}'+
   '@keyframes rotta-arrivo{50%{box-shadow:inset -8px -5px 12px rgba(0,0,0,.7),inset 4px 3px 7px rgba(255,255,255,.2),0 0 30px var(--glow)}}';
  document.head.appendChild(css);
 }
})();
