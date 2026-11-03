// Stellar Frontier — FASE A TERRA PIÙ LUNGA E GALLERIE SOTTERRANEE (novità 2026-11-03).
// 1) Il percorso a terra è più lungo: un tratto in più prima del robot e un nuovo passaggio col jetpack,
//    il "ponte di colonne" (colonne di roccia sopra il vuoto, si passa dall'una all'altra in volo).
// 2) Gallerie sotterranee alternative: lungo il percorso ci sono dei pozzi. Tenendo premuto GIÙ sul pozzo
//    il pilota scende in una galleria che corre sotto la superficie, con burroni, pareti, ribelli,
//    coloni prigionieri e depositi di rifornimenti. Nella galleria ci sono più uscite: saltando nel raggio
//    di risalita si torna in superficie, e al pozzo successivo si può riscendere. L'ultima uscita è obbligatoria.
// Si carica dopo battaglia.js, nave3d.js e ingresso.js, prima di godmode.js: avvolge le funzioni della fase
// a terra senza cambiare quelle originali. Niente ctx.filter né shadowBlur sul canvas principale (PC lenti).

const SOT={ceil:190,padY:560,liftW:46,hold:.35,fade:.32,extra:d=>2200+d*300};
const sotOrig={buildPlatformLevel,startPlatform,updatePlatform,drawPlatform,pfDrawProp,pfShotObstacle,pfLoseLife,pfFinish,pfStatus,pfUpdateHud};
function sotDown(){return!!(keys.KeyS||keys.ArrowDown)}

