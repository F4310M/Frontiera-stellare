// Stellar Frontier — viaggio nell'IPERSPAZIO cinematografico.
// Sostituisce drawHyperspace e il suono 'warp' di game.js (togliendo lo script si torna all'effetto di prima).
// Quattro momenti sulla durata del salto (WARP_DURATION):
//   CARICA   le stelle si allungano, l'energia si raccoglie al centro, la nave vibra
//   SALTO    lampo, onda d'urto e scia cromatica
//   TUNNEL   anelli di energia che vorticano verso lo schermo, scariche, colore che vira verso il pianeta
//   USCITA   il pianeta di destinazione compare al centro, le scie si richiudono, lampo finale
const hyOrig={draw:typeof drawHyperspace==='function'?drawHyperspace:null,sfx:typeof sfx==='function'?sfx:null};
const hy={bolts:[],last:0};
const hyClamp=x=>x<0?0:x>1?1:x;
const hyEase=x=>{x=hyClamp(x);return x*x*(3-2*x)};
function hyRgb(hex){const n=parseInt(String(hex||'#39c8ff').slice(1),16);return[n>>16&255,n>>8&255,n&255]}
const hyMix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
const hyCss=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;

drawHyperspace=function(t){
 const D=(typeof WARP_DURATION==='number'?WARP_DURATION:3600)/1000,cx=W/2,cy=H/2,R=Math.hypot(W,H)*.62;
 const p=planets[selected]||{},pc=hyRgb(p.glow);
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tJump=.85,tExit=D-.7,charge=hyEase(t/tJump),cruise=hyEase((t-tJump)/.35),exit=hyEase((t-tExit)/.7);
 const travel=hyClamp((t-tJump)/(tExit-tJump)),since=t-tJump;
 const col=hyMix([70,150,255],pc,hyEase(travel)*.75),deep=hyMix([60,30,140],pc,hyEase(travel)*.4);
 const dt=Math.min(.05,Math.max(0,t-hy.last));hy.last=t;
 // Vibrazione della nave: cresce con la carica, colpo forte al salto, leggero tremito nel tunnel.
 const shake=reduced?0:(t<tJump?charge**3*5:Math.max(0,1-since/.45)*16+cruise*(1-exit)*1.6);
 const roll=reduced?0:Math.sin(t*.9)*.05*cruise+since*.06*cruise;
 ctx.save();
 ctx.fillStyle='#01030a';ctx.fillRect(0,0,W,H);
 ctx.translate(cx+(Math.random()-.5)*shake,cy+(Math.random()-.5)*shake);ctx.rotate(roll);
 // Nebbia del tunnel.
 const fog=ctx.createRadialGradient(0,0,4,0,0,R);
 fog.addColorStop(0,hyCss([235,248,255],.25+cruise*.55));
 fog.addColorStop(.06,hyCss(col,.18+cruise*.45));
 fog.addColorStop(.3,hyCss(deep,cruise*.35+charge*.08));
 fog.addColorStop(.7,hyCss(deep,cruise*.12));
 fog.addColorStop(1,'rgba(1,3,10,0)');
 ctx.fillStyle=fog;ctx.fillRect(-W,-H,W*2,H*2);
 ctx.globalCompositeOperation='lighter';
 // Anelli di energia: archi spezzati che corrono verso lo schermo ruotando.
 if(!reduced&&cruise>0){
  const N=22,fade=cruise*(1-exit*.9);
  for(let i=0;i<N;i++){
   const ph=(i/N+t*.95)%1,z=1.04-ph,r=R*.035/z;if(r>R*1.6)continue;
   const a=Math.min(1,fade*Math.min(1,ph*3)*(1-ph)*1.5);if(a<.01)continue;
   ctx.strokeStyle=hyCss(i%3?col:[200,235,255],a);ctx.lineWidth=Math.max(1.5,r*.035);
   const spin=i*1.7+t*(1.6+(i%4)*.25);
   for(let k=0;k<3;k++){const s=spin+k*Math.PI*2/3;ctx.beginPath();ctx.ellipse(0,0,r,r*.92,0,s,s+1.25+(i%2)*.5);ctx.stroke()}
  }
 }
 // Scie delle stelle (riusa warpStars di game.js); nel tunnel le più vicine hanno una frangia cromatica.
 const speed=t*.04+Math.max(0,t-.5)**1.7*.3,stretch=(2+charge**4*80+cruise*190)*(1-exit*.92);
 for(const s of warpStars){
  const z=1-((s.depth+speed)%1),depth=.12+z*1.7,r=s.radius*R*.14/depth;if(r>R*1.5)continue;
  const len=Math.min(R*.75,stretch/(depth*depth)),ca=Math.cos(s.angle),sa=Math.sin(s.angle);
  const x=ca*r,y=sa*r,tx=ca*(r+len),ty=sa*(r+len),near=depth<.55,w=s.width*(.5+cruise*.75)/Math.max(.6,depth);
  if(near&&cruise>.3&&!reduced){
   const o=w*1.6;ctx.lineWidth=w;
   ctx.strokeStyle=`rgba(255,60,90,${.18*cruise})`;ctx.beginPath();ctx.moveTo(x-sa*o,y+ca*o);ctx.lineTo(tx-sa*o,ty+ca*o);ctx.stroke();
   ctx.strokeStyle=`rgba(60,220,255,${.18*cruise})`;ctx.beginPath();ctx.moveTo(x+sa*o,y-ca*o);ctx.lineTo(tx+sa*o,ty-ca*o);ctx.stroke();
  }
  ctx.strokeStyle=hyCss(near?[235,248,255]:col,.28+cruise*.32+(1-depth/2)*.12);ctx.lineWidth=w;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();
 }
 // Scariche di energia lungo le pareti del tunnel.
 if(!reduced&&cruise>.5&&exit<.5&&Math.random()<dt*7){
  const ang=Math.random()*Math.PI*2,pts=[];let rr=R*.05;
  while(rr<R*1.1){const j=(Math.random()-.5)*.22;pts.push([Math.cos(ang+j)*rr,Math.sin(ang+j)*rr]);rr*=1.18+Math.random()*.2}
  hy.bolts.push({pts,life:.16});
 }
 ctx.lineCap='round';
 for(const b of hy.bolts){
  ctx.strokeStyle=hyCss([210,240,255],b.life/.16*.75);ctx.lineWidth=2.2;ctx.beginPath();
  b.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  ctx.strokeStyle=hyCss(col,b.life/.16*.35);ctx.lineWidth=7;ctx.stroke();b.life-=dt;
 }
 hy.bolts=hy.bolts.filter(b=>b.life>0);
 // Nucleo: l'energia si raccoglie durante la carica e pulsa nel tunnel.
 const pulse=1+Math.sin(t*14)*.08*cruise,core=R*(.012+charge*.035+cruise*.03)*pulse;
 const cg=ctx.createRadialGradient(0,0,0,0,0,core*4);
 cg.addColorStop(0,'rgba(255,255,255,.95)');cg.addColorStop(.25,hyCss(col,.65));cg.addColorStop(1,hyCss(col,0));
 ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,core*4,0,Math.PI*2);ctx.fill();
 // Anelli che convergono durante la carica.
 if(t<tJump&&!reduced)for(let i=0;i<3;i++){const ph=(t*1.6+i/3)%1,r=R*.5*(1-ph)*(1-charge*.4);ctx.strokeStyle=hyCss(col,ph*.5*charge);ctx.lineWidth=1.5+ph*2;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()}
 // Riflesso anamorfico orizzontale.
 const flareA=Math.max(charge*.35*(t<tJump?1:0),Math.max(0,1-Math.abs(since)/.3)*.9,cruise*.22*(1-exit)+exit*.6);
 if(flareA>.01){const fl=ctx.createLinearGradient(-W,0,W,0);fl.addColorStop(0,hyCss(col,0));fl.addColorStop(.5,hyCss([220,240,255],flareA));fl.addColorStop(1,hyCss(col,0));ctx.fillStyle=fl;ctx.fillRect(-W,-1.5-flareA*2,W*2,3+flareA*4)}
 // Onda d'urto del salto.
 if(since>0&&since<.7&&!reduced){const k=since/.7;ctx.strokeStyle=hyCss([220,240,255],(1-k)*.8);ctx.lineWidth=18*(1-k)+2;ctx.beginPath();ctx.arc(0,0,R*.08+k*R*1.5,0,Math.PI*2);ctx.stroke()}
 // Uscita: il pianeta di destinazione cresce al centro.
 if(exit>0){
  const pr=R*(.01+exit**2*.16),pg=ctx.createRadialGradient(-pr*.3,-pr*.3,pr*.1,0,0,pr*2.2);
  pg.addColorStop(0,hyCss(hyMix(pc,[255,255,255],.5),exit));pg.addColorStop(.42,hyCss(pc,exit*.9));pg.addColorStop(.48,hyCss(pc,exit*.35));pg.addColorStop(1,hyCss(pc,0));
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(0,0,pr*2.2,0,Math.PI*2);ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
 ctx.restore();
 // Vignettatura.
 const v=ctx.createRadialGradient(cx,cy,Math.min(W,H)*.3,cx,cy,R);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${.55+cruise*.2})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 // Lampi: al salto e in uscita.
 const jumpFlash=Math.max(0,1-Math.abs(since)/.18)*.85,outFlash=exit**3;
 const flash=reduced?outFlash*.2:Math.max(jumpFlash,outFlash);
 if(flash>.01){ctx.fillStyle=`rgba(225,242,255,${flash})`;ctx.fillRect(0,0,W,H)}
 $('warpPhase').textContent=t<tJump?'CALCOLO DEL SALTO':t<tExit?'IPERSPAZIO':'USCITA DALL’IPERSPAZIO';
 $('warpDestination').textContent='ROTTA BLOCCATA / '+(p.name||'');
};

