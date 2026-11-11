// Conex — PIANETI DETTAGLIATI NELLA HOME (2026-11-11)
// I pianeti della mappa e quello grande nel pannello diventano sfere vere che ruotano:
// - per ogni pianeta si genera UNA volta una mappa della superficie (rumore 3D sulla sfera, quindi senza giunture):
//   continenti, mari, montagne, crateri, dune, fasce di gas, crepe di lava, calotte polari, luci notturne;
// - uno strato di nuvole separato che gira un po' più veloce del suolo, con le ombre delle nuvole sotto;
// - ogni fotogramma (max 30 al secondo) la mappa viene "avvolta" sul disco con una tabella già calcolata:
//   luce giorno/notte, riflesso del sole sul mare, bordo dell'atmosfera nel colore del pianeta.
// La mappa si costruisce un po' per volta (pochi ms per fotogramma), il pianeta selezionato per primo;
// finché non è pronta resta il disegno di prima (menu-pianeti.js).
// Prestazioni: niente shadowBlur né filter; solo putImageData su tele piccole, e solo se la home è visibile.
// Va caricato dopo menu-pianeti.js (usa mpSpin, initMap, selectPlanet, planets).

const PD={
 TW:768,TH:384,          // mappa della superficie (equirettangolare)
 fps:30,budget:7,         // fotogrammi al secondo della rotazione, ms al fotogramma per costruire le mappe
 maxPx:340,               // lato massimo della tela di un disco (pixel reali)
 tex:new Map(),views:new Map(),queue:[],raf:0,last:0,lastSize:0,
 L:null,H:null
};

// ---------------------------------------------------------------- rumore 3D (come pianeta.js, autonomo)
function pdNoise(seed){
 const perm=new Uint8Array(512),val=new Float32Array(256);let s=seed>>>0||1;
 const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const p=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(rnd()*(i+1));[p[i],p[j]]=[p[j],p[i]]}
 for(let i=0;i<512;i++)perm[i]=p[i&255];for(let i=0;i<256;i++)val[i]=rnd();
 const n3=(x,y,z)=>{const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,X=xi&255,Y=yi&255,Z=zi&255;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const a=perm[X]+Y,aa=perm[a]+Z,ab=perm[a+1]+Z,b=perm[X+1]+Y,ba=perm[b]+Z,bb=perm[b+1]+Z;
  const l=(t,q,r)=>q+(r-q)*t;
  return l(w,l(v,l(u,val[perm[aa]],val[perm[ba]]),l(u,val[perm[ab]],val[perm[bb]])),l(v,l(u,val[perm[aa+1]],val[perm[ba+1]]),l(u,val[perm[ab+1]],val[perm[bb+1]])))};
 const fbm=(x,y,z,o)=>{let sum=0,amp=.5,f=1,norm=0;for(let i=0;i<o;i++){sum+=amp*n3(x*f,y*f,z*f);norm+=amp;amp*=.5;f*=2.03}return sum/norm};
 // creste: linee sottili (fiumi di lava, canyon, crepe)
 const ridge=(x,y,z,o)=>1-Math.abs(fbm(x,y,z,o)*2-1);
 return{n3,fbm,ridge,rnd};
}
const pdHex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const pdMix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const pdSmooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function pdRamp(stops,t){
 if(t<=stops[0][0])return stops[0][1];
 for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){const [a,ca]=stops[i-1],[b,cb]=stops[i];return pdMix(ca,cb,(t-a)/(b-a))}
 return stops[stops.length-1][1];
}
const pdStops=a=>a.map(([h,c])=>[h,pdHex(c)]);

