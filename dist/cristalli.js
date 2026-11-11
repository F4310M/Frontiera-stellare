// Cristalli fluorescenti (cristalli.js)
// I cristalli del terreno (bordo erboso, dentro la roccia, flora delle nubi e della lava,
// pavimento dei sotterranei) diventano fluorescenti: colori al neon, punta bianca,
// alone che pulsa e luce propria che non viene scurita dall'illuminazione della scena.
// Prestazioni: niente ctx.filter né shadowBlur per frame, solo sprite in cache.
(function(){
 if(typeof gCrystal!=='function')return;
 const CR={sprites:new Map(),glows:new Map(),S:16,PAD:10},NEON=new Map();
 if(typeof window!=='undefined')window.CRISTALLI=CR;

 // colore -> versione al neon (stessa tinta, saturazione piena, luminoso)
 function hexRgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
 function rgbHsl([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
 function neon(col){
  const key=String(col);if(NEON.has(key))return NEON.get(key);
  const h=rgbHsl(hexRgb(col))[0],out={body:`hsl(${h|0},100%,62%)`,deep:`hsl(${h|0},100%,38%)`,glow:`hsl(${h|0},100%,60%)`,edge:`hsl(${h|0},100%,86%)`,h};
  NEON.set(key,out);return out;
 }
 CR.neon=neon;
 function canvas(w,h){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}

 // sprite del cristallo: grappolo di prismi esagonali con faccette, punte piramidali,
 // venature interne, inclusioni, riflessi e base di roccia. Disegnato una volta per
 // colore e variante (4x), poi solo drawImage.
 function rng(seed){let t=seed>>>0;return()=>{t=(t+0x6D2B79F5)>>>0;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296}}
 const VARIANTI=3;
 function prism(g,n,S,o,rnd){
  // o: dx, ang, bw (mezza larghezza), hh (fusto), th (punta), dark (0..1 per i prismi dietro)
  const {bw,hh,th}=o,h=n.h|0,L=o.dark?-14:0,top=-hh-th,tx=bw*(rnd()-.5)*.25;
  g.save();g.translate(o.dx,0);g.rotate(o.ang);
  const xr1=-bw*.32,xr2=bw*.38,ry=-hh-th*.32;
  const faces=[
   {pts:[[-bw,4],[xr1,6],[xr1,ry],[tx,top],[-bw,-hh]],l:30+L,lt:70},
   {pts:[[xr1,6],[xr2,6],[xr2,ry],[tx,top],[xr1,ry]],l:60+L,lt:93},
   {pts:[[xr2,6],[bw,4],[bw,-hh],[tx,top],[xr2,ry]],l:44+L,lt:80}
  ];
  const outline=()=>{g.beginPath();g.moveTo(-bw,4);g.lineTo(-bw,-hh);g.lineTo(tx,top);g.lineTo(bw,-hh);g.lineTo(bw,4);g.closePath()};
  for(const f of faces){
   g.beginPath();f.pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
   const gr=g.createLinearGradient(0,top,0,4);
   gr.addColorStop(0,`hsl(${h},100%,${f.lt}%)`);gr.addColorStop(.18,`hsl(${h},100%,${Math.min(90,f.l+18)}%)`);gr.addColorStop(.55,`hsl(${h},95%,${f.l}%)`);gr.addColorStop(1,`hsl(${h},90%,${Math.max(8,f.l-26)}%)`);
   g.fillStyle=gr;g.fill();
  }
  // interno: nucleo luminoso, bande di crescita, crepe, inclusioni
  g.save();outline();g.clip();
  g.globalCompositeOperation='lighter';
  let gr=g.createLinearGradient(-bw,0,bw,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.45,`hsla(${h},100%,75%,.35)`);gr.addColorStop(.6,`hsla(${h},100%,85%,.45)`);gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(-bw,top,bw*2,hh+th+6);
  g.globalCompositeOperation='source-over';
  for(let i=0,k=2+Math.floor(rnd()*3);i<k;i++){const yy=-hh*(.15+rnd()*.75);g.strokeStyle=`hsla(${h},100%,88%,${.12+rnd()*.15})`;g.lineWidth=.35;g.beginPath();g.moveTo(-bw,yy+bw*.25);g.lineTo(xr1,yy+bw*.08);g.lineTo(xr2,yy+bw*.08);g.lineTo(bw,yy+bw*.25);g.stroke()}
  for(let i=0,k=1+Math.floor(rnd()*3);i<k;i++){let x=(rnd()-.5)*bw*1.4,y=-hh*(.2+rnd()*.6);g.strokeStyle=`rgba(255,255,255,${.35+rnd()*.35})`;g.lineWidth=.3+rnd()*.3;g.beginPath();g.moveTo(x,y);for(let j=0;j<3;j++){x+=(rnd()-.5)*bw*.9;y+=(rnd()-.4)*S*.35;g.lineTo(x,y)}g.stroke()}
  for(let i=0,k=3+Math.floor(rnd()*5);i<k;i++){const x=(rnd()-.5)*bw*1.6,y=-hh*rnd()*.9-2,r=.25+rnd()*.55;g.fillStyle=rnd()<.6?`rgba(255,255,255,${.5+rnd()*.4})`:`hsla(${(h+40)%360},100%,30%,.5)`;g.beginPath();g.arc(x,y,r,0,6.28);g.fill()}
  // rifrazione: sagoma interna sfalsata (profondità del cristallo)
  g.strokeStyle=`hsla(${h},100%,90%,.22)`;g.lineWidth=.4;g.beginPath();g.moveTo(-bw*.55,0);g.lineTo(-bw*.55,-hh*.92);g.lineTo(tx*.5+bw*.05,top+th*.45);g.lineTo(bw*.6,-hh*.9);g.lineTo(bw*.6,0);g.stroke();
  // ombra alla base del prisma
  gr=g.createLinearGradient(0,-hh*.35,0,6);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=gr;g.fillRect(-bw,-hh*.35,bw*2,hh*.35+6);
  g.restore();
  // spigoli: contorno scuro, creste luminose, riflesso speculare
  g.lineJoin='round';outline();g.strokeStyle=`hsla(${h},90%,${o.dark?14:22}%,.85)`;g.lineWidth=.55;g.stroke();
  g.strokeStyle=`hsla(${h},100%,92%,${o.dark?.45:.85})`;g.lineWidth=.45;
  g.beginPath();g.moveTo(xr1,4);g.lineTo(xr1,ry);g.lineTo(tx,top);g.lineTo(xr2,ry);g.lineTo(xr2,4);g.moveTo(-bw,-hh);g.lineTo(xr1,ry);g.moveTo(bw,-hh);g.lineTo(xr2,ry);g.stroke();
  g.strokeStyle=`rgba(255,255,255,${o.dark?.4:.85})`;g.lineWidth=.7;g.beginPath();g.moveTo(-bw,-hh);g.lineTo(tx,top);g.stroke();
  if(!o.dark){g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.moveTo(xr1+bw*.12,ry+2);g.lineTo(xr1+bw*.3,ry+1.5);g.lineTo(xr1+bw*.22,-hh*.45);g.lineTo(xr1+bw*.08,-hh*.42);g.closePath();g.fill()}
  g.restore();
  // scintilla sulla punta
  if(o.main){const px=o.dx+Math.sin(o.ang)*(-top)*1+tx*Math.cos(o.ang),py=top*Math.cos(o.ang),r=S*.22;
   g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.moveTo(px,py-r);g.lineTo(px+r*.12,py-r*.12);g.lineTo(px+r,py);g.lineTo(px+r*.12,py+r*.12);g.lineTo(px,py+r);g.lineTo(px-r*.12,py+r*.12);g.lineTo(px-r,py);g.lineTo(px-r*.12,py-r*.12);g.closePath();g.fill();g.restore()}
 }
 function crystalSprite(col,v=0){
  const key=String(col)+'#'+v;if(CR.sprites.has(key))return CR.sprites.get(key);
  const S=CR.S,P=CR.PAD,R=4,w=S*3.2+P*2,h=S*3+P*2,c=canvas(w*R,h*R);if(!c){CR.sprites.set(key,null);return null}
  const g=c.getContext('2d'),n=neon(col),rnd=rng(1234+v*7919);g.scale(R,R);g.translate(w/2,S*2.6+P);
  // prismi: dietro (scuri), principale, laterali, piccoli davanti
  const list=[];
  for(let i=0;i<2+v%2;i++)list.push({dx:(rnd()-.5)*S*1.6,ang:(rnd()-.5)*.9,bw:S*(.16+rnd()*.08),hh:S*(.9+rnd()*.5),th:S*(.3+rnd()*.15),dark:1});
  list.push({dx:(rnd()-.5)*S*.2,ang:(rnd()-.5)*.12,bw:S*.3,hh:S*(1.75+rnd()*.25),th:S*.5,main:1});
  list.push({dx:-S*(.45+rnd()*.15),ang:-.3-rnd()*.25,bw:S*.22,hh:S*(1.05+rnd()*.3),th:S*.36});
  list.push({dx:S*(.48+rnd()*.15),ang:.32+rnd()*.25,bw:S*.2,hh:S*(.85+rnd()*.35),th:S*.32});
  for(let i=0;i<2+(v===1?1:0);i++){const sd=rnd()<.5?-1:1;list.push({dx:sd*S*(.75+rnd()*.35),ang:sd*(.6+rnd()*.5),bw:S*(.09+rnd()*.05),hh:S*(.3+rnd()*.25),th:S*.16})}
  for(const o of list)prism(g,n,S,o,rnd);
  // base di roccia con detriti e riflesso del cristallo
  const rock=[[-S*1.05,4],[-S*.8,-1],[-S*.4,-2.5],[0,-1.5],[S*.45,-3],[S*.85,-.5],[S*1.1,4],[S*.6,7],[-S*.5,7]];
  g.beginPath();rock.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  let gr=g.createLinearGradient(0,-3,0,7);gr.addColorStop(0,`hsl(${n.h|0},30%,34%)`);gr.addColorStop(.35,'#2a2630');gr.addColorStop(1,'#0c0a10');g.fillStyle=gr;g.fill();
  g.strokeStyle=`hsla(${n.h|0},100%,75%,.55)`;g.lineWidth=.5;g.beginPath();g.moveTo(-S*.8,-1);g.lineTo(-S*.4,-2.5);g.lineTo(0,-1.5);g.lineTo(S*.45,-3);g.lineTo(S*.85,-.5);g.stroke();
  for(let i=0;i<7;i++){const x=(rnd()-.5)*S*2.1,r=.6+rnd()*1.3;g.fillStyle=rnd()<.5?'#3a3442':'#1c1922';g.beginPath();g.ellipse(x,3+rnd()*2,r*1.3,r,0,0,6.28);g.fill();g.fillStyle=`hsla(${n.h|0},90%,70%,.45)`;g.fillRect(x-r*.6,3+rnd()*2-r*.8,r*.8,.35)}
  for(let i=0;i<4;i++){const x=(rnd()-.5)*S*1.8,y=2+rnd()*2;g.save();g.translate(x,y);g.rotate((rnd()-.5)*1.2);gr=g.createLinearGradient(0,-S*.25,0,0);gr.addColorStop(0,'#fff');gr.addColorStop(1,n.deep);g.fillStyle=gr;g.beginPath();g.moveTo(0,-S*.22);g.lineTo(S*.05,-S*.1);g.lineTo(S*.04,0);g.lineTo(-S*.04,0);g.lineTo(-S*.05,-S*.1);g.closePath();g.fill();g.restore()}
  const sp={c,w,h,ax:w/2,ay:S*2.6+P};CR.sprites.set(key,sp);return sp;
 }
 // alone morbido (gradiente radiale, niente blur)
 function glowSprite(col){
  const key=String(col);if(CR.glows.has(key))return CR.glows.get(key);
  const c=canvas(128,128);if(!c){CR.glows.set(key,null);return null}
  const g=c.getContext('2d'),n=neon(col),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,`hsla(${n.h|0},100%,80%,.95)`);gr.addColorStop(.25,`hsla(${n.h|0},100%,62%,.55)`);gr.addColorStop(.6,`hsla(${n.h|0},100%,55%,.16)`);gr.addColorStop(1,`hsla(${n.h|0},100%,50%,0)`);
  g.fillStyle=gr;g.fillRect(0,0,128,128);CR.glows.set(key,c);return c;
 }
 CR.crystalSprite=crystalSprite;CR.glowSprite=glowSprite;

 // disegna un cristallo (s = grandezza come in gCrystal) su un contesto qualsiasi
 function drawCrystal(g,x,y,s,a,col,alpha){
  const sp=crystalSprite(col,(Math.abs(Math.floor(x*7.3+y*3.1))%VARIANTI));if(!sp)return false;
  const k=s/CR.S;g.save();g.translate(x,y);g.rotate(a||0);if(alpha!=null)g.globalAlpha*=alpha;
  g.drawImage(sp.c,-sp.ax*k,-sp.ay*k,sp.w*k,sp.h*k);g.restore();return true;
 }
 function drawGlow(g,x,y,r,col,alpha){const gl=glowSprite(col);if(!gl||alpha<=0)return;g.globalAlpha=alpha;g.drawImage(gl,x-r,y-r,r*2,r*2)}
 CR.drawCrystal=drawCrystal;
 const pulse=(now,x)=>.62+.38*Math.sin(now*2.3+x*.013);

 // 1) cristalli dipinti nella cache del terreno (grafica2.js): versione al neon + registro
 let cur=null;
 const origCrystal=gCrystal;
 gCrystal=function(g,x,y,s,a,col){
  if(cur)cur.push({x,y,s,a,col:col[0]});
  // alone leggero già nella cache (fatto una sola volta)
  const gl=glowSprite(col[0]);if(gl){g.save();g.globalAlpha=.5;g.drawImage(gl,x-s*2.6,y-s*3.2,s*5.2,s*5.2);g.restore()}
  if(!drawCrystal(g,x,y,s,a,col[0]))origCrystal(g,x,y,s,a,col);
 };
 if(typeof gSolidCache==='function'){
  const origCache=gSolidCache;
  gSolidCache=function(sd){
   if(typeof gfx!=='undefined'&&gfx.solids&&gfx.solids.has(sd))return gfx.solids.get(sd);
   const prev=cur;cur=[];
   try{const out=origCache(sd);if(out)sd._cristalli=cur;return out}finally{cur=prev}
  };
 }

 // 2) flora delle nubi / della lava (fase2.js): via lo shadowBlur per frame, sprite al neon
 const isCr=k=>k==='cristallo'||k==='cristallo_fuoco';
 const floraCol=k=>k==='cristallo'?'#b9a6ff':'#ff8a2a';
 function floraCrystals(){
  const tb=pf&&pf.deco&&pf.deco.themeBack;if(!tb)return null;
  if(tb._crSrc!==tb.flora){tb._crSrc=tb.flora;tb._crRest=tb.flora.filter(f=>!isCr(f.kind));tb._crList=tb.flora.filter(f=>isCr(f.kind))}
  return tb;
 }
 if(typeof pfDrawFlora==='function'){
  const origFlora=pfDrawFlora;
  pfDrawFlora=function(now){
   const tb=floraCrystals();
   if(!tb||!tb._crList.length||!crystalSprite('#b9a6ff'))return origFlora(now);
   const all=tb.flora;tb.flora=tb._crRest;
   try{origFlora(now)}finally{tb.flora=all;tb._crSrc=all}
   ctx.save();
   for(const f of tb._crList){if(!pfOnScreen(f.x,90))continue;const s=18*f.size,col=floraCol(f.kind);
    ctx.globalCompositeOperation='lighter';drawGlow(ctx,f.x,f.y-s*1.3,s*3.2,col,.35*pulse(now,f.x));ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';drawCrystal(ctx,f.x,f.y,s,0,col)}
   ctx.restore();
  };
 }

 // 3) sotterranei: cristalli del pavimento al neon
 if(typeof sotDrawCrystal==='function'){
  const origSot=sotDrawCrystal;
  sotDrawCrystal=function(c,col){if(!drawCrystal(ctx,c.x,c.y+1,c.size,c.a,col))origSot(c,col)};
 }

 // 4) luce propria: dopo l'illuminazione (che scurisce la scena) i cristalli tornano accesi
 function emissive(VW,now,under){
  const cx=pf.cam.x,x0=cx-80,x1=cx+VW+80;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const sd of pf.solids){
   if(!sd._cristalli||sd.x>x1||sd.x+sd.w<x0)continue;
   for(const c of sd._cristalli){if(c.x<x0||c.x>x1)continue;const p=pulse(now,c.x);
    drawGlow(ctx,c.x,c.y-c.s*1.2,c.s*3.4,c.col,.42*p);ctx.globalAlpha=1;drawCrystal(ctx,c.x,c.y,c.s,c.a,c.col,.2+.2*p)}
  }
  if(!under){const tb=floraCrystals();if(tb)for(const f of tb._crList){if(f.x<x0||f.x>x1)continue;const s=18*f.size,col=floraCol(f.kind),p=pulse(now,f.x);
   drawGlow(ctx,f.x,f.y-s*1.3,s*3.4,col,.4*p);ctx.globalAlpha=1;drawCrystal(ctx,f.x,f.y,s,0,col,.2+.2*p)}}
  if(under&&pf.sot&&pf.sot.deco){const col=gMat().rim;for(const c of pf.sot.deco){if(c.x<x0||c.x>x1)continue;const p=pulse(now,c.x);
   drawGlow(ctx,c.x,c.y-c.size*1.1,c.size*3.6,col,.45*p);ctx.globalAlpha=1;drawCrystal(ctx,c.x,c.y+1,c.size,c.a,col,.22+.2*p)}}
  ctx.restore();
 }
 CR.emissive=emissive;
 if(typeof gApplyLighting==='function'){
  const origLight=gApplyLighting;
  gApplyLighting=function(VW){origLight(VW);try{if(pf&&!pf.under)emissive(VW,performance.now()/1000,false)}catch(e){}};
 }
 if(typeof sotApplyLighting==='function'){
  const origSotLight=sotApplyLighting;
  sotApplyLighting=function(VW,now){origSotLight(VW,now);try{emissive(VW,now,true)}catch(e){}};
 }
})();
