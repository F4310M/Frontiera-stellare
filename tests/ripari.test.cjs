// Test ostacoli solidi a terra: muretti dei ribelli, barricate e casse non si attraversano, si saltano.
// Eseguire dalla cartella principale: node tests/ripari.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','battaglia.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

// il salto pieno supera con margine l'ostacolo più alto (muretto)
const apex=val('PF_JUMP*PF_JUMP/(2*PF_GRAVITY)');
for(const [k,o] of Object.entries(val('BATT_OSTACOLI')))assert(apex>=o.h+50,`Il salto (${apex|0}px) supera ${k} (${o.h}px) con margine`);

run('vite=3;viteSave();selected=0;startPlatform()');
step(4.6);assert.equal(val('pf.phase'),'missione');assert(val('pf.pilot.ground'));
// tratto piano davanti al pilota
run(`globalThis.G=pf.pilot.y;globalThis.X0=pf.pilot.x;
 for(let x=X0;x<X0+220;x+=10)if(pfGroundAt(x)!==G)throw new Error('terreno non piano a '+x);
 pf.enemies=[];pf.spawnTimer=999;pf.nextTrigger=pf.triggers.length;pf.pilot.inv=999;pf.pilot.hp=100`);

for(const kind of ['muretto','barricata','cassa']){
 run(`pf.props=pf.props.filter(p=>!BATT_OSTACOLI[p.kind]);pf.props.push({x:X0+150,y:G,kind:'${kind}'});
  Object.assign(pf.pilot,{x:X0,y:G,vx:0,vy:0,ground:true,jetOn:false,jetHeat:0});pf.jumpHeld=false;keys={KeyD:true}`);
 step(1.5);
 const o=val(`BATT_OSTACOLI['${kind}']`);
 assert(val(`pf.pilot.x<=X0+150-${o.hw}-pf.pilot.w/2+.5`),`A piedi non si attraversa: ${kind} (x=${val('pf.pilot.x-X0')|0})`);
 assert(val('pf.pilot.ground&&pf.pilot.y===G'),'Il pilota resta a terra davanti a '+kind);
 // salto tenendo premuto: lo supera e atterra oltre
 run('keys={KeyD:true,KeyW:true}');step(.5);run('keys={KeyD:true}');step(1);
 assert(val(`pf.pilot.x>X0+150+${o.hw}+pf.pilot.w/2`),'Col salto si supera: '+kind);
 console.log('PASS: '+kind+' solido, si salta');
}

// si può stare in piedi sopra al muretto
run(`pf.props=pf.props.filter(p=>!BATT_OSTACOLI[p.kind]);pf.props.push({x:X0+150,y:G,kind:'muretto'});
 Object.assign(pf.pilot,{x:X0+150,y:G-200,vx:0,vy:0,ground:false,jetOn:false});keys={}`);
step(1);
assert(val('pf.pilot.ground&&Math.abs(pf.pilot.y-(G-BATT.coverH))<.5'),'Si atterra sopra al muretto');
// dentro all'ostacolo (es. dopo una ricomparsa) non si resta incastrati
run(`Object.assign(pf.pilot,{x:X0+150,y:G,vx:0,vy:0,ground:true});keys={KeyD:true}`);step(1);
assert(val('pf.pilot.x>X0+150+BATT.coverW/2'),'Da dentro il muretto si esce');
// col jetpack si passa sopra
run(`Object.assign(pf.pilot,{x:X0,y:G,vx:0,vy:0,ground:true,jetOn:false,jetHeat:0,jetLock:false});pf.jumpHeld=false;keys={KeyD:true,KeyW:true}`);
step(.15);run('keys={KeyD:true}');step(.05);run('keys={KeyD:true,KeyW:true}');step(.6);run('keys={KeyD:true}');step(1.2);
assert(val('pf.pilot.x>X0+150+BATT.coverW'),'Col jetpack si supera il muretto');
// i soldati nemici non vengono bloccati
run('globalThis.E={type:"soldato",x:X0+100,y:G,w:22,h:48,vx:120,vy:0};pfMoveBody(E,.5)');
assert(val('E.x>X0+150'),'I nemici passano ancora');
console.log('PASS: si sta sopra, non ci si incastra, jetpack ok, nemici liberi');
