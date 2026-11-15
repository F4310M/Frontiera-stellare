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
 warn:5,          // secondi di avviso prima (avviso grande sul monitor con il conto alla rovescia)
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
  if(!ok){if(S.warned){S.warned=false;S.next=Math.max(S.next,TS.warn+2);tsAvvisoVia()}return 0}
  S.next-=dt;
  if(S.next<=TS.warn&&!S.warned){S.warned=true;
   tsAvviso('vento','TEMPESTA IN ARRIVO','IL VENTO TI SPINGERÀ INDIETRO · USA IL JETPACK PER AVANZARE');
   if(typeof tone==='function')tone(220,.5,'sine',.02,140)}
  if(S.warned)tsAvvisoConta(S.next);
  if(S.next<=0){S.t=0;S.dur=tsRnd(TS.dur);tsAvvisoVia();
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
  try{if(pf&&state==='platform'&&!paused){tsPush(pf.pilot,dt,tsUpdate(dt));nbUpdate(dt)}}catch(e){}
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

// ---------------------------------------------------------------- avviso grande sul monitor (11-15, Fabio)
// riquadro al centro in alto con icona, titolo, spiegazione e conto alla rovescia; lampeggia il bordo
function tsAvvisoEl(){
 let el=document.getElementById('tsAvviso');if(el)return el;
 if(!document.getElementById('tsAvvisoCss')){const st=document.createElement('style');st.id='tsAvvisoCss';st.textContent=`
#tsAvviso{position:fixed;left:50%;top:16vh;transform:translateX(-50%);z-index:40;pointer-events:none;display:flex;align-items:center;gap:18px;
 padding:16px 26px;border-radius:10px;border:2px solid var(--ts-c);background:rgba(6,10,16,.88);color:#fff;font-family:'Chakra Petch',sans-serif;
 box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 34px var(--ts-g);animation:tsAvB .8s ease-in-out infinite;max-width:92vw}
#tsAvviso.hidden{display:none}
#tsAvviso svg{width:52px;height:52px;flex:none;color:var(--ts-c)}
#tsAvviso b{display:block;font-size:clamp(18px,2.4vw,34px);letter-spacing:.14em;color:var(--ts-c)}
#tsAvviso small{display:block;font-size:clamp(11px,1.1vw,16px);letter-spacing:.08em;opacity:.9;margin-top:4px}
#tsAvviso i{font-style:normal;font-size:clamp(26px,3.6vw,52px);font-weight:700;min-width:1.2em;text-align:center;color:var(--ts-c)}
#tsAvviso.vento{--ts-c:#ffd27a;--ts-g:rgba(255,190,90,.45)}
#tsAvviso.nebbia{--ts-c:#8cff7a;--ts-g:rgba(110,255,90,.45)}
@keyframes tsAvB{50%{border-color:transparent;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 10px var(--ts-g)}}
body.touch #tsAvviso{top:12vh;padding:8px 14px;gap:10px}body.touch #tsAvviso svg{width:32px;height:32px}`;document.head.appendChild(st)}
 el=document.createElement('div');el.id='tsAvviso';el.className='hidden';el.setAttribute('role','alert');
 el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/></svg><div><b></b><small></small></div><i></i>';
 document.body.appendChild(el);return el;
}
const tsTr=t=>typeof tr==='function'?tr(t):t;
function tsAvviso(tipo,titolo,sotto){
 try{const el=tsAvvisoEl();el.className=tipo;el.querySelector('b').textContent=tsTr(titolo);el.querySelector('small').textContent=tsTr(sotto);el.querySelector('i').textContent=''}catch(e){}
}
function tsAvvisoConta(sec){try{const el=document.getElementById('tsAvviso');if(el&&!el.classList.contains('hidden')){const n=String(Math.max(1,Math.ceil(sec)));const i=el.querySelector('i');if(i.textContent!==n)i.textContent=n}}catch(e){}}
function tsAvvisoVia(){try{const el=document.getElementById('tsAvviso');if(el&&!el.classList.contains('hidden'))el.classList.add('hidden')}catch(e){}}

// ---------------------------------------------------------------- nebbia velenosa nel sottosuolo (11-15, Fabio)
// Nei sotterranei al posto della tempesta arriva ogni tanto una nebbia verde velenosa: toglie energia al pilota,
// a meno che non tenga accesa la barriera (che intanto si consuma un po' di più).
const NB={first:[14,24],gap:[30,48],dur:[8,11],ramp:1.4,warn:5,dps:5,shield:3,puffs:16};
function nbState(){if(!pf.nebbia)pf.nebbia={next:tsRnd(NB.first),t:-1,dur:0,k:0,warned:false,acc:0,hiss:0};return pf.nebbia}
function nbAllowed(){return(pf.phase==='missione'||pf.phase==='boss')&&pf.under&&pf.pilot&&pf.pilot.visible&&pf.pilot.hp>0}
function nbK(){return pf&&pf.nebbia?pf.nebbia.k:0}
function nbUpdate(dt){
 const S=nbState(),ok=nbAllowed();
 if(S.t<0){
  if(!ok){if(S.warned){S.warned=false;S.next=Math.max(S.next,NB.warn+2);tsAvvisoVia()}return 0}
  S.next-=dt;
  if(S.next<=NB.warn&&!S.warned){S.warned=true;tsAvviso('nebbia','NEBBIA VELENOSA IN ARRIVO','TOGLIE ENERGIA · ATTIVA LA BARRIERA PER PROTEGGERTI');if(typeof tone==='function')tone(180,.6,'sawtooth',.012,120)}
  if(S.warned)tsAvvisoConta(S.next);
  if(S.next<=0){S.t=0;S.dur=tsRnd(NB.dur);tsAvvisoVia();if(typeof pfStatus==='function')pfStatus('NEBBIA VELENOSA · TIENI LA BARRIERA',3000)}
  S.k=0;return 0;
 }
 S.t+=dt;
 if(!ok){S.t=Math.max(S.t,S.dur+NB.ramp*(1-S.k))+dt}
 const total=S.dur+NB.ramp*2;
 if(S.t>=total){S.t=-1;S.next=tsRnd(NB.gap);S.warned=false;S.k=0;S.acc=0;if(ok&&typeof pfStatus==='function')pfStatus('LA NEBBIA SI È DISSOLTA',1600);return 0}
 S.k=Math.max(0,Math.min(1,S.t/NB.ramp,(total-S.t)/NB.ramp));
 const P=pf.pilot,god=typeof godMode!=='undefined'&&godMode,immune=(P.rientroT||0)>0;
 if(ok&&!god&&!immune){
  if(P.barrier&&P.shield>0){P.shield=Math.max(0,P.shield-dt*NB.shield*S.k)}
  else{S.acc+=dt*NB.dps*S.k;
   while(S.acc>=1&&P.hp>0){S.acc-=1;P.hp-=1;pf.flash=Math.max(pf.flash||0,.12);
    if(Math.random()<.35&&typeof pfBurst==='function')pfBurst(P.x,P.y-30,'#8cff7a',2,.4)}
   if(P.hp<=0&&typeof pfLoseLife==='function')pfLoseLife()}
 }
 S.hiss-=dt;if(S.hiss<=0){S.hiss=.8+Math.random()*.6;if(typeof noise==='function')noise(1.2,.01*S.k,180+Math.random()*120)}
 return S.k;
}
let nbPuff=null;
function nbSprite(){
 if(nbPuff!==null)return nbPuff;
 try{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(130,255,110,.55)');gr.addColorStop(.5,'rgba(80,200,70,.28)');gr.addColorStop(1,'rgba(40,120,40,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);nbPuff=c}catch(e){nbPuff=false}
 return nbPuff;
}
// la nebbia si disegna in una piccola immagine (1/8 dello schermo) e poi si stende su tutto lo schermo con una sola copia:
// a tutto schermo in 4K le nuvole grandi costavano parecchi FPS
let nbBuf=null;
function nbDraw(){
 const k=nbK();if(!(k>.01))return;const sp=nbSprite();
 const cw=ctx.canvas.width,ch=ctx.canvas.height,bw=Math.max(64,Math.round(cw/8)),bh=Math.max(36,Math.round(ch/8));
 try{if(!nbBuf||nbBuf.c.width!==bw||nbBuf.c.height!==bh){const c=document.createElement('canvas');c.width=bw;c.height=bh;nbBuf={c,g:c.getContext('2d')}}}catch(e){return}
 const g=nbBuf.g,now=performance.now()/1000;
 g.globalAlpha=1;g.clearRect(0,0,bw,bh);g.fillStyle='rgba(63,168,58,.2)';g.fillRect(0,0,bw,bh);
 if(sp){for(let i=0;i<NB.puffs;i++){
  const sx=(i*0.618)%1,sy=((i*0.377)%1)*.8+.15,r=bh*(.22+((i*7)%5)*.05);
  const x=((sx*(bw+2*r)+now*(18+i*3)/8*(i%2?1:-1))%(bw+2*r)+bw+2*r)%(bw+2*r)-r,y=sy*bh+Math.sin(now*.5+i)*bh*.03;
  g.globalAlpha=.5+.3*Math.sin(now*.7+i*1.3);g.drawImage(sp,x-r,y-r,r*2,r*2)}}
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=k;ctx.imageSmoothingQuality='low';ctx.drawImage(nbBuf.c,0,0,cw,ch);ctx.restore();
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
  try{if(pf&&state==='platform'){tsDraw();nbDraw()}}catch(e){}
  try{if(!pf||state!=='platform')tsAvvisoVia()}catch(e){}
  return r;
 };
}

