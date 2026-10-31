// Frontiera Stellare — FASE 2: la nave atterra e il pilota libera la colonia a piedi.
// Platform a scorrimento orizzontale (sinistra → destra). Usa lo stesso stile grafico
// della fase 1 (palette ciano per il pilota, rosso per i ribelli) e le stesse utility
// (drawShip, drawPlume, drawBullet, drawParticle, drawStarfield, drawWorld, sfx, tone, noise).

const PF_VH=720,PF_GRAVITY=1850,PF_RUN=265,PF_JUMP=665,PF_MAXFALL=980,PF_FLOOR=600;
let pf=null;
let phaseTwoComplete=localStorage.getItem('frontieraPhaseTwoComplete')==='yes';

const PF_PILOT={suit:'#2a4456',armor:'#e8f7fa',armor2:'#8daab8',edge:'#d8fbff',visor:'#8cf2ff',glow:'#51e6ff',gun:'#142d3c'};
const PF_REBEL={suit:'#3d1822',armor:'#ffc3c6',armor2:'#d95263',edge:'#ff9ba4',visor:'#ff5268',glow:'#ff5268',gun:'#36101b'};

function pfRng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function pfHash(text){return Array.from(text).reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),7)>>>0}
function pfClamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pfScale(){return H/PF_VH}
function pfViewW(){return W/pfScale()}

// ---------------------------------------------------------------- livello
function buildPlatformLevel(p){
 const d=p.difficulty,rnd=pfRng(pfHash('fase2'+p.code)),len=6000+d*800;
 const solids=[{x:-700,w:1800,y:PF_FLOOR}],plats=[],props=[],triggers=[],hostages=[];
 let x=1100,y=PF_FLOOR,lastPit=true;
 while(x<len){
  if(!lastPit&&x>1500&&rnd()<.26){x+=Math.round(92+rnd()*(28+d*5));lastPit=true;continue}
  const w=Math.round(340+rnd()*520);
  // Dopo un burrone il bordo opposto è al massimo 28 px più alto; altrove gradini fino a 84 px.
  let ny=lastPit&&x>1500?y+(rnd()<.35?-28:Math.round(rnd()*2)*28):y+Math.round((rnd()*2-1)*3)*28;
  ny=pfClamp(ny,488,620);
  solids.push({x,w,y:ny});
  if(w>420&&rnd()<.6){const pw=Math.round(120+rnd()*90);plats.push({x:Math.round(x+60+rnd()*(w-pw-120)),y:ny-Math.round(90+rnd()*24),w:pw})}
  const r=rnd();if(r<.55)props.push({x:Math.round(x+50+rnd()*(w-100)),y:ny,kind:r<.22?'cassa':r<.4?'barricata':'bandiera'});
  x+=w;y=ny;lastPit=false;
 }
 const arenaX=x;
 solids.push({x:arenaX,w:4000,y:PF_FLOOR});
 // Coloni da salvare distribuiti lungo il percorso, sempre su terreno solido.
 const count=4+Math.floor(d/2);
 for(let i=1;i<=count;i++){
  const tx=1300+(arenaX-1700)*i/(count+1);
  let s=solids.find(o=>o.x+70<=tx&&tx<=o.x+o.w-70),hx=tx;
  if(!s){s=solids.find(o=>o.x>tx&&o.w>200);hx=s?s.x+90:tx}
  if(s)hostages.push({x:Math.round(hx),y:s.y,state:'legato',t:0,id:i});
 }
 // Punti in cui entrano i ribelli: vengono incontro al pilota da destra.
 const usedPlats=new Set();let tx=1250;
 while(tx<arenaX-250){
  const r=rnd(),plat=plats.find(o=>!o.arena&&!usedPlats.has(o)&&o.x+o.w/2>tx-60&&o.x<tx+520);
  if(d>=2&&r<.2)triggers.push({x:tx,type:'drone'});
  else if(plat&&r<.45){usedPlats.add(plat);triggers.push({x:plat.x+plat.w/2,type:'cecchino',plat})}
  else{triggers.push({x:tx,type:'soldato'});if(r>.82)triggers.push({x:tx+70,type:'soldato'})}
  tx+=Math.max(150,Math.round(280+rnd()*240-d*30));
 }
 triggers.sort((a,b)=>a.x-b.x);
 return{len,arenaX,solids,plats,props,triggers,hostages};
}
function pfDecor(p,lvl){
 const rnd=pfRng(pfHash('colonia'+p.code)),buildings=[],far=[],near=[];
 for(let x=-300;x<(lvl.arenaX+3000)*.45+600;x+=Math.round(130+rnd()*230)){
  const r=rnd();buildings.push({x,kind:r<.38?'cupola':r<.72?'torre':'hangar',w:Math.round(r<.38?110+rnd()*90:r<.72?34+rnd()*26:150+rnd()*90),h:Math.round(r<.38?0:r<.72?130+rnd()*110:60+rnd()*30),fire:rnd()<.3,seed:Math.floor(rnd()*1e6)});
 }
 for(let i=0;i<6;i++){far.push(rnd()*6.28);near.push(rnd()*6.28)}
 return{buildings,far,near,themeBack:pfThemeFlora(p,lvl)};
}
function pfGroundAt(x){for(const s of pf.solids)if(x>=s.x&&x<s.x+s.w)return s.y;return null}

