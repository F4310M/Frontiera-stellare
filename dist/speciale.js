// Conex — COLPO SPECIALE (2026-11-04). Tasto Q (sul telefono il pulsante SPECIALE).
// Una carica per la missione nello spazio e una per ogni guerriero a terra.
// - Spazio: la nave gira velocissima su sé stessa sparando laser in ogni direzione e distrugge tutti i nemici
//   che sono sullo schermo in quel momento (navi, nave da guerra, creature, missili e razzi nemici).
//   Mentre gira non subisce danni.
// - Terra: il pilota chiama la nave via radio; la nave passa sopra e sgancia una bomba che distrugge
//   tutti i nemici sullo schermo nel momento dell'esplosione. Al boss toglie 1/4 dell'energia.
// Va caricato dopo facile.js e spirale.js.

const SPEC={spinT:1.7,spinRate:30,radioT:.9,shipSpeed:1200,bombG:1500,bossCut:.25};
const spcOrig={update,damage,startGame,startPlatform,drawPlayer,pfDrawShipOnPad,drawPlatform};
const spc={space:false,ground:false,spin:null,beams:[],strike:null,flash:0};

if(typeof ICONS!=='undefined'){
 ICONS.special='<path d="M12 2.5l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 16.1l-5.6 3.6 1.7-6.4L3 9.1l6.6-.4z"/>';
 ICONS.radio='<path d="M7 9h10v11H7zM9 9l6-6M10 13h4M10 16h4"/>';
}
function spcIco(n){return typeof ico==='function'?ico(n):''}

// ---- reset a inizio fase
startGame=function(...a){const r=spcOrig.startGame(...a);spc.space=false;spc.spin=null;spc.beams=[];spcBadge();return r};
function spcResetGround(){spc.ground=false;spc.strike=null;spc.flash=0;spcBadge()}
startPlatform=function(...a){const r=spcOrig.startPlatform(...a);spcResetGround();return r};

// ---- attivazione
function spcUse(){
 if(paused)return false;
 if(state==='play')return spcSpace();
 if(state==='platform')return spcGround();
 return false;
}
addEventListener('keydown',e=>{if(e.code==='KeyQ'&&!e.repeat)spcUse()});

