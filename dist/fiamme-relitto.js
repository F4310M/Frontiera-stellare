// Conex — fiamme del robot distrutto a fine missione a terra (2026-11-11).
// Sostituisce battDrawFire di battaglia.js (8 lingue piatte) con un incendio vero:
// più focolai sul relitto, lingue a tre strati (rosso, arancio, nucleo giallo-bianco) che ondeggiano,
// bagliore alla base, braci che salgono e scintille che scoppiettano.
// Le lingue sono immagini preparate una volta sola (niente gradienti, ctx.filter o shadowBlur a ogni fotogramma).
// Va caricato dopo battaglia.js.

const FR={
 // focolai sul relitto: posizione rispetto al centro, grandezza, numero di lingue
 fires:[
  {dx:-6,dy:-34,s:1.3,n:9},{dx:-52,dy:-16,s:.78,n:6},{dx:44,dy:-28,s:.86,n:6},
  {dx:-44,dy:-70,s:.42,n:4},{dx:58,dy:-58,s:.38,n:4},{dx:82,dy:-3,s:.5,n:4},{dx:-84,dy:-3,s:.46,n:4}
 ],
 grow:1.1,         // secondi perché l'incendio arrivi a piena forza dopo lo scoppio
 h:120,            // altezza della lingua più alta del focolaio principale (px di mondo)
 embersMax:90,
 sprites:null,embers:[],last:0,pop:0
};
const frOrig={battDrawFire:typeof battDrawFire==='function'?battDrawFire:null};

// Una lingua di fuoco disegnata su una piccola tela: base in basso al centro, punta in alto.
function frTongue(w,stops){
 const L=typeof gCanvas==='function'?gCanvas(64,160):null;if(!L)return null;
 const c=L.g,cx=32,base=156,top=4,gr=c.createLinearGradient(0,top,0,base);
 for(const [o,col] of stops)gr.addColorStop(o,col);
 c.fillStyle=gr;c.beginPath();c.moveTo(cx-w,base);
 c.bezierCurveTo(cx-w*1.25,base-60,cx-w*.35,base-110,cx,top);
 c.bezierCurveTo(cx+w*.35,base-110,cx+w*1.25,base-60,cx+w,base);
 c.quadraticCurveTo(cx,base+6,cx-w,base);c.closePath();c.fill();
 return L.c;
}
function frSprites(){
 if(FR.sprites!==null)return FR.sprites;
 const outer=frTongue(26,[[0,'rgba(150,20,8,0)'],[.25,'rgba(205,40,12,.5)'],[.6,'rgba(240,80,18,.85)'],[1,'rgba(255,120,30,.95)']]);
 const mid=frTongue(18,[[0,'rgba(255,110,20,0)'],[.3,'rgba(255,140,30,.6)'],[.7,'rgba(255,190,60,.9)'],[1,'rgba(255,220,120,1)']]);
 const core=frTongue(10,[[0,'rgba(255,230,150,0)'],[.45,'rgba(255,240,180,.7)'],[1,'rgba(255,255,235,1)']]);
 FR.sprites=outer&&mid&&core?{outer,mid,core}:false;
 return FR.sprites;
}
// Bagliore caldo alla base, preparato una volta.
let frGlowSprite=null;
function frGlow(){
 if(frGlowSprite!==null)return frGlowSprite;
 const L=typeof gCanvas==='function'?gCanvas(128,64):null;if(!L)return frGlowSprite=false;
 const c=L.g,gr=c.createRadialGradient(64,40,2,64,40,64);
 gr.addColorStop(0,'rgba(255,190,90,.75)');gr.addColorStop(.4,'rgba(255,110,30,.35)');gr.addColorStop(1,'rgba(255,60,10,0)');
 c.fillStyle=gr;c.fillRect(0,0,128,64);return frGlowSprite=L.c;
}

