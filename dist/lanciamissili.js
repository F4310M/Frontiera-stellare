// Conex — FASE A TERRA: colpi alla testa e squadra col lanciamissili (2026-11-06).
// 1) I soldati sono disegnati più grandi della loro area di collisione (G_SCALE in grafica2.js):
//    la testa restava fuori e i colpi la attraversavano. Ora l'area colpibile arriva fino in cima al casco,
//    anche per i soldati col jetpack, i cecchini e quelli al riparo quando si alzano.
// 2) Nuovo nemico: due soldati con un lanciamissili. Uno si inginocchia col tubo in spalla, l'altro mira
//    col laser. Il razzo va dritto dove puntava il laser (non insegue), quindi si schiva correndo o saltando;
//    si può anche abbattere in volo. Se uno dei due cade, l'altro lascia il tubo e combatte col fucile.
// Va caricato per ultimo tra i file della fase a terra: avvolge le versioni più esterne delle funzioni.

const LM={
 chance:d=>Math.min(.5,.28+d*.05), // probabilità che un soldato in arrivo sia invece una squadra
 gap:d=>Math.max(1100,1600-d*100),  // distanza minima tra due squadre lungo il percorso
 range:[480,640],                    // distanza da cui si piazzano per sparare
 setup:.55,aim:1.15,lock:.4,         // inginocchiarsi, mirare col laser, ultimo tratto col laser fermo
 reload:d=>Math.max(2.2,3.4-d*.2),   // pausa tra un razzo e l'altro
 speed0:250,speedMax:540,accel:520,  // il razzo parte lento e accelera
 dmg:20,splash:10,splashR:55,
 head:24,headCrouch:14,headCover:8   // quanto l'area colpibile sale sopra e.h per coprire la testa
};
const lmOrig={pfRect,pfSpawnEnemy,pfUpdateEnemies,pfUpdateMissiles,gEnemy,pfDrawEnemy};

// ---------------------------------------------------------------- 1) area colpibile con la testa
pfRect=function(e){
 const r=lmOrig.pfRect(e);
 if(typeof pf==='undefined'||!pf||e===pf.pilot||e.type==='drone'||typeof e.h!=='number')return r;
 const head=e.cover?LM.headCover*(e.up??1):e.crouch?LM.headCrouch:LM.head;
 r.t=e.y-e.h-head;
 return r;
};