// ---------------------------------------------------------------- aspetto di ogni tema
// sea: livello del mare; atm: colore del bordo atmosferico; glow: colore delle luci/lava che brillano al buio;
// cloud: [soglia, quantità, colore]; spin: le nuvole girano più veloci del suolo di questo fattore.
const PD_THEMES={
 mare:{sea:.53,deep:'#041d3d',shallow:'#1f86c0',coast:'#4fc3e0',
  land:pdStops([[0,'#d9c690'],[.04,'#5c9a48'],[.2,'#2e6d34'],[.42,'#6f6a4c'],[.62,'#8e8a80'],[.8,'#eef3f6']]),
  ice:.84,cloud:[.5,.95,'#f6faff'],atm:'#78c8ff',glow:'#ffd27a',cities:.55,craters:0},
 deserto:{sea:.25,deep:'#5b4a2e',shallow:'#a88a52',coast:'#cdb27a',salt:true,
  land:pdStops([[0,'#f0d8a0'],[.1,'#e0b062'],[.26,'#c98a3e'],[.42,'#a3602c'],[.62,'#743f1f'],[.9,'#5a321c']]),
  ice:1.2,cloud:[.66,.35,'#f3e2c4'],atm:'#ffcf86',glow:'#ffb45a',cities:.25,craters:34,dunes:true},
 tempesta:{gas:true,bands:['#2a1d58','#4d3a9c','#8a76dc','#cdbdff','#6b52c0','#3a2878','#a690f2','#e2d8ff','#5940a8'],
  ice:2,cloud:[.6,.45,'#efe8ff'],atm:'#b9a2ff',glow:'#c6b4ff',cities:0,craters:0},
 foresta:{sea:.44,deep:'#06303a',shallow:'#13606e',coast:'#36a89a',
  land:pdStops([[0,'#9cb866'],[.04,'#4b8a30'],[.15,'#27601f'],[.32,'#1b4618'],[.55,'#55603e'],[.82,'#c9d2c2']]),
  ice:.9,cloud:[.58,.7,'#eefcf2'],atm:'#9df0a8',glow:'#5dffc8',cities:.4,craters:0,bio:true},
 lava:{lava:true,sea:.36,ice:2,cloud:[.68,.55,'#4a3a38'],atm:'#ff6a3c',glow:'#ff8a2a',cities:0,craters:22},
 abisso:{abyss:true,sea:.34,ice:2,cloud:[.64,.4,'#3a0a1c'],atm:'#ff3a7a',glow:'#ff3c8c',cities:0,craters:14}
};

