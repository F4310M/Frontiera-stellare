// Test 2026-11-10: mirino nuovo, mercato (jetpack, avviso, anteprima), ritorno in gioco a terra, fase finale.
// Eseguire dalla cartella principale: node tests/mirino-mercato-rientro.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');

// ---------------------------------------------------------------- caricamento in index.html
const html=read('dist/index.html');
const order=['upgrade-disponibili.js','mirino.js','mercato-plus.js','rientro.js','finale-fuga.js','esci.js'].map(f=>html.indexOf('src="'+f+'"'));
assert(order.every(i=>i>0),'Tutti gli script sono in index.html');
for(let i=1;i<order.length;i++)assert(order[i]>order[i-1],'Ordine degli script (esci.js resta ultimo)');
assert(fs.existsSync('dist/market-demo/jetpack.mp4'),'Video anteprima del jetpack');

// ---------------------------------------------------------------- mercato + jetpack
{
 const sb={console,Math,localStorage:{getItem(){return null},setItem(){}},$:()=>null,ico:()=>'<svg></svg>',ICONS:{},I18N_ROWS:[]};
 vm.createContext(sb);
 vm.runInContext(read('dist/economia.js').split('// Pulsanti: mercato')[0].replace(/^const eco=/m,'var eco='),sb);
 // fase2.js finto: stessa formula del jetpack
 vm.runInContext(`var PF_JET={heat:36,coolGround:45,coolAir:14,fuel:2.5,minBurn:.6};var PF_GRAVITY=1850;
  function upg(k){return ecoUpgrade(k)}
  function pfUpdateJetpack(P,dt,hold){if(P.jetOn){const vt=hold?-95:0;P.vy+=(vt-P.vy)*Math.min(1,dt*7)-PF_GRAVITY*dt;P.jetHeat+=dt*PF_JET.heat}}
  var pf={pilot:null},seenSpeed=0;function pfUpdatePilot(dt){seenSpeed=upg('speed')}`,sb);
 vm.runInContext(read('dist/mercato-plus.js'),sb);
 const val=s=>vm.runInContext(s,sb);
 assert.equal(val("ECO_ITEMS.filter(i=>i.id==='jetpack').length"),1,'Jetpack nel catalogo una volta sola');
 assert.equal(val("ECO_ITEMS.find(i=>i.id==='jetpack').levels.length"),3,'Tre livelli di jetpack');
 assert(val("typeof ECO_ART.jetpack==='string'&&!!ICONS.jetpack"),'Disegno e icona del jetpack');
 assert.deepEqual(val("eco.balance=2200;eco.upgrades={};mkAffordable().map(i=>i.id).filter(id=>id==='jetpack')"),['jetpack'],'Jetpack acquistabile con 2.200 CR');
 // senza potenziamento il jetpack è quello di sempre
 const run=lv=>val(`eco.upgrades={jetpack:${lv}};var P={jetOn:true,jetMin:0,jetHeat:0,vy:0};for(let i=0;i<30;i++)pfUpdateJetpack(P,1/60,true);[P.jetHeat,P.vy,PF_JET.heat]`);
 const [h0,v0,k0]=run(0),[h3,v3,k3]=run(3);
 assert(Math.abs(h0-18)<.01,'Livello 0: calore invariato');
 assert(h3<h0/1.9,'Livello 3: si scalda la metà (durata +100%)');
 assert(v3<v0,'Livello 3: sale più veloce');
 assert(k0===36&&k3===36,'PF_JET.heat torna al valore originale');
 assert.equal(val("eco.upgrades={jetpack:2};pf.pilot={jetOn:true,ground:false};pfUpdatePilot(1/60);seenSpeed"),.30/.08,'In volo col jetpack corre più veloce');
 assert.equal(val("pf.pilot={jetOn:false,ground:true};pfUpdatePilot(1/60);seenSpeed"),0,'A terra nessun bonus');
 assert.equal(val("upg('speed')"),0,'Fuori dal pilota upg non cambia');
 const rows=val('I18N_ROWS');
 for(const t of ['UPGRADE DISPONIBILE','JETPACK POTENZIATO','DURATA +100%','VELOCITÀ +45%'])
  assert(rows.some(r=>r[0]===t&&r.length===7&&r.every(Boolean)),'Traduzione in 7 lingue: '+t);
 const src=read('dist/mercato-plus.js');
 assert(/ecoMarketDemo\(ECO_ITEMS\[0\]\.id\)/.test(src),'Apertura: anteprima del primo potenziamento');
 assert(/pointerdown/.test(src)&&/scrollLeft=D\.left-dx/.test(src),'Trascinamento col mouse');
}

