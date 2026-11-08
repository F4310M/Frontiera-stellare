// Boss finale col robot di Fabio (dist/boss-robot.js): pezzi dell'immagine, mira del cannone, attacco ARTIGLIO.
// Eseguire dalla cartella principale: node tests/boss-robot.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};const drawn=[];
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});if(k==='drawImage')return im=>drawn.push(im&&im.src);return()=>{}},set(t,k,v){t[k]=v;return true}});
const images=[];class FakeImage{constructor(){images.push(this)}set src(v){this._src=v}get src(){return this._src}}
const sandbox={console,Math,Image:FakeImage,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','i18n.js','boss-robot.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');

// Pezzi dell'immagine: esistono tutti su disco
assert.equal(images.length,5,'cinque pezzi caricati');
for(const im of images)assert(fs.existsSync(path.join(dist,im.src)),'manca '+im.src);
assert.equal(val('BOSS_DRAW.omega'),val('bRobot'));
// Finché le immagini non sono pronte resta il disegno vecchio
drawn.length=0;run('bDrawBody(ctx,{x:0,y:0,face:1,aim:0,legT:0,state:"pausa",t:0,hp:1,max:1,hit:0,rage:false,kind:"omega",charge:0,shots:0},1)');
assert.equal(drawn.length,0,'senza immagini usa bOmega');
images.forEach(im=>im.onload());assert(val('rbReady'));
console.log('PASS: immagini del robot');

// Ogni stato si disegna con i pezzi
for(const st of ['pausa','passi','raffica','carica','artiglio','onda','missili','stordito','ruggito','distrutto'])for(const t of [0,.3,.7,1.1]){
 drawn.length=0;run(`bDrawBody(ctx,{x:0,y:0,face:-1,aim:Math.PI,legT:1,state:"${st}",t:${t},hp:1,max:2,hit:0,rage:${t>1},kind:"omega",charge:0,shots:${st==='raffica'?1:st==='onda'?2:0},rbLand:0},1)`);
 assert(drawn.length>=5,`stato ${st}: disegna tutti i pezzi`);
}
console.log('PASS: animazioni');

// Cannone: la bocca calcolata dal gioco coincide col disegno
const gun=val('PF_BOSS.omega.gun');assert.equal(gun.x,80);assert.equal(gun.y,134);assert.equal(gun.len,115);
assert.equal(val('PF_BOSS.omega.h'),230);

// Attacco ARTIGLIO quando il pilota è vicino
const fi=val('planets.push(FINAL_PLANET),planets.indexOf(FINAL_PLANET)');
run(`abort();vite=3;selected=${fi};startPlatform()`);for(let i=0;i<210;i++)run('update(1/60)');
run('pf.phase="missione";pfEnterArena();pf.boss.y=PF_FLOOR;pf.boss.vy=0;pfBossSet(pf.boss,"pausa",2);Object.assign(pf.pilot,{x:pf.boss.x-130,y:PF_FLOOR,hp:100,visible:true,vx:0,vy:0})');
run('pfUpdateBoss(1/60)');assert.equal(val('pf.boss.state'),'artiglio','pilota vicino: artiglio');
assert.equal(val('pf.boss.face'),-1);
let hp0=val('pf.pilot.hp');
for(let i=0;i<90&&val('pf.boss.state')==='artiglio';i++)run('pf.pilot.x=pf.boss.x-130;pf.pilot.y=PF_FLOOR;pfUpdateBoss(1/60)');
assert(val('pf.pilot.hp')<hp0,'l\'artiglio ferisce');assert(val('pf.pilot.vx')<0,'e spinge via il pilota');
assert.equal(val('pf.boss.state'),'pausa','poi torna in pausa');
// lontano: niente artiglio
run('pfBossSet(pf.boss,"pausa",2);pf.boss.last="";pf.pilot.x=pf.boss.x-600;pfUpdateBoss(1/60)');
assert.notEqual(val('pf.boss.state'),'artiglio');
console.log('PASS: attacco artiglio');
run("setLang('en')");assert.equal(val("tr('ARTIGLIO · ALLONTANATI!')"),'CLAW STRIKE · GET BACK!');
console.log('boss-robot.test: ok');