// ---------------------------------------------------------------- 2) squadra col lanciamissili
function lmSpawnSquad(x){
 const d=pf.p.difficulty;let g=null;
 for(let i=0;i<14&&g===null;i++){g=pfGroundAt(x)!==null&&pfGroundAt(x+36)!==null?pfGroundAt(x):null;if(g===null)x+=40}
 if(g===null)return false;
 const sq={state:'avanza',t:0,aim:Math.PI,lock:null,range:LM.range[0]+pf.rnd()*(LM.range[1]-LM.range[0]),reload:0};
 const hp=3+(d>=3?1:0);
 for(const [role,dx] of [['porta',0],['mira',36]]){
  const e={type:'soldato',lm:role,sq,x:x+dx,y:pfGroundAt(x+dx)??g,w:22,h:48,vx:0,vy:0,ground:false,hp,max:hp,fire:9,range:0,speed:70+d*6,run:pf.rnd()*6,hit:0,face:-1,aim:Math.PI,locked:null};
  if(typeof fcSalute==='function'&&typeof FACILE!=='undefined')fcSalute(e,FACILE.saluteRibelli);
  pf.enemies.push(e);
 }
 sq.porta=pf.enemies[pf.enemies.length-2];sq.mira=pf.enemies[pf.enemies.length-1];
 if(!pf.lmHint){pf.lmHint=true;pfStatus('LANCIAMISSILI IN ARRIVO · SCHIVA IL RAZZO',2800)}
 return true;
}
pfSpawnEnemy=function(type,x,y){
 if(pf&&type==='soldato'&&y===undefined&&pf.phase==='missione'&&x<pf.arenaX-500){
  const d=pf.p.difficulty,next=pf.lmNextX??2200,alive=pf.enemies.some(e=>e.lm&&e.hp>0);
  if(!alive&&x>=next&&(pf.rnd()<LM.chance(d)||x>next+1400)&&lmSpawnSquad(x)){pf.lmNextX=x+LM.gap(d);return}
 }
 return lmOrig.pfSpawnEnemy(type,x,y);
};
// Il soldato rimasto solo lascia il tubo e torna un soldato normale.
function lmBreak(e){
 const sq=e.sq;delete e.lm;delete e.sq;e.crouch=false;e.range=220+pf.rnd()*160;e.speed=95+pf.p.difficulty*10;e.fire=1+pf.rnd()*.6;
 if(sq&&!sq.broken){sq.broken=true;const t=sq.porta;pfBurst(t.x,t.y-36,'#9a8a90',8,.6,true,{vy:-120});pfText(t.x,t.y-80,'LANCIAMISSILI FUORI USO','#ffb36b')}
}
function lmMuzzle(sq){const c=sq.porta,sx=c.x-c.face*2,sy=c.y-(c.crouch?42:51);return{x:sx+Math.cos(sq.aim)*30,y:sy+Math.sin(sq.aim)*30,sx,sy}}
function lmWalk(e,dt,move){
 if(move&&e.ground){const ahead=e.x+move*(e.w/2+10),g=pfGroundAt(ahead);if(g===null||Math.abs(g-e.y)>40)move=0}
 e.vx+=pfClamp(move*e.speed-e.vx,-900*dt,900*dt);
 pfMoveBody(e,dt);
 if(e.ground)e.run+=Math.abs(e.vx)*dt*.05;
 if(e.y>PF_VH+120)e.hp=0;
}
function lmUpdateSquad(sq,dt){
 const P=pf.pilot,d=pf.p.difficulty,C=sq.porta,G=sq.mira;
 for(const e of [C,G]){e.hit=Math.max(0,e.hit-dt);e.face=P.x>=e.x?1:-1}
 const chest={x:P.x,y:P.y-(P.crouch?22:30)},dist=Math.abs(P.x-C.x);
 const seen=pfOnScreen(C.x,-20)&&P.visible&&P.hp>0&&pf.phase!=='vittoria';
 // il tubo e il fucile di chi mira puntano verso il pilota, dentro un cono davanti a loro
 const m0=lmMuzzle(sq),want=Math.atan2(chest.y-m0.sy,chest.x-m0.sx),base=C.face>0?0:Math.PI;
 const track=base+pfClamp(Math.atan2(Math.sin(want-base),Math.cos(want-base)),-.65,.65);
 sq.t+=dt;
 switch(sq.state){
  case'avanza':{
   const move=P.hp>0&&dist>sq.range?C.face:0;
   lmWalk(C,dt,move);lmWalk(G,dt,move&&Math.abs(G.x-C.x)>30?move:0);
   C.crouch=false;sq.aim=track;
   // si piazza quando è a tiro, oppure quando non può avanzare (burrone o gradino davanti)
   if(seen&&C.ground&&(dist<=sq.range||(sq.t>.6&&Math.abs(C.vx)<5))){sq.state='piazza';sq.t=0}
   break}
  case'piazza':lmWalk(C,dt,0);lmWalk(G,dt,0);C.crouch=sq.t>.15;sq.aim=track;
   if(sq.t>LM.setup){sq.state='mira';sq.t=0;noise(.1,.012,2200);tone(880,.08,'square',.01,880)}break;
  case'mira':lmWalk(C,dt,0);lmWalk(G,dt,0);C.crouch=true;
   if(!seen){sq.state='avanza';sq.t=0;sq.lock=null;break}
   if(sq.t<LM.aim-LM.lock)sq.aim=track;else if(sq.lock===null){sq.lock=sq.aim;tone(1250,.12,'square',.012)}
   if(sq.t>=LM.aim){lmFire(sq);sq.state='ricarica';sq.t=0;sq.lock=null;sq.reload=LM.reload(d)*(typeof FACILE!=='undefined'?FACILE.ricaricaNemici:1)+pf.rnd()*.6}
   break;
  case'ricarica':lmWalk(C,dt,0);lmWalk(G,dt,0);C.crouch=true;sq.aim=track;
   if(sq.t>=sq.reload){if(seen&&dist<=sq.range+160){sq.state='mira';sq.t=0}else{sq.state='avanza';sq.t=0}}
   break;
 }
 C.aim=G.aim=sq.lock??sq.aim;
 const pr=pfRect(P);for(const e of [C,G])if(P.visible&&P.hp>0&&e.hp>0&&pfOverlap(pr,pfRect(e)))pfDamage(14,Math.sign(P.x-e.x)||1);
}
function lmFire(sq){
 const m=lmMuzzle(sq),a=sq.lock??sq.aim;
 pf.missiles.push({razzo:true,x:m.x,y:m.y,vx:Math.cos(a)*LM.speed0,vy:Math.sin(a)*LM.speed0,angle:a,hp:1,life:4,t:0});
 // vampata dietro al tubo e colpo
 pfBurst(m.sx-Math.cos(a)*16,m.sy-Math.sin(a)*16,'#c7c2c8',10,.8,false,{vx:-Math.cos(a)*120,vy:-Math.sin(a)*120});
 pfBurst(m.x,m.y,'#ffb05a',8,.7);noise(.35,.04,900);tone(140,.3,'sawtooth',.02,60);
 pf.cam.shake=Math.max(pf.cam.shake,.15);
}
pfUpdateEnemies=function(dt){
 if(!pf)return lmOrig.pfUpdateEnemies(dt);
 for(const e of pf.enemies)if(e.lm&&e.hp>0&&(e.sq.porta.hp<=0||e.sq.mira.hp<=0))lmBreak(e);
 const squad=pf.enemies.filter(e=>e.lm);
 if(squad.length)pf.enemies=pf.enemies.filter(e=>!e.lm);
 lmOrig.pfUpdateEnemies(dt);
 const done=new Set();
 for(const e of squad){if(e.hp<=0||done.has(e.sq))continue;done.add(e.sq);lmUpdateSquad(e.sq,dt)}
 for(const e of squad)if(e.hp>0&&e.x>pf.cam.x-500){if(pf.phase==='vittoria'){e.hp=0;pfBurst(e.x,e.y-24,'#ff7b4f',14,1)}else pf.enemies.push(e)}
};

