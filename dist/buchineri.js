// Conex — BUCHI NERI nella battaglia spaziale (fase 1).
// Ogni tanto, a caso, davanti alla rotta si apre un buco nero (più spesso sui pianeti difficili).
// Attira dentro di sé tutto: la nave, le navi nemiche, rocce, relitti, meteoriti, frammenti, colpi, razzi e rifornimenti.
// L'attrazione comincia quando il buco nero è ancora fuori dallo schermo.
// Senza post-bruciatore la nave scivola sempre verso il centro: si scappa solo con il post-bruciatore.
// Se la nave raggiunge il centro viene inghiottita. Dopo un po' il buco nero evapora.
// Grafica: disco di accrescimento, alone e ombra disegnati una volta sola in canvas fuori schermo,
// poi solo drawImage ruotato (niente ctx.filter né shadowBlur sul canvas principale).
// Va caricato dopo spazio.js e i18n.js (index.html: dopo speciale.js).

const BH_CFG={
 chance:d=>Math.min(.95,.45+.13*d),      // probabilità che in una missione compaiano buchi neri (1: 58%, 5: 95%)
 first:d=>[12+(5-d)*3,24+(5-d)*5],       // secondi prima del primo
 next:d=>[70/(.6+.25*d),110/(.6+.25*d)], // secondi tra uno e il successivo
 life:[34,46],grow:1.6,fade:2.6,         // durata, comparsa, evaporazione (secondi)
 core:58,coreMax:100,reach:1900,         // raggio dell'orizzonte e della zona d'influenza
 drift:[30,320],                         // senza post-bruciatore: velocità minima verso il centro (bordo → centro)
 pull:[110,780],pullBoost:[60,500],swirl:.42,
 fallSpeed:[40,620],planetGap:700
};
const BH={hole:null,timer:0,on:false,inside:false,was:false,warned:false,hum:0,hint:0,eaten:0,motes:[],gfx:null};
const bhFall=new WeakMap();
function bhDiff(){return(world&&world.p&&world.p.difficulty)||1}
function bhRand(a,b){return a+Math.random()*(b-a)}
function bhReset(){
 const d=bhDiff();
 BH.hole=null;BH.on=Math.random()<BH_CFG.chance(d);BH.timer=bhRand(...BH_CFG.first(d));
 BH.inside=BH.was=BH.warned=false;BH.hum=BH.hint=0;BH.eaten=0;BH.motes=[];
}
// metà diagonale dello schermo nel mondo, con lo zoom più largo possibile (post-bruciatore)
function bhViewR(){
 const base=typeof camBase==='function'?camBase():1,min=typeof CAM_ZOOM!=='undefined'?CAM_ZOOM.min:.75;
 return Math.hypot(W,H)/2/Math.max(.3,min*base);
}

// ---------------------------------------------------------------- comparsa
function bhSpawn(at){
 if(!player||!world)return false;
 const pd=Math.hypot(world.x-player.x,world.y-player.y),view=bhViewR(),dist=view+220,reach=Math.max(BH_CFG.reach,dist+450);
 if(!at&&pd<world.r+reach+BH_CFG.planetGap)return false; // troppo vicino al pianeta: niente buchi neri
 const sp=Math.hypot(player.vx,player.vy),dir=sp>60?Math.atan2(player.vy,player.vx):player.angle;
 for(let i=0;i<8;i++){
  const a=dir+(Math.random()-.5)*1.4+(i>3?(Math.random()-.5)*2:0);
  const x=at?at.x:player.x+Math.cos(a)*dist,y=at?at.y:player.y+Math.sin(a)*dist;
  if(!at&&Math.hypot(world.x-x,world.y-y)<world.r+reach+BH_CFG.planetGap)continue;
  BH.hole={x,y,t:0,life:bhRand(...BH_CFG.life),core:BH_CFG.core,reach,k:0,grow:0,spin:Math.random()*6.28,tilt:(Math.random()-.5)*.9,flash:0};
  BH.motes=[];BH.warned=false;BH.was=false;
  return true;
 }
 return false;
}
function bhCollapse(){
 const h=BH.hole;if(!h)return;
 if(player&&Math.hypot(player.x-h.x,player.y-h.y)<h.reach*1.5){status('IL BUCO NERO EVAPORA',1800);burst(h.x,h.y,'#d7b8ff',22,1.4);tone(90,.6,'sine',.03,260)}
 BH.hole=null;BH.inside=false;BH.motes=[];BH.timer=bhRand(...BH_CFG.next(bhDiff()));
}

