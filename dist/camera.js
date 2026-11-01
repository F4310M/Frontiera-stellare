// Stellar Frontier — ZOOM MORBIDO DELLA TELECAMERA (fase 1).
// Quando la nave si muove la visuale si allarga un po', con il post-bruciatore si allarga ancora.
// Lo zoom non scatta: segue la velocità con una transizione morbida (ease-out).
// Tecnica: durante il disegno W e H diventano più grandi e il canvas viene rimpicciolito dello stesso fattore,
// così telecamera, sfondo e limiti di disegno restano coerenti.

const CAM_ZOOM={move:.9,boost:.78,min:.75,ease:2.2,touch:.7};
let camZoom=1,camZoomLast=0,camActive=false;
// Sul cellulare lo schermo è piccolo: la visuale dello spazio parte già più larga.
function camBase(){return typeof touch!=='undefined'&&touch.on?CAM_ZOOM.touch:1}
function camZoomTarget(){
 const base=camBase();
 if(!player||(state!=='play'&&state!=='dying'))return base;
 if(state==='dying')return camZoom;
 const speed=Math.hypot(player.vx,player.vy),move=Math.min(1,speed/220);
 const boost=player.boostState==='active'?Math.min(1,Math.max(0,(speed-220)/300)):0;
 return base*(1-(1-CAM_ZOOM.move)*move-(CAM_ZOOM.move-CAM_ZOOM.boost)*boost);
}
function camZoomStep(now){
 const dt=Math.min(.05,Math.max(0,(now-camZoomLast)/1000));camZoomLast=now;
 if(state!=='play'&&state!=='dying'&&state!=='orbit'){camZoom=1;camActive=false;return}
 if(!camActive){camActive=true;camZoom=camBase()}
 if(paused)return;
 camZoom+=(camZoomTarget()-camZoom)*(1-Math.exp(-dt*CAM_ZOOM.ease));
 camZoom=Math.max(CAM_ZOOM.min*camBase(),Math.min(1,camZoom));
}
const camOrig={draw,drawVignette,makeStars};
draw=function(){
 camZoomStep(performance.now());
 if(camZoom>.999)return camOrig.draw();
 const W0=W,H0=H,z=camZoom;
 ctx.save();ctx.setTransform(canvas.width/W0*z,0,0,canvas.height/H0*z,0,0);
 W=W0/z;H=H0/z;
 try{camOrig.draw()}finally{W=W0;H=H0;ctx.restore()}
};
// La vignetta è salvata per la misura dello schermo: con lo zoom va ricalcolata.
drawVignette=function(){if(camZoom>.999)return camOrig.drawVignette();const v=vignette;vignette=null;camOrig.drawVignette();vignette=v};
// Le stelle coprono anche l'area in più che si vede con lo zoom al minimo.
makeStars=function(){const W0=W,H0=H,m=CAM_ZOOM.min*camBase();W=W0/m;H=H0/m;try{camOrig.makeStars()}finally{W=W0;H=H0}};
if(typeof document!=='undefined'&&typeof innerWidth!=='undefined')try{makeStars()}catch(e){}
