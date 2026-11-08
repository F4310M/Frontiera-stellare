// Conex — CAMMINATA E CORSA DI COLONI E SOLDATI (2026-11-08).
// Soldati (pilota e nemici, soldati.js): i piedi non scivolano più. Il passo segue la distanza percorsa:
// durante l'appoggio il piede resta fermo a terra mentre il corpo avanza; poi il tallone sale dietro,
// la gamba torna avanti e appoggia. Il bacino scende quando il piede è a terra e sale in volo.
// Ai nemici (più lenti) tocca un passo di carica col fucile, al pilota una corsa piena.
// Coloni (coloni.js): prima si piegavano solo gli stinchi; ora ogni gamba ha coscia e stinco che
// ruotano su anca e ginocchio, con il ginocchio che si piega nel ritorno e il corpo che rimbalza.
// Anche la parte alta si muove: il busto si piega a ogni passo, la testa segue in ritardo,
// il bambino muove l'avambraccio libero e la valigetta dondola, l'anziano fa dondolare il bastone.
// Col jetpack acceso il pilota raccoglie le gambe come i nemici col jetpack.
// Va caricato dopo soldati.js e coloni.js.

const CAMM={
 // soldati: misure del passo in pixel dell'immagine originale
 sold:{
  avanti:215,dietro:285,      // dove appoggia il piede davanti all'anca e dove lo stacca dietro
  appoggio:[.44,.27],         // parte del ciclo con il piede a terra: passo di carica → corsa
  alza:[140,250],             // quanto sale il tallone nel ritorno
  bacino:[42,30],             // quanto è piegato il bacino (più basso = più accovacciato)
  molla:[22,40],              // quanto scende il bacino sul piede d'appoggio
  lenta:150,veloce:250        // velocità (unità al secondo) della carica e della corsa
 },
 // coloni: punti delle gambe nelle immagini dimezzate (anca, ginocchio, caviglia); taglio = dove inizia la gamba
 coloni:[
  {dietro:{taglio:445,anca:[203,430],gin:[196,522],cav:[168,690]},avanti:{taglio:445,anca:[288,430],gin:[289,522],cav:[290,690]}},
  {dietro:{taglio:440,anca:[205,425],gin:[200,502],cav:[168,686]},avanti:{taglio:440,anca:[291,425],gin:[287,502],cav:[278,686]}},
  {dietro:{taglio:572,anca:[205,572],gin:[205,572],cav:[192,692]},avanti:{taglio:480,anca:[287,468],gin:[285,555],cav:[288,692]}},
  {dietro:{taglio:470,anca:[200,455],gin:[190,520],cav:[157,692]},avanti:{taglio:470,anca:[272,455],gin:[268,520],cav:[252,692],fine:364}}
 ],
 // parte alta: collo (perno della testa), vita (perno del busto) e pezzi che oscillano da soli
 // (rettangolo [x0,y0,x1,y1] e perno): il braccio libero e la valigetta del bambino, il bastone dell'anziano
 corpo:[
  {collo:[245,142],vita:[225,325]},
  {collo:[238,142],vita:[225,325]},
  {collo:[255,182],braccio:{r:[333,362,512,482],perno:[338,362]},valigia:{r:[100,452,237,578],perno:[178,448]}},
  {collo:[248,152],bastone:{r:[364,372,512,768],perno:[378,362]}}
 ],
 sfuma:12                     // pixel di sfumatura dove i pezzi si sovrappongono
};

// ---------------------------------------------------------------- soldati
function cammMix(a,w){return a[0]+(a[1]-a[0])*w}
function cammLiscio(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}

// Avanza la fase del passo con la distanza percorsa (o.run cresce di 0,05 per unità percorsa).
function cammFase(o,T,w){
 const run=o.run||0;let d=o._cammRun===undefined?0:Math.abs(run-o._cammRun)/.05;
 o._cammRun=run;if(d>60)d=0;
 const C=CAMM.sold,st=cammMix(C.appoggio,w),passo=(C.avanti+C.dietro)*T.S/st;
 if(o._cammFase===undefined)o._cammFase=((run*.2)%1+1)%1;
 o._cammFase=(o._cammFase+d/passo)%1;
 return o._cammFase;
}

