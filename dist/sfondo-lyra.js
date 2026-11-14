// Conex — SFONDO DI LYRA (2026-11-14): nella missione a terra su LYRA lo sfondo è l'immagine scelta da Fabio
// (città futuristica tra montagne innevate, cascate e il pianeta nel cielo): dist/sfondi/lyra.jpg.
// - Prende il posto di cielo, strati lontani e colonia disegnati a mano; il terreno di gioco resta davanti.
// - Scorre piano (parallasse) e si ripete specchiata, così non si vede la giuntura.
// - Nei sotterranei e se l'immagine non è caricata si usa lo sfondo di prima.
// Va caricato dopo grafica2.js e dopo gli altri file che toccano gDrawLayer / gDrawSky / pfDrawColony.
const SL={
 file:'sfondi/lyra.jpg?v=20261114a',
 planet:'LYRA',
 lake:650,    // riga dell'immagine (px) con il pelo del lago
 floor:606,   // dove finisce, in coordinate del mondo (il terreno di gioco è a 600)
 par:.12      // velocità dello scorrimento rispetto alla telecamera
};
const slImg=(()=>{try{const i=new Image();i.decoding='async';i.src=SL.file;return i}catch(e){return null}})();
let slOn=false;
function slReady(){return !!(slImg&&slImg.complete&&slImg.naturalWidth>0)}
function slAttivo(){return typeof pf!=='undefined'&&pf&&pf.p&&pf.p.name===SL.planet&&!pf.under&&slReady()}
// disegna l'immagine in coordinate del mondo (dopo ctx.scale(s,s)): altezza 0..PF_VH, larghezza VW
function slDraw(cx,VW){
 const iw=slImg.naturalWidth,ih=slImg.naturalHeight,k=SL.floor/SL.lake,w=iw*k,h=ih*k;
 // sotto l'immagine (se lo schermo è più alto) il colore scuro del lago
 ctx.fillStyle='#0b3a5c';ctx.fillRect(0,h-2,VW,PF_VH-h+2);
 const off=((cx*SL.par)%(w*2)+w*2)%(w*2);
 for(let x=-off,i=0;x<VW;x+=w,i++){
  if(x+w<0)continue;
  if(i%2===0)ctx.drawImage(slImg,x,0,w,h);
  else{ctx.save();ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(slImg,0,0,w,h);ctx.restore()}
 }
}
if(typeof drawPlatform==='function'){
 const orig=drawPlatform;
 drawPlatform=function(){
  slOn=false;try{slOn=state==='platform'&&slAttivo()}catch(e){}
  try{return orig.apply(this,arguments)}finally{slOn=false}
 };
}
// con lo sfondo di LYRA i pezzi dello sfondo disegnato a mano non servono (risparmio anche di tempo)
if(typeof gDrawSky==='function'){const o=gDrawSky;gDrawSky=function(){if(slOn)return;return o.apply(this,arguments)}}
if(typeof pfDrawColony==='function'){const o=pfDrawColony;pfDrawColony=function(){if(slOn)return;return o.apply(this,arguments)}}
if(typeof pfDrawThemeBack==='function'){const o=pfDrawThemeBack;pfDrawThemeBack=function(){if(slOn)return;return o.apply(this,arguments)}}
// l'ultimo strato lontano è disegnato sopra mare e foschie: lì si mette l'immagine, gli altri strati si saltano
if(typeof gDrawLayer==='function'){
 const o=gDrawLayer;
 gDrawLayer=function(L,cx,VW){
  if(!slOn)return o.apply(this,arguments);
  const ls=typeof gfx!=='undefined'&&gfx&&gfx.layers;
  if(ls&&L===ls[ls.length-1])slDraw(cx,VW);
 };
}
