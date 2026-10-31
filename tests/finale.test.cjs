// Test (2026-10-31, seconda parte): fine fase, jetpack, colpi bloccati, boss per pianeta, vite, LifeUP e pianeta finale.
// Eseguire dalla cartella principale: node tests/finale.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const label=id=>nodes.get(id).querySelector('span');
nodes.get('landBtn').querySelector=()=>{const n=nodes.get('landBtn');return n._span||(n._span={textContent:''})};
nodes.get('returnBtn').querySelector=()=>{const n=nodes.get('returnBtn');return n._span||(n._span={textContent:''})};

// Fine fase 1 vinta: solo "Abbandona" e "Libera la colonia"
run('selected=0;startGame();state="orbit";finish(true)');
assert.equal(nodes.get('landBtn')._span.textContent,'LIBERA LA COLONIA · FASE 2');assert.equal(nodes.get('returnBtn')._span.textContent,'ABBANDONA');
console.log('PASS: fine fase con due scelte');

// Vite: 3 all'inizio, la nave distrutta ne toglie una
run('abort();vite=3;viteSave();selected=0;startGame();arrivalRemaining=0;explodePlayer();for(let i=0;i<300;i++)update(1/60)');
assert.equal(val('state'),'lost');assert.equal(val('vite'),2,'Nave distrutta: una vita in meno');
assert(nodes.get('resultText').textContent.includes('ne restano 2'));
// LifeUP nello spazio
run('abort();selected=0;startGame();arrivalRemaining=0;pickups=[{x:player.x,y:player.y,kind:"vita",life:30,r:13}];updateSupplies(.016)');
assert.equal(val('vite'),3,'La pillola LifeUP regala una vita');assert.equal(val('pickups.length'),0);
run('drawSupplies()');
run('const r=Math.random;Math.random=()=>0;dropSupply({x:0,y:0});Math.random=r');assert(val('pickups.some(p=>p.kind==="vita")'),'Un nemico può lasciare la pillola');
assert(val('LIFEUP_CHANCE.nemico')<=.01,'La pillola è rarissima');
console.log('PASS: vite e LifeUP nello spazio');

// Fase 2: vite condivise, LifeUP a terra
run('abort();vite=2;viteSave();selected=0;startPlatform()');step(3.5);assert.equal(val('pf.lives'),2,'A terra le vite sono le stesse');
run('pf.pickups=[{x:pf.pilot.x,y:pf.pilot.y-20,vy:0,kind:"vita",life:20,ground:true}];pf.pilot.visible=true;pfUpdatePickups(.016)');assert.equal(val('vite'),3);assert.equal(val('pf.lives'),3);
run('pfDrawPickup({x:0,y:0,kind:"vita"},1)');
run('pfLoseLife()');assert.equal(val('vite'),2,'Una vita persa a terra conta per tutto il gioco');
console.log('PASS: vite e LifeUP a terra');

// Jetpack: doppio salto, volo tenendo premuto, surriscaldamento e costo
run('pf.phase="missione";Object.assign(pf.pilot,{hp:100,visible:true,ground:false,vy:200,y:300,jetHeat:0,jetLock:false,coyote:0,jumpBuf:0});keys={KeyW:true};pf.jumpHeld=false');
const fuel0=val('eco.run.spent.fuel||0');step(.5);
assert(val('pf.pilot.jetOn'),'Secondo salto in aria: jetpack acceso');assert(val('pf.pilot.vy')<0,'Il jetpack spinge in alto');
step(3);assert(val('pf.pilot.jetLock'),'Al 100% si surriscalda');assert(!val('pf.pilot.jetOn'));
assert(val('eco.run.spent.fuel||0')>fuel0,'Il jetpack consuma crediti');
run('keys={};Object.assign(pf.pilot,{ground:true,y:600});pfUpdateJetpack(pf.pilot,3,false)');assert(!val('pf.pilot.jetLock'),'Si ricarica');
run('pfDrawJetpack(pf.pilot,1)');
console.log('PASS: jetpack');