// ================================================================ SPAZIO: trottola laser
function spcOnScreen(o,m=30){
 const z=typeof camZoom!=='undefined'&&camZoom>0?camZoom:1,hw=W/2/z+m,hh=H/2/z+m;
 return Math.abs(o.x-player.x)<hw&&Math.abs(o.y-player.y)<hh;
}
function spcSpace(){
 if(spc.space||spc.spin||!player||player.destroyed||(typeof arrivalRemaining!=='undefined'&&arrivalRemaining>0))return false;
 spc.space=true;
 const list=[];
 for(const e of enemies)if(e.hp>0&&spcOnScreen(e,e.r||20))list.push({o:e,kind:'nave'});
 if(typeof monsters!=='undefined')for(const m of monsters)if(m.hp>0&&spcOnScreen(m,m.r||20))list.push({o:m,kind:'nave'});
 if(typeof EM!=='undefined')for(const m of EM.missiles)if(m.hp>0&&spcOnScreen(m))list.push({o:m,kind:'missile'});
 if(typeof SP!=='undefined')for(const m of SP.rockets)if(m.hp>0&&spcOnScreen(m))list.push({o:m,kind:'missile'});
 // in ordine di angolo attorno alla nave: il raggio che gira li colpisce uno dopo l'altro
 for(const t of list)t.a=Math.atan2(t.o.y-player.y,t.o.x-player.x);
 list.sort((a,b)=>a.a-b.a);
 list.forEach((t,i)=>{t.at=.18+(SPEC.spinT-.45)*(list.length>1?i/(list.length-1):0)});
 spc.spin={t:0,base:player.angle,targets:list};
 status('COLPO SPECIALE · TROTTOLA LASER',1600);
 if(soundEnabled){tone(300,SPEC.spinT,'sawtooth',.03,1800);noise(SPEC.spinT,.03,3000)}
 spcBadge();return true;
}
function spcKill(t){
 const o=t.o;
 spc.beams.push({x:o.x,y:o.y,life:.16});
 if(t.kind==='missile'){if(o.hp<=0)return;o.hp=0;o.life=0;burst(o.x,o.y,'#ffb05a',14,1);sfx('boom',.6);return}
 if(o.hp>0)destroyableHit(o,o.hp+99,'#51e6ff',26);
}
function spcUpdateSpin(dt){
 const S=spc.spin;if(!S)return;
 S.t+=dt;
 if(player&&!player.destroyed){
  const k=Math.min(1,S.t/.25)*Math.min(1,(SPEC.spinT-S.t)/.3+.15);
  S.ang=(S.ang??S.base)+SPEC.spinRate*Math.max(.15,k)*dt;player.angle=S.ang;
 }
 for(const t of S.targets)if(!t.done&&S.t>=t.at){t.done=true;spcKill(t);if(soundEnabled)sfx('shoot')}
 if(S.t>=SPEC.spinT){for(const t of S.targets)if(!t.done){t.done=true;spcKill(t)}spc.spin=null;status('BERSAGLI ELIMINATI',1400);spcBadge()}
}
// niente danni mentre la nave gira
damage=function(...a){if(spc.spin&&state==='play')return;return spcOrig.damage(...a)};
drawPlayer=function(){
 const S=spc.spin;
 if(S&&player&&!player.destroyed){
  // raggi laser che girano con la nave
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  const L=Math.max(W,H)*.8;
  for(let i=0;i<4;i++){const a=player.angle+i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
   const g=ctx.createLinearGradient(player.x,player.y,player.x+c*L,player.y+s*L);g.addColorStop(0,'rgba(220,255,255,.9)');g.addColorStop(.4,'rgba(81,230,255,.45)');g.addColorStop(1,'rgba(81,230,255,0)');
   ctx.strokeStyle=g;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(player.x+c*24,player.y+s*24);ctx.lineTo(player.x+c*L,player.y+s*L);ctx.stroke();
   // scia dei raggi appena passati
   ctx.strokeStyle='rgba(81,230,255,.12)';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(player.x+c*24,player.y+s*24);ctx.lineTo(player.x+Math.cos(a-.18)*L*.6,player.y+Math.sin(a-.18)*L*.6);ctx.stroke();
  }
  const r=40+Math.sin(S.t*40)*4,g=ctx.createRadialGradient(player.x,player.y,0,player.x,player.y,r*2);g.addColorStop(0,'rgba(200,255,255,.5)');g.addColorStop(1,'rgba(81,230,255,0)');ctx.fillStyle=g;ctx.fillRect(player.x-r*2,player.y-r*2,r*4,r*4);
  ctx.restore();
 }
 spcOrig.drawPlayer();
 if(spc.beams.length){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const b of spc.beams){const k=b.life/.16;ctx.strokeStyle=`rgba(180,250,255,${k})`;ctx.lineWidth=2+4*k;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  ctx.restore();
 }
};

