// Conex — VIDEO DELLA BATTAGLIA FINALE, VIDEO DELLA LIBERAZIONE e NUOVA CAMPAGNA (2026-11-12, chiesto da Fabio).
// 1) Quando si sceglie OMEGA (ultima missione) parte un piccolo video: dai pianeti liberati decollano le navi
//    dell'Impero in fuga e vanno tutte verso OMEGA; poi compare la scritta BATTAGLIA FINALE. Una volta per partita
//    (si può saltare con SALTA, Esc, Invio o clic).
// 2) Sconfitto IMPERATORE OMEGA, tornando alla home parte il video riassuntivo: un pianeta dopo l'altro, la flotta
//    distrutta, il boss abbattuto e la colonia liberata, poi la caduta di OMEGA e la galassia libera,
//    con la musica della storia (Last Light From The Cockpit, MUS_TRACKS.storia di storia.js).
// 3) Alla fine del video i pianeti tornano tutti da liberare (OMEGA di nuovo bloccato) e la campagna riparte
//    più difficile: il ciclo N (×2, ×3… di classifica-personale.js) fa crescere salute e danni dei nemici
//    (bilancio.js). Restano pilota, crediti, potenziamenti (permanenti), vite e record.
//    Se il gioco era già finito prima di questo aggiornamento (pianeti tutti liberi), succede all'avvio.
// Tutto disegnato su un canvas proprio, senza shadowBlur né filter (regole dei PC lenti); il testo del canvas
// passa da i18n.js (fillText tradotto). Va caricato dopo mappa.js, classifica-personale.js, pianeti-dettaglio.js,
// navi-in-fuga.js, storia.js e bilancio.js.

const FIN={on:'',t:0,last:0,raf:0,fine:null,cv:null,g:null,W:0,H:0,dpr:1,stelle:null,viste:new Map(),fx:[],navi:[],
 introDur:10.5,dati:null,attesa:false,controllo:0};

