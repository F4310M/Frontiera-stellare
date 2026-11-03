// Test (2026-11-03): lanciatore multiplo, un missile guidato per ogni bersaglio. Eseguire: node tests/multi-aggancio.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','fase2.js','grafica2.js','economia.js','missili-nemici.js','multi-aggancio.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');

// Due nemici a distanze diverse davanti alla nave.
const setup=salvo=>run(`eco.balance=5000;eco.upgrades={salvo:${salvo}};startGame();arrivalRemaining=0;missile=null;wingMissiles=[];lockTarget=null;lockProgress=0;MA.extra=[];
 enemies=[{x:player.x+200,y:player.y,r:20,hp:3},{x:player.x-300,y:player.y+50,r:20,hp:3},{x:player.x+100,y:player.y-250,r:20,hp:3}];
 for(let i=0;i<120;i++)updateTargetLock(1/60)`);

// Senza lanciatore multiplo: un solo bersaglio.
setup(0);assert.equal(val('MA.extra.length'),0,'Un missile: un solo aggancio');

// 2 missili: due bersagli diversi, entrambi agganciati.
setup(1);
assert.equal(val('MA.extra.length'),1);assert(val('MA.extra[0].t!==lockTarget'),'Il secondo bersaglio è diverso');
assert.equal(val('lockProgress'),1);assert.equal(val('MA.extra[0].p'),1,'Anche il secondo è agganciato');
assert.match(val('$("missileStatus").textContent'),/BERSAGLI AGGANCIATI 2\/2/);
run('launchMissile()');
assert.equal(val('wingMissiles.length'),1);
assert(val('missile.target===lockTarget'),'Il primo missile va sul bersaglio principale');
assert(val('wingMissiles[0].target&&wingMissiles[0].target!==missile.target'),'Il secondo missile va su un altro bersaglio');
console.log('PASS: 2 missili, due bersagli guidati');

// 3 missili: tre bersagli diversi.
setup(2);run('launchMissile()');
const ts=val('[missile.target,...wingMissiles.map(m=>m.target)].map(t=>enemies.indexOf(t))');
assert.equal(new Set(ts).size,3,'Tre bersagli diversi');assert(!ts.includes(-1));
console.log('PASS: 3 missili, tre bersagli');

// Un solo nemico: tutti i missili sullo stesso.
run(`eco.upgrades={salvo:1};missile=null;wingMissiles=[];MA.extra=[];lockTarget=null;enemies=[{x:player.x+200,y:player.y,r:20,hp:3}];for(let i=0;i<120;i++)updateTargetLock(1/60);launchMissile()`);
assert(val('wingMissiles[0].target===enemies[0]&&missile.target===enemies[0]'),'Un nemico: entrambi su di lui');
// Il mirino si disegna senza errori e senza cambiare il bersaglio principale.
run('missile=null;wingMissiles=[];enemies.push({x:player.x-200,y:player.y,r:20,hp:3});for(let i=0;i<120;i++)updateTargetLock(1/60);const t=lockTarget;drawTargetLock();if(lockTarget!==t)throw new Error("mirino")');
console.log('PASS: un nemico solo e mirino');
