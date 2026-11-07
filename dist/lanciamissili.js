// Conex — FASE A TERRA: colpi alla testa e lanciamissili individuale (2026-11-06).
// 1) I soldati sono disegnati più grandi della loro area di collisione (G_SCALE in grafica2.js):
//    la testa restava fuori e i colpi la attraversavano. Ora l'area colpibile arriva fino in cima al casco,
//    anche per i soldati col jetpack, i cecchini e quelli al riparo quando si alzano.
// 2) Un solo soldato porta il lanciamissili. Spara in alto, poi il razzo insegue il pilota.
// Va caricato per ultimo tra i file della fase a terra: avvolge le versioni più esterne delle funzioni.

const LM={
 chance:d=>Math.min(.5,.28+d*.05), // probabilità che un soldato in arrivo porti il lanciamissili
 gap:d=>Math.max(1100,1600-d*100),  // distanza minima tra due lanciamissili lungo il percorso
 range:[480,640],                    // distanza da cui si piazzano per sparare
 setup:.55,aim:1.15,climb:.58,turn:4.8,
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

// ---------------------------------------------------------------- 2) soldato con lanciamissili
function lmSpawnLauncher(x){
 const d=pf.p.difficulty;let g=null;
 for(let i=0;i<14;i++){
  g=pfGroundAt(x);
  if(g!==null)break;
  x+=40;
 }
 if(g===null)return false;
 const hp=3+(d>=3?1:0);
 const lm={state:'avanza',t:0,range:LM.range[0]+pf.rnd()*(LM.range[1]-LM.range[0]),reload:0};
 const e={type:'soldato',lm,x,y:g,w:22,h:48,vx:0,vy:0,ground:false,hp,max:hp,fire:9,range:0,
  speed:70+d*6,run:pf.rnd()*6,hit:0,face:-1,aim:-Math.PI/2,locked:null};
 if(typeof fcSalute==='function'&&typeof FACILE!=='undefined')fcSalute(e,FACILE.saluteRibelli);
 pf.enemies.push(e);
 if(!pf.lmHint){pf.lmHint=true;pfStatus('LANCIAMISSILI IN ARRIVO · SCHIVA IL RAZZO',2800)}
 return true;
}
pfSpawnEnemy=function(type,x,y){
 if(pf&&type==='soldato'&&y===undefined&&pf.phase==='missione'&&x<pf.arenaX-500){
  const d=pf.p.difficulty,next=pf.lmNextX??2200,alive=pf.enemies.some(e=>e.lm&&e.hp>0);
  if(!alive&&x>=next&&(pf.rnd()<LM.chance(d)||x>next+1400)&&lmSpawnLauncher(x)){pf.lmNextX=x+LM.gap(d);return}
 }
 return lmOrig.pfSpawnEnemy(type,x,y);
};
function lmMuzzle(e){const sx=e.x-e.face*2,sy=e.y-(e.crouch?42:51);return{x:sx,y:sy-30,sx,sy}}
function lmWalk(e,dt,move){
 if(move&&e.ground){const ahead=e.x+move*(e.w/2+10),g=pfGroundAt(ahead);if(g===null||Math.abs(g-e.y)>40)move=0}
 e.vx+=pfClamp(move*e.speed-e.vx,-900*dt,900*dt);
 pfMoveBody(e,dt);
 if(e.ground)e.run+=Math.abs(e.vx)*dt*.05;
 if(e.y>PF_VH+120)e.hp=0;
}
function lmUpdateLauncher(e,dt){
 const P=pf.pilot,L=e.lm,dist=Math.abs(P.x-e.x);
 const seen=pfOnScreen(e.x,-20)&&P.visible&&P.hp>0&&pf.phase!=='vittoria';
 e.hit=Math.max(0,e.hit-dt);
 e.face=P.x>=e.x?1:-1;
 L.t+=dt;
 const next=state=>{L.state=state;L.t=0};
 const move=L.state==='avanza'&&P.hp>0&&dist>L.range?e.face:0;
 lmWalk(e,dt,move);
 e.crouch=L.state!=='avanza';
 switch(L.state){
  case'avanza':
   if(seen&&e.ground&&(dist<=L.range||(L.t>.6&&Math.abs(e.vx)<5)))next('piazza');
   break;
  case'piazza':
   if(L.t>=LM.setup){next('mira');noise(.1,.012,2200);tone(880,.08,'square',.01,880)}
   break;
  case'mira':
   if(!seen){next('avanza');break}
   if(L.t>=LM.aim&&!pf.missiles.some(m=>m.razzo&&m.hp>0)){
    lmFire(e);
    L.reload=LM.reload(pf.p.difficulty)*(typeof FACILE!=='undefined'?FACILE.ricaricaNemici:1)+pf.rnd()*.6;
    next('ricarica');
   }
   break;
  case'ricarica':
   if(L.t>=L.reload)next(seen&&dist<=L.range+160?'mira':'avanza');
   break;
 }
 if(pfOverlap(pfRect(P),pfRect(e)))pfContact(e);
}
function lmFire(e){
 const m=lmMuzzle(e);
 pf.missiles.push({razzo:true,x:m.x,y:m.y,vx:0,vy:-LM.speed0,angle:-Math.PI/2,hp:1,life:4,t:0});
 pfBurst(m.sx,m.sy+16,'#c7c2c8',10,.8,false,{vy:120});
 pfBurst(m.x,m.y,'#ffb05a',8,.7);noise(.35,.04,900);tone(140,.3,'sawtooth',.02,60);
 pf.cam.shake=Math.max(pf.cam.shake,.15);
}
pfUpdateEnemies=function(dt){
 if(!pf)return lmOrig.pfUpdateEnemies(dt);
 const launchers=pf.enemies.filter(e=>e.lm);
 if(launchers.length)pf.enemies=pf.enemies.filter(e=>!e.lm);
 lmOrig.pfUpdateEnemies(dt);
 for(const e of launchers){
  if(e.hp<=0||e.x<=pf.cam.x-500)continue;
  if(pf.phase==='vittoria'){pfBurst(e.x,e.y-24,'#ff7b4f',14,1);continue}
  lmUpdateLauncher(e,dt);
  if(e.hp>0)pf.enemies.push(e);
 }
};

// ---------------------------------------------------------------- razzi: salita, virata e inseguimento
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
 const climb=pf.under ? .24 : LM.climb,turn=pf.under ? 7 : LM.turn;
 for(const m of R){
  if(m.hp<=0)continue;m.t+=dt;m.life-=dt;
  if(m.t>=climb&&P.visible&&P.hp>0){
   const target=Math.atan2(P.y-28-m.y,P.x-m.x);
   const delta=Math.atan2(Math.sin(target-m.angle),Math.cos(target-m.angle));
   m.angle+=pfClamp(delta,-turn*dt,turn*dt);
  }
  const sp=Math.min(LM.speedMax,Math.hypot(m.vx,m.vy)+LM.accel*dt);m.vx=Math.cos(m.angle)*sp;m.vy=Math.sin(m.angle)*sp;
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  if(Math.random()<dt*30)pf.fx.push({x:m.x-Math.cos(m.angle)*10,y:m.y-Math.sin(m.angle)*10,vx:0,vy:0,life:.45,max:.45,color:'#b9b0b6',r:3,soft:true});
  if(P.visible&&P.hp>0&&pfOverlap(pfRect(P),{l:m.x-7,r:m.x+7,t:m.y-5,b:m.y+5})){pfDamage(LM.dmg,Math.sign(m.vx)||1);pfExplodeMissile(m)}
  else{const ob=pfShotObstacle({x:m.x,y:m.y,px:m.x-m.vx*dt,py:m.y-m.vy*dt,friendly:false});if(ob){m.x=ob.x;m.y=ob.y}if(ob||pfInSolid(m.x,m.y)){lmBoom(m);continue}}
  if(m.hp>0&&(m.life<=0||m.x<pf.cam.x-120||m.x>pf.cam.x+VW+120||m.y>PF_VH+40||m.y<-280))m.hp=0;
 }
 for(const m of R)if(m.hp>0)pf.missiles.push(m);
};

