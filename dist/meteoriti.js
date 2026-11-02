// Meteoriti e frammenti in alta definizione.
// Ogni sasso è un piccolo rilievo 3D calcolato pixel per pixel (cupola irregolare + rumore + crateri con bordo),
// illuminato da una luce fissa in alto a sinistra. Il calcolo si fa una volta sola per poche varianti
// (forma × materiale) che poi vengono solo ruotate e scalate: niente costo in più a ogni fotogramma.
const MT_REF=70,MT_FRAG_REF=12,MT_RES=1.6,MT_VARIANTS=8,MT_FRAG_VARIANTS=10;
const mtCache=new Map(),mtQueue=new Set();
let mtBuiltThisFrame=0,mtFrameStamp=0;

function mtHex(h,f){h=String(h||f).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return isNaN(n)?mtHex(f,'#888888'):[n>>16&255,n>>8&255,n&255]}
function mtRng(seed){seed>>>=0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
// rumore a valori su griglia, liscio, ripetibile
function mtNoise(seed){
 const rnd=mtRng(seed),P=new Float32Array(256*256);for(let i=0;i<P.length;i++)P[i]=rnd();
 const at=(x,y)=>P[((y&255)<<8)|(x&255)];
 const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
 return(x,y,oct=4)=>{let s=0,amp=.5,f=1;for(let i=0;i<oct;i++){s+=amp*n(x*f,y*f);f*=2.03;amp*=.5}return s};
}

// costruisce un sasso: R = raggio di riferimento, angular = quanto è spigoloso, hot = bordo incandescente (frammenti)
function mtBuild(R,seed,fill,edge,opt={}){
 const rnd=mtRng(seed*7919+13),fbm=mtNoise(seed*104729+7);
 const S=Math.ceil(R*2.1*MT_RES),c=document.createElement('canvas');if(!c||!c.getContext)return null;
 c.width=c.height=S;const g=c.getContext('2d');if(!g||!g.createImageData)return null;
 // contorno irregolare: somma di onde con fasi casuali
 const waves=[];for(let i=0;i<6;i++)waves.push({f:i+1,a:(opt.angular?.14:.11)/(1+i*.5)*(.4+rnd()),p:rnd()*6.28});
 const rad=t=>{let v=.84;for(const w of waves)v+=w.a*Math.sin(t*w.f+w.p);return R*Math.max(.55,Math.min(.98,v))};
 // crateri
 const craters=[],nc=opt.craters??(5+Math.floor(rnd()*5));
 for(let i=0;i<nc;i++){const a=rnd()*6.28,d=Math.sqrt(rnd())*R*.62;craters.push({x:Math.cos(a)*d,y:Math.sin(a)*d,r:R*(.07+rnd()*rnd()*.22)})}
 // faccette piatte (sassi spigolosi): piani che tagliano la cupola
 const cuts=[];if(opt.angular)for(let i=0;i<5;i++){const a=rnd()*6.28;cuts.push({nx:Math.cos(a),ny:Math.sin(a),o:R*(.25+rnd()*.3),k:.6+rnd()*.5})}
 const H=new Float32Array(S*S),A=new Float32Array(S*S),M=new Float32Array(S*S),half=S/2;
 for(let py=0;py<S;py++)for(let px=0;px<S;px++){
  const x=(px+.5-half)/MT_RES,y=(py+.5-half)/MT_RES,rho=Math.hypot(x,y),rr=rad(Math.atan2(y,x)),i=py*S+px;
  A[i]=Math.max(0,Math.min(1,(rr-rho)*MT_RES+.5));if(A[i]<=0)continue;
  const s=Math.min(1,rho/rr);let h=Math.sqrt(Math.max(0,1-s*s))*R*1.05;
  for(const q of cuts){const d=x*q.nx+y*q.ny-q.o;if(d>0)h-=d*q.k}
  h+=(fbm(x*.09+3,y*.09+5,4)-.5)*R*.28+(fbm(x*.35,y*.35,2)-.5)*R*.06;
  for(const k of craters){const d=Math.hypot(x-k.x,y-k.y)/k.r;if(d<1)h-=k.r*.55*(1-d*d);else if(d<1.45)h+=k.r*.16*(1-(d-1)/.45)**2}
  H[i]=Math.max(0,h);M[i]=fbm(x*.05+11,y*.05+17,3);
 }
 const F=mtHex(fill,'#535b63'),E=mtHex(edge,'#a7acb0'),img=g.createImageData(S,S),D=img.data;
 const L=[-.52,-.62,.59],ll=Math.hypot(...L);L[0]/=ll;L[1]/=ll;L[2]/=ll;
 for(let py=1;py<S-1;py++)for(let px=1;px<S-1;px++){
  const i=py*S+px;if(A[i]<=0)continue;
  const dx=(H[i+1]-H[i-1])*MT_RES/2,dy=(H[i+S]-H[i-S])*MT_RES/2,nl=Math.hypot(dx,dy,1),nx=-dx/nl,ny=-dy/nl,nz=1/nl;
  const dif=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]),spec=Math.pow(Math.max(0,2*dif*nz-L[2]),18)*.5;
  // colore: base scura del materiale, venature del colore del bordo, granelli
  const m=M[i],vein=Math.max(0,(m-.56)*4),grain=(fbm(px*.9,py*.9,1)-.5)*.22;
  const base=[0,1,2].map(j=>(F[j]*.8+E[j]*.28)*(.78+grain)+(E[j]-F[j])*Math.min(1,vein)*.5);
  const amb=.1,rim=Math.pow(1-nz,3)*.45;// luce riflessa dal pianeta sul lato in ombra
  const o=i*4;
  for(let j=0;j<3;j++){let v=base[j]*(amb+dif*1.6)*(.45+.55*Math.sqrt(nz))+255*spec*(.4+vein)+E[j]*rim*(1-dif);if(opt.hot)v+=[255,120,40][j]*Math.pow(1-nz,3)*.6;D[o+j]=Math.max(0,Math.min(255,v))}
  D[o+3]=A[i]*255;
 }
 g.putImageData(img,0,0);
 // contorno sottile del colore del materiale: il sasso si stacca dallo sfondo
 g.globalCompositeOperation='source-atop';g.strokeStyle=`rgba(${E[0]},${E[1]},${E[2]},.35)`;g.lineWidth=1.2*MT_RES;g.beginPath();
 for(let t=0;t<=64;t++){const a=t/64*6.28,r=rad(a)*MT_RES-.6*MT_RES;const X=half+Math.cos(a)*r,Y=half+Math.sin(a)*r;t?g.lineTo(X,Y):g.moveTo(X,Y)}g.stroke();
 return{c,R,size:S/MT_RES};
}