// ---------------------------------------------------------------- livello
buildPlatformLevel=function(p){
 const L=sotOrig.buildPlatformLevel(p),d=p.difficulty||1,rnd=pfRng(pfHash('sotterranei'+p.code));
 L.jetZones=L.jetZones||[];L.pillarZones=[];
 sotAppendTerrain(L,d,rnd);
 for(const f of d>=3?[.22,.8]:[.7])sotInsertPillars(L,L.arenaX*f,rnd,d);
 sotBuildUnderground(L,d,rnd);
 L.triggers.sort((a,b)=>a.x-b.x);
 return L;
};
// Sposta a destra tutto ciò che sta oltre X (per inserire un passaggio nuovo).
function sotShift(L,X,shift){
 const mv=o=>{if(o.x>=X){o.x+=shift;if(o.wallX!==undefined)o.wallX+=shift}};
 L.solids.forEach(mv);L.plats.forEach(mv);L.props.forEach(mv);L.triggers.forEach(mv);L.hostages.forEach(mv);
 for(const z of L.jetZones)if(z.wallX>=X){z.wallX+=shift;z.edgeX+=shift;z.landX+=shift}
 for(const z of L.pillarZones)if(z.x0>=X){z.x0+=shift;z.x1+=shift}
 L.arenaX+=shift;L.len+=shift;
}
// Un tratto di terreno in più prima dell'arena del robot, con le stesse regole del percorso originale.
function sotAppendTerrain(L,d,rnd){
 const arena=L.solids.find(s=>s.x===L.arenaX&&s.w>=3000),before=L.solids.filter(s=>s.x<L.arenaX).sort((a,b)=>a.x-b.x).pop();
 const start=L.arenaX,end=start+SOT.extra(d);let x=start,y=before?before.y:PF_FLOOR,lastPit=false;
 while(x<end){
  if(!lastPit&&rnd()<.26){x+=Math.round(92+rnd()*(28+d*5));lastPit=true;continue}
  const w=Math.round(340+rnd()*520);
  let ny=lastPit?y+(rnd()<.35?-28:Math.round(rnd()*2)*28):y+Math.round((rnd()*2-1)*3)*28;
  ny=pfClamp(ny,488,620);
  L.solids.push({x,w,y:ny});
  if(w>420&&rnd()<.6){const pw=Math.round(120+rnd()*90);L.plats.push({x:Math.round(x+60+rnd()*(w-pw-120)),y:ny-Math.round(90+rnd()*24),w:pw})}
  const r=rnd();if(r<.55)L.props.push({x:Math.round(x+50+rnd()*(w-100)),y:ny,kind:r<.22?'cassa':r<.4?'barricata':'bandiera'});
  x+=w;y=ny;lastPit=false;
 }
 if(arena)arena.x=x;
 L.len+=x-L.arenaX;L.arenaX=x;
 // un colono in più a metà del tratto nuovo
 const mid=(start+x)/2,s=L.solids.find(o=>!o.jet&&o.x+80<=mid&&mid<=o.x+o.w-80)||L.solids.find(o=>o.x>mid&&o.x<x&&o.w>220);
 if(s){const hx=Math.round(pfClamp(mid,s.x+80,s.x+s.w-80)),id=L.hostages.reduce((m,h)=>Math.max(m,h.id),0)+1;L.hostages.push({x:hx,y:s.y,state:'legato',t:0,id});L.props=L.props.filter(pr=>Math.abs(pr.x-hx)>60)}
 // ribelli lungo il tratto nuovo
 let tx=start+200;
 while(tx<x-250){
  const r=rnd(),plat=L.plats.find(o=>o.x+o.w/2>tx-60&&o.x<tx+520&&!L.triggers.some(t=>t.plat===o));
  if(d>=2&&r<.2)L.triggers.push({x:tx,type:'drone'});
  else if(plat&&r<.45)L.triggers.push({x:plat.x+plat.w/2,type:'cecchino',plat});
  else{L.triggers.push({x:tx,type:'soldato'});if(r>.82)L.triggers.push({x:tx+70,type:'soldato'})}
  tx+=Math.max(150,Math.round(280+rnd()*240-d*30));
 }
}
// Ponte di colonne: 3-4 colonne di roccia sempre più alte sopra il vuoto, troppo distanti per il solo salto.
function sotInsertPillars(L,target,rnd,d){
 const ss=L.solids.filter(s=>s.x<L.arenaX).sort((a,b)=>a.x-b.x);
 const busy=x=>L.jetZones.some(z=>x>z.wallX-500&&x<z.landX+300)||L.pillarZones.some(z=>x>z.x0-500&&x<z.x1+300);
 let i=ss.findIndex((s,k)=>k>0&&s.x>=Math.max(1800,target)&&!s.jet&&!busy(s.x)&&ss[k-1].x+ss[k-1].w>=s.x-2);
 if(i<0)i=ss.findIndex((s,k)=>k>0&&s.x>=Math.max(1800,target)&&!s.jet&&!busy(s.x));
 if(i<0)return;
 const s=ss[i],prev=ss[i-1],X=s.x,baseY=prev.x+prev.w>=X-2?prev.y:s.y,n=3+(d>=3?1:0);
 const rise=[110,175,215,150],cols=[];let x=X;
 for(let k=0;k<n;k++){
  x+=Math.round(250+rnd()*45);
  const w=Math.round(96+rnd()*36),top=Math.max(330,baseY-rise[k]-Math.round(rnd()*20));
  cols.push({x,w,y:top,jet:true,pillar:true});x+=w;
 }
 x+=Math.round(250+rnd()*40);
 const shift=x-X;
 sotShift(L,X,shift);
 L.solids.push(...cols);
 L.props.push({x:X-64,y:baseY,kind:'jet_su'});
 L.pillarZones.push({x0:X,x1:X+shift,baseY,tops:cols.map(c=>c.y)});
}
// Pozzo valido: su terreno pieno, lontano da passaggi col jetpack, ostaggi e muretti.
function sotPadOk(L,x,excl){
 if(excl.some(([a,b])=>x>a&&x<b))return null;
 const s=L.solids.find(o=>!o.jet&&o.x<L.arenaX&&o.x+70<=x&&x<=o.x+o.w-70);if(!s)return null;
 if(L.hostages.some(h=>Math.abs(h.x-x)<100))return null;
 if(L.props.some(pr=>(pr.kind==='muretto'||pr.kind==='jet_su'||pr.kind==='jet_giu')&&Math.abs(pr.x-x)<140))return null;
 if(L.plats.some(pl=>x>pl.x-10&&x<pl.x+pl.w+10))return null;
 return s;
}
function sotFindPad(L,from,to,excl){for(let x=Math.round(from);x<=to;x+=20){const s=sotPadOk(L,x,excl);if(s)return{x,s}}return null}
// Costruisce la galleria: per ogni tratto scelto, pozzi in superficie e una galleria parallela sotto.
function sotBuildUnderground(L,d,rnd){
 const U={solids:[],plats:[],props:[],triggers:[],hostages:[],sections:[],lifts:[],lamps:[],deco:[],caches:[],zones:[]};
 const excl=[[0,1900],[L.arenaX-900,1e9]];
 for(const z of L.jetZones)excl.push([z.wallX-360,z.landX+260]);
 for(const z of L.pillarZones)excl.push([z.x0-360,z.x1+260]);
 const nSec=d>=4?3:2,nShafts=d>=3?4:3,span=(L.arenaX-900-2000)/nSec;
 let nextId=L.hostages.reduce((m,h)=>Math.max(m,h.id),0)+1,from=2000;
 for(let k=0;U.sections.length<nSec&&k<nSec+3;k++){
  const shafts=[];let tries=0,x=Math.max(from,2000+span*U.sections.length*.85+rnd()*span*.15);
  if(x>L.arenaX-900-1800)break;
  while(shafts.length<nShafts&&tries<40){
   tries++;
   const pad=sotFindPad(L,x,x+900,excl);
   if(!pad){x+=900;if(x>L.arenaX-900)break;continue}
   shafts.push(pad.x);x=pad.x+Math.round(800+rnd()*240);
  }
  from=x;
  if(shafts.length<3)continue;
  const sec={x0:shafts[0],x1:shafts[shafts.length-1],shafts};U.sections.push(sec);from=sec.x1+1000;
  // in superficie: pozzi (tutti tranne l'ultimo) e la botola d'uscita
  shafts.forEach((sx,i)=>{const last=i===shafts.length-1;L.props=L.props.filter(pr=>Math.abs(pr.x-sx)>80);L.props.push({x:sx,y:sotPadOk(L,sx,[]).y,kind:last?'botola':'pozzo',sec:U.sections.length-1,last})});
  sotCarve(U,sec,d,rnd);
  // coloni prigionieri nella galleria: tanti quanti quelli in superficie sullo stesso tratto (almeno uno)
  const want=Math.max(1,L.hostages.filter(h=>h.x>=sec.x0&&h.x<=sec.x1).length);
  const spots=U.solids.filter(s=>!s.jet&&!s.wall&&!s.pad&&s.w>=220&&s.x>sec.x0&&s.x+s.w<sec.x1).sort((a,b)=>b.w-a.w);
  for(let i=0;i<want;i++){
   const s=spots[i%Math.max(1,spots.length)]||U.solids.find(o=>o.pad&&o.x>sec.x0);if(!s)break;
   const hx=Math.round(s.x+s.w*(i<spots.length?.5:.3));
   if(U.hostages.some(h=>Math.abs(h.x-hx)<60))continue;
   U.hostages.push({x:hx,y:s.y,state:'legato',t:0,id:nextId++,sot:true});
  }
 }
 if(!U.sections.length){L.sot=null;return}
 // ribelli della galleria
 for(const sec of U.sections){
  let tx=sec.x0+380,covers=0;
  while(tx<sec.x1-120){
   const r=rnd(),seg=U.solids.find(s=>!s.jet&&!s.wall&&tx>=s.x+60&&tx<=s.x+s.w-60),plat=U.plats.find(o=>o.x+o.w/2>tx-60&&o.x<tx+420&&!U.triggers.some(t=>t.plat===o));
   if(seg&&!seg.pad&&covers<1+(d>=3?1:0)&&seg.w>=300&&r<.3&&!U.hostages.some(h=>Math.abs(h.x-tx)<150)){covers++;U.props.push({x:tx,y:seg.y,kind:'muretto'});U.triggers.push({x:tx,type:'riparo',wallX:tx,y:seg.y})}
   else if(plat&&r<.55)U.triggers.push({x:plat.x+plat.w/2,type:'cecchino',plat});
   else{U.triggers.push({x:tx,type:'soldato'});if(d>=3&&r>.85)U.triggers.push({x:tx+60,type:'soldato'})}
   tx+=Math.max(220,Math.round(380+rnd()*220-d*25));
  }
 }
 U.triggers.sort((a,b)=>a.x-b.x);
 L.sot=U;
}
// Scava una sezione di galleria: piazzole sotto ogni pozzo, in mezzo terreno irregolare, un burrone e una parete.
function sotCarve(U,sec,d,rnd){
 const P=SOT.padY,sh=sec.shafts,push=o=>{U.solids.push(o);return o};
 // parete d'ingresso a sinistra e di fondo a destra (alte fino al soffitto)
 push({x:sec.x0-680,w:420,y:SOT.ceil,wall:true});
 push({x:sec.x1+200,w:520,y:SOT.ceil,wall:true});
 for(let i=0;i<sh.length;i++){
  const a=sh[i],first=i===0,last=i===sh.length-1;
  push({x:first?a-260:a-160,w:first?420:last?360:320,y:P,pad:true});
  U.lifts.push({x:a,last,sec:U.sections.length-1});
  if(last)break;
  const from=a+160,to=sh[i+1]-160,kind=i===0?'normale':i===1?(rnd()<.5?'abisso':'parete'):(rnd()<.5?'parete':'abisso');
  sotFill(U,from,to,kind,d,rnd);
 }
 for(let x=sec.x0-200;x<sec.x1+200;x+=Math.round(300+rnd()*140))if(!sh.some(s=>Math.abs(s-x)<90))U.lamps.push({x,len:Math.round(14+rnd()*26),ph:rnd()*6.28});
 // depositi di rifornimenti
 const segs=U.solids.filter(s=>!s.jet&&!s.wall&&!s.pad&&s.w>=200&&s.x>sec.x0&&s.x+s.w<sec.x1);
 for(let i=0;i<Math.min(2,segs.length);i++){const s=segs[Math.floor(rnd()*segs.length)],x=Math.round(s.x+s.w*(.2+rnd()*.15));if(U.caches.some(c=>Math.abs(c.x-x)<300))continue;U.caches.push({x,y:s.y,open:false})}
 // cristalli luminosi incastonati nel pavimento
 for(const s of U.solids)if(!s.wall&&s.x>=sec.x0-300&&s.x<sec.x1+200)for(let x=s.x+20;x<s.x+s.w-20;x+=Math.round(90+rnd()*160))if(rnd()<.45)U.deco.push({x,y:s.y,size:5+rnd()*7,a:(rnd()-.5)*.6});
}
function sotFill(U,a,b,kind,d,rnd){
 const P=SOT.padY,seg=(x,w,y,extra={})=>{if(w>8)U.solids.push({x:Math.round(x),w:Math.round(w),y,...extra})};
 const len=b-a;
 if(kind==='abisso'&&len>=600){
  const gap=Math.round(Math.min(len-300,380+rnd()*60)),w1=Math.round((len-gap)/2);
  seg(a,w1,P);seg(a+w1+gap,b-(a+w1+gap),P);
  U.props.push({x:a+w1-46,y:P,kind:'jet_giu'});
  U.zones.push({kind:'abisso',x:a+w1,x2:a+w1+gap});
  return;
 }
 if(kind==='parete'&&len>=560){
  const w1=Math.round(130+rnd()*60),cw=Math.round(260+rnd()*60),top=P-Math.round(200+rnd()*25);
  seg(a,w1,P);seg(a+w1,cw,top,{jet:true});seg(a+w1+cw,b-(a+w1+cw),P);
  U.props.push({x:a+w1-64,y:P,kind:'jet_su'});
  U.zones.push({kind:'parete',x:a+w1,x2:a+w1+cw});
  return;
 }
 // terreno irregolare con qualche fossa da saltare
 let x=a,y=P,lastPit=false;
 while(b-x>420){
  if(!lastPit&&x>a&&rnd()<.3){x+=Math.round(95+rnd()*28);lastPit=true;continue}
  const w=Math.round(200+rnd()*200);
  let ny=lastPit?y+(rnd()<.35?-28:Math.round(rnd()*2)*28):y+Math.round((rnd()*2-1)*3)*28;
  ny=pfClamp(ny,P-84,P+56);
  seg(x,w,ny);
  if(w>300&&rnd()<.45){const pw=Math.round(110+rnd()*70);U.plats.push({x:Math.round(x+40+rnd()*(w-pw-80)),y:ny-Math.round(92+rnd()*20),w:pw})}
  x+=w;y=ny;lastPit=false;
 }
 const ly=lastPit?Math.max(y-28,P):P+Math.round((rnd()*2-1))*28;
 seg(x,b-x,ly);
}

