// Conex — NUOVO BOSS FINALE (2026-11-08): l'armatura da guerra di IMPERATORE OMEGA è il robot grigio e rosso
// disegnato da Fabio (teschio sulla spalla, artiglio a sinistra, cannone a destra).
// L'immagine è tagliata in pezzi (dist/boss-robot/): corpo, braccio dell'artiglio, dita, pollice, cannone.
// Animazioni: il cannone segue la mira e rincula a ogni colpo, l'artiglio si apre e si chiude, si alza
// per caricare e scatta in avanti; occhi, petto e bocca del cannone si illuminano.
// Nuovo attacco ARTIGLIO: se il pilota è vicino il robot carica il colpo e spazza il terreno davanti a sé.
// Se le immagini non sono ancora pronte si usa il disegno di prima (bOmega in finale.js).
// Va caricato dopo boss.js, finale.js, fase2.js e i18n.js.

const RB={
 S:.27*.85,O:[605,1010],          // scala (unità di gioco per pixel dell'immagine originale) e punto tra i piedi
 parts:{corpo:[177,0,1077,1017],braccio:[123,236,325,236],dita:[95,465,195,246],pollice:[271,467,100,234],cannone:[916,321,556,247]},
 shoulder:[415,275],wrist:[255,462],thumb:[312,492],elbow:[952,428],muzzle:[1455,445],lens:[1398,445],
 eyes:[848,200],chest:[850,352],antenne:[[588,40],[716,46]],
 gunRest:Math.atan2(445-428,1455-952),
 claw:{wind:.55,swipe:.8,end:1.3,reach:196,dmg:28}
};
const rbOrig={draw:typeof BOSS_DRAW!=='undefined'?BOSS_DRAW.omega:null,pfUpdateBoss:typeof pfUpdateBoss==='function'?pfUpdateBoss:null};
const rbImg={};
let rbReady=false;
const rbP=(x,y)=>[(x-RB.O[0])*RB.S,(y-RB.O[1])*RB.S];
const rbEase=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
const rbLerp=(a,b,k)=>a+(b-a)*k;

function rbLoad(){
 if(typeof Image==='undefined')return;
 const names=Object.keys(RB.parts);let left=names.length;
 for(const n of names){
  const im=new Image();
  im.onload=()=>{if(--left===0){rbReady=true;
   // l'anteprima della mappa era stata fatta col disegno vecchio: va rifatta
   try{if(typeof MP!=='undefined'&&MP.boss)MP.boss.delete('omega')}catch(e){}}};
  im.src='boss-robot/'+n+'.png';rbImg[n]=im;
 }
}
rbLoad();

