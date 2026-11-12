// 2026-11-12 (Fabio): bilanciamento di fine campagna (bilancio.js), video della battaglia finale e della
// liberazione con nuova campagna più difficile (finale-galassia.js), % di gioco della classifica mondiale
// aggiornata anche quando i punti non salgono (classifica-personale.js).
// Eseguire dalla cartella principale: node tests/finale-galassia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const noop=()=>{};

// ---------------------------------------------------------------- 1) gioco intero (index.html) con DOM finto
const nodes=new Map();
function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},
 querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},insertBefore(){},setAttribute(){},removeAttribute(){},addEventListener(){},insertAdjacentHTML(){},focus(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sb={console:{log(){},warn(){},error:console.error},Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,
 localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}},
 performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener(){},
 document:{body:node(),head:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(){return[]},createElement:node}};
sb.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sb);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(f=>fs.existsSync(path.join(dist,f))&&!/^caricamento/.test(f));
assert(files.indexOf('bilancio.js')>files.indexOf('mercato-plus.js'),'bilancio.js dopo mercato-plus.js');
assert(files.indexOf('finale-galassia.js')>files.indexOf('bilancio.js')&&files.indexOf('finale-galassia.js')<files.indexOf('storia.js'),'finale-galassia.js dopo bilancio.js, prima di storia.js');
for(const f of files)try{vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sb,{filename:f})}catch(e){if(f!=='classifica-pagina.js')throw e}
const run=s=>vm.runInContext('{'+s+'\n}',sb),val=s=>vm.runInContext(s,sb);
run("soundEnabled=false;godMode=false;lang='it';i18nBuild()");

// economia: premi a metà, potenziamenti ×2,2 => a fine storia ~40-50% dei potenziamenti
const tot=val('ECO_ITEMS.reduce((a,it)=>a+it.prices.reduce((x,y)=>x+y,0),0)');
assert.equal(val("ECO_ITEMS.find(i=>i.id==='laser').prices[0]"),2650,'laser 1 = 1.200×2,2');
assert.equal(val("ECO_ITEMS.find(i=>i.id==='jetpack').prices[0]"),1650,'anche il JETPACK di mercato-plus.js');
assert.equal(val("planets[0].reward"),'750 CR');assert.equal(val("FINAL_PLANET.reward"),'10.000 CR');
assert.equal(val('ecoHostageBonus({difficulty:3})'),300);assert.equal(val('ECO_BOUNTY[1]'),8);
// guadagno stimato di una campagna: premi + ostaggi (4+⌊d/2⌋ coloni) + ~60 nemici a fase + 1.000 iniziali - ~500 di consumi a fase
const premi=val("planets.filter(p=>!p.final).concat([FINAL_PLANET]).reduce((a,p)=>a+ecoPlanetReward(p)+(4+Math.floor(p.difficulty/2))*ecoHostageBonus(p),0)");
const stima=1000+premi+6*60*(8+12)-12*500;
assert(stima/tot>.4&&stima/tot<.55,'a fine storia si compra il 40-50% dei potenziamenti ('+Math.round(stima/tot*100)+'%)');
console.log('PASS: economia ('+Math.round(stima/tot*100)+'% dei potenziamenti a fine storia)');

// nemici più duri con laser e barriera potenziati, e a ogni campagna rigiocata
assert(Math.abs(val('bilHpK()')-1.15)<1e-9);
run("eco.upgrades={laser:3,twin:1,shield:2}");
assert(Math.abs(val('bilHpK()')-(1.15+.9+.3))<1e-9,'salute nemici con laser 3 + doppio laser');
assert(Math.abs(val('bilDmgK()')-(1.15+.44))<1e-9,'danni nemici con barriera 2');
store.stellarCiclo=JSON.stringify({n:3,f:0});
assert(Math.abs(val('bilHpK()')-(2.35*1.6))<1e-9,'campagna ×3: +60% di salute');
store.stellarCiclo=JSON.stringify({n:1,f:0});run('eco.upgrades={}');
run(`selected=4;startGame();arrivalRemaining=0;enemies=[];spawnEnemy(player.x+600,player.y,false)`);
const e0=val('enemies[0].hp');
run("eco.upgrades={laser:2};enemies=[];spawnEnemy(player.x+600,player.y,false)");
assert(val('enemies[0].hp')>e0,'con il laser potenziato i nemici hanno più salute');
// i danni alla nave crescono con la barriera
run("eco.upgrades={};player.inv=0;player.health=100;player.shield=0;state='play';damage(10);globalThis.h0=100-player.health");
run("eco.upgrades={shield:3};player.inv=0;player.health=100;player.shield=0;damage(10);globalThis.h1=100-player.health");
assert(val('h1>h0'),'barriera potenziata: i colpi nemici fanno più danno');
run('eco.upgrades={}');
console.log('PASS: nemici più resistenti e armi più forti');