// ---------------------------------------------------------------- avvio e cambio di livello
startPlatform=function(){
 sotOrig.startPlatform();
 if(!pf)return;
 pf.under=false;pf.sotT=null;pf.sotHints={};
 pf.sup={solids:pf.solids,plats:pf.plats,props:pf.props,triggers:pf.triggers,hostages:pf.hostages,next:0};
 if(pf.sot)pf.sot.next=0;
};
function sotHint(key,text,ms=2800){if(!pf.sotHints)pf.sotHints={};if(pf.sotHints[key])return;pf.sotHints[key]=true;pfStatus(text,ms)}
function sotStart(toUnder,x){
 if(pf.sotT)return;
 pf.sotT={t:0,to:toUnder,x,done:false};
 const P=pf.pilot;P.vx=0;P.jetOn=false;P.sotHold=0;
 if(toUnder){noise(.4,.03,600);tone(220,.4,'sine',.03,110)}else{noise(.3,.02,2400);tone(330,.45,'sine',.03,880)}
}
function sotSwitch(toUnder,x){
 const from=pf.under?pf.sot:pf.sup;from.next=pf.nextTrigger;
 pf.under=toUnder;
 // un colono liberato nella galleria sposta il punto di controllo sotto terra: in superficie si riparte dal pozzo
 if(toUnder)pf.sotCp=pf.checkpoint;else if(pf.checkpoint!==pf.sotCp)pf.checkpoint=x;
 const L=toUnder?pf.sot:pf.sup;
 pf.solids=L.solids;pf.plats=L.plats;pf.props=L.props;pf.triggers=L.triggers;pf.hostages=L.hostages;
 // i ribelli già superati su questo livello non ricompaiono: si parte dal bordo destro dello schermo
 let n=L.next||0;const near=pf.cam.x+pfViewW()*.6;while(n<L.triggers.length&&L.triggers[n].x<near)n++;
 pf.nextTrigger=n;
 pf.enemies=[];pf.shots=[];pf.grenades=[];pf.pickups=[];pf.waves=[];pf.missiles=[];pf.fx=[];pf.spawnTimer=Math.max(pf.spawnTimer||0,3);
 const P=pf.pilot;
 if(toUnder){Object.assign(P,{x,y:SOT.ceil+P.h+20,vx:0,vy:120,ground:false,onPlat:false,jetOn:false,lastGround:x,inv:Math.max(P.inv,1)});pfBanner('GALLERIE SOTTERRANEE','SALTA NEI RAGGI DI RISALITA PER TORNARE IN SUPERFICIE',3)}
 else{const g=pfGroundAt(x)??PF_FLOOR;Object.assign(P,{x,y:g,vx:60,vy:-620,ground:false,onPlat:false,jetOn:false,lastGround:x,inv:Math.max(P.inv,1)});for(let i=0;i<14;i++)pfBurst(x+(Math.random()-.5)*30,g-4,'#c7d6e2',1,1,true,{vy:-120});pfStatus('DI NUOVO IN SUPERFICIE',1800)}
}
function sotUpdateTransition(dt){
 const T=pf.sotT;T.t+=dt;
 if(!T.done&&T.t>=SOT.fade){T.done=true;sotSwitch(T.to,T.x)}
 if(T.t>=SOT.fade*2+.08)pf.sotT=null;
}

