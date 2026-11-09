// Rifiniture 2026-11-08 (stile in rifiniture.css):
// 1) barra della conquista orbitale evidenziata mentre si carica (classe .capturing)
// 2) mirino dei missili solo se puoi ancora lanciarne uno (crediti sufficienti)
// 3) suono metallico quando un tuo colpo centra lo scafo di una nave nemica
// 4) il mouse resta dentro il gioco (blocco del puntatore): con due schermi non scappa più
//    sull'altro monitor e il gioco non va in pausa da solo. Il cursore diventa virtuale:
//    i movimenti spostano mouse.x/y e gli eventi del mouse ricevono quelle coordinate.
// 5) a terra: il mirino è attirato leggermente dai nemici vicini e, se c'è un nemico alle
//    spalle e nessuno davanti, muovere il mouse all'indietro gira subito il pilota verso di lui.
// Va caricato dopo megacolpo.js.

const RF={
 magnet:150,       // px sullo schermo: entro questa distanza il mirino sente un nemico
 pull:.35,         // quanto del movimento del mouse viene piegato verso il nemico
 flipMin:3,        // px di movimento all'indietro che fanno girare il pilota
 hitGap:.05,       // s minimi tra due suoni di scafo colpito
 anelloEntra:160,  // distanza dal bordo del pianeta in cui la freccia sparisce (come la conquista)
 anelloEsci:220    // distanza in cui la freccia ritorna (margine contro lo sfarfallio)
};
const rf={hitT:0};
const rfOrig={update,updateTargetLock,destroyableHit,togglePause,startGame,startPlatform:typeof startPlatform==='function'?startPlatform:null};

// ---------------------------------------------------------------- 1) barra della conquista
function rfCapture(){
 const box=document.querySelector('.capture-status');if(!box||!box.classList)return;
 const on=state==='play'&&typeof capture==='number'&&capture>0;
 if(box.classList.contains('capturing')!==on)box.classList.toggle('capturing',on);
 rfAnello();
}
// Dentro l'anello del pianeta: niente freccia in alto, la barra di conquista sale al suo posto.
function rfAnello(){
 const hud=document.getElementById&&document.getElementById('hud');if(!hud||!hud.classList)return;
 const was=hud.classList.contains('in-anello');
 let on=false;
 if(state==='play'&&world&&player){
  const d=Math.hypot(player.x-world.x,player.y-world.y);
  on=d<world.r+(was?RF.anelloEsci:RF.anelloEntra);
 }
 if(was!==on)hud.classList.toggle('in-anello',on);
}

// ---------------------------------------------------------------- 2) mirino dei missili
function rfMissileAvailable(){return !!missile||wingMissiles.length>0||canPay('missile',1)}
updateTargetLock=function(dt){
 if(rfMissileAvailable())return rfOrig.updateTargetLock(dt);
 if(lockTarget)lockTarget.lockSoundPlayed=false;
 lockTarget=null;lockProgress=0;
 if(typeof MA!=='undefined'&&MA.extra)MA.extra=[];
 const el=$('missileStatus');
 if(el){el.textContent='MISSILI ESAURITI · CREDITI INSUFFICIENTI';el.classList.toggle('locked',false)}
};

// ---------------------------------------------------------------- 3) scafo nemico colpito
destroyableHit=function(entity,n,...rest){
 const ship=!enemyFire&&entity&&entity.hp>0&&typeof enemies!=='undefined'&&enemies.includes(entity);
 const killed=rfOrig.destroyableHit(entity,n,...rest);
 if(ship&&!killed)rfHullSound(entity);
 return killed;
};
function rfHullSound(e){
 const now=performance.now()/1000;
 if(now-rf.hitT<RF.hitGap||!soundEnabled)return;
 rf.hitT=now;
 const big=e.big||e.gen||(e.r||0)>30?1:0;
 // colpo secco sulla lamiera: battito basso + squillo metallico + crepitio
 tone(big?110:150,.09,'square',.03,big?55:80);
 tone(big?620:880,.16,'triangle',.022,big?420:600);
 tone(big?931:1320,.12,'sine',.012,big?700:990);
 noise(.07,.035,3200);
}

