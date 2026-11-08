// Vetrina della home (2026-11-08): nel riquadro della classifica mondiale si alterna un video
// con le azioni del gioco: battaglia spaziale, rientro in atmosfera, battaglia a terra, drago di UMBRA.
// Il video è registrato dal gioco vero (vetrina/azione.webm e .mp4, 640x360, 32 s, senza audio):
// il PC lo decodifica in hardware, quindi costa molto meno di una seconda partita disegnata sul canvas.
// Si ferma da solo quando si esce dalla mappa, quando la scheda è nascosta e mentre si guarda la classifica.
// Va caricato dopo classifica.js (crea #mapBoard) e dopo i18n.js (righe di traduzione).

const VET={
 src:[['vetrina/azione.webm','video/webm'],['vetrina/azione.mp4','video/mp4']],poster:'vetrina/azione.jpg',
 boardSec:14,     // secondi di classifica prima che parta il video
 firstSec:9,      // la prima volta il video parte un po' prima
 scenes:[         // da quale secondo del video inizia ogni scena
  {t:0,    label:'BATTAGLIA SPAZIALE'},
  {t:8.6,  label:'RIENTRO IN ATMOSFERA'},
  {t:13.8, label:'BATTAGLIA A TERRA'},
  {t:22.75,label:'BOSS · DRAGO DI UMBRA'}
 ]
};
const vet={seekTo:null,on:false,mode:'board',wait:VET.firstSec,el:null,video:null,ok:true,last:0,timer:0,scene:-1};

function vetScene(t){let k=0;for(let i=0;i<VET.scenes.length;i++)if(t>=VET.scenes[i].t-.05)k=i;return k}
// Il video gira solo se la mappa è davvero a schermo.
function vetVisible(){
 if(typeof document==='undefined')return false;
 if(document.hidden)return false;
 if(typeof state!=='undefined'&&state!=='map')return false;
 const scr=document.getElementById&&document.getElementById('mapScreen');
 if(scr&&scr.classList&&!scr.classList.contains('active'))return false;
 const b=vet.el;if(!b||!b.offsetParent)return false; // nascosto (schermo stretto, touch)
 return true;
}

function vetBuild(){
 if(typeof document==='undefined'||!document.createElement||!document.getElementById)return false;
 const board=document.getElementById('mapBoard'),list=document.getElementById('mapBoardList');
 if(!board||!list||document.getElementById('vetrina'))return !!document.getElementById('vetrina');
 vet.el=board;
 const head=board.querySelector('.map-board-head');
 const tabs=document.createElement('div');tabs.className='vet-tabs';
 tabs.innerHTML='<button type="button" class="vet-tab on" data-vet="board">CLASSIFICA</button><button type="button" class="vet-tab" data-vet="video">AZIONE DI GIOCO</button>';
 if(head&&head.nextSibling)board.insertBefore(tabs,head.nextSibling);else board.appendChild(tabs);
 const box=document.createElement('div');box.id='vetrina';box.className='vet-box';box.setAttribute('aria-hidden','true');
 box.innerHTML='<div class="vet-screen"><video id="vetVideo" muted playsinline preload="none" disablepictureinpicture poster="'+VET.poster+'"></video>'+
  '<span class="vet-live"><i></i>AZIONE DI GIOCO</span><b id="vetLabel" class="vet-label"></b></div>'+
  '<ol class="vet-scenes">'+VET.scenes.map((s,i)=>'<li data-i="'+i+'"><span class="n">'+(i+1)+'</span><span class="t">'+s.label+'</span><em><i></i></em></li>').join('')+'</ol>';
 list.parentNode.insertBefore(box,list.nextSibling);
 const v=document.getElementById('vetVideo');vet.video=v;
 v.muted=true;v.defaultMuted=true;v.playsInline=true;
 v.addEventListener('ended',()=>vetShow('board'));
 v.addEventListener('timeupdate',vetTick);
 for(const b of tabs.querySelectorAll('.vet-tab'))b.onclick=e=>{e.stopPropagation();vetShow(b.dataset.vet,true)};
 for(const li of box.querySelectorAll('.vet-scenes li'))li.onclick=e=>{e.stopPropagation();const s=VET.scenes[+li.dataset.i];if(s&&vet.video){if(!vet.video.getAttribute('src'))vet.seekTo=s.t+.05;else try{vet.video.currentTime=s.t+.05}catch(_){}vetShow('video',true)}};
 vetStyle();
 return true;
}

