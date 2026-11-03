// Test fase a terra più lunga e gallerie sotterranee: ponte di colonne, pozzi, discesa, risalita, conteggio coloni.
// Eseguire dalla cartella principale: node tests/sotterranei.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','battaglia.js','sotterranei.js','godmode.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const SOT=val('({ceil:SOT.ceil,padY:SOT.padY,extra:SOT.extra})');
const groundAt=(arr,x)=>{for(const s of arr)if(x>=s.x&&x<s.x+s.w)return s.y;return null};

// 1) Livello più lungo, ponte di colonne, gallerie con pozzi in ogni pianeta
for(let i=0;i<5;i++){
 run(`globalThis.L=buildPlatformLevel(planets[${i}])`);
 const L=val('L'),d=val(`planets[${i}].difficulty`);
 assert(L.arenaX>=6000+d*800+SOT.extra(d),'Percorso più lungo sul pianeta '+i+': '+L.arenaX);
 assert(L.pillarZones.length>=1,'Ponte di colonne sul pianeta '+i);
 for(const z of L.pillarZones){
  const cols=L.solids.filter(s=>s.pillar&&s.x>=z.x0&&s.x<z.x1).sort((a,b)=>a.x-b.x);
  assert(cols.length>=3,'Almeno 3 colonne');
  let prevEnd=z.x0;for(const c of cols){assert(c.x-prevEnd>=240,'Distanza tra le colonne da jetpack: '+(c.x-prevEnd));prevEnd=c.x+c.w}
  assert(groundAt(L.solids,z.x0+20)===null,'Sotto il ponte c\'è il vuoto');
  assert(z.baseY-Math.min(...z.tops)>=150,'Colonne più alte del salto');
 }
 assert(L.solids.every(s=>s.x>=L.arenaX||s.x+s.w<=L.arenaX),'L\'arena resta libera');
 const U=L.sot;assert(U&&U.sections.length>=2,'Gallerie sul pianeta '+i);
 for(const sec of U.sections){
  assert(sec.shafts.length>=3,'Almeno 3 pozzi per galleria');
  for(let k=0;k<sec.shafts.length;k++){
   const x=sec.shafts[k],pr=L.props.find(p=>p.x===x&&(p.kind==='pozzo'||p.kind==='botola'));
   assert(pr,'Pozzo in superficie');assert.equal(pr.kind,k===sec.shafts.length-1?'botola':'pozzo');
   assert.equal(groundAt(L.solids,x),pr.y,'Il pozzo sta sul terreno');
   assert.equal(groundAt(U.solids,x),SOT.padY,'Sotto ogni pozzo c\'è una piazzola');
   assert(U.lifts.some(l=>l.x===x),'Raggio di risalita sotto ogni pozzo');
  }
  // la galleria è percorribile: buchi non più larghi di un salto, tranne i burroni da jetpack segnati
  const segs=U.solids.filter(s=>!s.wall&&s.x+s.w>sec.x0-260&&s.x<sec.x1+200).sort((a,b)=>a.x-b.x);
  for(let k=1;k<segs.length;k++){
   const gap=segs[k].x-(segs[k-1].x+segs[k-1].w);
   if(gap>150)assert(U.zones.some(z=>z.kind==='abisso'&&Math.abs(z.x-(segs[k-1].x+segs[k-1].w))<2),'Buco troppo largo senza cartello: '+gap);
   const rise=segs[k-1].y-segs[k].y;if(!segs[k].jet&&!segs[k-1].jet)assert(rise<=84,'Gradino troppo alto: '+rise);
  }
  assert(U.solids.some(s=>s.wall&&s.x>sec.x1),'Parete di fondo');
 }
 assert(U.hostages.length>=U.sections.length,'Coloni prigionieri nelle gallerie');
 assert(U.solids.every(s=>s.y>=SOT.ceil),'Niente sopra la volta');
}
console.log('PASS: livello più lungo, ponte di colonne, gallerie');

