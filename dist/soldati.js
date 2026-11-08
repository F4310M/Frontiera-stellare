// Conex — SOLDATI A TERRA DALLE IMMAGINI DI FABIO (2026-11-08).
// Il pilota (armatura blu e grigia) e i soldati nemici (armatura rossa e nera) della fase a terra
// non sono più disegnati a mano: ognuno è l'immagine di Fabio tagliata in pezzi (dist/soldati/<tipo>/):
// busto (con testa, zaino e cintura), braccia col fucile, coscia e stinco di ciascuna gamba.
// - Le braccia girano attorno alla spalla per puntare il fucile dove si mira; il busto si piega un poco.
// - Le gambe seguono i piedi con una cinematica a due ossa: corsa, salto, jetpack, accovacciato.
// - Il fucile disegnato e i colpi partono dallo stesso punto (pfShoulder adattato alla nuova figura).
// Se le immagini non sono ancora pronte si usa il disegno di prima (gTrooper di grafica2.js).
// Va caricato dopo grafica2.js, battaglia.js e assalto.js (si aggancia alla scena della vita persa).

const SOLD={
 H:66,                       // altezza della figura in unità di gioco (quella di prima era ~69)
 armMin:-.7,armMax:.55,      // quanto possono alzarsi e abbassarsi le braccia rispetto all'immagine
 lean:.14,                   // quanto si piega il busto seguendo la mira
 crouchDrop:190,             // di quanto scende il bacino da accovacciato (pixel dell'immagine)
 tipi:{
  pilota:{dir:'soldati/pilota/',O:[425,1478],
   parts:{busto:[100,13,474,804],braccia:[167,219,809,361],cosciaD:[121,637,332,420],stincoD:[27,1016,257,470],cosciaA:[417,687,307,374],stincoA:[496,1036,350,416]},
   spalla:[290,330],vita:[430,630],gamba:{D:{anca:[310,700],gin:[255,1030],cav:[150,1345]},A:{anca:[540,720],gin:[640,1040],cav:[655,1330]}},
   zaino:[150,470],casco:[470,120]},
  nemico:{dir:'soldati/nemico/',O:[450,1440],
   parts:{busto:[136,25,489,784],braccia:[197,257,758,327],cosciaD:[158,637,315,436],stincoD:[67,1032,253,426],cosciaA:[456,637,338,408],stincoA:[591,1024,311,404]},
   spalla:[310,350],vita:[440,630],gamba:{D:{anca:[330,720],gin:[265,1040],cav:[175,1300]},A:{anca:[560,730],gin:[690,1035],cav:[700,1300]}},
   zaino:[220,470],casco:[500,150]}
 }
};
const soldOrig={gTrooper:typeof gTrooper==='function'?gTrooper:null,pfShoulder:typeof pfShoulder==='function'?pfShoulder:null};
const soldImg={pilota:{},nemico:{}};
const soldReady={pilota:false,nemico:false};
for(const T of Object.values(SOLD.tipi)){
 // scala: unità di gioco per pixel dell'immagine originale
 T.S=SOLD.H/(T.O[1]-T.parts.busto[1]);
 for(const k of ['D','A']){const g=T.gamba[k];g.L1=Math.hypot(g.gin[0]-g.anca[0],g.gin[1]-g.anca[1]);g.L2=Math.hypot(g.cav[0]-g.gin[0],g.cav[1]-g.gin[1]);g.a0=Math.atan2(g.gin[1]-g.anca[1],g.gin[0]-g.anca[0]);g.b0=Math.atan2(g.cav[1]-g.gin[1],g.cav[0]-g.gin[0])}
 // altezza della spalla sopra i piedi, in unità di gioco
 T.sh=(T.O[1]-T.spalla[1])*T.S;T.shx=(T.spalla[0]-T.O[0])*T.S;
}

