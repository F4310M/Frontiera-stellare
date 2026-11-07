// Conex — MENU DEI PIANETI (home).
// - I 6 pianeti della mappa (e quello nel pannello) ruotano piano, ognuno con la sua velocità:
//   una texture disegnata una volta sola scorre dentro il disco, l'ombra resta ferma sopra.
// - Il pannello del pianeta selezionato ha l'ombra nel colore del pianeta.
// - Nelle info del pannello c'è l'anteprima del boss finale (disegnato una volta e messo in cache).
// - Lo spazio dietro è più scuro, con più stelle e pianeti lontani che pulsano.
// Va caricato dopo boss.js, finale.js, home.js e mappa.js (usa BOSS_DRAW, PF_BOSS, bDrawBody, initMap, selectPlanet).
// Prestazioni: niente shadowBlur né filter sulla tela principale; stelle e pianeti lontani sono sprite già pronti.

const MP={
 spin:[64,48,82,56,72,96],   // secondi per un giro della texture, uno per pianeta (OMEGA è l'ultimo)
 previewSpin:70,
 tex:new Map(),boss:new Map(),space:null
};
const mpOrig={initMap,selectPlanet,drawHomeSpace:typeof drawHomeSpace==='function'?drawHomeSpace:null};

function mpReduced(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}
function mpHash(i){i=Math.imul(i^0x27d4eb2d,0x165667b1);i^=i>>>15;i=Math.imul(i,0x85ebca6b);i^=i>>>13;return(i>>>0)/4294967296}
function mpCanvas(w,h){
 if(typeof document==='undefined'||!document.createElement)return null;
 try{const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;c.width=w;c.height=h;const g=c.getContext('2d');return g?{c,g}:null}catch(e){return null}
}

// ---------------------------------------------------------------- texture dei pianeti (si ripete in orizzontale senza giunture)
const MP_TW=256,MP_TH=128;
function mpBlob(g,x,y,r,fill,squash=1){for(const dx of [-MP_TW,0,MP_TW]){g.beginPath();g.ellipse(x+dx,y,r,r*squash,0,0,6.283);g.fillStyle=fill;g.fill()}}
function mpBand(g,y,h,fill,wob,seed){
 g.beginPath();g.moveTo(0,y);
 for(let x=0;x<=MP_TW;x+=8)g.lineTo(x,y+Math.sin(x/MP_TW*6.283*2+seed)*wob+Math.sin(x/MP_TW*6.283*3+seed*2)*wob*.5);
 for(let x=MP_TW;x>=0;x-=8)g.lineTo(x,y+h+Math.sin(x/MP_TW*6.283*2+seed+1)*wob);
 g.closePath();g.fillStyle=fill;g.fill();
}
function mpLand(g,seed,count,col,edge){
 for(let i=0;i<count;i++){
  const cx=mpHash(seed+i*7)*MP_TW,cy=18+mpHash(seed+i*7+1)*(MP_TH-36),R=10+mpHash(seed+i*7+2)*20;
  for(let k=0;k<7;k++){const a=mpHash(seed+i*31+k)*6.283,d=mpHash(seed+i*37+k)*R*.8;mpBlob(g,cx+Math.cos(a)*d,cy+Math.sin(a)*d*.6,R*(.45+mpHash(seed+i*41+k)*.4),col,.7)}
  if(edge)for(let k=0;k<5;k++)mpBlob(g,cx+(mpHash(seed+i*43+k)-.5)*R*1.4,cy+(mpHash(seed+i*47+k)-.5)*R*.8,R*.18,edge,.7);
 }
}
function mpTexture(p){
 const key=p.code||p.name;if(MP.tex.has(key))return MP.tex.get(key);
 const o=mpCanvas(MP_TW,MP_TH);let url='';
 if(o){
  const g=o.g,t=p.theme,s=(p.name||'').length*97+(p.difficulty||1)*13;
  if(t==='mare'){
   for(let i=0;i<6;i++)mpBand(g,8+i*20,7,`rgba(${i%2?'4,30,60':'150,230,255'},${i%2?.22:.12})`,4,s+i);
   mpLand(g,s,3,'rgba(30,96,70,.55)','rgba(210,200,150,.35)');
   for(let i=0;i<9;i++)mpBlob(g,mpHash(s+i*3)*MP_TW,mpHash(s+i*3+1)*MP_TH,6+mpHash(s+i*3+2)*14,'rgba(240,252,255,.28)',.35);
  }else if(t==='deserto'){
   for(let i=0;i<9;i++)mpBand(g,i*15,6+mpHash(s+i)*6,`rgba(${i%3?'120,62,16':'255,226,150'},${i%3?.28:.2})`,5,s+i);
   for(let i=0;i<14;i++)mpBlob(g,mpHash(s+i*5)*MP_TW,mpHash(s+i*5+1)*MP_TH,2+mpHash(s+i*5+2)*6,'rgba(70,34,8,.35)',.8);
  }else if(t==='tempesta'){
   for(let i=0;i<11;i++)mpBand(g,i*12-2,5+mpHash(s+i)*7,`rgba(${i%2?'30,14,70':'210,190,255'},${i%2?.32:.18})`,3,s+i*.7);
   mpBlob(g,MP_TW*.62,MP_TH*.6,13,'rgba(255,240,255,.35)',.55);mpBlob(g,MP_TW*.62,MP_TH*.6,7,'rgba(60,20,110,.45)',.55);
  }else if(t==='foresta'){
   for(let i=0;i<5;i++)mpBand(g,10+i*24,9,'rgba(8,40,20,.18)',5,s+i);
   mpLand(g,s,5,'rgba(24,70,22,.55)','rgba(170,220,110,.3)');
   for(let i=0;i<7;i++)mpBlob(g,mpHash(s+i*9)*MP_TW,mpHash(s+i*9+1)*MP_TH,5+mpHash(s+i*9+2)*12,'rgba(230,255,240,.22)',.4);
  }else if(t==='lava'){
   mpLand(g,s,6,'rgba(26,6,4,.62)',null);
   g.strokeStyle='rgba(255,170,60,.75)';g.lineWidth=1.4;
   for(let i=0;i<16;i++){const x=mpHash(s+i*11)*MP_TW,y=mpHash(s+i*11+1)*MP_TH;for(const dx of [-MP_TW,0,MP_TW]){g.beginPath();g.moveTo(x+dx,y);let cx=x+dx,cy=y;for(let k=0;k<4;k++){cx+=(mpHash(s+i*13+k)-.4)*18;cy+=(mpHash(s+i*17+k)-.5)*10;g.lineTo(cx,cy)}g.stroke()}}
   for(let i=0;i<8;i++)mpBlob(g,mpHash(s+i*19)*MP_TW,mpHash(s+i*19+1)*MP_TH,2+mpHash(s+i*19+2)*3,'rgba(255,220,120,.7)');
  }else{ // abisso (OMEGA) e mondi sconosciuti
   for(let i=0;i<8;i++)mpBand(g,i*16,7,`rgba(${i%2?'20,0,8':'255,90,140'},${i%2?.35:.14})`,4,s+i);
   for(let i=0;i<10;i++)mpBlob(g,mpHash(s+i*23)*MP_TW,mpHash(s+i*23+1)*MP_TH,1.5+mpHash(s+i*23+2)*2.5,'rgba(255,120,170,.8)');
  }
  try{url=o.c.toDataURL('image/png')}catch(e){url=''}
 }
 MP.tex.set(key,url);return url;
}

