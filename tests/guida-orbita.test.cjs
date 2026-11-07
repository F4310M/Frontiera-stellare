// Guida alla conquista dell’orbita (dist/guida-orbita.js) e buchi neri un po’ più frequenti.
// Eseguire dalla cartella principale: node tests/guida-orbita.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','buchineri.js','fossili.js','guida-orbita.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run("soundEnabled=false;godMode=false;ctx.getTransform=undefined;lang='it';i18nBuild()");
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('guida-orbita.js')>html.indexOf('i18n.js')&&html.indexOf('guida-orbita.js')>html.indexOf('comandi.js'),'guida-orbita.js dopo i18n.js e comandi.js');

// missione tranquilla, nave ferma vicino al pianeta ma fuori dall'anello
const quiet=`selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;EM.missiles=[];BH.on=false;BH.hole=null;keys={};player.vx=0;player.vy=0;`;
const at=k=>`player.x=world.x+world.r+${k};player.y=world.y;`;
const rows=()=>val('[...guRows].map(r=>r.className+"|"+r.textContent)');
run(quiet+at(900));step(.1);
assert(val('guState().step===0'),'passo 1: entrare nell’anello');
assert(val('guShown'),'il pannello si vede vicino al pianeta');
assert(rows()[0].startsWith('now|1. ENTRA'),'il primo passo è illuminato: '+rows()[0]);
run('drawSupplies()');

// una guardia vicino al pianeta blocca la conquista
run(at(60)+'enemies=[{x:world.x+world.r+200,y:world.y+80,vx:0,vy:0,hp:3,r:20}];guPanel(guState())');
assert(val('guState().step===1'),'passo 2: eliminare le guardie');
assert(rows()[0].startsWith('done|✓'),'il primo passo ha la spunta');
assert(rows()[1].startsWith('now|2. ELIMINA LE GUARDIE ORBITALI · 1'),'conta le guardie: '+rows()[1]);
run('drawSupplies()');

// senza guardie: frenare e aspettare la barra
run('enemies=[];player.vx=0;player.vy=0');step(.1);
assert(val('guState().step===2'),'passo 3: frenare');
assert(rows()[2].includes('FRENA E RESTA FERMO')&&rows()[2].endsWith('F'),'indica il tasto del freno: '+rows()[2]);
const before=val('guCount()');
for(let i=0;i<70&&val("state==='play'");i++){run(at(60)+'player.vx=0;player.vy=0;enemies=[]');step(.1)}
assert(val("state==='orbit'"),'la conquista parte');
assert(val('guCount()')===before+1,'conta le conquiste');
assert(val('!guShown'),'il pannello sparisce durante l’ingresso in orbita');
console.log('PASS: guida a tre passi vicino al pianeta');

// dopo 3 conquiste il pannello non si vede più (anello e mirini restano)
run('guSave(3)');run(quiet+at(900));step(.1);
assert(val('!guShown'),'niente pannello dopo 3 conquiste');
run('drawSupplies()');
run('guSave(0)');
// lontano dal pianeta niente guida
run(quiet+'player.x=world.x+world.r+5000;player.y=world.y');step(.1);
assert(val('guState()===null&&!guShown'),'niente guida lontano dal pianeta');
console.log('PASS: pannello solo nelle prime conquiste e solo vicino al pianeta');

// traduzioni
run("lang='en';i18nBuild()");
assert(val("tr('COME CONQUISTARE IL PIANETA')")==='HOW TO CONQUER THE PLANET','traduzione inglese');
assert(val("tr('ZONA DI CONQUISTA')")==='CONQUEST ZONE','scritta sull’anello tradotta');
console.log('PASS: testi tradotti');

// buchi neri un po' più frequenti
assert(Math.abs(val('BH_CFG.chance(1)')-.58)<1e-9,'pianeta facile: 58%');
console.log('PASS: buchi neri un po’ più frequenti');
