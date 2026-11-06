// Buchi neri nello spazio (dist/buchineri.js) e fossili nel sottosuolo (dist/fossili.js).
// Eseguire dalla cartella principale: node tests/buchineri-fossili.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','buchineri.js','fossili.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false;ctx.getTransform=undefined');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('buchineri.js')>html.indexOf('spazio.js')&&html.indexOf('buchineri.js')>html.indexOf('i18n.js'),'buchineri.js dopo spazio.js e i18n.js');
assert(html.indexOf('fossili.js')>html.indexOf('sotterranei.js'),'fossili.js dopo sotterranei.js');

// prepara una missione tranquilla: niente nemici, meteoriti o rocce
const quiet=`selected=4;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;EM.missiles=[];keys={};player.x=0;player.y=0;player.vx=0;player.vy=0;world.x=1e6;world.y=0;`;
const hole=x=>`bhSpawn({x:player.x+${x},y:player.y});BH.hole.t=BH_CFG.grow;BH.hole.life=999;`;
const hd=()=>val('Math.hypot(BH.hole.x-player.x,BH.hole.y-player.y)');

// 1) più frequenti sui pianeti difficili
assert(val('BH_CFG.chance(5)>BH_CFG.chance(1)'),'più probabili sui pianeti difficili');
assert(val('BH_CFG.next(5)[1]<BH_CFG.next(1)[1]&&BH_CFG.first(5)[1]<BH_CFG.first(1)[1]'),'più ravvicinati sui pianeti difficili');
let n=0;for(let i=0;i<200;i++){run('selected=0;startGame()');if(val('BH.on'))n++}
assert(n>40&&n<160,'sul pianeta facile a volte sì, a volte no: '+n);
console.log('PASS: comparsa casuale, più frequente sui livelli difficili');

// 2) compare davanti alla rotta, fuori dallo schermo, ma attira già
run(quiet+'player.vx=200;BH.on=true;BH.timer=0');step(.1);
assert(val('!!BH.hole'),'il buco nero compare');
assert(hd()>val('Math.hypot(W,H)/2'),'fuori dallo schermo: '+hd());
assert(val('BH.hole.x>player.x'),'davanti alla nave');
const d0=hd();step(3);
assert(val('BH.inside'),'la nave è già nella zona di influenza');
assert(hd()<d0,'la nave viene attirata prima di vedere il buco');
console.log('PASS: attrazione prima che appaia sullo schermo');

// 3) senza post-bruciatore non si scappa
run(quiet+hole(900));const a0=hd();
run('keys.KeyA=true');step(4);
assert(hd()<a0-100,'con i motori normali la nave scivola comunque dentro: '+a0+' → '+hd());
console.log('PASS: i motori normali non bastano');

// 4) con il post-bruciatore si scappa
run(quiet+hole(900)+'player.boost=100;player.boostState="ready";keys.KeyA=true;keys.ShiftRight=true');step(3.6);
assert(hd()>val('BH.hole.reach'),'col post-bruciatore la nave esce dalla zona: '+hd());
console.log('PASS: si sfugge con il post-bruciatore');

// 5) attira e inghiotte navi nemiche, rocce, meteoriti e colpi
run(quiet+hole(3000)+'spawnEnemy(BH.hole.x-500,BH.hole.y+200,false);globalThis.E=enemies[enemies.length-1];rocks.push({x:BH.hole.x+400,y:BH.hole.y,vx:0,vy:0,r:30,rot:0,spin:0,hp:3,rock:true});globalThis.R=rocks[0];shower.push({x:BH.hole.x,y:BH.hole.y-600,angle:0,vx:500,vy:0,r:12,life:30,warning:0,hp:1,maxHp:1,hitPlayer:false,rot:0});globalThis.M=shower[0];player.x=BH.hole.x-1e5');
// la nave è lontana: il buco nero continua ad attirare gli altri
const e0=val('Math.hypot(E.x-BH.hole.x,E.y-BH.hole.y)');step(1);
assert(val('Math.hypot(E.x-BH.hole.x,E.y-BH.hole.y)')<e0||val('E.hp<=0'),'la nave nemica viene attirata');
step(12);
assert(val('E.hp<=0'),'la nave nemica viene inghiottita');
assert(val('R.hp<=0'),'la roccia viene inghiottita');
assert(val('M.life<=0'),'il meteorite viene inghiottito');
console.log('PASS: inghiotte navi nemiche, rocce e meteoriti');

// 6) chi arriva al centro viene inghiottito; in modalità dio viene risputato fuori
run(quiet+hole(300)+'player.health=100');step(6);
assert.notEqual(val('state'),'play','la nave inghiottita esplode');
run('godMode=true;'+quiet+hole(300));step(6);
assert.equal(val('state'),'play','modalità dio: la nave resta in gioco');
run('godMode=false');
console.log('PASS: orizzonte degli eventi');

// 7) evapora dopo un po' e il disegno non si rompe
run(quiet+hole(1200)+'BH.hole.life=BH.hole.t+1');run('draw()');step(1.2);
assert(val('!BH.hole'),'il buco nero evapora');
run(quiet+hole(1200));run('draw();bhDrawEdge()');
assert(val('I18N_ROWS.some(r=>r[0]==="SOLO IL POST-BRUCIATORE PUÒ SFUGGIRE AL BUCO NERO")'),'testi tradotti');
console.log('PASS: evaporazione, disegno e traduzioni');

// 8) fossili nelle gallerie di ogni pianeta
for(let i=0;i<5;i++){
 run(`vite=3;viteSave();selected=${i};startPlatform();pf.phase='missione';sotSwitch(true,pf.sot.lifts[0].x);pf.sotT=null;fosState=null`);
 run('drawPlatform()');
 const st=val('fosState');assert(st&&st.list.length>=12,'fossili nel sottosuolo del pianeta '+i+': '+(st&&st.list.length));
 const walls=val('pf.sot.solids.filter(s=>s.wall).length');
 assert(val('fosState.list.filter(f=>f.where==="wall"&&f.big).length')===walls,'un grande fossile in ogni parete');
 assert(val(`fosState.list.filter(f=>f.where==="floor").every(f=>{const s=pf.sot.solids.find(s=>f.x>=s.x&&f.x<=s.x+s.w&&!s.wall);return s&&f.y>s.y+20})`),'i fossili del pavimento stanno dentro la roccia');
 assert(val(`fosState.list.filter(f=>f.where==="ceil").every(f=>f.y<SOT.ceil&&!pf.sot.lifts.some(l=>Math.abs(l.x-f.x)<SOT.liftW))`),'quelli della volta stanno nella volta, lontani dai pozzi');
 assert.deepEqual(val('fosBuild(pf.sot).map(f=>f.x)'),val('fosState.list.map(f=>f.x)'),'sempre uguali per lo stesso pianeta');
}
run('globalThis.F=fosState.list.find(f=>f.big);pf.pilot.visible=true;pf.pilot.x=F.x;pf.pilot.y=F.y+40;pf.texts=[];drawPlatform()');
assert(val('pf.texts.some(t=>t.text==="FOSSILE ANTICO")'),'avvicinandosi compare FOSSILE ANTICO');
run('pf.texts=[];drawPlatform()');assert(val('!pf.texts.some(t=>t.text==="FOSSILE ANTICO")'),'una volta sola');
console.log('PASS: fossili nel sottosuolo');
