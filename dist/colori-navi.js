// Conex — COLORI INVERSI SULLE NAVI (2026-11-14).
// La nave del pilota (blu) ha qualche dettaglio rosso, le navi nemiche (rosse) qualche dettaglio blu:
// punta del muso, una fascia a freccia su ogni ala, gli anelli dei due motori e una striscia sul dorso.
// - Navi nemiche: i dettagli blu entrano nell'immagine pronta di fluidita.js (flHostileSprite, tramite
//   flHostileBody), quindi in volo non costano nulla. Valgono anche per le navi in fuga (navi-in-fuga.js).
// - Nave del pilota: i dettagli rossi sono una piccola immagine preparata una volta sola e copiata sopra
//   lo scafo, schiacciata come la superficie nel rollio 3D (shipRoll3D di terra.js). A terra (nave3d.js)
//   la nave usa flHostileBody, quindi prende i dettagli rossi dentro la sua immagine.
// - Sfida online: arDrawShip usa drawShip, quindi stessi colori.
// Niente shadowBlur o ctx.filter a ogni fotogramma.
// Va caricato dopo terra.js, fluidita.js e nave3d.js e prima di nave-gadget.js
// (così i pezzi dei potenziamenti restano sopra i dettagli colorati).

const CN={
 rosso:{fill:'#ff3b4e',edge:'#7d0f1d',glow:'rgba(255,120,130,.9)'},
 blu:{fill:'#36b6ff',edge:'#0b3f6e',glow:'rgba(150,225,255,.9)'},
 px:6,                       // pixel dell'immagine per unità della nave
 box:{L:-30,T:-20,w:62,h:40} // riquadro dei dettagli in unità della nave (muso a +29, ali a ±16)
};
const cnOrig={drawShip,flHostileBody:typeof flHostileBody==='function'?flHostileBody:null,shipRoll3D:typeof shipRoll3D==='function'?shipRoll3D:null};
let cnSprite=null;

// i dettagli, in coordinate della nave (muso verso +x): g è un contesto 2D qualsiasi
function cnDettagli(g,col){
 g.save();g.shadowBlur=0;g.globalAlpha=1;g.lineJoin='round';
 const poly=pts=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath()};
 g.fillStyle=col.fill;g.strokeStyle=col.edge;g.lineWidth=.55;
 // punta del muso
 poly([[29,0],[23.2,-1.8],[22.2,0],[23.2,1.8]]);g.fill();g.stroke();
 // fascia a freccia su ogni ala, parallela al bordo d'attacco
 for(const s of [-1,1]){poly([[-1.2,8.6*s],[-4.4,13.6*s],[-6.6,13.2*s],[-3.6,8.3*s]]);g.fill();g.stroke()}
 // anelli dei motori (gondole da x -20 a -12, y ±7)
 for(const y of [-7,7]){g.fillRect(-15.4,y-3,1.6,6);g.strokeRect(-15.4,y-3,1.6,6)}
 // striscia sul dorso dietro la cabina
 g.lineCap='round';g.strokeStyle=col.edge;g.lineWidth=1.9;g.beginPath();g.moveTo(-9.2,0);g.lineTo(-15.6,0);g.stroke();
 g.strokeStyle=col.fill;g.lineWidth=1.1;g.stroke();
 // filo di luce sulla punta: fa brillare il colore senza bagliori calcolati
 g.strokeStyle=col.glow;g.lineWidth=.35;g.beginPath();g.moveTo(28.4,0);g.lineTo(23.6,-1.4);g.stroke();
 g.restore();
}
function cnGetSprite(){
 if(cnSprite!==null)return cnSprite||null;
 cnSprite=false;
 try{const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;
  const B=CN.box;c.width=Math.ceil(B.w*CN.px);c.height=Math.ceil(B.h*CN.px);const g=c.getContext('2d');if(!g)return null;
  g.setTransform(CN.px,0,0,CN.px,-B.L*CN.px,-B.T*CN.px);cnDettagli(g,CN.rosso);cnSprite={c}}catch(e){cnSprite=false}
 return cnSprite||null;
}
function cnBank(ship,hostile){
 return !hostile&&state!=='platform'&&typeof player!=='undefined'&&player&&ship.x===player.x&&ship.y===player.y?(player.bank||0):0;
}
// copia dell'immagine sopra lo scafo: squash = schiacciamento del rollio (1 = nave dritta)
function cnSopra(ship,sp,squash){
 const B=CN.box;ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle||0);if(squash!==1)ctx.transform(1,0,0,squash,0,0);
 ctx.drawImage(sp.c,B.L,B.T,B.w,B.h);ctx.restore();
}

// nemici (e nave a terra): i dettagli dentro l'immagine dello scafo
if(cnOrig.flHostileBody)flHostileBody=function(g,hostile,boosting){
 const r=cnOrig.flHostileBody.apply(this,arguments);
 try{cnDettagli(g,hostile?CN.blu:CN.rosso)}catch(e){}
 return r;
};
// nave del pilota dritta (e nemici disegnati senza immagine pronta: barriera o turbo)
drawShip=function(ship,hostile=false){
 const r=cnOrig.drawShip.apply(this,arguments);
 try{
  if(state==='platform')return r;
  if(!hostile){if(Math.abs(cnBank(ship,hostile))<.02){const sp=cnGetSprite();if(sp)cnSopra(ship,sp,1)}}
  else if(ship.barrier||ship.boostState==='active'){ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle||0);cnDettagli(ctx,CN.blu);ctx.restore()}
 }catch(e){}
 return r;
};
// nave del pilota nel rollio 3D: stessa inclinazione della superficie (transform(1,0,0,c,0,0) in terra.js)
if(cnOrig.shipRoll3D)shipRoll3D=function(ship,hostile,b){
 const r=cnOrig.shipRoll3D.apply(this,arguments);
 try{if(!hostile){const sp=cnGetSprite();if(sp)cnSopra(ship,sp,Math.cos(-b*1.05))}}catch(e){}
 return r;
};
