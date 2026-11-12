// Frontiera Stellare — PIANETA DI DESTINAZIONE (fase spaziale)
// Disegna il pianeta come una sfera dettagliata generata al momento: continenti, mari, montagne,
// nuvole e luce. Ogni missione usa un seme nuovo, quindi i continenti cambiano ogni volta.
// L'immagine si costruisce un po' per volta (pochi millisecondi per fotogramma) mentre il pianeta
// è ancora lontano; finché non è pronta resta il disegno originale.
// Se il browser non ha un canvas fuori schermo (come nei test) si usa il disegno originale.

const plOrig={drawWorld};
let plCache=null;

// Tavolozze per tema: ogni voce è [altezza, colore]; sotto "sea" è acqua.
const PL_THEMES={
 mare:{sea:.56,water:['#06264a','#0d4f86','#2a8fc4'],land:[[0,'#d8c99a'],[.03,'#4f8f45'],[.18,'#2f6b34'],[.32,'#6d6a4a'],[.42,'#8f8a7c'],[.5,'#f2f5f7']],clouds:.54,cloudAmt:.85,ice:.9,atm:[110,200,255]},
 deserto:{sea:.18,water:['#3d4b52','#5b6d6a','#8a9a8a'],land:[[0,'#e8d3a0'],[.08,'#d9a957'],[.25,'#c4843a'],[.42,'#9a5a2c'],[.58,'#6e3e22'],[.75,'#d9b98a']],clouds:.7,cloudAmt:.25,ice:2,atm:[255,200,120],dunes:true},
 tempesta:{gas:true,bands:['#2c2058','#5a46a8','#8f7ce0','#c9b8ff','#6a4fb8','#3a2a78','#a48ef0'],clouds:.66,cloudAmt:.35,ice:2,atm:[170,140,255]},
 foresta:{sea:.46,water:['#0b2f3a','#11566a','#2f8f8a'],land:[[0,'#8fae5a'],[.04,'#3f7f2c'],[.14,'#24561f'],[.3,'#1b4318'],[.45,'#4d5a3a'],[.56,'#c8d0c0']],clouds:.57,cloudAmt:.75,ice:.93,atm:[150,240,170]},
 lava:{lava:true,sea:.37,clouds:.75,cloudAmt:.35,ice:2,atm:[255,110,60]}
};

// ---------------------------------------------------------------- rumore 3D
function plNoise(seed){
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
 return{n3,fbm,rnd};
}
const plHex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function plRamp(stops,t){
 if(t<=stops[0][0])return stops[0][1];
 for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){const [a,ca]=stops[i-1],[b,cb]=stops[i],k=(t-a)/(b-a);return[ca[0]+(cb[0]-ca[0])*k,ca[1]+(cb[1]-ca[1])*k,ca[2]+(cb[2]-ca[2])*k]}
 return stops[stops.length-1][1];
}

// ---------------------------------------------------------------- costruzione progressiva
function plStart(p){
 let canvas=null;
 try{canvas=document.createElement('canvas');if(!canvas||!canvas.getContext)return null;const c=canvas.getContext('2d');if(!c||!c.createImageData||!c.putImageData)return null}catch(e){return null}
 const S=Math.min(2048,Math.max(768,Math.round(plDpr()*2*(430+p.difficulty*18)*1.05)));
 canvas.width=canvas.height=S;const c=canvas.getContext('2d'),img=c.createImageData(S,S);
 const seed=(Math.random()*4294967296)>>>0,N=plNoise(seed),T=PL_THEMES[p.theme]||PL_THEMES.mare;
 const land=T.land?T.land.map(([h,col])=>[h,plHex(col)]):null,water=T.water?T.water.map(plHex):null,bands=T.bands?T.bands.map(plHex):null;
 // rotazione casuale della sfera: continenti in posizioni diverse ogni missione
 const ra=N.rnd()*Math.PI*2,rb=(N.rnd()-.5)*1.2,ca=Math.cos(ra),sa=Math.sin(ra),cb=Math.cos(rb),sb=Math.sin(rb);
 const off=[N.rnd()*50,N.rnd()*50,N.rnd()*50],coff=[N.rnd()*50+70,N.rnd()*50,N.rnd()*50];
 const storm=bands?{y:(N.rnd()-.5)*.9,x:(N.rnd()-.5)*.8,r:.12+N.rnd()*.08}:null;
 const L=[-.55,-.6,.58],ln=Math.hypot(...L);L[0]/=ln;L[1]/=ln;L[2]/=ln;
 const Hv=[L[0],L[1],L[2]+1],hn=Math.hypot(...Hv);Hv[0]/=hn;Hv[1]/=hn;Hv[2]/=hn;
 return{p,seed,canvas,c,img,S,row:0,ready:false,N,T,land,water,bands,ca,sa,cb,sb,off,coff,storm,L,Hv};
}
function plDpr(){return Math.min(2,Math.max(1,(typeof devicePixelRatio==='number'?devicePixelRatio:1)))}