// ================================================================ TERRA: bombardamento via radio
function spcGround(){
 if(spc.ground||spc.strike||!pf)return false;
 const P=pf.pilot;if(!P.visible||P.hp<=0||pf.morte||P.landing||(pf.phase!=='missione'&&pf.phase!=='boss'))return false;
 if(pf.under){pfStatus('NESSUN SEGNALE RADIO SOTTOTERRA',1800);tone(200,.2,'square',.015,120);return false}
 spc.ground=true;
 spc.strike={t:0,dropped:false,boom:false,ship:null,bomb:null,ring:null};
 pfStatus('RADIO · RICHIESTA DI BOMBARDAMENTO',2200);
 for(let i=0;i<4;i++)tone(880,.07,'square',.012,0,i*.14);noise(.5,.012,2600);
 spcBadge();return true;
}
function spcUpdateStrike(dt){
 const S=spc.strike;if(!S||!pf)return;
 S.t+=dt;const VW=pfViewW(),cx=pf.cam.x;
 if(S.t>=SPEC.radioT&&!S.ship){S.ship={x:cx-160,y:150};pfStatus('NAVE IN ARRIVO · SGANCIO DELLA BOMBA',1800);noise(1.4,.03,500);tone(90,1.2,'sine',.04,140)}
 if(S.ship){S.ship.x+=SPEC.shipSpeed*dt;S.ship.y=150+Math.sin(S.t*3)*6}
 if(S.ship&&!S.dropped&&S.ship.x>=cx+VW*.5-60){S.dropped=true;S.bomb={x:S.ship.x,y:S.ship.y+30,vx:SPEC.shipSpeed*.35,vy:40,rot:0};tone(1400,1,'sine',.025,300)}
 const B=S.bomb;
 if(B&&!S.boom){B.vy+=SPEC.bombG*dt;B.x+=B.vx*dt;B.y+=B.vy*dt;B.vx*=1-dt*1.2;B.rot=Math.atan2(B.vy,B.vx);
  if(Math.random()<dt*30)pf.fx.push({x:B.x,y:B.y,vx:0,vy:0,life:.35,max:.35,color:'rgba(200,200,210,.5)',r:3,soft:true});
  const g=pfGroundAt(B.x)??PF_FLOOR;if(B.y>=g-4||B.y>PF_VH)spcExplode(B.x,Math.min(B.y,g))}
 if(S.ring){S.ring.t+=dt}
 if(S.ship&&S.ship.x>cx+VW+300&&S.boom&&S.ring&&S.ring.t>1.2)spc.strike=null;
}
function spcExplode(x,y){
 const S=spc.strike;S.boom=true;S.bomb=null;S.ring={x,y,t:0};
 pfBurst(x,y-20,'#ffb05a',80,3);pfBurst(x,y-20,'#fff1c9',30,2);pfBurst(x,y-10,'#5d6672',40,1.6,true,{vy:-320});
 for(let i=0;i<16;i++)pf.fx.push({x:x+(Math.random()-.5)*120,y:y-20-Math.random()*140,vx:(Math.random()-.5)*60,vy:-60-Math.random()*90,life:2.6,max:2.6,color:'rgba(70,64,60,.55)',r:18+Math.random()*24,soft:true});
 if(typeof gFlash==='function')gFlash(x,y-60,700,'#ffb05a',.8);
 pf.cam.shake=Math.max(pf.cam.shake,1.5);spc.flash=1;sfx('boom',2.6);
 // tutti i nemici sullo schermo
 let n=0;
 for(const e of pf.enemies)if(e.hp>0&&pfOnScreen(e.x,30)){pfHitEnemy(e,e.hp+99);n++}
 pf.shots=pf.shots.filter(b=>b.friendly);
 for(const m of pf.missiles||[])if(m.hp>0)pfExplodeMissile(m);
 // boss: un quarto dell'energia
 const Bo=pf.boss;
 if(Bo&&Bo.hp>0&&!Bo.gone&&pfOnScreen(Bo.x,Bo.w)){
  const cut=Bo.max*SPEC.bossCut;
  if(Bo.state==='montaggio')Bo.hp=Math.max(1,Bo.hp-cut);
  else if(Bo.hp-cut<=0){Bo.hp=Math.min(Bo.hp,.5);if(Bo.state==='stordito')Bo.hp=.25;pfHitBoss(1,Bo.x,Bo.y-100)}
  else{Bo.hp-=cut;Bo.hit=.3}
  pfText(Bo.x,Bo.y-Bo.h-20,'−25%','#ffb05a');
 }
 pfStatus(n?'BOMBARDAMENTO · NEMICI ELIMINATI':'BOMBARDAMENTO COMPLETATO',2000);
}
pfDrawShipOnPad=function(now){
 spcOrig.pfDrawShipOnPad(now);
 const S=spc.strike;if(!S||!pf)return;
 const P=pf.pilot;
 // onde radio dal casco del pilota
 if(S.t<SPEC.radioT+.6&&P.visible){
  const hx=P.x+P.face*4,hy=P.y-(P.crouch?44:56);
  ctx.save();ctx.strokeStyle='#8cf2ff';ctx.lineWidth=2;
  for(let i=0;i<3;i++){const k=((S.t*1.6+i/3)%1);ctx.globalAlpha=(1-k)*.9;ctx.beginPath();ctx.arc(hx,hy,8+k*34,-Math.PI*.85,-Math.PI*.15);ctx.stroke()}
  ctx.globalAlpha=1;ctx.fillStyle='#1b2a36';ctx.fillRect(hx-3+P.face*6,hy-2,5,12);ctx.fillStyle=Math.floor(S.t*8)%2?'#ff5268':'#4dffa0';ctx.fillRect(hx-2+P.face*6,hy-6,3,4);
  ctx.restore();
 }
 // nave che passa
 if(S.ship&&pfOnScreen(S.ship.x,220)){
  const sh=S.ship;ctx.save();
  for(const ox of [-26,22])drawPlume(sh.x+ox-30,sh.y+12,-1,.15,50+Math.random()*20,7,'#51e6ff');
  ctx.translate(sh.x,sh.y);ctx.scale(2.3,2.3);
  drawShip({x:0,y:0,angle:0,forward:1,strafe:0,barrier:false,boostState:'active'});
  ctx.restore();
 }
 // bomba
 const B=S.bomb;
 if(B){ctx.save();ctx.translate(B.x,B.y);ctx.rotate(B.rot);
  ctx.fillStyle='#2b343c';ctx.strokeStyle='#0b1016';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,15,6.5,0,0,6.28);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffb348';ctx.fillRect(-3,-6.5,3,13);ctx.fillStyle='#4a5560';ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-22,-8);ctx.lineTo(-20,0);ctx.lineTo(-22,8);ctx.closePath();ctx.fill();
  ctx.fillStyle=Math.floor(S.t*14)%2?'#ff5268':'#5a1a24';ctx.beginPath();ctx.arc(9,0,1.8,0,6.28);ctx.fill();
  ctx.restore()}
 // onda d'urto sul terreno
 const R=S.ring;
 if(R&&R.t<1.2){const k=R.t/1.2,rr=40+k*900;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,200,130,${.8*(1-k)})`;ctx.lineWidth=10*(1-k)+2;ctx.beginPath();ctx.ellipse(R.x,R.y,rr,rr*.22,0,0,6.28);ctx.stroke();
  const g=ctx.createRadialGradient(R.x,R.y-60,0,R.x,R.y-60,200*(1-k*.4));g.addColorStop(0,`rgba(255,240,200,${.8*(1-k)})`);g.addColorStop(.4,`rgba(255,140,50,${.5*(1-k)})`);g.addColorStop(1,'rgba(255,80,20,0)');ctx.fillStyle=g;ctx.fillRect(R.x-220,R.y-280,440,440);ctx.restore()}
};
drawPlatform=function(){
 spcOrig.drawPlatform();
 if(spc.flash>0){ctx.fillStyle=`rgba(255,246,225,${spc.flash*.8})`;ctx.fillRect(0,0,W,H)}
};

// ---- aggiornamento (spazio e terra)
update=function(dt){
 const r=spcOrig.update(dt);
 if(!paused){
  if(state==='play')spcUpdateSpin(dt);else if(spc.spin)spc.spin=null;
  for(const b of spc.beams)b.life-=dt;spc.beams=spc.beams.filter(b=>b.life>0);
  if(state==='platform')spcUpdateStrike(dt);
  spc.flash=Math.max(0,spc.flash-dt*1.6);
 }
 spcBadge();
 return r;
};

// ---- indicatore sullo schermo e pulsante sul telefono
function spcBadge(){
 if(typeof document==='undefined'||!document.createElement||!document.body)return;
 let b=$('specBadge');
 if(!b){b=document.createElement('div');b.id='specBadge';b.className='spec-badge hidden';b.innerHTML='<b>'+spcIco('special')+'</b><span></span>';document.body.appendChild(b)}
 const on=(state==='play'||state==='platform')&&!paused,used=state==='play'?spc.space:spc.ground,busy=state==='play'?!!spc.spin:!!spc.strike;
 if(b.classList)b.classList.toggle('hidden',!on);
 if(!on)return;
 const tch=typeof touch!=='undefined'&&touch.on,txt=busy?'COLPO SPECIALE IN CORSO':used?'COLPO SPECIALE USATO':(tch?'COLPO SPECIALE':'COLPO SPECIALE · Q');
 const s=b.querySelector&&b.querySelector('span');if(s&&s.textContent!==txt)s.textContent=txt;
 if(b.classList){b.classList.toggle('used',used&&!busy);b.classList.toggle('busy',busy)}
 for(const t of document.querySelectorAll?document.querySelectorAll('.tb-special'):[])t.classList.toggle('used',used);
}
function spcTouchButtons(){
 if(typeof document==='undefined'||!document.createElement)return;
 for(const id of ['touchSpace','touchGround']){
  const box=$(id);if(!box||box.querySelector('.tb-special'))continue;
  const bt=document.createElement('button');bt.className='touch-btn tb-special';bt.setAttribute('aria-label','SPECIALE');bt.innerHTML='<b>'+spcIco('special')+'</b><span>SPECIALE</span>';
  bt.addEventListener('pointerdown',e=>{e.preventDefault();spcUse()});bt.addEventListener('contextmenu',e=>e.preventDefault());
  box.appendChild(bt);
 }
}
if(typeof touchBuild==='function'){const tb=touchBuild;touchBuild=function(){tb();spcTouchButtons()}}
spcTouchButtons();
