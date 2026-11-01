// Frontiera Stellare — GRAFICA DELLA FASE 2
// Sostituisce il disegno della missione a terra con una resa più ricca:
// sfondi a più strati con prospettiva aerea, terreno con texture procedurale,
// luci dinamiche, ombre, liquidi in primo piano e personaggi/robot dettagliati.
// Le texture vengono generate una volta per livello in canvas fuori schermo.
// Se il browser non offre canvas fuori schermo (es. nei test) resta il disegno originale.

const gOrig={drawPlatform,pfDrawSolid,pfDrawTrooper,pfDrawEnemy,pfDrawBoss,pfDrawColonist,pfDrawPlatformBeam,pfExplosion,pfHitEnemy,pfExplodeMissile};
let gfx=null,gFlashes=[];
const G_OUT='rgba(10,8,14,.8)'; // contorno scuro che stacca i personaggi dallo sfondo
const G_SCALE=1.22; // i personaggi sono disegnati più grandi della loro area di collisione

// ---------------------------------------------------------------- rumore procedurale
function gHash(i){i=Math.imul(i^0x27d4eb2d,0x165667b1);i^=i>>>15;i=Math.imul(i,0x85ebca6b);i^=i>>>13;i=Math.imul(i,0xc2b2ae35);i^=i>>>16;return(i>>>0)/4294967296}
function gSmooth(t){return t*t*(3-2*t)}
function gN1p(x,cells,seed){const i=Math.floor(x),f=gSmooth(x-i),a=gHash(((i%cells)+cells)%cells*7919+seed),b=gHash((((i+1)%cells)+cells)%cells*7919+seed);return a+(b-a)*f}
function gN2p(x,y,cells,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=gSmooth(x-ix),fy=gSmooth(y-iy),w=v=>((v%cells)+cells)%cells,h=(a,b)=>gHash(Math.imul(w(a),73856093)^Math.imul(w(b),19349663)^seed);const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
function gFbm2p(u,v,cells,oct,seed){let s=0,n=0,a=.5,c=cells;for(let o=0;o<oct;o++){s+=a*gN2p(u*c,v*c,c,seed+o*131);n+=a;a*=.5;c*=2}return s/n}
function gFbm1p(u,cells,oct,seed){let s=0,n=0,a=.5,c=cells;for(let o=0;o<oct;o++){s+=a*gN1p(u*c,c,seed+o*97);n+=a;a*=.5;c*=2}return s/n}
function gMix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function gRgb(c,a=1){return`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`}
function gHex(h){h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function gCanvas(w,h){try{const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d');return g&&typeof g.createImageData==='function'?{c,g}:null}catch{return null}}

// ---------------------------------------------------------------- materiali dei pianeti
const G_MAT={
 mare:{dark:[16,34,44],mid:[42,76,88],light:[98,140,148],strata:.25,ridge:0,speck:[205,238,240],top:[64,150,110],top2:[150,210,150],lip:[30,90,70],rim:'#a8f0ff',liquid:['#2a8ab3','#0b3a56','#031420'],foam:'rgba(225,250,255,.85)',grade:['#e4f0f6','#8ea5b6'],sun:[230,248,255],sunPos:[.28,.18],rays:.10},
 deserto:{dark:[92,52,22],mid:[176,116,56],light:[236,190,118],strata:.8,ridge:0,speck:[250,226,170],top:[238,198,124],top2:[255,226,165],lip:[200,150,80],rim:'#ffe2a0',liquid:['#e6b766','#a8733a','#3a2210'],foam:'rgba(255,236,190,.7)',grade:['#fff1dc','#b49680'],sun:[255,236,180],sunPos:[.72,.2],rays:.16},
 foresta:{dark:[30,22,14],mid:[68,50,32],light:[118,92,58],strata:.3,ridge:0,speck:[160,140,96],top:[64,150,46],top2:[160,226,96],lip:[36,92,30],rim:'#c8ff9a',liquid:['#3d6b2a','#163018','#030805'],foam:'rgba(190,240,150,.45)',grade:['#dcefd4','#76907d'],sun:[220,255,190],sunPos:[.6,.16],rays:.13},
 lava:{dark:[14,10,10],mid:[40,30,28],light:[86,68,62],strata:.15,ridge:1,speck:[120,96,88],emis:[255,120,40],top:[34,24,22],top2:[70,52,46],lip:[20,14,13],rim:'#ff9a5a',liquid:['#ffd166','#ff6a1a','#4a0602'],foam:'rgba(255,240,180,.95)',grade:['#ffd9c6','#86625c'],sun:[255,120,80],sunPos:[.22,.24],rays:.07},
 tempesta:{dark:[28,24,50],mid:[62,54,104],light:[126,114,184],strata:.45,ridge:0,speck:[222,212,255],top:[110,92,190],top2:[196,180,255],lip:[70,56,140],rim:'#d8ccff',liquid:['rgba(150,130,240,.0)','#3a2d78','#0a0820'],foam:'rgba(225,215,255,.5)',grade:['#e4dcff','#837c9f'],sun:[210,200,255],sunPos:[.5,.1],rays:0}
};
function gMat(){return G_MAT[(pf.theme||pfTheme(pf.p)).mat||(pf.theme||pfTheme(pf.p)).id]||G_MAT.mare}
function gRes(){return Math.max(1,Math.min(2.4,pfScale()*(typeof dpr==='number'?dpr:1)))}

// ---------------------------------------------------------------- cache per livello
function gReady(){
 if(!pf)return false;
 const res=gRes();
 if(gfx&&gfx.pf===pf&&Math.abs(gfx.res-res)<.3)return gfx.ok;
 gfx={pf,res,ok:false,solids:new Map(),plats:new Map(),tint:new Map(),layers:null,tex:null,light:null,clouds:null};
 const t=gCanvas(4,4);if(!t)return false;
 try{gfx.tex=gMakeTexture();gfx.light=gMakeLightSprite();gfx.layers=gMakeLayers();gfx.clouds=gMakeClouds();gfx.ok=true}catch(err){console.warn('grafica fase 2 non disponibile',err);gfx.ok=false}
 return gfx.ok;
}
// Texture rocciosa ripetibile (256×256 unità di mondo) generata pixel per pixel.
function gMakeTexture(){
 const m=gMat(),T=256,R=2,N=T*R,cv=gCanvas(N,N),img=cv.g.createImageData(N,N),d=img.data,seed=pfHash(pf.p.code)&0xffff;
 for(let py=0;py<N;py++){const v=py/N;for(let px=0;px<N;px++){
  const u=px/N,n=gFbm2p(u,v,6,5,seed),fine=gN2p(u*64,v*64,64,seed+7),strata=.5+.5*Math.sin(v*Math.PI*2*9+n*7);
  let t=n*.8+(strata-.5)*m.strata*.55+(fine-.5)*.22;t=Math.max(0,Math.min(1,t*1.15-.06));
  let c=t<.5?gMix(m.dark,m.mid,t*2):gMix(m.mid,m.light,(t-.5)*2);
  const crack=Math.abs(gFbm2p(u,v,5,3,seed+99)-.5);if(crack<.012)c=gMix(c,[0,0,0],.55*(1-crack/.012));
  if(m.ridge){const r=1-Math.abs(2*gFbm2p(u,v,4,4,seed+333)-1);if(r>.93)c=gMix(c,m.emis,Math.min(1,(r-.93)/.05))}
  if(gHash(px*928371+py*1237+seed)>.993)c=gMix(c,m.speck,.55);
  const o=(py*N+px)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255}}
 cv.g.putImageData(img,0,0);
 return{c:cv.c,size:T,res:R};
}
function gPattern(g){
 const p=g.createPattern(gfx.tex.c,'repeat');
 if(p&&p.setTransform&&typeof DOMMatrix==='function')p.setTransform(new DOMMatrix().scaleSelf(1/gfx.tex.res,1/gfx.tex.res));
 return p;
}
function gMakeLightSprite(){const cv=gCanvas(128,128),r=cv.g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(.6,'rgba(255,255,255,.14)');r.addColorStop(1,'rgba(255,255,255,0)');cv.g.fillStyle=r;cv.g.fillRect(0,0,128,128);return cv.c}
function gTinted(color){
 if(gfx.tint.has(color))return gfx.tint.get(color);
 const cv=gCanvas(128,128);cv.g.drawImage(gfx.light,0,0);cv.g.globalCompositeOperation='source-in';cv.g.fillStyle=color;cv.g.fillRect(0,0,128,128);gfx.tint.set(color,cv.c);return cv.c;
}
function gMakeClouds(){
 const th=pf.theme,out=[],tint=gMix(gHex(th.sky[2]),[255,255,255],.35);
 for(let k=0;k<4;k++){
  const W2=420,H2=150,cv=gCanvas(W2,H2),g=cv.g,rnd=pfRng(pfHash('nube'+k+pf.p.code));
  for(let i=0;i<26;i++){const x=60+rnd()*300,y=70+(rnd()-.5)*50*(1-Math.abs(x-210)/210),r=24+rnd()*40,gr=g.createRadialGradient(x,y-r*.3,1,x,y,r);gr.addColorStop(0,gRgb(gMix(tint,[255,255,255],.4),.32));gr.addColorStop(.6,gRgb(tint,.16));gr.addColorStop(1,gRgb(tint,0));g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.28);g.fill()}
  out.push(cv.c);
 }
 return out;
}

// ---------------------------------------------------------------- sfondo a strati
const G_TL=2048;
function gMakeLayers(){
 const th=pf.theme,m=gMat(),id=th.id,seed=pfHash('strati'+pf.p.code)&0xffff;
 const sky=gHex(th.sky[2]),far=gHex(th.far),near=gHex(th.near),rim=th.rim;
 const specs=[{par:.035,base:470,amp:170,fog:.62},{par:.09,base:500,amp:130,fog:.44},{par:.17,base:540,amp:100,fog:.26},{par:.29,base:575,amp:80,fog:.12}];
 const top=180,LH=PF_VH-top;
 return specs.map((sp,k)=>{
  const RB=Math.min(1.2,gfx.res)*[.5,.62,.8,1][k];
  const cv=gCanvas(G_TL*RB,LH*RB),g=cv.g;g.scale(RB,RB);g.translate(0,-top);
  const col=gMix(gMix(gMix(far,near,k/3),sky,sp.fog),[0,0,0],[.05,.2,.35,.5][k]*(id==='lava'?1.5:1)+(id==='lava'?.12:0)),dark=gMix(col,[0,0,0],.5),rnd=pfRng(seed+k*17);
  const prof=[];
  for(let x=0;x<=G_TL;x+=8){
   const u=x/G_TL;let n=gFbm1p(u,5+k*3,5,seed+k*11),h;
   if(id==='deserto')h=k%2===0?(.3+.7*gSmooth(Math.max(0,Math.min(1,(n-.5)*9))))*(.9+.1*gFbm1p(u,40,2,seed+k)):.25+.55*(.5+.5*Math.sin(u*Math.PI*2*(3+k)+n*4));
   else if(id==='lava')h=Math.pow(1-Math.abs(2*n-1),1.7)*1.15;
   else if(id==='mare')h=k===0?n*.9:Math.max(0,(n-.55)*2.6);
   else if(id==='tempesta')h=k===0?n*.8:.25+n*.25;
   else h=n*.75;
   prof.push([x,sp.base-h*sp.amp]);
  }
  // Silhouette principale
  const path=()=>{g.beginPath();g.moveTo(0,PF_VH);for(const [x,y] of prof)g.lineTo(x,y);g.lineTo(G_TL,PF_VH);g.closePath()};
  if(!(id==='tempesta'&&k>0)){
   path();const gr=g.createLinearGradient(0,sp.base-sp.amp,0,PF_VH);gr.addColorStop(0,gRgb(col));gr.addColorStop(1,gRgb(dark));g.fillStyle=gr;g.fill();
   g.save();path();g.clip();g.globalAlpha=(id==='lava'?0:.26-k*.03);g.globalCompositeOperation='overlay';g.fillStyle=gPattern(g);g.fillRect(0,0,G_TL,PF_VH);g.restore();
   // luce radente sul bordo superiore
   g.save();path();g.clip();g.strokeStyle=rim;g.globalAlpha=(.16+k*.06)*(id==='lava'?.4:1);g.lineWidth=10;g.filter&&(g.filter='blur(4px)');g.beginPath();prof.forEach(([x,y],i)=>i?g.lineTo(x,y+3):g.moveTo(x,y+3));g.stroke();g.restore();g.filter='none';
   g.strokeStyle=rim;g.globalAlpha=(.18+k*.08)*(id==='lava'?.45:1);g.lineWidth=1.2;g.beginPath();prof.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.globalAlpha=1;
  }
  gLayerDetails(g,id,k,sp,prof,col,dark,rnd,rim);
  // nebbia: più lontano = più chiaro
  const fog=g.createLinearGradient(0,sp.base-sp.amp*.4,0,PF_VH);fog.addColorStop(0,gRgb(sky,0));fog.addColorStop(1,gRgb(sky,.22*(1-k/4)));g.fillStyle=fog;g.globalCompositeOperation='source-atop';g.fillRect(0,0,G_TL,PF_VH);g.globalCompositeOperation='source-over';
  return gCropLayer(cv,sp.par,top,RB);
 });
}
// Ritaglia la parte trasparente in alto: meno pixel da comporre a ogni fotogramma.
function gCropLayer(cv,par,top,RB){
 const w=cv.c.width,h=cv.c.height,d=cv.g.getImageData(0,0,w,h).data;let first=h;
 outer:for(let y=0;y<h;y++)for(let x=3;x<w*4;x+=16)if(d[y*w*4+x]>2){first=y;break outer}
 first=Math.max(0,first-2);const out=gCanvas(w,h-first);out.g.drawImage(cv.c,0,-first);
 return{c:out.c,par,top:top+first/RB,h:(h-first)/RB};
}
function gProfAt(prof,x){const i=Math.max(0,Math.min(prof.length-1,Math.round(x/8)));return prof[i][1]}
function gLayerDetails(g,id,k,sp,prof,col,dark,rnd,rim){
 const lighter=gMix(col,[255,255,255],.12);
 if(id==='foresta'&&k>0){
  // chiome di alberi alieni lungo il profilo
  const n=Math.round(G_TL/(26-k*4));
  for(let i=0;i<n;i++){const x=rnd()*G_TL,y=gProfAt(prof,x),r=(8+rnd()*16)*(1+k*.45),tall=rnd()<.25;
   g.fillStyle=gRgb(dark);g.fillRect(x-1.5*(1+k*.4),y-r*1.6,3*(1+k*.4),r*1.7);
   const cy=y-r*(tall?2.6:1.6),gr=g.createRadialGradient(x-r*.3,cy-r*.4,1,x,cy,r*1.2);gr.addColorStop(0,gRgb(gMix(lighter,[120,190,90],.18)));gr.addColorStop(1,gRgb(col));g.fillStyle=gr;
   g.beginPath();g.arc(x,cy,r,0,6.28);g.arc(x-r*.7,cy+r*.35,r*.7,0,6.28);g.arc(x+r*.7,cy+r*.3,r*.7,0,6.28);if(tall){g.ellipse(x,cy-r*.9,r*.55,r*1.1,0,0,6.28)}g.fill();
   if(k>=2&&rnd()<.35){g.fillStyle='rgba(200,255,150,.5)';for(let j=0;j<4;j++){g.beginPath();g.arc(x+(rnd()-.5)*r*1.6,cy+(rnd()-.5)*r,1.4,0,6.28);g.fill()}}
  }
  // funghi giganti luminescenti sugli strati intermedi
  if(k===1||k===2)for(let i=0;i<5;i++){const x=rnd()*G_TL,y=gProfAt(prof,x),h=60+rnd()*70,r=26+rnd()*24;g.fillStyle=gRgb(gMix(col,[220,230,200],.2));g.fillRect(x-3,y-h,6,h);const gr=g.createRadialGradient(x,y-h,2,x,y-h,r);gr.addColorStop(0,'rgba(120,255,210,.55)');gr.addColorStop(1,'rgba(40,140,120,.15)');g.fillStyle=gr;g.beginPath();g.ellipse(x,y-h,r,r*.45,0,Math.PI,0);g.fill()}
 }
 if(id==='lava'&&(k===1||k===2)){
  // colate di lava sui pendii e crateri luminosi
  for(let i=0;i<3+k;i++){let x=rnd()*G_TL,y=gProfAt(prof,x)+4;g.save();g.strokeStyle=k===1?'rgba(255,110,40,.35)':'rgba(255,130,50,.5)';g.shadowBlur=12;g.shadowColor='#ff5a1f';g.lineWidth=1.5+rnd()*2.5;g.lineCap='round';g.beginPath();g.moveTo(x,y);for(let j=0;j<10;j++){x+=(rnd()-.5)*18;y+=10+rnd()*12;if(y>PF_VH)break;g.lineTo(x,y)}g.stroke();g.restore()}
  for(const [x,y] of prof)if(gHash(x*31+k)>.993){const gr=g.createRadialGradient(x,y,1,x,y,40);gr.addColorStop(0,'rgba(255,190,90,.8)');gr.addColorStop(1,'rgba(255,60,20,0)');g.fillStyle=gr;g.fillRect(x-40,y-40,80,80)}
 }
 if(id==='deserto'&&k%2===0){
  // strati di arenaria sulle mesas
  g.save();g.beginPath();g.moveTo(0,PF_VH);for(const [x,y] of prof)g.lineTo(x,y);g.lineTo(G_TL,PF_VH);g.closePath();g.clip();
  for(let y=sp.base-sp.amp;y<PF_VH;y+=7+rnd()*9){g.fillStyle=rnd()<.5?'rgba(255,220,160,.07)':'rgba(80,40,10,.09)';g.fillRect(0,y,G_TL,2+rnd()*4)}g.restore();
  for(let i=0;i<4;i++){const x=rnd()*G_TL,y=gProfAt(prof,x);g.fillStyle=gRgb(col);g.beginPath();g.moveTo(x-10,y+2);g.lineTo(x-4,y-40-rnd()*30);g.lineTo(x+6,y-36);g.lineTo(x+12,y+2);g.fill()}
 }
 if(id==='mare'&&k>0){
  // faraglioni con un faro sullo strato più vicino
  for(let i=0;i<3+k;i++){const x=rnd()*G_TL,h=40+rnd()*80*(k/2+.5),w=14+rnd()*24,y=sp.base;g.fillStyle=gRgb(col);g.beginPath();g.moveTo(x-w,y+4);g.lineTo(x-w*.6,y-h);g.lineTo(x+w*.4,y-h-8);g.lineTo(x+w,y+4);g.fill();g.strokeStyle=rim;g.globalAlpha=.25;g.beginPath();g.moveTo(x-w*.6,y-h);g.lineTo(x+w*.4,y-h-8);g.stroke();g.globalAlpha=1}
 }
 if(id==='tempesta'&&k>0){
  // isole di roccia sospese tra banchi di nubi
  for(let i=0;i<5+k*2;i++){const x=rnd()*G_TL,y=sp.base-sp.amp*(.4+rnd()*.9),w=(30+rnd()*60)*(1+k*.35),h=w*(.6+rnd()*.5);
   const gr=g.createLinearGradient(0,y-8,0,y+h);gr.addColorStop(0,gRgb(gMix(col,[255,255,255],.12)));gr.addColorStop(1,gRgb(dark));g.fillStyle=gr;
   g.beginPath();g.moveTo(x-w,y);g.quadraticCurveTo(x,y-10,x+w,y);for(let j=0;j<=6;j++){const t=j/6;g.lineTo(x+w-(2*w)*t+(rnd()-.5)*8,y+h*Math.sin(t*Math.PI)*(.6+rnd()*.4))}g.closePath();g.fill();
   g.strokeStyle=rim;g.globalAlpha=.4;g.lineWidth=1.2;g.beginPath();g.moveTo(x-w,y);g.quadraticCurveTo(x,y-10,x+w,y);g.stroke();g.globalAlpha=1;
   if(rnd()<.5){g.fillStyle='rgba(200,180,255,.55)';g.beginPath();g.moveTo(x-4,y-2);g.lineTo(x,y-18);g.lineTo(x+4,y-2);g.fill()}}
  for(let i=0;i<14;i++){const x=rnd()*G_TL,y=sp.base+10+rnd()*40,r=40+rnd()*70,gr=g.createRadialGradient(x,y,2,x,y,r);gr.addColorStop(0,`rgba(170,150,240,${.22+k*.05})`);gr.addColorStop(1,'rgba(120,100,200,0)');g.fillStyle=gr;g.beginPath();g.ellipse(x,y,r*1.6,r*.5,0,0,6.28);g.fill()}
 }
}
function gDrawLayer(L,cx,VW){
 const w=G_TL,off=((cx*L.par)%w+w)%w;
 ctx.imageSmoothingQuality='low';for(let x=-off;x<VW;x+=w)ctx.drawImage(L.c,x,L.top,w,L.h);ctx.imageSmoothingQuality='high';
}
function gDrawSky(VW,now){
 const th=pf.theme,m=gMat(),sx=VW*m.sunPos[0],sy=PF_VH*m.sunPos[1];
 if(th.id!=='tempesta'){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const big=th.id==='lava'?260:200;ctx.globalAlpha=.5;ctx.drawImage(gTinted(gRgb(m.sun)),sx-big,sy-big,big*2,big*2);
  ctx.globalAlpha=1;ctx.drawImage(gTinted('#ffffff'),sx-34,sy-34,68,68);
  if(m.rays>0){ctx.translate(sx,sy);ctx.rotate(now*.01);for(let i=0;i<9;i++){ctx.rotate(Math.PI*2/9+Math.sin(i*7)*.2);const len=300+gHash(i)*260,w2=18+gHash(i+9)*28,gr=ctx.createLinearGradient(0,0,len,0);gr.addColorStop(0,gRgb(m.sun,m.rays*.45));gr.addColorStop(1,gRgb(m.sun,0));ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,-w2);ctx.lineTo(len,w2);ctx.closePath();ctx.fill()}}
  ctx.restore();
 }
 // nubi alte alla deriva
 const cl=gfx.clouds;ctx.save();ctx.globalAlpha=th.id==='deserto'?.45:.7;
 for(let i=0;i<7;i++){const s=.7+gHash(i*13)*.8,span=VW+600,x=((gHash(i)*span-pf.cam.x*.02-now*(4+i*1.5))%span+span)%span-300,y=70+gHash(i*7)*200;ctx.drawImage(cl[i%cl.length],x,y,420*s,150*s)}
 ctx.restore();
}

// ---------------------------------------------------------------- terreno
function gSolidCache(sd){
 if(gfx.solids.has(sd))return gfx.solids.get(sd);
 const m=gMat(),id=pf.theme.id,R=gfx.res,pad=10,topPad=34,bottom=PF_VH+40,w=sd.w+pad*2,h=bottom-sd.y+topPad;
 const cv=gCanvas(w*R,h*R);if(!cv)return null;const g=cv.g;g.scale(R,R);g.translate(-(sd.x-pad),-(sd.y-topPad));
 const rnd=pfRng(Math.floor(sd.x*7+sd.y));
 const x0=sd.x,x1=sd.x+sd.w,y=sd.y;
 // contorno: bordo superiore appena irregolare, scogliere frastagliate ai lati
 const left=[],right=[];
 for(let yy=y;yy<=bottom;yy+=10){const k=Math.min(1,(yy-y)/40);left.push([x0+(rnd()*7+1)*k+Math.sin(yy*.05)*2*k,yy]);right.push([x1-(rnd()*7+1)*k-Math.sin(yy*.07)*2*k,yy])}
 const shape=()=>{g.beginPath();g.moveTo(x0,y);for(let x=x0+6;x<x1;x+=6)g.lineTo(x,y+(gHash(Math.floor(x))-.5)*1.2);g.lineTo(x1,y);for(const p of right)g.lineTo(p[0],p[1]);for(let i=left.length-1;i>=0;i--)g.lineTo(left[i][0],left[i][1]);g.closePath()};
 g.save();shape();g.clip();
 g.fillStyle=gPattern(g);g.fillRect(x0-pad,y-topPad,w,h);
 // massi incastonati nella roccia
 for(let i=0;i<sd.w/55;i++){const bx=x0+rnd()*sd.w,by=y+30+rnd()*150,br=6+rnd()*16,c=gMix(m.mid,m.light,.3+rnd()*.4),gr=g.createRadialGradient(bx-br*.35,by-br*.4,1,bx,by,br*1.1);gr.addColorStop(0,gRgb(gMix(c,[255,255,255],.18)));gr.addColorStop(.7,gRgb(c));gr.addColorStop(1,gRgb(gMix(c,[0,0,0],.5)));g.fillStyle=gr;g.beginPath();for(let j=0;j<7;j++){const a=j/7*6.28,rr=br*(.75+gHash(i*7+j+Math.floor(bx))*.35);g.lineTo(bx+Math.cos(a)*rr,by+Math.sin(a)*rr*.75)}g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.stroke()}
 // dettagli del tema dentro la roccia
 if(id==='foresta'){g.lineCap='round';for(let i=0;i<sd.w/40;i++){let rx=x0+rnd()*sd.w,ry=y+6;g.strokeStyle=gRgb(gMix([58,40,24],[120,90,56],rnd()),.85);g.lineWidth=3+rnd()*3;g.beginPath();g.moveTo(rx,ry);for(let j=0;j<5;j++){rx+=(rnd()-.5)*26;ry+=10+rnd()*16;g.lineTo(rx,ry);g.lineWidth*=.8}g.stroke()}}
 if(id==='deserto'){for(let i=0;i<sd.w/300;i++){const fx=x0+40+rnd()*(sd.w-80),fy=y+70+rnd()*80;g.strokeStyle='rgba(245,225,185,.45)';g.lineWidth=1.5;g.beginPath();for(let a=0;a<12;a+=.3){const r=a*1.6;g.lineTo(fx+Math.cos(a)*r,fy+Math.sin(a)*r)}g.stroke()}}
 if(id==='mare'){for(let i=0;i<sd.w/24;i++){const bx=x0+rnd()*sd.w,by=y+8+rnd()*40;g.fillStyle='rgba(230,240,235,.55)';g.beginPath();g.arc(bx,by,1.5+rnd()*2.5,0,6.28);g.fill();g.fillStyle='rgba(40,60,60,.6)';g.beginPath();g.arc(bx,by,.8,0,6.28);g.fill()}}
 if(id==='lava'){g.save();g.lineCap='round';for(let i=0;i<sd.w/70;i++){let cx=x0+rnd()*sd.w,cy=y+4;g.strokeStyle='rgba(255,140,50,.85)';g.shadowBlur=10;g.shadowColor='#ff5a1f';g.lineWidth=1+rnd()*1.8;g.beginPath();g.moveTo(cx,cy);for(let j=0;j<6;j++){cx+=(rnd()-.5)*24;cy+=8+rnd()*14;g.lineTo(cx,cy)}g.stroke()}g.restore()}
 if(id==='tempesta'){for(let i=0;i<sd.w/90;i++)gCrystal(g,x0+rnd()*sd.w,y+30+rnd()*140,6+rnd()*12,rnd()*6.28,['#d6c8ff','#6a54c8'])}
 // ombre: profondità, occlusione sotto il bordo e ai lati
 let gr=g.createLinearGradient(0,y+10,0,y+230);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.7)');g.fillStyle=gr;g.fillRect(x0-pad,y,w,h);
 gr=g.createLinearGradient(0,y+6,0,y+30);gr.addColorStop(0,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x0-pad,y+6,w,24);
 for(const [sx,dir] of [[x0,1],[x1,-1]]){gr=g.createLinearGradient(sx,0,sx+dir*36,0);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(Math.min(sx,sx+dir*36),y,36,h)}
 if(id==='lava'){gr=g.createLinearGradient(0,bottom-140,0,bottom-60);gr.addColorStop(0,'rgba(255,90,20,0)');gr.addColorStop(1,'rgba(255,90,20,.45)');g.fillStyle=gr;g.fillRect(x0-pad,bottom-140,w,140)}
 g.restore();
 // bordi illuminati
 g.save();g.lineJoin='round';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;g.beginPath();for(const p of right)g.lineTo(p[0],p[1]);g.stroke();g.beginPath();for(const p of left)g.lineTo(p[0],p[1]);g.stroke();
 g.strokeStyle=m.rim;g.globalAlpha=.35;g.lineWidth=1.2;g.beginPath();left.slice(0,8).forEach((p,i)=>i?g.lineTo(p[0]+1,p[1]):g.moveTo(p[0]+1,p[1]));g.stroke();g.beginPath();right.slice(0,8).forEach((p,i)=>i?g.lineTo(p[0]-1,p[1]):g.moveTo(p[0]-1,p[1]));g.stroke();g.restore();
 gSurface(g,sd,m,id,rnd);
 const out={c:cv.c,x:sd.x-pad,y:sd.y-topPad,w,h};gfx.solids.set(sd,out);return out;
}
function gCrystal(g,x,y,s,a,col){g.save();g.translate(x,y);g.rotate(a);g.shadowBlur=s;g.shadowColor=col[0];for(const [dx,h,r] of [[-s*.5,s*1.6,-.35],[0,s*2.4,0],[s*.55,s*1.4,.4]]){g.save();g.translate(dx,0);g.rotate(r);const gr=g.createLinearGradient(-s*.3,-h,s*.3,0);gr.addColorStop(0,col[0]);gr.addColorStop(1,col[1]);g.fillStyle=gr;g.beginPath();g.moveTo(0,-h);g.lineTo(s*.32,-h*.72);g.lineTo(s*.28,0);g.lineTo(-s*.28,0);g.lineTo(-s*.32,-h*.72);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(0,-h);g.lineTo(s*.1,-h*.7);g.lineTo(0,-h*.2);g.closePath();g.fill();g.restore()}g.restore()}
// Superficie calpestabile: erba, sabbia, alghe, crosta lavica, muschio viola.
function gSurface(g,sd,m,id,rnd){
 const x0=sd.x,x1=sd.x+sd.w,y=sd.y;
 // labbro superiore con gocciolature
 g.save();g.beginPath();g.moveTo(x0,y-1);g.lineTo(x1,y-1);let lx=x1;
 const lipH=id==='deserto'?12:id==='lava'?6:9;
 for(let x=x1;x>=x0;x-=5){const d=lipH*(.55+gHash(Math.floor(x*3))*.6)+(gHash(Math.floor(x/23))>.86?lipH*1.4:0);g.lineTo(x,y+d);lx=x}
 g.closePath();const gr=g.createLinearGradient(0,y-2,0,y+lipH*2);gr.addColorStop(0,gRgb(m.top2));gr.addColorStop(.35,gRgb(m.top));gr.addColorStop(1,gRgb(m.lip));g.fillStyle=gr;g.fill();g.restore();
 g.save();g.strokeStyle=m.rim;g.globalAlpha=.85;g.lineWidth=1.4;g.shadowBlur=6;g.shadowColor=m.rim;g.beginPath();g.moveTo(x0+1,y);g.lineTo(x1-1,y);g.stroke();g.restore();
 if(id==='foresta'){
  g.save();g.lineCap='round';
  for(let x=x0+2;x<x1-2;x+=2.2){const h=5+gHash(Math.floor(x*10))*11,c=gMix(m.lip,m.top2,gHash(Math.floor(x*13))),lean=(gHash(Math.floor(x*17))-.5)*5;g.strokeStyle=gRgb(c);g.lineWidth=1.3;g.beginPath();g.moveTo(x,y+2);g.quadraticCurveTo(x+lean*.3,y-h*.6,x+lean,y-h);g.stroke()}
  for(let x=x0+20;x<x1-20;x+=26+rnd()*40){if(rnd()<.5)continue;const c=rnd()<.5?'#ff7ab8':'#9ff2ff';g.fillStyle=c;g.shadowBlur=6;g.shadowColor=c;g.beginPath();g.arc(x,y-7-rnd()*5,1.8,0,6.28);g.fill()}
  g.restore();
 }else if(id==='deserto'){
  g.strokeStyle='rgba(150,100,40,.35)';g.lineWidth=1;for(let r=0;r<2;r++){g.beginPath();for(let x=x0+4;x<x1-4;x+=6){const yy=y+3+r*4+Math.sin(x*.09+r*2)*1.2;x===x0+4?g.moveTo(x,yy):g.lineTo(x,yy)}g.stroke()}
  for(let x=x0+10;x<x1-10;x+=14+rnd()*20){g.fillStyle=gRgb(gMix(m.mid,m.dark,rnd()*.5));g.beginPath();g.ellipse(x,y-1,2+rnd()*3,1.5+rnd()*1.5,0,Math.PI,0);g.fill()}
 }else if(id==='mare'){
  g.save();g.lineCap='round';for(let x=x0+3;x<x1-3;x+=3){if(gHash(Math.floor(x*5))<.45)continue;const h=3+gHash(Math.floor(x*9))*6;g.strokeStyle=gRgb(gMix(m.lip,m.top2,gHash(Math.floor(x*3))));g.lineWidth=1.6;g.beginPath();g.moveTo(x,y+2);g.lineTo(x+(gHash(Math.floor(x))-.5)*3,y-h);g.stroke()}
  g.fillStyle='rgba(235,252,255,.55)';for(let x=x0+2;x<x1-2;x+=4)if(gHash(Math.floor(x*7))>.75)g.fillRect(x,y-1.5,2,1.5);
  for(let x=x0+10;x<x1-10;x+=18+rnd()*30){g.strokeStyle='rgba(225,250,255,.22)';g.lineWidth=1;g.beginPath();g.moveTo(x,y+12+rnd()*30);g.lineTo(x+6+rnd()*12,y+12+rnd()*30);g.stroke()}g.restore();
 }else if(id==='lava'){
  g.save();for(let x=x0+12;x<x1-12;x+=30+rnd()*50){g.fillStyle='rgba(255,150,60,.9)';g.shadowBlur=8;g.shadowColor='#ff6a1a';g.beginPath();g.ellipse(x,y+2,2+rnd()*3,1.2,0,0,6.28);g.fill()}
  for(let x=x0+6;x<x1-6;x+=9+rnd()*14){g.fillStyle=gRgb(gMix(m.top2,[0,0,0],rnd()*.4));g.beginPath();g.moveTo(x-4,y+1);g.lineTo(x-1,y-3-rnd()*3);g.lineTo(x+4,y+1);g.fill()}g.restore();
 }else{
  g.save();g.lineCap='round';for(let x=x0+2;x<x1-2;x+=3){const h=2+gHash(Math.floor(x*11))*5;g.strokeStyle=gRgb(gMix(m.lip,m.top2,gHash(Math.floor(x*4))));g.lineWidth=1.5;g.beginPath();g.moveTo(x,y+2);g.lineTo(x+1,y-h);g.stroke()}g.restore();
  for(let x=x0+30;x<x1-30;x+=60+rnd()*90)if(rnd()<.6)gCrystal(g,x,y+1,5+rnd()*5,(rnd()-.5)*.5,['#efe8ff','#7a62d8']);
 }
}
function gDrawSolid(sd,now){
 const c=gSolidCache(sd);if(!c){gOrig.pfDrawSolid(sd,pf.p);return}
 ctx.drawImage(c.c,c.x,c.y,c.w,c.h);
 const id=pf.theme.id;
 if(id==='lava'){const p=.5+.5*Math.sin(now*2.1+sd.x*.01);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.12+p*.12;ctx.fillStyle='#ff5a1f';ctx.fillRect(sd.x,sd.y+2,sd.w,4);ctx.restore()}
 if(id==='foresta'||id==='mare'){ctx.save();ctx.strokeStyle=id==='foresta'?'#a6ea6a':'#6fd09a';ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();for(let x=sd.x+8;x<sd.x+sd.w-8;x+=23){const h=9+gHash(Math.floor(x))*8,sw=Math.sin(now*2.2+x*.05)*2.5;ctx.moveTo(x,sd.y+1);ctx.quadraticCurveTo(x+sw*.4,sd.y-h*.6,x+sw,sd.y-h)}ctx.stroke();ctx.restore()}
}
// Liquido in primo piano: le rocce sembrano emergere dal mare, dalla lava, dalle nubi...
function gDrawFrontLiquid(cx,VW,now){
 const th=pf.theme,m=gMat(),x0=cx-10,x1=cx+VW+10,top=632,wave=x=>top+Math.sin(x/40+now*1.6)*2.2+Math.sin(x/17-now*2.1)*.9;
 ctx.save();
 ctx.beginPath();ctx.moveTo(x0,PF_VH+40);for(let x=x0;x<=x1;x+=10)ctx.lineTo(x,wave(x));ctx.lineTo(x1,PF_VH+40);ctx.closePath();
 const gr=ctx.createLinearGradient(0,top,0,PF_VH);
 if(th.id==='tempesta'){gr.addColorStop(0,'rgba(160,140,240,.25)');gr.addColorStop(.3,'rgba(80,64,160,.75)');gr.addColorStop(1,'rgba(10,8,32,.98)')}
 else if(th.id==='lava'){gr.addColorStop(0,'rgba(255,214,120,.98)');gr.addColorStop(.15,'rgba(255,110,30,.96)');gr.addColorStop(.6,'rgba(150,24,8,.98)');gr.addColorStop(1,'#300402')}
 else{const a=gHex(m.liquid[0]),b=gHex(m.liquid[1]),c=gHex(m.liquid[2]);gr.addColorStop(0,gRgb(a,.82));gr.addColorStop(.35,gRgb(b,.92));gr.addColorStop(1,gRgb(c,1))}
 ctx.fillStyle=gr;ctx.fill();
 // riflessi e schiuma
 ctx.strokeStyle=m.foam;ctx.lineWidth=th.id==='lava'?2.4:1.6;if(th.id==='lava'){ctx.shadowBlur=14;ctx.shadowColor='#ffb04a'}
 ctx.beginPath();for(let x=x0;x<=x1;x+=10){x===x0?ctx.moveTo(x,wave(x)):ctx.lineTo(x,wave(x))}ctx.stroke();ctx.shadowBlur=0;
 ctx.globalAlpha=.35;ctx.lineWidth=1;for(let r=1;r<5;r++){const yy=top+r*r*4+6;ctx.beginPath();for(let x=x0;x<=x1;x+=14){const v=yy+Math.sin(x/(30+r*9)+now*(1+r*.3))*1.5;x===x0?ctx.moveTo(x,v):ctx.lineTo(x,v)}ctx.stroke()}ctx.globalAlpha=1;
 // spuma contro le rocce
 if(th.id!=='tempesta')for(const sd of pf.solids){for(const ex of [sd.x,sd.x+sd.w]){if(ex<x0||ex>x1)continue;for(let i=0;i<4;i++){const k=(now*.9+i/4+gHash(Math.floor(ex))%1)%1;ctx.fillStyle=th.id==='lava'?`rgba(255,220,140,${.7*(1-k)})`:`rgba(235,250,255,${.55*(1-k)})`;ctx.beginPath();ctx.arc(ex+(i-1.5)*6,wave(ex)-k*10,2+k*4,0,6.28);ctx.fill()}}}
 if(th.id==='lava'){for(let x=Math.floor(x0/70)*70;x<x1;x+=70){const k=(now*.5+gHash(x))%1;if(k<.3){ctx.fillStyle=`rgba(255,230,160,${.9*(1-k/.3)})`;ctx.beginPath();ctx.arc(x+gHash(x+3)*50,top+6-k*18,2+k*9,0,6.28);ctx.fill()}}}
 ctx.restore();
}

// ---------------------------------------------------------------- piattaforme
function gPlatCache(pl){
 if(gfx.plats.has(pl))return gfx.plats.get(pl);
 const R=gfx.res,w=pl.w+8,h=34,cv=gCanvas(w*R,h*R);if(!cv)return null;const g=cv.g;g.scale(R,R);g.translate(4,4);
 const W2=pl.w;
 let gr=g.createLinearGradient(0,0,0,16);gr.addColorStop(0,'#6d8399');gr.addColorStop(.18,'#33475a');gr.addColorStop(1,'#141e29');
 g.fillStyle=gr;g.beginPath();g.moveTo(0,0);g.lineTo(W2,0);g.lineTo(W2-6,14);g.lineTo(6,14);g.closePath();g.fill();
 g.fillStyle='#a8c2d6';g.fillRect(2,0,W2-4,1.5);
 g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=1;for(let x=24;x<W2-10;x+=24){g.beginPath();g.moveTo(x,2);g.lineTo(x,13);g.stroke()}
 g.fillStyle='rgba(200,230,255,.35)';for(let x=8;x<W2-4;x+=12){g.beginPath();g.arc(x,8,.9,0,6.28);g.fill()}
 for(const sx of [6,W2-26]){g.save();g.beginPath();g.rect(sx,3,20,9);g.clip();g.fillStyle='#1a1408';g.fillRect(sx,3,20,9);g.fillStyle='#ffb348';for(let i=-2;i<6;i++){g.beginPath();g.moveTo(sx+i*6,12);g.lineTo(sx+i*6+4,3);g.lineTo(sx+i*6+7,3);g.lineTo(sx+i*6+3,12);g.fill()}g.restore()}
 for(const px of [W2*.25,W2*.75]){gr=g.createLinearGradient(px-10,0,px+10,0);gr.addColorStop(0,'#1c2733');gr.addColorStop(.5,'#5d7084');gr.addColorStop(1,'#1c2733');g.fillStyle=gr;g.beginPath();g.moveTo(px-12,14);g.lineTo(px+12,14);g.lineTo(px+7,24);g.lineTo(px-7,24);g.closePath();g.fill();g.fillStyle='#51e6ff';g.shadowBlur=8;g.shadowColor='#51e6ff';g.fillRect(px-6,23,12,2);g.shadowBlur=0}
 const out={c:cv.c,w,h};gfx.plats.set(pl,out);return out;
}
function gDrawPlatform(pl,now){
 const c=gPlatCache(pl);if(!c){gOrig.pfDrawPlatformBeam(pl,now);return}
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const px of [pl.w*.25,pl.w*.75]){const f=.75+.25*Math.sin(now*9+pl.x+px),gr=ctx.createLinearGradient(0,pl.y+24,0,pl.y+90);gr.addColorStop(0,`rgba(81,230,255,${.13*f})`);gr.addColorStop(1,'rgba(81,230,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(pl.x+px-6,pl.y+24);ctx.lineTo(pl.x+px+6,pl.y+24);ctx.lineTo(pl.x+px+22,pl.y+90);ctx.lineTo(pl.x+px-22,pl.y+90);ctx.closePath();ctx.fill()}
 ctx.restore();
 ctx.drawImage(c.c,pl.x-4,pl.y-4,c.w,c.h);
 const on=Math.sin(now*4+pl.x)>0;if(on){gLight(pl.x+4,pl.y+6,40,'#ffb348',.5);gLight(pl.x+pl.w-4,pl.y+6,40,'#ffb348',.5)}
 gLight(pl.x+pl.w*.25,pl.y+30,60,'#51e6ff',.2);gLight(pl.x+pl.w*.75,pl.y+30,60,'#51e6ff',.2);
}

// ---------------------------------------------------------------- luci e ombre
let gLights=[];
function gLight(x,y,r,color,a=1){gLights.push({x,y,r,color,a})}
function gFlash(x,y,r,color,life){gFlashes.push({x,y,r,color,life,max:life})}
function gShadow(x,y,w,a=.38){ctx.save();const gr=ctx.createRadialGradient(x,y,1,x,y,w);gr.addColorStop(0,`rgba(0,0,0,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(x,y,w,w*.22,0,0,6.28);ctx.fill();ctx.restore()}
function gGroundBelow(x,y){let best=null;const g=pfGroundAt(x);if(g!==null&&g>=y-2)best=g;for(const p of pf.plats)if(x>=p.x&&x<=p.x+p.w&&p.y>=y-2&&(best===null||p.y<best))best=p.y;return best}
function gCollectLights(now){
 const P=pf.pilot;
 if(P.visible&&P.fire>.08){const sh=pfShoulder(P);gLight(sh.x+Math.cos(P.aim)*32,sh.y+Math.sin(P.aim)*32,110,'#51e6ff',.9)}
 if(P.visible)gLight(P.x+P.face*5,P.y-(P.crouch?36:54),24,'#8cf2ff',.45);
 for(const b of pf.shots)gLight(b.x,b.y,b.friendly?46:52,b.friendly?'#51e6ff':'#ff5268',.7);
 for(const e of pf.enemies){if(e.type==='drone')gLight(e.x,e.y,50,'#ff5268',.6);else if(pfOnScreen(e.x)){gLight(e.x+e.face*4,e.y-(e.crouch?30:44),22,'#ff5268',.6);if(e.type==='cecchino'&&e.fire<.75)gLight(e.x,e.y-34,60,'#ff5268',.5)}}
 for(const k of pf.pickups)gLight(k.x,k.y,50,k.kind==='salute'?'#8df1ad':k.kind==='granate'?'#ffd080':'#72eaff',.6);
 for(const m of pf.missiles)gLight(m.x,m.y,70,'#ffb05a',.8);
 for(const w of pf.waves)gLight(w.x,PF_FLOOR-14,90,'#ff9a4a',.8);
 for(const h of pf.hostages)if(h.state==='evacuato')gLight(h.x,h.y-40,140,'#8cf2ff',1-h.t);
 const B=pf.boss;if(B&&!B.gone){const pulse=.6+.4*Math.sin(now*(B.state==='stordito'?16:5));gLight(B.x+B.face*12*1.2,B.y-150*1.2,B.state==='stordito'?170:110,'#ff3c4c',.25+pulse*.2);gLight(B.x+B.face*48,B.y-245,50,'#ff3c4c',.45);if(B.state==='raffica')gLight(B.x+B.face*120,B.y-180,100,'#ff5268',Math.min(1,B.t/.45)*.7)}
 if(pf.theme.id==='lava')for(let x=Math.floor(pf.cam.x/260)*260;x<pf.cam.x+pfViewW()+260;x+=260)gLight(x+130,640,260,'#ff5a1f',.32);
 const pose=pfShipPose();if(pose.thrust>0){gLight(pose.x-26,pose.y+60,140,'#51e6ff',pose.thrust);gLight(pose.x+22,pose.y+60,140,'#51e6ff',pose.thrust)}
 gLight(pose.x+2,pose.y,60,'#51e6ff',.25);
 for(const f of gFlashes)gLight(f.x,f.y,f.r*(1.2-f.life/f.max*.2),f.color,f.life/f.max);
}
function gApplyLighting(VW){
 const m=gMat(),cx=pf.cam.x;
 // gradazione del colore: scurisce in basso e tinge la scena del colore del pianeta
 ctx.save();ctx.globalCompositeOperation='multiply';const gr=ctx.createLinearGradient(0,0,0,PF_VH);gr.addColorStop(0,m.grade[0]);gr.addColorStop(1,m.grade[1]);ctx.fillStyle=gr;ctx.fillRect(cx-20,0,VW+40,PF_VH+40);
 ctx.globalCompositeOperation='lighter';
 for(const L of gLights){if(L.x<cx-L.r||L.x>cx+VW+L.r||L.a<=0)continue;ctx.globalAlpha=Math.min(1,L.a);ctx.drawImage(gTinted(L.color),L.x-L.r,L.y-L.r,L.r*2,L.r*2)}
 ctx.restore();
}

// ---------------------------------------------------------------- personaggi
function gLimb(x1,y1,x2,y2,w1,w2,fill,stroke){const a=Math.atan2(y2-y1,x2-x1),nx=-Math.sin(a),ny=Math.cos(a);ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x1+nx*w1/2,y1+ny*w1/2);ctx.lineTo(x2+nx*w2/2,y2+ny*w2/2);ctx.arc(x2,y2,w2/2,a+Math.PI/2,a-Math.PI/2,true);ctx.lineTo(x1-nx*w1/2,y1-ny*w1/2);ctx.arc(x1,y1,w1/2,a-Math.PI/2,a+Math.PI/2,true);ctx.closePath();ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke()}}
function gShade(hex,k){const c=gHex(hex);return gRgb(k>0?gMix(c,[255,255,255],k):gMix(c,[0,0,0],-k))}
function gTrooper(o,pal,now){
 const rebel=pal===PF_REBEL,sniper=o.type==='cecchino',OUT=G_OUT;
 if(o.ground!==false){gShadow(o.x,o.y,20,.42)}else{const gy=gGroundBelow(o.x,o.y);if(gy!==null)gShadow(o.x,gy,Math.max(8,20-(gy-o.y)*.08),Math.max(.08,.4-(gy-o.y)*.003))}
 ctx.save();ctx.translate(o.x,o.y);ctx.scale(o.face*G_SCALE,G_SCALE);ctx.lineJoin='round';ctx.lineCap='round';
 const crouch=!!o.crouch,hip=crouch?-13:-21,moving=o.ground&&Math.abs(o.vx)>20,sw=moving?Math.sin(o.run):0,bob=moving?Math.abs(Math.cos(o.run))*1.2:0;
 ctx.translate(0,-bob);
 const armor=pal.armor,armor2=pal.armor2,suit=pal.suit,glow=pal.glow;
 const edge=(lw=.85)=>{ctx.strokeStyle=OUT;ctx.lineWidth=lw;ctx.stroke()};
 // mantello / sciarpa dei ribelli, dietro al corpo
 if(rebel){const flap=Math.sin(now*7+o.x*.1)*3+(moving?-o.vx*o.face*.012:0);ctx.fillStyle='#7a1424';ctx.beginPath();ctx.moveTo(-4,hip-20);ctx.quadraticCurveTo(-14+flap,hip-8,-18+flap*1.4,hip+(sniper?8:-2));ctx.lineTo(-13+flap,hip+(sniper?10:0));ctx.quadraticCurveTo(-8,hip-6,-2,hip-14);ctx.closePath();ctx.fill();edge(.7);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill();ctx.strokeStyle='rgba(255,120,130,.25)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-6,hip-15);ctx.quadraticCurveTo(-11+flap,hip-7,-14+flap*1.2,hip+(sniper?6:-3));ctx.stroke()}
 // gambe (la gamba lontana è più scura)
 for(const side of [-1,1]){
  let a,b;
  if(crouch){a=side<0?.9:1.25;b=side<0?-.7:-.45}
  else if(!o.ground){a=side<0?-.25:.55;b=side<0?-.9:-.2}
  else{a=sw*side*.6;b=a<0?a*2.1:a*.25}
  const far=side<0,kx=Math.sin(a)*10.5,ky=hip+Math.cos(a)*10.5,fx=kx+Math.sin(b)*10.5,fy=ky+Math.cos(b)*10.5;
  gLimb(0,hip,kx,ky,7.5,6,gShade(suit,far?-.45:0),OUT);
  gLimb(kx,ky,fx,fy-1,6,5.5,gShade(armor2,far?-.5:-.05),OUT);
  // placca sullo stinco e ginocchiera
  ctx.save();ctx.translate(kx,ky);ctx.rotate(-b);ctx.fillStyle=gShade(armor,far?-.45:-.08);ctx.beginPath();ctx.moveTo(1.2,2);ctx.lineTo(3.4,3);ctx.lineTo(3,8);ctx.lineTo(1,8.6);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=gShade(armor,far?-.45:-.1);ctx.beginPath();ctx.arc(kx+.4,ky,3.4,0,6.28);ctx.fill();edge(.7);ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.arc(kx-.4,ky-1,1.3,0,6.28);ctx.fill();
  ctx.save();ctx.translate(fx,fy);ctx.rotate(b*.3);ctx.fillStyle=gShade(rebel?'#3a2a22':'#2a3a48',far?-.4:0);ctx.beginPath();ctx.moveTo(-3.5,-4);ctx.lineTo(3,-4);ctx.lineTo(6.5,-.5);ctx.lineTo(6.5,1.2);ctx.lineTo(-4,1.2);ctx.closePath();ctx.fill();edge(.75);ctx.fillStyle='#0e1216';ctx.fillRect(-4,.2,10.5,1.2);ctx.fillStyle=gShade(armor2,far?-.5:.1);ctx.fillRect(-3.5,-4,6,1.6);ctx.restore();
 }
 // zaino / propulsore
 ctx.fillStyle=gShade(pal.gun,.1);ctx.beginPath();ctx.moveTo(-13,hip-19);ctx.lineTo(-6,hip-20);ctx.lineTo(-5,hip-4);ctx.lineTo(-12,hip-3);ctx.closePath();ctx.fill();edge();
 ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-11.6,hip-16);ctx.lineTo(-7,hip-16.6);ctx.moveTo(-11.4,hip-12);ctx.lineTo(-6.6,hip-12.4);ctx.stroke();
 ctx.fillStyle=gShade(armor2,-.2);ctx.fillRect(-14,hip-6,5,4);ctx.strokeStyle=OUT;ctx.lineWidth=.6;ctx.strokeRect(-14,hip-6,5,4);ctx.fillStyle=glow;ctx.shadowBlur=8;ctx.shadowColor=glow;ctx.fillRect(-13.5,hip-2.2,4,1.6);ctx.shadowBlur=0;
 if(!rebel){ctx.strokeStyle=gShade(armor2,-.2);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,hip-19);ctx.lineTo(-12,hip-30);ctx.stroke();if(Math.sin(now*5)>0){ctx.fillStyle='#ff5060';ctx.beginPath();ctx.arc(-12,hip-30,1.2,0,6.28);ctx.fill()}}
 // mira: angolo del fucile e impugnatura anteriore per il braccio lontano
 let la=o.face>0?o.aim:Math.PI-o.aim;la=Math.atan2(Math.sin(la),Math.cos(la));
 const L=sniper?36:24,ca=Math.cos(la),sa=Math.sin(la),gpx=L*.55,gpy=3,grip={x:2+ca*gpx-sa*gpy,y:hip-14+sa*gpx+ca*gpy};
 {const sx=-1.5,sy=hip-17,u=7.6,f=8.2,dx=grip.x-sx,dy=grip.y-sy,d=Math.min(u+f-.1,Math.max(3,Math.hypot(dx,dy))),base=Math.atan2(dy,dx),off=Math.acos(Math.max(-1,Math.min(1,(u*u+d*d-f*f)/(2*u*d)))),ex=sx+Math.cos(base+off)*u,ey=sy+Math.sin(base+off)*u,hx=sx+Math.cos(base)*d,hy=sy+Math.sin(base)*d;
  gLimb(sx,sy,ex,ey,5,4.4,gShade(armor2,-.5),OUT);gLimb(ex,ey,hx,hy,4.4,4,gShade(suit,-.35),OUT);ctx.fillStyle=gShade(armor,-.5);ctx.beginPath();ctx.arc(ex,ey,2.2,0,6.28);ctx.fill();grip.x=hx;grip.y=hy}
 // busto con corazza
 const torso=ctx.createLinearGradient(-8,hip-21,8,hip);torso.addColorStop(0,gShade(armor,.15));torso.addColorStop(.45,armor);torso.addColorStop(1,gShade(armor2,-.25));
 ctx.fillStyle=gShade(suit,-.1);ctx.fillRect(-7,hip-8,13,8);
 ctx.fillStyle=torso;ctx.beginPath();ctx.moveTo(-7,hip-6);ctx.lineTo(-8.5,hip-15);ctx.lineTo(-5.5,hip-21);ctx.lineTo(5.5,hip-21);ctx.lineTo(8.5,hip-14);ctx.lineTo(6.5,hip-6);ctx.closePath();ctx.fill();edge(.9);
 ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,hip-20);ctx.lineTo(0,hip-7);ctx.moveTo(-7,hip-11);ctx.lineTo(7.5,hip-11);ctx.moveTo(-6.6,hip-8.4);ctx.lineTo(6.8,hip-8.4);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(-5,hip-20);ctx.lineTo(2,hip-20);ctx.lineTo(-6,hip-13);ctx.closePath();ctx.fill();
 ctx.fillStyle=gShade(suit,-.25);ctx.beginPath();ctx.moveTo(-4.5,hip-21);ctx.lineTo(4.5,hip-21);ctx.lineTo(3.4,hip-23);ctx.lineTo(-3.4,hip-23);ctx.closePath();ctx.fill();edge(.6);
 ctx.fillStyle=gShade(suit,-.3);ctx.fillRect(-7.5,hip-4,15,3.5);ctx.strokeStyle=OUT;ctx.lineWidth=.6;ctx.strokeRect(-7.5,hip-4,15,3.5);ctx.fillStyle=glow;ctx.fillRect(-1.5,hip-3.6,3,2.6);
 ctx.fillStyle=gShade(armor2,-.15);ctx.fillRect(3,hip-3,4,5);ctx.fillRect(-6.5,hip-3,3.4,4.4);ctx.strokeRect(3,hip-3,4,5);ctx.strokeRect(-6.5,hip-3,3.4,4.4);
 if(rebel){ctx.fillStyle='#ff5268';ctx.beginPath();ctx.moveTo(1,hip-17);ctx.lineTo(4,hip-12);ctx.lineTo(-2,hip-12);ctx.closePath();ctx.fill();ctx.fillStyle='#2b0a12';ctx.fillRect(.6,hip-14.6,.9,1.6)}else{ctx.fillStyle=glow;ctx.fillRect(1.5,hip-17,4.5,1.4);ctx.fillStyle=gShade(armor2,-.3);ctx.fillRect(1.5,hip-15,4.5,.8)}
 // testa: casco del pilota o cappuccio con maschera antigas dei ribelli
 const hy=hip-28;
 if(rebel){
  ctx.fillStyle='#4a1622';ctx.beginPath();ctx.moveTo(-8,hy+8);ctx.quadraticCurveTo(-11,hy-8,-1,hy-9.5);ctx.quadraticCurveTo(9,hy-8,8,hy+2);ctx.lineTo(5,hy+8);ctx.closePath();ctx.fill();edge(.9);
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-6,hy+5);ctx.quadraticCurveTo(-8,hy-4,-2,hy-7.6);ctx.stroke();
  ctx.fillStyle='#5b5a5e';ctx.beginPath();ctx.ellipse(2.5,hy,5.5,6,0,0,6.28);ctx.fill();edge(.8);
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(1.4,hy-2.6,3,1.6,-.3,0,6.28);ctx.fill();
  ctx.fillStyle='#2b2a2e';ctx.beginPath();ctx.arc(6.5,hy+4,3,0,6.28);ctx.fill();edge(.7);ctx.fillStyle='#77767a';ctx.fillRect(7.5,hy+2.5,2.5,3);ctx.strokeStyle='#1a191c';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(8.3,hy+2.5);ctx.lineTo(8.3,hy+5.5);ctx.moveTo(9.2,hy+2.5);ctx.lineTo(9.2,hy+5.5);ctx.stroke();
  ctx.fillStyle='#1a1418';ctx.beginPath();ctx.arc(5,hy-2.2,2.7,0,6.28);ctx.arc(1,hy-2.4,2.4,0,6.28);ctx.fill();
  ctx.fillStyle='#ff3c4c';ctx.shadowBlur=9;ctx.shadowColor='#ff3c4c';ctx.beginPath();ctx.arc(5,hy-2.2,1.9,0,6.28);ctx.arc(1,hy-2.4,1.6,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,230,230,.85)';ctx.fillRect(4.2,hy-3.4,.9,.9);ctx.fillRect(.3,hy-3.6,.8,.8);
 }else{
  const helm=ctx.createRadialGradient(-2.5,hy-4,1,0,hy,8.5);helm.addColorStop(0,'#ffffff');helm.addColorStop(.35,armor);helm.addColorStop(1,gShade(armor2,-.35));
  ctx.fillStyle=helm;ctx.beginPath();ctx.arc(0,hy,7.4,0,6.28);ctx.fill();edge(.95);
  ctx.strokeStyle=gShade(armor2,-.25);ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,hy,5.6,Math.PI*1.05,Math.PI*1.62);ctx.stroke();
  ctx.fillStyle=gShade(armor2,-.2);ctx.fillRect(-7.5,hy+2,5,5);ctx.strokeStyle=OUT;ctx.lineWidth=.6;ctx.strokeRect(-7.5,hy+2,5,5);ctx.fillStyle=glow;ctx.fillRect(-1.5,hy-7.6,2.4,4);
  ctx.fillStyle=gShade(armor2,-.1);ctx.beginPath();ctx.arc(-2.6,hy+.6,2.6,0,6.28);ctx.fill();edge(.6);ctx.strokeStyle=glow;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(-2.6,hy+.6,1.4,0,6.28);ctx.stroke();
  const vis=ctx.createLinearGradient(0,hy-4,8,hy+3);vis.addColorStop(0,'#0b2c3b');vis.addColorStop(.55,pal.visor);vis.addColorStop(1,'#e8ffff');
  ctx.fillStyle=vis;ctx.shadowBlur=8;ctx.shadowColor=glow;ctx.beginPath();ctx.moveTo(0,hy-3.5);ctx.quadraticCurveTo(7,hy-4.5,8,hy+.5);ctx.quadraticCurveTo(7,hy+3.5,1,hy+2.5);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=gShade(armor2,-.45);ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(3,hy-3,2.6,1);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(5.6,hy-1.6,1.2,.7);
 }
 // braccio e fucile, orientati verso il bersaglio
 ctx.save();ctx.translate(2,hip-14);ctx.rotate(la);
 gLimb(-2,0,8,1.5,5.5,4.5,gShade(armor2,-.1),OUT);
 const gun=ctx.createLinearGradient(0,-4,0,4);gun.addColorStop(0,gShade(pal.gun,.45));gun.addColorStop(.5,pal.gun);gun.addColorStop(1,gShade(pal.gun,-.4));
 ctx.fillStyle=gun;ctx.beginPath();ctx.moveTo(2,-3);ctx.lineTo(L-6,-3);ctx.lineTo(L-6,-1.6);ctx.lineTo(L+2,-1.6);ctx.lineTo(L+2,1.6);ctx.lineTo(L-6,1.6);ctx.lineTo(L-8,3.5);ctx.lineTo(4,3.5);ctx.closePath();ctx.fill();edge(.8);
 ctx.fillStyle=gShade(pal.gun,-.2);ctx.fillRect(9,3,4,5);ctx.fillRect(3,1,3,4);ctx.strokeStyle=OUT;ctx.lineWidth=.6;ctx.strokeRect(9,3,4,5);
 ctx.fillStyle=gShade(pal.edge,-.1);ctx.fillRect(8,-5,sniper?14:7,2);ctx.strokeRect(8,-5,sniper?14:7,2);
 if(sniper){ctx.fillStyle=glow;ctx.beginPath();ctx.arc(21.6,-4,1,0,6.28);ctx.fill()}
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.5;for(let x=L-14;x<L-7;x+=2){ctx.beginPath();ctx.moveTo(x,-2.6);ctx.lineTo(x,1.2);ctx.stroke()}
 ctx.fillStyle=glow;ctx.shadowBlur=8;ctx.shadowColor=glow;ctx.fillRect(10,-.8,L-18,1.6);ctx.fillRect(L,-1.2,2.6,2.4);ctx.shadowBlur=0;
 // spallaccio e guanto sull'impugnatura
 ctx.rotate(-la);const pad=ctx.createLinearGradient(0,-5,0,2);pad.addColorStop(0,gShade(armor,.2));pad.addColorStop(1,gShade(armor2,-.15));ctx.fillStyle=pad;ctx.beginPath();ctx.moveTo(-4.6,1.4);ctx.quadraticCurveTo(-5.2,-4.6,.2,-4.8);ctx.quadraticCurveTo(4.8,-4.4,4.4,.2);ctx.quadraticCurveTo(0,1.2,-4.6,1.4);ctx.closePath();ctx.fill();edge(.8);ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-4.4,-1.4);ctx.quadraticCurveTo(0,-2.6,4.5,-2);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(-2.6,-4,3.6,.9);ctx.rotate(la);
 ctx.fillStyle=gShade(rebel?'#2b1a1e':'#22313c',0);ctx.beginPath();ctx.arc(9,2.2,2.5,0,6.28);ctx.fill();edge(.6);
 ctx.restore();
 // mano lontana sull'impugnatura anteriore, sopra il fucile
 ctx.fillStyle=gShade(rebel?'#2b1a1e':'#22313c',-.15);ctx.beginPath();ctx.arc(grip.x,grip.y,2.3,0,6.28);ctx.fill();edge(.6);
 ctx.restore();
}
function gDrone(e,now){
 const gy=gGroundBelow(e.x,e.y+11);if(gy!==null)gShadow(e.x,gy,18,Math.max(.06,.3-(gy-e.y)*.0012));
 ctx.save();ctx.translate(e.x,e.y);ctx.scale(1.2,1.2);
 drawPlume(-7,10,0,1,12+Math.random()*5,3,'#ff5268');drawPlume(7,10,0,1,12+Math.random()*5,3,'#ff5268');
 for(const sx of [-1,1]){
  ctx.fillStyle='#2a1e24';ctx.fillRect(sx*14-3,-8,6,6);ctx.strokeStyle='#4a3238';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx*6,-4);ctx.lineTo(sx*14,-6);ctx.stroke();
  const gr=ctx.createRadialGradient(sx*14,-10,1,sx*14,-10,15);gr.addColorStop(0,'rgba(255,200,205,.35)');gr.addColorStop(1,'rgba(255,150,160,.03)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(sx*14,-10,15,3.2,0,0,6.28);ctx.fill();
  ctx.strokeStyle='rgba(255,220,225,.55)';ctx.lineWidth=1;const a=now*45*sx;ctx.beginPath();ctx.moveTo(sx*14-Math.cos(a)*14,-10);ctx.lineTo(sx*14+Math.cos(a)*14,-10);ctx.stroke();
 }
 const hull=ctx.createRadialGradient(-5,-6,1,0,0,16);hull.addColorStop(0,e.hit>0?'#ffffff':'#e8c8cc');hull.addColorStop(.35,e.hit>0?'#ffffff':'#a64a58');hull.addColorStop(1,'#2a0e16');
 ctx.fillStyle=hull;ctx.beginPath();ctx.moveTo(-15,-1);ctx.quadraticCurveTo(-14,-11,0,-11);ctx.quadraticCurveTo(14,-11,15,-1);ctx.lineTo(10,8);ctx.lineTo(-10,8);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-12,1);ctx.lineTo(12,1);ctx.moveTo(-5,-10);ctx.lineTo(-6,1);ctx.moveTo(5,-10);ctx.lineTo(6,1);ctx.stroke();
 ctx.fillStyle='#1a0a10';ctx.fillRect(-3,7,6,5);ctx.fillStyle='#3a2a30';ctx.save();ctx.translate(0,11);ctx.rotate(e.aim-Math.PI/2);ctx.fillRect(-1.5,0,3,9);ctx.restore();
 const ex=Math.cos(e.aim)*3,ey=Math.sin(e.aim)*2;ctx.fillStyle='#0c0408';ctx.beginPath();ctx.arc(ex*.6,-2+ey*.5,5.2,0,6.28);ctx.fill();
 ctx.fillStyle='#ff3c4c';ctx.shadowBlur=12;ctx.shadowColor='#ff3c4c';ctx.beginPath();ctx.arc(ex,-2+ey,2.8,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillRect(ex-1.4,-3.6+ey,1.2,1.2);
 if(Math.sin(now*8+e.x)>.4){ctx.fillStyle='#ffb348';ctx.beginPath();ctx.arc(-13,1,1.3,0,6.28);ctx.arc(13,1,1.3,0,6.28);ctx.fill()}
 ctx.restore();
}
function gEnemy(e,now){
 if(e.type==='drone')gDrone(e,now);
 else{
  if(e.type==='cecchino'&&e.fire<.75&&pfOnScreen(e.x)){const sh=pfShoulder(e),a=e.locked??e.aim,on=e.locked!==null||Math.floor(now*14)%2;ctx.save();ctx.strokeStyle=`rgba(255,82,104,${on?.6:.2})`;ctx.lineWidth=1.2;ctx.shadowBlur=6;ctx.shadowColor='#ff5268';ctx.beginPath();ctx.moveTo(sh.x+Math.cos(a)*38,sh.y+Math.sin(a)*38);ctx.lineTo(sh.x+Math.cos(a)*1400,sh.y+Math.sin(a)*1400);ctx.stroke();ctx.restore()}
  ctx.save();if(e.hit>0)ctx.filter='brightness(2.2)';gTrooper(e,PF_REBEL,now);ctx.restore();
  if(e.type==='cecchino'){ctx.fillStyle='#ff5268';ctx.font='700 8px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('CECCHINO',e.x,e.y-84)}
 }
 const top=e.type==='drone'?e.y-26:e.y-74;
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(e.x-15,top-1,30,5);ctx.fillStyle=hpColor(e.hp/e.max);ctx.fillRect(e.x-14,top,28*Math.max(0,e.hp/e.max),3);
}
// Coloni e ostaggi: ognuno ha un aspetto suo (pelle, capelli, corporatura) e pose articolate con volto espressivo.
const G_SKIN=['#f3cfb3','#e7b48f','#d39a6e','#b07a52','#8a5636','#5e3a24'];
const G_HAIR=['#2a1d17','#4a2e1c','#7a4a24','#b8863e','#16161c','#8a3420','#cfc8bc'];
function gLook(h){if(h._look)return h._look;const r=k=>gHash(h.id*131+k*977+17);return h._look={skin:G_SKIN[Math.floor(r(1)*G_SKIN.length)],hair:G_HAIR[Math.floor(r(2)*G_HAIR.length)],style:Math.floor(r(3)*5),size:.94+r(4)*.1,wide:.92+r(5)*.16,beard:r(6)<.2,cap:r(7)<.18}}
function gBoot(x,y,rot,dark){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=gShade('#4a382c',dark?-.4:0);ctx.beginPath();ctx.moveTo(-3.2,-4.4);ctx.lineTo(2.6,-4.4);ctx.lineTo(3.4,-2.2);ctx.quadraticCurveTo(6.8,-1.8,6.8,.4);ctx.lineTo(6.8,1.4);ctx.lineTo(-3.6,1.4);ctx.closePath();ctx.fill();ctx.strokeStyle=G_OUT;ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle='#17110d';ctx.fillRect(-3.6,.3,10.4,1.3);ctx.fillStyle='rgba(255,235,200,.28)';ctx.fillRect(-2.6,-4,4.4,.9);ctx.restore()}
function gHand(x,y,skin){ctx.fillStyle=skin;ctx.beginPath();ctx.arc(x,y,2.05,0,6.28);ctx.fill();ctx.strokeStyle=G_OUT;ctx.lineWidth=.7;ctx.stroke()}
function gFace(hx,hy,L,expr,now,h){
 const sk=L.skin,hair=L.hair,hl=gShade(hair,.35);
 ctx.lineWidth=.8;ctx.strokeStyle=G_OUT;
 // capelli dietro la testa (coda o capelli lunghi)
 if(!L.cap&&L.style===1){const sw=Math.sin(now*6+h.id)*1.2;ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(hx-4,hy-4.5);ctx.quadraticCurveTo(hx-9.5+sw,hy-3,hx-9+sw,hy+5.5);ctx.quadraticCurveTo(hx-7.2+sw,hy+3,hx-5,hy-.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=gShade(hair,-.3);ctx.fillRect(hx-6,hy-4.2,1.8,2.4)}
 if(!L.cap&&L.style===3){ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(hx-2.4,hy+1.8,4.6,7.4,.12,0,6.28);ctx.fill();ctx.stroke()}
 // viso con chiaroscuro
 const f=ctx.createRadialGradient(hx+1.8,hy-2.4,.5,hx,hy,6.4);f.addColorStop(0,gShade(sk,.22));f.addColorStop(.6,sk);f.addColorStop(1,gShade(sk,-.22));
 ctx.fillStyle=f;ctx.beginPath();ctx.ellipse(hx,hy,5.4,5.9,0,0,6.28);ctx.fill();ctx.stroke();
 // naso e mento
 ctx.fillStyle=sk;ctx.beginPath();ctx.moveTo(hx+5,hy-1.4);ctx.quadraticCurveTo(hx+7.3,hy+1,hx+5.1,hy+1.7);ctx.closePath();ctx.fill();ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(hx+5.1,hy-1.3);ctx.quadraticCurveTo(hx+7.3,hy+1,hx+5.1,hy+1.7);ctx.stroke();
 // guancia e orecchio
 ctx.fillStyle='rgba(230,90,90,.22)';ctx.beginPath();ctx.arc(hx+2.6,hy+2,1.7,0,6.28);ctx.fill();
 ctx.fillStyle=gShade(sk,-.12);ctx.beginPath();ctx.ellipse(hx-1.3,hy+.6,1.35,1.9,0,0,6.28);ctx.fill();ctx.lineWidth=.55;ctx.stroke();
 // barba
 if(L.beard){ctx.fillStyle=gRgb(gHex(hair),.85);ctx.beginPath();ctx.moveTo(hx-2.2,hy+.8);ctx.quadraticCurveTo(hx-1.2,hy+6.6,hx+2.8,hy+5.6);ctx.quadraticCurveTo(hx+5,hy+4.6,hx+5.2,hy+2.4);ctx.lineTo(hx+3.2,hy+2.9);ctx.quadraticCurveTo(hx+1,hy+3.6,hx-.4,hy+1.2);ctx.closePath();ctx.fill()}
 // capelli o berretto
 ctx.lineWidth=.8;
 if(L.cap){
  ctx.fillStyle=h.suit||'#d98a3a';ctx.beginPath();ctx.moveTo(hx-5.6,hy-.6);ctx.quadraticCurveTo(hx-5.6,hy-6.8,hx,hy-6.6);ctx.quadraticCurveTo(hx+5,hy-6.4,hx+5.2,hy-2.4);ctx.lineTo(hx-5.6,hy-1.6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=gShade(h.suitD||'#9a5a22',-.2);ctx.beginPath();ctx.moveTo(hx+3.6,hy-2.6);ctx.lineTo(hx+9,hy-2.2);ctx.lineTo(hx+8.6,hy-1.2);ctx.lineTo(hx+3.4,hy-1.4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#51e6ff';ctx.beginPath();ctx.arc(hx+.6,hy-4.4,1,0,6.28);ctx.fill();
  ctx.fillStyle=hair;ctx.fillRect(hx-5,hy-1.4,2.2,2.6);
 }else{
  const thin=L.style===4;
  ctx.fillStyle=thin?gRgb(gHex(hair),.75):hair;ctx.beginPath();ctx.moveTo(hx+5.3,hy-2.4);ctx.quadraticCurveTo(hx+4.2,hy-(thin?6.3:7.1),hx-.4,hy-(thin?6.1:6.7));ctx.quadraticCurveTo(hx-6.6,hy-5.8,hx-5.9,hy+1.4);ctx.quadraticCurveTo(hx-4.6,hy+3.2,hx-3,hy+.8);ctx.quadraticCurveTo(hx-2.2,hy-2.8,hx+1,hy-3.2);ctx.quadraticCurveTo(hx+3.6,hy-3.4,hx+5.3,hy-2.4);ctx.closePath();ctx.fill();if(!thin)ctx.stroke();
  if(!thin){ctx.strokeStyle=hl;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(hx-3.6,hy-4);ctx.quadraticCurveTo(hx-.5,hy-6.2,hx+2.8,hy-5);ctx.stroke()}
  if(L.style===2){ctx.fillStyle=hair;ctx.strokeStyle=G_OUT;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(hx-4.6,hy-5,2.6,0,6.28);ctx.fill();ctx.stroke()}
 }
 // occhio, sopracciglio e bocca secondo l'espressione
 const ex=hx+3,ey=hy-.7,up=expr==='paura'?-.35:0;
 if(expr==='felice'){ctx.strokeStyle='#1e1612';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(ex+.2,ey+.4,1.15,Math.PI*1.1,Math.PI*1.95);ctx.stroke()}
 else{ctx.fillStyle='#f6f2ea';ctx.beginPath();ctx.ellipse(ex,ey,1.4,expr==='paura'?1.25:1.05,0,0,6.28);ctx.fill();ctx.fillStyle='#1e1612';ctx.beginPath();ctx.arc(ex+.55,ey+up,.78,0,6.28);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(ex+.6,ey-.55+up,.5,.5)}
 const bA=expr==='paura'?-.9:expr==='sforzo'?.5:-.2,bB=expr==='paura'?.4:expr==='sforzo'?-.5:-.4;
 ctx.strokeStyle=gShade(hair,-.25);ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(ex-1.5,ey-1.9-bB);ctx.lineTo(ex+1.6,ey-2.1+bA);ctx.stroke();
 const mx=hx+4,my=hy+3.1;ctx.fillStyle='#5a1f1c';ctx.strokeStyle='#4a1a16';ctx.lineWidth=.7;
 if(expr==='paura'){ctx.beginPath();ctx.ellipse(mx,my,.9,1.25+Math.abs(Math.sin(now*4+h.id))*.35,0,0,6.28);ctx.fill()}
 else if(expr==='felice'){ctx.beginPath();ctx.moveTo(mx-1.6,my-.5);ctx.quadraticCurveTo(mx,my+2.1,mx+1.4,my-.7);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(mx-1,my-.5,1.9,.6)}
 else{ctx.beginPath();ctx.moveTo(mx-1.4,my);ctx.lineTo(mx+1.2,my-.2);ctx.stroke()}
}
function gColonistBody(h,L,P,now){
 const suit=h.suit||'#d98a3a',suitD=h.suitD||'#9a5a22',sk=L.skin,w=L.wide,hip=P.hip;
 ctx.lineJoin='round';ctx.lineCap='round';
 const leg=(i,far)=>{const [a,b]=P.legs[i],kx=Math.sin(a)*9.4,ky=hip+Math.cos(a)*9.4,fx=kx+Math.sin(b)*9,fy=ky+Math.cos(b)*9;
  gLimb(0,hip,kx,ky,7*w,6,gShade(suitD,far?-.38:-.02),G_OUT);
  gLimb(kx,ky,fx,fy-1.4,6,5.2,gShade(suitD,far?-.45:-.12),G_OUT);
  ctx.fillStyle=gShade(suit,far?-.3:.12);ctx.beginPath();ctx.ellipse(kx+.6,ky,2.3,2.6,a,0,6.28);ctx.fill();
  gBoot(fx,fy,P.boot!==undefined?P.boot:b*.35,far)};
 const sh={x:.6,y:-15.6};
 const arm=(i,far)=>{const [a,b]=P.arms[i],ex=sh.x+Math.sin(a)*7,ey=sh.y+Math.cos(a)*7,hx=ex+Math.sin(b)*6.6,hy=ey+Math.cos(b)*6.6;
  gLimb(sh.x,sh.y,ex,ey,4.6*w,4,gShade(suit,far?-.38:.02),G_OUT);
  gLimb(ex,ey,hx,hy,4,3.6,gShade(suit,far?-.42:-.06),G_OUT);
  ctx.fillStyle=gShade(suitD,far?-.35:0);ctx.fillRect(hx-1.9,hy-1.9,0,0);
  gHand(hx,hy,far?gShade(sk,-.25):sk);return{x:hx,y:hy}};
 if(P.backArms!==false)leg(0,true);
 ctx.save();ctx.translate(0,hip);ctx.rotate(P.lean||0);
 const farHand=arm(0,true);
 ctx.restore();
 if(P.backArms===false)leg(0,true);
 leg(1,false);
 ctx.save();ctx.translate(0,hip);ctx.rotate(P.lean||0);
 // busto: tuta da colono con colletto, cerniera, fascia riflettente, cintura e stemma
 const body=ctx.createLinearGradient(-6,-18,6,0);body.addColorStop(0,gShade(suit,.28));body.addColorStop(.55,suit);body.addColorStop(1,gShade(suitD,-.12));
 ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-4.9*w,.5);ctx.lineTo(-5.8*w,-11.5);ctx.quadraticCurveTo(-5.9*w,-17.2,-2,-17.6);ctx.lineTo(3,-17.6);ctx.quadraticCurveTo(6.6*w,-17.2,6.4*w,-11.5);ctx.lineTo(5.4*w,.5);ctx.closePath();ctx.fill();ctx.strokeStyle=G_OUT;ctx.lineWidth=.85;ctx.stroke();
 ctx.save();ctx.clip();
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(-7,-18,3.2,19);
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(4.2*w,-16,1.4,15);
 ctx.fillStyle='#f3e3b0';ctx.fillRect(-7,-10.4,15,1.7);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(-7,-10.4,15,.5);
 ctx.restore();
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(1.9,-14);ctx.lineTo(1.4,-2.6);ctx.stroke();ctx.strokeRect(-4.2,-8,2.9,2.7);
 ctx.fillStyle=gShade(suit,.45);ctx.beginPath();ctx.moveTo(-1.6,-17.6);ctx.lineTo(1.9,-13.4);ctx.lineTo(1.2,-17.6);ctx.closePath();ctx.moveTo(2.4,-17.6);ctx.lineTo(1.9,-13.4);ctx.lineTo(5,-17.2);ctx.closePath();ctx.fill();ctx.strokeStyle=G_OUT;ctx.lineWidth=.5;ctx.stroke();
 ctx.fillStyle='#3a2a20';ctx.fillRect(-5.2*w,-3.2,10.7*w,2.6);ctx.fillStyle='#d8c08a';ctx.fillRect(.6,-3.4,2.6,3);ctx.fillStyle='#2a1e16';ctx.fillRect(1.3,-2.7,1.2,1.6);
 ctx.fillStyle='#0d2a3a';ctx.beginPath();ctx.arc(-2.8,-14.2,1.7,0,6.28);ctx.fill();ctx.fillStyle='#51e6ff';ctx.beginPath();ctx.arc(-2.8,-14.2,.8,0,6.28);ctx.fill();
 // corde dell'ostaggio
 if(P.rope){ctx.lineWidth=2;for(const [y1,y2] of [[-13.5,-12.4],[-8.6,-7.6]]){ctx.strokeStyle='#5a4428';ctx.beginPath();ctx.moveTo(-6.4,y1+.4);ctx.lineTo(6.8,y2+.4);ctx.stroke();ctx.strokeStyle='#d6b47a';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-6.4,y1);ctx.lineTo(6.8,y2);ctx.stroke();ctx.lineWidth=2}
  ctx.fillStyle='#d6b47a';ctx.beginPath();ctx.arc(farHand.x+.5,farHand.y,1.6,0,6.28);ctx.fill();ctx.strokeStyle='#5a4428';ctx.lineWidth=.6;ctx.stroke()}
 // collo e testa
 const hx=1+(P.headX||0),hy=-23.4;
 ctx.fillStyle=gShade(sk,-.18);ctx.fillRect(-.6,-20,3.2,3.2);
 ctx.save();ctx.translate(hx,hy);ctx.rotate(P.tilt||0);gFace(0,0,L,P.expr,now,h);ctx.restore();
 if(!P.rope)arm(1,false);
 ctx.restore();
}
function gColonist(h,now){
 if(h.state!=='evacuato'&&!h.air)gShadow(h.x,h.y,16,.38);
 const L=gLook(h);
 ctx.save();ctx.translate(h.x,h.y);ctx.scale(G_SCALE*L.size,G_SCALE*L.size);
 if(h.state==='evacuato'){const k=h.t;ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(-24,0,24,0);g.addColorStop(0,'rgba(81,230,255,0)');g.addColorStop(.5,`rgba(160,245,255,${.6*(1-k*.6)})`);g.addColorStop(1,'rgba(81,230,255,0)');ctx.fillStyle=g;ctx.fillRect(-24,-PF_VH,48,PF_VH);for(let i=0;i<8;i++){const yy=-((now*120+i*40)%160);ctx.fillStyle='rgba(220,255,255,.7)';ctx.fillRect((gHash(i)-.5)*30,yy,1.5,6)}ctx.restore();ctx.globalAlpha=Math.max(0,1-k);ctx.translate(0,-k*60)}
 if(h.state==='legato'){
  // seduto a terra, mani legate dietro la schiena, si divincola e guarda il pilota
  const st=Math.sin(now*5+h.id)*.07;
  gColonistBody(h,L,{hip:-5.5,lean:-.14+st,legs:[[1.95,.18],[1.75,.32]],arms:[[-.55,.75],[-.4,.95]],rope:true,expr:'paura',tilt:-.12+st*.6,headX:.4,boot:-.15},now);
  const bob=Math.sin(now*4+h.id)*3;ctx.fillStyle='rgba(6,18,30,.92)';ctx.strokeStyle='#ffd080';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect?ctx.roundRect(-26,-62+bob,52,18,4):ctx.rect(-26,-62+bob,52,18);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-4,-44+bob);ctx.lineTo(0,-39+bob);ctx.lineTo(4,-44+bob);ctx.fill();
  ctx.fillStyle='#ffd080';ctx.font='700 10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('AIUTO!',0,-49+bob);
 }else if(h.state==='fuga'){
  // corsa verso la nave (verso sinistra): falcata ampia, braccia piegate, busto in avanti
  ctx.scale(-1,1);const ph=h.t*14+h.id,s=Math.sin(ph),lift=h.air?-5:Math.abs(Math.cos(ph))*-2.2;ctx.translate(0,lift);
  const legs=h.air?[[.9,-.5],[-.3,-1]]:[-1,1].map(sd=>{const a=s*sd*.78;return[a,a<0?a-.95:a*.2]});
  gColonistBody(h,L,{hip:-18.6,lean:.3,legs,arms:[[s*.9,s*.9+1.5],[-s*.9,-s*.9+1.5]],expr:'sforzo',tilt:-.1},now);
 }else{
  // liberato o sul raggio di evacuazione: in piedi che saluta felice
  const ev=h.state==='evacuato',wave=Math.sin(now*12+h.id)*.38,hop=ev?0:Math.max(0,Math.sin(now*9+h.id))*-1.6;ctx.translate(0,hop);
  gColonistBody(h,L,{hip:-18.6,lean:.02,legs:ev?[[-.12,.05],[.15,.12]]:[[-.08,0],[.1,0]],arms:ev?[[2.7,3],[1.95,2.75]]:[[.18,.35],[2+wave*.3,2.6+wave*.5]],expr:'felice',tilt:-.06},now);
 }
 ctx.restore();
}

// ---------------------------------------------------------------- robot TITANO R-9
function gPlate(points,fill,edge,light){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(edge){ctx.strokeStyle=edge;ctx.lineWidth=1.4;ctx.stroke()}if(light){ctx.save();ctx.clip();ctx.strokeStyle=light;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);ctx.lineTo(points[1][0],points[1][1]);ctx.stroke();ctx.restore()}}
function gRivets(pts){ctx.fillStyle='#9fb2c4';for(const [x,y] of pts){ctx.beginPath();ctx.arc(x,y,1.3,0,6.28);ctx.fill()}ctx.fillStyle='rgba(0,0,0,.5)';for(const [x,y] of pts){ctx.beginPath();ctx.arc(x+.5,y+.6,.8,0,6.28);ctx.fill()}}
function gBoss(B,now){
 const charging=B.state==='carica'&&B.t<.8,stunned=B.state==='stordito',dying=B.state==='distrutto',dmg=1-Math.max(0,B.hp)/B.max;
 gShadow(B.x,B.y+1,105,.55);
 ctx.save();ctx.translate(B.x,B.y);ctx.scale(B.face,1);
 if(B.state==='onda'&&B.t<.5)ctx.translate(0,B.t*16);
 if(stunned)ctx.rotate(.06*Math.sin(now*20));
 if(dying)ctx.translate((Math.random()-.5)*4,(Math.random()-.5)*3);
 ctx.scale(1.2,1.2);
 const steel=(x0,y0,x1,y1,k=0)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,gShade('#55697d',.15+k));g.addColorStop(.45,gShade('#34465a',k));g.addColorStop(1,gShade('#141c26',k));return g};
 const walk=B.legT;
 // gamba lontana poi gamba vicina
 for(const side of [-1,1]){
  const far=side<0,k=far?-.35:0,hx=side*18,sw=Math.sin(walk+(far?Math.PI:0))*12,kx=hx+16+sw*.4,ky=-56,ax=hx-4+sw,ay=-14;
  ctx.fillStyle=gShade('#2a3644',k);ctx.beginPath();ctx.arc(hx,-96,13,0,6.28);ctx.fill();
  gPlate([[hx-10,-104],[hx+12,-100],[kx+9,ky-4],[kx-6,ky+4]],steel(hx-10,-104,kx+9,ky,k),gShade('#8b9ba9',k-.1),'rgba(200,220,240,.3)');
  // pistone idraulico
  ctx.strokeStyle=gShade('#c9d6e2',k);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(hx-8,-90);ctx.lineTo((hx-8+ax)/2,(-90+ay)/2);ctx.stroke();ctx.strokeStyle=gShade('#2b3846',k);ctx.lineWidth=6;ctx.beginPath();ctx.moveTo((hx-8+ax)/2,(-90+ay)/2);ctx.lineTo(ax-4,ay-6);ctx.stroke();
  gPlate([[kx-7,ky-3],[kx+8,ky],[ax+7,ay],[ax-8,ay-3]],steel(kx,ky,ax,ay,k-.05),gShade('#8b9ba9',k-.1));
  ctx.fillStyle=gShade('#1d2733',k);ctx.beginPath();ctx.arc(kx,ky,7,0,6.28);ctx.fill();ctx.fillStyle='#ff3c4c';ctx.shadowBlur=10;ctx.shadowColor='#ff3c4c';ctx.beginPath();ctx.arc(kx,ky,2.8,0,6.28);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle=gShade('#1d2733',k);ctx.beginPath();ctx.arc(ax,ay,5,0,6.28);ctx.fill();
  gPlate([[ax-30,0],[ax-22,-14],[ax+14,-15],[ax+30,-5],[ax+38,0]],steel(ax,-15,ax,0,k-.1),gShade('#64798d',k));
  ctx.fillStyle=gShade('#0f151d',k);for(const tx of [ax+26,ax+36])ctx.fillRect(tx,-3,7,3);
  ctx.fillStyle=gShade('#ff9d3d',k-.2);ctx.fillRect(ax-18,-12,22,2);
 }
 // bacino
 gPlate([[-36,-110],[36,-110],[30,-86],[-30,-86]],steel(0,-110,0,-86),'#8b9ba9');
 ctx.save();ctx.beginPath();ctx.rect(-30,-104,60,10);ctx.clip();ctx.fillStyle='#ff9d3d';for(let i=-4;i<6;i++){ctx.beginPath();ctx.moveTo(i*12,-94);ctx.lineTo(i*12+6,-104);ctx.lineTo(i*12+12,-104);ctx.lineTo(i*12+6,-94);ctx.fill()}ctx.restore();
 // spalla e braccio posteriori
 ctx.fillStyle=gShade('#2a3644',-.35);ctx.beginPath();ctx.ellipse(-34,-168,18,22,0,0,6.28);ctx.fill();
 // pod missilistico
 const pod=B.state==='missili';gPlate([[-60,-218],[-14,-222],[-12,-186],[-58,-184]],steel(-60,-222,-12,-184),'#8b9ba9','rgba(200,220,240,.35)');
 for(let r=0;r<2;r++)for(let c=0;c<3;c++){const x=-50+c*13,y=-212+r*13;ctx.fillStyle='#05090f';ctx.beginPath();ctx.arc(x,y,4.4,0,6.28);ctx.fill();ctx.fillStyle=pod?'#ffb05a':'#3a1a1a';if(pod){ctx.shadowBlur=8;ctx.shadowColor='#ff9d3d'}ctx.beginPath();ctx.arc(x,y,2.2,0,6.28);ctx.fill();ctx.shadowBlur=0}
 // busto principale a piastre
 const torso=[[-52,-188],[38,-198],[62,-154],[50,-104],[-44,-100],[-58,-144]];
 gPlate(torso,steel(-52,-198,50,-100),'#9fb2c4');
 gPlate([[-40,-182],[30,-190],[48,-156],[-46,-148]],steel(-40,-190,48,-148,.08),'rgba(0,0,0,.5)','rgba(220,235,250,.45)');
 gPlate([[-46,-142],[50,-150],[44,-112],[-40,-108]],steel(-46,-150,44,-108,-.05),'rgba(0,0,0,.5)');
 // prese d'aria
 ctx.fillStyle='#0a0f15';for(let i=0;i<4;i++)ctx.fillRect(-36,-138+i*7,22,3.2);
 const heat=.4+.4*Math.sin(now*3)+(stunned?.5:0);ctx.fillStyle=`rgba(255,110,40,${Math.min(1,heat)*.6})`;for(let i=0;i<4;i++)ctx.fillRect(-35,-137+i*7,20,1.4);
 gRivets([[-46,-178],[-30,-184],[-10,-187],[10,-189],[26,-190],[44,-160],[46,-130],[-50,-140],[-40,-114],[30,-112]]);
 ctx.fillStyle='rgba(230,240,250,.55)';ctx.font='700 9px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.save();ctx.translate(32,-118);ctx.scale(B.face,1);ctx.fillText('R-9',0,0);ctx.restore();
 ctx.fillStyle='#ff5268';ctx.beginPath();ctx.moveTo(-28,-176);ctx.lineTo(-18,-160);ctx.lineTo(-38,-160);ctx.closePath();ctx.fill();ctx.strokeStyle='#2a0a10';ctx.lineWidth=1;ctx.stroke();
 // nucleo del reattore
 const pulse=.6+.4*Math.sin(now*(stunned?16:5)),cr=(stunned?17:13)*(.92+pulse*.12),cx=10,cy=-148;
 ctx.fillStyle='#10161e';ctx.beginPath();ctx.arc(cx,cy,cr+6,0,6.28);ctx.fill();
 const ring=ctx.createLinearGradient(cx-cr,cy-cr,cx+cr,cy+cr);ring.addColorStop(0,'#c9d6e2');ring.addColorStop(1,'#2b3846');ctx.strokeStyle=ring;ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(cx,cy,cr+3,0,6.28);ctx.stroke();
 const core=ctx.createRadialGradient(cx,cy,1,cx,cy,cr);core.addColorStop(0,'#ffffff');core.addColorStop(.3,stunned?'#ffe0a0':'#ffb0b8');core.addColorStop(.7,'#ff3c4c');core.addColorStop(1,'#5a0a14');ctx.fillStyle=core;ctx.shadowBlur=24;ctx.shadowColor='#ff3c4c';ctx.beginPath();ctx.arc(cx,cy,cr,0,6.28);ctx.fill();ctx.shadowBlur=0;
 ctx.save();ctx.translate(cx,cy);ctx.rotate(now*(stunned?6:2));ctx.strokeStyle='rgba(60,10,16,.55)';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(cr*.35,0);ctx.lineTo(cr*.95,cr*.2);ctx.stroke()}ctx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,120,130,${.25+pulse*.25})`;ctx.fillRect(cx-cr*3.2,cy-1,cr*6.4,2);ctx.restore();
 // testa
 gPlate([[12,-218],[52,-214],[60,-196],[54,-188],[16,-186]],steel(12,-218,60,-186,.05),'#9fb2c4','rgba(220,235,250,.4)');
 ctx.fillStyle='#05090f';ctx.fillRect(26,-209,30,9);
 const eye=charging?(Math.floor(now*16)%2?'#ffffff':'#ff3c4c'):'#ff3c4c';ctx.fillStyle=eye;ctx.shadowBlur=16;ctx.shadowColor='#ff3c4c';ctx.fillRect(28,-206,26,3.5);ctx.shadowBlur=0;
 for(let i=0;i<3;i++){ctx.fillStyle=Math.sin(now*6+i)>0?'#ffb348':'#4a2a10';ctx.beginPath();ctx.arc(22+i*6,-194,1.4,0,6.28);ctx.fill()}
 ctx.strokeStyle='#8b9ba9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-217);ctx.lineTo(10,-234);ctx.moveTo(24,-217);ctx.lineTo(22,-228);ctx.stroke();ctx.fillStyle=Math.sin(now*4)>0?'#ff3c4c':'#5a1018';ctx.beginPath();ctx.arc(10,-235,2,0,6.28);ctx.fill();
 // braccio cannone (gatling a 4 canne)
 let la=B.face>0?B.aim:Math.PI-B.aim;la=Math.atan2(Math.sin(la),Math.cos(la));
 ctx.save();ctx.translate(30,-150);ctx.rotate(la);
 const sh=ctx.createRadialGradient(-4,-6,2,0,0,18);sh.addColorStop(0,'#8ea2b6');sh.addColorStop(1,'#1d2733');ctx.fillStyle=sh;ctx.beginPath();ctx.arc(0,0,17,0,6.28);ctx.fill();ctx.strokeStyle='#9fb2c4';ctx.lineWidth=1.2;ctx.stroke();
 gPlate([[8,-13],[54,-12],[56,12],[8,13]],steel(8,-13,8,13,.05),'#9fb2c4','rgba(220,235,250,.4)');
 ctx.fillStyle='#ff9d3d';ctx.fillRect(14,-12,4,24);ctx.fillRect(22,-12,4,24);
 ctx.strokeStyle='#5a4a20';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){ctx.moveTo(30+i*4,12);ctx.lineTo(30+i*4,18)}ctx.stroke();
 const spin=B.state==='raffica'?now*30:now*.6;
 ctx.fillStyle='#10161e';ctx.fillRect(54,-10,8,20);
 for(let i=0;i<4;i++){const ph=spin+i*Math.PI/2,yy=Math.sin(ph)*6,depth=Math.cos(ph);if(depth<0)continue;const g2=ctx.createLinearGradient(0,yy-2.5,0,yy+2.5);g2.addColorStop(0,'#c9d6e2');g2.addColorStop(1,'#2b3846');ctx.fillStyle=g2;ctx.fillRect(60,yy-2.4,26,4.8)}
 ctx.fillStyle='#2b3846';ctx.fillRect(70,-9,4,18);ctx.fillRect(82,-8,4,16);
 const hcol=B.state==='raffica'?Math.min(1,B.t/.45):0;if(hcol>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,82,104,${.4+hcol*.6})`;ctx.shadowBlur=20*hcol;ctx.shadowColor='#ff5268';ctx.beginPath();ctx.arc(88,0,4+hcol*5,0,6.28);ctx.fill();ctx.restore()}
 ctx.restore();
 // segni di danno: bruciature, scintille e fumo
 if(dmg>.15){ctx.save();ctx.globalAlpha=Math.min(.7,dmg);for(const [x,y,r] of [[-20,-130,14],[30,-176,10],[-40,-160,12],[40,-120,9]].slice(0,Math.ceil(dmg*4))){const g3=ctx.createRadialGradient(x,y,1,x,y,r);g3.addColorStop(0,'rgba(10,8,8,.9)');g3.addColorStop(1,'rgba(10,8,8,0)');ctx.fillStyle=g3;ctx.beginPath();ctx.arc(x,y,r,0,6.28);ctx.fill()}ctx.restore()}
 if(B.hit>0){ctx.save();ctx.globalCompositeOperation='lighter';gPlate(torso,'rgba(255,255,255,.35)');ctx.restore()}
 if(charging){ctx.fillStyle=`rgba(255,60,76,${.12+.12*Math.sin(now*30)})`;ctx.fillRect(-64,-238,130,238)}
 ctx.restore();
 if(!dying&&dmg>.3&&Math.random()<dmg*.5){const pts=[[-20,-130],[30,-176],[-40,-160]],p=pts[Math.floor(Math.random()*pts.length)],wx=B.x+p[0]*B.face*1.2,wy=B.y+p[1]*1.2;pf.fx.push({x:wx,y:wy,vx:(Math.random()-.5)*20,vy:-30-Math.random()*30,life:1.2,max:1.2,color:'rgba(60,60,66,.6)',r:5+Math.random()*6,soft:true});if(Math.random()<.3)pfBurst(wx,wy,'#ffd29a',2,.5)}
 if(stunned&&Math.random()<.3)pfBurst(B.x+(Math.random()-.5)*80,B.y-120-Math.random()*60,'#ffe0a0',2,.5);
}

// ---------------------------------------------------------------- disegno principale
drawPlatform=function(){
 if(!pf)return;
 if(!gReady())return gOrig.drawPlatform();
 const s=pfScale(),VW=pfViewW(),cx=pf.cam.x,p=pf.p,now=performance.now()/1000;
 const th=pf.theme||(pf.theme=pfTheme(p));
 gLights=[];
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,th.sky[0]);sky.addColorStop(.5,th.sky[1]);sky.addColorStop(.82,th.sky[2]);sky.addColorStop(1,th.sky[0]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.globalAlpha=th.id==='deserto'?.35:1;ctx.beginPath();ctx.rect(0,0,W,H*.6);ctx.clip();drawStarfield(0,0);ctx.restore();
 drawWorld({x:W*.82-cx*s*.01,y:H*.17,r:Math.min(W,H)*.075,p:planets[(selected+2)%planets.length]});
 ctx.save();
 if(pf.cam.shake>0){const k=pf.cam.shake;ctx.translate((Math.random()-.5)*k*16,(Math.random()-.5)*k*12)}
 ctx.scale(s,s);
 gDrawSky(VW,now);
 const L=gfx.layers;
 gDrawLayer(L[0],cx,VW);
 if(th.id==='mare'){const sea=ctx.createLinearGradient(0,470,0,PF_VH);sea.addColorStop(0,'#3d93b8');sea.addColorStop(.25,'#155276');sea.addColorStop(1,'#04192a');ctx.fillStyle=sea;ctx.fillRect(0,472,VW,PF_VH-472);ctx.save();ctx.globalCompositeOperation='lighter';const m=gMat(),sx=VW*m.sunPos[0];const gl=ctx.createLinearGradient(sx-60,0,sx+60,0);gl.addColorStop(0,'rgba(255,255,255,0)');gl.addColorStop(.5,'rgba(220,250,255,.35)');gl.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gl;for(let y=476;y<PF_VH;y+=6){const w2=30+(y-470)*.6+Math.sin(y*.7+now*3)*10;ctx.fillRect(sx-w2,y,w2*2,1.5)}ctx.restore()}
 gDrawLayer(L[1],cx,VW);
 gDrawLayer(L[2],cx,VW);
 // foschia tra gli strati
 const fogC=gRgb(gHex(th.haze));let fog=ctx.createLinearGradient(0,430,0,600);fog.addColorStop(0,'rgba(0,0,0,0)');fog.addColorStop(1,fogC.replace(',1)',',.22)'));ctx.fillStyle=fog;ctx.fillRect(0,430,VW,170);
 pfDrawColony(cx*.45,VW,now);
 gDrawLayer(L[3],cx,VW);
 fog=ctx.createLinearGradient(0,520,0,650);fog.addColorStop(0,'rgba(0,0,0,0)');fog.addColorStop(1,fogC.replace(',1)',',.28)'));ctx.fillStyle=fog;ctx.fillRect(0,520,VW,130);
 ctx.save();ctx.translate(-cx,0);
 pfDrawPit(cx,VW,now);
 pfDrawLandmarks(now);
 for(const pr of pf.props)if(pfOnScreen(pr.x,80)){gShadow(pr.x,pr.y,26,.3);pfDrawProp(pr,now)}
 for(const sd of pf.solids)if(sd.x<cx+VW+20&&sd.x+sd.w>cx-20)gDrawSolid(sd,now);
 for(const pl of pf.plats)if(pl.x<cx+VW+30&&pl.x+pl.w>cx-30)gDrawPlatform(pl,now);
 pfDrawFlora(now);
 pfDrawShipOnPad(now);
 gDrawFrontLiquid(cx,VW,now);
 for(const h of [...pf.hostages,...pf.crowd])if(h.state!=='salvo'&&pfOnScreen(h.x,60))gColonist(h,now);
 for(const k of pf.pickups)pfDrawPickup(k,now);
 for(const w of pf.waves)pfDrawWave(w);
 if(pf.boss&&!pf.boss.gone)gBoss(pf.boss,now);
 for(const e of pf.enemies)if(pfOnScreen(e.x,60))gEnemy(e,now);
 const P=pf.pilot;
 if(P.visible){ctx.save();if(P.inv>0&&Math.floor(now*18)%2)ctx.globalAlpha=.4;gTrooper(P,PF_PILOT,now);ctx.restore();pfDrawJetpack(P,now);if(P.barrier)pfDrawBarrier(P,now)}
 for(const m of pf.missiles)pfDrawBossMissile(m);
 for(const g of pf.grenades)pfDrawGrenade(g);
 gCollectLights(now);
 gApplyLighting(VW);
 for(const b of pf.shots)drawBullet(b);
 for(const f of pf.fx)drawParticle(f);
 ctx.font='600 13px "Chakra Petch",sans-serif';ctx.textAlign='center';
 for(const t of pf.texts){ctx.globalAlpha=Math.max(0,1-t.t/1.6);ctx.fillStyle=t.color;ctx.shadowBlur=6;ctx.shadowColor='#000';ctx.fillText(t.text,t.x,t.y)}ctx.globalAlpha=1;ctx.shadowBlur=0;
 ctx.restore();
 pfDrawAmbient(now);if(th.ambient==='pioggia')pfDrawLightning(VW);
 ctx.restore();
 drawVignette();
 if(pf.flash>0){ctx.fillStyle=`rgba(255,45,60,${pf.flash*.5})`;ctx.fillRect(0,0,W,H)}
 if(pf.boss&&pf.boss.gone&&pf.boss.dead<2.6){ctx.fillStyle=`rgba(255,244,220,${Math.max(0,.6-(pf.boss.dead-2.3)*2)})`;ctx.fillRect(0,0,W,H)}
 pfDrawBanner();
 const ch=$('pfCrosshair');if(ch&&ch.style){ch.style.left=mouse.x+'px';ch.style.top=mouse.y+'px'}
 const dt=Math.min(.05,now-(gfx.last||now));gfx.last=now;for(const f of gFlashes)f.life-=dt;gFlashes=gFlashes.filter(f=>f.life>0);
};
// Lampi di luce per esplosioni e abbattimenti (la logica di gioco resta quella originale).
pfExplosion=function(x,y){gOrig.pfExplosion(x,y);gFlash(x,y,320,'#ffb05a',.45)};
pfHitEnemy=function(e,n){const was=e.hp;gOrig.pfHitEnemy(e,n);if(was>0&&e.hp<=0)gFlash(e.x,e.type==='drone'?e.y:e.y-24,200,'#ff9a4a',.35)};
pfExplodeMissile=function(m){const was=m.hp;gOrig.pfExplodeMissile(m);if(was>0)gFlash(m.x,m.y,180,'#ffb05a',.3)};
// Il fucile disegnato è più grande: i colpi partono dalla canna visibile.
pfShoulder=function(o){return{x:o.x+o.face*2*G_SCALE,y:o.y+(o.crouch?-27:-35)*G_SCALE}};