function soldLoad(){
 if(typeof Image==='undefined')return;
 for(const [tipo,T] of Object.entries(SOLD.tipi)){
  const names=Object.keys(T.parts);let left=names.length;
  for(const n of names){
   const im=new Image();
   im.onload=()=>{if(--left===0)soldReady[tipo]=true};
   im.src=T.dir+n+'.png';soldImg[tipo][n]=im;
  }
 }
}
soldLoad();

function soldTipo(pal){return typeof PF_REBEL!=='undefined'&&pal===PF_REBEL?'nemico':'pilota'}
function soldUsa(o,pal){
 if(!o||o.type==='drone')return false;
 return !!soldReady[soldTipo(pal)];
}

// Cinematica a due ossa: dato il bacino e il punto dove deve stare la caviglia, trova il ginocchio
// (sempre piegato in avanti) e le rotazioni di coscia e stinco rispetto all'immagine.
function soldGamba(g,hx,hy,tx,ty){
 let dx=tx-hx,dy=ty-hy,d=Math.hypot(dx,dy);
 const lo=Math.abs(g.L1-g.L2)+2,hi=g.L1+g.L2-2;d=Math.max(lo,Math.min(hi,d));
 const base=Math.atan2(dy,dx),c=(g.L1*g.L1+d*d-g.L2*g.L2)/(2*g.L1*d),off=Math.acos(Math.max(-1,Math.min(1,c)));
 const a=base-off,kx=hx+Math.cos(a)*g.L1,ky=hy+Math.sin(a)*g.L1;
 const b=Math.atan2(ty-ky,tx-kx);
 return {a:a-g.a0,b:b-g.b0,kx,ky};
}

// Posa a partire dallo stato del personaggio: spostamento del bacino, punti dei piedi, mira.
function soldPosa(T,o,now){
 const crouch=!!o.crouch,moving=o.ground!==false&&o.ground&&Math.abs(o.vx||0)>20;
 const D=T.gamba.D,A=T.gamba.A;
 const p={hx:0,hy:0,fD:[D.cav[0],D.cav[1]],fA:[A.cav[0],A.cav[1]],lean:0,arm:0};
 if(crouch){
  p.hy=SOLD.crouchDrop;p.fD[0]-=70;p.fA[0]+=10;
 }else if(!o.ground){
  // in aria: gambe raccolte, col jetpack penzolano
  if(o.jetOn){const s=Math.sin(now*9)*12;p.fD=[D.cav[0]+40+s,D.cav[1]-40];p.fA=[A.cav[0]-50-s,A.cav[1]-60]}
  else{const up=(o.vy||0)<0?1:.6;p.fD=[D.cav[0]+70,D.cav[1]-150*up];p.fA=[A.cav[0]-80,A.cav[1]-220*up]}
 }else if(moving){
  const ph=(o.run||0)*1.25/(2*Math.PI),dir=Math.sign(o.vx)*(o.face||1);
  const speed=Math.min(1,Math.abs(o.vx)/250),reach=135+speed*95;
  const step=(g,offset,center)=>{
   const cycle=(ph+offset)%1,stance=cycle<.61;
   const t=stance?cycle/.61:(cycle-.61)/.39;
   const x=stance?1-2*t:-Math.cos(t*Math.PI);
   const lift=stance?0:Math.sin(t*Math.PI)**1.5*(65+speed*65);
   return [g.cav[0]+center+dir*reach*x,g.cav[1]-lift];
  };
  p.fA=step(A,0,-80);p.fD=step(D,.5,85);
  p.hy=14+Math.cos(ph*4*Math.PI)*16;
  p.hx=dir*speed*24;
 }else{
  // fermo: respira
  p.hy=Math.sin(now*2.2+(o.x||0)*.01)*5;
 }
 // mira: angolo del fucile rispetto alla direzione in cui guarda
 let la=(o.face||1)>0?(o.aim||0):Math.PI-(o.aim||0);la=Math.atan2(Math.sin(la),Math.cos(la));
 p.lean=Math.max(-1,Math.min(1,la))*SOLD.lean+(moving?Math.sign(o.vx)*(o.face||1)*.075:0);
 p.arm=Math.max(SOLD.armMin,Math.min(SOLD.armMax,la-p.lean));
 return p;
}

