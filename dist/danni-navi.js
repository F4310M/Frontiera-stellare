// Conex — NAVI DANNEGGIATE (2026-11-14): quando una nave viene colpita fa scintille e un soffio di fumo,
// e finché è danneggiata continua a fumare (e, se è messa male, a sprizzare scintille).
// Vale per la nave del pilota e per quelle nemiche, nella battaglia nello spazio.
// - Il colpo si riconosce dal calo di vita (player.health, e.hp): funziona con laser, missili, urti, ecc.
// - Più la nave è danneggiata, più fumo (da grigio chiaro a nero) e più scintille.
// - Prestazioni: il fumo è un'unica immagine sfumata pronta (niente gradienti o shadowBlur a ogni
//   fotogramma), le navi fuori schermo non emettono nulla e c'è un tetto alle particelle.
// Usa le particelle di game.js (particles, drawParticle). Va caricato dopo fluidita.js e dopo gli altri update.
const DN={
 maxPart:700,           // oltre questo numero di particelle non si aggiunge fumo
 smokeLife:[1.4,2.2],    // secondi di vita di uno sbuffo
 enemyRate:[6,22],    // sbuffi al secondo di un nemico, da poco a molto danneggiato
 playerRate:[7,28],     // lo stesso per la nave del pilota
 playerFrom:.78,        // la nave del pilota inizia a fumare sotto il 78% di vita
 sparkFrom:.45,         // oltre questo danno escono anche scintille continue
 secondFrom:.6,         // oltre questo danno fuma anche una seconda falla
 fireFrom:.8            // oltre questo danno la falla brucia (brace che pulsa)
};
(function(){
'use strict';
if(typeof update!=='function'||typeof particles==='undefined')return;
const rnd=(a,b)=>a+Math.random()*(b-a);

// ---------------------------------------------------------------- immagine dello sbuffo (una volta sola)
let puff=null;
function puffSprite(){
 if(puff!==null)return puff;
 try{
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.45,'rgba(255,255,255,.55)');
  g.addColorStop(.75,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  // tinte già pronte: dal grigio chiaro al nero fumo
  puff=['#d8dce2','#bcc1c8','#9ea3ab','#868a92','#6e7279'].map(col=>{
   const t=document.createElement('canvas');t.width=t.height=64;const y=t.getContext('2d');
   y.drawImage(c,0,0);y.globalCompositeOperation='source-in';y.fillStyle=col;y.fillRect(0,0,64,64);return t});
 }catch(e){puff=false}
 return puff;
}

// ---------------------------------------------------------------- particelle
// out = dove vanno le particelle: quelle della campagna (particles) o quelle dell'arena online (g.parts)
let out=[];
function smoke(x,y,vx,vy,size,dark){
 if(out.length>DN.maxPart)return;
 const life=rnd(DN.smokeLife[0],DN.smokeLife[1]);
 out.push({x,y,vx,vy,life,max:life,r:size,dn:Math.min(4,Math.max(0,Math.round(dark*4))),spin:rnd(0,6.28),color:'#61666e',soft:true});
}
function sparks(x,y,n,power,bx=0,by=0){
 for(let i=0;i<n;i++){
  if(out.length>DN.maxPart+200)return;
  const a=Math.random()*6.28,s=rnd(90,260)*power,h=Math.random();
  out.push({x,y,vx:bx+Math.cos(a)*s,vy:by+Math.sin(a)*s,life:rnd(.12,.32),max:.32,
   color:h<.3?'#fff6dc':h<.7?'#ffd27a':'#ff9a3c',r:rnd(.7,1.5)});
 }
}
function flash(x,y,r){out.push({x,y,vx:0,vy:0,life:.14,max:.14,color:'#ffe2a8',r,soft:true})}

// il fumo si disegna con l'immagine pronta, il resto come prima
const dnOrigDraw=drawParticle;
drawParticle=function(p){
 if(p.dn===undefined)return dnOrigDraw(p);
 const sp=puffSprite();if(!sp)return;
 const fade=Math.max(0,p.life/p.max),age=1-fade,size=p.r*(1+age*2.4);
 const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';// l'arena disegna in 'lighter': il fumo deve scurire
 ctx.globalAlpha=Math.min(1,fade*1.6)*.62*(age<.12?age/.12:1);
 ctx.drawImage(sp[p.dn],p.x-size,p.y-size,size*2,size*2);
 ctx.globalAlpha=1;ctx.globalCompositeOperation=op;
};

// ---------------------------------------------------------------- navi
function onScreen(x,y,m){const c=camera();return x>c.x-m&&x<c.x+W+m&&y>c.y-m&&y<c.y+H+m}
// punto della nave da cui esce il fumo (una "ferita" scelta a caso al primo colpo)
function wound(s,r,angle){
 if(!s._dnW)s._dnW={x:rnd(-.45,.15)*r,y:rnd(-.35,.35)*r};
 const c=Math.cos(angle||0),n=Math.sin(angle||0);
 return{x:s.x+s._dnW.x*c-s._dnW.y*n,y:s.y+s._dnW.x*n+s._dnW.y*c};
}
// un colpo appena preso: scintille, lampo e uno sbuffo
function hitFx(s,r,angle,dmg){
 const w=wound(s,r,angle),k=Math.min(1.6,.7+dmg*.6);
 flash(w.x,w.y,4+r*.18);sparks(w.x,w.y,Math.round(7+dmg*6),k,(s.vx||0)*.5,(s.vy||0)*.5);
 for(let i=0;i<2;i++)smoke(w.x,w.y,(s.vx||0)*.3+rnd(-25,25),(s.vy||0)*.3+rnd(-25,25),r*rnd(.28,.4),.35);
}
// fumo continuo finché la nave è danneggiata (dmg da 0 a 1)
function trail(s,r,angle,dmg,rate,dt){
 // nave ferma: meno sbuffi, così il fumo non diventa una nuvola che copre la nave
 const still=Math.min(1,.35+Math.hypot(s.vx||0,s.vy||0)/200);
 s._dnAcc=(s._dnAcc||0)+dt*(rate[0]+(rate[1]-rate[0])*dmg)*still;
 const w=wound(s,r,angle),drift=-.15;
 while(s._dnAcc>=1){
  s._dnAcc-=1;
  smoke(w.x+rnd(-2,2),w.y+rnd(-2,2),(s.vx||0)*drift+rnd(-18,18),(s.vy||0)*drift+rnd(-18,18),r*rnd(.34,.5)*(.75+dmg*1.1),.15+dmg*.85);
 }
 if(dmg>DN.sparkFrom&&Math.random()<dt*(1.5+dmg*5))sparks(w.x,w.y,2+Math.floor(Math.random()*3),.6,(s.vx||0)*.4,(s.vy||0)*.4);
 // vicino alla distruzione: una seconda falla che fuma e brace accesa che pulsa
 if(dmg>DN.secondFrom){
  if(!s._dnW2)s._dnW2={x:rnd(-.3,.3)*r,y:(Math.random()<.5?-1:1)*rnd(.25,.45)*r};
  const c=Math.cos(angle||0),n=Math.sin(angle||0),x=s.x+s._dnW2.x*c-s._dnW2.y*n,y=s.y+s._dnW2.x*n+s._dnW2.y*c;
  if(Math.random()<dt*(rate[1]*.6*dmg))smoke(x,y,(s.vx||0)*-.15+rnd(-18,18),(s.vy||0)*-.15+rnd(-18,18),r*rnd(.3,.45)*(.75+dmg),dmg);
  if(Math.random()<dt*(1+dmg*3))sparks(x,y,2,.5,(s.vx||0)*.4,(s.vy||0)*.4);
 }
 if(dmg>DN.fireFrom&&Math.random()<dt*14)out.push({x:w.x+rnd(-2,2),y:w.y+rnd(-2,2),vx:(s.vx||0)*.9,vy:(s.vy||0)*.9,life:.12,max:.12,color:Math.random()<.5?'#ff8a3a':'#ffc15a',r:r*rnd(.08,.14),soft:true});
}

let lastHealth=null;
const dnOrigUpdate=update;
update=function(dt){
 const r=dnOrigUpdate.apply(this,arguments);
 try{
  out=particles;
  if(state!=='play'||paused||!player||!(dt>0)){if(state!=='play'&&state!=='dying')lastHealth=null;return r}
  // nave del pilota
  const h=Math.max(0,player.health);
  if(lastHealth!==null&&h<lastHealth-.5)hitFx(player,player.r*1.6,player.angle,(lastHealth-h)/25);
  lastHealth=h;
  if(h>0&&h/100<DN.playerFrom)trail(player,player.r*1.6,player.angle,Math.min(1,(DN.playerFrom-h/100)/DN.playerFrom+.1),DN.playerRate,dt);
  else player._dnAcc=0;
  // navi nemiche
  for(const e of enemies){
   if(e._dnHp===undefined){e._dnHp=e.hp;continue}
   if(e.hp<=0){e._dnHp=e.hp;continue}
   const max=e.maxHp||e._dnHp||1,vis=onScreen(e.x,e.y,e.r*3+60);
   if(e.hp<e._dnHp&&vis)hitFx(e,e.r,e.angle,(e._dnHp-e.hp)/max*2);
   e._dnHp=e.hp;
   const dmg=1-e.hp/max;
   if(dmg>.01&&vis)trail(e,e.r,e.angle,Math.min(1,dmg),DN.enemyRate,dt);
  }
 }catch(e){}
 return r;
};

// ---------------------------------------------------------------- sfida online (arena.js)
// la mia nave: m.h, angolo m.r; gli altri: s.h, angolo o.r. La vita va da 0 a ARENA.hp.
if(typeof arTick==='function'){
 const dnArTick=arTick,arHit=new Map();
 arTick=function(g,dt){
  const res=dnArTick.apply(this,arguments);
  try{
   if(!g||!g.parts||!(dt>0))return res;
   out=g.parts;const max=(typeof ARENA!=='undefined'&&ARENA.hp)||100,m=g.me,z=typeof arZoom==='function'?arZoom():1;
   const vis=(x,y)=>Math.abs(x-m.x)<W/2/z+160&&Math.abs(y-m.y)<H/2/z+160;
   const ship=(key,o,x,y,ang,h,alive,vx,vy)=>{
    const st=o._dn||(o._dn={x:0,y:0,vx:0,vy:0});st.x=x;st.y=y;st.vx=vx;st.vy=vy;
    const prev=arHit.get(key);arHit.set(key,alive?h:null);
    if(!alive||!vis(x,y)){st._dnAcc=0;return}
    if(prev!=null&&h<prev-.5)hitFx(st,26,ang,(prev-h)/(max*.25));
    const dmg=1-h/max;
    if(dmg>1-DN.playerFrom)trail(st,26,ang,Math.min(1,(DN.playerFrom-h/max)/DN.playerFrom+.1),DN.playerRate,dt);
   };
   ship(g.pid,g,m.x,m.y,m.r,+m.h||0,!!m.al,m.vx||0,m.vy||0);
   for(const pid in g.others){const o=g.others[pid],s=o.s||{};ship(pid,o,o.x,o.y,o.r,+s.h||0,!!+s.al,+s.vx||0,+s.vy||0)}
  }catch(e){}
  return res;
 };
}
})();
