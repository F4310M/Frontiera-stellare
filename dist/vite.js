// Conex — VITE CON LA FOTO DEL PILOTA, RIPARTENZA E SMILE ALIENI (2026-11-08).
// 1) In alto a sinistra, in volo e a terra: la foto del pilota (o quella di default) × numero di vite.
//    Cambia subito quando si perde o si guadagna una vita.
// 2) Nella mappa la foto e il nome del pilota stanno nello stesso riquadro di crediti, vite e punti.
// 3) Nello spazio una vita persa non chiude più la missione: la nave di riserva riparte un po' prima
//    del punto in cui sei morto. Solo all'ultima vita la missione finisce (GAME OVER come prima).
// 4) A terra il pilota di riserva viene sganciato un po' prima del punto in cui sei morto,
//    tranne durante il boss finale (lì riparte nell'arena, come prima).
// 5) LifeUP: uno smile alieno verde che regala una vita. Si trova molto di rado.
// Le vite sono quelle di finale.js (3 all'inizio, massimo 5). Va caricato in fondo a index.html.

const VITA={
 indietro:700,       // spazio: quanto prima del punto della morte riparte la nave (unità del mondo)
 indietroTerra:380,  // terra: quanto prima viene sganciato il pilota di riserva (pixel del livello)
 invSpazio:3,        // secondi di invulnerabilità della nave di riserva
 smileSpazio:.2,     // probabilità di uno smile alieno che fluttua lungo la rotta (per missione)
 smileTerra:.2       // probabilità di uno smile alieno nascosto nel livello a terra
};
const vtOrig={pfLoseLife,damage,finish,viteHud,drawPlayer,startGame,startPlatform,updatePlatform,update,lifeUpPill};
const vtUI=typeof document!=='undefined'&&!!document.createElement&&!!document.body;

// ---------------------------------------------------------------- foto del pilota
let vtFotoSrc='',vtFotoDefault='';
function vtDefaultFoto(){
 if(vtFotoDefault)return vtFotoDefault;
 // casco da pilota stilizzato, uguale per tutti quelli senza foto
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b6f8f"/><stop offset="1" stop-color="#06202f"/></linearGradient></defs>'+
  '<rect width="64" height="64" fill="url(#g)"/><path d="M14 44c0-14 8-26 18-26s18 12 18 26v6H14z" fill="#d9f6ff"/><path d="M20 36c0-7 5-11 12-11s12 4 12 11v4H20z" fill="#0b2c3c"/>'+
  '<path d="M23 34c2-4 5-6 9-6" stroke="#8cf2ff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="14" y="48" width="36" height="5" fill="#8cf2ff" opacity=".7"/></svg>';
 vtFotoDefault='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 return vtFotoDefault;
}
function vtFoto(){
 try{if(typeof prof!=='undefined'&&prof&&prof.foto)return prof.foto}catch(e){}
 return vtDefaultFoto();
}

// ---------------------------------------------------------------- 1) vite in alto a sinistra
let vtHud=null,vtShown=-1,vtShownFoto='';
function vtBuildHud(){
 if(vtHud||!vtUI)return vtHud;
 const h=document.createElement('div');h.id='livesHud';h.className='lives-hud hidden';h.setAttribute('aria-label','Vite');
 h.innerHTML='<img alt=""><b>×</b><strong>3</strong>';
 document.body.appendChild(h);vtHud=h;return h;
}
function vtHudOn(){return(state==='play'||state==='dying'||state==='orbit'||state==='platform')&&!paused}
function vtUpdateHud(){
 const h=vtBuildHud();if(!h)return;
 const on=vtHudOn();h.classList.toggle('hidden',!on);
 const f=vtFoto();
 if(f!==vtShownFoto){vtShownFoto=f;h.querySelector('img').src=f}
 if(vite!==vtShown){
  const prev=vtShown;vtShown=vite;
  h.querySelector('strong').textContent=String(vite);
  if(prev>=0){h.classList.remove('gain','lose');void h.offsetWidth;h.classList.add(vite>prev?'gain':'lose')}
 }
 const sp=document.body.classList;sp.toggle('lives-on',on);
}
// La scritta VITE ♥♥♥ diventa foto × numero, anche nella mappa.
viteHud=function(){
 vtOrig.viteHud();
 try{
  const old=$('viteHud');if(old&&old.style)old.style.display='none';
  const m=$('mapVite');
  if(m){
   const f=vtFoto();
   if(m.dataset.v!==String(vite)||m.dataset.f!==f||!m.querySelector('.pb-val')){
    m.dataset.v=String(vite);m.dataset.f=f;
    m.innerHTML='<small>VITE</small><span class="pb-val"><img alt=""><b>× '+vite+'</b></span>';m.querySelector('img').src=f;
   }
  }
  vtUpdateHud();
 }catch(e){console.error(e)}
};

