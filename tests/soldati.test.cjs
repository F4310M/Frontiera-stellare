// Soldati dalle immagini di Fabio (pilota e nemici) e bombardamento a tre missili (2026-11-08).

// Eseguire dalla cartella principale: node tests/soldati.test.cjs
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
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js','terra.js','battaglia.js','ingresso.js','godmode.js','i18n.js','facile.js','assalto.js','spirale.js','montaggio.js','speciale.js','soldati.js','bombardamento.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false');


// 1) i pezzi delle immagini esistono e le misure tornano
for(const tipo of ['pilota','nemico']){
 const T=val(`SOLD.tipi.${tipo}`);
 for(const n of Object.keys(T.parts))assert(fs.existsSync(path.join(dist,T.dir,n+'.png')),'manca '+tipo+'/'+n);
 assert(T.sh>40&&T.sh<60,'spalla del '+tipo+' all\'altezza del fucile: '+T.sh);
}
console.log('PASS: pezzi del pilota e del nemico');

// 2) cinematica delle gambe: da fermo la posa è quella dell'immagine, accovacciato il ginocchio si piega
run(`globalThis.G=SOLD.tipi.pilota.gamba.A;globalThis.R0=soldGamba(G,G.anca[0],G.anca[1],G.cav[0],G.cav[1]);globalThis.R1=soldGamba(G,G.anca[0],G.anca[1]+SOLD.crouchDrop,G.cav[0],G.cav[1])`);
assert(Math.abs(val('R0.a'))<.02&&Math.abs(val('R0.b'))<.02,'posa di base invariata');
assert(val('R1.a')<-.1&&val('R1.b')>.1,'accovacciato: coscia avanti, stinco indietro');
console.log('PASS: gambe');

// 3) disegno con le immagini pronte (contesto finto): pilota e nemico in tutte le pose, nessun errore
run(`soldReady.pilota=soldReady.nemico=true;for(const t of ['pilota','nemico'])for(const n in SOLD.tipi[t].parts)soldImg[t][n]={}`);
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
run(`const P=pf.pilot;for(const st of [{},{crouch:true},{ground:false,vy:-200},{ground:false,jetOn:true},{ground:true,vx:200,run:1.3}]){gTrooper(Object.assign({},P,st),PF_PILOT,1);gTrooper(Object.assign({},P,st,{face:-1,aim:2.5}),PF_REBEL,1)}drawPlatform()`);
const sh=val('pfShoulder(pf.pilot)'),P=val('({x:pf.pilot.x,y:pf.pilot.y})');
assert(P.y-sh.y>45,'i colpi partono dal fucile della nuova figura');
console.log('PASS: disegno dei soldati');

// 4) bombardamento: tre missili, tre esplosioni, nemici sullo schermo distrutti
run("pf.enemies=[];for(let i=0;i<4;i++)tOrig.pfSpawnEnemy('soldato',pf.cam.x+pfViewW()-80-i*70)");
const before=val('pf.kills');
assert.equal(val('spcUse()'),true);
step(3.4);assert.equal(val('spc.strike.missiles.length'),3,'tre missili lanciati');
assert.deepEqual(val('spc.strike.missiles.map(m=>Math.round((m.px-pf.cam.x)/pfViewW()*100))'),[12,50,88],'inizio, centro e fine dello schermo');
run('drawPlatform()');
step(1.6);
assert.equal(val('spc.strike?spc.strike.hits:3'),3,'tre esplosioni');
assert(val('pf.kills')>=before+4,'nemici distrutti');
step(6);assert.equal(val('spc.strike'),null,'il bombardamento finisce');
console.log('PASS: bombardamento a tre missili');

// 5) boss: in tutto 1/4 dell'energia
run('vite=3;viteSave();selected=0;startPlatform()');step(5);
run('pfEnterArena()');step(6.8);
run('pf.pilot.x=pf.boss.x-300;pf.pilot.y=PF_FLOOR;pf.pilot.ground=true;spc.ground=false;spcUse()');step(3.5);
const hp=val('pf.boss.hp'),max=val('pf.boss.max');
assert(Math.abs(hp-max*.75)<1,'i tre missili tolgono 1/4 al boss: '+hp+'/'+max);
console.log('PASS: missili sul boss');
