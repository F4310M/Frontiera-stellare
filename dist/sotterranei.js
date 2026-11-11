// Stellar Frontier — FASE A TERRA PIÙ LUNGA E GALLERIE SOTTERRANEE (novità 2026-11-03).
// 1) Il percorso a terra è più lungo: un tratto in più prima del robot e un nuovo passaggio col jetpack,
//    il "ponte di colonne" (colonne di roccia sopra il vuoto, si passa dall'una all'altra in volo).
// 2) Gallerie sotterranee alternative: lungo il percorso ci sono dei pozzi. Tenendo premuto GIÙ sul pozzo
//    il pilota scende in una galleria che corre sotto la superficie, con burroni, pareti, ribelli,
//    coloni prigionieri e depositi di rifornimenti. Nella galleria ci sono più uscite: saltando nel raggio
//    di risalita si torna in superficie, e al pozzo successivo si può riscendere. L'ultima uscita è obbligatoria.
// Si carica dopo battaglia.js, nave3d.js e ingresso.js, prima di godmode.js: avvolge le funzioni della fase
// a terra senza cambiare quelle originali. Niente ctx.filter né shadowBlur sul canvas principale (PC lenti).

const SOT={ceil:190,padY:560,liftW:46,fade:.32,extra:d=>2200+d*300,gap:[650,950],fallIn:42};
const sotOrig={buildPlatformLevel,startPlatform,updatePlatform,drawPlatform,pfDrawProp,pfShotObstacle,pfLoseLife,pfFinish,pfStatus,pfUpdateHud,pfFell,pfSpawnEnemy,pfUpdateEnemies,pfPeriodicSpawn};

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
// ---------------------------------------------------------------- sottosuolo lungo tutto il livello (2026-11-11)
// CRATERI lungo tutto il percorso: ci si lascia cadere dentro per scendere; da sotto si risale dallo stesso
// cratere saltando nella scia luminosa che sale verso il buco (2026-11-11 pomeriggio: niente più raggi e botole).
// L'ultimo cratere, prima dell'arena del boss, è obbligatorio: la galleria finisce contro la roccia.
function sotBusy(x,excl){return excl.some(([a,b])=>x>a&&x<b)}
function sotHostNear(L,x,r){return L.hostages.some(h=>Math.abs(h.x-x)<r)}
function sotPropNear(L,x,r){return L.props.some(pr=>['muretto','jet_su','jet_giu','botola','cratere'].includes(pr.kind)&&Math.abs(pr.x-x)<r)}
// Uscita valida in superficie: terreno pieno (non le pareti da jetpack), lontano da coloni, muretti e altri passaggi.
function sotPadOk(L,x,excl){
 if(sotBusy(x,excl))return null;
 const s=L.solids.find(o=>!o.jet&&o.x<L.arenaX&&o.x+80<=x&&x<=o.x+o.w-80);if(!s)return null;
 if(sotHostNear(L,x,110)||sotPropNear(L,x,150))return null;
 if(L.triggers.some(t=>t.type==='riparo'&&Math.abs(t.x-x)<150))return null;
 return s;
}
function sotFindPad(L,from,to,excl){for(let x=Math.round(from);x<=to;x+=20){const s=sotPadOk(L,x,excl);if(s)return{x,s}}return null}
// Cratere: prima si cerca una fossa che c'è già nel terreno, altrimenti se ne apre una in un tratto pieno.
function sotFindCrater(L,from,to,excl,rnd){
 const ss=L.solids.filter(s=>s.x<L.arenaX).sort((a,b)=>a.x-b.x);
 for(let i=1;i<ss.length;i++){
  const a=ss[i-1],b=ss[i],x=a.x+a.w,w=b.x-x;
  if(x<from||x>to||a.jet||b.jet||w<70||w>230)continue;
  if(sotBusy(x,excl)||sotBusy(x+w,excl)||sotHostNear(L,x+w/2,w/2+60)||sotPropNear(L,x+w/2,w/2+70))continue;
  return{x,w,y:Math.min(a.y,b.y),ya:a.y,yb:b.y,nat:true};
 }
 const w=Math.round(140+rnd()*40),gAt=x=>{const o=L.solids.find(o=>x>=o.x&&x<o.x+o.w);return o&&!o.jet&&!o.pillar?o.y:null};
 const solidRun=(x0,x1)=>{for(let x=x0;x<=x1;x+=10)if(gAt(x)===null)return false;return true};
 for(let cx=Math.round(from);cx<=to;cx+=20){
  if(!solidRun(cx-120,cx+w+120)||sotBusy(cx-60,excl)||sotBusy(cx+w+60,excl)||sotHostNear(L,cx+w/2,w/2+70)||sotPropNear(L,cx+w/2,w/2+80))continue;
  if(L.triggers.some(t=>t.type==='riparo'&&Math.abs(t.x-cx-w/2)<w/2+100))continue;
  const ya=gAt(cx-1),yb=gAt(cx+w+1),x1=cx+w;
  // si taglia il terreno (anche a cavallo di due tratti): resta il buco del cratere
  const out=[];
  for(const o of L.solids){
   const e=o.x+o.w;
   if(e<=cx||o.x>=x1){out.push(o);continue}
   if(o.x<cx)out.push(Object.assign(o,{w:cx-o.x}));
   if(e>x1)out.push(o.x<cx?{x:x1,w:e-x1,y:o.y}:Object.assign(o,{x:x1,w:e-x1}));
  }
  L.solids.length=0;L.solids.push(...out);
  L.props=L.props.filter(pr=>pr.x<cx-30||pr.x>x1+30);
  return{x:cx,w,y:Math.min(ya,yb),ya,yb,nat:false};
 }
 return null;
}
function sotBuildUnderground(L,d,rnd){
 const U={solids:[],plats:[],props:[],triggers:[],hostages:[],sections:[],lifts:[],craters:[],holes:[],lamps:[],deco:[],caches:[],zones:[],links:[]};
 const excl=[[0,1550],[L.arenaX-260,1e9]];
 for(const z of L.jetZones)excl.push([z.wallX-160,z.landX+160]);
 for(const z of L.pillarZones)excl.push([z.x0-160,z.x1+160]);
 // punti di passaggio: crateri lungo tutto il percorso. Ogni cratere vale nei due sensi: ci si cade
 // dentro per scendere, e da sotto si risale dallo stesso buco seguendo la scia luminosa.
 let x=1650;
 const take=c=>{U.craters.push(c);U.links.push({kind:'cratere',x:c.x,x1:c.x+c.w,c});excl.push([c.x-200,c.x+c.w+200])};
 while(x<L.arenaX-1150){
  const to=Math.min(x+760,L.arenaX-1150),c=sotFindCrater(L,x,to,excl,rnd);
  if(c){take(c);x=c.x+c.w+Math.round(SOT.gap[0]+rnd()*(SOT.gap[1]-SOT.gap[0]));continue}
  x=to+20;
 }
 if(!U.craters.length){L.sot=null;return}
 // ultimo cratere poco prima dell'arena: da lì si risale per forza (dopo c'è la roccia)
 const lastL=U.links[U.links.length-1];
 if(lastL.x<L.arenaX-1500){const c=sotFindCrater(L,Math.max(lastL.x1+450,L.arenaX-1150),L.arenaX-500,excl,rnd);if(c)take(c)}
 U.links[U.links.length-1].last=true;
 for(const l of U.links){L.props.push({x:l.x,w:l.c.w,y:l.c.y,ya:l.c.ya,yb:l.c.yb,kind:'cratere',last:!!l.last});U.holes.push({x0:l.x,x1:l.x1,kind:'cratere',last:!!l.last,c:l.c})}
 // sotto: piazzole sotto ogni passaggio, in mezzo tratti con burroni e pareti da jetpack
 const pads=U.links.map(l=>({a:l.x-190,b:l.x1+190,l}));
 const x0=pads[0].a,x1=pads[pads.length-1].b;
 U.solids.push({x:x0-560,w:560,y:SOT.ceil,wall:true});
 U.solids.push({x:x1,w:L.arenaX+600-x1,y:SOT.ceil,wall:true});
 const kinds=['parete','abisso','scalata','normale'];let prev='';const chunks=[];
 for(let i=0;i<pads.length;i++){
  const p=pads[i];U.solids.push({x:p.a,w:p.b-p.a,y:SOT.padY,pad:true});
  if(i===pads.length-1)break;
  const a=p.b,b=pads[i+1].a,n=Math.max(1,Math.round((b-a)/820)),step=(b-a)/n;
  // percorsi col jetpack frequenti: un ostacolo ogni 800 px circa, mai due uguali di fila, ogni tanto un tratto normale
  for(let j=0;j<n;j++){
   const ca=Math.round(a+step*j),cb=j===n-1?b:Math.round(a+step*(j+1));
   let k;for(let t=0;t<6;t++){k=rnd()<.22?'normale':kinds[Math.floor(rnd()*3)];if(k!==prev)break}
   if(cb-ca<640)k=cb-ca>=600&&prev!=='abisso'?'abisso':cb-ca>=560&&prev!=='parete'?'parete':'normale';
   prev=k;chunks.push({a:ca,b:cb,k});
  }
 }
 // sale dei guardiani: ogni tanto un tratto piano e lungo dove un guardiano chiude la galleria con la barriera
 const nG=Math.max(1,Math.min(3,Math.round((x1-x0)/(4600-d*250)))),usable=chunks.filter(c=>c.b-c.a>=700);
 U.guardSpots=[];
 for(let i=0;i<nG&&usable.length;i++){
  const tx=x0+(x1-x0)*(i+.55)/nG;let best=null,bd=1e9;
  for(const c of usable){if(c.k==='guardia'||U.guardSpots.some(g=>Math.abs(g.x-(c.a+c.b)/2)<1800))continue;const dd=Math.abs((c.a+c.b)/2-tx)+(c.k==='normale'?0:2200);if(dd<bd){bd=dd;best=c}}
  if(best){best.k='guardia';U.guardSpots.push({x:Math.round((best.a+best.b)/2),y:SOT.padY,a:best.a,b:best.b})}
 }
 for(const c of chunks)sotFill(U,c.a,c.b,c.k,d,rnd);
 U.sections.push({x0,x1,shafts:U.links.map(l=>l.x)});
 for(let x=x0-200;x<x1+200;x+=Math.round(300+rnd()*140))if(!U.holes.some(h=>x>h.x0-60&&x<h.x1+60))U.lamps.push({x,len:Math.round(14+rnd()*26),ph:rnd()*6.28});
 // depositi di rifornimenti, circa uno ogni 2500 px
 const flat=U.solids.filter(s=>!s.jet&&!s.wall&&!s.pad&&s.w>=200);
 for(let cx=x0+1400;cx<x1-400;cx+=Math.round(2300+rnd()*500)){const s=flat.find(o=>o.x+o.w>cx)||null;if(!s)break;const x=Math.round(s.x+s.w*(.3+rnd()*.3));if(!U.caches.some(c=>Math.abs(c.x-x)<600)&&!U.guardSpots.some(g=>Math.abs(g.x-x)<240))U.caches.push({x,y:s.y,open:false})}
 // coloni prigionieri: tanti quanti in superficie, distribuiti lungo la galleria
 let nextId=L.hostages.reduce((m,h)=>Math.max(m,h.id),0)+1;
 const n=Math.max(1,L.hostages.length),spots=U.solids.filter(s=>!s.jet&&!s.wall&&s.w>=180);
 for(let i=0;i<n;i++){
  const tx=x0+(x1-x0)*(i+.6)/(n+.4);
  let best=null,bd=1e9;
  for(const s of spots){const hx=pfClamp(tx,s.x+70,s.x+s.w-70);if(U.holes.some(h=>hx>h.x0-110&&hx<h.x1+110)||U.guardSpots.some(g=>Math.abs(g.x-hx)<200))continue;const dd=Math.abs(hx-tx);if(dd<bd){bd=dd;best={s,hx}}}
  if(!best||U.hostages.some(h=>Math.abs(h.x-best.hx)<120))continue;
  U.hostages.push({x:Math.round(best.hx),y:best.s.y,state:'legato',t:0,id:nextId++,sot:true});
 }
 // cristalli luminosi incastonati nel pavimento
 for(const s of U.solids)if(!s.wall)for(let x=s.x+20;x<s.x+s.w-20;x+=Math.round(90+rnd()*160))if(rnd()<.45&&!U.holes.some(h=>x>h.x0-30&&x<h.x1+30))U.deco.push({x,y:s.y,size:5+rnd()*7,a:(rnd()-.5)*.6});
 // creature: tante quante i ribelli in superficie sullo stesso percorso (stessa distanza media)
 const nS=L.triggers.filter(t=>t.x>1250&&t.x<L.arenaX).length,gapS=Math.max(150,(L.arenaX-1500)/Math.max(1,nS));
 let tx=x0+600;
 while(tx<x1-200){
  U.triggers.push({x:tx,type:'bestia'});
  tx+=Math.round(gapS*(.65+rnd()*.7));
 }
 U.triggers.sort((a,b)=>a.x-b.x);
 sotPlaceGuards(U);
 L.sot=U;
}
// Guardiani: ogni tanto una creatura più grande e resistente alza una barriera di energia che chiude la galleria.
// La barriera sta in mezzo a un tratto piano e lungo (lontano da crateri, coloni e depositi) e si spegne solo quando il guardiano muore.
function sotPlaceGuards(U){
 U.guards=U.guardSpots.map(g=>({x:g.x,y:g.y,a:g.a,b:g.b,alive:true,e:null,hp:0,off:0}));
 delete U.guardSpots;
}
// Un tratto di galleria fra due piazzole.
function sotFill(U,a,b,kind,d,rnd){
 const P=SOT.padY,seg=(x,w,y,extra={})=>{if(w>8)U.solids.push({x:Math.round(x),w:Math.round(w),y,...extra})};
 const len=b-a;
 if(kind==='abisso'&&len>=600){
  // burrone troppo largo per il salto: si passa planando col jetpack (più largo sui pianeti difficili)
  const gap=Math.round(Math.min(len-280,360+d*12+rnd()*60)),w1=Math.round((len-gap)/2);
  seg(a,w1,P);seg(a+w1+gap,b-(a+w1+gap),P);
  U.props.push({x:a+w1-46,y:P,kind:'jet_giu'});
  U.zones.push({kind:'abisso',x:a+w1,x2:a+w1+gap});
  return;
 }
 if(kind==='parete'&&len>=560){
  const w1=Math.round(130+rnd()*60),cw=Math.round(240+rnd()*80),top=P-Math.round(200+rnd()*25);
  seg(a,w1,P);seg(a+w1,cw,top,{jet:true});seg(a+w1+cw,b-(a+w1+cw),P);
  U.props.push({x:a+w1-64,y:P,kind:'jet_su'});
  U.zones.push({kind:'parete',x:a+w1,x2:a+w1+cw});
  return;
 }
 if(kind==='scalata'&&len>=640){
  // due gradini: il primo si fa col salto, il secondo (alta cengia) solo col jetpack; poi si scende
  const w1=Math.round(110+rnd()*40),w2=Math.round(150+rnd()*40),w3=Math.round(220+rnd()*80);
  const y2=P-112,y3=P-Math.round(225+rnd()*10);
  seg(a,w1,P);seg(a+w1,w2,y2,{jet:true});seg(a+w1+w2,w3,y3,{jet:true});seg(a+w1+w2+w3,b-(a+w1+w2+w3),P);
  U.props.push({x:a+w1+w2-56,y:y2,kind:'jet_su'});
  U.zones.push({kind:'parete',x:a+w1+w2,x2:a+w1+w2+w3});
  return;
 }
 if(kind==='guardia'){seg(a,len,P);return}
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
 pf.under=false;pf.sotT=null;pf.sotHints={};pf.sotVisits=0;
 pf.sup={solids:pf.solids,plats:pf.plats,props:pf.props,triggers:pf.triggers,hostages:pf.hostages,next:0};
 if(pf.sot)pf.sot.next=0;
};
function sotHint(key,text,ms=2800){if(!pf.sotHints)pf.sotHints={};if(pf.sotHints[key])return;pf.sotHints[key]=true;pfStatus(text,ms)}
// lo stesso suggerimento solo le prime volte (per i primi "max" punti di quel tipo)
function sotHintFew(kind,x,max,text,ms){const H=pf.sotHints||(pf.sotHints={}),k=kind+'@'+x;if(H[k])return;const n=H['#'+kind]||0;if(n>=max)return;H['#'+kind]=n+1;sotHint(k,text,ms)}
function sotStart(toUnder,x,c=null){
 if(pf.sotT)return;
 pf.sotT={t:0,to:toUnder,x,c,done:false};
 const P=pf.pilot;P.vx=0;P.jetOn=false;
 if(toUnder){noise(.4,.03,600);tone(220,.4,'sine',.03,110)}else{noise(.3,.02,2400);tone(330,.45,'sine',.03,880)}
}
function sotSwitch(toUnder,x,c=null){
 const from=pf.under?pf.sot:pf.sup;from.next=pf.nextTrigger;
 pf.under=toUnder;
 // un colono liberato nella galleria sposta il punto di controllo sotto terra: in superficie si riparte dall'uscita
 if(toUnder)pf.sotCp=pf.checkpoint;else if(pf.checkpoint!==pf.sotCp)pf.checkpoint=c?c.x+c.w+40:x;
 const L=toUnder?pf.sot:pf.sup;
 pf.solids=L.solids;pf.plats=L.plats;pf.props=L.props;pf.triggers=L.triggers;pf.hostages=L.hostages;
 // chi è già stato superato su questo livello non ricompare: si parte dal bordo destro dello schermo
 let n=L.next||0;const near=pf.cam.x+pfViewW()*.6;while(n<L.triggers.length&&L.triggers[n].x<near)n++;
 pf.nextTrigger=n;
 pf.sotPX=null;
 pf.enemies=[];pf.shots=[];pf.grenades=[];pf.pickups=[];pf.waves=[];pf.missiles=[];pf.fx=[];pf.spawnTimer=Math.max(pf.spawnTimer||0,2.5);
 const P=pf.pilot;
 if(toUnder){
  // si cade dal cratere: si entra dal buco nella volta e si atterra sulla piazzola
  Object.assign(P,{x,y:SOT.ceil+P.h+10,vx:0,vy:260,ground:false,onPlat:false,jetOn:false,lastGround:x,inv:Math.max(P.inv,1)});
  for(let i=0;i<12;i++)pfBurst(x+(Math.random()-.5)*40,SOT.ceil+10,'#8a7a68',1,.8,true,{vy:60+Math.random()*80});
  pf.sotVisits=(pf.sotVisits||0)+1;
  try{sotSprites(sotKindId());if(pf.sot.guards&&pf.sot.guards.some(g=>g.alive))sotSprites(sotKindId(),true)}catch(err){} // i fotogrammi delle creature si preparano mentre lo schermo è nero
  if(pf.sotVisits===1)pfBanner('GALLERIE SOTTERRANEE',sotKindInfo().banner,3.2);
  else pfStatus('GALLERIE SOTTERRANEE',1600);
 }
 else if(c){
  // si esce dal cratere con un balzo e si atterra sul bordo destro
  const cx=c.x+c.w/2,yb=c.yb??c.y,y0=Math.max(c.ya??c.y,yb)+6,vy=-Math.sqrt(2*PF_GRAVITY*(y0-(yb-80)));
  Object.assign(P,{x:cx,y:y0,vx:230,vy,ground:false,onPlat:false,jetOn:false,lastGround:c.x+c.w+40,inv:Math.max(P.inv,1),sotUscita:1.2,sotUscitaX:c.x+c.w+34});
  for(let i=0;i<18;i++)pfBurst(cx+(Math.random()-.5)*c.w*.7,yb-2,'#c7b8a2',1,1.1,true,{vy:-200-Math.random()*120});
  for(let i=0;i<10;i++)pfBurst(cx,yb+10,'#ffe2a0',1,.6,false,{vy:-280});
  pfStatus('DI NUOVO IN SUPERFICIE',1800);
 }
 else{const g=pfGroundAt(x)??PF_FLOOR;Object.assign(P,{x,y:g,vx:60,vy:-620,ground:false,onPlat:false,jetOn:false,lastGround:x,inv:Math.max(P.inv,1)});for(let i=0;i<14;i++)pfBurst(x+(Math.random()-.5)*30,g-4,'#c7d6e2',1,1,true,{vy:-120});pfStatus('DI NUOVO IN SUPERFICIE',1800)}
}
function sotUpdateTransition(dt){
 const T=pf.sotT;T.t+=dt;
 if(!T.done&&T.t>=SOT.fade){T.done=true;sotSwitch(T.to,T.x,T.c)}
 if(T.t>=SOT.fade*2+.08)pf.sotT=null;
}

