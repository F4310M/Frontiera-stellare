// Urti, mirino della sfida online e cometa nel singolo (2026-11-09): dist/urti.js, dist/cometa.js, dist/arena.js.
// Eseguire dalla cartella principale: node tests/urti-cometa.test.cjs
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
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf(`src="${f}"`);
assert(at('urti.js')>at('battaglia.js')&&at('urti.js')<at('arena.js'),'urti.js dopo battaglia.js e prima di arena.js');
assert(at('cometa.js')>at('meteoriti.js')&&at('cometa.js')>at('buchineri.js')&&at('cometa.js')<at('arena.js'),'cometa.js dopo meteoriti.js e buchineri.js');
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','meteoriti.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','facile.js','speciale.js','buchineri.js','multi-aggancio.js','guida-orbita.js','megacolpo.js','rifiniture.js','urti.js','cometa.js','barra-orbita.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run("soundEnabled=true;godMode=false;ctx.getTransform=undefined;lang='it';i18nBuild();tone=function(){};noise=function(){};var __u=[];const __o=urtoSfx;urtoSfx=function(p,k){__u.push([p,k]);return __o.apply(this,arguments)}");
const quiet=`selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;SP.rockets=[];EM.missiles=[];BH.on=false;BH.hole=null;keys={};mouse.down=false;player.vx=0;player.vy=0;player.x=world.x-6000;player.y=world.y;player.angle=0;bullets=[];__u.length=0;`;

// 1) nello spazio: sbattere su una roccia suona, sfiorarla piano no
run(quiet+`rocks=[{x:player.x-60,y:player.y,r:40,hp:5,maxHp:5,vx:0,vy:0,rot:0,spin:0,rock:true}];player.x=rocks[0].x+rocks[0].r*.72+player.r-2;player.vx=-320`);
step(.05);
assert(val('__u.length')===1&&val('__u[0][1]')==='nave','urto contro la roccia: un suono');
assert(val('__u[0][0]')>.6,'urto veloce: suono forte');
run(`__u.length=0;player.inv=1;rocks[0].hit=1;player.x=rocks[0].x+rocks[0].r*.72+player.r-2;player.vx=-10;player.vy=0`);step(.02);
assert(val('__u.length')===0,'contatto lento: nessun suono');
console.log('PASS: urto della nave nello spazio');

// 2) urtoSfx rispetta l'audio spento e la pausa tra due urti
run('__u.length=0;urti.t=-1');
{let n=0;run('tone=function(){__t++};var __t=0');run('urti.t=-1;urtoSfx(1)');n=val('__t');assert(n>0,'urto: suona');
 run('urtoSfx(1)');assert(val('__t')===n,'due urti ravvicinati: uno solo');
 run('urti.t=-1;soundEnabled=false;urtoSfx(1);soundEnabled=true');assert(val('__t')===n,'audio spento: silenzio');
 run('tone=function(){}');}
console.log('PASS: volume e pausa tra gli urti');

// 3) a terra: muro e atterraggio pesante
run(`__u.length=0;pf={pilot:{x:100,y:500,w:30,vx:400,vy:0,visible:true,ground:true,wall:0},solids:[{x:0,y:600,w:2000,h:200},{x:118,y:300,w:60,h:500}],plats:[]};
 pfMoveBody(pf.pilot,1/60)`);
assert(val('__u.length')===1&&val('__u[0][1]')==='pilota','muro: suono del pilota');
run(`__u.length=0;pfMoveBody(pf.pilot,1/60)`);assert(val('__u.length')===0,'contro il muro fermo: niente suono ripetuto');
run(`__u.length=0;urti.t=-1;Object.assign(pf.pilot,{x:400,y:590,vx:0,vy:900,ground:false,wall:0});pfMoveBody(pf.pilot,1/60)`);
assert(val('pf.pilot.ground')&&val('__u.length')===1,'atterraggio pesante: suono');
run(`__u.length=0;urti.t=-1;Object.assign(pf.pilot,{x:400,y:595,vx:0,vy:200,ground:false});pfMoveBody(pf.pilot,1/60)`);
assert(val('__u.length')===0,'atterraggio leggero: niente suono');
console.log('PASS: urti del pilota a terra');

