// Conex — LOADER ANIMATI con percentuale da 0 a 100% (2026-11-06).
// 1) Avvio del gioco: schermata a tutto schermo che segue il caricamento di script e stili.
// 2) Salto nell'iperspazio: barra con percentuale sotto la rotta, mentre la missione si prepara.
// 3) Profilo: apertura del file .sfsave, creazione del pilota, verifica e cambio della password.
// 4) Classifica mondiale: barra al posto della scritta CARICAMENTO….
// Va caricato per primo, subito dopo <body>: le altre parti si agganciano a DOMContentLoaded.

const LD_BOOT_KEY='stellarBootRisorse';
const ldUI=typeof document!=='undefined'&&!!document.createElement&&!!document.body&&!!document.querySelectorAll;
const ldRaf=typeof requestAnimationFrame==='function'?requestAnimationFrame:f=>setTimeout(f,16);
const ldNow=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const ldId=id=>document.getElementById(id);

function ldRing(){
 return '<svg class="ld-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ld-track" cx="50" cy="50" r="44"/>'+
  '<circle class="ld-arc" cx="50" cy="50" r="44" pathLength="100"/><circle class="ld-orbit" cx="50" cy="50" r="49" pathLength="100"/></svg>';
}

// Un loader: il numero sale morbido verso il valore vero e non torna mai indietro.
function ldMake(el){
 const o={el,shown:0,target:0,raf:0,done:null};
 o.reset=()=>{o.shown=0;o.target=0;o.done=null;ldDraw(o)};
 o.set=p=>{o.target=Math.max(o.target,Math.min(100,p));ldTick(o)};
 o.finish=()=>new Promise(res=>{o.done=res;o.set(100);if(o.shown>=100){o.done=null;res()}});
 return o;
}
function ldDraw(o){
 const v=Math.floor(o.shown);
 for(const a of o.el.querySelectorAll('.ld-arc'))a.style.strokeDashoffset=String(100-o.shown);
 for(const b of o.el.querySelectorAll('.ld-fill'))b.style.width=o.shown+'%';
 for(const t of o.el.querySelectorAll('.ld-pct'))t.textContent=v+'%';
 o.el.setAttribute('aria-valuenow',String(v));
}
function ldTick(o){
 if(o.raf)return;
 const step=()=>{
  o.raf=0;
  const d=o.target-o.shown;
  o.shown=d<.5?o.target:o.shown+Math.max(.5,d*.12);
  ldDraw(o);
  if(o.shown<o.target){o.raf=1;ldRaf(step)}
  else if(o.shown>=100&&o.done){const f=o.done;o.done=null;f()}
 };
 o.raf=1;ldRaf(step);
}
// Per i lavori senza avanzamento misurabile: sale da solo verso il 90% finché il lavoro non finisce.
function ldCreep(o,until){
 const t=setInterval(()=>{if(until&&!until())return clearInterval(t);o.set(o.target+(90-o.target)*.07)},70);
 return t;
}

// ---- 1) avvio del gioco
let ldBootObj=null;
function ldBoot(){
 if(!ldUI||ldId('bootLoader'))return;
 const L={it:'CARICAMENTO',en:'LOADING',fr:'CHARGEMENT',es:'CARGANDO',ru:'ЗАГРУЗКА',zh:'加载中',ja:'読み込み中'};
 let lg='en',prev=0;
 try{lg=localStorage.getItem('stellarLang')||'en';prev=+localStorage.getItem(LD_BOOT_KEY)||0}catch(e){}
 const d=document.createElement('div');
 d.id='bootLoader';d.className='ld-boot';
 d.setAttribute('role','progressbar');d.setAttribute('aria-valuemin','0');d.setAttribute('aria-valuemax','100');d.setAttribute('aria-label',L[lg]||L.en);
 d.innerHTML='<div class="ld-boot-in"><div class="ld-ring-wrap">'+ldRing()+'<span class="ld-pct">0%</span></div>'+
  '<p class="ld-brand">CON<b>EX</b></p><p class="ld-label">'+(L[lg]||L.en)+'</p><div class="ld-bar"><b class="ld-fill"></b></div></div>';
 document.body.insertBefore(d,document.body.firstChild);
 const o=ldBootObj=ldMake(d);
 // Script e stili: il totale è quello dell'ultimo avvio, o quelli già visti nella pagina.
 const total=()=>Math.max(prev,document.querySelectorAll('script[src],link[rel=stylesheet]').length,1);
 let loaded=0;for(const l of document.querySelectorAll('link[rel=stylesheet]'))if(l.sheet)loaded++;
 const bump=()=>o.set(Math.min(90,loaded/total()*90));
 bump();
 document.addEventListener('load',e=>{const t=e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){loaded++;bump()}},true);
 document.addEventListener('error',e=>{const t=e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){loaded++;bump()}},true);
 document.addEventListener('DOMContentLoaded',()=>o.set(94));
 let ended=false;
 const end=async()=>{
  if(ended)return;ended=true;
  try{localStorage.setItem(LD_BOOT_KEY,String(document.querySelectorAll('script[src],link[rel=stylesheet]').length))}catch(e){}
  await o.finish();
  setTimeout(()=>{d.classList.add('ld-out');setTimeout(()=>d.remove(),520)},220);
 };
 if(typeof addEventListener==='function')addEventListener('load',()=>{
  // aspetta anche i font, ma al massimo un secondo
  const f=document.fonts&&document.fonts.ready;
  Promise.race([f||Promise.resolve(),new Promise(r=>setTimeout(r,1000))]).then(end);
 });
 setTimeout(end,15000); // se qualcosa resta appeso, il gioco parte lo stesso
}

