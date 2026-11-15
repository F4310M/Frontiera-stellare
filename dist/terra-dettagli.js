// Conex — DETTAGLI DELLA MISSIONE A TERRA (2026-11-14).
// 1) LIQUIDO IN PRIMO PIANO (gDrawFrontLiquid di grafica2.js): prima era un gradiente con due righe.
//    Ora è una striscia dipinta una volta per livello e fatta scorrere:
//    - acqua: creste delle onde con riflessi, profondità che scurisce, scintillii e schiuma sul bordo;
//    - lava: crosta a placche scure con crepe incandescenti, colata luminosa che scorre;
//    - sabbie mobili: increspature, grana e piccole dune in luce e in ombra;
//    - nubi (tempesta): banchi di nebbia morbidi.
//    Il movimento è dato dallo scorrimento di due strisce a velocità diverse: niente shadowBlur né
//    gradienti nuovi a ogni fotogramma (prima la lava usava shadowBlur a ogni fotogramma).
// 2) CACTUS arrotondati (pfDrawFlora di fase2.js): tronco e braccia tondi, gomiti curvi, cime arrotondate,
//    costole, spine e luce dal lato del sole. Immagine preparata una volta e copiata.
// 3) ALBERI realistici: tronco e rami visibili, chioma fatta di ciuffi di foglie con lato in luce e lato
//    in ombra, forme e dimensioni diverse. Valgono per gli alberi in primo piano (immagini pronte) e per
//    quelli degli strati lontani della foresta (dipinti nello strato, più scuri e velati in lontananza).
// Va caricato dopo grafica2.js, cristalli.js e sfondo-hd.js.

const TD={
 liquidW:1024,     // larghezza (unità di mondo) della striscia del liquido, ripetuta
 scorre:[18,-11],  // velocità delle due strisce (unità al secondo)
 alberi:3,cactus:3 // varianti preparate
};
const tdOrig={gDrawFrontLiquid:typeof gDrawFrontLiquid==='function'?gDrawFrontLiquid:null,pfDrawFlora:typeof pfDrawFlora==='function'?pfDrawFlora:null,gLayerDetails:typeof gLayerDetails==='function'?gLayerDetails:null};
let td=null;// cache per livello: {pf,res,liq:{a,b,R},cactus:[],alberi:[]}

function tdRes(){return Math.max(1,Math.min(2,typeof gfx!=='undefined'&&gfx&&gfx.res?gfx.res:1))}
function tdCache(){
 if(td&&td.pf===pf&&Math.abs(td.res-tdRes())<.3)return td;
 td={pf,res:tdRes(),liq:null,cactus:null,alberi:null};return td;
}
function tdSun(){try{return gMat().sunPos[0]<.5}catch(e){return true}}

