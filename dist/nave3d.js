// Stellar Frontier — NAVE IN 3D NELLA FASE A TERRA.
// Nella fase a terra la visuale è di lato, ma la nave veniva disegnata vista dall'alto (piatta).
// Qui, solo in fase a terra, drawShip disegna la nave di lato e di tre quarti: volume, luci, ali, motori sotto.
// Le misure sono pensate per la scala 2.3 usata da pfDrawShipOnPad e dalla navetta di terra.js
// (motori a x ≈ -11 e +10, scarichi a y ≈ +13, così le fiamme già disegnate escono dagli ugelli).

const n3Orig={drawShip},N3_SCALE=1.2;
function n3Path(pts){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath()}
function n3Grad(y0,y1,stops){const g=ctx.createLinearGradient(0,y0,0,y1);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g}
function n3Engine(x,now,glow){
 // gondola cilindrica: chiara al centro, scura ai lati
 const g=ctx.createLinearGradient(x-4.5,0,x+4.5,0);g.addColorStop(0,'#151f28');g.addColorStop(.45,'#8a9ca8');g.addColorStop(1,'#1a2731');
 ctx.fillStyle=g;ctx.strokeStyle='#0a1a26';ctx.lineWidth=.5;
 ctx.beginPath();ctx.moveTo(x-4.5,4);ctx.lineTo(x+4.5,4);ctx.lineTo(x+4,11.5);ctx.lineTo(x-4,11.5);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(216,251,255,.35)';ctx.beginPath();ctx.moveTo(x-4.3,7);ctx.lineTo(x+4.3,7);ctx.stroke();
 // ugello visto un po' dal basso
 ctx.fillStyle='#071019';ctx.beginPath();ctx.ellipse(x,12,4.3,1.6,0,0,Math.PI*2);ctx.fill();
 if(glow>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(120,240,255,${(.5+.4*glow+.1*Math.sin(now*40)).toFixed(2)})`;ctx.shadowColor='#51e6ff';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(x,12.2,3.2,1.1,0,0,Math.PI*2);ctx.fill();ctx.restore()}
}
function n3DrawShip(ship){
 const now=performance.now()/1000,glow=ship.forward>0?1:.55;
 ctx.save();ctx.translate(ship.x||0,ship.y||0);
 ctx.rotate(Math.sin(now*1.3)*.025);// leggero dondolio in volo
 ctx.scale(N3_SCALE,N3_SCALE);
 ctx.lineJoin='round';
 // ala lontana (dietro lo scafo, più scura e più in alto per la prospettiva)
 ctx.fillStyle=n3Grad(-12,0,['#2b3843','#121a22']);ctx.strokeStyle='#0a1a26';ctx.lineWidth=.6;
 n3Path([[-4,-3],[-14,-3],[-25,-11],[-19,-11]]);ctx.fill();ctx.stroke();
 // pinna di coda
 ctx.fillStyle=n3Grad(-17,-6,['#7d909d','#26343f']);n3Path([[-13,-6.5],[-21,-6.5],[-25.5,-17],[-21.5,-17]]);ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(216,251,255,.6)';ctx.beginPath();ctx.moveTo(-21.5,-17);ctx.lineTo(-13,-6.5);ctx.stroke();
 // motori (dietro la parte bassa dello scafo)
 n3Engine(-11/N3_SCALE,now,glow);n3Engine(10/N3_SCALE,now,glow);
 // scafo: luce dall'alto, ombra sotto
 const hull=[[27,2.5],[22,-2.5],[13,-7.5],[0,-8.5],[-17,-7.5],[-24.5,-4],[-25,2],[-21,6.5],[0,7.5],[16,6.5]];
 ctx.fillStyle=n3Grad(-8.5,7.5,['#c9d6de','#7d909d','#3f515e','#151f28']);ctx.strokeStyle='#0a1a26';ctx.lineWidth=.7;
 n3Path(hull);ctx.fill();ctx.stroke();
 // riflesso lungo il dorso
 ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-17,-6.4);ctx.quadraticCurveTo(0,-7.6,12,-6.4);ctx.stroke();
 // ombra della pancia
 ctx.save();n3Path(hull);ctx.clip();ctx.fillStyle='rgba(2,10,18,.35)';ctx.beginPath();ctx.ellipse(0,9,30,5,0,0,Math.PI*2);ctx.fill();
 // linee dei pannelli
 ctx.strokeStyle='rgba(10,26,38,.55)';ctx.lineWidth=.45;ctx.beginPath();
 for(const x of [-15,-6,4])ctx.moveTo(x,-8.5),ctx.lineTo(x+1,7.5);
 ctx.moveTo(-24,0.5);ctx.lineTo(20,0.5);ctx.stroke();
 // fascia colorata sul fianco
 ctx.fillStyle='#51e6ff';ctx.globalAlpha=.85;n3Path([[-22,1.6],[17,1.6],[15,3.1],[-21.5,3.1]]);ctx.fill();ctx.globalAlpha=1;
 ctx.restore();
 // portello del pilota
 ctx.strokeStyle='rgba(10,26,38,.8)';ctx.lineWidth=.6;ctx.strokeRect(9.5,-4.5,5,6);ctx.fillStyle='#ffb348';ctx.fillRect(10.4,-3.6,1.2,1.2);
 // cupola di vetro
 const glass=ctx.createLinearGradient(13,-9,23,1);glass.addColorStop(0,'#bff8ff');glass.addColorStop(.35,'#3bcaff');glass.addColorStop(1,'#0b2a40');
 ctx.fillStyle=glass;ctx.strokeStyle='#0a1a26';ctx.lineWidth=.6;
 ctx.beginPath();ctx.moveTo(14,-7.3);ctx.quadraticCurveTo(21,-7,24.5,-1.5);ctx.lineTo(16,-1.5);ctx.quadraticCurveTo(14,-4,14,-7.3);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(16,-6.2);ctx.quadraticCurveTo(19.5,-6,21.5,-4);ctx.stroke();
 // ala vicina (davanti allo scafo, più chiara e più in basso)
 ctx.fillStyle=n3Grad(0,11,['#b8c7d1','#6d808d','#26343f']);ctx.strokeStyle='#0a1a26';ctx.lineWidth=.7;
 n3Path([[2,1.5],[-12,1.5],[-23,10],[-15,10]]);ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(2,1.5);ctx.lineTo(-15,10);ctx.stroke();
 ctx.fillStyle='#51e6ff';n3Path([[-15,8.6],[-21.2,8.6],[-23,10],[-15,10]]);ctx.fill();
 // luci di navigazione
 const blink=Math.floor(now*2)%2===0;
 ctx.fillStyle=blink?'#ff5268':'#5a1a24';ctx.shadowColor='#ff5268';ctx.shadowBlur=blink?6:0;ctx.beginPath();ctx.arc(-22.5,10,1,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=blink?'#4dffa0':'#174a30';ctx.shadowColor='#4dffa0';ctx.beginPath();ctx.arc(-24.8,-16.6,.9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 ctx.restore();
}
drawShip=function(ship,hostile=false){
 if(state==='platform'&&!hostile&&typeof ctx!=='undefined'&&ctx.createLinearGradient){try{return n3DrawShip(ship)}catch(e){console.error(e)}}
 return n3Orig.drawShip(ship,hostile);
};
