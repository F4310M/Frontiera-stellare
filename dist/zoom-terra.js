// Conex — ZOOM DELLA MISSIONE A TERRA SU SMARTPHONE.
// Su un telefono in orizzontale lo schermo è basso: la scena a terra (alta 720 unità) diventa piccola.
// Qui la scena viene ingrandita attorno al pilota; la telecamera lo segue con calma anche in verticale.
// L'ingrandimento tiene sempre dentro lo schermo la scena originale, quindi non si vedono bordi vuoti.
// Le scritte grandi (banner) restano disegnate alla misura normale.
const ZT={scala:.8,max:1.45,altezzaTelefono:600,xPilota:.42,yPilota:.62,ease:4.5};
const ztOrig={drawPlatform};
const zt={z:1,fx:null,fy:null,last:0};

// Quanto ingrandire: solo con i comandi touch e su schermi bassi (telefoni).
function ztZoom(){
 if(typeof touch==='undefined'||!touch||!touch.on)return 1;
 if(!(H>0)||H>=ZT.altezzaTelefono)return 1;
 const s=H/PF_VH;return Math.max(1,Math.min(ZT.max,ZT.scala/s));
}
// Punto fisso dello zoom (in pixel dello schermo) per portare il pilota alla posizione voluta.
function ztFocus(z){
 const P=pf&&pf.pilot,s=pfScale();
 if(!P||!(z>1))return{x:W/2,y:H};
 const px=(P.x-pf.cam.x)*s,py=(P.y-30)*s;
 const fx=(z*px-ZT.xPilota*W)/(z-1),fy=(z*py-ZT.yPilota*H)/(z-1);
 return{x:Math.max(0,Math.min(W,fx)),y:Math.max(0,Math.min(H,fy))};
}
// Da pixel della scena normale a pixel dello schermo ingrandito (e ritorno).
function ztToScreen(x,y){const z=zt.z;if(!(z>1))return{x,y};return{x:zt.fx+(x-zt.fx)*z,y:zt.fy+(y-zt.fy)*z}}
function ztFromScreen(x,y){const z=zt.z;if(!(z>1))return{x,y};return{x:zt.fx+(x-zt.fx)/z,y:zt.fy+(y-zt.fy)/z}}

drawPlatform=function(){
 const z=typeof pf!=='undefined'&&pf?ztZoom():1;
 const now=typeof performance!=='undefined'?performance.now():0;
 if(z<=1){zt.z=1;zt.fx=zt.fy=null;return ztOrig.drawPlatform()}
 const f=ztFocus(z),dt=Math.min(.1,Math.max(0,(now-zt.last)/1000));zt.last=now;
 if(zt.fx===null||zt.z!==z){zt.fx=f.x;zt.fy=f.y}
 else{const k=1-Math.exp(-dt*ZT.ease);zt.fx+=(f.x-zt.fx)*k;zt.fy+=(f.y-zt.fy)*k}
 zt.z=z;
 // il banner va disegnato dopo, senza ingrandimento
 const banner=pf.banner;pf.banner=null;
 ctx.save();ctx.translate(zt.fx*(1-z),zt.fy*(1-z));ctx.scale(z,z);
 try{ztOrig.drawPlatform()}finally{ctx.restore();pf.banner=banner}
 if(banner){const boom=pf.boom;pf.boom=null;try{pfDrawBanner()}finally{pf.boom=boom}}
};

// La mira automatica sceglie solo i bersagli che si vedono nello schermo ingrandito.
if(typeof touchGroundTarget==='function'){
 const ztTarget=touchGroundTarget;
 touchGroundTarget=function(){
  if(!(zt.z>1))return ztTarget();
  const s=pfScale(),a=ztFromScreen(0,0),b=ztFromScreen(W,H),l=pf.cam.x+a.x/s-20,r=pf.cam.x+b.x/s+20;
  const keep=pf.enemies,boss=pf.boss;
  pf.enemies=(keep||[]).filter(e=>e.x>l&&e.x<r);
  const hideBoss=boss&&!(boss.x>l&&boss.x<r);if(hideBoss)pf.boss=null;
  try{return ztTarget()}finally{pf.enemies=keep;if(hideBoss)pf.boss=boss}
 };
}