// Punto della caviglia rispetto al suolo durante il ciclo (0 = il piede tocca terra davanti).
function cammPiede(c,st,w){
 const C=CAMM.sold;
 if(c<st){
  const u=c/st,x=C.avanti-(C.avanti+C.dietro)*u;
  const tallone=u>.7?((u-.7)/.3)**2*(50+40*w):0;
  return [x,-tallone];
 }
 const t=(c-st)/(1-st);
 // il piede prima sale dietro (tallone verso il sedere), poi la gamba si stende avanti e scende
 const x=-C.dietro+(C.avanti+C.dietro+25)*cammLiscio((t-.12)/.88)-25*cammLiscio((t-.85)/.15)-25*w*Math.sin(Math.PI*Math.min(1,t/.5));
 const y=Math.sin(Math.PI*Math.min(1,t**.8))*cammMix(C.alza,w)*(1-.35*cammLiscio((t-.6)/.4));
 return [x,-y];
}

const cammSoldOrig=typeof soldPosa==='function'?soldPosa:null;
if(cammSoldOrig){
 soldPosa=function(T,o,now){
  const p=cammSoldOrig(T,o,now);
  // col jetpack acceso il pilota tiene le gambe raccolte come i soldati nemici col jetpack
  if(o.jetOn&&!o.ground&&!o.crouch){
   const D=T.gamba.D,A=T.gamba.A,up=(o.vy||0)<0?1:.6;
   p.fD=[D.cav[0]+70,D.cav[1]-150*up];p.fA=[A.cav[0]-80,A.cav[1]-220*up];
   return p;
  }
  const moving=!o.crouch&&o.ground&&Math.abs(o.vx||0)>20;
  if(!moving)return p;
  const C=CAMM.sold,spd=Math.abs(o.vx),w=cammLiscio((spd-C.lenta)/(C.veloce-C.lenta));
  const dir=Math.sign(o.vx)*(o.face||1),st=cammMix(C.appoggio,w),f=cammFase(o,T,w);
  const D=T.gamba.D,A=T.gamba.A,base=(D.anca[0]+A.anca[0])/2;
  const leg=(g,c)=>{const [x,y]=cammPiede(c,st,w);return [g.anca[0]+(g.anca[0]-base)*.35+25+dir*x,g.cav[1]+y]};
  p.fA=leg(A,f);p.fD=leg(D,(f+.5)%1);
  // bacino: scende sul piede d'appoggio, sale quando entrambi i piedi sono staccati
  const molla=c=>c<st?Math.sin(Math.PI*c/st):0;
  const m=Math.max(molla(f),molla((f+.5)%1));
  p.hy=cammMix(C.bacino,w)+cammMix(C.molla,w)*(m-.45);
  p.hx=dir*(18+16*w);
  // il busto ondeggia appena a ogni passo, il fucile resta sul bersaglio
  const onda=Math.sin(4*Math.PI*f);
  p.lean+=dir*(.06+.08*w)+onda*.03;
  p.arm=Math.max(SOLD.armMin,Math.min(SOLD.armMax,p.arm-onda*.012-dir*(.06+.08*w)));
  return p;
 };
}

