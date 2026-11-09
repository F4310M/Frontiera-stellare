// Test fase a terra: soldati col jetpack, rinforzi col boss, barriera, pilota di riserva dalla navetta.
// Eseguire dalla cartella principale: node tests/terra.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

// Soldati col jetpack: volano sopra il pilota e sparano
run('vite=3;viteSave();selected=0;startPlatform()');step(3.5);
assert.equal(val('pf.phase'),'missione');
run('pf.enemies=[];pfSpawnEnemy("jet",pf.pilot.x+300)');
assert(val('pf.enemies[0].jet'),'Esiste il soldato col jetpack');
run('pf.pilot.inv=99;globalThis.nShots=0;const es=pfEnemyShot;pfEnemyShot=function(...a){nShots++;return es(...a)}');step(3);
assert.equal(val('pf.enemies.length'),1);
assert(val('pf.enemies[0].y<pf.pilot.y-80'),'Il soldato col jetpack resta in volo');
assert(val('nShots')>0,'Il soldato col jetpack spara');
assert(val('pf.fx.some(f=>f.jetSmoke)'),'Il jetpack lascia fumo persistente');
run('gEnemy(pf.enemies[0],1)');
// Alcuni soldati normali diventano col jetpack
run('pf.enemies=[];for(let i=0;i<60;i++)pfSpawnEnemy("soldato",pf.pilot.x+200)');
const jets=val('pf.enemies.filter(e=>e.jet).length');assert(jets>3&&jets<45,'Solo alcuni soldati hanno il jetpack: '+jets);
run('pfHitEnemy(pf.enemies.find(e=>e.jet),99)');
console.log('PASS: soldati col jetpack');

// Boss: arrivano rinforzi di tipi diversi
run('pf.enemies=[];pf.pilot.x=pf.arenaX+200;pf.pilot.y=PF_FLOOR;pf.pilot.inv=999;pf.pilot.hp=100;pfUpdateCamera(.016)');step(.1);
assert.equal(val('pf.phase'),'boss');
run('pf.boss.hp=1e9;pf.boss.max=1e9');
const seen=new Set();
for(let i=0;i<40;i++){step(1);run('pf.pilot.inv=999;pf.pilot.hp=100');for(const e of val('pf.enemies'))seen.add(e.jet?'jet':e.type);run('if(pf.enemies.length>=2)pf.enemies=[]')}
assert(seen.size>=3,'Rinforzi casuali durante il boss: '+[...seen]);
assert(val('pf.enemies.every(e=>e.x>pf.cam.lockX-10)'),'I rinforzi restano nell\'arena');
console.log('PASS: rinforzi casuali durante il boss',[...seen].join(','));

// Pilota di riserva: scende dalla navetta
run('pf.enemies=[];pf.spawnTimer=999;pf.boss.hp=1e9;pf.pilot.inv=0;pf.pilot.barrier=false;const l=pf.lives;pfLoseLife()');
assert.equal(val('pf.pilot.visible'),false,'Subito dopo la morte il pilota non c\'è');
assert(val('pf.drop&&pf.drop.t===0'));
run('pfDrawShipOnPad(1)');step(.6);run('pfDrawShipOnPad(1)');assert.equal(val('pf.pilot.visible'),false);
for(let i=0;i<30&&!val('pf.pilot.visible');i++)step(.15);
assert(val('pf.pilot.visible'),'Il nuovo pilota viene sganciato in una zona libera');
assert(val('pf.pilot.y<PF_FLOOR-60'),'Il pilota cade dalla navetta');
for(let i=0;i<40&&val('pf.drop||!pf.pilot.ground');i++)step(.15);
assert.equal(val('pf.drop'),null);assert(val('pf.pilot.ground'),'Il pilota è a terra');
assert.equal(val('pf.pilot.hp'),100);
console.log('PASS: pilota di riserva dalla navetta');
run(`
 const original={solids:pf.solids,plats:pf.plats,props:pf.props,arenaX:pf.arenaX,boss:pf.boss,enemies:pf.enemies};
 pf.cam.lock=false;pf.phase='missione';
 pf.solids=[{x:0,w:220,y:600},{x:310,w:600,y:600}];pf.plats=[];pf.props=[];pf.arenaX=870;pf.boss=null;
 pf.enemies=[{x:440,y:600,w:30,h:50,hp:10}];
 globalThis.safeRespawn=terraFindDrop(250);
 globalThis.dangerRejected=terraSafeGround(440)===null&&terraSafeGround(225)===null;
 Object.assign(pf,original);
`);
assert(val('safeRespawn&&safeRespawn.x<180&&safeRespawn.g===600'),'evita precipizio e zona occupata');
assert(val('dangerRejected'),'scarta il punto occupato e il precipizio');
console.log('PASS: scelta della zona di atterraggio sicura');

run(`
 let pixels=0;const old=ctx.fillRect;
 ctx.fillRect=()=>{pixels++};
 pfDrawHelp({id:1,x:300,y:600,state:'legato'},0);
 const drawn=pixels;
 pfDrawHelp({id:1,x:300,y:600,state:'fuga'},0);
 ctx.fillRect=old;
 globalThis.helpBubble=drawn>0&&pixels===drawn;
`);
assert(val('helpBubble'),'HELP si vede solo mentre il colono e prigioniero');


// Barriera grande: si disegna senza errori
run('pf.pilot.barrier=true;pfDrawBarrier(pf.pilot,1);pf.pilot.crouch=true;pfDrawBarrier(pf.pilot,1)');
run('globalThis.shieldHp=pf.pilot.hp;pfDamage(12,-1)');
assert(val('pf.pilot.hp===shieldHp&&pf.pilot.vx<0&&pf.pilot.shieldPush>0'),'La barriera protegge la salute e il colpo respinge il pilota');
// Ultima vita: nessuna navetta
run('pf.lives=1;pfLoseLife()');assert.equal(val('pf.phase'),'sconfitta');assert.equal(val('pf.drop'),null);
console.log('PASS: barriera e ultima vita');
// Barra della vita: verde piena, rossa quasi distrutta
assert.equal(val('hpColor(1)'),'hsl(120,85%,55%)');assert(val('hpColor(.05)').startsWith('hsl(6,'));
console.log('PASS: colore della barra della vita');
