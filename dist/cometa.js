// Cometa 2026-11-09 (richiesta di Fabio): nel gioco in singolo resta il meteorite di game.js
// (stesso comportamento: punta la nave, si può frantumare sparandogli, stesso avviso "METEORITE IN ARRIVO"),
// ma è grande il doppio e in volo ha la coda luminosa della cometa della sfida online (arDrawMeteor di arena.js).
// Va caricato dopo meteoriti.js e prima di arena.js.

const COMETA={
 r:48,        // raggio del meteorite (prima 24)
 extra:60     // px in più di partenza fuori dallo schermo, perché è più grande
};
const cometaOrig={spawnMeteor,drawMeteor};

spawnMeteor=function(){
 const r=cometaOrig.spawnMeteor.apply(this,arguments);
 const m=meteor;
 if(m){
  m.r=COMETA.r;
  m.x-=Math.cos(m.angle)*COMETA.extra;m.y-=Math.sin(m.angle)*COMETA.extra;
  m.life+=COMETA.extra/Math.max(1,Math.hypot(m.vx,m.vy));
 }
 return r;
};

drawMeteor=function(){
 const m=meteor;if(!m)return;
 // preavviso: identico a prima (cerchio con "!" e scritta "METEORITE · n s")
 if(m.warning>0)return cometaOrig.drawMeteor.apply(this,arguments);
 const R=m.r||COMETA.r,a=Math.atan2(m.vy,m.vx),now=performance.now()/1000,k=R/24;
 // coda luminosa come nella sfida online
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';
 const glow=ctx.createRadialGradient(-20*k,0,4*k,-20*k,0,95*k);glow.addColorStop(0,'rgba(255,196,100,.38)');glow.addColorStop(1,'rgba(255,75,10,0)');ctx.fillStyle=glow;ctx.fillRect(-115*k,-95*k,190*k,190*k);
 for(let i=0;i<5;i++){const length=(190-i*22)*k*1.6,width=(22-i*3)*k,tail=ctx.createLinearGradient(-length,0,10*k,0);tail.addColorStop(0,'rgba(255,65,15,0)');tail.addColorStop(.65,`rgba(255,105,28,${.1+i*.035})`);tail.addColorStop(1,'rgba(255,235,177,.8)');ctx.fillStyle=tail;ctx.beginPath();ctx.moveTo(0,-width);ctx.quadraticCurveTo(-length*.35,-width*.9,-length,Math.sin(now*12+i)*5*k);ctx.quadraticCurveTo(-length*.35,width*.8,0,width);ctx.arc(0,0,width,Math.PI/2,-Math.PI/2,true);ctx.closePath();ctx.fill()}
 ctx.globalCompositeOperation='source-over';ctx.restore();
 // nucleo: la roccia di prima (con le crepe quando la colpisci), solo più grande
 if(!m.core)m.core={r:R,rot:m.angle,fill:'#665042',edge:'#ffc78d'};
 Object.assign(m.core,{x:m.x,y:m.y,r:R,rot:m.angle+m.life*.8,hp:m.hp??4,maxHp:m.maxHp??4});
 drawRock(m.core);
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);ctx.strokeStyle='#ffe0a1';ctx.globalAlpha=.85;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,R*.82,-1.1,1.1);ctx.stroke();ctx.restore();
};
