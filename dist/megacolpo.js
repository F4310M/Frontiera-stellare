// Mega colpo della nave (battaglia nello spazio), 2026-11-08.
// Ogni clic (o pressione di SPAZIO) spara un solo colpo. Tenendo premuto si carica un mega colpo:
// una sfera di plasma cresce sulla prua e, quando si lascia il tasto, parte un colpo enorme che
// attraversa i nemici (ognuno viene colpito una volta) ed esplode in fondo alla corsa.
// Va caricato dopo tutti gli altri file della battaglia nello spazio: avvolge update, shoot,
// startGame e drawTargetLock nelle versioni più esterne.

const MC={
 start:.28,     // da quanto si tiene premuto prima che inizi la carica (s)
 full:1.25,     // carica piena (s)
 minLevel:.12,  // sotto questo livello al rilascio non parte niente (era solo un clic)
 speed:660,life:1.45,cool:.42,
 radius:[11,26],dmg:[5,15],blast:[70,165],blastDmg:[2,6]
};
const mc={click:false,held:false,t:0,pending:false,inUpdate:false,flag:false,ready:false,tick:0,shots:[],hint:false};
const mcOrig={update,shoot,startGame,drawTargetLock};

const mcClamp=v=>Math.max(0,Math.min(1,v));
function mcLevel(){return mcClamp((mc.t-MC.start)/(MC.full-MC.start))}
function mcLerp(a,k){return a[0]+(a[1]-a[0])*k}
function mcReset(){mc.click=false;mc.held=false;mc.t=0;mc.pending=false;mc.flag=false;mc.ready=false;mc.tick=0}
function mcNose(d=30){const a=player.angle;return{x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,a}}
function mcCanFire(){return state==='play'&&!paused&&arrivalRemaining<=0&&player&&!(player.stun>0)&&!player.destroyed}

// game.js chiama shoot() a ogni fotogramma finché il tasto è premuto: qui segna solo che è premuto.
// Chiamato da fuori (prove, altri file) spara come prima.
shoot=function(){if(mc.inUpdate){mc.flag=true;return}return mcOrig.shoot()};

update=function(dt){
 mc.inUpdate=true;mc.flag=false;
 let r;try{r=mcOrig.update(dt)}finally{mc.inUpdate=false}
 if(state!=='play'||paused){if(state!=='play'){mcReset();if(state!=='dying')mc.shots=[]}return r}
 try{mcStep(dt)}catch(e){console.error(e)}
 return r;
};

function mcStep(dt){
 const held=mc.flag;mc.flag=false;
 if(held&&!mc.held){mc.t=0;mc.ready=false;mc.tick=0}
 // un colpo per ogni clic: se il cannone si sta ancora raffreddando parte appena può
 if((held&&!mc.held)||mc.click)mc.pending=true;
 mc.click=false;
 if(mc.pending&&mcCanFire()&&player.fire<=0){mcOrig.shoot();if(player.fire>0)mc.pending=false}
 if(held){
  if(mcCanFire())mc.t+=dt;
  const L=mcLevel();
  if(mc.t>MC.start){
   mcChargeFx(L,dt);
   if(!mc.hint){mc.hint=true;status('CARICA DEL MEGA COLPO · LASCIA PER SPARARE',1300)}
   if(L>=1&&!mc.ready){mc.ready=true;status('MEGA COLPO PRONTO',900);tone(1240,.12,'sine',.03,1860)}
  }
 }else if(mc.held){
  const L=mcLevel();
  if(mc.t>MC.start&&L>=MC.minLevel&&mcCanFire())mcFire(L);
  mc.t=0;mc.ready=false;
 }
 mc.held=held;
 mcUpdateShots(dt);
}

// particelle risucchiate verso la prua e fischio che sale
function mcChargeFx(L,dt){
 const n=mcNose(),count=Math.floor((10+30*L)*dt+Math.random());
 for(let i=0;i<count;i++){
  const a=Math.random()*6.28,d=34+Math.random()*30+L*24,life=.22+Math.random()*.12;
  particles.push({x:n.x+Math.cos(a)*d,y:n.y+Math.sin(a)*d,vx:-Math.cos(a)*d/life+player.vx,vy:-Math.sin(a)*d/life+player.vy,life,max:life,color:L>=1?'#e6d2ff':'#7cf2ff',r:1+Math.random()*1.6})
 }
 mc.tick-=dt;
 if(mc.tick<=0&&L<1){mc.tick=.11;tone(320+L*900,.09,'triangle',.012+L*.01,380+L*980)}
}

