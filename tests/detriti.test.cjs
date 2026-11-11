// Test detriti.js: rottami HD dopo l'esplosione del boss (forme pronte, calore, scintille, niente shadowBlur/filter).
// Eseguire dalla cartella principale: node tests/detriti.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
let drawImages=0,strokeRects=0;fakeCtx.drawImage=()=>{drawImages++};fakeCtx.strokeRect=()=>{strokeRects++};
fakeCtx.getImageData=fakeCtx.createImageData=(a,b,w,h)=>{w=w||a||1;h=h||b||1;return{data:new Uint8ClampedArray(w*h*4),width:w,height:h}};
sandbox.document.createElement=()=>Object.assign(node(),{getContext:()=>fakeCtx,width:0,height:0});
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','battaglia.js','detriti.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');
const src=fs.readFileSync('dist/detriti.js','utf8').replace(/\/\/.*$/gm,'');
assert(!/shadowBlur|\.filter\s*=/.test(src),'Niente shadowBlur o ctx.filter');
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
run('pf.enemies=[];pf.pilot.x=pf.arenaX+200;pf.pilot.y=PF_FLOOR;pf.pilot.inv=999;pf.pilot.hp=100;pfUpdateCamera(.016)');step(3.2);
run('pfHitBoss(1e9)');step(3.4);
assert(val('pf.boss.gone&&pf.boom.gone'),'Scoppio finale');
assert(val('pf.boom.debris.length>10'),'Rottami presenti');
assert(val('pf.boom.debris.every(d=>d.det&&d.spr>=0&&d.spr<DET.sprites&&d.heat>=0)'),'Ogni rottame ha forma e calore');
drawImages=0;strokeRects=0;run('battDrawBoom(1)');
assert(drawImages>=val('pf.boom.debris.length'),'I rottami sono disegnati con immagini pronte');
assert.equal(strokeRects,0,'Niente più rettangoli con il bordo');
run('drawPlatform();pfDrawBanner()');
step(.8);assert(val('(pf.boom.spk||[]).length>0'),'Scintille ai rimbalzi');
step(3);assert(val('pf.boom.debris.length===0||pf.boom.debris.every(d=>d.heat<.6)'),'I pezzi si raffreddano');
assert(val('pf.boom.spk.length<=DET.sparkMax'),'Scintille limitate');
console.log('PASS: rottami HD dopo l\'esplosione');
