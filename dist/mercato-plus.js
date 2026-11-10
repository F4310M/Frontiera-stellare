// Conex — MERCATO PIÙ COMODO + JETPACK POTENZIATO (2026-11-10).
// 1) Aprendo il mercato l'anteprima del primo potenziamento è già aperta.
// 2) Se almeno un potenziamento si può comprare, accanto al titolo POTENZIAMENTI compare un avviso
//    lampeggiante cliccabile: porta in primo piano il potenziamento (a ogni clic il successivo).
// 3) Le schede acquistabili hanno anche l'etichetta UPGRADE DISPONIBILE (oltre all'icona che lampeggia).
// 4) Nuovo potenziamento JETPACK POTENZIATO: il jetpack del pilota sale/vola più veloce e dura di più
//    prima di surriscaldarsi (valori in MK_JET).
// 5) L'elenco dei potenziamenti si scorre anche trascinandolo con il mouse tenuto premuto.
// Usa economia.js (ECO_ITEMS, ECO_ART, ecoOpenMarket, ecoRenderMarket, ecoMarketDemo) e fase2.js (PF_JET).
// Va caricato dopo upgrade-disponibili.js, prima di esci.js.

const MK={dragMin:6};
// Livelli del jetpack: [nessuno, 1, 2, 3]
const MK_JET={speed:[0,.15,.30,.45],dur:[0,.30,.60,1.0],rise:95};
const mk={next:0,drag:null,dragged:false};
const MK_TXT='UPGRADE DISPONIBILE';

// ---------------------------------------------------------------- 4) jetpack nel catalogo
if(typeof ICONS!=='undefined'&&!ICONS.jetpack)
 ICONS.jetpack='<path d="M8 3h8v12H8zM5 6h3v9H5zm11 0h3v9h-3zM6 15l-.5 3M18 15l.5 3M10.5 7h3M10.5 10h3"/><path d="M5.5 19.5 6 22M18.5 19.5 18 22"/>';
if(typeof ECO_ART!=='undefined'&&!ECO_ART.jetpack)ECO_ART.jetpack=`
 <path class="mi-hatch" d="M80 20 96 8l16 12"/>
 <path class="mi-metal" d="M69 22h54l10 11v50l-10 9H69l-10-9V33z"/>
 <path class="mi-panel" d="M69 22h54l10 11H59z"/>
 <path class="mi-dark" d="M75 39h42v36H75z"/>
 <path class="mi-detail" d="M82 47h28m-28 7h28m-28 7h19"/>
 <path class="mi-light" d="M90 28h12v5H90z"/>
 <path class="mi-metal" d="M42 33h15v58H42zm93 0h15v58h-15z"/>
 <path class="mi-panel" d="M42 33h15v8H42zm93 0h15v8h-15z"/>
 <path class="mi-seam" d="M42 52h15m-15 18h15m78-18h15m-15 18h15"/>
 <path class="mi-dark" d="M40 91h19l-3 9H43zm93 0h19l-3 9h-13z"/>
 <path class="mi-light" d="M44 101q5 10 5.5 21 5-10 5.5-21zm93 0q5 10 5.5 21 5-10 5.5-21z"/>`;
if(typeof ECO_ITEMS!=='undefined'&&!ECO_ITEMS.some(it=>it.id==='jetpack'))ECO_ITEMS.push({
 id:'jetpack',icon:'jetpack',name:'JETPACK POTENZIATO',
 desc:'Nelle missioni a terra il jetpack del pilota vola più veloce e resta acceso più a lungo prima di surriscaldarsi.',
 levels:['VELOCITÀ +15% · DURATA +30%','VELOCITÀ +30% · DURATA +60%','VELOCITÀ +45% · DURATA +100%'],
 prices:[2200,4600,8200]
});
function mkJetLv(){return Math.max(0,Math.min(3,typeof ecoUpgrade==='function'?ecoUpgrade('jetpack')|0:0))}

