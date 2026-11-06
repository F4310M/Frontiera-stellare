// Stellar Frontier — BATTAGLIA A TERRA (novità 2026-11-01).
// 1) La nave resta sospesa in aria: il pilota viene sganciato e scende col jetpack (anche il pilota di riserva).
// 2) Nemici al riparo dietro un muretto: si alzano per sparare e si riabbassano. Se li superi senza ucciderli
//    si girano e ti sparano alle spalle, più spesso.
// 3) Passaggi col jetpack: una parete rocciosa da scalare in volo e, subito dopo, un burrone da attraversare
//    planando (in volo col jetpack: salto + giù).
// 4) Boss sconfitto: rallentatore, esplosioni a catena, nucleo in sovraccarico, esplosione finale con onda d'urto,
//    rottami e fungo di fumo. Con lo scoppio parte la musica epica di vittoria (vedi musica.js).
// Si carica dopo terra.js: avvolge le funzioni della fase a terra senza cambiare quelle originali.

const BATT={shipHoverY:PF_FLOOR-250,landSpeed:175,coverH:40,coverW:40,boomBlast:3.1,boomEnd:11.5,leaveDelay:.7,leaveTime:4};
const bt={buildPlatformLevel,pfUpdateLanding,pfUpdatePilot,pfUpdateJetpack,pfShipPose,pfDrawShipOnPad,pfUpdateEnemies,pfDrawEnemy,gEnemy,pfDrawProp,pfShotObstacle,pfUpdateBoss,updatePlatform,pfDrawBanner,gBoss:typeof gBoss==='function'?gBoss:null,gCollectLights:typeof gCollectLights==='function'?gCollectLights:null,terraUpdateDrop:typeof terraUpdateDrop==='function'?terraUpdateDrop:null};
function battDown(){return!!(keys.KeyS||keys.ArrowDown)}

// ---------------------------------------------------------------- livello: passaggi col jetpack e muretti
buildPlatformLevel=function(p){
 const L=bt.buildPlatformLevel(p),d=p.difficulty||1,rnd=pfRng(pfHash('battaglia'+p.code));
 L.jetZones=[];
 for(const f of d>=3?[.3,.64]:[.45])battInsertJetPassage(L,L.arenaX*f,rnd);
 battAddCovers(L,d,rnd);
 L.triggers.sort((a,b)=>a.x-b.x);
 return L;
};
// Inserisce una parete alta (si sale solo col jetpack) seguita da un burrone largo (si attraversa planando).
function battInsertJetPassage(L,target,rnd){
 const ss=L.solids.filter(s=>s.x<L.arenaX).sort((a,b)=>a.x-b.x);
 const i=ss.findIndex((s,k)=>k>0&&s.x>=Math.max(1600,target));if(i<0)return;
 const s=ss[i],prev=ss[i-1],X=s.x;
 const cliffW=Math.round(440+rnd()*160),gap=Math.round(410+rnd()*70),baseY=prev.x+prev.w>=X-2?prev.y:s.y;
 const topY=Math.max(300,Math.min(baseY,s.y)-Math.round(205+rnd()*35)),shift=cliffW+gap;
 const mv=o=>{if(o.x>=X)o.x+=shift};
 L.solids.forEach(mv);L.plats.forEach(mv);L.props.forEach(mv);L.triggers.forEach(mv);L.hostages.forEach(mv);
 for(const z of L.jetZones){if(z.wallX>=X){z.wallX+=shift;z.edgeX+=shift;z.landX+=shift}}
 L.arenaX+=shift;L.len+=shift;
 L.solids.push({x:X,w:cliffW,y:topY,jet:true});
 L.props.push({x:X-64,y:baseY,kind:'jet_su'},{x:X+cliffW-46,y:topY,kind:'jet_giu'});
 L.jetZones.push({wallX:X,edgeX:X+cliffW,landX:X+shift,topY,baseY});
}
// Muretti con un ribelle accovacciato dietro (lato destro: il pilota arriva da sinistra).
function battAddCovers(L,d,rnd){
 const want=2+Math.ceil(d/2),cand=L.solids.filter(s=>s.x>1500&&s.w>=380&&s.x+s.w<L.arenaX-220).sort((a,b)=>(b.jet?1:0)-(a.jet?1:0)||rnd()-.5);
 const walls=[];
 for(const s of cand){
  if(walls.length>=want)break;
  const x=Math.round(s.x+s.w*(.38+rnd()*.24));
  if(walls.some(w=>Math.abs(w-x)<650))continue;
  if(L.hostages.some(h=>Math.abs(h.x-x)<150))continue;
  walls.push(x);
  L.props=L.props.filter(pr=>Math.abs(pr.x-x)>70||pr.kind==='jet_su'||pr.kind==='jet_giu');
  L.props.push({x,y:s.y,kind:'muretto'});
  L.triggers.push({x,type:'riparo',wallX:x,y:s.y});
 }
}