// ---------------------------------------------------------------- 1) liquido
const TD_TOP=632,TD_H=PF_VH+40-TD_TOP+8;
function tdLiquidStrips(){
 const C=tdCache();if(C.liq!==null)return C.liq||null;
 C.liq=false;
 const th=pf.theme,id=th.mat==='ghiaccio'?'ghiaccio':th.id,m=gMat(),R=C.res,Wd=TD.liquidW,H=TD_H,w=Math.ceil(Wd*R),h=Math.ceil(H*R);
 const A=gCanvas(w,h),B=gCanvas(w,h);if(!A||!B||typeof A.g.createImageData!=='function')return null;
 const ia=A.g.createImageData(w,h),ib=B.g.createImageData(w,h),da=ia.data,db=ib.data,seed=pfHash('liquido'+pf.p.code)&0xffff;
 // rumore ripetibile lungo la striscia (u in [0,1), periodo intero per): nessuna giuntura fra una copia e l'altra
 const nz=(u,v,s,per,fy)=>shdN(u*per,v*fy,s,per,1e6);
 // NIMBUS (ghiaccio): acqua blu gelida, chiara in superficie e blu profondo in basso (richiesta di Fabio del 15/11)
 const col=id==='lava'?null:id==='ghiaccio'?[[150,214,246],[38,118,186],[8,36,78]]:[gHex(m.liquid[0]),gHex(m.liquid[1]),gHex(m.liquid[2])];
 const sky=gHex(th.sky[2]||'#203040'),foam=[235,250,255];
 // celle della crosta di lava (Voronoi ripetibile in orizzontale)
 const cells=[];if(id==='lava'){const rr=pfRng(seed+5),nc=70;for(let i=0;i<nc;i++)cells.push([rr()*Wd,rr()*H*1.1])}
 const nearest=(x,y)=>{let d1=1e9,d2=1e9;for(const [cx,cy] of cells){let dx=Math.abs(x-cx);if(dx>Wd/2)dx=Wd-dx;const d=dx*dx+(y-cy)*(y-cy);if(d<d1){d2=d1;d1=d}else if(d<d2)d2=d}return[Math.sqrt(d1),Math.sqrt(d2)]};
 for(let py=0;py<h;py++){
  const y=py/R,v=y/H,deep=Math.min(1,v*1.25);
  for(let px=0;px<w;px++){
   const x=px/R,u=x/Wd,o=(py*w+px)*4;
   let r,g,b,a=255,r2=0,g2=0,b2=0,a2=0;
   if(id==='lava'){
    const [d1,d2]=nearest(x,y),edge=d2-d1,crack=Math.max(0,1-edge/(3.2+nz(u,v,seed+1,64,6)*2.5)),plate=Math.min(1,edge/22);
    // crosta scura a placche, crepe incandescenti fra una placca e l'altra, più calda vicino alla superficie
    const heat=crack*.95+Math.max(0,1-v*2.4)*.18,cool=.1+plate*.16+(nz(u,v,seed+2,128,20)-.5)*.1;
    r=34+cool*80+heat*221;g=10+cool*30+heat*110+crack*crack*80;b=6+cool*16+heat*14+crack*crack*50;
    // seconda striscia: colata luminosa che scorre (velature calde)
    const flow=nz(u,v,seed+3,24,3)*.6+nz(u,v,seed+4,48,5)*.4;a2=Math.max(0,flow-.58)*1.5*255*(1-v*.7)*(.35+crack*.65);r2=255;g2=150+flow*60;b2=60;
   }else if(id==='deserto'){
    const rip=Math.sin((x*.21+nz(u,v,seed+1,40,4)*9)+y*.9)*.5+.5,dune=nz(u,v,seed+2,10,2),grain=shdH(px,py,seed)%1;
    const sh=(dune-.5)*.5+(rip-.5)*.18*(1-v*.5)+(grain-.5)*.12,base=gMix(col[0],col[1],Math.min(1,v*1.4));
    r=base[0]*(1+sh);g=base[1]*(1+sh);b=base[2]*(1+sh);
    a2=Math.max(0,rip-.7)*2.2*120*(1-v);r2=255;g2=236;b2=190;// creste delle increspature in luce
   }else if(id==='tempesta'){
    const n=nz(u,v,seed+1,16,3)*.6+nz(u,v,seed+2,48,8)*.4;
    r=80+n*80-v*60;g=64+n*70-v*50;b=160+n*70-v*110;a=Math.min(255,(70+v*220)*(.75+n*.4));
    a2=Math.max(0,n-.55)*2*150*(1-v);r2=200;g2=190;b2=255;
   }else{
    // acqua: colore che si scurisce con la profondità, onde che si stringono verso l'alto (prospettiva)
    const base=deep<.35?gMix(col[0],col[1],deep/.35):gMix(col[1],col[2],(deep-.35)/.65);
    const wv=Math.sin(x*(.05+.08*(1-v))+nz(u,v,seed+1,32,3)*6+y*.35),crest=Math.pow(Math.max(0,wv),6),trough=Math.max(0,-wv);
    const ref=gMix(base,sky,.25*(1-v)),sh=crest*.35*(1-v*.7)-trough*.12;
    r=ref[0]*(1+sh);g=ref[1]*(1+sh);b=ref[2]*(1+sh);a=Math.min(255,(.8+.2*deep)*255);
    // seconda striscia: scintillii e riflessi sulle creste
    const sp=nz(u,v,seed+2,192,30);a2=crest*Math.max(0,sp-.55)*3.2*255*(1-v*.85);r2=foam[0];g2=foam[1];b2=foam[2];
   }
   da[o]=Math.max(0,Math.min(255,r));da[o+1]=Math.max(0,Math.min(255,g));da[o+2]=Math.max(0,Math.min(255,b));da[o+3]=a;
   db[o]=r2;db[o+1]=g2;db[o+2]=b2;db[o+3]=Math.max(0,Math.min(255,a2));
  }
 }
 A.g.putImageData(ia,0,0);B.g.putImageData(ib,0,0);
 // bagliore morbido sotto la cresta (lava e acqua): una volta sola, dentro la striscia
 C.liq={a:A.c,b:B.c,R,w:Wd,h:H,id};return C.liq;
}
function tdWave(x,now){return TD_TOP+Math.sin(x/40+now*1.6)*2.2+Math.sin(x/17-now*2.1)*.9}
if(tdOrig.gDrawFrontLiquid)gDrawFrontLiquid=function(cx,VW,now){
 let L=null;try{L=tdLiquidStrips()}catch(e){console.warn('liquido HD non disponibile',e);tdCache().liq=false}
 if(!L)return tdOrig.gDrawFrontLiquid.apply(this,arguments);
 const th={id:L.id},m=gMat(),x0=cx-10,x1=cx+VW+10;
 ctx.save();
 ctx.beginPath();ctx.moveTo(x0,PF_VH+40);for(let x=x0;x<=x1;x+=10)ctx.lineTo(x,tdWave(x,now));ctx.lineTo(x1,PF_VH+40);ctx.closePath();ctx.clip();
 // due strisce che scorrono a velocità diverse
 const strip=(img,speed,alpha,mode)=>{const o=((cx*.0+now*speed)%L.w+L.w)%L.w,start=Math.floor((x0+o)/L.w)*L.w-o;
  ctx.globalAlpha=alpha;ctx.globalCompositeOperation=mode;for(let x=start;x<x1;x+=L.w)ctx.drawImage(img,x,TD_TOP-6,L.w,L.h)};
 strip(L.a,TD.scorre[0]*(L.id==='lava'?.35:1),1,'source-over');
 strip(L.b,TD.scorre[1]*(L.id==='lava'?.5:1),L.id==='lava'?.6:.9,L.id==='deserto'?'source-over':'lighter');
 ctx.restore();ctx.save();
 // cresta: linea della schiuma più un alone largo e tenue (al posto di shadowBlur)
 const crest=(width,alpha,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.beginPath();for(let x=x0;x<=x1;x+=10){x===x0?ctx.moveTo(x,tdWave(x,now)):ctx.lineTo(x,tdWave(x,now))}ctx.stroke()};
 ctx.lineJoin='round';ctx.lineCap='round';
 if(th.id==='lava'){crest(9,.18,'#ffb04a');crest(4,.4,'#ffd27a');crest(1.8,1,'#fff1c8')}
 else if(th.id==='deserto'){crest(2.2,.7,'rgba(255,236,190,.9)')}
 else if(th.id==='tempesta'){crest(5,.12,'#d8ccff');crest(1.4,.6,'#e8e0ff')}
 else{crest(4,.16,'#ffffff');crest(1.6,1,m.foam);
  // creste che brillano e scorrono lungo la superficie
  ctx.globalAlpha=1;ctx.fillStyle='rgba(255,255,255,.75)';for(let x=Math.floor(x0/37)*37;x<x1;x+=37){const k=(now*.35+gHash(x))%1,xx=x+k*30;if(k<.6)ctx.fillRect(xx,tdWave(xx,now)+1.5,6*(1-k),1)}}
 ctx.globalAlpha=1;
 // spuma contro le rocce (come prima)
 if(th.id!=='tempesta')for(const sd of pf.solids){for(const ex of [sd.x,sd.x+sd.w]){if(ex<x0||ex>x1)continue;for(let i=0;i<5;i++){const k=(now*.9+i/5+gHash(Math.floor(ex))%1)%1;ctx.fillStyle=th.id==='lava'?`rgba(255,220,140,${.7*(1-k)})`:th.id==='deserto'?`rgba(240,215,160,${.5*(1-k)})`:`rgba(240,252,255,${.6*(1-k)})`;ctx.beginPath();ctx.arc(ex+(i-2)*5,tdWave(ex,now)-k*10,2+k*4,0,6.28);ctx.fill()}}}
 // bolle di lava che scoppiano (come prima)
 if(th.id==='lava'){for(let x=Math.floor(x0/70)*70;x<x1;x+=70){const k=(now*.5+gHash(x))%1;if(k<.3){ctx.fillStyle=`rgba(255,230,160,${.9*(1-k/.3)})`;ctx.beginPath();ctx.arc(x+gHash(x+3)*50,TD_TOP+6-k*18,2+k*9,0,6.28);ctx.fill()}}}
 ctx.restore();
};