function plBuildRows(g,budgetMs){
 const t0=performance.now(),{S,img,N,T,land,water,bands,ca,sa,cb,sb,off,coff,storm,L,Hv}=g,d=img.data,R=S/2,atm=T.atm;
 while(g.row<S){
  const y=g.row,ny=(y+.5-R)/R;
  for(let x=0;x<S;x++){
   const nx=(x+.5-R)/R,q=nx*nx+ny*ny,i=(y*S+x)*4;
   if(q>1){d[i+3]=0;g.prevH=undefined;continue}
   const nz=Math.sqrt(1-q);
   // punto sulla sfera ruotato (posizione dei continenti)
   let px=nx*ca+nz*sa,pz=-nx*sa+nz*ca,py=ny;const py2=py*cb-pz*sb;pz=py*sb+pz*cb;py=py2;
   const lat=Math.abs(py);
   let r,gC,b,water_=false,emit=0;
   if(bands){
    // gigante gassoso: fasce di latitudine deformate da turbolenza, con una tempesta ovale
    const warp=N.fbm(px*2.2+off[0],py*2.2+off[1],pz*2.2+off[2],5);
    let v=py*7+warp*2.2;const ds=storm?Math.hypot((nx-storm.x)*.75,ny-storm.y)/storm.r:9;
    if(ds<1.6){const a=Math.atan2(ny-storm.y,nx-storm.x)+(1.6-ds)*2.2;v+=Math.sin(a)*(1.6-ds)*.5}
    const f=((v%bands.length)+bands.length)%bands.length,k=Math.floor(f),t=f-k,c0=bands[k],c1=bands[(k+1)%bands.length],s=t*t*(3-2*t);
    r=c0[0]+(c1[0]-c0[0])*s;gC=c0[1]+(c1[1]-c0[1])*s;b=c0[2]+(c1[2]-c0[2])*s;
    if(ds<1){const m=(1-ds)*.6;r+=(235-r)*m;gC+=(150-gC)*m;b+=(120-b)*m}
   }else{
    const h=N.fbm(px*1.7+off[0],py*1.7+off[1],pz*1.7+off[2],9);g.lastH=h;
    if(T.lava){
     // crosta di basalto con crepe di lava incandescente
     const cr=1-Math.abs(N.fbm(px*3+off[1],py*3+off[2],pz*3+off[0],5)*2-1),glow=Math.max(0,(cr-.9)/.1)**1.5;
     const base=28+h*50;r=base+12;gC=base*.8;b=base*.75;
     if(h<T.sea){const m=Math.min(1,(T.sea-h)/.05);r+=(255-r)*m*.9;gC+=(120-gC)*m*.8;b+=(30-b)*m*.6;emit=m*.9}
     if(glow>0){r+=(255-r)*glow;gC+=(150-gC)*glow*.9;b+=(40-b)*glow*.5;emit=Math.max(emit,glow)}
    }else if(h<T.sea){
     water_=true;const k=Math.max(0,Math.min(1,(h-(T.sea-.22))/.22)),c0=k<.5?water[0]:water[1],c1=k<.5?water[1]:water[2],t=k<.5?k*2:(k-.5)*2;
     r=c0[0]+(c1[0]-c0[0])*t;gC=c0[1]+(c1[1]-c0[1])*t;b=c0[2]+(c1[2]-c0[2])*t;
    }else{
     const e=(h-T.sea)/(1-T.sea),c=plRamp(land,e*1.6);r=c[0];gC=c[1];b=c[2];
     // rilievo: luce radente calcolata dalla pendenza rispetto al pixel precedente
     const sl=Math.max(-.35,Math.min(.35,(h-(g.prevH??h))*S*.9));r*=1-sl;gC*=1-sl;b*=1-sl;
     const det=N.n3(px*22+off[2],py*22,pz*22)*.16-.08;r*=1+det;gC*=1+det;b*=1+det;
     if(T.dunes){const du=Math.sin((px*40+py*12+N.n3(px*6,py*6,pz*6)*6))*.06;r*=1+du;gC*=1+du;b*=1+du}
    }
    // calotte polari
    const ice=lat+N.n3(px*5,py*5,pz*5)*.12;
    if(ice>T.ice){const m=Math.min(1,(ice-T.ice)/.05);r+=(238-r)*m;gC+=(244-gC)*m;b+=(250-b)*m;water_=false}
   }
   // nuvole
   let cl=N.fbm(px*2.6+coff[0],py*4+coff[1],pz*2.6+coff[2],5);cl=Math.max(0,Math.min(1,(cl-T.clouds)/.18))*T.cloudAmt;
   if(cl>0){const cc=T.lava?[90,70,64]:[245,248,252],m=Math.min(.92,cl);r+=(cc[0]-r)*m;gC+=(cc[1]-gC)*m;b+=(cc[2]-b)*m;water_=water_&&m<.4;emit*=1-m}
   // luce: giorno/notte, riflesso sul mare, bordo atmosferico
   const dl=nx*L[0]+ny*L[1]+nz*L[2],day=Math.max(0,Math.min(1,dl*1.5+.12)),light=.035+.965*day*(0.7+.3*dl);
   r*=light;gC*=light;b*=light;
   if(water_&&dl>0){const sp=Math.pow(Math.max(0,nx*Hv[0]+ny*Hv[1]+nz*Hv[2]),60)*.85*day;r+=255*sp;gC+=245*sp;b+=225*sp}
   if(emit>0){const e=emit*(1-day*.55);r+=255*e*.55;gC+=110*e*.55;b+=35*e*.4}
   const rim=Math.pow(1-nz,2.6)*(.25+.75*day);r+=(atm[0]-r)*rim*.7;gC+=(atm[1]-gC)*rim*.7;b+=(atm[2]-b)*rim*.7;
   const edge=Math.min(1,(1-Math.sqrt(q))*R/1.2);
   if(!bands)g.prevH=g.lastH;
   d[i]=r>255?255:r;d[i+1]=gC>255?255:gC;d[i+2]=b>255?255:b;d[i+3]=255*edge;
  }
  g.row++;
  if(performance.now()-t0>budgetMs)break;
 }
 if(g.row>=S){g.c.putImageData(img,0,0);g.ready=true;g.img=null}
}