// ---------------------------------------------------------------- 1) nave sospesa e discesa col jetpack
pfShipPose=function(){
 const t=pf.t,x=330,hy=BATT.shipHoverY,bob=Math.sin(t*1.7)*5;
 if(pf.phase==='atterraggio'&&t<1.9){const k=t/1.9,e=1-(1-k)**3;return{x:x-260*(1-e),y:hy+bob*e-(hy+160)*(1-e),thrust:1}}
 // pilota a terra: la nave riparte, si impenna e vola via verso est
 const k=pf.shipLeaveT!=null?t-pf.shipLeaveT:-1;
 if(k>0){if(k>BATT.leaveTime)return{x:-1e5,y:-1e5,thrust:0,gone:true};
  return{x:x+60*k+260*k*k,y:hy+bob-40*k-60*k*k,thrust:Math.max(0,.5-k),tilt:-Math.min(.32,k*.45),leaving:true}}
 return{x,y:hy+bob,thrust:.5};
};
pfUpdateLanding=function(dt){
 const P=pf.pilot;
 if(pf.t>1.9&&pf.t-dt<=1.9){if(typeof ecoFuel==='function')ecoFuel(15);noise(.4,.03,500);tone(90,.5,'sine',.04,60)}
 if(pf.t>2.15&&!P.visible&&!P.landed){
  const s=pfShipPose();Object.assign(P,{visible:true,landing:true,x:s.x+40,y:s.y+42,vx:80,vy:30,ground:false,face:1,aim:0,jetOn:true});
  tone(520,.12,'sine',.02,780);noise(.3,.03,1800);pfStatus('SGANCIO DEL PILOTA · DISCESA COL JETPACK',2000);
 }
 if(P.landed&&pf.t>P.landedAt+.4){pf.phase='missione';pfStatus('COLONIA SOTTO ATTACCO · AVANZA VERSO EST',3200);tone(440,.18,'sine',.025,660)}
};
// Discesa frenata: il jetpack annulla quasi tutta la gravità e frena prima di toccare terra.
function battLandingStep(P,dt){
 P.jetOn=true;P.ground=false;P.inv=Math.max(0,P.inv-dt);P.fire=Math.max(0,P.fire-dt);
 const g=pfGroundAt(P.x)??PF_FLOOR,near=g-P.y<55,target=near?90:BATT.landSpeed;
 const drift=pf.phase==='atterraggio'&&!near?45:0;
 P.vy+=(target-P.vy)*Math.min(1,dt*4);P.vx+=(drift-P.vx)*Math.min(1,dt*2);
 const prevY=P.y;P.x+=P.vx*dt;P.y+=P.vy*dt;P.face=1;P.aim=.25;
 if(Math.random()<dt*45)pf.fx.push({x:P.x-8+(Math.random()-.5)*4,y:P.y-22,vx:(Math.random()-.5)*40,vy:260+Math.random()*120,life:.3,max:.3,color:Math.random()<.5?'#ffb05a':'#fff1c9',r:2+Math.random()*2.5});
 if(g-P.y<60&&Math.random()<dt*30)pfBurst(P.x+(Math.random()-.5)*30,g-2,'#c7d6e2',1,.9,true,{vy:-40});
 if(prevY<=g&&P.y>=g){
  Object.assign(P,{y:g,vy:0,vx:0,ground:true,landing:false,jetOn:false,landed:true,landedAt:pf.t,lastGround:P.x});
  if(pf.shipLeaveT==null)pf.shipLeaveT=pf.t+BATT.leaveDelay;
  for(let i=0;i<18;i++)pfBurst(P.x+(Math.random()-.5)*50,g-2,'#c7d6e2',1,1.2,true,{vy:-50-Math.random()*60});
  noise(.12,.03,700);tone(160,.12,'triangle',.03,90);pf.cam.shake=Math.max(pf.cam.shake,.18);
 }
}
pfUpdatePilot=function(dt){
 const P=pf.pilot;
 if(P.landing&&P.hp>0){battLandingStep(P,dt);return}
 P.landing=false;
 bt.pfUpdatePilot(dt);
};
// Pilota di riserva: anche lui scende col jetpack dalla navetta.
if(bt.terraUpdateDrop)terraUpdateDrop=function(dt){
 bt.terraUpdateDrop(dt);
 const D=pf.drop;if(D&&D.released&&!D.jet){D.jet=true;Object.assign(pf.pilot,{landing:true,jetOn:true,vx:0,vy:40})}
};
// Polvere sollevata dai motori della nave sospesa.
pfDrawShipOnPad=function(now){
 bt.pfDrawShipOnPad(now);
 const pose=pfShipPose();
 if(!pose.leaving&&pfOnScreen(pose.x,200)&&!paused&&Math.random()<.35)pfBurst(pose.x+(Math.random()-.5)*90,PF_FLOOR-3,'#b9c8d4',1,.9,true,{vx:(Math.random()<.5?-1:1)*90,vy:-30});
 if(pf.boom&&pf.boom.gone)battDrawWreck(now);
};