// ---------------------------------------------------------------- temi dei pianeti
// Ogni pianeta ha un ambiente diverso per la fase 2: mare (blu), deserto (giallo),
// foresta (verde), lava (rosso) e tempesta tra le nubi (viola).
const PF_THEMES={
 mare:{id:'mare',name:'MARE',brief:'La colonia sorge su isole e piattaforme in mezzo all’oceano: attento a non cadere in mare.',banner:'COLONIA SUL MARE · LIBERA GLI OSTAGGI',
  sky:['#03101d','#0a3550','#2a86ad'],far:'#0b2c44',near:'#0a3a55',rim:'#7fdcff',top:'#4fb7c9',body:['#1d4250','#08161e'],edge:'#8ff3ff',haze:'#3ca8d5',
  pit:'acqua',fall:'CADUTO IN MARE',fallDamage:25,decor:'onde',ambient:'spruzzi',flora:['palma','scoglio','alga','palma'],splash:['#bff4ff','#3ca8d5']},
 deserto:{id:'deserto',name:'DESERTO',brief:'La colonia è sepolta tra le dune di un deserto rovente: evita le sabbie mobili.',banner:'COLONIA NEL DESERTO · LIBERA GLI OSTAGGI',
  sky:['#1a0f05','#6a3f12','#e7a845'],far:'#7a4e1c',near:'#946026',rim:'#ffd27a',top:'#e6bb63',body:['#9a6a2c','#2a1808'],edge:'#ffe09a',haze:'#ffcf4a',
  pit:'sabbia',fall:'INGHIOTTITO DALLE SABBIE MOBILI',fallDamage:25,decor:'dune',ambient:'sabbia',flora:['cactus','roccia','teschio','cactus'],splash:['#f3d08a','#b07a34']},
 foresta:{id:'foresta',name:'FORESTA',brief:'La colonia è nascosta in una fitta foresta aliena: i burroni finiscono in una palude.',banner:'COLONIA NELLA FORESTA · LIBERA GLI OSTAGGI',
  sky:['#020a06','#0b2a17','#3f7a3a'],far:'#0d2a18',near:'#0f3520',rim:'#9ded6c',top:'#5fae3c',body:['#2b3a1c','#0a1208'],edge:'#b8ff8a',haze:'#7aab54',
  pit:'palude',fall:'CADUTO NELLA PALUDE',fallDamage:25,decor:'alberi',ambient:'foglie',flora:['albero','cespuglio','fungo','albero'],splash:['#9ded6c','#2f5a24']},
 lava:{id:'lava',name:'LAVA',brief:'La colonia resiste su rocce vulcaniche circondate dalla lava: una caduta brucia più del solito.',banner:'COLONIA TRA LA LAVA · LIBERA GLI OSTAGGI',
  sky:['#0d0202','#3a0a06','#b8361a'],far:'#2a0a08',near:'#200807',rim:'#ff7a3a',top:'#4a302a',body:['#2a1a18','#0c0606'],edge:'#ff8a3d',haze:'#ff4a3a',
  pit:'lava',fall:'CADUTO NELLA LAVA',fallDamage:35,decor:'vulcani',ambient:'braci',flora:['roccia_lava','fumarola','cristallo_fuoco','roccia_lava'],splash:['#ffd27a','#ff5a1f']},
 tempesta:{id:'tempesta',name:'TEMPESTA',brief:'La colonia galleggia tra le nubi di un gigante gassoso in tempesta: sotto le piattaforme c’è il vuoto.',banner:'COLONIA TRA LE NUBI · LIBERA GLI OSTAGGI',
  sky:['#06041a','#1e1446','#5a46a8'],far:'#1a1240',near:'#221852',rim:'#b9a6ff',top:'#6c5bc0',body:['#24204a','#0a0818'],edge:'#c8b8ff',haze:'#9a83ff',
  pit:'nubi',fall:'PRECIPITATO TRA LE NUBI',fallDamage:25,decor:'nubi',ambient:'pioggia',flora:['cristallo','antenna','cristallo'],splash:['#e2d8ff','#7763c9']}
};
// Tema dal campo theme del pianeta, altrimenti dal colore (blu, rosso, verde, giallo, viola).
function pfTheme(p){
 if(p&&PF_THEMES[p.theme])return PF_THEMES[p.theme];
 const c=String(p&&p.color||'#3ca8d5').replace('#',''),r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn||1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;
 return PF_THEMES[h<20||h>=330?'lava':h<70?'deserto':h<170?'foresta':h<255?'mare':'tempesta'];
}
function pfNoise(x){const v=Math.sin(x*12.9898+78.233)*43758.5453;return v-Math.floor(v)}
function pfThemeFlora(p,lvl){
 const th=pfTheme(p),rnd=pfRng(pfHash('flora'+p.code)),flora=[];
 for(const s of lvl.solids){
  if(s.x+s.w<900||s.x>=lvl.arenaX)continue;
  for(let x=Math.max(s.x,900)+60+rnd()*80;x<s.x+s.w-50;x+=150+rnd()*220){
   flora.push({x:Math.round(x),y:s.y,kind:th.flora[Math.floor(rnd()*th.flora.length)],size:.75+rnd()*.6,seed:rnd()*1000,flip:rnd()<.5?-1:1});
  }
 }
 const back=[];for(let i=0;i<40;i++)back.push({x:i*260+rnd()*180,size:.6+rnd()*.8,seed:rnd()*1000});
 return{flora,back};
}
function pfThemeSplash(x){
 if(!pf)return;const c=(pf.theme||pfTheme(pf.p)).splash;
 pfBurst(x,632,c[0],16,1.1,true,{vy:-260});pfBurst(x,636,c[1],10,.8,true,{vy:-160});
}
// Particelle d'ambiente in coordinate di vista (pioggia, braci, foglie, sabbia, spruzzi).
function pfUpdateAmbient(dt){
 const th=pf.theme,VW=pfViewW(),A=pf.ambient;if(!th||!A)return;
 const rate={spruzzi:26,sabbia:60,foglie:9,braci:30,pioggia:120}[th.ambient]||0;
 let n=rate*dt;while(n>0){if(Math.random()<n)A.push(pfAmbientParticle(th.ambient,VW));n-=1}
 for(const a of A){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;a.rot+=a.spin*dt;if(a.kind==='foglia')a.vx+=Math.sin(pf.t*2+a.seed)*14*dt}
 pf.ambient=A.filter(a=>a.life>0&&a.y<PF_VH+30&&a.y>-40&&a.x>-60&&a.x<VW+60);
 if(pf.ambient.length>420)pf.ambient.splice(0,pf.ambient.length-420);
 if(th.ambient==='pioggia'){pf.lightning=Math.max(0,(pf.lightning||0)-dt*2.5);if(Math.random()<dt*.12){pf.lightning=1;pf.boltX=VW*(.1+Math.random()*.8);if(typeof noise==='function')noise(1.1,.035,300,.25)}}
}
function pfAmbientParticle(kind,VW){
 const r=Math.random;
 if(kind==='pioggia')return{kind:'goccia',x:r()*(VW+200)-100,y:-20,vx:-140,vy:780+r()*200,life:2,rot:0,spin:0,seed:r()*9};
 if(kind==='sabbia')return{kind:'granello',x:VW+20,y:120+r()*560,vx:-(380+r()*320),vy:(r()-.5)*30,life:4,rot:0,spin:0,seed:r()*9,len:8+r()*26};
 if(kind==='braci')return r()<.75?{kind:'brace',x:r()*VW,y:PF_VH+10,vx:(r()-.5)*40,vy:-(50+r()*90),life:6,rot:0,spin:0,seed:r()*9}:{kind:'cenere',x:r()*VW,y:-10,vx:(r()-.5)*20,vy:30+r()*30,life:14,rot:0,spin:0,seed:r()*9};
 if(kind==='foglie')return r()<.6?{kind:'foglia',x:r()*VW,y:-12,vx:-20+r()*30,vy:35+r()*35,life:14,rot:r()*6,spin:(r()-.5)*4,seed:r()*9}:{kind:'lucciola',x:r()*VW,y:300+r()*320,vx:(r()-.5)*24,vy:(r()-.5)*18,life:5,rot:0,spin:0,seed:r()*9};
 return r()<.5?{kind:'goccia',x:r()*(VW+200)-100,y:-20,vx:-60,vy:520+r()*120,life:2,rot:0,spin:0,seed:r()*9}:{kind:'spruzzo',x:r()*VW,y:PF_VH-70,vx:(r()-.5)*60,vy:-(60+r()*90),life:1.2,rot:0,spin:0,seed:r()*9};
}
function pfDrawAmbient(now){
 const A=pf.ambient;if(!A)return;
 ctx.save();ctx.lineCap='round';
 for(const a of A){
  if(a.kind==='goccia'){ctx.strokeStyle=pf.theme.id==='tempesta'?'rgba(200,190,255,.35)':'rgba(170,225,255,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x-a.vx*.025,a.y-a.vy*.025);ctx.stroke()}
  else if(a.kind==='granello'){ctx.strokeStyle='rgba(245,205,130,.32)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+a.len,a.y-a.vy*.02);ctx.stroke()}
  else if(a.kind==='brace'){const f=.6+.4*Math.sin(now*9+a.seed);ctx.fillStyle=`rgba(255,${Math.round(140+f*80)},60,${Math.min(1,a.life/2)*.9})`;ctx.shadowBlur=8;ctx.shadowColor='#ff7a2a';ctx.beginPath();ctx.arc(a.x+Math.sin(now*2+a.seed)*6,a.y,1.6+f,0,6.28);ctx.fill();ctx.shadowBlur=0}
  else if(a.kind==='cenere'){ctx.fillStyle='rgba(120,110,105,.45)';ctx.fillRect(a.x,a.y,2,2)}
  else if(a.kind==='foglia'){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rot);ctx.fillStyle=a.seed>4.5?'rgba(157,237,108,.7)':'rgba(214,190,80,.6)';ctx.beginPath();ctx.ellipse(0,0,5,2.2,0,0,6.28);ctx.fill();ctx.restore()}
  else if(a.kind==='lucciola'){const f=.5+.5*Math.sin(now*4+a.seed*3);ctx.fillStyle=`rgba(210,255,140,${f*.85})`;ctx.shadowBlur=10;ctx.shadowColor='#c8ff7a';ctx.beginPath();ctx.arc(a.x,a.y,1.8,0,6.28);ctx.fill();ctx.shadowBlur=0}
  else if(a.kind==='spruzzo'){ctx.fillStyle=`rgba(210,245,255,${Math.max(0,a.life/1.2)*.6})`;ctx.beginPath();ctx.arc(a.x,a.y,1.5,0,6.28);ctx.fill()}
 }
 ctx.restore();
}
function pfDrawLightning(VW){
 if(!pf.lightning)return;
 const k=pf.lightning;ctx.save();ctx.fillStyle=`rgba(200,190,255,${k*.18})`;ctx.fillRect(0,0,VW,PF_VH);
 if(k>.6){ctx.strokeStyle=`rgba(240,235,255,${(k-.6)*2.4})`;ctx.lineWidth=2;ctx.shadowBlur=16;ctx.shadowColor='#c8b8ff';ctx.beginPath();let x=pf.boltX,y=0;ctx.moveTo(x,y);while(y<420){y+=30+pfNoise(y+x)*30;x+=(pfNoise(x*.3+y)-.5)*60;ctx.lineTo(x,y)}ctx.stroke()}
 ctx.restore();
}
// Sfondo del tema: rilievi lontani e strato intermedio (dune, vulcani, alberi, mare, nubi).
function pfDrawThemeBack(cx,VW,now){
 const th=pf.theme,d=pf.deco;
 if(th.decor==='dune'){
  const sun=ctx.createRadialGradient(VW*.72,170,4,VW*.72,170,150);sun.addColorStop(0,'rgba(255,240,190,.9)');sun.addColorStop(.18,'rgba(255,214,120,.55)');sun.addColorStop(1,'rgba(255,170,60,0)');ctx.fillStyle=sun;ctx.fillRect(VW*.72-150,20,300,300);
  pfDrawRidge(cx*.08,3400,450,60,th.far,th.rim+'50',d.far,VW);
  pfDrawRidge(cx*.2,2600,505,48,th.near,th.rim+'38',d.near,VW);
  return;
 }
 if(th.decor==='vulcani'){
  pfDrawRidge(cx*.08,2400,430,90,th.far,th.rim+'40',d.far,VW);
  for(const v of d.themeBack.back){
   const x=v.x*2.2-cx*.14;if(x<-260||x>VW+260||pfNoise(v.seed)>.45)continue;
   const h=150*v.size,w=170*v.size,top=470-h;
   ctx.fillStyle='#1a0605';ctx.beginPath();ctx.moveTo(x-w,500);ctx.lineTo(x-w*.18,top);ctx.lineTo(x+w*.18,top);ctx.lineTo(x+w,500);ctx.closePath();ctx.fill();
   const glow=ctx.createRadialGradient(x,top,2,x,top,60);glow.addColorStop(0,'rgba(255,170,60,.75)');glow.addColorStop(1,'rgba(255,60,20,0)');ctx.fillStyle=glow;ctx.fillRect(x-60,top-60,120,120);
   ctx.strokeStyle='rgba(255,110,40,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-4,top+2);ctx.quadraticCurveTo(x-w*.2,top+h*.4,x-w*.3,top+h*.8);ctx.stroke();
   for(let i=0;i<4;i++){const k=(now*.12+i/4+v.seed%1)%1;ctx.fillStyle=`rgba(50,30,30,${.4*(1-k)})`;ctx.beginPath();ctx.arc(x+k*50+Math.sin(k*4+i)*8,top-12-k*110,10+k*26,0,6.28);ctx.fill()}
  }
  pfDrawRidge(cx*.22,1900,520,55,th.near,th.rim+'30',d.near,VW);
  return;
 }
 if(th.decor==='alberi'){
  pfDrawRidge(cx*.08,2600,420,80,th.far,th.rim+'30',d.far,VW);
  for(const [par,base,col,scale] of [[.16,470,'#0a2414',1],[.3,520,'#071a0e',1.35]]){
   ctx.fillStyle=col;
   for(const t of d.themeBack.back){
    const x=t.x*1.4-cx*par,s=t.size*scale;if(x<-80||x>VW+80)continue;
    ctx.fillRect(x-3*s,base-70*s,6*s,80*s);
    if(pfNoise(t.seed)<.5){ctx.beginPath();ctx.moveTo(x,base-150*s);ctx.lineTo(x-34*s,base-40*s);ctx.lineTo(x+34*s,base-40*s);ctx.closePath();ctx.fill()}
    else{ctx.beginPath();ctx.arc(x,base-92*s,38*s,0,6.28);ctx.arc(x-26*s,base-70*s,26*s,0,6.28);ctx.arc(x+26*s,base-70*s,26*s,0,6.28);ctx.fill()}
   }
  }
  return;
 }
 if(th.decor==='onde'){
  pfDrawRidge(cx*.06,3000,470,40,th.far,th.rim+'40',d.far,VW);
  const sea=ctx.createLinearGradient(0,478,0,PF_VH);sea.addColorStop(0,'#1f6f95');sea.addColorStop(.35,'#0c3b58');sea.addColorStop(1,'#041826');ctx.fillStyle=sea;ctx.fillRect(0,478,VW,PF_VH-478);
  ctx.strokeStyle='rgba(170,235,255,.18)';ctx.lineWidth=1.2;
  for(let row=0;row<7;row++){const y=486+row*row*5.5,amp=1.5+row*.8,off=cx*(.18+row*.04)+now*(18+row*6);ctx.beginPath();for(let x=0;x<=VW+20;x+=20){const yy=y+Math.sin((x+off)/(38+row*10))*amp;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.stroke()}
  const glare=ctx.createRadialGradient(VW*.3,484,2,VW*.3,484,220);glare.addColorStop(0,'rgba(200,245,255,.25)');glare.addColorStop(1,'rgba(200,245,255,0)');ctx.fillStyle=glare;ctx.fillRect(VW*.3-220,470,440,60);
  return;
 }
 // nubi
 pfDrawRidge(cx*.08,2600,430,70,th.far,th.rim+'30',d.far,VW);
 for(const [par,base,alpha] of [[.12,440,.35],[.26,520,.5]]){
  for(const c of d.themeBack.back){
   const x=((c.x*1.6-cx*par-now*8*c.size)%(VW+600)+VW+600)%(VW+600)-300,s=c.size;
   ctx.fillStyle=`rgba(${Math.round(70+s*40)},${Math.round(55+s*30)},${Math.round(140+s*50)},${alpha})`;
   ctx.beginPath();ctx.ellipse(x,base,90*s,22*s,0,0,6.28);ctx.ellipse(x+50*s,base-12*s,60*s,20*s,0,0,6.28);ctx.ellipse(x-50*s,base-6*s,55*s,16*s,0,0,6.28);ctx.fill();
  }
 }
}
// Il fondo dei burroni: acqua, lava, sabbie mobili, palude o nubi.
function pfDrawPit(cx,VW,now){
 const th=pf.theme,x0=cx-10,w=VW+20;
 const fill=(stops,y)=>{const g=ctx.createLinearGradient(0,y,0,PF_VH);stops.forEach(([o,c])=>g.addColorStop(o,c));ctx.fillStyle=g;ctx.fillRect(x0,y,w,PF_VH-y+40)};
 const surface=(y,amp,len,speed,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let x=Math.floor(x0/16)*16;x<=x0+w;x+=16){const yy=y+Math.sin(x/len+now*speed)*amp+Math.sin(x/(len*.43)-now*speed*1.3)*amp*.4;x===Math.floor(x0/16)*16?ctx.moveTo(x,yy):ctx.lineTo(x,yy)}ctx.stroke()};
 if(th.pit==='acqua'){fill([[0,'#1a6d93'],[.35,'#0b3550'],[1,'#020c14']],626);surface(628,3,40,1.6,'rgba(190,245,255,.75)',2);surface(640,2,60,-1.1,'rgba(150,220,255,.25)',1.2);return}
 if(th.pit==='lava'){
  ctx.save();ctx.shadowBlur=30;ctx.shadowColor='#ff5a1f';fill([[0,'#ffd166'],[.12,'#ff7a1f'],[.5,'#b8230b'],[1,'#3a0602']],630);ctx.restore();
  surface(631,2.5,50,.9,'rgba(255,240,180,.9)',2.5);
  for(let x=Math.floor(x0/90)*90;x<x0+w;x+=90){const k=(now*.6+pfNoise(x))%1;if(k<.35){ctx.fillStyle=`rgba(255,220,140,${.8*(1-k/.35)})`;ctx.beginPath();ctx.arc(x+pfNoise(x+1)*60,640-k*20,3+k*10,0,6.28);ctx.fill()}}
  return;
 }
 if(th.pit==='sabbia'){fill([[0,'#d8a855'],[.3,'#9a6a2c'],[1,'#2a1808']],630);surface(632,1.5,70,.4,'rgba(255,230,170,.6)',1.5);
  ctx.strokeStyle='rgba(90,55,20,.45)';ctx.lineWidth=1;for(let x=Math.floor(x0/140)*140;x<x0+w;x+=140){const r=(now*12+pfNoise(x)*30)%30;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+70,660,8+((r+i*10)%30)*2,3+((r+i*10)%30)*.5,0,0,6.28);ctx.stroke()}}return}
 if(th.pit==='palude'){fill([[0,'#2f5a24'],[.25,'#16301a'],[1,'#030805']],630);surface(632,1.5,55,.7,'rgba(160,230,110,.45)',1.5);
  ctx.strokeStyle='#355f22';ctx.lineWidth=2;for(let x=Math.floor(x0/70)*70;x<x0+w;x+=70){const h=14+pfNoise(x)*22,sw=Math.sin(now*1.5+x)*3;ctx.beginPath();ctx.moveTo(x,640);ctx.quadraticCurveTo(x+sw,640-h*.5,x+sw*1.6,640-h);ctx.stroke()}return}
 // nubi
 fill([[0,'rgba(90,70,170,.0)'],[.15,'rgba(90,70,170,.55)'],[1,'#0a0820']],610);
 for(let x=Math.floor(x0/120)*120;x<x0+w;x+=120){const s=.7+pfNoise(x)*.6,yy=650+Math.sin(now*.6+x)*5;ctx.fillStyle='rgba(150,130,230,.22)';ctx.beginPath();ctx.ellipse(x+Math.sin(now*.3+x)*20,yy,70*s,16*s,0,0,6.28);ctx.fill()}
}
// Decorazioni sul bordo superiore del terreno, secondo il tema.
function pfDrawSolidTop(sd,now){
 const th=pf.theme,x1=sd.x+sd.w;
 ctx.save();
 if(th.id==='foresta'){ctx.strokeStyle='#7fd04f';ctx.lineWidth=1.4;ctx.beginPath();for(let x=sd.x+4;x<x1-4;x+=7){const h=4+pfNoise(x)*7,sw=Math.sin(now*2+x*.05)*1.5;ctx.moveTo(x,sd.y+1);ctx.lineTo(x+sw-1.5,sd.y-h)}ctx.stroke();
  ctx.fillStyle='#2b4f1a';for(let x=sd.x+20;x<x1-10;x+=55)ctx.fillRect(x,sd.y+6+pfNoise(x)*20,10,3)}
 else if(th.id==='deserto'){ctx.strokeStyle='rgba(120,80,30,.45)';ctx.lineWidth=1;for(let row=0;row<3;row++){ctx.beginPath();for(let x=sd.x+6;x<x1-6;x+=12){const yy=sd.y+12+row*14+Math.sin(x*.07+row)*2.5;x===sd.x+6?ctx.moveTo(x,yy):ctx.lineTo(x,yy)}ctx.stroke()}}
 else if(th.id==='mare'){ctx.fillStyle='rgba(220,250,255,.55)';for(let x=sd.x+3;x<x1-3;x+=9)if(pfNoise(x)>.55)ctx.fillRect(x,sd.y-1,3,2);
  ctx.strokeStyle='#2f8a5a';ctx.lineWidth=2;for(const ex of [sd.x+3,x1-3]){for(let i=0;i<3;i++){const yy=sd.y+18+i*22,sw=Math.sin(now*2+i+ex)*3;ctx.beginPath();ctx.moveTo(ex,yy);ctx.quadraticCurveTo(ex+sw,yy+10,ex+sw*1.5,yy+20);ctx.stroke()}}}
 else if(th.id==='lava'){const pulse=.55+.45*Math.sin(now*2.2+sd.x);ctx.strokeStyle=`rgba(255,${Math.round(110+pulse*60)},40,${.35+pulse*.45})`;ctx.lineWidth=1.6;ctx.shadowBlur=10;ctx.shadowColor='#ff5a1f';
  for(let x=sd.x+30;x<x1-30;x+=95){let yy=sd.y+8,xx=x;ctx.beginPath();ctx.moveTo(xx,yy);for(let i=0;i<5;i++){xx+=(pfNoise(x+i)-.5)*22;yy+=12+pfNoise(x*3+i)*10;ctx.lineTo(xx,yy)}ctx.stroke()}}
 else{ctx.fillStyle='rgba(200,184,255,.45)';for(let x=sd.x+40;x<x1-20;x+=80)ctx.fillRect(x,sd.y+14,6,2)}
 ctx.restore();
}
// Piante, rocce e strutture sul terreno.
function pfDrawFlora(now){
 for(const f of pf.deco.themeBack.flora){
  if(!pfOnScreen(f.x,90))continue;
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.size*f.flip,f.size);
  const sway=Math.sin(now*1.4+f.seed)*.05;
  switch(f.kind){
   case'palma':ctx.strokeStyle='#5a4128';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(14,-50,6,-96);ctx.stroke();ctx.rotate(sway);ctx.strokeStyle='#2f8f55';ctx.lineWidth=4;for(const a of [-2.6,-2,-1.3,-.6,0]){ctx.beginPath();ctx.moveTo(6,-96);ctx.quadraticCurveTo(6+Math.cos(a)*30,-96+Math.sin(a)*30-14,6+Math.cos(a)*48,-96+Math.sin(a)*24+10);ctx.stroke()}ctx.fillStyle='#6b4a22';ctx.beginPath();ctx.arc(4,-92,4,0,6.28);ctx.arc(10,-90,4,0,6.28);ctx.fill();break;
   case'scoglio':ctx.fillStyle='#22404f';ctx.strokeStyle='#5fa9bf';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(-18,-20);ctx.lineTo(-2,-28);ctx.lineTo(16,-18);ctx.lineTo(26,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(220,250,255,.5)';ctx.fillRect(-8,-24,3,2);ctx.fillRect(6,-18,2,2);break;
   case'alga':ctx.strokeStyle='#3aa66a';ctx.lineWidth=3;ctx.lineCap='round';for(let i=-1;i<=1;i++){const sw2=Math.sin(now*2+f.seed+i)*6;ctx.beginPath();ctx.moveTo(i*6,0);ctx.quadraticCurveTo(i*6+sw2,-16,i*6-sw2*.5,-30-i*4);ctx.stroke()}break;
   case'cactus':ctx.fillStyle='#4c8a3a';ctx.strokeStyle='#8ccf6a';ctx.lineWidth=1;ctx.fillRect(-6,-70,12,70);ctx.strokeRect(-6,-70,12,70);ctx.beginPath();ctx.arc(0,-70,6,Math.PI,0);ctx.fill();ctx.fillRect(-20,-46,14,7);ctx.fillRect(-20,-62,7,20);ctx.fillRect(6,-36,13,7);ctx.fillRect(13,-54,7,22);ctx.strokeStyle='rgba(30,60,20,.5)';ctx.beginPath();ctx.moveTo(-2,-66);ctx.lineTo(-2,-4);ctx.moveTo(2,-66);ctx.lineTo(2,-4);ctx.stroke();break;
   case'roccia':ctx.fillStyle='#b07a3c';ctx.strokeStyle='#ffd99a55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(-24,-24);ctx.lineTo(-6,-36);ctx.lineTo(14,-30);ctx.lineTo(28,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='rgba(90,50,20,.5)';ctx.beginPath();ctx.moveTo(-24,-12);ctx.lineTo(22,-14);ctx.moveTo(-18,-24);ctx.lineTo(12,-24);ctx.stroke();break;
   case'teschio':ctx.fillStyle='#efe2c4';ctx.beginPath();ctx.ellipse(0,-7,10,7,0,0,6.28);ctx.fill();ctx.strokeStyle='#efe2c4';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-8,-10);ctx.quadraticCurveTo(-22,-26,-12,-30);ctx.moveTo(8,-10);ctx.quadraticCurveTo(22,-26,12,-30);ctx.stroke();ctx.fillStyle='#3a2a18';ctx.beginPath();ctx.arc(-4,-8,2,0,6.28);ctx.arc(4,-8,2,0,6.28);ctx.fill();break;
   case'albero':ctx.fillStyle='#3a2a1c';ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-5,-90);ctx.lineTo(5,-90);ctx.lineTo(9,0);ctx.closePath();ctx.fill();ctx.rotate(sway*.5);{const g=ctx.createRadialGradient(0,-112,6,0,-112,52);g.addColorStop(0,'#5fbf3c');g.addColorStop(1,'#1f4a1a');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-112,40,0,6.28);ctx.arc(-30,-92,26,0,6.28);ctx.arc(30,-94,26,0,6.28);ctx.fill()}ctx.fillStyle='rgba(200,255,150,.7)';for(let i=0;i<5;i++){const a=f.seed+i*1.3;ctx.beginPath();ctx.arc(Math.cos(a)*26,-108+Math.sin(a)*18,2,0,6.28);ctx.fill()}break;
   case'cespuglio':ctx.fillStyle='#2d6a2a';ctx.beginPath();ctx.arc(-12,-10,13,0,6.28);ctx.arc(8,-14,15,0,6.28);ctx.arc(22,-8,10,0,6.28);ctx.fill();ctx.fillStyle='#ff6fa8';ctx.beginPath();ctx.arc(-6,-18,2.5,0,6.28);ctx.arc(14,-22,2.5,0,6.28);ctx.fill();break;
   case'fungo':{const glow=.6+.4*Math.sin(now*2+f.seed);ctx.fillStyle='#d8e6c8';ctx.fillRect(-3,-24,6,24);ctx.shadowBlur=14*glow;ctx.shadowColor='#7affd0';ctx.fillStyle=`rgba(90,230,190,${.6+glow*.35})`;ctx.beginPath();ctx.ellipse(0,-24,16,9,0,Math.PI,0);ctx.fill();ctx.shadowBlur=0;break}
   case'roccia_lava':ctx.fillStyle='#1c1210';ctx.strokeStyle='#ff7a2a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(-20,-30);ctx.lineTo(0,-40);ctx.lineTo(20,-26);ctx.lineTo(26,0);ctx.closePath();ctx.fill();{const p=.5+.5*Math.sin(now*3+f.seed);ctx.strokeStyle=`rgba(255,140,50,${.4+p*.5})`;ctx.shadowBlur=8;ctx.shadowColor='#ff5a1f';ctx.beginPath();ctx.moveTo(-14,-24);ctx.lineTo(-4,-12);ctx.lineTo(6,-28);ctx.moveTo(-4,-12);ctx.lineTo(0,-2);ctx.stroke();ctx.shadowBlur=0}break;
   case'fumarola':ctx.fillStyle='#2a1a16';ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-8,-16);ctx.lineTo(8,-16);ctx.lineTo(18,0);ctx.closePath();ctx.fill();ctx.fillStyle='#ff8a3d';ctx.fillRect(-5,-17,10,3);for(let i=0;i<4;i++){const k=(now*.5+i/4+f.seed%1)%1;ctx.fillStyle=`rgba(90,70,70,${.45*(1-k)})`;ctx.beginPath();ctx.arc(Math.sin(k*5+i)*6,-22-k*80,6+k*16,0,6.28);ctx.fill()}break;
   case'cristallo_fuoco':case'cristallo':{const col=f.kind==='cristallo'?['#b9a6ff','#5a46a8']:['#ffb066','#c2380c'],p=.6+.4*Math.sin(now*2.5+f.seed);ctx.shadowBlur=14*p;ctx.shadowColor=col[0];for(const [dx,h,a] of [[-8,30,-.25],[0,44,0],[9,26,.3]]){ctx.save();ctx.translate(dx,0);ctx.rotate(a);const g=ctx.createLinearGradient(0,-h,0,0);g.addColorStop(0,col[0]);g.addColorStop(1,col[1]);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(6,-h*.7);ctx.lineTo(5,0);ctx.lineTo(-5,0);ctx.lineTo(-6,-h*.7);ctx.closePath();ctx.fill();ctx.restore()}ctx.shadowBlur=0;break}
   case'antenna':ctx.strokeStyle='#8b80c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(0,-80);ctx.lineTo(10,0);ctx.moveTo(-6,-26);ctx.lineTo(6,-26);ctx.moveTo(-3,-52);ctx.lineTo(3,-52);ctx.stroke();if(Math.sin(now*4+f.seed)>.3){ctx.fillStyle='#e2d8ff';ctx.shadowBlur=10;ctx.shadowColor='#c8b8ff';ctx.beginPath();ctx.arc(0,-82,3,0,6.28);ctx.fill();ctx.shadowBlur=0}break;
  }
  ctx.restore();
 }
}