// ---------------------------------------------------------------- aggiornamento
updatePlatform=function(dt){
 if(!pf||!pf.sot)return sotOrig.updatePlatform(dt);
 if(pf.sotT){pf.t+=dt;if(pf.banner){pf.banner.t+=dt;if(pf.banner.t>pf.banner.life)pf.banner=null}sotUpdateTransition(dt);if(state==='platform')pfUpdateHud();return}
 sotOrig.updatePlatform(dt);
 if(state!=='platform'||!pf||pf.phase!=='missione')return;
 const P=pf.pilot;if(!P.visible||P.hp<=0)return;
 if(pf.under)sotUpdateUnder(P,dt);else sotUpdateSurface(P,dt);
 sotPillarHints(P);
};
function sotUpdateSurface(P,dt){
 let on=null;
 for(const pr of pf.props){
  if(pr.kind!=='pozzo')continue;
  if(P.x>pr.x-480&&P.x<pr.x)sotHint('pozzo'+pr.x,'INGRESSO ALLE GALLERIE · TIENI PREMUTO GIÙ SUL POZZO PER SCENDERE',3200);
  if(Math.abs(P.x-pr.x)<30&&P.ground&&!P.onPlat&&Math.abs(P.y-pr.y)<4)on=pr;
 }
 if(on&&sotDown()){P.sotHold=(P.sotHold||0)+dt;P.sotX=on.x;if(P.sotHold>=SOT.hold)sotStart(true,on.x)}else P.sotHold=0;
}
function sotUpdateUnder(P,dt){
 const S=pf.sot,top=P.y-P.h;
 let lift=null;for(const l of S.lifts)if(Math.abs(P.x-l.x)<SOT.liftW/2+6){lift=l;break}
 if(lift){
  sotHint('lift'+lift.x,lift.last?'FINE DELLA GALLERIA · SALTA NEL RAGGIO PER RISALIRE':'USCITA · SALTA NEL RAGGIO PER TORNARE IN SUPERFICIE',2600);
  // il raggio di risalita porta su chi ci salta dentro
  if(!P.ground&&P.vy<0){P.vy=Math.min(P.vy,-560);P.x+=(lift.x-P.x)*Math.min(1,dt*8);if(Math.random()<dt*30)pfBurst(P.x+(Math.random()-.5)*20,P.y,'#9ff2ff',1,.4,false,{vy:-200})}
  if(top<SOT.ceil+8){sotStart(false,lift.x);return}
 }
 // soffitto: la testa non passa la roccia
 if(top<SOT.ceil+4&&!lift){P.y=SOT.ceil+4+P.h;if(P.vy<0)P.vy=0}
 // chi compare sopra le pareti di fondo (dentro la roccia) viene tolto; ribelli in volo e droni restano sotto la volta
 pf.enemies=pf.enemies.filter(e=>e.jet||e.type==='drone'||e.y>SOT.ceil+80);
 for(const e of pf.enemies)if(e.jet||e.type==='drone'){const lim=SOT.ceil+(e.type==='drone'?40:70);if(e.y<lim){e.y=lim;if(e.vy<0)e.vy=0}}
 // depositi di rifornimenti
 for(const c of S.caches){
  if(c.open||Math.abs(P.x-c.x)>26||Math.abs(P.y-c.y)>40)continue;
  c.open=true;pfDrop(c.x-10,c.y-30,P.hp<70?'salute':'scudo');pfDrop(c.x+12,c.y-30,'granate');
  pfText(c.x,c.y-60,'RIFORNIMENTI','#8df1ad');sfx('ui');tone(660,.12,'sine',.025);tone(990,.18,'sine',.02,0,.1);
 }
 for(const z of S.zones){
  if(P.x>z.x-420&&P.x<z.x)sotHint('z'+z.x,z.kind==='abisso'?'BURRONE · PLANA COL JETPACK (SALTO + GIÙ)':'PARETE ROCCIOSA · USA IL JETPACK PER SALIRE',2800);
 }
}
function sotPillarHints(P){
 if(!pf.pillarZones)return;
 for(const z of pf.pillarZones)if(!pf.under&&P.x>z.x0-460&&P.x<z.x0)sotHint('col'+z.x0,'PONTE DI COLONNE · VOLA COL JETPACK DA UNA COLONNA ALL’ALTRA',3200);
}

