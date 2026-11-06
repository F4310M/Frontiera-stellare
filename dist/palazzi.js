// Conex — PALAZZI DELLA COLONIA in lontananza (missione a terra).
// Prima erano sagome scure piatte disegnate a ogni fotogramma. Ora ogni palazzo è dipinto una volta sola
// in un'immagine ad alta risoluzione (facciate in luce e in ombra, piani, finestre accese, vetrate,
// antenne, foschia) e poi solo copiato. Dietro c'è anche uno skyline lontano, sfumato nella nebbia.
// Regola PC: niente shadowBlur o ctx.filter a ogni fotogramma; le luci che lampeggiano sono piccole
// immagini copiate in modalità "lighter".
// Caricare dopo grafica2.js (usa gCanvas, gMix, gHex, gRgb, gMat, gRes).

const plzOrig={pfDrawColony};
let plz=null;
const PLZ_BASE=588,PLZ_FAR_W=2048,PLZ_FAR_PAR=.30/.45;

function plzReady(){
 if(typeof pf==='undefined'||!pf||!pf.deco||!pf.p||typeof gCanvas!=='function')return false;
 const res=typeof gRes==='function'?gRes():1;
 if(plz&&plz.pf===pf&&Math.abs(plz.res-res)<.3)return plz.ok;
 plz={pf,res,ok:false,sprites:new Map(),far:null,beacon:null,pal:null};
 try{
  if(!gCanvas(4,4))return false;
  plz.pal=plzPalette();
  plz.beacon=plzGlowSprite();
  for(const b of pf.deco.buildings)plz.sprites.set(b,plzBuilding(b));
  plz.far=plzSkyline();
  plz.ok=true;
 }catch(err){console.warn('palazzi non disponibili',err);plz.ok=false}
 return plz.ok;
}

