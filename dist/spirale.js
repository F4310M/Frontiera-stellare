// Conex — INGRESSO IN ORBITA A SPIRALE (2026-11-04).
// Dopo la cattura dell'orbita la nave scende verso il pianeta girandogli attorno in una spirale sempre più stretta:
// diventa sempre più piccola (si allontana verso la superficie), passa anche dietro al pianeta e si arroventa
// per l'attrito (alone arancione, scia di fuoco e fumo, scintille). Alla fine tocca l'atmosfera:
// lampo, la telecamera si tuffa nel pianeta tra le nuvole e parte la fase a terra.
// Sostituisce drawOrbitScene di ingresso.js (ne riusa entryFx, entryAtm, entryClamp, entrySmooth).
const SPIRAL={T:6.4,start:.7,end:5,turns:2.6,r0:2.15,r1:.36,flat:.42};
const spiOrig={update,beginOrbit};
let spiFx={trail:[],smoke:[],last:0,rumble:false,hiss:false,boom:false};

beginOrbit=function(){
 if(state!=='play')return;
 spiOrig.beginOrbit();
 spiFx={trail:[],smoke:[],last:0,rumble:false,hiss:false,boom:false};
};
update=function(dt){
 if(state==='orbit'){orbitTime+=dt;if(orbitTime>=SPIRAL.T)finish(true);return}
 return spiOrig.update(dt);
};

// Posizione sulla spirale (u da 0 a 1) attorno al centro del pianeta, in prospettiva.
function spiPath(u,cx,cy,r0,dir){
 const a=Math.PI/2-dir*SPIRAL.turns*Math.PI*2*(1-u),r=r0*(SPIRAL.r0+(SPIRAL.r1-SPIRAL.r0)*u);
 return{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*SPIRAL.flat,a,front:Math.sin(a)};
}