// Il file si scarica solo la prima volta che serve (preload none fino ad allora), tutto intero in memoria:
// così si può saltare a ogni scena anche con il server semplice del PC (python http.server non supporta i salti).
function vetPick(){const v=vet.video;for(const [src,type] of VET.src){try{if(!v.canPlayType||v.canPlayType(type))return src}catch(e){}}return VET.src[VET.src.length-1][0]}
function vetLoad(){const v=vet.video;if(!v||v.dataset.loaded)return;v.dataset.loaded='1';v.preload='auto';
 const src=vetPick(),fail=()=>{vet.ok=false;vetShow('board');vetTabsOff()},direct=()=>{v.addEventListener('error',fail);v.src=src};
 if(typeof fetch!=='function'||typeof URL==='undefined'||!URL.createObjectURL){direct();return}
 fetch(src).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob()}).then(b=>{
  v.addEventListener('error',fail);v.src=URL.createObjectURL(b);
  if(vet.seekTo!=null){const t=vet.seekTo;vet.seekTo=null;v.addEventListener('loadedmetadata',()=>{try{v.currentTime=t}catch(_){}},{once:true})}
  if(vet.mode==='video'&&vetVisible())vetPlay();
 }).catch(direct);
}
function vetTabsOff(){const t=vet.el&&vet.el.querySelector('.vet-tabs');if(t)t.classList.add('hidden')}
function vetPlay(){const v=vet.video;if(!v||!vet.ok)return;vetLoad();if(!v.getAttribute('src'))return;const p=v.play&&v.play();if(p&&p.catch)p.catch(()=>{})}

// Passa da classifica a video e viceversa. manual: scelto con i bottoni, ricomincia il conteggio.
function vetShow(mode,manual){
 if(!vet.el||(mode==='video'&&!vet.ok))return;
 vet.mode=mode;vet.wait=VET.boardSec;
 vet.el.classList.toggle('vet-on',mode==='video');
 for(const b of vet.el.querySelectorAll('.vet-tab'))b.classList.toggle('on',b.dataset.vet===mode);
 const box=document.getElementById('vetrina');if(box)box.setAttribute('aria-hidden',mode==='video'?'false':'true');
 const v=vet.video;
 if(mode==='video'){
  if(v&&(v.ended||(!manual&&v.currentTime>0))){try{v.currentTime=0}catch(_){}}
  if(vetVisible())vetPlay();
 }else if(v&&v.pause)v.pause();
 vetTick();
}

function vetTick(){
 const v=vet.video;if(!v)return;
 const t=v.currentTime||0,k=vetScene(t);
 if(k!==vet.scene){vet.scene=k;const l=document.getElementById('vetLabel');if(l)l.textContent=VET.scenes[k].label;
  const box=document.getElementById('vetrina');if(box)for(const li of box.querySelectorAll('.vet-scenes li'))li.classList.toggle('on',+li.dataset.i===k)}
 const box=document.getElementById('vetrina');if(!box)return;
 const s=VET.scenes[k],next=VET.scenes[k+1],end=next?next.t:(v.duration||s.t+8);
 const bar=box.querySelector('.vet-scenes li.on em i');if(bar)bar.style.width=Math.max(0,Math.min(100,(t-s.t)/Math.max(.1,end-s.t)*100))+'%';
}