// ---------------------------------------------------------------- costruzione della mappa (a righe, un po' per volta)
function pdSeed(p){let s=0;const k=(p.code||'')+(p.name||'');for(let i=0;i<k.length;i++)s=Math.imul(s^k.charCodeAt(i),16777619)+i;return(s>>>0)||7}
function pdTexStart(p){
 const T=PD_THEMES[p.theme]||PD_THEMES.abisso,seed=pdSeed(p),N=pdNoise(seed),TW=PD.TW,TH=PD.TH;
 const off=[N.rnd()*60,N.rnd()*60,N.rnd()*60],coff=[N.rnd()*60+80,N.rnd()*60,N.rnd()*60];
 // crateri: centro sulla sfera + raggio angolare (piccoli tanti, grandi pochi)
 const craters=[];for(let i=0;i<T.craters;i++){const z=N.rnd()*2-1,a=N.rnd()*6.283,q=Math.sqrt(1-z*z),big=N.rnd();craters.push({x:q*Math.cos(a),y:z,z:q*Math.sin(a),r:.025+big*big*big*.16,d:.5+N.rnd()*.5})}
 const storms=T.gas?[{lat:-.38,lon:2.1,r:.34,big:true},...Array.from({length:7},()=>({lat:(N.rnd()-.5)*1.9,lon:N.rnd()*6.283,r:.05+N.rnd()*.06,big:false}))]:[];
 return{p,T,N,TW,TH,row:0,ready:false,off,coff,craters,storms,
  col:new Uint8ClampedArray(TW*TH*4), // rgb + riflesso (mare)
  emit:new Uint8Array(TW*TH),cloud:new Uint8Array(TW*TH),
  bands:T.bands?T.bands.map(pdHex):null,
  deep:T.deep&&pdHex(T.deep),shallow:T.shallow&&pdHex(T.shallow),coast:T.coast&&pdHex(T.coast),cc:pdHex(T.cloud[2])};
}
function pdTexel(g,x,y,z,lat,lon){
 const {T,N,off,coff}=g;let c,spec=0,em=0;
 if(T.gas){
  // gigante gassoso: fasce deformate dalla turbolenza, vortici e tempeste ovali
  const w1=N.fbm(x*2.4+off[0],y*2.4+off[1],z*2.4+off[2],5),w2=N.fbm(x*7+off[1],y*7,z*7+off[0],4);
  let v=y*15+(w1-.5)*4+(w2-.5)*1.1;
  let stormMix=0,stormCol=null;
  for(const s of g.storms){
   const dl=lon-s.lon,dlon=Math.atan2(Math.sin(dl),Math.cos(dl))*Math.cos(lat),dlat=lat-s.lat,d=Math.hypot(dlon*.62,dlat)/s.r;
   if(d<1.9){const a=Math.atan2(dlat,dlon)+(1.9-d)*2.6;v+=Math.sin(a*2)*(1.9-d)*.35;
    if(d<1){const m=Math.pow(1-d,.6);if(m>stormMix){stormMix=m;stormCol=s.big?(d<.45?[250,214,236]:[214,150,220]):[244,238,255]}}}
  }
  const B=g.bands,n=B.length,f=((v%n)+n)%n,k=Math.floor(f),t=f-k,s=t*t*(3-2*t);
  c=pdMix(B[k],B[(k+1)%n],s);
  const fine=(N.n3(x*40+off[2],y*90,z*40)-.5)*.12;c=[c[0]*(1+fine),c[1]*(1+fine),c[2]*(1+fine)];
  if(stormMix>0)c=pdMix(c,stormCol,stormMix*.85);
 }else{
  const h=N.fbm(x*1.8+off[0],y*1.8+off[1],z*1.8+off[2],7);
  // rilievo: confronto con il punto accanto (luce radente fissa, dà volume a monti e crateri)
  let sh=g.prevH===undefined?0:Math.max(-.3,Math.min(.3,(g.prevH-h)*g.TW*.05));g.prevH=h;
  const det=(N.n3(x*60+off[2],y*60,z*60)-.5)*.14;
  if(T.lava||T.abyss){
   const base=T.lava?[46,30,28]:[30,10,22],hi=T.lava?[96,74,66]:[78,28,52];
   c=pdMix(base,hi,pdSmooth(.3,.75,h));
   const cr=N.ridge(x*3.2+off[1],y*3.2+off[2],z*3.2+off[0],5),glow=pdSmooth(.9,.985,cr);
   const hot=T.lava?[255,150,40]:[255,60,140];
   if(h<T.sea){const m=pdSmooth(T.sea,T.sea-.06,h);c=pdMix(c,T.lava?[255,96,24]:[150,20,70],m);em=Math.max(em,m*(T.lava?.95:.7))}
   if(glow>0){c=pdMix(c,hot,glow);em=Math.max(em,glow)}
   if(T.abyss){const vein=pdSmooth(.965,.995,N.ridge(x*7+off[0],y*7,z*7+off[2],3));c=pdMix(c,[255,120,180],vein*.45);em=Math.max(em,vein*.5)}
   c=[c[0]*(1+det-sh*.8),c[1]*(1+det-sh*.8),c[2]*(1+det-sh*.8)];
  }else if(h<T.sea){
   // mare: più chiaro vicino alla costa, scuro al largo, con un po' di increspatura
   const k=pdSmooth(T.sea-.2,T.sea,h);c=pdMix(g.deep,g.shallow,k);
   if(T.salt){c=pdMix(c,[236,226,200],pdSmooth(T.sea-.05,T.sea,h)*.8);sh*=.4}
   else{c=pdMix(c,g.coast,pdSmooth(T.sea-.025,T.sea,h)*.7);spec=1}
   const rip=(N.n3(x*30,y*30+off[0],z*30)-.5)*.08;c=[c[0]*(1+rip),c[1]*(1+rip),c[2]*(1+rip)];
  }else{
   const e=(h-T.sea)/(1-T.sea);c=pdRamp(T.land,e*1.7);
   if(T.dunes){
    const du=Math.sin(x*70+y*22+N.n3(x*6+off[0],y*6,z*6)*9)*.07,can=pdSmooth(.9,.985,N.ridge(x*4+off[2],y*4+off[0],z*4,5));
    c=[c[0]*(1+du),c[1]*(1+du),c[2]*(1+du)];c=pdMix(c,[92,46,22],can*.75);
   }
   if(T.bio){const meadow=pdSmooth(.55,.7,N.fbm(x*5+off[1],y*5,z*5+off[2],4));c=pdMix(c,[120,160,70],meadow*.35)}
   // fiumi e luci delle città (si vedono solo sul lato in ombra)
   if(T.cities&&e<T.cities){const n=N.n3(x*120+off[0],y*120+off[1],z*120+off[2]),m=N.fbm(x*9+off[2],y*9+off[0],z*9,3);
    if(n>.78&&m>.52)em=Math.max(em,pdSmooth(.78,.92,n)*pdSmooth(.52,.62,m)*(T.bio?.7:1))}
   c=[c[0]*(1+det-sh),c[1]*(1+det-sh),c[2]*(1+det-sh)];
  }
 }
 // crateri: fondo scuro, bordo chiaro, schizzi intorno
 for(const k of g.craters){
  const dot=x*k.x+y*k.y+z*k.z;if(dot<.93)continue;
  const d=Math.sqrt(Math.max(0,2-2*dot))/k.r;if(d>1.8)continue;
  if(d<.85){const m=k.d*(.55+.45*(d/.85)**2);c=[c[0]*(1-.42*m),c[1]*(1-.42*m),c[2]*(1-.45*m)];
   // un lato del fondo più in ombra: sembra una conca
   const side=(x-k.x)*.7-(y-k.y)*.7;if(side>0)c=[c[0]*(1-side/k.r*.35),c[1]*(1-side/k.r*.35),c[2]*(1-side/k.r*.35)]}
  else if(d<1.2){const m=(1-Math.abs(d-1.02)/.18)*k.d;if(m>0)c=pdMix(c,[Math.min(255,c[0]*1.5+30),Math.min(255,c[1]*1.5+26),Math.min(255,c[2]*1.5+22)],m*.55)}
  else{const ray=N.n3(x*90,y*90,z*90)>.62?.12:0;c=[c[0]*(1+ray),c[1]*(1+ray),c[2]*(1+ray)]}
  if(T.lava&&d<.7)em=Math.max(em,(.7-d)*.9);
 }
 // calotte polari con bordo frastagliato
 const pole=Math.abs(y)>T.ice-.1?Math.abs(y)+(N.fbm(x*6+off[0],y*6,z*6+off[1],4)-.5)*.18:0;
 if(pole>T.ice){const m=pdSmooth(T.ice,T.ice+.05,pole);c=pdMix(c,[236,244,250],m);spec*=1-m;em*=1-m}
 // nuvole: rumore deformato, filamenti più allungati in orizzontale
 const q=N.fbm(x*1.6+coff[0],y*1.6+coff[1],z*1.6+coff[2],3);
 let cl=N.fbm(x*2.6+q*1.9+coff[1],y*5.2+q*1.4,z*2.6+coff[0],5);
 cl=pdSmooth(T.cloud[0],T.cloud[0]+.16,cl)*T.cloud[1];
 if(T.gas)cl*=pdSmooth(.4,.9,Math.abs(Math.sin(y*14+q*3)));
 return[c[0],c[1],c[2],spec,em,cl];
}
function pdTexBuild(g,budgetMs){
 const t0=performance.now(),{TW,TH,col,emit,cloud}=g;
 while(g.row<TH){
  g.prevH=undefined;const v=g.row,lat=(.5-(v+.5)/TH)*Math.PI,cl=Math.cos(lat),y=Math.sin(lat);
  for(let u=0;u<TW;u++){
   const lon=(u+.5)/TW*Math.PI*2,x=cl*Math.cos(lon),z=cl*Math.sin(lon),o=pdTexel(g,x,y,z,lat,lon),i=v*TW+u;
   col[i*4]=o[0];col[i*4+1]=o[1];col[i*4+2]=o[2];col[i*4+3]=o[3]*255;emit[i]=Math.min(255,o[4]*255);cloud[i]=Math.min(255,o[5]*255);
  }
  g.row++;
  if(performance.now()-t0>budgetMs)break;
 }
 if(g.row>=TH){g.ready=true;g.N=null}
 return g.ready;
}
// Le mappe si calcolano in parallelo in piccoli "worker" (fuori dal gioco, niente scatti);
// se il browser non li permette si costruiscono qui un po' per volta.
function pdWorkerUrl(){
 if(PD.wurl!==undefined)return PD.wurl;PD.wurl=null;
 try{
  if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL==='undefined'||!URL.createObjectURL)return null;
  const src=[`const PD={TW:${PD.TW},TH:${PD.TH}};`,`const PD_THEMES=${JSON.stringify(PD_THEMES)};`,
   'const pdHex='+pdHex,'const pdMix='+pdMix,'const pdSmooth='+pdSmooth,
   pdNoise,pdRamp,pdSeed,pdTexStart,pdTexel,pdTexBuild,
   'onmessage=e=>{const g=pdTexStart(e.data.p);pdTexBuild(g,1e9);postMessage({key:e.data.key,col:g.col,emit:g.emit,cloud:g.cloud},[g.col.buffer,g.emit.buffer,g.cloud.buffer])};'].join('\n');
  PD.wurl=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
 }catch(e){PD.wurl=null}
 return PD.wurl;
}
function pdRemote(g,key){
 const url=pdWorkerUrl();if(!url)return false;
 let w;try{w=new Worker(url)}catch(e){return false}
 g.remote=true;
 w.onmessage=e=>{const d=e.data;g.col=d.col;g.emit=d.emit;g.cloud=d.cloud;g.row=g.TH;g.ready=true;g.N=null;g.remote=false;w.terminate();
  const t=performance.now()/1000;for(const v of PD.views.values())if(v.tex===g)pdRender(v,t)};
 w.onerror=e=>{g.remote=false;try{w.terminate()}catch(_){}if(e&&e.preventDefault)e.preventDefault()};
 w.postMessage({key,p:{theme:g.p.theme,code:g.p.code,name:g.p.name}});
 return true;
}
function pdTex(p){const k=p.code||p.name;let g=PD.tex.get(k);if(!g){g=pdTexStart(p);PD.tex.set(k,g);pdRemote(g,k)}return g}

