// Mappa (2026-11-01): scritta FREE sui pianeti liberati, missioni concluse non ripetibili,
// OMEGA visibile in lontananza ma bloccato finché tutti i pianeti non sono liberi.
// Eseguire dalla cartella principale: node tests/mappa.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
// Ogni pulsante pianeta creato da initMap finisce in mapNodes.
let mapNodes=[];
function planetNode(){const cls=new Set(),n=node(),risk={textContent:''};n.classList={add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{(on===undefined?!cls.has(c):on)?cls.add(c):cls.delete(c)},has:c=>cls.has(c)};n.extra='';n.insertAdjacentHTML=(w,h)=>{n.extra+=h};n.querySelector=s=>s==='.risk'?risk:node();n.risk=risk;return n}
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(s){return s==='.planet-node'?mapNodes:[]},createElement(t){if(t==='button'){const b=planetNode();mapNodes.push(b);return b}return node()}}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
Object.defineProperty(sandbox.document.getElementById('starMap'),'innerHTML',{set(){mapNodes=[]},get(){return''}});
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const btn=nodes.get('launchBtn'),span={textContent:''};btn.querySelector=()=>span;
for(const id of ['landBtn','returnBtn']){const n=nodes.get(id),s={textContent:''};n.querySelector=()=>s}
const free=()=>mapNodes.map(n=>n.extra.includes('FREE'));
const briefTitle=()=>nodes.get('briefTitle').textContent;

// OMEGA è sempre sulla mappa, ma bloccato e lontano
run('abort();localStorage.setItem("frontieraPianetiLiberati","");finalLock()');
const fi=val('planets.indexOf(FINAL_PLANET)');
assert(fi>=0,'OMEGA si vede sulla mappa');assert.equal(mapNodes.length,6);
assert(mapNodes[fi].classList.has('distant'),'OMEGA appare in lontananza');assert.equal(mapNodes[fi].risk.textContent,'BLOCCATO');
run(`selectPlanet(${fi})`);assert.equal(span.textContent,'LIBERA TUTTI I PIANETI');assert.equal(btn.disabled,true,'OMEGA non si può raggiungere');
sandbox.document.getElementById('briefTitle').textContent='';run('brief()');assert.equal(briefTitle(),'','Nessun briefing per OMEGA bloccato');
run('selectPlanet(0)');assert.equal(span.textContent,'INIZIA LA MISSIONE');assert.equal(btn.disabled,false);
console.log('PASS: OMEGA visibile ma bloccato');

// Pianeta liberato: scritta FREE e missione non ripetibile
run('abort();vite=3;selected=0;startPlatform()');step(3.5);run('pf.phase="vittoria";pfFinish(true)');
assert.deepEqual(free(),[true,false,false,false,false,false],'FREE sul primo pianeta');
assert.equal(val('selected'),1,'La mappa propone il prossimo pianeta da liberare');
run('abort();selectPlanet(0)');assert.equal(span.textContent,'PIANETA LIBERATO');assert.equal(btn.disabled,true);
assert(nodes.get('planetDesc').textContent.includes('non si può ripetere'));
sandbox.document.getElementById('briefTitle').textContent='';run('brief()');assert.equal(briefTitle(),'','Il pianeta liberato non si rigioca');
run('selectPlanet(1);brief()');assert(briefTitle().includes('VESPER'),'Gli altri pianeti restano giocabili');
console.log('PASS: FREE e missioni non ripetibili');

// Liberati tutti: OMEGA si apre; vinto OMEGA si può iniziare una nuova partita
for(let i=1;i<5;i++){run(`abort();vite=3;selected=${i};startPlatform()`);step(3.5);run('pf.phase="vittoria";pfFinish(true)')}
assert(!mapNodes[fi].classList.has('distant'),'OMEGA ora è raggiungibile');assert.equal(val('selected'),fi);
run(`abort();selectPlanet(${fi})`);assert.equal(span.textContent,'INIZIA LA MISSIONE');assert.equal(btn.disabled,false);
run(`abort();vite=3;selected=${fi};startPlatform()`);step(3.5);run('pf.phase="vittoria";pfFinish(true)');
assert.deepEqual(free(),[true,true,true,true,true,true],'Tutto liberato');
run('abort();selectPlanet(0)');assert.equal(span.textContent,'NUOVA PARTITA');assert.equal(btn.disabled,false);
run('eco.balance=1;brief()');
assert.deepEqual(free(),[false,false,false,false,false,false],'Nuova partita: progressi azzerati');
assert.equal(val('eco.balance'),val('ECO_START'));assert.equal(val('vite'),3);assert(mapNodes[fi].classList.has('distant'),'OMEGA di nuovo bloccato');
console.log('PASS: OMEGA e nuova partita');

// Game over: OMEGA torna bloccato e spariscono le scritte FREE
run('localStorage.setItem("frontieraPianetiLiberati",BASE_PLANETS.join(","));finalLock();vite=1;viteSave();selected=0;startPlatform()');step(3.5);run('pf.lives=1;pfLoseLife()');step(2.5);
assert.equal(nodes.get('resultEyebrow').textContent,'GAME OVER');assert(val('planets.includes(FINAL_PLANET)'));assert(mapNodes[fi].classList.has('distant'));assert(free().every(f=>!f));
console.log('PASS: game over');
