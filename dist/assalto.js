// Conex — ASSALTO A TERRA (2026-11-04).
// 1) Più ribelli al riparo dietro i muretti: almeno 4 + difficoltà per livello, più vicini tra loro.
// 2) Quando il pilota si scontra con un soldato, anche il soldato viene spinto via (non solo il pilota).
// 3) Quando il pilota perde una vita c'è una scena: barcolla, cade in ginocchio, poi si sdraia a terra,
//    la spia della tuta lampeggia sempre più veloce ed esplode. Dopo arriva il pilota di riserva (terra.js).
//    Nel burrone l'esplosione è immediata; con la GOD MODE non c'è nessuna scena.
// Va caricato dopo facile.js: avvolge le versioni più esterne delle funzioni.

const ASS={coverMin:4,coverGap:380,shove:340,shoveUp:230,shoveCd:.3,stumble:.35,kneel:.75,down:1.75,lie:2.45,boom:3.15,end:3.75};
const asOrig={pfUpdateEnemies,pfLoseLife,gTrooper,updatePlatform,drawPlatform};
const asClamp=v=>Math.max(0,Math.min(1,v));
const asSmooth=v=>{v=asClamp(v);return v*v*(3-2*v)};

// ---------------------------------------------------------------- 1) più nemici al riparo
// Sostituisce quella di battaglia.js (chiamata per nome mentre si costruisce il livello).
battAddCovers=function(L,d,rnd){
 const want=ASS.coverMin+d,walls=[];
 // posti possibili: uno o due per ogni tratto di terreno abbastanza largo (prima le cime delle pareti)
 const spots=[];
 for(const s of L.solids){
  if(s.x<=1400||s.w<300||s.x+s.w>=L.arenaX-220)continue;
  const fr=s.w>=760?[.27,.72]:[.38+rnd()*.24];
  for(const f of fr)spots.push({x:Math.round(s.x+s.w*f),y:s.y,jet:!!s.jet,r:rnd()});
 }
 spots.sort((a,b)=>(b.jet?1:0)-(a.jet?1:0)||a.r-b.r);
 for(const sp of spots){
  if(walls.length>=want)break;
  if(walls.some(w=>Math.abs(w-sp.x)<ASS.coverGap))continue;
  if(L.hostages.some(h=>Math.abs(h.x-sp.x)<150))continue;
  walls.push(sp.x);
  L.props=L.props.filter(pr=>Math.abs(pr.x-sp.x)>70||pr.kind==='jet_su'||pr.kind==='jet_giu');
  L.props.push({x:sp.x,y:sp.y,kind:'muretto'});
  L.triggers.push({x:sp.x,type:'riparo',wallX:sp.x,y:sp.y});
 }
};

// ---------------------------------------------------------------- 2) scontro: anche il soldato si sposta
function asShove(e,P){
 if((e.shoveCd||0)>0)return;
 const dir=Math.sign(e.x-P.x)||-P.face||1;e.shoveCd=ASS.shoveCd;e.hit=Math.max(e.hit||0,.08);
 if(e.cover){e.x=Math.min(e.wallX+40,e.x+Math.max(0,dir)*22+8);return} // dietro al muretto barcolla all'indietro
 if(e.type==='drone'||e.jet){e.vx=(e.vx||0)+dir*300;e.vy=(e.vy||0)-80;return}
 e.vx=dir*ASS.shove;if(e.ground){e.vy=-ASS.shoveUp;e.ground=false}
 // il pilota rimbalza un po' dall'altra parte
 if(Math.sign(P.vx)!==-dir)P.vx=-dir*160;
 pfBurst((e.x+P.x)/2,P.y-30,'#ffe0b0',5,.5);noise(.06,.02,900);
}
pfUpdateEnemies=function(dt){
 asOrig.pfUpdateEnemies(dt);
 if(!pf)return;
 const P=pf.pilot;
 for(const e of pf.enemies){
  e.shoveCd=Math.max(0,(e.shoveCd||0)-dt);
  if(e.cover&&e.x>e.wallX+14)e.x=Math.max(e.wallX+14,e.x-30*dt); // torna al riparo
  if(e.hp>0&&P.visible&&P.hp>0&&pfOverlap(pfRect(P),pfRect(e)))asShove(e,P);
 }
};

