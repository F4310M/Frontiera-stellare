// Test di ECONOMIA e MERCATO. Eseguire dalla cartella principale: node tests/economia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','fase2.js','grafica2.js','economia.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

assert.equal(val('eco.balance'),2500,'Saldo iniziale 2.500 CR');
assert.equal(val('ecoFmt(12000)'),'12.000');assert.equal(val('ecoFmt(-1500)'),'−1.500');

// Fase 1: colpi, missili e carburante si pagano in tempo reale.
run('selected=0;startGame()');
run('player.fire=0;shoot()');assert.equal(val('eco.balance'),2499,'Colpo laser: −1 CR');
run('launchMissile()');assert.equal(val('eco.balance'),2474,'Missile: −25 CR');
run('missile=null;keys={KeyD:true};for(let i=0;i<60;i++)update(1/60);keys={}');
assert(val('eco.run.count.fuel')>.9,'Il carburante viene contato');assert(val('eco.run.spent.fuel')>=1,'Il carburante costa crediti');
const before=val('eco.balance');run('kills=4');run('finish(false)');
const r1=JSON.parse(val('JSON.stringify(eco.last)'));
assert.equal(val('eco.earned'),16,'si accumulano le entrate prima delle spese');
assert.equal(store.frontieraGuadagni,'16','guadagni persistenti');
assert.equal(r1.rows[0].qty,1);assert.equal(r1.rows[1].qty,1);assert.equal(r1.rows[3].amount,16,'Taglia: 4 nemici × 4 CR');
assert.equal(val('eco.balance'),before+16,'La taglia viene accreditata a fine fase');
console.log('PASS: spese in tempo reale e riepilogo della fase 1');

// Missili senza crediti sufficienti non partono; laser e carburante possono andare in debito.
run('abort();eco.balance=10;startGame();missile=null;launchMissile()');assert.equal(val('missile'),null,'Senza crediti niente missile');
run('player.fire=0;for(let i=0;i<20;i++){player.fire=0;shoot()}');assert(val('eco.balance')<0,'Il laser può andare in debito');
run('abort()');
console.log('PASS: crediti insufficienti e debito');

// Mercato: acquisti, livelli, saldo, persistenza.
run('eco.balance=20000;eco.upgrades={}');
assert.equal(val('ecoBuy("salvo")'),true);assert.equal(val('ecoUpgrade("salvo")'),1);assert.equal(val('eco.balance'),13500);
assert.equal(val('ecoBuy("salvo")'),true);assert.equal(val('ecoUpgrade("salvo")'),2);assert.equal(val('ecoBuy("salvo")'),false,'Livello massimo');
run('eco.balance=100');assert.equal(val('ecoBuy("laser")'),false,'Crediti insufficienti');assert.equal(val('ecoUpgrade("laser")'),0);
assert(JSON.parse(store.frontieraPotenziamenti).salvo===2,'Potenziamenti salvati');
console.log('PASS: mercato');
assert.equal(val('ecoNewlyAffordable({missionStart:1000,balance:2500}).map(it=>it.id).join(",")'),'speed,fuel,grenades');
assert.equal(val('ecoNewlyAffordable({missionStart:2500,balance:2500}).length'),0);
run(`
 const originalTone=tone,originalFrame=requestAnimationFrame;
 let nextFrame;
 const pitches=[];
 tone=freq=>pitches.push(freq);
 requestAnimationFrame=cb=>{nextFrame=cb;return 1};
 ecoShowReward({missionStart:1300,balance:2200,missionIncome:900},450);
 nextFrame(300);nextFrame(850);nextFrame(1200);nextFrame(1700);nextFrame(2500);
 globalThis.rewardRises=pitches.length===3&&pitches.every((freq,i)=>!i||freq>pitches[i-1]);
 tone=originalTone;requestAnimationFrame=originalFrame;
`);
assert.equal(val('$("rewardScore").textContent'), '450');
assert.equal(val('$("rewardCredits").textContent'), '900 CR');
assert(val('rewardRises'),'Il suono sale durante il conteggio');

