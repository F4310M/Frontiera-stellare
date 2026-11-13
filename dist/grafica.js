// Conex — GRAFICA (2026-11-14): preset di qualità BASSO / MEDIO / ALTO / ULTRA, limite dei fotogrammi
// e contatore FPS, in una sezione GRAFICA delle impostazioni.
// - La risoluzione del disegno dipende da PIXEL_BUDGET (game.js, pixel massimi del canvas) e da targetDpr().
//   ULTRA arriva al 4K vero (8,3 milioni di pixel) e oltre: su uno schermo 1080p disegna in 4K e rimpicciolisce
//   (immagine più nitida); niente abbassamento automatico della qualità.
// - ALTO è il gioco come era prima (4,2 milioni di pixel, qualità che scende da sola se il PC rallenta).
//   È il preset di partenza nel browser; nell'app desktop (Electron) si parte da ULTRA.
// - Il limite dei fotogrammi (30 / 60 / SCHERMO) vale solo per il ciclo del gioco (loop di game.js):
//   con SCHERMO il gioco va alla frequenza del monitor (120/144 Hz se c'è).
// Va caricato dopo game.js, impostazioni.js e caffe.js.
const GRAFICA_KEY='stellarGrafica';
const GRAFICA_PRESET={
 basso:{name:'BASSO',sub:'PC lenti e portatili',budget:1.2e6,maxDpr:1,auto:true},
 medio:{name:'MEDIO',sub:'Equilibrio',budget:2.6e6,maxDpr:2,auto:true},
 alto:{name:'ALTO',sub:'Come prima, qualità automatica',budget:4.2e6,maxDpr:3,auto:true},
 ultra:{name:'ULTRA',sub:'4K, nessun taglio di qualità',budget:9e6,maxDpr:3,auto:false}
};
const GRAFICA_FPS=[0,60,30];// 0 = frequenza dello schermo
const grfx={p:'alto',fps:0,mostra:false,shown:0,frames:0,fpsT:0,fpsVal:0,lastLoop:0,el:null,gpu:''};
function gfxDesktop(){try{return typeof navigator!=='undefined'&&/Electron/i.test(navigator.userAgent||'')}catch(e){return false}}
function gfxLoad(){
 let o=null;try{o=JSON.parse(localStorage.getItem(GRAFICA_KEY)||'null')}catch(e){}
 grfx.p=o&&GRAFICA_PRESET[o.p]?o.p:(gfxDesktop()?'ultra':'alto');
 grfx.fps=o&&GRAFICA_FPS.includes(o.fps)?o.fps:0;
 grfx.mostra=!!(o&&o.mostra);
}
function gfxSave(){try{localStorage.setItem(GRAFICA_KEY,JSON.stringify({p:grfx.p,fps:grfx.fps,mostra:grfx.mostra}))}catch(e){}}
// risoluzione di disegno per uno schermo W×H (pixel CSS) con densità nat
function gfxDpr(preset,w,h,nat,quality){
 const P=GRAFICA_PRESET[preset]||GRAFICA_PRESET.alto;nat=nat||1;
 const want=Math.min(P.maxDpr,Math.max(nat,2)),cap=Math.sqrt(P.budget/Math.max(1,w*h));
 return Math.max(1,Math.min(want,Math.max(cap,Math.min(nat,1)))*(P.auto?(quality||1):1));
}
function gfxApply(){
 const P=GRAFICA_PRESET[grfx.p];
 try{PIXEL_BUDGET=P.budget}catch(e){}
 try{renderQuality=1;frameSamples=[];qualityDrops=0;qualityGood=0}catch(e){}
 try{if(typeof applyCanvasScale==='function'&&typeof canvas!=='undefined'&&canvas)applyCanvasScale()}catch(e){}
 gfxInfo();
}
// targetDpr e adaptQuality di game.js seguono il preset
if(typeof targetDpr==='function'){
 targetDpr=function(){return gfxDpr(grfx.p,W,H,typeof devicePixelRatio==='number'?devicePixelRatio:1,renderQuality)};
}
if(typeof adaptQuality==='function'){
 const orig=adaptQuality;
 adaptQuality=function(ms){if(!GRAFICA_PRESET[grfx.p].auto)return;return orig.apply(this,arguments)};
}
// limite dei fotogrammi e contatore FPS: solo per il ciclo del gioco
if(typeof window!=='undefined'&&typeof window.requestAnimationFrame==='function'&&typeof loop==='function'){
 const raf=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=function(cb){
  if(cb!==loop)return raf(cb);
  const step=t=>{
   if(grfx.fps&&grfx.lastLoop&&t-grfx.lastLoop<1000/grfx.fps-1.5)return raf(step);
   grfx.lastLoop=t;gfxCount(t);return cb(t);
  };
  return raf(step);
 };
}
function gfxCount(t){
 grfx.frames++;
 if(!grfx.fpsT)grfx.fpsT=t;
 if(t-grfx.fpsT>=500){grfx.fpsVal=Math.round(grfx.frames*1000/(t-grfx.fpsT));grfx.frames=0;grfx.fpsT=t;gfxFpsDraw()}
}
function gfxFpsDraw(){
 if(typeof document==='undefined'||!document.body)return;
 if(!grfx.mostra){if(grfx.el)grfx.el.hidden=true;return}
 if(!grfx.el){grfx.el=document.createElement('div');grfx.el.id='gfxFps';document.body.appendChild(grfx.el)}
 grfx.el.hidden=false;
 const c=typeof canvas!=='undefined'&&canvas?canvas.width+'×'+canvas.height:'';
 grfx.el.textContent=grfx.fpsVal+' FPS'+(c?' · '+c:'');
}
// nome della scheda video (per vedere se si usa quella potente)
function gfxGpu(){
 if(grfx.gpu)return grfx.gpu;
 try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return '';
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  let n=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  n=String(n||'').replace(/^ANGLE \((.*)\)$/,'$1').replace(/\s*\(0x[0-9a-f]+\)/ig,'').replace(/\s*Direct3D.*$/i,'').replace(/^[^,]*,\s*/,'');
  const lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();
  grfx.gpu=n.slice(0,80);
 }catch(e){}
 return grfx.gpu;
}
const GFX_T=s=>typeof tr==='function'?tr(s):s;
function gfxInfo(){
 if(typeof document==='undefined')return;
 const el=document.getElementById('gfxInfo');if(!el)return;
 const w=typeof canvas!=='undefined'&&canvas?canvas.width:0,h=typeof canvas!=='undefined'&&canvas?canvas.height:0;
 const gpu=gfxGpu();
 el.textContent=GFX_T('RISOLUZIONE DI DISEGNO')+': '+w+'×'+h+(gpu?' · '+GFX_T('SCHEDA VIDEO')+': '+gpu:'');
 for(const b of document.querySelectorAll('#spPanel-grafica [data-grfx]'))b.classList.toggle('on',b.dataset.grfx===grfx.p);
 for(const b of document.querySelectorAll('#spPanel-grafica [data-fps]'))b.classList.toggle('on',+b.dataset.fps===grfx.fps);
 const m=document.getElementById('gfxMostra');if(m)m.classList.toggle('on',grfx.mostra);
}
function gfxIco(n){return typeof ico==='function'?ico(n):''}
function gfxPanel(){
 if(typeof document==='undefined'||!document.querySelector||document.getElementById('spPanel-grafica'))return null;
 const nav=document.querySelector('#settingsOverlay .sp-nav'),body=document.querySelector('#settingsOverlay .sp-body');
 if(!nav||!body)return null;
 if(typeof ICONS!=='undefined')ICONS.monitor=ICONS.monitor||'<rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M8.5 20h7M12 16.5V20"/>';
 if(typeof IMP_TABS!=='undefined'&&!IMP_TABS.some(t=>t.id==='grafica')){
  const i=IMP_TABS.findIndex(t=>t.id==='audio');IMP_TABS.splice(i>=0?i+1:IMP_TABS.length,0,{id:'grafica',icon:'monitor',name:'GRAFICA',sub:'Qualità, 4K, fotogrammi'});
 }
 const b=document.createElement('button');b.type='button';b.className='sp-tab';b.setAttribute('role','tab');b.dataset.tab='grafica';b.setAttribute('aria-controls','spPanel-grafica');
 b.setAttribute('aria-selected','false');b.tabIndex=-1;
 b.innerHTML=gfxIco('monitor')+'<span><b>GRAFICA</b><small>Qualità, 4K, fotogrammi</small></span>';
 const audio=nav.querySelector('.sp-tab[data-tab="audio"]');nav.insertBefore(b,audio?audio.nextSibling:null);
 b.onclick=()=>{if(typeof impShow==='function')impShow('grafica');gfxInfo();if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 b.onkeydown=e=>{const k={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.code];if(!k||typeof impStep!=='function')return;e.preventDefault();e.stopPropagation();impStep(k);const a=nav.querySelector('.sp-tab.active');if(a)a.focus()};
 const p=document.createElement('section');p.className='sp-panel';p.id='spPanel-grafica';p.dataset.tab='grafica';p.setAttribute('role','tabpanel');p.hidden=true;
 p.innerHTML='<header class="sp-panel-head"><h3>GRAFICA</h3><p>Qualità dell’immagine e fotogrammi al secondo.</p></header><div class="sp-stack">'+
  '<div class="setting-block"><div class="setting-title"><span>QUALITÀ</span></div><div class="grfx-grid">'+
  Object.keys(GRAFICA_PRESET).map(k=>'<button type="button" class="grfx-opt" data-grfx="'+k+'"><b>'+GRAFICA_PRESET[k].name+'</b><small>'+GRAFICA_PRESET[k].sub+'</small></button>').join('')+
  '</div><p class="grfx-info" id="gfxInfo"></p></div>'+
  '<div class="setting-block"><div class="setting-title"><span>FOTOGRAMMI AL SECONDO</span></div><div class="grfx-grid grfx-fps">'+
  GRAFICA_FPS.map(f=>'<button type="button" class="grfx-opt" data-fps="'+f+'"><b>'+(f?f+' FPS':'SCHERMO')+'</b><small>'+(f?'Limite fisso':'60 / 120 / 144 Hz')+'</small></button>').join('')+
  '</div><button type="button" class="grfx-opt grfx-toggle" id="gfxMostra"><b>MOSTRA FPS</b><small>Contatore in alto a sinistra</small></button></div>'+
  '</div>';
 body.appendChild(p);
 for(const el of p.querySelectorAll('[data-grfx]'))el.onclick=()=>{grfx.p=el.dataset.grfx;gfxSave();gfxApply();if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 for(const el of p.querySelectorAll('[data-fps]'))el.onclick=()=>{grfx.fps=+el.dataset.fps;grfx.lastLoop=0;gfxSave();gfxInfo();if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 p.querySelector('#gfxMostra').onclick=()=>{grfx.mostra=!grfx.mostra;gfxSave();gfxInfo();gfxFpsDraw();if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 let last=null;try{last=localStorage.getItem(typeof IMP_TAB_KEY!=='undefined'?IMP_TAB_KEY:'')}catch(e){}
 if(last==='grafica'&&typeof impShow==='function')impShow('grafica',false);
 gfxInfo();
 return p;
}

gfxLoad();
try{gfxApply();gfxPanel();if(typeof i18nApply==='function')i18nApply()}catch(e){}
if(typeof addEventListener==='function')addEventListener('resize',()=>setTimeout(gfxInfo,50));

// traduzioni
if(typeof I18N_ROWS!=='undefined'){
 for(const r of [
  ["GRAFICA","GRAPHICS","GRAPHISMES","GRÁFICOS","ГРАФИКА","画面","グラフィック"],
  ["Qualità, 4K, fotogrammi","Quality, 4K, frame rate","Qualité, 4K, images/s","Calidad, 4K, fotogramas","Качество, 4K, кадры","画质、4K、帧率","画質・4K・フレームレート"],
  ["Qualità dell’immagine e fotogrammi al secondo.","Image quality and frames per second.","Qualité de l’image et images par seconde.","Calidad de imagen y fotogramas por segundo.","Качество изображения и кадры в секунду.","画面质量和每秒帧数。","画質と1秒あたりのフレーム数。"],
  ["QUALITÀ","QUALITY","QUALITÉ","CALIDAD","КАЧЕСТВО","画质","画質"],
  ["BASSO","LOW","BAS","BAJO","НИЗКОЕ","低","低"],
  ["MEDIO","MEDIUM","MOYEN","MEDIO","СРЕДНЕЕ","中","中"],
  ["ALTO","HIGH","ÉLEVÉ","ALTO","ВЫСОКОЕ","高","高"],
  ["ULTRA","ULTRA","ULTRA","ULTRA","УЛЬТРА","极致","ウルトラ"],
  ["PC lenti e portatili","Slow PCs and laptops","PC lents et portables","PC lentos y portátiles","Слабые ПК и ноутбуки","低配电脑和笔记本","低スペックPC・ノート"],
  ["Equilibrio","Balanced","Équilibré","Equilibrado","Баланс","均衡","バランス"],
  ["Come prima, qualità automatica","As before, automatic quality","Comme avant, qualité automatique","Como antes, calidad automática","Как раньше, авто-качество","与之前相同，自动画质","従来どおり、自動画質"],
  ["4K, nessun taglio di qualità","4K, no quality cuts","4K, aucune baisse de qualité","4K, sin recortes de calidad","4K, без снижения качества","4K，不降低画质","4K、画質を下げない"],
  ["FOTOGRAMMI AL SECONDO","FRAMES PER SECOND","IMAGES PAR SECONDE","FOTOGRAMAS POR SEGUNDO","КАДРЫ В СЕКУНДУ","每秒帧数","フレームレート"],
  ["SCHERMO","DISPLAY","ÉCRAN","PANTALLA","ЭКРАН","显示器","画面"],
  ["Limite fisso","Fixed limit","Limite fixe","Límite fijo","Фиксированный предел","固定上限","固定上限"],
  ["MOSTRA FPS","SHOW FPS","AFFICHER FPS","MOSTRAR FPS","ПОКАЗАТЬ FPS","显示 FPS","FPS を表示"],
  ["Contatore in alto a sinistra","Counter in the top left","Compteur en haut à gauche","Contador arriba a la izquierda","Счётчик слева вверху","左上角计数器","左上にカウンター"],
  ["RISOLUZIONE DI DISEGNO","RENDER RESOLUTION","RÉSOLUTION DE RENDU","RESOLUCIÓN DE RENDERIZADO","РАЗРЕШЕНИЕ ОТРИСОВКИ","渲染分辨率","描画解像度"],
  ["SCHEDA VIDEO","GRAPHICS CARD","CARTE GRAPHIQUE","TARJETA GRÁFICA","ВИДЕОКАРТА","显卡","グラフィックカード"]
 ])if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)i18nApply()}catch(e){}
}
