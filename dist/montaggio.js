// Conex — ENTRATA IN SCENA DEL BOSS e TEXTURE MIGLIORI (2026-11-04).
// Entrata (stato 'montaggio', circa 6 s, il boss non si può colpire e non attacca):
//  1) si costruisce da solo: dal basso verso l'alto un raggio di saldatura trasforma l'ologramma azzurro
//     in metallo vero, mentre piastre e rottami volano verso di lui tra le scintille;
//  2) fa uscire vapore dalle giunture con un sibilo;
//  3) accumula energia: scintille e fulmini convergono nel nucleo, che si illumina sempre di più,
//     poi un'onda di luce e il ruggito: comincia lo scontro.
// Texture: pannelli con giunture e rivetti, metallo spazzolato, riflesso che scorre, luce di contorno
// e ombra ai piedi, tutto disegnato sulla tela piccola del boss (boss.js), quindi costa poco.
// Vale per il boss di ogni pianeta e per IMPERATORE OMEGA.

const MONT={T:6.2,build:2.8,steam:4.3,blast:5.9};
const monOrig={pfSpawnBoss,pfUpdateBoss,pfHitBoss,bDrawBody,gBoss};
const mtClamp=v=>Math.max(0,Math.min(1,v));
const mtSmooth=v=>{v=mtClamp(v);return v*v*(3-2*v)};
function mtInfo(){return typeof pfBossInfo==='function'?pfBossInfo(pf.p):{w:120,h:200,name:'',sub:''}}
function mtTop(){return mtInfo().h+40}
function mtCore(B){return{x:B.x,y:B.y-mtInfo().h*.56}}