// Mette dentro un disco la texture che scorre e l'ombra fissa sopra.
function mpSpin(el,p,secs){
 if(!el||!p||!el.classList)return;
 let surf=el.querySelector&&el.querySelector('.mp-surf');
 if(!surf&&el.insertAdjacentHTML){el.insertAdjacentHTML('beforeend','<i class="mp-surf"></i><i class="mp-shade"></i>');surf=el.querySelector('.mp-surf')}
 if(!surf)return;
 el.classList.add('mp-rot');
 const url=mpTexture(p);
 surf.style.backgroundImage=url?`url(${url})`:'';
 surf.style.animationDuration=secs+'s';
 // ogni pianeta parte da un punto diverso del giro
 surf.style.animationDelay=(-mpHash((p.name||'').length*7+secs)*secs).toFixed(2)+'s';
}

initMap=function(){
 mpOrig.initMap();
 document.querySelectorAll('.planet-node').forEach((n,j)=>{const p=planets[j];if(p)mpSpin(n.querySelector('.planet'),p,MP.spin[j%MP.spin.length])});
};

// ---------------------------------------------------------------- anteprima del boss finale
function mpBossKey(p){return(p&&(p.boss||p.theme))||'lava'}
function mpBossImage(p){
 const key=mpBossKey(p);if(MP.boss.has(key))return MP.boss.get(key);
 let url='';
 if(typeof bDrawBody==='function'){
  const k=.6,L=-270,R=270,TOP=-330,BOT=40,o=mpCanvas(Math.ceil((R-L)*k),Math.ceil((BOT-TOP)*k));
  if(o){
   const c=o.g,B={x:0,y:0,face:1,aim:-.12,legT:.9,state:'passi',t:1,hp:1,max:1,hit:0,rage:0,kind:key,charge:0,build:1};
   try{
    c.setTransform(k,0,0,k,-L*k,-TOP*k);
    bDrawBody(c,B,1.3);
    // luce dall'alto come nel gioco, solo dentro la sagoma
    c.save();c.globalCompositeOperation='source-atop';
    if(typeof bFinishSurface==='function')bFinishSurface(c,key,L,TOP,R,BOT);
    c.restore();
    c.setTransform(1,0,0,1,0,0);
    // ritaglio sulla sagoma
    const w=o.c.width,h=o.c.height,d=c.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
    if(x1>x0&&y1>y0){const pad=4,cw=x1-x0+1+pad*2,ch=y1-y0+1+pad*2,out=mpCanvas(cw,ch);if(out){out.g.drawImage(o.c,x0-pad,y0-pad,cw,ch,0,0,cw,ch);url=out.c.toDataURL('image/png')}}
   }catch(e){url=''}
  }
 }
 MP.boss.set(key,url);return url;
}
function mpBossRow(){
 const dl=$('planetPanel')&&$('planetPanel').querySelector&&$('planetPanel').querySelector('dl');if(!dl)return null;
 let row=$('planetBossRow');
 if(!row&&dl.insertAdjacentHTML){
  dl.insertAdjacentHTML('beforeend','<div id="planetBossRow" class="boss-row"><span class="boss-pic"><img id="planetBossImg" alt=""></span><span class="boss-txt"><span class="boss-label">BOSS FINALE</span><b id="planetBossName"></b><small id="planetBossSub"></small></span></div>');
  row=$('planetBossRow');
 }
 return row;
}

