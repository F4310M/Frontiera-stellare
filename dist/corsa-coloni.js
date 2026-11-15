// Conex — CORSA DEI COLONI COME QUELLA DEL PILOTA (2026-11-15).
// Fabio: i coloni liberati correvano male (gambe tagliate dall'immagine che ruotavano storte).
// Ora un colono che corre è fatto così:
// - le gambe sono quelle del pilota (soldati/pilota: cosce e stinchi) mosse con la stessa posa della corsa
//   del pilota (soldPosa, con il passo di camminata.js), schiarite come la tuta bianca dei coloni;
// - sopra c'è la parte alta del colono (testa, casco, zaino, busto) presa dalla sua immagine.
// Le parti alte e le gambe schiarite si preparano una volta in piccolo: è anche molto più leggero
// di prima (prima ogni colono disegnava 6-8 tele grandi 512x768 a ogni fotogramma) e la scena finale
// con la folla che scappa non rallenta più.
// Va caricato dopo soldati.js, coloni.js e camminata.js.
const CC={
 schiarisci:.38,   // quanto si schiariscono le gambe del pilota (0 = come il pilota, 1 = bianche)
 ris:2,            // risoluzione delle parti alte preparate (rispetto alla misura nel gioco)
 cintura:10        // pixel (immagine del colono) sotto l'anca che restano attaccati al busto, sfumati
};
const ccBusti={},ccGambe={};
let ccGambeOk=false;

// gambe del pilota schiarite verso il bianco della tuta dei coloni (una volta sola)
function ccPrepGambe(){
 if(ccGambeOk)return true;
 if(typeof soldReady==='undefined'||!soldReady.pilota||typeof document==='undefined')return false;
 for(const n of ['cosciaD','stincoD','cosciaA','stincoA']){
  const im=soldImg.pilota[n];if(!im)return false;
  const c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;
  const g=c.getContext('2d');g.drawImage(im,0,0);
  g.globalCompositeOperation='source-atop';g.fillStyle=`rgba(236,233,222,${CC.schiarisci})`;g.fillRect(0,0,c.width,c.height);
  ccGambe[n]=c;
 }
 ccGambeOk=true;return true;
}
// parte alta del colono: l'immagine fino all'anca, con il bordo di sotto sfumato, ridotta in piccolo
function ccPrepBusto(i){
 if(ccBusti[i]!==undefined)return ccBusti[i];
 const a=COLONI[i],im=a.image,G=CAMM.coloni[Math.floor(i/2)];
 if(!im?.complete||!im.naturalWidth)return null;
 try{
  const anca=Math.max(G.dietro.anca[1],G.avanti.anca[1]),taglio=Math.min(768,anca+CC.cintura+14);
  const size=pfColonistSize(i),s=SOLD.H*size/(a.foot-a.top),k=Math.min(1,s*CC.ris);
  const W=Math.ceil(512*k),H=Math.ceil(taglio*k),c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');g.scale(k,k);g.drawImage(im,0,0,512,taglio,0,0,512,taglio);
  g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-out';
  const gr=g.createLinearGradient(0,(anca-6)*k,0,taglio*k);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');
  g.fillStyle=gr;g.fillRect(0,(anca-6)*k,W,H);
  const hx=(G.dietro.anca[0]+G.avanti.anca[0])/2;
  ccBusti[i]={c,k,anca,hx,s};
 }catch(e){ccBusti[i]=false}
 return ccBusti[i];
}

const ccColPrima=typeof pfColonistSprite==='function'?pfColonistSprite:null;
if(ccColPrima&&typeof soldPosa==='function'&&typeof COLONI!=='undefined'&&typeof CAMM!=='undefined'){
 pfColonistSprite=function(h,now){
  if(h.state!=='fuga'||typeof document==='undefined')return ccColPrima(h,now);
  const variant=h.variant??((h.id??0)+selected*2),i=((variant%COLONI.length)+COLONI.length)%COLONI.length;
  const B=ccPrepBusto(i);if(!B||!ccPrepGambe())return ccColPrima(h,now);
  const T=SOLD.tipi.pilota,size=pfColonistSize(i),sp=h.speed||PF_RUN;
  // stato della corsa come quello del pilota: run cresce di 0,05 per unità percorsa
  const o=h._cc||(h._cc={});
  o.ground=!h.air;o.vx=-sp*(h.ffFinale&&typeof FF!=='undefined'?1+FF.corsa:1);o.vy=h.vy||-1;o.face=-1;o.crouch=false;o.jetOn=false;o.aim=Math.PI;
  o.run=(h.stride||0)*.05;
  const p=soldPosa(T,o,now);
  if(!h.air&&typeof gShadow==='function')gShadow(h.x,h.y,16*size,.32);
  ctx.save();
  ctx.translate(h.x,h.y);ctx.scale(-T.S*size,T.S*size);ctx.translate(-T.O[0],-T.O[1]);
  for(const k of ['D','A']){
   const g=T.gamba[k],hx=g.anca[0]+p.hx,hy=g.anca[1]+p.hy,f=k==='D'?p.fD:p.fA;
   const r=soldGamba(g,hx,hy,f[0],f[1]),pr=T.parts;
   const st=pr['stinco'+k],co=pr['coscia'+k];
   ctx.save();ctx.translate(r.kx,r.ky);ctx.rotate(r.b);ctx.translate(-g.gin[0],-g.gin[1]);ctx.drawImage(ccGambe['stinco'+k],st[0],st[1],st[2],st[3]);ctx.restore();
   ctx.save();ctx.translate(hx,hy);ctx.rotate(r.a);ctx.translate(-g.anca[0],-g.anca[1]);ctx.drawImage(ccGambe['coscia'+k],co[0],co[1],co[2],co[3]);ctx.restore();
  }
  // parte alta del colono sopra le anche del pilota, piegata in avanti come il pilota che corre
  const D=T.gamba.D,A=T.gamba.A,ax=(D.anca[0]+A.anca[0])/2+p.hx,ay=(D.anca[1]+A.anca[1])/2+p.hy-18;
  const m=B.s/(T.S*size)/B.k;
  ctx.translate(ax,ay);ctx.rotate(p.lean*.8+.06);ctx.scale(m,m);
  ctx.drawImage(B.c,-B.hx*B.k,-B.anca*B.k);
  ctx.restore();
  return true;
 };
}
