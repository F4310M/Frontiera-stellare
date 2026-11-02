// Frontiera Stellare — BOSS FINALI: un robot diverso per ogni pianeta (dati di gioco in fase2.js, PF_BOSS).
// Ogni robot si disegna su un livello fuori schermo; sopra si applicano una texture di metallo
// consumato, la luce dall'alto, le bruciature dei danni e il lampo dei colpi, seguendo la sagoma esatta.
// Se il canvas fuori schermo non c'è (test), si disegna direttamente.

const bOrig={gBoss:typeof gBoss==='function'?gBoss:null};
let bLayer=null,bTexCanvas=null,bFxLayer=null;

function bPlate(c,points,fill,edge,light){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1.4;c.stroke()}if(light){c.save();c.clip();c.strokeStyle=light;c.lineWidth=3;c.beginPath();c.moveTo(points[0][0],points[0][1]);c.lineTo(points[1][0],points[1][1]);c.stroke();c.restore()}}
function bRivets(c,pts){c.fillStyle='#9fb2c4';for(const [x,y] of pts){c.beginPath();c.arc(x,y,1.3,0,6.28);c.fill()}c.fillStyle='rgba(0,0,0,.5)';for(const [x,y] of pts){c.beginPath();c.arc(x+.5,y+.6,.8,0,6.28);c.fill()}}
function bGrad(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function bMetal(c,x0,y0,x1,y1,base,k=0){return bGrad(c,x0,y0,x1,y1,[gShade(base,.28+k),gShade(base,k),gShade(base,-.55+k)])}
function bEllipse(c,x,y,rx,ry,fill,edge,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,6.28);c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1.3;c.stroke()}}
function bGlow(c,x,y,r,col,blur=14){c.save();c.shadowBlur=blur;c.shadowColor=col;c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,6.28);c.fill();c.restore()}
function bArmAngle(B){const la=B.face>0?B.aim:Math.PI-B.aim;return Math.atan2(Math.sin(la),Math.cos(la))}
function bPod(c,x,y,cols,open,metal){bPlate(c,[[x-4,y-4],[x+cols*12+6,y-6],[x+cols*12+8,y+26],[x-2,y+28]],bMetal(c,x,y-6,x,y+28,metal),'rgba(220,235,250,.5)','rgba(255,255,255,.35)');for(let r=0;r<2;r++)for(let k=0;k<cols;k++){const px=x+6+k*12,py=y+5+r*12;c.fillStyle='#05090f';c.beginPath();c.arc(px,py,4.2,0,6.28);c.fill();if(open)bGlow(c,px,py,2.2,'#ffb05a',8);else{c.fillStyle='#3a1a1a';c.beginPath();c.arc(px,py,2,0,6.28);c.fill()}}}

