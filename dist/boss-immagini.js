// Conex — BOSS DALLE IMMAGINI DI FABIO (2026-11-08).
//  LYRA (mare):     lo scorpione meccanico arrugginito; coda col pungiglione laser che mira e colpisce,
//                   chele che si aprono e si chiudono. Immagine specchiata: guarda a destra come gli altri boss.
//  NIMBUS (tempesta): la sfera robotica con l'occhio incandescente; vola, ruota per guardare il pilota
//                   e spara dall'occhio.
//  KHEPRI (foresta): la vespa meccanica; vola sbattendo le ali, per sparare piega l'addome in avanti
//                   e punta il pungiglione laser sul pilota.
// Le immagini (dist/boss-immagini/) sono tagliate in pezzi; le coordinate sono in pixel dell'immagine originale.
// Finché le immagini non sono pronte resta il disegno di prima. Va caricato dopo boss.js, fase2.js e i18n.js.

const BI={
 scorpione:{
  kind:'mare',dir:'boss-immagini/scorpione/',S:.2,O:[775,1010],
  parts:{coda:[177,0,765,507],corpo:[11,404,1520,613],'chela-avanti':[811,874,348,138],'chela-dietro':[1278,720,173,185]},
  tailBase:[305,470],stingTip:[935,390],stingBase:[795,210],jawFront:[875,870],jawBack:[1305,700],
  eyes:[[1005,660],[890,630],[1055,625]]
 },
 sfera:{
  kind:'tempesta',dir:'boss-immagini/sfera/',S:.15,O:[661,584],lift:128,
  parts:{corpo:[22,25,1279,1119]},
  eye:[815,550],pods:[[60,550],[1290,550]]
 },
 vespa:{
  kind:'foresta',dir:'boss-immagini/vespa/',S:.19,O:[895,560],lift:150,
  parts:{ali:[20,10,878,413],addome:[157,447,559,554],corpo:[89,10,1430,854]},
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
  im.onload=()=>{if(--left===0){biOrig.ready[name]=true;try{if(typeof MP!=='undefined'&&MP.boss)MP.boss.delete(D.kind)}catch(e){}}};
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

// ---------------------------------------------------------------- scorpione (LYRA)
function bScorpioneImg(c,B,now){
 if(!biOrig.ready.scorpione)return biOrig.draw.mare&&biOrig.draw.mare(c,B,now);
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
 biAround(c,N,D.jawBack,o*.32,()=>biPart(c,N,'chela-dietro'));
 biPart(c,N,'corpo');
 biAround(c,N,D.jawFront,o*.3,()=>biPart(c,N,'chela-avanti'));
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
 biPart(c,N,'corpo');
 if(front)abdomen();
 c.save();c.globalCompositeOperation='lighter';
 const eye=st==='carica'&&t<.8?(Math.floor(now*16)%2?1.4:.5):.45+.2*Math.sin(now*4)+(B.rage?.4:0);
 for(const [x,y] of D.eyes){const [ex,ey]=biP(D,x,y);biGlow(c,ex,ey,14,'255,40,30',eye*.5)}
 c.restore();
 c.restore();
}

if(typeof BOSS_DRAW!=='undefined'){
 biOrig.draw.mare=BOSS_DRAW.mare;biOrig.draw.tempesta=BOSS_DRAW.tempesta;biOrig.draw.foresta=BOSS_DRAW.foresta;
 BOSS_DRAW.mare=bScorpioneImg;BOSS_DRAW.tempesta=bSferaImg;BOSS_DRAW.foresta=bVespaImg;
 biLoad('scorpione');biLoad('sfera');biLoad('vespa');
}
if(typeof PF_BOSS!=='undefined'){
 // la bocca da fuoco è la punta del pungiglione e l'occhio della sfera
 const D=BI.scorpione,[tx,ty]=biP(D,...D.stingTip);
 if(PF_BOSS.mare)Object.assign(PF_BOSS.mare,{w:240,h:170,gun:{x:Math.round(tx),y:Math.round(-ty),len:4},pod:{x:-40,y:150},
  sub:'SCORPIONE CORAZZATO DEL FRONTE OMBRA',brief:'uno scorpione meccanico corazzato con un pungiglione laser'});
 const V=BI.vespa,[vx,vy]=biP(V,...V.waist);
 if(PF_BOSS.foresta)Object.assign(PF_BOSS.foresta,{w:170,h:V.lift+90,gun:{x:Math.round(vx),y:Math.round(V.lift-vy),len:Math.round(Math.hypot(V.sting[0]-V.waist[0],V.sting[1]-V.waist[1])*V.S)},pod:{x:0,y:V.lift+60},
  sub:'VESPA DA GUERRA DEL FRONTE OMBRA',brief:'una vespa meccanica corazzata con un pungiglione laser'});
 const F=BI.sfera;
 if(PF_BOSS.tempesta)Object.assign(PF_BOSS.tempesta,{w:170,h:F.lift+85,gun:{x:0,y:F.lift,len:Math.round((F.eye[0]-F.O[0])*F.S)},pod:{x:0,y:F.lift+80}});
}
if(typeof B_SCORCH!=='undefined'){
 B_SCORCH.mare=[[-10,-110],[40,-100],[-60,-95],[90,-70],[-110,-160],[20,-80]].map(([x,y],i)=>[x,y,[16,13,12,11,10,11][i]]);
 B_SCORCH.foresta=[[-10,-170],[40,-160],[-60,-140],[20,-130],[-40,-120],[70,-165]].map(([x,y],i)=>[x,y,[15,13,12,11,11,10][i]]);
 B_SCORCH.tempesta=[[-20,-150],[25,-110],[-40,-120],[35,-150],[0,-90],[-5,-175]].map(([x,y],i)=>[x,y,[16,13,12,11,12,10][i]]);
}
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ['SCORPIONE CORAZZATO DEL FRONTE OMBRA','ARMORED SCORPION OF THE SHADOW FRONT','SCORPION BLINDÉ DU FRONT DE L’OMBRE','ESCORPIÓN BLINDADO DEL FRENTE SOMBRA','БРОНИРОВАННЫЙ СКОРПИОН ТЕНЕВОГО ФРОНТА','暗影阵线的装甲蝎子','影の戦線の装甲サソリ'],
  ['VESPA DA GUERRA DEL FRONTE OMBRA','WAR WASP OF THE SHADOW FRONT','GUÊPE DE GUERRE DU FRONT DE L’OMBRE','AVISPA DE GUERRA DEL FRENTE SOMBRA','БОЕВАЯ ОСА ТЕНЕВОГО ФРОНТА','暗影阵线的战争胡蜂','影の戦線の戦闘スズメバチ'],
  ['una vespa meccanica corazzata con un pungiglione laser','an armored mechanical wasp with a laser stinger','une guêpe mécanique blindée avec un dard laser','una avispa mecánica blindada con un aguijón láser','бронированная механическая оса с лазерным жалом','带激光毒刺的装甲机械胡蜂','レーザーの毒針を持つ装甲機械スズメバチ'],
  ['uno scorpione meccanico corazzato con un pungiglione laser','an armored mechanical scorpion with a laser stinger','un scorpion mécanique blindé avec un dard laser','un escorpión mecánico blindado con un aguijón láser','бронированный механический скорпион с лазерным жалом','带激光毒刺的装甲机械蝎子','レーザーの毒針を持つ装甲機械サソリ']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
}
