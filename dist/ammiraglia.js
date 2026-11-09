// Conex — NAVE AMMIRAGLIA NEMICA PIÙ DETTAGLIATA E GENERATORI DI BARRIERA (2026-11-09).
// 1) La nave da guerra grande dello spazio (e.big, spazio.js) ha uno scafo nuovo molto più dettagliato:
//    corazze a strati, linee dei pannelli, prese d'aria, ponte di comando a tre piani, hangar, emblema,
//    capsule lanciarazzi con le alette, cinque ugelli. Due torrette sul dorso girano verso il giocatore,
//    gli ugelli e le luci pulsano, quando è danneggiata prende fuoco e fa scintille.
// 2) Le due navi che tendono la barriera d'energia (e.gen, barriere.js) sono ora lo stesso tipo di nave
//    ammiraglia, un po' più piccola, con i proiettori azzurri della barriera al posto dei razzi
//    e un'antenna a disco sul dorso.
// Prestazioni PC: lo scafo è disegnato una volta in un'immagine (con i bagliori) e poi solo copiato;
// a ogni fotogramma niente shadowBlur né ctx.filter, solo gradienti piccoli.
// Va caricato dopo barriere.js e buchineri.js.

const AMM={
 genR:42,            // raggio delle navi generatrici (prima 26): ora sono navi ammiraglie più piccole
 genHpBar:70,        // larghezza della barra della vita del generatore
 bigHpBar:96,        // larghezza della barra della vita dell'ammiraglia
 turretTurn:2.2,     // velocità di rotazione delle torrette (radianti al secondo)
 sparks:.12          // probabilità di una scintilla per fotogramma per ogni punto in fiamme
};
const ammSprites={};
function ammRnd(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
// metà superiore del profilo (y<0), specchiata per l'altra metà; unità = raggio della nave
const AMM_HULL=[[1.2,0],[1.04,-.05],[.86,-.11],[.66,-.13],[.6,-.19],[.34,-.23],[.24,-.3],[-.06,-.32],[-.14,-.27],[-.3,-.27],[-.38,-.33],[-.6,-.36],[-.74,-.42],[-.88,-.41],[-.86,-.31],[-.96,-.28],[-1.01,-.14],[-1.01,0]];
const AMM_SPINE=[[.8,0],[.58,-.08],[.3,-.13],[-.1,-.15],[-.68,-.17],[-.82,-.1],[-.84,0]];
const AMM_POD={x0:-.52,x1:.32,y0:.44,y1:.68};// capsule laterali (lato +; l'altro è specchiato)
const AMM_FIRES=[[.55,-.12],[-.28,.22],[.08,.17],[-.7,-.27],[.2,-.2]];
// mezza larghezza dello scafo alla x data (per tenere i dettagli dentro il profilo)
function ammHalfW(x){
 for(let i=1;i<AMM_HULL.length;i++){const[x0,y0]=AMM_HULL[i-1],[x1,y1]=AMM_HULL[i];if(x<=x0&&x>=x1)return-(y0+(y1-y0)*(x0===x1?0:(x0-x)/(x0-x1)))}
 return 0;
}
function ammPath(g,pts,r,close=true){
 g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x*r,y*r):g.moveTo(x*r,y*r));
 for(let i=pts.length-1;i>=0;i--){const[x,y]=pts[i];if(y!==0)g.lineTo(x*r,-y*r)}
 if(close)g.closePath();
}
function ammRect(g,x,y,w,h){g.beginPath();g.rect(x,y,w,h)}

