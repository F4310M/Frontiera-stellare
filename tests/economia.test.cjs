// Test di ECONOMIA e MERCATO. Eseguire dalla cartella principale: node tests/economia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','fase2.js','grafica2.js','economia.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

assert.equal(val('eco.balance'),2500,'Saldo iniziale 2.500 CR');
assert.equal(val('ecoFmt(12000)'),'12.000');assert.equal(val('ecoFmt(-1500)'),'−1.500');

// Fase 1: colpi, missili e carburante si pagano in tempo reale.
run('selected=0;startGame()');
run('player.fire=0;shoot()');assert.equal(val('eco.balance'),2499,'Colpo laser: −1 CR');
run('launchMissile()');assert.equal(val('eco.balance'),2474,'Missile: −25 CR');
run('missile=null;keys={KeyD:true};for(let i=0;i<60;i++)update(1/60);keys={}');
assert(val('eco.run.count.fuel')>.9,'Il carburante viene contato');assert(val('eco.run.spent.fuel')>=1,'Il carburante costa crediti');
const before=val('eco.balance');run('kills=4');run('finish(false)');
const r1=JSON.parse(val('JSON.stringify(eco.last)'));
assert.equal(r1.rows[0].qty,1);assert.equal(r1.rows[1].qty,1);assert.equal(r1.rows[3].amount,16,'Taglia: 4 nemici × 4 CR');
assert.equal(val('eco.balance'),before+16,'La taglia viene accreditata a fine fase');
console.log('PASS: spese in tempo reale e riepilogo della fase 1');

// Missili senza crediti sufficienti non partono; laser e carburante possono andare in debito.
run('abort();eco.balance=10;startGame();missile=null;launchMissile()');assert.equal(val('missile'),null,'Senza crediti niente missile');
run('player.fire=0;for(let i=0;i<20;i++){player.fire=0;shoot()}');assert(val('eco.balance')<0,'Il laser può andare in debito');
run('abort()');
console.log('PASS: crediti insufficienti e debito');

// Mercato: acquisti, livelli, saldo, persistenza.
run('eco.balance=20000;eco.upgrades={}');
assert.equal(val('ecoBuy("salvo")'),true);assert.equal(val('ecoUpgrade("salvo")'),1);assert.equal(val('eco.balance'),13500);
assert.equal(val('ecoBuy("salvo")'),true);assert.equal(val('ecoUpgrade("salvo")'),2);assert.equal(val('ecoBuy("salvo")'),false,'Livello massimo');
run('eco.balance=100');assert.equal(val('ecoBuy("laser")'),false,'Crediti insufficienti');assert.equal(val('ecoUpgrade("laser")'),0);
assert(JSON.parse(store.frontieraPotenziamenti).salvo===2,'Potenziamenti salvati');
console.log('PASS: mercato');

// Potenziamenti in gioco.
run('eco.balance=5000;eco.upgrades={salvo:2,laser:2,speed:3,shield:2,grenades:2};startGame();enemies=[];missile=null;launchMissile()');
assert.equal(val('wingMissiles.length'),2,'Tre missili insieme');assert.equal(val('eco.balance'),5000-75,'Tre missili: −75 CR');
run('missile=null;wingMissiles=[];eco.upgrades.salvo=1;launchMissile()');assert.equal(val('wingMissiles.length'),1,'Due missili insieme');
run('player.fire=0;shoot()');assert.equal(val('bullets[bullets.length-1].dmg'),2,'Laser potenziato');
run('player.vx=0;player.vy=0;applyShipThrust(1,0,false,10)');assert(val('player.vx')>240*1.3,'Motori più veloci');
run('player.health=100;player.shield=100;player.barrier=true;player.inv=0;damage(50)');assert(val('player.shield')>70,'Barriera rinforzata consuma meno');
run('abort();selected=0;startPlatform()');assert.equal(val('pf.pilot.grenades'),5,'Granate extra');
run('pf.pilot.fire=0;pfShoot()');assert.equal(val('pf.shots[0].dmg'),2,'Laser potenziato a terra');
run('eco.upgrades={};abort()');
console.log('PASS: potenziamenti nello spazio e a terra');

// Fase 2: granate pagate, premio missione solo con robot distrutto.
run('eco.balance=1000;selected=0;startPlatform()');step(3.5);
assert.equal(val('eco.run.spent.fuel'),30,'Carburante della discesa');
run('pf.phase="missione";pfThrowGrenade()');assert.equal(val('eco.run.spent.granata'),20,'Granata: −20 CR');
const b2=val('eco.balance');run('pf.rescued=3;pf.kills=6;pf.phase="vittoria";pfFinish(true)');
const r2=JSON.parse(val('JSON.stringify(eco.last)'));
assert.equal(r2.prize,600+3*60,'Premio: ricompensa del pianeta + bonus ostaggi');
assert.equal(val('eco.balance'),b2+36+780,'Premio e taglia accreditati');
run('abort();eco.balance=1000;startPlatform()');step(3.5);const b3=val('eco.balance');run('pf.kills=2;pfFinish(false)');
assert.equal(val('eco.last.prize'),0,'Nessun premio se la missione fallisce');assert.equal(val('eco.balance'),b3+12);
run('abort()');
console.log('PASS: premio della missione e riepilogo della fase 2');

// Temi dei pianeti.
const themes=['mare','deserto','tempesta','foresta','lava'];
for(let i=0;i<5;i++){run(`selected=${i};startPlatform()`);assert.equal(val('pf.theme.id'),themes[i]);step(4);run('drawPlatform()');assert(val('pf.deco.themeBack.flora.length')>5,'Decorazioni del tema');run('abort()')}
assert.equal(val('pfTheme({color:"#3070e0"}).id'),'mare');assert.equal(val('pfTheme({color:"#e02020"}).id'),'lava');assert.equal(val('pfTheme({color:"#30c040"}).id'),'foresta');assert.equal(val('pfTheme({color:"#f0d040"}).id'),'deserto');
run('selected=4;startPlatform();pf.pilot.visible=true;pf.pilot.y=PF_VH;globalThis.beforeFall=pf.lives;pfFell()');assert.equal(val('pf.lives'),val('beforeFall-1'),'La caduta nella lava consuma una vita');
console.log('PASS: temi mare, deserto, foresta, lava, tempesta');