// ---------------------------------------------------------------- utilità
function finEl(id){return typeof document!=='undefined'&&document.getElementById?document.getElementById(id):null}
function finBase(){return planets.filter(p=>!p.final)}
function finOmega(){return typeof FINAL_PLANET!=='undefined'?FINAL_PLANET:planets.find(p=>p.final)}
function finEase(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function finCl(x){return Math.max(0,Math.min(1,x))}
function finRnd(s){const x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function finBoss(p){try{return typeof pfBossInfo==='function'?pfBossInfo(p).name:'BOSS'}catch(e){return 'BOSS'}}
function finNome(){try{return(typeof recName==='function'&&recName())||''}catch(e){return ''}}
function finCiclo(){try{return typeof cpCicloLoad==='function'?cpCicloLoad().n:1}catch(e){return 1}}
function finHex(h,a){const n=parseInt(String(h||'#888888').slice(1,7),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}

// ---------------------------------------------------------------- schermo del video
function finBuild(){
 if(FIN.cv||typeof document==='undefined'||!document.createElement||!document.body)return !!FIN.cv;
 if(!finEl('finCss')&&document.head){const s=document.createElement('style');s.id='finCss';s.textContent=FIN_CSS;document.head.appendChild(s)}
 const o=document.createElement('section');o.id='finCinema';o.className='fin-cinema hidden';o.setAttribute('aria-label','VIDEO');
 o.innerHTML='<canvas class="fin-cv"></canvas><button id="finSalta" class="fin-salta" type="button">SALTA</button>'+
  '<button id="finContinua" class="fin-continua hidden" type="button">CONTINUA</button>';
 document.body.appendChild(o);
 FIN.cv=o.querySelector('canvas');FIN.g=FIN.cv&&FIN.cv.getContext?FIN.cv.getContext('2d'):null;
 const sk=finEl('finSalta');if(sk)sk.onclick=()=>finChiudi();
 const co=finEl('finContinua');if(co)co.onclick=()=>finChiudi();
 o.addEventListener('click',e=>{if(e.target===FIN.cv&&FIN.on==='intro')finChiudi()});
 addEventListener('keydown',e=>{
  if(!FIN.on)return;
  if(e.code==='Escape'||e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();if(FIN.on==='intro'||FIN.attesa||e.code==='Escape')finChiudi()}
 },true);
 addEventListener('resize',()=>{if(FIN.on)finSize()});
 if(typeof i18nWalk==='function')try{i18nWalk(o)}catch(e){}
 return !!FIN.g;
}
function finSize(){
 const dpr=Math.min(2,Math.max(1,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 let W=innerWidth||1280,H=innerHeight||720,k=dpr;
 if(W*H*k*k>4.2e6)k=Math.sqrt(4.2e6/(W*H));
 FIN.W=W;FIN.H=H;FIN.dpr=k;FIN.cv.width=Math.round(W*k);FIN.cv.height=Math.round(H*k);
 FIN.stelle=null;
}
// cielo stellato disegnato una volta sola
function finCielo(){
 if(FIN.stelle)return FIN.stelle;
 const c=document.createElement('canvas');c.width=FIN.cv.width;c.height=FIN.cv.height;
 const g=c.getContext('2d'),W=c.width,H=c.height;
 g.fillStyle='#02040a';g.fillRect(0,0,W,H);
 for(const [x,y,r,col] of [[.2,.3,.55,'40,60,140'],[.78,.22,.45,'120,20,60'],[.55,.8,.5,'20,90,110']]){
  const n=g.createRadialGradient(W*x,H*y,0,W*x,H*y,Math.max(W,H)*r);n.addColorStop(0,`rgba(${col},.22)`);n.addColorStop(1,`rgba(${col},0)`);g.fillStyle=n;g.fillRect(0,0,W,H);
 }
 for(let i=0;i<Math.round(W*H/2600);i++){
  const a=finRnd(i*3.1),b=finRnd(i*7.7),s=finRnd(i*1.3);
  g.fillStyle=`rgba(${200+55*s|0},${210+45*b|0},255,${.25+.7*s*s})`;
  const r=(s>.97?1.6:s>.85?1.1:.7)*FIN.dpr;g.fillRect(a*W,b*H,r,r);
 }
 FIN.stelle=c;return c;
}

// ---------------------------------------------------------------- pianeti (le sfere vere della home, se pronte)
function finVista(p,D){
 let v=FIN.viste.get(p);
 if(!v){
  const cv=document.createElement('canvas');
  v={p,cv,ctx:cv.getContext('2d'),D:0,el:{classList:{add(){},remove(){}}},on:false,secs:40,calm:false,phase:finRnd(p.name.length)*.8,t:-1};
  try{if(typeof pdTex==='function'&&typeof pdHex==='function'){v.tex=pdTex(p);v.atm=pdHex(v.tex.T.atm);v.glow=pdHex(v.tex.T.glow)}}catch(e){v.tex=null}
  FIN.viste.set(p,v);
 }
 D=Math.max(16,Math.min(360,Math.round(D)));
 if(v.D!==D){v.D=D;v.cv.width=v.cv.height=D;v.lut=null;v.lutD=0}
 return v;
}
function finPianeta(g,p,x,y,r,now,o={}){
 const k=FIN.dpr,R=r*k,X=x*k,Y=y*k;
 // alone
 const atm=o.colore||p.glow||p.color;
 const a=g.createRadialGradient(X,Y,R*.9,X,Y,R*(o.alone||1.45));a.addColorStop(0,finHex(atm,o.liberato?.5:.38));a.addColorStop(1,finHex(atm,0));
 g.fillStyle=a;g.beginPath();g.arc(X,Y,R*(o.alone||1.45),0,6.283);g.fill();
 let ok=false;
 try{
  const v=finVista(p,R*2);
  if(v.tex&&v.tex.ready&&typeof pdRender==='function'){
   if(now-v.t>1/15||v.t<0){pdRender(v,now);v.t=now}
   g.drawImage(v.cv,X-R,Y-R,R*2,R*2);ok=true;
  }
 }catch(e){}
 if(!ok){
  const s=g.createRadialGradient(X-R*.35,Y-R*.4,R*.1,X,Y,R);
  s.addColorStop(0,finHex(p.glow||p.color,1));s.addColorStop(.55,finHex(p.color,1));s.addColorStop(1,'rgba(2,6,14,1)');
  g.fillStyle=s;g.beginPath();g.arc(X,Y,R,0,6.283);g.fill();
 }
 if(o.liberato){
  g.save();g.globalCompositeOperation='lighter';
  const L=g.createRadialGradient(X,Y,R*.95,X,Y,R*1.3);L.addColorStop(0,`rgba(90,255,160,${.45*o.liberato})`);L.addColorStop(1,'rgba(90,255,160,0)');
  g.fillStyle=L;g.beginPath();g.arc(X,Y,R*1.3,0,6.283);g.fill();g.restore();
 }
}

// ---------------------------------------------------------------- navi, esplosioni e testi
function finNave(g,x,y,ang,s,alpha,amica){
 const k=FIN.dpr;
 g.save();g.globalAlpha=alpha;g.translate(x*k,y*k);g.rotate(ang);g.scale(s*k,s*k);
 g.globalCompositeOperation='lighter';
 for(const py of [-4,4]){
  const len=24+Math.random()*8,f=g.createLinearGradient(-20,0,-20-len,0);
  f.addColorStop(0,amica?'rgba(220,250,255,.95)':'rgba(255,240,220,.95)');f.addColorStop(.3,amica?'rgba(90,200,255,.7)':'rgba(255,110,90,.75)');f.addColorStop(1,'rgba(255,40,70,0)');
  g.fillStyle=f;g.beginPath();g.moveTo(-19,py-2.5);g.lineTo(-20-len,py);g.lineTo(-19,py+2.5);g.closePath();g.fill();
 }
 g.globalCompositeOperation='source-over';
 const sp=!amica&&typeof nfGetSprite==='function'?nfGetSprite():null;
 if(sp)g.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);
 else{
  g.fillStyle=amica?'#2a6f9a':'#b83a4c';g.strokeStyle=amica?'#9feaff':'#ff8a96';g.lineWidth=1.2;
  g.beginPath();g.moveTo(26,0);g.lineTo(-6,-10);g.lineTo(-20,-7);g.lineTo(-15,0);g.lineTo(-20,7);g.lineTo(-6,10);g.closePath();g.fill();g.stroke();
  g.fillStyle=amica?'#d8fbff':'#ffd0d6';g.beginPath();g.ellipse(6,0,6,2.6,0,0,6.283);g.fill();
 }
 g.restore();
}
function finBoom(x,y,s,col){
 FIN.fx.push({x,y,s,t:0,d:.9+Math.random()*.5,col:col||'255,170,80'});
 for(let i=0;i<10;i++){const a=Math.random()*6.283,v=(60+Math.random()*180)*s;FIN.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,d:.6+Math.random()*.6,sc:true,col:Math.random()<.5?'255,220,150':'255,120,60'})}
 if(typeof sfx==='function'&&s>.7)try{sfx('boom',Math.min(2,s))}catch(e){}
}
function finFx(g,dt){
 const k=FIN.dpr;
 g.save();g.globalCompositeOperation='lighter';
 for(const f of FIN.fx){
  f.t+=dt;const u=f.t/f.d;if(u>=1)continue;
  if(f.sc){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=1-dt*1.5;f.vy*=1-dt*1.5;g.fillStyle=`rgba(${f.col},${1-u})`;g.fillRect(f.x*k-1.5*k,f.y*k-1.5*k,3*k,3*k);continue}
  const r=(14+70*Math.sqrt(u))*f.s*k,gr=g.createRadialGradient(f.x*k,f.y*k,0,f.x*k,f.y*k,r);
  gr.addColorStop(0,`rgba(255,255,235,${(1-u)*.95})`);gr.addColorStop(.35,`rgba(${f.col},${(1-u)*.7})`);gr.addColorStop(1,`rgba(${f.col},0)`);
  g.fillStyle=gr;g.fillRect(f.x*k-r,f.y*k-r,r*2,r*2);
 }
 g.restore();
 FIN.fx=FIN.fx.filter(f=>f.t<f.d);
}
// testo con alone (alone fatto con copie trasparenti, niente shadowBlur)
function finTesto(g,txt,x,y,size,col,alpha,o={}){
 if(!(alpha>0))return;
 const k=FIN.dpr;
 g.save();g.globalAlpha=Math.min(1,alpha);g.textAlign=o.align||'center';g.textBaseline='middle';
 g.font=`${o.peso||700} ${Math.round(size*k)}px "Chakra Petch","Segoe UI",sans-serif`;
 if('letterSpacing' in g)g.letterSpacing=Math.round((o.spazio??size*.18)*k)+'px';
 if(o.alone){
  g.globalCompositeOperation='lighter';g.fillStyle=o.alone;
  for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],[-3,-3],[3,3]])g.fillText(txt,x*k+dx*k,y*k+dy*k);
  g.globalCompositeOperation='source-over';
 }
 g.fillStyle=col;g.fillText(txt,x*k,y*k);
 g.restore();
}
function finFasce(g,a){
 // bande nere da cinema
 const k=FIN.dpr,h=FIN.H*.09*a*k;
 g.fillStyle='#000';g.fillRect(0,0,FIN.cv.width,h);g.fillRect(0,FIN.cv.height-h,FIN.cv.width,h);
}