// Durata: il jetpack si scalda più piano. Velocità: sale più in fretta e in volo corre di più.
if(typeof pfUpdateJetpack==='function'&&typeof PF_JET!=='undefined'){
 const orig=pfUpdateJetpack;
 pfUpdateJetpack=function(P,dt,hold){
  const lv=mkJetLv();if(!lv||!P)return orig.apply(this,arguments);
  const heat=PF_JET.heat;
  PF_JET.heat=heat/(1+MK_JET.dur[lv]);
  try{
   const r=orig.apply(this,arguments);
   // stessa formula di fase2.js con una spinta verso l'alto più forte
   if(P.jetOn&&!(typeof battDown==='function'&&hold&&battDown())&&(hold||P.jetMin>0))P.vy-=MK_JET.rise*MK_JET.speed[lv]*Math.min(1,dt*7);
   return r;
  }finally{PF_JET.heat=heat}
 };
}
// In volo col jetpack il pilota si sposta più veloce (stesso calcolo dei MOTORI POTENZIATI di fase2.js).
if(typeof pfUpdatePilot==='function'&&typeof upg==='function'){
 const origPilot=pfUpdatePilot,origUpg=upg;let jetRun=0;
 upg=function(id){const v=origUpg.apply(this,arguments);return id==='speed'&&jetRun?v+jetRun:v};
 pfUpdatePilot=function(dt){
  const P=typeof pf!=='undefined'&&pf&&pf.pilot,lv=mkJetLv();
  jetRun=P&&lv&&P.jetOn&&!P.ground?MK_JET.speed[lv]/.08:0; // +8% di corsa per ogni punto di 'speed'
  try{return origPilot.apply(this,arguments)}finally{jetRun=0}
 };
}