// 2) Partita: arriva al primo pozzo, scende tenendo premuto giù, la galleria ha i suoi ribelli
run('vite=3;viteSave();selected=0;startPlatform()');
step(4.8);
assert.equal(val('pf.phase'),'missione');
const sup=val('pf.sup.hostages.length');
run('globalThis.SEC=pf.sot.sections[0];const x=SEC.shafts[0];pf.cam.x=x-pfViewW()*.38;Object.assign(pf.pilot,{x,y:pfGroundAt(x),vx:0,vy:0,ground:true,onPlat:false,inv:999});pf.enemies=[];keys={KeyS:true}');
step(.2);assert(!val('pf.under'),'Non scende subito');
step(.3);keys0();
function keys0(){run('keys={}')}
step(1.6);
assert(val('pf.under'),'Il pilota è nella galleria');
assert(val('pf.solids===pf.sot.solids&&pf.hostages===pf.sot.hostages'),'Livello sotterraneo attivo');
assert(val('pf.pilot.ground&&Math.abs(pf.pilot.y-SOT.padY)<1'),'Atterrato sulla piazzola');
run('drawPlatform()');
// la volta ferma salti e colpi
run('pf.pilot.inv=999;Object.assign(pf.pilot,{x:SEC.shafts[0]+120,y:400,vy:-900,ground:false})');step(1/60);
assert(val('pf.pilot.y-pf.pilot.h>=SOT.ceil'),'La testa non passa la volta');
assert.deepEqual(val('JSON.stringify(pfShotObstacle({px:SEC.shafts[0]+150,py:300,x:SEC.shafts[0]+150,y:100}))'),JSON.stringify({x:val('SEC.shafts[0]+150'),y:val('SOT.ceil')}),'Il colpo si ferma sulla volta');
step(1);
// colono prigioniero nella galleria: il conteggio resta quello della superficie
run('const h=pf.hostages[0];Object.assign(pf.pilot,{x:h.x,y:h.y,vx:0,vy:0,ground:true})');step(.1);
assert(val('pf.rescued')>=1,'Colono liberato nella galleria');
assert.equal(val('$("pfRescued").textContent'),val('Math.min(pf.rescued,pf.sup.hostages.length)')+'/'+sup);
// deposito di rifornimenti
const nc=val('pf.sot.caches.length');
if(nc){run('const c=pf.sot.caches[0];Object.assign(pf.pilot,{x:c.x,y:c.y,ground:true,vx:0,vy:0})');step(1/60);assert(val('pf.sot.caches[0].open&&pf.pickups.length>=2'),'Il deposito lascia i rifornimenti')}
// risalita: si salta nel raggio del pozzo di mezzo
run('const x=SEC.shafts[1];pf.cam.x=x-pfViewW()*.38;pf.enemies=[];Object.assign(pf.pilot,{x,y:SOT.padY,vx:0,vy:0,ground:true,onPlat:false,inv:999});keys={Space:true}');
step(1.6);keys0();step(.2);
assert(!val('pf.under'),'Tornato in superficie');
assert(val('pf.solids===pf.sup.solids'),'Livello di superficie attivo');
step(1.5);
assert(val('Math.abs(pf.pilot.x-SEC.shafts[1])<80&&pf.pilot.ground'),'Esce dal pozzo e atterra');
// si può riscendere dal pozzo di mezzo
run('pf.pilot.y=pfGroundAt(pf.pilot.x=SEC.shafts[1]);keys={KeyS:true}');step(.5);keys0();step(.9);
assert(val('pf.under'),'Riscende nella galleria');
// morte nella galleria: il pilota di riserva arriva in superficie
run('pf.pilot.inv=0;pf.pilot.barrier=false;pfDamage(500,1)');
assert(!val('pf.under'),'Il pilota di riserva torna in superficie');
step(4);
assert(val('pf.pilot.visible&&pfGroundAt(pf.pilot.x)!==null'),'Pilota di riserva a terra');
console.log('PASS: discesa, galleria, risalita, riscesa, pilota di riserva');

// 3) Fine missione: il conteggio finale usa i coloni di superficie
run('pf.under=true;pf.hostages=pf.sot.hostages;pf.rescued=99;pfFinish(true)');
assert.equal(val('pf.hostages.length'),sup);assert(val('pf.rescued')<=sup);
console.log('PASS: conteggio coloni a fine missione');
console.log('sotterranei.test: ok');