// più navi ammiraglie negli ultimi pianeti
assert.deepEqual([1,2,3,4,5,7].map(d=>val(`BIL.ammiraglie(${d})`)),[1,1,2,2,3,4]);
run(`selected=4;startGame();arrivalRemaining=0;enemies=[];SP.big=null;SP.bigTimer=0;spUpdate(1/60)`);
assert(val('!!SP.big'),'arriva la prima nave da guerra');
run('BIL.ammTimer=0;spUpdate(1/60);BIL.ammTimer=0;spUpdate(1/60);BIL.ammTimer=0;spUpdate(1/60)');
assert.equal(val('enemies.filter(e=>e.big).length'),3,'UMBRA: fino a 3 navi da guerra insieme');
run('for(const e of BIL.extra)e.hp=0;spUpdate(1/60)');
assert.equal(val('BIL.extra.length'),0,'le ammiraglie in più abbattute spariscono');
console.log('PASS: più navi ammiraglie');

// video della battaglia finale: scegliendo OMEGA (una volta per partita)
run("state='map';store_=0");
for(const p of val('BASE_PLANETS'))0;
store.frontieraPianetiLiberati=val('BASE_PLANETS.join(",")');store.frontieraOmegaLibero='';
run('finalLock();selected=planets.indexOf(FINAL_PLANET);globalThis.aperto=0;const ob=finApri;finApri=function(t,f){aperto++;return ob(t,f)};brief();brief()');
assert.equal(val('aperto'),1,'il video della battaglia finale parte una volta sola');
assert(String(store.stellarIntroOmega||'').includes('|1'),'segnato per questa partita e campagna');
console.log('PASS: video della battaglia finale');

// fine del gioco: video della liberazione, poi pianeti di nuovo da liberare e campagna ×2
store.frontieraOmegaLibero='yes';
assert(val('finTuttoLibero()'));
run('cpCiclo()');
assert.equal(JSON.parse(store.stellarCiclo).f,1,'campagna finita');
run("eco.upgrades={laser:1};eco.balance=12345;finNuovaCampagna()");
assert.equal(store.frontieraPianetiLiberati,'','pianeti di nuovo da liberare');
assert.equal(store.frontieraOmegaLibero,'','OMEGA di nuovo bloccato');
assert.equal(JSON.parse(store.stellarCiclo).n,2,'nuova campagna ×2');
assert.equal(val('eco.upgrades.laser'),1,'i potenziamenti restano');assert.equal(val('eco.balance'),12345,'i crediti restano');
assert(val('mapPlayable(planets[0])&&!mapPlayable(FINAL_PLANET)'),'si può di nuovo scegliere il primo pianeta');
assert(val('bilHpK()')>1.15*1.29,'campagna ×2: nemici più forti');
console.log('PASS: nuova campagna più difficile');

// ---------------------------------------------------------------- 2) classifica mondiale: % aggiornata anche a punti uguali
(async()=>{
 function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
 const {firebaseFinto}=require('./firebase-finto.cjs');
 const F=firebaseFinto(),ls=storage();
 const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
 const g={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:F.setTimeout,clearTimeout:noop,setInterval:noop,fetch:F.fetch,Date:F.FakeDate,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,
  finish(win){g.state=win?'won':'lost'},pfFinish(win){g.state=win?'won':'lost'}};
 vm.createContext(g);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['accesso.js','classifica.js','profilo.js','record.js','classifica-personale.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),g);
 const r=c=>vm.runInContext(c,g);
 await r(`profCreate('Fabio','segreta1','','','pc')`);
 r('score=20000;state="play";finish(false)');await r('recQ');
 const riga=()=>F.docs('classifica').find(d=>d.fields.n.stringValue==='Fabio');
 assert.equal(riga().fields.g.integerValue,'0');
 // pianeta liberato senza punti in più: la riga si aggiorna con la % nuova
 ls.setItem('frontieraPianetiLiberati','HX-01');F.S.clock+=60000;
 r('score=20000;state="play";finish(false)');await r('recQ');
 assert.equal(riga().fields.s.integerValue,'20000','stessi punti');
 assert.equal(riga().fields.g.integerValue,'17','% aggiornata a fine missione');
 // riga mondiale vecchia senza %: si legge dal Personal Score del pilota
 const vecchia=r(`coRow({name:'x/classifica/v',fields:{n:{stringValue:'Fabio'},s:{integerValue:'20000'},d:{stringValue:'2026-11-11'}}})`);
 assert.equal(vecchia.g,17,'la % arriva dal Personal Score');
 console.log('PASS: % di gioco nella classifica mondiale');
 console.log('finale-galassia: ok');
})().catch(e=>{console.error(e);process.exit(1)});
