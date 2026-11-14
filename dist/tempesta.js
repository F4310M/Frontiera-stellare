// Conex — TEMPESTA DI VENTO A TERRA (2026-11-14).
// Ogni tanto, durante la missione a terra, arriva una tempesta: il vento soffia da est e spinge il pilota
// indietro (verso ovest). A piedi o saltando non si riesce ad avanzare: si avanza solo col jetpack acceso,
// che durante la tempesta si scalda più piano. Il vento non spinge mai il pilota in un burrone che ha già superato.
// - Avviso 3 secondi prima (banner), poi raffiche che salgono, durano circa 10 secondi e si calmano.
// - Solo nella fase 'missione', in superficie (non nei sotterranei) e non quando lo schermo è bloccato
//   per un combattimento o per il boss.
// - Grafica: strisce di sabbia/pioggia/cenere del colore del pianeta, disegnate con un'unica immagine pronta
//   (niente shadowBlur o ctx.filter a ogni fotogramma).
// Va caricato dopo fase2.js, battaglia.js, mercato-plus.js e sotterranei.js.
const TS={
 first:[22,38],   // secondi di missione prima della prima tempesta
 gap:[38,62],     // secondi di calma fra una tempesta e l'altra
 dur:[9,12],      // durata della tempesta (piena forza)
 ramp:1.6,        // secondi per salire e per calmarsi
 warn:3,          // secondi di avviso prima
 wind:1.3,        // forza del vento rispetto alla corsa del pilota (più di 1 = a piedi si arretra)
 jetHeat:.55,     // il jetpack si scalda così (più piano) durante la tempesta
 streaks:140      // strisce di vento a piena forza su uno schermo grande
};
const tsCol={deserto:'#e2b56e',lava:'#8a6a60',foresta:'#b8cdb8',mare:'#b8d4ea',tempesta:'#d2c4ff'};
let tsStreak=null,tsDots=null;

function tsRnd(a){return a[0]+Math.random()*(a[1]-a[0])}
function tsState(){
 if(!pf.tempesta)pf.tempesta={next:tsRnd(TS.first),t:-1,dur:0,k:0,warned:false,gust:0};
 return pf.tempesta;
}
// la tempesta può soffiare adesso?
function tsAllowed(){
 return pf.phase==='missione'&&!pf.under&&!pf.cam.lock&&!pf.boss&&pf.pilot&&pf.pilot.visible&&pf.pilot.hp>0;
}
// forza del vento da 0 a 1
function tsUpdate(dt){
 const S=tsState(),ok=tsAllowed();
 if(S.t<0){
  if(!ok)return 0;
  S.next-=dt;
  if(S.next<=TS.warn&&!S.warned){S.warned=true;
   if(typeof pfBanner==='function')pfBanner('TEMPESTA IN ARRIVO','IL VENTO TI SPINGERÀ INDIETRO · USA IL JETPACK PER AVANZARE',TS.warn+.4);
   if(typeof tone==='function')tone(220,.5,'sine',.02,140)}
  if(S.next<=0){S.t=0;S.dur=tsRnd(TS.dur);
   if(typeof pfStatus==='function')pfStatus('TEMPESTA · AVANZA SOLO COL JETPACK',3000)}
  S.k=0;return 0;
 }
 S.t+=dt;
 // se cambia la situazione (boss, combattimento, sotterranei) la tempesta si calma subito
 if(!ok){S.t=Math.max(S.t,S.dur+TS.ramp*(1-S.k))+dt}// e si calma due volte più in fretta
 const total=S.dur+TS.ramp*2;
 if(S.t>=total){S.t=-1;S.next=tsRnd(TS.gap);S.warned=false;S.k=0;
  if(ok&&typeof pfStatus==='function')pfStatus('LA TEMPESTA SI È CALMATA',1600);return 0}
 const up=Math.min(1,S.t/TS.ramp),down=Math.min(1,(total-S.t)/TS.ramp);
 // raffiche: la forza ondeggia un po'
 S.k=Math.max(0,Math.min(up,down))*(.88+.12*Math.sin(S.t*2.3)*Math.sin(S.t*.9+1));
 // suono del vento a raffiche
 S.gust-=dt;if(S.gust<=0){S.gust=.55+Math.random()*.5;if(typeof noise==='function')noise(1.1,.016*S.k,260+Math.random()*320)}
 return S.k;
}
function tsK(){return pf&&pf.tempesta?pf.tempesta.k:0}

// spinta indietro: sposta il pilota verso ovest, fermandolo contro i muri e sul bordo dei burroni
function tsPush(P,dt,k){
 if(!(k>0)||!P.visible||P.hp<=0||P.jetOn||P.landing)return;
 const hw=(P.w||22)/2,dx=-TS.wind*PF_RUN*k*dt;let nx=P.x+dx;
 for(const s of pf.solids)if(P.y>s.y+.5&&P.x-hw>=s.x+s.w-.5&&nx-hw<s.x+s.w&&nx+hw>s.x)nx=Math.max(nx,s.x+s.w+hw);
 if(P.ground){
  if(P.onPlat){if(!pf.plats.some(p=>p.y===P.y&&nx+hw>p.x&&nx-hw<p.x+p.w))nx=P.x}
  else if(pfGroundAt(nx-hw*.5)===null)nx=P.x;
 }else if(pfGroundAt(nx)===null&&pfGroundAt(P.x)!==null)nx=P.x;
 const minX=pf.cam.x+16;if(nx<minX)nx=Math.max(minX,Math.min(P.x,nx));
 P.x=nx;if(P.vx>0)P.vx*=Math.max(0,1-k*dt*2);
}

