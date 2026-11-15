// Conex — SFONDI DIPINTI DEI PIANETI A TERRA (2026-11-14, esteso il 2026-11-15).
// Nella missione a terra lo sfondo di ogni pianeta è una delle immagini scelte da Fabio
// (dist/sfondi/<pianeta>-<n>.jpg, prese da Output\pianeti): a ogni missione ne viene usata un'altra.
// - Prende il posto di cielo, strati lontani e colonia disegnati a mano; il terreno di gioco resta davanti.
// - Scorre piano (parallasse) e si ripete specchiata, così non si vede la giuntura.
// - La riga "terra" di ogni immagine (dove comincia la sezione del sottosuolo) finisce dietro al terreno
//   di gioco (y≈606): gli edifici stanno appena dietro al pilota.
// - Ridimensionamento bilineare (qualità bassa) come gli strati di grafica2.js: quella alta costava FPS in 4K.
// - Nei sotterranei, sui pianeti senza immagini (UMBRA) e finché l'immagine non è caricata si usa lo
//   sfondo disegnato di prima.
// ANIMAZIONI sopra l'immagine (leggere: immagini pronte, solo posizioni e trasparenze, niente shadowBlur,
// ctx.filter o gradienti a tutto schermo a ogni fotogramma):
// - luci di finestre e antenne che lampeggiano: trovate da sole nell'immagine quando si carica
//   (piccoli punti chiari caldi o azzurri sopra la riga del terreno);
// - acqua, palude, cascate e lava che si muovono: le zone vengono trovate dal colore (lago azzurro,
//   palude verde fluorescente, vene di lava magenta) e sopra scorre una trama di riflessi/colata;
//   la lava pulsa anche di luce;
// - cielo vivo: nuvole che scorrono lente; su NIMBUS la neve, su OMEGA stelle che brillano,
//   su KHEPRI spore luminose che salgono, su LYRA navette che attraversano il cielo.
// Va caricato dopo grafica2.js e dopo gli altri file che toccano gDrawLayer / gDrawSky / pfDrawColony.

const SL={
 par:.12,       // velocità dello scorrimento rispetto alla telecamera
 floor:606,     // dove finisce la riga "terra" dell'immagine, in coordinate del mondo (il terreno è a 600)
 an:.5,         // risoluzione dell'analisi (metà dell'immagine)
 luciMax:46,    // luci che lampeggiano per immagine
 // immagini per pianeta: file e riga del terreno (pixel dell'immagine originale)
 pianeti:{
  LYRA:{img:[['lyra.jpg',650],['lyra-1.jpg',708],['lyra-2.jpg',707],['lyra-3.jpg',707],['lyra-4.jpg',707],['lyra-5.jpg',706]],
   fluido:'acqua',cielo:'nuvole',navette:true},
  VESPER:{img:[['vesper-1.jpg',725],['vesper-2.jpg',721],['vesper-3.jpg',736],['vesper-4.jpg',721],['vesper-5.jpg',721],['vesper-6.jpg',721]],
   fluido:null,cielo:'nuvole'},
  NIMBUS:{img:[['nimbus-1.jpg',704],['nimbus-2.jpg',706],['nimbus-3.jpg',741],['nimbus-4.jpg',706],['nimbus-5.jpg',706]],
   fluido:null,cielo:'neve'},
  KHEPRI:{img:[['khepri-1.jpg',800],['khepri-2.jpg',800],['khepri-3.jpg',780]],
   fluido:'palude',cielo:'spore'},
  OMEGA:{img:[['omega-1.jpg',713],['omega-2.jpg',713],['omega-3.jpg',713],['omega-4.jpg',713]],
   fluido:'lava',cielo:'stelle'}
 }
};
const slCache=new Map();// file -> {img, ready, an}
let slOn=false,slSel=null;// slSel: immagine scelta per la missione in corso
let slGiro=0;try{slGiro=+localStorage.getItem('conexSfondoGiro')||0}catch(e){}

