// Test 2026-11-11: dopo gli acquisti il riquadro ORA ACQUISTABILI NEL MERCATO mostra solo ciò che puoi ancora comprare.
// Eseguire dalla cartella principale: node tests/mercato-aggiorna.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8'),at=f=>html.indexOf(`src="${f}"`);
assert(at('mercato-aggiorna.js')>Math.max(at('economia.js'),at('mercato-plus.js')),'caricato dopo economia.js e mercato-plus.js');
const els={};function el(id){return els[id]||(els[id]={id,textContent:'',onclick:null,cls:new Set(),classList:{toggle(c,on){on?els[id].cls.add(c):els[id].cls.delete(c)},contains(c){return els[id].cls.has(c)}}})}
const sb={console,Math,$:el};vm.createContext(sb);
vm.runInContext(`function show(id,on=true){$(id).classList.toggle('hidden',!on)}
const ECO_ITEMS=[{id:'a',name:'LASER',prices:[1000,2000]},{id:'b',name:'MOTORI',prices:[1500]},{id:'c',name:'SCUDO',prices:[9000]}];
const eco={balance:2600},liv={a:0,b:0,c:0};function ecoUpgrade(id){return liv[id]}
function ecoNewlyAffordable(r){return ECO_ITEMS.filter(it=>{const p=it.prices[ecoUpgrade(it.id)];return r.missionStart<p&&r.balance>=p})}
function ecoShowReward(r){const items=ecoNewlyAffordable(r);$('rewardItems').textContent=items.map(i=>i.name).join(' · ');show('rewardMarket',items.length>0)}
function ecoCloseMarket(){}`,sb);
vm.runInContext(fs.readFileSync('dist/mercato-aggiorna.js','utf8'),sb);
const val=s=>vm.runInContext(s,sb);
val('ecoShowReward({missionStart:500,balance:2600})');
assert.equal(el('rewardItems').textContent,'LASER · MOTORI');
assert.equal(typeof el('closeMarket').onclick,'function','pulsante INDIETRO del mercato collegato');
val('eco.balance=1600;liv.a=1;ecoCloseMarket()');
assert.equal(el('rewardItems').textContent,'MOTORI','comprato il laser: resta solo MOTORI');
assert(!el('rewardMarket').classList.contains('hidden'));
val('eco.balance=100;liv.b=1;ecoCloseMarket()');
assert(el('rewardMarket').classList.contains('hidden'),'niente più da comprare: il riquadro (e il bordo oro) spariscono');
console.log('PASS: riquadro mercato aggiornato dopo gli acquisti');