// ---------------------------------------------------------------- attrazione
// accelerazione verso il centro a distanza d (0 fuori dalla zona d'influenza)
function bhAccel(h,d,lohi){const q=Math.max(0,1-d/h.reach);return h.k*(lohi[0]+(lohi[1]-lohi[0])*q*q)}
// velocità con cui una cosa cade verso il centro a distanza d (spirale: verso il centro + di lato)
function bhFallSpeed(h,d){const q=Math.max(0,1-d/h.reach);return h.k*(BH_CFG.fallSpeed[0]+(BH_CFG.fallSpeed[1]-BH_CFG.fallSpeed[0])*q*q)}
// cose veloci con velocità propria (colpi, scintille, meteoriti): la gravità le curva;
// vicino all'orizzonte vengono catturate (la velocità si piega verso il centro)
function bhPullV(h,o,dt,rr=0){
 const dx=h.x-o.x,dy=h.y-o.y,d=Math.hypot(dx,dy)||1;if(d>h.reach)return false;
 if(d<h.core*h.grow*.95+rr)return true;
 const a=bhAccel(h,d,BH_CFG.pull),ux=dx/d,uy=dy/d;
 o.vx+=(ux-uy*BH_CFG.swirl)*a*dt;o.vy+=(uy+ux*BH_CFG.swirl)*a*dt;
 if(d<h.core*4){const s=Math.max(bhFallSpeed(h,d),Math.hypot(o.vx,o.vy)),k=Math.min(1,dt*6*(1-d/(h.core*4)));o.vx+=((ux-uy*BH_CFG.swirl)*s-o.vx)*k;o.vy+=((uy+ux*BH_CFG.swirl)*s-o.vy)*k}
 return false;
}
// cose che si muovono da sole (navi con la loro guida, rocce, relitti, razzi, capsule):
// in più del loro moto scivolano lungo una spirale che stringe sempre di più
function bhPullD(h,o,dt,rr=0){
 const dx=h.x-o.x,dy=h.y-o.y,d=Math.hypot(dx,dy)||1;
 let f=bhFall.get(o);
 if(d>h.reach){if(f){f.x*=Math.exp(-2*dt);f.y*=Math.exp(-2*dt);o.x+=f.x*dt;o.y+=f.y*dt}return false}
 if(d<h.core*h.grow*.95+rr)return true;
 if(!f){f={x:0,y:0};bhFall.set(o,f)}
 const s=bhFallSpeed(h,d),ux=dx/d,uy=dy/d,k=Math.min(1,dt*2.2);
 f.x+=((ux-uy*BH_CFG.swirl)*s-f.x)*k;f.y+=((uy+ux*BH_CFG.swirl)*s-f.y)*k;
 // non si supera il centro in un solo passo
 const step=Math.hypot(f.x,f.y)*dt;if(step>d){f.x*=d/step;f.y*=d/step}
 o.x+=f.x*dt;o.y+=f.y*dt;
 return false;
}
function bhEat(h,x,y,color,n=6){burst(x,y,color,n,.6);h.flash=Math.min(1,h.flash+.5);BH.eaten++}
function bhPullPlayer(h,dt){
 const dx=h.x-player.x,dy=h.y-player.y,d=Math.hypot(dx,dy)||1;
 if(d>h.reach){
  if(BH.inside&&BH.was&&h.k>.5)status('SFUGGITO AL BUCO NERO',1800);
  BH.inside=false;return;
 }
 BH.inside=true;BH.was=true;
 const ux=dx/d,uy=dy/d,boost=player.boostState==='active',q=1-d/h.reach;
 if(!BH.warned){BH.warned=true;status('ANOMALIA GRAVITAZIONALE · USA IL POST-BRUCIATORE',3600);tone(70,.9,'sawtooth',.03,40)}
 const a=bhAccel(h,d,boost?BH_CFG.pullBoost:BH_CFG.pull);
 player.vx+=(ux-uy*BH_CFG.swirl*.5)*a*dt;player.vy+=(uy+ux*BH_CFG.swirl*.5)*a*dt;
 if(!boost){
  // senza post-bruciatore i motori normali non bastano: la nave scivola sempre verso il centro
  const drift=h.k*(BH_CFG.drift[0]+(BH_CFG.drift[1]-BH_CFG.drift[0])*q*q),vr=player.vx*ux+player.vy*uy;
  if(vr<drift){player.vx+=ux*(drift-vr);player.vy+=uy*(drift-vr)}
  BH.hint-=dt;
  if(BH.hint<=0&&(player.forward||player.strafe)&&h.k>.5){BH.hint=5;status('SOLO IL POST-BRUCIATORE PUÒ SFUGGIRE AL BUCO NERO',2000)}
 }
 // il ruggito del buco nero cresce avvicinandosi
 BH.hum-=dt;if(BH.hum<=0){BH.hum=1.15;tone(44+q*34,1.3,'sine',.018+.05*q*h.k,30)}
 if(d<h.core*h.grow*.85){
  status('INGHIOTTITO DAL BUCO NERO',2600);
  bhEat(h,player.x,player.y,'#ffd9a0',14);
  damage(1000,true);
  if(state==='play'){// modalità dio: la nave viene risputata fuori
   player.x=h.x-ux*h.reach*.6;player.y=h.y-uy*h.reach*.6;player.vx=-ux*420;player.vy=-uy*420;
  }
 }
}
function bhUpdate(dt){
 if(state!=='play'||paused||!player)return;
 const h=BH.hole;
 if(!h){if(!BH.on)return;BH.timer-=dt;if(BH.timer<=0&&!bhSpawn())BH.timer=4;return}
 h.t+=dt;h.flash=Math.max(0,h.flash-dt*1.6);
 if(h.t>=h.life){bhCollapse();return}
 h.grow=Math.min(1,h.t/BH_CFG.grow);
 h.k=h.grow*Math.min(1,Math.max(0,(h.life-h.t)/BH_CFG.fade));
 h.core=Math.min(BH_CFG.coreMax,BH_CFG.core+BH.eaten*1.4)*(h.life-h.t<BH_CFG.fade?Math.max(.15,(h.life-h.t)/BH_CFG.fade):1);
 h.spin+=dt*.55;
 bhPullPlayer(h,dt);
 if(state!=='play')return;
 for(const e of enemies)if(e.hp>0&&bhPullD(h,e,dt,e.r*.3)){e.hp=0;bhEat(h,e.x,e.y,'#ff6b5a',10)}
 for(const m of monsters)if(m.hp>0&&bhPullD(h,m,dt,m.r*.3)){m.hp=0;bhEat(h,m.x,m.y,'#a9ff78',8)}
 for(const w of wrecks)if(w.hp>0&&bhPullD(h,w,dt,w.r*.3)){w.hp=0;bhEat(h,w.x,w.y,'#8194a7',8)}
 for(const r of rocks)if(r.hp>0&&bhPullD(h,r,dt,r.r*.3)){r.hp=0;bhEat(h,r.x,r.y,'#b1bac2',6)}
 for(const f of fragments)if(f.life>0&&bhPullD(h,f,dt)){f.life=0;h.flash=Math.min(1,h.flash+.15)}
 for(const p of pickups)if(p.life>0&&bhPullD(h,p,dt))p.life=0;
 for(const b of bullets)if(b.life>0&&bhPullV(h,b,dt))b.life=0;
 for(const p of particles)if(p.life>0&&bhPullV(h,p,dt))p.life=0;
 for(const m of shower)if(m.warning<=0&&m.life>0&&bhPullV(h,m,dt,m.r*.3)){m.life=0;bhEat(h,m.x,m.y,'#ffb87a',6)}
 if(typeof SP!=='undefined')for(const k of SP.rockets)if(k.life>0&&bhPullD(h,k,dt))k.life=0;
 if(typeof EM!=='undefined')for(const k of EM.missiles)if(k.life>0&&bhPullD(h,k,dt))k.life=0;
 if(meteor&&meteor.warning<=0){
  if(bhPullV(h,meteor,dt,meteor.r*.3)){bhEat(h,meteor.x,meteor.y,'#ffb87a',10);meteor=null;meteorTimer=nextMeteorDelay();updateMeteorAlert()}
  else meteor.angle=Math.atan2(meteor.vy,meteor.vx);
 }
 for(const m of shower)if(m.life>0&&m.warning<=0)m.angle=Math.atan2(m.vy,m.vx);
 bhUpdateMotes(h,dt);
}

