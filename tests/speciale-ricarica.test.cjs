// Test 2026-11-11: colpo speciale carico a inizio missione (spazio/terra) e dopo una vita persa, senza costo in crediti.
// Eseguire dalla cartella principale: node tests/speciale-ricarica.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8'),at=f=>html.indexOf(`src="${f}"`);
assert(at('speciale-ricarica.js')>Math.max(at('speciale.js'),at('vite.js'),at('rientro.js')),'caricato dopo speciale.js, vite.js e rientro.js');
for(const f of ['speciale.js','bombardamento.js','speciale-ricarica.js']){const s=fs.readFileSync('dist/'+f,'utf8');assert(!/\b(pay|ecoSpend)\s*\(/.test(s),f+': il colpo speciale non costa crediti')}
const sb={console,Math};vm.createContext(sb);
vm.runInContext(`var spc={space:true,ground:true,spin:{t:1},beams:[1],strike:null},badge=0,state='play';
function spcBadge(){badge++}
function startGame(){return 'g'} function startPlatform(){return 'p'} function vtRespawnSpace(){} function pfLoseLife(){}`,sb);
vm.runInContext(fs.readFileSync('dist/speciale-ricarica.js','utf8'),sb);
const val=s=>vm.runInContext(s,sb);
assert.equal(val('startGame()'),'g','startGame restituisce sempre il suo valore');
assert(!val('spc.space')&&!val('spc.ground')&&val('spc.spin')===null&&val('spc.beams.length')===0,'inizio missione nello spazio: colpo pieno');
val('spc.ground=true');assert.equal(val('startPlatform()'),'p');assert(!val('spc.ground'),'inizio missione a terra: colpo pieno');
val('spc.space=true;spc.spin={t:.5}');val('vtRespawnSpace()');assert(!val('spc.space')&&val('spc.spin')===null,'vita persa nello spazio: colpo pieno');
val('spc.ground=true;spc.strike={t:1}');val('pfLoseLife()');assert(!val('spc.ground'),'vita persa a terra: colpo pieno');
assert(val('spc.strike.t')===1,'una bomba già sganciata finisce il suo giro');
console.log('PASS: colpo speciale sempre carico e gratis');
