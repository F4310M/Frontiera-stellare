// Test 2026-11-11: niente fiamme sul robot distrutto (senza-fiamme.js) e bordo rosso quando ti agganciano (bordo-allarme.js).
// Eseguire dalla cartella principale: node tests/fiamme-bordo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8'),at=f=>html.indexOf(`src="${f}"`);
assert(at('fiamme-relitto.js')<0&&at('senza-fiamme.js')>at('battaglia.js')&&at('bordo-allarme.js')>at('arena.js'),'script caricati dopo battaglia.js e arena.js');
{const s2={battDrawFire(){throw new Error('fiamme')}};vm.createContext(s2);vm.runInContext('var battDrawFire=this.battDrawFire;'+fs.readFileSync('dist/senza-fiamme.js','utf8'),s2);vm.runInContext('battDrawFire(0,0,0)',s2)}
for(const f of ['senza-fiamme.js','bordo-allarme.js']){const s=fs.readFileSync('dist/'+f,'utf8');assert(!/shadowBlur\s*=|\.filter\s*=/.test(s),f+': niente shadowBlur o filter')}
const sb={Math,console,performance:{now:()=>0},W:800,H:600,canvas:{width:800,height:600}};vm.createContext(sb);
let calls=0;sb.ctx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient')return()=>({addColorStop(){}});return()=>{calls++}},set(t,k,v){t[k]=v;return true}});
vm.runInContext('var state="play",player={destroyed:false},EM={lockers:new Set(),missiles:[]},EM_LOCK_SECONDS=2.4,draw=function(){};',sb);
vm.runInContext(fs.readFileSync('dist/bordo-allarme.js','utf8'),sb);
const val=s=>vm.runInContext(s,sb);
assert.equal(val('baDanger()'),null,'nessun pericolo, nessun bordo');
val('EM.lockers.add({emLock:1.2})');assert(Math.abs(val('baDanger().lock')-.5)<1e-9,'aggancio in corso');
calls=0;val('draw()');assert(calls>0,'il bordo si disegna');
val('EM.lockers.clear();EM.missiles.push({})');assert(val('baDanger().missile'),'missile in arrivo');
val('state="platform";var pf={pilot:{hp:100},phase:"missione",missiles:[{razzo:true,hp:1}],enemies:[]}');assert(val('baDanger().missile'),'a terra: razzo che ti insegue');
val('pf.missiles=[];var LM={aim:1};pf.enemies=[{hp:1,lm:{state:"mira",t:.5}}]');assert(Math.abs(val('baDanger().lock')-.5)<1e-9,'a terra: lanciamissili che prende la mira');
console.log('PASS: niente fiamme e bordo rosso');
