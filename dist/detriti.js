// detriti.js - rottami HD dopo l'esplosione del boss a terra (battaglia.js).
// Prima i rottami erano rettangoli con il bordo arancione. Ora sono pezzi di metallo veri:
// lamiere strappate con rivetti, travi forate, tubi e ingranaggi, con luce e ombra.
// I pezzi escono roventi (bordi arancioni che si raffreddano), fanno scintille quando
// rimbalzano a terra e fumano solo finché sono caldi.
// Prestazioni PC: tutte le forme sono immagini pronte (create una volta sola),
// nessun ctx.filter o shadowBlur; per ogni pezzo al massimo 2 drawImage + 1 bagliore.
(function(){
 if(typeof battDebris!=='function'||typeof battDrawBoom!=='function'||typeof battBoom!=='function')return;
 const DET={
  sprites:24,      // varianti di forma pre-disegnate
  res:3,           // risoluzione delle immagini (pixel per unità di mondo)
  base:20,         // lato del riquadro di una forma in unità di mondo
  cool:.2,         // velocità di raffreddamento (calore perso al secondo)
  sparkMax:140,    // scintille contemporanee massime
  fade:.7          // secondi di dissolvenza a fine vita
 };
 globalThis.DET=DET;
 const old={battDebris,battDrawBoom,battBoom};
 let SPR=null,GLOW=null;

 // numeri casuali ripetibili per forme sempre uguali
 function rng(seed){let s=seed*9301+49297;return()=>{s=(s*9301+49297)%233280;return s/233280}}
 function mkCanvas(w,h){const c=document.createElement('canvas');if(!c||!c.getContext)return null;c.width=w;c.height=h;const g=c.getContext('2d');return g?{c,g}:null}

 // contorno della forma (in unità, centrato) per tipo
 function shapePath(type,R){
  const p=[];
  if(type===0){ // lamiera strappata: poligono irregolare con bordo seghettato
   const n=6+Math.floor(R()*3);
   for(let i=0;i<n;i++){const a=i/n*6.283+R()*.5,r=5+R()*4.5;p.push([Math.cos(a)*r,Math.sin(a)*r*(.55+R()*.35)]);
    if(R()<.55){const a2=a+3.1416/n,r2=r*(.55+R()*.25);p.push([Math.cos(a2)*r2,Math.sin(a2)*r2*.7])}}
  }else if(type===1){ // trave a doppia T, spezzata alle estremità
   const L=7+R()*2.5,h=2.2+R()*.8;
   p.push([-L,-h],[L-R()*1.5,-h],[L+.8,-h*.3],[L-.6,h*.4],[L-R()*1.2,h],[-L+R()*1.2,h],[-L-.8,h*.2],[-L+.5,-h*.5]);
  }else if(type===2){ // pezzo di corazza piegato a L
   const a=6+R()*3,b=3+R()*2;
   p.push([-a,-b],[a*.2,-b-.8],[a,-b+R()],[a-.5,-b+2.6],[-a+3,-b+2.8],[-a+2.6,b],[-a-.3,b-R()]);
  }else{ // tubo/ingranaggio: forma quasi tonda dentata
   const n=10,r0=4.2+R()*1.5;
   for(let i=0;i<n*2;i++){const a=i/(n*2)*6.283,r=i%2?r0:r0+1.4;p.push([Math.cos(a)*r,Math.sin(a)*r])}
  }
  return p;
 }
 function tracePath(g,p){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath()}
 const PAL=[['#7d8a99','#3a4552','#1d242d'],['#8a96a3','#4c5866','#232b35'],['#6f7a86','#343d48','#171d24'],['#8d6d58','#4f3a2e','#241a14'],['#9aa6b2','#56626f','#262e38']];

 function buildSprites(){
  SPR=[];const S=DET.base*DET.res;
  for(let k=0;k<DET.sprites;k++){
   const R=rng(k*17+3),type=k%4,pal=PAL[k%PAL.length],p=shapePath(type,R);
   const cold=mkCanvas(S,S),hot=mkCanvas(S,S);if(!cold||!hot){SPR=[];return}
   for(const q of [cold,hot]){q.g.setTransform(DET.res,0,0,DET.res,S/2,S/2)}
   let g=cold.g;
   // corpo con luce dall'alto a sinistra
   tracePath(g,p);const lg=g.createLinearGradient(-8,-8,8,8);lg.addColorStop(0,pal[0]);lg.addColorStop(.55,pal[1]);lg.addColorStop(1,pal[2]);g.fillStyle=lg;g.fill();
   g.save();tracePath(g,p);g.clip();
   if(type===1){ // anima della trave e fori di alleggerimento
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-10,-.6,20,1.2);
    g.fillStyle='#10151b';for(let x=-5;x<=5;x+=3.4){g.beginPath();g.ellipse(x,0,1,.75,0,0,6.283);g.fill()}
    g.fillStyle='rgba(255,255,255,.22)';g.fillRect(-10,-2.8,20,.6);
   }else if(type===3){ // foro centrale del tubo/ingranaggio
    g.fillStyle='#0d1217';g.beginPath();g.arc(0,0,1.9,0,6.283);g.fill();
    g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=.5;g.beginPath();g.arc(0,0,3.2,3.6,5.6);g.stroke();
   }else{ // linee di pannello e rivetti
    g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=.5;g.beginPath();g.moveTo(-9,-1+R()*2);g.lineTo(9,R()*2-1);g.stroke();
    g.strokeStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(-9,-.4+R()*2);g.lineTo(9,R()*2-.4);g.stroke();
    for(let i=0;i<2+Math.floor(R()*3);i++){const x=(R()-.5)*9,y=(R()-.5)*5;g.fillStyle='#1b2129';g.beginPath();g.arc(x,y,.65,0,6.283);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.arc(x-.2,y-.2,.28,0,6.283);g.fill()}
    if(k%5===2){g.fillStyle='rgba(255,170,40,.55)';for(let x=-10;x<10;x+=3){g.beginPath();g.moveTo(x,4);g.lineTo(x+1.5,4);g.lineTo(x+3.5,-4);g.lineTo(x+2,-4);g.closePath();g.fill()}}
   }
   // bruciature di fumo
   const sx=(R()-.5)*6,sy=(R()-.5)*4,sg=g.createRadialGradient(sx,sy,0,sx,sy,4+R()*3);sg.addColorStop(0,'rgba(8,6,5,.75)');sg.addColorStop(1,'rgba(8,6,5,0)');g.fillStyle=sg;g.fillRect(-10,-10,20,20);
   g.restore();
   // bordo: scuro in basso a destra, lucido in alto a sinistra
   g.lineJoin='round';tracePath(g,p);g.strokeStyle='rgba(6,9,12,.85)';g.lineWidth=.7;g.stroke();
   g.save();tracePath(g,p);g.clip();g.translate(-.45,-.45);tracePath(g,p);g.strokeStyle='rgba(225,236,245,.5)';g.lineWidth=.55;g.stroke();g.restore();
   // versione rovente: bordi arancioni e cuore giallo, sopra la versione fredda
   g=hot.g;g.save();tracePath(g,p);g.clip();
   const hg=g.createRadialGradient(0,0,1,0,0,10);hg.addColorStop(0,'rgba(255,90,20,0)');hg.addColorStop(.55,'rgba(255,110,30,.35)');hg.addColorStop(1,'rgba(255,190,90,.95)');g.fillStyle=hg;g.fillRect(-10,-10,20,20);
   g.restore();g.lineJoin='round';tracePath(g,p);g.strokeStyle='rgba(255,226,140,.95)';g.lineWidth=.8;g.stroke();
   SPR.push({cold:cold.c,hot:hot.c});
  }
  // bagliore morbido sotto i pezzi roventi
  const gl=mkCanvas(64,64);
  if(gl){const rg=gl.g.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,'rgba(255,150,60,.75)');rg.addColorStop(.4,'rgba(255,100,30,.25)');rg.addColorStop(1,'rgba(255,80,20,0)');gl.g.fillStyle=rg;gl.g.fillRect(0,0,64,64);GLOW=gl.c}
 }

 // nuovi rottami: forma a caso, dimensione variabile, roventi
 battDebris=function(x,y,n,power){
  const K=pf.boom;if(!K)return;
  for(let i=0;i<n;i++){
   const a=-Math.PI/2+(Math.random()-.5)*2.6,s=(260+Math.random()*520)*power,big=Math.random()<.18;
   const heat=.55+Math.random()*.45;
   K.debris.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:Math.random()*6.28,vr:(Math.random()-.5)*14,
    life:5.5+Math.random()*3.5,hot:true,heat,spr:Math.floor(Math.random()*DET.sprites),
    sz:(big?1.45:.7)+Math.random()*(big?.55:.65),flip:Math.random()<.5?-1:1,smokeT:0,det:true});
  }
 };

 function spark(K,x,y,n,hot){
  K.spk=K.spk||[];
  for(let i=0;i<n&&K.spk.length<DET.sparkMax;i++){const a=-Math.PI/2+(Math.random()-.5)*2.4,s=120+Math.random()*260;
   K.spk.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.35,max:.6,hot})}
 }

 // aggiorna calore, scintille ai rimbalzi e scintille in volo
 battBoom=function(dt){
  const K=pf.boom;if(K)for(const d of K.debris)d.pvy=d.vy;
  const r=old.battBoom(dt);
  const L=pf.boom;if(!L)return r;
  for(const d of L.debris){if(!d.det)continue;
   // rimbalzo: la velocità verticale passa da giù a su (o si ferma)
   if(d.pvy>90&&d.vy<=0)spark(L,d.x,d.y,3+Math.floor(d.heat*5),d.heat);
   d.heat=Math.max(0,d.heat-dt*DET.cool);
   d.hot=d.heat>.3&&Math.random()<.35; // meno fumo: solo dai pezzi ancora caldi
   if(d.heat>.4&&d.vy!==0&&Math.random()<dt*10)spark(L,d.x,d.y,1,d.heat);
  }
  if(L.spk){for(const p of L.spk){p.vy+=PF_GRAVITY*.6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}L.spk=L.spk.filter(p=>p.life>0)}
  return r;
 };

 // disegno: effetti originali senza i rettangoli, poi i rottami nuovi
 battDrawBoom=function(now){
  const K=pf.boom;
  if(!K||!pf.boss)return old.battDrawBoom(now);
  const keep=K.debris;K.debris=[];
  try{drawDebris(K,keep)}finally{old.battDrawBoom(now);K.debris=keep}
 };
 function drawDebris(K,list){
  if(!list.length&&!(K.spk&&K.spk.length))return;
  if(!SPR)buildSprites();
  const s=pfScale();
  ctx.save();ctx.scale(s,s);ctx.translate(-pf.cam.x,0);
  // bagliori sotto i pezzi caldi
  if(GLOW){ctx.globalCompositeOperation='lighter';
   for(const d of list){if(d.heat<.08)continue;const r=14*d.sz*(.6+d.heat);ctx.globalAlpha=Math.min(1,d.heat)*.55*Math.min(1,d.life/DET.fade);ctx.drawImage(GLOW,d.x-r,d.y-r,r*2,r*2)}
   ctx.globalCompositeOperation='source-over'}
  const B=DET.base;
  for(const d of list){
   const sp=SPR[d.spr%Math.max(1,SPR.length)];
   const a=Math.min(1,d.life/DET.fade);if(a<=0)continue;
   ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.scale(d.sz*d.flip,d.sz);ctx.globalAlpha=a;
   if(sp){ctx.drawImage(sp.cold,-B/2,-B/2,B,B);if(d.heat>.02){ctx.globalAlpha=a*Math.min(1,d.heat*1.15);ctx.drawImage(sp.hot,-B/2,-B/2,B,B)}}
   else{ctx.fillStyle='#4c5866';ctx.fillRect(-6,-3,12,6)}
   ctx.restore();
  }
  // scintille: trattini luminosi nella direzione del moto
  if(K.spk&&K.spk.length){ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
   for(const p of K.spk){const k=Math.max(0,p.life/p.max);ctx.strokeStyle=p.hot>.5?`rgba(255,230,160,${k})`:`rgba(255,160,70,${k})`;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke()}
   ctx.globalCompositeOperation='source-over'}
  ctx.globalAlpha=1;ctx.restore();
 }
 globalThis.detPrebuild=function(){if(!SPR)buildSprites()};
 // prepara le immagini quando il browser è libero, così il primo scoppio non scatta
 if(typeof requestIdleCallback==='function')requestIdleCallback(()=>{try{detPrebuild()}catch(e){}});
})();