// Disegno: alone atmosferico nel colore del tema, anelli (se c'erano), sfera dettagliata.
function plDraw(w,g){
 const {x,y,r}=w,atm=g.T.atm;ctx.save();ctx.translate(x,y);
 const a=ctx.createRadialGradient(0,0,r*.97,0,0,r*1.2);
 a.addColorStop(0,`rgba(${atm[0]},${atm[1]},${atm[2]},0)`);a.addColorStop(.2,`rgba(${atm[0]},${atm[1]},${atm[2]},.32)`);a.addColorStop(.5,`rgba(${atm[0]},${atm[1]},${atm[2]},.1)`);a.addColorStop(1,`rgba(${atm[0]},${atm[1]},${atm[2]},0)`);
 ctx.fillStyle=a;ctx.beginPath();ctx.arc(0,0,r*1.2,0,Math.PI*2);ctx.fill();
 const ring=(s,e)=>{for(let band=0;band<3;band++){ctx.strokeStyle=['rgba(159,182,203,.34)','rgba(216,207,183,.42)','rgba(142,167,191,.22)'][band];ctx.lineWidth=r*(band===1?.022:.012);ctx.beginPath();ctx.ellipse(0,0,r*(1.43+band*.05),r*(.34+band*.012),-.18,s,e);ctx.stroke()}};
 // 2026-11-12 (Fabio): niente anelli stile Saturno intorno ai pianeti
 const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=true;ctx.drawImage(g.canvas,-r,-r,r*2,r*2);ctx.imageSmoothingEnabled=sm;
 ctx.strokeStyle=`rgba(${atm[0]},${atm[1]},${atm[2]},.45)`;ctx.lineWidth=Math.max(1,r*.009);ctx.beginPath();ctx.arc(0,0,r*1.005,Math.PI*.92,Math.PI*1.8);ctx.stroke();
 ctx.restore();
}

drawWorld=function(w){
 // un pianeta nuovo per ogni missione (il gioco crea un nuovo oggetto world a ogni partenza)
 if(typeof world!=='undefined'&&world&&(!plCache||plCache.mission!==world)){plCache=plStart(world.p);if(plCache)plCache.mission=world}
 if(!plCache||plCache.p!==w.p)return plOrig.drawWorld(w);
 if(!plCache.ready)plBuildRows(plCache,state==='orbit'?40:8);
 if(!plCache.ready)return plOrig.drawWorld(w);
 plDraw(w,plCache);
};
