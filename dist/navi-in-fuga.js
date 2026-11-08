// Conex — LE NAVI NEMICHE SCAPPANO (2026-11-08).
// Quando il boss del pianeta esplode non si vedono più i soldati nemici che corrono via a destra:
// al loro posto la flotta nemica fugge. Tre o quattro navi rosse arrivano da dietro il pilota e
// salgono verso destra accelerando, altre tre decollano dalla colonia sullo sfondo e spariscono in cielo.
// Una delle navi vicine è colpita e lascia una scia di fumo.
// Le navi sono lo stesso scafo nemico dello spazio (flHostileBody di fluidita.js), viste di tre quarti
// come la nave del pilota (n3Slab di nave3d.js), disegnate una volta in una piccola immagine e poi copiate.
// Niente shadowBlur né ctx.filter sul canvas principale (PC lenti). Va caricato dopo classifica.js.

const NF={
 vicine:3,lontane:3,      // navi che passano davanti e navi che decollano dallo sfondo
 px:5                     // pixel dell'immagine per unità della nave
};
const nfOrig={pfFreeColony,updatePlatform,pfDrawShipOnPad};
let nfSprite=null;

// ---- immagine della nave nemica di tre quarti (scafo rosso con spessore e ventre scuro)
function nfBody(g){
 const C=.56;
 if(typeof n3Slab==='function'&&typeof N3_HULL!=='undefined'){
  n3Slab(g,N3_KEEL,-9,-2,k=>`rgb(${44+k*40|0},${16+k*16|0},${24+k*18|0})`);
  for(const py of [-7,7])n3Slab(g,[[-20,py-3],[-12,py-3],[-12,py+3],[-20,py+3]],-7,-1,k=>`rgb(${34+k*26|0},${12+k*12|0},${20+k*14|0})`);
  n3Slab(g,N3_HULL,-4,-.3,k=>`rgb(${86+k*70|0},${30+k*34|0},${42+k*36|0})`);
 }
 g.save();g.transform(1,0,0,C,0,0);
 if(typeof flHostileBody==='function')flHostileBody(g,true,false);
 g.shadowBlur=0;g.restore();
 // luce dall'alto sull'ala lontana, ombra su quella vicina
 g.save();g.transform(1,0,0,C,0,0);const l=g.createLinearGradient(0,-16,0,16);
 l.addColorStop(0,'rgba(255,230,230,.18)');l.addColorStop(.5,'rgba(0,0,0,0)');l.addColorStop(1,'rgba(10,0,4,.4)');
 g.fillStyle=l;g.beginPath();
 const H=typeof N3_HULL!=='undefined'?N3_HULL:[[29,0],[-22,-12],[-22,12]];
 H.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.restore();
}
function nfGetSprite(){
 if(nfSprite!==null)return nfSprite||null;
 nfSprite=false;
 try{
  if(typeof document==='undefined'||!document.createElement)return null;
  const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;
  const L=-46,T=-30,w=94,h=56;c.width=Math.ceil(w*NF.px);c.height=Math.ceil(h*NF.px);
  const g=c.getContext('2d');if(!g||!g.createLinearGradient)return null;
  g.setTransform(NF.px,0,0,NF.px,-L*NF.px,-T*NF.px);g.lineJoin='round';nfBody(g);
  nfSprite={c,L,T,w,h};
 }catch(e){nfSprite=false}
 return nfSprite||null;
}

// ---- la flotta parte quando il boss esplode
function nfLaunch(){
 const VW=pfViewW(),d=pf.p&&pf.p.difficulty||1,r=()=>Math.random();
 const ships=[];
 const near=NF.vicine+(d>=4?1:0);
 for(let i=0;i<near;i++)ships.push({
  near:true,x:-140-i*70,y:170+i*62+r()*30,vx:280+r()*60,vy:-20,ax:480+r()*100,ay:-60-r()*40,
  s:1.5+r()*.3,delay:.5+i*.42,t:0,smoke:i===1,trail:[],puffs:[],a:1,sound:false
 });
 for(let i=0;i<NF.lontane;i++)ships.push({
  near:false,x:VW*(.42+i*.17+r()*.05),y:505+r()*20,vx:0,vy:-60,ax:260+r()*80,ay:-90,
  s:.5+r()*.14,delay:.15+i*.38,t:0,smoke:false,trail:[],puffs:[],a:0,sound:false
 });
 pf.naviFuga={ships,t:0};
}