// ---------------------------------------------------------------- 2) cactus
function tdCactusSprite(seed){
 const R=Math.max(3,tdCache().res*2),L=-30,T=-86,Wd=60,H=90,cv=gCanvas(Wd*R,H*R);if(!cv)return null;
 const g=cv.g,rnd=pfRng(seed),sun=tdSun()?-1:1;g.scale(R,R);g.translate(-L,-T);g.lineCap='round';g.lineJoin='round';
 const lh=-14-rnd()*12,rh=-22-rnd()*14,la=-48-rnd()*12,ra=-40-rnd()*14,top=-64-rnd()*10;
 // percorsi: tronco e due braccia con gomito curvo
 const parts=[
  {w:13,p:g2=>{g2.moveTo(0,0);g2.lineTo(0,top)}},
  {w:8.5,p:g2=>{g2.moveTo(-3,lh-24);g2.lineTo(-11,lh-24);g2.quadraticCurveTo(-16,lh-24,-16,lh-30);g2.lineTo(-16,la)}},
  {w:8,p:g2=>{g2.moveTo(3,rh-14);g2.lineTo(10,rh-14);g2.quadraticCurveTo(15,rh-14,15,rh-20);g2.lineTo(15,ra)}}
 ];
 const stroke=(w,color,dx=0,alpha=1)=>{g.save();g.translate(dx,0);g.globalAlpha=alpha;g.strokeStyle=color;for(const pt of parts){g.lineWidth=pt.w*w;g.beginPath();pt.p(g);g.stroke()}g.restore()};
 stroke(1.08,'#1f3f1a');                // contorno scuro
 stroke(1,'#3f7a32');                   // corpo
 stroke(.55,'#5f9e45',sun*2,.9);        // lato in luce
 stroke(.25,'#9fd27a',sun*3,.7);        // riflesso
 stroke(.4,'#2a5622',-sun*3.2,.55);     // lato in ombra
 // costole e spine
 g.strokeStyle='rgba(25,55,20,.55)';g.lineWidth=.6;
 for(const dx of [-3.4,0,3.4]){g.beginPath();g.moveTo(dx,-2);g.lineTo(dx*.8,top+3);g.stroke()}
 for(const [x,y0,y1] of [[-16,lh-29,la+2],[15,rh-19,ra+2]])for(const dx of [-1.8,1.8]){g.beginPath();g.moveTo(x+dx,y0);g.lineTo(x+dx*.8,y1);g.stroke()}
 g.fillStyle='rgba(245,240,200,.85)';for(let i=0;i<40;i++){const t=rnd(),dx=[-3.4,0,3.4][i%3];g.fillRect(dx-.4,-3+t*(top+5),.8,.8)}
 // fiore in cima (a volte)
 if(rnd()<.5){g.fillStyle='#ff6f9c';g.beginPath();g.arc(0,top-2,2.6,0,6.28);g.fill();g.fillStyle='#ffd3e0';g.beginPath();g.arc(-.6,top-2.6,1,0,6.28);g.fill()}
 // ombra a terra
 g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(sun*-4,1,14,2.2,0,0,6.28);g.fill();
 return{c:cv.c,L,T,w:Wd,h:H};
}