function plzPalette(){
 const th=pf.theme||pfTheme(pf.p),m=gMat(),sky=gHex(th.sky[2]),near=gHex(th.near),haze=gHex(th.haze);
 const glow=gHex(/^#[0-9a-f]{6}$/i.test(pf.p.glow||'')?pf.p.glow:'#51e6ff');
 const base=gMix(gMix(near,[12,20,30],.55),sky,.14);
 return{th,m,sky,haze,glow,base,
  lit:gMix(gMix(base,m.sun,.30),[255,255,255],.05),
  dark:gMix(base,[0,0,0],.55),
  deep:gMix(base,[0,0,0],.78),
  sunLeft:m.sunPos[0]<.5,
  warm:[255,208,140],cool:[150,230,255]};
}

// piccola luce rotonda (per i fari rossi delle antenne)
function plzGlowSprite(){
 const cv=gCanvas(32,32),g=cv.g,r=g.createRadialGradient(16,16,0,16,16,16);
 r.addColorStop(0,'rgba(255,235,235,1)');r.addColorStop(.18,'rgba(255,90,100,.9)');r.addColorStop(.5,'rgba(255,60,80,.25)');r.addColorStop(1,'rgba(255,40,60,0)');
 g.fillStyle=r;g.fillRect(0,0,32,32);return cv.c;
}

// ---------------------------------------------------------------- un palazzo
// Restituisce {c,ox,oy,w,h,beacons:[[x,y]...]}: l'immagine va copiata con il piede del palazzo in (x, PLZ_BASE).
function plzBuilding(b){
 const P=plz.pal,rnd=pfRng(b.seed+1),res=plz.res,M=30;
 const r=b.w/2,top=b.kind==='cupola'?r+40:b.kind==='torre'?b.h+48:b.h+40,below=22;
 const w=b.w+M*2,h=top+below;
 const cv=gCanvas(w*res,h*res),g=cv.g;g.scale(res,res);g.translate(M,top);
 const out={c:cv.c,ox:M,oy:top,w,h,beacons:[]};
 if(b.kind==='torre')plzTower(g,b,rnd,out);
 else if(b.kind==='cupola')plzDome(g,b,rnd,out);
 else plzHangar(g,b,rnd,out);
 // foschia della distanza: tutto un po' velato dal colore del cielo, più fitta in basso
 g.globalCompositeOperation='source-atop';
 const f=g.createLinearGradient(0,-top,0,below);
 f.addColorStop(0,gRgb(P.sky,.12));f.addColorStop(.75,gRgb(P.haze,.22));f.addColorStop(1,gRgb(P.haze,.42));
 g.fillStyle=f;g.fillRect(-M,-top,w,h);
 g.globalCompositeOperation='source-over';
 return out;
}

// facciata con luce laterale: dal lato del sole più chiara, dall'altro in ombra
function plzFacade(g,x,y,w,h){
 const P=plz.pal,gr=g.createLinearGradient(x,0,x+w,0),a=P.sunLeft?0:1;
 gr.addColorStop(a,gRgb(P.lit));gr.addColorStop(.42,gRgb(P.base));gr.addColorStop(1-a,gRgb(P.dark));
 g.fillStyle=gr;g.fillRect(x,y,w,h);
 // un po' più scuro alla base, più chiaro in cima (luce del cielo)
 const v=g.createLinearGradient(0,y,0,y+h);v.addColorStop(0,'rgba(255,255,255,.06)');v.addColorStop(1,'rgba(0,0,0,.28)');
 g.fillStyle=v;g.fillRect(x,y,w,h);
 // spigolo illuminato
 g.fillStyle=gRgb(gMix(P.lit,[255,255,255],.25),.55);g.fillRect(P.sunLeft?x:x+w-1,y,1,h);
 g.fillStyle=gRgb(P.deep,.7);g.fillRect(P.sunLeft?x+w-.8:x,y,.8,h);
}
// grana e pannelli della facciata
function plzGrain(g,x,y,w,h,rnd,step){
 g.fillStyle='rgba(0,0,0,.22)';
 for(let yy=y+step;yy<y+h-1;yy+=step)g.fillRect(x,yy,w,.6);
 for(let i=0;i<w*h/22;i++){const a=rnd();g.fillStyle=a<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.08)';g.fillRect(x+rnd()*w,y+rnd()*h,1+rnd()*2,.6+rnd())}
}
// finestre: a griglia o a nastro; alcune accese (calde o fredde), le altre riflettono il cielo
function plzWindows(g,x,y,w,h,rnd,style){
 const P=plz.pal,on=.22+rnd()*.25;
 if(style==='nastro'){
  for(let yy=y+5;yy<y+h-6;yy+=8){
   g.fillStyle=gRgb(gMix(P.deep,P.sky,.25),.85);g.fillRect(x+2.5,yy,w-5,2.6);
   for(let xx=x+3;xx<x+w-4;xx+=3+rnd()*6){if(rnd()<on){const c=rnd()<.7?P.warm:P.cool,l=2+rnd()*7;g.fillStyle=gRgb(c,.55+rnd()*.4);g.fillRect(xx,yy+.3,Math.min(l,x+w-3-xx),2)}}
  }
  return;
 }
 const cw=5.2,ch=7.4,cols=Math.max(1,Math.floor((w-4)/cw)),pad=(w-cols*cw)/2;
 for(let yy=y+4;yy<y+h-7;yy+=ch)for(let i=0;i<cols;i++){
  const xx=x+pad+i*cw+1;
  if(rnd()<on){const c=rnd()<.72?P.warm:P.cool;g.fillStyle=gRgb(c,.5+rnd()*.45);g.fillRect(xx,yy,3,3.6);g.fillStyle=gRgb(c,.12);g.fillRect(xx-1,yy-1,5,5.6)}
  else{g.fillStyle=gRgb(gMix(P.deep,P.sky,.3+rnd()*.2),.8);g.fillRect(xx,yy,3,3.6)}
 }
}
// riflesso diagonale sulle vetrate
function plzSheen(g,x,y,w,h){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 const s=g.createLinearGradient(x,y,x+w,y+w*1.4);s.addColorStop(0,'rgba(255,255,255,0)');s.addColorStop(.45,'rgba(255,255,255,.07)');s.addColorStop(.55,'rgba(255,255,255,0)');
 g.fillStyle=s;g.fillRect(x,y,w,h);g.restore();
}
function plzAntenna(g,x,y,len,rnd,out){
 const P=plz.pal;g.strokeStyle=gRgb(gMix(P.base,[200,210,220],.25));g.lineWidth=1.2;
 g.beginPath();g.moveTo(x,y);g.lineTo(x,y-len);g.stroke();
 g.lineWidth=.7;for(let k=1;k<4;k++){const yy=y-len*k/4,s=3.5-k*.8;g.beginPath();g.moveTo(x-s,yy);g.lineTo(x+s,yy);g.stroke()}
 g.fillStyle='#ff4a5a';g.beginPath();g.arc(x,y-len-1,1.4,0,6.28);g.fill();
 out.beacons.push([x,y-len-1]);
}

function plzTower(g,b,rnd,out){
 const P=plz.pal,W=b.w,H=b.h,tiers=H>185?3:2,style=rnd()<.4?'nastro':'griglia';
 const fr=tiers===3?[.55,.3,.15]:[.7,.3],wr=tiers===3?[1,.78,.54]:[1,.7];
 let y=0;
 // basamento più largo (atrio) con luce calda all'ingresso
 g.fillStyle=gRgb(P.dark);g.fillRect(-4,-14,W+8,14);
 g.fillStyle=gRgb(P.warm,.55);g.fillRect(W/2-6,-9,12,9);g.fillStyle=gRgb(P.warm,.16);g.fillRect(W/2-12,-14,24,14);
 g.fillStyle=gRgb(P.lit,.6);g.fillRect(-4,-14,W+8,1);
 y=-14;
 for(let t=0;t<tiers;t++){
  const th=H*fr[t]-(t===0?14:0),tw=W*wr[t],tx=(W-tw)/2,ty=y-th;
  plzFacade(g,tx,ty,tw,th);
  plzGrain(g,tx,ty,tw,th,rnd,7.4);
  plzWindows(g,tx,ty,tw,th,rnd,style);
  plzSheen(g,tx,ty,tw,th);
  // cornicione e attrezzature sul tetto del gradone
  g.fillStyle=gRgb(gMix(P.lit,[255,255,255],.15),.8);g.fillRect(tx-1.5,ty,tw+3,1.6);
  g.fillStyle=gRgb(P.dark);g.fillRect(tx-1.5,ty+1.6,tw+3,1.4);
  if(t<tiers-1){for(let i=0;i<2;i++){const bw=4+rnd()*6,bx=tx+2+rnd()*(tw-bw-4);g.fillStyle=gRgb(P.dark);g.fillRect(bx,ty-3,bw,3);g.fillStyle=gRgb(P.lit,.5);g.fillRect(bx,ty-3,bw,.6)}}
  // striscia luminosa del colore della colonia tra un gradone e l'altro
  if(t>0||rnd()<.5){g.fillStyle=gRgb(P.glow,.55);g.fillRect(tx+1,ty+4,tw-2,.9)}
  y=ty;
 }
 // corona: cupolino o tetto inclinato, poi antenna (e a volte una parabola)
 const tw=W*wr[tiers-1],tx=(W-tw)/2;
 if(rnd()<.5){g.fillStyle=gRgb(P.base);g.beginPath();g.moveTo(tx,y);g.lineTo(W/2,y-tw*.45);g.lineTo(tx+tw,y);g.closePath();g.fill();g.fillStyle=gRgb(P.lit,.5);g.beginPath();g.moveTo(P.sunLeft?tx:tx+tw,y);g.lineTo(W/2,y-tw*.45);g.lineTo(W/2,y);g.closePath();g.fill();y-=tw*.45}
 else{g.fillStyle=gRgb(P.dark);g.fillRect(tx+tw*.2,y-6,tw*.6,6);g.fillStyle=gRgb(P.glow,.5);g.fillRect(tx+tw*.2,y-6,tw*.6,.8);y-=6}
 plzAntenna(g,W/2,y,18+rnd()*16,rnd,out);
 if(rnd()<.55){const dx=P.sunLeft?tx+tw-4:tx+4,dy=y+5;g.strokeStyle=gRgb(gMix(P.base,[220,230,240],.3));g.lineWidth=1;g.beginPath();g.moveTo(dx,dy+4);g.lineTo(dx,dy);g.stroke();g.fillStyle=gRgb(gMix(P.lit,[255,255,255],.2));g.beginPath();g.ellipse(dx,dy-2,4.5,2.4,-.6,0,6.28);g.fill()}
}

function plzDome(g,b,rnd,out){
 const P=plz.pal,r=b.w/2,wall=10,cy=-wall;
 // muro circolare alla base con oblò
 plzFacade(g,0,-wall,b.w,wall);
 for(let x=6;x<b.w-6;x+=8){const lit=rnd()<.5;g.fillStyle=lit?gRgb(P.warm,.7):gRgb(gMix(P.deep,P.sky,.3),.8);g.beginPath();g.arc(x,-wall/2,1.6,0,6.28);g.fill()}
 g.fillStyle=gRgb(P.lit,.6);g.fillRect(0,-wall,b.w,1);
 // calotta di vetro: un po' trasparente, con l'interno illuminato
 g.save();g.beginPath();g.arc(r,cy,r,Math.PI,0);g.closePath();g.clip();
 const sx=P.sunLeft?r*.55:r*1.45,gr=g.createRadialGradient(sx,cy-r*.75,r*.05,r,cy,r*1.15);
 gr.addColorStop(0,gRgb(gMix(P.lit,P.sky,.35)));gr.addColorStop(.55,gRgb(gMix(P.base,P.glow,.18)));gr.addColorStop(1,gRgb(P.deep));
 g.fillStyle=gr;g.fillRect(0,cy-r,b.w,r);
 const inner=g.createRadialGradient(r,cy,0,r,cy,r*.9);inner.addColorStop(0,gRgb(P.warm,.35));inner.addColorStop(1,gRgb(P.warm,0));g.fillStyle=inner;g.fillRect(0,cy-r,b.w,r);
 // sagome degli edifici dentro la cupola
 g.fillStyle=gRgb(P.deep,.55);for(let i=0;i<5;i++){const bw=6+rnd()*12,bx=r*.3+rnd()*r*1.4-bw/2,bh=r*(.15+rnd()*.35);g.fillRect(bx,cy-bh,bw,bh)}
 // pannelli: meridiani e paralleli
 g.strokeStyle=gRgb(gMix(P.lit,[255,255,255],.2),.28);g.lineWidth=.8;
 for(let i=1;i<6;i++){g.beginPath();g.ellipse(r,cy,r*i/6,r,0,Math.PI,0);g.stroke()}
 for(let k=1;k<5;k++){const yy=cy-r*k/5,hw=Math.sqrt(Math.max(0,r*r-(r*k/5)**2));g.beginPath();g.moveTo(r-hw,yy);g.lineTo(r+hw,yy);g.stroke()}
 // alcuni pannelli accesi
 for(let i=0;i<7;i++){const a=Math.PI+rnd()*Math.PI,rr=r*(.35+rnd()*.55);g.fillStyle=gRgb(rnd()<.6?P.warm:P.cool,.25+rnd()*.25);g.fillRect(r+Math.cos(a)*rr-3,cy+Math.sin(a)*rr-2,6,4)}
 // riflesso del sole sul vetro
 g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=2.2;g.beginPath();P.sunLeft?g.arc(r,cy,r*.86,Math.PI*1.12,Math.PI*1.38):g.arc(r,cy,r*.86,Math.PI*1.62,Math.PI*1.88);g.stroke();
 g.restore();
 g.strokeStyle=gRgb(gMix(P.lit,[255,255,255],.1),.6);g.lineWidth=1.2;g.beginPath();g.arc(r,cy,r,Math.PI,0);g.stroke();
 // lanterna in cima con antenna
 g.fillStyle=gRgb(P.dark);g.fillRect(r-5,cy-r-4,10,5);g.fillStyle=gRgb(P.glow,.7);g.fillRect(r-5,cy-r-1.5,10,1);
 plzAntenna(g,r,cy-r-4,12+rnd()*10,rnd,out);
}

function plzHangar(g,b,rnd,out){
 const P=plz.pal,W=b.w,H=b.h;
 // capannone con tetto a volta
 const body=()=>{g.beginPath();g.moveTo(0,0);g.lineTo(8,-H*.72);g.quadraticCurveTo(W/2,-H*1.18,W-8,-H*.72);g.lineTo(W,0);g.closePath()};
 g.save();body();g.clip();
 plzFacade(g,0,-H*1.2,W,H*1.2);
 // lamiera ondulata
 g.fillStyle='rgba(0,0,0,.18)';for(let x=3;x<W;x+=4)g.fillRect(x,-H*1.2,1,H*1.2);
 g.fillStyle='rgba(255,255,255,.05)';for(let x=4.5;x<W;x+=4)g.fillRect(x,-H*1.2,.6,H*1.2);
 plzGrain(g,0,-H*1.2,W,H*1.2,rnd,12);
 g.restore();
 g.strokeStyle=gRgb(gMix(P.lit,[255,255,255],.15),.7);g.lineWidth=1.1;g.beginPath();g.moveTo(8,-H*.72);g.quadraticCurveTo(W/2,-H*1.18,W-8,-H*.72);g.stroke();
 // portone aperto con l'interno illuminato
 const dw=W*.42,dx=(W-dw)/2,dh=H*.62;
 const ins=g.createLinearGradient(0,-dh,0,0);ins.addColorStop(0,gRgb(P.deep));ins.addColorStop(1,gRgb(P.warm,.55));
 g.fillStyle=ins;g.fillRect(dx,-dh,dw,dh);
 g.fillStyle=gRgb(P.deep,.8);for(let i=0;i<3;i++){const sw=6+rnd()*10;g.fillRect(dx+4+rnd()*(dw-sw-8),-6-rnd()*8,sw,6+rnd()*8)}
 // strisce di pericolo ai lati del portone
 for(const sx of [dx-3,dx+dw]){for(let y=-dh;y<0;y+=4){g.fillStyle=((y/4)|0)%2?'rgba(255,190,60,.75)':'rgba(20,20,20,.8)';g.fillRect(sx,y,3,4)}}
 g.fillStyle=gRgb(P.glow,.75);g.fillRect(dx,-dh-3,dw,1.2);
 // insegna e luci sul tetto
 g.fillStyle=gRgb(P.dark);g.fillRect(W*.15,-H*.62,W*.16,6);g.fillStyle=gRgb(P.cool,.6);g.fillRect(W*.15+2,-H*.62+2,W*.16-4,1.4);
 // serbatoi cilindrici sul lato in ombra
 const side=P.sunLeft?W-4:-14;for(let i=0;i<2;i++){const tx=side+(P.sunLeft?-i*9:i*9)-0,th=H*.5+i*4;
  const tg=g.createLinearGradient(tx,0,tx+9,0);tg.addColorStop(0,gRgb(P.lit));tg.addColorStop(.5,gRgb(P.base));tg.addColorStop(1,gRgb(P.deep));
  g.fillStyle=tg;g.fillRect(tx,-th,9,th);g.beginPath();g.ellipse(tx+4.5,-th,4.5,2,0,0,6.28);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(tx,-th*.55,9,.8)}
 // torretta di controllo
 const cx=P.sunLeft?W*.12:W*.78,cw=W*.1;g.fillStyle=gRgb(P.dark);g.fillRect(cx,-H*1.02,cw,H*.3);
 g.fillStyle=gRgb(gMix(P.cool,P.sky,.3),.75);g.fillRect(cx-2,-H*1.02-6,cw+4,6);g.fillStyle=gRgb(P.lit,.5);g.fillRect(cx-2,-H*1.02-6,cw+4,.8);
 plzAntenna(g,cx+cw/2,-H*1.02-6,10+rnd()*8,rnd,out);
}

// ---------------------------------------------------------------- skyline lontano (ripetibile)
function plzSkyline(){
 const P=plz.pal,res=Math.min(1.4,plz.res),TW=PLZ_FAR_W,TH=200,rnd=pfRng(pfHash('skyline'+pf.p.code));
 const cv=gCanvas(TW*res,TH*res),g=cv.g;g.scale(res,res);g.translate(0,TH);
 const col=gMix(gMix(P.base,P.sky,.32),[0,0,0],.3),litC=gMix(col,P.m.sun,.18),shad=gMix(col,[0,0,0],.25);
 const lights=[];
 // quartieri: gruppi di torri
 for(let d=0;d<4;d++){
  const c0=d*TW/4+rnd()*TW/8,span=180+rnd()*200;
  for(let x=c0;x<c0+span;){
   const w=10+rnd()*22,mid=1-Math.abs((x-c0)/span*2-1),h=22+mid*(50+rnd()*70)+rnd()*16;
   const gr=g.createLinearGradient(x,0,x+w,0),a=P.sunLeft?0:1;gr.addColorStop(a,gRgb(litC));gr.addColorStop(1-a,gRgb(shad));
   g.fillStyle=gr;g.fillRect(x,-h,w,h+2);
   if(rnd()<.3){g.fillRect(x+w*.3,-h-8,w*.4,8)}
   if(rnd()<.45){g.fillStyle=gRgb(shad);g.fillRect(x+w/2-.4,-h-14,.8,14);lights.push([x+w/2,-h-14])}
   for(let yy=-h+4;yy<-4;yy+=5)for(let xx=x+2;xx<x+w-2;xx+=3.5)if(rnd()<.16){g.fillStyle=gRgb(rnd()<.75?P.warm:P.cool,.35+rnd()*.3);g.fillRect(xx,yy,1.4,1.6)}
   x+=w+rnd()*4;
  }
 }
 // nebbia: lo skyline è lontano, quindi molto velato e sfumato in basso
 g.globalCompositeOperation='source-atop';const f=g.createLinearGradient(0,-TH,0,0);
 f.addColorStop(0,gRgb(P.sky,.16));f.addColorStop(1,gRgb(P.haze,.38));g.fillStyle=f;g.fillRect(0,-TH,TW,TH);
 g.globalCompositeOperation='source-over';
 return{c:cv.c,w:TW,h:TH,lights};
}

function plzDrawFar(offset,VW,now){
 const F=plz.far;if(!F)return;
 const o=offset*PLZ_FAR_PAR,off=((o%F.w)+F.w)%F.w,y=PLZ_BASE+6-F.h;
 for(let x=-off;x<VW;x+=F.w){
  ctx.drawImage(F.c,x,y,F.w,F.h);
  // fari rossi lontani: lampeggiano a gruppi
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<F.lights.length;i++){const [lx,ly]=F.lights[i],sx=x+lx;if(sx<-10||sx>VW+10)continue;
   if(Math.sin(now*2.2+i*1.7)>.35){ctx.globalAlpha=.55;ctx.drawImage(plz.beacon,sx-5,y+F.h+ly-5,10,10)}}
  ctx.restore();
 }
}