// ---------------------------------------------------------------- regole di gioco toccate dalle gallerie
// La volta della galleria ferma i colpi.
pfShotObstacle=function(b){
 const hit=sotOrig.pfShotObstacle(b);
 if(!pf||!pf.under||b.y>=SOT.ceil||b.py<SOT.ceil)return hit;
 const t=(b.py-SOT.ceil)/(b.py-b.y),x=b.px+(b.x-b.px)*t;
 if(pf.sot.lifts.some(l=>Math.abs(x-l.x)<SOT.liftW/2))return hit;
 if(hit&&Math.hypot(hit.x-b.px,hit.y-b.py)<=Math.hypot(x-b.px,SOT.ceil-b.py))return hit;
 return{x,y:SOT.ceil};
};
// Se il pilota cade nella galleria, quello di riserva arriva in superficie.
pfLoseLife=function(){
 if(pf&&pf.under){
  // risale dal pozzo più vicino alle sue spalle (sempre su terreno solido)
  const x=pf.pilot.x,sec=pf.sot.sections.find(s=>x>=s.x0-700&&x<=s.x1+800)||pf.sot.sections[0],sx=sec.shafts.filter(v=>v<=x+40).pop()??sec.x0;
  pf.sotT=null;sotSwitch(false,sx);
 }
 sotOrig.pfLoseLife();
};
// Il conteggio dei coloni resta quello della superficie: la galleria è un percorso alternativo.
function sotHostTotal(){return pf.sup?pf.sup.hostages.length:pf.hostages.length}
pfFinish=function(win){
 if(pf&&pf.sup){if(pf.under){pf.under=false;pf.solids=pf.sup.solids;pf.plats=pf.sup.plats;pf.props=pf.sup.props;pf.triggers=pf.sup.triggers}pf.hostages=pf.sup.hostages;pf.rescued=Math.min(pf.rescued,pf.hostages.length)}
 sotOrig.pfFinish(win);
};
pfStatus=function(text,ms){
 if(pf&&pf.sup&&typeof text==='string'&&text.startsWith('COLONO SALVATO · ')){const n=sotHostTotal();text='COLONO SALVATO · '+Math.min(pf.rescued,n)+'/'+n}
 return sotOrig.pfStatus(text,ms);
};
pfUpdateHud=function(){
 sotOrig.pfUpdateHud();
 if(pf&&pf.sup){const n=sotHostTotal(),el=$('pfRescued');if(el)el.textContent=Math.min(pf.rescued,n)+'/'+n}
};

// ---------------------------------------------------------------- disegno: pozzi, botole, cartelli, depositi
function sotArrow(x,y,s,up){ctx.beginPath();const k=up?-1:1;ctx.moveTo(x,y+k*s);ctx.lineTo(x+s*.9,y);ctx.lineTo(x+s*.35,y);ctx.lineTo(x+s*.35,y-k*s);ctx.lineTo(x-s*.35,y-k*s);ctx.lineTo(x-s*.35,y);ctx.lineTo(x-s*.9,y);ctx.closePath();ctx.fill()}
function sotSign(x,y,label,up,col,now){
 const blink=.6+.4*Math.sin(now*5);
 ctx.fillStyle='#22313f';ctx.fillRect(x-2,y-70,4,70);
 ctx.fillStyle='rgba(6,18,30,.92)';ctx.strokeStyle=col;ctx.globalAlpha=1;ctx.lineWidth=1.5;ctx.fillRect(x-38,y-114,76,46);ctx.strokeRect(x-38,y-114,76,46);
 ctx.fillStyle=col;ctx.font='700 10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y-100);
 ctx.globalAlpha=.55+blink*.45;sotArrow(x,y-84,10,up);ctx.globalAlpha=1;
}
function sotDrawHatch(pr,now,open){
 const P=pf.pilot,near=open&&Math.abs(P.x-pr.x)<120&&!pf.under;
 ctx.save();ctx.translate(pr.x,pr.y);
 // anello d'acciaio a filo del terreno con strisce di pericolo
 ctx.fillStyle='#10161d';ctx.beginPath();ctx.ellipse(0,1,34,7,0,0,6.28);ctx.fill();
 ctx.fillStyle=open?'#020406':'#2b3846';ctx.beginPath();ctx.ellipse(0,1,26,5,0,0,6.28);ctx.fill();
 ctx.strokeStyle='#ffb348';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.lineDashOffset=open?-now*14:0;ctx.beginPath();ctx.ellipse(0,1,31,6,0,0,6.28);ctx.stroke();ctx.setLineDash([]);
 if(open){
  // luce che sale dal pozzo
  ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(0,0,0,-90);g.addColorStop(0,`rgba(255,190,90,${near?.4:.22})`);g.addColorStop(1,'rgba(255,190,90,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(24,0);ctx.lineTo(34,-90);ctx.lineTo(-34,-90);ctx.closePath();ctx.fill();ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=Math.floor(now*3)%2?'#ffb348':'#5a3d16';ctx.fillRect(-36,-3,5,4);ctx.fillRect(31,-3,5,4);
 }else{ctx.strokeStyle='#5c7184';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-20,1);ctx.lineTo(20,1);ctx.stroke()}
 ctx.restore();
 if(open)sotSign(pr.x-58,pr.y,'GALLERIE',false,'#ffb348',now);
 // barra di discesa mentre si tiene premuto giù
 if(open&&P.sotHold>0&&P.sotX===pr.x){const k=Math.min(1,P.sotHold/SOT.hold);ctx.fillStyle='rgba(4,12,20,.8)';ctx.fillRect(pr.x-22,pr.y-80,44,6);ctx.fillStyle='#ffb348';ctx.fillRect(pr.x-21,pr.y-79,42*k,4)}
}
function sotDrawCache(c,now){
 ctx.save();ctx.translate(c.x,c.y);
 ctx.fillStyle=c.open?'#1a2430':'#1e3a3a';ctx.strokeStyle=c.open?'#3d5060':'#8df1ad';ctx.lineWidth=1.3;
 ctx.fillRect(-18,-24,36,24);ctx.strokeRect(-18,-24,36,24);
 if(c.open){ctx.fillStyle='#24323f';ctx.save();ctx.translate(-18,-24);ctx.rotate(-.9);ctx.fillRect(0,-4,36,4);ctx.restore()}
 else{ctx.fillRect(-20,-28,40,5);ctx.strokeRect(-20,-28,40,5);ctx.fillStyle=`rgba(141,241,173,${.6+.4*Math.sin(now*4+c.x)})`;ctx.fillRect(-3,-18,6,12);ctx.fillRect(-8,-14,16,4)}
 ctx.restore();
}
pfDrawProp=function(pr,now){
 if(pr.kind==='pozzo')return sotDrawHatch(pr,now,true);
 if(pr.kind==='botola')return sotDrawHatch(pr,now,false);
 return sotOrig.pfDrawProp(pr,now);
};