// 4) meteorite di prima, grande il doppio: stesso avviso, si frantuma sparandogli, colpisce la nave
run(quiet+'player.health=100;player.shield=0;player.inv=0;spawnMeteor()');
assert(val('meteor.r')===48&&val('meteor.warning')===3,'meteorite grande il doppio con 3 s di preavviso');
assert(/METEORITE IN ARRIVO/.test(val("document.getElementById('meteorAlert').textContent")),'stessa scritta di avviso');
run('hitMeteor(99)');assert(val('!meteor'),'sparandogli si frantuma come prima');
run(quiet+'player.health=100;player.shield=0;player.inv=0;spawnMeteor();meteor.warning=0');
step(1.5);
assert(val('player.health')<100,'se prende la nave la danneggia');
assert(/arDrawMeteor|coda luminosa/.test(fs.readFileSync(path.join(dist,'cometa.js'),'utf8')),'coda luminosa della cometa online');
console.log('PASS: meteorite grande con la coda luminosa');

// 4b) "RAGGIUNGI L'ORBITA" compare solo quando il pianeta è sullo schermo
{const box=capBox;
 run(quiet+'capture=0;camZoom=1;player.x=world.x-world.r-W;player.y=world.y;rfCapture()');assert(box.style.visibility==='hidden','pianeta lontano: riquadro nascosto');
 run('player.x=world.x-world.r-W/2+50;rfCapture()');assert(box.style.visibility==='','pianeta sullo schermo: riquadro visibile');
 run('player.x=world.x-world.r-W;capture=20;rfCapture()');assert(box.style.visibility==='','conquista iniziata: resta visibile');
 run('capture=0;state="map";rfCapture();state="play"');assert(box.style.visibility==='','fuori dal volo nessuno stato residuo');
 console.log('PASS: riquadro dell’orbita solo con il pianeta in vista');}

// 5) arena: rimbalzo su una roccia e frammento producono l'evento del suono d'urto
{
 const sb={I18N_ROWS:[],console,Math,Date,JSON,Object,Array,Set,String,Number,Promise};vm.createContext(sb);
 vm.runInContext(fs.readFileSync(path.join(dist,'arena.js'),'utf8')+';this.A={arNew,arTick,arSpawn,arRocks,ARENA}',sb);
 const A=sb.A,g=A.arNew('p1','TEST','',{},0,'R');g.room='ABCD';g.rocks=A.arRocks('ABCD');A.arSpawn(g);
 const o=g.rocks.find(r=>!r.br);Object.assign(g.me,{x:o.x+o.r+A.ARENA.shipR-2,y:o.y,vx:-300,vy:0});
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 A.arTick(g,1/60,idle);
 assert(g.events.some(e=>e.type==='bump'&&e.p>.5),'rimbalzo sulla roccia: evento bump');
 g.events=[];g.inv=0;g.frags=[{x:g.me.x,y:g.me.y,vx:0,vy:0,r:6,rot:0,spin:0,life:2}];
 A.arTick(g,1/60,idle);
 assert(g.events.some(e=>e.type==='bump'),'frammento sulla nave: evento bump');
 const s=fs.readFileSync(path.join(dist,'arena.js'),'utf8');
 assert(s.includes("e.type==='bump'){if(typeof urtoSfx==='function')urtoSfx(e.p,'nave')}"),'bump suona con urtoSfx');
 assert(s.includes('ARENA.cometNear')&&!s.includes('setLineDash([30,20])'),'avviso cometa come nel singolo, niente traiettoria tratteggiata');
 assert(/function arDrawCrosshair\(\)/.test(s)&&s.includes('arDrawCrosshair();'),'mirino disegnato nell’arena');
 assert(s.includes("canvas.style.cursor=aim?'none':''")&&/function arAimOff\(\)/.test(s),'freccia del mouse nascosta nella sfida e ripristinata all’uscita');
 console.log('PASS: arena, urti e mirino');
}
console.log('TUTTI I TEST URTI/COMETA PASSATI');