// Planata: in volo col jetpack, tenendo giù si scende piano invece di salire.
pfUpdateJetpack=function(P,dt,hold){
 if(!P.jetOn||!hold||P.jetLock||P.ground||P.hp<=0||!battDown())return bt.pfUpdateJetpack(P,dt,hold);
 P.jetGlide=true;
 P.vy+=(115-P.vy)*Math.min(1,dt*6)-PF_GRAVITY*dt;
 P.jetHeat=Math.min(100,(P.jetHeat||0)+dt*PF_JET.heat*.55);
 if(typeof ecoFuel==='function')ecoFuel(dt*PF_JET.fuel*.6);
 if(Math.random()<dt*30)pf.fx.push({x:P.x-P.face*8,y:P.y-22,vx:(Math.random()-.5)*30,vy:200+Math.random()*80,life:.25,max:.25,color:'#ffb05a',r:2+Math.random()*2});
 if(P.jetHeat>=100){P.jetOn=false;P.jetLock=true;pfStatus('JETPACK SURRISCALDATO · ATTENDI LA RICARICA',1600);tone(140,.3,'square',.02,70)}
};

// ---------------------------------------------------------------- 2) nemici al riparo
function battSpawnCover(t){
 const d=pf.p.difficulty,hp=3+(d>=3?1:0);
 pf.enemies.push({type:'soldato',cover:true,x:t.wallX+14,y:t.y,wallX:t.wallX,w:22,h:24,vx:0,vy:0,ground:true,onPlat:false,hp,max:hp,fire:9,range:0,speed:0,run:0,hit:0,face:-1,aim:Math.PI,locked:null,crouch:true,up:0,state:'giu',st:.8+pf.rnd()*.8,shots:0});
}
pfSpawnFromTriggers=function(){
 const right=pf.cam.x+pfViewW()+40;
 while(pf.nextTrigger<pf.triggers.length&&pf.triggers[pf.nextTrigger].x<=right){
  const t=pf.triggers[pf.nextTrigger++];
  if(t.type==='riparo')battSpawnCover(t);
  else if(t.type==='cecchino')pfSpawnEnemy('cecchino',t.x,t.plat.y);
  else pfSpawnEnemy(t.type,Math.max(t.x,right-10));
 }
};
function battUpdateCover(e,dt){
 const P=pf.pilot,d=pf.p.difficulty;
 e.hit=Math.max(0,e.hit-dt);e.st-=dt;
 const seen=pfOnScreen(e.x,-30)&&P.visible&&P.hp>0&&pf.phase!=='vittoria'&&pf.phase!=='atterraggio';
 const behind=P.x>e.x+10; // superato: niente più riparo tra lui e il pilota
 e.face=P.x>=e.x?1:-1;
 if(seen&&!pf.coverHint&&P.x>e.x-pfViewW()*.75){pf.coverHint=true;pfStatus('NEMICO AL RIPARO · COLPISCILO QUANDO SI ALZA O USA UNA GRANATA',3200)}
 const sh=pfShoulder(e),chest={x:P.x,y:P.y-(P.crouch?22:30)},want=Math.atan2(chest.y-sh.y,chest.x-sh.x);
 if(!seen&&e.state!=='giu'){e.state='giu';e.st=.6}
 switch(e.state){
  case'giu':e.up=Math.max(0,e.up-dt*7);if(seen&&e.st<=0){e.state='su';e.st=.2;noise(.08,.012,1400)}break;
  case'su':e.up=Math.min(1,e.up+dt*6);e.aim=want;if(e.st<=0){e.state='mira';e.st=behind?.22:Math.max(.3,.6-d*.05)}break;
  case'mira':e.up=1;e.aim=want;if(e.st<=0){e.state='fuoco';e.shots=behind?4:2+(d>=3?1:0);e.st=0}break;
  case'fuoco':e.up=1;e.aim=want;
   if(e.st<=0){pfEnemyShot(sh.x+Math.cos(e.aim)*36,sh.y+Math.sin(e.aim)*36,e.aim,420+d*22,13);e.shots--;e.st=.2;
    if(e.shots<=0){e.state='giu';e.st=behind?.45:1.1+pf.rnd()*.9-d*.08}}
   break;
 }
 e.crouch=e.up<.55;e.h=24+40*e.up;
 if(P.visible&&P.hp>0&&pfOverlap(pfRect(P),pfRect(e)))pfDamage(14,Math.sign(P.x-e.x)||1);
}
pfUpdateEnemies=function(dt){
 const covers=pf.enemies.filter(e=>e.cover);
 if(covers.length)pf.enemies=pf.enemies.filter(e=>!e.cover);
 bt.pfUpdateEnemies(dt);
 for(const e of covers){
  if(e.hp<=0||e.x<pf.cam.x-500)continue;
  if(pf.phase==='vittoria'){e.hp=0;pfBurst(e.x,e.y-24,'#ff7b4f',14,1);continue}
  battUpdateCover(e,dt);pf.enemies.push(e);
 }
};
// Chi sta al riparo, se abbattuto, lascia più spesso un rifornimento.
{const prevHit=pfHitEnemy;pfHitEnemy=function(e,n){const was=e.hp;prevHit(e,n);if(e.cover&&was>0&&e.hp<=0&&pf.rnd()<.45)pfDrop(e.x,e.y-30,pf.pilot.hp<60?'salute':'granate')}}
// I colpi si fermano anche sui muretti.
pfShotObstacle=function(b){
 const hit=bt.pfShotObstacle(b);let best=hit?Math.hypot(hit.x-b.px,hit.y-b.py):Infinity,res=hit;
 for(const pr of pf.props){
  if(pr.kind!=='muretto'||pr.x<Math.min(b.px,b.x)-30||pr.x>Math.max(b.px,b.x)+30)continue;
  const t=pfSegRect(b.px,b.py,b.x,b.y,{l:pr.x-BATT.coverW/2,r:pr.x+BATT.coverW/2,t:pr.y-BATT.coverH,b:pr.y},0);
  if(t!==null){const x=b.px+(b.x-b.px)*t,y=b.py+(b.y-b.py)*t,dd=Math.hypot(x-b.px,y-b.py);if(dd<best){best=dd;res={x,y}}}
 }
 return res;
};

