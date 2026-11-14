// Conex — SFONDO A TERRA IN ALTA DEFINIZIONE (2026-11-14).
// Montagne, faraglioni, isole e costruzioni della missione a terra erano sagome piatte e, sugli schermi
// grandi, sgranate (gli strati lontani erano dipinti a mezza risoluzione). Ora:
// 1) DEFINIZIONE: in ULTRA gli strati dello sfondo si dipingono fino al doppio della risoluzione di prima
//    (bordi delle montagne nitidi in 4K). Negli altri preset resta la risoluzione di prima (memoria dei telefoni).
// 2) RILIEVO su ogni strato (gCropLayer di grafica2.js): bordo illuminato dal lato del sole, ombra sul lato
//    opposto, roccia a creste e canaloni che sfuma nella foschia scendendo. Vale per tutto quello che c'è
//    nello strato: montagne, faraglioni, mesas, isole sospese, costruzioni.
//    È fatto con operazioni di composizione del canvas (sagoma spostata, trama in "overlay"), quindi veloce
//    anche ad alta risoluzione; la trama della roccia si calcola una volta sola per tutta la partita.
// 3) COSTRUZIONI LONTANE disegnate in dettaglio (gDistantLandmarks): gru a traliccio, piloni con finestre
//    accese, serbatoi, ciminiere, passerelle e antenne con il faro, diverse per ogni tipo di pianeta.
// 4) SKYLINE della colonia più ricco (plzSkyline di palazzi.js): due file di torri, tetti a gradoni,
//    piani illuminati, spigoli in luce, impianti sui tetti.
// Tutto viene dipinto UNA volta quando si prepara il livello e poi solo copiato:
// in gioco nessun costo in più (niente shadowBlur, ctx.filter o gradienti a ogni fotogramma).
// Va caricato dopo grafica2.js e palazzi.js.

const SHD={
 forza:[.55,.7,.85,1],    // intensità del rilievo per strato, dal più lontano al più vicino
 passi:[1.2,2.5,4.5,7.5],  // spostamenti (unità di mondo) della sagoma verso il sole: bordo in luce
 luce:[.34,.24,.15,.09],   // quanto è chiaro il bordo per ogni passo
 ombra:[.30,.2,.12,.07],   // quanto è scuro il lato opposto
 trama:.85,                // forza della trama della roccia (overlay)
 fasce:[10,24,44,72,110,160], // profondità (unità) alle quali la trama si attenua scendendo
 resUltra:2.4,resBase:1.2  // tetto della risoluzione degli strati: ULTRA / altri preset (grafica2.js usa 1.2)
};
const shdOrig={gCropLayer:typeof gCropLayer==='function'?gCropLayer:null,gDistantLandmarks:typeof gDistantLandmarks==='function'?gDistantLandmarks:null,plzSkyline:typeof plzSkyline==='function'?plzSkyline:null,gMakeLayers:typeof gMakeLayers==='function'?gMakeLayers:null};