// ---- 2) salto nell'iperspazio
function ldWarpHook(){
 if(!ldUI||typeof drawHyperspace!=='function'||ldWarpHook.on)return;
 ldWarpHook.on=true;
 const cap=document.querySelector('#hyperspace .warp-caption');
 if(cap){
  const w=document.createElement('div');w.id='warpLoader';w.className='ld-warp';
  w.setAttribute('role','progressbar');w.setAttribute('aria-valuemin','0');w.setAttribute('aria-valuemax','100');
  w.innerHTML='<div class="ld-bar"><b class="ld-fill"></b></div><span class="ld-pct">0%</span>';
  cap.appendChild(w);cap.classList.add('has-ld');
 }
 const orig=drawHyperspace;
 drawHyperspace=function(t){const r=orig.apply(this,arguments);ldWarpSet(t);return r};
}
function ldWarpSet(t){
 const w=ldId('warpLoader');if(!w)return;
 const D=(typeof WARP_DURATION==='number'?WARP_DURATION:3600)/1000;
 const p=Math.max(0,Math.min(100,t/D*100)),v=Math.floor(p);
 w.querySelector('.ld-fill').style.width=p+'%';
 const s=w.querySelector('.ld-pct'),txt=v+'%';if(s.textContent!==txt)s.textContent=txt;
 w.setAttribute('aria-valuenow',String(v));
}

// ---- 3) lavori del profilo (password e crittografia)
let ldTaskObj=null;
function ldTask(label){
 let d=ldId('ldTask');
 if(!d){
  d=document.createElement('section');d.id='ldTask';d.className='overlay ld-task hidden';
  d.setAttribute('role','progressbar');d.setAttribute('aria-valuemin','0');d.setAttribute('aria-valuemax','100');
  d.innerHTML='<div class="ld-task-card"><div class="ld-ring-wrap">'+ldRing()+'<span class="ld-pct">0%</span></div><p class="ld-label" id="ldTaskLabel"></p><div class="ld-bar"><b class="ld-fill"></b></div></div>';
  document.body.appendChild(d);ldTaskObj=ldMake(d);
 }
 const o=ldTaskObj;o.reset();
 ldId('ldTaskLabel').textContent=label;d.setAttribute('aria-label',label);
 d.classList.remove('hidden');
 const t0=ldNow(),c=ldCreep(o);
 return{end:async()=>{
  // resta visibile almeno un attimo, così si vede salire fino al 100%
  const wait=Math.max(0,650-(ldNow()-t0));if(wait)await new Promise(r=>setTimeout(r,wait));
  clearInterval(c);await o.finish();
  await new Promise(r=>setTimeout(r,180));d.classList.add('hidden');
 }};
}
function ldWrap(name,label){
 const f=typeof window!=='undefined'?window[name]:null;
 if(typeof f!=='function'||f.ldWrapped)return;
 const w=async function(){
  if(!ldUI)return f.apply(this,arguments);
  const t=ldTask(label);
  try{return await f.apply(this,arguments)}finally{await t.end()}
 };
 w.ldWrapped=true;window[name]=w;
}

// ---- 4) classifica: le scritte CARICAMENTO… diventano una barra con percentuale
function ldInline(el){
 if(el.ldOn)return;el.ldOn=true;
 el.classList.add('ld-inline');el.setAttribute('role','progressbar');el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','100');
 const txt=el.textContent;
 el.innerHTML='<span class="ld-inline-txt"></span><span class="ld-bar"><b class="ld-fill"></b></span><span class="ld-pct">0%</span>';
 el.querySelector('.ld-inline-txt').textContent=txt;
 const o=ldMake(el);o.set(8);ldCreep(o,()=>el.isConnected);
}
function ldScan(root){
 if(!root||root.nodeType!==1)return;
 if(root.classList.contains('board-loading'))ldInline(root);
 for(const el of root.querySelectorAll('.board-loading'))ldInline(el);
}

if(ldUI){
 ldBoot();
 if(typeof MutationObserver!=='undefined'){
  new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)ldScan(n)}).observe(document.body,{childList:true,subtree:true});
 }
 document.addEventListener('DOMContentLoaded',()=>{
  ldScan(document.body);
  ldWarpHook();
  ldWrap('profUnpack','APERTURA DEL PROFILO');
  ldWrap('profCreate','CREAZIONE DEL PILOTA');
  ldWrap('profUnlock','VERIFICA DELLA PASSWORD');
  ldWrap('profNewPassword','CAMBIO DELLA PASSWORD');
 });
}
