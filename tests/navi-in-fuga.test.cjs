// Navi nemiche in fuga dopo il boss (2026-11-08).
// Eseguire dalla cartella principale: node tests/navi-in-fuga.test.cjs
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
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js','terra.js','battaglia.js','ingresso.js','godmode.js','i18n.js','facile.js','assalto.js','spirale.js','montaggio.js','speciale.js','soldati.js','bombardamento.js','navi-in-fuga.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false');


// 1) caricato dopo classifica.js e prima di vetrina.js
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('navi-in-fuga.js')>html.indexOf('classifica.js')&&html.indexOf('navi-in-fuga.js')<html.indexOf('vetrina.js'),'ordine degli script');
console.log('PASS: script caricato');

// 2) boss distrutto: nessun soldato in fuga, parte la flotta nemica
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
run('pfEnterArena()');step(6.8);
run('pf.pilot.x=pf.boss.x-500;pf.pilot.y=PF_FLOOR;pf.pilot.ground=true;pf.enemies=[]');
run('pfHitBoss(1e9)');assert.equal(val('pf.phase'),'vittoria');
step(4);
assert(val('pf.boss.gone'),'il boss è esploso');
assert(val('pf.crowd.length>0'),'i coloni escono come prima');
assert(val('pf.crowd.length<=11'),'folla ridotta per mantenere fluida la scena');
assert.equal(val("pf.enemies.filter(e=>e.hp>0&&e.type==='soldato').length"),0,'nessun soldato che scappa');
assert(val('!!pf.naviFuga&&pf.naviFuga.ships.length>=4'),'la flotta nemica fugge');
assert(val('NF.trail<=8&&NF.smokeRate<=18'),'scie e fumo alleggeriti');
run('drawPlatform()');
assert(val('pf.naviFuga.ships.some(S=>S.t>0&&S.x>-50&&S.y<520)'),'navi visibili in volo');
console.log('PASS: flotta in fuga al posto dei soldati');

// 3) le navi escono dallo schermo e la missione si chiude
step(8);
assert(val('!pf||!pf.naviFuga||pf.naviFuga.ships.every(S=>S.gone)'),'le navi sono andate via');
assert.notEqual(val('state'),'platform','missione conclusa');
console.log('PASS: navi uscite e vittoria');
