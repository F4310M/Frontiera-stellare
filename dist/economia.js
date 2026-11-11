// Frontiera Stellare — ECONOMIA: crediti, spese in tempo reale, riepilogo di fine fase,
// premio della missione e mercato dei potenziamenti.
// game.js e fase2.js chiamano queste funzioni solo se esistono (typeof), quindi il gioco
// funziona anche senza questo file.

const ECO_START=2500,ECO_EARNED_KEY='frontieraGuadagni';
// Prezzo di ogni consumo, in crediti (CR).
// (2026-11-11) consumi molto più economici: il laser costa mezzo credito a colpo (si paga ogni 2 colpi)
const ECO_COST={laser:.5,missile:6,granata:5,fuel:1};
// Taglia per ogni nemico abbattuto, per fase.
const ECO_BOUNTY={1:10,2:15};// (2026-11-11) era 4 e 6
// Potenziamenti in vendita al mercato.
const ECO_ITEMS=[
 {id:'salvo',icon:'salvo',name:'LANCIATORE MULTIPLO',desc:'Un clic della rotella lancia più missili insieme, ognuno guidato su un bersaglio diverso. Ogni missile costa 6 CR.',levels:['2 MISSILI INSIEME','3 MISSILI INSIEME'],prices:[2300,4550]},
 {id:'laser',icon:'laser',name:'LASER POTENZIATO',desc:'Colpi più grossi e più potenti, nello spazio e a terra.',levels:['DANNO +50%','DANNO +100%','DANNO +150%'],prices:[1200,2450,4200]},
 {id:'shield',icon:'shield',name:'BARRIERA RINFORZATA',desc:'La barriera e lo scudo assorbono più colpi prima di esaurirsi.',levels:['RESISTENZA +35%','RESISTENZA +70%','RESISTENZA +105%'],prices:[1000,1900,3300]},
 {id:'speed',icon:'speed',name:'MOTORI POTENZIATI',desc:'La nave accelera e vola più veloce; il pilota corre più veloce.',levels:['VELOCITÀ +12%','VELOCITÀ +24%','VELOCITÀ +36%'],prices:[850,1750,3100]},
 {id:'fuel',icon:'fuel',name:'INIETTORI EFFICIENTI',desc:'I motori consumano meno carburante.',levels:['CONSUMO −20%','CONSUMO −40%'],prices:[650,1400]},
 {id:'grenades',icon:'grenade',name:'CINTURA GRANATE',desc:'Granate in più all’inizio della fase 2.',levels:['+1 GRANATA','+2 GRANATE','+3 GRANATE'],prices:[500,1000,1600]},
 {id:'twin',icon:'twin',name:'DOPPIO LASER',desc:'Spara due raggi paralleli a ogni colpo, nello spazio e a terra. Ogni colpo costa il doppio (1 CR).',levels:['DOPPIO LASER'],prices:[3150]}
];

function ecoLoad(){
 let upgrades={};try{upgrades=JSON.parse(localStorage.getItem('frontieraPotenziamenti')||'{}')||{}}catch(e){upgrades={}}
 const saved=parseInt(localStorage.getItem('frontieraCrediti'),10);
 const balance=Number.isFinite(saved)?saved:ECO_START;
 const earned=parseInt(localStorage.getItem(ECO_EARNED_KEY),10);
 return{balance,earned:Math.max(0,Number.isFinite(earned)?earned:balance-ECO_START),upgrades,run:null,fuelAcc:0,tick:null};
}
const eco=ecoLoad();