// Texture di metallo consumato: graffi, macchie e polvere (una sola volta).
function bTexture(){
 if(bTexCanvas)return bTexCanvas;
 const o=gCanvas(256,256);if(!o)return null;const cv=o.c,c=o.g;
 c.fillStyle='#808080';c.fillRect(0,0,256,256);
 for(let i=0;i<900;i++){const x=gHash(i*3)*256,y=gHash(i*3+1)*256,r=.6+gHash(i*3+2)*2.2,v=gHash(i*7)<.5?40:200;c.fillStyle=`rgba(${v},${v},${v},${.12+gHash(i*5)*.25})`;c.beginPath();c.arc(x,y,r,0,6.28);c.fill()}
 for(let i=0;i<70;i++){const x=gHash(i*11)*256,y=gHash(i*11+1)*256,a=gHash(i*11+2)*6.28,l=8+gHash(i*11+3)*34;c.strokeStyle=`rgba(225,225,225,${.15+gHash(i*13)*.25})`;c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke()}
 for(let i=0;i<26;i++){const x=gHash(i*17)*256,y=gHash(i*17+1)*256,r=10+gHash(i*17+2)*30,g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba(30,24,20,.35)');g.addColorStop(1,'rgba(30,24,20,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
 return bTexCanvas=cv;
}

// ---------------------------------------------------------------- LEVIATANO K-3 (mare): granchio corazzato
function bLeviatano(c,B,now){
 const walk=B.legT,shell='#2f8f9a',bone='#d8ece8',hot='#ff8a3d',jump=B.state==='onda'&&B.t<.5?B.t*14:0;
 c.save();c.translate(0,jump);
 // zampe: 3 per lato (le lontane più scure)
 for(const far of [true,false])for(let i=0;i<3;i++){
  const k=far?-.4:0,bx=-46+i*40+(far?8:0),by=-70,sw=Math.sin(walk+i*2.1+(far?Math.PI:0))*10,kx=bx+(i-1)*14+sw,ky=-98,fx=bx+(i-1)*34+sw*1.4,fy=0;
  c.lineCap='round';c.strokeStyle=gShade('#1d4d55',k);c.lineWidth=11;c.beginPath();c.moveTo(bx,by);c.lineTo(kx,ky);c.lineTo(fx,fy-6);c.stroke();
  c.strokeStyle=gShade(bone,k-.15);c.lineWidth=5;c.beginPath();c.moveTo(bx,by);c.lineTo(kx,ky);c.lineTo(fx,fy-6);c.stroke();
  c.fillStyle=gShade('#122e33',k);c.beginPath();c.moveTo(fx-5,fy-10);c.lineTo(fx+5,fy-10);c.lineTo(fx+1,fy);c.closePath();c.fill();
  bGlow(c,kx,ky,2.4,'#5ff5ff',8);
 }
 // chela posteriore
 c.save();c.translate(-78,-78);c.rotate(-.5+Math.sin(now*2)*.08);bEllipse(c,-20,0,26,15,bMetal(c,-40,-15,-40,15,shell,-.2),'#9fd8d8');c.fillStyle=gShade(bone,-.2);c.beginPath();c.moveTo(-40,-6);c.lineTo(-62,-16);c.lineTo(-44,2);c.closePath();c.fill();c.beginPath();c.moveTo(-40,6);c.lineTo(-60,14);c.lineTo(-44,-2);c.closePath();c.fill();c.restore();
 // carapace
 bEllipse(c,0,-86,94,46,bMetal(c,0,-132,0,-40,shell),'#bfeeee');
 c.save();c.beginPath();c.ellipse(0,-86,94,46,0,0,6.28);c.clip();
 for(let i=-3;i<=3;i++){c.strokeStyle='rgba(8,30,36,.55)';c.lineWidth=2;c.beginPath();c.moveTo(i*26,-132);c.quadraticCurveTo(i*30,-90,i*22,-40);c.stroke()}
 c.fillStyle=bGrad(c,0,-132,0,-100,['rgba(230,255,255,.45)','rgba(230,255,255,0)']);c.fillRect(-94,-132,188,34);
 c.fillStyle=hot;for(let i=-2;i<=2;i++)c.fillRect(i*30-8,-62,16,4);
 for(let i=0;i<9;i++){const x=-70+gHash(i*5)*140,y=-120+gHash(i*5+1)*56;bEllipse(c,x,y,4+gHash(i)*4,3,'rgba(220,210,190,.6)')}
 c.restore();
 bRivets(c,[[-80,-92],[-60,-118],[-30,-128],[0,-131],[30,-128],[60,-118],[80,-92]]);
 // pod sul dorso
 bPod(c,-58,-140,3,B.state==='missili',shell);
 // occhi sui peduncoli
 for(const [x,h] of [[40,-150],[58,-142]]){c.strokeStyle=gShade(bone,-.2);c.lineWidth=4;c.beginPath();c.moveTo(x-6,-120);c.lineTo(x,h);c.stroke();bEllipse(c,x,h,7,6,'#10161e');bGlow(c,x+2,h,3.4,B.state==='carica'&&B.t<.8&&Math.floor(now*16)%2?'#ffffff':'#ff3c4c',12)}
 // chela-cannone (segue la mira)
 c.save();c.translate(62,-92);c.rotate(bArmAngle(B));
 bEllipse(c,0,0,15,15,bMetal(c,-15,-15,15,15,shell),'#bfeeee');
 bPlate(c,[[6,-12],[36,-16],[46,-4],[46,4],[36,16],[6,12]],bMetal(c,6,-16,6,16,shell,.05),'#bfeeee','rgba(255,255,255,.4)');
 const open=B.state==='raffica'?.35:.15+Math.sin(now*3)*.05;
 c.fillStyle=gShade(bone,-.1);c.save();c.translate(40,-6);c.rotate(-open);c.beginPath();c.moveTo(0,-4);c.lineTo(30,-8);c.lineTo(36,0);c.lineTo(4,4);c.closePath();c.fill();c.restore();
 c.save();c.translate(40,6);c.rotate(open);c.beginPath();c.moveTo(0,4);c.lineTo(30,8);c.lineTo(36,0);c.lineTo(4,-4);c.closePath();c.fill();c.restore();
 c.fillStyle='#0a1418';c.fillRect(40,-3,12,6);if(B.state==='raffica')bGlow(c,52,0,4+Math.min(1,B.t/.45)*3,'#7ff6ff',18);
 c.restore();
 c.restore();
}

// ---------------------------------------------------------------- SCORPIONE S-5 (deserto): coda a pungiglione laser
function bScorpione(c,B,now){
 const walk=B.legT,sand='#8a6a48',dark='#3a2614',plate='#e8c48a';
 // 4 zampe per lato
 for(const far of [true,false])for(let i=0;i<4;i++){
  const k=far?-.45:0,bx=-60+i*36,by=-52,sw=Math.sin(walk*1.4+i*1.6+(far?1.3:0))*9,kx=bx+(i-1.5)*18+sw,ky=-82,fx=bx+(i-1.5)*40+sw*1.5;
  c.lineCap='round';c.strokeStyle=gShade(dark,k);c.lineWidth=7;c.beginPath();c.moveTo(bx,by);c.lineTo(kx,ky);c.lineTo(fx,-2);c.stroke();
  c.strokeStyle=gShade(plate,k-.1);c.lineWidth=3;c.beginPath();c.moveTo(bx,by);c.lineTo(kx,ky);c.stroke();
 }
 // corpo segmentato
 for(let i=0;i<5;i++){const x=-70+i*32,w=26-Math.abs(i-2)*2;bEllipse(c,x,-56,w+6,22-Math.abs(i-2.5)*1.5,bMetal(c,x,-80,x,-34,sand,i===4?.05:0),'#f0d8a8')}
 c.fillStyle='#2a1a0a';for(let i=0;i<4;i++)c.fillRect(-56+i*32,-66,4,20);
 // chele anteriori
 for(const [y,k] of [[-40,-.35],[-52,0]]){c.save();c.translate(80,y);c.rotate(-.15+Math.sin(now*3+y)*.08);bPlate(c,[[0,-6],[30,-10],[34,6],[0,8]],bMetal(c,0,-10,0,8,sand,k),'#f0d8a8');c.fillStyle=gShade(plate,k);c.beginPath();c.moveTo(30,-12);c.lineTo(54,-16);c.lineTo(36,-2);c.closePath();c.fill();c.beginPath();c.moveTo(30,8);c.lineTo(52,12);c.lineTo(36,0);c.closePath();c.fill();c.restore()}
 // testa e occhi
 bEllipse(c,74,-62,20,15,bMetal(c,74,-77,74,-47,sand,.05),'#f0d8a8');for(let i=0;i<3;i++)bGlow(c,78+i*5,-68+i*1.5,2.2,'#ff3c4c',10);
 bPod(c,-70,-112,3,B.state==='missili',sand);
 // coda: segmenti ad arco che arrivano al pungiglione (perno a 30,-212)
 const sx=30,sy=-212,pts=[],P0=[-84,-64],P1=[-175,-250],P2=[sx-10,sy+4];for(let i=0;i<=8;i++){const t=i/8,u=1-t;pts.push([u*u*P0[0]+2*u*t*P1[0]+t*t*P2[0],u*u*P0[1]+2*u*t*P1[1]+t*t*P2[1]])}
 for(let i=0;i<pts.length;i++){const [x,y]=pts[i],r=16-i*1.1;bEllipse(c,x,y,r+2,r,bMetal(c,x,y-r,x,y+r,sand,-.05*(i%2)),'#f0d8a8');if(i%2===0)bGlow(c,x,y-r*.3,1.6,'#ffb05a',6)}
 c.save();c.translate(sx,sy);c.rotate(bArmAngle(B));
 bPlate(c,[[-10,-10],[22,-7],[40,0],[22,7],[-10,10]],bMetal(c,-10,-10,-10,10,'#7a5a30',.1),'#ffe0a8','rgba(255,255,255,.4)');
 const h=B.state==='raffica'?Math.min(1,B.t/.45):.3+.2*Math.sin(now*5);bGlow(c,40,0,3+h*4,'#ff4a3a',10+h*14);
 c.restore();
}

// ---------------------------------------------------------------- NEMBO Z-1 (tempesta): sentinella volante elettrica
function bNembo(c,B,now){
 const bob=-18-Math.sin(now*2.4)*7,violet='#6a58c8',core='#bfe8ff';
 // getti dei propulsori fino al suolo
 c.save();c.globalCompositeOperation='lighter';for(const x of [-30,0,30]){const l=-bob-60+Math.random()*8;c.fillStyle=bGrad(c,0,bob-60,0,bob-60+l,['rgba(160,220,255,.7)','rgba(110,160,255,.25)','rgba(110,160,255,0)']);c.beginPath();c.moveTo(x-8,bob-62);c.lineTo(x+8,bob-62);c.lineTo(x+3,bob-62+l);c.lineTo(x-3,bob-62+l);c.closePath();c.fill()}c.restore();
 c.save();c.translate(0,bob);
 // anello rotante dietro
 const rot=now*1.6;c.strokeStyle='rgba(180,170,255,.55)';c.lineWidth=5;c.beginPath();c.ellipse(0,-120,86,22,-.2,Math.PI,Math.PI*2);c.stroke();
 // sfera principale
 const g=c.createRadialGradient(-18,-140,6,0,-120,62);g.addColorStop(0,gShade(violet,.45));g.addColorStop(.55,violet);g.addColorStop(1,gShade(violet,-.65));bEllipse(c,0,-120,58,58,g,'#cfc6ff');
 c.save();c.beginPath();c.arc(0,-120,58,0,6.28);c.clip();
 c.fillStyle=bGrad(c,0,-128,0,-112,['#2a2050','#8f80e8','#2a2050']);c.fillRect(-60,-128,120,16);
 for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,x=Math.cos(a)*52;if(Math.sin(a)<0)continue;bGlow(c,x,-120,2.6,'#9ff0ff',8)}
 c.strokeStyle='rgba(20,10,40,.6)';c.lineWidth=1.5;for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(i*22,-120,8,58,0,0,6.28);c.stroke()}
 c.restore();
 // occhio-nucleo
 const pulse=.6+.4*Math.sin(now*6),cr=14+pulse*3+(B.state==='stordito'?5:0);bEllipse(c,22,-122,cr+5,cr+5,'#10102a');const cg=c.createRadialGradient(22,-122,1,22,-122,cr);cg.addColorStop(0,'#ffffff');cg.addColorStop(.4,core);cg.addColorStop(1,'#3a4aff');c.save();c.shadowBlur=24;c.shadowColor='#7fb0ff';bEllipse(c,22,-122,cr,cr,cg);c.restore();
 // bobine di Tesla e archi elettrici
 for(const x of [-28,26]){bPlate(c,[[x-5,-172],[x+5,-172],[x+3,-204],[x-3,-204]],bMetal(c,x-5,-200,x+5,-200,'#8a8fa8'),'#e0e4ff');for(let k=0;k<4;k++){c.fillStyle='#c48a3a';c.fillRect(x-6,-196+k*6,12,2.5)}bGlow(c,x,-208,5,'#bfe8ff',16)}
 c.save();c.strokeStyle='rgba(200,240,255,.9)';c.lineWidth=1.6;c.shadowBlur=10;c.shadowColor='#9fdcff';for(let a=0;a<2;a++){c.beginPath();c.moveTo(-28,-208);for(let i=1;i<6;i++)c.lineTo(-28+i*54/6,-208+(Math.random()-.5)*16);c.lineTo(26,-208);c.stroke()}c.restore();
 bPod(c,-22,-232+16,2,B.state==='missili','#5a5a80');
 // anello rotante davanti
 c.strokeStyle='rgba(200,190,255,.8)';c.lineWidth=5;c.beginPath();c.ellipse(0,-120,86,22,-.2,0,Math.PI);c.stroke();
 for(let i=0;i<6;i++){const a=rot+i*1.047;if(Math.sin(a)<0)continue;bGlow(c,Math.cos(a)*86*Math.cos(-.2),-120+Math.sin(a)*22,3,'#ffe08a',8)}
 // emettitore (segue la mira)
 c.save();c.translate(40,-150-bob);c.translate(0,bob);c.rotate(bArmAngle(B));
 bPlate(c,[[0,-9],[34,-7],[44,-14],[48,0],[44,14],[34,7],[0,9]],bMetal(c,0,-14,0,14,'#7a7aa8'),'#e0e4ff','rgba(255,255,255,.4)');
 const h=B.state==='raffica'?Math.min(1,B.t/.45):.25;bGlow(c,50,0,3+h*5,'#bfe8ff',12+h*16);
 c.restore();
 c.restore();
}