// ---------------------------------------------------------------- disegno
function lmDrawTube(e){
 const L=e.lm,m=lmMuzzle(e),ready=L.state!=='ricarica'||L.t>L.reload-.6;
 ctx.save();ctx.translate(m.sx,m.sy);ctx.rotate(-Math.PI/2);
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
 orig(e,now);
 if(e.lm&&e.hp>0)lmDrawTube(e);
}
gEnemy=function(e,now){return lmDraw(lmOrig.gEnemy,e,now)};
pfDrawEnemy=function(e,now){return lmDraw(lmOrig.pfDrawEnemy,e,now)};

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 for(const row of [
  ['LANCIAMISSILI','ROCKET LAUNCHER','LANCE-MISSILES','LANZAMISILES','РАКЕТОМЁТ','火箭筒','ロケットランチャー'],
  ['LANCIAMISSILI IN ARRIVO · SCHIVA IL RAZZO','ROCKET LAUNCHER INCOMING · DODGE THE ROCKET','LANCE-MISSILES EN APPROCHE · ÉVITE LA ROQUETTE','LANZAMISILES EN CAMINO · ESQUIVA EL COHETE','РАКЕТОМЁТЧИКИ · УВЕРНИСЬ ОТ РАКЕТЫ','火箭筒手来袭 · 躲开火箭','ロケット兵接近 · ロケットをかわせ'],
 ])if(!I18N_ROWS.some(r=>r[0]===row[0]))I18N_ROWS.push(row);
 if(typeof i18nBuild==='function')i18nBuild();
}