// ---------------------------------------------------------------- 1) video della battaglia finale (OMEGA)
function finIntroPrepara(){
 const W=FIN.W,H=FIN.H,base=finBase(),om=finOmega();
 FIN.navi=[];FIN.fx=[];
 const ox=W*.8,oy=H*.3;
 FIN.dati={ox,oy,or:Math.min(W,H)*.13,pos:base.map((p,i)=>({p,x:W*(.12+.115*i),y:H*(.6+.1*Math.sin(i*1.5+.4)),r:Math.min(W,H)*(.045+.004*i)})),om};
 let n=0;
 for(const [i,P] of FIN.dati.pos.entries())for(let j=0;j<6;j++){
  const s=n++,start=.7+i*.38+j*.22+finRnd(s)*.2,dur=3.6+finRnd(s+9)*1.2;
  const mx=(P.x+ox)/2+(finRnd(s+3)-.5)*W*.25,my=Math.min(P.y,oy)-H*(.08+finRnd(s+5)*.25);
  FIN.navi.push({P,start,dur,mx,my,s:.9+finRnd(s+7)*.4,arr:false});
 }
}
function finIntroDisegna(g,t,dt){
 const D=FIN.dati,W=FIN.W,H=FIN.H,k=FIN.dpr,now=t;
 // la telecamera si avvicina piano a OMEGA
 const z=1+.1*finEase((t-1)/8),cx=D.ox,cy=D.oy;
 g.setTransform(1,0,0,1,0,0);g.drawImage(finCielo(),0,0);
 g.save();g.translate(cx*k,cy*k);g.scale(z,z);g.translate(-cx*k,-cy*k);
 // OMEGA: pianeta cremisi con alone che pulsa quando arrivano le navi
 const arrivate=FIN.navi.filter(n=>n.arr).length,pulse=.5+.5*Math.sin(t*3);
 g.save();g.globalCompositeOperation='lighter';
 const h=g.createRadialGradient(cx*k,cy*k,D.or*.8*k,cx*k,cy*k,D.or*(2.1+.25*pulse)*k);h.addColorStop(0,`rgba(255,40,90,${.25+arrivate*.006})`);h.addColorStop(1,'rgba(255,40,90,0)');
 g.fillStyle=h;g.fillRect(0,0,FIN.cv.width,FIN.cv.height);g.restore();
 finPianeta(g,D.om,cx,cy,D.or,now,{alone:1.6});
 finTesto(g,'OMEGA',cx,cy+D.or+26,15,'#ffb0c4',finCl((t-.5)*2),{alone:'rgba(255,40,90,.25)'});
 // pianeti liberati con le navi che decollano
 for(const P of D.pos){
  finPianeta(g,P.p,P.x,P.y,P.r,now,{liberato:.7});
  finTesto(g,P.p.name,P.x,P.y+P.r+16,11,'#bfffd8',finCl((t-.3)*2));
  finTesto(g,'LIBERATO',P.x,P.y+P.r+30,8,'#5dff9a',finCl((t-.6)*2),{spazio:3});
 }
 // navi in fuga lungo una curva verso OMEGA
 for(const n of FIN.navi){
  const u=(t-n.start)/n.dur;if(u<0)continue;
  if(u>=1){if(!n.arr){n.arr=true;finBoom(cx+(Math.random()-.5)*D.or*.6,cy+(Math.random()-.5)*D.or*.6,.25,'255,60,110')}continue}
  const e=finEase(u),a=1-e,x=a*a*n.P.x+2*a*e*n.mx+e*e*cx,y=a*a*n.P.y+2*a*e*n.my+e*e*cy;
  const tx=2*a*(n.mx-n.P.x)+2*e*(cx-n.mx),ty=2*a*(n.my-n.P.y)+2*e*(cy-n.my);
  finNave(g,x,y,Math.atan2(ty,tx),n.s*(1-.65*e)*.7,Math.min(1,u*6)*(1-finCl((u-.92)*12)),false);
 }
 finFx(g,dt);
 g.restore();
 finFasce(g,finCl(t*1.5));
 // testi
 const a1=finCl((t-.4)*2)*(1-finCl((t-3.6)*2.5));
 finTesto(g,'LE FLOTTE DELL’IMPERO FUGGONO DAI PIANETI LIBERATI',W/2,H*.15,Math.min(22,W*.024),'#d8e8ff',a1);
 const a2=finCl((t-3.8)*2)*(1-finCl((t-6.4)*2.5));
 finTesto(g,'TUTTE LE NAVI SI RITIRANO VERSO OMEGA',W/2,H*.15,Math.min(22,W*.024),'#ffc2d0',a2);
 if(t>6.2){
  const u=finCl((t-6.2)/1.1),sc=1.6-.6*finEase(u),fade=1-finCl((t-FIN.introDur+.7)*1.6);
  g.fillStyle=`rgba(0,0,0,${.55*u*fade})`;g.fillRect(0,0,FIN.cv.width,FIN.cv.height);
  finTesto(g,'BATTAGLIA FINALE',W/2,H*.5,Math.min(78,W*.075)*sc,'#fff1f4',u*fade,{alone:'rgba(255,40,90,.35)',spazio:Math.min(78,W*.075)*.22*(2-u)});
  finTesto(g,'CITTADELLA OMEGA · IMPERATORE OMEGA',W/2,H*.5+Math.min(60,W*.06),Math.min(16,W*.018),'#ff9ab2',finCl((t-7.2)*2)*fade);
 }
 // dissolvenza in apertura e chiusura
 const nero=Math.max(1-finCl(t*1.6),finCl((t-FIN.introDur+.5)*2));
 if(nero>0){g.fillStyle=`rgba(0,0,0,${nero})`;g.fillRect(0,0,FIN.cv.width,FIN.cv.height)}
 return t>=FIN.introDur;
}