// ---------------------------------------------------------------- avvio e flusso
function pfOpenBrief(){
 const p=planets[selected];
 show('resultOverlay',false);show('pauseOverlay',false);$('mapScreen').classList.remove('active');
 const th=pfTheme(p);$('landTitle').textContent='COLONIA DI '+p.name+' · '+th.name;
 $('landText').textContent=`I ribelli del Fronte Ombra vogliono rovesciare la Repubblica Intergalattica e hanno invaso la colonia di ${p.name}. ${th.brief} Atterra, avanza verso est e respingi i ribelli che ti vengono incontro. Lungo la strada libera i coloni prigionieri: ognuno ti lascia un rifornimento. In fondo ti aspetta ${pfBossInfo(p).name}, ${pfBossInfo(p).brief}: distruggilo. Il jetpack ti fa fare il doppio salto: tieni premuto per restare in volo. Premio della missione: ${p.reward} più un bonus per ogni ostaggio liberato.`;
 show('landBrief');sfx('ui');
}
function startPlatform(){
 const p=planets[selected],lvl=buildPlatformLevel(p);
 pf={p,...lvl,t:0,time:0,phase:'atterraggio',cam:{x:0,shake:0,lock:false,lockX:0},enemies:[],shots:[],grenades:[],pickups:[],fx:[],texts:[],waves:[],missiles:[],boss:null,kills:0,rescued:0,lives:3,checkpoint:330,spawnTimer:7,nextTrigger:0,jumpHeld:false,crowd:[],flash:0,banner:null,endT:0,rnd:pfRng(pfHash('azione'+p.code)),deco:null};
 pf.theme=pfTheme(p);pf.deco=pfDecor(p,lvl);pf.ambient=[];
 pf.pilot={x:372,y:540,w:22,h:50,vx:0,vy:0,ground:false,onPlat:false,face:1,aim:0,hp:100,shield:100,shieldDelay:0,barrier:false,inv:0,fire:0,grenades:3+(typeof upg==='function'?upg('grenades'):0),coyote:0,jumpBuf:0,dropT:0,crouch:false,run:0,lastGround:330,visible:false};
 state='platform';paused=false;keys={};mouse.down=false;mouse.right=false;frameSamples=[];
 document.body.classList.add('playing');
 show('hud',false);show('resultOverlay',false);show('pauseOverlay',false);show('landBrief',false);show('orbitCaption',false);$('mapScreen').classList.remove('active');
 show('platformHud');show('pfBoss',false);
 $('pfPlanet').textContent=p.name;
 pfBanner('FASE 2 · '+p.name+' · '+pf.theme.name,pf.theme.banner);if(typeof ecoStartPhase==='function')ecoStartPhase(2);
 pfStatus('DISCESA ATMOSFERICA · '+p.name,2600);sfx('boost');
 pfUpdateHud();
}
function pfFinish(win){
 if(state!=='platform'||!pf)return;
 state=win?'won':'lost';paused=false;
 document.body.classList.remove('playing');leaveGameFullscreen();
 show('platformHud',false);show('hud',false);show('resultOverlay');
 if(win){phaseTwoComplete=true;localStorage.setItem('frontieraPhaseTwoComplete','yes')}
 pfStatLabels(['RIBELLI','TEMPO','COLONI']);
 $('resultEyebrow').textContent=win?'COLONIA LIBERATA':'SEGNALE VITALE PERSO';
 $('resultTitle').textContent=win?'MISSIONE COMPIUTA':'PILOTA CADUTO';
 $('resultText').textContent=win?`${pfBossInfo(pf.p).name} è distrutto e la colonia di ${pf.p.name} torna sotto la protezione della Repubblica Intergalattica. Ostaggi liberati: ${pf.rescued} su ${pf.hostages.length}. Il premio della missione è stato accreditato.`:'I ribelli hanno respinto l’assalto. La colonia resiste ancora: riprova a liberarla.';
 $('killsStat').textContent=pf.kills;
 const sec=Math.floor(pf.time);$('timeStat').textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 $('hullStat').textContent=pf.rescued+'/'+pf.hostages.length;
 show('landBtn',false);show('marketBtnResult',false);$('returnBtn').querySelector('span').textContent='TORNA ALLA MAPPA';
 if(typeof ecoEndPhase==='function')ecoEndPhase(2,win,{kills:pf.kills,rescued:pf.rescued,hostages:pf.hostages.length});
}
// Chiamata da finish() della fase 1: dopo la conquista dell'orbita si può atterrare.
// Fine fase 1: solo due scelte, abbandonare o passare alla fase 2 (niente "ripeti").
function pfAfterSpaceFinish(win){pfStatLabels(['NEMICI','TEMPO','SCAFO']);$('landBtn').querySelector('span').textContent='LIBERA LA COLONIA · FASE 2';show('landBtn',win);show('marketBtnResult',false);$('returnBtn').querySelector('span').textContent=win?'ABBANDONA':'TORNA ALLA MAPPA';pfRefreshMapButton()}
// Chiamata da abort(): ritorno alla mappa.
function pfCleanup(){show('platformHud',false);show('landBrief',false);show('landBtn',false);pfStatLabels(['NEMICI','TEMPO','SCAFO']);pf=null;pfRefreshMapButton()}
// La fase 2 non si sceglie dalla mappa: ogni missione parte dallo spazio e poi atterra.
function pfRefreshMapButton(){show('phase2Btn',false)}
function pfStatLabels(labels){document.querySelectorAll('.result-stats small').forEach((el,i)=>{if(labels[i])el.textContent=labels[i]})}
function pfStatus(text,ms=1400){const el=$('pfStatus');el.textContent=text;clearTimeout(pfStatus.to);pfStatus.to=setTimeout(()=>{el.textContent=pf&&pf.phase==='boss'?'ABBATTI IL ROBOT':'SISTEMI NOMINALI'},ms)}
function pfBanner(title,sub,life=3.2){pf.banner={title,sub,t:0,life}}

