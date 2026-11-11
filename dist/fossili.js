// Conex — FOSSILI nelle gallerie sotterranee (fase 2).
// Nella roccia del sottosuolo (pavimento, pareti e volta) affiorano fossili di creature antiche:
// ammoniti, trilobiti, pesci, felci, crani alieni e grandi scheletri di rettili.
// Sono decorazioni: ogni fossile è disegnato una volta sola in un canvas fuori schermo, poi solo drawImage.
// Avvicinandosi a un fossile grande compare la scritta FOSSILE ANTICO.
// Si appoggia a sotterranei.js (aggancia sotDrawCeiling): va caricato dopo sotterranei.js e i18n.js.

const FOS_CFG={floorChance:.5,floorGap:[260,520],ceilGap:[420,760],wallBig:1,near:150};
const FOS_KINDS={ammonite:{w:72,h:72},trilobite:{w:70,h:48},pesce:{w:124,h:56},felce:{w:84,h:96},cranio:{w:92,h:76},rettile:{w:300,h:150}};
let fosState=null;

function fosRng(seed){let s=seed>>>0||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function fosSeed(){const c=(pf&&pf.p&&pf.p.code)||'x';let h=7;for(const ch of 'fossili'+c)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}

// ---------------------------------------------------------------- dove stanno
function fosBuild(S){
 const rnd=fosRng(fosSeed()),list=[],pick=a=>a[Math.floor(rnd()*a.length)];
 const smallKinds=['ammonite','trilobite','pesce','felce','ammonite','trilobite'];
 const lifts=S.lifts.map(l=>l.x);
 const holes=S.holes||[],clearOfLifts=(x,w)=>!lifts.some(l=>Math.abs(l-x)<w/2+SOT.liftW)&&!holes.some(h=>x+w/2>h.x0-20&&x-w/2<h.x1+20);
 // pavimento: nella roccia sotto i piedi
 for(const s of S.solids){
  if(s.wall||s.w<150)continue;
  let x=s.x+50+rnd()*80;
  while(x<s.x+s.w-50){
   if(rnd()<FOS_CFG.floorChance){
    const kind=pick(smallKinds),K=FOS_KINDS[kind],sc=.75+rnd()*.45,top=s.y+30+K.h*sc/2,bot=Math.min(s.y+170,PF_VH-K.h*sc/2-4);
    if(bot>top&&x-K.w*sc/2>s.x+16&&x+K.w*sc/2<s.x+s.w-16)list.push({kind,x:Math.round(x),y:Math.round(top+rnd()*(bot-top)),sc,rot:(rnd()-.5)*1.2,flip:rnd()<.5,v:Math.floor(rnd()*1e6),where:'floor'});
   }
   x+=FOS_CFG.floorGap[0]+rnd()*(FOS_CFG.floorGap[1]-FOS_CFG.floorGap[0]);
  }
 }
 // pareti alte: qui c'è spazio per i grandi scheletri
 for(const s of S.solids){
  if(!s.wall)continue;
  const big=rnd()<.7?'rettile':'cranio',K=FOS_KINDS[big],sc=Math.min(1,(s.w-60)/K.w)*(big==='rettile'?.95:1.3);
  list.push({kind:big,x:Math.round(s.x+s.w/2+(rnd()-.5)*20),y:Math.round(SOT.ceil+170+rnd()*130),sc,rot:(rnd()-.5)*.25,flip:rnd()<.5,v:Math.floor(rnd()*1e6),where:'wall',big:true});
  const kind=pick(smallKinds),k2=FOS_KINDS[kind];
  list.push({kind,x:Math.round(s.x+60+rnd()*(s.w-120)),y:Math.round(SOT.padY+40+rnd()*60),sc:.8+rnd()*.3,rot:(rnd()-.5)*1.4,flip:rnd()<.5,v:Math.floor(rnd()*1e6),where:'wall'});
  void k2;
 }
 // volta: fossili sopra la testa
 if(S.sections.length){
  const x0=Math.min(...S.sections.map(s=>s.x0))-500,x1=Math.max(...S.sections.map(s=>s.x1))+600;
  for(let x=x0+rnd()*300;x<x1;x+=FOS_CFG.ceilGap[0]+rnd()*(FOS_CFG.ceilGap[1]-FOS_CFG.ceilGap[0])){
   const kind=rnd()<.22?'cranio':rnd()<.18?'rettile':pick(smallKinds),K=FOS_KINDS[kind],sc=kind==='rettile'?.55:.7+rnd()*.35;
   if(!clearOfLifts(x,K.w*sc+30))continue;
   const y=Math.round(28+K.h*sc/2+rnd()*Math.max(0,SOT.ceil-60-K.h*sc));
   list.push({kind,x:Math.round(x),y,sc,rot:(rnd()-.5)*.9,flip:rnd()<.5,v:Math.floor(rnd()*1e6),where:'ceil',big:kind==='rettile'||kind==='cranio'});
  }
 }
 return list;
}
function fosReady(){
 const S=pf&&pf.sot;if(!S)return null;
 if(fosState&&fosState.pf===pf&&fosState.S===S)return fosState;
 fosState={pf,S,list:fosBuild(S),sprites:new Map(),seen:new Set()};
 return fosState;
}

// ---------------------------------------------------------------- disegno dei fossili (una volta sola)
const FOS_BONE='rgb(226,212,180)',FOS_DARK='rgba(8,6,4,.62)';
function fosPaint(g,kind,rnd){
 const K=FOS_KINDS[kind];
 const pass=(col,fn)=>{g.strokeStyle=col;g.fillStyle=col;fn()};
 // prima l'impronta scura (roccia scavata), poi l'osso spostato di poco: sembra in rilievo
 const twice=fn=>{g.save();g.translate(1.8,2.2);pass(FOS_DARK,fn);g.restore();pass(FOS_BONE,fn)};
 g.lineCap='round';g.lineJoin='round';
 // alone di roccia diversa attorno al fossile
 const gr=g.createRadialGradient(0,0,0,0,0,Math.max(K.w,K.h)*.6);gr.addColorStop(0,'rgba(0,0,0,.22)');gr.addColorStop(.7,'rgba(0,0,0,.1)');gr.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=gr;g.beginPath();g.ellipse(0,0,K.w*.6,K.h*.6,0,0,6.283);g.fill();
 if(kind==='ammonite'){
  const turns=3.2,b=.2,r0=2.4,pts=[];for(let t=0;t<=turns*6.283;t+=.12)pts.push([Math.cos(t)*r0*Math.exp(b*t),Math.sin(t)*r0*Math.exp(b*t),t]);
  const sc=(K.w*.46)/(r0*Math.exp(b*turns*6.283));
  twice(()=>{g.lineWidth=3;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x*sc,y*sc):g.moveTo(x*sc,y*sc));g.stroke();
   g.lineWidth=1.3;for(let i=6;i<pts.length;i+=3){const [x,y,t]=pts[i],ri=r0*Math.exp(b*(t-6.283))*sc,r=Math.hypot(x,y)*sc,a=Math.atan2(y,x);g.beginPath();g.moveTo(Math.cos(a)*ri,Math.sin(a)*ri);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke()}});
 }else if(kind==='trilobite'){
  twice(()=>{g.lineWidth=2.4;g.beginPath();g.ellipse(-22,0,13,20,0,Math.PI*.5,Math.PI*1.5);g.stroke();
   g.beginPath();g.ellipse(-24,0,5,7,0,0,6.283);g.fill();
   g.lineWidth=2;for(let i=0;i<9;i++){const x=-14+i*5.2,h=19-i*1.5;g.beginPath();g.moveTo(x,-h);g.quadraticCurveTo(x+2.5,0,x,h);g.stroke()}
   g.lineWidth=1.6;g.beginPath();g.moveTo(-14,-4);g.lineTo(32,-1.5);g.moveTo(-14,4);g.lineTo(32,1.5);g.stroke();
   g.beginPath();g.moveTo(31,-6);g.quadraticCurveTo(38,0,31,6);g.stroke()});
 }else if(kind==='pesce'){
  twice(()=>{g.lineWidth=2.6;g.beginPath();g.moveTo(-44,0);g.quadraticCurveTo(0,-6,44,0);g.stroke();
   // cranio
   g.lineWidth=2;g.beginPath();g.moveTo(-44,0);g.lineTo(-60,-6);g.lineTo(-62,4);g.closePath();g.stroke();
   g.beginPath();g.moveTo(-58,4);g.lineTo(-48,10);g.stroke();
   g.beginPath();g.arc(-52,-2,2.4,0,6.283);g.fill();
   // costole
   g.lineWidth=1.3;for(let i=0;i<13;i++){const x=-38+i*5.6,y0=-.13*Math.sin((x+44)/88*Math.PI)*12-1,h=18-Math.abs(i-4)*1.3;g.beginPath();g.moveTo(x,y0);g.quadraticCurveTo(x+4,y0-h*.5,x+6,y0-h);g.moveTo(x,y0);g.quadraticCurveTo(x+4,y0+h*.5,x+6,y0+h*.9);g.stroke()}
   // coda
   g.lineWidth=1.6;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(44,0);g.lineTo(60,i*5.5);g.stroke()}});
 }else if(kind==='felce'){
  twice(()=>{g.lineWidth=2;g.beginPath();g.moveTo(0,46);g.quadraticCurveTo(-6,0,6,-46);g.stroke();
   g.lineWidth=1.3;for(let i=0;i<12;i++){const t=i/12,y=44-t*88,x=-4*Math.sin(t*3)+t*8,l=(1-t)*24+5;
    g.beginPath();g.ellipse(x-l*.55,y-3,l*.5,2.4,-.5,0,6.283);g.stroke();g.beginPath();g.ellipse(x+l*.55,y-3,l*.5,2.4,.5,0,6.283);g.stroke()}});
 }else if(kind==='cranio'){
  twice(()=>{g.lineWidth=2.6;g.beginPath();g.moveTo(-40,4);g.bezierCurveTo(-42,-30,-6,-40,18,-30);g.bezierCurveTo(38,-22,44,-4,40,8);g.bezierCurveTo(30,18,10,16,-8,20);g.bezierCurveTo(-24,22,-38,18,-40,4);g.stroke();
   // tre orbite (creatura aliena)
   for(const [x,y,r] of [[-14,-8,7],[4,-14,8],[22,-6,6]]){g.beginPath();g.arc(x,y,r,0,6.283);g.stroke()}
   // mandibola con denti
   g.lineWidth=2.2;g.beginPath();g.moveTo(-30,22);g.quadraticCurveTo(0,40,34,14);g.stroke();
   g.lineWidth=1.4;for(let i=0;i<8;i++){const x=-24+i*7;g.beginPath();g.moveTo(x,20+Math.sin(i*.4)*2);g.lineTo(x+2,27+Math.sin(i*.4)*2);g.stroke()}
   g.lineWidth=1.1;g.beginPath();g.moveTo(-36,-10);g.lineTo(-26,-20);g.moveTo(28,-26);g.lineTo(36,-18);g.stroke()});
 }else if(kind==='rettile'){
  // grande scheletro nella "posa della morte": collo piegato all'indietro, coda lunga
  const sp=[];for(let i=0;i<=40;i++){const t=i/40,x=-130+t*270,y=t<.35?-34*Math.sin((.35-t)/.35*Math.PI*.9)-8*(1-t/.35)+8:8*Math.sin((t-.35)*4.4)+(t>.7?(t-.7)*40:0);sp.push([x,y])}
  twice(()=>{
   // vertebre
   g.lineWidth=2.4;g.beginPath();sp.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
   for(let i=1;i<sp.length;i++){const [x,y]=sp[i],r=i<14?3.2:i<26?4.2:Math.max(1.4,4.2-(i-26)*.2);g.beginPath();g.arc(x,y,r,0,6.283);g.fill()}
   // cranio
   const [hx,hy]=sp[0];g.lineWidth=2.4;g.beginPath();g.moveTo(hx+4,hy-2);g.lineTo(hx-26,hy-10);g.lineTo(hx-30,hy-2);g.lineTo(hx-4,hy+8);g.closePath();g.stroke();
   g.beginPath();g.arc(hx-10,hy-4,3,0,6.283);g.stroke();
   g.lineWidth=1.2;for(let i=0;i<5;i++){g.beginPath();g.moveTo(hx-28+i*5,hy-1);g.lineTo(hx-27+i*5,hy+3);g.stroke()}
   // costole
   g.lineWidth=1.8;for(let i=14;i<25;i++){const [x,y]=sp[i],h=20+Math.sin((i-14)/11*Math.PI)*22;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x-6,y+h*.4,x-2,y+h*.9,x+6,y+h);g.stroke()}
   // zampe
   const leg=(i,dir)=>{const [x,y]=sp[i];g.lineWidth=3;g.beginPath();g.moveTo(x,y+3);g.lineTo(x+dir*14,y+28);g.lineTo(x+dir*4,y+52);g.stroke();g.lineWidth=1.6;g.beginPath();g.moveTo(x+dir*4,y+52);g.lineTo(x+dir*14,y+56);g.moveTo(x+dir*4,y+52);g.lineTo(x+dir*10,y+60);g.moveTo(x+dir*4,y+52);g.lineTo(x-dir*2,y+59);g.stroke()};
   leg(15,-1);leg(17,1);leg(25,-1);leg(27,1);
   // bacino
   const [px,py]=sp[26];g.lineWidth=2.2;g.beginPath();g.ellipse(px,py+6,10,6,0,0,6.283);g.stroke();
  });
 }
 // crepe e granelli nella roccia attorno
 g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.9;
 for(let i=0;i<4;i++){let x=(rnd()-.5)*K.w*.9,y=(rnd()-.5)*K.h*.9;g.beginPath();g.moveTo(x,y);for(let j=0;j<3;j++){x+=(rnd()-.5)*16;y+=(rnd()-.5)*12;g.lineTo(x,y)}g.stroke()}
}
function fosSprite(st,f){
 const key=f.kind+':'+(f.v%3);
 if(st.sprites.has(key))return st.sprites.get(key);
 const K=FOS_KINDS[f.kind],R=Math.min(2,typeof gfx!=='undefined'&&gfx&&gfx.res?gfx.res:1)*1.25,pad=10;
 const cv=typeof gCanvas==='function'?gCanvas((K.w+pad*2)*R,(K.h+pad*2)*R):null;
 let out=null;
 if(cv){try{const g=cv.g;g.scale(R,R);g.translate(K.w/2+pad,K.h/2+pad);fosPaint(g,f.kind,fosRng(f.v%3+7));out={c:cv.c,w:K.w+pad*2,h:K.h+pad*2}}catch(err){console.warn('fossili: grafica non disponibile',err)}}
 st.sprites.set(key,out);return out;
}
function fosDrawList(st,which,cx,VW){
 for(const f of st.list){
  if(which==='ceil'?f.where!=='ceil':f.where==='ceil')continue;
  const K=FOS_KINDS[f.kind],half=K.w*f.sc/2+20;if(f.x+half<cx||f.x-half>cx+VW)continue;
  const sp=fosSprite(st,f);if(!sp)continue;
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.scale(f.flip?-f.sc:f.sc,f.sc);
  ctx.globalAlpha=f.where==='ceil'?.7:.85;ctx.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h);
  ctx.restore();
 }
}
function fosNear(st){
 const P=pf.pilot;if(!P||!P.visible)return;
 for(const f of st.list){
  if(!f.big||st.seen.has(f))continue;
  if(Math.abs(P.x-f.x)<FOS_CFG.near&&Math.abs((P.y-30)-f.y)<260){st.seen.add(f);if(typeof pfText==='function')pfText(f.x,f.y-FOS_KINDS[f.kind].h*f.sc*.5-6,'FOSSILE ANTICO','#efe2c2')}
 }
}

