// Test zoom della missione a terra su smartphone (dist/zoom-terra.js).
// Eseguire dalla cartella principale: node tests/zoom-terra.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={},gradient={addColorStop(){}},calls=[];
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return(...a)=>{if(k==='scale'||k==='translate')calls.push([k,...a])}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:844,innerHeight:390,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','terra.js','battaglia.js','mobile.js','zoom-terra.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false;vite=3;viteSave();selected=0;W=844;H=390;startPlatform()');

// 1) PC (niente touch): nessun ingrandimento
assert.equal(val('ztZoom()'),1,'Senza touch la scena resta uguale');
run('drawPlatform()');assert.equal(val('zt.z'),1);

// 2) Telefono in orizzontale: la scena viene ingrandita, ma non oltre il massimo
run('touch.on=true');
const z=val('ztZoom()');assert(z>1.3&&z<=val('ZT.max'),'Sul telefono la scena è ingrandita ('+z+')');
calls.length=0;run('drawPlatform()');
assert(calls.some(c=>c[0]==='scale'&&Math.abs(c[1]-z)<1e-9),'Il disegno usa lo zoom');
assert(val('zt.fx>=0&&zt.fx<=W&&zt.fy>=0&&zt.fy<=H'),'Il punto fisso resta nello schermo: niente bordi vuoti');

// 3) Il pilota resta dentro lo schermo ingrandito
const p=val('(()=>{const P=pf.pilot,s=pfScale();return ztToScreen((P.x-pf.cam.x)*s,(P.y-30)*s)})()');
assert(p.x>=0&&p.x<=844&&p.y>=0&&p.y<=390,'Il pilota si vede: '+JSON.stringify(p));
assert.deepEqual(val('JSON.stringify(ztFromScreen(ztToScreen(100,200).x,ztToScreen(100,200).y))'),JSON.stringify({x:100,y:200}));

// 4) Tablet o schermo alto: niente zoom
run('H=820;W=1180');assert.equal(val('ztZoom()'),1,'Su schermi alti non serve lo zoom');
console.log('PASS: zoom della missione a terra solo su smartphone');
