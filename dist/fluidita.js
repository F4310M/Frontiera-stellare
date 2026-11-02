// Fluidità su PC: Chrome/Edge su Windows calcolano shadowBlur (i bagliori) sul processore a ogni fotogramma,
// mentre Safari su iPhone lo fa in modo molto più leggero. Qui i bagliori più frequenti vengono disegnati
// una volta sola in una piccola immagine e poi solo copiati.
const flOrig={drawShip,drawParticle};
let flSprite=null;
// scafo nemico (stesso disegno di game.js, senza fiamme): g è il contesto della piccola tela
function flHostileBody(g,hostile,boosting){
 g.shadowBlur=18;g.shadowColor=(hostile?'#ff394c':'#3bcaff');const hull=g.createLinearGradient(-20,-16,25,15);hull.addColorStop(0,(hostile?'#762c39':'#526b7c'));hull.addColorStop(.38,(hostile?'#ffc3c6':'#e8f7fa'));hull.addColorStop(.7,(hostile?'#d95263':'#8daab8'));hull.addColorStop(1,(hostile?'#501c2a':'#304b5c'));g.fillStyle=hull;g.strokeStyle=(hostile?'#ff9ba4':'#d8fbff');g.lineWidth=1.25;g.beginPath();g.moveTo(29,0);g.lineTo(8,-7);g.lineTo(-7,-16);g.lineTo(-13,-9);g.lineTo(-22,-12);g.lineTo(-17,0);g.lineTo(-22,12);g.lineTo(-13,9);g.lineTo(-7,16);g.lineTo(8,7);g.closePath();g.fill();g.stroke();
 g.shadowBlur=5;g.fillStyle=(hostile?'#360e1e':'#17364d');g.strokeStyle=(hostile?'#ff6576':'#63dcff');g.beginPath();g.moveTo(15,0);g.lineTo(4,-5);g.lineTo(-5,-4);g.lineTo(-8,0);g.lineTo(-5,4);g.lineTo(4,5);g.closePath();g.fill();g.stroke();g.fillStyle=(hostile?'#ffb4bc':'#8cf2ff');g.globalAlpha=.8;g.beginPath();g.ellipse(4,-1,5,2.2,0,0,6.28);g.fill();g.globalAlpha=1;
 g.strokeStyle=hostile?'rgba(255,225,228,.5)':'rgba(255,255,255,.6)';g.lineWidth=.8;g.beginPath();g.moveTo(27,-.6);g.lineTo(8.5,-6.2);g.lineTo(-6.5,-14.6);g.stroke();g.strokeStyle='rgba(0,10,20,.35)';g.beginPath();g.moveTo(27,.6);g.lineTo(8.5,6.2);g.lineTo(-6.5,14.6);g.stroke();g.strokeStyle='rgba(25,55,72,.8)';g.lineWidth=1;g.beginPath();g.moveTo(5,-7);g.lineTo(-8,-13);g.moveTo(5,7);g.lineTo(-8,13);g.moveTo(-10,-7);g.lineTo(-17,-9);g.moveTo(-10,7);g.lineTo(-17,9);g.stroke();
 for(const y of [-7,7]){g.fillStyle=(hostile?'#36101b':'#142d3c');g.strokeStyle=(hostile?'#ff6576':'#6edfff');g.fillRect(-20,y-3,8,6);g.strokeRect(-20,y-3,8,6);g.fillStyle=boosting?'#e9ffff':(hostile?'#ff5268':'#53dfff');g.shadowBlur=boosting?18:9;g.shadowColor=(hostile?'#ff5268':'#51e6ff');g.fillRect(-21.5,y-2,2.5,4)}g.shadowBlur=0;
 g.fillStyle=(hostile?'#ffdb9c':'#ffb348');g.beginPath();g.arc(11,0,1.7,0,6.28);g.fill();g.fillStyle=(hostile?'#ff5268':'#53dfff');g.fillRect(-3,-13,5,1.4);g.fillRect(-3,11.6,5,1.4);

}
function flScale(){return canvas&&W?canvas.width/W:1}
function flHostileSprite(){
 const k=flScale();if(flSprite&&flSprite.k===k)return flSprite;
 try{const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;
  const L=-48,T=-42,w=103,h=84;c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);const g=c.getContext('2d');if(!g)return null;
  g.setTransform(k,0,0,k,-L*k,-T*k);flHostileBody(g,true,false);g.shadowBlur=0;
  flSprite={c,k,L,T,w,h};return flSprite}catch(e){return null}
}
drawShip=function(ship,hostile=false){
 if(!hostile||ship.barrier||ship.boostState==='active'||state==='platform')return flOrig.drawShip(ship,hostile);
 const sp=flHostileSprite();if(!sp)return flOrig.drawShip(ship,hostile);
 ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
 const red='#ff5268';
 if(ship.forward>0){drawPlume(-18,-6,-1,0,38,4,red);drawPlume(-18,6,-1,0,38,4,red)}
 if(ship.forward<0)drawPlume(25,0,1,0,30,4,red);
 if(ship.strafe>0)drawPlume(0,-15,0,-1,29,4,red);
 if(ship.strafe<0)drawPlume(0,15,0,1,29,4,red);
 ctx.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);
 ctx.restore();
};
// particelle morbide (fumo luminoso delle esplosioni): un alone a due cerchi al posto di shadowBlur
drawParticle=function(p){
 if(!p.soft||p.smoke)return flOrig.drawParticle(p);
 const fade=Math.max(0,p.life/p.max),r=p.r*(.5+fade*.5);
 ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=p.color;
 ctx.globalAlpha=fade*.16;ctx.beginPath();ctx.arc(p.x,p.y,r+p.r*2.2,0,6.28);ctx.fill();
 ctx.globalAlpha=fade*.22;ctx.beginPath();ctx.arc(p.x,p.y,r+p.r*1.1,0,6.28);ctx.fill();
 ctx.globalAlpha=fade*.48;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.28);ctx.fill();
 ctx.restore();
};
