// Crepe dei meteoriti colpiti (2026-11-09): spaccature frastagliate con profondità, bordo illuminato,
// magma che si scalda col danno, buche schiacciate, schegge/polvere/braci a ogni colpo.
// Vale nel gioco in singolo (sostituisce drawRockCracks di game.js, usato anche da meteoriti.js)
// e nell'arena online (arena.js chiama crDraw). Tutto il disegno delle crepe è pre-renderizzato in cache:
// per fotogramma solo drawImage + qualche particella, niente ctx.filter/shadowBlur.
const CR_REF=60,CR_RES=2.2,CR_VARIANTS=6,CR_STAGES=6;
const crCache=new Map(),crNets=new Map(),crState=new WeakMap();
let crFrameStamp=0,crBuilt=0,crDots=null;

function crRand(seed){let s=(seed>>>0)||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}

// Rete di crepe di una variante: ogni tratto ha una "nascita" (0..1) e appare quando il danno la supera,
// così le crepe crescono sempre nello stesso disegno colpo dopo colpo.
function crNet(v){
 if(crNets.has(v))return crNets.get(v);
 const R=CR_REF,r=crRand(v*7919+101),segs=[],pits=[],tips=[],specks=[];
 const ox=(r()-.5)*R*.3,oy=(r()-.5)*R*.3;
 pits.push({x:ox,y:oy,r:R*.085,b:0,n:7+(r()*3|0),rot:r()*6.28});
 function walk(x,y,a,len,w,b0,bSpan,depth){
  let t=0;const step=R*(.055+r()*.03),n=Math.max(2,Math.round(len/step));
  for(let k=0;k<n;k++){
   // i rami principali tendono ad allontanarsi dal punto d'impatto, senza girarci intorno
  const far=Math.hypot(x-ox,y-oy),out=far>.01?Math.atan2(y-oy,x-ox):a,dev=Math.atan2(Math.sin(out-a),Math.cos(out-a));
  a+=(r()-.5)*.8+(depth?0:dev*.3*Math.min(1,far/(R*.15)));
   const nx=x+Math.cos(a)*step,ny=y+Math.sin(a)*step;
   if(Math.hypot(nx,ny)>R*.78)break;
   const t1=(k+1)/n,b=b0+bSpan*t;
   segs.push({x0:x,y0:y,x1:nx,y1:ny,w:w*(1-t*.7),b,d:depth});
   // granelli sbriciolati lungo il bordo
   if(r()<.45)specks.push({x:nx+(r()-.5)*w*5,y:ny+(r()-.5)*w*5,s:.5+r()*1.1,b});
   // rami secondari e capillari
   if(depth<2&&k>0&&k<n-1&&r()<(depth?.22:.42)){
    const side=(r()<.5?-1:1)*(.55+r()*.6);
    walk(nx,ny,a+side,len*(depth?.35:.5)*(1-t*.4),w*(depth?.45:.6),b+.06+r()*.08,bSpan*.6,depth+1);
   }
   if(depth===0&&k===Math.floor(n*.55)&&r()<.6)pits.push({x:nx,y:ny,r:R*(.035+r()*.03),b:b+.25,n:5+(r()*3|0),rot:r()*6.28});
   x=nx;y=ny;t=t1;
  }
  tips.push({x,y,b:b0+bSpan});
 }
 const main=4+(r()*3|0),a0=r()*6.28;
 for(let i=0;i<main;i++){
  const a=a0+i/main*6.283+(r()-.5)*.6,b0=i===0?0:Math.min(.5,i*.11+r()*.08);
  walk(ox,oy,a,R*(.75+r()*.25),R*.032*(.8+r()*.4),b0,.55,0);
 }
 const net={segs,pits,tips,specks};crNets.set(v,net);return net;
}

function crHeat(L){ // da rosso scuro a giallo-arancio con il danno
 const mix=(a,b)=>Math.round(a+(b-a)*L);
 return{core:`rgb(${mix(170,255)},${mix(30,150)},${mix(10,40)})`,hot:`rgba(255,${mix(170,240)},${mix(90,170)},${(.25+L*.7).toFixed(2)})`,halo:`${mix(200,255)},${mix(50,110)},${mix(10,20)}`};
}

