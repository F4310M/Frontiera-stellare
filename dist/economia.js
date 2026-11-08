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
 {id:'salvo',icon:'salvo',name:'LANCIATORE MULTIPLO',desc:'Un clic della rotella lancia più missili insieme, ognuno guidato su un bersaglio diverso. Ogni missile costa 25 CR.',levels:['2 MISSILI INSIEME','3 MISSILI INSIEME'],prices:[6500,13000]},
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
 const previous=phase===2&&eco.last?.phase===1&&eco.last.win&&eco.last.planet===selected?eco.last:null;
 eco.run={phase,count:{},spent:{},total:0,start:eco.balance,
  missionStart:previous?.missionStart??eco.balance,scoreStart:previous?.scoreStart??(typeof score==='number'?score:0),
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
 const recap={phase,win,rows,spent:run.total,income:bounty+prize,net,balance:eco.balance,prize,
  planet:selected,missionStart:run.missionStart,scoreStart:run.scoreStart,missionIncome:run.earlierIncome+bounty+prize};
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
// Sagome vettoriali del catalogo, riutilizzate nell'anteprima di acquisto.
const ECO_ART={
 salvo:'<path class="mi-metal" d="M54 34h94l16 17v30l-16 16H54L37 82V50z"/><path class="mi-panel" d="M63 42h86l7 8H66zM64 88h92l-9 9H55z"/><path class="mi-dark" d="M49 53h103v25H49z"/><path class="mi-light" d="M66 46H35L19 53l16 7h31zM80 59H37l-19 8 19 7h43zM66 74H35l-16 7 16 7h31z"/><path class="mi-detail" d="M100 58h36m-36 8h45m-45 8h31"/>',
 laser:'<path class="mi-metal" d="M67 43h76l22 13v19l-22 13H67L50 76V55z"/><path class="mi-dark" d="M58 54h33v23H58zM112 51h31l12 9v11l-12 9h-31z"/><path class="mi-panel" d="M86 44h18v44H86z"/><ellipse class="mi-light" cx="61" cy="66" rx="8" ry="12"/><path class="mi-beam" d="M16 66h39"/><path class="mi-detail" d="M119 59h24m-24 7h29m-29 7h24"/>',
 shield:'<path class="mi-beam" opacity=".45" d="M96 15l43 16 13 30-15 37-41 20-41-20-15-37 13-30z"/><path class="mi-metal" d="M96 27l38 15v25c0 17-17 31-38 41-21-10-38-24-38-41V42z"/><path class="mi-panel" d="M96 34l31 12v21c0 13-12 25-31 35z"/><path class="mi-dark" d="M96 46l18 8v15c0 7-8 15-18 21-10-6-18-14-18-21V54z"/><path class="mi-light" d="M96 53l11 12-11 15-11-15z"/>',
 speed:'<path class="mi-metal" d="M71 41h63l21 15v19l-21 15H71L53 80V51z"/><path class="mi-dark" d="M54 49H38l-9 10v14l9 9h16z"/><path class="mi-panel" d="M70 42h17v48H70zM107 49h29l14 10v13l-14 10h-29z"/><path class="mi-light" d="M39 56H24L8 66l16 10h15l-7-10z"/><path class="mi-detail" d="M110 57h24m-24 9h32m-32 8h24"/>',
 fuel:'<path class="mi-metal" d="M59 39h67l16 15v34l-14 13H59L45 87V54z"/><path class="mi-dark" d="M66 51h44v36H66zM139 59h17v22h-17z"/><path class="mi-panel" d="M49 55h13v31H49zM115 49h17v43h-17z"/><path class="mi-light" d="M88 54c-6 9-13 15-13 22a13 13 0 0026 0c0-7-7-13-13-22z"/><path class="mi-detail" d="M67 33h40m-33 74h28"/>',
 grenades:'<path class="mi-dark" d="M30 54q66-12 132 0v25q-66-9-132 0z"/><path class="mi-panel" d="M26 54h17v24H26zM150 54h17v24h-17z"/><g class="mi-metal"><path d="M51 51h21l5 12v23l-7 8H53l-7-8V63z"/><path d="M85 45h22l6 14v26l-7 9H86l-7-9V59z"/><path d="M120 51h21l5 12v23l-7 8h-17l-7-8V63z"/></g><path class="mi-detail" d="M56 47v-8h11v8m23-6v-9h12v9m23 6v-8h11v8"/><path class="mi-beam" d="M52 72h19m15-5h20m15 5h19"/>',
 twin:'<path class="mi-metal" d="M79 38h61l22 17v21l-22 17H79L62 76V55z"/><path class="mi-panel" d="M114 48h25l15 11v13l-15 11h-25z"/><path class="mi-dark" d="M50 45h62v17H50zM50 69h62v17H50z"/><path class="mi-beam" d="M16 53h43m-43 24h43"/><path class="mi-detail" d="M122 57h17m-17 8h24m-24 8h17"/>'
};
function ecoMarketArt(id){
 return `<div class="mi-art mi-art-${id}" aria-hidden="true"><svg viewBox="0 0 192 124" focusable="false">
  <ellipse class="mi-orbit" cx="96" cy="65" rx="75" ry="44"/>
  <path class="mi-orbit" d="M96 15v11m0 78v10M15 65h13m136 0h13"/>
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
function ecoMarketPreview(it,lv,price){
 const preview=$('marketPreview');if(!preview)return;
 preview.innerHTML=ecoMarketArt(it.id)+`<div class="mi-preview-info">
  <p class="eyebrow">ACQUISTO CONFERMATO</p>
  <h3>${it.name}</h3>
  <p>${it.levels[lv-1]}</p>
  ${ecoMarketProgress(lv,it.levels.length,true)}
  <div class="mi-preview-meta"><span>−${ecoFmt(price)} CR</span></div>
 </div>`;
 show('marketPreview');
 preview.focus?.({preventScroll:true});
 preview.scrollIntoView?.({block:'nearest'});
}
let ecoDemoId=null;
function ecoMarketDemo(id){
 const item=ECO_ITEMS.find(it=>it.id===id),video=$('marketDemoVideo'),demo=$('marketDemo');
 if(!item||!video||!demo)return;
 ecoDemoId=id;
 $('marketDemoTitle').textContent=item.name;
 $('marketDemoText').textContent=item.desc;
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
 $('marketDemoVideo')?.pause?.();
 ecoMarketPreview(it,lv+1,price);
 if(typeof sfx==='function')sfx('ui');if(typeof tone==='function'){tone(523,.1,'sine',.025);tone(784,.18,'sine',.025,0,.1)}
 return true;
}
function ecoMarketMsg(t){const el=$('marketMsg');if(el)el.textContent=t}
function ecoRenderMarket(upgradedId){
 const grid=$('marketGrid');if(!grid)return;
 grid.innerHTML=ECO_ITEMS.map(it=>{
  const lv=ecoUpgrade(it.id),max=it.levels.length,done=lv>=max,price=done?0:it.prices[lv];
  return `<article class="market-item${done?' maxed':''}" data-gadget="${it.id}"><button class="mi-demo-btn" type="button" data-demo="${it.id}" aria-label="Guarda anteprima · ${it.name}" aria-pressed="${ecoDemoId===it.id}">${ecoMarketArt(it.id)}<span class="mi-watch"><span aria-hidden="true">▶</span> GUARDA ANTEPRIMA</span></button><div class="mi-body"><div class="mi-head"><span class="mi-icon">${ico(it.icon)}</span><b>${it.name}</b></div>`+
   `<p>${it.desc}</p><p class="mi-level">${lv?'ATTUALE: '+it.levels[lv-1]:'NON ACQUISTATO'}</p>`+
   ecoMarketProgress(lv,max,it.id===upgradedId)+
   `<button class="mi-buy" data-id="${it.id}" ${done||eco.balance<price?'disabled':''}>${done?'LIVELLO MASSIMO':it.levels[lv]+' · '+ecoFmt(price)+' CR'}</button></div></article>`;
 }).join('');
 grid.querySelectorAll('.mi-buy').forEach(b=>b.onclick=()=>ecoBuy(b.dataset.id));
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
 const preview=$('marketPreview');if(preview){show('marketPreview',false);preview.innerHTML=''}
 ecoMarketSource=$(state==='won'||state==='lost'?'resultOverlay':'mapScreen');
 ecoMarketTrigger=event?.currentTarget||$('marketBtn');
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
let ecoRewardFrame=0;
function ecoCloseReward(){
 if(ecoRewardFrame)cancelAnimationFrame(ecoRewardFrame);
 ecoRewardFrame=0;
 show('missionReward',false);
 $('marketBtn')?.focus?.();
}
function ecoShowReward(recap,points){
 const panel=$('missionReward'),scoreValue=$('rewardScore'),creditValue=$('rewardCredits');
 if(!panel||!scoreValue||!creditValue)return;
 const items=ecoNewlyAffordable(recap);
 $('rewardItems').textContent=items.map(it=>it.name).join(' · ');
 show('rewardMarket',items.length>0);
 scoreValue.textContent='0';creditValue.textContent='0 CR';
 show('missionReward');
 $('rewardClose')?.focus?.();
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced){scoreValue.textContent=ecoFmt(points);creditValue.textContent=ecoFmt(recap.missionIncome)+' CR';return}
 const start=performance.now();
 let lastTick=-1;
 function animate(now){
  const elapsed=now-start,scoreT=Math.min(1,elapsed/900),creditT=Math.max(0,Math.min(1,(elapsed-650)/1000));
  scoreValue.textContent=ecoFmt(points*scoreT);
  creditValue.textContent=ecoFmt(recap.missionIncome*creditT)+' CR';
  const tick=Math.floor(elapsed/95);
  if(tick!==lastTick&&elapsed<1650&&((points>0&&scoreT<1)||(recap.missionIncome>0&&creditT>0))){
   const freq=170+elapsed*.64;
   tone(freq,.08,'triangle',.023,freq+65);
   lastTick=tick;
  }
  ecoRewardFrame=creditT<1?requestAnimationFrame(animate):0;
 }
 ecoRewardFrame=requestAnimationFrame(animate);
}
// Il risultato viene mostrato sulla mappa una sola volta, dopo il salvataggio dei punti.
{
 const ret=$('returnBtn'),close=$('rewardClose'),market=$('rewardMarketBtn');
 if(close)close.onclick=ecoCloseReward;
 if(market)market.onclick=()=>{ecoCloseReward();ecoOpenMarket()};
 $('missionReward')?.addEventListener?.('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ecoCloseReward()}
  if(e.key==='Tab'){
   e.preventDefault();
   const marketVisible=!$('rewardMarket').classList.contains('hidden');
   (marketVisible&&document.activeElement===close?market:close)?.focus?.();
  }
 });
 if(ret){
  const prev=ret.onclick;
  ret.onclick=e=>{
   const recap=(state==='won'||state==='lost')?eco.last:null;
   const points=recap&&typeof score==='number'?Math.max(0,score-recap.scoreStart):0;
   eco.last=null;show('ecoRecap',false);
   if(prev)prev(e);
   if(recap&&state==='map')ecoShowReward(recap,points);
  };
 }
}
ecoHud();
