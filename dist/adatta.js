// Menu senza scroll (2026-11-03): ogni finestra si adatta alla risoluzione del dispositivo.
// Se il contenuto è più alto dello schermo, la finestra si allarga in proporzione (così le colonne
// si distribuiscono meglio) e si rimpicciolisce con zoom finché entra tutta. Sotto FIT_MIN resta lo scroll.
const FIT_MIN=.5,FIT_PAD=16;
// La classifica resta fuori: la sua lista di 100 piloti scorre apposta.
const FIT_CARDS='.overlay:not(.hidden)>.brief-card:not(.board-card)';
function fitReset(c){for(const p of ['zoom','width','max-width','max-height','flex-shrink'])c.style.removeProperty(p)}
// La finestra entra con un'animazione che la scala: misuro come se fosse già finita, poi la lascio proseguire.
function fitStill(c,fn){
 const an=c.getAnimations?c.getAnimations().filter(a=>a.playState==='running'||a.pending):[],t=an.map(a=>a.currentTime);
 for(const a of an){try{a.currentTime=Math.max(0,a.effect.getComputedTiming().endTime-1)}catch(e){}}
 try{return fn()}finally{an.forEach((a,i)=>{try{a.currentTime=t[i]}catch(e){}})}
}
function fitCard(c){return fitStill(c,()=>fitCardNow(c))}
function fitCardNow(c){
 fitReset(c);
 const avail=innerHeight-FIT_PAD,w0=c.getBoundingClientRect().width;
 if(!w0)return;
 // Misura l'altezza vera: senza tetto e senza che il contenitore flex la schiacci.
 c.style.setProperty('max-height','none','important');c.style.setProperty('flex-shrink','0','important');
 const tall=k=>{c.style.setProperty('zoom',k);c.style.setProperty('width',(w0/k)+'px','important');c.style.setProperty('max-width','none','important');return c.getBoundingClientRect().height>avail+.5};
 // Entra già: tolgo solo il tetto in vh del CSS, che a volte taglia qualche pixel.
 if(c.getBoundingClientRect().height<=avail){c.style.setProperty('max-height',avail+'px','important');return 1}
 let lo=FIT_MIN,hi=1;
 if(tall(lo)){hi=lo}else for(let i=0;i<7;i++){const m=(lo+hi)/2;if(tall(m))hi=m;else lo=m}
 const k=lo;tall(k);
 c.style.setProperty('max-height',(avail/k)+'px','important');
 return k;
}
function fitAll(){for(const c of document.querySelectorAll(FIT_CARDS))fitCard(c)}
let fitQueued=false;
function fitSoon(){if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;fitAll()})}
if(typeof MutationObserver==='function'&&typeof document!=='undefined'&&document.body){
 // Una finestra che si apre o cambia contenuto si riadatta. Le modifiche di stile fatte qui non contano.
 new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes'&&m.attributeName==='style')continue;fitSoon();return}})
  .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 addEventListener('resize',fitSoon);addEventListener('orientationchange',fitSoon);
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitSoon);
}