if(typeof pfUpdatePilot==='function'&&typeof PF_RUN!=='undefined'){
 const orig=pfUpdatePilot;
 pfUpdatePilot=function(dt){
  const r=orig.apply(this,arguments);
  try{if(pf&&state==='platform'&&!paused)tsPush(pf.pilot,dt,tsUpdate(dt))}catch(e){}
  return r;
 };
}
// jetpack: durante la tempesta si scalda più piano, così si riesce ad avanzare
if(typeof pfUpdateJetpack==='function'&&typeof PF_JET!=='undefined'){
 const orig=pfUpdateJetpack;
 pfUpdateJetpack=function(P,dt,hold){
  const k=pf?tsK():0;if(!(k>0))return orig.apply(this,arguments);
  const heat=PF_JET.heat;PF_JET.heat=heat*(1-(1-TS.jetHeat)*Math.min(1,k*1.5));
  try{return orig.apply(this,arguments)}finally{PF_JET.heat=heat}
 };
}

// ---------------------------------------------------------------- grafica
function tsSprite(){
 if(tsStreak!==null)return tsStreak;
 try{
  const c=document.createElement('canvas');c.width=128;c.height=6;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,128,0);
  gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.2,'rgba(255,255,255,.9)');gr.addColorStop(.55,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.beginPath();g.moveTo(0,3);g.quadraticCurveTo(30,1,128,2.6);g.lineTo(128,3.4);g.quadraticCurveTo(30,5,0,3);g.fill();
  tsStreak=c;tsDots=Array.from({length:TS.streaks},()=>({x:Math.random(),y:Math.random(),v:.8+Math.random()*.9,l:.5+Math.random()*1.2,a:.25+Math.random()*.6,w:Math.random()*6.28}));
 }catch(e){tsStreak=false}
 return tsStreak;
}
const tsTinted={};
function tsTint(col){
 if(tsTinted[col])return tsTinted[col];
 const sp=tsSprite();if(!sp)return null;
 const c=document.createElement('canvas');c.width=sp.width;c.height=sp.height;const g=c.getContext('2d');
 g.drawImage(sp,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);
 return tsTinted[col]=c;
}
function tsDraw(){
 const k=tsK();if(!(k>.01))return;
 const th=pf.theme||{},col=tsCol[th.id]||'#d8dee8',sp=tsTint(col);if(!sp)return;
 const now=performance.now()/1000,n=Math.round(tsDots.length*k*Math.min(1,W*H/1.6e6+.35));
 ctx.save();ctx.setTransform(1,0,0,1,0,0);
 const cw=ctx.canvas.width,ch=ctx.canvas.height,u=Math.max(1,ch/720);
 // velo di polvere/pioggia sopra la scena
 ctx.globalAlpha=.16*k;ctx.fillStyle=col;ctx.fillRect(0,0,cw,ch);
 for(let i=0;i<n;i++){
  const d=tsDots[i],len=(150+d.l*170)*u,span=cw+len*2;
  const x=span-((d.x*span+now*(900+d.v*900)*u)%span)-len,y=d.y*ch+Math.sin(now*3+d.w)*10*u;
  ctx.globalAlpha=d.a*k;ctx.drawImage(sp,x,y,len,(2+d.l*2)*u);
 }
 ctx.restore();
}
if(typeof drawPlatform==='function'){
 const orig=drawPlatform;
 drawPlatform=function(){
  const r=orig.apply(this,arguments);
  try{if(pf&&state==='platform')tsDraw()}catch(e){}
  return r;
 };
}

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 for(const row of [
  ['TEMPESTA IN ARRIVO','STORM INCOMING','TEMPÊTE EN APPROCHE','TORMENTA EN CAMINO','ПРИБЛИЖАЕТСЯ БУРЯ','风暴来袭','嵐が接近中'],
  ['IL VENTO TI SPINGERÀ INDIETRO · USA IL JETPACK PER AVANZARE','THE WIND WILL PUSH YOU BACK · USE THE JETPACK TO ADVANCE','LE VENT VA TE REPOUSSER · UTILISE LE JETPACK POUR AVANCER','EL VIENTO TE EMPUJARÁ HACIA ATRÁS · USA EL JETPACK PARA AVANZAR','ВЕТЕР ОТБРОСИТ ТЕБЯ НАЗАД · ЛЕТИ НА ДЖЕТПАКЕ','狂风会把你吹回去 · 使用喷气背包前进','風に押し戻される · ジェットパックで前進せよ'],
  ['TEMPESTA · AVANZA SOLO COL JETPACK','STORM · ADVANCE ONLY WITH THE JETPACK','TEMPÊTE · AVANCE SEULEMENT AVEC LE JETPACK','TORMENTA · AVANZA SOLO CON EL JETPACK','БУРЯ · ВПЕРЁД ТОЛЬКО НА ДЖЕТПАКЕ','风暴 · 只能用喷气背包前进','嵐 · ジェットパックでのみ前進可能'],
  ['LA TEMPESTA SI È CALMATA','THE STORM HAS PASSED','LA TEMPÊTE S’EST CALMÉE','LA TORMENTA HA PASADO','БУРЯ УТИХЛА','风暴已平息','嵐が収まった']
 ])if(!I18N_ROWS.some(r=>r[0]===row[0]))I18N_ROWS.push(row);
 if(typeof i18nBuild==='function')i18nBuild();
}