// ---------------------------------------------------------------- aggiornamento
updatePlatform=function(dt){
 if(!pf||!pf.sot)return sotOrig.updatePlatform(dt);
 if(pf.sotT){pf.t+=dt;if(pf.banner){pf.banner.t+=dt;if(pf.banner.t>pf.banner.life)pf.banner=null}sotUpdateTransition(dt);if(state==='platform')pfUpdateHud();return}
 // balzo fuori dal cratere: per la fisica del salto è come tenere premuto SALTO (altrimenti il salto si accorcia)
 const P0=pf.pilot,fake=!pf.under&&P0&&P0.sotUscita>0&&P0.vy<0,K0=keys,was=fake?!!K0.Space:false;
 if(fake){K0.Space=true;pf.jumpHeld=true;pf.jumpKeys={w:!!K0.KeyW,u:!!K0.ArrowUp,s:true}}
 try{sotOrig.updatePlatform(dt)}finally{if(fake){K0.Space=was;if(pf){pf.jumpHeld=!!(K0.KeyW||K0.ArrowUp||K0.Space);pf.jumpKeys={w:!!K0.KeyW,u:!!K0.ArrowUp,s:!!K0.Space}}}}
 if(state!=='platform'||!pf||pf.phase!=='missione')return;
 const P=pf.pilot;if(!P.visible||P.hp<=0)return;
 if(pf.under)sotUpdateUnder(P,dt);else sotUpdateSurface(P,dt);
 sotPillarHints(P);
};
// il cratere sotto il pilota (se è dentro la buca)
function sotCraterAt(x){if(!pf||!pf.sot||pf.under)return null;for(const c of pf.sot.craters)if(x>c.x-6&&x<c.x+c.w+6)return c;return null}
function sotFallIn(P){
 const c=sotCraterAt(P.x);if(!c||pfGroundAt(P.x)!==null)return false;
 sotStart(true,Math.round(pfClamp(P.x,c.x+24,c.x+c.w-24)));return true;
}
function sotUpdateSurface(P,dt){
 const S=pf.sot;
 // balzo fuori dal cratere: lo slancio verso destra dura finché non si è sul bordo
 if(P.sotUscita>0){P.sotUscita-=dt;if(P.x<P.sotUscitaX)P.vx=Math.max(P.vx,230);if(P.ground)P.sotUscita=0;return}
 for(const c of S.craters){
  if(P.x>c.x-520&&P.x<c.x)sotHintFew('cr',c.x,2,'CRATERE · LASCIATI CADERE DENTRO PER SCENDERE NELLE GALLERIE',3400);
  if(P.x>c.x-6&&P.x<c.x+c.w+6&&P.y>Math.min(c.y+SOT.fallIn,PF_VH-80)&&sotFallIn(P))return;
 }
}
function sotUpdateUnder(P,dt){
 const S=pf.sot,top=P.y-P.h;
 // sotto ogni cratere sale una scia luminosa: chi ci salta dentro (o ci vola col jetpack) viene spinto su
 let hole=null;for(const h of S.holes)if(P.x>h.x0+4&&P.x<h.x1-4){hole=h;break}
 if(hole){
  const mid=(hole.x0+hole.x1)/2;
  (hole.last?sotHint:(k,t,ms)=>sotHintFew('su',hole.x0,2,t,ms))('suL',hole.last?'FINE DELLA GALLERIA · SALTA NELLA SCIA LUMINOSA PER RISALIRE':'CRATERE · SALTA NELLA SCIA LUMINOSA PER RISALIRE',2600);
  if(!P.ground&&P.vy<0){P.vy=Math.min(P.vy-1400*dt,-640);P.x+=(mid-P.x)*Math.min(1,dt*6);if(Math.random()<dt*40)pfBurst(P.x+(Math.random()-.5)*16,P.y-10,'#ffe2a0',1,.35,false,{vy:-260})}
  if(top<SOT.ceil-30){sotStart(false,mid,hole.c);return}
 }else if(S.holes.some(h=>P.x>h.x0-420&&P.x<h.x0))sotHintFew('vicino',0,1,'RISALI DAI CRATERI · SEGUI LA SCIA LUMINOSA',2600);
 // soffitto: la testa non passa la roccia, tranne nel buco del cratere
 if(top<SOT.ceil+4&&!hole){P.y=SOT.ceil+4+P.h;if(P.vy<0)P.vy=0}
 // chi compare dentro la roccia viene tolto; le creature volanti restano sotto la volta
 pf.enemies=pf.enemies.filter(e=>e.bestia||e.jet||e.type==='drone'||e.y>SOT.ceil+80);
 for(const e of pf.enemies)if(!e.bestia&&(e.jet||e.type==='drone')){const lim=SOT.ceil+(e.type==='drone'?40:70);if(e.y<lim){e.y=lim;if(e.vy<0)e.vy=0}}
 // depositi di rifornimenti
 for(const c of S.caches){
  if(c.open||Math.abs(P.x-c.x)>26||Math.abs(P.y-c.y)>40)continue;
  c.open=true;pfDrop(c.x-10,c.y-30,P.hp<70?'salute':'scudo');pfDrop(c.x+12,c.y-30,'granate');
  pfText(c.x,c.y-60,'RIFORNIMENTI','#8df1ad');sfx('ui');tone(660,.12,'sine',.025);tone(990,.18,'sine',.02,0,.1);
 }
 sotUpdateGuards(P,dt);
 for(const z of S.zones)if(P.x>z.x-420&&P.x<z.x)sotHintFew('z'+z.kind,z.x,2,z.kind==='abisso'?'BURRONE · PLANA COL JETPACK (SALTO + GIÙ)':'PARETE ROCCIOSA · USA IL JETPACK PER SALIRE',2800);
}
function sotPillarHints(P){
 if(!pf.pillarZones)return;
 for(const z of pf.pillarZones)if(!pf.under&&P.x>z.x0-460&&P.x<z.x0)sotHint('col'+z.x0,'PONTE DI COLONNE · VOLA COL JETPACK DA UNA COLONNA ALL’ALTRA',3200);
}

