// Potenziamenti permanenti (2026-11-11): restano dopo NUOVA PARTITA, RICOMINCIA e GAME OVER; punti e progressi si azzerano.
// Eseguire dalla cartella principale: node tests/upgrade-permanenti.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
store.frontieraPotenziamenti=JSON.stringify({laser:2,twin:1});store.frontieraCrediti='9000';store.frontieraGuadagni='6500';
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','upgrade-permanenti.js','finale.js','musica.js','ricomincia.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');
// i testi e il GAME OVER si agganciano a fine caricamento
vm.runInContext('upPermAvvio()',sandbox);
const up=()=>JSON.parse(val('JSON.stringify(eco.upgrades)'));
assert.deepEqual(up(),{laser:2,twin:1});
// RICOMINCIA / NUOVA PARTITA (mapNewGame come in mappa.js)
vm.runInContext('var scorePending=0;function scoreSave(){}function mapNewGame(b){vite=VITE_START;viteSave();ecoReset(b??ECO_START)}',sandbox);
run('score=4200;gameRestart(gameOverCarry())');
assert.deepEqual(up(),{laser:2,twin:1},'i potenziamenti restano');
assert.deepEqual(JSON.parse(store.frontieraPotenziamenti),{laser:2,twin:1},'anche nel salvataggio');
assert.equal(val('eco.balance'),1300,'crediti: solo il 20% dei guadagni');
assert.equal(val('eco.earned'),0);
assert.equal(val('score'),0,'il punteggio riparte da zero');
assert.equal(val('vite'),3);
console.log('PASS: ricomincia tiene i potenziamenti, punti a zero');
// GAME OVER
run('vite=0;viteGameOver()');
assert.deepEqual(JSON.parse(store.frontieraPotenziamenti),{laser:2,twin:1},'GAME OVER: i potenziamenti restano');
assert.match(nodes.get('resultText').textContent,/i potenziamenti comprati restano/);
assert.doesNotMatch(nodes.get('resultText').textContent,/Potenziamenti e pianeti liberati sono azzerati/);
console.log('PASS: GAME OVER tiene i potenziamenti');