// ---------------------------------------------------------------- 4) mouse bloccato nel gioco
function rfCanLock(){
 return typeof document!=='undefined'&&canvas&&typeof canvas.requestPointerLock==='function'&&
  !(typeof touch!=='undefined'&&touch&&touch.on)&&!paused&&(state==='play'||state==='platform');
}
function rfLocked(){return typeof document!=='undefined'&&document.pointerLockElement===canvas}
function rfLock(){
 if(!rfCanLock()||rfLocked())return;
 try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(e){}
}
function rfUnlock(){if(rfLocked()&&document.exitPointerLock)document.exitPointerLock()}
function rfClamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rfSetClient(e,x,y){
 try{Object.defineProperty(e,'clientX',{value:x,configurable:true});Object.defineProperty(e,'clientY',{value:y,configurable:true})}catch(err){}
}
if(typeof addEventListener==='function'){
 // movimento: il cursore virtuale si sposta e resta dentro lo schermo
 addEventListener('mousemove',e=>{
  if(!rfLocked())return;
  const dx=e.movementX||0,dy=e.movementY||0;
  let x=rfClamp(mouse.x+dx,0,W-1),y=rfClamp(mouse.y+dy,0,H-1);
  if(state==='platform'&&!paused){const a=rfGroundAim(x,y,dx,dy);x=a.x;y=a.y}
  rfSetClient(e,x,y);
 },true);
 // clic: arrivano con la posizione del cursore virtuale; un clic sul gioco riaggancia il mouse
 for(const t of ['mousedown','mouseup','click','auxclick'])addEventListener(t,e=>{
  if(rfLocked())rfSetClient(e,mouse.x,mouse.y);
  else if(t==='mousedown'&&e.target===canvas)rfLock();
 },true);
 // perso il blocco (Esc, Alt+Tab) durante la battaglia a terra: pausa, come nello spazio
 if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('pointerlockchange',()=>{
  if(!rfLocked()&&state==='platform'&&!paused)togglePause();
 });
}
togglePause=function(...a){
 const r=rfOrig.togglePause.apply(this,a);
 if(paused)rfUnlock();else rfLock();
 return r;
};
startGame=function(...a){const r=rfOrig.startGame.apply(this,a);rfLock();return r};
if(rfOrig.startPlatform)startPlatform=function(...a){const r=rfOrig.startPlatform.apply(this,a);rfLock();return r};

// ---------------------------------------------------------------- 5) mira assistita a terra
function rfGroundTargets(){
 const out=[];if(typeof pf==='undefined'||!pf||!pf.enemies)return out;
 const s=pfScale();
 for(const e of pf.enemies){
  if(!(e.hp>0)||!pfOnScreen(e.x,0))continue;
  const r=pfRect(e);out.push({x:((r.l+r.r)/2-pf.cam.x)*s,y:(r.t+(r.b-r.t)*.4)*s,wx:e.x});
 }
 const B=pf.boss;
 if(B&&B.hp>0&&!B.gone&&pfOnScreen(B.x,B.w/2)){const r=pfBossRect(B);out.push({x:((r.l+r.r)/2-pf.cam.x)*s,y:(r.t+(r.b-r.t)*.45)*s,wx:B.x})}
 return out;
}
function rfGroundAim(x,y,dx,dy){
 const P=pf&&pf.pilot;if(!P||!P.visible||P.hp<=0||!['missione','boss'].includes(pf.phase))return{x,y};
 const T=rfGroundTargets();if(!T.length)return{x,y};
 const ahead=T.filter(t=>(t.wx-P.x)*P.face>0),behind=T.filter(t=>(t.wx-P.x)*P.face<0);
 // nemico alle spalle e nessuno davanti: un movimento all'indietro gira subito il pilota
 if(!ahead.length&&behind.length&&dx*P.face<=-RF.flipMin){
  let best=behind[0];for(const t of behind)if(Math.abs(t.wx-P.x)<Math.abs(best.wx-P.x))best=t;
  return{x:rfClamp(best.x,0,W-1),y:rfClamp(best.y,0,H-1)};
 }
 // calamita leggera: il movimento viene piegato verso il nemico più vicino al mirino
 const move=Math.hypot(dx,dy);if(move<.5)return{x,y};
 let best=null,bd=RF.magnet;
 for(const t of T){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;best=t}}
 if(!best||bd<1)return{x,y};
 const k=Math.min(bd,move*RF.pull*(1-bd/RF.magnet)*2);
 return{x:rfClamp(x+(best.x-x)/bd*k,0,W-1),y:rfClamp(y+(best.y-y)/bd*k,0,H-1)};
}

// ---------------------------------------------------------------- aggiornamento
update=function(dt){
 const r=rfOrig.update(dt);
 try{
  rfCapture();
  if(rfLocked()&&(paused||!['play','platform','orbit','dying'].includes(state)))rfUnlock();
 }catch(e){console.error(e)}
 return r;
};

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 I18N_ROWS.push(['MISSILI ESAURITI · CREDITI INSUFFICIENTI','NO MISSILES · NOT ENOUGH CREDITS','PLUS DE MISSILES · CRÉDITS INSUFFISANTS','SIN MISILES · CRÉDITOS INSUFICIENTES','НЕТ РАКЕТ · НЕ ХВАТАЕТ КРЕДИТОВ','导弹耗尽 · 积分不足','ミサイルなし · クレジット不足']);
 if(typeof i18nBuild==='function')i18nBuild();
}