selectPlanet=function(i){
 mpOrig.selectPlanet(i);
 const p=planets[i],panel=$('planetPanel');if(!p||!panel)return;
 if(panel.style&&panel.style.setProperty)panel.style.setProperty('--panel-accent',p.glow);
 mpSpin($('previewPlanet'),p,MP.previewSpin);
 const row=mpBossRow();if(!row)return;
 const info=typeof pfBossInfo==='function'?pfBossInfo(p):null,locked=typeof mapLocked==='function'&&mapLocked(p),freed=typeof mapFreed==='function'&&mapFreed(p);
 const img=$('planetBossImg'),url=mpBossImage(p);
 if(img){if(url)img.src=url;else img.removeAttribute('src');img.alt=info&&!locked?info.name:''}
 row.classList.toggle('locked',!!locked);row.classList.toggle('beaten',!!freed&&!locked);row.classList.toggle('no-pic',!url);
 $('planetBossName').textContent=locked?'???':(info?info.name:'???');
 $('planetBossSub').textContent=locked?'':freed?'SCONFITTO':(info?info.sub:'');
};

// ---------------------------------------------------------------- sfondo: più scuro, più stelle, pianeti lontani
const MP_FAR=[ // x,y in frazioni dello schermo, r = raggio (×scala), colori, anello
 {x:.08,y:.17,r:7,a:'#9cc8ff',b:'#1d3560',ring:false,ph:0,sp:.45},
 {x:.33,y:.09,r:4,a:'#ffc58a',b:'#5a2a10',ring:false,ph:1.7,sp:.6},
 {x:.62,y:.13,r:11,a:'#d9b6ff',b:'#2c1858',ring:true,ph:3.1,sp:.32},
 {x:.95,y:.42,r:6,a:'#8ff0d0',b:'#0d3a34',ring:false,ph:.9,sp:.52},
 {x:.47,y:.9,r:9,a:'#ff9f7a',b:'#4a1410',ring:false,ph:2.4,sp:.38},
 {x:.18,y:.62,r:3.5,a:'#c8e0ff',b:'#203048',ring:false,ph:4.2,sp:.7},
 {x:.73,y:.93,r:5,a:'#fff0b0',b:'#4c3a10',ring:true,ph:5.3,sp:.48},
 {x:.88,y:.08,r:3,a:'#ffb0c8',b:'#4a1028',ring:false,ph:2.9,sp:.66},
 {x:.27,y:.38,r:2.6,a:'#b0ffe8',b:'#103a30',ring:false,ph:.4,sp:.74}
];
function mpFarSprite(f,s){
 const R=Math.max(2.4,f.r*s*1.35),pad=R*3.2,size=Math.ceil(pad*2),o=mpCanvas(size*2,size*2);if(!o)return null;
 const g=o.g;g.scale(2,2);const cx=pad,cy=pad;
 const sp=g.createRadialGradient(cx-R*.4,cy-R*.45,R*.1,cx,cy,R);sp.addColorStop(0,f.a);sp.addColorStop(.7,f.b);sp.addColorStop(1,'#02040a');
 if(f.ring){g.strokeStyle=f.a+'55';g.lineWidth=Math.max(.6,R*.18);g.beginPath();g.ellipse(cx,cy,R*2,R*.55,-.35,Math.PI,6.283);g.stroke()}
 g.fillStyle=sp;g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();
 if(f.ring){g.beginPath();g.ellipse(cx,cy,R*2,R*.55,-.35,0,Math.PI);g.stroke()}
 return{c:o.c,size};
}
function mpHalo(){
 const o=mpCanvas(64,64);if(!o)return null;const g=o.g,r=g.createRadialGradient(32,32,0,32,32,32);
 r.addColorStop(0,'rgba(255,255,255,.55)');r.addColorStop(.25,'rgba(255,255,255,.18)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return o.c;
}
function mpSpace(){
 const cv=ctx.canvas||{},PW=cv.width||Math.ceil(W),PH=cv.height||Math.ceil(H);
 if(MP.space&&MP.space.W===W&&MP.space.H===H&&MP.space.PW===PW)return MP.space;
 const sc=Math.max(.7,Math.min(1.6,Math.min(W,H)/900)),sky=mpCanvas(PW,PH),k=PW/Math.max(1,W);
 if(sky){ // cielo scuro, nebulosa tenue e tante stelline fisse: disegnati una volta, a piena risoluzione
  const g=sky.g;g.fillStyle='#010309';g.fillRect(0,0,PW,PH);
  const neb=g.createRadialGradient(PW*.7,PH*.2,0,PW*.7,PH*.2,PW*.6);neb.addColorStop(0,'rgba(23,67,115,.10)');neb.addColorStop(.45,'rgba(45,25,91,.05)');neb.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=neb;g.fillRect(0,0,PW,PH);
  const n=Math.floor(W*H/900);
  for(let i=0;i<n;i++){const x=mpHash(i*3+11)*PW,y=mpHash(i*3+12)*PH,v=mpHash(i*3+13),hue=mpHash(i*5+7);
   g.globalAlpha=.12+v*v*.55;g.fillStyle=hue<.08?'#ffd8b0':hue<.18?'#b8d4ff':'#dce8f4';const z=(v>.93?1.5:v>.7?1:.7)*k;g.fillRect(x,y,z,z)}
  g.globalAlpha=1;
 }
 const twinkle=Array.from({length:Math.min(320,Math.floor(W*H/7000))},(_,i)=>({x:mpHash(i*7+101)*W,y:mpHash(i*7+102)*H,z:1+mpHash(i*7+103)*1.3,ph:mpHash(i*7+104)*6.283,sp:.6+mpHash(i*7+105)*1.8,c:mpHash(i*7+106)<.15?'#ffe2bf':'#e6f3ff'}));
 const far=MP_FAR.map(f=>({f,s:mpFarSprite(f,sc)}));
 return MP.space={W,H,PW,PH,sky:sky&&sky.c,twinkle,far,halo:mpHalo(),sc};
}
function mpHome(){return typeof state!=='undefined'&&(state==='map'||state==='brief')}
// Sulla home il cielo del gioco (stelle + nebulosa) è sostituito dal cielo scuro già pronto: un solo drawImage opaco.
const mpStarOrig={drawStarfield:typeof drawStarfield==='function'?drawStarfield:null,drawNebula:typeof drawNebula==='function'?drawNebula:null};
if(mpStarOrig.drawStarfield)drawStarfield=function(...a){
 if(mpHome()){const S=mpSpace();if(S.sky){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.drawImage(S.sky,0,0);ctx.restore();return}}
 return mpStarOrig.drawStarfield(...a);
};
if(mpStarOrig.drawNebula)drawNebula=function(...a){if(mpHome()&&MP.space&&MP.space.sky)return;return mpStarOrig.drawNebula(...a)};
function mpDrawSpace(t){
 const S=mpSpace(),calm=mpReduced();
 ctx.save();
 if(!S.sky){ctx.fillStyle='rgba(0,1,5,.5)';ctx.fillRect(0,0,W,H)}
 // stelle che pulsano
 for(const s of S.twinkle){const k=calm?.6:.5+.5*Math.sin(t*s.sp+s.ph);ctx.globalAlpha=.15+.75*k*k;ctx.fillStyle=s.c;ctx.fillRect(s.x,s.y,s.z,s.z)}
 // pianeti lontani con un alone che pulsa
 for(const {f,s} of S.far){
  if(!s)continue;const k=calm?.5:.5+.5*Math.sin(t*f.sp+f.ph),x=f.x*W,y=f.y*H,R=f.r*S.sc*1.35;
  if(S.halo){const hr=R*(2.6+k*1.6);ctx.globalAlpha=.10+.22*k;ctx.drawImage(S.halo,x-hr,y-hr,hr*2,hr*2)}
  ctx.globalAlpha=.6+.4*k;ctx.drawImage(s.c,x-s.size/2,y-s.size/2,s.size,s.size);
 }
 ctx.restore();
}
drawHomeSpace=function(t){
 if(mpOrig.drawHomeSpace)mpOrig.drawHomeSpace(t);
 mpDrawSpace(t);
};

initMap();
