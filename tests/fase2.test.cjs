// Test della FASE 2 (platform sul pianeta). Eseguire dalla cartella principale: node tests/fase2.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:Array.from({length:5},()=>({classList:{toggle(){}}})),textContent:'',querySelector(){return node()},appendChild(){},setAttribute(){}}}
const store={};
// Contesto canvas finto: accetta qualsiasi chiamata di disegno.
const gradient={addColorStop(){}};const ctxTarget={};
const fakeCtx=new Proxy(ctxTarget,{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},matchMedia(){return{matches:false}},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/icone.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('dist/fase2.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('dist/grafica2.js','utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox);
const step=(seconds,dt=1/60)=>run(`for(let i=0;i<${Math.round(seconds/dt)};i++)update(${dt})`);
run('soundEnabled=false');

// Livello: percorribile per ogni pianeta.
for(let i=0;i<5;i++){
 run(`selected=${i};startPlatform()`);
 const lvl=JSON.parse(run('JSON.stringify({solids:pf.solids,plats:pf.plats,hostages:pf.hostages,arenaX:pf.arenaX,triggers:pf.triggers.length})'));
 assert(lvl.arenaX>5500,'Livello abbastanza lungo');
 assert(lvl.hostages.length>=4,'Almeno 4 coloni da salvare');
 assert(lvl.triggers>8,'Ci sono ribelli lungo il percorso');
 for(let j=1;j<lvl.solids.length;j++){const a=lvl.solids[j-1],b=lvl.solids[j],gap=b.x-(a.x+a.w),rise=a.y-b.y;assert(gap>=0&&gap<=150,'Burroni saltabili ('+gap+')');assert(rise<=84,'Gradini superabili');if(gap>0)assert(rise<=28,'Bordo dopo il burrone raggiungibile')}
 for(const p of lvl.plats){const g=lvl.solids.find(s=>p.x+p.w/2>=s.x&&p.x+p.w/2<s.x+s.w);assert(g,'Piattaforma sopra il terreno');assert(g.y-p.y<=116||p.arena,'Piattaforma raggiungibile')}
 for(const h of lvl.hostages)assert(lvl.solids.some(s=>h.x>=s.x&&h.x<=s.x+s.w&&s.y===h.y),'Colono su terreno solido');
}
console.log('PASS: livelli percorribili su tutti i pianeti, coloni e ribelli distribuiti');

run('selected=0;startPlatform()');
assert.equal(run('state'),'platform');assert.equal(run('pf.phase'),'atterraggio');
run('keys={KeyD:true}');step(1);assert.equal(run('pf.pilot.visible'),false,'Durante la discesa il pilota resta a bordo');
run('keys={}');step(3);
assert.equal(run('pf.phase'),'missione','Dopo l’atterraggio inizia la missione');
assert.equal(run('pf.pilot.visible'),true,'Il pilota scende dalla nave');
assert.equal(run('pf.pilot.ground'),true);assert.equal(run('pf.pilot.y'),600);
console.log('PASS: atterraggio, uscita del pilota dalla nave');

run('pf.triggers=[];pf.spawnTimer=999;pf.enemies=[]');
const x0=run('pf.pilot.x');run('keys={KeyD:true}');step(1);run('keys={}');
assert(run('pf.pilot.x')-x0>200,'Corsa verso destra');
assert(run('pf.cam.x')>0,'La telecamera scorre verso destra');
const camBefore=run('pf.cam.x');run('keys={KeyA:true}');step(1.5);run('keys={}');
assert(run('pf.cam.x')>=camBefore,'La telecamera non torna indietro');
assert(run('pf.pilot.x')>=run('pf.cam.x')+16-1e-6,'Il pilota non esce a sinistra');
run('keys={Space:true}');step(.05);assert(run('pf.pilot.vy')<0,'Salto');step(.3);run('keys={}');step(1);assert.equal(run('pf.pilot.ground'),true,'Atterra dopo il salto');
console.log('PASS: corsa, scorrimento solo in avanti, salto');

// Burrone: la caduta fa esplodere il pilota e consuma una vita.
run('const pit=pf.solids.findIndex((s,i)=>i&&s.x>pf.solids[i-1].x+pf.solids[i-1].w);const a=pf.solids[pit-1];pf.cam.x=a.x+a.w-600;pf.pilot.x=a.x+a.w-30;pf.pilot.y=a.y;pf.pilot.lastGround=a.x+a.w-60;pf.pilot.vx=0;pf.pilot.vy=0;pf.pilot.hp=100;pf.pilot.inv=0');
run('keys={KeyD:true}');step(.4);run('keys={}');step(1.5);
assert.equal(run('pf.lives'),2,'Caduta nel burrone: −1 vita');assert.equal(run('pf.pilot.hp'),100,'Il sostituto riparte con la salute piena');
console.log('PASS: burroni');

// Combattimento con mira del mouse.
run('pf.enemies=[];pf.shots=[];pf.pilot.hp=100;pf.pilot.x=pf.cam.x+300;pf.pilot.y=pfGroundAt(pf.pilot.x);pf.pilot.vy=0;pfSpawnEnemy("soldato",pf.pilot.x+250);pf.enemies[0].fire=99;pf.kills=0');
step(.3);
run('const e=pf.enemies[0];for(let i=0;i<e.hp;i++)pfFireAt(e.x,e.y-30);mouse.down=true');
step(.4);run('mouse.down=false');
assert.equal(run('pf.enemies.length'),0,'Il ribelle viene abbattuto');assert.equal(run('pf.kills'),1);
console.log('PASS: mira con il mouse e fuoco');

run('pfSpawnEnemy("soldato",pf.cam.x+pfViewW()+40);pf.enemies[0].fire=99');const ex=run('pf.enemies[0].x');step(1);
assert(run('pf.enemies[0].x')<ex,'I ribelli vanno incontro al pilota');
run('pf.enemies=[]');
// Colpo nemico, invulnerabilità e scudo.
run('pf.pilot.hp=100;pf.pilot.inv=0;pf.pilot.shield=100;mouse.right=false;pfEnemyShot(pf.pilot.x+60,pf.pilot.y-30,Math.PI,400,10)');step(.3);
assert.equal(run('pf.pilot.hp'),90,'Il colpo ribelle ferisce');
run('pf.pilot.inv=0;mouse.right=true;pfEnemyShot(pf.pilot.x+80,pf.pilot.y-30,Math.PI,400,10)');step(.3);run('mouse.right=false');
assert.equal(run('pf.pilot.hp'),90,'Lo scudo assorbe');assert(run('pf.pilot.shield')<100);
console.log('PASS: ribelli che avanzano, danni e scudo');

// Granata.
run('pf.enemies=[];pfSpawnEnemy("soldato",pf.pilot.x+140);pf.enemies[0].fire=99;pf.pilot.grenades=1;const e=pf.enemies[0],s=pfScale();mouse.x=(e.x-pf.cam.x)*s;mouse.y=(e.y-60)*s');step(.05);
run('pfThrowGrenade()');assert.equal(run('pf.pilot.grenades'),0);step(1.6);
assert.equal(run('pf.enemies.length'),0,'La granata elimina il ribelle');
console.log('PASS: granate');

// Colono da salvare.
run('const h=pf.hostages[0];h.state="legato";pf.cam.x=h.x-400;pf.pilot.x=h.x-10;pf.pilot.y=h.y;pf.pilot.vy=0;pf.rescued=0;pf.pickups=[]');step(.1);
assert.equal(run('pf.rescued'),1,'Colono liberato');assert.equal(run('pf.checkpoint'),run('pf.hostages[0].x'),'Punto di controllo aggiornato');
assert.equal(run('pf.hostages[0].state'),'libero');
assert(!run('pf.texts.some(t=>t.text==="GRAZIE!")'),'Si alza prima di ringraziare');
step(.5);assert(run('pf.texts.some(t=>t.text==="GRAZIE!")'),'Ringrazia mentre è ancora vicino al pilota');
assert.equal(run('pf.hostages[0].state'),'libero');
assert(run('pf.pickups.length')>=1,'Il colono lascia un rifornimento');step(2.5);assert.equal(run('pf.hostages[0].state'),'salvo','Il colono viene evacuato');
console.log('PASS: coloni da salvare');

// Morte e vite.
run('pf.lives=3;pf.pilot.inv=0;pfDamage(200)');assert.equal(run('pf.lives'),2);assert.equal(run('pf.pilot.hp'),100,'Rientra con salute piena');assert.equal(run('pf.pilot.x'),run('pf.checkpoint'),'Riparte dal punto di controllo');
console.log('PASS: vite e punti di controllo');

// Pausa.
run('togglePause()');assert.equal(run('paused'),true);const tPause=run('pf.time');step(1);assert.equal(run('pf.time'),tPause,'La pausa ferma la missione');run('togglePause()');
console.log('PASS: pausa');

// Robot finale.
run('pf.enemies=[];pf.cam.x=pf.arenaX-500;pf.pilot.x=pf.arenaX+160;pf.pilot.y=600;pf.pilot.vy=0;pf.pilot.hp=100');step(.05);
assert.equal(run('pf.phase'),'boss','Ingresso nell’arena');assert(run('pf.boss!==null'));assert.equal(run('pf.cam.lock'),true,'La telecamera si blocca');
step(3);assert.notEqual(run('pf.boss.state'),'caduta','Il robot atterra');
run('pf.pilot.hp=100;pf.lives=9;pf.pilot.inv=0');
// Onda d'urto: colpisce chi è a terra.
run('pf.waves=[{x:pf.pilot.x+30,dir:-1,speed:440,life:3,hit:false}];pf.pilot.inv=0;pf.pilot.hp=100;pf.boss.state="pausa";pf.boss.t=-99');step(.2);
assert.equal(run('pf.pilot.hp'),82,'L’onda d’urto colpisce a terra');
run('pf.boss.t=0;pf.waves=[]');
const hp0=run('pf.boss.hp');run('pfHitBoss(1)');assert.equal(run('pf.boss.hp'),hp0-1);
run('pfBossSet(pf.boss,"stordito");pfHitBoss(1)');assert.equal(run('pf.boss.hp'),hp0-3,'Nucleo esposto: danno doppio');
run('pf.boss.hp=1;pfBossSet(pf.boss,"stordito");pfHitBoss(1)');assert.equal(run('pf.phase'),'vittoria');
step(3.8);assert(run('pf.crowd.length')>=8&&run('pf.crowd.length')<=11,'La folla finale resta compatta');assert(run('pf.crowd.some(h=>h.state==="fuga")'),'I coloni scappano');step(5);assert.equal(run('state'),'won','La distruzione del robot completa la fase 2');
assert.equal(store.frontieraPhaseTwoComplete,'yes');
console.log('PASS: robot finale, onda d’urto, nucleo esposto, vittoria');

// Il robot si comporta in tutte le fasi d'attacco senza errori.
run('selected=4;startPlatform();pf.phase="missione";pf.pilot.visible=true;pf.pilot.y=600;pf.cam.x=pf.arenaX-500;pf.pilot.x=pf.arenaX+160');step(.05);
run('pf.lives=99;pf.boss.hp=pf.boss.max*.4');
for(let i=0;i<40;i++){step(.5);run('pf.pilot.hp=100');}
assert.equal(run('state'),'platform');assert(run('pf.boss.rage'),'Modalità furia sotto metà salute');
console.log('PASS: ciclo completo degli attacchi del robot');

// Sconfitta.
run('pf.lives=1;pf.pilot.inv=0;pfDamage(500)');step(2.5);assert.equal(run('state'),'lost','Senza vite la missione fallisce');
run('abort()');assert.equal(run('state'),'map');assert.equal(run('pf'),null);
console.log('PASS: sconfitta e ritorno alla mappa');

// Disegno in ogni fase senza errori.
run('selected=1;startPlatform()');for(let i=0;i<12;i++){step(.4);run('drawPlatform()')}
run('pf.cam.x=pf.arenaX-500;pf.pilot.x=pf.arenaX+160;pf.pilot.y=600;pf.lives=99');for(let i=0;i<20;i++){step(.3);run('pf.pilot.hp=100;draw()')}
run('pf.boss.hp=1;pfHitBoss(5)');for(let i=0;i<10;i++){step(.3);if(run('state')==='platform')run('draw()')}
console.log('PASS: disegno di atterraggio, livello, robot e vittoria');

// Collegamento con la fase 1.
run('abort();selected=0;startGame();finish(true)');assert.equal(run('state'),'won');
run('pfOpenBrief();startPlatform()');assert.equal(run('state'),'platform','Dalla vittoria in orbita si atterra sul pianeta');
console.log('PASS: passaggio dalla fase 1 alla fase 2');