// ---------------------------------------------------------------- 2) riquadro del pilota nella mappa
function vtGroupPilot(){
 if(!vtUI)return;
 const chip=$('profChip'),cred=document.querySelector&&document.querySelector('.credits-chip');
 if(!chip||!cred||$('pilotBox'))return;
 const box=document.createElement('div');box.id='pilotBox';box.className='pilot-box';
 chip.parentNode.insertBefore(box,chip);
 box.appendChild(chip);box.appendChild(cred);
 cred.removeAttribute('title');
 // tre colonne uguali: etichetta sopra, valore sotto (CREDITI / VITE / PUNTI)
 const mc=$('mapCredits'),lab=mc&&mc.previousElementSibling;
 if(mc&&cred.insertBefore){
  const cell=document.createElement('div');cell.className='pb-cell';cred.insertBefore(cell,cred.firstChild);
  if(lab&&lab.tagName==='SMALL')cell.appendChild(lab);cell.appendChild(mc);
  const v=$('mapVite'),sc=$('mapScore');if(v)cred.appendChild(v);if(sc)cred.appendChild(sc);
 }
}
// Il pulsante CLASSIFICA in alto sparisce: prende il posto di VEDI TUTTA sotto la classifica della mappa.
function vtBoardButton(){
 const b=$('mapBoardAll');if(!b||!b.dataset||b.dataset.vt)return;
 b.dataset.vt='1';b.classList.add('vt-board');
 const I=n=>typeof ico==='function'?ico(n):'';
 b.innerHTML='<span class="vt-board-l"><b>'+I('trophy')+'</b><span>CLASSIFICA</span></span><b>'+I('arrow-right')+'</b>';
 b.setAttribute('aria-label','Apri la classifica');
}
// PUNTI: anche qui etichetta sopra e numero sotto
if(typeof scoreHud==='function'){
 const vtScoreHud=scoreHud;
 scoreHud=function(){
  const r=vtScoreHud.apply(this,arguments);
  try{const m=$('mapScore');if(m&&typeof score!=='undefined'){const t=scoreFmt(score);if(m.dataset.v!==t){m.dataset.v=t;m.innerHTML='<small>PUNTI</small><b>'+t+'</b>'}}}catch(e){}
  return r;
 };
}