// ---------------------------------------------------------------- grafica (sprite fatti una volta)
const BH_DISK=4.4;// raggio esterno del disco in raggi dell'orizzonte
function bhCanvas(w,h){
 if(typeof document==='undefined'||!document.createElement)return null;
 const c=document.createElement('canvas');if(!c||!c.getContext)return null;
 c.width=w;c.height=h;const g=c.getContext('2d');return g?{c,g}:null;
}
function bhMakeGfx(){
 const S=640,R=S/2,disk=bhCanvas(S,S),halo=bhCanvas(256,256),shade=bhCanvas(256,256);
 if(!disk||!halo||!shade)return null;
 // disco di accrescimento: gas caldissimo vicino al centro (bianco-giallo), poi arancio, rosso e viola
 let g=disk.g;const inner=R*1.18/BH_DISK;
 let gr=g.createRadialGradient(R,R,inner,R,R,R);
 gr.addColorStop(0,'rgba(255,250,235,0)');gr.addColorStop(.02,'rgba(255,248,225,.95)');gr.addColorStop(.12,'rgba(255,214,140,.85)');
 gr.addColorStop(.32,'rgba(255,138,60,.55)');gr.addColorStop(.58,'rgba(196,60,90,.28)');gr.addColorStop(.82,'rgba(110,50,170,.12)');gr.addColorStop(1,'rgba(60,30,120,0)');
 g.fillStyle=gr;g.beginPath();g.arc(R,R,R,0,6.283);g.arc(R,R,inner,0,6.283,true);g.fill();
 // filamenti di gas che girano
 g.globalCompositeOperation='lighter';g.lineCap='round';
 for(let i=0;i<190;i++){
  const k=Math.pow(Math.random(),1.6),r=inner+(R-inner)*k,a=Math.random()*6.283,len=.25+Math.random()*(1.2-k*.6);
  const hot=1-k;g.strokeStyle=`rgba(255,${Math.round(150+hot*100)},${Math.round(90+hot*140)},${(.05+Math.random()*.22)*(1-k*.7)})`;
  g.lineWidth=.8+Math.random()*2.6*(1-k*.5);g.beginPath();g.arc(R,R,r,a,a+len);g.stroke();
 }
 for(let i=0;i<40;i++){const r=inner+(R-inner)*Math.random()*.5,a=Math.random()*6.283;g.fillStyle='rgba(255,245,220,.5)';g.beginPath();g.arc(R+Math.cos(a)*r,R+Math.sin(a)*r,.8+Math.random()*1.4,0,6.283);g.fill()}
 // alone: anello di fotoni + bagliore morbido (si disegna in 'lighter')
 g=halo.g;gr=g.createRadialGradient(128,128,0,128,128,128);
 gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.36,'rgba(0,0,0,0)');gr.addColorStop(.385,'rgba(255,236,200,.95)');gr.addColorStop(.42,'rgba(255,180,110,.45)');
 gr.addColorStop(.6,'rgba(200,110,255,.14)');gr.addColorStop(1,'rgba(120,80,255,0)');
 g.fillStyle=gr;g.fillRect(0,0,256,256);
 // ombra: lo spazio intorno si scurisce (la luce delle stelle viene deviata)
 g=shade.g;gr=g.createRadialGradient(128,128,0,128,128,128);
 gr.addColorStop(0,'rgba(0,0,0,.95)');gr.addColorStop(.3,'rgba(0,0,4,.7)');gr.addColorStop(.65,'rgba(4,0,12,.25)');gr.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=gr;g.fillRect(0,0,256,256);
 return{disk:disk.c,halo:halo.c,shade:shade.c};
}
function bhGfx(){if(BH.gfx===null)BH.gfx=bhMakeGfx()||false;return BH.gfx||null}