// ---------------------------------------------------------------- regole di gioco toccate dalle gallerie
// La volta della galleria ferma i colpi (tranne dove c'è un buco).
pfShotObstacle=function(b){
 const hit=sotOrig.pfShotObstacle(b);
 if(!pf||!pf.under||b.y>=SOT.ceil||b.py<SOT.ceil)return hit;
 const t=(b.py-SOT.ceil)/(b.py-b.y),x=b.px+(b.x-b.px)*t;
 if(pf.sot.holes.some(h=>x>h.x0&&x<h.x1))return hit;
 if(hit&&Math.hypot(hit.x-b.px,hit.y-b.py)<=Math.hypot(x-b.px,SOT.ceil-b.py))return hit;
 return{x,y:SOT.ceil};
};
// Chi cade in un cratere non muore: scende nelle gallerie.
pfFell=function(...args){
 if(pf&&pf.sot&&!pf.under&&pf.phase==='missione'&&pf.pilot.visible&&sotFallIn(pf.pilot))return;
 return sotOrig.pfFell(...args);
};
// Se il pilota cade nella galleria, quello di riserva arriva in superficie, sul terreno alle sue spalle.
pfLoseLife=function(...args){
 if(pf&&pf.under){
  const x0=pf.pilot.x,sol=pf.sup.solids;let x=null;
  for(let v=Math.round(x0);v>300&&x===null;v-=40)if(sol.some(s=>!s.jet&&s.x+60<=v&&v<=s.x+s.w-60)&&!(pf.sot.craters.some(c=>v>c.x-80&&v<c.x+c.w+80)))x=v;
  pf.sotT=null;sotSwitch(false,x??pf.checkpoint);
 }
 sotOrig.pfLoseLife(...args);
};
// Il conteggio dei coloni resta quello della superficie: la galleria è un percorso alternativo.
function sotHostTotal(){return pf.sup?pf.sup.hostages.length:pf.hostages.length}
pfFinish=function(win){
 if(pf&&pf.sup){if(pf.under){pf.under=false;pf.solids=pf.sup.solids;pf.plats=pf.sup.plats;pf.props=pf.sup.props;pf.triggers=pf.sup.triggers}pf.hostages=pf.sup.hostages;pf.rescued=Math.min(pf.rescued,pf.hostages.length)}
 sotOrig.pfFinish(win);
};
pfStatus=function(text,ms){
 if(!text&&text!==0)return;
 if(pf&&pf.sup&&typeof text==='string'&&text.startsWith('COLONO SALVATO · ')){const n=sotHostTotal();text='COLONO SALVATO · '+Math.min(pf.rescued,n)+'/'+n}
 return sotOrig.pfStatus(text,ms);
};
pfUpdateHud=function(){
 sotOrig.pfUpdateHud();
 if(pf&&pf.sup){const n=sotHostTotal(),el=$('pfRescued');if(el)el.textContent=Math.min(pf.rescued,n)+'/'+n}
};