// ---------------------------------------------------------------- GOLIA V-4 (foresta): colosso coperto di muschio
function bGolia(c,B,now){
 const walk=B.legT,hull='#4f5a3a',moss='#5f9a3a',bark='#5a3e26',jump=B.state==='onda'&&B.t<.5?B.t*18:0;
 c.save();c.translate(0,jump);
 // gambe corte e massicce
 for(const side of [-1,1]){const k=side<0?-.4:0,sw=Math.sin(walk+(side<0?Math.PI:0))*10,x=side*24+sw;
  bPlate(c,[[x-18,-96],[x+18,-96],[x+16,-40],[x-14,-40]],bMetal(c,x-18,-96,x+18,-40,hull,k),gShade('#a8b890',k));
  bPlate(c,[[x-22,-42],[x+20,-42],[x+30,0],[x-26,0]],bMetal(c,x,-42,x,0,'#3a4430',k),gShade('#a8b890',k));
  c.fillStyle=gShade('#ffb05a',k-.2);c.fillRect(x-14,-34,24,3);}
 // braccio posteriore che tocca terra (nocche)
 c.save();c.translate(-50,-166);c.rotate(.35+Math.sin(walk)*.08);bPlate(c,[[-14,-8],[16,-10],[12,96],[-12,98]],bMetal(c,-14,0,16,0,hull,-.35),'#7a8a60');bEllipse(c,0,108,22,16,bMetal(c,-20,92,20,124,'#3a4430',-.3),'#7a8a60');c.restore();
 // torso ingobbito
 const torso=[[-70,-200],[30,-214],[70,-176],[62,-110],[-60,-96],[-80,-150]];
 bPlate(c,torso,bMetal(c,-70,-214,62,-96,hull),'#b8c8a0');
 bPlate(c,[[-58,-192],[24,-204],[54,-172],[-62,-160]],bMetal(c,-58,-204,54,-160,hull,.08),'rgba(0,0,0,.5)','rgba(230,245,210,.45)');
 // corteccia e muschio sulla schiena e sulle spalle
 c.save();bPlate(c,torso,'rgba(0,0,0,0)');c.clip();
 for(let i=0;i<14;i++){const x=-76+gHash(i*9)*130,y=-214+gHash(i*9+1)*30;bEllipse(c,x,y,10+gHash(i)*12,6+gHash(i+3)*5,i%3?moss:gShade(moss,.25))}
 c.strokeStyle=gShade(bark,-.2);c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-60+i*22,-150);c.quadraticCurveTo(-55+i*22,-128,-62+i*22,-104);c.stroke()}
 c.restore();
 // liane che pendono
 c.strokeStyle='#3f7a2a';c.lineWidth=2;for(const [x,l] of [[-50,40],[-20,58],[10,34],[44,48]]){c.beginPath();c.moveTo(x,-110);c.quadraticCurveTo(x+Math.sin(now*2+x)*6,-110+l*.6,x+3,-110+l);c.stroke();bEllipse(c,x+3,-110+l,3,2,'#6fbf4a')}
 // pod di mortai
 bPod(c,-56,-232,3,B.state==='missili',hull);
 // nucleo verde
 const pulse=.6+.4*Math.sin(now*(B.state==='stordito'?16:4)),cr=11+pulse*3;bEllipse(c,4,-146,cr+6,cr+6,'#10160e');const cg=c.createRadialGradient(4,-146,1,4,-146,cr);cg.addColorStop(0,'#ffffff');cg.addColorStop(.35,'#c8ff9a');cg.addColorStop(1,'#2a7a10');c.save();c.shadowBlur=22;c.shadowColor='#8aff5a';bEllipse(c,4,-146,cr,cr,cg);c.restore();
 // testa bassa in avanti
 bPlate(c,[[30,-196],[72,-190],[80,-172],[70,-162],[34,-164]],bMetal(c,30,-196,80,-162,hull,.05),'#b8c8a0','rgba(240,255,220,.4)');
 c.fillStyle='#05090f';c.fillRect(46,-186,30,8);c.save();c.shadowBlur=14;c.shadowColor='#8aff5a';c.fillStyle=B.state==='carica'&&B.t<.8&&Math.floor(now*16)%2?'#ffffff':'#8aff5a';c.fillRect(48,-184,26,3.5);c.restore();
 // braccio-cannone anteriore (pugno con cannone)
 c.save();c.translate(40,-150);c.rotate(bArmAngle(B));
 bEllipse(c,0,0,20,20,bMetal(c,-20,-20,20,20,hull),'#b8c8a0');
 bPlate(c,[[10,-15],[52,-16],[58,-20],[74,-12],[74,12],[58,20],[52,16],[10,15]],bMetal(c,10,-20,10,20,'#3a4430',.08),'#b8c8a0','rgba(240,255,220,.4)');
 c.fillStyle='#0a0f08';c.beginPath();c.arc(74,0,8,0,6.28);c.fill();
 const h=B.state==='raffica'?Math.min(1,B.t/.45):0;if(h>0)bGlow(c,76,0,4+h*6,'#c8ff6a',20*h);
 bEllipse(c,30,-14,9,4,moss);
 c.restore();
 c.restore();
}

