// Novità 2026-11-04: più ribelli al riparo, spinta nello scontro, scena della vita persa, ingresso a spirale,
// entrata in scena del boss, colpo speciale (spazio e terra), nemici più deboli.
// Eseguire dalla cartella principale: node tests/speciale.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
let mapNodes=[];
function planetNode(){const cls=new Set(),n=node(),risk={textContent:''};n.classList={add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{(on===undefined?!cls.has(c):on)?cls.add(c):cls.delete(c)},has:c=>cls.has(c)};n.extra='';n.insertAdjacentHTML=(w,h)=>{n.extra+=h};n.querySelector=s=>s==='.risk'?risk:node();n.risk=risk;return n}
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(s){return s==='.planet-node'?mapNodes:[]},createElement(t){if(t==='button'){const b=planetNode();mapNodes.push(b);return b}return node()}}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
Object.defineProperty(sandbox.document.getElementById('starMap'),'innerHTML',{set(){mapNodes=[]},get(){return''}});
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js','terra.js','battaglia.js','ingresso.js','godmode.js','i18n.js','facile.js','assalto.js','spirale.js','montaggio.js','speciale.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false');

// 1) più ribelli al riparo
for(let i=0;i<5;i++){
 run(`globalThis.L=buildPlatformLevel(planets[${i}])`);
 const n=val('L.triggers.filter(t=>t.type==="riparo").length');
 assert(n>=4,'almeno 4 ribelli al riparo sul pianeta '+i+' ('+n+')');
}
console.log('PASS: più ribelli al riparo');

// 2) nemici più deboli: sul primo pianeta 2 colpi
run("selected=0;startGame();paused=false;enemies=[];spawnEnemy(player.x+300,player.y,false)");
assert.equal(val('enemies[0].hp'),2,'nave nemica del primo pianeta: 2 colpi');
run("selected=3;startGame();paused=false;enemies=[];spawnEnemy(player.x+300,player.y,false)");
assert(val('enemies[0].hp')<3+Math.floor(4/2),'navi degli altri pianeti più deboli');
console.log('PASS: navi nemiche più deboli');

// 3) colpo speciale nello spazio: una volta sola, elimina i nemici sullo schermo, niente danni mentre gira
run("selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];for(let i=0;i<4;i++)spawnEnemy(player.x+200+i*40,player.y+30,false);spawnEnemy(player.x+5000,player.y,false);globalThis.NEAR=enemies.slice(0,4);NEAR.forEach((e,i)=>{e.x=player.x+200+i*60;e.y=player.y+30});globalThis.FAR=enemies[4];FAR.x=player.x+5000");
assert.equal(val('spcUse()'),true);
assert.equal(val('spcUse()'),false,'non si usa due volte insieme');
run('player.health=100;player.inv=0;player.shield=0;damage(30)');assert.equal(val('player.health'),100,'nessun danno mentre gira');
step(2);
assert(val('NEAR.every(e=>e.hp<=0)'),'nemici sullo schermo distrutti');
assert(val('FAR.hp>0'),'quello lontano resta');
assert.equal(val('spcUse()'),false,'una sola volta per missione');
run('startGame()');assert.equal(val('spc.space'),false,'nuova missione: di nuovo disponibile');
console.log('PASS: trottola laser nello spazio');

// 4) ingresso in orbita a spirale
run("startGame();paused=false;beginOrbit()");assert.equal(val('state'),'orbit');
step(3);run('drawOrbitScene()');assert.equal(val('state'),'orbit','la spirale dura più di 3 secondi');
step(3.6);assert.notEqual(val('state'),'orbit','poi si atterra');
console.log('PASS: ingresso a spirale');

// 5) a terra: spinta, scena della vita persa, bomba
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
assert.equal(val('pf.phase'),'missione');
run("pf.enemies=[];tOrig.pfSpawnEnemy('soldato',pf.pilot.x+300);globalThis.E=pf.enemies[0];E.x=pf.pilot.x+12;E.y=pf.pilot.y;E.ground=true;pf.pilot.inv=5;pfUpdateEnemies(1/60)");
assert(val('E.vx')>200,'il soldato viene spinto via: '+val('E.vx'));
run('pf.enemies=[];pf.pilot.inv=0;pf.pilot.barrier=false;pfDamage(500)');
assert(val('!!pf.morte'),'parte la scena');assert.equal(val('pf.lives'),3,'la vita si perde alla fine della scena');
step(1.2);assert(val('pf.pilot.visible&&pf.pilot.hp<=0'),'in ginocchio');
step(2.8);assert.equal(val('pf.morte'),null);assert.equal(val('pf.lives'),2,'vita persa dopo l\'esplosione');
step(5);
run("for(let i=0;i<3;i++)tOrig.pfSpawnEnemy('soldato',pf.cam.x+pfViewW()-80-i*60)");
const before=val('pf.kills');
assert.equal(val('spcUse()'),true,'bombardamento richiesto');
step(3.5);
assert(val('pf.kills')>=before+3,'i nemici sullo schermo sono distrutti');
assert.equal(val('spcUse()'),false,'una sola bomba per missione');
console.log('PASS: spinta, scena della vita persa, bombardamento');

// 6) boss: entrata in scena, invulnerabile, poi la bomba toglie 1/4
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
run('pfEnterArena()');assert.equal(val('pf.boss.state'),'montaggio');
run('pfHitBoss(50)');assert.equal(val('pf.boss.hp'),val('pf.boss.max'),'durante l\'entrata non si danneggia');
step(6.5);assert.notEqual(val('pf.boss.state'),'montaggio','poi combatte');
run('pf.pilot.x=pf.boss.x-300;pf.pilot.y=PF_FLOOR;pf.pilot.ground=true;spc.ground=false;spcUse()');step(3.5);
const hp=val('pf.boss.hp'),max=val('pf.boss.max');
assert(Math.abs(hp-max*.75)<1,'la bomba toglie 1/4 al boss: '+hp+'/'+max);
console.log('PASS: entrata del boss e bomba sul boss');
