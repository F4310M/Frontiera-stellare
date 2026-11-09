// Conex — BOSS DALLE IMMAGINI DI FABIO (2026-11-08).
//  LYRA (mare):     il millepiedi meccanico (LEVIATANO K-3); il corpo si piega lungo una spina, gli anelli
//                   si stringono e si allargano mentre striscia, si accorcia prima della carica e si allunga
//                   nello scatto; si impenna come un cobra per guardarsi intorno, ruggire e sparare dalle mandibole.
//  VESPER (deserto): lo scorpione meccanico arrugginito; coda col pungiglione laser che mira e colpisce,
//                   chele che si aprono e si chiudono. Immagine specchiata: guarda a destra come gli altri boss.
//  NIMBUS (tempesta): la sfera robotica con l'occhio incandescente; vola, ruota per guardare il pilota
//                   e spara dall'occhio.
//  UMBRA (lava):     il drago meccanico; sbatte le ali, sputa fuoco dalla bocca verso il pilota.
//  KHEPRI (foresta): la vespa meccanica; vola sbattendo le ali, per sparare piega l'addome in avanti
//                   e punta il pungiglione laser sul pilota.
// Le immagini (dist/boss-immagini/) sono tagliate in pezzi; le coordinate sono in pixel dell'immagine originale.
// Finché le immagini non sono pronte resta il disegno di prima. Va caricato dopo boss.js, fase2.js e i18n.js.

const BI={
 scorpione:{
  kind:'deserto',dir:'boss-immagini/scorpione/',S:.2,O:[775,1010],
  parts:{coda:[177,0,765,507],corpo:[206,404,1101,613],'chela-avanti':[811,874,348,138],'chela-dietro':[1278,720,173,185],
   'braccio-avanti':[639,638,500,379],'braccio-dietro':[1088,538,443,383],zampa1:[11,529,272,350],zampa2:[181,580,222,361],zampa3:[398,598,175,411]},
  armFront:[700,690],armBack:[1110,640],legs:[[250,560],[360,610],[520,620]],
  tailBase:[305,470],stingTip:[935,390],stingBase:[795,210],jawFront:[875,870],jawBack:[1305,700],
  eyes:[[1005,660],[890,630],[1055,625]]
 },
 millepiedi:{
  kind:'mare',dir:'boss-immagini/millepiedi/',S:.2,O:[1075,640],raise:50,strips:42,spine:430,
  parts:{corpo:[27,115,2097,529],zampe:[27,115,2097,529]},
  mouth:[1986,600],eyes:[[1981,500],[1901,480]]
 },
 sfera:{
  kind:'tempesta',dir:'boss-immagini/sfera/',S:.15,O:[661,584],lift:128,
  parts:{corpo:[22,25,1279,1119]},
  eye:[815,550],pods:[[60,550],[1290,550]]
 },
 drago:{
  kind:'lava',dir:'boss-immagini/drago/',S:.21,O:[885,870],
  parts:{'ala-lontana':[1020,10,748,302],'ala-vicina':[3,0,953,467],corpo:[10,199,1759,541],
   'zampa-dietro':[565,583,268,290],'zampa-dietro2':[819,648,125,146],'zampa-avanti':[979,608,354,267],braccio:[1338,558,331,175]},
  legs:{'zampa-dietro2':[[890,660],Math.PI],'braccio':[[1360,585],0],'zampa-dietro':[[790,610],0],'zampa-avanti':[[1010,620],Math.PI]},
  wingNear:[933,370],wingFar:[1153,300],mouth:[1663,470],eye:[1643,410]
 },
 vespa:{
  kind:'foresta',dir:'boss-immagini/vespa/',S:.19,O:[895,560],lift:150,
  parts:{ali:[20,10,878,413],addome:[157,447,559,554],corpo:[89,10,1430,672],zampa1:[700,573,114,285],zampa2:[814,583,156,281],zampa3:[928,613,155,218],zampa4:[1015,623,143,168]},
  legs:[[780,590],[900,600],[960,640],[1060,630]],
  waist:[695,535],sting:[163,1000],wing:[800,360],eyes:[[1175,500],[1275,520]]
 }
};
const biOrig={draw:{},img:{},ready:{}};
const biP=(D,x,y)=>[(x-D.O[0])*D.S,(y-D.O[1])*D.S];
const biEase=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
function biRecoil(B){return typeof bRecoil==='function'?bRecoil(B):0}
function biAim(B){return typeof bArmAngle==='function'?bArmAngle(B):0}

