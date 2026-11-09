// Boss dalle immagini di Fabio (dist/boss-immagini.js): millepiedi su LYRA, scorpione su VESPER, sfera su NIMBUS, vespa su KHEPRI.
// Eseguire dalla cartella principale: node tests/boss-immagini.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};const drawn=[];
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});if(k==='drawImage')return im=>drawn.push(im&&im.src);return()=>{}},set(t,k,v){t[k]=v;return true}});
const images=[];class FakeImage{constructor(){images.push(this);this.naturalWidth=100;this.naturalHeight=50}set src(v){this._src=v}get src(){return this._src}}
const sandbox={console,Math,Image:FakeImage,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','i18n.js','boss-immagini.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');

assert.equal(images.length,26,'millepiedi (2), scorpione (9), sfera, vespa (7), drago (7)');
for(const im of images)assert(fs.existsSync(path.join(dist,im.src)),'manca '+im.src);
assert.equal(val('pfBossInfo(planets[0]).id'),'mare');assert.equal(val('pfBossInfo(planets[2]).id'),'tempesta');
assert.equal(val('planets[0].name'),'LYRA');assert.equal(val('planets[1].name'),'VESPER');assert.equal(val('pfBossInfo(planets[1]).id'),'deserto');assert.equal(val('planets[2].name'),'NIMBUS');assert.equal(val('planets[3].name'),'KHEPRI');assert.equal(val('pfBossInfo(planets[3]).id'),'foresta');
const B=k=>`{x:0,y:0,face:-1,aim:Math.PI,legT:1,state:S,t:T,hp:1,max:2,hit:0,rage:false,kind:"${k}",charge:0,shots:1}`;
// senza immagini: disegno di prima
drawn.length=0;run(`const S="pausa",T=0;bDrawBody(ctx,${B('mare')},1);bDrawBody(ctx,${B('tempesta')},1);bDrawBody(ctx,${B('foresta')},1);bDrawBody(ctx,${B('deserto')},1);bDrawBody(ctx,${B('lava')},1)`);assert.equal(drawn.length,0);
images.forEach(im=>im.onload());
for(const k of ['mare','deserto','tempesta','foresta','lava'])for(const st of ['pausa','passi','raffica','carica','onda','stordito','ruggito','distrutto'])for(const t of [0,.5,1.2]){
 drawn.length=0;run(`const S="${st}",T=${t};bDrawBody(ctx,${B(k)},1)`);assert(drawn.length>=({mare:40,deserto:9,tempesta:1,foresta:7,lava:7})[k],`${k} ${st}`);
}
console.log('PASS: disegni');
assert.equal(val('PF_BOSS.foresta.gun.len'),Math.round(Math.hypot(532,465)*.19),'il pungiglione della vespa');
// i colpi partono dal pungiglione e dall'occhio
assert.deepEqual(JSON.parse(val('JSON.stringify(PF_BOSS.deserto.gun)')),{x:32,y:124,len:4});
assert.equal(val('PF_BOSS.tempesta.gun.y'),128);
run("setLang('en')");assert.equal(val("tr('MILLEPIEDI CORAZZATO DEL FRONTE OMBRA')"),'ARMORED CENTIPEDE OF THE SHADOW FRONT');
assert.equal(val('PF_BOSS.mare.w'),380);assert.equal(val('pfBossInfo(planets[4]).id'),'lava');assert.equal(val('planets[4].name'),'UMBRA');
console.log('boss-immagini.test: ok');
// i boss lunghi restano nello schermo e la carica finisce contro il bordo
run('abort();vite=3;selected=0;startPlatform()');for(let i=0;i<210;i++)run('update(1/60)');
run('pf.phase="missione";pfEnterArena();pf.boss.y=PF_FLOOR;pf.boss.vy=0;pf.boss.x=pf.cam.lockX+5000;pfBossSet(pf.boss,"carica",.9);pf.boss.shots=1;pf.boss.face=1;pfUpdateBoss(1/60)');
assert(val('pf.boss.x<=pf.cam.lockX+Math.min(pfViewW(),1500)-70-155+.01'));assert.equal(val('pf.boss.state'),'stordito');
console.log('PASS: boss lunghi nello schermo');

// UMBRA: il drago vola durante la raffica, sputa colpi di fuoco dalla bocca e a riposo torna a terra.
run('abort();vite=3;selected=4;startPlatform()');for(let i=0;i<210;i++)run('update(1/60)');
run('pf.phase="missione";pfEnterArena();pf.pilot.inv=999;pf.boss.y=PF_FLOOR;pf.boss.vy=0;pfBossSet(pf.boss,"raffica")');
for(let i=0;i<60;i++)run('pfUpdateBoss(1/60)');
assert(val('pf.boss.y<PF_FLOOR-20'),'il drago vola durante l attacco');assert(val('pf.shots.some(s=>s.fire)'),'il drago spara fuoco dalla bocca');
run('pfBossSet(pf.boss,"stordito")');for(let i=0;i<55;i++)run('pfUpdateBoss(1/60)');
assert.equal(Math.round(val('pf.boss.y')),val('PF_FLOOR'),'da fermo appoggia le zampe a terra');
console.log('PASS: drago di UMBRA in volo, fuoco e appoggio a terra');