// ---------------------------------------------------------------- aggancio a sotterranei.js
// sotDrawCeiling viene chiamato a metà del disegno della galleria (mondo già traslato):
// qui sotto la volta si disegnano i fossili di pavimento e pareti, dopo la volta quelli della volta.
if(typeof sotDrawCeiling==='function'){
 const fosOrigCeil=sotDrawCeiling;
 sotDrawCeiling=function(cx,VW,G,now){
  let st=null;
  try{st=fosReady();if(st)fosDrawList(st,'rock',cx,VW)}catch(e){console.error(e)}
  fosOrigCeil(cx,VW,G,now);
  try{if(st){fosDrawList(st,'ceil',cx,VW);fosNear(st);
   // una luce tenue sui fossili grandi, così si notano anche nel buio della galleria
   if(G&&G.gfx&&typeof gLight==='function')for(const f of st.list)if(f.big&&f.x>cx-200&&f.x<cx+VW+200)gLight(f.x,f.y,FOS_KINDS[f.kind].w*f.sc*.7,'#d9e6ff',.22)}
  }catch(e){console.error(e)}
 };
}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[["FOSSILE ANTICO","ANCIENT FOSSIL","FOSSILE ANCIEN","FÓSIL ANTIGUO","ДРЕВНЕЕ ИСКОПАЕМОЕ","远古化石","古代の化石"]];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
