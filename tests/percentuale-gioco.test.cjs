// % GIOCO (2026-11-12): missioni superate (spazio e terra) su 12 totali (5 pianeti + OMEGA, spazio + terra).
// Eseguire dalla cartella principale: node tests/percentuale-gioco.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
const {firebaseFinto}=require('./firebase-finto.cjs');
const F=firebaseFinto(),ls=storage();
const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:F.setTimeout,clearTimeout:noop,setInterval:noop,fetch:F.fetch,Date:F.FakeDate,
 crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,
 planets:[{code:'HX–01'},{code:'KQ–17'},{code:'VX–44'}],selected:0,
 finish(win){sb.state=win?'won':'lost'},pfFinish(win){sb.state=win?'won':'lost'}};
vm.createContext(sb);
vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['accesso.js','classifica.js','profilo.js','record.js','classifica-personale.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),sb);
const run=c=>vm.runInContext(c,sb);
run('myRun()');
assert.equal(run('cpPercento()'),0,'inizio partita');
// vinta la missione nello spazio del primo pianeta: 1 su 12
sb.state='orbit';run('finish(true)');
assert.equal(run('cpPercento()'),8,'1 missione su 12');
// pianeta liberato (spazio + terra): 2 su 12
ls.setItem('frontieraPianetiLiberati','HX–01');
assert.equal(run('cpPercento()'),17);
// spazio del secondo pianeta: 3 su 12
sb.selected=1;sb.state='orbit';run('finish(true)');
assert.equal(run('cpPercento()'),25);
// GAME OVER: i pianeti si azzerano ma la % della partita resta
ls.setItem('frontieraPianetiLiberati','');
assert.equal(run('cpPercento()'),25,'non torna indietro nella stessa partita');
run('myAdd(38800)');
const me=JSON.parse(ls.getItem('stellarMieiRecord'));
assert.equal(me.find(x=>x.p===ls.getItem('stellarPartita')).g,25);
// nuova partita: si riparte da 0
ls.setItem('stellarPartita','nuova');
assert.equal(run('cpPercento()'),0);
console.log('percentuale-gioco: ok');
