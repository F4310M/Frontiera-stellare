// Tempesta di vento a terra (2026-11-14): il vento spinge indietro il pilota, si avanza solo col jetpack.
// Eseguire dalla cartella principale: node tests/tempesta.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const sb={Math,performance:{now:()=>0},state:'platform',paused:false,PF_RUN:265,PF_JET:{heat:36},W:1280,H:720,banners:[],stati:[]};
vm.createContext(sb);
vm.runInContext(`var pf={phase:'missione',under:false,boss:null,cam:{x:0,lock:false},theme:{id:'deserto'},
 solids:[{x:0,y:600,w:2000}],plats:[],pilot:{x:900,y:600,w:22,vx:0,vy:0,ground:true,onPlat:false,visible:true,hp:100,jetOn:false}};
function pfGroundAt(x){for(const s of pf.solids)if(x>=s.x&&x<s.x+s.w)return s.y;return null}
function pfUpdatePilot(dt){const P=pf.pilot;if(!P.jetOn)P.x+=P.vx*dt;else P.x+=P.vx*dt}
var calore=[];function pfUpdateJetpack(P,dt,hold){calore.push(PF_JET.heat)}
function drawPlatform(){}
function pfUpdateEnemies(dt){}
function pfBanner(t){banners.push(t)}function pfStatus(t){stati.push(t)}`,sb);
vm.runInContext(fs.readFileSync(path.join(dist,'tempesta.js'),'utf8'),sb);
const run=c=>vm.runInContext(c,sb),step=(n,f)=>{for(let i=0;i<n;i++){if(f)f();run('pfUpdatePilot(1/60)')}};

// prima della tempesta nessuna spinta
run('pf.tempesta={next:7,t:-1,dur:6,k:0,warned:false,gust:0}');
step(90);assert.equal(run('pf.pilot.x'),900,'calma: nessuna spinta');
step(60);assert.equal(run('pf.tempesta.warned'),true,'avviso prima della tempesta');
step(60*6);assert.ok(run('pf.tempesta.k')>.5,'tempesta in corso');
// a piedi, correndo avanti, si arretra
let x0=run('pf.pilot.x');step(60,()=>run('pf.pilot.vx=265'));assert.ok(run('pf.pilot.x')<x0,'a piedi il vento vince');
// col jetpack acceso il vento non spinge e il jetpack si scalda più piano
x0=run('pf.pilot.x');run('pf.pilot.jetOn=true');step(60,()=>run('pf.pilot.vx=265'));assert.ok(run('pf.pilot.x')>x0+200,'col jetpack si avanza');
run('pfUpdateJetpack(pf.pilot,1/60,true)');assert.ok(run('calore[calore.length-1]')<36,'jetpack più fresco nella tempesta');
assert.equal(run('PF_JET.heat'),36,'valore originale ripristinato');
run('pf.pilot.jetOn=false');
// il vento non butta il pilota in un burrone già superato
run('pf.solids=[{x:0,y:600,w:300},{x:420,y:600,w:2000}];pf.pilot.x=440;pf.pilot.vx=0');
step(120);assert.ok(run('pf.pilot.x')>=420,'si ferma sul bordo del burrone');
// anche i nemici vengono spinti indietro (soldati a terra e droni), ma non in un burrone
run("pf.enemies=[{x:1200,y:600,w:24,hp:50,ground:true,vx:0},{x:460,y:600,w:24,hp:50,ground:true,vx:0},{x:1000,y:300,hp:20,type:'drone'}]");
for(let i=0;i<60;i++)run('pfUpdateEnemies(1/60)');
assert.ok(run('pf.enemies[0].x')<1200-150,'il vento spinge il soldato nemico');
assert.ok(run('pf.enemies[1].x')>=420,'il nemico non cade nel burrone');
assert.ok(run('pf.enemies[2].x')<1000&&run('pf.enemies[2].x')>run('pf.enemies[0].x')-1000,'il drone è spinto un po\'');
// col boss o nei sotterranei la tempesta si calma
run('pf.boss={}');step(60*3);assert.equal(run('pf.tempesta.k'),0,'col boss niente tempesta');
assert.ok(sb.stati.includes('TEMPESTA · AVANZA SOLO COL JETPACK'));
const src=fs.readFileSync(path.join(dist,'tempesta.js'),'utf8').split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
assert.ok(!/shadowBlur\s*=/.test(src)&&!/\.filter\s*=/.test(src),'niente shadowBlur o ctx.filter');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('tempesta.js')>at('battaglia.js')&&at('tempesta.js')>at('mercato-plus.js')&&at('tempesta.js')>at('sotterranei.js'),'ordine di caricamento');
console.log('tempesta: ok');

// ---- 11-15: avviso sul monitor e nebbia velenosa nel sottosuolo
{
 const sb2={Math,performance:{now:()=>0},state:'platform',paused:false,PF_RUN:265,PF_JET:{heat:36},W:1280,H:720,stati:[],perse:0};
 vm.createContext(sb2);
 vm.runInContext(`var pf={phase:'missione',under:true,boss:null,cam:{x:0,lock:false},theme:{id:'deserto'},flash:0,
  solids:[{x:0,y:600,w:2000}],plats:[],pilot:{x:900,y:600,w:22,vx:0,vy:0,ground:true,visible:true,hp:100,shield:100,barrier:false,jetOn:false}};
 function pfGroundAt(x){return 600}function pfUpdatePilot(dt){}function pfUpdateJetpack(){}function drawPlatform(){}
 function pfBanner(){}function pfStatus(t){stati.push(t)}function pfLoseLife(){perse++}`,sb2);
 vm.runInContext(fs.readFileSync(path.join(dist,'tempesta.js'),'utf8'),sb2);
 const r2=c=>vm.runInContext(c,sb2),st2=n=>{for(let i=0;i<n;i++)r2('pfUpdatePilot(1/60)')};
 r2('pf.nebbia={next:3,t:-1,dur:6,k:0,warned:false,acc:0,hiss:0}');
 st2(60);assert.equal(r2('pf.tempesta.k'),0,'nel sottosuolo niente vento');
 assert.equal(r2('pf.nebbia.warned'),true,'avviso della nebbia prima che arrivi');
 st2(60*4);assert.ok(r2('pf.nebbia.k')>.9,'nebbia in corso');
 let h0=r2('pf.pilot.hp');st2(120);assert.ok(r2('pf.pilot.hp')<=h0-8,'la nebbia toglie energia');
 h0=r2('pf.pilot.hp');r2('pf.pilot.barrier=true');st2(120);assert.equal(r2('pf.pilot.hp'),h0,'con la barriera niente danno');
 assert.ok(r2('pf.pilot.shield')<100,'la barriera si consuma');
 assert.ok(sb2.stati.includes('NEBBIA VELENOSA · TIENI LA BARRIERA'));
 r2('pf.under=false');st2(60*3);assert.equal(r2('pf.nebbia.k'),0,'in superficie la nebbia sparisce');
 const s2=fs.readFileSync(path.join(dist,'tempesta.js'),'utf8');assert.ok(/TS=\{[\s\S]*warn:5/.test(s2),'avviso 5 secondi prima');
 console.log('tempesta (avviso + nebbia): ok');
}
