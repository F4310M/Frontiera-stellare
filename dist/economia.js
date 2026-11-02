// Frontiera Stellare — ECONOMIA: crediti, spese in tempo reale, riepilogo di fine fase,
// premio della missione e mercato dei potenziamenti.
// game.js e fase2.js chiamano queste funzioni solo se esistono (typeof), quindi il gioco
// funziona anche senza questo file.

const ECO_START=2500;
// Prezzo di ogni consumo, in crediti (CR).
const ECO_COST={laser:1,missile:25,granata:20,fuel:2};
// Taglia per ogni nemico abbattuto, per fase.
const ECO_BOUNTY={1:4,2:6};
// Potenziamenti in vendita al mercato.
const ECO_ITEMS=[
 {id:'salvo',icon:'salvo',name:'LANCIATORE MULTIPLO',desc:'Un clic della rotella lancia più missili insieme. Ogni missile costa 25 CR.',levels:['2 MISSILI INSIEME','3 MISSILI INSIEME'],prices:[6500,13000]},
 {id:'laser',icon:'laser',name:'LASER POTENZIATO',desc:'Colpi più grossi e più potenti, nello spazio e a terra.',levels:['DANNO +50%','DANNO +100%','DANNO +150%'],prices:[3500,7000,12000]},
 {id:'shield',icon:'shield',name:'BARRIERA RINFORZATA',desc:'La barriera e lo scudo assorbono più colpi prima di esaurirsi.',levels:['RESISTENZA +35%','RESISTENZA +70%','RESISTENZA +105%'],prices:[2800,5500,9500]},
 {id:'speed',icon:'speed',name:'MOTORI POTENZIATI',desc:'La nave accelera e vola più veloce; il pilota corre più veloce.',levels:['VELOCITÀ +12%','VELOCITÀ +24%','VELOCITÀ +36%'],prices:[2400,5000,8800]},
 {id:'fuel',icon:'fuel',name:'INIETTORI EFFICIENTI',desc:'I motori consumano meno carburante.',levels:['CONSUMO −20%','CONSUMO −40%'],prices:[1800,4000]},
 {id:'grenades',icon:'grenade',name:'CINTURA GRANATE',desc:'Granate in più all’inizio della fase 2.',levels:['+1 GRANATA','+2 GRANATE','+3 GRANATE'],prices:[1400,2800,4600]},
 {id:'twin',icon:'twin',name:'DOPPIO LASER',desc:'Spara due raggi paralleli a ogni colpo, nello spazio e a terra. Ogni colpo costa il doppio (2 CR).',levels:['DOPPIO LASER'],prices:[9000]}
];

function ecoLoad(){
 let upgrades={};try{upgrades=JSON.parse(localStorage.getItem('frontieraPotenziamenti')||'{}')||{}}catch(e){upgrades={}}
 const saved=parseInt(localStorage.getItem('frontieraCrediti'),10);
 return{balance:Number.isFinite(saved)?saved:ECO_START,upgrades,run:null,fuelAcc:0,tick:null};
}
const eco=ecoLoad();