pfSpawnBoss=function(...a){
 const r=monOrig.pfSpawnBoss(...a),B=pf&&pf.boss;
 if(B){Object.assign(B,{y:PF_FLOOR,vy:0,vx:0,state:'montaggio',t:0,build:0,charge:0,steamed:false,blasted:false,clank:0});pf.bossSpawn=MONT.T+1.5;pfStatus('IL ROBOT SI STA ASSEMBLANDO',2600)}
 return r;
};
pfHitBoss=function(n,x,y){
 const B=pf&&pf.boss;
 if(B&&B.state==='montaggio'){pfBurst(x??B.x,y??B.y-100,'#8cf2ff',3,.5);if(Math.random()<.3)sfx('shield',.4);return}
 return monOrig.pfHitBoss(n,x,y);
};
pfUpdateBoss=function(dt){
 const B=pf&&pf.boss;if(!B||B.state!=='montaggio')return monOrig.pfUpdateBoss(dt);
 const P=pf.pilot,I=mtInfo(),t0=B.t;B.t+=dt;const t=B.t;
 B.hit=Math.max(0,B.hit-dt);B.face=P.x>=B.x?1:-1;B.aim=B.face>0?0:Math.PI;
 pf.bossSpawn=Math.max(pf.bossSpawn||0,MONT.T-t+1.5);
 B.build=mtSmooth(t/MONT.build);
 const top=mtTop(),lineY=B.y-top*B.build;
 // 1) montaggio: scintille di saldatura sulla linea e pezzi che volano verso il robot
 if(t<MONT.build+.1){
  if(Math.random()<dt*50)pfBurst(B.x+(Math.random()-.5)*I.w*1.1,lineY,Math.random()<.5?'#fff1c9':'#8cf2ff',2,.6);
  if(Math.random()<dt*16){
   const side=Math.random()<.5?-1:1,sx=B.x+side*(260+Math.random()*220),sy=B.y-60-Math.random()*320,tx=B.x+(Math.random()-.5)*I.w*.8,ty=lineY+(Math.random()-.5)*20;
   const k=2.4;pf.fx.push({x:sx,y:sy,vx:(tx-sx)*k,vy:(ty-sy)*k,life:.9,max:.9,color:Math.random()<.5?'#9fb2c4':'#5d6a78',r:3+Math.random()*4});
  }
  B.clank-=dt;if(B.clank<=0){B.clank=.16+Math.random()*.12;tone(140+Math.random()*120,.06,'square',.018,60);noise(.05,.02,2400)}
 }
 if(t0<MONT.build&&t>=MONT.build){pf.cam.shake=Math.max(pf.cam.shake,.4);noise(.3,.05,500);tone(70,.4,'sine',.06,40)}
 // 2) vapore dalle giunture
 if(t>MONT.build&&t<MONT.steam+.6){
  if(!B.steamed){B.steamed=true;noise(1.5,.05,4200);noise(1.2,.03,1800,.2)}
  const vents=[[-.45,.35],[.45,.35],[-.3,.7],[.3,.7],[0,.92],[-.5,.15],[.5,.15]];
  for(const [vx,vy] of vents)if(Math.random()<dt*9){const x=B.x+vx*I.w,y=B.y-vy*I.h;pf.fx.push({x,y,vx:Math.sign(vx||1)*(40+Math.random()*90),vy:-50-Math.random()*70,life:1.4,max:1.4,color:'rgba(225,232,240,.5)',r:8+Math.random()*10,soft:true})}
 }
 // 3) accumulo di energia nel nucleo
 if(t>MONT.steam){
  const c=mtCore(B);B.charge=mtSmooth((t-MONT.steam)/(MONT.blast-MONT.steam));
  if(t0<=MONT.steam)tone(110,MONT.blast-MONT.steam,'sawtooth',.03,880);
  if(Math.random()<dt*(30+B.charge*60)){const a=Math.random()*6.28,d=150+Math.random()*170,sx=c.x+Math.cos(a)*d,sy=c.y+Math.sin(a)*d*.8;pf.fx.push({x:sx,y:sy,vx:(c.x-sx)*2.4,vy:(c.y-sy)*2.4,life:.7,max:.7,color:Math.random()<.6?'#8cf2ff':'#ffffff',r:1.5+Math.random()*2})}
 }
 if(!B.blasted&&t>=MONT.blast){
  B.blasted=true;const c=mtCore(B);
  pfBurst(c.x,c.y,'#ffffff',30,2);pfBurst(c.x,c.y,'#8cf2ff',40,2.4);pfBurst(B.x,B.y-4,'#c7d6e2',26,1.4,true,{vy:-120});
  if(typeof gFlash==='function')gFlash(c.x,c.y,520,'#8cf2ff',.6);
  pf.cam.shake=Math.max(pf.cam.shake,1);sfx('boom',1.4);
 }
 if(t>=MONT.T){B.charge=0;B.build=1;pfBossSet(B,'ruggito');pfBanner(I.name,I.sub,3);tone(90,1.2,'sawtooth',.03,45);pf.cam.shake=Math.max(pf.cam.shake,.6)}
};

