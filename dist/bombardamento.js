// Conex — BOMBARDAMENTO A TRE MISSILI (2026-11-08).
// Quando il pilota chiama la nave via radio (colpo speciale a terra, speciale.js) la nave passa sopra
// e lancia TRE MISSILI invece di una bomba. Ogni missile cerca un bersaglio sullo schermo (soldati, droni,
// boss; se non ce ne sono, punti del terreno davanti al pilota) e scoppia con una grande esplosione:
// lampo, palla di fuoco che sale, onda d'urto sul terreno, schegge, scintille, fumo e bruciatura a terra.
// Ogni esplosione distrugge i nemici vicini; la terza distrugge tutti quelli rimasti sullo schermo.
// Al boss i tre missili tolgono in tutto 1/4 dell'energia, come prima la bomba.
// Va caricato dopo speciale.js.

const BOMB={
 n:3,launch:[.1,.5,.9],      // 2026-11-12 (Fabio): un missile all'inizio, uno al centro e uno alla fine dello schermo
 slow:.5,                     // la nave passa più lentamente (metà di SPEC.shipSpeed)
 hitAt:[.12,.5,.88],          // dove cade ogni missile (frazione della larghezza dello schermo, sul terreno)
 drop:.16,accel:3400,maxV:1650,turn:9,
 radius:260,                  // nemici distrutti attorno a ogni esplosione
 life:1.7,scorch:6            // durata dell'esplosione e della bruciatura a terra (secondi)
};
const bombOrig={pfDrawShipOnPad,drawPlatform};

function bombTargets(S){
 // bersagli ancora liberi sullo schermo, prima i più vicini al pilota
 const P=pf.pilot,taken=new Set(S.missiles.map(m=>m.target).filter(Boolean)),list=[];
 const Bo=pf.boss;
 if(Bo&&Bo.hp>0&&!Bo.gone&&pfOnScreen(Bo.x,Bo.w)&&!taken.has(Bo))list.push(Bo);
 for(const e of pf.enemies)if(e.hp>0&&pfOnScreen(e.x,10)&&!taken.has(e))list.push(e);
 list.sort((a,b)=>(a===Bo?-1:0)-(b===Bo?-1:0)||Math.abs(a.x-P.x)-Math.abs(b.x-P.x));
 return list;
}
function bombAimPoint(t){
 if(t===pf.boss)return {x:t.x,y:t.y-Math.min(120,(t.h||160)*.45)};
 if(t.type==='drone')return {x:t.x,y:t.y};
 return {x:t.x,y:t.y-18};
}
function bombLaunch(S,i){
 const VW=pfViewW(),cx=pf.cam.x,sh=S.ship;
 // 2026-11-12: ogni missile cade nel suo punto fisso dello schermo (inizio, centro, fine), senza inseguire bersagli
 let gx=cx+VW*BOMB.hitAt[i],g=pfGroundAt(gx);if(g===null)g=PF_FLOOR;
 const m={i,x:sh.x,y:sh.y+26,vx:SPEC.shipSpeed*BOMB.slow*.2,vy:120,t:0,target:null,px:gx,py:g,trail:0,done:false};
 S.missiles.push(m);
 tone(520+i*90,.35,'sawtooth',.02,1300);noise(.35,.025,2200);
 pfBurst(m.x,m.y,'#fff1c9',6,.6);
}