// granelli di materia che spiraleggiano verso il centro
function bhUpdateMotes(h,dt){
 const M=BH.motes;
 while(M.length<64)M.push({a:Math.random()*6.283,r:h.core*(1.3+Math.random()*3.4),hot:Math.random(),w:0});
 for(const m of M){
  m.r-=dt*(18+2600/Math.max(20,m.r));m.a+=dt*Math.min(4,180/Math.max(30,m.r));
  if(m.r<h.core*1.05){m.r=h.core*(2.5+Math.random()*2.2);m.a=Math.random()*6.283}
 }
}
function bhDraw(){
 const h=BH.hole;if(!h||!player||(state!=='play'&&state!=='dying'))return;
 const c=camera(),cx=c.x+W/2,cy=c.y+H/2,R=h.core*Math.max(.05,h.grow),view=Math.hypot(W,H)/2;
 const far=Math.hypot(h.x-cx,h.y-cy);
 if(far>view+R*BH_DISK*1.2+R*3)return;
 const G=bhGfx(),sq=.34,flash=h.flash;
 ctx.save();ctx.translate(h.x,h.y);
 if(!G){// grafica semplice (senza canvas fuori schermo)
  ctx.fillStyle='rgba(255,160,80,.35)';ctx.beginPath();ctx.ellipse(0,0,R*3,R*1.1,h.tilt,0,6.283);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,R,0,6.283);ctx.fill();ctx.restore();return;
 }
 // ombra
 const sh=R*4.2;ctx.drawImage(G.shade,-sh,-sh,sh*2,sh*2);
 ctx.rotate(h.tilt);
 const D=R*BH_DISK,big=D*1.2;
 // metà del disco dietro il buco
 ctx.save();ctx.beginPath();ctx.rect(-big,-big,big*2,big);ctx.clip();
 ctx.globalCompositeOperation='lighter';ctx.scale(1,sq);ctx.rotate(h.spin);ctx.drawImage(G.disk,-D,-D,D*2,D*2);
 ctx.restore();
 // alone e anello di fotoni
 ctx.save();ctx.globalCompositeOperation='lighter';
 const hr=R/.385*1.02;ctx.globalAlpha=Math.min(1,.85+flash*.3);ctx.drawImage(G.halo,-hr,-hr,hr*2,hr*2);
 // il disco lontano piegato dalla gravità: arco luminoso sopra il buco
 ctx.globalAlpha=.55+flash*.35;ctx.strokeStyle='#ffb070';ctx.lineWidth=R*.22;
 ctx.beginPath();ctx.ellipse(0,0,R*1.32,R*1.18,0,Math.PI*1.02,Math.PI*1.98);ctx.stroke();
 ctx.globalAlpha=.7+flash*.3;ctx.strokeStyle='#fff1d6';ctx.lineWidth=Math.max(1,R*.05);
 ctx.beginPath();ctx.ellipse(0,0,R*1.25,R*1.12,0,Math.PI*1.04,Math.PI*1.96);ctx.stroke();
 ctx.restore();
 // orizzonte degli eventi
 ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,R,0,6.283);ctx.fill();
 ctx.strokeStyle=`rgba(255,232,196,${.75+flash*.25})`;ctx.lineWidth=Math.max(1.2,R*.04);ctx.beginPath();ctx.arc(0,0,R*1.02,0,6.283);ctx.stroke();
 // metà del disco davanti al buco
 ctx.save();ctx.beginPath();ctx.rect(-big,0,big*2,big);ctx.clip();
 ctx.globalCompositeOperation='lighter';ctx.scale(1,sq);ctx.rotate(h.spin);ctx.drawImage(G.disk,-D,-D,D*2,D*2);
 ctx.restore();
 // granelli di materia (un solo percorso)
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,214,160,.7)';ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();
 const s=R/Math.max(1,h.core);
 for(const m of BH.motes){
  const r=m.r*s,x=Math.cos(m.a)*r,y=Math.sin(m.a)*r*sq,x2=Math.cos(m.a-.18)*r,y2=Math.sin(m.a-.18)*r*sq;
  if(y<0&&Math.hypot(x,y/sq)<R*1.4)continue;
  ctx.moveTo(x2,y2);ctx.lineTo(x,y);
 }
 ctx.stroke();ctx.restore();
 ctx.restore();
}
// indicatore sul bordo dello schermo quando il buco nero tira ma non si vede ancora
function bhDrawEdge(){
 const h=BH.hole;if(!h||!player||state!=='play')return;
 const dx=h.x-player.x,dy=h.y-player.y,d=Math.hypot(dx,dy);
 if(d>h.reach+500)return;
 const lim=Math.min(W,H)*.44;if(Math.abs(dx)<W/2+h.core*2&&Math.abs(dy)<H/2+h.core*2)return;
 const a=Math.atan2(dy,dx),x=player.x+Math.cos(a)*lim,y=player.y+Math.sin(a)*lim,now=performance.now()/1000,p=.55+.45*Math.sin(now*6);
 ctx.save();ctx.translate(x,y);
 ctx.globalAlpha=.55+.4*p;ctx.fillStyle='#000';ctx.strokeStyle='#c99bff';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(0,0,9,0,6.283);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#ffb070';ctx.lineWidth=1.6;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,13+i*5,now*2+i*2.1,now*2+i*2.1+1.6);ctx.stroke()}
 ctx.rotate(a);ctx.fillStyle='#c99bff';ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(24,-6);ctx.lineTo(24,6);ctx.closePath();ctx.fill();
 ctx.restore();
}