// ---------------------------------------------------------------- 2) video della liberazione della galassia
const FIN_SCENA={titolo:4.5,pianeta:4.6,omega:6,galassia:7.5,grazie:7};
function finFinalePrepara(){
 const base=finBase(),sc=[{tipo:'titolo',d:FIN_SCENA.titolo}];
 for(const p of base)sc.push({tipo:'pianeta',p,d:FIN_SCENA.pianeta});
 sc.push({tipo:'omega',p:finOmega(),d:FIN_SCENA.omega},{tipo:'galassia',d:FIN_SCENA.galassia},{tipo:'grazie',d:FIN_SCENA.grazie});
 let t0=0;for(const s of sc){s.t0=t0;t0+=s.d}
 let punti=0;try{punti=parseInt(localStorage.getItem('stellarFinalePunti'),10)||0}catch(e){}
 FIN.dati={sc,tot:t0,punti,nome:finNome(),ciclo:finCiclo(),fatte:new Set()};
 FIN.fx=[];FIN.navi=[];
}
function finScena(t){const D=FIN.dati;let s=D.sc[0];for(const x of D.sc)if(t>=x.t0)s=x;return s}
function finFinaleDisegna(g,t,dt){
 const D=FIN.dati,W=FIN.W,H=FIN.H,k=FIN.dpr,s=finScena(t),u=t-s.t0,m=Math.min(W,H);
 g.setTransform(1,0,0,1,0,0);g.drawImage(finCielo(),0,0);
 const key=D.sc.indexOf(s);
 if(s.tipo==='titolo'){
  finTesto(g,'CRONACA DELLA CAMPAGNA',W/2,H*.38,Math.min(16,W*.018),'#9feaff',finCl(u-.3)*(1-finCl((u-s.d+.6)*2)));
  finTesto(g,'LA LIBERAZIONE DELLA GALASSIA',W/2,H*.5,Math.min(54,W*.05),'#ffffff',finCl((u-.6)*1.2)*(1-finCl((u-s.d+.6)*2)),{alone:'rgba(80,200,255,.3)'});
  if(D.nome)finTesto(g,'PILOTA '+D.nome,W/2,H*.62,Math.min(18,W*.02),'#ffd27a',finCl((u-1.4)*1.5)*(1-finCl((u-s.d+.6)*2)));
 }
 else if(s.tipo==='pianeta'||s.tipo==='omega'){
  const omega=s.tipo==='omega',p=s.p,px=W*.34,py=H*.52,r=m*(omega?.27:.23)*(1+.05*u/s.d);
  const lib=finCl((u-(omega?3.2:2.4))*1.5);
  finPianeta(g,p,px,py,r,t,{liberato:omega?0:lib,alone:1.5});
  // la flotta nemica attorno al pianeta, distrutta un pezzo alla volta
  if(!D.fatte.has(key)){
   D.fatte.add(key);FIN.navi=[];
   for(let i=0;i<(omega?14:8);i++)FIN.navi.push({a:finRnd(key*13+i)*6.283,rr:r*(1.25+finRnd(key*7+i)*.7),v:(.25+finRnd(i+key)*.3)*(i%2?1:-1),boom:.4+finRnd(key*5+i)*(omega?2.6:1.9),morta:false,s:.55+finRnd(i*3+key)*.35});
  }
  for(const n of FIN.navi){
   if(n.morta)continue;
   const a=n.a+u*n.v,x=px+Math.cos(a)*n.rr,y=py+Math.sin(a)*n.rr*.42;
   if(u>=n.boom){n.morta=true;finBoom(x,y,.55);continue}
   finNave(g,x,y,a+(n.v>0?Math.PI/2:-Math.PI/2),n.s,finCl(u*3),false);
  }
  // il colpo decisivo: lampo e onda d'urto
  const hit=omega?3:2.2;
  if(u>=hit&&!D.fatte.has('b'+key)){D.fatte.add('b'+key);finBoom(px+r*.15,py-r*.1,omega?2.4:1.4,omega?'255,60,110':'255,170,80');for(let i=0;i<(omega?6:3);i++)finBoom(px+(Math.random()-.5)*r*1.4,py+(Math.random()-.5)*r*1.2,.9)}
  if(u>=hit&&u<hit+.9){
   // onda d'urto: un cerchio di luce che si allarga e svanisce (niente anelli che restano attorno al pianeta)
   const q=(u-hit)/.9,R=r*(1.05+q*1.8)*k;g.save();g.globalCompositeOperation='lighter';
   const w=g.createRadialGradient(px*k,py*k,R*.82,px*k,py*k,R);w.addColorStop(0,'rgba(255,230,200,0)');w.addColorStop(.7,`rgba(255,230,200,${.55*(1-q)*(1-q)})`);w.addColorStop(1,'rgba(255,230,200,0)');
   g.fillStyle=w;g.beginPath();g.arc(px*k,py*k,R,0,6.283);g.fill();g.restore();
   if(omega&&q<.4){g.fillStyle=`rgba(255,255,255,${.7*(1-q/.4)})`;g.fillRect(0,0,FIN.cv.width,FIN.cv.height)}
  }
  finFx(g,dt);
  // testi a destra
  const tx=W*.72,a=finCl((u-.3)*2)*(1-finCl((u-s.d+.5)*2.5)),sz=Math.min(46,W*.045);
  finTesto(g,omega?'OMEGA':p.name,tx,H*.36,sz,'#ffffff',a,{alone:omega?'rgba(255,40,90,.3)':'rgba(80,200,255,.25)'});
  finTesto(g,(omega?'CITTADELLA DELL’IMPERO':'COLONIA '+p.code),tx,H*.36+sz*.85,Math.min(14,W*.015),'#9fb6d0',a);
  finTesto(g,finBoss(p)+(omega?' È CADUTO':' DISTRUTTO'),tx,H*.52,Math.min(20,W*.021),omega?'#ffb0c4':'#ffd27a',finCl((u-hit)*2)*(1-finCl((u-s.d+.5)*2.5)));
  const st=finCl((u-(omega?3.6:2.8))*2.5)*(1-finCl((u-s.d+.5)*2.5));
  if(st>0){
   const sc=1+.5*(1-st);
   finTesto(g,omega?'L’IMPERO È SCONFITTO':'PIANETA LIBERATO',tx,H*.64,Math.min(30,W*.03)*sc,omega?'#ff5a7a':'#5dff9a',st,{alone:omega?'rgba(255,40,90,.3)':'rgba(60,255,140,.3)'});
  }
 }
 else if(s.tipo==='galassia'){
  // tutti i pianeti nella loro posizione della mappa, collegati dalla rotta della campagna
  const tutti=finBase().concat([finOmega()]),pts=tutti.map(p=>({p,x:W*(.08+.84*p.x/100),y:H*(.13+.6*p.y/100)}));
  const via=finCl(u/3.5);
  g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(90,255,170,.55)';g.lineWidth=2*k;g.setLineDash([8*k,6*k]);
  g.beginPath();for(let i=0;i<pts.length;i++){const q=finCl(via*(pts.length-1)-i+1);if(i===0){g.moveTo(pts[0].x*k,pts[0].y*k);continue}if(q<=0)break;const a=pts[i-1],b=pts[i];g.lineTo((a.x+(b.x-a.x)*q)*k,(a.y+(b.y-a.y)*q)*k)}
  g.stroke();g.setLineDash([]);g.restore();
  for(const [i,P] of pts.entries()){
   const on=finCl(via*(pts.length-1)-i+1);
   finPianeta(g,P.p,P.x,P.y,m*(P.p.final?.07:.05),t,{liberato:on,colore:on>.5?'#5dff9a':undefined});
   finTesto(g,P.p.name,P.x,P.y+m*(P.p.final?.07:.05)+16,11,'#bfffd8',on);
  }
  // navi della Repubblica che attraversano la galassia
  if(!D.fatte.has(key)){D.fatte.add(key);FIN.navi=[];for(let i=0;i<10;i++)FIN.navi.push({y:H*(.15+.7*finRnd(i*9)),v:120+finRnd(i*4)*160,d:finRnd(i*2)*2.5,s:.5+finRnd(i)*.4})}
  for(const n of FIN.navi){const x=-60+(u-n.d)*n.v;if(x>-60&&x<W+60)finNave(g,x,n.y+Math.sin(u+n.d)*8,0,n.s,.9,true)}
  const a=finCl((u-2.8)*1.5)*(1-finCl((u-s.d+.6)*2));
  finTesto(g,'LA GALASSIA È LIBERA',W/2,H*.78,Math.min(40,W*.04),'#ffffff',a,{alone:'rgba(60,255,140,.3)'});
  finTesto(g,'LA REPUBBLICA INTERSTELLARE RINASCE',W/2,H*.78+Math.min(34,W*.034),Math.min(15,W*.016),'#9fffc8',finCl((u-3.6)*1.5)*(1-finCl((u-s.d+.6)*2)));
 }
 else if(s.tipo==='grazie'){
  const a=finCl((u-.3)*1.5);
  finTesto(g,D.nome?'GRAZIE, PILOTA '+D.nome:'GRAZIE, PILOTA',W/2,H*.3,Math.min(40,W*.04),'#ffffff',a,{alone:'rgba(80,200,255,.3)'});
  if(D.punti>0)finTesto(g,'PUNTEGGIO DELLA CAMPAGNA '+(typeof scoreFmt==='function'?scoreFmt(D.punti):D.punti),W/2,H*.42,Math.min(20,W*.021),'#ffd27a',finCl((u-1)*1.5));
  finTesto(g,'NUOVA CAMPAGNA ×'+(D.ciclo+1),W/2,H*.56,Math.min(30,W*.032),'#ff9ab2',finCl((u-1.8)*1.5),{alone:'rgba(255,40,90,.25)'});
  finTesto(g,'L’IMPERO RICOSTRUISCE LA SUA FLOTTA: NEMICI PIÙ RESISTENTI E ARMI PIÙ POTENTI',W/2,H*.64,Math.min(14,W*.015),'#d8e8ff',finCl((u-2.4)*1.5));
  finTesto(g,'I PIANETI SONO DI NUOVO DA LIBERARE · POTENZIAMENTI E CREDITI RESTANO TUOI',W/2,H*.69,Math.min(14,W*.015),'#d8e8ff',finCl((u-2.9)*1.5));
  if(u>3.2&&!FIN.attesa){FIN.attesa=true;const b=finEl('finContinua');if(b){b.classList.remove('hidden');try{b.focus()}catch(e){}}}
 }
 finFasce(g,1);
 const nero=Math.max(1-finCl(t*1.2),s.tipo==='grazie'?0:0);
 // dissolvenza al nero tra una scena e l'altra
 const bordo=Math.min(u,s.d-u),tra=s.tipo==='grazie'&&u>s.d-.3?0:1-finCl(bordo/.35);
 const n2=Math.max(nero,tra*.9);
 if(n2>0){g.fillStyle=`rgba(0,0,0,${n2})`;g.fillRect(0,0,FIN.cv.width,FIN.cv.height)}
 return false; // finisce con CONTINUA (o SALTA)
}