// ---------------------------------------------------------------- razzi: dritti, schivabili, abbattibili
function lmBoom(m){
 const P=pf.pilot;
 if(P.visible&&P.hp>0&&Math.hypot(P.x-m.x,P.y-28-m.y)<LM.splashR)pfDamage(LM.splash,Math.sign(P.x-m.x)||1);
 pfBurst(m.x,m.y,'#fff1c9',8,.8);pf.cam.shake=Math.max(pf.cam.shake,.25);
 pfExplodeMissile(m);
}
pfUpdateMissiles=function(dt){
 if(!pf)return lmOrig.pfUpdateMissiles(dt);
 const R=pf.missiles.filter(m=>m.razzo);
 if(R.length)pf.missiles=pf.missiles.filter(m=>!m.razzo);
 lmOrig.pfUpdateMissiles(dt);
 const P=pf.pilot,VW=pfViewW();
 for(const m of R){
  if(m.hp<=0)continue;m.t+=dt;m.life-=dt;
  const sp=Math.min(LM.speedMax,Math.hypot(m.vx,m.vy)+LM.accel*dt);m.vx=Math.cos(m.angle)*sp;m.vy=Math.sin(m.angle)*sp;
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  if(Math.random()<dt*30)pf.fx.push({x:m.x-Math.cos(m.angle)*10,y:m.y-Math.sin(m.angle)*10,vx:0,vy:0,life:.45,max:.45,color:'#b9b0b6',r:3,soft:true});
  if(P.visible&&P.hp>0&&pfOverlap(pfRect(P),{l:m.x-7,r:m.x+7,t:m.y-5,b:m.y+5})){pfDamage(LM.dmg,Math.sign(m.vx)||1);pfExplodeMissile(m)}
  else{const ob=pfShotObstacle({x:m.x,y:m.y,px:m.x-m.vx*dt,py:m.y-m.vy*dt,friendly:false});if(ob){m.x=ob.x;m.y=ob.y}if(ob||pfInSolid(m.x,m.y)){lmBoom(m);continue}}
  if(m.hp>0&&(m.life<=0||m.x<pf.cam.x-120||m.x>pf.cam.x+VW+120||m.y>PF_VH+40||m.y<-80))m.hp=0;
 }
 for(const m of R)if(m.hp>0)pf.missiles.push(m);
};