// ---------------------------------------------------------------- 3) spazio: la nave di riserva riparte un po' prima
function vtGod(){return typeof godMode!=='undefined'&&godMode}
function vtRespawnSpace(){
 const ax=Math.cos(approachAngle),ay=Math.sin(approachAngle);
 // posizione: lungo la rotta, indietro verso il punto di partenza, senza superare l'inizio
 const along=player.x*ax+player.y*ay,side=-player.x*ay+player.y*ax;
 const a2=Math.max(0,along-VITA.indietro),s2=side*.85;
 let x=a2*ax-s2*ay,y=a2*ay+s2*ax;
 // niente rocce o relitti addosso
 for(let k=0;k<12;k++){
  const o=[...rocks,...wrecks].find(r=>r.hp>0&&Math.hypot(r.x-x,r.y-y)<r.r+70);
  if(!o)break;x+=-ay*120;y+=ax*120;
 }
 // il buco nero che ti ha inghiottito si richiude
 if(typeof BH!=='undefined'&&BH.hole&&typeof bhCollapse==='function')bhCollapse();
 if(typeof BH!=='undefined')BH.inside=false;
 // spazio libero attorno alla nave di riserva
 for(const e of enemies){if(e.hp<=0||e.gen)continue;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;if(d<520){e.x=x+dx/d*620;e.y=y+dy/d*620;e.vx=e.vy=0}}
 bullets=bullets.filter(b=>b.friendly);
 if(typeof SP!=='undefined')SP.rockets=[];
 if(typeof EM!=='undefined'&&EM.missiles)EM.missiles=[];
 shower=shower.filter(m=>Math.hypot(m.x-x,m.y-y)>700);
 if(meteor&&Math.hypot(meteor.x-x,meteor.y-y)<700){meteor=null;meteorTimer=nextMeteorDelay();updateMeteorAlert()}
 Object.assign(player,{x,y,vx:ax*60,vy:ay*60,angle:approachAngle,turnRemaining:0,stun:0,spin:0,health:100,shield:100,barrier:false,
  fire:0,inv:0,forward:0,strafe:0,boost:100,boostState:'ready',shieldDelay:0,shieldLock:false,shieldPulse:0,destroyed:false,respawnT:VITA.invSpazio});
 delete player.swallowed;
 shipDebris=[];deathTimer=0;deathFlash=0;deathBlasts=0;
 state='play';keys={};mouse.down=false;mouse.right=false;mouse.turn=0;
 burst(x,y,'#8cf2ff',26,1.3);createShockwave(x,y,1.2);
 tone(330,.16,'sine',.03,660);tone(660,.22,'sine',.025,990,.12);
 status('NAVE DI RISERVA · VITE RIMASTE '+vite,2800);
 updateHud(Math.hypot(world.x-player.x,world.y-player.y));
 vtUpdateHud();
}
finish=function(win){
 // vita persa a metà missione: si continua, finché resta almeno un'altra vita
 if(!win&&state==='dying'&&!vtGod()&&vite>1&&world&&player){
  try{viteLose();vtRespawnSpace();return}catch(e){console.error(e)}
 }
 return vtOrig.finish.apply(this,arguments);
};
// nave di riserva invulnerabile per qualche secondo (player.inv no: colora di rosso lo schermo)
damage=function(){if(state==='play'&&player&&player.respawnT>0)return;return vtOrig.damage.apply(this,arguments)};
drawPlayer=function(){
 if(state==='play'&&player&&player.respawnT>0&&Math.floor(performance.now()/70)%2){
  ctx.save();ctx.globalAlpha=.35;try{return vtOrig.drawPlayer()}finally{ctx.restore()}
 }
 return vtOrig.drawPlayer();
};

// ---------------------------------------------------------------- 4) terra: pilota di riserva un po' prima
function vtGroundOk(x){
 if(typeof pfGroundAt!=='function')return false;
 const g=pfGroundAt(x);if(g===null)return false;
 // terreno piano per un tratto (niente bordo di un burrone)
 const a=pfGroundAt(x-40),b=pfGroundAt(x+40);
 return a!==null&&b!==null&&Math.abs(a-g)<6&&Math.abs(b-g)<6;
}
function vtShiftDrop(){
 const D=pf&&pf.drop;if(!D||D.vtDone||D.released)return;
 D.vtDone=true;
 if(pf.phase==='boss'||pf.cam.lock)return; // boss finale: si riparte nell'arena, come prima
 // fase2.js riporta il pilota all'ultimo punto di controllo: si parte invece da dove è morto
 const base=Number.isFinite(pf.vtDeathX)?pf.vtDeathX:D.x;pf.vtDeathX=undefined;
 for(let back=VITA.indietroTerra;back<=VITA.indietroTerra+900;back+=40){
  const x=base-back;if(x<260)break;
  if(vtGroundOk(x)&&!vtWallBetween(x)){
   if(x<=D.x)return; // il punto di controllo è già più avanti: resta lì
   const P=pf.pilot;D.x=x;D.g=pfGroundAt(x);
   P.x=x;P.y=D.g-2;P.lastGround=x;
   if(!pf.cam.lock)pf.cam.x=Math.max(0,x-pfViewW()*.38);
   return;
  }
 }
}
// si ricorda dove è morto il pilota (prima che fase2.js lo riporti al punto di controllo)
pfLoseLife=function(...a){
 try{if(pf&&pf.pilot&&!pf.morte&&!(pf.drop&&!pf.drop.released))pf.vtDeathX=pf.pilot.x}catch(e){}
 return vtOrig.pfLoseLife.apply(this,a);
};
// non si riparte dall'altra parte di una barriera d'energia ancora accesa (barriere.js)
function vtWallBetween(x){return typeof BAR!=='undefined'&&BAR.wall&&BAR.wall.on&&x>BAR.wall.x}

