// Boss dalle immagini di Fabio (dist/boss-immagini.js): scorpione su LYRA, sfera su NIMBUS.
// Eseguire dalla cartella principale: node tests/boss-immagini.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};const drawn=[];
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});if(k==='drawImage')return im=>drawn.push(im&&im.src);return()=>{}},set(t,k,v){t[k]=v;return true}});
const images=[];class FakeImage{constructor(){images.push(this)}set src(v){this._src=v}get src(){return this._src}}
const sandbox={console,Math,Image:FakeImage,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','i18n.js','boss-immagini.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');

assert.equal(images.length,8,'4 pezzi dello scorpione, la sfera, 3 pezzi della vespa');
for(const im of images)assert(fs.existsSync(path.join(dist,im.src)),'manca '+im.src);
assert.equal(val('pfBossInfo(planets[0]).id'),'mare');assert.equal(val('pfBossInfo(planets[2]).id'),'tempesta');
assert.equal(val('planets[0].name'),'LYRA');assert.equal(val('planets[2].name'),'NIMBUS');assert.equal(val('planets[3].name'),'KHEPRI');assert.equal(val('pfBossInfo(planets[3]).id'),'foresta');
const B=k=>`{x:0,y:0,face:-1,aim:Math.PI,legT:1,state:S,t:T,hp:1,max:2,hit:0,rage:false,kind:"${k}",charge:0,shots:1}`;
// senza immagini: disegno di prima
drawn.length=0;run(`const S="pausa",T=0;bDrawBody(ctx,${B('mare')},1);bDrawBody(ctx,${B('tempesta')},1);bDrawBody(ctx,${B('foresta')},1)`);assert.equal(drawn.length,0);
images.forEach(im=>im.onload());
for(const k of ['mare','tempesta','foresta'])for(const st of ['pausa','passi','raffica','carica','onda','stordito','ruggito','distrutto'])for(const t of [0,.5,1.2]){
 drawn.length=0;run(`const S="${st}",T=${t};bDrawBody(ctx,${B(k)},1)`);assert(drawn.length>=({mare:4,tempesta:1,foresta:4})[k],`${k} ${st}`);
}
console.log('PASS: disegni');
assert.equal(val('PF_BOSS.foresta.gun.len'),Math.round(Math.hypot(532,465)*.19),'il pungiglione della vespa');
// i colpi partono dal pungiglione e dall'occhio
assert.deepEqual(JSON.parse(val('JSON.stringify(PF_BOSS.mare.gun)')),{x:32,y:124,len:4});
assert.equal(val('PF_BOSS.tempesta.gun.y'),128);
run("setLang('en')");assert.equal(val("tr('SCORPIONE CORAZZATO DEL FRONTE OMBRA')"),'ARMORED SCORPION OF THE SHADOW FRONT');
console.log('boss-immagini.test: ok');