// Una lingua: altezza, inclinazione (taglio orizzontale) e larghezza cambiano nel tempo.
function frDrawTongue(sp,x,y,h,w,lean){
 ctx.save();ctx.translate(x,y);ctx.transform(1,0,lean,1,0,0);ctx.scale(w,h/152);ctx.drawImage(sp,-32,-156);ctx.restore();
}
function frDrawSource(S,x,y,now,power,i0){
 const sp=FR.sprites,sz=S.s*power;if(sz<=.02)return;
 const gl=frGlow();
 if(gl){const f=.85+.15*Math.sin(now*11+i0);ctx.globalAlpha=.7*f*Math.min(1,power*1.2);ctx.drawImage(gl,x-70*sz*1.3,y-48*sz,140*sz*1.3,70*sz)}
 const spread=34*S.s;
 for(let i=0;i<S.n;i++){
  const k=i/(S.n-1||1)-.5,seed=i0*7.3+i*2.17,wave=now*(4.6+(i%3)*1.3)+seed;
  const hk=1-Math.abs(k)*.9,h=FR.h*sz*(.55+.45*hk)*(.78+.22*Math.sin(wave)+.1*Math.sin(wave*2.3+1));
  const lean=(.18*Math.sin(now*1.7+i0)+.12*Math.sin(wave*.8))*(.6+Math.abs(k)),fx=x+k*spread*2+Math.sin(wave*.6)*3*S.s;
  ctx.globalAlpha=.9;ctx.globalCompositeOperation='source-over';frDrawTongue(sp.outer,fx,y,h,.55*S.s+.25,lean);
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=.85;frDrawTongue(sp.mid,fx+lean*h*.06,y,h*.78,.5*S.s+.2,lean*1.15);
  ctx.globalAlpha=.8;frDrawTongue(sp.core,fx+lean*h*.04,y+1,h*.48,.45*S.s+.18,lean*1.3);
 }
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
// Braci: puntini caldi che salgono ondeggiando e si spengono.
function frEmbers(x,y,dt,power,now){
 const E=FR.embers;
 if(power>.05&&!(typeof paused!=='undefined'&&paused)){
  let want=dt*48*power;
  while(want>0&&E.length<FR.embersMax){if(want<1&&Math.random()>want)break;want--;
   const S=FR.fires[Math.floor(Math.random()*FR.fires.length)],life=1.1+Math.random()*1.4;
   E.push({x:x+S.dx+(Math.random()-.5)*40*S.s,y:y+S.dy-10-Math.random()*30*S.s,vx:(Math.random()-.4)*40,vy:-70-Math.random()*110,life,max:life,r:.9+Math.random()*1.6,ph:Math.random()*6.28})}
 }
 for(const e of E){e.life-=dt;e.vy+=-18*dt;e.x+=(e.vx+Math.sin(now*3+e.ph)*22)*dt;e.y+=e.vy*dt}
 FR.embers=E.filter(e=>e.life>0);
 ctx.globalCompositeOperation='lighter';
 for(const e of FR.embers){const k=e.life/e.max,fl=.6+.4*Math.sin(now*20+e.ph);
  ctx.globalAlpha=Math.min(1,k*1.6)*fl;ctx.fillStyle=k>.55?'#ffe6a0':k>.25?'#ffa040':'#ff5a20';
  ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2)}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}

// Nuova battDrawFire: chiamata da battDrawWreck a ogni fotogramma sul relitto.
function frDrawFire(x,y,now){
 if(!frSprites())return frOrig.battDrawFire&&frOrig.battDrawFire(x,y,now);
 const dt=Math.max(0,Math.min(.05,now-(FR.last||now)));FR.last=now;
 const K=typeof pf!=='undefined'&&pf&&pf.boom,age=K&&typeof BATT!=='undefined'?Math.max(0,K.t-BATT.boomBlast):9;
 const power=Math.min(1,age/FR.grow)*(1+.25*Math.max(0,1-age/2.5));// subito dopo lo scoppio è ancora più alto
 ctx.save();
 FR.fires.forEach((S,i)=>frDrawSource(S,x+S.dx,y+S.dy,now,power,i));
 frEmbers(x,y,dt,power,now);
 ctx.restore();
 // scintille che scoppiettano ogni tanto
 FR.pop-=dt;
 if(FR.pop<=0&&power>.3&&typeof pfBurst==='function'&&!(typeof paused!=='undefined'&&paused)){
  FR.pop=.25+Math.random()*.5;const S=FR.fires[Math.floor(Math.random()*3)];
  pfBurst(x+S.dx+(Math.random()-.5)*30,y+S.dy-20,'#ffd08a',3+Math.floor(Math.random()*4),.6);
 }
}
if(frOrig.battDrawFire)battDrawFire=frDrawFire;

// La luce dell'incendio sulla scena tremola di più e arriva più lontano.
if(typeof gCollectLights==='function'&&typeof gLight==='function'){
 const frLights=gCollectLights;
 gCollectLights=function(now){
  frLights(now);
  const K=typeof pf!=='undefined'&&pf&&pf.boom;if(!K||!K.gone)return;
  const t=pf.t||0,f=.5+.5*Math.sin(t*9)*Math.sin(t*5.3+1);
  gLight(K.x-50,PF_FLOOR-40,170,'#ff6a1a',.35+.2*f);gLight(K.x+46,PF_FLOOR-50,160,'#ff8a2a',.3+.2*(1-f));gLight(K.x,PF_FLOOR-110,240,'#ffb050',.22+.12*f);
 };
}