// ---------------------------------------------------------------- ritorno in gioco a terra
{
 const sb={console,Math,performance:{now:()=>0},paused:false,I18N_ROWS:[]};
 vm.createContext(sb);
 vm.runInContext(`var DROP={hover:200};var PF_FLOOR=600;var status=[];
  var pf={solids:[{x:0,w:2000,y:600}],plats:[],enemies:[{x:500,hp:1,shoveCd:0}],boss:null,drop:null,cam:{x:0},
   pilot:{x:500,y:600,vx:0,vy:0,hp:100,inv:0,shield:20,jetHeat:80,jetLock:true,landing:true,reserveLanding:true,visible:true}};
  var spc={ground:true};function spcBadge(){}
  function pfGroundAt(x){return 600}function pfRect(e){return{l:e.x-15,r:e.x+15,t:550,b:600}}
  function terraSafeGround(x){if(pf.enemies.some(e=>e.hp>0&&Math.abs(e.x-x)<125))return null;return 600}
  function terraFindDrop(p){for(let d=0;d<=1500;d+=12)for(const x of [p-d,p+d])if(x>0&&terraSafeGround(x)!==null)return{x,g:600};return null}
  function terraUpdateDrop(dt){}
  function pfStatus(s){status.push(s)}
  var hits=0;function pfDamage(n){hits++;pf.pilot.hp-=n}
  function pfUpdatePilot(dt){const P=pf.pilot;if(P.landing){P.landing=false;P.reserveLanding=false}}
  function pfUpdateEnemies(dt){pf.pilot.vx=430;pf.pilot.vy=-330;for(const e of pf.enemies)if(!(e.shoveCd>0))e.x+=40}
  function pfUpdateBoss(dt){pf.pilot.vx=-520}
  function drawPlatform(){}`,sb);
 vm.runInContext(read('dist/rientro.js'),sb);
 const val=s=>vm.runInContext(s,sb);
 val('var keep=pf.enemies;pf.enemies=[200,300,400,500,600,700,800].map(x=>({x,hp:1}))');
 assert.equal(val('terraFindDrop(500).x'),500,'Punto occupato dai nemici: sgancia lì lo stesso');
 val('pf.enemies=keep');
 assert.equal(val('pf.enemies[0].x=700;terraFindDrop(500).x'),500,'Punto libero vicino: lo usa');
 val('pf.enemies[0].x=500');
 val('pfUpdatePilot(1/60)');
 assert(Math.abs(val('pf.pilot.rientroT')-3)<1e-9,'Appena tocca terra: immune per 3 secondi');
 assert(val('pf.pilot.inv')>=3,'Invulnerabile');
 assert.deepEqual(val('[pf.pilot.shield,pf.pilot.jetHeat,pf.pilot.jetLock,spc.ground]'),[100,0,false,false],'Barriera, jetpack e speciale ricaricati');
 val('pfDamage(50)');assert.equal(val('hits'),0,'Nessun danno durante l\'immunità');
 val('pfUpdateEnemies(1/60);pfUpdateBoss(1/60)');
 assert.deepEqual(val('[pf.pilot.vx,pf.pilot.vy,pf.enemies[0].x]'),[0,0,500],'Attraversa nemici e boss: nessuna spinta');
 for(let i=0;i<200;i++)val('pfUpdatePilot(1/60)');
 assert.equal(val('pf.pilot.rientroT'),0,'Dopo 3 secondi finisce');
 val('pfDamage(10)');assert.equal(val('hits'),1,'Poi i colpi tornano a fare danno');
 assert(val("I18N_ROWS.some(r=>r[0].startsWith('IMMUNE PER 3 SECONDI')&&r.length===7)"),'Traduzione del messaggio di immunità');
}

// ---------------------------------------------------------------- fase finale
{
 const sb={console,Math,paused:false,state:'platform'};
 vm.createContext(sb);
 vm.runInContext(`var PF_FLOOR=600;var launched=0,finished=0;
  var pf={hostages:[],crowd:[],cam:{x:0,lock:true,lockX:0},phase:'vittoria',rnd:()=>.5,naviFuga:null};
  function pfViewW(){return 1200}function pfGroundAt(){return 600}
  function nfLaunch(){launched++;pf.naviFuga={}}
  function pfFreeColony(){for(let i=0;i<5;i++)pf.crowd.push({x:500,state:'libero',t:-i*.1,crowd:true,id:100+i});nfLaunch()}
  function pfUpdateHostages(dt){for(const h of pf.crowd)if(h.state==='fuga'){h.speed=200;h.x-=200*dt;if(h.x<pf.cam.x-160)h.state='salvo'}}
  function updatePlatform(dt){pfUpdateHostages(dt);pfFinish(true)}
  function pfFinish(){finished++}`,sb);
 vm.runInContext(read('dist/finale-fuga.js'),sb);
 const val=s=>vm.runInContext(s,sb);
 val('pfFreeColony()');
 assert.equal(val('launched'),0,'Le navi non partono subito');
 assert(val('pf.crowd.every(h=>h.x>1200&&h.state==="fuga")'),'Gli ostaggi entrano da destra e scappano');
 val('updatePlatform(1/30)');
 assert.equal(val('finished'),0,'La missione aspetta la fine della scena');
 let i=0;while(!val('launched')&&i++<2000)val('updatePlatform(1/30)');
 assert(val('pf.crowd.every(h=>h.state==="salvo"||h.x<pf.cam.x-30)'),'Navi partite solo con tutti gli ostaggi fuori dallo schermo');
 assert.equal(val('launched'),1,'Navi partite una volta');
 val('pf.naviFuga=null');for(let k=0;k<40;k++)val('updatePlatform(1/30)');
 assert(val('finished')>0,'Dopo le navi arriva il riepilogo');
}

// ---------------------------------------------------------------- mirino
{
 const src=read('dist/mirino.js');
 for(const c of ['mir-on','mir-kick','mir-hit','mir-kill','mir-charging'])assert(src.includes("'"+c+"'"),'Stato del mirino: '+c);
 assert(!/shadowBlur|ctx\.filter/.test(src),'Niente shadowBlur/ctx.filter (PC lenti)');
}
console.log('PASS: mirino, mercato, rientro, fase finale');