// ---------------------------------------------------------------- TITANO R-9 (lava)
function bTitano(c,B,now){
 const charging=B.state==='carica'&&B.t<.8,stunned=B.state==='stordito',dying=B.state==='distrutto',dmg=1-Math.max(0,B.hp)/B.max;
 c.save();
 if(B.state==='onda'&&B.t<.5)c.translate(0,B.t*16);
 c.scale(1.2,1.2);
 const steel=(x0,y0,x1,y1,k=0)=>{const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,gShade('#55697d',.15+k));g.addColorStop(.45,gShade('#34465a',k));g.addColorStop(1,gShade('#141c26',k));return g};
 const walk=B.legT;
 // gamba lontana poi gamba vicina
 for(const side of [-1,1]){
  const far=side<0,k=far?-.35:0,hx=side*18,sw=Math.sin(walk+(far?Math.PI:0))*12,kx=hx+16+sw*.4,ky=-56,ax=hx-4+sw,ay=-14;
  c.fillStyle=gShade('#2a3644',k);c.beginPath();c.arc(hx,-96,13,0,6.28);c.fill();
  bPlate(c,[[hx-10,-104],[hx+12,-100],[kx+9,ky-4],[kx-6,ky+4]],steel(hx-10,-104,kx+9,ky,k),gShade('#8b9ba9',k-.1),'rgba(200,220,240,.3)');
  // pistone idraulico
  c.strokeStyle=gShade('#c9d6e2',k);c.lineWidth=3;c.beginPath();c.moveTo(hx-8,-90);c.lineTo((hx-8+ax)/2,(-90+ay)/2);c.stroke();c.strokeStyle=gShade('#2b3846',k);c.lineWidth=6;c.beginPath();c.moveTo((hx-8+ax)/2,(-90+ay)/2);c.lineTo(ax-4,ay-6);c.stroke();
  bPlate(c,[[kx-7,ky-3],[kx+8,ky],[ax+7,ay],[ax-8,ay-3]],steel(kx,ky,ax,ay,k-.05),gShade('#8b9ba9',k-.1));
  c.fillStyle=gShade('#1d2733',k);c.beginPath();c.arc(kx,ky,7,0,6.28);c.fill();c.fillStyle='#ff3c4c';c.shadowBlur=10;c.shadowColor='#ff3c4c';c.beginPath();c.arc(kx,ky,2.8,0,6.28);c.fill();c.shadowBlur=0;
  c.fillStyle=gShade('#1d2733',k);c.beginPath();c.arc(ax,ay,5,0,6.28);c.fill();
  bPlate(c,[[ax-30,0],[ax-22,-14],[ax+14,-15],[ax+30,-5],[ax+38,0]],steel(ax,-15,ax,0,k-.1),gShade('#64798d',k));
  c.fillStyle=gShade('#0f151d',k);for(const tx of [ax+26,ax+36])c.fillRect(tx,-3,7,3);
  c.fillStyle=gShade('#ff9d3d',k-.2);c.fillRect(ax-18,-12,22,2);
 }
 // bacino
 bPlate(c,[[-36,-110],[36,-110],[30,-86],[-30,-86]],steel(0,-110,0,-86),'#8b9ba9');
 c.save();c.beginPath();c.rect(-30,-104,60,10);c.clip();c.fillStyle='#ff9d3d';for(let i=-4;i<6;i++){c.beginPath();c.moveTo(i*12,-94);c.lineTo(i*12+6,-104);c.lineTo(i*12+12,-104);c.lineTo(i*12+6,-94);c.fill()}c.restore();
 // spalla e braccio posteriori
 c.fillStyle=gShade('#2a3644',-.35);c.beginPath();c.ellipse(-34,-168,18,22,0,0,6.28);c.fill();
 // pod missilistico
 const pod=B.state==='missili';bPlate(c,[[-60,-218],[-14,-222],[-12,-186],[-58,-184]],steel(-60,-222,-12,-184),'#8b9ba9','rgba(200,220,240,.35)');
 for(let r=0;r<2;r++)for(let q=0;q<3;q++){const x=-50+q*13,y=-212+r*13;c.fillStyle='#05090f';c.beginPath();c.arc(x,y,4.4,0,6.28);c.fill();c.fillStyle=pod?'#ffb05a':'#3a1a1a';if(pod){c.shadowBlur=8;c.shadowColor='#ff9d3d'}c.beginPath();c.arc(x,y,2.2,0,6.28);c.fill();c.shadowBlur=0}
 // busto principale a piastre
 const torso=[[-52,-188],[38,-198],[62,-154],[50,-104],[-44,-100],[-58,-144]];
 bPlate(c,torso,steel(-52,-198,50,-100),'#9fb2c4');
 bPlate(c,[[-40,-182],[30,-190],[48,-156],[-46,-148]],steel(-40,-190,48,-148,.08),'rgba(0,0,0,.5)','rgba(220,235,250,.45)');
 bPlate(c,[[-46,-142],[50,-150],[44,-112],[-40,-108]],steel(-46,-150,44,-108,-.05),'rgba(0,0,0,.5)');
 // prese d'aria
 c.fillStyle='#0a0f15';for(let i=0;i<4;i++)c.fillRect(-36,-138+i*7,22,3.2);
 const heat=.4+.4*Math.sin(now*3)+(stunned?.5:0);c.fillStyle=`rgba(255,110,40,${Math.min(1,heat)*.6})`;for(let i=0;i<4;i++)c.fillRect(-35,-137+i*7,20,1.4);
 bRivets(c,[[-46,-178],[-30,-184],[-10,-187],[10,-189],[26,-190],[44,-160],[46,-130],[-50,-140],[-40,-114],[30,-112]]);
 c.fillStyle='rgba(230,240,250,.55)';c.font='700 9px "Chakra Petch",sans-serif';c.textAlign='center';c.save();c.translate(32,-118);c.scale(B.face,1);c.fillText('R-9',0,0);c.restore();
 c.fillStyle='#ff5268';c.beginPath();c.moveTo(-28,-176);c.lineTo(-18,-160);c.lineTo(-38,-160);c.closePath();c.fill();c.strokeStyle='#2a0a10';c.lineWidth=1;c.stroke();
 // nucleo del reattore
 const pulse=.6+.4*Math.sin(now*(stunned?16:5)),cr=(stunned?17:13)*(.92+pulse*.12),cx=10,cy=-148;
 c.fillStyle='#10161e';c.beginPath();c.arc(cx,cy,cr+6,0,6.28);c.fill();
 const ring=c.createLinearGradient(cx-cr,cy-cr,cx+cr,cy+cr);ring.addColorStop(0,'#c9d6e2');ring.addColorStop(1,'#2b3846');c.strokeStyle=ring;c.lineWidth=3.5;c.beginPath();c.arc(cx,cy,cr+3,0,6.28);c.stroke();
 const core=c.createRadialGradient(cx,cy,1,cx,cy,cr);core.addColorStop(0,'#ffffff');core.addColorStop(.3,stunned?'#ffe0a0':'#ffb0b8');core.addColorStop(.7,'#ff3c4c');core.addColorStop(1,'#5a0a14');c.fillStyle=core;c.shadowBlur=24;c.shadowColor='#ff3c4c';c.beginPath();c.arc(cx,cy,cr,0,6.28);c.fill();c.shadowBlur=0;
 c.save();c.translate(cx,cy);c.rotate(now*(stunned?6:2));c.strokeStyle='rgba(60,10,16,.55)';c.lineWidth=2;for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(cr*.35,0);c.lineTo(cr*.95,cr*.2);c.stroke()}c.restore();
 c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,120,130,${.25+pulse*.25})`;c.fillRect(cx-cr*3.2,cy-1,cr*6.4,2);c.restore();
 // testa
 bPlate(c,[[12,-218],[52,-214],[60,-196],[54,-188],[16,-186]],steel(12,-218,60,-186,.05),'#9fb2c4','rgba(220,235,250,.4)');
 c.fillStyle='#05090f';c.fillRect(26,-209,30,9);
 const eye=charging?(Math.floor(now*16)%2?'#ffffff':'#ff3c4c'):'#ff3c4c';c.fillStyle=eye;c.shadowBlur=16;c.shadowColor='#ff3c4c';c.fillRect(28,-206,26,3.5);c.shadowBlur=0;
 for(let i=0;i<3;i++){c.fillStyle=Math.sin(now*6+i)>0?'#ffb348':'#4a2a10';c.beginPath();c.arc(22+i*6,-194,1.4,0,6.28);c.fill()}
 c.strokeStyle='#8b9ba9';c.lineWidth=2;c.beginPath();c.moveTo(18,-217);c.lineTo(10,-234);c.moveTo(24,-217);c.lineTo(22,-228);c.stroke();c.fillStyle=Math.sin(now*4)>0?'#ff3c4c':'#5a1018';c.beginPath();c.arc(10,-235,2,0,6.28);c.fill();
 // braccio cannone (gatling a 4 canne)
 let la=B.face>0?B.aim:Math.PI-B.aim;la=Math.atan2(Math.sin(la),Math.cos(la));
 c.save();c.translate(30,-150);c.rotate(la);
 const sh=c.createRadialGradient(-4,-6,2,0,0,18);sh.addColorStop(0,'#8ea2b6');sh.addColorStop(1,'#1d2733');c.fillStyle=sh;c.beginPath();c.arc(0,0,17,0,6.28);c.fill();c.strokeStyle='#9fb2c4';c.lineWidth=1.2;c.stroke();
 bPlate(c,[[8,-13],[54,-12],[56,12],[8,13]],steel(8,-13,8,13,.05),'#9fb2c4','rgba(220,235,250,.4)');
 c.fillStyle='#ff9d3d';c.fillRect(14,-12,4,24);c.fillRect(22,-12,4,24);
 c.strokeStyle='#5a4a20';c.lineWidth=2;c.beginPath();for(let i=0;i<6;i++){c.moveTo(30+i*4,12);c.lineTo(30+i*4,18)}c.stroke();
 const spin=B.state==='raffica'?now*30:now*.6;
 c.fillStyle='#10161e';c.fillRect(54,-10,8,20);
 for(let i=0;i<4;i++){const ph=spin+i*Math.PI/2,yy=Math.sin(ph)*6,depth=Math.cos(ph);if(depth<0)continue;const g2=c.createLinearGradient(0,yy-2.5,0,yy+2.5);g2.addColorStop(0,'#c9d6e2');g2.addColorStop(1,'#2b3846');c.fillStyle=g2;c.fillRect(60,yy-2.4,26,4.8)}
 c.fillStyle='#2b3846';c.fillRect(70,-9,4,18);c.fillRect(82,-8,4,16);
 const hcol=B.state==='raffica'?Math.min(1,B.t/.45):0;if(hcol>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,82,104,${.4+hcol*.6})`;c.shadowBlur=20*hcol;c.shadowColor='#ff5268';c.beginPath();c.arc(88,0,4+hcol*5,0,6.28);c.fill();c.restore()}
 c.restore();
 c.restore();
}