// ---------------------------------------------------------------- scafo disegnato una volta
function ammBody(g,r,gen){
 const rnd=ammRnd(gen?7331:1977);
 const red={hi:'#ff9ba4',mid:'#d95263',a:'#8a3343',b:'#5e2030',c:'#3c1222',d:'#240812',ink:'#14040a'};
 const accent=gen?'#7ff0ff':'#ff394c',accentRgb=gen?'127,240,255':'255,57,76';
 // ombra luminosa intorno a tutto (una volta sola, nell'immagine)
 g.save();g.shadowColor=gen?'rgba(90,220,255,.55)':'rgba(255,57,76,.55)';g.shadowBlur=r*.35;g.fillStyle=red.d;
 ammPath(g,AMM_HULL,r);g.fill();
 for(const s of[-1,1]){g.beginPath();g.rect(AMM_POD.x0*r,(s>0?AMM_POD.y0:-AMM_POD.y1)*r,(AMM_POD.x1-AMM_POD.x0)*r,(AMM_POD.y1-AMM_POD.y0)*r);g.fill()}
 g.restore();

 // --- piloni e capsule laterali
 for(const s of[-1,1]){
  // pilone con travature
  g.fillStyle=red.c;g.strokeStyle=red.mid;g.lineWidth=r*.022;
  g.beginPath();g.moveTo(-.34*r,s*.24*r);g.lineTo(.06*r,s*.24*r);g.lineTo(-.04*r,s*.46*r);g.lineTo(-.4*r,s*.46*r);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(255,155,164,.35)';g.lineWidth=r*.012;g.beginPath();
  for(let i=0;i<4;i++){const x=-.32+i*.09;g.moveTo(x*r,s*.26*r);g.lineTo((x+.06)*r,s*.44*r)}g.stroke();
  // capsula
  const{x0,x1,y0,y1}=AMM_POD,ya=s*y0*r,yb=s*y1*r,ym=(ya+yb)/2;
  const pod=g.createLinearGradient(0,ya,0,yb);pod.addColorStop(0,red.a);pod.addColorStop(.35,red.mid);pod.addColorStop(.55,red.b);pod.addColorStop(1,red.d);
  g.fillStyle=pod;g.strokeStyle=red.hi;g.lineWidth=r*.02;
  g.beginPath();g.moveTo(x0*r,ya);g.lineTo((x1-.04)*r,ya);g.lineTo((x1+.1)*r,s*(y0+.06)*r);g.lineTo((x1+.1)*r,s*(y1-.06)*r);g.lineTo((x1-.04)*r,yb);g.lineTo(x0*r,yb);g.lineTo((x0-.06)*r,s*(y1-.05)*r);g.lineTo((x0-.06)*r,s*(y0+.05)*r);g.closePath();g.fill();g.stroke();
  // alette posteriori
  g.fillStyle=red.c;g.strokeStyle=red.mid;g.lineWidth=r*.016;
  g.beginPath();g.moveTo((x0+.06)*r,s*y1*r);g.lineTo((x0-.1)*r,s*(y1+.1)*r);g.lineTo((x0-.16)*r,s*(y1+.1)*r);g.lineTo((x0-.06)*r,s*y1*r);g.closePath();g.fill();g.stroke();
  // fasce di corazza
  g.strokeStyle='rgba(20,4,10,.75)';g.lineWidth=r*.018;g.beginPath();
  for(let x=x0+.12;x<x1-.05;x+=.15){g.moveTo(x*r,ya);g.lineTo(x*r,yb)}g.stroke();
  g.strokeStyle='rgba(255,190,196,.28)';g.lineWidth=r*.008;g.beginPath();
  for(let x=x0+.135;x<x1-.05;x+=.15){g.moveTo(x*r,ya);g.lineTo(x*r,yb)}g.stroke();
  // riflesso lungo la capsula
  g.strokeStyle='rgba(255,215,220,.4)';g.lineWidth=r*.012;g.beginPath();g.moveTo((x0+.02)*r,ym-s*.06*r);g.lineTo((x1-.06)*r,ym-s*.06*r);g.stroke();
  if(gen){
   // proiettori della barriera: anelli a bobina e cristallo in punta
   for(let i=0;i<4;i++){const x=(x0+.14+i*.13)*r;g.fillStyle=red.ink;g.strokeStyle='#7ff0ff';g.lineWidth=r*.012;g.beginPath();g.ellipse(x,ym,r*.03,(y1-y0)*r*.58,0,0,6.283);g.fill();g.stroke()}
   g.fillStyle='#103a48';g.strokeStyle='#bff8ff';g.lineWidth=r*.014;
   g.beginPath();g.moveTo((x1+.1)*r,ym-s*.07*r);g.lineTo((x1+.24)*r,ym);g.lineTo((x1+.1)*r,ym+s*.07*r);g.closePath();g.fill();g.stroke();
  }else{
   // tubi lanciarazzi (le testate si colorano a ogni fotogramma)
   for(let i=0;i<3;i++){const y=s*(y0+.04+i*.07)*r;g.fillStyle=red.ink;g.strokeStyle=red.mid;g.lineWidth=r*.01;g.beginPath();g.arc((x1+.1)*r,y,r*.03,0,6.283);g.fill();g.stroke()}
  }
  // ugello della capsula
  g.fillStyle=red.ink;g.strokeStyle=red.mid;g.lineWidth=r*.014;g.beginPath();g.ellipse((x0-.06)*r,ym,r*.03,r*.07,0,0,6.283);g.fill();g.stroke();
 }

 // --- scafo principale
 const hull=g.createLinearGradient(0,-.42*r,0,.42*r);
 hull.addColorStop(0,red.mid);hull.addColorStop(.2,red.a);hull.addColorStop(.48,red.b);hull.addColorStop(.52,red.c);hull.addColorStop(.8,red.d);hull.addColorStop(1,red.ink);
 g.fillStyle=hull;ammPath(g,AMM_HULL,r);g.fill();
 g.save();ammPath(g,AMM_HULL,r);g.clip();
 // luce radente dall'alto: la metà superiore un po' più chiara
 const sheen=g.createLinearGradient(.9*r,-.3*r,-.6*r,.2*r);sheen.addColorStop(0,'rgba(255,180,190,.18)');sheen.addColorStop(.5,'rgba(255,180,190,.04)');sheen.addColorStop(1,'rgba(0,0,0,.18)');
 g.fillStyle=sheen;g.fillRect(-1.1*r,-.5*r,2.4*r,r);
 // linee dei pannelli (trasversali spezzate e longitudinali)
 g.strokeStyle='rgba(14,3,8,.7)';g.lineWidth=r*.01;g.beginPath();
 for(let x=-.92;x<1.05;x+=.085+rnd()*.05){const a=-.42+rnd()*.12,b=.42-rnd()*.12;g.moveTo(x*r,a*r);g.lineTo(x*r,(a+(b-a)*(.3+rnd()*.25))*r);g.moveTo(x*r,(b-(b-a)*(.25+rnd()*.2))*r);g.lineTo(x*r,b*r)}
 for(const y of[-.24,-.2,.2,.24]){let x=-.95;while(x<.8){const l=.1+rnd()*.25;g.moveTo(x*r,y*r);g.lineTo(Math.min(.8,x+l)*r,y*r);x+=l+.04+rnd()*.08}}
 g.stroke();
 g.strokeStyle='rgba(255,170,180,.16)';g.lineWidth=r*.006;g.beginPath();
 for(const y of[-.235,.215]){g.moveTo(-.9*r,y*r);g.lineTo(.6*r,y*r)}g.stroke();
 // prese d'aria e piccoli dettagli (greeble)
 for(let i=0;i<34;i++){
  const x=-.9+rnd()*1.7,y=(rnd()<.5?-1:1)*(.17+rnd()*.15),w=.03+rnd()*.07,h=.015+rnd()*.03;
  if(Math.abs(y)+h>ammHalfW(x)-.02||Math.abs(y)+h>ammHalfW(x+w)-.02)continue;
  g.fillStyle=rnd()<.5?red.c:red.a;g.fillRect(x*r,y*r,w*r,h*r);
  g.fillStyle='rgba(255,180,190,.25)';g.fillRect(x*r,y*r,w*r,r*.005);
 }
 // griglie di ventilazione
 for(const[x,y]of[[-.55,-.29],[-.55,.24],[.3,-.2],[.3,.15]]){g.fillStyle=red.ink;g.fillRect(x*r,y*r,.16*r,.05*r);g.strokeStyle='rgba(255,120,130,.35)';g.lineWidth=r*.006;g.beginPath();for(let k=1;k<6;k++){g.moveTo((x+k*.027)*r,y*r);g.lineTo((x+k*.027)*r,(y+.05)*r)}g.stroke()}
 // portelloni degli hangar sui fianchi
 for(const s of[-1,1]){g.fillStyle=red.ink;g.strokeStyle='rgba(255,155,164,.5)';g.lineWidth=r*.01;g.beginPath();g.moveTo(-.04*r,s*.3*r);g.lineTo(.2*r,s*.28*r);g.lineTo(.2*r,s*.22*r);g.lineTo(-.04*r,s*.24*r);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(255,210,150,.5)';g.beginPath();g.moveTo(.0,s*.265*r);g.lineTo(.18*r,s*.25*r);g.stroke()}
 g.restore();
 // bordo: luce sopra, ombra sotto
 g.lineWidth=r*.028;g.strokeStyle=red.hi;ammPath(g,AMM_HULL,r);g.stroke();
 g.lineWidth=r*.018;g.strokeStyle='rgba(20,3,8,.6)';g.beginPath();AMM_HULL.forEach(([x,y],i)=>i?g.lineTo(x*r,-y*r):g.moveTo(x*r,-y*r));g.stroke();

 // --- dorso corazzato a piastre
 const sp=g.createLinearGradient(0,-.17*r,0,.17*r);sp.addColorStop(0,red.a);sp.addColorStop(.5,red.c);sp.addColorStop(1,red.d);
 g.fillStyle=sp;g.strokeStyle='rgba(255,155,164,.55)';g.lineWidth=r*.014;ammPath(g,AMM_SPINE,r);g.fill();g.stroke();
 g.save();ammPath(g,AMM_SPINE,r);g.clip();
 for(let x=-.74;x<.62;x+=.16){
  g.fillStyle='rgba(255,170,180,.13)';g.beginPath();g.moveTo(x*r,-.17*r);g.lineTo((x+.13)*r,-.17*r);g.lineTo((x+.1)*r,0);g.lineTo((x-.03)*r,0);g.closePath();g.fill();
  g.strokeStyle='rgba(14,3,8,.8)';g.lineWidth=r*.012;g.beginPath();g.moveTo((x+.14)*r,-.2*r);g.lineTo((x+.14)*r,.2*r);g.stroke();
 }
 g.strokeStyle='rgba(14,3,8,.6)';g.lineWidth=r*.01;g.beginPath();g.moveTo(-.84*r,0);g.lineTo(.8*r,0);g.stroke();
 g.restore();
 // muso: lama e strisce
 g.fillStyle=red.c;g.strokeStyle=red.hi;g.lineWidth=r*.012;g.beginPath();g.moveTo(1.2*r,0);g.lineTo(.84*r,-.045*r);g.lineTo(.74*r,0);g.lineTo(.84*r,.045*r);g.closePath();g.fill();g.stroke();
 g.fillStyle=accent;for(const s of[-1,1]){g.beginPath();g.moveTo(1.0*r,s*.05*r);g.lineTo(.64*r,s*.135*r);g.lineTo(.58*r,s*.115*r);g.lineTo(.93*r,s*.04*r);g.closePath();g.fill()}
 g.fillStyle=`rgba(${accentRgb},.8)`;for(const s of[-1,1])for(let i=0;i<3;i++)g.fillRect((-.7+i*.05)*r,s*.37*r-r*.012,r*.03,r*.024);
 // emblema nemico (triangolo con l'occhio)
 g.save();g.translate(.5*r,0);g.fillStyle=red.ink;g.strokeStyle=accent;g.lineWidth=r*.012;
 g.beginPath();g.moveTo(.09*r,0);g.lineTo(-.05*r,-.07*r);g.lineTo(-.05*r,.07*r);g.closePath();g.fill();g.stroke();
 g.fillStyle=accent;g.beginPath();g.arc(-.003*r,0,r*.018,0,6.283);g.fill();g.restore();

 // --- ponte di comando a tre piani
 const tiers=[[[-.14,-.12],[-.02,-.09],[-.02,.09],[-.14,.12],[-.48,.12],[-.5,0],[-.48,-.12]],[[-.18,-.085],[-.07,-.065],[-.07,.065],[-.18,.085],[-.43,.085],[-.43,-.085]],[[-.22,-.05],[-.13,-.04],[-.13,.04],[-.22,.05],[-.38,.05],[-.38,-.05]]];
 tiers.forEach((t,i)=>{
  const gr=g.createLinearGradient(0,-.12*r,0,.12*r);gr.addColorStop(0,i===2?red.mid:red.a);gr.addColorStop(1,red.d);
  g.fillStyle=gr;g.strokeStyle=i===0?red.hi:'rgba(255,180,190,.6)';g.lineWidth=r*.012;
  g.beginPath();t.forEach(([x,y],k)=>k?g.lineTo(x*r,y*r):g.moveTo(x*r,y*r));g.closePath();g.fill();g.stroke();
 });
 // vetrata del ponte
 g.fillStyle='#1a060c';g.beginPath();g.moveTo(-.02*r,-.075*r);g.lineTo(.02*r,0);g.lineTo(-.02*r,.075*r);g.lineTo(-.07*r,.06*r);g.lineTo(-.07*r,-.06*r);g.closePath();g.fill();
 g.strokeStyle='rgba(255,219,156,.7)';g.lineWidth=r*.008;g.stroke();
 // antenne
 g.strokeStyle='rgba(255,190,196,.7)';g.lineWidth=r*.008;g.beginPath();g.moveTo(-.4*r,-.05*r);g.lineTo(-.56*r,-.13*r);g.moveTo(-.4*r,.05*r);g.lineTo(-.58*r,.1*r);g.stroke();
 if(gen){
  // antenna a disco che proietta la barriera
  const dx=.2*r;g.fillStyle=red.ink;g.strokeStyle='#7ff0ff';g.lineWidth=r*.016;g.beginPath();g.arc(dx,0,r*.15,0,6.283);g.fill();g.stroke();
  g.strokeStyle='rgba(127,240,255,.45)';g.lineWidth=r*.008;for(const k of[.11,.075]){g.beginPath();g.arc(dx,0,r*k,0,6.283);g.stroke()}
  g.beginPath();for(let k=0;k<6;k++){const a=k*1.047;g.moveTo(dx+Math.cos(a)*r*.04,Math.sin(a)*r*.04);g.lineTo(dx+Math.cos(a)*r*.15,Math.sin(a)*r*.15)}g.stroke();
 }
 // basi delle torrette
 for(const[x]of ammTurrets(gen)){g.fillStyle=red.c;g.strokeStyle=red.hi;g.lineWidth=r*.012;g.beginPath();g.arc(x*r,0,r*.075,0,6.283);g.fill();g.stroke();g.fillStyle=red.ink;g.beginPath();g.arc(x*r,0,r*.045,0,6.283);g.fill()}

 // --- blocco motori e ugelli
 g.fillStyle=red.c;g.strokeStyle=red.mid;g.lineWidth=r*.014;g.beginPath();g.moveTo(-.86*r,-.3*r);g.lineTo(-1.03*r,-.26*r);g.lineTo(-1.03*r,.26*r);g.lineTo(-.86*r,.3*r);g.closePath();g.fill();g.stroke();
 for(const[y,s]of ammNozzles()){g.fillStyle=red.ink;g.strokeStyle=red.hi;g.lineWidth=r*.014;g.beginPath();g.ellipse(-1.03*r,y*r,r*.04*s,r*.085*s,0,0,6.283);g.fill();g.stroke();
  g.strokeStyle='rgba(255,120,130,.4)';g.lineWidth=r*.008;g.beginPath();g.ellipse(-1.03*r,y*r,r*.026*s,r*.058*s,0,0,6.283);g.stroke()}
}
function ammNozzles(){return[[-.2,1],[0,1.15],[.2,1],[-.11,.6],[.11,.6]]}
function ammTurrets(gen){return gen?[[-.64]]:[[.38],[-.64]]}
function ammScale(){const k=typeof canvas!=='undefined'&&canvas&&W?canvas.width/W:1;return Math.min(4,Math.max(1.5,k*1.6))}
function ammSprite(r,gen){
 const k=ammScale(),key=(gen?'g':'b')+r+'_'+k;
 const old=ammSprites[key];if(old!==undefined)return old;
 try{
  if(typeof document==='undefined'||!document.createElement)return ammSprites[key]=null;
  const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return ammSprites[key]=null;
  const L=-1.45*r,T=-1.0*r,w=2.95*r,h=2.0*r;
  c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);const g=c.getContext('2d');if(!g||!g.createLinearGradient)return ammSprites[key]=null;
  g.setTransform(k,0,0,k,-L*k,-T*k);ammBody(g,r,gen);g.shadowBlur=0;
  return ammSprites[key]={c,L,T,w,h};
 }catch(err){console.error(err);return ammSprites[key]=null}
}
// alone morbido senza shadowBlur
function ammGlow(x,y,rad,rgb,a){
 const gl=ctx.createRadialGradient(x,y,0,x,y,rad);gl.addColorStop(0,`rgba(${rgb},${a})`);gl.addColorStop(1,`rgba(${rgb},0)`);
 ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,rad,0,6.283);ctx.fill();
}