spcUpdateStrike=function(dt){
 const S=spc.strike;if(!S||!pf)return;
 if(!S.missiles){S.missiles=[];S.booms=[];S.fired=0;S.hits=0}
 S.t+=dt;const VW=pfViewW(),cx=pf.cam.x;
 if(S.t>=SPEC.radioT&&!S.ship){S.ship={x:cx-160,y:150};pfStatus('NAVE IN ARRIVO · LANCIO DEI MISSILI',1800);noise(1.4,.03,500);tone(90,1.2,'sine',.04,140)}
 if(S.ship){S.ship.x+=SPEC.shipSpeed*BOMB.slow*dt;S.ship.y=150+Math.sin(S.t*3)*6;
  while(S.fired<BOMB.n&&S.ship.x>=cx+VW*BOMB.launch[S.fired])bombLaunch(S,S.fired++);
 }
 for(const m of S.missiles){
  if(m.done)continue;
  m.t+=dt;
  if(m.target&&(m.target.hp>0||m.target===pf.boss)&&!m.target.gone){const a=bombAimPoint(m.target);m.px=a.x;m.py=a.y}
  if(m.t<BOMB.drop){m.vy+=900*dt;m.vx*=1-dt*2}
  else{
   // motore acceso: punta il bersaglio e accelera
   const want=Math.atan2(m.py-m.y,m.px-m.x),cur=Math.atan2(m.vy,m.vx),d=Math.atan2(Math.sin(want-cur),Math.cos(want-cur));
   const ang=cur+Math.max(-BOMB.turn*dt,Math.min(BOMB.turn*dt,d)),sp=Math.min(BOMB.maxV,Math.hypot(m.vx,m.vy)+BOMB.accel*dt);
   m.vx=Math.cos(ang)*sp;m.vy=Math.sin(ang)*sp;
   m.trail+=dt;while(m.trail>.012){m.trail-=.012;
    pf.fx.push({x:m.x-Math.cos(ang)*16+(Math.random()-.5)*4,y:m.y-Math.sin(ang)*16+(Math.random()-.5)*4,vx:(Math.random()-.5)*30,vy:-20-Math.random()*20,life:.9,max:.9,color:'rgba(190,190,200,.42)',r:5+Math.random()*4,soft:true});
    if(Math.random()<.5)pf.fx.push({x:m.x-Math.cos(ang)*14,y:m.y-Math.sin(ang)*14,vx:-Math.cos(ang)*120+(Math.random()-.5)*60,vy:-Math.sin(ang)*120+(Math.random()-.5)*60,life:.18,max:.18,color:Math.random()<.5?'#ffb05a':'#fff1c9',r:2+Math.random()*2})}
  }
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  const g=pfGroundAt(m.x)??PF_FLOOR;
  if(Math.hypot(m.px-m.x,m.py-m.y)<22||m.y>=g-3||m.y>PF_VH||m.t>2.4)bombExplode(S,m,m.y>=g-3?g:m.y);
 }
 for(const b of S.booms)b.t+=dt;
 S.booms=S.booms.filter(b=>b.t<BOMB.scorch);
 const flying=S.missiles.some(m=>!m.done);
 if(S.ship&&S.ship.x>cx+VW+300&&S.fired>=BOMB.n&&!flying&&S.booms.every(b=>b.t>BOMB.life))spc.strike=null;
};

