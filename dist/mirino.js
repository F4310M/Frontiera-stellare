// Conex — MIRINO NUOVO (2026-11-10), nello spazio (#crosshair) e a terra (#pfCrosshair).
// - Disegno più leggibile su ogni sfondo: anello a quattro archi, quattro tacche e punto centrale,
//   con un bordo scuro sotto le linee chiare.
// - Nemico sotto il mirino: diventa rosso, le tacche si stringono e l'anello gira (bersaglio agganciato).
// - Ogni colpo sparato: piccolo rinculo delle tacche.
// - Colpo a segno: crocetta bianca; nemico abbattuto: crocetta rossa più grande.
// - Mentre carichi il mega colpo un anello si riempie attorno al mirino.
// Solo classi e una variabile CSS cambiano a ogni fotogramma (niente lavoro sul canvas).
// Va caricato dopo rifiniture.js (usa rfGroundTargets per i nemici a terra).

const MIR={
 near:16,        // px oltre il raggio del nemico entro cui il mirino lo considera "sotto tiro"
 groundNear:34,  // a terra: distanza dal centro del nemico
 kick:.12,       // s di rinculo dopo un colpo
 hit:.16,        // s della crocetta di colpo a segno
 kill:.38        // s della crocetta di nemico abbattuto
};
const mir={els:[],last:{},hp:null,kills:null,shots:null,kickT:0,hitT:0,killT:0,t:0};

const MIR_SVG=`<svg class="mir-svg" viewBox="-32 -32 64 64" aria-hidden="true" focusable="false">
 <g class="mir-ring"><path d="M-6.2-23.2A24 24 0 0 0-23.2-6.2M23.2-6.2A24 24 0 0 0 6.2-23.2M6.2 23.2A24 24 0 0 0 23.2 6.2M-23.2 6.2A24 24 0 0 0-6.2 23.2"/></g>
 <circle class="mir-charge" r="27" pathLength="100"/>
 <g class="mir-ticks"><path class="mir-t" d="M0-19v-8"/><path class="mir-t" d="M0 19v8"/><path class="mir-t" d="M-19 0h-8"/><path class="mir-t" d="M19 0h8"/></g>
 <circle class="mir-dot" r="1.8"/>
 <g class="mir-x"><path d="M-12-12l-6-6M12-12l6-6M12 12l6 6M-12 12l-6 6"/></g>
</svg>`;

function mirSetup(){
 if(typeof document==='undefined'||!document.getElementById)return;
 for(const id of ['crosshair','pfCrosshair']){
  const el=document.getElementById(id);if(!el||el.dataset.mir)continue;
  el.dataset.mir='1';el.classList.add('mir');el.innerHTML=MIR_SVG;mir.els.push(el);
 }
}
function mirZoom(){return typeof camZoom!=='undefined'&&camZoom>0?camZoom:1}

// ---------------------------------------------------------------- nello spazio
function mirSpaceInfo(){
 const out={target:false,hp:0,kills:typeof kills==='number'?kills:0,shots:0,charge:0};
 if(!player)return out;
 const z=mirZoom(),mx=mouse.x,my=mouse.y;
 const check=list=>{if(!list)return;for(const e of list){
  if(!(e.hp>0))continue;out.hp+=e.hp;
  if(out.target)continue;
  const sx=(e.x-player.x)*z+W/2,sy=(e.y-player.y)*z+H/2,r=(e.r||20)*z+MIR.near;
  if(Math.abs(sx-mx)<r&&Math.abs(sy-my)<r&&Math.hypot(sx-mx,sy-my)<r)out.target=true;
 }};
 check(typeof enemies!=='undefined'?enemies:null);
 check(typeof monsters!=='undefined'?monsters:null);
 for(const b of (typeof bullets!=='undefined'?bullets:[]))if(b.friendly)out.shots++;
 if(typeof mc!=='undefined'&&mc.held&&typeof mcLevel==='function')out.charge=mcLevel();
 return out;
}
// ---------------------------------------------------------------- a terra
function mirGroundInfo(){
 const out={target:false,hp:0,kills:pf.kills||0,shots:0,charge:0};
 for(const e of pf.enemies)if(e.hp>0)out.hp+=e.hp;
 if(pf.boss&&pf.boss.hp>0)out.hp+=pf.boss.hp;
 const T=typeof rfGroundTargets==='function'?rfGroundTargets():[];
 for(const t of T)if(Math.hypot(t.x-mouse.x,t.y-mouse.y)<MIR.groundNear){out.target=true;break}
 // il boss è grande: basta il mirino dentro la sua sagoma
 if(!out.target&&pf.boss&&pf.boss.hp>0&&typeof pfBossRect==='function'){
  const s=pfScale(),r=pfBossRect(pf.boss),x=pf.cam.x+mouse.x/s,y=mouse.y/s;
  if(x>r.l&&x<r.r&&y>r.t&&y<r.b)out.target=true;
 }
 for(const b of pf.shots)if(b.friendly)out.shots++;
 const P=pf.pilot;
 if(P&&typeof PF_RIFLE_START!=='undefined'&&P.rifleCharge>PF_RIFLE_START&&typeof pfRifleLevel==='function')out.charge=pfRifleLevel(P.rifleCharge);
 return out;
}