function slFile(f){return'sfondi/'+f+'?v=20261115a'}
function slLoad(f){
 let e=slCache.get(f);if(e)return e;
 e={img:null,ready:false,an:null};slCache.set(f,e);
 try{const i=new Image();i.decoding='async';i.onload=()=>{e.ready=true};i.src=slFile(f);e.img=i;if(i.complete&&i.naturalWidth>0)e.ready=true}catch(err){}
 return e;
}
// sceglie l'immagine della missione (una diversa a ogni missione, a giro)
function slPick(){
 if(typeof pf==='undefined'||!pf||!pf.p)return null;
 if(slSel&&slSel.pf===pf)return slSel;
 const conf=SL.pianeti[pf.p.name];
 if(!conf){slSel={pf,conf:null};return slSel}
 const k=slGiro++%conf.img.length;try{localStorage.setItem('conexSfondoGiro',String(slGiro))}catch(e){}
 const [file,terra]=conf.img[k];
 slSel={pf,conf,file,terra,e:slLoad(file),fx:null};return slSel;
}
function slAttivo(){
 if(typeof pf==='undefined'||!pf||!pf.p||pf.under)return false;
 const s=slPick();if(!s||!s.conf)return false;
 const e=s.e;if(!e.ready&&e.img&&e.img.complete&&e.img.naturalWidth>0)e.ready=true;
 return e.ready;
}