// ---------------------------------------------------------------- coloni
// Ogni immagine viene tagliata una volta in busto, cosce e stinchi (con i bordi sfumati).
function cammTaglia(a,G){
 const im=a.image,F=CAMM.sfuma,W=512,H=768;
 const tela=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c};
 const fuori=(x,c,x0,x1,y0,y1,su,giu)=>{ // tiene solo il rettangolo, sfumando sopra e/o sotto
  x.globalCompositeOperation='destination-in';
  const g=x.createLinearGradient(0,y0,0,y1);
  g.addColorStop(0,su?'rgba(0,0,0,0)':'#000');g.addColorStop(Math.min(.5,F/(y1-y0)),'#000');
  g.addColorStop(Math.max(.5,1-F/(y1-y0)),'#000');g.addColorStop(1,giu?'rgba(0,0,0,0)':'#000');
  x.fillStyle=g;x.fillRect(x0,y0,x1-x0,y1-y0);
  x.globalCompositeOperation='destination-out';x.fillStyle='#000';
  x.fillRect(0,0,W,y0);x.fillRect(0,y1,W,H-y1);x.fillRect(0,y0,x0,y1-y0);x.fillRect(x1,y0,W-x1,y1-y0);
  x.globalCompositeOperation='source-over';
 };
 const strisce={dietro:[0,a.split],avanti:[a.split,G.avanti.fine||a.right]};
 const busto=tela(),b=busto.getContext('2d');b.drawImage(im,0,0);
 b.globalCompositeOperation='destination-out';
 const out={busto,gambe:{}};
 for(const k of ['dietro','avanti']){
  const L=G[k],[x0,x1]=strisce[k];
  const g=b.createLinearGradient(0,L.taglio,0,L.taglio+F);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'#000');
  b.fillStyle=g;b.fillRect(x0,L.taglio,x1-x0,F);b.fillStyle='#000';b.fillRect(x0,L.taglio+F,x1-x0,H);
  const coscia=L.gin[1]>L.anca[1]+4?tela():null;
  if(coscia){const x=coscia.getContext('2d');x.drawImage(im,0,0);fuori(x,coscia,x0,x1,L.taglio-8,L.gin[1]+F,false,true)}
  const stinco=tela(),x=stinco.getContext('2d');x.drawImage(im,0,0);fuori(x,stinco,x0,x1,(coscia?L.gin[1]:L.taglio)-8,H,false,false);
  out.gambe[k]={coscia,stinco};
 }
 // pezzi che oscillano da soli: tolti dal busto e tenuti a parte
 const K=CAMM.coloni.indexOf(G),B=CAMM.corpo[K]||{};
 out.pezzi={};
 for(const n of ['braccio','valigia','bastone'])if(B[n]){
  const [x0,y0,x1,y1]=B[n].r,c=tela(),x=c.getContext('2d');
  x.drawImage(busto,x0,y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);
  b.fillStyle='#000';b.fillRect(x0,y0,x1-x0,y1-y0);out.pezzi[n]=c;
 }
 // testa e petto: strati separati con il bordo inferiore sfumato sopra lo strato successivo
 const strato=(y0,y1)=>{const c=tela(),x=c.getContext('2d');x.drawImage(busto,0,0);
  x.globalCompositeOperation='destination-out';x.fillStyle='#000';x.fillRect(0,0,W,y0);
  const g=x.createLinearGradient(0,y1,0,y1+F);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'#000');
  x.fillStyle=g;x.fillRect(0,y1,W,F);x.fillStyle='#000';x.fillRect(0,y1+F,W,H);return c};
 if(B.collo){
  out.testa=strato(0,B.collo[1]);
  if(B.vita)out.petto=strato(B.collo[1]-2,B.vita[1]);
  b.fillStyle='#000';b.fillRect(0,0,W,(B.vita||B.collo)[1]);
 }
 b.globalCompositeOperation='source-over';
 return out;
}

// Angolo "in avanti" di un segmento (0 = verticale, positivo = verso dove guarda la figura).
function cammAng(p,q){return Math.atan2(q[0]-p[0],q[1]-p[1])}

// Posa delle gambe: angolo della coscia e piega del ginocchio a una fase del passo.
function cammPosaColono(fi,aria,k){
 if(aria)return k==='avanti'?{a:.62,b:1.05}:{a:-.15,b:1.15};
 const sw=Math.max(0,Math.cos(fi));         // ritorno della gamba: il ginocchio si piega molto
 const ap=Math.max(0,-Math.cos(fi));        // appoggio: piccola piega che fa da molla
 return {a:.1+.64*Math.sin(fi),b:.15+1.55*sw**1.4+.35*ap};
}

function cammCatena(L,P){
 // ritorna le trasformazioni della coscia e dello stinco e la posizione della caviglia
 const lc=Math.hypot(L.gin[0]-L.anca[0],L.gin[1]-L.anca[1]),ls=Math.hypot(L.cav[0]-L.gin[0],L.cav[1]-L.gin[1]);
 const rc=cammAng(L.anca,L.gin),rs=cammAng(L.gin,L.cav);
 const kx=L.anca[0]+Math.sin(P.a)*lc,ky=L.anca[1]+Math.cos(P.a)*lc;
 const s=P.a-P.b,ax=kx+Math.sin(s)*ls,ay=ky+Math.cos(s)*ls;
 return {rc:-(P.a-rc),rs:-(s-rs),kx,ky,ax,ay};
}