function mirSet(el,cls,on){if(el.classList.contains(cls)!==on)el.classList.toggle(cls,on)}
function mirStep(){
 if(!mir.els.length)mirSetup();
 const now=performance.now()/1000,dt=Math.min(.1,Math.max(0,now-(mir.t||now)));mir.t=now;
 let info=null,mode='';
 try{
  if(state==='play'&&player&&!player.destroyed){info=mirSpaceInfo();mode='space'}
  else if(state==='platform'&&typeof pf!=='undefined'&&pf&&pf.enemies){info=mirGroundInfo();mode='ground'}
 }catch(e){info=null}
 if(!info){mir.hp=mir.kills=mir.shots=null;mir.mode='';return}
 if(mode!==mir.mode){mir.mode=mode;mir.hp=info.hp;mir.kills=info.kills;mir.shots=info.shots}
 if(!paused){
  if(info.kills>mir.kills)mir.killT=MIR.kill;
  else if(info.hp<mir.hp-.001)mir.hitT=Math.max(mir.hitT,MIR.hit);
  if(info.shots>mir.shots)mir.kickT=MIR.kick;
  mir.kickT=Math.max(0,mir.kickT-dt);mir.hitT=Math.max(0,mir.hitT-dt);mir.killT=Math.max(0,mir.killT-dt);
 }
 mir.hp=info.hp;mir.kills=info.kills;mir.shots=info.shots;
 const el=document.getElementById(mode==='space'?'crosshair':'pfCrosshair');if(!el)return;
 mirSet(el,'mir-on',info.target);
 mirSet(el,'mir-kick',mir.kickT>0);
 mirSet(el,'mir-hit',mir.hitT>0&&mir.killT<=0);
 mirSet(el,'mir-kill',mir.killT>0);
 mirSet(el,'mir-charging',info.charge>0);
 const c=Math.round(info.charge*100);
 if(mir.last[el.id]!==c){mir.last[el.id]=c;el.style.setProperty('--mir-c',String(100-c))}
}
if(typeof draw==='function'){
 const o=draw;
 draw=function(...a){const r=o.apply(this,a);try{mirStep()}catch(e){}return r};
}

const MIR_CSS=`
.crosshair.mir{width:64px;height:64px;border:0;border-radius:0;box-shadow:none;background:none}
.crosshair.mir:before,.crosshair.mir:after{display:none}
.mir .mir-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none;stroke-linecap:round;
 --mir-col:#7ff0ff;--mir-glow:rgba(81,230,255,.55)}
.mir .mir-svg path,.mir .mir-svg circle{transition:stroke .12s,opacity .12s}
.mir .mir-ring path{stroke:var(--mir-col);stroke-width:1.7;opacity:.75;paint-order:stroke}
.mir .mir-ring{transform-origin:0 0;transition:transform .25s ease-out}
.mir .mir-t{stroke:var(--mir-col);stroke-width:2.4;transition:transform .14s ease-out,stroke .12s}
.mir .mir-dot{fill:var(--mir-col);stroke:#02101b;stroke-width:1}
.mir .mir-svg{filter:drop-shadow(0 0 1.2px #02101b) drop-shadow(0 0 1.2px #02101b) drop-shadow(0 0 5px var(--mir-glow))}
.mir .mir-charge{stroke:#d8f8ff;stroke-width:2.6;stroke-dasharray:100;stroke-dashoffset:var(--mir-c,100);opacity:0;transform:rotate(-90deg)}
.mir.mir-charging .mir-charge{opacity:.95}
.mir .mir-x{opacity:0;stroke:#ffffff;stroke-width:2.6;transform-origin:0 0}
/* bersaglio sotto tiro */
.mir.mir-on .mir-svg{--mir-col:#ff5a6a;--mir-glow:rgba(255,70,90,.7)}
.mir.mir-on .mir-ring{animation:mirSpin 1.6s linear infinite}
.mir.mir-on .mir-t:nth-child(1){transform:translateY(5px)}
.mir.mir-on .mir-t:nth-child(2){transform:translateY(-5px)}
.mir.mir-on .mir-t:nth-child(3){transform:translateX(5px)}
.mir.mir-on .mir-t:nth-child(4){transform:translateX(-5px)}
/* rinculo */
.mir.mir-kick .mir-t:nth-child(1){transform:translateY(-4px)}
.mir.mir-kick .mir-t:nth-child(2){transform:translateY(4px)}
.mir.mir-kick .mir-t:nth-child(3){transform:translateX(-4px)}
.mir.mir-kick .mir-t:nth-child(4){transform:translateX(4px)}
/* colpo a segno / nemico abbattuto */
.mir.mir-hit .mir-x{opacity:1}
.mir.mir-kill .mir-x{opacity:1;stroke:#ff3048;stroke-width:3.2;animation:mirKill .38s ease-out}
@keyframes mirSpin{to{transform:rotate(90deg)}}
@keyframes mirKill{from{transform:scale(.6)}to{transform:scale(1.25)}}
@media(max-width:850px){.crosshair.mir{width:54px;height:54px}}
@media(prefers-reduced-motion:reduce){.mir.mir-on .mir-ring,.mir.mir-kill .mir-x{animation:none}}
`;
if(typeof document!=='undefined'&&document.head&&document.createElement&&!document.getElementById('mirCss')){
 const st=document.createElement('style');st.id='mirCss';st.textContent=MIR_CSS;document.head.appendChild(st);
}
mirSetup();
