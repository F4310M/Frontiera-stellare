// Test delle NOVITÀ (2026-10-31): pianeta in direzione casuale, flotta in attesa, pioggia di meteoriti,
// pianeta dettagliato, doppio laser, prezzi e coloni che corrono alla nave. Eseguire: node tests/arrivo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['game.js','pianeta.js','fase2.js','grafica2.js','economia.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

// Direzione del pianeta casuale: in più partenze non è sempre a destra
const angles=[];for(let i=0;i<12;i++){run('selected=0;startGame()');angles.push(val('Math.atan2(world.y,world.x)'))}
assert(angles.some(a=>Math.abs(a)>1),'Il pianeta non è sempre a destra');
run('selected=2;startGame()');
assert(Math.abs(val('Math.hypot(world.x,world.y)')-val('planets[2].distance/18'))<1,'La distanza resta quella del pianeta');
assert(Math.abs(val('player.angle')-val('approachAngle'))<1e-9,'La nave parte puntata verso il pianeta');
console.log('PASS: direzione casuale del pianeta');

// Flotta in attesa intorno al pianeta
const guards=val('enemies.filter(e=>e.guard).length');assert.equal(guards,8+3*3,'Flotta proporzionata alla difficoltà');
assert(val('enemies.filter(e=>e.guard).every(e=>!e.alerted&&Math.hypot(e.x-world.x,e.y-world.y)>world.r+1100)'),'Guardie ferme fuori dalla cintura');
run('player.x=world.x-world.r-6000;player.y=world.y;const g=enemies.find(e=>e.guard);var gx=g.x,gy=g.y;updateEnemies(1)');
assert(val('Math.hypot(enemies.find(e=>e.guard).x-gx,enemies.find(e=>e.guard).y-gy)')>5,'Le guardie pattugliano in orbita');
run('const a=enemies.filter(e=>e.guard);a[0].alerted=true;for(const e of a){e.x=a[0].x+100;e.y=a[0].y}updateEnemies(.1)');
assert(val('enemies.filter(e=>e.guard).every(e=>e.alerted)'),'Una guardia allertata avvisa la squadriglia vicina');
console.log('PASS: flotta nemica in attesa');

// Pioggia di meteoriti vicino all'atmosfera
run('selected=0;startGame();arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];player.x=world.x-30000;player.y=world.y;shower=[];updateMeteorShower(5)');
assert.equal(val('shower.length'),0,'Lontano dal pianeta niente pioggia');
run('player.x=world.x-world.r-500;player.y=world.y;for(let i=0;i<300;i++)updateMeteorShower(1/30)');
assert(val('shower.length')>=2,'Vicino al pianeta arrivano molti meteoriti');
assert(val('nextMeteorDelay()')<=9,'Il meteorite grande arriva più spesso vicino al pianeta');
run('player.x=world.x-40000;player.y=world.y');assert(val('nextMeteorDelay()')>=12,'Lontano resta raro');
run('player.x=0;player.y=0;player.health=100;player.inv=0;player.barrier=false;shower=[{x:-100,y:0,angle:0,vx:600,vy:0,r:12,life:3,warning:0,hp:1,maxHp:1,hitPlayer:false,rot:0}];world.x=99999;world.y=0;updateMeteorShower(.3)');
assert(val('player.health')<100,'Un meteorite piccolo danneggia lo scafo');assert.equal(val('shower.length'),0);
run('shower=[{x:500,y:500,angle:0,vx:0,vy:0,r:12,life:3,warning:0,hp:1,maxHp:1,hitPlayer:false,rot:0}];bullets=[{px:480,py:500,x:520,y:500,r:3,life:1,friendly:true,dmg:1}];updateMeteorShower(.01)');
assert.equal(val('shower.length'),0,'I meteoriti piccoli si abbattono col laser');
run('shower=[{x:0,y:300,angle:0,vx:0,vy:0,r:12,life:3,warning:0,hp:1,maxHp:1,hitPlayer:false,rot:0,fill:"#555",edge:"#fff"}];drawMeteorShower()');
console.log('PASS: pioggia di meteoriti');

// Pianeta: senza canvas fuori schermo resta il disegno originale; con il generatore i continenti cambiano
run('drawWorld(world)');
const g1=val('(()=>{const N=plNoise(1);return N.fbm(.3,.2,.1,5)})()'),g2=val('(()=>{const N=plNoise(2);return N.fbm(.3,.2,.1,5)})()');
assert.notEqual(g1,g2,'Semi diversi danno continenti diversi');
assert(Object.keys(val('PL_THEMES')).length===5,'Una tavolozza per ogni pianeta');
console.log('PASS: pianeta di destinazione');

// Doppio laser, prezzi e guadagni
run('eco.balance=20000;eco.upgrades={};selected=0;startGame();arrivalRemaining=0;bullets=[];player.fire=0;shoot()');
assert.equal(val('bullets.length'),1);
assert.equal(val('ecoBuy("twin")'),true,'Il doppio laser si compra al mercato');assert.equal(val('eco.balance'),10999,'9.000 CR (più 1 CR del primo colpo)');
run('bullets=[];player.fire=0;shoot()');assert.equal(val('bullets.length'),2,'Due raggi a ogni colpo');
assert(val('Math.hypot(bullets[0].x-bullets[1].x,bullets[0].y-bullets[1].y)')>10,'Raggi paralleli separati');
assert.equal(val('eco.run.count.laser'),3,'Ogni raggio costa un colpo');
run('abort();selected=0;startPlatform()');step(3.5);run('pf.phase="missione";pf.shots=[];pf.pilot.fire=0;pfShoot()');assert.equal(val('pf.shots.length'),2,'Doppio laser anche a terra');
run('abort();eco.upgrades={}');
assert(val('ECO_ITEMS.every(i=>i.prices[0]>=1400)'),'Potenziamenti più cari');
assert.equal(val('ECO_BOUNTY[1]'),4);assert.equal(val('ecoPlanetReward(planets[4])'),6000);
console.log('PASS: doppio laser, prezzi e guadagni');

// Coloni liberati corrono indietro verso la nave
run('selected=0;startPlatform()');step(3.5);
run('const h=pf.hostages[0];pf.pilot.x=h.x;pf.pilot.y=h.y;pf.pilot.visible=true;pf.pilot.hp=100;pfUpdateHostages(.01)');
assert.equal(val('pf.hostages[0].state'),'libero');
const hx=val('pf.hostages[0].x');run('pfUpdateHostages(1);pfUpdateHostages(.5)');
assert.equal(val('pf.hostages[0].state'),'fuga','Dopo il grazie il colono scappa');
run('pf.cam.x=-5000;for(let i=0;i<30;i++)pfUpdateHostages(.1)');
assert(val('pf.hostages[0].x')<hx-500,'Corre verso sinistra, verso la nave');
run('pfDrawColonist(pf.hostages[0],1);gColonist(pf.hostages[0],1)');
run('for(let i=0;i<400;i++)pfUpdateHostages(.1)');
assert(['evacuato','salvo'].includes(val('pf.hostages[0].state')),'Arrivato alla nave sale a bordo');
console.log('PASS: coloni che corrono alla nave');
run('abort()');