// ---------------------------------------------------------------- un disco sullo schermo
function pdCanvasOk(){
 try{if(typeof document==='undefined'||!document.createElement)return false;const c=document.createElement('canvas');const g=c&&c.getContext&&c.getContext('2d');return!!(g&&g.createImageData&&g.putImageData)}catch(e){return false}
}
function pdLightVecs(){
 if(PD.L)return;
 const L=[-.6,-.52,.6],n=Math.hypot(...L);PD.L=L.map(v=>v/n);
 const H=[PD.L[0],PD.L[1],PD.L[2]+1],m=Math.hypot(...H);PD.H=H.map(v=>v/m);
}
// tabella per ogni pixel del disco: riga e colonna di partenza nella mappa, luce, riflesso, bordo
function pdLut(view,D){
 pdLightVecs();
 const R=D/2,TW=PD.TW,TH=PD.TH,idx=[],vrow=[],lon0=[],lit=[],spc=[],rim=[],night=[],edge=[];
 const tilt=.38,ct=Math.cos(tilt),st=Math.sin(tilt),lean=-.2,cl=Math.cos(lean),sl=Math.sin(lean),L=PD.L,H=PD.H;
 for(let py=0;py<D;py++)for(let px=0;px<D;px++){
  const nx=(px+.5-R)/R,ny=(py+.5-R)/R,q=nx*nx+ny*ny;if(q>1)continue;
  const nz=Math.sqrt(1-q);
  // asse del pianeta inclinato: un po' verso di noi (si vede il polo nord) e un po' di lato
  let x=nx*cl-ny*sl,y=nx*sl+ny*cl,z=nz;
  const y2=y*ct-z*st,z2=y*st+z*ct;y=y2;z=z2;
  const lat=Math.asin(Math.max(-1,Math.min(1,-y))),lon=Math.atan2(z,x);
  const dl=nx*L[0]+ny*L[1]+nz*L[2],day=pdSmooth(-.12,.28,dl);
  idx.push(py*D+px);vrow.push(Math.min(TH-1,Math.max(0,Math.floor((.5-lat/Math.PI)*TH))));
  lon0.push(((lon/(Math.PI*2))*TW+TW)%TW);
  lit.push(.035+.965*day*(.5+.5*Math.max(0,dl)));
  spc.push(Math.pow(Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]),48)*day);
  rim.push(Math.pow(1-nz,2.4)*(.2+.8*day));
  night.push(1-day);
  edge.push(Math.min(1,(1-Math.sqrt(q))*R/1.1));
 }
 const F=a=>Float32Array.from(a);
 view.lut={n:idx.length,idx:Uint32Array.from(idx),vrow:Uint16Array.from(vrow),lon0:F(lon0),lit:F(lit),spc:F(spc),rim:F(rim),night:F(night),edge:F(edge)};
}
function pdRender(view,t){
 const g=view.tex,D=view.D;if(!g||!g.ready||!D)return;
 if(!view.lut||view.lutD!==D){pdLut(view,D);view.lutD=D;view.img=view.ctx.createImageData(D,D)}
 const {n,idx,vrow,lon0,lit,spc,rim,night,edge}=view.lut,TW=PD.TW,col=g.col,em=g.emit,cld=g.cloud,out=view.img.data;
 const T=g.T,atm=view.atm,glow=view.glow,cc=g.cc,lavaDay=T.lava||T.abyss?.28:0;
 // rotazione: il suolo fa un giro in 'secs', le nuvole un po' più veloci
 const turn=view.calm?0:(t/view.secs)%1,offG=(1-turn)*TW+view.phase*TW,offC=(1-(turn*1.18%1))*TW+view.phase*TW*1.7,sh=TW*.004;
 for(let j=0;j<n;j++){
  const row=vrow[j]*TW,l0=lon0[j];
  let u=(l0+offG)|0;u%=TW;let w=(l0+offC)|0;w%=TW;let ws=(l0+offC+sh)|0;ws%=TW;
  const ti=row+u,k=ti*4;
  let r=col[k],gg=col[k+1],b=col[k+2];
  // ombra delle nuvole sul suolo, poi le nuvole
  const c=cld[row+w]/255,cs=cld[row+ws]/255;
  const shade=1-cs*.45;r*=shade;gg*=shade;b*=shade;
  r+=(cc[0]-r)*c;gg+=(cc[1]-gg)*c;b+=(cc[2]-b)*c;
  const L=lit[j];r*=L;gg*=L;b*=L;
  const sp=spc[j]*col[k+3]/255*(1-c);if(sp>0){r+=255*sp*.9;gg+=245*sp*.9;b+=225*sp*.9}
  const e=em[ti]/255*(1-c*.8);if(e>0){const m=e*(night[j]+lavaDay*(1-night[j]));r+=glow[0]*m;gg+=glow[1]*m;b+=glow[2]*m}
  const a=rim[j]*.75;r+=(atm[0]-r)*a;gg+=(atm[1]-gg)*a;b+=(atm[2]-b)*a;
  const o=idx[j]*4;out[o]=r;out[o+1]=gg;out[o+2]=b;out[o+3]=255*edge[j];
 }
 view.ctx.putImageData(view.img,0,0);
 if(!view.on){view.on=true;view.el.classList.add('pd-on')}
}
function pdSize(view){
 const el=view.el,w=el.clientWidth||0,dpr=Math.min(2,Math.max(1,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 const D=Math.min(PD.maxPx,Math.round(w*dpr));
 if(D>=8&&D!==view.D){view.D=D;view.cv.width=view.cv.height=D}
}

// ---------------------------------------------------------------- collegamento ai dischi della home
function pdAttach(el,p,secs){
 if(!el||!p||!el.insertAdjacentHTML||!pdCanvasOk())return;
 let view=PD.views.get(el);
 if(!view){
  el.insertAdjacentHTML('beforeend','<canvas class="pd-globe" aria-hidden="true"></canvas>');
  const cv=el.querySelector('canvas.pd-globe');if(!cv)return;
  view={el,cv,ctx:cv.getContext('2d'),D:0};PD.views.set(el,view);
 }
 if(view.p!==p){
  view.p=p;view.tex=pdTex(p);view.on=false;el.classList.remove('pd-on');
  const T=view.tex.T;view.atm=pdHex(T.atm);view.glow=pdHex(T.glow);
  view.phase=(typeof mpHash==='function'?mpHash((p.name||'').length*7+secs):.3);
 }
 view.secs=Math.max(20,secs||60);view.calm=typeof mpReduced==='function'&&mpReduced();
 view.D=0;pdSize(view);
 if(view.tex.ready)pdRender(view,performance.now()/1000);
 pdLoop();
}
function pdVisible(){
 if(typeof document!=='undefined'&&document.hidden)return false;
 if(typeof state!=='undefined'&&state!=='map'&&state!=='brief')return false;
 const s=typeof $==='function'&&$('mapScreen');return!s||!s.classList||s.classList.contains('active');
}
function pdFrame(now){
 PD.raf=0;
 const t=now/1000;
 if(pdVisible()){
  // mappe da costruire: prima quella del pianeta nel pannello
  const prev=PD.views.get(typeof $==='function'&&$('previewPlanet'));
  const todo=[...PD.tex.values()].filter(g=>!g.ready&&!g.remote).sort((a,b)=>(prev&&b===prev.tex)-(prev&&a===prev.tex));
  if(todo.length){const g=todo[0];if(pdTexBuild(g,PD.budget))for(const v of PD.views.values())if(v.tex===g)pdRender(v,t)}
  if(now-PD.last>=1000/PD.fps){
   PD.last=now;
   const resize=now-PD.lastSize>1000;if(resize)PD.lastSize=now;
   for(const [el,v] of PD.views){
    if(!el.isConnected){PD.views.delete(el);continue}
    if(resize)pdSize(v);
    if(!v.calm||!v.on)pdRender(v,t);
   }
  }
 }
 pdLoop();
}
function pdLoop(){if(!PD.raf&&typeof requestAnimationFrame==='function')PD.raf=requestAnimationFrame(pdFrame)}

if(typeof mpSpin==='function'){
 const pdOrigSpin=mpSpin;
 mpSpin=function(el,p,secs){pdOrigSpin(el,p,secs);pdAttach(el,p,secs)};
 if(typeof initMap==='function')initMap();
 if(typeof planets!=='undefined'&&typeof selected==='number'&&typeof $==='function')pdAttach($('previewPlanet'),planets[selected],typeof MP!=='undefined'?MP.previewSpin:70);
}