// ---------------------------------------------------------------- mercato
function mkAffordable(){
 if(typeof eco==='undefined'||typeof ECO_ITEMS==='undefined')return[];
 return ECO_ITEMS.filter(it=>{const lv=ecoUpgrade(it.id);return lv<it.levels.length&&eco.balance>=it.prices[lv]});
}
// avviso accanto al titolo POTENZIAMENTI
function mkAlert(){
 let b=$('mkAlert');if(b)return b;
 const h=$('marketCatalogTitle');if(!h||!h.parentNode||!document.createElement)return null;
 const box=document.createElement('div');box.className='mk-title';
 h.parentNode.insertBefore(box,h);box.appendChild(h);
 b=document.createElement('button');b.type='button';b.id='mkAlert';b.className='mk-alert hidden';
 b.setAttribute('aria-controls','marketGrid');
 b.innerHTML=`<span class="mk-alert-ico">${typeof ico==='function'?ico('arrow-up'):''}</span><b class="mk-alert-txt">${MK_TXT}</b><span class="mk-alert-n"></span>`;
 b.onclick=()=>mkGoNext();
 box.appendChild(b);return b;
}
function mkRefresh(){
 const list=mkAffordable(),b=mkAlert();
 if(b){
  b.classList.toggle('hidden',!list.length);
  const n=b.querySelector('.mk-alert-n');if(n)n.textContent=list.length>1?'× '+list.length:'';
  b.setAttribute('aria-label',MK_TXT+(list.length>1?' · '+list.length:'')+' · '+list.map(it=>it.name).join(', '));
 }
 // etichetta sulle schede acquistabili
 const grid=$('marketGrid');if(!grid||!grid.querySelectorAll)return;
 for(const card of grid.querySelectorAll('.market-item')){
  let t=card.querySelector('.mk-badge');
  if(card.classList.contains('affordable')){
   if(!t){t=document.createElement('span');t.className='mk-badge';t.innerHTML=(typeof ico==='function'?ico('arrow-up'):'')+'<b>'+MK_TXT+'</b>';
    const head=card.querySelector('.mi-body');if(head)head.insertBefore(t,head.firstChild);else card.appendChild(t)}
  }else if(t)t.remove();
 }
}
// porta in primo piano un potenziamento acquistabile (a ogni clic il successivo)
function mkGoNext(){
 const list=mkAffordable();if(!list.length)return;
 const it=list[mk.next%list.length];mk.next=(mk.next+1)%list.length;
 mkFocus(it.id,true);
}
function mkFocus(id,flash){
 const grid=$('marketGrid');if(!grid)return;
 const card=grid.querySelector(`.market-item[data-gadget="${id}"]`);
 if(card){
  const left=card.offsetLeft-grid.offsetLeft-(grid.clientWidth-card.offsetWidth)/2;
  if(grid.scrollTo)grid.scrollTo({left:Math.max(0,left),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  if(flash){card.classList.remove('mk-flash');void card.offsetWidth;card.classList.add('mk-flash');setTimeout(()=>card.classList.remove('mk-flash'),1500)}
 }
 if(typeof ecoMarketDemo==='function')ecoMarketDemo(id);
}
if(typeof ecoRenderMarket==='function'){
 const o=ecoRenderMarket;
 ecoRenderMarket=function(...a){const r=o.apply(this,a);try{mkRefresh()}catch(e){console.error(e)}return r};
}
// anteprima del primo potenziamento già aperta, pagina in alto
if(typeof ecoOpenMarket==='function'){
 const o=ecoOpenMarket;
 ecoOpenMarket=function(...a){
  const r=o.apply(this,a);
  try{
   const s=$('marketScreen');
   if(s&&!s.classList.contains('hidden')&&ECO_ITEMS.length){
    mk.next=0;ecoMarketDemo(ECO_ITEMS[0].id);
    s.scrollTop=0;const g=$('marketGrid');if(g)g.scrollLeft=0;
    $('closeMarket')?.focus?.({preventScroll:true});
    if(typeof ecoMarketRail==='function')ecoMarketRail();
   }
  }catch(e){console.error(e)}
  return r;
 };
 // i pulsanti erano già collegati alla versione di prima
 for(const id of ['marketBtn','marketBtnResult','rewardMarketBtn']){const el=$(id);if(el&&el.onclick)el.onclick=ecoOpenMarket}
}
// il video che manca (es. jetpack) lascia il posto al disegno del potenziamento
if(typeof ecoMarketDemo==='function'){
 const o=ecoMarketDemo;
 ecoMarketDemo=function(id,...a){
  const r=o.call(this,id,...a);
  try{mkArtFallback(id)}catch(e){}
  return r;
 };
}
function mkArtFallback(id){
 const demo=$('marketDemo'),video=$('marketDemoVideo');if(!demo||!video)return;
 let art=demo.querySelector('.mk-demo-art');
 if(!art){art=document.createElement('div');art.className='mk-demo-art';video.after(art)}
 art.innerHTML=typeof ecoMarketArt==='function'?ecoMarketArt(id).replace(/mi-(metal|panel|dark)-/g,'mk-$1-'):'';
 const missing=()=>{if(ecoDemoId===id)demo.classList.add('mk-novideo')};
 demo.classList.remove('mk-novideo');
 video.onerror=missing;
 if(video.error)missing();
}

// ---------------------------------------------------------------- 5) trascinamento col mouse
{
 const grid=typeof document!=='undefined'&&$('marketGrid');
 if(grid&&grid.addEventListener){
  grid.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='mouse'||e.button!==0)return;
   mk.drag={x:e.clientX,left:grid.scrollLeft,id:e.pointerId,on:false};mk.dragged=false;
  });
  addEventListener('pointermove',e=>{
   const D=mk.drag;if(!D||e.pointerId!==D.id)return;
   const dx=e.clientX-D.x;
   if(!D.on&&Math.abs(dx)>=MK.dragMin){D.on=true;grid.classList.add('mk-dragging');try{grid.setPointerCapture(D.id)}catch(x){}}
   if(D.on){grid.scrollLeft=D.left-dx;e.preventDefault()}
  });
  const end=e=>{
   const D=mk.drag;if(!D||(e&&e.pointerId!==D.id))return;
   mk.drag=null;
   if(D.on){mk.dragged=true;grid.classList.remove('mk-dragging');try{grid.releasePointerCapture(D.id)}catch(x){}setTimeout(()=>{mk.dragged=false},0)}
  };
  addEventListener('pointerup',end);addEventListener('pointercancel',end);
  // dopo un trascinamento il clic non apre l'anteprima
  grid.addEventListener('click',e=>{if(mk.dragged){e.stopPropagation();e.preventDefault();mk.dragged=false}},true);
  grid.addEventListener('dragstart',e=>e.preventDefault());
 }
}