// Un controllo ogni mezzo secondo: conta il tempo della classifica, ferma o riprende il video.
function vetStep(){
 if(!vet.el&&!vetBuild())return;
 const vis=vetVisible(),v=vet.video;
 if(vet.mode==='video'){
  if(!vis){if(v&&!v.paused)v.pause()}
  else if(v&&v.paused&&!v.ended)vetPlay();
 }else if(vis&&vet.ok&&!vetReduced()){
  vet.wait-=.5;if(vet.wait<=0)vetShow('video');
 }
}
function vetReduced(){try{return !!(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}

function vetStyle(){
 if(document.getElementById('vetStyle'))return;
 const s=document.createElement('style');s.id='vetStyle';
 s.textContent=
 '.vet-tabs{display:flex;gap:4px;margin:-2px 0 8px;padding:3px;border:1px solid rgba(140,233,236,.18);border-radius:9px;background:rgba(3,10,18,.5)}'+
 '.vet-tab{flex:1;padding:5px 6px;border:0;border-radius:6px;background:transparent;color:var(--muted,#8aa3b5);font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:1.6px;cursor:pointer;transition:background .2s,color .2s}'+
 '.vet-tab:hover{color:#d7f6ff}.vet-tab.on{background:rgba(81,230,255,.16);color:#bff8ff;box-shadow:inset 0 0 0 1px rgba(81,230,255,.45)}'+
 '.vet-box{display:none}.map-board.vet-on .vet-box{display:block;animation:vet-in .35s ease-out}'+
 '.map-board.vet-on .map-board-list,.map-board.vet-on .map-board-all{display:none}'+
 '.vet-screen{position:relative;aspect-ratio:16/9;border-radius:9px;overflow:hidden;background:#02070d;box-shadow:0 0 0 1px rgba(140,233,236,.3),0 10px 26px #0009}'+
 '.vet-screen video{display:block;width:100%;height:100%;object-fit:cover}'+
 '.vet-live{position:absolute;left:7px;top:7px;display:flex;align-items:center;gap:5px;padding:2px 7px;border-radius:999px;background:rgba(2,8,14,.72);color:#ffd2d8;font:700 8.5px "Chakra Petch",sans-serif;letter-spacing:1.4px}'+
 '.vet-live i{width:6px;height:6px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 6px #ff4d6a;animation:vet-blink 1.4s ease-in-out infinite}'+
 '.vet-label{position:absolute;left:0;right:0;bottom:0;padding:16px 9px 6px;background:linear-gradient(transparent,rgba(2,8,14,.88));color:#fff;font:700 11px "Chakra Petch",sans-serif;letter-spacing:1.8px;text-shadow:0 0 8px rgba(81,230,255,.7)}'+
 '.vet-scenes{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:3px}'+
 '.vet-scenes li{position:relative;display:grid;grid-template-columns:20px 1fr;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;color:#9fb6c7;font:500 10.5px "Chakra Petch",sans-serif;letter-spacing:1px;cursor:pointer;overflow:hidden}'+
 '.vet-scenes li:hover{background:rgba(81,230,255,.06);color:#d7f6ff}'+
 '.vet-scenes li .n{color:var(--muted,#8aa3b5);font-weight:700;text-align:center}'+
 '.vet-scenes li.on{background:rgba(81,230,255,.12);color:#fff;box-shadow:inset 2px 0 0 var(--cyan,#51e6ff)}.vet-scenes li.on .n{color:var(--cyan,#51e6ff)}'+
 '.vet-scenes li em{position:absolute;left:0;right:0;bottom:0;height:2px;display:none}.vet-scenes li.on em{display:block}'+
 '.vet-scenes li em i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan,#51e6ff),#bff8ff)}'+
 '@keyframes vet-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'+
 '@keyframes vet-blink{50%{opacity:.25}}'+
 '@media(prefers-reduced-motion:reduce){.vet-live i,.map-board.vet-on .vet-box{animation:none}}';
 document.head.appendChild(s);
}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["AZIONE DI GIOCO","GAMEPLAY","EN ACTION","EN ACCIÓN","ИГРОВОЙ ПРОЦЕСС","游戏实况","ゲームプレイ"],
  ["CLASSIFICA","LEADERBOARD","CLASSEMENT","CLASIFICACIÓN","РЕЙТИНГ","排行榜","ランキング"],
  ["BATTAGLIA SPAZIALE","SPACE BATTLE","BATAILLE SPATIALE","BATALLA ESPACIAL","КОСМИЧЕСКИЙ БОЙ","太空战斗","宇宙戦"],
  ["RIENTRO IN ATMOSFERA","ATMOSPHERIC ENTRY","ENTRÉE ATMOSPHÉRIQUE","ENTRADA ATMOSFÉRICA","ВХОД В АТМОСФЕРУ","进入大气层","大気圏突入"],
  ["BATTAGLIA A TERRA","GROUND BATTLE","BATAILLE AU SOL","BATALLA EN TIERRA","НАЗЕМНЫЙ БОЙ","地面战斗","地上戦"],
  ["BOSS · DRAGO DI UMBRA","BOSS · DRAGON OF UMBRA","BOSS · DRAGON D’UMBRA","JEFE · DRAGÓN DE UMBRA","БОСС · ДРАКОН УМБРЫ","头目 · UMBRA之龙","ボス · UMBRAのドラゴン"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}

if(typeof document!=='undefined'&&document.getElementById&&typeof setInterval==='function'){
 vetBuild();
 vet.timer=setInterval(vetStep,500);
 if(document.addEventListener)document.addEventListener('visibilitychange',vetStep);
}