function biLoad(name){
 const D=BI[name];if(typeof Image==='undefined')return;
 const names=Object.keys(D.parts);let left=names.length;biOrig.img[name]={};
 for(const n of names){
  const im=new Image();
  im.onload=()=>{if(--left===0){
   biOrig.ready[name]=true;
   // menu-pianeti.js puo aver messo in cache il vecchio boss vettoriale mentre
   // le nuove immagini erano ancora in caricamento. Svuota la cache e ridisegna
   // subito il pannello selezionato (in particolare LYRA / millepiedi).
   try{if(typeof MP!=='undefined'&&MP.boss){MP.boss.delete(D.kind);if(typeof state!=='undefined'&&state==='map'&&typeof selected==='number'&&typeof selectPlanet==='function')setTimeout(()=>selectPlanet(selected),0)}}catch(e){}
  }};
  im.src=D.dir+n+'.png';biOrig.img[name][n]=im;
 }
}
function biPart(c,name,n){const D=BI[name],p=D.parts[n],[x,y]=biP(D,p[0],p[1]);c.drawImage(biOrig.img[name][n],x,y,p[2]*D.S,p[3]*D.S)}
function biAround(c,name,pt,a,fn){const [x,y]=biP(BI[name],pt[0],pt[1]);c.save();c.translate(x,y);c.rotate(a);c.translate(-x,-y);fn();c.restore()}
function biGlow(c,x,y,r,rgb,a){
 if(a<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,`rgba(255,255,255,${Math.min(1,a)})`);g.addColorStop(.25,`rgba(${rgb},${Math.min(1,a*.9)})`);g.addColorStop(1,`rgba(${rgb},0)`);
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}

// ---------------------------------------------------------------- scorpione (VESPER)
function bScorpioneImg(c,B,now){
 if(!biOrig.ready.scorpione)return biOrig.draw.deserto&&biOrig.draw.deserto(c,B,now);
 const N='scorpione',D=BI[N],st=B.state,t=B.t||0,rec=biRecoil(B);
 let tail=.3*biAim(B)+.04*Math.sin(now*2),open=.25+.2*Math.sin(now*3),bob=Math.sin(now*3)*1.2,lean=0;
 if(st==='passi'){bob=-Math.abs(Math.sin((B.legT||0)*2))*3;open=.15}
 else if(st==='raffica'){tail+=.16*rec-(t<.45?.12*biEase(t/.45):0);open=.3}
 else if(st==='carica'){if(t<.8){const k=biEase(t/.8);tail-=.2*k;open=.3+.7*k;lean=-.04*k}else{open=.5+.5*Math.abs(Math.sin(now*22));tail=.15;lean=.03}}
 else if(st==='onda'){if(B.shots===2){tail=.35;open=.1}else{tail=-.2*biEase(t/.5);open=.9}}
 else if(st==='ruggito'||st==='caduta'){open=.8+.2*Math.sin(now*14);tail=-.15+.08*Math.sin(now*9)}
 else if(st==='stordito'){tail=.3;open=.9;lean=.03}
 else if(st==='distrutto'){tail=.4;open=1}
 const o=Math.max(0,Math.min(1,open));
 c.save();c.translate(0,bob);c.rotate(lean);
 biAround(c,N,D.tailBase,tail,()=>{
  biPart(c,N,'coda');
  // il pungiglione si accende prima di sparare
  const [sx,sy]=biP(D,...D.stingTip),heat=st==='raffica'?Math.min(1,t/.45):.3+.2*Math.sin(now*6);
  c.save();c.globalCompositeOperation='lighter';biGlow(c,sx,sy,8+heat*12,'255,50,40',.3+heat*.6);if(rec>0)biGlow(c,sx+4,sy,20+rec*16,'255,140,90',rec);c.restore();
 });
 // zampe che camminano a passo alternato, chele che si muovono avanti e indietro
 const walk=st==='passi'||(st==='carica'&&t>=.8)?(B.legT||0)*3+now*(st==='carica'?18:0):now*1.2,stepA=st==='passi'||st==='carica'?.14:.04;
 const arm=st==='carica'&&t<.8?-.12*biEase(t/.8):st==='raffica'?.05:.06*Math.sin(now*1.8);
 biAround(c,N,D.armBack,-arm+.05*Math.sin(now*1.5+1),()=>{biPart(c,N,'braccio-dietro');biAround(c,N,D.jawBack,o*.32,()=>biPart(c,N,'chela-dietro'))});
 D.legs.forEach((h,i)=>biAround(c,N,h,stepA*Math.sin(walk*2+i*2.1),()=>biPart(c,N,'zampa'+(i+1))));
 biPart(c,N,'corpo');
 biAround(c,N,D.armFront,arm,()=>{biPart(c,N,'braccio-avanti');biAround(c,N,D.jawFront,o*.3,()=>biPart(c,N,'chela-avanti'))});
 c.save();c.globalCompositeOperation='lighter';
 const eye=st==='carica'&&t<.8?(Math.floor(now*16)%2?1.6:.6):.55+.25*Math.sin(now*4)+(B.rage?.4:0);
 for(const [x,y] of D.eyes){const [ex,ey]=biP(D,x,y);biGlow(c,ex,ey,7,'255,40,30',eye*.6)}
 c.restore();
 c.restore();
}

