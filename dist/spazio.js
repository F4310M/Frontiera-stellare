// Stellar Frontier — BATTAGLIA NELLO SPAZIO (fase 1).
// 1) navi abbandonate disegnate con più dettagli (sezioni spezzate, oblò, motori spenti, cavi che fanno scintille)
// 2) ogni tanto arriva una nave da guerra nemica grande che spara razzi
// 3) indicatore del pianeta sul bordo dello schermo + avviso quando ti allontani troppo dall'obiettivo
// I razzi e i missili nemici colpiscono rocce, relitti e meteoriti, ma mai le altre navi nemiche.
// Si appoggia a game.js e missili-nemici.js; va caricato dopo missili-nemici.js.

const SP={rockets:[],big:null,bigTimer:0,best:Infinity,far:false,farBeep:0};
const SP_BIG={first:[38,62],next:[60,95],hp:18,hpPerDiff:4,r:56,salvoGap:2.7,rocketDamage:14};
const SP_FAR={on:1500,off:1000};// unità di gioco oltre il punto più vicino raggiunto
function spDiff(){return(world&&world.p&&world.p.difficulty)||1}
function spRand(a,b){return a+Math.random()*(b-a)}
function spReset(){SP.rockets=[];SP.big=null;SP.bigTimer=spRand(...SP_BIG.first);SP.best=Infinity;spSetFar(false)}