function bombExplode(S,m,y){
 m.done=true;S.hits++;
 const x=m.x,last=S.hits>=BOMB.n,g=pfGroundAt(x)??PF_FLOOR,onGround=g-y<40;
 S.booms.push({x,y,g,onGround,t:0,seed:Math.random()*100,big:last?1.25:1});
 // schegge, scintille, fumo
 pfBurst(x,y-10,'#ffb05a',60,2.6);pfBurst(x,y-10,'#fff1c9',26,2);pfBurst(x,y-6,'#5d6672',30,1.6,true,{vy:-360});
 for(let i=0;i<14;i++){const a=-Math.PI*(.1+.8*Math.random()),v=380+Math.random()*520;pf.fx.push({x,y:y-8,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.9+Math.random()*.5,max:1.4,color:Math.random()<.5?'#ffd27a':'#ff7b3a',r:2.5+Math.random()*2})}
 for(let i=0;i<12;i++)pf.fx.push({x:x+(Math.random()-.5)*140,y:y-20-Math.random()*150,vx:(Math.random()-.5)*70,vy:-50-Math.random()*90,life:2.8,max:2.8,color:'rgba(60,54,52,.55)',r:20+Math.random()*26,soft:true});
 if(typeof gFlash==='function')gFlash(x,y-60,560,'#ffb05a',.7);
 pf.cam.shake=Math.max(pf.cam.shake,last?1.8:1.2);spc.flash=Math.max(spc.flash,last?.55:.32);
 sfx('boom',last?2.6:1.8);noise(.8,.04,300);
 // nemici vicini (all'ultimo: tutti quelli sullo schermo)
 let n=0;
 for(const e of pf.enemies)if(e.hp>0&&(last?pfOnScreen(e.x,30):Math.hypot(e.x-x,(e.type==='drone'?e.y:e.y-20)-y)<BOMB.radius)){pfHitEnemy(e,e.hp+99);n++}
 S.kills=(S.kills||0)+n;
 if(last){pf.shots=pf.shots.filter(b=>b.friendly);for(const mm of pf.missiles||[])if(mm.hp>0)pfExplodeMissile(mm)}
 // boss: un terzo del quarto a ogni missile
 const Bo=pf.boss;
 if(Bo&&Bo.hp>0&&!Bo.gone&&pfOnScreen(Bo.x,Bo.w)){
  const cut=Bo.max*SPEC.bossCut/BOMB.n;
  if(Bo.state==='montaggio')Bo.hp=Math.max(1,Bo.hp-cut);
  else if(Bo.hp-cut<=0){Bo.hp=Math.min(Bo.hp,.5);if(Bo.state==='stordito')Bo.hp=.25;pfHitBoss(1,Bo.x,Bo.y-100)}
  else{Bo.hp-=cut;Bo.hit=.3}
  pfText(Bo.x+(m.i-1)*30,Bo.y-Bo.h-20-m.i*16,'−'+Math.round(SPEC.bossCut*100/BOMB.n)+'%','#ffb05a');
 }
 if(last)pfStatus(S.kills?'BOMBARDAMENTO · NEMICI ELIMINATI':'BOMBARDAMENTO COMPLETATO',2000);
}

