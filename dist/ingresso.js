// Ingresso nel pianeta: dopo la cattura dell'orbita la nave fa mezzo giro, poi si tuffa
// nell'atmosfera (scudo di plasma, scia di fuoco, scosse), attraversa le nuvole ed esce in un lampo.
// Sostituisce drawOrbitScene e allunga la durata della scena (prima 2,8 s).
const ENTRY_T=5.2,ENTRY_ORBIT=1.4,ENTRY_DIVE=3.7;
const inOrig={update,beginOrbit};
let entryFx={sparks:[],clouds:[],streaks:[],last:0,rumble:false,caption:false};

beginOrbit=function(){
 if(state!=='play')return;
 inOrig.beginOrbit();
 entryFx={sparks:[],clouds:[],streaks:[],last:0,rumble:false,caption:false};
};
update=function(dt){
 if(state==='orbit'){orbitTime+=dt;if(orbitTime>=ENTRY_T)finish(true);return}
 inOrig.update(dt);
};

function entryAtm(){
 const th=world&&world.p&&typeof PL_THEMES!=='undefined'?PL_THEMES[world.p.theme]:null;
 return th&&th.atm?th.atm:[110,200,255];
}
const entryClamp=v=>Math.max(0,Math.min(1,v));
const entrySmooth=v=>{v=entryClamp(v);return v*v*(3-2*v)};

