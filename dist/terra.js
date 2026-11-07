// Stellar Frontier — FASE A TERRA: soldati col jetpack, rinforzi durante il boss, barriera e pilota di riserva.
// 1) Alcuni soldati ribelli volano col jetpack: restano sospesi sopra il pilota e sparano dall'alto.
// 2) Durante lo scontro col boss arrivano rinforzi casuali (soldati, jetpack, droni, cecchini).
// 3) La barriera del pilota è più grande e luminosa e copre tutto il corpo.
// 4) Quando il pilota muore, una navetta scende sopra l'ultimo checkpoint e sgancia un nuovo pilota.

const TERRA={jetChance:d=>Math.min(.45,.18+d*.05),bossEvery:d=>Math.max(2.6,5.2-d*.4),bossMax:d=>2+Math.floor(d/2)};
const tOrig={pfSpawnEnemy,pfUpdateEnemies,pfLoseLife,pfDrawShipOnPad,pfThrowGrenade,gEnemy};

// ---- 1) soldati col jetpack
pfSpawnEnemy=function(type,x,y){
 const n=pf.enemies.length,d=pf.p.difficulty;
 if(type==='jet'||type==='soldato'&&y===undefined&&pf.rnd()<TERRA.jetChance(d)){
  const g=pfGroundAt(x)??PF_FLOOR,hp=3+(d>=3?1:0);
  pf.enemies.push({type:'soldato',jet:true,x,y:g-170-pf.rnd()*60,w:22,h:48,vx:-60,vy:0,ground:false,hp,max:hp,fire:1.2+pf.rnd(),range:0,speed:120,run:0,hit:0,face:-1,aim:Math.PI,locked:null,side:pf.rnd()<.5?-1:1,t:pf.rnd()*6,dist:140+pf.rnd()*180,alt:110+pf.rnd()*90});
  return;
 }
 tOrig.pfSpawnEnemy(type,x,y);
 const e=pf.enemies[n];if(e&&pf.phase==='boss')e.boss=true;
};
function terraUpdateJet(e,dt){
 const P=pf.pilot,d=pf.p.difficulty,chest={x:P.x,y:P.y-(P.crouch?22:30)};
 e.hit=Math.max(0,e.hit-dt);e.t+=dt;
 const dx=P.x-e.x;e.face=dx>=0?1:-1;
 // vola verso un punto di lato e sopra al pilota, ondeggiando
 let tx=P.x+e.side*(e.dist+Math.sin(e.t*.7)*50),ty=P.y-e.alt+Math.sin(e.t*2.2)*22;
 if(pf.cam.lock){const VW=pfViewW();tx=pfClamp(tx,pf.cam.lockX+60,pf.cam.lockX+Math.min(VW,1500)-60)}
 const g=pfGroundAt(tx);if(g!==null)ty=Math.min(ty,g-90);ty=Math.max(ty,110);
 e.vx+=pfClamp((tx-e.x)*1.2-e.vx,-500*dt,500*dt);e.vy+=pfClamp((ty-e.y)*1.4-e.vy,-420*dt,420*dt);
 e.vx=pfClamp(e.vx,-190,190);e.vy=pfClamp(e.vy,-150,150);e.x+=e.vx*dt;e.y+=e.vy*dt;
 if(Math.abs(e.x-tx)<40&&pf.rnd()<dt*.4)e.side=-e.side; // ogni tanto cambia lato
 const sh=pfShoulder(e);e.aim=Math.atan2(chest.y-sh.y,chest.x-sh.x);
 const seen=pfOnScreen(e.x)&&P.visible&&P.hp>0&&pf.phase!=='vittoria';
 if(seen){e.fire-=dt;if(e.fire<=0){pfEnemyShot(sh.x+Math.cos(e.aim)*26,sh.y+Math.sin(e.aim)*26,e.aim,360+d*20,12);e.fire=1.9-d*.1+pf.rnd()*.7}}
 if(pf.rnd()<dt*14)pfBurst(e.x-e.face*11,e.y-30,'#ff9a4a',1,.35,false,{vy:160});
 if(pfOverlap(pfRect(P),pfRect(e)))pfContact(e);
}