const BOSS_DRAW={mare:bLeviatano,deserto:bScorpione,tempesta:bNembo,foresta:bGolia,lava:bTitano};

function bDrawBody(c,B,now){
 const charging=B.state==='carica'&&B.t<.8,stunned=B.state==='stordito',dying=B.state==='distrutto';
 c.save();c.scale(B.face,1);
 if(stunned)c.rotate(.06*Math.sin(now*20));
 if(dying)c.translate((Math.random()-.5)*4,(Math.random()-.5)*3);
 (BOSS_DRAW[B.kind]||bTitano)(c,B,now);
 c.restore();
}
// Bruciature dei danni nelle stesse posizioni (in coordinate del robot), da 0 a 5 secondo i danni.
const B_SCORCH=[[-20,-120,16],[30,-170,12],[-40,-150,14],[40,-110,11],[0,-80,13],[-55,-100,10]];

gBoss=function(B,now){
 const I=typeof pfBossInfo==='function'?pfBossInfo(pf.p):{w:120};
 gShadow(B.x,B.y+1,Math.max(105,I.w*.62),.55);
 const dmg=1-Math.max(0,B.hp)/B.max,T=ctx.getTransform?ctx.getTransform():null,tex=bTexture();
 const L=-270,R=270,TOP=-330,BOT=40;
 let k=T?Math.hypot(T.a,T.b):1;k=Math.min(k,2.4);
 const cw=Math.ceil((R-L)*k),ch=Math.ceil((BOT-TOP)*k);
 if(!tex||!T){ctx.save();ctx.translate(B.x,B.y);bDrawBody(ctx,B,now);ctx.restore();return}
 if(!bLayer||bLayer.c.width<cw||bLayer.c.height<ch)bLayer=gCanvas(Math.max(cw,bLayer?bLayer.c.width:0),Math.max(ch,bLayer?bLayer.c.height:0));
 if(!bLayer){ctx.save();ctx.translate(B.x,B.y);bDrawBody(ctx,B,now);ctx.restore();return}
 const c=bLayer.g;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,bLayer.c.width,bLayer.c.height);
 c.setTransform(k,0,0,k,-L*k,-TOP*k);
 bDrawBody(c,B,now);
 // effetti che seguono la sagoma: texture, luce dall'alto, bruciature, colpo, carica
 c.save();c.globalCompositeOperation='source-atop';
 c.globalAlpha=.32;c.fillStyle=c.createPattern(tex,'repeat');c.fillRect(L,TOP,R-L,BOT-TOP);c.globalAlpha=1;
 c.fillStyle=bGrad(c,0,TOP+60,0,BOT,['rgba(255,240,220,.16)','rgba(0,0,0,0)','rgba(0,0,0,.28)']);c.fillRect(L,TOP,R-L,BOT-TOP);
 if(dmg>.12)for(const [x,y,r] of B_SCORCH.slice(0,Math.ceil(dmg*6))){const sx=x*B.face,g=c.createRadialGradient(sx,y,1,sx,y,r*1.6);g.addColorStop(0,'rgba(12,8,6,.75)');g.addColorStop(.5,'rgba(40,20,10,.35)');g.addColorStop(1,'rgba(12,8,6,0)');c.fillStyle=g;c.fillRect(sx-r*1.6,y-r*1.6,r*3.2,r*3.2)}
 if(B.state==='carica'&&B.t<.8){c.fillStyle=`rgba(255,60,76,${.15+.12*Math.sin(now*30)})`;c.fillRect(L,TOP,R-L,BOT-TOP)}
 if(B.hit>0){c.fillStyle='rgba(255,255,255,.45)';c.fillRect(L,TOP,R-L,BOT-TOP)}
 c.restore();
 // contorno scuro e più contrasto: il robot si stacca dallo sfondo
 // il filtro si applica su una tela piccola grande quanto il robot: sulla tela principale Chrome lo calcolava su tutto lo schermo a ogni fotogramma
 let src=bLayer.c;
 if('filter' in c){if(!bFxLayer||bFxLayer.c.width!==bLayer.c.width||bFxLayer.c.height!==bLayer.c.height)bFxLayer=gCanvas(bLayer.c.width,bLayer.c.height);
  if(bFxLayer){const f=bFxLayer.g;f.setTransform(1,0,0,1,0,0);f.clearRect(0,0,cw,ch);f.filter='drop-shadow(0px 0px 1.5px rgba(0,0,0,.95)) contrast(1.18) saturate(1.2) brightness(1.08)';f.drawImage(bLayer.c,0,0,cw,ch,0,0,cw,ch);f.filter='none';src=bFxLayer.c}}
 ctx.drawImage(src,0,0,cw,ch,B.x+L,B.y+TOP,cw/k,ch/k);
 // fumo e scintille dai punti danneggiati
 const dying=B.state==='distrutto';
 if(!dying&&dmg>.3&&Math.random()<dmg*.5){const p=B_SCORCH[Math.floor(Math.random()*Math.min(B_SCORCH.length,Math.ceil(dmg*6)))],wx=B.x+p[0]*B.face,wy=B.y+p[1];pf.fx.push({x:wx,y:wy,vx:(Math.random()-.5)*20,vy:-30-Math.random()*30,life:1.2,max:1.2,color:'rgba(60,60,66,.6)',r:5+Math.random()*6,soft:true});if(Math.random()<.3)pfBurst(wx,wy,'#ffd29a',2,.5)}
 if(B.state==='stordito'&&Math.random()<.3)pfBurst(B.x+(Math.random()-.5)*80,B.y-120-Math.random()*60,'#ffe0a0',2,.5);
};