// ---------------------------------------------------------------- 5) smile alieni (LifeUP)
let vtSmile=null;
function vtSmileSprite(){
 if(vtSmile!==null)return vtSmile;
 vtSmile=false;
 try{
  const S=96,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');if(!x)return null;
  x.translate(S/2,S/2+2);
  // alone verde (fatto una volta, niente shadowBlur a ogni fotogramma)
  const halo=x.createRadialGradient(0,0,8,0,0,46);halo.addColorStop(0,'rgba(140,255,150,.55)');halo.addColorStop(1,'rgba(60,255,120,0)');
  x.fillStyle=halo;x.beginPath();x.arc(0,0,46,0,6.283);x.fill();
  // testa a goccia rovesciata
  const g=x.createRadialGradient(-8,-14,4,0,0,36);g.addColorStop(0,'#d6ffb8');g.addColorStop(.45,'#6fe86a');g.addColorStop(1,'#1f8a3c');
  x.fillStyle=g;x.beginPath();x.moveTo(0,30);x.bezierCurveTo(-18,28,-30,8,-30,-8);x.bezierCurveTo(-30,-26,-16,-34,0,-34);x.bezierCurveTo(16,-34,30,-26,30,-8);x.bezierCurveTo(30,8,18,28,0,30);x.fill();
  x.strokeStyle='#0d4a22';x.lineWidth=2;x.stroke();
  // antenne
  x.strokeStyle='#4fd35c';x.lineWidth=2.4;x.lineCap='round';
  for(const s of[-1,1]){x.beginPath();x.moveTo(s*10,-32);x.quadraticCurveTo(s*14,-42,s*20,-44);x.stroke();x.fillStyle='#e8ffb0';x.beginPath();x.arc(s*20,-44,3.6,0,6.283);x.fill()}
  // grandi occhi a mandorla
  for(const s of[-1,1]){
   x.save();x.translate(s*12,-6);x.rotate(s*.5);
   x.fillStyle='#071a10';x.beginPath();x.ellipse(0,0,10,6.4,0,0,6.283);x.fill();
   x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.ellipse(-3,-2,2.6,1.6,0,0,6.283);x.fill();
   x.restore();
  }
  // sorriso
  x.strokeStyle='#073319';x.lineWidth=3;x.beginPath();x.arc(0,8,11,.25,Math.PI-.25);x.stroke();
  x.fillStyle='#ff7aa0';x.globalAlpha=.55;for(const s of[-1,1]){x.beginPath();x.ellipse(s*19,8,4,2.6,0,0,6.283);x.fill()}
  vtSmile=c;
 }catch(e){vtSmile=false}
 return vtSmile||null;
}
lifeUpPill=function(c,x,y,t,s=1){
 const spr=vtSmileSprite();
 if(!spr)return vtOrig.lifeUpPill(c,x,y,t,s);
 const bob=Math.sin(t*3)*2.5,z=26*s*(1+Math.sin(t*5)*.04),r=Math.sin(t*2)*.18;
 c.save();c.translate(x,y+bob);c.rotate(r);c.drawImage(spr,-z,-z,z*2,z*2);c.restore();
 c.save();c.fillStyle='#d8ffe2';c.font='700 10px "Chakra Petch",sans-serif';c.textAlign='center';c.fillText('1UP',x,y+bob-25*s);c.restore();
};
// uno smile che fluttua da qualche parte lungo la rotta
startGame=function(...a){
 const r=vtOrig.startGame.apply(this,a);
 try{
  if(vite<VITE_MAX&&Math.random()<VITA.smileSpazio&&world){
   const ax=Math.cos(approachAngle),ay=Math.sin(approachAngle),t=world.dist*(.3+Math.random()*.4),o=(Math.random()-.5)*900;
   pickups.push({x:t*ax-o*ay,y:t*ay+o*ax,kind:'vita',life:1e6,r:13});
  }
 }catch(e){console.error(e)}
 return r;
};
// a terra: uno smile nascosto su un tratto di terreno
startPlatform=function(...a){
 const r=vtOrig.startPlatform.apply(this,a);
 try{
  if(pf&&vite<VITE_MAX&&Math.random()<VITA.smileTerra){
   for(let i=0;i<20;i++){
    const x=900+Math.random()*Math.max(400,pf.arenaX-1400);
    if(vtGroundOk(x)){pf.pickups.push({x,y:pfGroundAt(x)-10,vy:0,kind:'vita',life:1e6,ground:true});break}
   }
  }
 }catch(e){console.error(e)}
 return r;
};