const MK_CSS=`
.mk-title{display:flex;align-items:center;gap:14px;flex-wrap:wrap;min-width:0}
.mk-alert{display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 8px;border:1px solid #fff0b8;border-radius:999px;cursor:pointer;
 background:linear-gradient(135deg,#ffe08a,#ffb238 55%,#ff8a1f);color:#1d1203;font:700 12px 'Chakra Petch',sans-serif;letter-spacing:.14em;
 animation:udGlow 1.6s ease-in-out infinite,mkIn .4s cubic-bezier(.2,1.4,.4,1) both}
.mk-alert.hidden{display:none}
.mk-alert:hover{filter:brightness(1.08)}
.mk-alert:focus-visible{outline:2px solid #fff0b8;outline-offset:3px}
.mk-alert-ico{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#1d1203;color:#ffd36b}
.mk-alert-ico svg{width:14px;height:14px;animation:udUp 1s ease-in-out infinite}
.mk-alert-n:empty{display:none}
.mk-alert-n{font-size:11px;opacity:.8}
.mk-badge{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;margin:0 0 8px;padding:3px 9px 3px 6px;border-radius:999px;
 background:linear-gradient(135deg,#ffe08a,#ffb238);color:#1d1203;font:700 9px 'Chakra Petch',sans-serif;letter-spacing:.14em;animation:udGlow 1.6s ease-in-out infinite}
.mk-badge svg{width:11px;height:11px;animation:udUp 1s ease-in-out infinite}
.market-item.affordable{border-color:#ffd36b99}
.market-item.mk-flash{animation:mkFlash 1.4s ease-out}
@keyframes mkFlash{0%,40%{box-shadow:0 0 0 2px #fff0b8,0 0 30px #ffb238}100%{box-shadow:none}}
@keyframes mkIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
.market-grid{cursor:grab}
.market-grid.mk-dragging{cursor:grabbing;scroll-snap-type:none;user-select:none}
.market-grid.mk-dragging *{pointer-events:none}
.mk-demo-art{display:none}
.market-demo.mk-novideo video{display:none}
.market-demo.mk-novideo .mk-demo-art{display:grid;place-items:center;align-self:stretch;min-height:180px;border:1px solid var(--line);border-radius:10px;
 background:radial-gradient(circle at 50% 45%,#16314b,#08121f 70%)}
.market-demo.mk-novideo .mk-demo-art .mi-art{width:100%;max-width:420px}
.market-demo.mk-novideo .mk-demo-art svg{width:100%;height:auto;display:block}
.mi-art-jetpack{--mi-glow:#ffb962}
@media(prefers-reduced-motion:reduce){.mk-alert,.mk-badge,.mk-alert-ico svg,.mk-badge svg,.market-item.mk-flash{animation:none}}
`;
if(typeof document!=='undefined'&&document.head&&document.createElement&&!$('mkCss')){
 const st=document.createElement('style');st.id='mkCss';st.textContent=MK_CSS;document.head.appendChild(st);
}

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["UPGRADE DISPONIBILE","UPGRADE AVAILABLE","AMÉLIORATION DISPONIBLE","MEJORA DISPONIBLE","ДОСТУПНО УЛУЧШЕНИЕ","可升级","強化可能"],
  ["JETPACK POTENZIATO","UPGRADED JETPACK","JETPACK AMÉLIORÉ","JETPACK MEJORADO","УЛУЧШЕННЫЙ ДЖЕТПАК","强化喷气背包","強化ジェットパック"],
  ["Nelle missioni a terra il jetpack del pilota vola più veloce e resta acceso più a lungo prima di surriscaldarsi.",
   "In ground missions the pilot's jetpack flies faster and stays on longer before overheating.",
   "Dans les missions au sol, le jetpack du pilote vole plus vite et reste allumé plus longtemps avant de surchauffer.",
   "En las misiones en tierra, el jetpack del piloto vuela más rápido y aguanta más antes de sobrecalentarse.",
   "В наземных миссиях джетпак пилота летит быстрее и дольше работает до перегрева.",
   "地面任务中，飞行员的喷气背包飞得更快，过热前可以持续更久。",
   "地上ミッションでパイロットのジェットパックが速く飛び、オーバーヒートまで長く使える。"],
  ["VELOCITÀ +15%","SPEED +15%","VITESSE +15%","VELOCIDAD +15%","СКОРОСТЬ +15%","速度 +15%","速度 +15%"],
  ["VELOCITÀ +30%","SPEED +30%","VITESSE +30%","VELOCIDAD +30%","СКОРОСТЬ +30%","速度 +30%","速度 +30%"],
  ["VELOCITÀ +45%","SPEED +45%","VITESSE +45%","VELOCIDAD +45%","СКОРОСТЬ +45%","速度 +45%","速度 +45%"],
  ["DURATA +30%","DURATION +30%","DURÉE +30%","DURACIÓN +30%","ВРЕМЯ РАБОТЫ +30%","持续时间 +30%","持続時間 +30%"],
  ["DURATA +60%","DURATION +60%","DURÉE +60%","DURACIÓN +60%","ВРЕМЯ РАБОТЫ +60%","持续时间 +60%","持続時間 +60%"],
  ["DURATA +100%","DURATION +100%","DURÉE +100%","DURACIÓN +100%","ВРЕМЯ РАБОТЫ +100%","持续时间 +100%","持続時間 +100%"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
if(typeof document!=='undefined'&&document.querySelector)try{mkAlert();mkRefresh()}catch(e){}
