// Conex — PIANTE E FOSSILI DALLE IMMAGINI DI FABIO (2026-11-15)
// - Su VESPER (e sugli altri pianeti con il tema deserto) i cactus disegnati a mano diventano le 8 piante
//   delle immagini di Fabio: dist/piante/cactus0..7.webp (saguaro, barile con fiore, fico d'India...).
// - Nelle gallerie di tutti i pianeti i fossili sono le 8 immagini di Fabio: dist/fossili/fossile0..7.webp
//   (ammonite, trilobite, pesce, felce, vertebra, cranio con corna, impronta, conchiglie)
//   e fossile8.webp, lo scheletro di dinosauro nella roccia, per i fossili grandi.
// - Finché un'immagine non è caricata si usa il disegno di prima.
// Va caricato dopo fase2.js, fossili.js e cristalli.js (che toccano pfDrawFlora e fosSprite).
const IT_V='?v=20261115b';
function itLoad(src){try{const i=new Image();i.decoding='async';i.src=src+IT_V;return i}catch(e){return null}}
function itOk(i){return !!(i&&i.complete&&i.naturalWidth>0)}
// altezza nel mondo (px) di ogni pianta: il pilota è alto circa 60
const IT_CACTUS=[95,74,48,72,96,44,100,46].map((h,i)=>({img:itLoad('piante/cactus'+i+'.webp'),h}));
// 8 = lo scheletro di dinosauro nella roccia (il fossile grande delle pareti)
const IT_FOS=[0,1,2,3,4,5,6,7,8].map(i=>itLoad('fossili/fossile'+i+'.webp'));
// per ogni tipo di fossile del gioco, le immagini che lo possono sostituire
const IT_FOS_KIND={ammonite:[0,7],trilobite:[1,4],pesce:[2],felce:[3,6],cranio:[5],rettile:[8,8,5]};

function itDrawCactus(f){
 const c=IT_CACTUS[Math.floor(f.seed)%IT_CACTUS.length];if(!itOk(c.img))return false;
 const h=c.h*(.8+(f.size-.75)*.45),w=h*c.img.naturalWidth/c.img.naturalHeight;
 ctx.save();ctx.translate(f.x,f.y+3);if(f.flip<0)ctx.scale(-1,1);
 // ombra morbida sotto la pianta (niente shadowBlur)
 ctx.fillStyle='rgba(40,22,6,.28)';ctx.beginPath();ctx.ellipse(0,-1,w*.42,4,0,0,6.283);ctx.fill();
 const q=ctx.imageSmoothingQuality;ctx.imageSmoothingQuality='low';
 ctx.drawImage(c.img,-w/2,-h,w,h);
 ctx.imageSmoothingQuality=q;ctx.restore();return true;
}
if(typeof pfDrawFlora==='function'){
 const itOrigFlora=pfDrawFlora;
 pfDrawFlora=function(now){
  const fl=pf&&pf.deco&&pf.deco.themeBack&&pf.deco.themeBack.flora;
  if(!fl||!fl.some(f=>f.kind==='cactus'))return itOrigFlora.apply(this,arguments);
  const fatti=[],resto=[];
  for(const f of fl){
   if(f.kind!=='cactus'){resto.push(f);continue}
   if(typeof pfOnScreen==='function'&&!pfOnScreen(f.x,120))continue;
   if(itDrawCactus(f))fatti.push(f);else resto.push(f);
  }
  pf.deco.themeBack.flora=resto;
  try{return itOrigFlora.apply(this,arguments)}finally{pf.deco.themeBack.flora=fl}
 };
}

// fossili: stessa forma che usa fosDrawList ({c,w,h}), con l'immagine che sta nel riquadro del tipo
if(typeof fosSprite==='function'){
 const itOrigFos=fosSprite;
 fosSprite=function(st,f){
  const ids=IT_FOS_KIND[f.kind],img=ids&&IT_FOS[ids[f.v%ids.length]];
  if(!itOk(img))return itOrigFos.apply(this,arguments);
  const K=FOS_KINDS[f.kind],big=f.kind==='rettile'||f.kind==='cranio';
  const iw=img.naturalWidth,ih=img.naturalHeight;
  const s=big?Math.min(K.w*1.15/iw,K.h*1.15/ih):Math.max(K.w,K.h)*1.05/Math.max(iw,ih);
  return {c:img,w:iw*s,h:ih*s};
 };
}
