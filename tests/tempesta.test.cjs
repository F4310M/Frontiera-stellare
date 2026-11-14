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
function pfBanner(t){banners.push(t)}function pfStatus(t){stati.push(t)}`,sb);
vm.runInContext(fs.readFileSync(path.join(dist,'tempesta.js'),'utf8'),sb);
const run=c=>vm.runInContext(c,sb),step=(n,f)=>{for(let i=0;i<n;i++){if(f)f();run('pfUpdatePilot(1/60)')}};

// prima della tempesta nessuna spinta
run('pf.tempesta={next:4,t:-1,dur:6,k:0,warned:false,gust:0}');
step(30);assert.equal(run('pf.pilot.x'),900,'calma: nessuna spinta');
step(60);assert.ok(sb.banners.includes('TEMPESTA IN ARRIVO'),'avviso prima della tempesta');
step(60*4);assert.ok(run('pf.tempesta.k')>.5,'tempesta in corso');
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
// col boss o nei sotterranei la tempesta si calma
run('pf.boss={}');step(60*3);assert.equal(run('pf.tempesta.k'),0,'col boss niente tempesta');
assert.ok(sb.stati.includes('TEMPESTA · AVANZA SOLO COL JETPACK'));
const src=fs.readFileSync(path.join(dist,'tempesta.js'),'utf8').split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
assert.ok(!/shadowBlur\s*=/.test(src)&&!/\.filter\s*=/.test(src),'niente shadowBlur o ctx.filter');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('tempesta.js')>at('battaglia.js')&&at('tempesta.js')>at('mercato-plus.js')&&at('tempesta.js')>at('sotterranei.js'),'ordine di caricamento');
console.log('tempesta: ok');