// ---------------------------------------------------------------- avvio, ciclo e chiusura
function finApri(tipo,fine){
 if(!finBuild()||!FIN.g){if(fine)fine();return false}
 FIN.on=tipo;FIN.t=0;FIN.last=0;FIN.fine=fine||null;FIN.attesa=false;
 finSize();
 if(tipo==='intro')finIntroPrepara();else finFinalePrepara();
 const o=finEl('finCinema');o.classList.remove('hidden','fin-via');
 const co=finEl('finContinua');if(co)co.classList.add('hidden');
 if(typeof releaseFlightMouse==='function')try{releaseFlightMouse()}catch(e){}
 // musica: per il video finale quella della storia, dall'inizio
 if(tipo==='finale'){
  const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.storia;
  if(T&&T.els){if(mus.track===T)mus.track=null;T.cur=0;for(const el of T.els){try{el.pause();el.currentTime=0}catch(e){}}}
 }
 if(typeof musTick==='function')try{musTick()}catch(e){}
 const sk=finEl('finSalta');if(sk)try{sk.focus()}catch(e){}
 cancelAnimationFrame(FIN.raf);FIN.raf=requestAnimationFrame(finLoop);
 return true;
}
function finLoop(now){
 FIN.raf=0;if(!FIN.on)return;
 const dt=FIN.last?Math.min(.05,(now-FIN.last)/1000):1/60;FIN.last=now;FIN.t+=dt;
 let fine=false;
 try{fine=FIN.on==='intro'?finIntroDisegna(FIN.g,FIN.t,dt):finFinaleDisegna(FIN.g,FIN.t,dt)}catch(e){console.error(e);fine=true}
 if(fine){finChiudi();return}
 FIN.raf=requestAnimationFrame(finLoop);
}
function finChiudi(){
 if(!FIN.on)return;
 const tipo=FIN.on,fine=FIN.fine;
 FIN.on='';FIN.fine=null;FIN.attesa=false;cancelAnimationFrame(FIN.raf);FIN.raf=0;FIN.fx=[];FIN.navi=[];
 for(const v of FIN.viste.values()){v.cv.width=v.cv.height=1;v.D=0}
 FIN.viste.clear();FIN.stelle=null;
 const o=finEl('finCinema');
 if(o){o.classList.add('fin-via');setTimeout(()=>{if(!FIN.on){o.classList.add('hidden');o.classList.remove('fin-via')}},450)}
 if(typeof musTick==='function')try{musTick()}catch(e){}
 if(tipo==='finale')finNuovaCampagna();
 if(fine)try{fine()}catch(e){console.error(e)}
}
if(typeof musTheme==='function'){const t=musTheme;musTheme=function(){
 if(FIN.on==='finale'){const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.storia;if(!(T&&T.failed))return'storia'}
 return t.apply(this,arguments);
}}
if(typeof volumeLevel==='function'){const v=volumeLevel;volumeLevel=function(kind){
 const r=v.apply(this,arguments);
 return kind==='music'&&FIN.on==='finale'?Math.min(2,Math.max(r,.5)*2):r;
}}

