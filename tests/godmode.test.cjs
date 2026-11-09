// GOD MODE e jetpack di emergenza (2026-11-02): nessun danno, nessuna vita persa, tutti i pianeti giocabili;
// un secondo salto mentre si cade nel burrone accende il jetpack anche con un tocco solo.
// Eseguire dalla cartella principale: node tests/godmode.test.cjs
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
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js','terra.js','battaglia.js','godmode.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const P=s=>val('JSON.stringify('+s+')');

// 1) Jetpack: salto da terra, poi un secondo salto (solo un tocco) mentre si cade nel burrone
run('godMode=false;vite=3;viteSave();selected=0;startPlatform()');step(4.6);
assert.equal(val('pf.phase'),'missione');
run('const z=pf.jetZones[0];pf.cam.x=z.edgeX-500;Object.assign(pf.pilot,{x:z.edgeX-60,y:z.topY,vx:0,vy:0,ground:true,lastGround:z.edgeX-60,jetHeat:0,jetLock:false,jetOn:false});pf.enemies=[];pf.shots=[];pf.missiles=[];globalThis.Z=z');
run('keys={KeyD:true,Space:true}');step(.2);
run('keys={KeyD:true}');step(.35);
assert(val('!pf.pilot.ground&&pf.pilot.vy>0&&pfGroundAt(pf.pilot.x)===null'),'Il pilota cade sopra il burrone: '+P('pf.pilot'));
run('keys={KeyD:true,KeyW:true}');step(1/60);
assert(val('pf.pilot.jetOn'),'Il secondo salto accende il jetpack');
run('keys={KeyD:true}');step(.3);
assert(val('pf.pilot.jetOn'),'Con un tocco solo il jetpack resta acceso sopra il vuoto');
step(1.6);
assert(val('pf.pilot.x>Z.landX-40'),'Il pilota attraversa il burrone: x='+val('Math.round(pf.pilot.x)')+' atterraggio '+val('Z.landX'));
console.log('PASS: doppio salto nel burrone accende il jetpack');

// Il secondo salto funziona anche con un altro tasto mentre il primo è ancora premuto
run('Object.assign(pf.pilot,{x:Z.edgeX-60,y:Z.topY,vx:0,vy:0,ground:true,jetHeat:0,jetLock:false,jetOn:false});pf.cam.x=Z.edgeX-500');step(.3);
run('keys={KeyD:true,Space:true}');step(.5);
assert(val('!pf.pilot.ground&&!pf.pilot.jetOn'));
run('keys={KeyD:true,Space:true,ArrowUp:true}');step(1/60);
assert(val('pf.pilot.jetOn'),'W/↑ accende il jetpack anche con SPAZIO ancora premuto');
run('keys={}');step(3);
console.log('PASS: jetpack con un secondo tasto di salto');

// 2) GOD MODE a terra: niente danni, niente cadute fatali, nessuna vita persa
run('setGodMode(true)');
assert(val('godMode&&localStorage.getItem("stellarGodMode")==="yes"'));
run('pf.pilot.hp=100;pf.pilot.inv=0;pfDamage(500);pf.pilot.inv=0;pfDamage(500,1,true)');
assert.equal(val('pf.pilot.hp'),100,'Nessun danno al pilota');
const lives=val('pf.lives');
run('pf.pilot.y=PF_VH+200');step(1/60);
assert(val('pf.pilot.hp===100&&pf.lives==='+lives),'La caduta nel vuoto non toglie salute né vite');
run('pfLoseLife()');assert.equal(val('pf.lives'),lives,'Nessuna vita persa');
console.log('PASS: god mode a terra');

// 3) GOD MODE nello spazio: la nave non si danneggia e non esplode
run('pf=null;selected=0;startGame();state="play";player.inv=0;player.health=100;damage(999,true)');
assert.equal(val('player.health'),100);
run('explodePlayer()');assert.equal(val('state'),'play','La nave non esplode');
run('state="map"');
console.log('PASS: god mode nello spazio');

// 4) Mappa: OMEGA e i pianeti già liberati si possono giocare; niente punti in classifica
run('localStorage.setItem("frontieraPianetiLiberati",planets[0].code);finalLock()');
const omega=val('planets.findIndex(p=>p.final)');
assert(omega>=0&&val(`mapPlayable(planets[${omega}])`),'OMEGA giocabile in god mode');
assert(val('mapPlayable(planets[0])'),'Pianeta liberato rigiocabile in god mode');
const sc=val('score');run('scoreAdd(500)');assert.equal(val('score'),sc,'In god mode non si guadagnano punti');
run('eco.balance=4000;ecoStartPhase(2);ecoEndPhase(2,true,{kills:20,rescued:5,hostages:5})');
assert.equal(val('eco.balance'),4000,'In god mode non si guadagnano crediti');
run('setGodMode(false)');
assert(!val(`mapPlayable(planets[${omega}])`),'Senza god mode OMEGA resta bloccato');
assert(!val('mapPlayable(planets[0])'),'Senza god mode il pianeta liberato non si ripete');
run('scoreAdd(500)');assert.equal(val('score'),sc+500);
console.log('PASS: god mode sulla mappa e in classifica');
console.log('godmode.test: ok');