// ---------------------------------------------------------------- texture (sulla tela del boss)
const mtTex={panel:null,brush:null,pats:new WeakMap()};
function mtPanelTex(){
 if(mtTex.panel)return mtTex.panel;
 const o=gCanvas(128,128);if(!o)return null;const c=o.g;
 c.clearRect(0,0,128,128);
 // giunture dei pannelli: linea scura con un filo di luce sotto (smusso)
 const seam=(x0,y0,x1,y1)=>{c.strokeStyle='rgba(10,10,12,.85)';c.lineWidth=1.4;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=.8;c.beginPath();c.moveTo(x0+.9,y0+.9);c.lineTo(x1+.9,y1+.9);c.stroke()};
 seam(0,.5,128,.5);seam(0,64.5,128,64.5);seam(.5,0,.5,64);seam(80.5,0,80.5,64);seam(40.5,64,40.5,128);seam(104.5,64,104.5,128);seam(80,32.5,128,32.5);seam(0,100.5,40,100.5);
 // rivetti lungo le giunture
 for(const [x,y] of [[6,6],[74,6],[86,6],[122,6],[6,58],[74,58],[86,38],[122,38],[46,70],[98,70],[110,70],[46,122],[98,122],[6,106],[34,106],[110,122]]){c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(x,y,1.5,0,6.28);c.fill();c.fillStyle='rgba(0,0,0,.6)';c.beginPath();c.arc(x+.6,y+.7,1,0,6.28);c.fill()}
 // portelli e griglie di ventilazione
 c.fillStyle='rgba(20,20,24,.55)';for(let i=0;i<5;i++)c.fillRect(90,44+i*3.4,26,1.4);
 c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1;c.strokeRect(12.5,76.5,20,16);c.fillStyle='rgba(255,210,120,.35)';c.fillRect(14,90,4,1.5);
 // usura sui bordi
 for(let i=0;i<120;i++){const x=gHash(i*19)*128,y=gHash(i*19+1)*128;c.fillStyle=`rgba(${gHash(i*7)<.5?30:230},${gHash(i*7)<.5?26:230},${gHash(i*7)<.5?22:230},${.1+gHash(i*5)*.2})`;c.fillRect(x,y,1+gHash(i)*2,1)}
 return mtTex.panel=o.c;
}
function mtBrushTex(){
 if(mtTex.brush)return mtTex.brush;
 const o=gCanvas(64,64);if(!o)return null;const c=o.g;c.clearRect(0,0,64,64);
 for(let i=0;i<160;i++){const y=gHash(i*13)*64,v=gHash(i*13+1)<.5?60:200;c.fillStyle=`rgba(${v},${v},${v},${.12+gHash(i*3)*.2})`;c.fillRect(0,y,64,.6+gHash(i)*.8)}
 // macchie di ruggine e olio
 for(let i=0;i<6;i++){const x=gHash(i*29)*64,y=gHash(i*29+1)*64,r=4+gHash(i*29+2)*8,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(110,60,30,.35)');g.addColorStop(1,'rgba(110,60,30,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
 return mtTex.brush=o.c;
}
function mtPattern(c,key,img,k=1){let m=mtTex.pats.get(c);if(!m){m={};mtTex.pats.set(c,m)}if(!m[key]){m[key]=c.createPattern(img,'repeat');if(k!==1&&m[key]&&m[key].setTransform&&typeof DOMMatrix==='function')m[key].setTransform(new DOMMatrix().scale(k,k))}return m[key]}

bDrawBody=function(c,B,now){
 monOrig.bDrawBody(c,B,now);
 if(typeof ctx!=='undefined'&&c===ctx)return; // disegno diretto (test): niente effetti sulla tela principale
 const L=-270,R=270,TOP=-330,BOT=40,top=-(typeof pf!=='undefined'&&pf?mtTop():260);
 c.save();c.globalCompositeOperation='source-atop';
 // pannelli, metallo spazzolato e usura
 const pt=mtPanelTex(),br=mtBrushTex();
 if(pt){c.globalAlpha=.4;c.fillStyle=mtPattern(c,'p',pt,1.7);c.fillRect(L,TOP,R-L,BOT-TOP)}
 if(br){c.globalAlpha=.4;c.fillStyle=mtPattern(c,'b',br);c.fillRect(L,TOP,R-L,BOT-TOP)}
 c.globalAlpha=1;c.globalCompositeOperation='source-atop';
 // luce di contorno dall'alto a sinistra, ombra ai piedi
 c.fillStyle=bGrad(c,-150,top,140,-20,['rgba(220,240,255,.22)','rgba(220,240,255,0)','rgba(0,0,0,0)']);c.fillRect(L,TOP,R-L,BOT-TOP);
 c.fillStyle=bGrad(c,0,-46,0,4,['rgba(0,0,0,0)','rgba(0,0,0,.42)']);c.fillRect(L,-46,R-L,50);
 // riflesso che scorre lento sul metallo
 const sweep=((now*.22)%1.6-.3)*(R-L)+L;
 const sh=c.createLinearGradient(sweep-60,TOP,sweep+60,TOP+120);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.5,'rgba(255,255,255,.16)');sh.addColorStop(1,'rgba(255,255,255,0)');
 c.fillStyle=sh;c.fillRect(L,TOP,R-L,BOT-TOP);
 // entrata in scena: ologramma sopra la linea di costruzione, energia mentre si carica
 if(B.state==='montaggio'){
  if(B.build<1){
   const yl=top*B.build;
   c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.72)';c.fillRect(L,TOP,R-L,yl-TOP);
   c.globalCompositeOperation='source-atop';c.fillStyle='rgba(80,220,255,.5)';c.fillRect(L,TOP,R-L,yl-TOP);
   c.fillStyle='rgba(200,250,255,.5)';for(let y=Math.floor(TOP/5)*5+((now*40)%5);y<yl;y+=5)c.fillRect(L,y,R-L,1);
   c.fillStyle='rgba(255,250,220,.9)';c.fillRect(L,yl-2,R-L,4);
  }
  if(B.charge>0){c.fillStyle=`rgba(120,230,255,${.35*B.charge*(.75+.25*Math.sin(now*30))})`;c.fillRect(L,TOP,R-L,BOT-TOP)}
 }
 c.restore();
};