// ---------------------------------------------------------------- 3) alberi
// palette: {tronco, scuro, medio, chiaro}; detail 0..1 (meno ciuffi in lontananza)
function tdTree(g,x,y,h,rnd,pal,sun,detail){
 const leaves=[];
 const branch=(bx,by,ang,len,wd,depth)=>{
  const ex=bx+Math.cos(ang)*len,ey=by+Math.sin(ang)*len,mx=(bx+ex)/2+(rnd()-.5)*len*.18,my=(by+ey)/2;
  g.strokeStyle=pal.tronco;g.lineWidth=wd;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(mx,my,ex,ey);g.stroke();
  if(depth<=0||len<h*.08){leaves.push([ex,ey,h*(.12+rnd()*.08)]);return}
  const n=depth>1?2+(rnd()<.5?1:0):2;
  for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*(.55+rnd()*.35)+(rnd()-.5)*.25;branch(ex,ey,a,len*(.62+rnd()*.18),wd*.62,depth-1)}
  if(rnd()<.6)leaves.push([ex,ey,h*(.1+rnd()*.07)]);
 };
 g.lineCap='round';
 // tronco con radici
 const tw=h*.075;g.fillStyle=pal.tronco;g.beginPath();g.moveTo(x-tw*1.6,y);g.quadraticCurveTo(x-tw*.7,y-h*.1,x-tw*.5,y-h*.45);g.lineTo(x+tw*.5,y-h*.45);g.quadraticCurveTo(x+tw*.7,y-h*.1,x+tw*1.6,y);g.closePath();g.fill();
 g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=tw*.3;g.beginPath();g.moveTo(x+sun*tw*.35,y-2);g.lineTo(x+sun*tw*.25,y-h*.44);g.stroke();
 const depth=detail>.6?4:detail>.3?3:2;
 branch(x,y-h*.44,-Math.PI/2+(rnd()-.5)*.25,h*.3,tw*.95,depth);
 // chioma: ciuffi, prima l'ombra (spostata dal lato opposto al sole), poi il medio, poi la luce
 const blobs=(lx,ly,r,color,dx,dy,k,count)=>{g.fillStyle=color;for(let i=0;i<count;i++){const a=rnd()*6.28,d=r*Math.sqrt(rnd())*.75;g.beginPath();g.ellipse(lx+Math.cos(a)*d+dx*r,ly+Math.sin(a)*d*.8+dy*r,r*k*(.55+rnd()*.45),r*k*(.45+rnd()*.35),rnd()*3,0,6.28);g.fill()}};
 const cnt=Math.max(3,Math.round(9*detail));
 for(const [lx,ly,r] of leaves)blobs(lx,ly,r,pal.scuro,-sun*.18,.16,.62,cnt);
 for(const [lx,ly,r] of leaves)blobs(lx,ly,r,pal.medio,-sun*.05,.02,.5,cnt);
 for(const [lx,ly,r] of leaves)blobs(lx,ly,r*.8,pal.chiaro,sun*.2,-.18,.42,Math.max(2,Math.round(cnt*.6)));
 if(detail>.6){g.fillStyle=pal.punte;for(const [lx,ly,r] of leaves)for(let i=0;i<5;i++){g.beginPath();g.arc(lx+sun*r*.3+(rnd()-.5)*r,ly-r*.25+(rnd()-.5)*r*.6,r*.07,0,6.28);g.fill()}}
}
function tdTreeSprite(seed){
 const R=Math.max(2,tdCache().res*1.6),L=-80,T=-190,Wd=160,H=196,cv=gCanvas(Wd*R,H*R);if(!cv)return null;
 const g=cv.g;g.scale(R,R);g.translate(-L,-T);
 tdTree(g,0,0,150,pfRng(seed),{tronco:'#3d2a1b',scuro:'#173a17',medio:'#2f6a26',chiaro:'#62a83e',punte:'rgba(190,240,140,.8)'},tdSun()?-1:1,1);
 g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(0,1,26,3,0,0,6.28);g.fill();
 return{c:cv.c,L,T,w:Wd,h:H};
}

