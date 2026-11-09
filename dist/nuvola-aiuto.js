// Nuvola "HELP!" sopra i coloni legati (missione a terra).
// Fumetto arrotondato con bordo luminoso, codina verso il colono e scritta nitida.
// Il disegno è fatto una volta sola su una tela a parte: ogni fotogramma
// è solo un drawImage (niente shadowBlur o ctx.filter sulla tela principale).
const NUV={
 w:58,h:30,tail:11,  // misure del fumetto in pixel di gioco
 res:3,              // risoluzione dell'immagine pronta (nitida anche con lo zoom)
 pad:9,              // margine per il bagliore
 bob:2.2,bobSpeed:4.2,pulse:.045,tilt:.05,
 nearDist:170,       // pilota vicino: il fumetto "chiama" più forte
 fill:['#24204a','#120f26'],line:'#ffc861',glow:'rgba(255,190,80,.55)',text:'#ffe3a1',textEdge:'#5a2a00'
};
let nuvSprite=null,nuvRays=null,nuvFontOk=false;

function nuvFont(){
 try{return typeof document!=='undefined'&&document.fonts&&document.fonts.check('800 15px "Chakra Petch"')}catch(e){return false}
}
function nuvCanvas(w,h){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=Math.ceil(w*NUV.res);c.height=Math.ceil(h*NUV.res);return c;
}
// forma del fumetto: rettangolo molto arrotondato con codina curva in basso a sinistra
function nuvShape(g,w,h,t){
 const r=h/2,x0=-w/2,x1=w/2,y0=-h/2,y1=h/2;
 g.beginPath();
 g.moveTo(x0+r,y0);g.lineTo(x1-r,y0);g.arc(x1-r,0,r,-Math.PI/2,Math.PI/2);
 g.lineTo(6,y1);
 g.quadraticCurveTo(3,y1+t*.55,-1,y1+t);      // punta della codina
 g.quadraticCurveTo(-3,y1+t*.35,-9,y1);
 g.lineTo(x0+r,y1);g.arc(x0+r,0,r,Math.PI/2,Math.PI*1.5);
 g.closePath();
}
function nuvBuild(){
 const W=NUV.w+NUV.pad*2,H=NUV.h+NUV.tail+NUV.pad*2,c=nuvCanvas(W,H);if(!c)return null;
 const g=c.getContext('2d');if(!g)return null;
 g.scale(NUV.res,NUV.res);g.translate(W/2,NUV.pad+NUV.h/2);
 // bagliore esterno (solo qui, una volta)
 g.save();g.shadowColor=NUV.glow;g.shadowBlur=7;g.fillStyle=NUV.fill[1];nuvShape(g,NUV.w,NUV.h,NUV.tail);g.fill();g.restore();
 // riempimento con sfumatura e riflesso in alto
 const gr=g.createLinearGradient(0,-NUV.h/2,0,NUV.h/2+NUV.tail);gr.addColorStop(0,NUV.fill[0]);gr.addColorStop(1,NUV.fill[1]);
 g.fillStyle=gr;nuvShape(g,NUV.w,NUV.h,NUV.tail);g.fill();
 g.save();nuvShape(g,NUV.w,NUV.h,NUV.tail);g.clip();
 const hl=g.createLinearGradient(0,-NUV.h/2,0,0);hl.addColorStop(0,'rgba(255,255,255,.16)');hl.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=hl;g.fillRect(-NUV.w/2,-NUV.h/2,NUV.w,NUV.h/2);g.restore();
 // doppio bordo: scuro fuori, oro dentro
 g.lineJoin='round';
 g.strokeStyle='rgba(20,8,0,.85)';g.lineWidth=3.6;nuvShape(g,NUV.w,NUV.h,NUV.tail);g.stroke();
 g.strokeStyle=NUV.line;g.lineWidth=1.8;nuvShape(g,NUV.w,NUV.h,NUV.tail);g.stroke();
 // scritta
 nuvFontOk=nuvFont();
 const font=nuvFontOk?'800 15px "Chakra Petch",sans-serif':'900 14px Arial,sans-serif';
 g.font=font;g.textAlign='center';g.textBaseline='middle';
 g.lineWidth=3;g.strokeStyle=NUV.textEdge;g.strokeText('HELP!',0,1);
 const tg=g.createLinearGradient(0,-8,0,8);tg.addColorStop(0,'#fff6d8');tg.addColorStop(1,NUV.text);
 g.fillStyle=tg;g.fillText('HELP!',0,1);
 return {c,W,H,ax:W/2,ay:NUV.pad+NUV.h+NUV.tail}; // ax/ay = punta della codina
}
// tre trattini "d'urgenza" sopra il fumetto, accesi a turno
function nuvBuildRays(){
 const W=20,H=14,c=nuvCanvas(W,H);if(!c)return null;
 const g=c.getContext('2d');if(!g)return null;
 g.scale(NUV.res,NUV.res);g.lineCap='round';g.strokeStyle=NUV.line;g.lineWidth=1.8;
 g.beginPath();g.moveTo(3,12);g.lineTo(1,7);g.moveTo(10,10);g.lineTo(10,3);g.moveTo(17,12);g.lineTo(19,7);g.stroke();
 return {c,W,H};
}
function nuvGet(){
 if(!nuvSprite||(!nuvFontOk&&nuvFont()))nuvSprite=nuvBuild();
 if(!nuvRays)nuvRays=nuvBuildRays();
 return nuvSprite;
}

const nuvOrigHelp=typeof pfDrawHelp==='function'?pfDrawHelp:null;
pfDrawHelp=function(h,now){
 if(h.state!=='legato')return;
 const s=nuvGet();
 if(!s){if(nuvOrigHelp)nuvOrigHelp(h,now);return}
 const size=typeof pfColonistSize==='function'?pfColonistSize(h.variant??((h.id??0)+(typeof selected==='number'?selected*2:0))):1;
 const P=typeof pf!=='undefined'&&pf?pf.pilot:null;
 const near=P&&P.hp>0&&Math.abs(P.x-h.x)<NUV.nearDist?1:0;
 const ph=now*NUV.bobSpeed+(h.id||0)*1.7;
 const k=1+NUV.pulse*(.5+.5*Math.sin(ph*1.6))+near*.06;
 const x=h.x,y=h.y-56*size+1+Math.sin(ph)*NUV.bob;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(ph*.8)*NUV.tilt);ctx.scale(k,k);
 ctx.drawImage(s.c,-s.ax,-s.ay,s.W,s.H);
 if(nuvRays){
  const blink=.35+.65*Math.max(0,Math.sin(ph*2.4));
  ctx.globalAlpha=near?Math.max(.6,blink):blink*.8;
  ctx.drawImage(nuvRays.c,NUV.w/2-8,-s.ay+NUV.pad-nuvRays.H+4,nuvRays.W,nuvRays.H);
 }
 ctx.restore();
};