// ---------------------------------------------------------------- 3) nuova campagna più difficile
function finTuttoLibero(){
 try{return localStorage.getItem('frontieraOmegaLibero')==='yes'&&finBase().every(p=>liberati().includes(p.code))}catch(e){return false}
}
function finNuovaCampagna(){
 if(localStorage.getItem('frontieraOmegaLibero')!=='yes')return false;
 for(const k of ['frontieraPhaseOneComplete','frontieraPhaseTwoComplete','frontieraPianetiLiberati','frontieraOmegaLibero'])localStorage.setItem(k,'');
 if(typeof phaseOneComplete!=='undefined')phaseOneComplete=false;
 if(typeof phaseTwoComplete!=='undefined')phaseTwoComplete=false;
 try{localStorage.removeItem('stellarSpazioVinti');localStorage.removeItem('stellarIntroOmega')}catch(e){}
 if(typeof saveClear==='function')try{saveClear()}catch(e){}
 // la partita nuova riparte da 0 punti (quella finita è già in classifica)
 if(typeof score!=='undefined'&&score>0&&!(typeof scorePending!=='undefined'&&scorePending>0)){score=0;if(typeof scoreSave==='function')scoreSave()}
 if(typeof myRunEnd==='function')try{myRunEnd()}catch(e){}
 const n=typeof cpCiclo==='function'?cpCiclo():finCiclo();   // OMEGA non è più libero: il ciclo sale (×2, ×3…)
 selected=0;
 if(typeof finalLock==='function')finalLock();
 if(typeof initMap==='function'&&finEl('starMap'))try{initMap()}catch(e){}
 if(typeof selectPlanet==='function')try{selectPlanet(typeof mapFirstPlayable==='function'?mapFirstPlayable():0)}catch(e){}
 if(typeof saveHome==='function')try{saveHome()}catch(e){}
 if(typeof profSaveNow==='function')try{profSaveNow()}catch(e){}
 if(typeof profToast==='function')setTimeout(()=>profToast('NUOVA CAMPAGNA ×'+n+' · I PIANETI SONO DI NUOVO DA LIBERARE'),300);
 return true;
}
// a OMEGA sconfitto si ricordano i punti della campagna (per il video)
if(typeof pfFinish==='function'){
 const pff=pfFinish;
 pfFinish=function(win){
  const before=state,p=typeof pf!=='undefined'&&pf&&pf.p;
  const r=pff.apply(this,arguments);
  if(state!==before&&win&&p&&p.final){
   const pts=typeof scorePending!=='undefined'&&scorePending>0?scorePending:(typeof score!=='undefined'?score:0);
   try{localStorage.setItem('stellarFinalePunti',String(Math.round(pts)))}catch(e){}
  }
  return r;
 };
}
// tornati alla home con OMEGA libero: video della liberazione, poi la nuova campagna
function finControlla(){
 if(FIN.on||typeof state==='undefined'||state!=='map')return;
 const ms=finEl('mapScreen');if(!ms||!ms.classList||!ms.classList.contains('active'))return;
 if(typeof prof!=='undefined'&&!prof)return;
 for(const id of ['resultOverlay','missionReward','profOverlay','storiaScreen','marketOverlay'])
  {const e=finEl(id);if(e&&e.classList&&!e.classList.contains('hidden'))return}
 if(!finTuttoLibero())return;
 finApri('finale');
}
if(typeof setInterval==='function'&&typeof document!=='undefined'&&document.body)setTimeout(()=>setInterval(finControlla,700),2500);

