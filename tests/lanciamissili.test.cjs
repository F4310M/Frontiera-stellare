// Test fase a terra (2026-11-06): colpi alla testa e squadra col lanciamissili.
// Eseguire dalla cartella principale: node tests/lanciamissili.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},blur(){},addEventListener(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
let mapNodes=[];
function planetNode(){const cls=new Set(),n=node(),risk={textContent:''};n.classList={add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{(on===undefined?!cls.has(c):on)?cls.add(c):cls.delete(c)},has:c=>cls.has(c)};n.extra='';n.insertAdjacentHTML=(w,h)=>{n.extra+=h};n.querySelector=s=>s==='.risk'?risk:node();n.risk=risk;return n}
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(s){return s==='.planet-node'?mapNodes:[]},createElement(t){if(t==='button'){const b=planetNode();mapNodes.push(b);return b}return node()}}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
Object.defineProperty(sandbox.document.getElementById('starMap'),'innerHTML',{set(){mapNodes=[]},get(){return''}});
vm.createContext(sandbox);
// Carica tutti i file nell'ordine della pagina.
const order=[...fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>!/^https?:/.test(f));
for(const f of order){try{vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox)}catch(e){console.log('FAIL',f,e.message.slice(0,160))}}
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false');
run('vite=3;viteSave();selected=1;startPlatform()');step(5);
assert.equal(val('pf.phase'),'missione');

// 1) Colpo alla testa: un colpo che passa all'altezza del casco colpisce il soldato (a piedi e col jetpack)
const headShot=(setup)=>{
 run(`pf.enemies=[];pf.shots=[];pf.missiles=[];${setup};globalThis.E=pf.enemies[pf.enemies.length-1];E.fire=99;
  const P=pf.pilot;P.inv=99;
  const hy=E.y-60*1.0; // il casco disegnato è tra 55 e 70 px sopra i piedi
  pf.shots.push({x:E.x-60,y:hy,px:E.x-60,py:hy,vx:920,vy:0,life:1,friendly:true,r:3,dmg:1,power:0});
  globalThis.hp0=E.hp;pfUpdateShots(1/60);pfUpdateShots(1/60);pfUpdateShots(1/60);pfUpdateShots(1/60)`);
 return val('E.hp<hp0');
};
assert(headShot('pfSpawnEnemy("cecchino",pf.pilot.x+400,pfGroundAt(pf.pilot.x+400)??PF_FLOOR)'),'il colpo alla testa colpisce il soldato a terra');
assert(headShot('pfSpawnEnemy("jet",pf.pilot.x+400)'),'il colpo alla testa colpisce il soldato col jetpack');
// sopra la testa invece il colpo passa
run(`pf.enemies=[];pf.shots=[];pfSpawnEnemy("cecchino",pf.pilot.x+400,pfGroundAt(pf.pilot.x+400)??PF_FLOOR);globalThis.E=pf.enemies[0];const hy=E.y-95;pf.shots.push({x:E.x-60,y:hy,px:E.x-60,py:hy,vx:920,vy:0,life:1,friendly:true,r:3,dmg:1,power:0});globalThis.hp0=E.hp;for(let i=0;i<4;i++)pfUpdateShots(1/60)`);
assert.equal(val('E.hp'),val('hp0'),'sopra la testa il colpo passa');
// l'area del pilota non cambia
assert.equal(val('pfRect(pf.pilot).t'),val('pf.pilot.y-pf.pilot.h'));
console.log('PASS: colpi alla testa');

// 2) Squadra col lanciamissili
run(`pf.enemies=[];pf.shots=[];pf.missiles=[];pf.lmNextX=0;pf.rnd=()=>0.01;
 const x=pf.pilot.x+560;pfSpawnEnemy("soldato",x)`);
