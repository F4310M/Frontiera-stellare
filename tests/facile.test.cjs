// Difficoltà più bassa (2026-11-03): meno danni a nave e pilota, nemici che sparano meno spesso, boss con meno salute.
// Eseguire dalla cartella principale: node tests/facile.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
// Ogni pulsante pianeta creato da initMap finisce in mapNodes.
let mapNodes=[];
function planetNode(){const cls=new Set(),n=node(),risk={textContent:''};n.classList={add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{(on===undefined?!cls.has(c):on)?cls.add(c):cls.delete(c)},has:c=>cls.has(c)};n.extra='';n.insertAdjacentHTML=(w,h)=>{n.extra+=h};n.querySelector=s=>s==='.risk'?risk:node();n.risk=risk;return n}
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(s){return s==='.planet-node'?mapNodes:[]},createElement(t){if(t==='button'){const b=planetNode();mapNodes.push(b);return b}return node()}}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
Object.defineProperty(sandbox.document.getElementById('starMap'),'innerHTML',{set(){mapNodes=[]},get(){return''}});
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','home.js','finale.js','musica.js','classifica.js','mappa.js','terra.js','battaglia.js','godmode.js','i18n.js','facile.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

const near=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;

// 1) Spazio: un colpo da 10 toglie 6, il meteorite grande 45 invece di 75
run("startGame();paused=false;enemies=[];rocks=[];wrecks=[];monsters=[];Object.assign(player,{health:100,inv:0,shield:0,barrier:false})");
run('damage(10)');assert.equal(val('player.health'),94,'colpo nemico: 10 → 6');
run("player.inv=0;player.health=100;damage(75,true)");assert.equal(val('player.health'),55,'meteorite grande: 75 → 45');
console.log('PASS: la nave subisce il 60% dei danni');

// 2) Il messaggio del meteorite mostra il danno vero, anche tradotto
run("status('IMPATTO METEORITE · SCAFO −75%')");
assert.equal(val("$('statusText').textContent"),'IMPATTO METEORITE · SCAFO −45%');
run("status('IMPATTO METEORITE · SCAFO −16%')");
assert.equal(val("$('statusText').textContent"),'IMPATTO METEORITE · SCAFO −10%');
assert(val("I18N_ROWS.some(r=>r[0]==='IMPATTO METEORITE · SCAFO −45%'&&r[1]==='METEOR IMPACT · HULL −45%')"),'riga tradotta per −45%');
console.log('PASS: messaggi dei meteoriti con il danno vero');

// 3) A terra: il danno dei colpi è ridotto, cadere resta fatale.
run('godMode=false;vite=3;viteSave();selected=0;startPlatform()');step(4.6);
run('Object.assign(pf.pilot,{hp:100,inv:0,barrier:false,visible:true});pfDamage(20)');
assert.equal(val('pf.pilot.hp'),88,'colpo a terra: 20 → 12');
run('Object.assign(pf.pilot,{hp:100,inv:0,y:PF_VH});pfFell()');
assert.equal(val('pf.lives'),2,'Una caduta consuma una vita anche con i danni ridotti');
console.log('PASS: il pilota subisce il 60% dei danni');

// 4) Boss con l'80% della salute
const exp=val('Math.round(Math.round((130+pf.p.difficulty*35)*pfBossInfo(pf.p).hp)*FACILE.saluteBoss)');
run('pfSpawnBoss()');
assert.equal(val('pf.boss.max'),exp);assert.equal(val('pf.boss.hp'),exp);
console.log('PASS: boss con meno salute ('+exp+')');

// 5) I nemici ricaricano il 35% più lentamente
run('globalThis.E={fire:.01};fcRicarica([E]);E.fire=1.5;fcRicarica([E])');
assert(near(val('E.fire'),.01+1.49*1.35),'ricarica allungata: '+val('E.fire'));
run('E.fire-=.016;fcRicarica([E])');assert(near(val('E.fire'),.01+1.49*1.35-.016),'il timer che scende non cambia');
// in partita: un nemico dello spazio che ha appena sparato aspetta più a lungo
run("startGame();paused=false;enemies=[];rocks=[];wrecks=[];monsters=[];spawnEnemy(player.x+250,player.y,false);enemies[0].x=player.x+250;enemies[0].y=player.y;enemies[0].fire=.001;fcRicarica(enemies);update(1/60)");
assert(val('enemies[0].fire')>1.5*1.35-.05,'dopo il colpo il nemico aspetta di più: '+val('enemies[0].fire'));
console.log('PASS: nemici più lenti a sparare');

// 6) Con GOD MODE la nave resta comunque intatta
run("godMode=true;startGame();paused=false;Object.assign(player,{health:100,inv:0,shield:0});damage(50)");
assert.equal(val('player.health'),100);run('godMode=false');
console.log('PASS: GOD MODE funziona ancora');