// ---- disegno del muretto e del soldato che si alza e si abbassa
function battDrawWall(x,y,now){
 const w=BATT.coverW,h=BATT.coverH;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,1,w*.75,5,0,0,6.28);ctx.fill();
 // sacchi di sabbia
 const bag=(bx,by,bw)=>{const g=ctx.createLinearGradient(0,by-9,0,by+2);g.addColorStop(0,'#a59a76');g.addColorStop(1,'#5f563f');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(bx,by-4,bw/2,6,0,0,6.28);ctx.fill();ctx.strokeStyle='rgba(30,24,14,.6)';ctx.lineWidth=1;ctx.stroke()};
 for(const [bx,by,bw] of [[-11,0,22],[11,0,22],[0,-10,22],[-14,-10,14],[14,-10,14]])bag(bx,by,bw);
 // piastra corazzata del Fronte Ombra
 const g=ctx.createLinearGradient(-w/2,-h,w/2,-h+20);g.addColorStop(0,'#4a5260');g.addColorStop(.5,'#2b313b');g.addColorStop(1,'#1a1e25');
 ctx.fillStyle=g;ctx.strokeStyle='#8a96a6';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-w/2,-17);ctx.lineTo(-w/2+3,-h);ctx.lineTo(w/2-3,-h);ctx.lineTo(w/2,-17);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.save();ctx.clip();ctx.fillStyle='#c8364a';for(let i=-3;i<4;i++){ctx.save();ctx.translate(i*10,-24);ctx.rotate(-.7);ctx.fillRect(-2,-9,4,18);ctx.restore()}ctx.restore();
 ctx.fillStyle='#0b0e13';ctx.fillRect(-7,-h+4,14,3);
 ctx.fillStyle='#ff5268';ctx.shadowBlur=6;ctx.shadowColor='#ff5268';ctx.fillRect(w/2-7,-h+3,3,2);
 ctx.restore();
}
function battDrawCoverSoldier(e,now,drawTrooper){
 const dy=(1-e.up)*34;
 if(e.state==='mira'&&pfOnScreen(e.x)){
  const sh=pfShoulder(e),a=e.aim,on=Math.floor(now*16)%2;
  ctx.save();ctx.strokeStyle=`rgba(255,82,104,${on?.5:.2})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sh.x+Math.cos(a)*28,sh.y+Math.sin(a)*28);ctx.lineTo(sh.x+Math.cos(a)*900,sh.y+Math.sin(a)*900);ctx.stroke();
  ctx.fillStyle='#ffd0d6';ctx.shadowBlur=12;ctx.shadowColor='#ff5268';ctx.beginPath();ctx.arc(sh.x+Math.cos(a)*30,sh.y+Math.sin(a)*30,2.4,0,6.28);ctx.fill();ctx.restore();
 }
 ctx.save();ctx.beginPath();ctx.rect(e.x-90,e.y-240,180,240);ctx.clip();
 const te=Object.assign({},e,{y:e.y+dy,crouch:e.up<.55,ground:true,vx:0});drawTrooper(te,PF_REBEL,now);
 // lampo del colpo: la stessa figura ridisegnata in modo additivo (ctx.filter su Chrome costa un intero schermo)
 if(e.hit>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.85;drawTrooper(te,PF_REBEL,now)}
 ctx.restore();
 battDrawWall(e.wallX,e.y,now);
 // elmetto che spunta e barra della vita sopra il muretto
 const top=e.y-BATT.coverH-14-e.up*22;
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(e.x-15,top-1,30,5);ctx.fillStyle=hpColor(e.hp/e.max);ctx.fillRect(e.x-14,top,28*Math.max(0,e.hp/e.max),3);
}
gEnemy=function(e,now){if(e.cover)return battDrawCoverSoldier(e,now,gTrooper);return bt.gEnemy(e,now)};
pfDrawEnemy=function(e,now){if(e.cover)return battDrawCoverSoldier(e,now,pfDrawTrooper);return bt.pfDrawEnemy(e,now)};

// ---------------------------------------------------------------- 3) cartelli dei passaggi col jetpack
pfDrawProp=function(pr,now){
 if(pr.kind==='muretto')return battDrawWall(pr.x,pr.y,now);
 if(pr.kind!=='jet_su'&&pr.kind!=='jet_giu')return bt.pfDrawProp(pr,now);
 const up=pr.kind==='jet_su',blink=.6+.4*Math.sin(now*5);
 ctx.save();ctx.translate(pr.x,pr.y);
 ctx.fillStyle='#22313f';ctx.fillRect(-2,-70,4,70);
 ctx.fillStyle='rgba(6,18,30,.9)';ctx.strokeStyle=`rgba(255,179,72,${.5+blink*.4})`;ctx.lineWidth=1.5;ctx.fillRect(-34,-112,68,44);ctx.strokeRect(-34,-112,68,44);
 ctx.fillStyle='#ffb348';ctx.font='700 10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('JETPACK',0,-98);
 ctx.shadowBlur=10*blink;ctx.shadowColor='#ffb348';ctx.beginPath();
 if(up){ctx.moveTo(0,-94);ctx.lineTo(11,-80);ctx.lineTo(4,-80);ctx.lineTo(4,-72);ctx.lineTo(-4,-72);ctx.lineTo(-4,-80);ctx.lineTo(-11,-80)}
 else{ctx.moveTo(-18,-92);ctx.lineTo(6,-92);ctx.lineTo(6,-86);ctx.lineTo(14,-86);ctx.lineTo(4,-72);ctx.lineTo(-6,-86);ctx.lineTo(0,-86);ctx.lineTo(0,-88);ctx.lineTo(-18,-88)}
 ctx.closePath();ctx.fill();
 ctx.restore();
};
function battJetHints(){
 const P=pf.pilot;if(!P.visible||!pf.jetZones)return;
 for(const z of pf.jetZones){
  if(!z.hintUp&&P.x>z.wallX-460&&P.x<z.wallX){z.hintUp=true;pfStatus('PARETE ROCCIOSA · USA IL JETPACK PER SALIRE',2800)}
  if(!z.hintDown&&P.x>z.edgeX-220&&P.x<z.edgeX&&P.y<=z.topY+4){z.hintDown=true;pfStatus('BURRONE · PLANA COL JETPACK (SALTO + GIÙ)',3000)}
 }
}

// ---------------------------------------------------------------- 4) esplosione scenografica del boss
pfUpdateBoss=function(dt){const B=pf.boss;if(B&&B.state==='distrutto')return;bt.pfUpdateBoss(dt)};
function battCore(B){return{x:B.x+B.face*10,y:B.y-B.h*.62}}
// Avanza la sequenza in tempo reale e restituisce il fattore di rallentamento del gioco.
function battBoom(dt){
 const B=pf.boss;if(!B||B.state!=='distrutto')return 1;
 let K=pf.boom;
 if(!K){
  K=pf.boom={t:0,gone:false,white:.9,debris:[],rings:[],balls:[],nextPop:0,sink:0,tilt:0,charge:0};
  pf.cam.shake=Math.max(pf.cam.shake,.9);sfx('boom',1.8);tone(55,1.6,'sawtooth',.05,30);noise(1.2,.05,300);
  pfStatus('NUCLEO IN SOVRACCARICO · ALLONTANATI',2600);
 }
 const prev=K.t;K.t+=dt;const t=K.t,core=battCore(B);
 K.white=Math.max(0,K.white-dt*(K.gone?1.1:2.5));
 if(!K.gone){
  K.sink=Math.min(1,t/BATT.boomBlast)**2;K.tilt=.16*K.sink;
  // esplosioni a catena sempre più fitte
  K.nextPop-=dt;
  if(K.nextPop<=0){
   K.nextPop=Math.max(.06,.32-t*.09);
   const x=B.x+(Math.random()-.5)*B.w*.9,y=B.y-K.sink*30-Math.random()*B.h*.9;
   pfBurst(x,y,'#ffb05a',16,1.2);pfBurst(x,y,'#fff1c9',6,.7);pfBurst(x,y,'#55575e',6,.6,true,{vy:-90});
   K.balls.push({x,y,r:14+Math.random()*16,max:.55,life:.55,vy:-40});
   if(typeof gFlash==='function')gFlash(x,y,170,'#ffb05a',.35);
   sfx('boom',.5+Math.random()*.4);pf.cam.shake=Math.max(pf.cam.shake,.35);
   if(Math.random()<.45)battDebris(x,y,1,.6);
  }
  // getti di fuoco e fumo dalle crepe
  if(Math.random()<dt*24){const x=B.x+(Math.random()-.5)*B.w*.7,y=B.y-B.h*(.3+Math.random()*.6);pf.fx.push({x,y,vx:(Math.random()-.5)*60,vy:-120-Math.random()*90,life:.6,max:.6,color:Math.random()<.5?'#ff9a4a':'#ffd27a',r:3+Math.random()*3})}
  if(Math.random()<dt*18)pf.fx.push({x:B.x+(Math.random()-.5)*B.w*.6,y:B.y-B.h*(.5+Math.random()*.5),vx:(Math.random()-.5)*20,vy:-50-Math.random()*40,life:2,max:2,color:'rgba(40,40,46,.55)',r:10+Math.random()*10,soft:true});
  // il nucleo si carica: luce che cresce e fischio che sale
  if(t>BATT.boomBlast-.75){K.charge=Math.min(1,(t-(BATT.boomBlast-.75))/.75);if(prev<=BATT.boomBlast-.75){tone(180,.8,'sawtooth',.03,1900);tone(240,.8,'sine',.03,2600)}}
  if(t>=BATT.boomBlast)battBlast(B,K,core);
 }else{
  // fungo di fumo e braci dopo lo scoppio
  const a=t-BATT.boomBlast;
  if(a<5&&Math.random()<dt*26){const k=Math.min(1,a/2.5);pf.fx.push({x:K.x+(Math.random()-.5)*(40+k*60),y:PF_FLOOR-40-k*260-Math.random()*40,vx:(Math.random()-.5)*30,vy:-40-Math.random()*30,life:2.6,max:2.6,color:'rgba(52,48,50,.5)',r:18+Math.random()*22,soft:true})}
  if(a<7&&Math.random()<dt*20)pf.fx.push({x:K.x+(Math.random()-.5)*120,y:PF_FLOOR-10,vx:(Math.random()-.5)*50,vy:-80-Math.random()*120,life:1.4,max:1.4,color:'#ffb05a',r:1.6+Math.random()*1.4});
  B.dead=2.3+a;
 }
 for(const b of K.balls){b.life-=dt;b.r+=dt*(b.grow||60);b.y+=(b.vy||0)*dt}
 K.balls=K.balls.filter(b=>b.life>0);
 for(const r of K.rings){r.r+=r.speed*dt;r.speed*=Math.pow(.35,dt);r.life-=dt}
 K.rings=K.rings.filter(r=>r.life>0);
 for(const d of K.debris){
  d.vy+=PF_GRAVITY*.75*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;d.life-=dt;
  const g=pfGroundAt(d.x);if(g!==null&&d.y>g-3&&d.vy>0){d.y=g-3;d.vy*=-.32;d.vx*=.6;d.vr*=.5;if(Math.abs(d.vy)<40)d.vy=0}
  if(d.hot&&Math.random()<dt*20)pf.fx.push({x:d.x,y:d.y,vx:0,vy:-20,life:.5,max:.5,color:'rgba(60,60,66,.5)',r:4+Math.random()*3,soft:true});
 }
 K.debris=K.debris.filter(d=>d.life>0&&d.y<PF_VH+60);
 if(t<.15)return .12;
 if(t<1.1)return .35;
 if(t<1.7)return .35+(t-1.1)/.6*.65;
 return 1;
}
function battDebris(x,y,n,power){
 const K=pf.boom;
 for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*2.6,s=(260+Math.random()*520)*power;
  K.debris.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:Math.random()*6.28,vr:(Math.random()-.5)*14,w:6+Math.random()*16,h:4+Math.random()*9,life:4+Math.random()*3,hot:Math.random()<.6,col:['#3a4656','#55697d','#2a3644','#6b4a3a'][i%4]})}
}
function battBlast(B,K,core){
 K.gone=true;K.white=1;K.x=B.x;B.gone=true;B.dead=2.3;
 K.rings.push({x:core.x,y:core.y,r:20,speed:1500,life:1.1,max:1.1,w:10,col:'255,240,210'},{x:core.x,y:core.y,r:10,speed:900,life:1.4,max:1.4,w:6,col:'255,170,90'},{x:B.x,y:PF_FLOOR-4,r:10,speed:1200,life:1,max:1,w:5,col:'255,210,160',flat:true});
 for(let i=0;i<16;i++){const a=Math.random()*6.28,d=Math.random()*B.w*.5;K.balls.push({x:core.x+Math.cos(a)*d,y:core.y+Math.sin(a)*d*.8,r:30+Math.random()*40,max:1.1+Math.random()*.6,life:1.1+Math.random()*.6,vy:-60-Math.random()*60,grow:90})}
 battDebris(core.x,core.y,28,1);
 pfBurst(core.x,core.y,'#ffb05a',70,2.6);pfBurst(core.x,core.y,'#ffffff',26,1.6);pfBurst(core.x,core.y,'#7d8794',34,1.4,true,{vy:-220});
 for(let i=-12;i<=12;i++)pfBurst(B.x+i*40,PF_FLOOR-3,'#c7d6e2',2,1.1,true,{vx:Math.sign(i)*240,vy:-90});
 pf.cam.shake=1.7;pf.flash=0;
 if(typeof gFlash==='function')gFlash(core.x,core.y,900,'#ffd9a0',1.4);
 sfx('boom',2.6);sfx('boom',1.6);tone(40,2.4,'sine',.09,22);noise(2.2,.08,240);noise(.8,.05,2400,.05);
 show('pfBoss',false);pfBanner('COLONIA LIBERATA','LA REPUBBLICA INTERGALATTICA RINGRAZIA',4.2);pfFreeColony();
}
// Il robot si accascia e si piega mentre esplode.
if(bt.gBoss)gBoss=function(B,now){
 const K=pf&&pf.boom;
 if(!K||B.state!=='distrutto'||K.gone)return bt.gBoss(B,now);
 ctx.save();ctx.translate(B.x,B.y);ctx.rotate(-B.face*K.tilt);ctx.translate(-B.x,-B.y+K.sink*30);
 bt.gBoss(B,now);
 ctx.restore();
};
if(bt.gCollectLights)gCollectLights=function(now){
 bt.gCollectLights(now);
 const K=pf.boom,B=pf.boss;if(!K||!B)return;
 if(!K.gone){const c=battCore(B);gLight(c.x,c.y,140+K.charge*420,'#ffd9a0',.4+K.charge*.9)}
 else{const a=pf.t;gLight(K.x,PF_FLOOR-30,180,'#ff7a2a',.55+.15*Math.sin(a*13))}
};
// Effetti dell'esplosione in coordinate di mondo, sopra la scena.
function battDrawBoom(now){
 const K=pf.boom,B=pf.boss;if(!K||!B)return;
 const s=pfScale();
 ctx.save();ctx.scale(s,s);ctx.translate(-pf.cam.x,0);ctx.globalCompositeOperation='lighter';
 if(!K.gone&&K.charge>0){
  const c=battCore(B),r=30+K.charge*110,g=ctx.createRadialGradient(c.x,c.y,1,c.x,c.y,r);
  g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.35,`rgba(255,220,170,${.6*K.charge})`);g.addColorStop(1,'rgba(255,120,60,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,6.28);ctx.fill();
  ctx.strokeStyle=`rgba(255,235,200,${.5*K.charge})`;ctx.lineWidth=2;
  for(let i=0;i<14;i++){const a=i/14*6.28+now*.7,l=(1-((now*2.4+i*.37)%1))*260*K.charge+20;ctx.beginPath();ctx.moveTo(c.x+Math.cos(a)*l,c.y+Math.sin(a)*l);ctx.lineTo(c.x+Math.cos(a)*(l+30),c.y+Math.sin(a)*(l+30));ctx.stroke()}
 }
 for(const b of K.balls){const k=b.life/b.max,g=ctx.createRadialGradient(b.x,b.y,1,b.x,b.y,b.r);g.addColorStop(0,`rgba(255,250,220,${.9*k})`);g.addColorStop(.4,`rgba(255,170,70,${.7*k})`);g.addColorStop(1,'rgba(255,60,20,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.28);ctx.fill()}
 for(const r of K.rings){const k=Math.max(0,r.life/r.max);ctx.strokeStyle=`rgba(${r.col},${.8*k})`;ctx.lineWidth=r.w*k+1;ctx.shadowBlur=20;ctx.shadowColor=`rgba(${r.col},1)`;ctx.beginPath();if(r.flat)ctx.ellipse(r.x,r.y,r.r,r.r*.12,0,0,6.28);else ctx.arc(r.x,r.y,r.r,0,6.28);ctx.stroke()}
 ctx.shadowBlur=0;ctx.globalCompositeOperation='source-over';
 for(const d of K.debris){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.fillStyle=d.col;ctx.strokeStyle=d.hot?'#ff9a4a':'#8b9ba9';ctx.lineWidth=1;ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h);ctx.strokeRect(-d.w/2,-d.h/2,d.w,d.h);ctx.restore()}
 ctx.restore();
 if(K.white>0){ctx.fillStyle=`rgba(255,246,228,${K.white*.85})`;ctx.fillRect(0,0,W,H)}
}
// Rottami fumanti dove c'era il robot.
function battDrawWreck(now){
 const K=pf.boom,x=K.x,y=PF_FLOOR;if(!pfOnScreen(x,160))return;
 ctx.save();
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(x,y+1,110,10,0,0,6.28);ctx.fill();
 ctx.fillStyle='#1a1f26';ctx.strokeStyle='#4a5260';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-90,y);ctx.lineTo(x-62,y-22);ctx.lineTo(x-30,y-16);ctx.lineTo(x-8,y-40);ctx.lineTo(x+22,y-26);ctx.lineTo(x+50,y-34);ctx.lineTo(x+86,y);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#2b3846';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-20,y-30);ctx.lineTo(x-44,y-70);ctx.moveTo(x+30,y-28);ctx.lineTo(x+58,y-58);ctx.stroke();
 const glow=.5+.5*Math.sin(now*6);ctx.fillStyle=`rgba(255,${Math.round(100+glow*80)},40,.8)`;ctx.fillRect(x-24,y-20,14,3);ctx.fillRect(x+18,y-14,10,3);
 ctx.globalCompositeOperation='lighter';
 for(let i=0;i<5;i++){const fx=x-60+i*30,h=26+Math.sin(now*9+i*1.7)*10+((i*37)%17);const g=ctx.createLinearGradient(fx,y-12-h,fx,y-10);g.addColorStop(0,'rgba(255,120,40,0)');g.addColorStop(.5,'rgba(255,150,60,.6)');g.addColorStop(1,'rgba(255,230,160,.8)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(fx-9,y-10);ctx.quadraticCurveTo(fx-6+Math.sin(now*7+i)*4,y-10-h*.6,fx+Math.sin(now*5+i)*5,y-10-h);ctx.quadraticCurveTo(fx+6,y-10-h*.5,fx+9,y-10);ctx.closePath();ctx.fill()}
 ctx.restore();
}
pfDrawBanner=function(){if(pf&&pf.boom)battDrawBoom(performance.now()/1000);bt.pfDrawBanner()};

// ---------------------------------------------------------------- ciclo: rallentatore e fine missione più lunga
// rombo dei motori quando la nave riparte dopo aver lasciato il pilota
function battShipLeaveSound(){
 if(pf.shipLeft||pf.shipLeaveT==null||pf.t<pf.shipLeaveT)return;
 pf.shipLeft=true;noise(.7,.03,900);tone(110,.9,'sawtooth',.02,380);
}
updatePlatform=function(dt){
 if(!pf)return bt.updatePlatform(dt);
 const k=battBoom(dt);
 battShipLeaveSound();
 if(pf.phase==='vittoria'&&pf.boom)pf.endT=pf.boom.t>=BATT.boomEnd?99:0;
 bt.updatePlatform(dt*k);
 if(state==='platform'&&pf)battJetHints();
};