// ---------------------------------------------------------------- rumore 2D ripetibile (valori su griglia, periodo P)
function shdH(i,j,s){let h=Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function shdN(x,y,s,Px,Py){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const X0=((xi%Px)+Px)%Px,X1=(X0+1)%Px,Y0=((yi%Py)+Py)%Py,Y1=(Y0+1)%Py;
 const a=shdH(X0,Y0,s),b=shdH(X1,Y0,s),c=shdH(X0,Y1,s),d=shdH(X1,Y1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
// trama della roccia 512×512 (1 pixel = 1 unità di mondo), ripetibile: creste, scaglie e canaloni verticali.
// Variante "strati" (deserto): in più le stratificazioni orizzontali dell'arenaria, un po' ondulate.
const shdTexs={};
function shdTexture(kind='roccia'){
 if(shdTexs[kind]!==undefined)return shdTexs[kind]||null;
 shdTexs[kind]=false;
 const S=512,cv=gCanvas(S,S);if(!cv||typeof cv.g.createImageData!=='function')return null;
 const img=cv.g.createImageData(S,S),D=img.data,strati=kind==='strati';
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const u=x/S,v=y/S;let r=0,a=.5,n=0;
  for(const P of [16,32,64]){const t=shdN(u*P,v*P,P,P,P);r+=a*(1-Math.abs(2*t-1));n+=a;a*=.5}r/=n;     // creste
  const fine=shdN(u*128,v*128,7,128,128),gul=shdN(u*48,v*6,13,48,6)*.6+shdN(u*96,v*12,17,96,12)*.4; // scaglie, canaloni
  let val=.5+(r-.62)*(strati?.6:.95)+(fine-.5)*.22+(gul-.5)*.55;
  if(strati){const wob=shdN(u*8,v*8,23,8,8)*10,band=Math.sin((y+wob)*.42)*.5+.5,thin=Math.sin((y+wob*1.6)*1.37)*.5+.5;
   val+=(band-.5)*.32+(Math.pow(thin,8)-.1)*.25}
  const o=(y*S+x)*4,c=Math.max(0,Math.min(255,val*255));
  D[o]=D[o+1]=D[o+2]=c;D[o+3]=255;
 }
 cv.g.putImageData(img,0,0);shdTexs[kind]=cv.c;return cv.c;
}

// ---------------------------------------------------------------- 1) più definizione in ULTRA
function shdLayerCap(){try{return grfx.p==='ultra'?SHD.resUltra:SHD.resBase}catch(e){return SHD.resBase}}
// gMakeLayers usa Math.min(1.2,gfx.res): per gli strati si fa vedere una gfx.res "scalata" in modo che il
// risultato sia Math.min(tetto,gfx.res) (il resto del livello continua a usare la gfx.res vera).
if(shdOrig.gMakeLayers)gMakeLayers=function(){
 const cap=shdLayerCap();if(cap<=SHD.resBase||typeof gfx==='undefined'||!gfx)return shdOrig.gMakeLayers.apply(this,arguments);
 const real=gfx.res,want=Math.min(cap,real),k=want/SHD.resBase;
 if(k<=1)return shdOrig.gMakeLayers.apply(this,arguments);
 // i canvas degli strati vengono creati con gCanvas(G_TL*RB, LH*RB) e g.scale(RB,RB): ingrandisco di k
 // solo quelli (larghezza G_TL*RB con RB della tabella di gMakeLayers), non gli altri (es. il ritaglio)
 const gc=gCanvas,base=Math.min(SHD.resBase,real),RBs=[.5,.62,.8,1].map(f=>G_TL*base*f);
 gCanvas=function(w,h){const big=RBs.some(x=>Math.abs(x-w)<.01),cv=gc(big?w*k:w,big?h*k:h);
  if(cv&&big){const s=cv.g.scale.bind(cv.g);let first=true;cv.g.scale=function(a,b){if(first){first=false;return s(a*k,b*k)}return s(a,b)}}return cv};
 shdScaleK=k;
 try{return shdOrig.gMakeLayers.apply(this,arguments)}finally{gCanvas=gc;shdScaleK=1}
};
let shdScaleK=1;

// ---------------------------------------------------------------- 2) rilievo: strati lontani, rocce vicine, palazzi
function shdLayerIndex(par){const P=[.035,.09,.17,.29];let k=0;for(let i=1;i<4;i++)if(Math.abs(P[i]-par)<Math.abs(P[k]-par))k=i;return k}
// Rilievo su un'immagine già dipinta (c), con R pixel per unità di mondo. o = {
//  F forza, passi/luce/ombra (bordo in luce e lato in ombra), trama (0 = niente), tipo ('roccia'|'strati'),
//  fasce (attenuazione della trama scendendo), foschia [colore, alfa] in basso, rim colore del bordo in luce }
function shdReliefCanvas(c,R,o){
 const w=c.width,h=c.height;if(!w||!h)return false;
 const m=gMat(),sunLeft=m.sunPos[0]<.5,Lx=sunLeft?-.72:.72,Ly=-.69;// verso il sole (in alto)
 const t=gCanvas(w,h);if(!t)return false;const tg=t.g,g=c.getContext('2d');
 g.save();g.setTransform(1,0,0,1,0,0);
 // bordo in luce: dove, spostandosi verso il sole, si esce dalla sagoma; ombra dal lato opposto
 const band=(dx,dy,color,alpha)=>{
  tg.globalCompositeOperation='source-over';tg.globalAlpha=1;tg.clearRect(0,0,w,h);tg.drawImage(c,0,0);
  tg.globalCompositeOperation='source-in';tg.fillStyle=color;tg.fillRect(0,0,w,h);
  tg.globalCompositeOperation='destination-out';tg.drawImage(c,dx,dy);
  g.globalCompositeOperation='source-atop';g.globalAlpha=Math.min(1,alpha);g.drawImage(t.c,0,0);
 };
 const lit=gRgb(gMix(o.rim,[255,255,255],.25));
 for(let i=0;i<o.passi.length;i++){const p=o.passi[i]*R;
  band(-Lx*p,-Ly*p,lit,o.luce[i]*o.F*1.6);
  band(Lx*p,Ly*p,'#000',o.ombra[i]*o.F*1.6);
 }
 // trama della roccia, forte sotto il bordo superiore e sempre più debole scendendo
 const tex=o.trama?shdTexture(o.tipo):null;
 if(tex&&typeof tg.createPattern==='function'){
  tg.globalCompositeOperation='source-over';tg.globalAlpha=1;tg.clearRect(0,0,w,h);tg.drawImage(c,0,0);
  tg.globalCompositeOperation='destination-out';tg.globalAlpha=.2;for(const d of o.fasce)tg.drawImage(c,0,d*R);
  tg.globalAlpha=1;tg.globalCompositeOperation='source-in';
  const pat=tg.createPattern(tex,'repeat');if(pat&&pat.setTransform&&typeof DOMMatrix==='function')pat.setTransform(new DOMMatrix().scale(R,R).translate(o.sposta||0,(o.sposta||0)*.43));
  tg.fillStyle=pat;tg.fillRect(0,0,w,h);
  g.globalCompositeOperation='overlay';g.globalAlpha=o.trama*o.F;g.drawImage(t.c,0,0);
 }
 // foschia alla base: separa gli strati uno dall'altro
 if(o.foschia){const f=g.createLinearGradient(0,h*.35,0,h);f.addColorStop(0,gRgb(o.foschia[0],0));f.addColorStop(1,gRgb(o.foschia[0],o.foschia[1]));
  g.globalCompositeOperation='source-atop';g.globalAlpha=1;g.fillStyle=f;g.fillRect(0,0,w,h)}
 g.restore();
 t.c.width=t.c.height=1;// libera subito la memoria del canvas di lavoro
 return true;
}
function shdTheme(){const th=pf.theme||pfTheme(pf.p);return{th,id:th.id,rim:gHex(th.rim||'#ffffff'),sky:gHex((th.sky&&th.sky[2])||'#203040')}}
function shdRelief(cv,par,RB){
 const k=shdLayerIndex(par),T=shdTheme();
 return shdReliefCanvas(cv.c,RB*shdScaleK,{F:SHD.forza[k],passi:SHD.passi,luce:SHD.luce,ombra:SHD.ombra,trama:SHD.trama,
  tipo:T.id==='deserto'?'strati':'roccia',fasce:SHD.fasce,rim:T.rim,sposta:k*131,foschia:[T.sky,[.22,.18,.13,.08][k]]});
}
if(shdOrig.gCropLayer)gCropLayer=function(cv,par,top,RB){
 try{if(typeof pf!=='undefined'&&pf&&pf.p)shdRelief(cv,par,RB)}catch(e){console.warn('rilievo sfondo non disponibile',e)}
 return shdOrig.gCropLayer.call(this,cv,par,top,RB*shdScaleK);
};
// rocce in primo piano (blocchi di terreno): spigolo superiore in luce, crepe in ombra, strati e canaloni
if(typeof gSolidCache==='function'){
 const orig=gSolidCache;
 gSolidCache=function(sd){
  const had=gfx&&gfx.solids&&gfx.solids.has(sd),out=orig.apply(this,arguments);
  if(out&&!had&&!out.shd){out.shd=true;try{const T=shdTheme();
   shdReliefCanvas(out.c,gfx.res,{F:1,passi:[.8,1.8,3.2],luce:[.30,.18,.10],ombra:[.22,.14,.08],trama:T.id==='lava'?.35:.6,
    tipo:T.id==='deserto'?'strati':'roccia',fasce:[8,20,40,70,110],rim:T.rim,sposta:sd.x%512})}catch(e){console.warn('rilievo rocce non disponibile',e)}}
  return out;
 };
}
// palazzi della colonia: spigoli arrotondati in cima alle facciate e smussatura (bisello) su tutto il palazzo
if(typeof plzFacade==='function'){
 const orig=plzFacade;
 plzFacade=function(g,x,y,w,h){
  if(typeof g.roundRect!=='function')return orig.apply(this,arguments);
  const r=Math.min(4,w*.14,h*.3);g.save();g.beginPath();g.roundRect(x,y,w,h,[r,r,0,0]);g.clip();
  try{return orig.apply(this,arguments)}finally{g.restore()}
 };
}
if(typeof plzBuilding==='function'){
 const orig=plzBuilding;
 plzBuilding=function(b){
  const out=orig.apply(this,arguments);
  try{const T=shdTheme();shdReliefCanvas(out.c,plz.res,{F:1,passi:[.7,1.4],luce:[.28,.14],ombra:[.25,.12],trama:0,rim:T.rim})}catch(e){}
  return out;
 };
}


// ---------------------------------------------------------------- 3) costruzioni lontane in dettaglio
// pezzi riutilizzabili (coordinate locali: il piede della costruzione è a y=0, l'altezza va verso y negativi)
function shdBox(g,x,y,w,h,C){
 const gr=g.createLinearGradient(x,0,x+w,0),a=C.sunLeft?0:1;gr.addColorStop(a,gRgb(C.lit));gr.addColorStop(.55,gRgb(C.base));gr.addColorStop(1-a,gRgb(C.dark));
 g.fillStyle=gr;if(g.roundRect){g.beginPath();g.roundRect(x,y,w,h,[Math.min(2.5,w*.18),Math.min(2.5,w*.18),0,0]);g.fill()}else g.fillRect(x,y,w,h);
 g.fillStyle=gRgb(C.edge,.75);g.fillRect(C.sunLeft?x:x+w-.9,y,.9,h);// spigolo in luce
 g.fillStyle='rgba(0,0,0,.22)';for(let yy=y+6;yy<y+h-2;yy+=6)g.fillRect(x,yy,w,.5);// piani
}
function shdWindows(g,x,y,w,h,C,rnd,p=.35){
 for(let yy=y+3;yy<y+h-3;yy+=6)for(let xx=x+2;xx<x+w-2.5;xx+=4)if(rnd()<p){g.fillStyle=gRgb(rnd()<.7?C.warm:C.cool,.55+rnd()*.4);g.fillRect(xx,yy,2,2.4)}
}
function shdTruss(g,x0,y0,x1,y1,wd,C){// traliccio fra due punti, larghezza wd
 const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L*wd/2,ny=dx/L*wd/2,n=Math.max(2,Math.round(L/(wd*1.2)));
 g.strokeStyle=gRgb(C.dark);g.lineWidth=1.3;g.beginPath();
 g.moveTo(x0+nx,y0+ny);g.lineTo(x1+nx,y1+ny);g.moveTo(x0-nx,y0-ny);g.lineTo(x1-nx,y1-ny);g.stroke();
 g.lineWidth=.6;g.beginPath();
 for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,ax=x0+dx*t0,ay=y0+dy*t0,bx=x0+dx*t1,by=y0+dy*t1;
  g.moveTo(ax+nx,ay+ny);g.lineTo(bx-nx,by-ny);g.moveTo(ax-nx,ay-ny);g.lineTo(ax+nx,ay+ny)}
 g.stroke();
 g.strokeStyle=gRgb(C.edge,.55);g.lineWidth=.5;g.beginPath();const s=C.sunLeft?1:-1;g.moveTo(x0+nx*s,y0+ny*s);g.lineTo(x1+nx*s,y1+ny*s);g.stroke();
}
function shdAntenna(g,x,y,h,C){
 g.strokeStyle=gRgb(C.dark);g.lineWidth=.9;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h);g.moveTo(x-3,y-h*.55);g.lineTo(x+3,y-h*.55);g.stroke();
 const r=g.createRadialGradient(x,y-h,0,x,y-h,6);r.addColorStop(0,'rgba(255,230,230,.95)');r.addColorStop(.3,'rgba(255,70,90,.7)');r.addColorStop(1,'rgba(255,40,60,0)');
 g.fillStyle=r;g.fillRect(x-6,y-h-6,12,12);
}
function shdTank(g,x,w,h,C){
 shdBox(g,x,-h,w,h,C);g.fillStyle=gRgb(C.lit);g.beginPath();g.ellipse(x+w/2,-h,w/2,w*.16,0,0,6.28);g.fill();
 g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=.5;for(let yy=-h+5;yy<0;yy+=5){g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke()}
}
function shdChimney(g,x,w,h,C,glow){
 shdBox(g,x,-h,w,h,C);g.fillStyle=gRgb(C.dark);g.fillRect(x-1,-h-2,w+2,2.5);
 g.fillStyle='rgba(255,90,80,.85)';for(let yy=-h+6;yy<-6;yy+=14)g.fillRect(x,yy,w,1.2);
 if(glow){const r=g.createRadialGradient(x+w/2,-h,0,x+w/2,-h,16);r.addColorStop(0,glow);r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(x+w/2-16,-h-16,32,32)}
}
function shdCrane(g,x,h,arm,C){// gru portuale: torre a traliccio e braccio
 shdTruss(g,x,0,x,-h,7,C);shdTruss(g,x-arm*.25,-h,x+arm,-h-2,5,C);
 g.strokeStyle=gRgb(C.dark);g.lineWidth=.5;g.beginPath();g.moveTo(x,-h-14);g.lineTo(x+arm*.95,-h-1);g.moveTo(x,-h-14);g.lineTo(x-arm*.24,-h+1);g.moveTo(x+arm*.7,-h);g.lineTo(x+arm*.7,-h+22);g.stroke();
 shdBox(g,x-6,-h+4,12,8,C);g.fillStyle=gRgb(C.warm,.9);g.fillRect(x-4,-h+6,3,2.5);// cabina
 shdBox(g,x-arm*.3,-h-5,arm*.12,8,C);// contrappeso
 shdAntenna(g,x,-h-2,12,C);
}
function shdColors(col,dark,theme){
 const m=gMat(),rim=gHex(theme.rim||'#ffffff');
 return{base:gMix(col,[0,0,0],.08),lit:gMix(gMix(col,m.sun,.22),rim,.12),dark:gMix(dark,[0,0,0],.2),edge:gMix(rim,[255,255,255],.3),
  warm:[255,205,130],cool:[150,230,255],sunLeft:m.sunPos[0]<.5};
}
if(shdOrig.gDistantLandmarks)gDistantLandmarks=function(g,prof,sp,theme,col,dark,seed){
 const id=theme.id,rnd=pfRng(seed+913),C=shdColors(col,dark,theme);
 g.save();g.lineJoin='round';
 for(let i=0;i<4;i++){
  const x=220+i*480+rnd()*100,y=id==='tempesta'?sp.base-15:gProfAt(prof,x)+4;
  g.save();g.translate(x,y);
  if(id==='mare'){
   // porto della colonia costiera: gru, magazzini, faro e serbatoi
   shdBox(g,-62,-26,46,30,C);shdWindows(g,-62,-26,46,30,C,rnd,.3);g.fillStyle=gRgb(C.dark);g.fillRect(-64,-29,50,3);
   shdCrane(g,8,58+rnd()*14,62,C);
   shdTank(g,-12,14,20,C);shdTank(g,46,12,16,C);
   if(i%2===0){shdBox(g,-86,-48,10,52,C);shdWindows(g,-86,-48,10,52,C,rnd,.45);shdAntenna(g,-81,-48,14,C)}
  }else if(id==='deserto'){
   // avamposto fra i ruderi: torri d'acqua, cupole e un'antenna parabolica
   shdBox(g,-58,-34,20,38,C);shdWindows(g,-58,-34,20,38,C,rnd,.25);
   g.fillStyle=gRgb(C.base);g.beginPath();g.arc(-16,4,22,Math.PI,0);g.fill();g.fillStyle=gRgb(C.lit,.6);g.beginPath();g.arc(-16,4,22,Math.PI,Math.PI*1.45);g.lineTo(-16,4);g.fill();
   g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=.6;for(let r=6;r<22;r+=6){g.beginPath();g.arc(-16,4,r,Math.PI,0);g.stroke()}
   shdTruss(g,22,4,22,-46,6,C);shdTank(g,14,16,14,C);g.save();g.translate(16,-46);shdTank(g,0,14,12,C);g.restore();
   g.strokeStyle=gRgb(C.dark);g.lineWidth=2;g.beginPath();g.ellipse(52,-38,13,6,-.5,0,6.28);g.stroke();shdTruss(g,52,4,52,-34,4,C);
   shdAntenna(g,-48,-34,16,C);
  }else if(id==='foresta'){
   // torri di osservazione collegate da passerelle sopra le chiome
   shdTruss(g,-40,8,-40,-62,8,C);shdTruss(g,32,8,32,-50,8,C);
   shdBox(g,-50,-74,20,14,C);shdWindows(g,-50,-74,20,14,C,rnd,.6);shdBox(g,22,-62,20,13,C);shdWindows(g,22,-62,20,13,C,rnd,.6);
   g.strokeStyle=gRgb(C.dark);g.lineWidth=2;g.beginPath();g.moveTo(-30,-64);g.quadraticCurveTo(-4,-56,22,-56);g.stroke();
   g.lineWidth=.5;for(let t=0;t<=10;t++){const xx=-30+t*5.2,yy=-64+8*Math.sin(t/10*Math.PI)*.9;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx,yy-6);g.stroke()}
   shdAntenna(g,-40,-74,18,C);shdAntenna(g,32,-62,12,C);
  }else if(id==='lava'){
   // raffineria: ciminiere che brillano, serbatoi e tubazioni
   shdChimney(g,-50,9,70,C,'rgba(255,150,60,.7)');shdChimney(g,-30,7,54,C,'rgba(255,150,60,.5)');shdChimney(g,26,10,78,C,'rgba(255,160,70,.75)');
   shdTank(g,-14,22,26,C);shdTank(g,42,18,20,C);shdBox(g,-60,-20,90,22,C);shdWindows(g,-60,-20,90,22,C,rnd,.22);
   g.strokeStyle=gRgb(C.dark);g.lineWidth=2.4;g.beginPath();g.moveTo(-45,-30);g.lineTo(-45,-36);g.lineTo(31,-36);g.lineTo(31,-44);g.moveTo(-3,-26);g.lineTo(-3,-36);g.stroke();
   g.strokeStyle=gRgb(C.edge,.4);g.lineWidth=.5;g.beginPath();g.moveTo(-45,-37);g.lineTo(31,-37);g.stroke();
  }else{
   // ripetitori sospesi fra le isole: piattaforma con antenna a traliccio e luci
   g.fillStyle=gRgb(C.base);g.beginPath();g.moveTo(-52,-12);g.lineTo(52,-12);g.lineTo(30,6);g.lineTo(-28,8);g.closePath();g.fill();
   g.fillStyle=gRgb(C.lit,.55);g.fillRect(-52,-13,104,2);shdBox(g,-36,-30,30,18,C);shdWindows(g,-36,-30,30,18,C,rnd,.5);
   shdTruss(g,12,-12,12,-86,7,C);shdTruss(g,12,-60,40,-48,4,C);shdAntenna(g,12,-86,12,C);
   g.fillStyle='rgba(190,170,255,.7)';for(let j=0;j<5;j++)g.fillRect(-48+j*22,-3,6,1.4);
  }
  g.restore();
 }
 g.restore();
};