// ---------------------------------------------------------------- disegno
function lmDrawLaser(e,now){
 const sq=e.sq;if(!sq||sq.state!=='mira')return;
 const locked=sq.lock!==null,on=locked?Math.floor(now*16)%2:1,a=sq.lock??sq.aim,sx=e.x+e.face*6,sy=e.y-48;
 ctx.save();ctx.strokeStyle=`rgba(255,60,80,${locked?(on?.75:.25):.3})`;ctx.lineWidth=locked?1.6:1;
 ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*1500,sy+Math.sin(a)*1500);ctx.stroke();ctx.restore();
}
function lmDrawTube(e){
 const sq=e.sq,m=lmMuzzle(sq),a=e.aim,ready=sq.state!=='ricarica'||sq.t>sq.reload-.6;
 ctx.save();ctx.translate(m.sx,m.sy);ctx.rotate(a);
 ctx.fillStyle='#2e2a30';ctx.fillRect(-18,-4.5,48,9);
 ctx.fillStyle='#4a4148';ctx.fillRect(-18,-4.5,48,3);
 ctx.fillStyle='#ff5268';ctx.fillRect(22,-4.5,3,9);ctx.fillRect(-14,-4.5,2,9);
 ctx.fillStyle='#1a1418';ctx.fillRect(-22,-5.5,5,11);ctx.fillRect(30,-5.5,3,11);
 ctx.fillRect(2,4,4,6);ctx.fillRect(10,4,3,5);// impugnature
 if(ready){ctx.fillStyle='#ffd0d6';ctx.beginPath();ctx.moveTo(39,0);ctx.lineTo(33,-3.4);ctx.lineTo(33,3.4);ctx.closePath();ctx.fill()}
 ctx.restore();
 ctx.fillStyle='#ff5268';ctx.font='700 8px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('LANCIAMISSILI',e.x,e.y-(e.crouch?72:84));
}
function lmDraw(orig,e,now){
 if(!e.lm||!e.sq)return orig(e,now);
 if(e.lm==='mira')lmDrawLaser(e,now);
 orig(e,now);
 if(e.lm==='porta'&&e.hp>0)lmDrawTube(e);
}
gEnemy=function(e,now){return lmDraw(lmOrig.gEnemy,e,now)};
pfDrawEnemy=function(e,now){return lmDraw(lmOrig.pfDrawEnemy,e,now)};

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 for(const row of [
  ['LANCIAMISSILI','ROCKET LAUNCHER','LANCE-MISSILES','LANZAMISILES','РАКЕТОМЁТ','火箭筒','ロケットランチャー'],
  ['LANCIAMISSILI IN ARRIVO · SCHIVA IL RAZZO','ROCKET TEAM INCOMING · DODGE THE ROCKET','LANCE-MISSILES EN APPROCHE · ÉVITE LA ROQUETTE','LANZAMISILES EN CAMINO · ESQUIVA EL COHETE','РАКЕТОМЁТЧИКИ · УВЕРНИСЬ ОТ РАКЕТЫ','火箭筒小队来袭 · 躲开火箭','ロケット部隊接近 · ロケットをかわせ'],
  ['LANCIAMISSILI FUORI USO','ROCKET LAUNCHER DOWN','LANCE-MISSILES HORS SERVICE','LANZAMISILES INUTILIZADO','РАКЕТОМЁТ ВЫВЕДЕН ИЗ СТРОЯ','火箭筒失效','ロケットランチャー沈黙']
 ])if(!I18N_ROWS.some(r=>r[0]===row[0]))I18N_ROWS.push(row);
 if(typeof i18nBuild==='function')i18nBuild();
}
