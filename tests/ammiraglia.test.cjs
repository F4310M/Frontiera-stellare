// Nave ammiraglia nemica dettagliata e generatori di barriera con lo stesso scafo (dist/ammiraglia.js).
// Eseguire dalla cartella principale: node tests/ammiraglia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},insertBefore(){},removeAttribute(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};let shadowSets=0;
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){if(k==='shadowBlur'&&v>0)shadowSets++;t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},encodeURIComponent,
 document:{body:node(),head:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','assalto.js','buchineri.js','vite.js','barriere.js','ammiraglia.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false;godMode=false;ctx.getTransform=undefined;BARR.groundCount=[0,0]');

const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('ammiraglia.js')>html.indexOf('barriere.js')&&html.indexOf('ammiraglia.js')>html.indexOf('buchineri.js'),'ammiraglia.js dopo barriere.js');

run('selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];SP.bigTimer=1e9;spSpawnBig()');
assert(val('SP.big&&SP.big.big'),'ammiraglia creata');
shadowSets=0;
run('for(let i=0;i<5;i++){SP.big.hp=SP.big.maxHp*(1-i*.2);drawEnemy(SP.big)}');
assert.equal(shadowSets,0,'niente shadowBlur a ogni fotogramma');
assert(Array.isArray(val('SP.big.ammTur')),'torrette che puntano il giocatore');
console.log('PASS: ammiraglia dettagliata');

run('BAR.sp.along=0;barSpSpawn(BAR.sp,0)');
assert.equal(val('BAR.sp.gens.length'),2,'due generatori');
assert(val('BAR.sp.gens.every(e=>e.gen&&e.r===AMM.genR)'),'generatori grandi come lo scafo');
shadowSets=0;run('for(const e of BAR.sp.gens)drawEnemy(e)');
assert.equal(shadowSets,0,'generatori senza shadowBlur');
console.log('PASS: generatori di barriera con lo scafo dell\'ammiraglia');
