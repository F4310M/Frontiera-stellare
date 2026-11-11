// Conex — ORA ACQUISTABILI NEL MERCATO aggiornato dopo gli acquisti (2026-11-11).
// Nei risultati della missione, quando torni dal mercato il riquadro mostra solo i potenziamenti
// che puoi ancora comprare con il saldo attuale. Se non ne resta nessuno il riquadro sparisce
// e il pulsante VAI AL MERCATO torna normale (il bordo oro dipende dal riquadro, style.css).
// Va caricato dopo economia.js.
const mkaOrig={show:ecoShowReward,close:ecoCloseMarket};
let mkaItems=[];
ecoShowReward=function(recap){
 try{mkaItems=ecoNewlyAffordable(recap).map(it=>it.id)}catch(e){mkaItems=[]}
 return mkaOrig.show.apply(this,arguments);
};
function mkaAncoraAcquistabili(){
 return ECO_ITEMS.filter(it=>{
  if(!mkaItems.includes(it.id))return false;
  const lv=ecoUpgrade(it.id),price=it.prices[lv];
  return price!==undefined&&eco.balance>=price;
 });
}
function mkaAggiorna(){
 const box=$('rewardMarket');if(!box||box.classList.contains('hidden'))return;
 const ora=mkaAncoraAcquistabili();
 const p=$('rewardItems');if(p)p.textContent=ora.map(it=>it.name).join(' · ');
 if(!ora.length)show('rewardMarket',false);
}
ecoCloseMarket=function(){
 const r=mkaOrig.close.apply(this,arguments);
 try{mkaAggiorna()}catch(e){}
 return r;
};
{const el=$('closeMarket');if(el)el.onclick=ecoCloseMarket}
