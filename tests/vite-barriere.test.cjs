// Vite con la foto, ripartenza un po' prima (dist/vite.js), barriere d'energia e richiamo dell'atterraggio
// (dist/barriere.js), navi nemiche risucchiate a spirale dal buco nero (dist/buchineri.js).
// Eseguire dalla cartella principale: node tests/vite-barriere.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},insertBefore(){},removeAttribute(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},encodeURIComponent,
 document:{body:node(),head:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return null},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','assalto.js','buchineri.js','vite.js','barriere.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false;godMode=false;ctx.getTransform=undefined;BARR.groundCount=[0,0]');

const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('vite.js')>html.indexOf('guida-orbita.js')&&html.indexOf('barriere.js')>html.indexOf('vite.js'),'vite.js e barriere.js in fondo');

const quiet=`selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;EM.missiles=[];BH.on=false;BH.hole=null;keys={};player.vx=0;player.vy=0;`;
const along='(player.x*Math.cos(approachAngle)+player.y*Math.sin(approachAngle))';

// 1) spazio: vita persa → la nave riparte un po' prima, la missione continua
run('vite=3;viteSave();'+quiet+`BAR.sp.done=true;player.x=Math.cos(approachAngle)*3000;player.y=Math.sin(approachAngle)*3000;`);
const a0=val(along);
run('damage(1000,true)');assert.equal(val('state'),'dying','la nave esplode');
step(3.2);
assert.equal(val('state'),'play','la missione continua');
assert.equal(val('vite'),2,'una vita in meno');
assert(Math.abs(val(along)-(a0-val('VITA.indietro')))<60,'riparte un po\' prima: '+(a0-val(along)));
assert.equal(val('player.health'),100,'nave nuova');
run('damage(30)');assert.equal(val('player.health'),100,'invulnerabile appena ricomparsa');
step(3.2);run('damage(30)');assert(val('player.health')<100,'poi torna vulnerabile');
// ultima vita: la missione finisce come prima (GAME OVER)
run('vite=1;viteSave();damage(1000,true)');step(3.2);
assert.equal(val('state'),'lost','all\'ultima vita la missione è persa');
assert.equal(val('$("resultEyebrow").textContent'),'GAME OVER','game over');
console.log('PASS: spazio, vita persa e ripartenza un po\' prima');

// 2) vite in alto a sinistra con la foto (default se manca il profilo)
assert(val('vtFoto()').startsWith('data:image/svg+xml'),'foto di default');
run('vite=3;viteSave()');assert(val('$("mapVite").innerHTML').includes('× 3'),'mappa: foto × 3');
run('vite=4;viteSave()');assert(val('$("mapVite").innerHTML').includes('× 4'),'cambia subito');
console.log('PASS: vite con la foto del pilota');

// 3) barriera d'energia nello spazio
run('vite=3;viteSave();'+quiet+`BAR.sp.along=4000;player.x=Math.cos(approachAngle)*2000;player.y=Math.sin(approachAngle)*2000;`);
step(.1);assert(!val('BAR.sp.gens'),'lontano: niente navi');
run('player.x=Math.cos(approachAngle)*3200;player.y=Math.sin(approachAngle)*3200');step(.1);
assert.equal(val('BAR.sp.gens.length'),2,'due navi generatrici');
assert(val('BAR.sp.gens.every(e=>e.gen&&enemies.includes(e))'),'sono nemici veri (si colpiscono e si agganciano)');
assert(val(`Math.abs(Math.hypot(BAR.sp.gens[0].x-BAR.sp.gens[1].x,BAR.sp.gens[0].y-BAR.sp.gens[1].y)-BARR.gap)<1`),'distanza tra le navi');
// contro la barriera si rimbalza (anche andando di lato non si passa)
run(`player.respawnT=99;const ax=Math.cos(approachAngle),ay=Math.sin(approachAngle);player.x=ax*3900-ay*2500;player.y=ay*3900+ax*2500;player.vx=ax*500;player.vy=ay*500`);
step(1.5);assert(val(along)<4000,'non si attraversa: '+val(along));
// le navi seguono il giocatore di lato
assert(val(`Math.abs((-player.x*Math.sin(approachAngle)+player.y*Math.cos(approachAngle))-BAR.sp.c)<2400`),'le navi seguono il giocatore');
run('BAR.sp.gens[0].hp=0');step(.1);assert(val('BAR.sp.on&&!BAR.sp.done'),'con una sola nave regge ancora');
run('BAR.sp.gens[1].hp=0');step(.1);assert(val('BAR.sp.done&&!BAR.sp.on'),'abbattute tutte e due: via libera');
run(`player.vx=Math.cos(approachAngle)*500;player.vy=Math.sin(approachAngle)*500`);step(1);
assert(val(along)>4000,'adesso si passa');
console.log('PASS: barriera d\'energia nello spazio');

