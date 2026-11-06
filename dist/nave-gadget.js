// Conex — LA NAVE CAMBIA ASPETTO CON I POTENZIAMENTI (missione nello spazio).
// Ogni potenziamento comprato al mercato aggiunge un pezzo visibile alla nave del giocatore:
//  laser     → cannoni sulle ali, più lunghi a ogni livello (al 3° la bocca si illumina)
//  twin      → doppia canna sotto il muso
//  salvo     → missili appesi sotto le ali (1 o 2 per lato)
//  shield    → piastre di corazza sul bordo delle ali ed emettitori della barriera
//  speed     → motori esterni sulle punte delle ali (al 3° anche un motore centrale)
//  fuel      → serbatoi sul dorso
// e con tanti potenziamenti la nave prende una livrea arancione.
// I pezzi sono disegnati una volta in due piccole immagini (sotto e sopra lo scafo) e poi solo copiati:
// niente shadowBlur a ogni fotogramma. Caricare dopo nave3d.js: avvolge drawShip e shipRoll3D (terra.js),
// così i pezzi seguono anche il rollio 3D e le scene di arrivo. A terra (nave3d.js) la nave resta com'era.

const ngOrig={drawShip,shipRoll3D:typeof shipRoll3D==='function'?shipRoll3D:null};
let ngCache=null;
const NG_IDS=['laser','twin','salvo','shield','speed','fuel'];
const NG_BOX={L:-34,T:-26,w:76,h:52};

function ngLevel(id){try{return typeof ecoUpgrade==='function'?ecoUpgrade(id)|0:0}catch(e){return 0}}
function ngLevels(){const o={};for(const id of NG_IDS)o[id]=ngLevel(id);return o}
function ngRes(){const k=typeof flScale==='function'?flScale():1;return Math.max(2,Math.min(4,k*2.5))}

function ngSprites(){
 const lv=ngLevels(),k=ngRes(),key=NG_IDS.map(id=>lv[id]).join('')+'@'+k.toFixed(2);
 if(ngCache&&ngCache.key===key)return ngCache;
 ngCache={key,lv,under:null,over:null,empty:NG_IDS.every(id=>!lv[id])};
 if(ngCache.empty)return ngCache;
 try{ngCache.under=ngPaint(k,g=>ngUnder(g,lv));ngCache.over=ngPaint(k,g=>ngOver(g,lv))}catch(e){console.warn('gadget nave',e);ngCache.empty=true}
 return ngCache;
}
function ngPaint(k,fn){
 const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;
 c.width=Math.ceil(NG_BOX.w*k);c.height=Math.ceil(NG_BOX.h*k);const g=c.getContext('2d');if(!g)return null;
 g.setTransform(k,0,0,k,-NG_BOX.L*k,-NG_BOX.T*k);fn(g);g.shadowBlur=0;return c;
}
// metallo con luce dall'alto: chiaro sopra, scuro sotto
function ngMetal(g,y0,y1,a='#d9eef5',b='#6f8b9b',c='#26404f'){const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,a);gr.addColorStop(.45,b);gr.addColorStop(1,c);return gr}
function ngCapsule(g,x0,x1,y,r,fill,stroke){g.beginPath();g.moveTo(x0+r,y-r);g.lineTo(x1-r,y-r);g.arc(x1-r,y,r,-Math.PI/2,Math.PI/2);g.lineTo(x0+r,y+r);g.arc(x0+r,y,r,Math.PI/2,Math.PI*1.5);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=.6;g.stroke()}}