// ---- disegno: missili ed esplosioni
function bombDrawMissile(m,now){
 const a=m.t<BOMB.drop?Math.atan2(m.vy,m.vx)*.6:Math.atan2(m.vy,m.vx);
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);
 if(m.t>=BOMB.drop){
  ctx.save();ctx.globalCompositeOperation='lighter';const l=26+Math.random()*14;
  const g=ctx.createLinearGradient(-14,0,-14-l,0);g.addColorStop(0,'rgba(255,250,225,1)');g.addColorStop(.3,'rgba(255,170,70,.9)');g.addColorStop(1,'rgba(255,70,20,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-13,-4);ctx.lineTo(-14-l,0);ctx.lineTo(-13,4);ctx.closePath();ctx.fill();
  const h=ctx.createRadialGradient(-15,0,0,-15,0,16);h.addColorStop(0,'rgba(255,220,150,.8)');h.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=h;ctx.fillRect(-31,-16,32,32);
  ctx.restore();
 }
 // corpo, alette, ogiva
 const body=ctx.createLinearGradient(0,-5,0,5);body.addColorStop(0,'#c8d2da');body.addColorStop(.5,'#6d7a86');body.addColorStop(1,'#2a333c');
 ctx.fillStyle='#3a4550';ctx.beginPath();ctx.moveTo(-12,-4);ctx.lineTo(-17,-10);ctx.lineTo(-8,-4);ctx.moveTo(-12,4);ctx.lineTo(-17,10);ctx.lineTo(-8,4);ctx.fill();
 ctx.fillStyle=body;ctx.strokeStyle='#0b1016';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(-14,-4.5);ctx.lineTo(10,-4.5);ctx.quadraticCurveTo(20,-3,22,0);ctx.quadraticCurveTo(20,3,10,4.5);ctx.lineTo(-14,4.5);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffb348';ctx.fillRect(2,-4.5,3,9);ctx.fillStyle='#ff5268';ctx.fillRect(-9,-4.5,2,9);
 ctx.fillStyle=Math.floor(now*16+m.i)%2?'#ff5268':'#5a1a24';ctx.beginPath();ctx.arc(16,0,1.8,0,6.28);ctx.fill();
 ctx.restore();
}
function bombDrawBoom(b){
 const t=b.t,k=b.big,x=b.x,y=b.y;
 // bruciatura a terra
 if(b.onGround){const f=Math.min(1,t*4)*(1-Math.max(0,(t-BOMB.scorch+1.5)/1.5));if(f>0){ctx.fillStyle=`rgba(14,10,8,${.5*f})`;ctx.beginPath();ctx.ellipse(x,b.g+2,90*k,12*k,0,0,6.28);ctx.fill();
  if(t<2.5){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,120,40,${.35*(1-t/2.5)})`;ctx.beginPath();ctx.ellipse(x,b.g+1,60*k,7*k,0,0,6.28);ctx.fill();ctx.restore()}}}
 if(t>BOMB.life)return;
 const u=t/BOMB.life;
 ctx.save();ctx.globalCompositeOperation='lighter';
 // colonna di luce del primo istante
 if(t<.28){const a=1-t/.28,w=26*k*(1+t*3);const g=ctx.createLinearGradient(0,y-520,0,y);g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(1,`rgba(255,240,210,${.75*a})`);ctx.fillStyle=g;ctx.fillRect(x-w,y-520,w*2,520)}
 // lampo centrale
 {const r=(40+220*Math.min(1,t/.18))*k,a=t<.18?1:Math.max(0,1-(t-.18)/.5);
  const g=ctx.createRadialGradient(x,y-20,0,x,y-20,r);g.addColorStop(0,`rgba(255,255,240,${a})`);g.addColorStop(.25,`rgba(255,220,130,${.9*a})`);g.addColorStop(.6,`rgba(255,110,30,${.5*a})`);g.addColorStop(1,'rgba(255,60,10,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-20-r,r*2,r*2)}
 // palla di fuoco che sale e si allarga
 for(let i=0;i<7;i++){
  const s=Math.sin(b.seed+i*12.9898)*43758.5453,rnd=s-Math.floor(s);
  const px=x+(rnd-.5)*90*k+(i-3)*10*k*u,py=y-20-(30+rnd*50)*k-u*(140+i*14)*k,r=(30+rnd*28)*k*(.5+u*1.1);
  const a=Math.max(0,1-u*1.05);
  const g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(255,${200-u*120|0},${110-u*80|0},${.85*a})`);g.addColorStop(.55,`rgba(255,${100-u*60|0},20,${.45*a})`);g.addColorStop(1,'rgba(200,40,10,0)');
  ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);
 }
 ctx.restore();
 // fumo scuro che resta sopra il fuoco
 if(u>.25){const a=Math.min(1,(u-.25)*3)*(1-u)*.55;for(let i=0;i<3;i++){const px=x+(i-1)*40*k,py=y-60*k-u*220*k-i*18,r=(40+u*50)*k;ctx.fillStyle=`rgba(40,36,36,${a})`;ctx.beginPath();ctx.arc(px,py,r,0,6.28);ctx.fill()}}
 // onda d'urto
 if(u<.6){const q=u/.6,rr=(30+q*520)*k,yy=b.onGround?b.g:y;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,215,150,${.85*(1-q)})`;ctx.lineWidth=9*(1-q)+1.5;ctx.beginPath();ctx.ellipse(x,yy,rr,rr*(b.onGround?.18:.9),0,0,6.28);ctx.stroke();ctx.restore()}
}
pfDrawShipOnPad=function(now){
 bombOrig.pfDrawShipOnPad(now);
 const S=spc.strike;if(!S||!pf||!S.missiles)return;
 for(const b of S.booms)bombDrawBoom(b);
 for(const m of S.missiles)if(!m.done)bombDrawMissile(m,now);
};

// ---- traduzioni dei nuovi messaggi
if(typeof I18N_ROWS!=='undefined'){
 for(const row of [
  ['NAVE IN ARRIVO · LANCIO DEI MISSILI','SHIP INBOUND · MISSILE LAUNCH','VAISSEAU EN APPROCHE · TIR DE MISSILES','NAVE EN CAMINO · LANZAMIENTO DE MISILES','КОРАБЛЬ НА ПОДХОДЕ · ПУСК РАКЕТ','飞船抵达 · 发射导弹','艦が接近中 · ミサイル発射'],
 ])if(!I18N_ROWS.some(r=>r[0]===row[0]))I18N_ROWS.push(row);
 if(typeof i18nBuild==='function')i18nBuild();
}
