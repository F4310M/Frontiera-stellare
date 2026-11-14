// Spazio: mirino di aggancio che pulsa e navi nemiche che agganciano e lanciano missili.
// Si appoggia a game.js (drawTargetLock, updateMissile, drawMissile, damage, enemies, player).

// ---- 1) mirino di aggancio: quando l'aggancio è completo pulsa e lampeggia
drawTargetLock=function(){
 if(state!=='play'||!lockTarget||lockTarget.hp<=0)return;
 const t=lockTarget,p=lockProgress,smooth=p*p*(3-2*p),x=player.x+(t.x-player.x)*smooth,y=player.y+(t.y-player.y)*smooth;
 const now=performance.now()/1000,locked=p>=1,beat=locked?.5+.5*Math.sin(now*14):0,blink=locked&&Math.floor(now*5)%2===0;
 const r=t.r+15+(1-p)*15+beat*5;
 ctx.save();ctx.strokeStyle=locked?(blink?'#ff6a4d':'#ffb567'):'#8ce9ec';ctx.fillStyle=ctx.strokeStyle;
 ctx.lineWidth=locked?2+beat:1.5;ctx.globalAlpha=locked?.55+.45*beat:.85;
 // alone luminoso senza shadowBlur (pesante a ogni fotogramma): gli stessi tratti più larghi e trasparenti sotto
 const tratti=()=>{ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){ctx.moveTo(x+sx*r,y+sy*(r-10));ctx.lineTo(x+sx*r,y+sy*r);ctx.lineTo(x+sx*(r-10),y+sy*r)}ctx.moveTo(x+(r+6)*Math.cos(-Math.PI/2),y+(r+6)*Math.sin(-Math.PI/2));ctx.arc(x,y,r+6,-Math.PI/2,-Math.PI/2+p*Math.PI*2)};
 if(locked){const a0=ctx.globalAlpha,w0=ctx.lineWidth,glow=10+beat*10;ctx.lineCap='round';ctx.lineJoin='round';tratti();
  ctx.globalAlpha=a0*.14;ctx.lineWidth=w0+glow*.5;ctx.stroke();
  ctx.globalAlpha=a0;ctx.lineWidth=w0;ctx.lineCap='butt';ctx.lineJoin='miter'}
 ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){ctx.moveTo(x+sx*r,y+sy*(r-10));ctx.lineTo(x+sx*r,y+sy*r);ctx.lineTo(x+sx*(r-10),y+sy*r)}ctx.stroke();
 ctx.beginPath();ctx.arc(x,y,r+6,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();
 if(locked){// onda che si allarga dal bersaglio
  const w=(now*1.6)%1;ctx.globalAlpha=(1-w)*.6;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r+6+w*26,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=locked?(blink?1:.45):.85;
 ctx.font='10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText(locked?'AGGANCIATO':'AGGANCIO',x,y-r-14);
 ctx.restore();
};

// ---- 2) navi nemiche con missili a ricerca
const EM={missiles:[],lockers:new Set(),beep:0,warned:0};
const EM_LOCK_SECONDS=2.4,EM_RANGE=950,EM_MAX=3,EM_DAMAGE=14;
function emDifficulty(){return(world&&world.p&&world.p.difficulty)||1}
function emIsLauncher(e){
 if(e.missileer===undefined)e.missileer=Math.random()<Math.min(.36,.08+.06*emDifficulty());
 return e.missileer;
}
function emReset(){EM.missiles=[];EM.lockers.clear();EM.beep=0}
function emUpdate(dt){
 if(state!=='play'||paused){if(state!=='play')emReset();return}
 if(arrivalRemaining>0||player.destroyed){EM.lockers.clear();return}
 EM.lockers.clear();
 for(const e of enemies){
  if(e.hp<=0||!emIsLauncher(e))continue;
  e.emCool=(e.emCool??(2+Math.random()*4))-dt;
  const d=Math.hypot(e.x-player.x,e.y-player.y);
  if(d>EM_RANGE||e.emCool>0||EM.missiles.length>=EM_MAX){e.emLock=Math.max(0,(e.emLock||0)-dt*2);continue}
  e.emLock=(e.emLock||0)+dt;EM.lockers.add(e);
  if(e.emLock>=EM_LOCK_SECONDS){
   const a=Math.atan2(player.y-e.y,player.x-e.x);
   EM.missiles.push({x:e.x+Math.cos(a)*(e.r+6),y:e.y+Math.sin(a)*(e.r+6),angle:a,speed:250,life:6.5,r:5,hp:1});
   e.emLock=0;e.emCool=7+Math.random()*5;
   if(typeof sfx==='function')sfx('missile');
   if(typeof status==='function')status('MISSILE NEMICO IN ARRIVO',1600);
  }
 }
 // bip di avviso: più veloce quando un aggancio sta per chiudersi
 if(EM.lockers.size){
  const k=Math.max(...[...EM.lockers].map(e=>e.emLock/EM_LOCK_SECONDS));
  EM.beep-=dt;if(EM.beep<=0){EM.beep=.5-.36*k;if(typeof tone==='function')tone(k>.7?1320:980,.05,'square',.012)}
  if(performance.now()-EM.warned>2500&&typeof status==='function'){EM.warned=performance.now();status('AGGANCIO NEMICO · SCHIVA O ABBATTI IL MISSILE',1400)}
 }
 for(const m of EM.missiles){
  m.life-=dt;if(m.life<=0){m.hp=0;if(typeof burst==='function')burst(m.x,m.y,'#ff9a7a',8);continue}
  const desired=Math.atan2(player.y-m.y,player.x-m.x),delta=Math.atan2(Math.sin(desired-m.angle),Math.cos(desired-m.angle));
  m.angle+=Math.max(-2.1*dt,Math.min(2.1*dt,delta));// sterza meno dei tuoi: si può schivare
  m.speed=Math.min(430,m.speed+95*dt);
  m.x+=Math.cos(m.angle)*m.speed*dt;m.y+=Math.sin(m.angle)*m.speed*dt;
  const life=.25;particles.push({x:m.x-Math.cos(m.angle)*11,y:m.y-Math.sin(m.angle)*11,vx:-Math.cos(m.angle)*30,vy:-Math.sin(m.angle)*30,life,max:life,color:'#ff7a62',r:2,soft:true});
  // i tuoi colpi possono abbatterlo
  for(const b of bullets){if(!b.friendly||b.life<=0)continue;if(Math.hypot(b.x-m.x,b.y-m.y)<m.r+(b.r||3)+5){b.life=0;m.hp=0;burst(m.x,m.y,'#ffd28a',16);sfx('boom');status('MISSILE ABBATTUTO',1000);break}}
  if(m.hp<=0)continue;
  if(Math.hypot(player.x-m.x,player.y-m.y)<player.r+m.r+4){m.hp=0;burst(m.x,m.y,'#ffb36b',22);sfx('boom');damage(EM_DAMAGE,false)}
 }
 EM.missiles=EM.missiles.filter(m=>m.hp>0);
}
function emDraw(){
 if(state!=='play'&&state!=='dying')return;
 const now=performance.now()/1000;
 for(const m of EM.missiles){
  ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);
  ctx.fillStyle='#ffd0c4';ctx.strokeStyle='#ff4d5e';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-4);ctx.lineTo(-6,0);ctx.lineTo(-8,4);ctx.closePath();ctx.fill();ctx.stroke();
  drawPlume(-8,0,-1,0,26,3,'#ff5268');
  if(Math.floor(now*8)%2){ctx.fillStyle='#ff3b3b';ctx.beginPath();ctx.arc(4,0,2,0,Math.PI*2);ctx.fill()}
  ctx.restore();
 }
 if(state!=='play'||player.destroyed)return;
 // linea tratteggiata e mirino rosso sulla tua nave mentre un nemico ti aggancia
 let worst=0;
 for(const e of EM.lockers){
  const k=Math.min(1,e.emLock/EM_LOCK_SECONDS);worst=Math.max(worst,k);
  ctx.save();ctx.strokeStyle='rgba(255,70,80,'+(.15+.35*k).toFixed(2)+')';ctx.setLineDash([6,8]);ctx.lineDashOffset=-now*40;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(player.x,player.y);ctx.stroke();
  ctx.setLineDash([]);ctx.strokeStyle='#ff4d5e';ctx.globalAlpha=.6+.4*Math.sin(now*16);ctx.beginPath();ctx.arc(e.x,e.y,e.r+10,0,Math.PI*2*k);ctx.stroke();
  ctx.restore();
 }
 const danger=Math.max(worst,EM.missiles.length?1:0);
 if(danger>0){
  const blink=Math.floor(now*(4+6*danger))%2===0,r=34-danger*8;
  ctx.save();ctx.strokeStyle='#ff4d5e';ctx.fillStyle='#ff4d5e';ctx.lineWidth=1.5;ctx.globalAlpha=blink?.95:.35;
  ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){ctx.moveTo(player.x+sx*r,player.y+sy*(r-7));ctx.lineTo(player.x+sx*r,player.y+sy*r);ctx.lineTo(player.x+sx*(r-7),player.y+sy*r)}ctx.stroke();
  ctx.font='10px "Chakra Petch",sans-serif';ctx.textAlign='center';
  ctx.fillText(EM.missiles.length?'MISSILE IN ARRIVO':'SEI AGGANCIATO',player.x,player.y+r+16);
  ctx.restore();
 }
 // freccia sul bordo dello schermo per i missili fuori vista
 for(const m of EM.missiles){
  const dx=m.x-player.x,dy=m.y-player.y;if(Math.abs(dx)<W/2-20&&Math.abs(dy)<H/2-20)continue;
  const a=Math.atan2(dy,dx),R=Math.min(W,H)*.32;
  ctx.save();ctx.translate(player.x+Math.cos(a)*R,player.y+Math.sin(a)*R);ctx.rotate(a);ctx.fillStyle='#ff4d5e';ctx.globalAlpha=.55+.45*Math.sin(now*14);
  ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
 }
}
const emOrig={updateMissile,drawMissile};
updateMissile=function(dt){emOrig.updateMissile(dt);try{emUpdate(dt)}catch(e){console.error(e)}};
drawMissile=function(){emOrig.drawMissile();try{emDraw()}catch(e){console.error(e)}};
const emStart=startGame;
startGame=function(...a){emReset();return emStart.apply(this,a)};