pfDrawColony=function(offset,VW,now){
 if(!plzReady())return plzOrig.pfDrawColony(offset,VW,now);
 plzDrawFar(offset,VW,now);
 for(const b of pf.deco.buildings){
  const x=b.x-offset,sp=plz.sprites.get(b);if(!sp||x+b.w<-60||x-60>VW)continue;
  ctx.drawImage(sp.c,x-sp.ox,PLZ_BASE-sp.oy,sp.w,sp.h);
  if(sp.beacons.length&&Math.sin(now*3+b.seed)>.2){
   ctx.save();ctx.globalCompositeOperation='lighter';
   for(const [bx,by] of sp.beacons)ctx.drawImage(plz.beacon,x+bx-8,PLZ_BASE+by-8,16,16);
   ctx.restore();
  }
  if(b.fire){
   const top=PLZ_BASE+(b.kind==='cupola'?-b.w/2-10:b.kind==='hangar'?-b.h*.95:-b.h),fx=x+b.w*.5,f=.75+.25*Math.sin(now*9+b.seed);
   const g=ctx.createRadialGradient(fx,top,0,fx,top,46*f);g.addColorStop(0,'rgba(255,170,80,.55)');g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.fillRect(fx-50,top-50,100,100);
   for(let i=0;i<5;i++){const k=(now*.35+i/5+b.seed%7*.13)%1;ctx.fillStyle=`rgba(40,46,56,${.45*(1-k)})`;ctx.beginPath();ctx.arc(fx+Math.sin(k*5+i)*10+k*30,top-10-k*120,8+k*22,0,6.28);ctx.fill()}
  }
 }
};