const cammColOrig=typeof pfColonistSprite==='function'?pfColonistSprite:null;
const cammPezzi={};
if(cammColOrig){
 pfColonistSprite=function(h,now){
  if(h.state!=='fuga'||typeof document==='undefined')return cammColOrig(h,now);
  const variant=h.variant??((h.id??0)+selected*2),i=variant%COLONI.length,a=COLONI[i],im=a.image;
  if(!im?.complete||!im.naturalWidth)return false;
  const G=CAMM.coloni[Math.floor(i/2)];
  if(!cammPezzi[i]){try{cammPezzi[i]=cammTaglia(a,G)}catch(e){cammPezzi[i]=false}}
  const pz=cammPezzi[i];if(!pz)return cammColOrig(h,now);
  const fi=(h.stride||0)*.062+(h.id||0)*.7,aria=!!h.air;
  const cat={};let piede=0,rest=0;
  for(const k of ['dietro','avanti']){
   const L=G[k],P=cammPosaColono(k==='dietro'?fi+Math.PI:fi,aria,k);
   // la coscia del bambino dietro la valigetta non si vede: si muove solo dal ginocchio in giù
   if(L.gin[1]<=L.anca[1]+4){P.b=P.b-P.a;P.a=0}
   cat[k]=cammCatena(L,P);piede=Math.max(piede,cat[k].ay);rest=Math.max(rest,L.cav[1]);
  }
  // il piede più basso tocca terra; in volo (tra un passo e l'altro) il corpo si stacca un poco
  const volo=aria?0:Math.max(0,Math.sin(2*fi))**2*20;
  const giu=rest-piede-volo;
  const height=typeof SOLD==='undefined'?66:SOLD.H,s=height/(a.foot-a.top);
  if(!aria&&typeof gShadow==='function')gShadow(h.x,h.y,14,.32);
  ctx.save();ctx.translate(h.x,h.y);
  ctx.scale(-s,s);ctx.rotate(.17+Math.sin(2*fi)*.035);
  ctx.translate(-250,-a.foot+giu);
  for(const k of ['dietro','avanti']){
   const L=G[k],c=cat[k],pp=pz.gambe[k];
   ctx.save();ctx.translate(c.kx,c.ky);ctx.rotate(c.rs);ctx.translate(-L.gin[0],-L.gin[1]);ctx.drawImage(pp.stinco,0,0);ctx.restore();
   if(pp.coscia){ctx.save();ctx.translate(L.anca[0],L.anca[1]);ctx.rotate(c.rc);ctx.translate(-L.anca[0],-L.anca[1]);ctx.drawImage(pp.coscia,0,0);ctx.restore()}
  }
  const B=CAMM.corpo[Math.floor(i/2)],P=pz.pezzi,rimb=Math.sin(2*fi);
  const ruota=(p,ang,img)=>{ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(ang);ctx.translate(-p[0],-p[1]);if(img)ctx.drawImage(img,0,0)};
  ctx.drawImage(pz.busto,0,0);
  // valigetta: dondola appesa alla mano (sotto resta la sua copia ferma, così non si apre un buco)
  if(P.valigia){ctx.drawImage(P.valigia,0,0);ruota(B.valigia.perno,aria?.15:.09*Math.sin(fi+2.4),P.valigia);ctx.restore()}
  // busto che si piega a ogni passo, poi testa che segue in ritardo
  if(pz.petto)ruota(B.vita,(aria?.08:.07+.06*Math.sin(2*fi-.6)),pz.petto);
  if(pz.testa){ruota(B.collo,aria?-.08:(pz.petto?-.05:.03)+.08*Math.sin(2*fi-1.4),pz.testa);ctx.restore()}
  if(pz.petto)ctx.restore();
  // braccio libero del bambino: oscilla al contrario della gamba vicina
  if(P.braccio){ruota(B.braccio.perno,aria?-.5:.42*Math.sin(fi)-.05*rimb,P.braccio);ctx.restore()}
  // bastone dell'anziano: dondola nella mano
  if(P.bastone){ruota(B.bastone.perno,aria?-.35:-.32*Math.sin(fi)+.1,P.bastone);ctx.restore()}
  ctx.restore();
  return true;
 };
}