function mtGet(key,make){
 let v=mtCache.get(key);if(v!==undefined)return v;
 // al massimo una costruzione per fotogramma (di solito sono già pronte, vedi mtPrebuild)
 const now=performance.now();if(now-mtFrameStamp>8){mtFrameStamp=now;mtBuiltThisFrame=0}
 if(mtBuiltThisFrame>=1)return null;mtBuiltThisFrame++;
 try{v=make()}catch(e){v=false}mtCache.set(key,v);return v;
}
function mtSeedOf(o){return Math.abs(Math.floor((o.rot||.37)*100003+(o.r||1)*7919+(o.x||0)*.37))}

const mtOrig={drawRock,drawFragment};
drawRock=function(r){
 if(player&&(Math.abs(r.x-player.x)>W/2+r.r*2||Math.abs(r.y-player.y)>H/2+r.r*2))return;
 if(r._mtv===undefined)r._mtv=mtSeedOf(r)%MT_VARIANTS;
 const key='r|'+(r.fill||'')+'|'+(r.edge||'')+'|'+r._mtv;
 const sp=mtGet(key,()=>mtBuild(MT_REF,r._mtv+1+(r.fill||'').length*31,r.fill||'#535b63',r.edge||'#a7acb0'));
 if(!sp)return mtOrig.drawRock(r);
 const k=r.r/MT_REF,size=sp.size*k;
 // la luce resta fissa: il disegno ruota solo di quanto il sasso ha girato dalla nascita
 if(r._mt0===undefined)r._mt0=r.rot||0;
 ctx.save();ctx.translate(r.x,r.y);ctx.save();ctx.rotate((r.rot||0)-r._mt0);
 ctx.drawImage(sp.c,-size/2,-size/2,size,size);ctx.restore();ctx.rotate(r.rot||0);
 if(typeof drawRockCracks==='function'&&typeof asteroidVisual==='function')drawRockCracks(r,asteroidVisual(r));
 ctx.restore();
};
drawFragment=function(f){
 if(f._mtv===undefined)f._mtv=mtSeedOf(f)%MT_FRAG_VARIANTS;
 const sp=mtGet('f|'+f._mtv,()=>mtBuild(MT_FRAG_REF,f._mtv*17+5,'#725342','#ffbf7e',{angular:true,craters:1,hot:true}));
 if(!sp)return mtOrig.drawFragment(f);
 const k=f.r/MT_FRAG_REF,size=sp.size*k*1.15;
 if(f._mt0===undefined)f._mt0=f.rot||0;
 ctx.save();ctx.translate(f.x,f.y);ctx.rotate((f.rot||0)-f._mt0);ctx.drawImage(sp.c,-size/2,-size/2,size,size);ctx.restore();
};

// Prepara tutte le varianti nei momenti liberi (menu, iperspazio), una alla volta: in volo sono già pronte.
const MT_MATERIALS=[['#584435','#d7ac78'],['#294e56','#87d4cf'],['#503756','#d3a0ee'],['','']];
function mtJobs(){const j=[];for(const [f,e] of MT_MATERIALS)for(let v=0;v<MT_VARIANTS;v++)j.push(['r|'+f+'|'+e+'|'+v,()=>mtBuild(MT_REF,v+1+f.length*31,f||'#535b63',e||'#a7acb0')]);
 for(let v=0;v<MT_FRAG_VARIANTS;v++)j.push(['f|'+v,()=>mtBuild(MT_FRAG_REF,v*17+5,'#725342','#ffbf7e',{angular:true,craters:1,hot:true})]);return j}
function mtPrebuild(){
 if(typeof document==='undefined'||typeof setTimeout!=='function')return;
 const jobs=mtJobs();
 const step=()=>{
  // durante il combattimento si aspetta: si costruisce solo a gioco fermo o fuori dalla battaglia
  if(state==='play'&&!paused){setTimeout(step,400);return}
  const t0=performance.now();
  while(jobs.length&&performance.now()-t0<12){const [k,make]=jobs.shift();if(!mtCache.has(k)){try{mtCache.set(k,make())}catch(e){mtCache.set(k,false)}}}
  if(jobs.length){if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:300});else setTimeout(step,60)}
 };
 setTimeout(step,1500);
}
mtPrebuild();