// ---------------------------------------------------------------- creature delle gallerie
// Sotto terra non ci sono ribelli né droni: ci sono piccole creature meccaniche uguali al boss del pianeta
// (millepiedi su LYRA, scorpioni su VESPER, sfere su NIMBUS, vespe su KHEPRI, draghi su UMBRA, robot su OMEGA).
// Si disegnano con lo stesso disegno del boss (immagini di Fabio), in piccolo. Forza uguale ai nemici di superficie:
// chi cammina ha la vita, la velocità, la cadenza e il danno dei soldati; chi vola quelli dei droni.
const SOT_BESTIE={
 mare:{nome:'MILLEPIEDI',s:.26,w:92,h:30,vola:false,corsa:1.15,banner:'NIDO DEI MILLEPIEDI MECCANICI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'},
 deserto:{nome:'SCORPIONI',s:.3,w:66,h:44,vola:false,corsa:1,banner:'NIDO DEGLI SCORPIONI MECCANICI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'},
 omega:{nome:'ROBOT',s:.3,w:42,h:70,vola:false,corsa:.95,banner:'FABBRICA DEI ROBOT DI OMEGA · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'},
 tempesta:{nome:'SFERE',s:.3,w:46,h:44,vola:true,dy:128,banner:'NIDO DELLE SFERE SENTINELLA · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'},
 foresta:{nome:'VESPE',s:.3,w:52,h:42,vola:true,dy:150,banner:'NIDO DELLE VESPE MECCANICHE · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'},
 lava:{nome:'DRAGHI',s:.24,w:62,h:38,vola:true,dy:84,banner:'NIDO DEI PICCOLI DRAGHI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA'}
};
function sotKindId(){const p=pf&&pf.p;if(!p)return'lava';if(p.boss==='omega')return'omega';return SOT_BESTIE[p.theme]?p.theme:(typeof pfBossInfo==='function'&&SOT_BESTIE[pfBossInfo(p).id]?pfBossInfo(p).id:'lava')}
function sotKindInfo(){return SOT_BESTIE[sotKindId()]}
function sotSpawnBestia(x){
 const d=pf.p.difficulty,rnd=pf.rnd,id=sotKindId(),K=SOT_BESTIE[id];
 for(let i=0;i<6&&pf.enemies.some(o=>o.bestia&&Math.abs(o.x-x)<70);i++)x+=80;
 let g=null;for(let i=0;i<14&&g===null;i++){g=pfGroundAt(x);if(g===null)x+=40}if(g===null)return null;
 const base={type:'bestia',bestia:id,kind:id,x,w:K.w,h:K.h,vx:0,vy:0,hit:0,face:-1,aim:Math.PI,state:'fermo',t:0,legT:rnd()*6,shots:0,rage:false,cd:.8+rnd()*.8,lunge:1.5+rnd()*2};
 let e;
 if(K.vola)e=Object.assign(base,{y:Math.max(SOT.ceil+60+K.h,g-200-rnd()*50),hp:3,max:3,side:rnd()<.5?-1:1,ph:rnd()*6,cd:1.4+rnd(),dist:110+rnd()*130,alt:140+rnd()*70});
 else{const hp=3+(d>=3?1:0);e=Object.assign(base,{y:g,ground:false,hp,max:hp,range:160+rnd()*180,speed:(95+d*10+rnd()*25)*K.corsa})}
 pf.enemies.push(e);
 return e;
}
// i nemici che nascono sotto terra sono sempre creature (anche i rinforzi a tempo)
pfSpawnEnemy=function(type,x,y){
 if(pf&&pf.under&&pf.sot)return void sotSpawnBestia(x);
 return sotOrig.pfSpawnEnemy(type,x,y);
};
pfPeriodicSpawn=function(dt){
 if(!(pf&&pf.under&&pf.sot))return sotOrig.pfPeriodicSpawn(dt);
 const d=pf.p.difficulty,alive=pf.enemies.length;
 pf.spawnTimer-=dt;
 if(pf.spawnTimer<=0){pf.spawnTimer=Math.max(1.6,4.8-d*.45)+pf.rnd()*1.8;if(alive<3+d&&pf.pilot.x<pf.sot.sections[0].x1-700)pfSpawnEnemy('bestia',pf.cam.x+pfViewW()+40)}
};
pfUpdateEnemies=function(dt){
 if(!pf||!pf.enemies.some(e=>e.bestia))return sotOrig.pfUpdateEnemies(dt);
 const B=pf.enemies.filter(e=>e.bestia);pf.enemies=pf.enemies.filter(e=>!e.bestia);
 sotOrig.pfUpdateEnemies(dt);
 for(const e of B){
  if(e.hp<=0||e.x<pf.cam.x-500)continue;
  if(pf.phase==='vittoria'){e.hp=0;pfBurst(e.x,e.y-e.h/2,'#ff7b4f',14,1);continue}
  sotUpdateBestia(e,dt);
  if(e.hp>0)pf.enemies.push(e);
 }
};
function sotBestiaMuzzle(e){
 const K=SOT_BESTIE[e.bestia];
 if(K.vola)return{x:e.x+e.face*e.w*.35,y:e.y-e.h*.45};
 if(e.bestia==='mare')return{x:e.x+e.face*e.w*.48,y:e.y-e.h*.75};
 if(e.bestia==='deserto')return{x:e.x+e.face*e.w*.1,y:e.y-e.h*1.05};
 return{x:e.x+e.face*e.w*.55,y:e.y-e.h*.62};
}
function sotUpdateBestia(e,dt){
 const P=pf.pilot,d=pf.p.difficulty,K=SOT_BESTIE[e.bestia],chest={x:P.x,y:P.y-(P.crouch?22:30)};
 e.hit=Math.max(0,e.hit-dt);e.t+=dt;e.cd-=dt;
 const dx=P.x-e.x,dist=Math.abs(dx),seen=pfOnScreen(e.x)&&P.visible&&P.hp>0;
 if(e.state!=='raffica')e.face=dx>=0?1:-1;
 if(K.vola){
  // vola come i droni: di lato e sopra al pilota, sotto la volta della galleria
  e.ph+=dt;
  const tx=P.x+e.side*(e.dist+Math.sin(e.ph*.7)*40);let ty=P.y-e.alt+Math.sin(e.ph*2)*18;
  const g=pfGroundAt(tx);if(g!==null)ty=Math.min(ty,g-40);ty=Math.max(ty,SOT.ceil+40+e.h);
  e.vx+=pfClamp((tx-e.x)*1.3-e.vx,-780*dt,780*dt);e.vy+=pfClamp((ty-e.y)*1.5-e.vy,-600*dt,600*dt);
  e.vx=pfClamp(e.vx,-170,170);e.vy=pfClamp(e.vy,-130,130);e.x+=e.vx*dt;e.y+=e.vy*dt;
  if(e.y<SOT.ceil+30+e.h){e.y=SOT.ceil+30+e.h;e.vy=Math.max(0,e.vy)}
  if(Math.abs(e.x-tx)<40&&pf.rnd()<dt*.4)e.side=-e.side;
  e.legT+=dt*3;
 }else{
  // cammina come i soldati, ma salta le fosse e ogni tanto scatta addosso al pilota
  let move=0;
  if(P.hp>0&&dist>e.range&&e.state!=='raffica')move=e.face;
  if(move&&e.ground){
   const ahead=e.x+move*(e.w/2+10),g=pfGroundAt(ahead);
   if(e.guardiano&&(g===null||g<e.y-4))move=0;
   else if(g===null){const far=pfGroundAt(e.x+move*(e.w/2+150));if(far!==null&&far>=e.y-40){e.vy=-560;e.ground=false}else move=0}
   else if(g<e.y-4){if(e.y-g<=90&&e.wall){e.vy=-600}else if(e.y-g>90)move=0}
  }
  e.lunge-=dt;
  if(e.ground&&seen&&dist<(e.guardiano?220:170)&&e.lunge<=0&&e.state!=='raffica'){e.lunge=2.4+pf.rnd()*1.6;e.vx=e.face*e.speed*2.8;e.vy=-320;e.ground=false;tone(260,.12,'sawtooth',.012,520)}
  if(e.ground||move)e.vx+=pfClamp(move*e.speed-e.vx,-900*dt,900*dt);
  pfMoveBody(e,dt);
  if(e.ground&&Math.abs(e.vx)>10)e.legT+=Math.abs(e.vx)*dt*.035;
  if(e.y>PF_VH+120)e.hp=0;
  if(e.state!=='raffica')e.state=Math.abs(e.vx)>12?'passi':'fermo';
 }
 if(e.guardiano){const [l,r]=sotGuardLeash(e);if(e.x<l){e.x=l;if(e.vx<0)e.vx=0}else if(e.x>r){e.x=r;if(e.vx>0)e.vx=0}}
 const m=sotBestiaMuzzle(e);e.aim=Math.atan2(chest.y-m.y,chest.x-m.x);
 if(!K.vola){const base=e.face>0?0:Math.PI,rel=Math.atan2(Math.sin(e.aim-base),Math.cos(e.aim-base));e.aim=base+pfClamp(rel,-.7,.7)}
 // attacco: carica (0,45 s), colpo, poi riprende a muoversi
 if(e.state==='raffica'){
  if(e.t>=.45&&!e.shots){e.shots=1;if(seen){const sp=K.vola?330+d*15:390+d*25;if(e.guardiano)for(const o of[-.16,0,.16])pfEnemyShot(m.x,m.y,e.aim+o,sp,SOT_GUARD.dmg);else pfEnemyShot(m.x,m.y,e.aim,sp,K.vola?11:14)}}
  if(e.t>=.75){e.state='fermo';e.t=0;e.shots=0}
 }else if(seen&&dist<700&&e.cd<=0&&(K.vola||e.ground)){
  e.state='raffica';e.t=0;e.shots=0;
  e.cd=K.vola?2.3-d*.12+pf.rnd()*.6:Math.max(.5,1.7-d*.1+pf.rnd()*.7-.75)+.75;
  if(e.guardiano)e.cd*=1.25;
 }
 if(pfOverlap(pfRect(P),pfRect(e)))pfContact(e);
}
// ---------------------------------------------------------------- guardiani e barriere
const SOT_GUARD={k:1.75,hp:5,dmg:16,leash:440};
function sotGuardSpawn(g,side){
 const e=sotSpawnBestia(g.x+side*170);if(!e)return null;
 const K=SOT_BESTIE[e.bestia],k=SOT_GUARD.k,hp=g.hp>0?g.hp:Math.round(e.max*SOT_GUARD.hp);
 Object.assign(e,{guardiano:g,gs:side,w:Math.round(K.w*k),h:Math.round(K.h*k),hp,max:Math.round(e.max*SOT_GUARD.hp),cd:1.2,lunge:3});
 e.x=pfClamp(e.x,...sotGuardLeash(e));
 if(K.vola){e.y=Math.max(SOT.ceil+40+e.h,g.y-210);e.alt=180;e.dist=150}
 else{e.y=g.y;e.range=120+pf.rnd()*100;e.speed*=.8}
 g.e=e;return e;
}
// il guardiano resta dalla sua parte della barriera, sul tratto piano
function sotGuardLeash(e){const g=e.guardiano,L=SOT_GUARD.leash;return e.gs<0?[Math.max(g.a+e.w/2+10,g.x-L),g.x-e.w/2-30]:[g.x+e.w/2+30,Math.min(g.b-e.w/2-10,g.x+L)]}
function sotGuardDown(g){
 if(!g.alive)return;g.alive=false;g.e=null;g.hp=0;g.off=0;
 const y0=SOT.ceil+10;
 for(let i=0;i<26;i++)pfBurst(g.x+(Math.random()-.5)*14,y0+Math.random()*(g.y-y0),i%2?'#ff6f8f':'#ffd0dc',1,.9,false,{vy:(Math.random()-.5)*200});
 pfStatus('BARRIERA DISATTIVATA · PASSAGGIO LIBERO',2400);
 sfx('boom',.8);tone(880,.18,'sine',.03,220);tone(440,.4,'sawtooth',.015,110,.08);
 if(pf.cam)pf.cam.shake=Math.max(pf.cam.shake||0,.5);
}
// pfHitEnemy: il guardiano muore con un'esplosione grande, lascia sempre qualcosa e spegne la barriera
{const prevHit=pfHitEnemy;pfHitEnemy=function(e,n){
 const was=e.hp;prevHit(e,n);
 if(e.guardiano&&was>0&&e.hp<=0){
  const g=e.guardiano,cy=e.y-e.h/2;
  pfBurst(e.x,cy,'#ff7b4f',34,1.6);pfBurst(e.x,cy,'#ffd29a',18,1.1);
  pfDrop(e.x-14,cy,pf.pilot.hp<70?'salute':'scudo');pfDrop(e.x+14,cy,'granate');
  if(typeof scoreAdd==='function'&&typeof SCORE_PTS!=='undefined')scoreAdd(SCORE_PTS.ribelle*4*(typeof scoreDiff==='function'?scoreDiff(pf.p):1));
  pfText(e.x,cy-40,'GUARDIANO DISTRUTTO','#ffd29a');
  sotGuardDown(g);
 }
}}
// nessuno passa la barriera accesa: né il pilota (a piedi o col jetpack) né le creature
function sotGateBlock(o,px,half){
 if(Math.abs(o.x-px)>120)px=o.x; // spostato di colpo (cambio di livello): non ha attraversato niente
 for(const g of pf.sot.guards||[]){
  if(!g.alive||o.y<SOT.ceil-20||o.y-(o.h||0)>g.y+10)continue;
  const side=px<g.x?-1:1;
  if(side<0&&o.x+half>g.x-6){o.x=g.x-6-half;if(o.vx>0)o.vx=-Math.min(220,o.vx*.6);return g}
  if(side>0&&o.x-half<g.x+6){o.x=g.x+6+half;if(o.vx<0)o.vx=Math.min(220,-o.vx*.6);return g}
 }
 return null;
}
function sotUpdateGuards(P,dt){
 const S=pf.sot;if(!S.guards)return;
 const VW=pfViewW();
 for(const g of S.guards){
  if(!g.alive){g.off=Math.min(1,g.off+dt*1.6);continue}
  // il guardiano è stato tolto (cambio di livello): si ricorda la vita che gli resta
  if(g.e&&!pf.enemies.includes(g.e)){if(g.e.hp>0)g.hp=g.e.hp;else{sotGuardDown(g);continue}g.e=null}
  if(!g.e&&Math.abs(P.x-g.x)<VW*.8&&!pf.sotT){sotGuardSpawn(g,P.x<g.x?-1:1);if(g.e)sotHint('guard','GUARDIANO DELLA GALLERIA · DISTRUGGILO PER APRIRE LA BARRIERA',3000)}
 }
 // urto contro la barriera: scossa e piccolo rimbalzo
 const hit=sotGateBlock(P,pf.sotPX??P.x,(P.w||24)/2);
 if(hit){P.jetOn=false;if(!pf.sotZap||pf.sotZap<=0){pf.sotZap=.35;tone(1200,.06,'square',.012,300);for(let i=0;i<5;i++)pfBurst(hit.x,P.y-20-Math.random()*30,'#ff8fae',1,.5,false,{vy:(Math.random()-.5)*160});sotHintFew('gate',hit.x,1,'BARRIERA DI ENERGIA · DISTRUGGI IL GUARDIANO',2400)}}
 pf.sotZap=Math.max(0,(pf.sotZap||0)-dt);
 for(const e of pf.enemies){if(e.bestia){if(e._px!==undefined)sotGateBlock(e,e._px,e.w/2);e._px=e.x}}
 pf.sotPX=P.x;
}
// disegno: lo stesso disegno del boss, in piccolo. Per non rallentare il PC i fotogrammi dell'animazione
// (camminata, fermo/volo, attacco) si disegnano una volta sola in canvas fuori schermo; poi solo drawImage.
const SOT_SPR={N:{passi:10,idle:10,raffica:8},cicloPassi:.8,cicloFermo:1.6};
const sotSpr={};
function sotImgReady(id){
 if(id==='omega')return typeof rbReady!=='undefined'&&rbReady;
 const n={mare:'millepiedi',deserto:'scorpione',tempesta:'sfera',foresta:'vespa',lava:'drago'}[id];
 return typeof biOrig!=='undefined'&&!!(biOrig.ready&&biOrig.ready[n]);
}
function sotPose(id,st,f){
 const k=f/SOT_SPR.N[st],t=st==='raffica'?k*.75:0;
 return{B:{kind:id,state:st,face:1,aim:0,t,legT:k*2*Math.PI/3,shots:st==='raffica'&&t>=.45?1:0,rage:false,hp:1,max:1,x:0,y:-1000,h:60,w:60},now:st==='raffica'?3+t:3+k*(st==='passi'?SOT_SPR.cicloPassi:SOT_SPR.cicloFermo)};
}
function sotBuildSprites(id,big=false){
 if(typeof gCanvas!=='function'||typeof bDrawBody!=='function'||!sotImgReady(id))return null;
 const K=SOT_BESTIE[id],R=Math.min(2,Math.max(1,(typeof gfx!=='undefined'&&gfx&&gfx.res)||1.5))*(big?.85:1),S=K.s*R*(big?SOT_GUARD.k:1);
 // 1) area occupata dal disegno: si misura su una tela di prova
 const TW=Math.ceil(1000*S),TH=Math.ceil(760*S),OX=TW/2,OY=Math.round(600*S),T=gCanvas(TW,TH);if(!T)return null;
 let x0=TW,y0=TH,x1=0,y1=0;
 for(const st of Object.keys(SOT_SPR.N))for(let f=0;f<SOT_SPR.N[st];f+=2){
  const {B,now}=sotPose(id,st,f);T.g.setTransform(1,0,0,1,0,0);T.g.clearRect(0,0,TW,TH);T.g.translate(OX,OY);T.g.scale(S,S);bDrawBody(T.g,B,now);
  const d=T.g.getImageData(0,0,TW,TH).data;
  for(let y=0;y<TH;y+=2)for(let x=0;x<TW;x+=2)if(d[(y*TW+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 }
 if(x1<=x0||y1<=y0)return null;
 x0=Math.max(0,x0-6);y0=Math.max(0,y0-6);x1=Math.min(TW,x1+8);y1=Math.min(TH,y1+8);
 // 2) i fotogrammi
 const out={R,ox:OX-x0,oy:OY-y0,w:x1-x0,h:y1-y0,fr:{}};
 for(const st of Object.keys(SOT_SPR.N)){
  out.fr[st]=[];
  for(let f=0;f<SOT_SPR.N[st];f++){
   const C=gCanvas(out.w,out.h);if(!C)return null;
   const {B,now}=sotPose(id,st,f);C.g.translate(out.ox,out.oy);C.g.scale(S,S);bDrawBody(C.g,B,now);
   // il guardiano ha la corazza più scura e rossastra (si fa una volta sola, qui)
   if(big){C.g.setTransform(1,0,0,1,0,0);C.g.globalCompositeOperation='source-atop';C.g.fillStyle='rgba(120,10,24,.28)';C.g.fillRect(0,0,out.w,out.h);C.g.globalCompositeOperation='source-over'}
   out.fr[st].push(C.c);
  }
 }
 return out;
}
function sotSprites(id,big=false){
 const key=big?id+'@G':id;
 if(sotSpr[key]===undefined||(sotSpr[key]===null&&sotImgReady(id))){try{sotSpr[key]=sotBuildSprites(id,big)}catch(err){console.warn('creature: disegno diretto',err);sotSpr[key]=false}}
 return sotSpr[key]||null;
}
function sotDrawBestia(e,now){
 const K=SOT_BESTIE[e.bestia];if(!K)return;
 ctx.save();
 if(!K.vola&&typeof gShadow==='function')gShadow(e.x,e.y+1,e.w*.6,.35);
 else if(K.vola){const g=pfGroundAt(e.x);if(g!==null&&typeof gShadow==='function')gShadow(e.x,g+1,e.w*.45,Math.max(.08,.3-(g-e.y)/1500))}
 const big=!!e.guardiano,ks=big?SOT_GUARD.k:1;
 if(big)sotDrawGuardAura(e,now);
 ctx.translate(e.x,K.vola?e.y-e.h/2+K.dy*K.s*ks:e.y);
 if(e.hit>0&&Math.floor(now*40)%2)ctx.globalAlpha=.55;
 const st=e.state==='raffica'?'raffica':e.state==='passi'?'passi':'idle',SP=sotSprites(e.bestia,big);
 if(SP){
  const n=SOT_SPR.N[st],ph=e.ph||e.legT||0;
  const f=st==='raffica'?Math.min(n-1,Math.floor(e.t/.75*n)):Math.floor(((now+ph*.37)/(st==='passi'?SOT_SPR.cicloPassi:SOT_SPR.cicloFermo)*n)%n);
  ctx.scale((e.face||1)/SP.R,1/SP.R);ctx.drawImage(SP.fr[st][f],-SP.ox,-SP.oy);
 }else{
  // immagini non ancora pronte: disegno diretto
  const ss=K.s*ks;ctx.scale(ss,ss);const was=e.state;e.state=st;
  try{if(typeof bDrawBody==='function')bDrawBody(ctx,e,now);else{ctx.fillStyle='#55697d';ctx.fillRect(-e.w/ss/2,-e.h/ss,e.w/ss,e.h/ss)}}
  catch(err){ctx.fillStyle='#55697d';ctx.fillRect(-e.w/ss/2,-e.h/ss,e.w/ss,e.h/ss)}
  e.state=was;
 }
 ctx.restore();
 // barra della vita quando è stata colpita
 if(big){sotDrawGuardBar(e);return}
 if(e.hp<e.max&&e.hp>0){const y=e.y-e.h-(K.vola?6:10);ctx.fillStyle='rgba(4,10,16,.75)';ctx.fillRect(e.x-17,y,34,4);ctx.fillStyle='#ff5268';ctx.fillRect(e.x-16,y+1,32*e.hp/e.max,2)}
}

function sotGuardCY(e){const K=SOT_BESTIE[e.bestia];return K.vola?e.y-e.h/2:e.y-e.h*.5}
// alone pulsante dietro al guardiano (un solo gradiente, niente filtri)
function sotDrawGuardAura(e,now){
 const cy=sotGuardCY(e),r=Math.max(e.w,e.h)*.95*(1+.06*Math.sin(now*4));
 ctx.save();ctx.globalCompositeOperation='lighter';
 const gr=ctx.createRadialGradient(e.x,cy,r*.15,e.x,cy,r);gr.addColorStop(0,'rgba(255,60,90,.22)');gr.addColorStop(1,'rgba(255,60,90,0)');
 ctx.fillStyle=gr;ctx.fillRect(e.x-r,cy-r,r*2,r*2);ctx.restore();
}
function sotDrawGuardBar(e){
 const K=SOT_BESTIE[e.bestia],w=Math.max(70,e.w*.9),y=e.y-e.h-(K.vola?4:14);
 ctx.fillStyle='rgba(4,10,16,.8)';ctx.fillRect(e.x-w/2-2,y-2,w+4,8);
 ctx.fillStyle='#ff3d5e';ctx.fillRect(e.x-w/2,y,w*Math.max(0,e.hp)/e.max,4);
 ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(e.x-w/2,y,w*Math.max(0,e.hp)/e.max,1);
 ctx.font='700 10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffb3c2';ctx.fillText(sotT('GUARDIANO'),e.x,y-5);
}
function sotT(t){return typeof tr==='function'?tr(t):t}
// barriera di energia dal soffitto al pavimento: due generatori nella roccia e un campo che vibra.
// Spenta: il campo si richiude nei generatori, che restano anneriti e mandano scintille.
function sotDrawGate(g,now){
 const x=g.x,top=sotCeilEdge(x)-4,bot=g.y,on=g.alive,k=on?1:1-g.off;
 // generatori
 for(const [y,dir] of [[top,1],[bot,-1]]){
  ctx.fillStyle=on?'#3a2a33':'#1c1a1e';ctx.fillRect(x-16,dir>0?y-6:y-16,32,22);
  ctx.fillStyle=on?'#5d4350':'#2a2629';ctx.fillRect(x-12,dir>0?y+10:y-20,24,6);
  ctx.fillStyle=on?`rgba(255,${90+60*Math.sin(now*9)|0},120,.95)`:'rgba(60,40,45,.9)';ctx.fillRect(x-6,dir>0?y+14:y-22,12,4);
 }
 if(!on&&Math.random()<.05)pfBurst(x+(Math.random()-.5)*20,Math.random()<.5?top+18:bot-20,'#ffb070',1,.4,true,{vy:-60});
 if(k<=0)return;
 const h=bot-20-(top+18);
 const midY=top+18+h/2,hh=h/2*k;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const gw=ctx.createLinearGradient(x-70,0,x+70,0);gw.addColorStop(0,'rgba(255,40,90,0)');gw.addColorStop(.5,`rgba(255,50,100,${.16*k})`);gw.addColorStop(1,'rgba(255,40,90,0)');ctx.fillStyle=gw;ctx.fillRect(x-70,midY-hh,140,hh*2);
 const gr=ctx.createLinearGradient(x-26,0,x+26,0);
 gr.addColorStop(0,'rgba(255,40,90,0)');gr.addColorStop(.42,`rgba(255,70,120,${.32*k})`);gr.addColorStop(.5,`rgba(255,200,220,${.75*k})`);gr.addColorStop(.58,`rgba(255,70,120,${.32*k})`);gr.addColorStop(1,'rgba(255,40,90,0)');
 ctx.fillStyle=gr;ctx.fillRect(x-26,midY-hh,52,hh*2);
 // filamenti che ondeggiano
 ctx.lineWidth=2;
 for(let j=0;j<3;j++){
  ctx.strokeStyle=j===1?`rgba(255,235,245,${.7*k})`:`rgba(255,110,150,${.6*k})`;ctx.beginPath();
  for(let y=midY-hh;y<=midY+hh;y+=10){const xx=x+Math.sin(y*.045+now*(7+j*2.3)+j*2)*(5+j*3)*(.6+.4*Math.sin(now*3+j));y===midY-hh?ctx.moveTo(xx,y):ctx.lineTo(xx,y)}
  ctx.stroke();
 }
 // lampi che scorrono lungo il campo
 for(let j=0;j<2;j++){const p=((now*.9+j*.5)%1),yy=midY-hh+p*hh*2;ctx.fillStyle=`rgba(255,220,235,${.5*k})`;ctx.fillRect(x-9,yy-2,18,4)}
 // il cavo di energia che lega il guardiano alla barriera
 const e=g.e;
 if(on&&e&&e.hp>0){
  const ey=sotGuardCY(e),bx=x+(e.x<x?-8:8);
  ctx.strokeStyle='rgba(255,90,130,.35)';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.lineDashOffset=-now*60;
  ctx.beginPath();ctx.moveTo(e.x,ey);ctx.quadraticCurveTo((e.x+bx)/2,Math.max(ey,midY)+40,bx,midY);ctx.stroke();ctx.setLineDash([]);
 }
 ctx.restore();
}
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
 if(pr.kind==='cratere')return sotDrawCrater(pr,now);
 if(pr.kind==='botola')return sotDrawHatch(pr,now,false);
 return sotOrig.pfDrawProp(pr,now);
};

// Cratere in superficie: una buca scura che scende nella roccia, con il bordo di detriti e la luce
// delle lampade della galleria in fondo. Si disegna prima del terreno (che copre i fianchi).
// Colori del terreno del pianeta (stessi della roccia di superficie), per crateri e tunnel.
function sotCols(){
 const m=typeof gMat==='function'&&typeof gfx!=='undefined'&&gfx&&pf?gMat():null;
 const d=m?m.dark:[42,47,56],md=m?(m.mid||m.dark):[70,78,90],l=m?(m.light||md):[125,135,148];
 return{m,d,md,l,rgb:(c,a=1,k=0)=>gRgbS(gMixS(c,[0,0,0],k),a)};
}
function gMixS(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function gRgbS(c,a=1){return`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`}
function sotRockPattern(){try{return typeof gPattern==='function'&&gfx&&gfx.tex?gPattern(ctx):null}catch(e){return null}}
function sotDrawCrater(pr,now){
 const x0=pr.x,w=pr.w,x1=x0+w,ya=pr.ya??pr.y,yb=pr.yb??pr.y,top=Math.min(ya,yb),bot=PF_VH+40;
 ctx.save();
 // pozzo nella roccia (il bordo alto segue i due lati del terreno)
 ctx.beginPath();ctx.moveTo(x0-2,ya+2);ctx.lineTo(x1+2,yb+2);ctx.lineTo(x1+2,bot);ctx.lineTo(x0-2,bot);ctx.closePath();
 const C=sotCols(),pat=sotRockPattern(),g=ctx.createLinearGradient(0,top,0,bot);g.addColorStop(0,C.rgb(C.md,1,.55));g.addColorStop(.3,C.rgb(C.d,1,.65));g.addColorStop(1,'#030304');
 ctx.fillStyle=g;ctx.fill();ctx.save();ctx.clip();
 // pareti frastagliate dentro la buca, un po' illuminate dall'alto
 for(const side of [-1,1]){
  const ex=side<0?x0:x1,ey=side<0?ya:yb;
  ctx.beginPath();ctx.moveTo(ex,ey);
  for(let y=ey;y<=bot;y+=16){const k=pfNoise(x0*.37+y*.11+side*13);ctx.lineTo(ex-side*(10+k*20+(y-ey)*.06),y)}
  ctx.lineTo(ex,bot);ctx.closePath();
  if(pat){ctx.fillStyle=pat;ctx.fill()}
  const wg=ctx.createLinearGradient(0,ey,0,ey+170);wg.addColorStop(0,C.rgb(C.md,pat?.35:1,.1));wg.addColorStop(.5,C.rgb(C.d,pat?.7:1,.35));wg.addColorStop(1,'rgba(0,0,0,.95)');
  ctx.fillStyle=wg;ctx.fill();
  ctx.strokeStyle=C.rgb(C.l,.25);ctx.lineWidth=1;ctx.stroke();
 }
 // anelli di roccia dentro il tunnel: si stringono scendendo, come un pozzo che va in profondità
 for(let i=0;i<7;i++){
  const y=top+22+i*i*5.2,k=i/7,inset=10+k*w*.18;
  ctx.fillStyle=`rgba(0,0,0,${.18+k*.25})`;ctx.fillRect(x0+inset,y,w-inset*2,3+k*3);
  ctx.strokeStyle=C.rgb(C.l,.16*(1-k));ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0+inset,y-1);ctx.lineTo(x1-inset,y-1);ctx.stroke();
 }
 // luce calda della galleria che sale dal fondo
 ctx.globalCompositeOperation='lighter';
 // la scia luminosa che si vede salire dal fondo (da sotto si risale da qui)
 ctx.strokeStyle=`rgba(255,226,150,${.35+.15*Math.sin(now*4+x0)})`;ctx.lineWidth=1.4;ctx.beginPath();
 for(let y=bot;y>=top+24;y-=8){const xx=x0+w/2+Math.sin(y*.045+now*3)*3;y===bot?ctx.moveTo(xx,y):ctx.lineTo(xx,y)}ctx.stroke();
 const gl=ctx.createRadialGradient(x0+w/2,bot-30,4,x0+w/2,bot-30,w*.95);gl.addColorStop(0,'rgba(255,190,110,.22)');gl.addColorStop(1,'rgba(255,190,110,0)');
 ctx.fillStyle=gl;ctx.fillRect(x0,top,w,bot-top);
 // polvere che scende nella buca
 ctx.fillStyle=C.rgb(C.l,.5);
 for(let i=0;i<7;i++){const k=(now*.35+pfNoise(x0+i*7))%1,px=x0+14+pfNoise(x0+i*3)*(w-28),py=top+k*(bot-top);ctx.globalAlpha=Math.sin(k*Math.PI)*.6;ctx.fillRect(px,py,2,2)}
 ctx.restore();ctx.restore();
 // cartello: freccia in giù verso le gallerie
 sotSign(x0-58,ya,'GALLERIE',false,'#ffb348',now);
}
// Bordo del cratere sopra il terreno: detriti scuri e crepe attorno alla buca.
function sotDrawCraterRim(c){
 const C=sotCols(),dark=C.rgb(C.d),mid=C.rgb(C.md,1,.15);
 ctx.save();
 for(const [ex,ey,side] of [[c.x,c.ya??c.y,-1],[c.x+c.w,c.yb??c.y,1]]){
  // crepe che partono dal bordo
  ctx.strokeStyle='rgba(10,8,6,.55)';ctx.lineWidth=1.4;
  for(let i=0;i<3;i++){const k=pfNoise(ex*.7+i*9),len=18+k*30;ctx.beginPath();ctx.moveTo(ex+side*2,ey+6+i*7);ctx.lineTo(ex+side*len*.5,ey+8+i*9+k*6);ctx.lineTo(ex+side*len,ey+10+i*12);ctx.stroke()}
  // ombra sul bordo
  const sg=ctx.createLinearGradient(ex,0,ex+side*26,0);sg.addColorStop(0,'rgba(0,0,0,.55)');sg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sg;ctx.fillRect(Math.min(ex,ex+side*26),ey,26,60);
  // sassi e detriti sul bordo
  for(let i=0;i<6;i++){const k=pfNoise(ex*.13+i*5.1),rx=ex+side*(i*8+2),ry=ey-1-k*3,rw=4+k*6;
   ctx.fillStyle=i%2?dark:mid;ctx.beginPath();ctx.ellipse(rx,ry,rw,2.5+k*3,(k-.5)*.6,0,6.28);ctx.fill();
   ctx.fillStyle=C.rgb(C.l,.25);ctx.beginPath();ctx.ellipse(rx-1,ry-1.5,rw*.5,1,0,0,6.28);ctx.fill()}
 }
 ctx.restore();
}
// la superficie liquida davanti (mare, lava...) non copre i crateri
if(typeof gDrawFrontLiquid==='function'){
 const sotOrigLiquid=gDrawFrontLiquid;
 gDrawFrontLiquid=function(cx,VW,now){
  const C=pf&&!pf.under&&pf.sot?pf.sot.craters.filter(c=>c.x+c.w>cx-20&&c.x<cx+VW+20):[];
  if(!C.length)return sotOrigLiquid(cx,VW,now);
  ctx.save();ctx.beginPath();ctx.rect(cx-20,0,VW+40,PF_VH+60);
  for(const c of C)ctx.rect(c.x+c.w,560,-c.w,PF_VH);
  ctx.clip('evenodd');
  try{sotOrigLiquid(cx,VW,now)}finally{ctx.restore()}
  for(const c of C)sotDrawCraterRim(c);
 };
}

// ---------------------------------------------------------------- disegno della galleria
let sotGfx=null;
// Sfondo e volta della galleria disegnati una sola volta in canvas fuori schermo (poi solo drawImage).
function sotReady(){
 const ok=typeof gReady==='function'&&gReady();
 if(sotGfx&&sotGfx.pf===pf&&sotGfx.gfx===gfx)return sotGfx;
 sotGfx={pf,gfx:ok?gfx:null,back:null,mid:null,ceil:null};
 if(!ok)return sotGfx;
 try{sotGfx.back=sotMakeBack();sotGfx.mid=sotMakeMid();sotGfx.ceil=sotMakeCeil()}catch(err){console.warn('gallerie: grafica semplice',err);sotGfx.back=sotGfx.mid=sotGfx.ceil=null}
 return sotGfx;
}
const SOT_TILE=1024,SOT_CTILE=768;
function sotMakeBack(){
 // più definizione: la parete di fondo si disegna alla risoluzione dello schermo (fino a 2x)
 const m=gMat(),R=Math.min(2,Math.max(1,gfx.res||1)),cv=gCanvas(SOT_TILE*R,PF_VH*R);if(!cv)return null;const g=cv.g;g.scale(R,R);
 g.fillStyle=gPattern(g);g.fillRect(0,0,SOT_TILE,PF_VH);
 let gr=g.createLinearGradient(0,0,0,PF_VH);gr.addColorStop(0,'rgba(2,4,8,.88)');gr.addColorStop(.45,'rgba(4,6,10,.66)');gr.addColorStop(1,'rgba(2,3,6,.9)');g.fillStyle=gr;g.fillRect(0,0,SOT_TILE,PF_VH);
 const rnd=pfRng(pfHash('grotta'+pf.p.code)),dark=gRgb(gMix(m.dark,[0,0,0],.55)),mid=gRgb(gMix(m.mid||m.dark,[0,0,0],.45)),lite=gRgb(gMix(m.light||m.mid||m.dark,[0,0,0],.35));
 const wrap=fn=>{for(const ox of [-SOT_TILE,0,SOT_TILE]){g.save();g.translate(ox,0);fn();g.restore()}};
 // strati di roccia: bande ondulate con il bordo chiaro
 for(let i=0;i<7;i++){
  const y0=SOT.ceil+30+i*62+rnd()*20,amp=4+rnd()*8,ph=rnd()*6.28,k=1+Math.floor(rnd()*3);
  const yAt=x=>y0+Math.sin(x/SOT_TILE*6.28*k+ph)*amp+Math.sin(x/SOT_TILE*6.28*(k+3)+ph*2)*amp*.35;
  g.fillStyle=i%2?dark:mid;g.globalAlpha=.22;g.beginPath();g.moveTo(0,yAt(0));for(let x=0;x<=SOT_TILE;x+=8)g.lineTo(x,yAt(x));for(let x=SOT_TILE;x>=0;x-=8)g.lineTo(x,yAt(x)+18+amp);g.closePath();g.fill();
  g.strokeStyle=lite;g.globalAlpha=.16;g.lineWidth=1;g.beginPath();for(let x=0;x<=SOT_TILE;x+=8){x?g.lineTo(x,yAt(x)):g.moveTo(x,yAt(x))}g.stroke();
 }
 g.globalAlpha=1;
 // colonne e stalattiti lontane (ripetute ai bordi per un motivo senza cuciture)
 for(let i=0;i<9;i++){
  const x=rnd()*SOT_TILE,w=40+rnd()*90,top=rnd()*140,bot=PF_VH-rnd()*120;
  wrap(()=>{
   g.fillStyle=dark;g.beginPath();g.moveTo(x-w/2,0);g.lineTo(x+w/2,0);g.lineTo(x+w*.18,top+200);g.lineTo(x+w*.3,bot-120);g.lineTo(x+w*.6,PF_VH);g.lineTo(x-w*.6,PF_VH);g.lineTo(x-w*.3,bot-120);g.lineTo(x-w*.18,top+200);g.closePath();g.globalAlpha=.55;g.fill();
   // luce radente sul fianco sinistro della colonna
   g.strokeStyle=lite;g.globalAlpha=.2;g.lineWidth=1.2;g.beginPath();g.moveTo(x-w/2,0);g.lineTo(x-w*.18,top+200);g.lineTo(x-w*.3,bot-120);g.lineTo(x-w*.6,PF_VH);g.stroke();g.globalAlpha=1;
  });
 }
 // sassi e crepe sparsi
 for(let i=0;i<70;i++){const x=rnd()*SOT_TILE,y=SOT.ceil+40+rnd()*(PF_VH-SOT.ceil-60),r=1.5+rnd()*4;wrap(()=>{g.fillStyle=rnd()<.5?dark:mid;g.globalAlpha=.35;g.beginPath();g.ellipse(x,y,r*1.4,r,rnd()*3,0,6.28);g.fill();g.fillStyle=lite;g.globalAlpha=.12;g.beginPath();g.ellipse(x-r*.3,y-r*.4,r*.6,r*.35,0,0,6.28);g.fill()})}
 g.globalAlpha=1;
 // vene di cristallo che brillano debolmente
 const col=m.rim;g.strokeStyle=col;g.lineWidth=1.2;
 for(let i=0;i<16;i++){let x=rnd()*SOT_TILE,y=SOT.ceil+60+rnd()*360;const pts=[[x,y]];for(let j=0;j<5;j++){x+=(rnd()-.5)*40;y+=(rnd()-.5)*30;pts.push([x,y])}const a=.12+rnd()*.18;wrap(()=>{g.globalAlpha=a;g.beginPath();pts.forEach(([px,py],j)=>j?g.lineTo(px,py):g.moveTo(px,py));g.stroke()})}
 g.globalAlpha=1;
 return cv.c;
}
// Strato più vicino (si muove più in fretta): archi di roccia e radici che pendono, quasi neri.
function sotMakeMid(){
 const m=gMat(),R=Math.min(2,Math.max(1,gfx.res||1)),cv=gCanvas(SOT_TILE*R,PF_VH*R);if(!cv)return null;const g=cv.g;g.scale(R,R);
 const rnd=pfRng(pfHash('grotta-vicina'+pf.p.code)),dark=gRgb(gMix(m.dark,[0,0,0],.75)),rim=gRgb(gMix(m.light||m.mid||m.dark,[0,0,0],.3));
 for(let i=0;i<4;i++){
  const x=rnd()*SOT_TILE,w=70+rnd()*80,h=200+rnd()*220;
  for(const ox of [-SOT_TILE,0,SOT_TILE]){
   g.save();g.translate(ox,0);
   // pilastro che scende dalla volta e sale dal fondo, con una strozzatura
   g.fillStyle=dark;g.beginPath();g.moveTo(x-w/2,0);g.lineTo(x+w/2,0);
   for(let y=0;y<=PF_VH;y+=20){const k=Math.abs(y-h)/PF_VH,ww=w*(.25+k*.9)+pfNoise(x+y)*8;g.lineTo(x+ww/2,y)}
   for(let y=PF_VH;y>=0;y-=20){const k=Math.abs(y-h)/PF_VH,ww=w*(.25+k*.9)+pfNoise(x-y)*8;g.lineTo(x-ww/2,y)}
   g.closePath();g.globalAlpha=.75;g.fill();
   g.strokeStyle=rim;g.globalAlpha=.18;g.lineWidth=1.5;g.beginPath();for(let y=0;y<=PF_VH;y+=20){const k=Math.abs(y-h)/PF_VH,ww=w*(.25+k*.9)+pfNoise(x-y)*8;y?g.lineTo(x-ww/2,y):g.moveTo(x-ww/2,y)}g.stroke();
   g.restore();
  }
 }
 // radici e catene che pendono dalla volta
 for(let i=0;i<10;i++){const x=rnd()*SOT_TILE,len=40+rnd()*110,sw=(rnd()-.5)*20;for(const ox of [-SOT_TILE,0,SOT_TILE]){g.strokeStyle=dark;g.globalAlpha=.8;g.lineWidth=1.5+rnd()*1.5;g.beginPath();g.moveTo(ox+x,SOT.ceil);g.quadraticCurveTo(ox+x+sw,SOT.ceil+len*.6,ox+x+sw*.4,SOT.ceil+len);g.stroke()}}
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
 if(G.mid){const o2=((cx*.62)%SOT_TILE+SOT_TILE)%SOT_TILE;for(let x=-o2;x<VW;x+=SOT_TILE)ctx.drawImage(G.mid,x,0,SOT_TILE,PF_VH)}
}
function sotDrawCeiling(cx,VW,G,now){
 const holes=pf.sot.holes.filter(h=>h.x1>cx-120&&h.x0<cx+VW+120).sort((a,b)=>a.x0-b.x0);
 ctx.save();
 ctx.beginPath();let x=cx-20;
 for(const h of holes){if(h.x0>x)ctx.rect(x,0,h.x0-x,SOT.ceil+80);x=Math.max(x,h.x1)}
 if(cx+VW+20>x)ctx.rect(x,0,cx+VW+20-x,SOT.ceil+80);ctx.clip();
 if(G.ceil){const t=G.ceil.w,start=Math.floor((cx-20)/t)*t;for(let tx=start;tx<cx+VW+20;tx+=t)ctx.drawImage(G.ceil.c,tx,0,t,G.ceil.h)}
 else{ctx.fillStyle='#14181f';ctx.fillRect(cx-20,0,VW+40,SOT.ceil+10)}
 ctx.restore();
 // buchi nella volta: il tunnel di roccia del cratere che sale verso la superficie
 for(const h of holes)sotDrawShaft(h,now);
}
// Tunnel del cratere visto da sotto: pareti di roccia frastagliate, anelli di strati sempre più stretti
// verso l'alto e la luce del giorno in cima.
function sotDrawShaft(h,now){
 const w=h.x1-h.x0,cx=(h.x0+h.x1)/2,B=SOT.ceil+14,C=sotCols(),pat=sotRockPattern();
 const dark=C.rgb(C.d,1,.45),mid=C.rgb(C.md,1,.3),lite=C.rgb(C.l);
 ctx.save();
 // fondo del tunnel: buio in basso, luce del giorno in alto
 const g=ctx.createLinearGradient(0,0,0,B);g.addColorStop(0,C.rgb(C.l,1));g.addColorStop(.18,C.rgb(C.md,1,.2));g.addColorStop(.55,C.rgb(C.d,1,.55));g.addColorStop(1,'#0b0b0c');
 ctx.fillStyle=g;ctx.fillRect(h.x0,0,w,B);
 // pareti interne: due fianchi frastagliati che si stringono verso l'alto (prospettiva)
 for(const side of [-1,1]){
  const ex=side<0?h.x0:h.x1;
  ctx.beginPath();ctx.moveTo(ex,B);
  for(let y=B;y>=0;y-=10){const k=pfNoise(h.x0*.31+y*.17+side*7),inset=(1-y/B)*w*.16+6+k*10;ctx.lineTo(ex-side*inset,y)}
  ctx.lineTo(ex,0);ctx.closePath();
  if(pat){ctx.fillStyle=pat;ctx.fill()}
  const wg=ctx.createLinearGradient(ex,0,ex-side*w*.3,0);wg.addColorStop(0,C.rgb(C.d,pat?.75:1,.45));wg.addColorStop(1,C.rgb(C.md,pat?.45:1,.3));ctx.fillStyle=wg;ctx.fill();
 }
 // anelli di strati di roccia (danno profondità al tunnel)
 ctx.lineWidth=1.5;
 for(let i=0;i<6;i++){
  const y=B-12-i*(B/7),k=1-y/B,half=w/2-((1-y/B)*w*.16+10);
  ctx.strokeStyle=i%2?'rgba(0,0,0,.45)':C.rgb(C.l,.1+k*.15);
  ctx.beginPath();ctx.ellipse(cx,y,Math.max(8,half),3+k*2,0,0,Math.PI);ctx.stroke();
 }
 // luce del giorno che scende
 ctx.globalCompositeOperation='lighter';
 const sun=ctx.createLinearGradient(0,0,0,B+30);sun.addColorStop(0,C.rgb(gMixS(C.l,[255,255,255],.3),.34));sun.addColorStop(1,C.rgb(C.l,0));
 ctx.fillStyle=sun;ctx.beginPath();ctx.moveTo(cx-w*.18,0);ctx.lineTo(cx+w*.18,0);ctx.lineTo(cx+w*.42,B+30);ctx.lineTo(cx-w*.42,B+30);ctx.closePath();ctx.fill();
 ctx.globalCompositeOperation='source-over';
 // bocca del tunnel: roccia rotta e sassi che pendono
 ctx.fillStyle=dark;
 for(let i=0;i<9;i++){const k=pfNoise(h.x0+i*3.3),side=i%2?1:-1,ex=side<0?h.x0:h.x1,dx=(i>>1)*8;ctx.beginPath();ctx.moveTo(ex-side*(dx-6),SOT.ceil-4);ctx.lineTo(ex-side*(dx+10+k*8),SOT.ceil+6);ctx.lineTo(ex-side*(dx+2+k*4),SOT.ceil+16+k*24*(i<4?1:.5));ctx.closePath();ctx.fill()}
 ctx.strokeStyle=lite;ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(h.x0-4,SOT.ceil+6);ctx.lineTo(h.x0+8,SOT.ceil+12);ctx.moveTo(h.x1+4,SOT.ceil+6);ctx.lineTo(h.x1-8,SOT.ceil+12);ctx.stroke();ctx.globalAlpha=1;
 ctx.restore();
}
// Scia luminosa sotto il cratere: una sottile traccia di luce dorata che sale dal pavimento al tunnel,
// con scintille che salgono. Saltandoci dentro si risale più in fretta.
function sotDrawTrail(h,now){
 const cx=(h.x0+h.x1)/2,floor=pfGroundAt(cx)??SOT.padY,top=SOT.ceil-6,L=floor-top,P=pf.pilot;
 const near=P&&Math.abs(P.x-cx)<(h.x1-h.x0)/2,pulse=.75+.25*Math.sin(now*4+h.x0),boost=near&&!P.ground&&P.vy<0?1.6:1;
 ctx.save();ctx.globalCompositeOperation='lighter';
 // alone morbido
 const halo=ctx.createLinearGradient(cx-16,0,cx+16,0);halo.addColorStop(0,'rgba(255,200,90,0)');halo.addColorStop(.5,`rgba(255,210,120,${.16*pulse*boost})`);halo.addColorStop(1,'rgba(255,200,90,0)');
 ctx.fillStyle=halo;ctx.fillRect(cx-16,top,32,L);
 // filo luminoso ondulato
 ctx.strokeStyle=`rgba(255,236,170,${.55*pulse})`;ctx.lineWidth=1.6;ctx.beginPath();
 for(let y=floor;y>=top;y-=8){const x=cx+Math.sin(y*.045+now*3)*3;y===floor?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
 // scintille che salgono (più veloci quando il pilota è nella scia)
 ctx.fillStyle='#fff2c8';
 for(let i=0;i<9;i++){const k=((now*(.45*boost)+i/9+pfNoise(h.x0+i))%1),y=floor-6-k*L,x=cx+Math.sin(y*.05+i*2)*5;ctx.globalAlpha=Math.sin(k*Math.PI)*.9;ctx.fillRect(x-1.2,y-1.2,2.4,2.4);ctx.globalAlpha*=.6;ctx.fillRect(x-.6,y+2,1.2,6)}
 ctx.globalAlpha=1;
 // piccole frecce verso l'alto
 ctx.fillStyle=`rgba(255,226,150,${.45*pulse})`;
 for(let i=0;i<3;i++){const k=((now*.5+i/3)%1),y=floor-30-k*(L-60);ctx.globalAlpha=Math.sin(k*Math.PI)*.7;sotArrow(cx,y,5,true)}
 ctx.globalAlpha=1;
 // anello sul pavimento
 ctx.strokeStyle=`rgba(255,210,120,${.5*pulse})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(cx,floor-1,22,4,0,0,6.28);ctx.stroke();
 ctx.restore();
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
 for(const h of pf.sot.holes)if(h.x1>cx-200&&h.x0<cx+VW+200){const m=(h.x0+h.x1)/2,f=pfGroundAt(m)??SOT.padY;gLight(m,(f+SOT.ceil)/2,150,'#ffd890',.3);gLight(m,f-20,90,'#ffd890',.35)}
 for(const h of pf.sot.holes)if(h.kind==='cratere'&&h.x1>cx-200&&h.x0<cx+VW+200)gLight((h.x0+h.x1)/2,SOT.ceil+30,200,'#ffe2b8',.5);
 for(const c of pf.sot.deco)if(c.x>cx-60&&c.x<cx+VW+60)gLight(c.x,c.y-c.size,c.size*7,gMat().rim,.28);
 for(const c of pf.sot.caches)if(!c.open&&c.x>cx-60&&c.x<cx+VW+60)gLight(c.x,c.y-14,70,'#8df1ad',.45);
 for(const g of pf.sot.guards||[])if(g.x>cx-200&&g.x<cx+VW+200&&(g.alive||g.off<1)){const k=g.alive?1:1-g.off;gLight(g.x,(g.y+SOT.ceil)/2,200,'#ff5a86',.5*k);gLight(g.x,g.y-20,110,'#ff9ab4',.4*k)}
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
 for(const h of S.holes)if(h.x1>cx-60&&h.x0<cx+VW+60)sotDrawTrail(h,now);
 for(const pr of pf.props)if(pfOnScreen(pr.x,80)){if(fancy)gShadow(pr.x,pr.y,26,.3);pfDrawProp(pr,now)}
 for(const c of S.caches)if(pfOnScreen(c.x,40))sotDrawCache(c,now);
 for(const sd of pf.solids)if(sd.x<cx+VW+20&&sd.x+sd.w>cx-20){if(fancy)gDrawSolid(sd,now);else pfDrawSolid(sd,pf.p)}
 for(const pl of pf.plats)if(pl.x<cx+VW+30&&pl.x+pl.w>cx-30){if(fancy)gDrawPlatform(pl,now);else pfDrawPlatformBeam(pl,now)}
 const col=fancy?gMat().rim:'#8ce9ec';for(const c of S.deco)if(pfOnScreen(c.x,30))sotDrawCrystal(c,col);
 for(const g of S.guards||[])if(pfOnScreen(g.x,60))sotDrawGate(g,now);
 for(const h of pf.hostages)if(h.state!=='salvo'&&pfOnScreen(h.x,60))(fancy?gColonist:pfDrawColonist)(h,now);
 for(const k of pf.pickups)pfDrawPickup(k,now);
 for(const e of pf.enemies)if(pfOnScreen(e.x,90)){if(e.bestia)sotDrawBestia(e,now);else(fancy?gEnemy:pfDrawEnemy)(e,now)}
 if(P.visible){ctx.save();if(P.inv>0&&Math.floor(now*18)%2)ctx.globalAlpha=.4;(fancy?gTrooper:pfDrawTrooper)(P,PF_PILOT,now);ctx.restore();pfDrawJetpack(P,now);pfDrawRifleCharge(P,now);if(P.barrier)pfDrawBarrier(P,now)}
 for(const g of pf.grenades)pfDrawGrenade(g);
 for(const m of pf.missiles)pfDrawBossMissile(m);
 sotDrawCeiling(cx,VW,G,now);
 for(const L of S.lamps)if(pfOnScreen(L.x,40))sotDrawLamp(L,now);
 if(fancy){gCollectLights(now);sotApplyLighting(VW,now)}
 for(const h of pf.hostages)if(pfOnScreen(h.x,60))pfDrawHelp(h,now);
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

// ---------------------------------------------------------------- traduzioni dei testi nuovi
function sotI18n(){
 if(typeof I18N_ROWS==='undefined')return false;
 const rows=[
  ['CRATERE · LASCIATI CADERE DENTRO PER SCENDERE NELLE GALLERIE','CRATER · DROP INTO IT TO GO DOWN INTO THE TUNNELS','CRATÈRE · LAISSE-TOI TOMBER DEDANS POUR DESCENDRE DANS LES GALERIES','CRÁTER · DÉJATE CAER DENTRO PARA BAJAR A LAS GALERÍAS','КРАТЕР · ПРЫГНИ В НЕГО, ЧТОБЫ СПУСТИТЬСЯ В ТОННЕЛИ','陨坑 · 跳进去即可进入地下隧道','クレーター · 飛び込むと地下トンネルへ降りられる'],
  ['NIDO DEI MILLEPIEDI MECCANICI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','NEST OF MECHANICAL CENTIPEDES · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','NID DES MILLE-PATTES MÉCANIQUES · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','NIDO DE CIEMPIÉS MECÁNICOS · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ГНЕЗДО МЕХАНИЧЕСКИХ МНОГОНОЖЕК · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','机械蜈蚣巢穴 · 沿着发光轨迹从陨坑返回地面','機械ムカデの巣 · 光の筋をたどってクレーターから地上へ戻れる'],
  ['NIDO DEGLI SCORPIONI MECCANICI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','NEST OF MECHANICAL SCORPIONS · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','NID DES SCORPIONS MÉCANIQUES · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','NIDO DE ESCORPIONES MECÁNICOS · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ГНЕЗДО МЕХАНИЧЕСКИХ СКОРПИОНОВ · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','机械蝎子巢穴 · 沿着发光轨迹从陨坑返回地面','機械サソリの巣 · 光の筋をたどってクレーターから地上へ戻れる'],
  ['FABBRICA DEI ROBOT DI OMEGA · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','OMEGA ROBOT FACTORY · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','USINE DE ROBOTS D’OMEGA · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','FÁBRICA DE ROBOTS DE OMEGA · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ФАБРИКА РОБОТОВ ОМЕГИ · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','欧米茄机器人工厂 · 沿着发光轨迹从陨坑返回地面','オメガのロボット工場 · 光の筋をたどってクレーターから地上へ戻れる'],
  ['NIDO DELLE SFERE SENTINELLA · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','NEST OF SENTINEL SPHERES · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','NID DES SPHÈRES SENTINELLES · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','NIDO DE ESFERAS CENTINELA · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ГНЕЗДО СФЕР-ЧАСОВЫХ · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','哨兵球巢穴 · 沿着发光轨迹从陨坑返回地面','センチネル球の巣 · 光の筋をたどってクレーターから地上へ戻れる'],
  ['NIDO DELLE VESPE MECCANICHE · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','NEST OF MECHANICAL WASPS · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','NID DES GUÊPES MÉCANIQUES · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','NIDO DE AVISPAS MECÁNICAS · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ГНЕЗДО МЕХАНИЧЕСКИХ ОС · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','机械胡蜂巢穴 · 沿着发光轨迹从陨坑返回地面','機械スズメバチの巣 · 光の筋をたどってクレーターから地上へ戻れる'],
  ['NIDO DEI PICCOLI DRAGHI · RISALI DAI CRATERI SEGUENDO LA SCIA LUMINOSA','NEST OF LITTLE DRAGONS · CLIMB BACK UP THROUGH THE CRATERS FOLLOWING THE GLOWING TRAIL','NID DES PETITS DRAGONS · REMONTE PAR LES CRATÈRES EN SUIVANT LA TRAÎNÉE LUMINEUSE','NIDO DE PEQUEÑOS DRAGONES · SUBE POR LOS CRÁTERES SIGUIENDO LA ESTELA LUMINOSA','ГНЕЗДО МАЛЕНЬКИХ ДРАКОНОВ · ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ ПО СВЕТЯЩЕМУСЯ СЛЕДУ','小龙巢穴 · 沿着发光轨迹从陨坑返回地面','小さなドラゴンの巣 · 光の筋をたどってクレーターから地上へ戻れる']
,
  ['CRATERE · SALTA NELLA SCIA LUMINOSA PER RISALIRE','CRATER · JUMP INTO THE GLOWING TRAIL TO CLIMB BACK UP','CRATÈRE · SAUTE DANS LA TRAÎNÉE LUMINEUSE POUR REMONTER','CRÁTER · SALTA EN LA ESTELA LUMINOSA PARA SUBIR','КРАТЕР · ПРЫГНИ В СВЕТЯЩИЙСЯ СЛЕД, ЧТОБЫ ПОДНЯТЬСЯ','陨坑 · 跳进发光轨迹即可返回上方','クレーター · 光の筋に飛び込んで上へ戻る'],
  ['FINE DELLA GALLERIA · SALTA NELLA SCIA LUMINOSA PER RISALIRE','END OF THE TUNNEL · JUMP INTO THE GLOWING TRAIL TO CLIMB BACK UP','FIN DE LA GALERIE · SAUTE DANS LA TRAÎNÉE LUMINEUSE POUR REMONTER','FIN DE LA GALERÍA · SALTA EN LA ESTELA LUMINOSA PARA SUBIR','КОНЕЦ ТОННЕЛЯ · ПРЫГНИ В СВЕТЯЩИЙСЯ СЛЕД, ЧТОБЫ ПОДНЯТЬСЯ','隧道尽头 · 跳进发光轨迹即可返回上方','トンネルの終わり · 光の筋に飛び込んで上へ戻る'],
  ['GUARDIANO','GUARDIAN','GARDIEN','GUARDIÁN','СТРАЖ','守卫','ガーディアン'],
  ['GUARDIANO DISTRUTTO','GUARDIAN DESTROYED','GARDIEN DÉTRUIT','GUARDIÁN DESTRUIDO','СТРАЖ УНИЧТОЖЕН','守卫已摧毁','ガーディアン撃破'],
  ['GUARDIANO DELLA GALLERIA · DISTRUGGILO PER APRIRE LA BARRIERA','TUNNEL GUARDIAN · DESTROY IT TO OPEN THE BARRIER','GARDIEN DE LA GALERIE · DÉTRUIS-LE POUR OUVRIR LA BARRIÈRE','GUARDIÁN DE LA GALERÍA · DESTRÚYELO PARA ABRIR LA BARRERA','СТРАЖ ТОННЕЛЯ · УНИЧТОЖЬ ЕГО, ЧТОБЫ ОТКРЫТЬ БАРЬЕР','隧道守卫 · 摧毁它以打开屏障','トンネルのガーディアン · 倒してバリアを開け'],
  ['BARRIERA DI ENERGIA · DISTRUGGI IL GUARDIANO','ENERGY BARRIER · DESTROY THE GUARDIAN','BARRIÈRE D’ÉNERGIE · DÉTRUIS LE GARDIEN','BARRERA DE ENERGÍA · DESTRUYE AL GUARDIÁN','ЭНЕРГЕТИЧЕСКИЙ БАРЬЕР · УНИЧТОЖЬ СТРАЖА','能量屏障 · 摧毁守卫','エネルギーバリア · ガーディアンを倒せ'],
  ['BARRIERA DISATTIVATA · PASSAGGIO LIBERO','BARRIER DISABLED · PASSAGE CLEAR','BARRIÈRE DÉSACTIVÉE · PASSAGE LIBRE','BARRERA DESACTIVADA · PASO LIBRE','БАРЬЕР ОТКЛЮЧЁН · ПРОХОД СВОБОДЕН','屏障已解除 · 通道畅通','バリア解除 · 通行可能'],
  ['RISALI DAI CRATERI · SEGUI LA SCIA LUMINOSA','CLIMB UP THROUGH THE CRATERS · FOLLOW THE GLOWING TRAIL','REMONTE PAR LES CRATÈRES · SUIS LA TRAÎNÉE LUMINEUSE','SUBE POR LOS CRÁTERES · SIGUE LA ESTELA LUMINOSA','ПОДНИМАЙСЯ ЧЕРЕЗ КРАТЕРЫ · СЛЕДУЙ ЗА СВЕТЯЩИМСЯ СЛЕДОМ','从陨坑返回上方 · 跟随发光轨迹','クレーターから上へ · 光の筋をたどれ']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
 return true;
}
// i18n.js si carica dopo questo file: le righe si aggiungono appena la pagina è pronta
if(!sotI18n()&&typeof addEventListener==='function')addEventListener('load',sotI18n);
