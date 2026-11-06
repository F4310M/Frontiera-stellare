// Test battaglia a terra: discesa col jetpack, nemici al riparo, passaggi col jetpack, esplosione del boss e musica.
// Eseguire dalla cartella principale: node tests/battaglia.test.cjs
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

// 1) Discesa: la nave resta in aria, il pilota scende col jetpack
run('vite=3;viteSave();selected=0;startPlatform()');
step(2.4);
assert(val('pf.pilot.visible&&pf.pilot.landing&&pf.pilot.jetOn'),'Il pilota scende col jetpack');
assert(val('pf.pilot.y<PF_FLOOR-80'),'Il pilota parte dall\'alto');
step(2.2);
assert.equal(val('pf.phase'),'missione');assert(val('pf.pilot.ground&&!pf.pilot.landing'),'Il pilota è atterrato');
assert(val('pfShipPose().y<PF_FLOOR-180'),'La nave resta in aria sopra il pilota');
run('pfDrawShipOnPad(1);drawPlatform()');
// dopo l'atterraggio la nave riparte e vola via
assert(val('pf.shipLeaveT!=null'),'Partenza della nave programmata');
run('globalThis.posA=pfShipPose()');step(1.2);
assert(val('pfShipPose().leaving&&pfShipPose().x>posA.x+200&&pfShipPose().y<posA.y'),'La nave vola via in avanti e in alto');
run('pfDrawShipOnPad(1);drawPlatform()');
step(4);assert(val('pfShipPose().gone&&!pfOnScreen(pfShipPose().x,200)'),'La nave è sparita');
run('pfDrawShipOnPad(1);drawPlatform()');
console.log('PASS: discesa col jetpack, la nave riparte e vola via');

// 2) Passaggi col jetpack: parete alta e burrone largo in ogni pianeta
for(let i=0;i<5;i++){
 run(`globalThis.L=buildPlatformLevel(planets[${i}])`);
 const zones=val('L.jetZones');assert(zones.length>=1,'Passaggio col jetpack sul pianeta '+i);
 for(const z of zones){
  assert(z.baseY-z.topY>=180,'La parete non si sale col solo salto ('+(z.baseY-z.topY)+')');
  assert(z.landX-z.edgeX>=400,'Il burrone non si salta senza jetpack');
  assert(val(`pfGroundAtL(${z.edgeX+20})`.replace('pfGroundAtL','((x)=>{for(const s of L.solids)if(x>=s.x&&x<s.x+s.w)return s.y;return null})'))===null,'Sotto il burrone c\'è il vuoto');
 }
 assert(val('L.props.filter(p=>p.kind==="muretto").length')>=2,'Muretti nel livello');
 assert(val('L.solids.every(s=>s.x>=L.arenaX||s.x+s.w<=L.arenaX)'),'L\'arena resta libera');
}
console.log('PASS: parete e burrone col jetpack');

// Planata: col jetpack acceso e giù premuto si scende piano
run('Object.assign(pf.pilot,{x:pf.pilot.x,y:300,vy:0,ground:false,jetOn:true,jetHeat:0,jetLock:false});keys={KeyW:true,KeyS:true};pf.jumpHeld=true');
step(.5);
assert(val('pf.pilot.jetOn&&pf.pilot.vy>60&&pf.pilot.vy<160'),'Planata lenta: '+val('pf.pilot.vy'));
run('keys={KeyW:true}');step(.3);assert(val('pf.pilot.vy<0'),'Senza giù il jetpack sale');
run('keys={}');step(1.5);
console.log('PASS: planata col jetpack');

// 3) Nemico al riparo: si alza, spara, si riabbassa; quando è giù i colpi si fermano sul muretto
run('pf.enemies=[];const g=pfGroundAt(pf.pilot.x+400)??PF_FLOOR;pf.props.push({x:pf.pilot.x+400,y:g,kind:"muretto"});battSpawnCover({wallX:pf.pilot.x+400,y:g});globalThis.E=pf.enemies[0];pf.pilot.inv=999;pf.pilot.hp=100');
assert(val('E.cover&&E.state==="giu"'));
run('globalThis.nShots=0;const es=pfEnemyShot;pfEnemyShot=function(...a){nShots++;return es(...a)}');
const states=new Set();for(let i=0;i<240;i++){step(1/60);states.add(val('E.state'));run('pf.pilot.inv=999;pf.pilot.hp=100')}
assert(['giu','su','mira','fuoco'].every(s=>states.has(s)),'Ciclo completo: '+[...states]);
assert(val('nShots')>0,'Il nemico al riparo spara');
// abbassato: un colpo orizzontale all'altezza della spalla passa sopra di lui o si ferma sul muretto
run('E.state="giu";E.st=99;E.up=0;E.h=24');
const hpBefore=val('E.hp');
run('const P=pf.pilot,sh=pfShoulder(P);pf.shots.push({x:E.wallX-60,y:E.y-30,px:E.wallX-60,py:E.y-30,vx:900,vy:0,life:1,friendly:true,r:3,dmg:1})');step(.2);
assert.equal(val('E.hp'),hpBefore,'Abbassato è protetto dal muretto');
run('E.state="fuoco";E.st=99;E.up=1;E.h=64;E.shots=99;pf.shots.push({x:E.wallX-60,y:E.y-52,px:E.wallX-60,py:E.y-52,vx:900,vy:0,life:1,friendly:true,r:3,dmg:1})');step(.1);
assert(val('E.hp')<hpBefore,'Alzato si può colpire');
run('gEnemy(E,1);pfDrawEnemy(E,1);pfDrawProp({x:500,y:600,kind:"jet_su"},1);pfDrawProp({x:500,y:600,kind:"jet_giu"},1)');
// superato: si gira e spara alle spalle
run('E.hp=E.max;E.state="giu";E.st=0;pf.pilot.x=E.x+120;nShots=0');step(1.2);
assert(val('E.face')===1&&val('nShots')>=3,'Superato, spara alle spalle');
console.log('PASS: nemico al riparo');

// 4) Boss: esplosione scenografica, rallentatore, musica che tace e poi vittoria
run('pf.enemies=[];pf.pilot.x=pf.arenaX+200;pf.pilot.y=PF_FLOOR;pf.pilot.inv=999;pf.pilot.hp=100;pfUpdateCamera(.016)');step(.1);
assert.equal(val('pf.phase'),'boss');step(3);
run('pfHitBoss(1e9)');assert.equal(val('pf.phase'),'vittoria');
step(.1);assert(val('pf.boom&&!pf.boss.gone'),'Esplosioni a catena prima dello scoppio');
assert.equal(val('musHush()'),true,'La musica tace durante le esplosioni');
run('const t0=pf.t;update(1/60);globalThis.slow=pf.t-t0');assert(val('slow')<1/60*.5,'Rallentatore');
run('drawPlatform();pfDrawBanner()');
step(3.2);assert(val('pf.boss.gone&&pf.boom.gone'),'Scoppio finale');
assert(val('pf.boom.debris.length>10&&pf.boom.rings.length>0'),'Rottami e onda d\'urto');
assert.equal(val('musHush()'),false);assert.equal(val('musTheme()'),'vittoria');assert.equal(val('musLevel()'),'boss');
assert(val('pf.crowd.length>0'),'I coloni escono');
run('drawPlatform();pfDrawBanner();pfDrawShipOnPad(1)');
step(6);assert.equal(val('state'),'platform','La scena dura abbastanza per godersi la vittoria');
step(3);assert.equal(val('state'),'won');
console.log('PASS: esplosione del boss e musica di vittoria');