// ---- 2) rinforzi casuali durante lo scontro col boss
function terraBossSpawn(dt){
 const B=pf.boss;if(pf.phase!=='boss'||!B||B.hp<=0||B.state==='caduta'||B.dead)return;
 const d=pf.p.difficulty;
 pf.bossSpawn=(pf.bossSpawn??2.5)-dt;
 if(pf.bossSpawn>0)return;
 pf.bossSpawn=TERRA.bossEvery(d)+pf.rnd()*2;
 if(pf.enemies.filter(e=>e.hp>0).length>=TERRA.bossMax(d))return;
 const VW=Math.min(pfViewW(),1500),left=pf.rnd()<.5,x=left?pf.cam.lockX+50:pf.cam.lockX+VW-50;
 const kinds=['soldato','jet','drone','cecchino'],k=kinds[Math.floor(pf.rnd()*kinds.length)];
 const n=pf.enemies.length;
 if(k==='cecchino')tOrig.pfSpawnEnemy('cecchino',x,PF_FLOOR);
 else if(k==='soldato')tOrig.pfSpawnEnemy('soldato',x);
 else pfSpawnEnemy(k,x);
 const e=pf.enemies[n];if(!e)return;
 e.boss=true;e.face=left?1:-1;
 if(k==='jet'||k==='drone'){e.y=Math.min(e.y,PF_FLOOR-260);e.vx=left?120:-120}
 pfBurst(x,(k==='jet'||k==='drone')?e.y:PF_FLOOR-30,'#ff5268',10,.8);
}
pfUpdateEnemies=function(dt){
 terraBossSpawn(dt);
 const jets=pf.enemies.filter(e=>e.jet);
 if(jets.length)pf.enemies=pf.enemies.filter(e=>!e.jet);
 tOrig.pfUpdateEnemies(dt);
 for(const e of jets)if(e.hp>0){terraUpdateJet(e,dt);if(e.x>pf.cam.x-500)pf.enemies.push(e)}
 // boss abbattuto: i rinforzi rimasti esplodono
 if(pf.phase==='vittoria')for(const e of pf.enemies)if(e.hp>0){e.hp=0;pfBurst(e.x,e.type==='drone'?e.y:e.y-24,'#ff7b4f',14,1)}
 pf.enemies=pf.enemies.filter(e=>e.hp>0);
 terraUpdateDrop(dt);
};
gEnemy=function(e,now){
 if(e.jet&&e.hp>0){
  // zaino e fiamma del jetpack dietro al soldato
  const x=e.x-e.face*11,y=e.y-36,l=24+Math.random()*14;
  ctx.save();ctx.fillStyle='#3b2a30';ctx.strokeStyle='#ff8a5a';ctx.lineWidth=1;ctx.fillRect(x-5,y-22,10,24);ctx.strokeRect(x-5,y-22,10,24);
  ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(x,y+2,x,y+2+l);g.addColorStop(0,'rgba(255,245,210,.95)');g.addColorStop(.4,'rgba(255,150,60,.85)');g.addColorStop(1,'rgba(255,70,30,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-5,y+2);ctx.lineTo(x+5,y+2);ctx.lineTo(x,y+2+l);ctx.closePath();ctx.fill();ctx.restore();
 }
 tOrig.gEnemy(e,now);
};

// ---- 3) barriera: copre tutto il pilota (disegnato più grande dell'area di collisione)
pfDrawBarrier=function(P,now){
 const pulse=.5+.5*Math.sin(now*8),k=Math.max(.35,(P.shield||0)/100),rx=38,ry=P.crouch?36:50,cy=P.y-(P.crouch?28:38);
 ctx.save();ctx.translate(P.x,cy);
 const fill=ctx.createRadialGradient(0,0,ry*.2,0,0,ry);fill.addColorStop(0,'rgba(81,230,255,.04)');fill.addColorStop(.75,`rgba(81,230,255,${.12*k})`);fill.addColorStop(1,`rgba(160,248,255,${.32*k})`);
 ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,6.28);ctx.fillStyle=fill;ctx.fill();
 // trama esagonale dentro la bolla
 ctx.save();ctx.clip();ctx.strokeStyle=`rgba(150,245,255,${(.16+pulse*.1)*k})`;ctx.lineWidth=1;
 const s=9,hh=s*Math.sqrt(3)/2;ctx.beginPath();
 for(let r=-7;r<=7;r++)for(let c=-4;c<=4;c++){const hx=c*s*3+(r&1?s*1.5:0),hy=r*hh;for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;ctx.moveTo(hx+Math.cos(a)*s,hy+Math.sin(a)*s);ctx.lineTo(hx+Math.cos(b)*s,hy+Math.sin(b)*s)}}
 ctx.stroke();ctx.restore();
 // bordo luminoso e riflesso che gira
 ctx.shadowBlur=22;ctx.shadowColor='#51e6ff';ctx.strokeStyle=`rgba(140,242,255,${(.7+pulse*.3)*Math.min(1,k+.25)})`;ctx.lineWidth=3;
 ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,6.28);ctx.stroke();
 ctx.strokeStyle='rgba(235,253,255,.85)';ctx.lineWidth=2;ctx.beginPath();const a0=now*2.4;ctx.ellipse(0,0,rx-3,ry-3,0,a0,a0+.9);ctx.stroke();
 ctx.restore();
};