// ---------------------------------------------------------------- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 for(const row of [
  ['TEMPESTA IN ARRIVO','STORM INCOMING','TEMPÊTE EN APPROCHE','TORMENTA EN CAMINO','ПРИБЛИЖАЕТСЯ БУРЯ','风暴来袭','嵐が接近中'],
  ['IL VENTO TI SPINGERÀ INDIETRO · USA IL JETPACK PER AVANZARE','THE WIND WILL PUSH YOU BACK · USE THE JETPACK TO ADVANCE','LE VENT VA TE REPOUSSER · UTILISE LE JETPACK POUR AVANCER','EL VIENTO TE EMPUJARÁ HACIA ATRÁS · USA EL JETPACK PARA AVANZAR','ВЕТЕР ОТБРОСИТ ТЕБЯ НАЗАД · ЛЕТИ НА ДЖЕТПАКЕ','狂风会把你吹回去 · 使用喷气背包前进','風に押し戻される · ジェットパックで前進せよ'],
  ['TEMPESTA · AVANZA SOLO COL JETPACK','STORM · ADVANCE ONLY WITH THE JETPACK','TEMPÊTE · AVANCE SEULEMENT AVEC LE JETPACK','TORMENTA · AVANZA SOLO CON EL JETPACK','БУРЯ · ВПЕРЁД ТОЛЬКО НА ДЖЕТПАКЕ','风暴 · 只能用喷气背包前进','嵐 · ジェットパックでのみ前進可能'],
  ['NEBBIA VELENOSA IN ARRIVO','TOXIC FOG INCOMING','BROUILLARD TOXIQUE EN APPROCHE','NIEBLA TÓXICA EN CAMINO','ПРИБЛИЖАЕТСЯ ЯДОВИТЫЙ ТУМАН','毒雾来袭','毒の霧が接近中'],
  ['TOGLIE ENERGIA · ATTIVA LA BARRIERA PER PROTEGGERTI','IT DRAINS ENERGY · RAISE THE BARRIER TO PROTECT YOURSELF','ELLE DRAINE L’ÉNERGIE · ACTIVE LA BARRIÈRE POUR TE PROTÉGER','QUITA ENERGÍA · ACTIVA LA BARRERA PARA PROTEGERTE','ОТНИМАЕТ ЭНЕРГИЮ · ВКЛЮЧИ БАРЬЕР ДЛЯ ЗАЩИТЫ','会消耗能量 · 开启屏障保护自己','エネルギーを奪う · バリアで身を守れ'],
  ['NEBBIA VELENOSA · TIENI LA BARRIERA','TOXIC FOG · KEEP THE BARRIER UP','BROUILLARD TOXIQUE · GARDE LA BARRIÈRE','NIEBLA TÓXICA · MANTÉN LA BARRERA','ЯДОВИТЫЙ ТУМАН · ДЕРЖИ БАРЬЕР','毒雾 · 保持屏障','毒の霧 · バリアを維持せよ'],
  ['LA NEBBIA SI È DISSOLTA','THE FOG HAS CLEARED','LE BROUILLARD S’EST DISSIPÉ','LA NIEBLA SE HA DISIPADO','ТУМАН РАССЕЯЛСЯ','毒雾已散去','霧が晴れた'],
  ['LA TEMPESTA SI È CALMATA','THE STORM HAS PASSED','LA TEMPÊTE S’EST CALMÉE','LA TORMENTA HA PASADO','БУРЯ УТИХЛА','风暴已平息','嵐が収まった']
 ])if(!I18N_ROWS.some(r=>r[0]===row[0]))I18N_ROWS.push(row);
 if(typeof i18nBuild==='function')i18nBuild();
}