function nfUpdate(dt){
 const F=pf&&pf.naviFuga;if(!F)return;
 F.t+=dt;const VW=pfViewW();
 // nessun nemico a piedi o drone che scappa: restano solo le navi
 for(const e of pf.enemies)if(e.hp>0){e.hp=0;pfBurst(e.x,e.type==='drone'?e.y:e.y-24,'#ff7b4f',14,1)}
 for(const S of F.ships){
  if(F.t<S.delay)continue;
  S.t+=dt;
  if(!S.sound){S.sound=true;if(S.near){noise(1.3,.03,320);tone(70,1.4,'sawtooth',.014,240)}else noise(.8,.012,500)}
  if(!S.near&&S.t<.9){S.vy=-60-S.t*40;S.vx=S.t*30}// decollo quasi verticale
  else{S.vx+=S.ax*dt;S.vy+=S.ay*dt}
  S.x+=S.vx*dt;S.y+=S.vy*dt;
  if(!S.near)S.a=Math.min(1,S.a+dt*2.5);
  S.trail.push({x:S.x,y:S.y});if(S.trail.length>14)S.trail.shift();
  if(S.smoke&&Math.random()<dt*45)S.puffs.push({x:S.x-22*S.s,y:S.y+(Math.random()-.5)*6,r:3+Math.random()*4,life:1.1,max:1.1});
  for(const p of S.puffs){p.life-=dt;p.r+=dt*22;p.y-=dt*12}
  S.puffs=S.puffs.filter(p=>p.life>0);
  if(S.x>VW+260||S.y<-200)S.gone=true;
 }
 F.ships=F.ships.filter(S=>!S.gone||S.puffs.length);
 if(!F.ships.length)pf.naviFuga=null;
}

function nfDrawShip(S,cx,now){
 const sp=nfGetSprite();
 const x=cx+S.x,y=S.y,ang=Math.max(-.6,Math.min(.15,Math.atan2(S.vy,Math.max(40,S.vx))))+Math.sin(now*3+S.x*.01)*.02;
 const sp2=Math.hypot(S.vx,S.vy),fl=Math.min(1.6,.6+sp2/700);
 ctx.save();ctx.globalAlpha=S.a*(S.near?1:.82);
 // scia luminosa dei motori
 if(S.trail.length>2){
  ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(let i=1;i<S.trail.length;i++){const a=S.trail[i-1],b=S.trail[i],k=i/S.trail.length;
   ctx.strokeStyle=`rgba(255,${90+k*80|0},${80+k*40|0},${.32*k})`;ctx.lineWidth=(S.near?7:3)*k*S.s;
   ctx.beginPath();ctx.moveTo(cx+a.x-20*S.s,a.y);ctx.lineTo(cx+b.x-20*S.s,b.y);ctx.stroke()}
  ctx.globalCompositeOperation='source-over';
 }
 ctx.translate(x,y);ctx.rotate(ang);ctx.scale(S.s,S.s);
 // fiamme dei due motori
 ctx.globalCompositeOperation='lighter';
 for(const py of [-4,4]){
  const len=(26+Math.random()*8)*fl,g=ctx.createLinearGradient(-21,0,-21-len,0);
  g.addColorStop(0,'rgba(255,240,220,.95)');g.addColorStop(.25,'rgba(255,120,110,.8)');g.addColorStop(1,'rgba(255,40,70,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-20,py-2.6);ctx.lineTo(-21-len,py);ctx.lineTo(-20,py+2.6);ctx.closePath();ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
 if(sp)ctx.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);
 else{// riserva senza immagine: sagoma piatta
  ctx.fillStyle='#b83a4c';ctx.beginPath();ctx.moveTo(29,0);ctx.lineTo(-7,-9);ctx.lineTo(-22,-7);ctx.lineTo(-17,0);ctx.lineTo(-22,7);ctx.lineTo(-7,9);ctx.closePath();ctx.fill();
 }
 ctx.restore();
 if(typeof gLight==='function')gLight(x-20*S.s,y,(S.near?90:40)*S.s,'#ff5268',.55*S.a);
}

function nfDraw(now){
 const F=pf&&pf.naviFuga;if(!F||pf.under)return;
 const cx=pf.cam.x;
 // prima le navi lontane, poi quelle vicine
 for(const pass of [false,true])for(const S of F.ships){
  if(S.near!==pass)continue;
  for(const p of S.puffs){const k=p.life/p.max;ctx.fillStyle=`rgba(46,40,42,${.3*k})`;ctx.beginPath();ctx.arc(cx+p.x,p.y,p.r,0,6.28);ctx.fill()}
  if(F.t>=S.delay&&!S.gone)nfDrawShip(S,cx,now);
 }
}

// Al posto dei cinque soldati che ripiegano parte la flotta.
pfFreeColony=function(){
 const spawn=pfSpawnEnemy;
 pfSpawnEnemy=function(){};
 try{nfOrig.pfFreeColony()}finally{pfSpawnEnemy=spawn}
 nfLaunch();
};
updatePlatform=function(dt){
 nfOrig.updatePlatform(dt);
 if(typeof state!=='undefined'&&state==='platform'&&pf&&pf.naviFuga)nfUpdate(dt);
};
pfDrawShipOnPad=function(now){
 nfOrig.pfDrawShipOnPad(now);
 if(pf&&pf.naviFuga)nfDraw(now);
};