assert.equal(val('pf.enemies.filter(e=>e.lm).length'),2,'arrivano due soldati insieme');
assert(val('pf.enemies.some(e=>e.lm==="porta")&&pf.enemies.some(e=>e.lm==="mira")'),'uno porta il tubo, l\'altro mira');
run('pf.rnd=Math.random;globalThis.SQ=pf.enemies.find(e=>e.lm).sq;pf.pilot.inv=0;pf.pilot.hp=100;pf.pilot.barrier=false');
// tengono fermo il pilota: il razzo deve partire e colpirlo
let fired=false,maxSeen=0;
for(let i=0;i<60*6&&!fired;i++){run('pf.pilot.vx=0;keys={};mouse.down=false;pf.pilot.hp=100;update(1/60)');if(val('pf.missiles.some(m=>m.razzo)'))fired=true}
assert(fired,'la squadra spara un razzo (stato: '+val('SQ.state')+')');
assert(val('SQ.porta.crouch'),'chi porta il tubo è inginocchiato');
run('globalThis.R=pf.missiles.find(m=>m.razzo);globalThis.a0=R.angle');
run('for(let i=0;i<20;i++){pf.pilot.y-=0;update(1/60)}');
assert(val('R.hp<=0||Math.abs(R.angle-a0)<1e-9'),'il razzo va dritto, non insegue');
console.log('PASS: la squadra spara un razzo dritto');

// il razzo si schiva: il pilota si sposta in alto (salto) e il razzo passa sotto senza danni
run(`pf.missiles=[];pf.shots=[];const P=pf.pilot;P.hp=100;P.inv=0;
 pf.missiles.push({razzo:true,x:P.x+300,y:P.y-30,vx:-250,vy:0,angle:Math.PI,hp:1,life:4,t:0});
 globalThis.R=pf.missiles[pf.missiles.length-1];P.y-=140;P.vy=0`);
for(let i=0;i<60;i++)run('pf.pilot.vy=0;pf.pilot.y=Math.min(pf.pilot.y,(pfGroundAt(pf.pilot.x)??PF_FLOOR)-140);pfUpdateMissiles(1/60)');
assert.equal(val('pf.pilot.hp'),100,'saltando il razzo non colpisce');
// e colpisce se il pilota resta fermo
run(`pf.missiles=[];const P=pf.pilot;P.y=pfGroundAt(P.x)??PF_FLOOR;P.hp=100;P.inv=0;P.barrier=false;
 pf.missiles.push({razzo:true,x:P.x+200,y:P.y-30,vx:-250,vy:0,angle:Math.PI,hp:1,life:4,t:0})`);
for(let i=0;i<60;i++)run('pfUpdateMissiles(1/60)');
assert(val('pf.pilot.hp')<100,'fermo, il razzo colpisce');
// si può abbattere in volo
run(`pf.missiles=[];pf.shots=[];const P=pf.pilot;pf.missiles.push({razzo:true,x:P.x+300,y:P.y-30,vx:-250,vy:0,angle:Math.PI,hp:1,life:4,t:0});globalThis.R=pf.missiles[0];
 pf.shots.push({x:P.x+200,y:P.y-30,px:P.x+200,py:P.y-30,vx:920,vy:0,life:1,friendly:true,r:3,dmg:1,power:0});for(let i=0;i<6;i++)pfUpdateShots(1/60)`);
assert.equal(val('R.hp'),0,'il razzo si abbatte con un colpo');
console.log('PASS: il razzo si schiva e si abbatte');

// se uno dei due cade, l'altro torna un soldato normale
run('pfHitEnemy(SQ.mira,99);update(1/60)');
assert(val('SQ.porta.hp<=0||!SQ.porta.lm'),'il soldato rimasto lascia il tubo');
// disegno senza errori
run('pf.enemies=[];pf.lmNextX=0;pf.rnd=()=>0.01;pfSpawnEnemy("soldato",pf.pilot.x+500);pf.rnd=Math.random;for(const e of pf.enemies){gEnemy(e,1);pfDrawEnemy(e,1)};drawPlatform()');
// le squadre compaiono anche da sole lungo il percorso
run('pf.enemies=[];pf.lmNextX=0;globalThis.cnt=0;for(let i=0;i<40;i++){pf.enemies=pf.enemies.filter(e=>!e.lm);pf.lmNextX=0;pfSpawnEnemy("soldato",pf.pilot.x+500);if(pf.enemies.some(e=>e.lm))cnt++}');
assert(val('cnt')>3&&val('cnt')<40,'solo alcuni arrivi sono squadre: '+val('cnt'));
console.log('PASS: squadra col lanciamissili');