// 4) scritta dell'atterraggio vicino al pianeta
run(quiet+'player.x=world.x-Math.cos(approachAngle)*(world.r+1000);player.y=world.y-Math.sin(approachAngle)*(world.r+1000)');step(.05);
assert(val('BAR.callOn'),'vicino al pianeta lampeggia la scritta');
run('player.x=world.x-Math.cos(approachAngle)*(world.r+50);player.y=world.y-Math.sin(approachAngle)*(world.r+50)');step(.05);
assert(!val('BAR.callOn'),'dentro l\'anello sparisce');
console.log('PASS: scritta ENTRA NEL PIANETA PER L’ATTERRAGGIO');

// 5) buco nero: le navi nemiche girano a spirale e rimpiccioliscono
run(quiet+'player.x=0;player.y=0;world.x=1e6;world.y=0;bhSpawn({x:3000,y:0});BH.hole.t=BH_CFG.grow;BH.hole.life=999;spawnEnemy(3000,BH.hole.core*1.2,false);globalThis.EN=enemies[0];EN.vx=EN.vy=0');
step(.2);
assert(val('BH.sw.length===1&&BH.sw[0].e===EN&&EN.hp<=0'),'la nave nemica viene catturata');
run('drawSupplies()');
step(1.2);assert.equal(val('BH.sw.length'),0,'poi sparisce nel buco');
console.log('PASS: navi nemiche risucchiate a spirale');

// 6) terra: pilota di riserva un po' prima del punto della morte
run('vite=3;viteSave();selected=0;startPlatform();pf.phase="missione";pf.t=10;BAR.plan=[]');
const gx=val('(()=>{for(let x=3000;x<pf.arenaX-800;x+=20)if(vtGroundOk(x)&&vtGroundOk(x-400))return x;return 0})()');
assert(gx>0,'terreno trovato');
run(`const P=pf.pilot;P.visible=true;P.landing=false;P.x=${gx};P.y=pfGroundAt(${gx})-2;P.inv=0;pf.checkpoint=330;pf.enemies=[];pfLoseLife(true)`);
step(.8);
assert(val('!!pf.drop'),'arriva la navetta');
assert(val(`pf.drop.x<${gx}&&pf.drop.x>=${gx}-VITA.indietroTerra-900`),'sganciato poco prima: '+val('pf.drop.x')+' morto a '+gx);
assert(val(`pf.drop.x>1000`),'non al punto di controllo lontano');
assert.equal(val('vite'),2,'una vita in meno');
console.log('PASS: terra, pilota di riserva un po\' prima');

// 7) terra: soldato della barriera
run('selected=0;startPlatform();pf.phase="missione";pf.t=10;pf.enemies=[];BAR.wall=null');
const bx=val('(()=>{for(let x=2500;x<pf.arenaX-2500;x+=20){let ok=true;for(let d=0;d<=BARR.ahead+200;d+=20)if(pfGroundAt(x+d)===null||Math.abs(pfGroundAt(x+d)-pfGroundAt(x))>3){ok=false;break}if(ok)return x}return 0})()');
assert(bx>0,'tratto piano trovato');
run(`const P=pf.pilot;P.visible=true;P.landing=false;P.x=${bx};P.y=pfGroundAt(${bx})-2;P.vx=0;P.inv=99;BAR.plan=[${bx}+100]`);
step(.05);
assert(val('BAR.wall&&BAR.wall.on&&pf.enemies.includes(BAR.wall.e)'),'il soldato accende la barriera');
run('pf.pilot.x=BAR.wall.x-25;pf.pilot.vx=600');step(.3);
assert(val('pf.pilot.x<=BAR.wall.x-17'),'il pilota non passa');
run('pfHitEnemy(BAR.wall.e,99)');step(.05);
assert(val('BAR.wall===null'),'eliminato il soldato la barriera si spegne');
console.log('PASS: soldato della barriera a terra');

// 8) smile alieno e traduzioni
run('lifeUpPill(ctx,0,0,0,1)');
for(const s of['ENTRA NEL PIANETA PER L’ATTERRAGGIO','BARRIERA D’ENERGIA · DISTRUGGI LE DUE NAVI GENERATRICI','SOLDATO DELLA BARRIERA · ELIMINALO PER PASSARE','NAVE DI RISERVA'])
 assert(val(`I18N_ROWS.some(r=>r[0]===${JSON.stringify(s)}&&r.length===7)`),'traduzione: '+s);
console.log('PASS: smile alieno e traduzioni');
