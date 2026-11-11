// Conex — SFONDO FERMO DURANTE LA FUGA DEGLI OSTAGGI (2026-11-11).
// Quando il boss a terra è distrutto e gli ostaggi liberati scappano verso sinistra,
// lo sfondo (cielo, stelle, pianeta, rilievi, colonia) smette di animarsi:
// viene fotografato una volta e poi solo ricopiato, e le particelle d'ambiente
// (pioggia, braci, foglie, sabbia, spruzzi, fulmini) si fermano.
// Così il browser ha meno lavoro mentre sullo schermo corrono tanti coloni.
// Tutto riparte quando nessun ostaggio è più nello schermo (o quando partono le navi in fuga).
// Va caricato dopo finale-fuga.js.

const FS={
 soglia:3   // px dello schermo: se la vista si sposta di più, la foto dello sfondo si rifà
};
const fs={mode:'off',snap:null,key:null};

// la fuga finale è in corso e c'è ancora almeno un ostaggio nello schermo?
function fsFugaInCorso(){
 if(typeof pf==='undefined'||!pf||typeof state==='undefined'||state!=='platform')return false;
 const F=pf.ffFuga;
 if(!F||F.navi||pf.under||pf.sotT)return false;
 if(pf.phase!=='vittoria')return false;
 return typeof ffUsciti==='function'?!ffUsciti():true;
}
// posizione della vista: se cambia, la foto non combacia più
function fsKey(){
 const z=typeof zt!=='undefined'&&zt&&zt.z>1;
 return{w:ctx.canvas.width,h:ctx.canvas.height,cx:pf.cam.x*pfScale(),
  z:z?zt.z:1,fx:z?zt.fx:0,fy:z?zt.fy:0};
}
function fsStessaVista(a,b){
 return a&&b&&a.w===b.w&&a.h===b.h&&a.z===b.z&&Math.abs(a.cx-b.cx)<=FS.soglia
  &&Math.abs(a.fx-b.fx)<=FS.soglia&&Math.abs(a.fy-b.fy)<=FS.soglia;
}
function fsFerma(){return fs.mode==='usa'||fs.mode==='cattura'}

// ogni fotogramma decide: disegno normale, foto dello sfondo, oppure foto già pronta
if(typeof drawPlatform==='function'){
 const orig=drawPlatform;
 drawPlatform=function(...a){
  fs.mode='off';
  if(fsFugaInCorso()&&!(pf.cam.shake>0)){
   const k=fsKey();
   fs.mode=fs.snap&&fsStessaVista(fs.key,k)?'usa':'cattura';
   if(fs.mode==='cattura')fs.key=k;
  }else if(!fsFugaInCorso()){fs.snap=null;fs.key=null}
  try{return orig.apply(this,a)}finally{fs.mode='off'}
 };
}
// pezzi dello sfondo che con la foto pronta non serve ridisegnare
function fsSalta(orig,soloTerra){
 return function(...a){
  if(fs.mode==='usa'&&(!soloTerra||state==='platform'))return;
  return orig.apply(this,a);
 };
}
if(typeof gDrawSky==='function')gDrawSky=fsSalta(gDrawSky,false);
if(typeof gDrawLayer==='function')gDrawLayer=fsSalta(gDrawLayer,false);
if(typeof pfDrawColony==='function')pfDrawColony=fsSalta(pfDrawColony,false);
if(typeof pfDrawThemeBack==='function')pfDrawThemeBack=fsSalta(pfDrawThemeBack,false);
if(typeof drawStarfield==='function')drawStarfield=fsSalta(drawStarfield,true);
if(typeof drawWorld==='function')drawWorld=fsSalta(drawWorld,true);
// subito dopo lo sfondo si disegna il terreno: qui si scatta o si ricopia la foto
if(typeof pfDrawPit==='function'){
 const orig=pfDrawPit;
 pfDrawPit=function(...a){
  if(fs.mode==='cattura'){
   const c=ctx.canvas;
   if(!fs.snap)fs.snap=document.createElement('canvas');
   if(fs.snap.width!==c.width||fs.snap.height!==c.height){fs.snap.width=c.width;fs.snap.height=c.height}
   const g=fs.snap.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(c,0,0);
  }else if(fs.mode==='usa'&&fs.snap){
   ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   ctx.drawImage(fs.snap,0,0);ctx.restore();
  }
  return orig.apply(this,a);
 };
}
// particelle d'ambiente e fulmini fermi durante la fuga
if(typeof pfDrawAmbient==='function'){
 const orig=pfDrawAmbient;
 pfDrawAmbient=function(...a){if(fsFerma())return;return orig.apply(this,a)};
}
if(typeof pfDrawLightning==='function'){
 const orig=pfDrawLightning;
 pfDrawLightning=function(...a){if(fsFerma())return;return orig.apply(this,a)};
}
if(typeof pfUpdateAmbient==='function'){
 const orig=pfUpdateAmbient;
 pfUpdateAmbient=function(...a){if(fsFugaInCorso())return;return orig.apply(this,a)};
}
if(typeof window!=='undefined')window.fsSfondo=fs;