// ---------------------------------------------------------------- analisi dell'immagine (una volta sola)
function slCanvas(w,h){try{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d');return g?{c,g}:null}catch(e){return null}}
function slAnalyze(s){
 const e=s.e;if(e.an!==null)return e.an||null;e.an=false;
 const img=e.img,W=img.naturalWidth,H=img.naturalHeight,A=SL.an,w=Math.round(W*A),h=Math.round(H*A);
 const cv=slCanvas(w,h);if(!cv||typeof cv.g.getImageData!=='function')return null;
 cv.g.drawImage(img,0,0,w,h);
 let d;try{d=cv.g.getImageData(0,0,w,h).data}catch(err){return null}
 const terra=s.terra*A,an={w,h,A,luci:[],stelle:[],mask:null,fondo:'#0b1a2a'};
 // colore medio delle ultime righe: riempie lo schermo sotto l'immagine se serve
 {let r=0,g=0,b=0,n=0;for(let y=h-4;y<h;y++)for(let x=0;x<w;x+=4){const o=(y*w+x)*4;r+=d[o];g+=d[o+1];b+=d[o+2];n++}an.fondo=`rgb(${r/n|0},${g/n|0},${b/n|0})`}
 // luci: in celle 6x6 il pixel più chiaro caldo o azzurro, sopra il terreno, distanti fra loro
 const cand=[];
 for(let cy=0;cy<terra-2;cy+=6)for(let cx=0;cx<w;cx+=6){let best=0,bx=0,by=0,warm=true;
  for(let y=cy;y<Math.min(cy+6,terra);y++)for(let x=cx;x<Math.min(cx+6,w);x++){const o=(y*w+x)*4,r=d[o],g=d[o+1],b=d[o+2],l=r*.3+g*.59+b*.11;
   const isW=r>215&&g>150&&b<150&&r-b>80,isC=b>215&&g>190&&r<170&&b-r>60;
   if((isW||isC)&&l>best){best=l;bx=x;by=y;warm=isW}}
  if(best>0)cand.push([bx,by,best,warm])}
 cand.sort((a,b)=>b[2]-a[2]);
 for(const c of cand){if(an.luci.length>=SL.luciMax)break;if(an.luci.every(q=>Math.abs(q[0]-c[0])+Math.abs(q[1]-c[1])>14))an.luci.push(c)}
 // stelle (cielo scuro): punti chiari isolati nella parte alta
 if(s.conf.cielo==='stelle')for(let y=2;y<h*.3;y+=3)for(let x=2;x<w;x+=3){const o=(y*w+x)*4,l=d[o]*.3+d[o+1]*.59+d[o+2]*.11;if(l>175&&an.stelle.length<90){const o2=((y+3)*w+x)*4,l2=d[o2]*.3+d[o2+1]*.59+d[o2+2]*.11;if(l-l2>60)an.stelle.push([x,y])}}
 // zone di fluido: maschera (alfa = quanto è fluido)
 const fl=s.conf.fluido;
 if(fl){const m=slCanvas(w,h);if(m){const md=m.g.createImageData(w,h),D=md.data;let tot=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*4,r=d[o],g=d[o+1],b=d[o+2];let a=0;
   if(fl==='acqua'){if(y>terra-150*A&&y<terra+2&&b>150&&b>r+50&&g>110)a=Math.min(1,(b-r-50)/90)}
   else if(fl==='palude'){if(g>140&&g>r+15&&g>b+40&&r>70)a=Math.min(1,(g-b-40)/110)}
   else if(fl==='lava'){if(r>150&&b>90&&g<120&&r>g+60)a=Math.min(1,(r-g-60)/120)}
   if(a>.05){D[o]=255;D[o+1]=255;D[o+2]=255;D[o+3]=a*255;tot++}}
  m.g.putImageData(md,0,0);if(tot>w*h*.003)an.mask=m.c}}
 e.an=an;return an;
}

// ---------------------------------------------------------------- immagini pronte per le animazioni
let slSpr=null;
function slSprites(){
 if(slSpr)return slSpr;slSpr={};
 const glow=col=>{const c=slCanvas(32,32);if(!c)return null;const r=c.g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,col);r.addColorStop(1,'rgba(0,0,0,0)');c.g.fillStyle=r;c.g.fillRect(0,0,32,32);return c.c};
 slSpr.caldo=glow('rgba(255,200,110,.8)');slSpr.freddo=glow('rgba(120,230,255,.8)');slSpr.rosso=glow('rgba(255,60,80,.85)');slSpr.verde=glow('rgba(160,255,140,.8)');slSpr.bianco=glow('rgba(220,235,255,.7)');
 // nuvola: tanti cerchi sfumati sovrapposti
 const nv=slCanvas(256,96);if(nv){const g=nv.g;for(let i=0;i<14;i++){const x=30+Math.random()*196,y=34+Math.random()*30,r=18+Math.random()*26,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}slSpr.nuvola=nv.c}
 // trame che scorrono sui fluidi: increspature orizzontali (acqua, palude) e striature verticali (lava, cascate)
 const tr=slCanvas(256,256);if(tr){const g=tr.g;for(let i=0;i<140;i++){const x=Math.random()*256,y=Math.random()*256,l=10+Math.random()*40,a=.15+Math.random()*.45;g.fillStyle=`rgba(255,255,255,${a})`;g.fillRect(x,y,l,1.2);g.fillRect(x-256,y,l,1.2)}slSpr.trama=tr.c}
 const st=slCanvas(256,256);if(st){const g=st.g;for(let i=0;i<120;i++){const x=Math.random()*256,y=Math.random()*256,l=8+Math.random()*30,a=.15+Math.random()*.5;g.fillStyle=`rgba(255,255,255,${a})`;g.fillRect(x,y,1.4,l);g.fillRect(x,y-256,1.4,l)}slSpr.strie=st.c}
 // navetta
 const nav=slCanvas(40,14);if(nav){const g=nav.g;g.fillStyle='#e8eef4';g.beginPath();g.ellipse(20,7,15,4.5,0,0,6.28);g.fill();g.fillStyle='#5aa8d8';g.beginPath();g.ellipse(23,5.5,6,2.4,0,0,6.28);g.fill();g.fillStyle='rgba(120,220,255,.9)';g.fillRect(3,6,5,2);slSpr.navetta=nav.c}
 return slSpr;
}

