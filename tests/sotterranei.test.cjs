// Test fase a terra e sottosuolo lungo tutto il livello (2026-11-11): crateri per scendere, uscite per risalire,
// passaggi col jetpack, creature a tema boss, pilota di riserva, conteggio coloni.
// Eseguire dalla cartella principale: node tests/sotterranei.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','battaglia.js','sotterranei.js','godmode.js','boss-immagini.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const SOT=val('({ceil:SOT.ceil,padY:SOT.padY,extra:SOT.extra})');
const groundAt=(arr,x)=>{for(const s of arr)if(x>=s.x&&x<s.x+s.w)return s.y;return null};


// 1) Livello: sottosuolo lungo tutto il percorso, crateri e uscite alternati, ostacoli da jetpack
const KIND={0:'mare',1:'deserto',2:'tempesta',3:'foresta',4:'lava'};
for(let i=0;i<5;i++){
 run(`globalThis.L=buildPlatformLevel(planets[${i}])`);
 const L=val('L'),d=val(`planets[${i}].difficulty`),U=L.sot;
 assert(L.arenaX>=6000+d*800+SOT.extra(d),'Percorso più lungo sul pianeta '+i+': '+L.arenaX);
 assert(L.pillarZones.length>=1,'Ponte di colonne sul pianeta '+i);
 assert(U&&U.sections.length===1,'Una galleria unica sul pianeta '+i);
 const sec=U.sections[0];
 assert(sec.x0<2400,'La galleria comincia presto: '+sec.x0);
 assert(sec.x1>L.arenaX-1400&&sec.x1<L.arenaX,'La galleria arriva fin quasi al robot: '+sec.x1+' / '+L.arenaX);
 assert(!L.props.some(p=>p.kind==='pozzo'),'Niente pozzi con la barra da caricare');
 // passaggi: solo crateri (si scende e si risale dallo stesso buco), l'ultimo è obbligatorio
 const links=U.links;
 assert(U.craters.length>=4,'Almeno 4 crateri sul pianeta '+i+': '+U.craters.length);
 assert(links.every(l=>l.kind==='cratere'),'Solo crateri');assert(links[links.length-1].last,'Ultimo cratere obbligatorio');
 assert(!L.props.some(p=>p.kind==='botola'||p.kind==='pozzo'),'Niente botole né pozzi');
 assert.equal(U.lifts.length,0,'Niente raggi di risalita');
 for(let k=1;k<links.length;k++){assert(links[k].x>links[k-1].x,'Passaggi in ordine');}
 for(const c of U.craters){
  for(let x=c.x+2;x<c.x+c.w-2;x+=8)assert.equal(groundAt(L.solids,x),null,'Buco del cratere');
  assert(groundAt(L.solids,c.x-20)!==null&&groundAt(L.solids,c.x+c.w+20)!==null,'Bordi del cratere');
  assert(L.props.some(p=>p.kind==='cratere'&&p.x===c.x),'Cratere disegnato');
  for(let x=c.x;x<=c.x+c.w;x+=10)assert.equal(groundAt(U.solids,x),SOT.padY,'Piazzola sotto il cratere');
  assert(U.holes.some(h=>h.kind==='cratere'&&h.x0===c.x&&h.c===c),'Buco nella volta');
  assert(!L.hostages.some(h=>h.x>c.x-20&&h.x<c.x+c.w+20),'Nessun colono nel cratere');
 }
 // la galleria è percorribile: buchi più larghi di un salto solo nei burroni da jetpack segnati
 const segs=U.solids.filter(s=>!s.wall).sort((a,b)=>a.x-b.x);
 for(let k=1;k<segs.length;k++){
  const gap=segs[k].x-(segs[k-1].x+segs[k-1].w);
  if(gap>150)assert(U.zones.some(z=>z.kind==='abisso'&&Math.abs(z.x-(segs[k-1].x+segs[k-1].w))<2),'Buco troppo largo senza cartello: '+gap);
  const rise=segs[k-1].y-segs[k].y;if(!segs[k].jet)assert(rise<=84,'Gradino troppo alto: '+rise);
  if(segs[k].jet&&!segs[k-1].jet)assert(rise>=100,'Le pareti da jetpack sono più alte del salto');
 }
 // tanti percorsi che richiedono il jetpack: almeno uno ogni 2500 px di galleria
 assert(U.zones.length>=Math.floor((sec.x1-sec.x0)/2500),'Passaggi col jetpack: '+U.zones.length);
 assert(U.zones.some(z=>z.kind==='abisso')&&U.zones.some(z=>z.kind==='parete'),'Burroni e pareti nella galleria');
 assert(U.solids.some(s=>s.wall&&s.x>=sec.x1),'Roccia di fondo prima dell\'arena');
 assert(U.solids.every(s=>s.y>=SOT.ceil),'Niente sopra la volta');
 assert.equal(U.hostages.length,L.hostages.length,'Coloni nella galleria quanti in superficie');
 // creature: stessa frequenza dei ribelli in superficie
 assert(U.triggers.every(t=>t.type==='bestia'),'Solo creature sotto terra');
 // guardiani: almeno uno per galleria, su un tratto piano lontano da crateri e coloni
 assert(U.guards&&U.guards.length>=1&&U.guards.length<=3,'Guardiani nella galleria: '+(U.guards&&U.guards.length));
 for(const g of U.guards){
  assert(g.alive&&groundAt(U.solids,g.x-150)===g.y&&groundAt(U.solids,g.x+150)===g.y,'Barriera su un tratto piano');
  assert(!U.holes.some(h=>g.x>h.x0-280&&g.x<h.x1+280),'Barriera lontana dai crateri');
  assert(!U.hostages.some(h=>Math.abs(h.x-g.x)<170),'Barriera lontana dai coloni');
 }
 const dens=U.triggers.length/(sec.x1-sec.x0),densS=L.triggers.filter(t=>t.x>1250).length/(L.arenaX-1500);
 assert(dens>densS*.7&&dens<densS*1.4,'Densità di nemici simile: '+dens.toFixed(4)+' / '+densS.toFixed(4));
}
console.log('PASS: sottosuolo lungo tutto il livello, crateri nei due sensi, passaggi col jetpack');