// Colpi fermati da terreno, piattaforme e casse
run('pf.props.push({x:5000,y:600,kind:"cassa"})');
assert(val('pfShotObstacle({px:4900,py:590,x:5100,y:590})'),'La cassa ferma il colpo');
assert.equal(val('pfShotObstacle({px:4900,py:300,x:5100,y:300})'),null,'Sopra la cassa il colpo passa');
run('pf.plats.push({x:7000,y:400,w:100})');assert(val('pfShotObstacle({px:7050,py:380,x:7050,y:420})'),'La piattaforma ferma il colpo');
assert(val('pfShotObstacle({px:-100,py:590,x:-100,y:610})'),'Il terreno ferma il colpo');
assert(val('buildPlatformLevel(planets[0]).plats.every(p=>!p.arena)'),'Niente doppia pedana nell arena');
console.log('PASS: colpi bloccati dagli ostacoli');

// Boss diverso per pianeta, disegnato senza errori
const names=new Set();
for(let i=0;i<5;i++){names.add(val(`pfBossInfo(planets[${i}]).name`));run(`abort();vite=3;selected=${i};startPlatform()`);step(3.5);run('pf.phase="missione";pfEnterArena();pf.boss.y=600;pf.boss.state="raffica";gBoss(pf.boss,1);pf.boss.state="missili";gBoss(pf.boss,2)');assert.equal(val('pf.boss.kind'),val(`pfBossInfo(planets[${i}]).id`))}
assert.equal(names.size,5,'Cinque boss diversi');
console.log('PASS: un boss per pianeta');

// Pianeta finale: si sblocca liberando tutti i pianeti
run('abort();localStorage.setItem("frontieraPianetiLiberati","");finalLock()');assert(!val('planets.includes(FINAL_PLANET)'),'Pianeta finale bloccato');
for(let i=0;i<5;i++){run(`abort();vite=3;selected=${i};startPlatform()`);step(3.5);run('pf.phase="vittoria";pfFinish(true)')}
assert(val('planets.includes(FINAL_PLANET)'),'Pianeta finale sbloccato');assert(nodes.get('resultText').textContent.includes('OMEGA'));
const fi=val('planets.indexOf(FINAL_PLANET)');assert.equal(val('pfBossInfo(FINAL_PLANET).name'),'IMPERATORE OMEGA');
run(`abort();selected=${fi};startPlatform()`);step(3.5);run('pf.phase="missione";pfEnterArena();pf.boss.y=600;gBoss(pf.boss,1)');
assert(val('pf.boss.max')>=val('pfBossInfo(planets[4]).hp')*(130+5*35)*1.2,'Boss finale molto più resistente');
run(`abort();selected=${fi};startGame();drawWorld(world)`);
console.log('PASS: pianeta finale e IMPERATORE OMEGA');

// Game over: senza vite si riparte da capo
run('abort();vite=1;viteSave();eco.balance=9999;selected=0;startPlatform()');step(3.5);run('pf.lives=1;pfLoseLife()');step(2.5);
assert.equal(val('state'),'lost');assert.equal(nodes.get('resultEyebrow').textContent,'GAME OVER');
assert.equal(val('vite'),3);assert.equal(val('eco.balance'),val('ECO_START'));assert(!val('planets.includes(FINAL_PLANET)'),'Progressi azzerati');
console.log('PASS: game over');

// Niente scelta della fase dalla mappa: si parte sempre dallo spazio
run('abort();phaseOneComplete=true;pfRefreshMapButton()');
let shown=null;nodes.get('phase2Btn').classList.toggle=(n,hide)=>{shown=!hide};run('pfRefreshMapButton()');assert.equal(shown,false,'Il pulsante FASE 2 della mappa resta nascosto');
// Colonna sonora: intensità che segue il gioco
run('abort()');assert.equal(val('musLevel()'),'calm','Mappa: musica calma');
run('selected=0;startGame();arrivalRemaining=0');assert.equal(val('musLevel()'),'battle','In volo: battaglia');
run('player.x=world.x-world.r-300;player.y=world.y');assert.equal(val('musLevel()'),'boss','Ingresso in atmosfera: massima intensità');
run('abort();vite=3;selected=0;startPlatform()');step(3.5);assert.equal(val('musLevel()'),'battle');
run('pf.phase="missione";pfEnterArena()');assert.equal(val('musLevel()'),'boss','Boss: massima intensità');
run('setMusic(false)');assert.equal(store.frontieraMusica,'off');run('setMusic(true)');assert.equal(store.frontieraMusica,'on');
run('musTick()');
console.log('PASS: mappa senza scelta della fase e colonna sonora');
run('abort()');