// ---------------------------------------------------------------- aggancio a game.js
const bhOrig={startGame,updateMissile,drawSupplies,drawMissile};
startGame=function(...a){const r=bhOrig.startGame.apply(this,a);try{bhReset()}catch(e){console.error(e)}return r};
updateMissile=function(dt){bhOrig.updateMissile(dt);try{bhUpdate(dt)}catch(e){console.error(e)}};
drawSupplies=function(){try{bhDraw()}catch(e){console.error(e)}return bhOrig.drawSupplies()};
drawMissile=function(){bhOrig.drawMissile();try{bhDrawEdge()}catch(e){console.error(e)}};

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["ANOMALIA GRAVITAZIONALE · USA IL POST-BRUCIATORE","GRAVITATIONAL ANOMALY · USE THE AFTERBURNER","ANOMALIE GRAVITATIONNELLE · UTILISE LA POSTCOMBUSTION","ANOMALÍA GRAVITATORIA · USA LA POSCOMBUSTIÓN","ГРАВИТАЦИОННАЯ АНОМАЛИЯ · ВКЛЮЧИ ФОРСАЖ","引力异常 · 使用加力","重力異常 · アフターバーナーを使え"],
  ["SOLO IL POST-BRUCIATORE PUÒ SFUGGIRE AL BUCO NERO","ONLY THE AFTERBURNER CAN ESCAPE THE BLACK HOLE","SEULE LA POSTCOMBUSTION PEUT ÉCHAPPER AU TROU NOIR","SOLO LA POSCOMBUSTIÓN PUEDE ESCAPAR DEL AGUJERO NEGRO","ТОЛЬКО ФОРСАЖ ВЫРВЕТ ИЗ ЧЁРНОЙ ДЫРЫ","只有加力才能逃离黑洞","ブラックホールから逃げられるのはアフターバーナーだけ"],
  ["SFUGGITO AL BUCO NERO","ESCAPED THE BLACK HOLE","ÉCHAPPÉ AU TROU NOIR","HAS ESCAPADO DEL AGUJERO NEGRO","ВЫРВАЛСЯ ИЗ ЧЁРНОЙ ДЫРЫ","已逃离黑洞","ブラックホールから脱出"],
  ["INGHIOTTITO DAL BUCO NERO","SWALLOWED BY THE BLACK HOLE","ENGLOUTI PAR LE TROU NOIR","TRAGADO POR EL AGUJERO NEGRO","ПОГЛОЩЁН ЧЁРНОЙ ДЫРОЙ","被黑洞吞噬","ブラックホールに飲み込まれた"],
  ["IL BUCO NERO EVAPORA","THE BLACK HOLE EVAPORATES","LE TROU NOIR S’ÉVAPORE","EL AGUJERO NEGRO SE EVAPORA","ЧЁРНАЯ ДЫРА ИСПАРЯЕТСЯ","黑洞正在蒸发","ブラックホールが蒸発する"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