function crBuild(v,stage){
 const S=Math.ceil(CR_REF*2*CR_RES),c=document.createElement('canvas');c.width=c.height=S;
 const g=c.getContext('2d'),L=stage/CR_STAGES,net=crNet(v),heat=crHeat(L),wk=.6+L*.75;
 g.setTransform(CR_RES,0,0,CR_RES,S/2,S/2);g.lineCap='round';g.lineJoin='round';
 const segs=net.segs.filter(s=>s.b<L),pits=net.pits.filter(p=>p.b<L);
 const stroke=(style,wm,dx,dy,list)=>{g.strokeStyle=style;for(const s of list){g.lineWidth=Math.max(.35,s.w*wm*wk);g.beginPath();g.moveTo(s.x0+dx,s.y0+dy);g.lineTo(s.x1+dx,s.y1+dy);g.stroke()}};
 // alone del calore (solo nel disegno in cache)
 stroke(`rgba(${heat.halo},${(.05+L*.08).toFixed(3)})`,7,0,0,segs);
 stroke(`rgba(${heat.halo},${(.08+L*.12).toFixed(3)})`,3.6,0,0,segs);
 // profondità: ombra sotto il labbro inferiore e luce sul labbro superiore (luce da in alto a sinistra)
 stroke('rgba(0,0,0,.55)',2.2,.55,.8,segs);
 stroke('rgba(255,236,205,.32)',1.2,-.5,-.65,segs);
 stroke('rgba(12,7,5,.96)',1.45,0,0,segs);
 // buche schiacciate dove la roccia ha ceduto
 for(const p of pits){
  const pr=p.r*(.55+L*.6),pts=[];
  for(let k=0;k<p.n;k++){const a=p.rot+k/p.n*6.283,d=pr*(.7+((k*37+p.n*13)%10)/22);pts.push([p.x+Math.cos(a)*d,p.y+Math.sin(a)*d])}
  const path=()=>{g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath()};
  g.save();g.translate(.6,.8);path();g.fillStyle='rgba(0,0,0,.45)';g.fill();g.restore();
  const gr=g.createRadialGradient(p.x+pr*.15,p.y+pr*.2,0,p.x,p.y,pr*1.1);
  gr.addColorStop(0,heat.core);gr.addColorStop(.28,'rgba(40,14,6,.98)');gr.addColorStop(1,'rgba(14,9,7,.95)');
  path();g.fillStyle=gr;g.fill();
  g.strokeStyle='rgba(255,232,200,.38)';g.lineWidth=.8;g.beginPath();g.arc(p.x,p.y,pr*.95,Math.PI*.95,Math.PI*1.75);g.stroke();
  g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.arc(p.x,p.y,pr*.95,-.1,Math.PI*.7);g.stroke();
 }
 // magma dentro la spaccatura
 stroke(heat.core,.55,0,0,segs);
 stroke(heat.hot,.22,0,0,segs.filter(s=>s.d===0||L>.6));
 // granelli sbriciolati
 for(const s of net.specks){if(s.b>=L)continue;g.fillStyle='rgba(225,205,175,.38)';g.fillRect(s.x-s.s/2,s.y-s.s/2,s.s,s.s);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(s.x+s.s/2,s.y+s.s/2,s.s*.7,s.s*.7)}
 return{c,size:S/CR_RES};
}

function crSprite(v,stage){
 const key=v+'|'+stage;let sp=crCache.get(key);if(sp!==undefined)return sp;
 const now=performance.now();if(now-crFrameStamp>8){crFrameStamp=now;crBuilt=0}
 if(crBuilt>=1){for(let s=stage-1;s>0;s--){const o=crCache.get(v+'|'+s);if(o)return o}return null}
 crBuilt++;try{sp=crBuild(v,stage)}catch(e){sp=false}crCache.set(key,sp);return sp;
}