function soldPezzo(c,img,T,n){const r=T.parts[n];c.drawImage(img[n],r[0],r[1],r[2],r[3])}
function soldDisegna(o,pal,now){
 const tipo=soldTipo(pal),T=SOLD.tipi[tipo],img=soldImg[tipo],c=ctx;
 // ombra a terra
 if(typeof gShadow==='function'){
  if(o.ground!==false)gShadow(o.x,o.y,22,.42);
  else if(typeof gGroundBelow==='function'){const gy=gGroundBelow(o.x,o.y);if(gy!==null)gShadow(o.x,gy,Math.max(8,22-(gy-o.y)*.08),Math.max(.08,.4-(gy-o.y)*.003))}
 }
 const p=soldPosa(T,o,now);
 c.save();
 c.translate(o.x,o.y);c.scale((o.face||1)*T.S,T.S);c.translate(-T.O[0],-T.O[1]);
 // gambe: prima quella lontana (dietro), poi quella vicina
 for(const k of ['D','A']){
  const g=T.gamba[k],hx=g.anca[0]+p.hx,hy=g.anca[1]+p.hy,f=k==='D'?p.fD:p.fA;
  const r=soldGamba(g,hx,hy,f[0],f[1]);
  c.save();c.translate(r.kx,r.ky);c.rotate(r.b);c.translate(-g.gin[0],-g.gin[1]);soldPezzo(c,img,T,'stinco'+k);c.restore();
  c.save();c.translate(hx,hy);c.rotate(r.a);c.translate(-g.anca[0],-g.anca[1]);soldPezzo(c,img,T,'coscia'+k);c.restore();
 }
 // busto e braccia
 c.translate(p.hx,p.hy);
 c.translate(T.vita[0],T.vita[1]);c.rotate(p.lean);c.translate(-T.vita[0],-T.vita[1]);
 soldPezzo(c,img,T,'busto');
 c.translate(T.spalla[0],T.spalla[1]);c.rotate(p.arm);c.translate(-T.spalla[0],-T.spalla[1]);
 soldPezzo(c,img,T,'braccia');
 c.restore();
}

// Disegno del personaggio: i soldati con l'immagine, il resto come prima.
function soldTrooper(base){
 return function(o,pal,now){
  if(soldUsa(o,pal))return soldDisegna(o,pal,now);
  return base(o,pal,now);
 };
}
if(soldOrig.gTrooper){
 // la scena della vita persa (assalto.js) chiama la funzione di base salvata in asOrig: va sostituita lì
 if(typeof asOrig!=='undefined'&&asOrig.gTrooper){asOrig.gTrooper=soldTrooper(asOrig.gTrooper)}
 else gTrooper=soldTrooper(soldOrig.gTrooper);
}

// Spalla (punto da cui partono i colpi e le linee di mira) alla stessa altezza del fucile disegnato.
if(soldOrig.pfShoulder){
 pfShoulder=function(o){
  if(!o||o.type==='drone'||!o.hasOwnProperty('face'))return soldOrig.pfShoulder(o);
  const tipo=typeof pf!=='undefined'&&pf&&o===pf.pilot?'pilota':'nemico';
  if(!soldReady[tipo])return soldOrig.pfShoulder(o);
  const T=SOLD.tipi[tipo],drop=o.crouch?SOLD.crouchDrop*T.S:0;
  return {x:o.x+(o.face||1)*(T.shx+2),y:o.y-T.sh+drop};
 };
}

// Fiamma del jetpack dallo zaino della nuova figura.
function soldJetNozzle(P){
 if(!soldReady.pilota)return {x:P.x-P.face*8,y:P.y-26};
 const T=SOLD.tipi.pilota;
 return {x:P.x+P.face*(T.zaino[0]-T.O[0])*T.S,
  y:P.y-(T.O[1]-T.zaino[1])*T.S+(P.crouch?SOLD.crouchDrop*T.S:0)};
}
