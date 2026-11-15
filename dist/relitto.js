// Conex — RELITTO ALLA DERIVA (2026-11-15): i relitti nello spazio usano l'immagine scelta da Fabio
// (una vecchia nave da guerra arrugginita e sventrata): dist/navi/relitto.webp, con lo sfondo trasparente.
// - Ruota piano su sé stessa come prima (w.rot) e qualche luce arancione del ponte pulsa o si spegne.
// - Quando viene colpito lampeggia di bianco per un attimo, come gli altri bersagli.
// - Prestazioni: solo drawImage dell'immagine e di un bagliore pronto; fuori schermo non si disegna nulla.
// Se l'immagine non è ancora caricata si usa il relitto disegnato di prima. Va caricato dopo spazio.js.
const RL={
 file:'navi/relitto.webp?v=20261115a',
 len:2.35,   // lunghezza dell'immagine in raggi del relitto
 // luci del ponte (posizione nell'immagine, da 0 a 1)
 luci:[[.228,.386],[.248,.503],[.377,.467],[.461,.654],[.833,.582],[.711,.744],[.784,.748],[.62,.31]]
};
const rlImg=(()=>{try{const i=new Image();i.decoding='async';i.src=RL.file;return i}catch(e){return null}})();
let rlGlow=null,rlFlash=null;
function rlReady(){return !!(rlImg&&rlImg.complete&&rlImg.naturalWidth>0)}
function rlGlowSprite(){
 if(rlGlow!==null)return rlGlow;
 try{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,236,190,1)');gr.addColorStop(.2,'rgba(255,170,70,.75)');gr.addColorStop(.55,'rgba(255,110,30,.2)');gr.addColorStop(1,'rgba(255,90,20,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);rlGlow=c}catch(e){rlGlow=false}
 return rlGlow;
}
// sagoma bianca del relitto (per il lampo quando viene colpito), fatta una volta sola
function rlFlashSprite(){
 if(rlFlash!==null)return rlFlash;
 try{const c=document.createElement('canvas');c.width=Math.round(rlImg.naturalWidth/2);c.height=Math.round(rlImg.naturalHeight/2);const g=c.getContext('2d');
  g.drawImage(rlImg,0,0,c.width,c.height);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);rlFlash=c}catch(e){rlFlash=false}
 return rlFlash;
}
function rlDraw(w){
 if(typeof player!=='undefined'&&player&&(Math.abs(w.x-player.x)>W/2+w.r*1.6||Math.abs(w.y-player.y)>H/2+w.r*1.6))return;
 const L=w.r*RL.len,Hh=L*rlImg.naturalHeight/rlImg.naturalWidth,now=performance.now()/1000;
 ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.rot||0);
 ctx.drawImage(rlImg,-L/2,-Hh/2,L,Hh);
 // luci del ponte: pulsano e ogni tanto si spengono (ogni luce ha il suo ritmo)
 const gl=rlGlowSprite();
 if(gl){ctx.globalCompositeOperation='lighter';
  RL.luci.forEach(([u,v],i)=>{
   const seed=(w.x*13+w.y*7+i*91)%97,ph=now*(.7+((seed*37)%10)/10)+seed;
   const off=Math.sin(ph*.37+i)>.82;// spenta per qualche secondo
   const a=off?0:.45+.4*Math.sin(ph*2.3)*Math.sin(ph*.9+1);if(a<=.02)return;
   const s=w.r*(.16+((seed*11)%5)/50);ctx.globalAlpha=Math.min(1,a);ctx.drawImage(gl,-L/2+u*L-s,-Hh/2+v*Hh-s,s*2,s*2);
  });
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
 // lampo bianco quando viene colpito
 if(w.hit>0){const f=rlFlashSprite();if(f){ctx.globalAlpha=Math.min(.45,w.hit*1.5);ctx.drawImage(f,-L/2,-Hh/2,L,Hh);ctx.globalAlpha=1}}
 ctx.restore();
}
if(typeof drawWreck==='function'){
 const rlOrig=drawWreck;
 drawWreck=function(w){
  if(!rlReady()||typeof ctx==='undefined'||!ctx.drawImage)return rlOrig.apply(this,arguments);
  try{rlDraw(w)}catch(e){return rlOrig.apply(this,arguments)}
 };
}