// sprite in primo piano al posto di cactus e alberi disegnati a rettangoli e cerchi
if(tdOrig.pfDrawFlora)pfDrawFlora=function(now){
 let list=null;try{list=pf.deco.themeBack.flora}catch(e){}
 if(!list||typeof gCanvas!=='function')return tdOrig.pfDrawFlora.apply(this,arguments);
 const C=tdCache();
 try{if(C.cactus===null){C.cactus=[];for(let i=0;i<TD.cactus;i++)C.cactus.push(tdCactusSprite(pfHash('cactus'+i)))}
  if(C.alberi===null){C.alberi=[];for(let i=0;i<TD.alberi;i++)C.alberi.push(tdTreeSprite(pfHash('albero'+i)))}}catch(e){C.cactus=[];C.alberi=[]}
 const mine=f=>(f.kind==='cactus'&&C.cactus[0])||(f.kind==='albero'&&C.alberi[0]);
 const rest=list.filter(f=>!mine(f));
 pf.deco.themeBack.flora=rest;
 try{tdOrig.pfDrawFlora.apply(this,arguments)}finally{pf.deco.themeBack.flora=list}
 for(const f of list){
  if(!mine(f)||!pfOnScreen(f.x,120))continue;
  const set=f.kind==='cactus'?C.cactus:C.alberi,sp=set[(f.seed>>>0)%set.length]||set[0];if(!sp)continue;
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.size*f.flip,f.size);
  if(f.kind==='albero')ctx.rotate(Math.sin(now*1.4+f.seed)*.012);
  ctx.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);ctx.restore();
 }
};