// ---------------------------------------------------------------- disegno della galleria
let sotGfx=null;
// Sfondo e volta della galleria disegnati una sola volta in canvas fuori schermo (poi solo drawImage).
function sotReady(){
 const ok=typeof gReady==='function'&&gReady();
 if(sotGfx&&sotGfx.pf===pf&&sotGfx.gfx===gfx)return sotGfx;
 sotGfx={pf,gfx:ok?gfx:null,back:null,ceil:null};
 if(!ok)return sotGfx;
 try{sotGfx.back=sotMakeBack();sotGfx.ceil=sotMakeCeil()}catch(err){console.warn('gallerie: grafica semplice',err);sotGfx.back=sotGfx.ceil=null}
 return sotGfx;
}
const SOT_TILE=1024,SOT_CTILE=768;
function sotMakeBack(){
 const m=gMat(),R=1,cv=gCanvas(SOT_TILE*R,PF_VH*R);if(!cv)return null;const g=cv.g;
 g.fillStyle=gPattern(g);g.fillRect(0,0,SOT_TILE,PF_VH);
 let gr=g.createLinearGradient(0,0,0,PF_VH);gr.addColorStop(0,'rgba(2,4,8,.9)');gr.addColorStop(.45,'rgba(4,6,10,.72)');gr.addColorStop(1,'rgba(2,3,6,.92)');g.fillStyle=gr;g.fillRect(0,0,SOT_TILE,PF_VH);
 const rnd=pfRng(pfHash('grotta'+pf.p.code)),dark=gRgb(gMix(m.dark,[0,0,0],.55));
 // colonne e stalattiti lontane (ripetute ai bordi per un motivo senza cuciture)
 for(let i=0;i<9;i++){
  const x=rnd()*SOT_TILE,w=40+rnd()*90,top=rnd()*140,bot=PF_VH-rnd()*120;
  for(const ox of [-SOT_TILE,0,SOT_TILE]){
   g.fillStyle=dark;g.beginPath();g.moveTo(ox+x-w/2,0);g.lineTo(ox+x+w/2,0);g.lineTo(ox+x+w*.18,top+200);g.lineTo(ox+x+w*.3,bot-120);g.lineTo(ox+x+w*.6,PF_VH);g.lineTo(ox+x-w*.6,PF_VH);g.lineTo(ox+x-w*.3,bot-120);g.lineTo(ox+x-w*.18,top+200);g.closePath();g.globalAlpha=.55;g.fill();g.globalAlpha=1;
  }
 }
 // vene di cristallo che brillano debolmente
 const col=m.rim;g.strokeStyle=col;g.lineWidth=1.2;
 for(let i=0;i<14;i++){let x=rnd()*SOT_TILE,y=SOT.ceil+60+rnd()*360;g.globalAlpha=.12+rnd()*.18;g.beginPath();g.moveTo(x,y);for(let j=0;j<5;j++){x+=(rnd()-.5)*40;y+=(rnd()-.5)*30;g.lineTo(x,y)}g.stroke()}
 g.globalAlpha=1;
 return cv.c;
}
function sotCeilEdge(x){const u=((x%SOT_CTILE)+SOT_CTILE)%SOT_CTILE/SOT_CTILE;return SOT.ceil+8+gFbm1p(u,12,3,71)*18+(gHash(Math.floor(u*48)+5)>.72?gHash(Math.floor(u*48)+9)*46:0)}
function sotMakeCeil(){
 const m=gMat(),R=Math.min(2,gfx.res),H2=SOT.ceil+80,cv=gCanvas(SOT_CTILE*R,H2*R);if(!cv)return null;const g=cv.g;g.scale(R,R);
 // profilo inferiore: bordo irregolare con stalattiti appuntite
 g.beginPath();g.moveTo(0,0);g.lineTo(SOT_CTILE,0);
 for(let x=SOT_CTILE;x>=0;x-=4){const b=Math.floor(x/16),tip=gHash(b*31+7)>.7?gHash(b*31+11)*44*(1-Math.abs((x%16)-8)/8):0;g.lineTo(x,SOT.ceil+8+gFbm1p(x/SOT_CTILE,12,3,71)*16+tip)}
 g.closePath();g.save();g.clip();
 g.fillStyle=gPattern(g);g.fillRect(0,0,SOT_CTILE,H2);
 let gr=g.createLinearGradient(0,0,0,H2);gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(.7,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=gr;g.fillRect(0,0,SOT_CTILE,H2);
 g.restore();
 g.strokeStyle=m.rim;g.globalAlpha=.3;g.lineWidth=1;g.beginPath();
 for(let x=0;x<=SOT_CTILE;x+=4){const b=Math.floor(x/16),tip=gHash(b*31+7)>.7?gHash(b*31+11)*44*(1-Math.abs((x%16)-8)/8):0,y=SOT.ceil+8+gFbm1p(x/SOT_CTILE,12,3,71)*16+tip;x?g.lineTo(x,y):g.moveTo(x,y)}
 g.stroke();g.globalAlpha=1;
 return{c:cv.c,w:SOT_CTILE,h:H2};
}
function sotDrawBack(cx,VW,G){
 ctx.fillStyle='#05070b';ctx.fillRect(0,0,VW,PF_VH);
 if(!G.back)return;
 const off=((cx*.35)%SOT_TILE+SOT_TILE)%SOT_TILE;
 for(let x=-off;x<VW;x+=SOT_TILE)ctx.drawImage(G.back,x,0,SOT_TILE,PF_VH);
}
function sotDrawCeiling(cx,VW,G,now){
 const holes=pf.sot.lifts.filter(l=>l.x>cx-120&&l.x<cx+VW+120).map(l=>l.x);
 ctx.save();
 ctx.beginPath();let x=cx-20;
 for(const h of holes){if(h-SOT.liftW/2>x)ctx.rect(x,0,h-SOT.liftW/2-x,SOT.ceil+80);x=Math.max(x,h+SOT.liftW/2)}
 if(cx+VW+20>x)ctx.rect(x,0,cx+VW+20-x,SOT.ceil+80);ctx.clip();
 if(G.ceil){const t=G.ceil.w,start=Math.floor((cx-20)/t)*t;for(let tx=start;tx<cx+VW+20;tx+=t)ctx.drawImage(G.ceil.c,tx,0,t,G.ceil.h)}
 else{ctx.fillStyle='#14181f';ctx.fillRect(cx-20,0,VW+40,SOT.ceil+10)}
 ctx.restore();
 // pozzi nella volta: luce del giorno che filtra dall'alto
 for(const h of holes){
  ctx.fillStyle='#0a1018';ctx.fillRect(h-SOT.liftW/2,0,SOT.liftW,SOT.ceil+14);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,0,0,SOT.ceil+20);g.addColorStop(0,'rgba(230,245,255,.55)');g.addColorStop(1,'rgba(140,220,255,.12)');ctx.fillStyle=g;ctx.fillRect(h-SOT.liftW/2+6,0,SOT.liftW-12,SOT.ceil+20);
  ctx.restore();
  ctx.fillStyle='#3a4656';ctx.fillRect(h-SOT.liftW/2-6,SOT.ceil+8,8,10);ctx.fillRect(h+SOT.liftW/2-2,SOT.ceil+8,8,10);
 }
}
// Raggio di risalita: colonna di luce con frecce che salgono.
function sotDrawLift(l,now){
 const floor=pfGroundAt(l.x)??SOT.padY,top=SOT.ceil+10,w=SOT.liftW;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createLinearGradient(l.x-w/2,0,l.x+w/2,0);g.addColorStop(0,'rgba(81,230,255,0)');g.addColorStop(.5,'rgba(120,240,255,.22)');g.addColorStop(1,'rgba(81,230,255,0)');
 ctx.fillStyle=g;ctx.fillRect(l.x-w/2,top,w,floor-top);
 ctx.fillStyle='rgba(170,248,255,.35)';
 for(let i=0;i<5;i++){const k=((now*.7+i/5)%1),y=floor-12-k*(floor-top-30);ctx.globalAlpha=Math.sin(k*Math.PI)*.8;sotArrow(l.x,y,8,true)}
 ctx.globalAlpha=1;ctx.restore();
 // piastra a terra
 ctx.fillStyle='#1a2836';ctx.fillRect(l.x-30,floor-5,60,5);ctx.fillStyle='#51e6ff';ctx.fillRect(l.x-24,floor-4,48,2);
 sotSign(l.x+64,floor,'USCITA',true,l.last?'#ffb348':'#8ce9ec',now);
}
function sotDrawLamp(L,now){
 const y=sotCeilEdge(L.x)-6,ly=y+L.len,sw=Math.sin(now*1.3+L.ph)*2;
 ctx.strokeStyle='#2b3440';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(L.x,y);ctx.lineTo(L.x+sw,ly);ctx.stroke();
 ctx.fillStyle='#2b3440';ctx.beginPath();ctx.moveTo(L.x+sw-7,ly+6);ctx.lineTo(L.x+sw+7,ly+6);ctx.lineTo(L.x+sw+4,ly);ctx.lineTo(L.x+sw-4,ly);ctx.closePath();ctx.fill();
 ctx.fillStyle='#ffe2a8';ctx.beginPath();ctx.arc(L.x+sw,ly+7,3,0,6.28);ctx.fill();
}
function sotDrawCrystal(c,col){
 ctx.save();ctx.translate(c.x,c.y+1);ctx.rotate(c.a);ctx.fillStyle=col;ctx.globalAlpha=.85;
 for(const [dx,h,r] of [[-c.size*.5,c.size*1.5,-.35],[0,c.size*2.3,0],[c.size*.55,c.size*1.3,.4]]){ctx.save();ctx.translate(dx,0);ctx.rotate(r);ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(c.size*.3,-h*.7);ctx.lineTo(c.size*.26,0);ctx.lineTo(-c.size*.26,0);ctx.lineTo(-c.size*.3,-h*.7);ctx.closePath();ctx.fill();ctx.restore()}
 ctx.restore();
}
function sotApplyLighting(VW,now){
 const cx=pf.cam.x,P=pf.pilot;
 for(const L of pf.sot.lamps)if(L.x>cx-200&&L.x<cx+VW+200)gLight(L.x,sotCeilEdge(L.x)+L.len+10,190,'#ffc070',.5+.06*Math.sin(now*7+L.ph));
 for(const l of pf.sot.lifts)if(l.x>cx-200&&l.x<cx+VW+200){gLight(l.x,SOT.ceil+40,170,'#c8f4ff',.55);gLight(l.x,(pfGroundAt(l.x)??SOT.padY)-30,120,'#51e6ff',.4)}
 for(const c of pf.sot.deco)if(c.x>cx-60&&c.x<cx+VW+60)gLight(c.x,c.y-c.size,c.size*7,gMat().rim,.28);
 for(const c of pf.sot.caches)if(!c.open&&c.x>cx-60&&c.x<cx+VW+60)gLight(c.x,c.y-14,70,'#8df1ad',.45);
 if(P.visible)gLight(P.x+P.face*60,P.y-40,230,'#d8f2ff',.2);
 ctx.save();ctx.globalCompositeOperation='multiply';
 const gr=ctx.createLinearGradient(0,0,0,PF_VH);gr.addColorStop(0,'#666d7c');gr.addColorStop(.6,'#7a8190');gr.addColorStop(1,'#3a3f4a');ctx.fillStyle=gr;ctx.fillRect(cx-20,0,VW+40,PF_VH+40);
 ctx.globalCompositeOperation='lighter';
 for(const L of gLights){if(L.x<cx-L.r||L.x>cx+VW+L.r||L.a<=0)continue;ctx.globalAlpha=Math.min(1,L.a);ctx.drawImage(gTinted(L.color),L.x-L.r,L.y-L.r,L.r*2,L.r*2)}
 ctx.restore();
}
function sotDrawUnder(){
 const s=pfScale(),VW=pfViewW(),cx=pf.cam.x,now=performance.now()/1000,G=sotReady(),fancy=!!G.gfx,S=pf.sot,P=pf.pilot;
 if(fancy)gLights=[];
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#03050a';ctx.fillRect(0,0,W,H);
 ctx.save();
 if(pf.cam.shake>0){const k=pf.cam.shake;ctx.translate((Math.random()-.5)*k*16,(Math.random()-.5)*k*12)}
 ctx.scale(s,s);
 sotDrawBack(cx,VW,G);
 ctx.save();ctx.translate(-cx,0);
 for(const l of S.lifts)if(pfOnScreen(l.x,120))sotDrawLift(l,now);
 for(const pr of pf.props)if(pfOnScreen(pr.x,80)){if(fancy)gShadow(pr.x,pr.y,26,.3);pfDrawProp(pr,now)}
 for(const c of S.caches)if(pfOnScreen(c.x,40))sotDrawCache(c,now);
 for(const sd of pf.solids)if(sd.x<cx+VW+20&&sd.x+sd.w>cx-20){if(fancy)gDrawSolid(sd,now);else pfDrawSolid(sd,pf.p)}
 for(const pl of pf.plats)if(pl.x<cx+VW+30&&pl.x+pl.w>cx-30){if(fancy)gDrawPlatform(pl,now);else pfDrawPlatformBeam(pl,now)}
 const col=fancy?gMat().rim:'#8ce9ec';for(const c of S.deco)if(pfOnScreen(c.x,30))sotDrawCrystal(c,col);
 for(const h of pf.hostages)if(h.state!=='salvo'&&pfOnScreen(h.x,60))(fancy?gColonist:pfDrawColonist)(h,now);
 for(const k of pf.pickups)pfDrawPickup(k,now);
 for(const e of pf.enemies)if(pfOnScreen(e.x,60))(fancy?gEnemy:pfDrawEnemy)(e,now);
 if(P.visible){ctx.save();if(P.inv>0&&Math.floor(now*18)%2)ctx.globalAlpha=.4;(fancy?gTrooper:pfDrawTrooper)(P,PF_PILOT,now);ctx.restore();pfDrawJetpack(P,now);if(P.barrier)pfDrawBarrier(P,now)}
 for(const g of pf.grenades)pfDrawGrenade(g);
 sotDrawCeiling(cx,VW,G,now);
 for(const L of S.lamps)if(pfOnScreen(L.x,40))sotDrawLamp(L,now);
 if(fancy){gCollectLights(now);sotApplyLighting(VW,now)}
 for(const b of pf.shots)drawBullet(b);
 for(const f of pf.fx)drawParticle(f);
 ctx.font='600 13px "Chakra Petch",sans-serif';ctx.textAlign='center';
 for(const t of pf.texts){ctx.globalAlpha=Math.max(0,1-t.t/1.6);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y)}ctx.globalAlpha=1;
 ctx.restore();
 // abisso: buio che sale dal fondo, con il bagliore del pianeta (lava, mare...)
 const fog=ctx.createLinearGradient(0,600,0,PF_VH);fog.addColorStop(0,'rgba(0,0,0,0)');fog.addColorStop(1,pf.theme&&pf.theme.id==='lava'?'rgba(120,30,6,.9)':'rgba(0,0,0,.92)');ctx.fillStyle=fog;ctx.fillRect(0,600,VW,PF_VH-600);
 ctx.restore();
 drawVignette();
 if(pf.flash>0){ctx.fillStyle=`rgba(255,45,60,${pf.flash*.5})`;ctx.fillRect(0,0,W,H)}
 pfDrawBanner();
 const ch=$('pfCrosshair');if(ch&&ch.style){ch.style.left=mouse.x+'px';ch.style.top=mouse.y+'px'}
 if(fancy){const dt=Math.min(.05,now-(gfx.last||now));gfx.last=now;for(const f of gFlashes)f.life-=dt;gFlashes=gFlashes.filter(f=>f.life>0)}
}
drawPlatform=function(){
 if(pf&&pf.under&&pf.sot)sotDrawUnder();else sotOrig.drawPlatform();
 // dissolvenza nera quando si scende o si risale
 if(pf&&pf.sotT){const T=pf.sotT,k=T.t<SOT.fade?T.t/SOT.fade:Math.max(0,1-(T.t-SOT.fade)/(SOT.fade+.08));ctx.fillStyle=`rgba(0,0,0,${Math.min(1,k)})`;ctx.fillRect(0,0,W,H)}
};
