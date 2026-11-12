// Classifiche 2026-11-12: % di gioco ×N accanto ai punti, PERSONAL SCORE (100 migliori, solo nel salvataggio),
// al massimo 3 righe per pilota nella classifica mondiale (le altre si cancellano), tutto nel file .sfsave.
// Eseguire dalla cartella principale: node tests/classifica-personale.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
const {firebaseFinto}=require('./firebase-finto.cjs');
function game(F,ls){
 const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:F.setTimeout,clearTimeout:noop,setInterval:noop,fetch:F.fetch,Date:F.FakeDate,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,
  finish(win){sb.state=win?'won':'lost'},pfFinish(win){sb.state=win?'won':'lost'}};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['accesso.js','classifica.js','profilo.js','record.js','classifica-personale.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),sb);
 return{sb,el,run:c=>vm.runInContext(c,sb)};
}
const oggi='2026-11-11';
const riga=(n,s)=>({n:{stringValue:n},s:{integerValue:String(s)},d:{stringValue:oggi}});
const punti=F=>F.docs('classifica').filter(d=>d.fields.n.stringValue==='Fabio').map(d=>+d.fields.s.integerValue).sort((a,b)=>b-a);
const pausa=()=>new Promise(r=>setImmediate(r));

(async()=>{
 const F=firebaseFinto(),ls=storage();
 [50000,40000,30000,20000,10000].forEach((s,i)=>F.metti('classifica/vecchia'+i,riga('Fabio',s)));
 F.metti('classifica/altro',riga('Bianca',99000));
 const {sb,el,run}=game(F,ls);
 await run(`profCreate('Fabio','segreta1','','','pc')`);

 // 1) % di gioco e ciclo
 assert.equal(run('cpPercento()'),0);
 ls.setItem('frontieraPianetiLiberati','HX-01,KQ-17');
 assert.equal(run('cpPercento()'),33,'2 pianeti su 6 = 4 passi su 12');
 assert.equal(run('cpCiclo()'),1);
 ls.setItem('frontieraOmegaLibero','yes');
 assert.equal(run('cpPercento()'),50,'OMEGA vale 2 passi');
 assert.equal(run('cpCiclo()'),1,'finita la campagna si resta ×1 fino alla nuova partita');
 ls.setItem('frontieraOmegaLibero','');ls.setItem('frontieraPianetiLiberati','');
 assert.equal(run('cpCiclo()'),2,'ricominciata dopo averla finita: ×2');
 assert.equal(run('cpCiclo()'),2);
 assert.equal(run('cpFmt(45,2)'),'45% ×2');assert.equal(run('cpFmt(45,1)'),'45%');assert.equal(run('cpFmt(undefined,1)'),'—');
 ls.setItem('frontieraPianetiLiberati','HX-01');

 // 2) partita sotto il terzo record mondiale: nessuna riga nuova
 run('score=5000;state="play";finish(false)');await run('recQ');
 assert.deepEqual(punti(F),[50000,40000,30000,20000,10000],'niente riga nuova');
 assert.equal(ls.getItem('stellarRecord'),null);

 // 3) pulizia: restano le 3 migliori del pilota, quelle degli altri non si toccano
 assert.equal(await run('cpPulisci("Fabio")'),2);
 assert.deepEqual(punti(F),[50000,40000,30000]);
 assert.equal(F.docs('classifica').filter(d=>d.fields.n.stringValue==='Bianca').length,1);

 // 4) la partita supera il terzo record: riga nuova con g e r, la più bassa va via
 F.S.clock+=60000;
 run('score=35000;state="play";finish(false)');await run('recQ');
 assert.deepEqual(punti(F),[50000,40000,35000]);
 const mia=F.docs('classifica').find(d=>+d.fields.s.integerValue===35000);
 assert.equal(mia.fields.g.integerValue,'17','1 pianeta = 2 passi su 12');assert.equal(mia.fields.r.integerValue,'2');
 // 5) la stessa partita cresce: si aggiorna, non si duplica
 F.S.clock+=60000;ls.setItem('frontieraPianetiLiberati','HX-01,KQ-17,VX-44');
 run('score=45000;state="play";finish(true)');await run('recQ');
 assert.deepEqual(punti(F),[50000,46500,40000],"stessa riga aggiornata (45.000 + 1.500 di orbita)");
 assert.equal(F.docs('classifica').find(d=>d.id===mia.id).fields.g.integerValue,'50');

 // 6) PERSONAL SCORE: una riga per partita, con % e ciclo
 let me=JSON.parse(ls.getItem('stellarMieiRecord'));
 const corrente=ls.getItem('stellarPartita');
 const r=me.find(x=>x.p===corrente);
 assert.equal(r.s,46500);assert.equal(r.g,50);assert.equal(r.r,2);
 assert.equal(me.filter(x=>x.p===corrente).length,1,'una sola riga per la partita');
 // fino a 100 partite
 for(let i=0;i<130;i++){ls.setItem('stellarPartita','p'+i);run(`myAdd(${1000+i})`)}
 me=JSON.parse(ls.getItem('stellarMieiRecord'));
 assert.equal(me.length,100,'si tengono i 100 migliori');
 assert.equal(me[0].s,46500);
 assert.equal(run('cpPersonalRows().length'),100);
 ls.setItem('stellarPartita',corrente);

 // 7) fine partita sotto il terzo record con riga mai creata: niente invio, resta nel personal score
 ls.removeItem('stellarRecord');ls.setItem('stellarPartita','nuova');
 run('scorePending=2000');el.scoreName.value='Fabio';
 await run('scoreSubmit()');
 assert.deepEqual(punti(F),[50000,46500,40000]);
 assert.match(el.scoreMsg.textContent,/3 RECORD MONDIALI/);
 assert.equal(run('coView'),'personale');

 // 8) nel file di salvataggio
 for(const k of ['stellarCiclo','stellarMieiRecord','stellarRecord','stellarPunti','frontieraCrediti','frontieraPotenziamenti','stellarRecordResto','stellarClassifica','stellarInAttesa'])
  assert.ok(run('PROF_PROGRESS').includes(k),k+' nel .sfsave');
 const sig=fs.readFileSync(path.join(dist,'sigillo.js'),'utf8');assert.ok(sig.includes("'stellarCiclo'"),'ciclo protetto dal sigillo');
 console.log('classifica-personale: ok');
})().catch(e=>{console.error(e);process.exit(1)});