function crSoftDot(){ // puntini sfumati colorati: [brace, polvere]
 if(crDots!==null)return crDots;
 try{crDots=[['255,170,60','255,90,20'],['150,135,120','110,98,88']].map(([a,b])=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d'),gr=g.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,`rgba(${a},1)`);gr.addColorStop(.4,`rgba(${b},.45)`);gr.addColorStop(1,`rgba(${b},0)`);g.fillStyle=gr;g.fillRect(0,0,32,32);return c})}catch(e){crDots=false}
 return crDots;
}

// a ogni colpo: schegge che rotolano via, braci e una nuvoletta di polvere da una punta di crepa
function crBurst(st,net,L,k,seed){
 const tips=net.tips.filter(t=>t.b<=L+.15),r=crRand(seed);
 const tip=tips.length?tips[(r()*tips.length)|0]:{x:0,y:0};
 const x=tip.x*k,y=tip.y*k,out=Math.atan2(tip.y||.1,tip.x||.1);
 if(st.parts.length>36)st.parts.splice(0,st.parts.length-24);
 for(let i=0;i<5;i++){const a=out+(r()-.5)*1.6,sp=(30+r()*70)*Math.max(.6,k);
  st.parts.push({t:0,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.55+r()*.4,s:(1.2+r()*2.2)*Math.max(.7,k),rot:r()*6.28,spin:(r()-.5)*14,shade:r()})}
 for(let i=0;i<5;i++){const a=out+(r()-.5)*2.2,sp=(50+r()*110)*Math.max(.6,k);
  st.parts.push({t:1,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.3+r()*.35,s:(1.5+r()*1.8)*Math.max(.7,k)})}
 st.parts.push({t:2,x,y,vx:Math.cos(out)*18*k,vy:Math.sin(out)*18*k,life:.7,s:9*Math.max(.6,k)});
}

function crParts(st,dt){
 const dots=crSoftDot();let alive=0;
 for(const p of st.parts){
  p.life-=dt;if(p.life<=0)continue;st.parts[alive++]=p;
  p.x+=p.vx*dt;p.y+=p.vy*dt;const f=Math.pow(.12,dt);p.vx*=f;p.vy*=f;
  if(p.t===0){ // scheggia di roccia
   p.rot+=p.spin*dt;const a=Math.min(1,p.life*2.5),c=p.shade<.5?'96,82,70':'150,132,112';
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=a;ctx.fillStyle=`rgb(${c})`;
   ctx.beginPath();ctx.moveTo(p.s,0);ctx.lineTo(-p.s*.3,-p.s*.8);ctx.lineTo(-p.s*.8,p.s*.2);ctx.lineTo(0,p.s*.7);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(255,235,210,.35)';ctx.fillRect(-p.s*.3,-p.s*.5,p.s*.6,p.s*.25);ctx.restore();
  }else if(dots){
   ctx.save();
   if(p.t===1){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,p.life*3);const s=p.s*2.6;
    ctx.drawImage(dots[0],p.x-s,p.y-s,s*2,s*2);ctx.fillStyle='#ffe2a0';ctx.fillRect(p.x-p.s*.35,p.y-p.s*.35,p.s*.7,p.s*.7)}
   else{const age=.7-p.life,s=p.s*(1+age*3.2);ctx.globalAlpha=Math.min(.5,p.life*.8);ctx.drawImage(dots[1],p.x-s,p.y-s,s*2,s*2)}
   ctx.restore();
  }
 }
 st.parts.length=alive;
}

// Disegna crepe + effetti del colpo. Il contesto è già traslato (e ruotato) al centro della roccia.
// obj: oggetto roccia (serve solo a ricordare il danno precedente), dmg 0..1, rad = raggio, seed = variante.
function crDraw(obj,dmg,rad,seed){
 if(typeof document==='undefined'||!(rad>0))return false;
 dmg=Math.min(1,Math.max(0,+dmg||0));
 const now=performance.now()/1000;let st=crState.get(obj);
 if(!st){st={d:dmg,hit:-9,last:now,parts:[],n:0};crState.set(obj,st)}
 const v=((seed|0)%CR_VARIANTS+CR_VARIANTS)%CR_VARIANTS,net=crNet(v),k=rad/CR_REF;
 if(dmg>st.d+1e-4){st.hit=now;st.n++;crBurst(st,net,dmg,k,v*131+st.n*977+(rad|0))}
 st.d=dmg;
 const dt=Math.min(.05,Math.max(0,now-st.last));st.last=now;
 const stage=Math.min(CR_STAGES,Math.ceil(dmg*CR_STAGES-1e-6));
 if(stage>=1){
  const sp=crSprite(v,stage);if(sp===false)return false;
  if(sp){
   const size=sp.size*k;ctx.drawImage(sp.c,-size/2,-size/2,size,size);
   // lampo del colpo e brace che pulsa sulle rocce molto rovinate
   const age=now-st.hit,flash=age<.45?(1-age/.45)*.9:0,glow=dmg>.5?(dmg-.5)*(.22+.16*Math.sin(now*4.2+v)):0;
   if(flash+glow>.02){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,flash+glow);ctx.drawImage(sp.c,-size/2,-size/2,size,size);ctx.restore()}
  }
 }
 if(st.parts.length)crParts(st,dt);
 return true;
}

// gioco in singolo: stessa firma di game.js, il danno resta sempre tra 0 e 1 (vedi correzione del blocco #52)
if(typeof drawRockCracks==='function'){
 const crOrigCracks=drawRockCracks;
 drawRockCracks=function(r,visual){
  const d=r&&r.maxHp?Math.min(1,Math.max(0,1-r.hp/r.maxHp)):0;
  if(r._crv===undefined)r._crv=Math.abs(Math.floor((r.rot||.37)*100003+(r.r||1)*7919));
  let ok=false;try{ok=crDraw(r,d,r.r,r._crv)}catch(e){ok=false}
  if(!ok&&d>0)crOrigCracks(r,visual);
 };
}

// prepara i disegni nei momenti liberi, come mtPrebuild
(function crPrebuild(){
 if(typeof document==='undefined'||typeof setTimeout!=='function')return;
 const jobs=[];for(let v=0;v<CR_VARIANTS;v++)for(let s=1;s<=CR_STAGES;s++)jobs.push([v,s]);
 const step=()=>{
  if(typeof state!=='undefined'&&state==='play'&&typeof paused!=='undefined'&&!paused){setTimeout(step,500);return}
  const t0=performance.now();
  while(jobs.length&&performance.now()-t0<10){const [v,s]=jobs.shift(),key=v+'|'+s;if(!crCache.has(key)){try{crCache.set(key,crBuild(v,s))}catch(e){crCache.set(key,false)}}}
  if(jobs.length){if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:400});else setTimeout(step,80)}
 };
 setTimeout(step,1500);
})();