// ---------------------------------------------------------------- aggiornamento
function updatePlatform(dt){
 if(!pf)return;
 pf.t+=dt;pf.flash=Math.max(0,pf.flash-dt);pf.cam.shake=Math.max(0,pf.cam.shake-dt*1.6);
 if(pf.banner){pf.banner.t+=dt;if(pf.banner.t>pf.banner.life)pf.banner=null}
 if(pf.phase!=='atterraggio')pf.time+=dt;
 const P=pf.pilot;
 if(pf.phase==='atterraggio')pfUpdateLanding(dt);
 if(P.visible)pfUpdatePilot(dt);
 if(state!=='platform')return;
 pfUpdateCamera(dt);
 if(pf.phase==='missione'){pfSpawnFromTriggers();pfPeriodicSpawn(dt)}
 pfUpdateEnemies(dt);
 if(pf.boss)pfUpdateBoss(dt);
 pfUpdateShots(dt);pfUpdateGrenades(dt);pfUpdateMissiles(dt);pfUpdateWaves(dt);
 pfUpdateHostages(dt);pfUpdatePickups(dt);pfUpdateAmbient(dt);
 for(const f of pf.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.96;f.vy=f.grav?f.vy+520*dt:f.vy*.96;f.life-=dt}
 pf.fx=pf.fx.filter(f=>f.life>0);if(pf.fx.length>700)pf.fx.splice(0,pf.fx.length-700);
 for(const t of pf.texts){t.t+=dt;t.y-=dt*28}pf.texts=pf.texts.filter(t=>t.t<1.6);
 if(pf.phase==='vittoria'){pf.endT+=dt;if(pf.endT>7.5)pfFinish(true)}
 if(pf.phase==='sconfitta'){pf.endT+=dt;if(pf.endT>1.8)pfFinish(false)}
 if(state==='platform')pfUpdateHud();
}
function pfUpdateLanding(dt){
 const P=pf.pilot;
 if(pf.t>1.9&&pf.t-dt<=1.9){if(typeof ecoFuel==='function')ecoFuel(15);pf.cam.shake=.5;noise(.5,.05,700);tone(70,.5,'sine',.06,35);for(let i=0;i<26;i++)pfBurst(250+Math.random()*180,PF_FLOOR-2,'#c7d6e2',1,1.4,true,{vy:-60-Math.random()*90})}
 if(pf.t>2.5&&!P.visible){P.visible=true;P.x=372;P.y=548;P.vx=150;P.vy=-260;tone(520,.12,'sine',.02,780)}
 if(pf.t>3.3){pf.phase='missione';pfStatus('COLONIA SOTTO ATTACCO · AVANZA VERSO EST',3200);tone(440,.18,'sine',.025,660)}
}
function pfShieldEff(){return 1+.35*(typeof upg==='function'?upg('shield'):0)}
function pfShoulder(o){return{x:o.x+o.face*2,y:o.y+(o.crouch?-26:-34)}}
function pfUpdatePilot(dt){
 const P=pf.pilot,control=(pf.phase==='missione'||pf.phase==='boss')&&P.hp>0;
 const left=control&&!!(keys.KeyA||keys.ArrowLeft),right=control&&!!(keys.KeyD||keys.ArrowRight),down=control&&!!(keys.KeyS||keys.ArrowDown),jumpKey=control&&!!(keys.KeyW||keys.ArrowUp||keys.Space);
 const jumpPressed=jumpKey&&!pf.jumpHeld;pf.jumpHeld=jumpKey;
 P.crouch=down&&P.ground;P.h=P.crouch?40:50;
 const run=PF_RUN*(1+.08*(typeof upg==='function'?upg('speed'):0)),dir=(right?1:0)-(left?1:0),target=dir*(P.crouch?run*.35:run),accel=P.ground?2300:1400;
 if(control||P.ground)P.vx+=pfClamp(target-P.vx,-accel*dt,accel*dt);
 P.coyote=P.ground?.1:P.coyote-dt;
 P.jumpBuf=jumpPressed?.13:P.jumpBuf-dt;
 if(P.jumpBuf>0){
  if(down&&P.ground&&P.onPlat){P.dropT=.25;P.jumpBuf=0;P.ground=false}
  else if(P.coyote>0){P.vy=-PF_JUMP;P.coyote=0;P.jumpBuf=0;P.ground=false;tone(300,.1,'triangle',.02,560)}
  else if(!P.ground&&jumpPressed&&pfJetReady(P)){P.jetOn=true;P.jumpBuf=0;P.vy=Math.min(P.vy,-PF_JUMP*.8);pfBurst(P.x,P.y-10,'#ffb05a',10,.8,false,{vy:220});noise(.25,.03,1800);tone(180,.25,'sawtooth',.015,90)}
 }
 pfUpdateJetpack(P,dt,control&&jumpKey);
 if(control&&!jumpKey&&!P.jetOn&&P.vy<-280)P.vy=-280;
 P.dropT-=dt;
 const wasGround=P.ground;
 pfMoveBody(P,dt,P.dropT>0);
 if(P.ground&&!wasGround&&P.visible)noise(.05,.016,900);
 const VW=pfViewW(),minX=pf.cam.x+16;
 if(P.x<minX){P.x=minX;P.vx=Math.max(0,P.vx)}
 const maxX=pf.cam.lockX+Math.min(VW,1500)-16;if(pf.cam.lock&&P.x>maxX){P.x=maxX;P.vx=Math.min(0,P.vx)}
 if(P.ground){P.run+=Math.abs(P.vx)*dt*.05;if(!P.onPlat&&pfGroundAt(P.x-12)!==null&&pfGroundAt(P.x+12)!==null)P.lastGround=P.x}
 if(P.y>PF_VH+140){pfFell();return}
 // Mira con il mouse, come la prua della nave in fase 1.
 const s=pfScale(),sh=pfShoulder(P),mx=pf.cam.x+mouse.x/s,my=mouse.y/s;
 if(control){P.aim=Math.atan2(my-sh.y,mx-sh.x);P.face=Math.cos(P.aim)>=0?1:-1}
 P.barrier=control&&mouse.right&&P.shield>0;
 if(P.barrier){P.shield=Math.max(0,P.shield-dt*8/pfShieldEff());P.shieldDelay=1.2}
 else{P.shieldDelay=Math.max(0,P.shieldDelay-dt);if(P.shieldDelay<=0)P.shield=Math.min(100,P.shield+dt*(phaseTwoComplete?18:13))}
 P.fire=Math.max(0,P.fire-dt);P.inv=Math.max(0,P.inv-dt);
 if(control&&mouse.down&&P.fire<=0)pfShoot();
}
function pfMoveBody(b,dt,drop=false){
 const hw=b.w/2,prevX=b.x;
 b.x+=b.vx*dt;b.wall=0;
 for(const s of pf.solids){
  if(b.y>s.y+.5&&b.x+hw>s.x&&b.x-hw<s.x+s.w){
   if(prevX+hw<=s.x+.5){b.x=s.x-hw;b.wall=1;b.vx=Math.min(0,b.vx)}
   else if(prevX-hw>=s.x+s.w-.5){b.x=s.x+s.w+hw;b.wall=-1;b.vx=Math.max(0,b.vx)}
  }
 }
 const prevY=b.y;
 b.vy=Math.min(PF_MAXFALL,b.vy+PF_GRAVITY*dt);b.y+=b.vy*dt;b.ground=false;b.onPlat=false;
 if(b.vy>=0){
  for(const s of pf.solids)if(b.x+hw>s.x+2&&b.x-hw<s.x+s.w-2&&prevY<=s.y+1&&b.y>=s.y){b.y=s.y;b.vy=0;b.ground=true;break}
  if(!b.ground&&!drop)for(const p of pf.plats)if(b.x+hw>p.x&&b.x-hw<p.x+p.w&&prevY<=p.y+1&&b.y>=p.y){b.y=p.y;b.vy=0;b.ground=true;b.onPlat=true;break}
 }
}
function pfUpdateCamera(dt){
 const P=pf.pilot,VW=pfViewW();
 if(!pf.cam.lock){const target=P.x-VW*.38;if(target>pf.cam.x)pf.cam.x+=(target-pf.cam.x)*Math.min(1,dt*6)}
 else pf.cam.x+=(pf.cam.lockX-pf.cam.x)*Math.min(1,dt*3);
 if(!pf.cam.lock&&pf.phase==='missione'&&P.x>pf.arenaX+140)pfEnterArena();
}
function pfEnterArena(){
 pf.cam.lock=true;pf.cam.lockX=pf.arenaX;pf.phase='boss';pf.checkpoint=pf.arenaX+120;
 pf.enemies=pf.enemies.filter(e=>e.x>pf.arenaX-40);
 pfSpawnBoss();
 pfStatus('ALLARME · ROBOT DA GUERRA IN ARRIVO',3000);
 tone(240,.3,'square',.025,120);tone(240,.3,'square',.025,120,.4);
}
function pfSpawnFromTriggers(){
 const right=pf.cam.x+pfViewW()+40;
 while(pf.nextTrigger<pf.triggers.length&&pf.triggers[pf.nextTrigger].x<=right){
  const t=pf.triggers[pf.nextTrigger++];
  if(t.type==='cecchino')pfSpawnEnemy('cecchino',t.x,t.plat.y);else pfSpawnEnemy(t.type,Math.max(t.x,right-10));
 }
}
function pfPeriodicSpawn(dt){
 const d=pf.p.difficulty,alive=pf.enemies.length;
 pf.spawnTimer-=dt;
 if(pf.spawnTimer<=0){pf.spawnTimer=Math.max(1.6,4.8-d*.45)+pf.rnd()*1.8;if(alive<3+d&&pf.pilot.x<pf.arenaX-700)pfSpawnEnemy('soldato',pf.cam.x+pfViewW()+40)}
}
function pfSpawnEnemy(type,x,y){
 const d=pf.p.difficulty,rnd=pf.rnd;
 if(type==='drone'){const g=pfGroundAt(x)??PF_FLOOR;pf.enemies.push({type,x,y:g-230,w:34,h:22,vx:-80,vy:0,hp:3,max:3,fire:1.4+rnd(),side:rnd()<.5?-1:1,t:rnd()*6,hit:0,face:-1,aim:Math.PI});return}
 if(y===undefined){let g=null;for(let i=0;i<12&&g===null;i++){g=pfGroundAt(x);if(g===null)x+=40}if(g===null)return;y=g}
 const sniper=type==='cecchino',hp=sniper?4:3+(d>=3?1:0);
 pf.enemies.push({type,x,y,w:22,h:48,vx:0,vy:0,ground:false,hp,max:hp,fire:sniper?2:1+rnd()*.8,range:sniper?0:220+rnd()*200,speed:95+d*10+rnd()*25,run:rnd()*6,hit:0,face:-1,aim:Math.PI,locked:null});
}
function pfRect(e){return e.type==='drone'?{l:e.x-e.w/2,r:e.x+e.w/2,t:e.y-e.h/2,b:e.y+e.h/2}:{l:e.x-e.w/2,r:e.x+e.w/2,t:e.y-e.h,b:e.y}}
function pfOverlap(a,b){return a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t}
function pfOnScreen(x,m=20){return x>pf.cam.x-m&&x<pf.cam.x+pfViewW()+m}
function pfUpdateEnemies(dt){
 const P=pf.pilot,d=pf.p.difficulty,pr=pfRect(P),chest={x:P.x,y:P.y-(P.crouch?22:30)};
 for(const e of pf.enemies){
  if(e.hp<=0)continue;
  e.hit=Math.max(0,e.hit-dt);
  const dx=P.x-e.x,dist=Math.abs(dx),seen=pfOnScreen(e.x)&&P.hp>0&&pf.phase!=='vittoria';
  e.face=dx>=0?1:-1;
  if(e.type==='drone'){
   e.t+=dt;
   const tx=P.x+e.side*150,ty=P.y-205+Math.sin(e.t*2)*18;
   e.vx+=pfClamp((tx-e.x)*1.3-e.vx,-260*dt*3,260*dt*3);e.vy+=pfClamp((ty-e.y)*1.5-e.vy,-200*dt*3,200*dt*3);
   e.vx=pfClamp(e.vx,-170,170);e.vy=pfClamp(e.vy,-130,130);e.x+=e.vx*dt;e.y+=e.vy*dt;
   e.aim=Math.atan2(chest.y-e.y,chest.x-e.x);
   if(seen){e.fire-=dt;if(e.fire<=0){pfEnemyShot(e.x,e.y+8,e.aim,330+d*15,11);e.fire=2.3-d*.12+pf.rnd()*.6}}
  }else if(e.type==='cecchino'){
   pfMoveBody(e,dt);
   const sh=pfShoulder(e),want=Math.atan2(chest.y-sh.y,chest.x-sh.x);
   if(seen){e.fire-=dt;if(e.fire>.28||e.locked===null)e.aim=want;if(e.fire<=.28&&e.locked===null)e.locked=e.aim;if(e.fire<=0){pfEnemyShot(sh.x+Math.cos(e.locked)*26,sh.y+Math.sin(e.locked)*26,e.locked,640+d*20,14);e.locked=null;e.fire=2.5+pf.rnd()*.8-d*.1}}
   else e.aim=want;
  }else{
   let move=0;
   if(P.hp>0&&dist>e.range)move=e.face;
   if(move&&e.ground){
    const ahead=e.x+move*(e.w/2+10),g=pfGroundAt(ahead);
    if(g===null&&!e.onPlat)move=0;
    else if(g!==null&&g<e.y-4){if(e.y-g<=90&&e.wall)e.vy=-600;else if(e.y-g>90)move=0}
   }
   const target=move*e.speed;e.vx+=pfClamp(target-e.vx,-900*dt,900*dt);
   pfMoveBody(e,dt);
   if(e.ground)e.run+=Math.abs(e.vx)*dt*.05;
   const sh=pfShoulder(e);let a=Math.atan2(chest.y-sh.y,chest.x-sh.x);
   const base=e.face>0?0:Math.PI,rel=Math.atan2(Math.sin(a-base),Math.cos(a-base));a=base+pfClamp(rel,-.7,.7);e.aim=a;
   if(seen&&dist<700&&e.ground){e.fire-=dt;if(e.fire<=0){pfEnemyShot(sh.x+Math.cos(a)*26,sh.y+Math.sin(a)*26,a,390+d*25,14);e.fire=1.7-d*.1+pf.rnd()*.7}}
   if(e.y>PF_VH+120)e.hp=0;
  }
  if(P.visible&&P.hp>0&&pfOverlap(pr,pfRect(e)))pfDamage(e.type==='drone'?12:14,Math.sign(P.x-e.x)||1);
 }
 pf.enemies=pf.enemies.filter(e=>e.hp>0&&e.x>pf.cam.x-500);
}
function pfEnemyShot(x,y,a,speed,dmg){pf.shots.push({x,y,px:x,py:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:3,friendly:false,r:4,dmg});pfBurst(x,y,'#ff5268',3,.5);tone(620,.09,'square',.01,240)}
function pfShoot(){
 const P=pf.pilot;P.fire=.14;const lv=typeof upg==='function'?upg('laser'):0,sh=pfShoulder(P),c=Math.cos(P.aim),s=Math.sin(P.aim),x=sh.x+c*30,y=sh.y+s*30;
 const offs=(typeof upg==='function'&&upg('twin')>0)?[-5,5]:[0];
 for(const o of offs){const ox=x-s*o,oy=y+c*o;pf.shots.push({x:ox,y:oy,px:ox,py:oy,vx:c*920,vy:s*920,life:.95,friendly:true,r:3+lv*.6,dmg:1+lv*.5,power:lv})}if(typeof pay==='function')pay('laser',offs.length);
 pfBurst(x,y,'#51e6ff',3,.6);sfx('shoot');
}
function pfThrowGrenade(){
 if(!pf||state!=='platform'||paused)return;const P=pf.pilot;
 if(!(pf.phase==='missione'||pf.phase==='boss')||P.hp<=0)return;
 if(P.grenades<=0){pfStatus('GRANATE ESAURITE');tone(180,.1,'square',.015);return}
 if(typeof canPay==='function'&&!canPay('granata')){pfStatus('CREDITI INSUFFICIENTI PER LA GRANATA');tone(180,.1,'square',.015);return}
 if(typeof pay==='function')pay('granata');
 P.grenades--;const sh=pfShoulder(P),c=Math.cos(P.aim),s=Math.sin(P.aim);
 pf.grenades.push({x:sh.x+c*16,y:sh.y+s*16,vx:c*520+P.vx*.4,vy:s*520-200,t:1.3,rot:0});
 tone(260,.12,'triangle',.02,140);
}
// Collisione "spazzata" segmento/rettangolo: i colpi veloci non attraversano i bersagli.
function pfSegRect(x0,y0,x1,y1,r,pad=0){
 let t0=0,t1=1;const dx=x1-x0,dy=y1-y0;
 for(const [p,q] of [[-dx,x0-(r.l-pad)],[dx,(r.r+pad)-x0],[-dy,y0-(r.t-pad)],[dy,(r.b+pad)-y0]]){
  if(p===0){if(q<0)return null}else{const t=q/p;if(p<0){if(t>t1)return null;if(t>t0)t0=t}else{if(t<t0)return null;if(t<t1)t1=t}}
 }
 return t0;
}
function pfInSolid(x,y){for(const s of pf.solids)if(x>=s.x&&x<=s.x+s.w&&y>=s.y)return true;return false}
function pfUpdateShots(dt){
 const P=pf.pilot,VW=pfViewW();
 for(const b of pf.shots){
  if(b.life<=0)continue;
  b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.x<pf.cam.x-80||b.x>pf.cam.x+VW+80||b.y<-80||b.y>PF_VH+40){b.life=0;continue}
  const ob=pfShotObstacle(b);if(ob){b.life=0;pfBurst(ob.x,ob.y,b.friendly?'#8ce9ec':'#ff8a96',5,.55);continue}
  if(b.friendly){
   let best=null,bt=Infinity;
   for(const e of pf.enemies){if(e.hp<=0)continue;const t=pfSegRect(b.px,b.py,b.x,b.y,pfRect(e),b.r);if(t!==null&&t<bt){bt=t;best=e}}
   for(const m of pf.missiles){if(m.hp<=0)continue;const t=pfSegRect(b.px,b.py,b.x,b.y,{l:m.x-7,r:m.x+7,t:m.y-7,b:m.y+7},b.r);if(t!==null&&t<bt){bt=t;best=m}}
   const B=pf.boss;if(B&&B.hp>0&&B.state!=='caduta'){const t=pfSegRect(b.px,b.py,b.x,b.y,pfBossRect(B),b.r);if(t!==null&&t<bt){bt=t;best=B}}
   if(best){b.life=0;const hx=b.px+(b.x-b.px)*bt,hy=b.py+(b.y-b.py)*bt;if(best===B)pfHitBoss(b.dmg,hx,hy);else if(pf.missiles.includes(best))pfExplodeMissile(best);else pfHitEnemy(best,b.dmg);pfBurst(hx,hy,'#ffb36b',4,.6)}
  }else if(P.visible&&P.hp>0){
   const t=pfSegRect(b.px,b.py,b.x,b.y,pfRect(P),b.r+(P.barrier?10:0));
   if(t!==null){b.life=0;pfDamage(b.dmg,Math.sign(b.vx)||1)}
  }
 }
 pf.shots=pf.shots.filter(b=>b.life>0);
}
function pfHitEnemy(e,n){
 if(e.hp<=0)return;e.hp-=n;e.hit=.12;
 if(e.hp<=0){
  pf.kills++;pfBurst(e.x,e.type==='drone'?e.y:e.y-24,'#ff7b4f',e.type==='drone'?22:16,1.1);pfBurst(e.x,e.type==='drone'?e.y:e.y-24,'#ffd29a',8,.7);sfx('boom',e.type==='drone'?.9:.6);
  if(pf.rnd()<.13)pfDrop(e.x,e.type==='drone'?e.y:e.y-30,pf.pilot.hp<60?'salute':pf.rnd()<.5?'granate':'scudo');
 }else sfx('hit');
}
function pfDamage(n,dir=1,piercing=false){
 const P=pf.pilot;if(P.hp<=0||pf.phase==='vittoria')return;
 if(!piercing&&P.barrier&&P.shield>0){P.shield=Math.max(0,P.shield-n*1.6/pfShieldEff());if(P.shield<=0){P.barrier=false;pfStatus('SCUDO ESAURITO')}pfBurst(P.x,P.y-28,'#51e6ff',6,.7);sfx('shield');return}
 if(!piercing&&P.inv>0)return;
 P.hp-=n;P.inv=.9;pf.flash=.35;P.vx=dir*230;if(P.ground)P.vy=-220;
 pfBurst(P.x,P.y-28,'#ffb36b',10,.8);sfx('hit');
 if(P.hp<=0)pfLoseLife();
}
function pfFell(){
 const P=pf.pilot,th=pf.theme||pfTheme(pf.p);P.hp-=th.fallDamage;pf.flash=.4;sfx('hit');pfThemeSplash(P.x);
 if(P.hp<=0){pfLoseLife();return}
 const g=pfGroundAt(P.lastGround)??PF_FLOOR;P.x=P.lastGround;P.y=g;P.vx=0;P.vy=0;P.inv=1.2;
 pfStatus(th.fall+' · SALUTE −'+th.fallDamage,1800);
}
function pfLoseLife(){
 const P=pf.pilot;P.hp=0;pf.lives--;pfBurst(P.x,P.y-25,'#ff7b4f',24,1.2);pfBurst(P.x,P.y-25,'#51e6ff',12,.8);sfx('boom',1);
 if(pf.lives<=0){pf.phase='sconfitta';pf.endT=0;P.visible=false;pfStatus('PILOTA CADUTO',3000);return}
 let x=pf.checkpoint;if(pfGroundAt(x)===null){const next=pf.solids.find(s=>s.x>x);if(next)x=next.x+60}
 Object.assign(P,{x,y:(pfGroundAt(x)??PF_FLOOR)-2,vx:0,vy:0,hp:100,shield:100,inv:2.2,ground:false,lastGround:x});
 if(!pf.cam.lock)pf.cam.x=Math.min(pf.cam.x,x-pfViewW()*.3);
 pf.shots=pf.shots.filter(b=>b.friendly);
 pfStatus('PILOTA RECUPERATO · VITE RIMASTE '+pf.lives,2400);
}
function pfUpdateGrenades(dt){
 for(const g of pf.grenades){
  const px=g.x,py=g.y;g.vy+=PF_GRAVITY*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.t-=dt;g.rot+=g.vx*dt*.05;
  for(const s of pf.solids)if(g.x>=s.x&&g.x<=s.x+s.w&&g.y>=s.y){if(py<s.y){g.y=s.y-1;g.vy*=-.42;g.vx*=.72}else{g.x=px;g.vx*=-.5}break}
  for(const p of pf.plats)if(g.vy>0&&g.x>=p.x&&g.x<=p.x+p.w&&py<=p.y&&g.y>=p.y){g.y=p.y-1;g.vy*=-.42;g.vx*=.72}
  let touch=pf.enemies.some(e=>e.hp>0&&pfOverlap(pfRect(e),{l:g.x-5,r:g.x+5,t:g.y-5,b:g.y+5}));
  if(pf.boss&&pf.boss.hp>0&&pfOverlap(pfBossRect(pf.boss),{l:g.x-5,r:g.x+5,t:g.y-5,b:g.y+5}))touch=true;
  if(g.t<=0||touch||g.y>PF_VH+60){g.t=-1;pfExplosion(g.x,g.y)}
 }
 pf.grenades=pf.grenades.filter(g=>g.t>0);
}
function pfExplosion(x,y){
 const R=120;
 for(const e of pf.enemies){if(e.hp<=0)continue;const r=pfRect(e),cx=(r.l+r.r)/2,cy=(r.t+r.b)/2;if(Math.hypot(cx-x,cy-y)<R+16)pfHitEnemy(e,4)}
 for(const m of pf.missiles)if(m.hp>0&&Math.hypot(m.x-x,m.y-y)<R)pfExplodeMissile(m);
 const B=pf.boss;if(B&&B.hp>0&&B.state!=='caduta'){const r=pfBossRect(B),nx=pfClamp(x,r.l,r.r),ny=pfClamp(y,r.t,r.b);if(Math.hypot(nx-x,ny-y)<R*.7)pfHitBoss(6,nx,ny)}
 pfBurst(x,y,'#ffb05a',30,1.6);pfBurst(x,y,'#fff1c9',12,.9);pfBurst(x,y,'#6d6f78',14,.7,true,{vy:-120});
 pf.fx.push({x,y,vx:0,vy:0,life:.3,max:.3,color:'#ffd7a0',r:46,soft:true});
 pf.cam.shake=Math.max(pf.cam.shake,.45);sfx('boom',1.4);
}
function pfDrop(x,y,kind){pf.pickups.push({x,y,vy:-220,kind,life:20,ground:false})}
function pfUpdatePickups(dt){
 const P=pf.pilot,pr=pfRect(P);
 for(const k of pf.pickups){
  k.life-=dt;
  if(!k.ground){const py=k.y;k.vy=Math.min(700,k.vy+PF_GRAVITY*.6*dt);k.y+=k.vy*dt;
   const g=pfGroundAt(k.x);if(g!==null&&py<=g&&k.y>=g-10){k.y=g-10;k.ground=true}
   for(const p of pf.plats)if(k.vy>0&&k.x>=p.x&&k.x<=p.x+p.w&&py<=p.y-10&&k.y>=p.y-10){k.y=p.y-10;k.ground=true}
   if(k.y>PF_VH+50)k.life=0}
  if(P.visible&&P.hp>0&&pfOverlap(pr,{l:k.x-12,r:k.x+12,t:k.y-12,b:k.y+12})){
   k.life=0;
   if(k.kind==='salute'){P.hp=Math.min(100,P.hp+30);pfStatus('KIT MEDICO · SALUTE +30%')}
   else if(k.kind==='granate'){P.grenades+=2;pfStatus('GRANATE +2')}
   else{P.shield=Math.min(100,P.shield+40);pfStatus('CELLA SCUDO · +40%');sfx('shield')}
   pfText(k.x,k.y-20,k.kind==='salute'?'+30 SALUTE':k.kind==='granate'?'+2 GRANATE':'+40 SCUDO','#8df1ad');sfx('ui');
  }
 }
 pf.pickups=pf.pickups.filter(k=>k.life>0);
}
function pfUpdateHostages(dt){
 const P=pf.pilot;
 for(const h of [...pf.hostages,...pf.crowd]){
  h.t+=dt;
  if(h.state==='legato'&&P.visible&&P.hp>0&&Math.abs(P.x-h.x)<30&&Math.abs(P.y-h.y)<60){
   h.state='libero';h.t=0;pf.rescued++;pf.checkpoint=h.x;
   pfText(h.x,h.y-70,'GRAZIE!','#ffe1a8');
   pfStatus('COLONO SALVATO · '+pf.rescued+'/'+pf.hostages.length,2400);pfText(h.x,h.y-88,'PUNTO DI CONTROLLO','#8ce9ec');
   tone(523,.14,'sine',.03);tone(659,.14,'sine',.03,0,.12);tone(784,.28,'sine',.03,0,.24);
   const kinds=P.hp<70?['salute','granate']:['granate','scudo'];pfDrop(h.x+20,h.y-40,kinds[pf.rescued%2]);
  }else if(h.state==='libero'&&h.t>.9){h.state='fuga';h.t=0;if(!h.crowd)pfText(h.x,h.y-70,'CORRO ALLA NAVE!','#ffe1a8')}
  else if(h.state==='fuga'){
   // il colono liberato corre indietro verso la nave atterrata; i burroni li supera con un salto
   const sp=250+(h.id%3)*25;h.x-=sp*dt;const g=pfGroundAt(h.x);
   if(g!==null&&!h.air){h.y=g;h.hop=0}else{h.air=true;h.hop=(h.hop||0)+dt;h.y=(h.jy??(h.jy=h.y))-Math.sin(Math.min(1,h.hop/.7)*Math.PI)*90;if(h.hop>=.7&&g!==null){h.air=false;h.jy=undefined;h.y=g}else if(h.hop>=.7){h.hop=.35}}
   if(h.x<=360){h.state='evacuato';h.t=0;h.x=360;noise(.6,.02,4000);tone(880,.5,'sine',.02,1760)}
   else if(h.x<pf.cam.x-160)h.state='salvo';
  }
  else if(h.state==='evacuato'&&h.t>1)h.state='salvo';
 }
}
function pfText(x,y,text,color){pf.texts.push({x,y,text,color,t:0})}
function pfBurst(x,y,color,n=8,power=1,grav=false,extra={}){
 for(let i=0;i<n;i++){const a=Math.random()*6.28,s=Math.random()*150*power,life=.35+Math.random()*.55;pf.fx.push({x,y,vx:Math.cos(a)*s+(extra.vx||0),vy:Math.sin(a)*s+(extra.vy||0),life,max:life,color,r:1+Math.random()*3*Math.min(1.6,power),grav})}
}

