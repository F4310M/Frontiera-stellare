// Test fase a terra (2026-11-06): colpi alla testa e lanciamissili individuale.
// Eseguire dalla cartella principale: node tests/lanciamissili.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},blur(){},addEventListener(){}}}
const handlers={};const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
let mapNodes=[];
function planetNode(){const cls=new Set(),n=node(),risk={textContent:''};n.classList={add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{(on===undefined?!cls.has(c):on)?cls.add(c):cls.delete(c)},has:c=>cls.has(c)};n.extra='';n.insertAdjacentHTML=(w,h)=>{n.extra+=h};n.querySelector=s=>s==='.risk'?risk:node();n.risk=risk;return n}
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(type,fn){(handlers[type]??=[]).push(fn)},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(s){return s==='.planet-node'?mapNodes:[]},createElement(t){if(t==='button'){const b=planetNode();mapNodes.push(b);return b}return node()}}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
Object.defineProperty(sandbox.document.getElementById('starMap'),'innerHTML',{set(){mapNodes=[]},get(){return''}});
sandbox.fireClick=(x,y)=>{for(const fn of handlers.mousedown)fn({button:0,clientX:x,clientY:y,target:nodes.get('game')})};
vm.createContext(sandbox);
// Carica tutti i file nell'ordine della pagina.
const order=[...fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>!/^https?:/.test(f));
for(const src of order){const f=src.split('?')[0];vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox,{filename:f})}
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

// 2) Un lanciamissili avversario, con lancio verticale e inseguimento.
run(`pf.enemies=[];pf.shots=[];pf.missiles=[];pf.lmNextX=0;pf.rnd=()=>0.01;
 pfSpawnEnemy("soldato",pf.pilot.x+560)`);
assert.equal(val('pf.enemies.filter(e=>e.lm).length'),1,'Un solo soldato porta il lanciamissili');
run('pf.rnd=Math.random;globalThis.L=pf.enemies.find(e=>e.lm);pf.pilot.inv=0;pf.pilot.hp=100;pf.pilot.barrier=false');
for(let i=0;i<360&&!val('pf.missiles.some(m=>m.razzo)');i++)step(1/60);
assert(val('pf.missiles.some(m=>m.razzo)'),'Il soldato spara');
assert(val('L.crouch'),'Il lanciatore si inginocchia');
run('globalThis.R=pf.missiles.find(m=>m.razzo);globalThis.y0=R.y;globalThis.x0=R.x;for(let i=0;i<18;i++)pfUpdateMissiles(1/60)');
assert(val('R.hp>0&&R.y<y0-60&&Math.abs(R.x-x0)<.01'),'Il razzo sale in verticale');
run('for(let i=0;i<41;i++)pfUpdateMissiles(1/60)');
assert(val('R.hp>0&&R.vx<0&&R.vy>0'),'Dopo la salita il razzo vira e scende verso il pilota');
run('pf.pilot.x=R.x+100;pf.pilot.y=R.y+95;globalThis.prevAngle=R.angle;for(let i=0;i<10;i++)pfUpdateMissiles(1/60)');
assert(val('R.angle!==prevAngle'),'Il razzo corregge la traiettoria quando il pilota si sposta');
console.log('PASS: lanciatore singolo, salita verticale e inseguimento');

// Il laser può intercettare il razzo.
run(`pf.missiles=[];pf.shots=[];const P=pf.pilot;pf.missiles.push({razzo:true,x:P.x+300,y:P.y-30,vx:-250,vy:0,angle:Math.PI,hp:1,life:4,t:1});globalThis.R=pf.missiles[0];
 pf.shots.push({x:P.x+200,y:P.y-30,px:P.x+200,py:P.y-30,vx:920,vy:0,life:1,friendly:true,r:3,dmg:1,power:0});for(let i=0;i<6;i++)pfUpdateShots(1/60)`);
assert.equal(val('R.hp'),0,'Il razzo si abbatte con un colpo');
run('gEnemy(L,1);pfDrawEnemy(L,1)');

// 3) Un colpo per pressione, anche con due pressioni ravvicinate.
run('pf.enemies=[];pf.shots=[];pf.missiles=[];pf.pilot.hp=100;pf.pilot.y=pfGroundAt(pf.pilot.x)??PF_FLOOR;fireClick(900,430);fireClick(900,430)');
assert.equal(val('pf.shots.filter(s=>s.friendly).length'),2,'Ogni pressione spara una volta');
run('pf.shots=[];mouse.down=true;for(let i=0;i<22;i++)pfUpdatePilot(1/60);mouse.down=false');
assert.equal(val('pf.shots.length'),0,'Tenere premuto non spara altri colpi');
run('touchPress("fire")');
assert.equal(val('pf.shots.filter(s=>s.friendly).length'),1,'Un tocco sul pulsante fuoco spara una volta');

// 4) Il contatto con il lanciatore ferisce come con gli altri soldati.
run('pf.pilot.hp=100;pf.pilot.inv=0;pf.pilot.contactCd=0;pf.pilot.barrier=false;L.x=pf.pilot.x+3;L.y=pf.pilot.y;pf.enemies=[L];pfUpdateEnemies(1/60)');
assert(val('pf.pilot.hp<100&&pf.pilot.hp>=92'),'La collisione toglie poca energia');
console.log('PASS: colpo singolo per pressione e danno da contatto');