// ---- pezzi SOTTO lo scafo (si vedono dove sporgono)
function ngNacelle(lv){const len=13+lv*2.5,x1=2+lv*1.5;return{x0:x1-len,x1,y:17.2}}
function ngUnder(g,lv){
 // motori esterni montati sulle punte delle ali
 if(lv.speed>0){
  const N=ngNacelle(lv.speed);
  for(const s of [-1,1]){const y=s*N.y;
   g.fillStyle='#1b3444';g.beginPath();g.moveTo(-9,s*13.5);g.lineTo(-3,s*13.5);g.lineTo(-2,y);g.lineTo(-10,y);g.closePath();g.fill();// pilone
   ngCapsule(g,N.x0,N.x1,y,2.6,ngMetal(g,y-2.6,y+2.6),'rgba(6,16,24,.9)');
   g.fillStyle='rgba(255,255,255,.5)';g.fillRect(N.x0+3,y-1.9,N.x1-N.x0-6,.55);
   g.fillStyle='#51e6ff';g.fillRect(N.x1-5,y-.35,3,.7);// presa d'aria luminosa
   if(lv.speed>=2){g.fillStyle='#3f6274';g.beginPath();g.moveTo(N.x0+3,y+s*2.3);g.lineTo(N.x0,y+s*6);g.lineTo(N.x0+7,y+s*2.3);g.closePath();g.fill()}
   g.fillStyle='#0e2230';g.fillRect(N.x0-1.4,y-2.1,2,4.2);g.shadowBlur=7;g.shadowColor='#51e6ff';g.fillStyle='#8ff4ff';g.fillRect(N.x0-2.2,y-1.3,1.1,2.6);g.shadowBlur=0;
  }
  // motore centrale nella coda
  if(lv.speed>=3){ngCapsule(g,-25,-12,0,2.8,ngMetal(g,-2.8,2.8),'rgba(6,16,24,.9)');g.shadowBlur=8;g.shadowColor='#51e6ff';g.fillStyle='#9ff6ff';g.fillRect(-26.3,-1.7,1.3,3.4);g.shadowBlur=0}
 }
 // cannoni sotto le ali, sporgono davanti al bordo d'attacco
 if(lv.laser>0){
  const tip=2+lv.laser*4.5;
  for(const s of [-1,1]){const y=s*14.2;
   g.fillStyle=ngMetal(g,y-1.5,y+1.5,'#c6dde6','#556f7e','#1d3341');g.fillRect(-8,y-1.5,tip+8,3);
   g.fillStyle='#2b4554';for(let x=-1;x<tip-1;x+=3.2)g.fillRect(x,y-1.8,.9,3.6);// alette di raffreddamento
   g.fillStyle='#132632';g.fillRect(tip,y-2,2.2,4);
   if(lv.laser>=3){g.shadowBlur=6;g.shadowColor='#51e6ff'}g.fillStyle=lv.laser>=2?'#7ff0ff':'#3d6f80';g.fillRect(tip+2,y-.9,1.1,1.8);g.shadowBlur=0;
  }
 }
 // doppia canna sotto il muso
 if(lv.twin>0){for(const s of [-1,1]){const y=s*3.6;g.fillStyle=ngMetal(g,y-1.1,y+1.1,'#d4e8ee','#5d7887','#1d3341');g.fillRect(10,y-1.1,23,2.2);g.fillStyle='#132632';g.fillRect(32,y-1.5,2,3);g.fillStyle='#ff9b5a';g.fillRect(33.6,y-.6,.8,1.2)}}
}

// ---- pezzi SOPRA lo scafo
function ngOver(g,lv){
 // livrea: con molti potenziamenti compare una striscia arancione lungo lo scafo
 const total=NG_IDS.reduce((a,id)=>a+lv[id],0);
 if(total>=4){g.save();g.beginPath();g.moveTo(29,0);g.lineTo(8,-7);g.lineTo(-7,-16);g.lineTo(-13,-9);g.lineTo(-22,-12);g.lineTo(-17,0);g.lineTo(-22,12);g.lineTo(-13,9);g.lineTo(-7,16);g.lineTo(8,7);g.closePath();g.clip();
  g.fillStyle='rgba(255,150,60,.85)';for(const s of [-1,1]){g.beginPath();g.moveTo(22,s*2.6);g.lineTo(6,s*8.4);g.lineTo(-4,s*13.6);g.lineTo(-3,s*15.4);g.lineTo(7.5,s*9.6);g.lineTo(23,s*3.4);g.closePath();g.fill()}
  if(total>=9){g.fillStyle='rgba(255,214,120,.9)';for(const s of [-1,1])g.fillRect(-12,s*10.5-.5,7,1)}
  g.restore()}
 // piastre di corazza sulla metà esterna del bordo d'attacco + emettitori della barriera
 if(lv.shield>0){
  const E=t=>[8-15*t,7+9*t];// bordo d'attacco dell'ala (lato y>0)
  for(const s of [-1,1]){
   for(let i=0;i<lv.shield;i++){const t0=.4+i*.2,t1=t0+.17,[ax,ay]=E(t0),[bx,by]=E(t1);
    const pts=[[ax+.5,ay+.9],[bx+.5,by+.9],[bx+2.8,by-2.6],[ax+2.8,ay-2.6]].map(([x,y])=>[x,s*y]);
    g.beginPath();pts.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.fillStyle='#4f6b7b';g.fill();g.strokeStyle='rgba(10,24,34,.85)';g.lineWidth=.45;g.stroke();
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=.5;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);g.lineTo(pts[1][0],pts[1][1]);g.stroke();
    if(lv.shield>=2){g.strokeStyle='rgba(110,240,255,.85)';g.lineWidth=.45;g.beginPath();g.moveTo(pts[3][0],pts[3][1]);g.lineTo(pts[2][0],pts[2][1]);g.stroke()}
   }
   g.shadowBlur=6;g.shadowColor='#7ff7ff';g.fillStyle='#bdfcff';g.beginPath();g.arc(-6.6,s*15.2,1.2,0,6.28);g.fill();g.shadowBlur=0;
  }
  if(lv.shield>=3){g.strokeStyle='rgba(127,247,255,.8)';g.lineWidth=.7;g.beginPath();g.ellipse(-12.5,0,2.2,3.6,0,0,6.28);g.fillStyle='rgba(20,60,80,.9)';g.fill();g.stroke();g.fillStyle='rgba(160,250,255,.6)';g.beginPath();g.ellipse(-12.5,0,1,1.8,0,0,6.28);g.fill()}
 }
 // missili agganciati sulle ali
 if(lv.salvo>0){
  const rows=lv.salvo>=2?[[9.3,-1.5],[11.7,-4]]:[[10.2,-2]];
  for(const s of [-1,1])for(const [r,x1] of rows){const y=s*r,x0=x1-9;
   g.fillStyle='rgba(10,24,34,.7)';g.fillRect(x0+2,y-.4,5,.8);
   ngCapsule(g,x0,x1,y,1,ngMetal(g,y-1,y+1,'#f2f6f8','#aebfc7','#56697a'),'rgba(10,22,32,.85)');
   g.fillStyle='#ff4f60';g.beginPath();g.moveTo(x1-1.2,y-1);g.lineTo(x1+1.6,y);g.lineTo(x1-1.2,y+1);g.closePath();g.fill();
   g.fillStyle='#3f5562';g.beginPath();g.moveTo(x0+1.6,y);g.lineTo(x0-.6,y-2);g.lineTo(x0+2.6,y);g.lineTo(x0-.6,y+2);g.closePath();g.fill();
  }
 }
 // serbatoi sul dorso, dietro la cabina
 if(lv.fuel>0){
  const ys=lv.fuel>=2?[-3,3]:[0];
  for(const y of ys){ngCapsule(g,-17.5,-8.8,y,2,ngMetal(g,y-2,y+2,'#e6f0f3','#7d95a2','#2c4352'),'rgba(6,16,24,.9)');
   g.fillStyle='#ffb348';g.fillRect(-13.6,y-2,1,4);g.fillStyle='rgba(255,255,255,.6)';g.fillRect(-16,y-1.4,5,.45)}
 }
}

