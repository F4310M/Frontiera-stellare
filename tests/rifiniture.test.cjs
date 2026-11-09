// Rifiniture del 2026-11-08 (dist/rifiniture.js, dist/rifiniture.css).
// Eseguire dalla cartella principale: node tests/rifiniture.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){const cl=new Set();return{style:{setProperty(){}},classList:{add(c){cl.add(c)},remove(c){cl.delete(c)},toggle(c,on){on=on===undefined?!cl.has(c):!!on;on?cl.add(c):cl.delete(c);return on},contains(c){return cl.has(c)}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const listeners={};const capBox=node();
const doc={pointerLockElement:null,body:node(),documentElement:{},addEventListener(t,f){(listeners['doc:'+t]??=[]).push(f)},exitPointerLock(){doc.pointerLockElement=null;for(const f of listeners['doc:pointerlockchange']||[])f()},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(q){return q==='.capture-status'?capBox:null},querySelectorAll(){return[]},createElement:node};
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return Date.now()}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},
 addEventListener(t,f,cap){(listeners[t+(cap?':cap':'')]??=[]).push(f)},document:doc};
const cv=doc.getElementById('game');cv.getContext=()=>fakeCtx;let lockReq=0;cv.requestPointerLock=()=>{lockReq++;doc.pointerLockElement=cv;for(const f of listeners['doc:pointerlockchange']||[])f()};
vm.createContext(sandbox);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('rifiniture.js')>html.indexOf('megacolpo.js'),'rifiniture.js dopo megacolpo.js');
assert(html.includes('href="rifiniture.css"'),'foglio di stile collegato');
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','facile.js','speciale.js','buchineri.js','multi-aggancio.js','guida-orbita.js','megacolpo.js','rifiniture.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run("soundEnabled=false;godMode=false;ctx.getTransform=undefined;lang='it';i18nBuild()");
const quiet=`selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;SP.rockets=[];EM.missiles=[];BH.on=false;BH.hole=null;keys={};mouse.down=false;player.vx=0;player.vy=0;player.x=world.x-6000;player.y=world.y;player.angle=0;bullets=[];`;
const fire=(t,e)=>{for(const f of listeners[t+':cap']||[])f(e);for(const f of listeners[t]||[])f(e)};

// 1) barra della conquista
run(quiet+'capture=0');step(.05);assert(!capBox.classList.contains('capturing'));
run('capture=40;rfCapture()');assert(capBox.classList.contains('capturing'),'barra evidenziata durante la conquista');
console.log('PASS: barra della conquista evidenziata');