drawOrbitScene=function(){
 const T=orbitTime,dt=Math.min(.05,Math.max(0,T-(entryFx.last||0)));entryFx.last=T;
 const atm=entryAtm(),A=(a)=>`rgba(${atm[0]},${atm[1]},${atm[2]},${a})`;
 const cx0=W*.58,cy0=H*.52,r0=Math.min(W*.21,H*.29);
 // 0..1 per le tre parti della scena
 const pO=entryClamp(T/ENTRY_ORBIT),pD=entryClamp((T-ENTRY_ORBIT)/(ENTRY_DIVE-ENTRY_ORBIT)),pC=entryClamp((T-ENTRY_DIVE)/(ENTRY_T-ENTRY_DIVE));
 const heat=Math.sin(Math.PI*entryClamp((T-ENTRY_ORBIT-.4)/(ENTRY_DIVE-ENTRY_ORBIT+.5)))**1.4;// calore del plasma
 if(T>ENTRY_ORBIT&&!entryFx.caption){entryFx.caption=true;const c=$('orbitCaption');if(c)c.textContent='RIENTRO ATMOSFERICO · '+world.p.name}
 if(T>ENTRY_ORBIT+.25&&!entryFx.rumble){entryFx.rumble=true;if(soundEnabled){noise(2,.07,420);noise(1.6,.035,2600,.5);tone(55,2.4,'sine',.06,38,.2)}}

 // telecamera: il pianeta cresce fino a riempire lo schermo, il bordo sale oltre il centro
 const zoom=entrySmooth(pD)**1.6,R=r0*Math.pow(Math.max(W,H)*1.5/r0,zoom);
 const limb0=cy0-r0,limb1=-H*.6-pC*H*.8,limbY=limb0+(limb1-limb0)*entrySmooth(pD);
 const pcx=cx0+(W/2-cx0)*entrySmooth(pD),pcy=limbY+R;
 const shake=heat*6+(pC>0?(1-pC)*3:0),sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;

 ctx.fillStyle='#02060c';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(sx,sy);
 drawStarfield();drawNebula();
 // cielo che si accende: l'atmosfera prende il colore del pianeta
 if(pD>0){ctx.fillStyle=A(.35*entrySmooth(pD*1.3));ctx.fillRect(-10,-10,W+20,H+20)}
 // orbita (solo nella prima parte)
 if(pD<1){ctx.save();ctx.globalAlpha=1-entrySmooth(pD*2.5);ctx.strokeStyle='rgba(140,233,236,.23)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx0,cy0,r0*1.5,r0*.48,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 drawWorld({...world,x:pcx,y:pcy,r:R});
 // alone d'atmosfera spesso sul bordo del pianeta durante la discesa
 if(pD>0){const g=ctx.createRadialGradient(pcx,pcy,R*.985,pcx,pcy,R*1.06);g.addColorStop(0,A(0));g.addColorStop(.25,A(.55*heat+.15));g.addColorStop(1,A(0));ctx.fillStyle=g;ctx.fillRect(-10,-10,W+20,H+20)}

 // foschia dell'atmosfera: più si scende, più il suolo sfuma nel colore del cielo
 if(pD>.45){const k=entrySmooth((pD-.45)/.55);const hz=ctx.createLinearGradient(0,0,0,H);hz.addColorStop(0,A(.55*k));hz.addColorStop(1,`rgba(235,244,255,${.25*k+.35*pC})`);ctx.fillStyle=hz;ctx.fillRect(-10,-10,W+20,H+20)}
 // posizione e direzione della nave
 let x,y,angle,scale=1;
 if(pD<=0){
  const a=orbitStartAngle+pO*1.4,e=entrySmooth(pO*2.2);
  x=W/2+(cx0+Math.cos(a)*r0*1.5-W/2)*e;y=H/2+(cy0+Math.sin(a)*r0*.48-H/2)*e;angle=Math.atan2(Math.cos(a)*r0*.48,-Math.sin(a)*r0*1.5);
 }else{
  const a=orbitStartAngle+1.4,ox=cx0+Math.cos(a)*r0*1.5,oy=cy0+Math.sin(a)*r0*.48,oa=Math.atan2(Math.cos(a)*r0*.48,-Math.sin(a)*r0*1.5);
  const k=entrySmooth(pD*1.6);x=ox+(W/2-ox)*k;y=oy+(H*.44-oy)*k;
  // la prua ruota verso il basso: ci si tuffa nel pianeta
  let da=Math.PI/2-oa;da=Math.atan2(Math.sin(da),Math.cos(da));angle=oa+da*k;
  scale=1+entrySmooth(pD)*.7;
 }

 // scie di velocità che salgono (stiamo scendendo)
 if(pD>0){
  const want=Math.floor(10+heat*60+pC*30);
  while(entryFx.streaks.length<want)entryFx.streaks.push({x:Math.random()*W,y:H+Math.random()*H,l:40+Math.random()*160,v:900+Math.random()*1600});
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const s of entryFx.streaks){s.y-=s.v*dt*(1+pC*1.5);if(s.y+s.l<0){s.y=H+Math.random()*80;s.x=Math.random()*W}
   const gr=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.l);gr.addColorStop(0,A(0));gr.addColorStop(1,A(.35+heat*.3));ctx.strokeStyle=gr;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x,s.y+s.l);ctx.stroke()}
  ctx.restore();
 }

 // scia di fuoco e scintille dietro la nave
 const fx=Math.cos(angle),fy=Math.sin(angle);
 if(heat>.05){
  for(let i=0;i<Math.round(heat*7);i++){const sp=200+Math.random()*420,j=(Math.random()-.5)*.7;entryFx.sparks.push({x:x+fx*20*scale,y:y+fy*20*scale,vx:-Math.cos(angle+j)*sp,vy:-Math.sin(angle+j)*sp-200*heat,life:.5+Math.random()*.5,max:1})}
  ctx.save();ctx.globalCompositeOperation='lighter';
  const len=(120+heat*260)*scale,tail=ctx.createLinearGradient(x,y,x-fx*len,y-fy*len);
  tail.addColorStop(0,`rgba(255,240,210,${.75*heat})`);tail.addColorStop(.2,`rgba(255,150,60,${.55*heat})`);tail.addColorStop(.6,`rgba(255,70,40,${.22*heat})`);tail.addColorStop(1,'rgba(120,20,10,0)');
  ctx.fillStyle=tail;ctx.beginPath();const nx=-fy,ny=fx,wd=(16+heat*10)*scale;
  ctx.moveTo(x+nx*wd*.7+fx*10,y+ny*wd*.7+fy*10);ctx.quadraticCurveTo(x-fx*len*.4+nx*wd*1.3,y-fy*len*.4+ny*wd*1.3,x-fx*len,y-fy*len);
  ctx.quadraticCurveTo(x-fx*len*.4-nx*wd*1.3,y-fy*len*.4-ny*wd*1.3,x-nx*wd*.7+fx*10,y-ny*wd*.7+fy*10);ctx.closePath();ctx.fill();
  ctx.restore();
 }
 ctx.save();ctx.globalCompositeOperation='lighter';
 entryFx.sparks=entryFx.sparks.filter(p=>(p.life-=dt)>0);
 for(const p of entryFx.sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;const k=p.life/p.max;ctx.fillStyle=`rgba(255,${150+k*100|0},${60+k*120|0},${k})`;ctx.fillRect(p.x-1.2,p.y-1.2,2.4+k*2,2.4+k*2)}
 ctx.restore();

 // nave (con il suo spessore 3D: leggero rollio durante la virata)
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.translate(-x,-y);
 const roll=pD>0&&pD<.7?Math.sin(pD/.7*Math.PI)*.85:0,sh={...player,x,y,angle,barrier:false,forward:1,boostState:pD>0?'active':'ready'};
 if(roll>.02&&typeof shipRoll3D==='function')shipRoll3D(sh,false,roll);else drawShip(sh);
 ctx.restore();

 // scudo di plasma davanti alla prua: arco di shock incandescente
 if(heat>.03){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(x+fx*24*scale,y+fy*24*scale);ctx.rotate(angle);
  const rr=(26+heat*16)*scale,flick=.85+Math.random()*.15;
  const g=ctx.createRadialGradient(0,0,0,0,0,rr*1.4);g.addColorStop(0,`rgba(255,255,240,${.9*heat*flick})`);g.addColorStop(.25,`rgba(255,200,120,${.7*heat})`);g.addColorStop(.6,`rgba(255,90,40,${.35*heat})`);g.addColorStop(1,'rgba(255,40,20,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rr*.75,rr*1.4,0,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();
  ctx.strokeStyle=`rgba(255,235,200,${.8*heat*flick})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(-2,0,rr*.55,rr*1.15,0,-Math.PI/2.2,Math.PI/2.2);ctx.stroke();
  ctx.strokeStyle=A(.6*heat);ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(-8,0,rr*.7,rr*1.5,0,-Math.PI/2.4,Math.PI/2.4);ctx.stroke();
  ctx.restore();
 }

 // nuvole che si aprono attorno alla nave
 if(pD>.75){
  const want=Math.floor(6+pC*22);
  while(entryFx.clouds.length<want){const a=Math.random()*6.28;entryFx.clouds.push({a,d:20+Math.random()*60,s:30+Math.random()*60,v:1.6+Math.random()*1.4,o:.2+Math.random()*.35})}
  ctx.save();
  for(const c of entryFx.clouds){c.d*=1+c.v*dt*(1+pC*2);c.s*=1+c.v*dt*.9;const px=W/2+Math.cos(c.a)*c.d,py=H*.5+Math.sin(c.a)*c.d*.7;
   if(c.d>Math.max(W,H)*1.2){c.d=10+Math.random()*30;c.s=30+Math.random()*50;c.a=Math.random()*6.28}
   const g=ctx.createRadialGradient(px,py,0,px,py,c.s);g.addColorStop(0,`rgba(245,250,255,${c.o})`);g.addColorStop(.6,`rgba(225,236,248,${c.o*.5})`);g.addColorStop(1,'rgba(220,232,245,0)');ctx.fillStyle=g;ctx.fillRect(px-c.s,py-c.s,c.s*2,c.s*2)}
  ctx.restore();
 }
 ctx.restore();

 // bordi dello schermo arroventati dal calore
 if(heat>.03){const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.6);v.addColorStop(0,'rgba(255,80,20,0)');v.addColorStop(1,`rgba(255,90,30,${.38*heat})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}
 // lampo finale: si esce dalle nuvole
 if(pC>.55){const k=entrySmooth((pC-.55)/.45);ctx.fillStyle=`rgba(240,248,255,${k*.95})`;ctx.fillRect(0,0,W,H)}
 // breve lampo d'impatto con l'atmosfera
 const hit=entryClamp(1-Math.abs(T-ENTRY_ORBIT-.3)/.18);if(hit>0){ctx.fillStyle=`rgba(255,230,200,${hit*.35})`;ctx.fillRect(0,0,W,H)}
};