// ---- 4) pilota di riserva sganciato dalla navetta
const DROP={come:1.1,release:1.35,leave:1.9,end:3.2,hover:200};
pfLoseLife=function(...args){
 if(!pf||pf.lives<=0||(pf.drop&&!pf.drop.released))return;
 tOrig.pfLoseLife(...args);
 if(pf.lives<=0||pf.phase==='sconfitta'){pf.drop=null;return}
 const P=pf.pilot;
 const g=(pfGroundAt(P.x)??PF_FLOOR);
 pf.drop={t:0,x:P.x,g,released:false};
 P.visible=false;P.barrier=false;P.vx=P.vy=0;P.inv=DROP.release+2.2;
 pfStatus('PILOTA DI RISERVA IN ARRIVO · VITE RIMASTE '+pf.lives,2600);
};
function terraDropPose(D){
 const t=D.t,hx=D.x-40,hy=D.g-DROP.hover;
 if(t<DROP.come){const k=1-(1-t/DROP.come)**3;return{x:hx-320*(1-k),y:hy-420*(1-k),thrust:1}}
 if(t<DROP.leave)return{x:hx,y:hy+Math.sin(t*6)*3,thrust:.55};
 const k=((t-DROP.leave)/(DROP.end-DROP.leave))**2;return{x:hx+520*k,y:hy-520*k,thrust:1};
}
function terraUpdateDrop(dt){
 const D=pf.drop;if(!D)return;
 D.t+=dt;const P=pf.pilot;
 if(!D.released&&D.t>=DROP.release){
  D.released=true;const s=terraDropPose(D);
  Object.assign(P,{visible:true,x:s.x+40,y:s.y+36,vx:0,vy:60,ground:false,onPlat:false,
   hp:100,shield:100,shieldDelay:0,barrier:false,inv:2.4,fire:0,contactCd:0,jetOn:false,
   jetHeat:0,jetLock:false,jetMin:0,jetGlide:false,landing:false,crouch:false,
   jumpBuf:0,coyote:0,dropT:0,sotHold:0});
  if(typeof spcResetGround==='function')spcResetGround();
  tone(520,.12,'sine',.02,780);
 }
 if(D.t>=DROP.end)pf.drop=null;
}
pfDrawShipOnPad=function(now){
 tOrig.pfDrawShipOnPad(now);
 const D=pf.drop;if(!D)return;
 const pose=terraDropPose(D);if(!pfOnScreen(pose.x,160))return;
 ctx.save();
 for(const ox of [-26,22])drawPlume(pose.x+ox,pose.y+30,0,1,(40+Math.random()*16)*pose.thrust+8,6*pose.thrust+2,'#51e6ff');
 ctx.translate(pose.x,pose.y);ctx.scale(2.3,2.3);
 drawShip({x:0,y:0,angle:0,forward:1,strafe:0,barrier:false,boostState:'ready'});
 ctx.restore();
 if(D.t>DROP.come&&D.t<DROP.leave){ // fascio del portello
  const a=.45*Math.sin((D.t-DROP.come)/(DROP.leave-DROP.come)*Math.PI);
  ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createLinearGradient(0,pose.y,0,D.g);g.addColorStop(0,`rgba(140,240,255,${a})`);g.addColorStop(1,'rgba(140,240,255,0)');
  ctx.fillStyle=g;ctx.fillRect(pose.x+28,pose.y+10,24,D.g-pose.y-10);ctx.restore();
 }
};
// Mentre la navetta scende il pilota non c'è: niente granate.
pfThrowGrenade=function(){if(pf&&!pf.pilot.visible)return;tOrig.pfThrowGrenade()};