// ---------------------------------------------------------------- disegno
// immagine in coordinate del mondo (dopo ctx.scale(s,s)): altezza 0..PF_VH, larghezza VW
function slDraw(cx,VW){
 const s=slSel,img=s.e.img,iw=img.naturalWidth,ih=img.naturalHeight,k=SL.floor/s.terra,w=iw*k,h=ih*k;
 const an=slAnalyze(s),now=performance.now()/1000,spr=slSprites();
 if(h<PF_VH){ctx.fillStyle=an?an.fondo:'#0b1a2a';ctx.fillRect(0,h-2,VW,PF_VH-h+2)}
 const off=((cx*SL.par)%(w*2)+w*2)%(w*2);
 // trama del fluido per questo fotogramma (preparata una volta, poi copiata in ogni ripetizione)
 let fluido=null;
 if(an&&an.mask){
  if(!s.fx)s.fx=slCanvas(an.w,an.h);
  const f=s.fx,fl=s.conf.fluido,tex=fl==='lava'?spr.strie:spr.trama;
  if(f&&tex){const g=f.g;g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,an.w,an.h);
   const pat=g.createPattern(tex,'repeat');
   if(pat){const dx=fl==='acqua'?now*14:fl==='lava'?now*4:now*6,dy=fl==='lava'?now*9:fl==='palude'?now*16:0;
    if(pat.setTransform&&typeof DOMMatrix==='function')pat.setTransform(new DOMMatrix().translate(dx%256,dy%256));
    g.fillStyle=pat;g.fillRect(0,0,an.w,an.h);
    if(fl==='lava'){g.globalAlpha=.35+.25*Math.sin(now*1.7);g.drawImage(an.mask,0,0);g.globalAlpha=1}// la lava pulsa
    g.globalCompositeOperation='destination-in';g.drawImage(an.mask,0,0);g.globalCompositeOperation='source-over';
    fluido=f.c}}
 }
 for(let x=-off,i=0;x<VW;x+=w,i++){
  if(x+w<0)continue;
  ctx.save();
  if(i%2===0)ctx.translate(x,0);else{ctx.translate(x+w,0);ctx.scale(-1,1)}
  ctx.drawImage(img,0,0,w,h);
  if(an){
   const S=k/an.A;// pixel dell'analisi -> mondo
   if(fluido){const fl=s.conf.fluido;ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=fl==='lava'?.55:fl==='palude'?.32:.38;ctx.drawImage(fluido,0,0,w,h)}
   // luci che lampeggiano (alcune respirano piano, altre si accendono e si spengono)
   ctx.globalCompositeOperation='lighter';
   for(let j=0;j<an.luci.length;j++){const L=an.luci[j],ph=j*1.618,blink=j%3===0;
    const a=blink?(Math.sin(now*2.2+ph*3)>.35?.95:0):.35+.3*Math.sin(now*1.3+ph);if(a<=.02)continue;
    const sz=(blink?11:8)*k,sp=j%7===0?spr.rosso:L[3]?spr.caldo:spr.freddo;ctx.globalAlpha=a;ctx.drawImage(sp,L[0]*S-sz/2,L[1]*S-sz/2,sz,sz)}
   // stelle che brillano
   for(let j=0;j<an.stelle.length;j++){const st=an.stelle[j],a=.5+.5*Math.sin(now*(1.5+j%5*.4)+j);if(a<.3)continue;const sz=6*k*(.6+a*.6);ctx.globalAlpha=a;ctx.drawImage(spr.bianco,st[0]*S-sz/2,st[1]*S-sz/2,sz,sz)}
  }
  ctx.restore();
 }
 slSky(s,VW,h,now,spr);
}
// cielo vivo, in coordinate di vista (non ripetuto con l'immagine)
function slSky(s,VW,h,now,spr){
 const tipo=s.conf.cielo,sky=h*.42;ctx.save();
 if((tipo==='nuvole'||tipo==='neve')&&spr.nuvola){
  ctx.globalAlpha=tipo==='neve'?.35:.28;
  for(let i=0;i<6;i++){const sp=4+i*1.7,ww=380+((i*97)%160),span=VW+ww*2,x=((i*331+now*sp)%span)-ww,y=20+((i*53)%Math.max(40,sky-60));ctx.drawImage(spr.nuvola,x,y,ww,ww*.36)}
 }
 if(tipo==='neve'){
  // neve lontana dietro al terreno di gioco: tanti piccoli fiocchi che scendono ondeggiando
  ctx.globalAlpha=.8;ctx.fillStyle='#ffffff';
  for(let i=0;i<160;i++){const sp=22+(i%7)*9,x=((i*137.5)%VW+Math.sin(now*.8+i)*14+VW)%VW,y=((i*71.3)%PF_VH+now*sp)%PF_VH,r=.6+(i%5)*.35;ctx.fillRect(x,y,r*2,r*2)}
 }
 if(tipo==='spore'&&spr.verde){
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<46;i++){const sp=10+(i%6)*5,x=((i*151.7)%VW+Math.sin(now*.7+i*2)*20+VW)%VW,y=PF_VH-((i*83.1+now*sp)%PF_VH),a=.4+.4*Math.sin(now*2+i);if(a<.15)continue;ctx.globalAlpha=a;const sz=7+(i%4)*2;ctx.drawImage(spr.verde,x-sz/2,y-sz/2,sz,sz)}
 }
 if(s.conf.navette&&spr.navetta){
  ctx.globalAlpha=.85;ctx.globalCompositeOperation='source-over';
  for(let i=0;i<3;i++){const sp=60+i*35,span=VW+300,dir=i%2?-1:1,t=(now*sp+i*700)%span,x=dir>0?t-150:VW+150-t,y=sky*(.45+i*.18);
   ctx.save();ctx.translate(x,y);if(dir<0)ctx.scale(-1,1);ctx.drawImage(spr.navetta,-20,-7,40,14);ctx.restore()}
 }
 ctx.restore();
}