// alberi degli strati lontani della foresta: niente più cerchi, alberi veri più scuri e velati
if(tdOrig.gLayerDetails)gLayerDetails=function(g,id,k,sp,prof,col,dark,rnd,rim){
 if(id!=='foresta'||k===0)return tdOrig.gLayerDetails.apply(this,arguments);
 const r2=pfRng(pfHash('foresta'+k+pf.p.code)),sun=tdSun()?-1:1;
 const haze=1-k/3,leaf=gMix([40,90,40],col,.35+haze*.3),pal={
  tronco:gRgb(gMix(dark,[30,20,12],.4)),scuro:gRgb(gMix(leaf,[0,0,0],.45)),medio:gRgb(leaf),chiaro:gRgb(gMix(leaf,[170,230,120],.28*(1-haze*.6))),punte:gRgb([200,250,150],.5)};
 // alberi radi e di altezze diverse (prima i cerchi erano fitti ma piccoli): si vede ancora il cielo
 const n=Math.round(G_TL/(64-k*12));
 for(let i=0;i<n;i++){const x=r2()*G_TL,y=gProfAt(prof,x)+4,h=(22+r2()*30+(r2()<.15?24:0))*(1+k*.3);tdTree(g,x,y,h,r2,pal,sun,.25+k*.22)}
 // funghi giganti luminescenti (come prima) sugli strati intermedi
 if(k===1||k===2)for(let i=0;i<5;i++){const x=rnd()*G_TL,y=gProfAt(prof,x),h=60+rnd()*70,r=26+rnd()*24;g.fillStyle=gRgb(gMix(col,[220,230,200],.2));g.fillRect(x-3,y-h,6,h);const gr=g.createRadialGradient(x,y-h,2,x,y-h,r);gr.addColorStop(0,'rgba(120,255,210,.55)');gr.addColorStop(1,'rgba(40,140,120,.15)');g.fillStyle=gr;g.beginPath();g.ellipse(x,y-h,r,r*.45,0,Math.PI,0);g.fill()}
};