// ---------------------------------------------------------------- sfera (NIMBUS)
function bSferaImg(c,B,now){
 if(!biOrig.ready.sfera)return biOrig.draw.tempesta&&biOrig.draw.tempesta(c,B,now);
 const N='sfera',D=BI[N],st=B.state,t=B.t||0,rec=biRecoil(B);
 let bob=-Math.sin(now*2.4)*7,turn=biAim(B),spin=0,lift=D.lift;
 if(st==='carica'){if(t<.8)spin=biEase(t/.8)*6.28;else spin=now*14}
 else if(st==='onda'){if(B.shots===2)lift=D.lift-20;else bob+=biEase(t/.5)*-14}
 else if(st==='stordito'){turn+=Math.sin(now*18)*.3;lift=D.lift-30}
 else if(st==='distrutto'){turn+=now*3;lift=D.lift-40}
 const cy=-lift+bob;
 // getti dei propulsori fino al suolo
 c.save();c.globalCompositeOperation='lighter';
 for(const x of [-26,0,26]){const top=cy+70,l=-top+Math.random()*6,g=c.createLinearGradient(0,top,0,top+l);g.addColorStop(0,'rgba(255,120,90,.7)');g.addColorStop(.5,'rgba(255,70,60,.22)');g.addColorStop(1,'rgba(255,70,60,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-8,top);c.lineTo(x+8,top);c.lineTo(x+3,top+l);c.lineTo(x-3,top+l);c.closePath();c.fill()}
 c.restore();
 c.save();c.translate(0,cy);c.rotate(turn+spin);
 biPart(c,N,'corpo');
 c.globalCompositeOperation='lighter';
 const [ex,ey]=biP(D,...D.eye),heat=st==='raffica'?Math.min(1,t/.45):.35+.2*Math.sin(now*5);
 biGlow(c,ex,ey,14+heat*18+(B.rage?6:0),'255,60,30',.35+heat*.55);
 if(rec>0)biGlow(c,ex+10,ey,30+rec*24,'255,170,110',rec);
 const podA=st==='carica'||B.rage?.8:.25+.15*Math.sin(now*7);
 for(const [x,y] of D.pods){const [px,py]=biP(D,x,y);biGlow(c,px,py,12,'255,70,40',podA)}
 c.restore();
}

// ---------------------------------------------------------------- millepiedi (LYRA) = LEVIATANO K-3
// L'immagine si disegna a strisce verticali messe in fila lungo una "spina dorsale" che si piega:
//  - ogni striscia ruota con la spina, così la parte davanti si impenna come un cobra (fermo si
//    solleva ogni tanto per guardarsi intorno, per sparare si alza alto, prima della carica si drizza);
//  - il passo tra le strisce cambia: un'onda di contrazione corre dalla coda alla testa (gli anelli si
//    stringono e si allargano come in un vero millepiedi) e tutto il corpo si accorcia per caricare
//    e si allunga nello scatto; dove gli anelli si stringono il dorso si inarca un poco.
// La bocca da fuoco e l'altezza della sagoma seguono la testa.
function biLevTarget(B,now){
 const st=B.state,t=B.t||0;
 // R impennata 0..1, L lunghezza del corpo, c forza della contrazione, w velocità dell'onda
 let R=0,L=1,c=.08,w=2.2;
 switch(st){
  case'passi':R=.12+.08*Math.sin(now*1.7);L=1+.06*Math.sin(now*3.2);c=.2;w=6.5;break;
  case'raffica':R=.15+.7*biEase(t/.45);L=.94;c=.05;w=1.5;break;
  case'carica':if(t<.8){R=.85*biEase(t/.5);L=1-.16*biEase(t/.8);c=.04;w=1}else{R=0;L=1.13;c=.12;w=11}break;
  case'onda':if(!B.shots){R=.35*biEase(t/.5);L=1-.14*biEase(t/.5)}else if(B.shots===1){R=.25;L=1.1}else{R=0;L=.95};c=.06;break;
  case'ruggito':case'caduta':R=.92+.08*Math.sin(now*2.6);L=1.04;c=.1;w=3;break;
  case'missili':R=.45;L=.97;c=.08;break;
  case'stordito':R=0;L=1.03;c=0;w=0;break;
  case'distrutto':R=.5*Math.max(0,1-t/1.2);L=1+.03*Math.sin(now*9);c=.05;w=4;break;
  default:{const s=Math.sin(now*1.15+.6);R=s>.25?.6*biEase((s-.25)/.75):0;L=1+.05*Math.sin(now*1.9);c=.1;w=2.4}
 }
 if(B.rage&&st!=='stordito'){c*=1.3;w*=1.25}
 return{R,L,c,w};
}
// la posa insegue quella voluta con una molla, così tra un attacco e l'altro non scatta
function biLevPose(B,now){
 const T=biLevTarget(B,now),P=B._lev,dt=P?now-P.now:-1;
 if(!P||!(dt>=0&&dt<.5)){B._lev=Object.assign({now,ph:now*T.w},T);return B._lev}
 const k=1-Math.exp(-dt*7);
 for(const key of ['R','L','c','w'])P[key]+=(T[key]-P[key])*k;
 P.ph+=dt*P.w;P.now=now;return P;
}
// la spina: per ogni striscia posizione del piede, angolo, passo e quanto si inarca
function biLevSpine(B,now,P){
 const D=BI.millepiedi,[px,,pw]=D.parts.corpo,n=D.strips,sw=pw/n,S=D.S,st=B.state;
 const amp=st==='stordito'?0:st==='passi'?2.5:1,pts=[];
 let x=(px-D.O[0])*S,y=(D.spine-D.O[1])*S;
 for(let i=0;i<n;i++){
  const xn=(i+.5)/n,wave=Math.sin(P.ph-xn*9.4),step=sw*S*P.L*(1+P.c*wave);
  let a=-P.R*1.45*biEase((xn-.45)/.4)+P.R*.95*biEase((xn-.86)/.14)+P.R*.12*Math.sin(now*2.3)*biEase((xn-.55)/.45);
  if(st==='stordito')a+=.06*Math.sin(now*18)*biEase((xn-.7)/.3);
  const lift=Math.max(0,-wave)*P.c*30+Math.sin(now*3-xn*12)*amp*(1-P.R*biEase((xn-.5)/.3));
  pts.push({x,y,a,step,lift,xn});
  x+=Math.cos(a)*step;y+=Math.sin(a)*step;
 }
 // il centro del corpo resta dov'era: coda e testa si allontanano e si avvicinano
 const m=pts[n>>1],dx=(px+(n>>1)*sw-D.O[0])*S-m.x;
 for(const p of pts)p.x+=dx;
 return pts;
}
// un punto dell'immagine originale portato sul corpo piegato
function biLevPoint(pts,ix,iy){
 const D=BI.millepiedi,[px,,pw]=D.parts.corpo,n=D.strips,sw=pw/n;
 const j=Math.max(0,Math.min(n-1,Math.floor((ix-px)/sw))),p=pts[j],u=(ix-px-j*sw)/sw*p.step;let v;
 const ca=Math.cos(p.a),sa=Math.sin(p.a);v=(iy-D.spine)*D.S;
 return[p.x+ca*u-sa*v,p.y-p.lift+sa*u+ca*v];
}
function bMillepiediImg(c,B,now){
 if(!biOrig.ready.millepiedi)return biOrig.draw.mare&&biOrig.draw.mare(c,B,now);
 const N='millepiedi',D=BI[N],st=B.state,t=B.t||0,img=biOrig.img[N].corpo,legs=biOrig.img[N].zampe,[px,py,pw,ph]=D.parts.corpo;
 const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,kx=iw/pw;
 const P=biLevPose(B,now),pts=biLevSpine(B,now,P),n=D.strips,sw=pw/n,top=(py-D.spine)*D.S,hgt=ph*D.S;
 const walking=st==='passi'||(st==='carica'&&t>=.8),legPh=P.ph*1.6;
 let minY=0;
 for(let i=0;i<n;i++){
  // la spina passa a metà corpo: nelle curve le strisce si allargano un poco per non lasciare fessure
  const p=pts[i],sx=i*sw,da=Math.abs(p.a-(pts[i+1]||p).a),dw=p.step*(sw+2)/sw+da*hgt*.6;
  // zampe: avanti e indietro a onda; quelle sollevate dall'impennata scalciano nell'aria
  const air=P.R*biEase((p.xn-.55)/.3),q=legPh-p.xn*70;
  const lx=Math.sin(q)*(P.w>.3?2.5:.6)+air*2.2*Math.sin(now*9-p.xn*40);
  const ly=-Math.max(0,Math.cos(q))*(walking?2.5:.8)-air*1.5*Math.max(0,Math.sin(now*9-p.xn*40));
  c.save();c.translate(p.x,p.y-p.lift);c.rotate(p.a);
  c.drawImage(legs,sx*kx,0,(sw+2)*kx,ih,lx,top+ly,dw,hgt);
  c.drawImage(img,sx*kx,0,(sw+2)*kx,ih,0,top,dw,hgt);
  c.restore();
  minY=Math.min(minY,p.y-p.lift+top*Math.cos(p.a));
 }
 c.save();c.globalCompositeOperation='lighter';
 const heat=st==='raffica'?Math.min(1,t/.45):0,rec=biRecoil(B);
 const eye=st==='carica'&&t<.8?(Math.floor(now*16)%2?1.4:.5):.5+.2*Math.sin(now*4)+(B.rage?.4:0);
 for(const [x,y] of D.eyes){const [ex,ey]=biLevPoint(pts,x,y);biGlow(c,ex,ey,9,'255,40,30',eye*.6)}
 const [mx,my]=biLevPoint(pts,...D.mouth);
 if(heat>0)biGlow(c,mx+6,my,8+heat*12,'255,90,40',.3+heat*.6);
 if(rec>0)biGlow(c,mx+10,my,20+rec*16,'255,170,110',rec);
 c.restore();
 // i colpi partono dalla bocca dov'è adesso; la sagoma che si può colpire cresce con l'impennata
 if(typeof pf!=='undefined'&&pf&&pf.boss===B&&typeof PF_BOSS!=='undefined'&&PF_BOSS.mare){
  const I=PF_BOSS.mare;I.gun.x=Math.round(mx);I.gun.y=Math.round(-my);
  // solo metà dell'altezza in più: la sagoma è un rettangolo largo quanto tutto il corpo, la coda resta bassa
  B.h=Math.max(I.h,Math.round(I.h+(-minY-I.h)*.5));
 }
}

// ---------------------------------------------------------------- drago (UMBRA)
function bDragoImg(c,B,now){
 if(!biOrig.ready.drago)return biOrig.draw.lava&&biOrig.draw.lava(c,B,now);
 const N='drago',D=BI[N],st=B.state,t=B.t||0,rec=biRecoil(B);
 const grounded=typeof PF_FLOOR==='number'&&Number.isFinite(B.y)&&B.y>=PF_FLOOR-2&&!['passi','raffica','carica','missili'].includes(st);
 let speed=grounded?.7:2.2,amp=grounded?.018:.12,bob=grounded?0:Math.sin(now*2)*1.5,lean=0,jump=0;
 if(st==='passi'){bob=-Math.abs(Math.sin((B.legT||0)*1.5))*4}
 else if(st==='carica'){if(t<.8){const k=biEase(t/.8);lean=-.06*k;speed=5;amp=.3}else{lean=.06;speed=12;amp=.35}}
 else if(st==='onda'){if(B.shots===2){speed=3}else{jump=biEase(t/.5)*12;speed=14;amp=.45}}
 else if(st==='ruggito'||st==='caduta'){speed=9;amp=.4;lean=-.05}
 else if(st==='stordito'){speed=0;amp=0;lean=.05}
 else if(st==='distrutto'){speed=1;amp=.05;lean=.08}
 else if(st==='raffica'){lean=-.03*biEase(t/.45)}
 const beat=Math.sin(now*speed*Math.PI);
 const wing=(name,pt,sign)=>biAround(c,N,pt,0,()=>{const [x,y]=biP(D,...pt);c.translate(x,y);c.rotate(sign*amp*beat);c.scale(1,1-.22*amp*(1+beat));c.translate(-x,-y);biPart(c,N,name)});
 c.save();c.translate(0,bob+jump);c.rotate(lean);
 wing('ala-lontana',D.wingFar,1);
 // zampe a passo alternato (diagonali insieme), il braccio davanti graffia l'aria
 const walking=st==='passi'||(st==='carica'&&t>=.8),ph=walking?(B.legT||0)*3+(st==='carica'?now*16:0):now*1.3,la=grounded?0:walking?.16:.035;
 for(const [n,[pt,off]] of Object.entries(D.legs)){
  let a=la*Math.sin(ph+off);
  if(n==='braccio'&&(st==='raffica'||st==='ruggito'))a=-.25+.08*Math.sin(now*10);
  if(st==='onda'&&B.shots!==2)a=-.2*biEase(t/.5);
  biAround(c,N,pt,a,()=>biPart(c,N,n));
 }
 biPart(c,N,'corpo');
 wing('ala-vicina',D.wingNear,-1);
 // fuoco dalla bocca verso il pilota
 const [mx,my]=biP(D,...D.mouth),[ex,ey]=biP(D,...D.eye);
 c.save();c.globalCompositeOperation='lighter';
 const eye=st==='carica'&&t<.8?(Math.floor(now*16)%2?1.4:.5):.5+.2*Math.sin(now*4)+(B.rage?.4:0);
 biGlow(c,ex,ey,8,'255,40,30',eye*.7);
 const heat=st==='raffica'?Math.min(1,t/.45):.15+.1*Math.sin(now*5);
 biGlow(c,mx,my,8+heat*16,'255,110,30',.3+heat*.6);
 if(st==='raffica'){
  c.save();c.translate(mx,my);c.rotate(biAim(B)+lean*0);
  const L=40+heat*50+rec*30,g=c.createLinearGradient(0,0,L,0);g.addColorStop(0,'rgba(255,240,200,.95)');g.addColorStop(.35,'rgba(255,150,40,.75)');g.addColorStop(1,'rgba(255,60,20,0)');
  c.fillStyle=g;c.beginPath();c.moveTo(0,-3);c.quadraticCurveTo(L*.5,-10-6*Math.sin(now*40),L,0);c.quadraticCurveTo(L*.5,10+6*Math.sin(now*37),0,3);c.closePath();c.fill();c.restore();
 }
 c.restore();
 c.restore();
}

// ---------------------------------------------------------------- vespa (KHEPRI)
function bVespaImg(c,B,now){
 if(!biOrig.ready.vespa)return biOrig.draw.foresta&&biOrig.draw.foresta(c,B,now);
 const N='vespa',D=BI[N],st=B.state,t=B.t||0,rec=biRecoil(B);
 const rest=Math.atan2(D.sting[1]-D.waist[1],D.sting[0]-D.waist[0]);
 let bob=-Math.sin(now*3)*8,pitch=.04*Math.sin(now*1.7),curl=.12*Math.sin(now*2.2),flap=1,lift=D.lift;
 // per sparare l'addome si piega sotto il corpo e il pungiglione segue la mira
 if(st==='raffica'){const k=biEase(t/.45);curl=(biAim(B)-rest)*k;pitch=-.08*k}
 else if(st==='carica'){if(t<.8){const k=biEase(t/.8);pitch=-.25*k;curl=.25*k}else{pitch=.35;curl=-.5;flap=1.6}}
 else if(st==='onda'){if(B.shots===2){lift=D.lift-40;pitch=.2}else{bob-=biEase(t/.5)*16;curl=.3}}
 else if(st==='stordito'){pitch=.3+Math.sin(now*14)*.08;lift=D.lift-35;flap=.5}
 else if(st==='distrutto'){pitch=.5;lift=D.lift-50;flap=.3}
 else if(st==='ruggito'||st==='caduta'){curl=.3*Math.sin(now*6);flap=1.4}
 const [wx,wy]=biP(D,...D.wing),beat=Math.sin(now*42*flap);
 c.save();c.translate(0,-lift+bob);c.rotate(pitch);
 // ali dietro al corpo: battito veloce con scia trasparente
 for(const [a,sy] of [[.35,-.55],[1,beat]]){
  c.save();c.globalAlpha=a;c.translate(wx,wy);c.rotate(-.12*sy);c.scale(1,.55+.45*sy);c.translate(-wx,-wy);biPart(c,N,'ali');c.restore();
 }
 c.globalAlpha=1;
 const abdomen=()=>biAround(c,N,D.waist,curl,()=>{
  biPart(c,N,'addome');
  const [sx,sy]=biP(D,...D.sting),heat=st==='raffica'?Math.min(1,t/.45):.25+.15*Math.sin(now*6);
  c.save();c.globalCompositeOperation='lighter';biGlow(c,sx,sy,8+heat*12,'255,50,40',.3+heat*.6);if(rec>0)biGlow(c,sx,sy,22+rec*16,'255,140,90',rec);c.restore();
 });
 // piegato in avanti l'addome passa davanti al corpo
 const front=curl<-1.2;
 if(!front)abdomen();
 // zampe che penzolano e scalciano in volo
 const kick=st==='carica'&&t>=.8?.35:st==='onda'&&B.shots!==2?.25:.1;
 D.legs.forEach((h,i)=>biAround(c,N,h,kick*Math.sin(now*(4+i*.7)+i*1.7)+(st==='carica'&&t>=.8?-.3:0),()=>biPart(c,N,'zampa'+(i+1))));
 biPart(c,N,'corpo');
 if(front)abdomen();
 c.save();c.globalCompositeOperation='lighter';
 const eye=st==='carica'&&t<.8?(Math.floor(now*16)%2?1.4:.5):.45+.2*Math.sin(now*4)+(B.rage?.4:0);
 for(const [x,y] of D.eyes){const [ex,ey]=biP(D,x,y);biGlow(c,ex,ey,14,'255,40,30',eye*.5)}
 c.restore();
 c.restore();
}

if(typeof BOSS_DRAW!=='undefined'){
 biOrig.draw.mare=BOSS_DRAW.mare;biOrig.draw.deserto=BOSS_DRAW.deserto;biOrig.draw.tempesta=BOSS_DRAW.tempesta;biOrig.draw.foresta=BOSS_DRAW.foresta;biOrig.draw.lava=BOSS_DRAW.lava;
 BOSS_DRAW.mare=bMillepiediImg;BOSS_DRAW.deserto=bScorpioneImg;BOSS_DRAW.tempesta=bSferaImg;BOSS_DRAW.foresta=bVespaImg;BOSS_DRAW.lava=bDragoImg;
 biLoad('millepiedi');biLoad('scorpione');biLoad('sfera');biLoad('vespa');biLoad('drago');
}
if(typeof PF_BOSS!=='undefined'){
 // la bocca da fuoco è la punta del pungiglione e l'occhio della sfera
 const D=BI.scorpione,[tx,ty]=biP(D,...D.stingTip);
 if(PF_BOSS.deserto)Object.assign(PF_BOSS.deserto,{w:240,h:170,gun:{x:Math.round(tx),y:Math.round(-ty),len:4},pod:{x:-40,y:150}});
 const M=BI.millepiedi,[mx,my]=biP(M,...M.mouth);
 if(PF_BOSS.mare)Object.assign(PF_BOSS.mare,{w:380,h:110,gun:{x:Math.round(mx),y:Math.round(M.raise-my),len:6},pod:{x:0,y:70},
  sub:'MILLEPIEDI CORAZZATO DEL FRONTE OMBRA',brief:'un millepiedi meccanico corazzato lungo come un treno'});
 const V=BI.vespa,[vx,vy]=biP(V,...V.waist);
 if(PF_BOSS.foresta)Object.assign(PF_BOSS.foresta,{w:170,h:V.lift+90,gun:{x:Math.round(vx),y:Math.round(V.lift-vy),len:Math.round(Math.hypot(V.sting[0]-V.waist[0],V.sting[1]-V.waist[1])*V.S)},pod:{x:0,y:V.lift+60},
  sub:'VESPA DA GUERRA DEL FRONTE OMBRA',brief:'una vespa meccanica corazzata con un pungiglione laser'});
 const G=BI.drago,[gx,gy]=biP(G,...G.mouth);
 if(PF_BOSS.lava)Object.assign(PF_BOSS.lava,{w:250,h:170,gun:{x:Math.round(gx),y:Math.round(-gy),len:8},pod:{x:-40,y:150},
  sub:'DRAGO DA GUERRA DEL FRONTE OMBRA',brief:'il drago meccanico che tiene in ostaggio la colonia'});
 const F=BI.sfera;
 if(PF_BOSS.tempesta)Object.assign(PF_BOSS.tempesta,{w:170,h:F.lift+85,gun:{x:0,y:F.lift,len:Math.round((F.eye[0]-F.O[0])*F.S)},pod:{x:0,y:F.lift+80}});
}
if(typeof B_SCORCH!=='undefined'){
 B_SCORCH.deserto=[[-10,-110],[40,-100],[-60,-95],[90,-70],[-110,-160],[20,-80]].map(([x,y],i)=>[x,y,[16,13,12,11,10,11][i]]);
 B_SCORCH.mare=[[-150,-55],[-80,-70],[0,-78],[70,-68],[140,-55],[175,-45]].map(([x,y],i)=>[x,y,[13,14,15,13,12,11][i]]);
 B_SCORCH.foresta=[[-10,-170],[40,-160],[-60,-140],[20,-130],[-40,-120],[70,-165]].map(([x,y],i)=>[x,y,[15,13,12,11,11,10][i]]);
 B_SCORCH.lava=[[20,-110],[70,-120],[-30,-90],[130,-110],[-90,-80],[0,-60]].map(([x,y],i)=>[x,y,[16,13,13,11,11,10][i]]);
 B_SCORCH.tempesta=[[-20,-150],[25,-110],[-40,-120],[35,-150],[0,-90],[-5,-175]].map(([x,y],i)=>[x,y,[16,13,12,11,12,10][i]]);
}
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ['MILLEPIEDI CORAZZATO DEL FRONTE OMBRA','ARMORED CENTIPEDE OF THE SHADOW FRONT','MILLE-PATTES BLINDÉ DU FRONT DE L’OMBRE','CIEMPIÉS BLINDADO DEL FRENTE SOMBRA','БРОНИРОВАННАЯ МНОГОНОЖКА ТЕНЕВОГО ФРОНТА','暗影阵线的装甲蜈蚣','影の戦線の装甲ムカデ'],
  ['DRAGO DA GUERRA DEL FRONTE OMBRA','WAR DRAGON OF THE SHADOW FRONT','DRAGON DE GUERRE DU FRONT DE L’OMBRE','DRAGÓN DE GUERRA DEL FRENTE SOMBRA','БОЕВОЙ ДРАКОН ТЕНЕВОГО ФРОНТА','暗影阵线的战龙','影の戦線の戦闘ドラゴン'],
  ['il drago meccanico che tiene in ostaggio la colonia','the mechanical dragon holding the colony hostage','le dragon mécanique qui retient la colonie en otage','el dragón mecánico que tiene a la colonia como rehén','механический дракон, держащий колонию в заложниках','挟持殖民地的机械巨龙','コロニーを人質に取る機械のドラゴン'],
  ['VESPA DA GUERRA DEL FRONTE OMBRA','WAR WASP OF THE SHADOW FRONT','GUÊPE DE GUERRE DU FRONT DE L’OMBRE','AVISPA DE GUERRA DEL FRENTE SOMBRA','БОЕВАЯ ОСА ТЕНЕВОГО ФРОНТА','暗影阵线的战争胡蜂','影の戦線の戦闘スズメバチ'],
  ['una vespa meccanica corazzata con un pungiglione laser','an armored mechanical wasp with a laser stinger','une guêpe mécanique blindée avec un dard laser','una avispa mecánica blindada con un aguijón láser','бронированная механическая оса с лазерным жалом','带激光毒刺的装甲机械胡蜂','レーザーの毒針を持つ装甲機械スズメバチ'],
  ['un millepiedi meccanico corazzato lungo come un treno','an armored mechanical centipede as long as a train','un mille-pattes mécanique blindé long comme un train','un ciempiés mecánico blindado largo como un tren','бронированная механическая многоножка длиной с поезд','像火车一样长的装甲机械蜈蚣','列車ほど長い装甲機械ムカデ']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
}

// Millepiedi e drago sono molto lunghi: restano dentro lo schermo. Se durante la carica toccano il nuovo
// bordo restano storditi come quando gli altri boss sbattono contro il muro.
const BI_LARGO={mare:155,lava:135};
const biOrigUpdate=typeof pfUpdateBoss==='function'?pfUpdateBoss:null;
if(biOrigUpdate)pfUpdateBoss=function(dt){
 const r=biOrigUpdate(dt),B=pf&&pf.boss,extra=B&&BI_LARGO[B.kind];
 if(!extra||!pf.cam||typeof pfViewW!=='function'||B.state==='distrutto'||B.state==='caduta')return r;
 const lo=pf.cam.lockX+90+extra,hi=pf.cam.lockX+Math.min(pfViewW(),1500)-70-extra;
 if(B.x<lo||B.x>hi){
  B.x=Math.max(lo,Math.min(hi,B.x));
  if(B.state==='carica'&&B.t>=.8){B.vx=0;B.charge=0;pf.cam.shake=.6;if(typeof noise==='function')noise(.4,.06,500);pfBossSet(B,'stordito');pfStatus('NUCLEO ESPOSTO · DANNO DOPPIO',1600)}
 }
 return r;
};