// ---------------------------------------------------------------- disegno a ogni fotogramma
function ammDraw(e,gen){
 const r=gen?Math.max(e.r||AMM.genR,AMM.genR):e.r,now=performance.now()/1000;
 const moving=Math.hypot(e.vx||0,e.vy||0)>10,charge=!gen&&e.fire<.8?1-e.fire/.8:0,hp=Math.max(0,e.hp/(e.maxHp||1));
 const seed=(e.slot||0)*1.7+(e.x>0?.6:0);
 ctx.save();ctx.translate(e.x,e.y);
 if(gen){// alone e anelli della barriera, sotto lo scafo
  const p=.5+.5*Math.sin(now*6+(e.slot||0));
  ctx.globalCompositeOperation='lighter';ammGlow(0,0,r*1.55,'80,200,255',.22+.16*p);ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle=`rgba(140,242,255,${(.35+.35*p).toFixed(2)})`;ctx.lineWidth=2;
  for(let k=0;k<3;k++){const a=now*1.6+k*2.094;ctx.beginPath();ctx.arc(0,0,r*1.3,a,a+1.1);ctx.stroke()}
 }
 ctx.rotate(e.angle||0);
 // scie dei motori (anche da ferma tengono un filo di fiamma)
 for(const[y,s]of ammNozzles())drawPlume(-1.05*r,y*r,-1,0,(moving?58:18)*s*(r/56),(moving?6.5:4)*s*(r/56),'#ff5268');
 if(moving)for(const s of[-1,1])drawPlume((AMM_POD.x0-.08)*r,s*(AMM_POD.y0+AMM_POD.y1)/2*r,-1,0,30*(r/56),4*(r/56),'#ff5268');
 const sp=ammSprite(r,gen);
 if(sp)ctx.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);
 else{ctx.fillStyle='#5e2030';ctx.strokeStyle='#ff9ba4';ctx.lineWidth=1.5;ammPath(ctx,AMM_HULL,r);ctx.fill();ctx.stroke()}
 ctx.globalCompositeOperation='lighter';
 // bagliore negli ugelli
 const thr=moving?1:.55;
 for(const[y,s]of ammNozzles())ammGlow(-1.03*r,y*r,r*.13*s,'255,90,110',(.35+.15*Math.sin(now*23+y*9))*thr);
 // finestre del ponte e oblò che tremolano
 for(let i=0;i<4;i++){const on=Math.sin(now*1.3+i*2.1+seed)>-.85;if(on)ammGlow((-.42+i*.07)*r,0,r*.045,'255,219,156',.55)}
 // luci di posizione alternate
 for(const s of[-1,1]){const blink=Math.floor(now*2+(s>0?.5:0))%2===0;if(blink){ammGlow((AMM_POD.x0-.04)*r,s*AMM_POD.y1*r,r*.12,'255,57,76',.8);ammGlow(-.84*r,s*.41*r,r*.08,'255,57,76',.6)}}
 if(Math.floor(now*1.1)%3===0)ammGlow(1.17*r,0,r*.1,gen?'127,240,255':'255,200,120',.7);
 if(gen){// cristalli dei proiettori e disco che pulsano
  const p=.5+.5*Math.sin(now*6+(e.slot||0));
  for(const s of[-1,1])ammGlow((AMM_POD.x1+.2)*r,s*(AMM_POD.y0+AMM_POD.y1)/2*r,r*(.16+.06*p),'127,240,255',.6+.3*p);
  ammGlow(.2*r,0,r*(.16+.05*p),'160,245,255',.55+.35*p);
  ctx.strokeStyle=`rgba(190,250,255,${(.5+.4*p).toFixed(2)})`;ctx.lineWidth=1.4;const a=now*2.4;ctx.beginPath();ctx.arc(.2*r,0,r*.1,a,a+2.2);ctx.stroke();
  for(const s of[-1,1])for(let i=0;i<4;i++){const on=((now*5|0)+i)%4===0;if(on)ammGlow((AMM_POD.x0+.14+i*.13)*r,s*(AMM_POD.y0+AMM_POD.y1)/2*r,r*.07,'127,240,255',.7)}
 }else{// testate dei razzi: si scaldano prima della salva
  for(const s of[-1,1])for(let i=0;i<3;i++){const y=s*(AMM_POD.y0+.04+i*.07)*r;
   if(charge>0)ammGlow((AMM_POD.x1+.1)*r,y,r*(.04+.05*charge),'255,140,80',.5+.5*charge);
   ctx.fillStyle=charge?`rgb(255,${170-charge*90|0},80)`:'#ff6576';ctx.beginPath();ctx.arc((AMM_POD.x1+.1)*r,y,r*.016,0,6.283);ctx.fill()}
 }
 ctx.globalCompositeOperation='source-over';
 // torrette che puntano il giocatore
 const aim=typeof player!=='undefined'&&player&&!player.destroyed?Math.atan2(player.y-e.y,player.x-e.x)-(e.angle||0):0;
 e.ammTur=e.ammTur||[0,0];
 ammTurrets(gen).forEach(([x],i)=>{
  const cur=e.ammTur[i]||0,d=Math.atan2(Math.sin(aim-cur),Math.cos(aim-cur)),dt=Math.min(.05,Math.max(0,now-(e.ammT||now)));
  const a=e.ammTur[i]=cur+Math.max(-AMM.turretTurn*dt,Math.min(AMM.turretTurn*dt,d));
  ctx.save();ctx.translate(x*r,0);ctx.rotate(a);
  ctx.fillStyle='#3c1222';ctx.strokeStyle='#ff9ba4';ctx.lineWidth=1;
  ctx.fillRect(r*.02,-r*.03,r*.16,r*.022);ctx.strokeRect(r*.02,-r*.03,r*.16,r*.022);
  ctx.fillRect(r*.02,r*.008,r*.16,r*.022);ctx.strokeRect(r*.02,r*.008,r*.16,r*.022);
  ctx.fillStyle='#8a3343';ctx.beginPath();ctx.moveTo(r*.06,0);ctx.lineTo(r*.01,-r*.05);ctx.lineTo(-r*.05,-r*.04);ctx.lineTo(-r*.05,r*.04);ctx.lineTo(r*.01,r*.05);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=gen?'#7ff0ff':'#ffdb9c';ctx.beginPath();ctx.arc(0,0,r*.012,0,6.283);ctx.fill();
  ctx.restore();
 });
 e.ammT=now;
 // danni: fuochi e scintille sulla corazza
 const fires=hp<.75?Math.min(AMM_FIRES.length,Math.ceil((.75-hp)/.15)):0;
 if(fires){
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<fires;i++){const[x,y]=AMM_FIRES[i],f=.6+.4*Math.sin(now*17+i*3.1)*Math.sin(now*7.3+i);ammGlow(x*r,y*r,r*(.08+.05*f),'255,150,60',.55+.3*f);ammGlow(x*r,y*r,r*.03,'255,240,200',.7)}
  ctx.globalCompositeOperation='source-over';
 }
 ctx.restore();
 if(fires&&typeof particles!=='undefined'&&Array.isArray(particles)&&Math.random()<AMM.sparks*fires){
  const[x,y]=AMM_FIRES[Math.random()*fires|0],c=Math.cos(e.angle||0),s=Math.sin(e.angle||0),wx=e.x+(x*c-y*s)*r,wy=e.y+(x*s+y*c)*r;
  particles.push({x:wx,y:wy,vx:(Math.random()-.5)*60+(e.vx||0),vy:(Math.random()-.5)*60+(e.vy||0),life:.5,max:.5,color:Math.random()<.5?'#ffb36b':'#5a4a52',r:1.6+Math.random()*2,soft:true});
 }
 // barra della vita e anello di carica
 ctx.save();ctx.translate(e.x,e.y);
 const bw=gen?AMM.genHpBar:AMM.bigHpBar,top=-r*(gen?1.0:.95)-22;
 ctx.fillStyle='rgba(10,2,6,.6)';ctx.fillRect(-bw/2-1,top-1,bw+2,6);
 ctx.fillStyle='#ffffff22';ctx.fillRect(-bw/2,top,bw,4);ctx.fillStyle=typeof hpColor==='function'?hpColor(hp):'#ff5268';ctx.fillRect(-bw/2,top,bw*hp,4);
 if(charge>0){ctx.strokeStyle=`rgba(255,120,90,${(.25+.5*charge).toFixed(2)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*1.2+10,-Math.PI/2,-Math.PI/2+Math.PI*2*charge);ctx.stroke()}
 if(gen){ctx.fillStyle='#9fefff';ctx.font='700 11px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('GENERATORE',0,top-6)}
 ctx.restore();
}

// ---------------------------------------------------------------- aggancio
spDrawBig=function(e){return ammDraw(e,false)};
barDrawGen=function(e){return ammDraw(e,true)};
const ammOrig={barSpSpawn};
barSpSpawn=function(S,side){
 const out=ammOrig.barSpSpawn(S,side);
 if(S&&S.gens)for(const e of S.gens)e.r=AMM.genR;// colpibili su tutto lo scafo
 return out;
};