function mcFire(L){
 const n=mcNose(32),lv=upg('laser'),k=.35+.65*L,boost=1+lv*.3;
 mc.shots.push({x:n.x,y:n.y,px:n.x,py:n.y,vx:Math.cos(n.a)*MC.speed+player.vx*.5,vy:Math.sin(n.a)*MC.speed+player.vy*.5,
  life:MC.life,max:MC.life,L,r:mcLerp(MC.radius,k),dmg:Math.round(mcLerp(MC.dmg,L)*boost),blast:mcLerp(MC.blast,L),blastDmg:Math.round(mcLerp(MC.blastDmg,L)*boost),
  hit:new Set(),trail:[],spin:Math.random()*6.28});
 pay('laser',2+Math.round(4*L));
 player.fire=MC.cool;
 // rinculo
 player.vx-=Math.cos(n.a)*(60+120*L);player.vy-=Math.sin(n.a)*(60+120*L);
 burst(n.x,n.y,'#b8f6ff',6+Math.round(8*L),.6+L*.6);
 sfx('shoot');tone(180,.35+L*.2,'sawtooth',.03+L*.02,60);noise(.3+L*.25,.03+L*.03,700+L*800);
 mc.ready=false;
}

// Bersagli che il mega colpo può colpire, come per i laser normali.
function mcGroups(){
 return[[fragments,1,'#d8e6f2'],[rocks,.72,'#b1bac2'],[wrecks,.62,'#8194a7'],[monsters,.65,'#a9ff78'],[enemies,1,'#ff5a3d']];
}
function mcHitEntity(e,group,tint,n){
 if(group===fragments){dissolveFragment(e);return}
 enemyFire=false;destroyableHit(e,n,tint,22);
}
function mcUpdateShots(dt){
 for(const s of mc.shots){
  s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;s.spin+=dt*9;
  s.trail.push({x:s.x,y:s.y});if(s.trail.length>9)s.trail.shift();
  if(Math.random()<.7)particles.push({x:s.x+(Math.random()-.5)*s.r,y:s.y+(Math.random()-.5)*s.r,vx:-s.vx*.08+(Math.random()-.5)*40,vy:-s.vy*.08+(Math.random()-.5)*40,life:.35,max:.35,color:'#9feaff',r:1.5+Math.random()*2});
  for(const [group,factor,tint] of mcGroups()){
   for(const e of group){
    if(s.hit.has(e))continue;
    if(group===fragments?!(e.life>0):!(e.hp>0))continue;
    if(segmentImpact(s.px,s.py,s.x,s.y,e,e.r*factor+s.r)===null)continue;
    s.hit.add(e);mcHitEntity(e,group,tint,s.dmg);burst(e.x,e.y,'#d8f8ff',8,.8);
   }
  }
  // abbatte i razzi e i missili nemici che incontra
  for(const m of mcRockets())if(m.hp>0&&segmentImpact(s.px,s.py,s.x,s.y,m,s.r+(m.r||6)+6)!==null){m.hp=0;burst(m.x,m.y,'#ffd28a',12)}
  // i colpi nemici si spengono dentro la sfera
  for(const b of bullets)if(!b.friendly&&b.life>0&&Math.hypot(b.x-s.x,b.y-s.y)<s.r+4){b.life=0;burst(b.x,b.y,'#9feaff',3)}
  if(s.life<=0)mcBlast(s);
 }
 mc.shots=mc.shots.filter(s=>s.life>0);
}
function mcRockets(){
 const a=[];
 if(typeof SP!=='undefined'&&SP.rockets)a.push(...SP.rockets);
 if(typeof EM!=='undefined'&&EM.missiles)a.push(...EM.missiles);
 return a;
}
function mcBlast(s){
 for(const [group,factor,tint] of mcGroups()){
  for(const e of group){
   if(group===fragments?!(e.life>0):!(e.hp>0))continue;
   if(Math.hypot(e.x-s.x,e.y-s.y)>s.blast+e.r*factor)continue;
   mcHitEntity(e,group,tint,s.blastDmg);
  }
 }
 burst(s.x,s.y,'#c9f7ff',16+Math.round(s.L*14),1+s.L*1.2);
 sfx('boom',1+s.L);
}

// un clic così rapido da finire tra due fotogrammi conta lo stesso
addEventListener('mousedown',e=>{if(e.button===0&&state==='play'&&!paused&&e.target===canvas)mc.click=true});

startGame=function(...a){mcReset();mc.shots=[];mc.hint=false;return mcOrig.startGame.apply(this,a)};