// ---- suono del salto: carica che sale, colpo, rombo del tunnel, uscita
function hyOut(a,g){if(typeof routeSound==='function')routeSound(g);else g.connect(typeof audioBus!=='undefined'&&audioBus?audioBus:a.destination)}
function hyNoise(a,t,dur){const b=a.createBuffer(1,Math.ceil(a.sampleRate*dur),a.sampleRate),d=b.getChannelData(0);let br=0;for(let i=0;i<d.length;i++){br=(br+(Math.random()*2-1)*.08)/1.08;d[i]=(Math.random()*2-1)*.5+br*3}const s=a.createBufferSource();s.buffer=b;s.start(t);return s}
function hyWarpSound(){
 const a=typeof audio==='function'&&audio();if(!a)return;
 const D=(typeof WARP_DURATION==='number'?WARP_DURATION:3600)/1000,t0=a.currentTime+.02,jump=t0+.85,exit=t0+D-.7;
 // Carica: due oscillatori che salgono, filtro che si apre.
 {const g=a.createGain(),f=a.createBiquadFilter();f.type='lowpass';f.Q.value=8;f.frequency.setValueAtTime(220,t0);f.frequency.exponentialRampToValueAtTime(3200,jump);
  g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.05,jump-.05);g.gain.exponentialRampToValueAtTime(.0001,jump+.15);f.connect(g);hyOut(a,g);
  for(const[type,f0,f1]of[['sawtooth',55,440],['square',82,660],['sine',110,1320]]){const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,jump);o.connect(f);o.start(t0);o.stop(jump+.2)}}
 // Colpo del salto: sub che crolla e soffio.
 {const g=a.createGain(),o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(110,jump);o.frequency.exponentialRampToValueAtTime(28,jump+1.1);
  g.gain.setValueAtTime(.0001,jump);g.gain.linearRampToValueAtTime(.16,jump+.01);g.gain.exponentialRampToValueAtTime(.0001,jump+1.3);o.connect(g);hyOut(a,g);o.start(jump);o.stop(jump+1.35)}
 {const s=hyNoise(a,jump,.9),f=a.createBiquadFilter(),g=a.createGain();f.type='lowpass';f.frequency.setValueAtTime(4000,jump);f.frequency.exponentialRampToValueAtTime(300,jump+.8);
  g.gain.setValueAtTime(.09,jump);g.gain.exponentialRampToValueAtTime(.0001,jump+.85);s.connect(f);f.connect(g);hyOut(a,g)}
 // Rombo del tunnel: rumore filtrato che ondeggia, più un bordone grave.
 {const len=exit-jump+.4,s=hyNoise(a,jump+.1,len),f=a.createBiquadFilter(),g=a.createGain(),l=a.createOscillator(),ld=a.createGain();
  f.type='bandpass';f.Q.value=1.4;f.frequency.value=650;l.frequency.value=3.2;ld.gain.value=320;l.connect(ld);ld.connect(f.frequency);l.start(jump);l.stop(exit+.5);
  g.gain.setValueAtTime(.0001,jump+.1);g.gain.exponentialRampToValueAtTime(.035,jump+.5);g.gain.setValueAtTime(.035,exit-.2);g.gain.exponentialRampToValueAtTime(.0001,exit+.4);s.connect(f);f.connect(g);hyOut(a,g);
  const d=a.createOscillator(),dg=a.createGain();d.type='sawtooth';d.frequency.value=41;const df=a.createBiquadFilter();df.type='lowpass';df.frequency.value=160;
  dg.gain.setValueAtTime(.0001,jump);dg.gain.exponentialRampToValueAtTime(.03,jump+.4);dg.gain.setValueAtTime(.03,exit-.1);dg.gain.exponentialRampToValueAtTime(.0001,exit+.5);d.connect(df);df.connect(dg);hyOut(a,dg);d.start(jump);d.stop(exit+.55)}
 // Uscita: soffio che scende e un ultimo colpo.
 {const s=hyNoise(a,exit,.75),f=a.createBiquadFilter(),g=a.createGain();f.type='highpass';f.frequency.setValueAtTime(6000,exit);f.frequency.exponentialRampToValueAtTime(250,exit+.7);
  g.gain.setValueAtTime(.0001,exit);g.gain.exponentialRampToValueAtTime(.07,exit+.55);g.gain.exponentialRampToValueAtTime(.0001,exit+.75);s.connect(f);f.connect(g);hyOut(a,g)}
 {const e=t0+D,g=a.createGain(),o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(90,e);o.frequency.exponentialRampToValueAtTime(35,e+.6);
  g.gain.setValueAtTime(.0001,e);g.gain.linearRampToValueAtTime(.11,e+.01);g.gain.exponentialRampToValueAtTime(.0001,e+.7);o.connect(g);hyOut(a,g);o.start(e);o.stop(e+.75)}
}
if(hyOrig.sfx)sfx=function(name,power){if(name==='warp'){if(soundEnabled)hyWarpSound();return}return hyOrig.sfx(name,power)};