// ---------------------------------------------------------------- 4) skyline della colonia più ricco
if(shdOrig.plzSkyline)plzSkyline=function(){
 const P=plz.pal,res=Math.min(1.6,plz.res*1.15),TW=PLZ_FAR_W,TH=230,rnd=pfRng(pfHash('skylineHD'+pf.p.code));
 const cv=gCanvas(TW*res,TH*res),g=cv.g;g.scale(res,res);g.translate(0,TH);
 const lights=[];
 // fila più lontana: torri alte e sottili, molto velate
 const row=(far)=>{
  const col=gMix(gMix(P.base,P.sky,far?.5:.3),[0,0,0],far?.15:.3),litC=gMix(col,P.m.sun,far?.12:.22),shad=gMix(col,[0,0,0],.3),edge=gMix(litC,[255,255,255],.25);
  for(let d=0;d<(far?5:4);d++){
   const c0=d*TW/(far?5:4)+rnd()*TW/9,span=(far?150:190)+rnd()*210;
   for(let x=c0;x<c0+span;){
    const w=(far?8:11)+rnd()*(far?16:24),mid=1-Math.abs((x-c0)/span*2-1),h=(far?40:24)+mid*((far?70:56)+rnd()*80)+rnd()*18;
    const gr=g.createLinearGradient(x,0,x+w,0),a=P.sunLeft?0:1;gr.addColorStop(a,gRgb(litC));gr.addColorStop(.6,gRgb(col));gr.addColorStop(1-a,gRgb(shad));
    g.fillStyle=gr;if(g.roundRect){const rr=Math.min(2.2,w*.16);g.beginPath();g.roundRect(x,-h,w,h+2,[rr,rr,0,0]);g.fill()}else g.fillRect(x,-h,w,h+2);
    // tetti a gradoni
    let tw=w,tx=x,ty=-h;const steps=rnd()<.45?1+Math.floor(rnd()*2):0;
    for(let s=0;s<steps;s++){const nw=tw*(.55+rnd()*.2),nx=tx+(tw-nw)/2,nh=6+rnd()*12;g.fillStyle=gr;if(g.roundRect){const rr=Math.min(2,nw*.18);g.beginPath();g.roundRect(nx,ty-nh,nw,nh+.5,[rr,rr,0,0]);g.fill()}else g.fillRect(nx,ty-nh,nw,nh);tx=nx;tw=nw;ty-=nh}
    // spigolo in luce e linee dei piani
    g.fillStyle=gRgb(edge,.65);g.fillRect(P.sunLeft?x:x+w-.8,-h,.8,h);
    if(!far){g.fillStyle='rgba(0,0,0,.18)';for(let yy=-h+5;yy<-2;yy+=5)g.fillRect(x,yy,w,.45)}
    // impianti sui tetti
    if(rnd()<.35){g.fillStyle=gRgb(shad);g.fillRect(tx+tw*.15,ty-4,tw*.3,4);g.fillRect(tx+tw*.6,ty-3,tw*.2,3)}
    if(rnd()<.5){g.fillStyle=gRgb(shad);g.fillRect(tx+tw/2-.4,ty-16,.8,16);lights.push([tx+tw/2,ty-16])}
    // finestre: piani interi accesi a tratti, il resto sparso
    const lit=far?.1:.18;
    for(let yy=-h+4;yy<-4;yy+=far?4:5){const band=rnd()<(far?.06:.1);
     for(let xx=x+2;xx<x+w-2;xx+=far?3:3.5)if(band?rnd()<.85:rnd()<lit){g.fillStyle=gRgb(rnd()<.72?P.warm:P.cool,(far?.25:.4)+rnd()*.35);g.fillRect(xx,yy,far?1.1:1.4,far?1.2:1.7)}}
    x+=w+rnd()*(far?3:5);
   }
  }
 };
 row(true);row(false);
 // nebbia: lo skyline è lontano, velato e sfumato in basso
 g.globalCompositeOperation='source-atop';const f=g.createLinearGradient(0,-TH,0,0);
 f.addColorStop(0,gRgb(P.sky,.12));f.addColorStop(1,gRgb(P.haze,.36));g.fillStyle=f;g.fillRect(0,-TH,TW,TH);
 g.globalCompositeOperation='source-over';
 return{c:cv.c,w:TW,h:TH,lights};
};