// ---- disegno (dentro la telecamera, dopo la nave)
drawTargetLock=function(){
 mcOrig.drawTargetLock();
 try{mcDraw()}catch(e){console.error(e)}
};
function mcOrb(x,y,r,L,t){
 const g=ctx.createRadialGradient(x,y,0,x,y,r*2.4);
 const c=L>=1?'214,190,255':'120,236,255';
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.22,`rgba(${c},.95)`);g.addColorStop(.5,`rgba(${c},.35)`);g.addColorStop(1,`rgba(${c},0)`);
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2.4,0,6.283);ctx.fill();
 // archi elettrici che girano
 ctx.strokeStyle=`rgba(${c},.85)`;ctx.lineWidth=1.3;
 for(let i=0;i<3;i++){const a=t+i*2.094;ctx.beginPath();ctx.arc(x,y,r*1.15,a,a+1.1);ctx.stroke()}
}
function mcDraw(){
 if(state!=='play'&&state!=='dying')return;
 const now=performance.now()/1000;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(const s of mc.shots){
  for(let i=0;i<s.trail.length;i++){
   const p=s.trail[i],k=(i+1)/s.trail.length;
   ctx.fillStyle=`rgba(110,225,255,${.12*k})`;ctx.beginPath();ctx.arc(p.x,p.y,s.r*(.4+.6*k),0,6.283);ctx.fill();
  }
  mcOrb(s.x,s.y,s.r,s.L,s.spin);
 }
 if(state==='play'&&mc.held&&mc.t>MC.start&&player&&!player.destroyed){
  const L=mcLevel(),n=mcNose(34),pulse=.85+.15*Math.sin(now*(18+L*14));
  const r=(4+14*L)*pulse;
  mcOrb(n.x,n.y,r,L,now*7);
  // anello che si stringe sulla prua
  const ring=r+20*(1-((now*2.2)%1));
  ctx.strokeStyle=L>=1?'rgba(225,205,255,.7)':`rgba(124,242,255,${.25+.4*L})`;ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(n.x,n.y,ring,0,6.283);ctx.stroke();
  if(L>=1){ctx.strokeStyle=`rgba(255,255,255,${.35+.3*Math.sin(now*20)})`;ctx.beginPath();ctx.arc(n.x,n.y,r*2.6,0,6.283);ctx.stroke()}
 }
 ctx.restore();
}

// ---- testi e traduzioni (righe aggiunte qui per non toccare i18n.js)
const MC_TIP_OLD='clic / SPAZIO spara';
const MC_TIP_NEW='clic / SPAZIO spara (tieni premuto: mega colpo)';
let mcTipIt='FRECCE / WASD muovi · MOUSE punta la prua · SHIFT DX post-bruciatore · MOUSE DX barriera · '+MC_TIP_NEW+' · ROTELLA missile · F frena · P pausa';
if(typeof I18N_ROWS!=='undefined'){
 I18N_ROWS.push(
  ['MEGA COLPO PRONTO','MEGA SHOT READY','MÉGA TIR PRÊT','MEGADISPARO LISTO','МЕГАВЫСТРЕЛ ГОТОВ','超级炮击就绪','メガショット準備完了'],
  ['CARICA DEL MEGA COLPO · LASCIA PER SPARARE','CHARGING MEGA SHOT · RELEASE TO FIRE','CHARGE DU MÉGA TIR · RELÂCHE POUR TIRER','CARGANDO MEGADISPARO · SUELTA PARA DISPARAR','ЗАРЯДКА МЕГАВЫСТРЕЛА · ОТПУСТИ, ЧТОБЫ ВЫСТРЕЛИТЬ','超级炮击充能中 · 松开发射','メガショット充填中 · 離して発射']
 );
 // suggerimento dei comandi: la riga esistente con l'aggiunta del mega colpo
 const row=I18N_ROWS.find(r=>r[0].includes(MC_TIP_OLD)&&r[0].startsWith('FRECCE'));
 if(row){
  const add=[' (tieni premuto: mega colpo)',' (hold: mega shot)',' (maintenir : méga tir)',' (mantén: megadisparo)',' (удерживай: мегавыстрел)','（按住：超级炮击）','（長押し：メガショット）'];
  const neu=row.map((s,i)=>s.replace(/(click|clic|клик|点击|クリック) \/ [^·]*·/i,m=>m.replace(/\s*·$/,'')+add[i]+' ·'));
  neu[0]=row[0].replace(MC_TIP_OLD,MC_TIP_NEW);mcTipIt=neu[0];
  I18N_ROWS.push(neu);
 }
 if(typeof i18nBuild==='function')i18nBuild();
}
try{
 const tip=document.querySelector('#hud .controls-tip');
 if(tip&&mcTipIt&&tip.textContent!==mcTipIt){tip.textContent=mcTipIt;if(typeof i18nWalk==='function')i18nWalk(tip)}
}catch(e){}