// 1b) dentro l'anello la freccia sparisce e la barra sale al suo posto
{const hud=doc.getElementById('hud');
 run('player.x=world.x-world.r-600;player.y=world.y;rfCapture()');assert(!hud.classList.contains('in-anello'),'fuori dall’anello la freccia resta');
 run('player.x=world.x-world.r-100;rfCapture()');assert(hud.classList.contains('in-anello'),'dentro l’anello la freccia sparisce');
 run('player.x=world.x-world.r-190;rfCapture()');assert(hud.classList.contains('in-anello'),'margine: niente sfarfallio sul bordo');
 run('player.x=world.x-world.r-300;rfCapture()');assert(!hud.classList.contains('in-anello'),'uscito dall’anello la freccia ritorna');
 run('player.x=world.x-world.r-100;rfCapture();state="map";rfCapture();state="play"');assert(!hud.classList.contains('in-anello'),'fuori dal gioco nessuno stato residuo');
 const css=fs.readFileSync(path.join(dist,'rifiniture.css'),'utf8');
 assert(/#hud\.in-anello \.hud-top>\.distance-box\{display:none\}/.test(css),'css nasconde la freccia');
 assert(/#hud\.in-anello \.capture-status\{top:22px\}/.test(css),'css sposta la barra in alto');
 console.log('PASS: dentro l’anello niente freccia, barra in alto');}

// 2) mirino dei missili solo con crediti
run(quiet+'enemies=[{x:player.x+200,y:player.y,vx:0,vy:0,hp:5,r:20,type:"fighter",fire:99}]');step(.5);
assert(val('lockTarget')!==null,'con i crediti il nemico viene agganciato');
run('eco.balance=0');step(.3);
assert(val('lockTarget===null&&lockProgress===0'),'senza crediti niente mirino');
assert.equal(val("$('missileStatus').textContent"),'MISSILI ESAURITI · CREDITI INSUFFICIENTI');
run('drawTargetLock()');
run('eco.balance=5000');step(.3);assert(val('lockTarget')!==null,'con i crediti il mirino torna');
console.log('PASS: mirino dei missili solo se puoi lanciarli');

// 3) suono dello scafo colpito
sandbox.window={};
vm.runInContext('rfHullSound=function(){globalThis.__hull=(globalThis.__hull||0)+1}',sandbox);run('soundEnabled=true');
run(quiet+'enemies=[{x:player.x+120,y:player.y,vx:0,vy:0,hp:5,r:20,type:"fighter",fire:99}];shoot()');step(.3);
assert.equal(val('globalThis.__hull'),1,'colpo a segno sullo scafo = un suono');
run('enemyFire=true;destroyableHit(enemies[0],1);enemyFire=false');
assert.equal(val('globalThis.__hull'),1,'il fuoco nemico non suona');
run('rocks=[{x:0,y:0,hp:5,r:20,rock:true}];destroyableHit(rocks[0],1)');
assert.equal(val('globalThis.__hull'),1,'le rocce non suonano come uno scafo');
run('destroyableHit(enemies[0],99)');assert.equal(val('globalThis.__hull'),1,'distrutta: c’è già l’esplosione');
run('soundEnabled=false');
console.log('PASS: suono dello scafo nemico colpito');

// 4) mouse bloccato nel gioco
run('rfUnlock()');run(quiet);
assert(val('rfLocked()'),'all’inizio della missione il mouse viene bloccato');
run('mouse.x=W/2;mouse.y=H/2');
const mv={movementX:5000,movementY:-5000,clientX:0,clientY:0};fire('mousemove',mv);
assert.equal(mv.clientX,val('W-1'));assert.equal(mv.clientY,0);
assert.equal(val('mouse.x'),val('W-1'),'il cursore virtuale resta dentro lo schermo');
run('togglePause()');assert(val('paused&&!rfLocked()'),'in pausa il mouse è libero');
run('togglePause()');assert(val('!paused&&rfLocked()'),'alla ripresa torna bloccato');
doc.exitPointerLock();assert(val('paused'),'perdere il blocco (Esc) mette in pausa');
run('togglePause();state="won"');step(.02);assert(val('!rfLocked()'),'finita la missione il mouse è libero');
console.log('PASS: mouse bloccato dentro il gioco');

// 5) mira assistita a terra
run('rfUnlock();selected=0;startGame();finish(true);startPlatform();paused=false');
run('pf.phase="missione";pf.enemies=[];pf.boss=null;const P=pf.pilot;P.visible=true;P.hp=100;P.landing=false;P.face=1;P.x=pf.cam.x+500;');
assert(val('rfLocked()'),'a terra il mouse è bloccato');
// nemico alle spalle, nessuno davanti: mouse all'indietro = pilota girato verso di lui
run('pf.enemies=[{type:"soldato",x:pf.pilot.x-300,y:pf.pilot.y,w:22,h:48,hp:3,face:1}];mouse.x=(pf.pilot.x+200-pf.cam.x)*pfScale();mouse.y=(pf.pilot.y-34)*pfScale()');
const back={movementX:-6,movementY:0};fire('mousemove',back);
const ex=val('(pf.enemies[0].x-pf.cam.x)*pfScale()');
assert(Math.abs(back.clientX-ex)<1,'il mirino salta sul nemico alle spalle');
run('pfUpdatePilot(1/60)');assert.equal(val('pf.pilot.face'),-1,'il pilota si gira subito');
// con un nemico anche davanti niente salto
run('pf.pilot.face=1;pf.enemies.push({type:"soldato",x:pf.pilot.x+400,y:pf.pilot.y,w:22,h:48,hp:3,face:-1});mouse.x=(pf.pilot.x+150-pf.cam.x)*pfScale()');
const back2={movementX:-6,movementY:0};fire('mousemove',back2);
assert(Math.abs(back2.clientX-val('mouse.x')+6)<8,'con un nemico davanti il movimento resta normale');
// calamita leggera verso il nemico vicino al mirino
const tx=val('(pf.enemies[1].x-pf.cam.x)*pfScale()'),ty=val('(pf.pilot.y-48*.6)*pfScale()');
run(`mouse.x=${tx}-80;mouse.y=${ty}+60`);
const mv2={movementX:10,movementY:0};fire('mousemove',mv2);
const plain={x:tx-70,y:ty+60};
const dPlain=Math.hypot(plain.x-tx,plain.y-ty),dAssist=Math.hypot(mv2.clientX-tx,mv2.clientY-ty);
assert(dAssist<dPlain-2&&dAssist>dPlain-25,'il mirino viene attirato un poco verso il nemico ('+dPlain.toFixed(1)+' → '+dAssist.toFixed(1)+')');
const far={movementX:10,movementY:0};run(`mouse.x=${tx}-600;mouse.y=${ty}`);fire('mousemove',far);
assert(Math.abs(far.clientX-(tx-590))<.01,'lontano dai nemici nessun aiuto');
console.log('PASS: mira assistita e giro verso il nemico alle spalle');

run("lang='en';i18nBuild()");assert.equal(val("tr('MISSILI ESAURITI · CREDITI INSUFFICIENTI')"),'NO MISSILES · NOT ENOUGH CREDITS');
const css=fs.readFileSync(path.join(dist,'rifiniture.css'),'utf8');
for(const id of ['abortBtn','profSavePause','marketBtnResult','scoreSeeBoard'])assert(css.includes('#'+id),'colore per '+id);
console.log('PASS: traduzioni e colori dei pulsanti');