gBoss=function(B,now){
 if(!B||B.state!=='montaggio')return monOrig.gBoss(B,now);
 const I=mtInfo(),top=mtTop(),yl=B.y-top*B.build;
 // proiettori a terra che costruiscono il robot
 if(B.build<1){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const s of [-1,1]){
   const px=B.x+s*(I.w*.5+70),py=B.y;
   ctx.fillStyle='#1b2430';ctx.fillRect(px-14,py-10,28,10);ctx.fillStyle='#8cf2ff';ctx.fillRect(px-8,py-12,16,3);
   const g=ctx.createLinearGradient(px,py-12,B.x,yl);g.addColorStop(0,'rgba(140,242,255,.7)');g.addColorStop(1,'rgba(140,242,255,.1)');
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(px-6,py-12);ctx.lineTo(px+6,py-12);ctx.lineTo(B.x+s*I.w*.1,yl+3);ctx.lineTo(B.x-s*I.w*.6,yl-3);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 }
 monOrig.gBoss(B,now);
 ctx.save();ctx.globalCompositeOperation='lighter';
 // linea di saldatura incandescente
 if(B.build<1){const w=I.w*.75,g=ctx.createLinearGradient(B.x-w,0,B.x+w,0);g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(.5,'rgba(255,250,230,.95)');g.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=g;ctx.fillRect(B.x-w,yl-2.5,w*2,5);
  const h=ctx.createRadialGradient(B.x,yl,0,B.x,yl,w);h.addColorStop(0,'rgba(140,242,255,.35)');h.addColorStop(1,'rgba(140,242,255,0)');ctx.fillStyle=h;ctx.fillRect(B.x-w,yl-w*.4,w*2,w*.8)}
 // nucleo che accumula energia, con fulmini dal corpo
 if(B.charge>0){
  const c=mtCore(B),k=B.charge,r=18+k*60+Math.sin(now*40)*4;
  const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,r);g.addColorStop(0,`rgba(255,255,255,${.95*k})`);g.addColorStop(.3,`rgba(140,242,255,${.7*k})`);g.addColorStop(1,'rgba(80,200,255,0)');ctx.fillStyle=g;ctx.fillRect(c.x-r,c.y-r,r*2,r*2);
  ctx.strokeStyle=`rgba(190,250,255,${.4+.5*k})`;ctx.lineWidth=1.6;
  const n=1+Math.floor(k*5);
  for(let i=0;i<n;i++){const a=Math.random()*6.28,d=60+Math.random()*90;let x=c.x+Math.cos(a)*d,y=c.y+Math.sin(a)*d;ctx.beginPath();ctx.moveTo(x,y);for(let j=1;j<=5;j++){const f=j/5;x=c.x+Math.cos(a)*d*(1-f)+(Math.random()-.5)*14*(1-f);y=c.y+Math.sin(a)*d*(1-f)+(Math.random()-.5)*14*(1-f);ctx.lineTo(x,y)}ctx.stroke()}
 }
 ctx.restore();
};
