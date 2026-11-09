// Nave: un colpo per clic, tenere premuto carica il mega colpo (dist/megacolpo.js).
// Eseguire dalla cartella principale: node tests/megacolpo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){},insertAdjacentHTML(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const tip=node();tip.textContent='FRECCE / WASD muovi · MOUSE punta la prua · SHIFT DX post-bruciatore · MOUSE DX barriera · clic / SPAZIO spara · ROTELLA missile · F frena · P pausa';
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(q){return q==='#hud .controls-tip'?tip:null},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;
vm.createContext(sandbox);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(f=>fs.existsSync(path.join(dist,f))&&!/^(firebase|caricamento)/.test(f));
assert(files.indexOf('megacolpo.js')>files.indexOf('guida-orbita.js'),'megacolpo.js dopo guida-orbita.js');
for(const f of ['icone.js','game.js','camera.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','missili-nemici.js','spazio.js','battaglia.js','sotterranei.js','godmode.js','i18n.js','facile.js','speciale.js','buchineri.js','guida-orbita.js','megacolpo.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run("soundEnabled=false;godMode=false;ctx.getTransform=undefined;lang='it';i18nBuild()");
const quiet=`selected=0;startGame();paused=false;arrivalRemaining=0;enemies=[];rocks=[];wrecks=[];monsters=[];fragments=[];meteor=null;meteorTimer=1e9;shower=[];SP.bigTimer=1e9;SP.rockets=[];EM.missiles=[];BH.on=false;BH.hole=null;keys={};mouse.down=false;player.vx=0;player.vy=0;player.x=world.x-6000;player.y=world.y;player.angle=0;bullets=[];`;
const friendly=()=>val('bullets.filter(b=>b.friendly).length');

// tenere premuto non spara a raffica: un solo colpo
run(quiet+'mouse.down=true');step(1);
assert.equal(friendly(),1,'tenendo premuto parte un solo colpo laser');
assert(val('mc.held&&mcLevel()>.6'),'intanto si carica il mega colpo');
run('drawTargetLock()');
// ogni clic un colpo
run(quiet);
for(let i=0;i<4;i++){run('mouse.down=true');step(.05);run('mouse.down=false');step(.12)}
assert.equal(friendly(),4,'quattro clic = quattro colpi');
assert.equal(val('mc.shots.length'),0,'i clic brevi non sparano il mega colpo');
// un clic rapidissimo durante il raffreddamento non va perso
run(quiet+'mouse.down=true');step(1/60);run('mouse.down=false');step(1/60);run('mouse.down=true');step(1/60);run('mouse.down=false');step(.3);
assert.equal(friendly(),2,'due clic ravvicinati = due colpi');
console.log('PASS: un colpo per clic, niente raffica tenendo premuto');

// rilascio dopo la carica: parte il mega colpo che attraversa i nemici
run(quiet+'mouse.down=true');step(1.4);
assert(val('mc.ready'),'carica piena');
run(`enemies=[{x:player.x+250,y:player.y,vx:0,vy:0,hp:6,r:20,type:'fighter'},{x:player.x+420,y:player.y,vx:0,vy:0,hp:6,r:20,type:'fighter'}];for(const e of enemies){e.fire=99}`);
run('mouse.down=false');step(1/60);
assert.equal(val('mc.shots.length'),1,'parte il mega colpo');
assert(val('mc.shots[0].dmg>=14'),'carica piena = danno alto');
step(.8);
assert(val('enemies.length===0'),'il mega colpo attraversa e distrugge entrambi i nemici');
console.log('PASS: rilascio = mega colpo perforante');

// carica a metà = colpo più debole; esplode a fine corsa
run(quiet+'mouse.down=true');step(.75);run('mouse.down=false');step(1/60);
const half=val('mc.shots[0]');
assert(half&&half.L>.3&&half.L<.7&&half.dmg<14,'carica parziale = mega colpo più piccolo');
run(`enemies=[{x:mc.shots[0].x+mc.shots[0].vx*${0.98*1.45}+40,y:mc.shots[0].y+60,vx:0,vy:0,hp:2,r:18,type:'fighter',fire:99}]`);
step(1.6);
assert.equal(val('mc.shots.length'),0,'il mega colpo si esaurisce');
assert(val('enemies.length===0'),'l’esplosione finale colpisce chi è vicino');
console.log('PASS: carica parziale ed esplosione finale');

// abbatte i razzi nemici e spegne i colpi nemici
run(quiet+'mouse.down=true');step(1.4);run('mouse.down=false');step(1/60);
run('SP.rockets=[{x:mc.shots[0].x+60,y:mc.shots[0].y,hp:2,r:6,life:9,angle:Math.PI,speed:170}];bullets.push({x:mc.shots[0].x+40,y:mc.shots[0].y,vx:0,vy:0,life:3,friendly:false,r:4})');
step(.15);
assert(val('SP.rockets.every(m=>m.hp<=0)'),'razzo abbattuto');
assert(val('bullets.filter(b=>!b.friendly).length===0'),'colpo nemico spento');
// pausa e fine missione azzerano la carica
run(quiet+'mouse.down=true');step(.8);run('paused=true');step(.1);run('paused=false;mouse.down=false;state="map"');step(.1);
assert(val('!mc.held&&mc.t===0&&mc.shots.length===0'),'fuori dalla battaglia la carica si azzera');
// shoot() chiamato da fuori spara come prima
run(quiet+'shoot()');assert.equal(friendly(),1,'shoot() diretto spara ancora');
// durante l'arrivo non si carica
run(quiet+'arrivalRemaining=1;mouse.down=true');step(.5);
assert(val('mc.t===0'),'niente carica durante l’arrivo');
console.log('PASS: razzi, pausa, fine missione e arrivo');

// traduzioni e suggerimento comandi
assert(tip.textContent.includes('clic / SPAZIO spara (tieni premuto: mega colpo) · ROTELLA'),'suggerimento comandi aggiornato');
run("lang='en';i18nBuild()");
assert.equal(val("tr('MEGA COLPO PRONTO')"),'MEGA SHOT READY');
assert(val("tr(document.querySelector('#hud .controls-tip').textContent)").includes('click / SPACE fire (hold: mega shot) · WHEEL'),'suggerimento tradotto');
run("lang='fr';i18nBuild()");
assert(val("tr(document.querySelector('#hud .controls-tip').textContent)").includes('clic / ESPACE tirer (maintenir : méga tir) · MOLETTE'),'suggerimento in francese');
run("lang='ja';i18nBuild()");
assert(val("tr(document.querySelector('#hud .controls-tip').textContent)").includes('クリック / スペース 射撃（長押し：メガショット） · ホイール'),'suggerimento in giapponese');
console.log('PASS: traduzioni');

// La carica e il proiettile del fucile disegnano la sfera condivisa.
run(`
 abort();selected=0;startPlatform();pf.phase='missione';
 const P=pf.pilot,arcs=[],originalArc=ctx.arc;
 P.visible=true;P.aim=0;P.rifleCharge=PF_RIFLE_FULL;
 ctx.arc=(x,y,r)=>arcs.push({x,y,r});
 const sh=pfShoulder(P);
 pfDrawRifleCharge(P,0);
 globalThis.rifleChargeOrb=arcs.some(a=>a.x===sh.x+30&&a.y===sh.y&&a.r>10);
 arcs.length=0;pfShoot(1);
 const shot=pf.shots.at(-1);
 drawBullet(shot);
 globalThis.rifleProjectileOrb=arcs.some(a=>a.x===shot.x&&a.y===shot.y&&a.r>10);
 ctx.arc=originalArc;
`);
assert(val('rifleChargeOrb'),'sfera centrata sulla canna durante la carica');
assert(val('rifleProjectileOrb'),'sfera sul proiettile dopo il rilascio');
console.log('PASS: sfera di plasma del fucile a terra');