drawOrbitScene=function(){
 const T=orbitTime,dt=Math.min(.05,Math.max(0,T-(spiFx.last||0)));spiFx.last=T;
 const atm=entryAtm(),A=a=>`rgba(${atm[0]},${atm[1]},${atm[2]},${a})`;
 const dir=Math.cos(orbitStartAngle||0)>=0?1:-1;
 const pS=entryClamp((T-SPIRAL.start)/(SPIRAL.end-SPIRAL.start)),pC=entryClamp((T-SPIRAL.end)/(SPIRAL.T-SPIRAL.end));
 const u=Math.pow(pS,1.3); // la spirale accelera man mano che scende
 const heat=entrySmooth((u-.18)/.55)*(1-entrySmooth((pC-.3)/.5));
 if(T>SPIRAL.start&&!entryFx.caption){entryFx.caption=true;const c=$('orbitCaption');if(c)c.textContent='RIENTRO ATMOSFERICO · '+world.p.name}
 if(heat>.15&&!spiFx.rumble){spiFx.rumble=true;if(soundEnabled){noise(3.2,.05,380);tone(52,3.4,'sine',.05,36,.1)}}
 if(heat>.6&&!spiFx.hiss){spiFx.hiss=true;if(soundEnabled){noise(1.8,.04,2600);noise(1.4,.03,5200,.3)}}

 // pianeta: si avvicina piano durante la spirale, poi la telecamera ci si tuffa dentro
 const r0=Math.min(W*.19,H*.27),cx0=W*.5,cy0=H*.53;
 const hitP=spiPath(1,cx0,cy0,r0*1.18,dir);
 const dive=entrySmooth(pC)**1.5,R=r0*(1+.18*u)*Math.pow(Math.max(W,H)*1.6/r0,dive);
 // il punto d'ingresso resta fermo sullo schermo mentre il pianeta cresce
 const fx0=hitP.x+(W/2-hitP.x)*dive,fy0=hitP.y+(H*.5-hitP.y)*dive,scaleP=R/(r0*(1+.18*u));
 const pcx=fx0+(cx0-hitP.x)*scaleP,pcy=fy0+(cy0-hitP.y)*scaleP;
 const shake=heat*4+(pC>0&&pC<.6?(1-pC)*5:0),sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;

 // posizione, scala e direzione della nave
 let x,y,angle,scale,front=1;
 const S=spiPath(u,pcx,pcy,R,dir); // stesso centro e raggio del pianeta disegnato
 if(T<SPIRAL.start){
  const k=entrySmooth(T/SPIRAL.start),P0=spiPath(0,cx0,cy0,r0,dir);
  x=W/2+(P0.x-W/2)*k;y=H/2+(P0.y-H/2)*k;
  const P1=spiPath(.01,cx0,cy0,r0,dir);const ta=Math.atan2(P1.y-P0.y,P1.x-P0.x);
  angle=(player?player.angle:0)*(1-k)+ta*k;scale=1;
 }else{
  x=S.x;y=S.y;front=S.front;
  const N=spiPath(Math.min(1,u+.004),pcx,pcy,R,dir);angle=u>=1?Math.PI/2:Math.atan2(N.y-y,N.x-x);
  // più scende più è lontana e piccola; dietro al pianeta sembra ancora più piccola
  scale=Math.max(.14,(1-.88*Math.pow(u,.8))*(1+.22*front));
 }
 const hidden=front<0&&Math.hypot(x-pcx,(y-pcy)/1)<R*.98&&T>=SPIRAL.start;
 const pTrail=pC<=0;

 ctx.fillStyle='#02060c';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(sx,sy);
 drawStarfield();drawNebula();
 if(pC>0){ctx.fillStyle=A(.4*entrySmooth(pC*1.4));ctx.fillRect(-10,-10,W+20,H+20)}
 // orbita di cattura che svanisce
 if(u<.5){ctx.save();ctx.globalAlpha=.6*(1-u*2);ctx.strokeStyle='rgba(140,233,236,.28)';ctx.lineWidth=1;ctx.setLineDash([6,8]);ctx.beginPath();ctx.ellipse(pcx,pcy,R*SPIRAL.r0,R*SPIRAL.r0*SPIRAL.flat,0,0,Math.PI*2);ctx.stroke();ctx.restore()}

 // scia: memorizza i punti percorsi (in coordinate relative al pianeta, così segue lo zoom)
 if(pTrail&&T>=SPIRAL.start){spiFx.trail.push({u,heat,s:scale,front});if(spiFx.trail.length>110)spiFx.trail.shift()}
 const drawTrail=behind=>{
  const tr=spiFx.trail;if(tr.length<2)return;
  const tf=Math.max(0,1-pC*3);if(tf<=0)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='butt';ctx.lineJoin='round';ctx.globalAlpha=tf;
  for(let i=1;i<tr.length;i++){
   const a=tr[i-1],b=tr[i];if((b.front<0)!==behind)continue;
   const age=(tr.length-i)/tr.length,k=(1-age)*Math.max(.15,b.heat);
   const p1=spiPath(a.u,pcx,pcy,R,dir),p2=spiPath(b.u,pcx,pcy,R,dir);
   ctx.strokeStyle=b.heat>.2?`rgba(255,${130+90*(1-b.heat)|0},${50+60*(1-b.heat)|0},${.55*k})`:`rgba(140,233,255,${.35*(1-age)})`;
   ctx.lineWidth=Math.max(1,(4+14*b.heat)*b.s*(1-age*.6));ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  }
  ctx.restore();
 };
 drawTrail(true);
 if(hidden)spiDrawShip(x,y,angle,scale,heat,u,A,dt);
 drawWorld({...world,x:pcx,y:pcy,r:R});
 // alone d'atmosfera
 {const g=ctx.createRadialGradient(pcx,pcy,R*.97,pcx,pcy,R*1.08);g.addColorStop(0,A(0));g.addColorStop(.3,A(.25+.4*heat));g.addColorStop(1,A(0));ctx.fillStyle=g;ctx.fillRect(pcx-R*1.1,pcy-R*1.1,R*2.2,R*2.2)}
 drawTrail(false);
 // fumo lasciato dalla nave che brucia
 if(pTrail&&heat>.25&&!hidden&&Math.random()<dt*40*heat)spiFx.smoke.push({x,y,r:(6+Math.random()*8)*Math.max(.3,scale),life:1.4,max:1.4,vx:(Math.random()-.5)*12,vy:-8-Math.random()*10});
 spiFx.smoke=spiFx.smoke.filter(p=>(p.life-=dt)>0);
 for(const p of spiFx.smoke){p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*14;const k=p.life/p.max;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`rgba(70,66,64,${.38*k})`);g.addColorStop(1,'rgba(60,56,54,0)');ctx.fillStyle=g;ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)}
 if(!hidden&&pTrail)spiDrawShip(x,y,angle,scale,heat,u,A,dt);
 // scintille
 ctx.save();ctx.globalCompositeOperation='lighter';
 entryFx.sparks=entryFx.sparks.filter(p=>(p.life-=dt)>0);
 for(const p of entryFx.sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;const k=p.life/p.max;ctx.fillStyle=`rgba(255,${150+k*100|0},${60+k*120|0},${k})`;ctx.fillRect(p.x-1,p.y-1,1.6+k*2.2,1.6+k*2.2)}
 ctx.restore();
 // impatto con l'atmosfera: lampo sul punto d'ingresso
 if(pC>0){
  if(!spiFx.boom){spiFx.boom=true;if(soundEnabled){noise(.8,.06,900);tone(80,.9,'sine',.06,40)}}
  const k=Math.max(0,1-pC*1.5),rr=(60+pC*500)*Math.max(1,scaleP*.2);
  if(k>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(fx0,fy0,0,fx0,fy0,rr);g.addColorStop(0,`rgba(255,250,230,${.95*k})`);g.addColorStop(.3,`rgba(255,170,80,${.6*k})`);g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.fillRect(fx0-rr,fy0-rr,rr*2,rr*2);ctx.restore()}
 }
 // nuvole che si aprono durante il tuffo
 if(pC>.25){
  const want=Math.floor(6+pC*24);
  while(entryFx.clouds.length<want){const a=Math.random()*6.28;entryFx.clouds.push({a,d:20+Math.random()*60,s:30+Math.random()*60,v:1.6+Math.random()*1.4,o:.2+Math.random()*.35})}
  for(const c of entryFx.clouds){c.d*=1+c.v*dt*(1+pC*2);c.s*=1+c.v*dt*.9;const px=W/2+Math.cos(c.a)*c.d,py=H*.5+Math.sin(c.a)*c.d*.7;
   if(c.d>Math.max(W,H)*1.2){c.d=10+Math.random()*30;c.s=30+Math.random()*50;c.a=Math.random()*6.28}
   const g=ctx.createRadialGradient(px,py,0,px,py,c.s);g.addColorStop(0,`rgba(245,250,255,${c.o})`);g.addColorStop(.6,`rgba(225,236,248,${c.o*.5})`);g.addColorStop(1,'rgba(220,232,245,0)');ctx.fillStyle=g;ctx.fillRect(px-c.s,py-c.s,c.s*2,c.s*2)}
 }
 ctx.restore();
 // bordi arroventati
 if(heat>.05){const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.hypot(W,H)*.6);v.addColorStop(0,'rgba(255,80,20,0)');v.addColorStop(1,`rgba(255,90,30,${.3*heat})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}
 if(pC>.6){const k=entrySmooth((pC-.6)/.4);ctx.fillStyle=`rgba(240,248,255,${k*.95})`;ctx.fillRect(0,0,W,H)}
};

// Nave in spirale: inclinata nella virata, sempre più arroventata.
function spiDrawShip(x,y,angle,scale,heat,u,A,dt){
 const fx=Math.cos(angle),fy=Math.sin(angle);
 if(heat>.05){
  for(let i=0;i<Math.round(heat*6);i++){const sp=(140+Math.random()*300)*Math.max(.35,scale),j=(Math.random()-.5)*.8;entryFx.sparks.push({x:x+fx*16*scale,y:y+fy*16*scale,vx:-Math.cos(angle+j)*sp,vy:-Math.sin(angle+j)*sp,life:.35+Math.random()*.4,max:.75})}
  // lingua di fuoco dietro la nave
  ctx.save();ctx.globalCompositeOperation='lighter';
  const len=(60+heat*150)*Math.max(.35,scale),tail=ctx.createLinearGradient(x,y,x-fx*len,y-fy*len);
  tail.addColorStop(0,`rgba(255,240,210,${.8*heat})`);tail.addColorStop(.25,`rgba(255,150,60,${.6*heat})`);tail.addColorStop(1,'rgba(150,30,10,0)');
  const nx=-fy,ny=fx,wd=(14+heat*9)*scale;ctx.fillStyle=tail;ctx.beginPath();
  ctx.moveTo(x+nx*wd*.7+fx*8*scale,y+ny*wd*.7+fy*8*scale);ctx.quadraticCurveTo(x-fx*len*.4+nx*wd*1.2,y-fy*len*.4+ny*wd*1.2,x-fx*len,y-fy*len);
  ctx.quadraticCurveTo(x-fx*len*.4-nx*wd*1.2,y-fy*len*.4-ny*wd*1.2,x-nx*wd*.7+fx*8*scale,y-ny*wd*.7+fy*8*scale);ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.translate(-x,-y);
 const sh={...(player||{}),x,y,angle,barrier:false,forward:1,boostState:heat>.3?'active':'ready',inv:0};
 const roll=.55+.25*Math.sin(u*Math.PI*SPIRAL.turns*2);
 if(typeof shipRoll3D==='function')shipRoll3D(sh,false,roll);else drawShip(sh);
 ctx.restore();
 // scafo arroventato e scudo di plasma sulla prua
 if(heat>.03){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const rr=Math.max(16,34*scale),g=ctx.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,`rgba(255,200,120,${.55*heat})`);g.addColorStop(.5,`rgba(255,110,40,${.35*heat})`);g.addColorStop(1,'rgba(255,60,20,0)');
  ctx.fillStyle=g;ctx.fillRect(x-rr,y-rr,rr*2,rr*2);
  ctx.translate(x+fx*20*scale,y+fy*20*scale);ctx.rotate(angle);
  const pr=(18+heat*12)*scale,flick=.85+Math.random()*.15;
  const p=ctx.createRadialGradient(0,0,0,0,0,pr*1.4);p.addColorStop(0,`rgba(255,255,240,${.85*heat*flick})`);p.addColorStop(.3,`rgba(255,190,110,${.6*heat})`);p.addColorStop(1,'rgba(255,40,20,0)');
  ctx.fillStyle=p;ctx.beginPath();ctx.ellipse(0,0,pr*.7,pr*1.3,0,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();
  ctx.strokeStyle=A(.55*heat);ctx.lineWidth=Math.max(.6,1.4*scale);ctx.beginPath();ctx.ellipse(-4*scale,0,pr*.6,pr*1.35,0,-Math.PI/2.3,Math.PI/2.3);ctx.stroke();
  ctx.restore();
 }
}
