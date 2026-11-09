// Coordinate delle immagini originali, dimezzate nei WebP del gioco.
const COLONI=[
 ['uomo-chiara',14,1000,484,1024,1503],['uomo-scura',9,1000,477,1024,1515],
 ['donna-chiara',11,1000,486,1024,1519],['donna-scura',11,1000,482,1024,1494],
 ['bambino-chiara',34,1180,484,1024,1509],['bambino-scura',21,1180,484,1024,1527],
 ['anziano-chiara',11,1070,449,718,1523],['anziano-scura',14,1070,451,718,1524]
].map(([name,top,knee,split,right,foot])=>{
 const image=typeof Image==='undefined'?null:new Image();
 if(image)image.src='coloni/'+name+'.webp';
 return {image,top:top/2,knee:knee/2,split:split/2,right:right/2,foot:foot/2};
});

// Le varianti 4 e 5 sono i bambini con la valigetta: mantengono le stesse
// animazioni degli adulti, ma con una statura chiaramente più piccola.
function pfColonistSize(variant){const i=((variant%COLONI.length)+COLONI.length)%COLONI.length;return(i===4||i===5)?.72:1}

function pfColonistSprite(h,now){
 const variant=h.variant??((h.id??0)+selected*2);
 const a=COLONI[variant%COLONI.length],im=a.image;
 if(!im?.complete||!im.naturalWidth)return false;
 const running=h.state==='fuga',bound=h.state==='legato';
 const rising=h.state==='libero'&&!h.crowd?Math.min(1,h.t/.45):1;
 const kneel=bound?1:1-rising*rising*(3-2*rising);
 const phase=(h.stride||0)*.062,hStep=running&&!h.air?Math.sin(phase):0;
 const bob=running&&!h.air?Math.abs(Math.sin(phase))*1.25:Math.sin(now*2.6+h.id)*.45;
 const size=pfColonistSize(variant),height=(typeof SOLD==='undefined'?66:SOLD.H)*size,s=height/(a.foot-a.top);
 if(!h.air&&typeof gShadow==='function')gShadow(h.x,h.y,14*size,.32);
 ctx.save();ctx.translate(h.x,h.y-bob);
 ctx.scale(running?-s:s,s);
 if(running)ctx.rotate(.1);
 ctx.translate(-250,-a.foot);
 if(kneel>0){
  // In ginocchio le tibie si ripiegano all'indietro mentre il busto si abbassa.
  const fold=kneel*.77,kneeDrop=(a.foot-a.knee)*fold;
  ctx.save();ctx.translate(0,a.knee+kneeDrop);
  ctx.transform(1,0,-kneel*.16,1,0,0);
  ctx.drawImage(im,0,0,512,a.knee,0,-a.knee,512,a.knee);
  ctx.restore();
  ctx.save();ctx.translate(0,a.knee+kneeDrop);
  ctx.transform(1,0,-kneel*.29,1-fold,0,0);
  ctx.drawImage(im,0,a.knee,512,768-a.knee,0,0,512,768-a.knee);
  ctx.restore();
  if(bound){
   const y=a.knee-height*.34/s;
   ctx.save();ctx.translate(250,y+kneeDrop);ctx.rotate(-.1);
   ctx.strokeStyle='#573820';ctx.lineWidth=3/s;
   ctx.beginPath();ctx.moveTo(-5/s,0);ctx.lineTo(11/s,0);ctx.stroke();
   ctx.strokeStyle='#e1ac72';ctx.lineWidth=1.25/s;
   ctx.beginPath();ctx.moveTo(-5/s,-.6/s);ctx.lineTo(11/s,-.6/s);ctx.stroke();
   ctx.restore();
  }
 }else if(!running||h.air){
  ctx.drawImage(im,0,0);
 }else{
  ctx.drawImage(im,0,0,512,a.knee,0,0,512,a.knee);
  for(const [left,right,sign] of [[0,a.split,1],[a.split,a.right,-1],[a.right,512,0]]){
   if(left===right)continue;
   const length=768-a.knee,lift=Math.max(0,Math.cos(phase)*sign)*30;
   ctx.save();ctx.translate(0,a.knee);
   ctx.transform(1,0,hStep*sign*.26,1-lift/length,0,0);
   ctx.drawImage(im,left,a.knee,right-left,length,left,0,right-left,length);
   ctx.restore();
  }
 }
 ctx.restore();
 return true;
}