// ---------------------------------------------------------------- 1) relitti dettagliati
function spSeeded(seed){let s=seed>>>0||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const spWreckShapes=new WeakMap();
function spWreckShape(w){
 let s=spWreckShapes.get(w);if(s)return s;
 const rnd=spSeeded(w.seed??=Math.floor(Math.random()*1e9));
 // bordo strappato verticale tra y0 e y1 alla x data
 const jag=(x,y0,y1,n,amp)=>{const p=[];for(let i=0;i<=n;i++){const k=i/n;p.push([x+(i&&i<n?(rnd()-.5)*amp*2:0),y0+(y1-y0)*k])}return p};
 const stern=[[-.95,-.2],[-.86,-.31],[-.5,-.33],[-.36,-.29],...jag(-.2,-.27,.27,6,.07),[-.36,.29],[-.5,.33],[-.86,.31],[-.95,.2]];
 const mid={dx:-.03,dy:.1,rot:.28+rnd()*.15,pts:[...jag(-.12,.22,-.22,4,.05),[.0,-.25],...jag(.12,-.22,.22,4,.05),[0,.25]]};
 const bow=[...jag(.18,.26,-.26,6,.07),[.48,-.27],[.78,-.18],[.97,-.04],[.97,.04],[.78,.18],[.48,.27]];
 const windows=[];for(let i=0;i<7;i++)windows.push({x:.3+i*.075,y:-.1,lit:rnd()<.35,ph:rnd()*6});
 for(let i=0;i<5;i++)windows.push({x:-.82+i*.09,y:.12,lit:rnd()<.25,ph:rnd()*6});
 const debris=[];for(let i=0;i<7;i++)debris.push({a:rnd()*6.28,d:.75+rnd()*.35,s:.025+rnd()*.035,sp:(rnd()-.5)*.25,rot:rnd()*6,spin:(rnd()-.5)*1.4});
 const holes=[];for(let i=0;i<4;i++)holes.push({x:-.75+rnd()*1.55,y:(rnd()-.5)*.36,r:.025+rnd()*.035});
 const soot=[];for(let i=0;i<3;i++)soot.push({x:-.6+rnd()*1.3,y:(rnd()-.5)*.3,r:.12+rnd()*.12});
 s={stern,mid,bow,windows,debris,holes,soot,beacon:rnd()*6};
 spWreckShapes.set(w,s);return s;
}
function spPoly(pts,r){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x*r,y*r):ctx.moveTo(x*r,y*r));ctx.closePath()}
function spMetal(r,dark){const g=ctx.createLinearGradient(-r*.3,-r*.35,r*.25,r*.35);g.addColorStop(0,dark?'#1d2a37':'#2a3a4a');g.addColorStop(.35,dark?'#5a6b7c':'#7d8e9e');g.addColorStop(.5,dark?'#34465a':'#4b5e71');g.addColorStop(1,'#101a26');return g}
function spSection(pts,r,dark){
 ctx.save();spPoly(pts,r);ctx.fillStyle=spMetal(r,dark);ctx.fill();ctx.clip();
 // pannelli dello scafo
 ctx.strokeStyle='rgba(10,18,28,.75)';ctx.lineWidth=1;
 for(let x=-1;x<=1;x+=.09){ctx.beginPath();ctx.moveTo(x*r,-r*.4);ctx.lineTo(x*r,r*.4);ctx.stroke()}
 for(const y of [-.19,-.06,.06,.19]){ctx.beginPath();ctx.moveTo(-r,y*r);ctx.lineTo(r,y*r);ctx.stroke()}
 ctx.strokeStyle='rgba(190,210,225,.16)';
 for(const y of [-.185,.065]){ctx.beginPath();ctx.moveTo(-r,y*r);ctx.lineTo(r,y*r);ctx.stroke()}
 ctx.fillStyle='rgba(200,215,230,.22)';// rivetti
 for(let x=-.95;x<=.95;x+=.09)for(const y of [-.215,-.035,.085,.215])ctx.fillRect(x*r+2,y*r,1.4,1.4);
 // ombra in basso
 const sh=ctx.createLinearGradient(0,-r*.35,0,r*.35);sh.addColorStop(0,'rgba(255,255,255,.08)');sh.addColorStop(.6,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.45)');
 ctx.fillStyle=sh;ctx.fillRect(-r,-r*.4,r*2,r*.8);
 ctx.restore();
 spPoly(pts,r);ctx.strokeStyle='#8b9ba9';ctx.lineWidth=1.4;ctx.stroke();
}
// travi e interni a vista lungo un bordo strappato
function spTornEdge(x,dir,r,y0=-.25,y1=.25){
 ctx.save();ctx.strokeStyle='#26323f';ctx.lineWidth=3;
 for(let y=y0+.04;y<y1;y+=.085){ctx.beginPath();ctx.moveTo(x*r-dir*r*.05,y*r);ctx.lineTo(x*r+dir*r*(.05+Math.abs(Math.sin(y*37))*.07),y*r+Math.sin(y*19)*r*.03);ctx.stroke()}
 ctx.strokeStyle='#6f7f8e';ctx.lineWidth=1;
 for(let y=y0+.04;y<y1;y+=.085){ctx.beginPath();ctx.moveTo(x*r-dir*r*.05,y*r);ctx.lineTo(x*r+dir*r*(.05+Math.abs(Math.sin(y*37))*.07),y*r+Math.sin(y*19)*r*.03);ctx.stroke()}
 ctx.restore();
}
function spDrawWreck(w){
 if(!player||Math.abs(w.x-player.x)>W/2+w.r*1.3||Math.abs(w.y-player.y)>H/2+w.r*1.3)return;
 const s=spWreckShape(w),r=w.r,now=performance.now()/1000;
 ctx.save();ctx.translate(w.x,w.y);
 // detriti che girano attorno al relitto
 for(const d of s.debris){
  const a=d.a+now*d.sp,x=Math.cos(a)*d.d*r,y=Math.sin(a)*d.d*r*.7;
  ctx.save();ctx.translate(x,y);ctx.rotate(d.rot+now*d.spin);ctx.fillStyle='#5c6c7b';ctx.strokeStyle='#2a3542';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-d.s*r,-d.s*r*.5);ctx.lineTo(d.s*r,-d.s*r*.7);ctx.lineTo(d.s*r*.6,d.s*r*.6);ctx.lineTo(-d.s*r*.8,d.s*r*.4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 ctx.rotate(w.rot);
 // motori spenti a poppa
 for(const y of [-.17,0,.17]){
  ctx.fillStyle='#1b232c';ctx.strokeStyle='#5d6c7a';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-.95*r,(y-.07)*r);ctx.lineTo(-1.04*r,(y-.09)*r);ctx.lineTo(-1.04*r,(y+.09)*r);ctx.lineTo(-.95*r,(y+.07)*r);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#07090d';ctx.beginPath();ctx.ellipse(-1.04*r,y*r,r*.018,r*.075,0,0,Math.PI*2);ctx.fill();
 }
 // cavi tra le sezioni, con scintille
 ctx.strokeStyle='#2b2f36';ctx.lineWidth=2;
 const cables=[[-.2,-.12,.02,-.3,.18,-.15],[-.2,.08,-.05,.32,.2,.12],[-.2,.18,.0,.05,.08,.3]];
 for(const [x0,y0,cx,cy,x1,y1] of cables){ctx.beginPath();ctx.moveTo(x0*r,y0*r);ctx.quadraticCurveTo(cx*r,cy*r,x1*r,y1*r);ctx.stroke()}
 // sezione di poppa
 spSection(s.stern,r,false);spTornEdge(-.2,1,r,-.27,.27);
 // fascia di vernice sbiadita a strisce
 ctx.save();spPoly(s.stern,r);ctx.clip();ctx.globalAlpha=.32;
 for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#d9a441':'#20262d';ctx.beginPath();const x=-.9+i*.075;ctx.moveTo(x*r,-.31*r);ctx.lineTo((x+.075)*r,-.31*r);ctx.lineTo((x+.045)*r,-.22*r);ctx.lineTo((x-.03)*r,-.22*r);ctx.closePath();ctx.fill()}
 ctx.restore();
 // pezzo centrale staccato e inclinato
 ctx.save();ctx.translate(s.mid.dx*r,s.mid.dy*r);ctx.rotate(s.mid.rot);spSection(s.mid.pts,r,true);
 ctx.fillStyle='#0a1119';ctx.fillRect(-r*.06,-r*.1,r*.12,r*.2);ctx.strokeStyle='#4d5d6c';ctx.strokeRect(-r*.06,-r*.1,r*.12,r*.2);
 ctx.restore();
 // sezione di prua
 spSection(s.bow,r,false);spTornEdge(.18,-1,r,-.26,.26);
 // cabina di pilotaggio: vetro scuro con riflesso e una crepa
 ctx.save();ctx.beginPath();ctx.moveTo(.78*r,-.1*r);ctx.quadraticCurveTo(.93*r,-.06*r,.95*r,0);ctx.quadraticCurveTo(.93*r,.06*r,.78*r,.1*r);ctx.quadraticCurveTo(.72*r,0,.78*r,-.1*r);
 const glass=ctx.createLinearGradient(.72*r,-.1*r,.95*r,.1*r);glass.addColorStop(0,'#0b1a26');glass.addColorStop(.45,'#2c4c63');glass.addColorStop(1,'#060d14');ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle='#9fb4c3';ctx.lineWidth=1;ctx.stroke();
 ctx.strokeStyle='rgba(220,240,255,.55)';ctx.beginPath();ctx.moveTo(.8*r,-.04*r);ctx.lineTo(.86*r,-.01*r);ctx.lineTo(.84*r,.03*r);ctx.moveTo(.86*r,-.01*r);ctx.lineTo(.91*r,-.03*r);ctx.stroke();ctx.restore();
 // antenna piegata con parabola
 ctx.strokeStyle='#8b9ba9';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(.55*r,-.27*r);ctx.lineTo(.6*r,-.42*r);ctx.lineTo(.7*r,-.47*r);ctx.stroke();
 ctx.beginPath();ctx.arc(.72*r,-.48*r,r*.035,Math.PI*.2,Math.PI*1.3);ctx.stroke();
 // oblò: quasi tutti spenti, qualcuno tremola
 for(const o of s.windows){
  const on=o.lit&&Math.sin(now*(3+o.ph)+o.ph*7)>-.2;
  ctx.fillStyle=on?(o.ph>3?'#ffcf7a':'#8fe8ff'):'#0b141d';ctx.fillRect(o.x*r,o.y*r,r*.035,r*.03);
  if(on){ctx.globalAlpha=.25;ctx.fillRect(o.x*r-2,o.y*r-2,r*.035+4,r*.03+4);ctx.globalAlpha=1}
 }
 // bruciature e buchi con bordo incandescente
 for(const b of s.soot){const g=ctx.createRadialGradient(b.x*r,b.y*r,0,b.x*r,b.y*r,b.r*r);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x*r,b.y*r,b.r*r,0,Math.PI*2);ctx.fill()}
 for(const h of s.holes){ctx.fillStyle='#05090e';ctx.beginPath();ctx.arc(h.x*r,h.y*r,h.r*r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,140,70,'+(.45+.3*Math.sin(now*2+h.x*9)).toFixed(2)+')';ctx.lineWidth=1.5;ctx.stroke()}
 // luce di emergenza rossa che lampeggia
 const beacon=Math.sin(now*3+s.beacon)>.6;
 if(beacon){ctx.fillStyle='#ff4040';ctx.shadowColor='#ff3030';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(-.6*r,-.33*r,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
 // scintille sulle punte dei cavi
 for(const [,,,,x1,y1] of cables){if(Math.random()<.08){ctx.fillStyle='#fff3c4';ctx.shadowColor='#ffd27a';ctx.shadowBlur=10;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x1*r+(Math.random()-.5)*8,y1*r+(Math.random()-.5)*8,1+Math.random()*1.4,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0}}
 ctx.fillStyle='#e3b96c';ctx.font=Math.max(8,r*.055)+'px monospace';ctx.textAlign='center';ctx.fillText('RECUPERO ENERGIA ×4',0,-r*.62);
 ctx.restore();
}

// ---------------------------------------------------------------- 2) nave da guerra nemica con razzi
function spSpawnBig(){
 const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.75+200;
 const before=enemies.length;spawnEnemy(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d,true);
 const e=enemies[before];if(!e)return;
 const hp=SP_BIG.hp+SP_BIG.hpPerDiff*spDiff();
 Object.assign(e,{big:true,type:'sniper',r:SP_BIG.r,hp,maxHp:hp,missileer:false,explosive:2.4,edge:'#ffb36b',fire:2.5});
 SP.big=e;
 status('NAVE DA GUERRA NEMICA IN AVVICINAMENTO',2600);
 if(typeof tone==='function'){tone(140,.5,'sawtooth',.03,70);tone(110,.6,'square',.018,60,.25)}
}
function spFireSalvo(e){
 for(const side of [-1,1]){
  const a=e.angle+side*.22,px=e.x+Math.cos(e.angle)*e.r*.2-Math.sin(e.angle)*side*e.r*.55,py=e.y+Math.sin(e.angle)*e.r*.2+Math.cos(e.angle)*side*e.r*.55;
  SP.rockets.push({x:px,y:py,angle:a,speed:170,life:5.5,r:6,hp:2});
 }
 e.bigShot=true;
 if(typeof sfx==='function')sfx('missile');
 status('RAZZI IN ARRIVO',1200);
}
// razzi e missili nemici contro rocce, relitti, creature e meteorite: li danneggiano, le navi nemiche no
function spOrdnanceHitsScenery(m,nx,ny,power){
 for(const [group,f] of [[rocks,.72],[wrecks,.62],[monsters,.65]])for(const o of group){
  if(o.hp<=0||segmentImpact(m.x,m.y,nx,ny,o,o.r*f+m.r)===null)continue;
  spEnemyFire(()=>destroyableHit(o,power,'#ffb36b',14));return true;
 }
 if(meteor&&!(meteor.warning>0)&&segmentImpact(m.x,m.y,nx,ny,meteor,meteor.r+m.r)!==null){hitMeteor(power);return true}
 return false;
}
// i danni fatti dal fuoco nemico non danno punti al giocatore (enemyFire è in game.js, lo legge classifica.js)
function spEnemyFire(fn){enemyFire=true;try{return fn()}finally{enemyFire=false}}
function spUpdateRockets(dt){
 for(const m of SP.rockets){
  m.life-=dt;if(m.life<=0){m.hp=0;burst(m.x,m.y,'#ff9a7a',10);continue}
  if(!player.destroyed){const want=Math.atan2(player.y-m.y,player.x-m.x),delta=Math.atan2(Math.sin(want-m.angle),Math.cos(want-m.angle));m.angle+=Math.max(-1.05*dt,Math.min(1.05*dt,delta))}
  m.speed=Math.min(390,m.speed+120*dt);
  const nx=m.x+Math.cos(m.angle)*m.speed*dt,ny=m.y+Math.sin(m.angle)*m.speed*dt;
  if(spOrdnanceHitsScenery(m,nx,ny,3)){m.hp=0;burst(nx,ny,'#ffb36b',16,1.2);sfx('boom');continue}
  m.x=nx;m.y=ny;
  particles.push({x:m.x-Math.cos(m.angle)*13,y:m.y-Math.sin(m.angle)*13,vx:-Math.cos(m.angle)*40+(Math.random()-.5)*20,vy:-Math.sin(m.angle)*40+(Math.random()-.5)*20,life:.35,max:.35,color:'#ffa04a',r:2.6,soft:true});
  for(const b of bullets){if(!b.friendly||b.life<=0)continue;if(segmentImpact(b.px??b.x,b.py??b.y,b.x,b.y,m,m.r+(b.r||3)+4)!==null){b.life=0;m.hp-=b.dmg||1;burst(m.x,m.y,'#ffd28a',5);if(m.hp<=0){burst(m.x,m.y,'#ffd28a',16);sfx('boom');status('RAZZO ABBATTUTO',900)}break}}
  if(m.hp<=0)continue;
  if(missile&&Math.hypot(missile.x-m.x,missile.y-m.y)<m.r+(missile.r||5)+6){m.hp=0;burst(m.x,m.y,'#ffd28a',16);sfx('boom');continue}
  if(!player.destroyed&&Math.hypot(player.x-m.x,player.y-m.y)<player.r+m.r+3){m.hp=0;burst(m.x,m.y,'#ffb36b',22);sfx('boom');damage(SP_BIG.rocketDamage,false)}
 }
 SP.rockets=SP.rockets.filter(m=>m.hp>0);
 // anche i missili a ricerca delle navi nemiche si schiantano su rocce e relitti
 if(typeof EM!=='undefined')for(const m of EM.missiles){
  if(m.hp<=0)continue;const nx=m.x+Math.cos(m.angle)*m.speed*.02,ny=m.y+Math.sin(m.angle)*m.speed*.02;
  if(spOrdnanceHitsScenery(m,nx,ny,2)){m.hp=0;burst(m.x,m.y,'#ffb36b',14);sfx('boom')}
 }
}
function spUpdateBig(dt){
 const e=SP.big;
 if(e&&e.hp<=0){// distrutta: grande esplosione e premio
  SP.big=null;SP.bigTimer=spRand(...SP_BIG.next);
  if(typeof shipBlast==='function')shipBlast(e.x,e.y,1.4);
  pickups.push({x:e.x-14,y:e.y,kind:'repair',life:24,r:12},{x:e.x+14,y:e.y,kind:'energy',life:24,r:12});
  if(typeof scoreAdd==='function'&&typeof SCORE_PTS!=='undefined')scoreAdd(SCORE_PTS.nemico*4*(typeof scoreDiff==='function'?scoreDiff(world&&world.p):1));
  status('NAVE DA GUERRA DISTRUTTA',2200);
 }else if(e&&!enemies.includes(e))SP.big=null;
 if(!SP.big){SP.bigTimer-=dt;if(SP.bigTimer<=0){SP.bigTimer=spRand(...SP_BIG.next);spSpawnBig()}}
}
function spUpdate(dt){
 if(state!=='play'||paused)return;
 if(arrivalRemaining>0)return;
 spUpdateBig(dt);spUpdateRockets(dt);
}
function spDrawBig(e){
 const r=e.r,now=performance.now()/1000,moving=Math.hypot(e.vx,e.vy)>10,charge=e.fire<.8?1-e.fire/.8:0;
 ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
 if(moving)for(const y of [-.2,0,.2])drawPlume(-.98*r,y*r,-1,0,y?46:62,y?5:7,'#ff5268');
 // piloni e capsule lanciarazzi
 for(const side of [-1,1]){
  ctx.fillStyle='#501c2a';ctx.strokeStyle='#d95263';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-.25*r,side*.25*r);ctx.lineTo(.05*r,side*.25*r);ctx.lineTo(-.02*r,side*.45*r);ctx.lineTo(-.3*r,side*.45*r);ctx.closePath();ctx.fill();ctx.stroke();
  const pod=ctx.createLinearGradient(0,side*.42*r,0,side*.68*r);pod.addColorStop(0,'#762c39');pod.addColorStop(1,'#360e1e');ctx.fillStyle=pod;
  ctx.beginPath();ctx.moveTo(-.5*r,side*.44*r);ctx.lineTo(.3*r,side*.44*r);ctx.lineTo(.42*r,side*.5*r);ctx.lineTo(.42*r,side*.62*r);ctx.lineTo(.3*r,side*.68*r);ctx.lineTo(-.5*r,side*.68*r);ctx.closePath();ctx.fill();ctx.stroke();
  // bocche dei razzi con le testate rosse
  for(let i=0;i<3;i++){const y=side*(.48+i*.07)*r;ctx.fillStyle='#1a060c';ctx.beginPath();ctx.arc(.42*r,y,r*.028,0,Math.PI*2);ctx.fill();ctx.fillStyle=charge?`rgba(255,${170-charge*90|0},80,${.5+.5*charge})`:'#ff6576';ctx.beginPath();ctx.arc(.42*r,y,r*.014,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='rgba(255,155,164,.35)';ctx.beginPath();for(let x=-.4;x<.3;x+=.14){ctx.moveTo(x*r,side*.44*r);ctx.lineTo(x*r,side*.68*r)}ctx.stroke();
  // luce di posizione
  const blink=Math.floor(now*2+(side>0?.5:0))%2===0;ctx.fillStyle=blink?'#ff394c':'#ffc3c6';ctx.shadowColor='#ff394c';ctx.shadowBlur=blink?10:0;ctx.beginPath();ctx.arc(-.5*r,side*.68*r,2.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 }
 // scafo principale
 const hull=ctx.createLinearGradient(0,-.36*r,0,.36*r);hull.addColorStop(0,'#d95263');hull.addColorStop(.25,'#762c39');hull.addColorStop(.6,'#501c2a');hull.addColorStop(1,'#2a0a15');
 ctx.fillStyle=hull;ctx.strokeStyle='#ff9ba4';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(1.15*r,0);ctx.lineTo(.72*r,-.16*r);ctx.lineTo(.3*r,-.3*r);ctx.lineTo(-.55*r,-.35*r);ctx.lineTo(-.92*r,-.28*r);ctx.lineTo(-.98*r,0);ctx.lineTo(-.92*r,.28*r);ctx.lineTo(-.55*r,.35*r);ctx.lineTo(.3*r,.3*r);ctx.lineTo(.72*r,.16*r);ctx.closePath();ctx.fill();ctx.stroke();
 // piastre di corazza sul dorso
 ctx.fillStyle='#360e1e';ctx.strokeStyle='rgba(255,155,164,.45)';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(.75*r,0);ctx.lineTo(.35*r,-.17*r);ctx.lineTo(-.6*r,-.2*r);ctx.lineTo(-.75*r,0);ctx.lineTo(-.6*r,.2*r);ctx.lineTo(.35*r,.17*r);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();for(let x=-.5;x<.4;x+=.15){ctx.moveTo(x*r,-.19*r);ctx.lineTo(x*r,.19*r)}ctx.moveTo(-.65*r,0);ctx.lineTo(.68*r,0);ctx.stroke();
 // strisce rosse sul muso
 ctx.fillStyle='#ff394c';for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(.95*r,s*.04*r);ctx.lineTo(.62*r,s*.16*r);ctx.lineTo(.55*r,s*.13*r);ctx.lineTo(.88*r,s*.03*r);ctx.closePath();ctx.fill()}
 // ponte di comando con finestre accese
 ctx.fillStyle='#2a0a15';ctx.strokeStyle='#ffb4bc';ctx.beginPath();ctx.moveTo(-.2*r,-.1*r);ctx.lineTo(-.05*r,-.07*r);ctx.lineTo(-.05*r,.07*r);ctx.lineTo(-.2*r,.1*r);ctx.lineTo(-.42*r,.1*r);ctx.lineTo(-.42*r,-.1*r);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffdb9c';ctx.shadowColor='#ff6576';ctx.shadowBlur=6;for(let i=0;i<4;i++)ctx.fillRect((-.38+i*.08)*r,-.03*r,r*.045,r*.06);ctx.shadowBlur=0;
 // ugelli
 for(const y of [-.2,0,.2]){ctx.fillStyle='#1a060c';ctx.strokeStyle='#d95263';ctx.beginPath();ctx.ellipse(-.97*r,y*r,r*.035,r*.08,0,0,Math.PI*2);ctx.fill();ctx.stroke()}
 ctx.restore();
 // barra della vita più larga
 ctx.save();ctx.translate(e.x,e.y);const k=Math.max(0,e.hp/e.maxHp),bw=84;
 ctx.fillStyle='#ffffff22';ctx.fillRect(-bw/2,-r-20,bw,4);ctx.fillStyle=typeof hpColor==='function'?hpColor(k):'#ff5268';ctx.fillRect(-bw/2,-r-20,bw*k,4);
 if(charge>0){ctx.strokeStyle=`rgba(255,120,90,${(.25+.5*charge).toFixed(2)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+14,0,Math.PI*2*charge);ctx.stroke()}
 ctx.restore();
}
function spDrawRockets(){
 const now=performance.now()/1000;
 for(const m of SP.rockets){
  ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);
  drawPlume(-11,0,-1,0,30,4,'#ff5268');
  ctx.fillStyle='#d9c9c4';ctx.strokeStyle='#762c39';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(8,-3.5);ctx.lineTo(-10,-3.5);ctx.lineTo(-10,3.5);ctx.lineTo(8,3.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ff394c';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(8,-3.5);ctx.lineTo(8,3.5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#501c2a';ctx.beginPath();ctx.moveTo(-6,-3.5);ctx.lineTo(-11,-8);ctx.lineTo(-11,-3.5);ctx.moveTo(-6,3.5);ctx.lineTo(-11,8);ctx.lineTo(-11,3.5);ctx.fill();
  if(Math.floor(now*10)%2){ctx.fillStyle='#ffdb9c';ctx.beginPath();ctx.arc(0,0,1.6,0,Math.PI*2);ctx.fill()}
  ctx.restore();
 }
}

// ---------------------------------------------------------------- 3) freccia verso il pianeta e avviso di distanza
function spSetFar(on){
 SP.far=on;
 if(typeof document==='undefined')return;
 const el=$('farAlert');if(el)el.classList.toggle('hidden',!on);
 const box=document.querySelector&&document.querySelector('.distance-box');if(box&&box.classList)box.classList.toggle('far',on);
}
function spFar(d){
 if(state!=='play'||arrivalRemaining>0||!player||player.destroyed){if(SP.far)spSetFar(false);return}
 SP.best=Math.min(SP.best,d);
 const away=d-SP.best;
 if(!SP.far&&away>SP_FAR.on){spSetFar(true);SP.farBeep=0}
 else if(SP.far&&away<SP_FAR.off)spSetFar(false);
}
function spFarTick(dt){
 if(!SP.far||state!=='play'||paused)return;
 SP.farBeep-=dt;if(SP.farBeep<=0){SP.farBeep=3;if(typeof tone==='function'){tone(660,.12,'square',.018,440);tone(660,.12,'square',.018,440,.18)}}
}
// indicatore sul bordo dello schermo che punta il pianeta quando non si vede
function spDrawGuide(){
 if(state!=='play'||!player||player.destroyed||!world||arrivalRemaining>0||!ctx.getTransform)return;
 // posizione del pianeta sullo schermo (in pixel CSS), qualunque sia lo zoom della telecamera
 const M=ctx.getTransform(),k=canvas.width/W;
 const sx=(M.a*world.x+M.c*world.y+M.e)/k,sy=(M.b*world.x+M.d*world.y+M.f)/k,sr=world.r*Math.hypot(M.a,M.b)/k;
 if(sx+sr>0&&sx-sr<W&&sy+sr>0&&sy-sr<H)return;// il pianeta è visibile
 const touch=document.body&&document.body.classList&&document.body.classList.contains('touch');
 // margini: restano liberi i pannelli in alto, la barra in basso, il tasto schermo intero e il radar
 const L=touch?50:36,R=W-(touch?50:78),T=touch?90:118,B=H-(touch?170:140);
 const cx=W/2,cy=H/2,dx=sx-cx,dy=sy-cy;
 const f=Math.min(dx>0?(R-cx)/dx:dx<0?(L-cx)/dx:1e9,dy>0?(B-cy)/dy:dy<0?(T-cy)/dy:1e9);
 let x=cx+dx*f,y=cy+dy*f;if(!touch&&x>W-175&&y>H-205){if(Math.abs(dx)*(H-205-cy)>Math.abs(dy)*(W-175-cx))y=H-205;else x=W-175}
 const a=Math.atan2(dy,dx),now=performance.now()/1000,far=SP.far,col=far?'#ffb04a':'#7ff0ff',rgb=far?'255,176,74':'127,240,255';
 const pulse=.5+.5*Math.sin(now*(far?9:4));
 ctx.save();ctx.setTransform(k,0,0,k,0,0);ctx.translate(x,y);
 // alone e anello che pulsa
 const g=ctx.createRadialGradient(0,0,0,0,0,30);g.addColorStop(0,`rgba(${rgb},${.28+.18*pulse})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,30,0,6.28);ctx.fill();
 ctx.strokeStyle=`rgba(${rgb},${.35+.4*pulse})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,13+pulse*4,0,6.28);ctx.stroke();
 // pianetino nel colore del bersaglio al centro
 ctx.fillStyle=world.p&&world.p.color||col;ctx.strokeStyle='rgba(2,10,18,.9)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,6,0,6.28);ctx.fill();ctx.stroke();
 // punta verso il pianeta, appoggiata al bordo
 ctx.rotate(a);ctx.globalAlpha=far?.7+.3*pulse:.95;ctx.fillStyle=col;ctx.strokeStyle='rgba(2,10,18,.9)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(19,-8);ctx.lineTo(22,0);ctx.lineTo(19,8);ctx.closePath();ctx.stroke();ctx.fill();
 ctx.restore();
}

// ---------------------------------------------------------------- aggancio a game.js
const spOrig={drawWreck,drawEnemy,enemyShoot,updateEnemies,updateMissile,drawMissile,updateHud,startGame};
drawWreck=function(w){
 if(typeof ctx==='undefined'||!ctx.createLinearGradient||!player)return spOrig.drawWreck(w);
 try{spDrawWreck(w)}catch(e){console.error(e);spOrig.drawWreck(w)}
};
drawEnemy=function(e){if(e.big){try{spDrawBig(e);return}catch(err){console.error(err)}}return spOrig.drawEnemy(e)};
enemyShoot=function(e){if(e.big)return spFireSalvo(e);return spOrig.enemyShoot(e)};
updateEnemies=function(dt){
 spOrig.updateEnemies(dt);
 for(const e of enemies)if(e.bigShot){e.bigShot=false;e.fire+=SP_BIG.salvoGap}
};
updateMissile=function(dt){spOrig.updateMissile(dt);try{spUpdate(dt);spFarTick(dt)}catch(e){console.error(e)}};
drawMissile=function(){spOrig.drawMissile();try{if(state==='play'||state==='dying')spDrawRockets();spDrawGuide()}catch(e){console.error(e)}};
updateHud=function(d){spOrig.updateHud(d);try{spFar(d)}catch(e){console.error(e)}};
startGame=function(...a){spReset();return spOrig.startGame.apply(this,a)};