// ---------------------------------------------------------------- aggancio al disegno della missione a terra
if(typeof drawPlatform==='function'){
 const orig=drawPlatform;
 drawPlatform=function(){
  slOn=false;try{slOn=state==='platform'&&slAttivo()}catch(e){}
  try{return orig.apply(this,arguments)}finally{slOn=false}
 };
}
// con lo sfondo dipinto i pezzi dello sfondo disegnato a mano non servono (risparmio anche di tempo)
if(typeof gDrawSky==='function'){const o=gDrawSky;gDrawSky=function(){if(slOn)return;return o.apply(this,arguments)}}
if(typeof pfDrawColony==='function'){const o=pfDrawColony;pfDrawColony=function(){if(slOn)return;return o.apply(this,arguments)}}
if(typeof pfDrawThemeBack==='function'){const o=pfDrawThemeBack;pfDrawThemeBack=function(){if(slOn)return;return o.apply(this,arguments)}}
// l'ultimo strato lontano è disegnato sopra mare e foschie: lì si mette l'immagine, gli altri strati si saltano
if(typeof gDrawLayer==='function'){
 const o=gDrawLayer;
 gDrawLayer=function(L,cx,VW){
  if(!slOn)return o.apply(this,arguments);
  const ls=typeof gfx!=='undefined'&&gfx&&gfx.layers;
  if(ls&&L===ls[ls.length-1]){const q=ctx.imageSmoothingQuality;ctx.imageSmoothingQuality='low';try{slDraw(cx,VW)}finally{ctx.imageSmoothingQuality=q}}
 };
}
// a ogni missione a terra si comincia subito a caricare la sua immagine
if(typeof startPlatform==='function'){
 const o=startPlatform;
 startPlatform=function(){const r=o.apply(this,arguments);try{slPick()}catch(e){}return r};
}