function ngShipBank(ship){return typeof player!=='undefined'&&player&&state!=='platform'&&ship.x===player.x&&ship.y===player.y?(player.bank||0):0}
function ngPlumes(ship,lv){
 if(!(ship.forward>0)||typeof drawPlume!=='function')return;
 const boost=ship.boostState==='active';
 if(lv.speed>0){const N=ngNacelle(lv.speed);for(const s of [-1,1])drawPlume(N.x0-2,s*N.y,-1,0,boost?70:24+lv.speed*4,boost?5:2.6,'#51e6ff')}
 if(lv.speed>=3)drawPlume(-26,0,-1,0,boost?80:34,boost?6:3.2,'#51e6ff');
}
function ngPlayerSprites(ship,hostile){if(hostile||state==='platform')return null;const sp=ngSprites();return sp.empty||!sp.under||!sp.over?null:sp}
// nave dritta: pezzi sotto, nave, pezzi sopra
drawShip=function(ship,hostile=false){
 const sp=ngPlayerSprites(ship,hostile);
 if(!sp||Math.abs(ngShipBank(ship))>=.02)return ngOrig.drawShip(ship,hostile);
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ngPlumes(ship,sp.lv);ctx.drawImage(sp.under,NG_BOX.L,NG_BOX.T,NG_BOX.w,NG_BOX.h);ctx.restore();
 ngOrig.drawShip(ship,hostile);
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ctx.drawImage(sp.over,NG_BOX.L,NG_BOX.T,NG_BOX.w,NG_BOX.h);ctx.restore();
};
// nave inclinata (rollio 3D): i pezzi seguono lo stesso schiacciamento dello scafo
if(ngOrig.shipRoll3D)shipRoll3D=function(ship,hostile,b){
 const sp=ngPlayerSprites(ship,hostile);
 if(!sp)return ngOrig.shipRoll3D(ship,hostile,b);
 const phi=-b*1.05,c=Math.cos(phi),s=Math.sin(phi);
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ctx.transform(1,0,0,c,0,4*s);ngPlumes(ship,sp.lv);ctx.drawImage(sp.under,NG_BOX.L,NG_BOX.T,NG_BOX.w,NG_BOX.h);ctx.restore();
 ngOrig.shipRoll3D(ship,hostile,b);
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ctx.transform(1,0,0,c,0,-.6*s);ctx.drawImage(sp.over,NG_BOX.L,NG_BOX.T,NG_BOX.w,NG_BOX.h);ctx.restore();
};