// 2) Partita: si cade nel cratere (niente tasti da tenere premuti) e si arriva nella galleria
run('vite=3;viteSave();selected=4;startPlatform()');
step(4.8);
assert.equal(val('pf.phase'),'missione');
const sup=val('pf.sup.hostages.length');
run('globalThis.C=pf.sot.craters[1];pf.cam.x=C.x-pfViewW()*.4;Object.assign(pf.pilot,{x:C.x-60,y:C.ya,vx:0,vy:0,ground:true,onPlat:false,inv:999});pf.enemies=[];keys={KeyD:true}');
step(.6);keys0();
function keys0(){run('keys={}')}
step(1.6);
assert(val('pf.under'),'Caduto nel cratere: il pilota è nella galleria');
assert.equal(val('pf.lives'),3,'Cadere nel cratere non costa una vita');
assert(val('pf.solids===pf.sot.solids&&pf.hostages===pf.sot.hostages'),'Livello sotterraneo attivo');
assert(val('pf.pilot.ground&&Math.abs(pf.pilot.y-SOT.padY)<1'),'Atterrato sotto il cratere');
assert(val('pf.pilot.x>C.x-30&&pf.pilot.x<C.x+C.w+30'),'Atterrato sotto il punto dove è caduto');
run('drawPlatform()');
// la volta ferma salti e colpi
run('pf.pilot.inv=999;Object.assign(pf.pilot,{x:C.x+C.w+150,y:400,vy:-900,ground:false})');step(1/60);
assert(val('pf.pilot.y-pf.pilot.h>=SOT.ceil'),'La testa non passa la volta');
assert.deepEqual(val('JSON.stringify(pfShotObstacle({px:C.x+C.w+150,py:300,x:C.x+C.w+150,y:100}))'),JSON.stringify({x:val('C.x+C.w+150'),y:val('SOT.ceil')}),'Il colpo si ferma sulla volta');
step(1);
// creature a tema boss: sui pianeti di lava piccoli draghi che volano e sparano
run('pf.enemies=[];pf.nextTrigger=0;pf.spawnTimer=0');
run('for(let i=0;i<3;i++)pfSpawnEnemy("soldato",pf.pilot.x+300+i*120)');
assert(val('pf.enemies.length>=3&&pf.enemies.every(e=>e.bestia==="lava")'),'Sotto terra nascono solo piccoli draghi');
assert(!val('pf.enemies.some(e=>e.type==="drone"||e.type==="soldato")'),'Niente droni né soldati sotto terra');
run('pf.pilot.inv=0;pf.pilot.hp=100;globalThis.HP0=pf.pilot.hp');
for(let t=0;t<40;t++){step(.1);run('pf.pilot.hp=Math.max(pf.pilot.hp,30)')}
assert(val('pf.shots.some(b=>!b.friendly)||pf.pilot.hp<100'),'Le creature attaccano');
assert(val('pf.enemies.every(e=>e.y-e.h>=SOT.ceil)'),'I draghi restano sotto la volta');
// si abbattono come i nemici di superficie
const k0=val('pf.kills');run('for(const e of pf.enemies)pfHitEnemy(e,99)');step(.1);
assert(val('pf.kills')>=k0+3,'Creature abbattute');
// creature che camminano (scorpioni su VESPER): saltano le fosse e scattano
run('pf.p=planets[1];pf.enemies=[];globalThis.SC=sotSpawnBestia(pf.pilot.x+250)');
assert(val('SC&&SC.bestia==="deserto"&&!SOT_BESTIE.deserto.vola&&SC.hp===3'),'Scorpioni con la vita dei soldati');
run('pf.p=planets[4];pf.enemies=[];pf.pilot.inv=999');
// guardiano: creatura più grande e resistente che alza una barriera; la barriera blocca a piedi e col jetpack
run('globalThis.G=pf.sot.guards[0];pf.enemies=[];pf.shots=[];pf.cam.x=G.x-800;Object.assign(pf.pilot,{x:G.x-520,y:G.y,vx:0,vy:0,ground:true,onPlat:false,inv:999,hp:100})');
step(.2);
assert(val('!!G.e&&pf.enemies.includes(G.e)&&G.e.guardiano===G'),'Il guardiano compare vicino alla barriera');
assert(val('G.e.x<G.x&&G.e.hp>=5*3&&G.e.w>SOT_BESTIE.lava.w*1.5'),'Guardiano più grande e resistente: hp '+val('G.e.hp'));
run('keys={KeyD:true}');for(let t=0;t<30;t++){step(.1);run('pf.pilot.hp=100;pf.pilot.inv=999')}keys0();
assert(val('pf.pilot.x<G.x'),'La barriera ferma il pilota a piedi: '+val('pf.pilot.x')+' / '+val('G.x'));
assert(val('G.e&&G.e.x<G.x'),'Il guardiano resta dalla sua parte');
run('Object.assign(pf.pilot,{x:G.x-40,y:G.y-150,vx:300,vy:0,ground:false,jetOn:true})');for(let t=0;t<10;t++){run('pf.pilot.vx=300;keys={KeyD:true,Space:true}');step(.05)}keys0();
assert(val('pf.pilot.x<G.x'),'La barriera ferma anche il jetpack');
// tornando dopo un cambio di livello il guardiano ricorda la vita persa
run('pfHitEnemy(G.e,4);globalThis.GH=G.e.hp;pf.enemies=[]');step(.1);
assert(val('G.e&&G.e.hp===GH'),'Il guardiano ricompare con la vita che gli restava');
const kg=val('pf.kills');run('pfHitEnemy(G.e,999)');step(.2);
assert(val('!G.alive')&&val('pf.kills')===kg+1,'Guardiano distrutto: barriera spenta');
assert(val('pf.pickups.length>=2'),'Il guardiano lascia rifornimenti');
run('drawPlatform()');
run('keys={KeyD:true}');for(let t=0;t<20;t++){step(.1);run('pf.pilot.hp=100;pf.pilot.inv=999')}keys0();
assert(val('pf.pilot.x>G.x+40'),'Dopo il guardiano si passa: '+val('pf.pilot.x')+' / '+val('G.x'));
run('pf.enemies=[]');
// colono prigioniero nella galleria: il conteggio resta quello della superficie
run('const h=pf.hostages.find(h=>h.state==="legato"&&h.x>pf.pilot.x);pf.cam.x=h.x-pfViewW()*.4;Object.assign(pf.pilot,{x:h.x,y:h.y,vx:0,vy:0,ground:true})');step(.1);
assert(val('pf.rescued')>=1,'Colono liberato nella galleria');
assert.equal(val('$("pfRescued").textContent'),val('Math.min(pf.rescued,pf.sup.hostages.length)')+'/'+sup);
// deposito di rifornimenti
if(val('pf.sot.caches.length')){run('const c=pf.sot.caches[0];pf.cam.x=c.x-pfViewW()*.4;Object.assign(pf.pilot,{x:c.x,y:c.y,ground:true,vx:0,vy:0})');step(1/60);assert(val('pf.sot.caches[0].open&&pf.pickups.length>=2'),'Il deposito lascia i rifornimenti')}
// risalita: si salta nella scia luminosa sotto un cratere e si esce dallo stesso cratere
run('globalThis.C1=pf.sot.craters.find(c=>c.x>C.x);const m=C1.x+C1.w/2;pf.cam.x=m-pfViewW()*.38;pf.enemies=[];Object.assign(pf.pilot,{x:m,y:SOT.padY,vx:0,vy:0,ground:true,onPlat:false,inv:999});keys={Space:true}');
step(1.0);keys0();
assert(!val('pf.under'),'Tornato in superficie dal cratere');
assert(val('pf.solids===pf.sup.solids'),'Livello di superficie attivo');
step(1.5);
assert(val('pf.pilot.ground&&pf.pilot.x>C1.x+C1.w&&pf.pilot.x<C1.x+C1.w+260'),'Esce dal cratere e atterra sul bordo destro: '+val('pf.pilot.x')+' '+val('C1.x+C1.w'));
assert.equal(val('pf.lives'),3,'Nessuna vita persa');
// si può riscendere dal cratere successivo
run('globalThis.C2=pf.sot.craters.find(c=>c.x>C1.x);pf.cam.x=C2.x-pfViewW()*.4;Object.assign(pf.pilot,{x:C2.x+C2.w/2,y:C2.y-30,vx:0,vy:0,ground:false})');step(1.4);
assert(val('pf.under'),'Riscende dal cratere successivo');
// morte nella galleria: il pilota di riserva arriva in superficie, su terreno solido
run('pf.pilot.inv=0;pf.pilot.barrier=false;pf.pilot.rientroT=0;pfDamage(500,1)');
assert(!val('pf.under'),'Il pilota di riserva torna in superficie');
step(4);
assert(val('pf.pilot.visible&&pfGroundAt(pf.pilot.x)!==null'),'Pilota di riserva a terra');
// in superficie i burroni da jetpack restano mortali (non sono crateri)
const jz=val('pf.jetZones[0]');
if(jz){run(`Object.assign(pf.pilot,{x:${(jz.edgeX+jz.landX)/2},y:650,vy:300,ground:false,inv:0,hp:100});pf.cam.x=pf.pilot.x-300`);const lv=val('pf.lives');step(1.2);assert(!val('pf.under'),'Il burrone non porta nelle gallerie')}
console.log('PASS: caduta nel cratere, creature, guardiano con barriera, risalita dallo stesso cratere, riscesa, pilota di riserva');

// 3) Fine missione: il conteggio finale usa i coloni di superficie
run('pf.under=true;pf.hostages=pf.sot.hostages;pf.rescued=99;pfFinish(true)');
assert.equal(val('pf.hostages.length'),sup);assert(val('pf.rescued')<=sup);
console.log('PASS: conteggio coloni a fine missione');
console.log('sotterranei.test: ok');
