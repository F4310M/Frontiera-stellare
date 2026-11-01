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
assert.equal(s1.localStorage.getItem('stellarLang'),'ja');
assert(run('I18N_ROWS.every(r=>r.length===7&&r.every(x=>typeof x==="string"&&x.length))'),'ogni frase ha 7 lingue');
// --- classifica
const noop=()=>{};
const s2={localStorage:storage(),$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,
 dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
vm.createContext(s2);vm.runInContext(fs.readFileSync(path.join(dist,'classifica.js'),'utf8'),s2);
const r2=c=>vm.runInContext(c,s2);
assert.equal(r2("cleanName('  Fabio!!<b>1234567890123456789 ')"),'Fabiob12345678901234','massimo 20 lettere, solo lettere e numeri');
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
// classifica mondiale: senza configurazione resta locale; con configurazione legge e scrive su Firestore
(async()=>{
 const s5={localStorage:storage(),$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,setTimeout:()=>0,clearTimeout:noop,
  dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
 vm.createContext(s5);vm.runInContext(fs.readFileSync(path.join(dist,'firebase-config.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'classifica.js'),'utf8'),s5);
 assert.equal(vm.runInContext('coOn',s5),false,'senza configurazione: solo classifica locale');
 const docs=[],calls=[];
 const fetch=async(url,o)=>{calls.push(url);const b=JSON.parse(o.body);
  const sorted=()=>docs.slice().sort((a,b)=>b.fields.s.integerValue-a.fields.s.integerValue||(a.name<b.name?1:-1));
  if(url.includes(':runAggregationQuery')){const v=+b.structuredAggregationQuery.structuredQuery.where.fieldFilter.value.integerValue;return{ok:true,json:async()=>[{result:{aggregateFields:{c:{integerValue:String(docs.filter(d=>+d.fields.s.integerValue>v).length)}}}}]}}
  if(url.includes(':runQuery')){let l=sorted();const sa=b.structuredQuery.startAt;if(sa){const i=l.findIndex(d=>d.name===sa.values[1].referenceValue);l=l.slice(i+1)}
   return{ok:true,json:async()=>l.slice(0,b.structuredQuery.limit).map(d=>({document:d}))}}
  if(s5.rete===false)return{ok:false,status:503};
  const d={name:'projects/p/databases/(default)/documents/classifica/id'+docs.length,fields:b.fields};docs.push(d);return{ok:true,json:async()=>d}};
 const s6={localStorage:storage(),$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,setTimeout:()=>0,clearTimeout:noop,fetch,
  dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
 vm.createContext(s6);vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+fs.readFileSync(path.join(dist,'classifica.js'),'utf8'),s6);
 const r6=c=>vm.runInContext(c,s6);
 assert.equal(r6('coOn'),true);
 await r6("coSend({n:'ALFA',s:500,d:'2026-11-01'})");
 await r6("coSend({n:'BETA',s:900,d:'2026-11-01'})");
 const top=await r6('coTop(true)');
 assert.equal(top.length,2);assert.equal(top[0].n,'BETA');assert.equal(top[0].s,900);
 assert(calls[0].includes('firestore.googleapis.com/v1/projects/p/databases/(default)/documents/classifica?key=k'));
 // senza rete il punteggio resta in attesa e parte dopo
 s6.rete=false;s6.fetch=async(u,o)=>{if(!u.includes(':runQuery'))return{ok:false,status:503};return fetch(u,o)};
 r6("coPendingSave([{n:'GAMMA',s:700,d:'2026-11-01'}])");
 await r6('coFlush()');assert.equal(r6('coPending().length'),1,'resta in attesa');
 s6.rete=true;s6.fetch=fetch;
 await r6('coFlush()');assert.equal(r6('coPending().length'),0,'inviato');
 assert.equal((await r6('coTop(true)'))[1].n,'GAMMA');
 // posizione e pagine da 100
 for(let i=0;i<250;i++)await r6(`coSend({n:'P${i}',s:${1000+i},d:'2026-11-01'})`);
 assert.equal(await r6('coRank(1100)'),150,'149 punteggi più alti, quindi posizione 150');
 assert.equal((await r6('coTop(true)')).length,100);assert.equal(r6('coMore'),true);
 assert.equal((await r6('coNext()')).length,200);
 const all=await r6('coNext()');assert.equal(all.length,253);assert.equal(r6('coMore'),false);
 assert.equal(new Set(all.map(r=>r.id)).size,253,'nessun doppione tra le pagine');
 assert.equal(all[0].s,1249);assert.equal(all[252].s,500);
 console.log('lingue.test classifica mondiale: ok');
})().catch(e=>{console.error(e);process.exit(1)});