function rbPart(c,n){const p=RB.parts[n],[x,y]=rbP(p[0],p[1]);c.drawImage(rbImg[n],x,y,p[2]*RB.S,p[3]*RB.S)}
function rbAround(c,pt,a,fn){const [x,y]=rbP(pt[0],pt[1]);c.save();c.translate(x,y);c.rotate(a);c.translate(-x,-y);fn();c.restore()}
function rbGlow(c,pt,r,rgb,a){
 if(a<=0)return;const [x,y]=Array.isArray(pt)?rbP(pt[0],pt[1]):[pt.x,pt.y];
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,255,255,${Math.min(1,a)})`);g.addColorStop(.25,`rgba(${rgb},${Math.min(1,a*.9)})`);g.addColorStop(1,`rgba(${rgb},0)`);
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}

// Pose del robot a partire dallo stato del boss: rotazione del braccio (positivo = indietro e in alto),
// apertura dell'artiglio, inclinazione del corpo, sobbalzo.
function rbPose(B,now){
 const st=B.state,t=B.t||0,rage=!!B.rage,sp=rage?1.25:1;
 const p={arm:.05*Math.sin(now*1.6),open:.25+.15*Math.sin(now*3),lean:0,bob:Math.sin(now*2.2)*1.5,eye:.7+.3*Math.sin(now*4),trail:0,front:false,reach:0};
 if(st==='passi'){p.bob=-Math.abs(Math.sin(B.legT||0))*5;p.arm=.14*Math.sin(B.legT||0);p.open=.2}
 else if(st==='raffica'){p.arm=.12;p.open=.15;p.lean=-.02*bRecoilSafe(B)}
 else if(st==='carica'){
  if(t<.8){const k=rbEase(t/.8);p.arm=.55*k;p.open=k;p.eye=1+(Math.floor(now*16)%2)}
  else{p.arm=.45;p.open=.65+.35*Math.sin(now*30);p.lean=.06}
 }
 else if(st==='artiglio'){
  const C=RB.claw,tt=t*sp;
  if(tt<C.wind){const k=rbEase(tt/C.wind);p.arm=.95*k;p.open=k;p.lean=-.05*k;p.eye=1+k}
  else if(tt<C.swipe){const k=rbEase((tt-C.wind)/(C.swipe-C.wind));p.arm=rbLerp(.95,-1.8,k);p.reach=72*k;p.open=1-k*.7;p.lean=rbLerp(-.05,.09,k);p.trail=1;p.eye=2;p.front=p.arm<-.35}
  else{const k=rbEase((tt-C.swipe)/(C.end-C.swipe));p.arm=rbLerp(-1.8,0,k);p.reach=72*(1-k);p.open=.3;p.lean=rbLerp(.09,0,k);p.front=p.arm<-.35;p.trail=Math.max(0,.6-k*2)}
 }
 else if(st==='onda'){
  // dopo l'atterraggio l'artiglio si schianta davanti, poi torna a riposo
  if(B.shots===2){const d=B.t-(B.rbLand??B.t),k=rbEase(d/.2);const back=rbEase((d-.5)/.6);p.arm=k<1?rbLerp(.9,-1.55,k):rbLerp(-1.55,0,back);p.reach=43*Math.min(k,1-back);p.open=.2;p.front=p.arm<-.35;p.trail=k<1?1:0}
  else{const k=rbEase(t/.5);p.arm=.9*k;p.open=k}
 }
 else if(st==='ruggito'||st==='caduta'){p.arm=.7+.1*Math.sin(now*8);p.open=1;p.eye=1.6}
 else if(st==='missili'){p.arm=.25;p.open=.5}
 else if(st==='stordito'){p.arm=.35;p.open=.9;p.lean=.04;p.eye=Math.random()<.5?.15:.9}
 else if(st==='distrutto'){p.arm=.45;p.open=.95;p.eye=Math.random()*.6}
 if(rage)p.eye=Math.max(p.eye,1.2);
 return p;
}
function bRecoilSafe(B){return typeof bRecoil==='function'?bRecoil(B):0}

function rbArm(c,p){
 const o=Math.max(0,Math.min(1,p.open));
 c.save();c.translate(p.reach,0);
 rbAround(c,RB.shoulder,p.arm,()=>{
  rbAround(c,RB.wrist,o*.38-.06,()=>rbPart(c,'dita'));
  rbAround(c,RB.thumb,-o*.5+.06,()=>rbPart(c,'pollice'));
  rbPart(c,'braccio');
 });
 c.restore();
}

// Scia rossa dell'artiglio: un arco attorno alla spalla.
function rbTrail(c,p){
 if(p.trail<=0)return;
 const [sx,sy]=rbP(...RB.shoulder),r=100,base=Math.atan2(600-275,230-415)+p.arm;
 c.save();c.translate(p.reach,0);c.globalCompositeOperation='lighter';
 for(let i=0;i<3;i++){
  c.strokeStyle=`rgba(255,${80+i*60},${90+i*50},${(.5-i*.13)*p.trail})`;c.lineWidth=16-i*5;
  c.beginPath();c.arc(sx,sy,r-i*6,base,base+.95);c.stroke();
 }
 c.restore();
}

function bRobot(c,B,now){
 if(!rbReady){if(rbOrig.draw)return rbOrig.draw(c,B,now);return}
 const p=rbPose(B,now),rage=!!B.rage;
 c.save();
 if(B.state==='onda'&&B.t<.5)c.translate(0,B.t*14);
 c.translate(0,p.bob);c.rotate(p.lean);
 // braccio dell'artiglio dietro al corpo, davanti quando colpisce
 if(!p.front)rbArm(c,p);
 rbPart(c,'corpo');
 // cannone: segue la mira e rincula
 const rec=bRecoilSafe(B),aim=(typeof bArmAngle==='function'?bArmAngle(B):0)-RB.gunRest;
 rbAround(c,RB.elbow,aim,()=>{
  c.save();c.translate(-12*rec,0);
  rbPart(c,'cannone');
  c.globalCompositeOperation='lighter';
  const heat=B.state==='raffica'?Math.min(1,B.t/.45):.25+.15*Math.sin(now*5);
  rbGlow(c,RB.lens,10+heat*14,'255,60,50',.35+heat*.6);
  if(rec>0){const [mx,my]=rbP(...RB.muzzle);rbGlow(c,{x:mx+6,y:my},26+rec*20,'255,170,90',rec);
   c.fillStyle=`rgba(255,240,200,${rec})`;c.beginPath();c.moveTo(mx,my-7);c.lineTo(mx+42*rec+8,my);c.lineTo(mx,my+7);c.closePath();c.fill()}
  c.restore();
 });
 if(p.front){rbTrail(c,p);rbArm(c,p)}
 // occhi, petto, antenne: luci che pulsano
 c.save();c.globalCompositeOperation='lighter';
 rbGlow(c,RB.eyes,16+p.eye*6,rage?'255,90,80':'255,40,40',.28*p.eye);
 rbGlow(c,RB.chest,12,'255,50,40',.22+.18*Math.sin(now*(B.state==='stordito'?16:4)));
 if(B.state==='missili'||rage)for(const a of RB.antenne)rbGlow(c,a,10+4*Math.sin(now*12),'255,80,60',B.state==='missili'?.9:.4);
 c.restore();
 c.restore();
}
if(typeof BOSS_DRAW!=='undefined')BOSS_DRAW.omega=bRobot;

// Dimensioni, bocca del cannone e lanciamissili (le antenne) allineati al nuovo disegno.
if(typeof PF_BOSS!=='undefined'&&PF_BOSS.omega){
 const [gx,gy]=rbP(...RB.elbow),[px,py]=rbP(650,40);
 Object.assign(PF_BOSS.omega,{w:170,h:230,gun:{x:Math.round(gx),y:Math.round(-gy),len:Math.round((RB.muzzle[0]-RB.elbow[0])*RB.S)},pod:{x:Math.round(px),y:Math.round(-py)}});
}
// bruciature sulle piastre del robot (petto, spalla col teschio, testa, cosce, cannone)
if(typeof B_SCORCH!=='undefined')B_SCORCH.omega=[[-12,-205],[50,-180],[65,-220],[-25,-130],[70,-110],[100,-155]].map(([x,y],i)=>[Math.round(x*.85),Math.round(y*.85),[16,14,12,13,12,11][i]]);

// ---------------------------------------------------------------- attacco ARTIGLIO
function rbClawHit(B){
 const P=pf.pilot;if(!P||!P.visible||P.hp<=0)return false;
 const C=RB.claw,f=B.face,x0=B.x-f*40,x1=B.x+f*C.reach;
 const box={l:Math.min(x0,x1),r:Math.max(x0,x1),t:B.y-162,b:B.y};
 if(!pfOverlap(pfRect(P),box))return false;
 const d=typeof pfBossInfo==='function'?(pfBossInfo(pf.p).dmg||1):1;
 pfDamage(Math.round(C.dmg*d),f);P.vx=f*520;P.vy=-380;
 return true;
}
if(rbOrig.pfUpdateBoss)pfUpdateBoss=function(dt){
 const B=pf&&pf.boss;
 if(!B||B.kind!=='omega'||B.state==='distrutto')return rbOrig.pfUpdateBoss(dt);
 const P=pf.pilot,dx=P?P.x-B.x:999;
 // pilota vicino: il robot lo colpisce con l'artiglio
 if(B.state==='pausa'&&B.t>(B.rage?.35:.6)&&Math.abs(dx)<225&&B.last!=='artiglio'&&P&&P.hp>0){
  pfBossSet(B,'artiglio');B.last='artiglio';B.rbHit=false;B.face=dx>=0?1:-1;
  pfStatus('ARTIGLIO · ALLONTANATI!',1400);
  if(typeof tone==='function')tone(180,.35,'sawtooth',.03,90);
 }
 const face=B.face,before=B.state;
 const r=rbOrig.pfUpdateBoss(dt);
 if(B.state==='onda'){if(B.shots===2&&B.rbLand==null)B.rbLand=B.t}else B.rbLand=null;
 if(B.state==='artiglio'){
  const C=RB.claw,tt=B.t*(B.rage?1.25:1);
  B.face=face;
  B.vx=tt>C.wind&&tt<C.swipe?face*128:0;
  if(!B.rbHit&&tt>=(C.wind+C.swipe)/2){
   B.rbHit=true;pf.cam.shake=Math.max(pf.cam.shake,.35);
   if(typeof noise==='function')noise(.3,.05,900);
   const tip=B.x+face*128;pfBurst(tip,B.y-40,'#ff8a7a',8,.6);pfBurst(tip,B.y-6,'#c7d6e2',6,.8,true,{vy:-60});
   if(rbClawHit(B)&&typeof pfStatus==='function')pfStatus('COLPITO DALL’ARTIGLIO',1200);
  }
  if(tt>=C.end){B.vx=0;pfBossSet(B,'pausa')}
 }
 return r;
};

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ['ARTIGLIO · ALLONTANATI!','CLAW STRIKE · GET BACK!','COUP DE GRIFFE · RECULE !','¡GARRA · ALÉJATE!','КОГОТЬ · ОТОЙДИ!','利爪攻击 · 快后退！','クロー攻撃・離れろ！'],
  ['COLPITO DALL’ARTIGLIO','HIT BY THE CLAW','TOUCHÉ PAR LA GRIFFE','GOLPEADO POR LA GARRA','ПОПАДАНИЕ КОГТЕМ','被利爪击中','クローを受けた']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
}