// Dopo la liberazione il riepilogo parte sul pianeta, prima della navigazione.
run(`
 const originalFrame=requestAnimationFrame,originalDraw=drawPlatform;
 const hidden={};
 for(const id of ['resultOverlay','missionReward','rewardActions','marketScreen','rewardLandBtn']){
  $(id).classList.toggle=(name,off)=>{if(name==='hidden')hidden[id]=off};
 }
 let nextFrame,openSummary,planetDrawn=false;
 globalThis.queueMicrotask=fn=>{openSummary=fn};
 requestAnimationFrame=cb=>{nextFrame=cb;return 1};
 startPlatform();pf.kills=5;pfFinish(true);
 drawPlatform=()=>{planetDrawn=true};
 openSummary();
 draw();
 globalThis.rewardBeforeHome=state==='won'&&planetDrawn&&hidden.resultOverlay&&!hidden.missionReward&&hidden.rewardActions;
 nextFrame(1750);nextFrame(2500);
 globalThis.rewardReady=!hidden.rewardActions;
 $('rewardMarketBtn').onclick({currentTarget:$('rewardMarketBtn')});
 const enteredMarket=state==='won'&&hidden.missionReward&&!hidden.marketScreen;
 ecoCloseMarket();
 globalThis.rewardMarketReturn=enteredMarket&&hidden.marketScreen&&!hidden.missionReward;
 $('rewardClose').onclick();
 globalThis.rewardHome=state==='map'&&hidden.missionReward&&pf===null;
 startGame();state='orbit';kills=5;finish(true);
 openSummary();
 const orbitReward=state==='won'&&!hidden.missionReward&&hidden.rewardActions&&eco.last.phase===1;
 nextFrame(1750);nextFrame(2500);
 globalThis.rewardOrbit=orbitReward&&!hidden.rewardActions&&!hidden.rewardLandBtn&&$('rewardCredits').textContent==='20 CR';
 $('rewardLandBtn').onclick();
 globalThis.rewardLanding=hidden.missionReward&&state==='platform'&&eco.run.earlierIncome===20;
 abort();
 delete globalThis.queueMicrotask;
 drawPlatform=originalDraw;
 requestAnimationFrame=originalFrame;
`);
assert(val('rewardBeforeHome'),'Il conteggio parte sul pianeta con le azioni nascoste');
assert(val('rewardReady'),'Le azioni appaiono alla fine del conteggio');
assert(val('rewardMarketReturn'),'Il mercato si apre dal risultato e torna al risultato');
assert(val('rewardHome'),'La Home si apre solo dopo il riepilogo');
assert(val('rewardOrbit'),'Il riepilogo spaziale mostra i crediti e le azioni dopo il conteggio');
assert(val('rewardLanding'),'Dal riepilogo spaziale si atterra e si conservano le entrate della prima fase');
run(`
 startPlatform();pf.phase='missione';pf.pilot.visible=true;mouse.down=true;
 const balance=eco.balance;
 for(let i=0;i<90;i++)pfUpdateRifle(pf.pilot,1/60,true);
 globalThis.rifleHeld=pf.shots.length===1&&pf.pilot.rifleCharge===PF_RIFLE_FULL;
 mouse.down=false;pfUpdateRifle(pf.pilot,1/60,true);
 globalThis.rifleRelease=pf.shots.length===2&&pf.shots[1].dmg>pf.shots[0].dmg&&balance-eco.balance===7;
 abort();
`);
assert(val('rifleHeld'),'Premendo a lungo parte un colpo normale e si carica il fucile');
assert(val('rifleRelease'),'Al rilascio parte un colpo piu potente e vengono addebitati i crediti');