// ---------------------------------------------------------------- aggancio ai fotogrammi
updatePlatform=function(dt){
 const r=vtOrig.updatePlatform.apply(this,arguments);
 try{if(pf&&pf.drop)vtShiftDrop()}catch(e){console.error(e)}
 return r;
};
update=function(dt){
 const r=vtOrig.update.apply(this,arguments);
 try{
  if(player&&player.respawnT>0&&state==='play'&&!paused)player.respawnT=Math.max(0,player.respawnT-dt);
  vtUpdateHud();
  // foto del profilo cambiata: si aggiorna anche nella mappa
  const m=$('mapVite');if(m&&m.dataset&&m.dataset.f!==vtFoto())viteHud();
  vtBoardButton();
 }catch(e){console.error(e)}
 return r;
};

// ---------------------------------------------------------------- stile
try{
 if(vtUI&&document.head){
  const st=document.createElement('style');
  st.textContent=
   '.lives-hud{position:fixed;left:25px;top:86px;z-index:6;pointer-events:none;display:flex;align-items:center;gap:7px;padding:4px 12px 4px 4px;border:1px solid rgba(140,233,236,.35);border-radius:24px;background:linear-gradient(90deg,rgba(4,18,30,.85),rgba(4,18,30,.35));font:700 15px "Chakra Petch",sans-serif;color:#eafcff}'+
   '.lives-hud.hidden{display:none}.lives-hud img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #8cf2ff;box-shadow:0 0 10px rgba(140,242,255,.45)}'+
   '.lives-hud b{font-size:13px;color:#8aa6bd}.lives-hud strong{font-size:22px;letter-spacing:1px;min-width:14px}'+
   '.lives-hud.gain{animation:vtGain 1s ease-out}.lives-hud.lose{animation:vtLose .8s ease-out}'+
   '@keyframes vtGain{0%{transform:scale(1.35);border-color:#7dff9a;box-shadow:0 0 22px rgba(125,255,154,.8)}100%{transform:scale(1)}}'+
   '@keyframes vtLose{0%,40%{transform:translateX(-5px);border-color:#ff5a6a;box-shadow:0 0 22px rgba(255,80,100,.8)}20%,60%{transform:translateX(5px)}100%{transform:none}}'+
   'body.lives-on .spec-badge{top:136px}'+
   '#viteHud{display:none!important}'+
   // riquadro del pilota nella mappa: foto, nome, crediti, vite e punti insieme
   '.pilot-box{display:flex;align-items:center;height:46px;border:1px solid rgba(255,207,74,.35);border-radius:8px;background:linear-gradient(90deg,rgba(6,24,36,.85),rgba(30,22,6,.6));box-shadow:0 0 18px rgba(255,190,80,.08);overflow:hidden}'+
   '.pilot-box .prof-chip{height:100%!important;border:0!important;border-right:1px solid rgba(255,207,74,.22)!important;background:transparent!important;padding:0 12px 0 7px!important;flex-direction:row;align-items:center;gap:8px!important}'+
   '.pilot-box .prof-chip img{width:32px;height:32px;border:2px solid rgba(140,233,236,.7)}'+
   '.pilot-box .prof-chip span{display:block!important;font-size:10px;max-width:90px;color:#eafcff}'+
   '.pilot-box .credits-chip{display:flex!important;flex-direction:row!important;align-items:stretch!important;border:0!important;border-radius:0!important;background:transparent!important;padding:0!important;gap:0!important;height:100%!important}'+
   '.pilot-box .pb-cell,#mapVite,#mapScore{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:74px;padding:0 12px!important;margin:0!important;border-left:1px solid rgba(255,207,74,.14)}'+
   '.pilot-box .pb-cell:first-child{border-left:0}'+
   '.pilot-box .credits-chip small{display:block!important;font:600 8px "Chakra Petch";letter-spacing:2px;color:var(--muted);line-height:1}'+
   '.pilot-box .credits-chip b{display:flex;align-items:center;gap:5px;font:700 14px "Chakra Petch"!important;letter-spacing:1px;line-height:16px;white-space:nowrap}'+
   '#mapCredits{color:#ffd36b}#mapScore b{color:#9fefff}#mapVite b{color:#ff9aa6}'+
   '#mapVite .pb-val{display:flex;align-items:center;gap:5px;height:16px}#mapVite img{width:16px;height:16px;border-radius:50%;object-fit:cover;border:1px solid #8cf2ff}'+
   '#boardBtn{display:none!important}'+
   '.map-board-all.vt-board{border-color:rgba(255,207,74,.5);background:linear-gradient(90deg,rgba(60,42,6,.55),rgba(30,22,6,.35));color:#ffd76a}'+
   '.map-board-all.vt-board:hover{border-color:#ffd76a;background:rgba(255,207,74,.18)}'+
   '.vt-board .vt-board-l{display:inline-flex;align-items:center;gap:8px}.vt-board .vt-board-l b{display:inline-flex}.vt-board .ico{width:16px;height:16px}'+
   '@media(max-width:850px){.pilot-box .prof-chip span{display:none!important}.pilot-box .pb-cell,#mapVite,#mapScore{min-width:0;padding:0 8px!important}}'+
   '@media(max-width:600px){.pilot-box{height:38px}.pilot-box .prof-chip img{width:26px;height:26px}#mapScore{display:none!important}.pilot-box .credits-chip b{font-size:12px!important}}'+
   'body.touch .lives-hud{top:64px;left:12px;padding:2px 9px 2px 2px}body.touch .lives-hud img{width:24px;height:24px}body.touch .lives-hud strong{font-size:16px}';
  document.head.appendChild(st);
 }
}catch(e){}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["NAVE DI RISERVA","RESERVE SHIP","VAISSEAU DE RÉSERVE","NAVE DE RESERVA","РЕЗЕРВНЫЙ КОРАБЛЬ","备用飞船","予備機"],
  ["VITE RIMASTE","LIVES LEFT","VIES RESTANTES","VIDAS RESTANTES","ОСТАЛОСЬ ЖИЗНЕЙ","剩余生命","残機"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}

try{viteHud();if(typeof scoreHud==='function')scoreHud();vtGroupPilot();viteHud();vtBoardButton()}catch(e){console.error(e)}