// scelta di OMEGA: prima il video della battaglia finale (una volta per partita)
if(typeof brief==='function'){
 const b=brief;
 brief=function(...a){
  const p=planets[selected];
  const ok=p&&p.final&&(typeof mapPlayable!=='function'||mapPlayable(p))&&!(typeof mapAllDone==='function'&&mapAllDone());
  let run='';try{run=typeof myRun==='function'?myRun():''}catch(e){}
  let visto='';try{visto=localStorage.getItem('stellarIntroOmega')||''}catch(e){}
  if(ok&&!FIN.on&&visto!==run+'|'+finCiclo()){
   try{localStorage.setItem('stellarIntroOmega',run+'|'+finCiclo())}catch(e){}
   if(finApri('intro',()=>b.apply(this,a)))return;
  }
  return b.apply(this,a);
 };
}

// ---------------------------------------------------------------- stile e traduzioni
const FIN_CSS=`
.fin-cinema{position:fixed;inset:0;z-index:9500;background:#000;opacity:1;transition:opacity .45s}
.fin-cinema.hidden{display:none}
.fin-cinema.fin-via{opacity:0}
.fin-cinema .fin-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:default}
.fin-cinema .fin-salta,.fin-cinema .fin-continua{position:absolute;z-index:2;font:700 12px 'Chakra Petch',sans-serif;letter-spacing:3px;cursor:pointer;
 padding:9px 18px;border:1px solid #8ce9ec88;background:linear-gradient(135deg,#0b2a3acc,#061722cc);color:#bff6ff;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}
.fin-cinema .fin-salta{right:22px;bottom:22px}
.fin-cinema .fin-salta:hover,.fin-cinema .fin-continua:hover{background:linear-gradient(135deg,#1d5a74,#0b2a3a);color:#fff}
.fin-cinema .fin-continua{left:50%;bottom:12%;transform:translateX(-50%);font-size:15px;padding:13px 34px;border-color:#5dff9a;color:#d8ffe8;background:linear-gradient(135deg,#0f4a2acc,#062214cc);animation:finPulsa 1.6s ease-in-out infinite}
.fin-cinema .fin-continua.hidden{display:none}
@keyframes finPulsa{50%{box-shadow:0 0 22px #5dff9a66}}
@media(max-width:700px){.fin-cinema .fin-salta{right:12px;bottom:12px;font-size:10px;padding:7px 12px}.fin-cinema .fin-continua{font-size:12px;padding:10px 22px}}
`;
(function(){
 if(typeof I18N_ROWS==='undefined')return;
 const rows=[
  ['SALTA','SKIP','PASSER','SALTAR','ПРОПУСТИТЬ','跳过','スキップ'],
  ['CONTINUA','CONTINUE','CONTINUER','CONTINUAR','ПРОДОЛЖИТЬ','继续','続ける'],
  ['LIBERATO','FREED','LIBÉRÉ','LIBERADO','ОСВОБОЖДЁН','已解放','解放'],
  ['LE FLOTTE DELL’IMPERO FUGGONO DAI PIANETI LIBERATI','THE EMPIRE’S FLEETS FLEE THE FREED PLANETS','LES FLOTTES DE L’EMPIRE FUIENT LES PLANÈTES LIBÉRÉES','LAS FLOTAS DEL IMPERIO HUYEN DE LOS PLANETAS LIBERADOS','ФЛОТЫ ИМПЕРИИ БЕГУТ С ОСВОБОЖДЁННЫХ ПЛАНЕТ','帝国舰队逃离已解放的星球','帝国艦隊が解放された惑星から逃げていく'],
  ['TUTTE LE NAVI SI RITIRANO VERSO OMEGA','EVERY SHIP RETREATS TOWARD OMEGA','TOUS LES VAISSEAUX SE REPLIENT VERS OMEGA','TODAS LAS NAVES SE RETIRAN HACIA OMEGA','ВСЕ КОРАБЛИ ОТСТУПАЮТ К ОМЕГЕ','所有舰船撤向欧米茄','全艦がオメガへ撤退していく'],
  ['BATTAGLIA FINALE','FINAL BATTLE','BATAILLE FINALE','BATALLA FINAL','ПОСЛЕДНЯЯ БИТВА','最终决战','最終決戦'],
  ['CITTADELLA OMEGA · IMPERATORE OMEGA','OMEGA CITADEL · EMPEROR OMEGA','CITADELLE OMEGA · EMPEREUR OMEGA','CIUDADELA OMEGA · EMPERADOR OMEGA','ЦИТАДЕЛЬ ОМЕГА · ИМПЕРАТОР ОМЕГА','欧米茄要塞 · 欧米茄皇帝','オメガ城塞 · オメガ皇帝'],
  ['CRONACA DELLA CAMPAGNA','CAMPAIGN CHRONICLE','CHRONIQUE DE LA CAMPAGNE','CRÓNICA DE LA CAMPAÑA','ХРОНИКА КАМПАНИИ','战役纪实','キャンペーンの記録'],
  ['LA LIBERAZIONE DELLA GALASSIA','THE LIBERATION OF THE GALAXY','LA LIBÉRATION DE LA GALAXIE','LA LIBERACIÓN DE LA GALAXIA','ОСВОБОЖДЕНИЕ ГАЛАКТИКИ','银河解放','銀河の解放'],
  ['CITTADELLA DELL’IMPERO','CITADEL OF THE EMPIRE','CITADELLE DE L’EMPIRE','CIUDADELA DEL IMPERIO','ЦИТАДЕЛЬ ИМПЕРИИ','帝国要塞','帝国の城塞'],
  ['PIANETA LIBERATO','PLANET FREED','PLANÈTE LIBÉRÉE','PLANETA LIBERADO','ПЛАНЕТА ОСВОБОЖДЕНА','星球已解放','惑星解放'],
  ['L’IMPERO È SCONFITTO','THE EMPIRE IS DEFEATED','L’EMPIRE EST VAINCU','EL IMPERIO HA SIDO DERROTADO','ИМПЕРИЯ ПОВЕРЖЕНА','帝国被击败了','帝国は敗れた'],
  ['LA GALASSIA È LIBERA','THE GALAXY IS FREE','LA GALAXIE EST LIBRE','LA GALAXIA ES LIBRE','ГАЛАКТИКА СВОБОДНА','银河自由了','銀河は自由になった'],
  ['LA REPUBBLICA INTERSTELLARE RINASCE','THE INTERSTELLAR REPUBLIC IS REBORN','LA RÉPUBLIQUE INTERSTELLAIRE RENAÎT','LA REPÚBLICA INTERESTELAR RENACE','МЕЖЗВЁЗДНАЯ РЕСПУБЛИКА ВОЗРОЖДАЕТСЯ','星际共和国重生','星間共和国が蘇る'],
  ['GRAZIE, PILOTA','THANK YOU, PILOT','MERCI, PILOTE','GRACIAS, PILOTO','СПАСИБО, ПИЛОТ','谢谢你，飞行员','ありがとう、パイロット'],
  ['L’IMPERO RICOSTRUISCE LA SUA FLOTTA: NEMICI PIÙ RESISTENTI E ARMI PIÙ POTENTI','THE EMPIRE REBUILDS ITS FLEET: TOUGHER ENEMIES AND STRONGER WEAPONS','L’EMPIRE RECONSTRUIT SA FLOTTE : ENNEMIS PLUS RÉSISTANTS ET ARMES PLUS PUISSANTES','EL IMPERIO RECONSTRUYE SU FLOTA: ENEMIGOS MÁS RESISTENTES Y ARMAS MÁS POTENTES','ИМПЕРИЯ ВОССТАНАВЛИВАЕТ ФЛОТ: ВРАГИ КРЕПЧЕ, ОРУЖИЕ МОЩНЕЕ','帝国重建了舰队：敌人更耐打，武器更强','帝国は艦隊を再建した：敵はより頑丈に、武器はより強力に'],
  ['PUNTEGGIO DELLA CAMPAGNA','CAMPAIGN SCORE','SCORE DE LA CAMPAGNE','PUNTUACIÓN DE LA CAMPAÑA','СЧЁТ КАМПАНИИ','战役得分','キャンペーンスコア'],
  ['NUOVA CAMPAGNA','NEW CAMPAIGN','NOUVELLE CAMPAGNE','NUEVA CAMPAÑA','НОВАЯ КАМПАНИЯ','新战役','新キャンペーン'],
  ['I PIANETI SONO DI NUOVO DA LIBERARE','THE PLANETS MUST BE FREED AGAIN','LES PLANÈTES SONT À LIBÉRER DE NOUVEAU','HAY QUE LIBERAR DE NUEVO LOS PLANETAS','ПЛАНЕТЫ СНОВА НУЖНО ОСВОБОДИТЬ','星球需要再次解放','惑星は再び解放が必要'],
  ['DISTRUTTO','DESTROYED','DÉTRUIT','DESTRUIDO','УНИЧТОЖЕН','已摧毁','撃破'],
  ['È CADUTO','HAS FALLEN','EST TOMBÉ','HA CAÍDO','ПАЛ','已陨落','は倒れた'],
  ['COLONIA','COLONY','COLONIE','COLONIA','КОЛОНИЯ','殖民地','コロニー'],
  ['PILOTA','PILOT','PILOTE','PILOTO','ПИЛОТ','飞行员','パイロット'],
  ['I PIANETI SONO DI NUOVO DA LIBERARE · POTENZIAMENTI E CREDITI RESTANO TUOI','THE PLANETS MUST BE FREED AGAIN · YOUR UPGRADES AND CREDITS STAY','LES PLANÈTES SONT À LIBÉRER DE NOUVEAU · TES AMÉLIORATIONS ET CRÉDITS RESTENT','HAY QUE LIBERAR DE NUEVO LOS PLANETAS · TUS MEJORAS Y CRÉDITOS SE QUEDAN','ПЛАНЕТЫ СНОВА НУЖНО ОСВОБОДИТЬ · УЛУЧШЕНИЯ И КРЕДИТЫ ОСТАЮТСЯ','星球需要再次解放 · 你的升级和信用点保留','惑星は再び解放が必要 · 強化とクレジットはそのまま']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function')i18nApply()}catch(e){}
})();