// ---------------------------------------------------------------- 3) scena della vita persa
pfLoseLife=function(fall=false){
 if(!pf||pf.lives<=0)return;
 const P=pf.pilot;
 if((typeof godMode!=='undefined'&&godMode)||pf.phase==='vittoria')return asOrig.pfLoseLife(fall);
 if(fall){
  pf.morte={t:0,fall:true};
  Object.assign(P,{hp:0,visible:false,barrier:false,jetOn:false,vx:0,vy:0});
  return;
 }
 if(pf.morte||!P.visible)return;
 pf.morte={t:0,x:P.x,face:P.face||1,boom:false,beep:0};
 Object.assign(P,{hp:0,barrier:false,jetOn:false,inv:0,vx:P.vx*.35});
 pfStatus('PILOTA COLPITO',3200);
 tone(220,.5,'sawtooth',.03,90);noise(.25,.03,600);
};
function asUpdateDeath(dt){
 const M=pf.morte,P=pf.pilot,t0=M.t;M.t+=dt;const t=M.t;
 if(M.fall){
  if(t>=.6){pf.morte=null;asOrig.pfLoseLife(true)}
  return;
 }
 P.hp=0;P.barrier=false;P.jetOn=false;P.inv=0;mouse.down=false;
 if(P.ground)P.vx*=Math.max(0,1-dt*8);
 M.x=P.x;
 const chest={x:P.x,y:P.y-(t<ASS.down?24:10)};
 // in ginocchio: battito del cuore e fumo dalla tuta
 if(t0<ASS.stumble&&t>=ASS.stumble){noise(.12,.03,500);tone(70,.25,'sine',.05,50)}
 if(t>ASS.stumble&&t<ASS.boom&&Math.random()<dt*9)pf.fx.push({x:chest.x+(Math.random()-.5)*10,y:chest.y,vx:(Math.random()-.5)*14,vy:-26-Math.random()*20,life:1.3,max:1.3,color:'rgba(70,72,80,.55)',r:4+Math.random()*5,soft:true});
 if(t>ASS.stumble&&t<ASS.boom&&Math.random()<dt*4)pfBurst(chest.x,chest.y,'#8cf2ff',3,.4);
 for(const hb of [.9,1.5])if(t0<hb&&t>=hb)tone(58,.22,'sine',.06,42);
 // si sdraia: tonfo
 if(t0<ASS.lie&&t>=ASS.lie){noise(.18,.04,420);pf.cam.shake=Math.max(pf.cam.shake,.15);pfBurst(P.x-M.face*20,P.y-2,'#c7d6e2',8,.7,true,{vy:-40})}
 // spia della tuta che accelera
 if(t>ASS.lie){const rate=4+(t-ASS.lie)*22;M.beep+=dt*rate;if(M.beep>=1){M.beep=0;tone(1320,.05,'square',.012)}}
 // esplosione
 if(!M.boom&&t>=ASS.boom){
  M.boom=true;const x=P.x-M.face*16,y=P.y-10;
  pfBurst(x,y,'#ff7b4f',42,1.7);pfBurst(x,y,'#fff1c9',18,1.1);pfBurst(x,y,'#51e6ff',14,1);pfBurst(x,y,'#5d6672',22,1.2,true,{vy:-260});
  for(let i=0;i<8;i++)pf.fx.push({x:x+(Math.random()-.5)*30,y:y-Math.random()*20,vx:(Math.random()-.5)*40,vy:-40-Math.random()*50,life:2,max:2,color:'rgba(60,58,62,.6)',r:10+Math.random()*12,soft:true});
  if(typeof gFlash==='function')gFlash(x,y,340,'#ffb05a',.55);
  pf.cam.shake=Math.max(pf.cam.shake,1);sfx('boom',1.6);P.visible=false;
 }
 if(t>=ASS.end){pf.morte=null;asOrig.pfLoseLife(true)}
}
updatePlatform=function(dt){
 if(pf&&pf.morte&&!paused)asUpdateDeath(dt);
 return asOrig.updatePlatform(dt);
};
// Posa del pilota durante la scena.
gTrooper=function(o,pal,now){
 const M=typeof pf!=='undefined'&&pf&&pf.morte;
 if(!M||M.fall||o!==pf.pilot)return asOrig.gTrooper(o,pal,now);
 const t=M.t,f=M.face,kneel=asSmooth((t-ASS.stumble)/(ASS.kneel-ASS.stumble)),fall=asSmooth((t-ASS.down)/(ASS.lie-ASS.down));
 const stumble=t<ASS.stumble?Math.sin(t/ASS.stumble*Math.PI)*.22:0;
 const droop=f>0?1.15:Math.PI-1.15; // il fucile punta a terra
 const q=Object.assign({},o,{face:f,crouch:kneel>.4,ground:true,vx:0,aim:droop,inv:0});
 ctx.save();
 ctx.translate(o.x,o.y);
 // barcolla all'indietro, si piega in avanti in ginocchio, poi cade sulla schiena
 const lean=-f*stumble+f*.16*kneel*(1-fall),tremble=t>ASS.stumble&&t<ASS.down?(Math.random()-.5)*.03:0;
 ctx.rotate(lean+tremble-f*Math.PI/2*.94*fall);
 ctx.translate(-o.x,-o.y+3*kneel+5*fall);
 asOrig.gTrooper(q,pal,now);
 ctx.restore();
};
drawPlatform=function(){
 asOrig.drawPlatform();
 const M=typeof pf!=='undefined'&&pf&&pf.morte;if(!M||M.fall)return;
 const t=M.t,P=pf.pilot,s=pfScale();
 // spia rossa sul petto che lampeggia
 if(P.visible&&t>ASS.stumble&&!M.boom){
  const lit=t>ASS.lie?M.beep<.5:Math.floor(t*3)%2===0;
  if(lit){const lx=(P.x-M.face*(t>ASS.lie?24:-2)-pf.cam.x)*s,ly=(P.y-(t>ASS.lie?8:30))*s;
   ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(lx,ly,0,lx,ly,16*s);g.addColorStop(0,'rgba(255,240,240,.95)');g.addColorStop(.3,'rgba(255,60,76,.7)');g.addColorStop(1,'rgba(255,40,60,0)');ctx.fillStyle=g;ctx.fillRect(lx-16*s,ly-16*s,32*s,32*s);ctx.restore()}
 }
 // lo schermo si scurisce e si arrossa ai bordi
 const k=Math.min(1,t/.6)*(t>ASS.boom?Math.max(0,1-(t-ASS.boom)/(ASS.end-ASS.boom)):1);
 if(k>0){const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.hypot(W,H)*.6);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(70,0,8,${.6*k})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}
};