// ---------------------------------------------------------------- robot boss: TITANO R-9
function pfSpawnBoss(){
 const d=pf.p.difficulty,max=130+d*35,VW=pfViewW();
 const I=pfBossInfo(pf.p),mx=Math.round(max*I.hp);$('pfBoss').querySelector('span').textContent=I.name+' · '+I.sub;
 pf.boss={kind:I.id,x:pf.arenaX+Math.min(VW,1500)-190,y:-260,w:I.w,h:I.h,vx:0,vy:0,hp:mx,max:mx,state:'caduta',t:0,face:-1,aim:Math.PI,hit:0,shots:0,legT:0,last:'',rage:false,dead:0,charge:0};
 show('pfBoss');
}
function pfBossRect(B){return{l:B.x-B.w/2,r:B.x+B.w/2,t:B.y-B.h,b:B.y}}
function pfBossMuzzle(B){const g=pfBossInfo(pf.p).gun,px=B.x+B.face*g.x,py=B.y-g.y;return{x:px+Math.cos(B.aim)*g.len,y:py+Math.sin(B.aim)*g.len,px,py}}
function pfBossSet(B,st,t=0){B.state=st;B.t=t;B.shots=0}
function pfUpdateBoss(dt){
 const B=pf.boss,P=pf.pilot,VW=pfViewW(),minX=pf.cam.lockX+90,maxX=pf.cam.lockX+Math.min(VW,1500)-70;
 B.hit=Math.max(0,B.hit-dt);B.t+=dt;
 if(B.state==='distrutto'){
  B.dead+=dt;
  if(B.dead<2.3&&Math.random()<dt*14){const x=B.x+(Math.random()-.5)*B.w,y=B.y-Math.random()*B.h;pfBurst(x,y,'#ffb05a',14,1.1);pfBurst(x,y,'#fff1c9',5,.6);sfx('boom',.8);pf.cam.shake=Math.max(pf.cam.shake,.3)}
  if(B.dead>=2.3&&!B.gone){B.gone=true;pfBurst(B.x,B.y-100,'#ffb05a',60,2.4);pfBurst(B.x,B.y-100,'#ffffff',20,1.4);pfBurst(B.x,B.y-100,'#7d8794',30,1.2,true,{vy:-200});pf.cam.shake=1.2;pf.flash=.2;sfx('boom',2.2);show('pfBoss',false);pfBanner('COLONIA LIBERATA','LA REPUBBLICA INTERGALATTICA RINGRAZIA',3.6);pfFreeColony()}
  return;
 }
 // Fisica verticale semplice sul pavimento dell'arena.
 const prevY=B.y;B.vy=Math.min(1400,B.vy+PF_GRAVITY*dt);B.y+=B.vy*dt;let landed=false;
 if(B.y>=PF_FLOOR){B.y=PF_FLOOR;if(B.vy>300&&prevY<PF_FLOOR)landed=true;B.vy=0}
 const dx=P.x-B.x;if(B.state!=='carica')B.face=dx>=0?1:-1;
 const G0=pfBossInfo(pf.p).gun,mz0={x:B.x+B.face*G0.x,y:B.y-G0.y},want=Math.atan2(P.y-30-mz0.y,P.x-mz0.x),base=B.face>0?0:Math.PI;
 B.aim=base+pfClamp(Math.atan2(Math.sin(want-base),Math.cos(want-base)),-1,1);
 if(!B.rage&&B.hp<B.max/2){B.rage=true;pfStatus(pfBossInfo(pf.p).name+' · MODALITÀ FURIA',2600);pfBanner('MODALITÀ FURIA','IL ROBOT LANCIA MISSILI · ABBATTILI IN VOLO',2.4)}
 const rage=B.rage;
 if(landed){pf.cam.shake=Math.max(pf.cam.shake,.7);noise(.5,.08,600);tone(60,.6,'sine',.08,30);for(let i=0;i<20;i++)pfBurst(B.x+(Math.random()-.5)*130,PF_FLOOR-2,'#c7d6e2',1,1.2,true,{vy:-80})}
 switch(B.state){
  case'caduta':if(landed){pfBossSet(B,'ruggito');pfBanner(pfBossInfo(pf.p).name,pfBossInfo(pf.p).sub,3);tone(90,1.2,'sawtooth',.03,45)}break;
  case'ruggito':if(B.t>1.4)pfBossSet(B,'pausa');break;
  case'pausa':if(B.t>(rage?.55:.9)){
   const I=pfBossInfo(pf.p),options=[...I.moves,...(rage?['missili',I.moves[1]]:[])].filter(o=>o!==B.last);
   const next=options[Math.floor(pf.rnd()*options.length)];B.last=next;pfBossSet(B,next);
   if(next==='carica'){pfStatus('CARICA IN ARRIVO · SALTA COL JETPACK',1800);tone(330,.2,'square',.02,220)}
   if(next==='onda')pfStatus('ONDA D’URTO · SALTA!',1500);
  }break;
  case'passi':{const sp=(rage?115:75)*pfBossInfo(pf.p).speed;B.vx=Math.abs(dx)>170?B.face*sp:0;B.legT+=Math.abs(B.vx)*dt*.04;if(B.t>1.5){B.vx=0;pfBossSet(B,'pausa')}break}
  case'raffica':{const n=rage?5:3;if(B.t>.45+B.shots*.2&&B.shots<n){B.shots++;const m=pfBossMuzzle(B);for(const off of rage?[-.14,0,.14]:[0])pfEnemyShot(m.x,m.y,B.aim+off,430,Math.round(13*(pfBossInfo(pf.p).dmg||1)));pf.cam.shake=Math.max(pf.cam.shake,.12)}if(B.t>.45+n*.2+.4)pfBossSet(B,'pausa');break}
  case'onda':if(B.t>.5&&B.shots===0){B.shots=1;B.vy=-560}
   if(B.shots===1&&landed){B.shots=2;for(const dir of [-1,1])pf.waves.push({x:B.x+dir*60,dir,speed:rage?520:440,life:3,hit:false});pf.cam.shake=Math.max(pf.cam.shake,.9)}
   if(B.shots===2&&B.t>1.6)pfBossSet(B,'pausa');break;
  case'carica':if(B.t<.8){B.vx=0;B.charge=B.t/.8}else{if(B.shots===0){B.shots=1;B.face=dx>=0?1:-1;noise(.6,.05,1400)}B.vx=B.face*600;B.legT+=dt*12;if((B.face>0&&B.x>=maxX-2)||(B.face<0&&B.x<=minX+2)){B.vx=0;B.charge=0;pf.cam.shake=.6;noise(.4,.06,500);pfBossSet(B,'stordito');pfStatus('NUCLEO ESPOSTO · DANNO DOPPIO',1600)}}break;
  case'stordito':if(B.t>1.3)pfBossSet(B,'pausa');break;
  case'missili':{const n=rage?3:2;if(B.t>.3+B.shots*.28&&B.shots<n){B.shots++;const pd=pfBossInfo(pf.p).pod,x=B.x+B.face*pd.x,y=B.y-pd.y;pf.missiles.push({x,y,vx:(pf.rnd()-.5)*160,vy:-430,angle:-Math.PI/2,hp:1,life:5.5,t:0});noise(.3,.03,3000);tone(150,.3,'sawtooth',.02,500)}if(B.t>.3+n*.28+.6)pfBossSet(B,'pausa');break}
 }
 B.x=pfClamp(B.x+B.vx*dt,minX,maxX);
 if(P.visible&&P.hp>0&&pfOverlap(pfRect(P),pfBossRect(B))){pfDamage(B.state==='carica'?25:18,Math.sign(P.x-B.x)||-1);P.vx=(Math.sign(P.x-B.x)||-1)*430;P.vy=-330}
}
function pfHitBoss(n,x,y){
 const B=pf.boss;if(!B||B.hp<=0)return;
 const mult=B.state==='stordito'?2:1;B.hp-=n*mult;B.hit=.09;
 pfBurst(x??B.x,y??B.y-120,mult>1?'#ff8a96':'#ffd29a',mult>1?6:3,.6);
 if(B.hp<=0){B.hp=0;pfBossSet(B,'distrutto');B.vx=0;pf.kills++;pf.phase='vittoria';pf.endT=0;pf.waves=[];pf.missiles=[];pf.shots=pf.shots.filter(s=>s.friendly);pfStatus(pfBossInfo(pf.p).name+' DISTRUTTO',3000)}
}
function pfUpdateWaves(dt){
 const P=pf.pilot,VW=pfViewW();
 for(const w of pf.waves){
  w.x+=w.dir*w.speed*dt;w.life-=dt;
  if(Math.random()<dt*30)pf.fx.push({x:w.x,y:PF_FLOOR-4,vx:-w.dir*40,vy:-60-Math.random()*80,life:.5,max:.5,color:'#ffb05a',r:2+Math.random()*2,grav:true});
  if(!w.hit&&P.visible&&P.hp>0&&Math.abs(P.x-w.x)<20&&P.y>PF_FLOOR-26){w.hit=true;pfDamage(18,w.dir)}
  if(w.x<pf.cam.x-40||w.x>pf.cam.x+VW+40)w.life=0;
 }
 pf.waves=pf.waves.filter(w=>w.life>0);
}
function pfUpdateMissiles(dt){
 const P=pf.pilot;
 for(const m of pf.missiles){
  if(m.hp<=0)continue;m.t+=dt;m.life-=dt;
  if(m.t>.55&&P.hp>0){const want=Math.atan2(P.y-28-m.y,P.x-m.x),delta=Math.atan2(Math.sin(want-m.angle),Math.cos(want-m.angle));m.angle+=pfClamp(delta,-2.3*dt,2.3*dt);const sp=Math.min(330,Math.hypot(m.vx,m.vy)+300*dt);m.vx=Math.cos(m.angle)*sp;m.vy=Math.sin(m.angle)*sp}
  else{m.vy+=200*dt;m.angle=Math.atan2(m.vy,m.vx)}
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  if(Math.random()<dt*40)pf.fx.push({x:m.x-Math.cos(m.angle)*10,y:m.y-Math.sin(m.angle)*10,vx:0,vy:0,life:.35,max:.35,color:'#ffc47a',r:2.4,soft:true});
  if(P.visible&&P.hp>0&&pfOverlap(pfRect(P),{l:m.x-6,r:m.x+6,t:m.y-6,b:m.y+6})){pfExplodeMissile(m);pfDamage(16,Math.sign(m.vx)||1)}
  else if(m.life<=0||pfInSolid(m.x,m.y))pfExplodeMissile(m);
 }
 pf.missiles=pf.missiles.filter(m=>m.hp>0);
}
function pfExplodeMissile(m){if(m.hp<=0)return;m.hp=0;pfBurst(m.x,m.y,'#ffb05a',16,1);sfx('boom',.7)}

