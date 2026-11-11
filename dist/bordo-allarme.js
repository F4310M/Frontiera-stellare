// Conex — bordo dello schermo rosso che pulsa quando un nemico ti aggancia (2026-11-11), gioco in singolo.
// Nello spazio: navi nemiche che ti stanno agganciando o missili nemici in volo (missili-nemici.js, EM).
// A terra: soldato col lanciamissili che prende la mira o razzo che ti insegue (lanciamissili.js).
// Nell'arena online lo stesso bordo lo disegna arena.js (arDrawLockWarn).
// Disegnato sopra la scena con 4 sfumature e un contorno: niente ctx.filter o shadowBlur.
// Va caricato dopo arena.js.

const BA={speedLock:9,speedMissile:17};

// 0 = nessun pericolo; lock 0..1 = aggancio in corso o completo; missile = missile già partito
function baDanger(){
 if(typeof state==='undefined')return null;
 if(state==='play'&&typeof player!=='undefined'&&player&&!player.destroyed&&typeof EM!=='undefined'){
  let lock=0;for(const e of EM.lockers)lock=Math.max(lock,Math.min(1,(e.emLock||0)/EM_LOCK_SECONDS));
  const missile=EM.missiles.length>0;
  return lock>0||missile?{lock,missile}:null;
 }
 if(state==='platform'&&typeof pf!=='undefined'&&pf&&pf.pilot&&pf.pilot.hp>0&&pf.phase!=='vittoria'){
  const missile=(pf.missiles||[]).some(m=>m.razzo&&m.hp>0);
  let lock=0;for(const e of pf.enemies||[])if(e.lm&&e.hp>0&&e.lm.state==='mira'&&typeof LM!=='undefined')lock=Math.max(lock,Math.min(1,e.lm.t/LM.aim));
  return lock>0||missile?{lock,missile}:null;
 }
 return null;
}
function baDraw(){
 const d=baDanger();if(!d)return;
 const now=performance.now()/1000,sp=d.missile?BA.speedMissile:BA.speedLock;
 const k=.5+.5*Math.sin(now*sp),pow=d.missile?1:.45+.55*d.lock;
 const a=(.25+.5*k)*pow,t=Math.max(36,Math.min(W,H)*(.06+.035*k));
 ctx.save();ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 const edge=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,`rgba(255,28,48,${a})`);g.addColorStop(1,'rgba(255,28,48,0)');ctx.fillStyle=g;ctx.fillRect(rx,ry,rw,rh)};
 edge(0,0,0,t,0,0,W,t);edge(0,H,0,H-t,0,H-t,W,t);edge(0,0,t,0,0,0,t,H);edge(W,0,W-t,0,W-t,0,t,H);
 ctx.strokeStyle=`rgba(255,60,76,${(.4+.55*k)*pow})`;ctx.lineWidth=3+3*k;ctx.strokeRect(2,2,W-4,H-4);
 ctx.restore();
}
if(typeof draw==='function'){
 const baOrig=draw;
 draw=function(...a){
  const r=baOrig.apply(this,a);
  if(!(typeof arUI!=='undefined'&&arUI.on))try{baDraw()}catch(e){}
  return r;
 };
}
