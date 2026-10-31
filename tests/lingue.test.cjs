// Lingue e classifica: traduzioni, nome massimo 10 lettere, solo i primi 100.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
// --- traduzioni
const s1={localStorage:storage(),$:()=>null,console};vm.createContext(s1);
vm.runInContext(fs.readFileSync(path.join(dist,'i18n.js'),'utf8'),s1);
const run=c=>vm.runInContext(c,s1);
assert.equal(run('lang'),'en','inglese predefinito');
assert.equal(run("tr('TORNA ALLA MAPPA')"),'BACK TO MAP');
assert.equal(run("tr('ROTTA PER '+'LYRA')"),'COURSE TO LYRA');
assert.equal(run("tr('VITE ♥♥♥')"),'LIVES ♥♥♥');
assert.equal(run("tr('MAREA')"),'MAREA','solo parole intere');
assert.equal(run("I18N_LANGS.length"),7);
for(const l of ['it','en','fr','es','ru','zh','ja']){run(`setLang('${l}')`);assert.equal(run('lang'),l);assert.equal(typeof run("tr('MISSIONE COMPIUTA')"),'string')}
run("setLang('it')");assert.equal(run("tr('MISSIONE COMPIUTA')"),'MISSIONE COMPIUTA');
run("setLang('ja')");assert.equal(run("tr('MISSIONE COMPIUTA')"),'任務完了');
assert.equal(s1.localStorage.getItem('stellarLingua'),'ja');
assert(run('I18N_ROWS.every(r=>r.length===7&&r.every(x=>typeof x==="string"&&x.length))'),'ogni frase ha 7 lingue');
// --- classifica
const noop=()=>{};
const s2={localStorage:storage(),$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,
 dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
vm.createContext(s2);vm.runInContext(fs.readFileSync(path.join(dist,'classifica.js'),'utf8'),s2);
const r2=c=>vm.runInContext(c,s2);
assert.equal(r2("cleanName('  Fabio!!<b>12345678 ')"),'Fabiob1234','massimo 10 lettere, solo lettere e numeri');
assert.equal(r2("boardAdd('',100)"),-1,'serve un nome');
for(let i=0;i<120;i++)r2(`boardAdd('P${i}',${(i+1)*10})`);
assert.equal(r2('boardLoad().length'),100,'solo i primi 100');
assert.equal(r2('boardLoad()[0].s'),1200);
assert.equal(r2("boardAdd('BASSO',5)"),0,'fuori dai primi 100');
assert.equal(r2("boardAdd('TOP',99999)"),1);
assert.equal(r2('boardLoad()[0].n'),'TOP');
// punti: un nemico vale di più sui pianeti più difficili
r2("state='play';world={p:{difficulty:3}};dropSupply({type:'base'})");
assert.equal(r2('score'),300);
r2('scoreEnd()');assert.equal(r2('score'),0);assert.equal(r2('scorePending'),300);
console.log('lingue.test: ok');
// direzioni composte e comandi mobile
const s3={localStorage:storage(),$:()=>null,console};vm.createContext(s3);
vm.runInContext(fs.readFileSync(path.join(dist,'i18n.js'),'utf8'),s3);
assert.equal(vm.runInContext("tr('OBIETTIVO: ALTO-SINISTRA')",s3),'TARGET: UP-LEFT');
assert.equal(vm.runInContext("tr('SALTO')",s3),'JUMP');
console.log('lingue.test direzioni: ok');
// cellulare: niente indicazioni di tastiera e mouse
const s4={localStorage:storage(),$:()=>null,console,touch:{on:true}};vm.createContext(s4);
vm.runInContext(fs.readFileSync(path.join(dist,'i18n.js'),'utf8'),s4);
assert.equal(vm.runInContext("tr('RAGGIUNGI L’ORBITA · FRENO: F')",s4),'REACH ORBIT');
assert.equal(vm.runInContext("tr('BERSAGLIO AGGANCIATO · CLIC ROTELLA')",s4),'TARGET LOCKED');
assert.equal(vm.runInContext("tr('BARRIERA · MOUSE DX')",s4),'BARRIER');
vm.runInContext("setLang('it')",s4);
assert.equal(vm.runInContext("tr('POST-BRUCIATORE · SHIFT DX')",s4),'POST-BRUCIATORE');
console.log('lingue.test cellulare: ok');