function ecoSave(){localStorage.setItem('frontieraCrediti',String(Math.round(eco.balance)));localStorage.setItem(ECO_EARNED_KEY,String(eco.earned));localStorage.setItem('frontieraPotenziamenti',JSON.stringify(eco.upgrades))}
function ecoReset(balance){
 Object.assign(eco,{balance,earned:0,upgrades:{},run:null,last:null,fuelAcc:0,tick:null});
 ecoSave();ecoHud();
}
function ecoFmt(n){const v=Math.round(n),t=String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');return(v<0?'−':'')+t}
function ecoUpgrade(id){return eco.upgrades[id]||0}
function ecoPlanetReward(p){return parseInt(String(p.reward).replace(/\D/g,''),10)||0}
function ecoHostageBonus(p){return 150*p.difficulty}// (2026-11-11) era 60

// Consumi: laser e carburante si possono pagare anche in debito (il saldo diventa rosso),
// missili e granate invece richiedono crediti sufficienti.
function ecoCanPay(kind,n=1){if(kind==='laser'||kind==='fuel')return true;return eco.balance>=ECO_COST[kind]*n}
function ecoSpend(kind,n=1){
 if(!ecoCanPay(kind,n))return false;
 let cost=ECO_COST[kind]*n;
 // costi sotto il credito (laser): si accumulano e si paga il credito intero
 if(cost%1){eco.partAcc=(eco.partAcc||0)+cost;cost=Math.floor(eco.partAcc);eco.partAcc-=cost;
  if(eco.run){eco.run.count[kind]=(eco.run.count[kind]||0)+n}
  if(!cost)return true}
 else if(eco.run)eco.run.count[kind]=(eco.run.count[kind]||0)+n;
 eco.balance-=cost;
 if(eco.run){eco.run.spent[kind]=(eco.run.spent[kind]||0)+cost;eco.run.total+=cost}
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
 const previous=phase===2&&eco.last?.phase===1&&eco.last.win&&eco.last.planet===selected?eco.last:null;
 eco.run={phase,count:{},spent:{},total:0,start:eco.balance,
  phaseScoreStart:typeof score==='number'?score:0,missionStart:previous?.missionStart??eco.balance,scoreStart:previous?.scoreStart??(typeof score==='number'?score:0),
  earlierIncome:previous?.missionIncome??0};
 eco.last=null;eco.fuelAcc=0;eco.tick=null;
 show('ecoRecap',false);ecoHud();
}
// Fine fase: riepilogo spese, taglia nemici e (fase 2 vinta) premio della missione.
function ecoEndPhase(phase,win,info={}){
 const run=eco.run;if(!run||run.phase!==phase)return null;eco.run=null;
 const p=planets[selected],rows=[];
 const c=run.count,sp=run.spent;
 if(phase===1){
  rows.push({label:'COLPI LASER SPARATI',qty:c.laser||0,unit:'× '+String(ECO_COST.laser).replace('.',',')+' CR',amount:-(sp.laser||0)});
  rows.push({label:'MISSILI LANCIATI',qty:c.missile||0,unit:'× '+ECO_COST.missile+' CR',amount:-(sp.missile||0)});
  rows.push({label:'CARBURANTE CONSUMATO',qty:Math.round(c.fuel||0)+' u',unit:'× '+ECO_COST.fuel+' CR',amount:-(sp.fuel||0)});
 }else{
  rows.push({label:'COLPI SPARATI',qty:c.laser||0,unit:'× '+String(ECO_COST.laser).replace('.',',')+' CR',amount:-(sp.laser||0)});
  rows.push({label:'GRANATE LANCIATE',qty:c.granata||0,unit:'× '+ECO_COST.granata+' CR',amount:-(sp.granata||0)});
  rows.push({label:'CARBURANTE DISCESA E JETPACK',qty:Math.round(c.fuel||0)+' u',unit:'× '+ECO_COST.fuel+' CR',amount:-(sp.fuel||0)});
 }
 const god=typeof godMode!=='undefined'&&godMode,kills=info.kills||0,bounty=god?0:kills*ECO_BOUNTY[phase];
 rows.push({label:'TAGLIA NEMICI ABBATTUTI',qty:kills,unit:'× '+ECO_BOUNTY[phase]+' CR',amount:bounty,income:true});
 let prize=0;
 if(phase===2&&win&&!god){
  const base=ecoPlanetReward(p),bonus=(info.rescued||0)*ecoHostageBonus(p);prize=base+bonus;
  rows.push({label:'PREMIO MISSIONE · '+(typeof pfBossInfo==='function'?pfBossInfo(p).name:'ROBOT')+' DISTRUTTO',qty:'',unit:'',amount:base,income:true,prize:true});
  rows.push({label:'BONUS OSTAGGI LIBERATI',qty:(info.rescued||0)+'/'+(info.hostages||0),unit:'× '+ecoHostageBonus(p)+' CR',amount:bonus,income:true,prize:true});
 }
 eco.balance+=bounty+prize;eco.earned+=bounty+prize;ecoSave();
 const net=bounty+prize-run.total;
 const recap={phase,win,rows,spent:run.total,income:bounty+prize,net,balance:eco.balance,prize,
  planet:selected,phaseScoreStart:run.phaseScoreStart,missionStart:run.missionStart,scoreStart:run.scoreStart,missionIncome:run.earlierIncome+bounty+prize};
 eco.last=recap;ecoRenderRecap(recap);ecoHud();
 const defer=typeof queueMicrotask==='function'?queueMicrotask:fn=>Promise.resolve().then(fn);
 defer(()=>{
  if(state!==(win?'won':'lost')||eco.last!==recap)return;
  const finalScore=recap.finalScore??(typeof score==='number'?score:0);
  show('resultOverlay',false);
  $('rewardDetail').textContent=$('resultText').textContent;
  $('rewardStats').innerHTML=$('resultStats').innerHTML;
  const entry=$('scoreEntry');
  if(entry&&!entry.classList.contains?.('hidden')&&entry.parentNode){
   ecoRewardEntryParent=entry.parentNode;
   $('rewardScoreEntry').appendChild(entry);
  }
  ecoShowReward(recap,Math.max(0,finalScore-recap.phaseScoreStart),finalScore);
 });
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
// Sagome vettoriali del catalogo, riutilizzate nell'anteprima di acquisto.
const ECO_MISSILE=`<path class="mi-metal" d="M14 0 28-7h42l9 7-9 7H28z"/>
 <path class="mi-panel" d="M57-7l7-6h12l-6 6m-13 14 7 6h12l-6-6"/>
 <path class="mi-light" d="M33-5h4V5h-4z"/><path class="mi-detail" d="M43-3h12"/>`;
const ECO_BARREL=`<path class="mi-metal" d="M38-10h55l16 6V7L94 12H38L31 7V-5z"/>
 <path class="mi-panel" d="M43-10h50l11 5H43z"/>
 <path class="mi-seam" d="M48-5v14m8-14v14m32-14v14m7-13v12"/>
 <path class="mi-light" d="M62-4h17V1H62z"/><ellipse class="mi-dark" cx="37" cy="1" rx="7" ry="9"/>
 <ellipse class="mi-light" cx="36" cy="1" rx="3" ry="5"/>`;
const ECO_GRENADE=`<path class="mi-panel" d="M-6-15v-8H6l4 4v6z"/>
 <path class="mi-metal" d="M-7-15H8l7 7v23l-6 8H-8l-7-8V-7z"/>
 <path class="mi-seam" d="M-7-14v35m14-35v35M-15 0h30m-30 12h30"/>
 <path class="mi-light" d="M-5-10H5v5H-5z"/><circle class="mi-hatch" cx="12" cy="-20" r="5"/>`;
const ECO_ART={
 salvo:`<path class="mi-metal" d="M78 41l22-14h52l21 19v38l-19 16h-52L78 85z"/>
 <path class="mi-panel" d="M79 42l21-15h52l-16 15z"/>
 <path class="mi-dark" d="M89 47h49v42H89zm56-2 16-12 12 13v38l-28 6z"/>
 <path class="mi-detail" d="M153 55l13-6m-13 15 13-6m-13 15 13-6"/>
 <g transform="translate(30 49)">${ECO_MISSILE}</g>
 <g transform="translate(8 67)">${ECO_MISSILE}</g>
 <g transform="translate(36 85)">${ECO_MISSILE}</g>`,
 laser:`<path class="mi-metal" d="M82 47l21-17h48l23 17v34l-24 16h-47L82 83z"/>
 <path class="mi-panel" d="M83 47l20-17h48l-17 17z"/>
 <path class="mi-dark" d="M111 54h51v21l-13 12h-38z"/>
 <path class="mi-detail" d="M122 60h31m-31 6h29m-29 6h22"/>
 <path class="mi-beam" d="M13 68h22"/><g transform="translate(0 67)">${ECO_BARREL}</g>
 <path class="mi-light" d="M120 37h20l-6 5h-20z"/>`,
 shield:`<path class="mi-hatch" d="M96 12 151 33l10 25-12 35-53 27-53-27-12-35 10-25z"/>
 <path class="mi-metal" d="M96 21 139 37v29c0 19-20 35-43 46-23-11-43-27-43-46V37z"/>
 <path class="mi-panel" d="M96 26l37 14v26c0 15-16 29-37 40z"/>
 <path class="mi-dark" d="M96 37l29 11v18c0 11-13 23-29 33-16-10-29-22-29-33V48z"/>
 <path class="mi-hatch" d="m72 52 24-10 24 10m-48 7 24 10 24-10M96 42v53"/>
 <path class="mi-light" d="m96 51 13 16-13 16-13-16z"/>
 <path class="mi-detail" d="M76 46l-4 2m44-2 4 2m-30 40 6 5 6-5"/>`,
 speed:`<path class="mi-light" d="m51 53-17 2-23 10 23 10 17 2-9-12z"/>
 <path class="mi-metal" d="M54 42l21-16h59l39 19v36l-39 17H76L54 86z"/>
 <path class="mi-panel" d="M57 43l18-17h59l39 19h-66z"/>
 <path class="mi-dark" d="M51 47h20v35H51l-9-8V56zm65 4h44v22l-18 13h-26z"/>
 <path class="mi-metal" d="M74 34h13v58H74zm18 3h10v53H92z"/>
 <path class="mi-detail" d="M124 57h28m-28 6h27m-27 6h22"/>
 <path class="mi-light" d="M113 32h19l12 5h-19zM46 58h5v14h-5z"/>`,
 fuel:`<path class="mi-dark" d="M42 81H28V48h28v8H36v17h9zm103-33h19v24h-19z"/>
 <path class="mi-metal" d="M53 38l21-13h48l23 18v43l-21 16H66L50 87V49z"/>
 <path class="mi-panel" d="M53 38l21-13h48l-12 13zM123 43l22 1v42l-21 16z"/>
 <path class="mi-dark" d="M64 45h48v45H64z"/>
 <path class="mi-light" d="M87 50c-6 9-13 16-13 23a13 13 0 0 0 26 0c0-7-7-14-13-23z"/>
 <path class="mi-detail" d="M129 51l10-3m-10 12 10-3m-10 12 10-3m-10 12 10-3M72 95h31"/>`,
 grenades:`<path class="mi-dark" d="M21 62Q96 35 171 62v23Q96 62 21 85z"/>
 <path class="mi-panel" d="M22 62h21v20H22zm130 0h21v20h-21z"/>
 <path class="mi-hatch" d="M24 69q72-21 144 0"/>
 <g transform="translate(54 70) rotate(-14)">${ECO_GRENADE}</g>
 <g transform="translate(96 62)">${ECO_GRENADE}</g>
 <g transform="translate(138 70) rotate(14)">${ECO_GRENADE}</g>`,
 twin:`<path class="mi-metal" d="M91 43l25-15h35l22 17v35l-21 16h-36L91 80z"/>
 <path class="mi-panel" d="M91 43l25-15h35l-14 15z"/>
 <path class="mi-dark" d="M122 49h41v26l-13 11h-28z"/>
 <path class="mi-detail" d="M132 55h23m-23 6h20m-20 6h16"/>
 <path class="mi-beam" d="M14 53h24M14 79h24"/>
 <g transform="translate(6 52)">${ECO_BARREL}</g>
 <g transform="translate(6 78)">${ECO_BARREL}</g>`
};
function ecoMarketArt(id){
 return `<div class="mi-art mi-art-${id}" aria-hidden="true"><svg viewBox="0 0 192 124" focusable="false"
  style="--mi-metal:url(#mi-metal-${id});--mi-panel:url(#mi-panel-${id});--mi-dark:url(#mi-dark-${id})">
  <defs>
   <linearGradient id="mi-metal-${id}" x2=".25" y2="1"><stop stop-color="#c3d9e9"/><stop offset=".42" stop-color="#6789a4"/><stop offset="1" stop-color="#263b54"/></linearGradient>
   <linearGradient id="mi-panel-${id}" x2="1" y2=".65"><stop stop-color="#d8eaf5"/><stop offset="1" stop-color="#607d96"/></linearGradient>
   <linearGradient id="mi-dark-${id}" x2="0" y2="1"><stop stop-color="#0a1524"/><stop offset="1" stop-color="#2b4157"/></linearGradient>
  </defs>
  <ellipse class="mi-orbit" cx="96" cy="65" rx="81" ry="47"/>
  <path class="mi-orbit" d="M96 12v11m0 82v10M9 65h13m148 0h13"/>
  <g class="mi-module">${ECO_ART[id]}</g>
 </svg></div>`;
}
function ecoMarketProgress(level,max,upgraded=false){
 const current=Math.min(level,max),fill=current/max,from=Math.max(0,current-1)/max;
 return `<div class="mi-progress${upgraded?' upgraded':''}${current===max?' complete':''}">
  <div class="mi-progress-label"><span>LIVELLO </span><strong>${current}<small> / ${max}</small></strong></div>
  <div class="mi-progress-track" role="progressbar" aria-label="Livello del potenziamento" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${current}"
   style="--mi-level-count:${max};--mi-fill:${fill};--mi-from:${from}"><span></span></div>
 </div>`;
}
function ecoMarketLevels(item,paid){
 const details=$('marketDemoLevels');
 if(!details)return;
 const current=ecoUpgrade(item.id),max=item.levels.length,price=item.prices[current];
 details.innerHTML=ecoMarketProgress(current,max,paid!==undefined)+
  '<ol class="mi-levels">'+item.levels.map((effect,i)=>
   `<li${i<current?` class="owned${paid!==undefined&&i===current-1?' just-upgraded':''}"`:i===current?' class="next" aria-current="step"':''}>
    <b>${i+1}</b><span>${effect}</span><small>${i<current?'ACQUISTATO':ecoFmt(item.prices[i])+' CR'}</small>
   </li>`).join('')+'</ol>'+
  (current===max?'<p class="mi-max">LIVELLO MASSIMO</p>':
   `<button type="button" class="mi-buy"${eco.balance<price?' disabled':''}>POTENZIA · ${ecoFmt(price)} CR</button>`);
 const button=details.querySelector('button');
 if(button)button.onclick=()=>ecoBuy(item.id);
 $('marketDemoStatus').textContent=paid!==undefined?'ACQUISTO CONFERMATO · −'+ecoFmt(paid)+' CR':
  current<max&&eco.balance<price?'CREDITI INSUFFICIENTI':'';
 if(paid!==undefined){
  if(button&&!button.disabled)button.focus();
  else $('marketDemo').focus({preventScroll:true});
 }
}
let ecoDemoId=null;
function ecoMarketDemo(id){
 const item=ECO_ITEMS.find(it=>it.id===id),video=$('marketDemoVideo'),demo=$('marketDemo');
 if(!item||!video||!demo)return;
 ecoDemoId=id;
 $('marketDemoTitle').textContent=item.name;
 $('marketDemoText').textContent=item.desc;
 ecoMarketLevels(item);
 show('marketDemo');
 const src='market-demo/'+id+'.mp4';
 if(video.getAttribute('src')!==src)video.src=src;
 else video.currentTime=0;
 video.play()?.catch(()=>{});
 $('marketGrid')?.querySelectorAll('.mi-demo-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demo===id)));
 demo.focus({preventScroll:true});
 demo.scrollIntoView({block:'nearest'});
}
function ecoMarketRail(){
 const grid=$('marketGrid'),prev=$('marketPrev'),next=$('marketNext');
 if(!grid||!prev||!next)return;
 prev.disabled=grid.scrollLeft<=1;
 next.disabled=grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-1;
}
function ecoBuy(id){
 const it=ECO_ITEMS.find(i=>i.id===id);if(!it)return false;
 const lv=ecoUpgrade(id);if(lv>=it.levels.length)return false;
 const price=it.prices[lv];if(eco.balance<price){ecoMarketMsg('CREDITI INSUFFICIENTI');if(typeof tone==='function')tone(180,.12,'square',.015);return false}
 eco.balance-=price;eco.upgrades[id]=lv+1;ecoSave();ecoRenderMarket(id);
 ecoMarketMsg('');
 if(state==='won'&&eco.last?.phase===1&&eco.last.win&&typeof saveCheckpoint==='function')saveCheckpoint(2);
 else if(typeof saveHome==='function')saveHome();
 if(ecoDemoId===id)ecoMarketLevels(it,price);
 if(typeof tone==='function'){
  tone(523.25,.13,'triangle',.045);
  tone(659.25,.15,'triangle',.042,0,.07);
  tone(1046.5,.28,'sine',.045,0,.15);
 }
 return true;
}
function ecoMarketMsg(t){const el=$('marketMsg');if(el)el.textContent=t}
function ecoRenderMarket(upgradedId){
 const grid=$('marketGrid');if(!grid)return;
 grid.innerHTML=ECO_ITEMS.map(it=>{
  const lv=ecoUpgrade(it.id),max=it.levels.length,done=lv>=max;
  const affordable=!done&&eco.balance>=it.prices[lv];
  return `<article class="market-item${done?' maxed':affordable?' affordable':''}" data-gadget="${it.id}"><button class="mi-demo-btn" type="button" data-demo="${it.id}" aria-label="Guarda anteprima · ${it.name}" aria-pressed="${ecoDemoId===it.id}">${ecoMarketArt(it.id)}<span class="mi-watch"><span aria-hidden="true">▶</span> GUARDA ANTEPRIMA</span></button><div class="mi-body"><div class="mi-head"><span class="mi-icon">${ico(it.icon)}</span><b>${it.name}</b></div>`+
   `<p>${it.desc}</p><p class="mi-level">${lv?'ATTUALE: '+it.levels[lv-1]:'NON ACQUISTATO'}</p>`+
   ecoMarketProgress(lv,max,it.id===upgradedId)+'</div></article>';
 }).join('');
 grid.querySelectorAll('.mi-demo-btn').forEach(b=>b.onclick=()=>ecoMarketDemo(b.dataset.demo));
 grid.querySelectorAll('.market-item').forEach(card=>card.onclick=e=>{
  if(!e.target.closest('button'))ecoMarketDemo(card.dataset.gadget);
 });
 ecoMarketRail();
 ecoHud();
}
let ecoMarketSource=null,ecoMarketTrigger=null;
function ecoOpenMarket(event){
 const screen=$('marketScreen');if(!screen)return;
 ecoRenderMarket();ecoMarketMsg('');
 ecoMarketTrigger=event?.currentTarget||$('marketBtn');
 const fromReward=ecoMarketTrigger===$('rewardMarketBtn');
 ecoMarketSource=$(fromReward?'missionReward':state==='won'||state==='lost'?'resultOverlay':'mapScreen');
 if(fromReward)show('missionReward',false);
 if(ecoMarketSource)ecoMarketSource.inert=true;
 show('marketScreen');screen.scrollTop=0;
 const rail=$('marketGrid');if(rail)rail.scrollLeft=0;
 ecoMarketRail();
 $('closeMarket')?.focus?.();
 if(typeof sfx==='function')sfx('ui')
}
function ecoCloseMarket(){
 const video=$('marketDemoVideo');
 if(video?.pause){video.pause();video.removeAttribute('src');video.load()}
 if($('marketDemo'))show('marketDemo',false);
 ecoDemoId=null;
 show('marketScreen',false);
 if(ecoMarketSource)ecoMarketSource.inert=false;
 if(ecoMarketSource===$('missionReward'))show('missionReward');
 ecoMarketTrigger?.focus?.();
 ecoMarketSource=ecoMarketTrigger=null;
 if(typeof sfx==='function')sfx('ui');
}

// Pulsanti: mercato dalla mappa e dalla schermata di fine fase.
for(const id of ['marketBtn','marketBtnResult']){const el=$(id);if(el)el.onclick=ecoOpenMarket}
{const el=$('closeMarket');if(el)el.onclick=ecoCloseMarket}
$('marketScreen')?.addEventListener?.('keydown',event=>{
 if(event.key==='Escape'){event.stopPropagation();ecoCloseMarket()}
});
{
 const rail=$('marketGrid');
 if(rail?.scrollBy){
  rail.addEventListener('scroll',ecoMarketRail,{passive:true});
  addEventListener('resize',ecoMarketRail);
  for(const [id,dir] of [['marketPrev',-1],['marketNext',1]]){
   $(id).onclick=()=>rail.scrollBy({left:dir*rail.clientWidth*.8,
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
 }
}
function ecoNewlyAffordable(recap){
 return ECO_ITEMS.filter(it=>{
  const price=it.prices[ecoUpgrade(it.id)];
  return recap.missionStart<price&&recap.balance>=price;
 });
}
let ecoRewardFrame=0,ecoRewardEntryParent=null;
function ecoCloseReward(){
 if(ecoRewardFrame)cancelAnimationFrame(ecoRewardFrame);
 ecoRewardFrame=0;
 show('missionReward',false);
 if(ecoRewardEntryParent){
  ecoRewardEntryParent.insertBefore($('scoreEntry'),$('landBtn'));
  ecoRewardEntryParent=null;
 }
}
function ecoRewardFly(from,to,label){
 if(!from.animate)return;
 const card=from.closest('.mission-reward-card'),origin=card.getBoundingClientRect();
 const start=from.getBoundingClientRect(),end=to.getBoundingClientRect();
 const chip=document.createElement('span');
 chip.className='reward-flight'+(to.id==='rewardCreditTotal'?' credits':'');
 chip.textContent='+'+label;chip.setAttribute('aria-hidden','true');
 const x=start.left+start.width/2,y=start.top+start.height/2;
 chip.style.left=(x-origin.left+card.scrollLeft)+'px';
 chip.style.top=(y-origin.top+card.scrollTop)+'px';
 card.appendChild(chip);
 const dx=end.left+end.width/2-x,dy=end.top+end.height/2-y;
 const flight=chip.animate([
  {transform:'translate(-50%,-50%) scale(1)',opacity:1},
  {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.65)`,opacity:0}
 ],{duration:800,easing:'cubic-bezier(.3,.15,.5,1)'});
 flight.onfinish=flight.oncancel=()=>chip.remove();
}
function ecoShowReward(recap,points,totalScore=points){
 const panel=$('missionReward'),scoreValue=$('rewardScore'),creditValue=$('rewardCredits');
 if(!panel||!scoreValue||!creditValue)return;
 const items=ecoNewlyAffordable(recap);
 const scoreTotal=$('rewardScoreTotal'),creditTotal=$('rewardCreditTotal');
 const income=recap.income??recap.missionIncome,balance=recap.balance;
 function renderTotals(progress){
  scoreTotal.textContent=ecoFmt(totalScore-points*(1-progress));
  creditTotal.textContent=ecoFmt(balance-income*(1-progress))+' CR';
 }
 renderTotals(0);
 $('rewardItems').textContent=items.map(it=>it.name).join(' · ');
 show('rewardMarket',false);
 show('rewardActions',false);
 const canLand=recap.phase===1&&recap.win;
 show('rewardLandBtn',!!canLand);
 show('rewardMarketBtn',!!recap.win);
 scoreValue.textContent='0';creditValue.textContent='0 CR';
 show('missionReward');
 panel.focus?.();
 function finishCount(){
  ecoRewardFrame=0;
  show('rewardMarket',!!recap.win&&items.length>0);
  show('rewardActions');
  const name=ecoRewardEntryParent&&$('scoreName');
  (name&&!name.disabled?name:$(canLand?'rewardLandBtn':'rewardClose'))?.focus?.();
 }
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced){scoreValue.textContent=ecoFmt(points);creditValue.textContent=ecoFmt(income)+' CR';renderTotals(1);finishCount();return}
 const start=performance.now();
 let lastTick=-1,flying=false;
 function animate(now){
  const elapsed=now-start,scoreT=Math.min(1,elapsed/900),creditT=Math.max(0,Math.min(1,(elapsed-650)/1000));
  scoreValue.textContent=ecoFmt(points*scoreT);
  creditValue.textContent=ecoFmt(income*creditT)+' CR';
  if(elapsed>=1650&&elapsed<2450&&!flying){
   flying=true;
   if(points>0)ecoRewardFly(scoreValue,scoreTotal,ecoFmt(points));
   if(income>0)ecoRewardFly(creditValue,creditTotal,ecoFmt(income)+' CR');
  }
  const transfer=Math.max(0,Math.min(1,(elapsed-1900)/550));
  renderTotals(transfer);
  const tick=Math.floor(elapsed/95);
  if(tick!==lastTick&&elapsed<1650&&((points>0&&scoreT<1)||(income>0&&creditT>0))){
   const freq=170+elapsed*.64;
   tone(freq,.08,'triangle',.023,freq+65);
   lastTick=tick;
  }
  if(transfer<1)ecoRewardFrame=requestAnimationFrame(animate);
  else finishCount();
 }
 ecoRewardFrame=requestAnimationFrame(animate);
}
// Il riepilogo compare prima di lasciare la scena della missione.
{
 const ret=$('returnBtn'),close=$('rewardClose'),market=$('rewardMarketBtn');
 const prev=ret?.onclick,land=$('rewardLandBtn');
 if(land)land.onclick=()=>{
  ecoCloseReward();
  $('landBtn')?.onclick?.();
 };
 if(close)close.onclick=e=>{
  ecoCloseReward();
  prev?.(e);
  $('marketBtn')?.focus?.();
 };
 if(market)market.onclick=ecoOpenMarket;
 $('missionReward')?.addEventListener?.('keydown',e=>{
  if(e.key==='Tab'){
   e.preventDefault();
   if(ecoRewardFrame)return;
   const scoreActions=ecoRewardEntryParent?[$('scoreName'),$('scoreSaveBtn'),$('scoreSeeBoard')]:[];
   const actions=[...scoreActions,land,close,market].filter(button=>button&&!button.disabled&&!button.classList.contains('hidden'));
   const current=actions.indexOf(document.activeElement);
   const next=current<0?(e.shiftKey?actions.length-1:0):((current+(e.shiftKey?-1:1)+actions.length)%actions.length);
   actions[next]?.focus?.();
  }
 });
 if(ret)ret.onclick=e=>{
  eco.last=null;show('ecoRecap',false);
  prev?.(e);
 };
}
ecoHud();