function ecoSave(){localStorage.setItem('frontieraCrediti',String(Math.round(eco.balance)));localStorage.setItem('frontieraPotenziamenti',JSON.stringify(eco.upgrades))}
function ecoFmt(n){const v=Math.round(n),t=String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');return(v<0?'−':'')+t}
function ecoUpgrade(id){return eco.upgrades[id]||0}
function ecoPlanetReward(p){return parseInt(String(p.reward).replace(/\D/g,''),10)||0}
function ecoHostageBonus(p){return 60*p.difficulty}

// Consumi: laser e carburante si possono pagare anche in debito (il saldo diventa rosso),
// missili e granate invece richiedono crediti sufficienti.
function ecoCanPay(kind,n=1){if(kind==='laser'||kind==='fuel')return true;return eco.balance>=ECO_COST[kind]*n}
function ecoSpend(kind,n=1){
 if(!ecoCanPay(kind,n))return false;
 const cost=ECO_COST[kind]*n;
 eco.balance-=cost;
 if(eco.run){eco.run.count[kind]=(eco.run.count[kind]||0)+n;eco.run.spent[kind]=(eco.run.spent[kind]||0)+cost;eco.run.total+=cost}
 ecoTick(kind,cost);ecoSave();ecoHud();
 return true;
}
// Carburante consumato dai motori: unità al secondo (1 normale, 3 con il post-bruciatore).
function ecoFuel(units){
 if(!eco.run||!(units>0))return;
 units*=1-.2*ecoUpgrade('fuel');
 eco.run.count.fuel=(eco.run.count.fuel||0)+units;
 eco.fuelAcc+=units*ECO_COST.fuel;
 const whole=Math.floor(eco.fuelAcc);
 if(whole>=1){eco.fuelAcc-=whole;eco.balance-=whole;eco.run.spent.fuel=(eco.run.spent.fuel||0)+whole;eco.run.total+=whole;ecoTick('fuel',whole);ecoSave();ecoHud()}
}
function ecoStartPhase(phase){
 eco.run={phase,count:{},spent:{},total:0,start:eco.balance};eco.fuelAcc=0;eco.tick=null;
 show('ecoRecap',false);ecoHud();
}
// Fine fase: riepilogo spese, taglia nemici e (fase 2 vinta) premio della missione.
function ecoEndPhase(phase,win,info={}){
 const run=eco.run;if(!run||run.phase!==phase)return null;eco.run=null;
 const p=planets[selected],rows=[];
 const c=run.count,sp=run.spent;
 if(phase===1){
  rows.push({label:'COLPI LASER SPARATI',qty:c.laser||0,unit:'× '+ECO_COST.laser+' CR',amount:-(sp.laser||0)});
  rows.push({label:'MISSILI LANCIATI',qty:c.missile||0,unit:'× '+ECO_COST.missile+' CR',amount:-(sp.missile||0)});
  rows.push({label:'CARBURANTE CONSUMATO',qty:Math.round(c.fuel||0)+' u',unit:'× '+ECO_COST.fuel+' CR',amount:-(sp.fuel||0)});
 }else{
  rows.push({label:'COLPI SPARATI',qty:c.laser||0,unit:'× '+ECO_COST.laser+' CR',amount:-(sp.laser||0)});
  rows.push({label:'GRANATE LANCIATE',qty:c.granata||0,unit:'× '+ECO_COST.granata+' CR',amount:-(sp.granata||0)});
  rows.push({label:'CARBURANTE DISCESA E JETPACK',qty:Math.round(c.fuel||0)+' u',unit:'× '+ECO_COST.fuel+' CR',amount:-(sp.fuel||0)});
 }
 const kills=info.kills||0,bounty=kills*ECO_BOUNTY[phase];
 rows.push({label:'TAGLIA NEMICI ABBATTUTI',qty:kills,unit:'× '+ECO_BOUNTY[phase]+' CR',amount:bounty,income:true});
 let prize=0;
 if(phase===2&&win){
  const base=ecoPlanetReward(p),bonus=(info.rescued||0)*ecoHostageBonus(p);prize=base+bonus;
  rows.push({label:'PREMIO MISSIONE · '+(typeof pfBossInfo==='function'?pfBossInfo(p).name:'ROBOT')+' DISTRUTTO',qty:'',unit:'',amount:base,income:true,prize:true});
  rows.push({label:'BONUS OSTAGGI LIBERATI',qty:(info.rescued||0)+'/'+(info.hostages||0),unit:'× '+ecoHostageBonus(p)+' CR',amount:bonus,income:true,prize:true});
 }
 eco.balance+=bounty+prize;ecoSave();
 const net=bounty+prize-run.total;
 const recap={phase,win,rows,spent:run.total,income:bounty+prize,net,balance:eco.balance,prize};
 eco.last=recap;ecoRenderRecap(recap);ecoHud();
 return recap;
}

// ---------------------------------------------------------------- HUD crediti in tempo reale
const ECO_NAMES={laser:'LASER',missile:'MISSILE',granata:'GRANATA',fuel:'CARBURANTE'};
function ecoTick(kind,cost){
 const now=performance.now();
 if(eco.tick&&eco.tick.kind===kind&&now-eco.tick.t<900){eco.tick.cost+=cost;eco.tick.t=now}
 else eco.tick={kind,cost,t:now};
 const el=$('ecoDelta');if(!el)return;
 el.textContent='−'+ecoFmt(eco.tick.cost)+' CR · '+ECO_NAMES[kind];
 el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
}
function ecoHud(){
 const b=$('ecoBalance');if(b){b.textContent=ecoFmt(eco.balance)+' CR';b.classList.toggle('debt',eco.balance<0)}
 const s=$('ecoSpent');if(s)s.textContent=eco.run?'SPESI IN QUESTA FASE −'+ecoFmt(eco.run.total)+' CR':'';
 const m=$('mapCredits');if(m)m.textContent=ecoFmt(eco.balance)+' CR';
 const mk=$('marketBalance');if(mk){mk.textContent=ecoFmt(eco.balance)+' CR';mk.classList.toggle('debt',eco.balance<0)}
}
function ecoRenderRecap(r){
 const box=$('ecoRecap');if(!box)return;
 const sign=n=>(n>0?'+':n<0?'−':'')+ecoFmt(Math.abs(n))+' CR';
 box.innerHTML=`<p class="eco-recap-title">RIEPILOGO CREDITI · FASE ${r.phase}</p>`+
  r.rows.map(x=>`<div class="eco-row${x.income?' income':''}${x.prize?' prize':''}"><span>${x.label}</span><em>${x.qty!==''?x.qty+' '+x.unit:''}</em><b>${sign(x.amount)}</b></div>`).join('')+
  `<div class="eco-row total"><span>TOTALE FASE</span><em></em><b>${sign(r.net)}</b></div>`+
  `<div class="eco-row balance"><span>SALDO ATTUALE</span><em></em><b class="${r.balance<0?'debt':''}">${ecoFmt(r.balance)} CR</b></div>`+
  (r.phase===2&&!r.win?'<p class="eco-note">Il premio della missione si ottiene liberando la colonia e distruggendo il robot finale.</p>':'')+
  (r.phase===1&&r.win?'<p class="eco-note">Il premio della missione arriva in fase 2: libera gli ostaggi e distruggi il robot finale.</p>':'');
 show('ecoRecap');
}

// ---------------------------------------------------------------- mercato
function ecoBuy(id){
 const it=ECO_ITEMS.find(i=>i.id===id);if(!it)return false;
 const lv=ecoUpgrade(id);if(lv>=it.levels.length)return false;
 const price=it.prices[lv];if(eco.balance<price){ecoMarketMsg('CREDITI INSUFFICIENTI');if(typeof tone==='function')tone(180,.12,'square',.015);return false}
 eco.balance-=price;eco.upgrades[id]=lv+1;ecoSave();ecoHud();ecoRenderMarket();
 ecoMarketMsg('ACQUISTATO · '+it.name+' · '+it.levels[lv]);
 if(typeof sfx==='function')sfx('ui');if(typeof tone==='function'){tone(523,.1,'sine',.025);tone(784,.18,'sine',.025,0,.1)}
 return true;
}
function ecoMarketMsg(t){const el=$('marketMsg');if(el)el.textContent=t}
function ecoRenderMarket(){
 const grid=$('marketGrid');if(!grid)return;
 grid.innerHTML=ECO_ITEMS.map(it=>{
  const lv=ecoUpgrade(it.id),max=it.levels.length,done=lv>=max,price=done?0:it.prices[lv];
  const pips=it.levels.map((_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('');
  return `<div class="market-item${done?' maxed':''}"><div class="mi-head"><span class="mi-icon">${ico(it.icon)}</span><div><b>${it.name}</b><div class="mi-pips">${pips}</div></div></div>`+
   `<p>${it.desc}</p><p class="mi-level">${lv?'ATTUALE: '+it.levels[lv-1]:'NON ACQUISTATO'}</p>`+
   `<button class="mi-buy" data-id="${it.id}" ${done||eco.balance<price?'disabled':''}>${done?'LIVELLO MASSIMO':it.levels[lv]+' · '+ecoFmt(price)+' CR'}</button></div>`;
 }).join('');
 grid.querySelectorAll('.mi-buy').forEach(b=>b.onclick=()=>ecoBuy(b.dataset.id));
 ecoHud();
}
function ecoOpenMarket(){ecoRenderMarket();ecoMarketMsg('');show('marketOverlay');if(typeof sfx==='function')sfx('ui')}
function ecoCloseMarket(){show('marketOverlay',false);if(typeof sfx==='function')sfx('ui')}

// Pulsanti: mercato dalla mappa e dalla schermata di fine fase.
for(const id of ['marketBtn','marketBtnResult']){const el=$(id);if(el)el.onclick=ecoOpenMarket}
{const el=$('closeMarket');if(el)el.onclick=ecoCloseMarket;const x=$('closeMarketX');if(x)x.onclick=ecoCloseMarket}
// Nasconde il riepilogo crediti quando si torna alla mappa o si riapre una fase.
{const ret=$('returnBtn');if(ret){const prev=ret.onclick;ret.onclick=e=>{show('ecoRecap',false);if(prev)prev(e)}}}
ecoHud();