// ---- 5) barra della vita accanto alla nave del giocatore e al pilota (verde → giallo → rosso)
function drawSideBar(x,y,h,k){
 k=Math.max(0,Math.min(1,k));
 ctx.save();ctx.fillStyle='rgba(2,8,16,.7)';ctx.fillRect(x-1.5,y-1.5,7,h+3);
 ctx.fillStyle=hpColor(k);ctx.shadowBlur=6;ctx.shadowColor=hpColor(k);ctx.fillRect(x,y+h*(1-k),4,h*k);
 ctx.restore();
}
const tOrig2={drawPlayer};
// La salute della nave ora sta solo nella barra in basso.
// ---- 6) scafo inclinato: quando la prua non punta dove va la nave, la nave si piega su un lato
const tOrigShip=drawShip;let bankDrawT=0;
function bankTarget(){
 const sp=Math.hypot(player.vx,player.vy);if(sp<25)return 0;
 const slip=Math.sin(Math.atan2(player.vy,player.vx)-player.angle);// >0: va verso la sua destra
 return Math.max(-1,Math.min(1,slip*Math.min(1,sp/180)*1.3));
}
drawPlayer=function(){
 const now=performance.now(),dt=Math.min(.1,(now-(bankDrawT||now))/1000);bankDrawT=now;
 if(player&&!player.destroyed){const t=bankTarget();player.bank=(player.bank||0)+(t-(player.bank||0))*Math.min(1,dt*7)}
 tOrig2.drawPlayer();
};
drawShip=function(ship,hostile){
 const b=!hostile&&state!=='platform'&&player&&ship.x===player.x&&ship.y===player.y?(player.bank||0):0;
 if(Math.abs(b)<.02)return tOrigShip(ship,hostile);
 shipRoll3D(ship,hostile,b);
};
// ---- 6b) rollio in 3D: la nave ruota sul suo asse e si vede lo spessore (fianchi, ventre, motori, cupola).
// Ogni pezzo è un solido "a fette": la stessa sagoma ripetuta a quote diverse, proiettata col rollio.
const SH3_HULL=[[29,0],[8,-7],[-7,-16],[-13,-9],[-22,-12],[-17,0],[-22,12],[-13,9],[-7,16],[8,7]];
const SH3_KEEL=[[26,0],[10,-5],[-15,-5.5],[-19,0],[-15,5.5],[10,5]];
const SH3_CANOPY=[[15,0],[4,-5],[-5,-4],[-8,0],[-5,4],[4,5]];
function sh3Poly(pts){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath()}
// disegna una sagoma a quota z con rollio (c=cos, s=sin): y' = y*c - z*s
function sh3Slab(pts,z0,z1,c,s,col){
 const T=ctx.getTransform?ctx.getTransform():null,px=T?Math.hypot(T.a,T.b):1,n=Math.min(40,Math.max(2,Math.ceil(Math.abs((z1-z0)*s)*px)+1));
 for(let i=0;i<n;i++){const k=i/(n-1),z=z0+(z1-z0)*k;ctx.save();ctx.transform(1,0,0,c,0,-z*s);ctx.fillStyle=col(k);sh3Poly(pts);ctx.fill();if(i===0){ctx.strokeStyle='rgba(4,10,18,.9)';ctx.lineWidth=.8;ctx.stroke()}ctx.restore()}
}
function shipRoll3D(ship,hostile,b){
 const phi=-b*1.05,c=Math.cos(phi),s=Math.sin(phi),A=Math.min(1,Math.abs(b));
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
 // ombra morbida sotto la nave: si sposta dal lato che scende
 ctx.save();ctx.globalAlpha=.22*A;ctx.fillStyle='#000';ctx.transform(1,0,0,c,0,9*s);sh3Poly(SH3_HULL);ctx.fill();ctx.restore();
 // ventre della fusoliera e gondole dei motori (sotto le ali)
 sh3Slab(SH3_KEEL,-9,-2,c,s,k=>`rgb(${26+k*30|0},${40+k*40|0},${54+k*46|0})`);
 for(const py of [-7,7])sh3Slab([[-20,py-3],[-12,py-3],[-12,py+3],[-20,py+3]],-7,-1,c,s,k=>`rgb(${16+k*20|0},${34+k*26|0},${48+k*30|0})`);
 // spessore delle ali e dello scafo: metallo scuro in basso, più chiaro verso il bordo superiore
 sh3Slab(SH3_HULL,-4,-.3,c,s,k=>`rgb(${58+k*60|0},${78+k*70|0},${94+k*72|0})`);
 // linea di giunzione a metà fianco
 ctx.save();ctx.transform(1,0,0,c,0,2.2*s);ctx.strokeStyle='rgba(10,22,32,.75)';ctx.lineWidth=.7;sh3Poly(SH3_HULL);ctx.stroke();ctx.restore();
 // bordo luminoso dove il fianco incontra la superficie
 ctx.save();ctx.transform(1,0,0,c,0,.3*s);ctx.strokeStyle=`rgba(140,233,236,${.25+.35*A})`;ctx.lineWidth=.9;sh3Poly(SH3_HULL);ctx.stroke();ctx.restore();
 // superficie superiore: il disegno originale, schiacciato dal rollio
 ctx.save();ctx.transform(1,0,0,c,0,0);ctx.rotate(-ship.angle);ctx.translate(-ship.x,-ship.y);tOrigShip(ship,hostile);ctx.restore();
 // luce: l'ala che sale prende luce, quella che scende va in ombra
 ctx.save();ctx.transform(1,0,0,c,0,0);const g=ctx.createLinearGradient(0,-16,0,16),up=s>0?0:1;
 g.addColorStop(up,`rgba(230,250,255,${.22*A})`);g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1-up,`rgba(0,6,14,${.42*A})`);
 ctx.fillStyle=g;sh3Poly(SH3_HULL);ctx.fill();ctx.restore();
 // cupola della cabina in rilievo sopra lo scafo
 sh3Slab(SH3_CANOPY,0,2.6,c,s,k=>`rgb(${14+k*14|0},${44+k*40|0},${66+k*50|0})`);
 ctx.save();ctx.transform(1,0,0,c,0,-2.6*s);ctx.fillStyle='rgba(140,242,255,.85)';ctx.beginPath();ctx.ellipse(4,-1,5,2.2,0,0,6.28);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.ellipse(6,-1.6+(s>0?-.6:.6),2,.8,0,0,6.28);ctx.fill();ctx.restore();
 ctx.restore();
}
// La salute del pilota ora sta solo nella barra in basso: niente barra accanto al personaggio.