// ---------------------------------------------------------------- HUD
function pfUpdateHud(){
 const P=pf.pilot,hp=Math.max(0,Math.min(100,P.hp));
 $('pfHealthBar').style.width=hp+'%';$('pfHealthBar').classList.toggle('hull-critical',hp<40);$('pfHealthText').textContent=Math.ceil(hp)+'%';
 $('pfShieldBar').style.width=P.shield+'%';$('pfShieldText').textContent=Math.ceil(P.shield)+'%';
 $('pfLives').textContent=pf.lives;$('pfRescued').textContent=pf.rescued+'/'+pf.hostages.length;$('pfGrenades').textContent=P.grenades;$('pfKills').textContent=pf.kills;
 $('pfProgress').style.width=Math.max(0,Math.min(100,P.x/pf.arenaX*100))+'%';
 $('pfObjective').textContent=pf.phase==='boss'||pf.phase==='vittoria'?'DISTRUGGI '+pfBossInfo(pf.p).name:pf.hostages.some(h=>h.state==='legato'&&h.x>P.x)?'LIBERA I COLONI · RAGGIUNGI IL ROBOT':'RAGGIUNGI IL ROBOT';
 if(pf.boss)$('pfBossBar').style.width=Math.max(0,pf.boss.hp/pf.boss.max*100)+'%';
}