// Potenziamenti in gioco.
run('eco.balance=5000;eco.upgrades={salvo:2,laser:2,speed:3,shield:2,grenades:2};startGame();enemies=[];missile=null;launchMissile()');
assert.equal(val('wingMissiles.length'),2,'Tre missili insieme');assert.equal(val('eco.balance'),5000-75,'Tre missili: −75 CR');
run('missile=null;wingMissiles=[];eco.upgrades.salvo=1;launchMissile()');assert.equal(val('wingMissiles.length'),1,'Due missili insieme');
run('player.fire=0;shoot()');assert.equal(val('bullets[bullets.length-1].dmg'),2,'Laser potenziato');
run('player.vx=0;player.vy=0;applyShipThrust(1,0,false,10)');assert(val('player.vx')>240*1.3,'Motori più veloci');
run('player.health=100;player.shield=100;player.barrier=true;player.inv=0;damage(50)');assert(val('player.shield')>70,'Barriera rinforzata consuma meno');
run('player.x=0;player.y=0;player.vx=100;player.vy=0;player.barrier=true;eco.upgrades.shield=0;bounce({x:20,y:0,vx:0,vy:0},10);globalThis.kick0=Math.abs(player.vx-100)');
run('player.x=0;player.y=0;player.vx=100;player.vy=0;player.barrier=true;eco.upgrades.shield=2;bounce({x:20,y:0,vx:0,vy:0},10);globalThis.kick2=Math.abs(player.vx-100)');
assert(val('kick2<kick0*.7'),'La barriera rinforzata riduce anche il rimbalzo nello spazio');
run('abort();selected=0;startPlatform()');assert.equal(val('pf.pilot.grenades'),5,'Granate extra');
run('pf.pilot.barrier=true;pf.pilot.shield=100;pf.pilot.ground=true;pf.pilot.vx=0;pfDamage(10,1);globalThis.groundKick=Math.abs(pf.pilot.vx)');assert(val('groundKick<220'),'La barriera rinforzata riduce il contraccolpo a terra');
run('pf.pilot.fire=0;pfShoot()');assert.equal(val('pf.shots[0].dmg'),2,'Laser potenziato a terra');
run('eco.upgrades={};abort()');
console.log('PASS: potenziamenti nello spazio e a terra');

// Fase 2: granate pagate, premio missione solo con robot distrutto.
run('eco.balance=1000;selected=0;startPlatform()');step(3.5);
assert.equal(val('eco.run.spent.fuel'),30,'Carburante della discesa');
run('pf.phase="missione";pfThrowGrenade()');assert.equal(val('eco.run.spent.granata'),20,'Granata: −20 CR');
const b2=val('eco.balance');run('pf.rescued=3;pf.kills=6;pf.phase="vittoria";pfFinish(true)');
const r2=JSON.parse(val('JSON.stringify(eco.last)'));
assert.equal(r2.prize,600+3*60,'Premio: ricompensa del pianeta + bonus ostaggi');
assert.equal(val('eco.balance'),b2+36+780,'Premio e taglia accreditati');
run('abort();eco.balance=1000;startPlatform()');step(3.5);const b3=val('eco.balance');run('pf.kills=2;pfFinish(false)');
assert.equal(val('eco.last.prize'),0,'Nessun premio se la missione fallisce');assert.equal(val('eco.balance'),b3+12);
run('abort()');
console.log('PASS: premio della missione e riepilogo della fase 2');

// Temi dei pianeti.
const themes=['mare','deserto','tempesta','foresta','lava'];
for(let i=0;i<5;i++){run(`selected=${i};startPlatform()`);assert.equal(val('pf.theme.id'),themes[i]);step(4);run('drawPlatform()');assert(val('pf.deco.themeBack.flora.length')>5,'Decorazioni del tema');run('abort()')}
assert.equal(val('pfTheme({color:"#3070e0"}).id'),'mare');assert.equal(val('pfTheme({color:"#e02020"}).id'),'lava');assert.equal(val('pfTheme({color:"#30c040"}).id'),'foresta');assert.equal(val('pfTheme({color:"#f0d040"}).id'),'deserto');
run('selected=4;startPlatform();pf.pilot.visible=true;pf.pilot.y=PF_VH;globalThis.beforeFall=pf.lives;pfFell()');assert.equal(val('pf.lives'),val('beforeFall-1'),'La caduta nella lava consuma una vita');
console.log('PASS: temi mare, deserto, foresta, lava, tempesta');