// ---------------------------------------------------------------- disegno
function drawPlatform(){
 if(!pf)return;
 const s=pfScale(),VW=pfViewW(),cx=pf.cam.x,p=pf.p,now=performance.now()/1000;
 ctx.clearRect(0,0,W,H);
 const th=pf.theme||(pf.theme=pfTheme(p));const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,th.sky[0]);sky.addColorStop(.5,th.sky[1]);sky.addColorStop(.82,th.sky[2]);sky.addColorStop(1,th.sky[0]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H*.66);ctx.clip();drawStarfield(0,0);ctx.restore();
 drawWorld({x:W*.8-cx*s*.012,y:H*.19,r:Math.min(W,H)*.09,p:planets[(selected+2)%planets.length]});
 ctx.save();
 if(pf.cam.shake>0){const k=pf.cam.shake;ctx.translate((Math.random()-.5)*k*16,(Math.random()-.5)*k*12)}
 ctx.scale(s,s);
 pfDrawThemeBack(cx,VW,now);
 pfDrawColony(cx*.45,VW,now);
 const haze=ctx.createLinearGradient(0,470,0,640);haze.addColorStop(0,'rgba(0,0,0,0)');haze.addColorStop(1,th.haze+'30');ctx.fillStyle=haze;ctx.fillRect(0,470,VW,170);
 ctx.save();ctx.translate(-cx,0);
 pfDrawPit(cx,VW,now);
 pfDrawLandmarks(now);
 for(const pr of pf.props)if(pfOnScreen(pr.x,80))pfDrawProp(pr,now);
 for(const sd of pf.solids)if(sd.x<cx+VW+20&&sd.x+sd.w>cx-20)pfDrawSolid(sd,p);
 for(const pl of pf.plats)if(pl.x<cx+VW+20&&pl.x+pl.w>cx-20)pfDrawPlatformBeam(pl,now);
 pfDrawFlora(now);
 pfDrawShipOnPad(now);
 for(const h of [...pf.hostages,...pf.crowd])if(h.state!=='salvo'&&pfOnScreen(h.x,60))pfDrawColonist(h,now);
 for(const k of pf.pickups)pfDrawPickup(k,now);
 for(const w of pf.waves)pfDrawWave(w);
 if(pf.boss&&!pf.boss.gone)pfDrawBoss(pf.boss,now);
 for(const e of pf.enemies)if(pfOnScreen(e.x,60))pfDrawEnemy(e,now);
 const P=pf.pilot;
 if(P.visible){ctx.save();if(P.inv>0&&Math.floor(now*18)%2)ctx.globalAlpha=.4;pfDrawTrooper(P,PF_PILOT,now);ctx.restore();pfDrawJetpack(P,now);if(P.barrier)pfDrawBarrier(P,now)}
 for(const m of pf.missiles)pfDrawBossMissile(m);
 for(const g of pf.grenades)pfDrawGrenade(g);
 for(const b of pf.shots)drawBullet(b);
 for(const f of pf.fx)drawParticle(f);
 ctx.font='600 13px "Chakra Petch",sans-serif';ctx.textAlign='center';
 for(const t of pf.texts){ctx.globalAlpha=Math.max(0,1-t.t/1.6);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y)}ctx.globalAlpha=1;
 ctx.restore();
 pfDrawAmbient(now);if(th.ambient==='pioggia')pfDrawLightning(VW);
 ctx.restore();
 drawVignette();
 if(pf.flash>0){ctx.fillStyle=`rgba(255,45,60,${pf.flash*.5})`;ctx.fillRect(0,0,W,H)}
 if(pf.boss&&pf.boss.gone&&pf.boss.dead<2.6){ctx.fillStyle=`rgba(255,244,220,${Math.max(0,.6-(pf.boss.dead-2.3)*2)})`;ctx.fillRect(0,0,W,H)}
 pfDrawBanner();
 const ch=$('pfCrosshair');if(ch&&ch.style){ch.style.left=mouse.x+'px';ch.style.top=mouse.y+'px'}
}
function pfDrawRidge(offset,period,baseY,amp,fill,rim,phases,VW){
 const h=x=>{const t=(x+offset)/period*Math.PI*2;return baseY-amp*(.5+.28*Math.sin(t+phases[0])+.18*Math.sin(t*2+phases[1])+.12*Math.sin(t*3+phases[2])+.08*Math.sin(t*5+phases[3])+.05*Math.sin(t*8+phases[4])+.03*Math.sin(t*13+phases[5]))};
 ctx.beginPath();ctx.moveTo(0,PF_VH);for(let x=0;x<=VW+16;x+=16)ctx.lineTo(x,h(x));ctx.lineTo(VW+16,PF_VH);ctx.closePath();
 const g=ctx.createLinearGradient(0,baseY-amp,0,PF_VH);g.addColorStop(0,fill);g.addColorStop(1,'#02060c');ctx.fillStyle=g;ctx.fill();
 ctx.strokeStyle=rim;ctx.lineWidth=1.2;ctx.beginPath();for(let x=0;x<=VW+16;x+=16){x?ctx.lineTo(x,h(x)):ctx.moveTo(x,h(x))}ctx.stroke();
}
function pfDrawColony(offset,VW,now){
 const base=588,glow=pf.p.glow;
 for(const b of pf.deco.buildings){
  const x=b.x-offset;if(x+b.w<-60||x-60>VW)continue;
  ctx.save();ctx.translate(x,base);
  ctx.fillStyle='#0a1622';ctx.strokeStyle=glow+'40';ctx.lineWidth=1;
  if(b.kind==='cupola'){const r=b.w/2;ctx.beginPath();ctx.arc(r,0,r,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=glow+'1c';for(let i=1;i<4;i++){ctx.beginPath();ctx.ellipse(r,0,r*i/4,r,0,Math.PI,0);ctx.stroke()}ctx.fillStyle='#ffd08055';for(let i=0;i<5;i++)if((b.seed>>i)&1)ctx.fillRect(r-r*.7+i*r*.32,-r*.32,5,3)}
  else if(b.kind==='torre'){ctx.fillRect(0,-b.h,b.w,b.h);ctx.strokeRect(0,-b.h,b.w,b.h);ctx.beginPath();ctx.moveTo(b.w/2,-b.h);ctx.lineTo(b.w/2,-b.h-26);ctx.stroke();if(Math.sin(now*3+b.seed)>.2){ctx.fillStyle='#ff5060';ctx.shadowBlur=8;ctx.shadowColor='#ff5060';ctx.beginPath();ctx.arc(b.w/2,-b.h-27,2.2,0,6.28);ctx.fill();ctx.shadowBlur=0}ctx.fillStyle='#ffd08044';for(let y=-b.h+12;y<-10;y+=16)for(let i=0;i<2;i++)if(((b.seed>>((y/16+i)&15))&1))ctx.fillRect(6+i*(b.w-16),y,5,4)}
  else{ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(16,-b.h);ctx.lineTo(b.w-16,-b.h);ctx.lineTo(b.w,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#051019';ctx.fillRect(b.w*.3,-b.h*.6,b.w*.4,b.h*.6);ctx.strokeStyle='#ff9d3d33';ctx.strokeRect(b.w*.3,-b.h*.6,b.w*.4,b.h*.6)}
  if(b.fire){const top=b.kind==='cupola'?-b.w/2:-b.h,fx=b.w*.5,f=.75+.25*Math.sin(now*9+b.seed);const g=ctx.createRadialGradient(fx,top,0,fx,top,46*f);g.addColorStop(0,'rgba(255,170,80,.55)');g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.fillRect(fx-50,top-50,100,100);
   for(let i=0;i<5;i++){const k=(now*.35+i/5+b.seed%7*.13)%1;ctx.fillStyle=`rgba(40,46,56,${.45*(1-k)})`;ctx.beginPath();ctx.arc(fx+Math.sin(k*5+i)*10+k*30,top-10-k*120,8+k*22,0,6.28);ctx.fill()}}
  ctx.restore();
 }
}
function pfDrawSolid(sd,p){
 const th=pf.theme||pfTheme(p),bottom=PF_VH+40,g=ctx.createLinearGradient(0,sd.y,0,sd.y+170);g.addColorStop(0,th.body[0]);g.addColorStop(1,th.body[1]);
 ctx.fillStyle=g;ctx.fillRect(sd.x,sd.y,sd.w,bottom-sd.y);
 ctx.fillStyle=th.top;ctx.fillRect(sd.x,sd.y,sd.w,5);
 ctx.strokeStyle='rgba(140,180,210,.08)';ctx.lineWidth=1;ctx.beginPath();
 const start=Math.ceil(sd.x/80)*80;for(let x=start;x<sd.x+sd.w;x+=80){ctx.moveTo(x,sd.y+9);ctx.lineTo(x,sd.y+64)}
 ctx.moveTo(sd.x,sd.y+36);ctx.lineTo(sd.x+sd.w,sd.y+36);ctx.stroke();
 ctx.fillStyle='rgba(160,200,230,.16)';for(let x=start+40;x<sd.x+sd.w;x+=80)ctx.fillRect(x-1,sd.y+18,2,2);
 ctx.save();ctx.shadowBlur=8;ctx.shadowColor=th.edge;ctx.strokeStyle=th.edge+'b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sd.x,sd.y+.5);ctx.lineTo(sd.x+sd.w,sd.y+.5);ctx.stroke();ctx.restore();
 ctx.strokeStyle='rgba(150,200,230,.22)';ctx.beginPath();ctx.moveTo(sd.x+.5,sd.y);ctx.lineTo(sd.x+.5,bottom);ctx.moveTo(sd.x+sd.w-.5,sd.y);ctx.lineTo(sd.x+sd.w-.5,bottom);ctx.stroke();
 pfDrawSolidTop(sd,performance.now()/1000);
}
function pfDrawPlatformBeam(pl,now){
 ctx.save();
 const g=ctx.createLinearGradient(0,pl.y+12,0,pl.y+48);g.addColorStop(0,'rgba(81,230,255,.16)');g.addColorStop(1,'rgba(81,230,255,0)');ctx.fillStyle=g;ctx.fillRect(pl.x+10,pl.y+12,pl.w-20,36);
 ctx.fillStyle='#1b2a39';ctx.fillRect(pl.x,pl.y,pl.w,12);ctx.strokeStyle='rgba(120,170,200,.35)';ctx.strokeRect(pl.x+.5,pl.y+.5,pl.w-1,11);
 ctx.fillStyle='#0e1822';for(let x=pl.x+14;x<pl.x+pl.w-10;x+=22)ctx.fillRect(x,pl.y+4,10,4);
 ctx.shadowBlur=9;ctx.shadowColor='#51e6ff';ctx.strokeStyle='rgba(81,230,255,.75)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pl.x,pl.y+.5);ctx.lineTo(pl.x+pl.w,pl.y+.5);ctx.stroke();
 ctx.fillStyle=Math.sin(now*4+pl.x)>0?'#ffb348':'#7a4f1c';ctx.shadowColor='#ffb348';ctx.fillRect(pl.x+3,pl.y+4,4,4);ctx.fillRect(pl.x+pl.w-7,pl.y+4,4,4);
 ctx.restore();
}
function pfDrawLandmarks(now){
 // Cartello d'ingresso della colonia e piazzola d'atterraggio.
 ctx.save();
 ctx.fillStyle='#22313f';ctx.fillRect(620,PF_FLOOR-120,6,120);ctx.fillRect(836,PF_FLOOR-120,6,120);
 ctx.fillStyle='rgba(6,18,30,.92)';ctx.strokeStyle='rgba(81,230,255,.55)';ctx.lineWidth=1.5;ctx.fillRect(600,PF_FLOOR-168,262,56);ctx.strokeRect(600,PF_FLOOR-168,262,56);
 ctx.fillStyle='#8ce9ec';ctx.font='600 15px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('COLONIA '+pf.p.name,731,PF_FLOOR-143);
 ctx.fillStyle='#7e91a7';ctx.font='9px "Chakra Petch",sans-serif';ctx.fillText('REPUBBLICA INTERGALATTICA · SETTORE HELIOS–7',731,PF_FLOOR-125);
 ctx.strokeStyle='#ff5268';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(612,PF_FLOOR-162);ctx.lineTo(850,PF_FLOOR-118);ctx.stroke();
 ctx.fillStyle='#ff8a96';ctx.font='700 10px "Chakra Petch",sans-serif';ctx.save();ctx.translate(745,PF_FLOOR-108);ctx.rotate(.05);ctx.fillText('FRONTE OMBRA',0,0);ctx.restore();
 ctx.fillStyle='#1a2836';ctx.fillRect(170,PF_FLOOR-8,330,8);ctx.strokeStyle='rgba(81,230,255,.45)';ctx.strokeRect(170.5,PF_FLOOR-7.5,329,7);
 for(let i=0;i<6;i++){ctx.fillStyle=Math.floor(now*3)%6===i?'#ffb348':'#5a3d16';ctx.fillRect(184+i*58,PF_FLOOR-5,10,3)}
 ctx.restore();
}
function pfShipPose(){
 const t=pf.t,land=1.9,parked={x:330,y:PF_FLOOR-44};
 if(pf.phase!=='atterraggio'||t>=land)return{...parked,thrust:pf.phase==='atterraggio'&&t<2.4?1-(t-land)/.5:0};
 const k=t/land,e=1-(1-k)**3;return{x:parked.x-260*(1-e),y:parked.y-(PF_FLOOR+120)*(1-e),thrust:1};
}
function pfDrawShipOnPad(now){
 const pose=pfShipPose();if(!pfOnScreen(pose.x,140))return;
 ctx.save();
 if(pose.thrust>0)for(const ox of [-26,22])drawPlume(pose.x+ox,pose.y+30,0,1,(40+Math.random()*16)*pose.thrust+8,6*pose.thrust+2,'#51e6ff');
 ctx.strokeStyle='#5a6f80';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pose.x-30,pose.y+18);ctx.lineTo(pose.x-40,pose.y+44);ctx.moveTo(pose.x+24,pose.y+18);ctx.lineTo(pose.x+34,pose.y+44);ctx.stroke();
 ctx.translate(pose.x,pose.y);ctx.scale(2.3,2.3);
 drawShip({x:0,y:0,angle:0,forward:pf.phase==='atterraggio'&&pf.t<1.9?1:0,strafe:0,barrier:false,boostState:'ready'});
 ctx.restore();
 if(pf.phase==='atterraggio'&&pf.t>2.1&&pf.t<3.3){ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(140,240,255,${.35*Math.sin((pf.t-2.1)/1.2*Math.PI)})`;ctx.fillRect(pose.x+28,pose.y-4,22,30);ctx.restore()}
}
function pfDrawProp(pr,now){
 ctx.save();ctx.translate(pr.x,pr.y);
 if(pr.kind==='cassa'){ctx.fillStyle='#22313f';ctx.strokeStyle='#5c7184';ctx.lineWidth=1.2;ctx.fillRect(-16,-28,32,28);ctx.strokeRect(-16,-28,32,28);ctx.beginPath();ctx.moveTo(-16,-28);ctx.lineTo(16,0);ctx.moveTo(16,-28);ctx.lineTo(-16,0);ctx.stroke();ctx.fillStyle='#51e6ff';ctx.fillRect(-10,-24,8,2)}
 else if(pr.kind==='barricata'){ctx.fillStyle='#3a2026';ctx.strokeStyle='#ff6576';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-26,-22);ctx.lineTo(26,-22);ctx.lineTo(34,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff9d3d';for(let i=-2;i<2;i++){ctx.save();ctx.translate(i*14+7,-11);ctx.rotate(-.6);ctx.fillRect(-2,-8,4,16);ctx.restore()}}
 else{ctx.fillStyle='#3c4652';ctx.fillRect(-2,-92,3,92);const wave=Math.sin(now*3+pr.x)*4;ctx.fillStyle='#8a1f33';ctx.strokeStyle='#ff5268';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(1,-90);ctx.quadraticCurveTo(22,-94+wave,44,-88);ctx.lineTo(44,-62);ctx.quadraticCurveTo(22,-66+wave,1,-62);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff9ba4';ctx.beginPath();ctx.moveTo(22,-84);ctx.lineTo(30,-70);ctx.lineTo(14,-70);ctx.closePath();ctx.fill()}
 ctx.restore();
}
function pfDrawTrooper(o,pal,now){
 ctx.save();ctx.translate(o.x,o.y);ctx.scale(o.face,1);
 const crouch=!!o.crouch,hip=crouch?-13:-21,moving=o.ground&&Math.abs(o.vx)>20,sw=moving?Math.sin(o.run):0;
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const side of [-1,1]){
  let a,b;
  if(crouch){a=side<0?.9:1.25;b=side<0?-.7:-.45}
  else if(!o.ground){a=side<0?-.25:.55;b=side<0?-.9:-.2}
  else{a=sw*side*.6;b=a<0?a*2.1:a*.25}
  const kx=Math.sin(a)*10.5,ky=hip+Math.cos(a)*10.5,fx=kx+Math.sin(b)*10.5,fy=ky+Math.cos(b)*10.5;
  ctx.strokeStyle=side<0?'#16242f':pal.suit;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,hip);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();
  ctx.fillStyle=side<0?'#3b4b58':pal.armor2;ctx.fillRect(fx-3,fy-2.5,8,4);
 }
 // Zaino con propulsore
 ctx.fillStyle=pal.gun;ctx.strokeStyle=pal.edge+'66';ctx.lineWidth=1;ctx.fillRect(-12,hip-18,6,14);ctx.strokeRect(-12,hip-18,6,14);
 ctx.fillStyle=pal.glow;ctx.shadowBlur=6;ctx.shadowColor=pal.glow;ctx.fillRect(-11,hip-6,4,2);ctx.shadowBlur=0;
 // Busto
 const torso=ctx.createLinearGradient(-8,hip-20,8,hip);torso.addColorStop(0,pal.armor2);torso.addColorStop(.45,pal.armor);torso.addColorStop(1,pal.armor2);
 ctx.fillStyle=torso;ctx.strokeStyle=pal.edge;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-7,hip);ctx.lineTo(-8,hip-15);ctx.lineTo(-5,hip-20);ctx.lineTo(6,hip-20);ctx.lineTo(8,hip-13);ctx.lineTo(6,hip);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=pal.suit;ctx.fillRect(-7,hip-3,13,4);ctx.fillStyle=pal.glow;ctx.fillRect(1,hip-15,5,1.6);
 // Casco
 const hy=hip-27,helm=ctx.createRadialGradient(-2,hy-3,1,0,hy,8);helm.addColorStop(0,pal.armor);helm.addColorStop(1,pal.armor2);
 ctx.fillStyle=helm;ctx.strokeStyle=pal.edge;ctx.beginPath();ctx.arc(0,hy,7.2,0,6.28);ctx.fill();ctx.stroke();
 ctx.fillStyle=pal.visor;ctx.shadowBlur=8;ctx.shadowColor=pal.glow;ctx.beginPath();ctx.ellipse(3.6,hy-.5,3.8,2.6,0,0,6.28);ctx.fill();ctx.shadowBlur=0;
 // Braccio e fucile orientati verso il bersaglio
 let la=o.face>0?o.aim:Math.PI-o.aim;la=Math.atan2(Math.sin(la),Math.cos(la));
 ctx.save();ctx.translate(2,hip-13);ctx.rotate(la);
 ctx.strokeStyle=pal.armor2;ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(11,1);ctx.stroke();
 ctx.fillStyle=pal.gun;ctx.strokeStyle=pal.edge+'aa';ctx.lineWidth=1;ctx.fillRect(6,-3.2,21,6);ctx.strokeRect(6,-3.2,21,6);ctx.fillRect(9,2,5,4);
 ctx.fillStyle=pal.glow;ctx.shadowBlur=8;ctx.shadowColor=pal.glow;ctx.fillRect(25,-1.6,4,3.2);
 ctx.restore();
 ctx.restore();
}
function pfDrawBarrier(P,now){const pulse=.5+.5*Math.sin(now*10);ctx.save();ctx.translate(P.x,P.y-(P.crouch?20:26));ctx.shadowBlur=18;ctx.shadowColor='#51e6ff';ctx.strokeStyle=`rgba(120,239,255,${.55+pulse*.25})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,30,P.crouch?28:36,0,0,6.28);ctx.stroke();ctx.fillStyle='rgba(81,230,255,.07)';ctx.fill();ctx.restore()}
function pfDrawEnemy(e,now){
 if(e.type==='drone'){
  ctx.save();ctx.translate(e.x,e.y);
  drawPlume(-8,9,0,1,12+Math.random()*4,3,'#ff5268');drawPlume(8,9,0,1,12+Math.random()*4,3,'#ff5268');
  ctx.strokeStyle='rgba(255,155,164,.5)';ctx.lineWidth=1.5;for(const sx of [-1,1]){ctx.beginPath();ctx.ellipse(sx*16,-9,11*Math.abs(Math.sin(now*40+sx)),2,0,0,6.28);ctx.stroke()}
  const hull=ctx.createLinearGradient(-17,-9,17,9);hull.addColorStop(0,'#762c39');hull.addColorStop(.4,'#ffc3c6');hull.addColorStop(.75,'#d95263');hull.addColorStop(1,'#501c2a');
  ctx.fillStyle=e.hit>0?'#ffffff':hull;ctx.strokeStyle='#ff9ba4';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(-10,-9);ctx.lineTo(10,-9);ctx.lineTo(17,0);ctx.lineTo(10,9);ctx.lineTo(-10,9);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#360e1e';ctx.beginPath();ctx.arc(0,0,5.5,0,6.28);ctx.fill();ctx.fillStyle='#ff5268';ctx.shadowBlur=10;ctx.shadowColor='#ff5268';ctx.beginPath();ctx.arc(Math.cos(e.aim)*2.5,Math.sin(e.aim)*2.5,2.6,0,6.28);ctx.fill();
  ctx.restore();
 }else{
  if(e.type==='cecchino'&&e.fire<.75&&pfOnScreen(e.x)){const sh=pfShoulder(e),a=e.locked??e.aim,on=e.locked!==null||Math.floor(now*14)%2;ctx.save();ctx.strokeStyle=`rgba(255,82,104,${on?.55:.18})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sh.x+Math.cos(a)*28,sh.y+Math.sin(a)*28);ctx.lineTo(sh.x+Math.cos(a)*1400,sh.y+Math.sin(a)*1400);ctx.stroke();ctx.restore()}
  ctx.save();if(e.hit>0)ctx.globalAlpha=.55;pfDrawTrooper(e,PF_REBEL,now);ctx.restore();
  if(e.type==='cecchino'){ctx.fillStyle='#ff5268';ctx.font='700 8px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('CECCHINO',e.x,e.y-72)}
 }
 const top=e.type==='drone'?e.y-20:e.y-62;
 ctx.fillStyle='#ffffff22';ctx.fillRect(e.x-14,top,28,3);ctx.fillStyle='#ff7b89';ctx.fillRect(e.x-14,top,28*Math.max(0,e.hp/e.max),3);
}
function pfDrawColonist(h,now){
 ctx.save();ctx.translate(h.x,h.y);
 if(h.state==='evacuato'){const k=h.t;ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createLinearGradient(-20,0,20,0);g.addColorStop(0,'rgba(81,230,255,0)');g.addColorStop(.5,`rgba(160,245,255,${.55*(1-k*.6)})`);g.addColorStop(1,'rgba(81,230,255,0)');ctx.fillStyle=g;ctx.fillRect(-20,-PF_VH,40,PF_VH);ctx.restore();ctx.globalAlpha=Math.max(0,1-k);ctx.translate(0,-k*60)}
 const suit=h.suit||'#d98a3a',dark=h.suitD||'#8a5222',skin='#e7b48f';
 ctx.lineCap='round';
 if(h.state==='legato'){
  ctx.strokeStyle=dark;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(9,-4);ctx.lineTo(-3,-1);ctx.stroke();
  ctx.fillStyle=suit;ctx.fillRect(-6,-32,12,19);
  ctx.strokeStyle='#c9a46a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-24);ctx.lineTo(-11,-18);ctx.moveTo(-6,-22);ctx.lineTo(6,-20);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(1,-38+Math.sin(now*3+h.id)*.8,6,0,6.28);ctx.fill();ctx.fillStyle='#2a1d17';ctx.beginPath();ctx.arc(0,-41,6,Math.PI,0);ctx.fill();
  const bob=Math.sin(now*4+h.id)*3;ctx.fillStyle='rgba(6,18,30,.9)';ctx.strokeStyle='#ffd080';ctx.lineWidth=1;ctx.fillRect(-25,-72+bob,50,17);ctx.strokeRect(-25,-72+bob,50,17);
  ctx.fillStyle='#ffd080';ctx.font='700 10px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('AIUTO!',0,-60+bob);
 }else if(h.state==='fuga'){
  ctx.scale(-1,1);const ph=h.t*14,l1=Math.sin(ph)*9,l2=-l1;ctx.strokeStyle=dark;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(l1,0);ctx.lineTo(0,-18);ctx.lineTo(l2,0);ctx.stroke();
  ctx.save();ctx.translate(0,-28);ctx.rotate(.18);ctx.fillStyle=suit;ctx.fillRect(-6,-10,12,21);ctx.restore();
  ctx.strokeStyle=suit;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(1,-34);ctx.lineTo(1+l2,-24);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(3,-44,6,0,6.28);ctx.fill();ctx.fillStyle='#2a1d17';ctx.beginPath();ctx.arc(2,-47,6,Math.PI,0);ctx.fill();
 }else{
  ctx.strokeStyle=dark;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(-2,-18);ctx.moveTo(4,0);ctx.lineTo(2,-18);ctx.stroke();
  ctx.fillStyle=suit;ctx.fillRect(-6,-38,12,21);
  const wave=Math.sin(now*12)*.5;ctx.strokeStyle=suit;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(3,-34);ctx.lineTo(3+Math.sin(-2.4+wave)*-12,-34+Math.cos(-2.4+wave)*12);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-44,6,0,6.28);ctx.fill();ctx.fillStyle='#2a1d17';ctx.beginPath();ctx.arc(-1,-47,6,Math.PI,0);ctx.fill();
 }
 ctx.restore();
}
function pfDrawPickup(k,now){
 ctx.save();ctx.translate(k.x,k.y+Math.sin(now*4+k.x)*2);
 const color=k.kind==='salute'?'#8df1ad':k.kind==='granate'?'#ffd080':'#72eaff';
 ctx.shadowBlur=12;ctx.shadowColor=color;ctx.fillStyle='#081827';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,6.28);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle=color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(k.kind==='salute'?'+':k.kind==='granate'?'●':'◈',0,1);
 ctx.restore();
}
function pfDrawGrenade(g){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.rot);ctx.fillStyle='#2d3f2a';ctx.strokeStyle='#a9d98a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,5,4,0,0,6.28);ctx.fill();ctx.stroke();ctx.fillStyle=Math.floor(g.t*12)%2?'#ff5268':'#ffd080';ctx.fillRect(-1,-6,2,2);ctx.restore()}
function pfDrawWave(w){ctx.save();ctx.translate(w.x,PF_FLOOR);ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(0,0,2,0,0,34);g.addColorStop(0,'rgba(255,230,180,.85)');g.addColorStop(.5,'rgba(255,140,60,.45)');g.addColorStop(1,'rgba(255,80,20,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,22,30,0,Math.PI,0);ctx.fill();ctx.strokeStyle='rgba(255,200,130,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w.dir*40,-2);ctx.lineTo(0,-24);ctx.lineTo(w.dir*10,-2);ctx.stroke();ctx.restore()}
function pfDrawBossMissile(m){ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);drawPlume(-8,0,-1,0,20,3,'#ff5268');ctx.fillStyle='#ffd0d6';ctx.strokeStyle='#ff5268';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-4);ctx.lineTo(-5,0);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
function pfDrawBoss(B,now){
 const charging=B.state==='carica'&&B.t<.8,stunned=B.state==='stordito',dying=B.state==='distrutto';
 ctx.save();ctx.translate(B.x,B.y);
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(0,1,82,9,0,0,6.28);ctx.fill();
 ctx.scale(B.face,1);
 if(B.state==='onda'&&B.t<.5)ctx.translate(0,B.t*16);
 if(stunned)ctx.rotate(.06*Math.sin(now*20));
 if(dying)ctx.translate((Math.random()-.5)*4,(Math.random()-.5)*3);
 const metal=ctx.createLinearGradient(-60,-200,60,-90);metal.addColorStop(0,'#1d2733');metal.addColorStop(.45,'#5d7084');metal.addColorStop(.6,'#2e3c4b');metal.addColorStop(1,'#151d27');
 const walk=B.legT;
 // Gambe digitigrade
 for(const side of [-1,1]){
  const hx=side*18,sw=Math.sin(walk+(side>0?0:Math.PI))*12,foot=side<0?'#1a232d':'#2b3846';
  ctx.strokeStyle=foot;ctx.lineCap='round';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(hx,-96);ctx.lineTo(hx+16+sw*.4,-56);ctx.lineTo(hx-4+sw,-14);ctx.stroke();
  ctx.strokeStyle='rgba(140,160,180,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx+2,-92);ctx.lineTo(hx+16+sw*.4,-58);ctx.stroke();
  ctx.fillStyle=foot;ctx.strokeStyle='#64798d';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(hx-28+sw,0);ctx.lineTo(hx-18+sw,-16);ctx.lineTo(hx+16+sw,-16);ctx.lineTo(hx+34+sw,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ff3c4c';ctx.shadowBlur=8;ctx.shadowColor='#ff3c4c';ctx.beginPath();ctx.arc(hx+16+sw*.4,-56,3.5,0,6.28);ctx.fill();ctx.shadowBlur=0;
 }
 ctx.fillStyle='#232f3c';ctx.strokeStyle='#8b9ba9';ctx.lineWidth=1.5;ctx.fillRect(-34,-108,68,20);ctx.strokeRect(-34,-108,68,20);
 // Pod missilistico sulla schiena
 ctx.fillStyle='#1a232e';ctx.fillRect(-56,-214,40,28);ctx.strokeRect(-56,-214,40,28);
 for(let i=0;i<3;i++){ctx.fillStyle=B.state==='missili'?'#ff9d3d':'#05090f';ctx.beginPath();ctx.arc(-48+i*12,-206,4,0,6.28);ctx.fill()}
 // Busto
 ctx.fillStyle=metal;ctx.strokeStyle='#8b9ba9';ctx.lineWidth=2;
 const torso=[[-50,-186],[38,-194],[60,-152],[48,-104],[-42,-100],[-56,-142]];
 ctx.beginPath();torso.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();
 ctx.save();ctx.clip();ctx.fillStyle='#ff9d3d';for(let i=0;i<6;i++){ctx.save();ctx.translate(-44+i*16,-112);ctx.rotate(-.7);ctx.fillRect(-3,-10,6,20);ctx.restore()}ctx.fillStyle='#0f151d';ctx.fillRect(-60,-108,130,3);ctx.restore();
 ctx.strokeStyle='rgba(10,16,24,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-30,-186);ctx.lineTo(-38,-120);ctx.moveTo(30,-190);ctx.lineTo(36,-130);ctx.stroke();
 ctx.fillStyle='#ff5268';ctx.beginPath();ctx.moveTo(-34,-170);ctx.lineTo(-22,-150);ctx.lineTo(-46,-150);ctx.closePath();ctx.fill();
 // Nucleo energetico: più luminoso quando è esposto
 const pulse=.6+.4*Math.sin(now*(stunned?16:5)),cr=(stunned?17:12)*(.9+pulse*.15);
 const core=ctx.createRadialGradient(10,-146,1,10,-146,cr*2.2);core.addColorStop(0,'#ffffff');core.addColorStop(.3,stunned?'#ffe0a0':'#ff8a96');core.addColorStop(.6,'rgba(255,60,76,.55)');core.addColorStop(1,'rgba(255,60,76,0)');
 ctx.fillStyle=core;ctx.beginPath();ctx.arc(10,-146,cr*2.2,0,6.28);ctx.fill();ctx.strokeStyle='#5d7084';ctx.lineWidth=3;ctx.beginPath();ctx.arc(10,-146,cr,0,6.28);ctx.stroke();
 // Testa con visore
 ctx.fillStyle='#26323f';ctx.strokeStyle='#8b9ba9';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(14,-214);ctx.lineTo(50,-210);ctx.lineTo(56,-194);ctx.lineTo(18,-190);ctx.closePath();ctx.fill();ctx.stroke();
 const eye=charging?(Math.floor(now*16)%2?'#ffffff':'#ff3c4c'):'#ff3c4c';ctx.fillStyle=eye;ctx.shadowBlur=14;ctx.shadowColor='#ff3c4c';ctx.fillRect(28,-204,24,4);ctx.shadowBlur=0;
 // Braccio cannone
 let la=B.face>0?B.aim:Math.PI-B.aim;la=Math.atan2(Math.sin(la),Math.cos(la));
 ctx.save();ctx.translate(30,-150);ctx.rotate(la);
 ctx.fillStyle='#2b3846';ctx.strokeStyle='#8b9ba9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,15,0,6.28);ctx.fill();ctx.stroke();
 ctx.fillStyle=metal;ctx.fillRect(8,-11,46,22);ctx.strokeRect(8,-11,46,22);ctx.fillStyle='#151d27';ctx.fillRect(52,-7,30,14);ctx.strokeRect(52,-7,30,14);
 ctx.fillStyle='#5d7084';for(let i=0;i<3;i++)ctx.fillRect(58+i*8,-8,2,16);
 const heat=B.state==='raffica'?Math.min(1,B.t/.45):0;if(heat>0){ctx.fillStyle=`rgba(255,82,104,${.4+heat*.6})`;ctx.shadowBlur=18*heat;ctx.shadowColor='#ff5268';ctx.beginPath();ctx.arc(83,0,4+heat*4,0,6.28);ctx.fill();ctx.shadowBlur=0}
 ctx.restore();
 if(B.hit>0){ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();torso.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
 if(charging){ctx.fillStyle=`rgba(255,60,76,${.15+.15*Math.sin(now*30)})`;ctx.fillRect(-60,-215,125,215)}
 ctx.restore();
 if(stunned&&Math.random()<.3)pfBurst(B.x+(Math.random()-.5)*80,B.y-120-Math.random()*60,'#ffe0a0',2,.5);
}
function pfDrawBanner(){
 const b=pf.banner;if(!b)return;
 const a=Math.min(1,b.t/.35,(b.life-b.t)/.5);if(a<=0)return;
 ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';
 const y=H*.3,w=Math.min(W*.8,560);
 const g=ctx.createLinearGradient(W/2-w/2,0,W/2+w/2,0);g.addColorStop(0,'rgba(4,14,26,0)');g.addColorStop(.5,'rgba(4,14,26,.82)');g.addColorStop(1,'rgba(4,14,26,0)');ctx.fillStyle=g;ctx.fillRect(W/2-w/2,y-46,w,74);
 ctx.fillStyle='#e9f4ff';ctx.shadowBlur=20;ctx.shadowColor='#5de4ff';ctx.font=`600 ${Math.round(Math.min(34,W/22))}px "Chakra Petch",sans-serif`;ctx.fillText(b.title,W/2,y);
 ctx.shadowBlur=0;ctx.fillStyle='#8ce9ec';ctx.font='500 11px "Chakra Petch",sans-serif';ctx.fillText(b.sub,W/2,y+20);
 ctx.restore();
}

// ---------------------------------------------------------------- input e pulsanti
addEventListener('keydown',e=>{if(state!=='platform'||paused||e.repeat)return;if(e.code==='KeyE'||e.code==='KeyG')pfThrowGrenade()});
addEventListener('mousedown',e=>{if(state!=='platform')return;if(e.button===1){e.preventDefault();pfThrowGrenade()}});
addEventListener('auxclick',e=>{if(e.button===1&&state==='platform')e.preventDefault()});
$('landBtn').onclick=pfOpenBrief;
$('phase2Btn').onclick=()=>{sfx('ui');pfOpenBrief()};
$('landEngageBtn').onclick=()=>{enterGameFullscreen();startPlatform()};
$('landBackBtn').onclick=()=>{show('landBrief',false);abort()};
$('pfPauseBtn').onclick=togglePause;
pfRefreshMapButton();

// ---------------------------------------------------------------- novità 2026-10-31: jetpack, colpi bloccati, boss per pianeta, coloni liberati
// Un robot finale diverso per ogni pianeta. gun/pod: posizione del cannone e del lanciamissili (rispetto ai piedi).
const PF_BOSS={
 mare:{id:'mare',name:'LEVIATANO K-3',sub:'GRANCHIO CORAZZATO DEL FRONTE OMBRA',brief:'un granchio meccanico corazzato con chele-cannone',w:190,h:140,hp:1,speed:1.25,gun:{x:62,y:92,len:46},pod:{x:-40,y:128},moves:['passi','raffica','carica','onda']},
 deserto:{id:'deserto',name:'SCORPIONE S-5',sub:'CACCIATORE DELLE DUNE',brief:'uno scorpione d’acciaio con un pungiglione laser',w:200,h:150,hp:1.05,speed:1.35,gun:{x:30,y:212,len:40},pod:{x:-60,y:110},moves:['raffica','passi','carica','missili']},
 tempesta:{id:'tempesta',name:'NEMBO Z-1',sub:'SENTINELLA DELLA TEMPESTA',brief:'una sentinella volante carica di fulmini',w:140,h:200,hp:1.1,speed:1,gun:{x:40,y:150,len:52},pod:{x:-10,y:216},moves:['raffica','missili','passi','onda']},
 foresta:{id:'foresta',name:'GOLIA V-4',sub:'COLOSSO DELLA FORESTA',brief:'un colosso meccanico coperto di muschio',w:160,h:205,hp:1.15,speed:.9,gun:{x:40,y:150,len:70},pod:{x:-34,y:214},moves:['onda','passi','carica','raffica']},
 lava:{id:'lava',name:'TITANO R-9',sub:'ROBOT DA GUERRA DEL FRONTE OMBRA',brief:'il robot da guerra che tiene in ostaggio la colonia',w:120,h:200,hp:1.2,speed:1,gun:{x:30,y:150,len:80},pod:{x:-30,y:210},moves:['passi','raffica','onda','carica']}
};
function pfBossInfo(p){return PF_BOSS[p&&p.boss]||PF_BOSS[(p&&p.theme)||'lava']||PF_BOSS.lava}

// Jetpack: in aria un secondo salto accende il jetpack; tenendo premuto si resta in volo.
// Si scalda: al 100% si spegne e deve raffreddarsi del tutto. Consuma carburante (crediti).
const PF_JET={heat:36,coolGround:45,coolAir:14,fuel:2.5};
function pfJetReady(P){return!P.jetLock&&(P.jetHeat||0)<96}
function pfUpdateJetpack(P,dt,hold){
 P.jetHeat=P.jetHeat||0;
 if(P.jetOn&&(!hold||P.jetLock||P.ground||P.hp<=0))P.jetOn=false;
 if(P.jetOn){
  P.vy+=(-95-P.vy)*Math.min(1,dt*7)-PF_GRAVITY*dt; // annulla la gravità e sale piano
  P.jetHeat=Math.min(100,P.jetHeat+dt*PF_JET.heat);
  if(typeof ecoFuel==='function')ecoFuel(dt*PF_JET.fuel);
  if(Math.random()<dt*40)pf.fx.push({x:P.x-P.face*8+(Math.random()-.5)*4,y:P.y-22,vx:(Math.random()-.5)*40,vy:260+Math.random()*120,life:.3,max:.3,color:Math.random()<.5?'#ffb05a':'#fff1c9',r:2+Math.random()*2.5});
  if(P.jetHeat>=100){P.jetOn=false;P.jetLock=true;pfStatus('JETPACK SURRISCALDATO · ATTENDI LA RICARICA',1600);tone(140,.3,'square',.02,70)}
 }else{
  P.jetHeat=Math.max(0,P.jetHeat-dt*(P.ground?PF_JET.coolGround:PF_JET.coolAir));
  if(P.jetLock&&P.jetHeat<=0){P.jetLock=false;pfStatus('JETPACK PRONTO',900);tone(660,.12,'sine',.02,880)}
 }
}
function pfDrawJetpack(P,now){
 if(!P.visible)return;
 const heat=P.jetHeat||0;
 if(P.jetOn){ctx.save();ctx.globalCompositeOperation='lighter';const x=P.x-P.face*8,y=P.y-26,l=18+Math.random()*10;const g=ctx.createLinearGradient(x,y,x,y+l);g.addColorStop(0,'rgba(255,245,210,.95)');g.addColorStop(.4,'rgba(255,160,70,.8)');g.addColorStop(1,'rgba(255,80,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.lineTo(x,y+l);ctx.closePath();ctx.fill();ctx.restore()}
 if(heat>0||P.jetLock){
  const x=P.x-P.face*24-2,y=P.y-56,h=30,k=heat/100;
  ctx.fillStyle='rgba(4,12,20,.75)';ctx.fillRect(x-1,y-1,6,h+2);
  ctx.fillStyle=P.jetLock?(Math.floor(now*8)%2?'#ff5268':'#7a1a26'):k>.7?'#ffb05a':'#51e6ff';
  ctx.fillRect(x,y+h*(1-k),4,h*k);
 }
}

// I colpi si fermano su terreno, piattaforme, casse e barricate.
function pfShotObstacle(b){
 let bt=Infinity;
 const test=r=>{const t=pfSegRect(b.px,b.py,b.x,b.y,r,0);if(t!==null&&t<bt)bt=t};
 for(const s of pf.solids)if(s.x<=Math.max(b.px,b.x)+2&&s.x+s.w>=Math.min(b.px,b.x)-2)test({l:s.x,r:s.x+s.w,t:s.y,b:PF_VH+400});
 for(const p of pf.plats)if(p.x<=Math.max(b.px,b.x)&&p.x+p.w>=Math.min(b.px,b.x))test({l:p.x,r:p.x+p.w,t:p.y,b:p.y+10});
 for(const pr of pf.props){if(pr.kind==='cassa')test({l:pr.x-16,r:pr.x+16,t:pr.y-28,b:pr.y});else if(pr.kind==='barricata')test({l:pr.x-30,r:pr.x+30,t:pr.y-22,b:pr.y})}
 if(bt===Infinity)return null;
 return{x:b.px+(b.x-b.px)*bt,y:b.py+(b.y-b.py)*bt};
}

// Boss distrutto: tutti i coloni prigionieri escono e scappano verso la nave.
function pfFreeColony(){
 const VW=Math.min(pfViewW(),1500),n=10+pf.p.difficulty*2,suits=[['#d98a3a','#9a5a22'],['#3a8fd9','#22579a'],['#5fae4a','#356b28'],['#c9c2b0','#7f786a'],['#b0473f','#6e2722']];
 for(let i=0;i<n;i++){
  const c=suits[i%suits.length];
  pf.crowd.push({x:pf.cam.lockX+VW*.5+pf.rnd()*VW*.55+i*14,y:PF_FLOOR,state:'libero',t:-i*.16-pf.rnd()*.2,id:100+i,crowd:true,suit:c[0],suitD:c[1]});
 }
 for(let i=0;i<4;i++)pfText(pf.cam.lockX+VW*(.45+i*.14),PF_FLOOR-90-i*12,'LIBERI!','#ffe1a8');
}
