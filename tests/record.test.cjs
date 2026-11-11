// Record a fine missione (2026-11-04, regole nuove 2026-11-11): una riga per partita nella classifica mondiale,
// creata alla prima missione e aggiornata alle successive (accesso anonimo + nome del pilota prenotato);
// a fine partita la stessa riga riceve il punteggio finale. Tetti e attese delle regole.
// Eseguire dalla cartella principale: node tests/record.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
const MINI='data:image/jpeg;base64,'+Buffer.alloc(300,7).toString('base64');
const sha=k=>crypto.createHash('sha256').update(k).digest('hex');

const {firebaseFinto}=require('./firebase-finto.cjs');
function game(F,ls){
 const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:F.setTimeout,clearTimeout:noop,fetch:F.fetch,Date:F.FakeDate,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,
  finish(win){sb.state=win?'won':'lost';if(sb.gameOver)vm.runInContext('viteGameOver()',sb)},pfFinish(win){sb.state=win?'won':'lost'}};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['accesso.js','classifica.js','profilo.js','record.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),sb);
 return{sb,el,run:c=>vm.runInContext(c,sb)};
}
const pausa=()=>new Promise(r=>setImmediate(r));
async function finePartita(run,ls){for(let i=0;i<50&&ls.getItem('stellarRecord');i++)await pausa()}

(async()=>{
 // 1) Una riga per partita: missione 1 la crea (con accesso e nome prenotato), missione 2 la aggiorna, fine partita la chiude.
 {
  const F=firebaseFinto(),ls=storage(),{sb,run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','',${JSON.stringify(MINI)},'pc')`);
  run('score=1200;state="play";finish(false)');await run('recQ');
  let righe=F.docs('classifica');
  assert.equal(righe.length,1,'prima missione: una riga');
  let d=righe[0];
  assert.equal(d.fields.n.stringValue,'Fabio');assert.equal(d.fields.s.integerValue,'1200');assert.equal(d.fields.a.stringValue,MINI,'con la foto');
  assert(d.fields.t&&d.fields.c,'ora del server alla creazione');assert(!d.fields.h&&!d.fields.k,'niente chiavi sulla riga');
  assert(F.docs('nomi').length===1&&F.docs('nomi')[0].id==='fabio','nome prenotato');
  const r1=JSON.parse(ls.getItem('stellarRecord'));assert.equal(r1.id,d.id);assert.equal(run('coMyId'),r1.id);

  F.S.clock+=60000;
  run('score=5300;state="platform";pfFinish(true)');await run('recQ');
  righe=F.docs('classifica');assert.equal(righe.length,1,'seconda missione: stessa riga');assert.equal(righe[0].fields.s.integerValue,'5300');

  // missione finita dopo pochi secondi: il gioco aspetta i 15 secondi delle regole
  F.S.clock+=2000;
  run('score=6100;state="play";finish(false)');await run('recQ');
  assert.equal(F.docs('classifica')[0].fields.s.integerValue,'6100','scritta dopo l’attesa');

  // fine partita: la stessa riga riceve il punteggio finale e il record della partita si chiude
  F.S.clock+=60000;
  run('score=7400;state="play";gameOver=true;finish(false);gameOver=false');await pausa();await run('recQ');
  await finePartita(run,ls);
  assert.equal(F.docs('classifica').length,1,'fine partita: nessuna riga nuova');
  assert.equal(F.docs('classifica')[0].fields.s.integerValue,'7400');
  assert.equal(ls.getItem('stellarRecord'),null,'partita chiusa');
  assert.match(run('$("scoreMsg").textContent'),/POSIZIONE 1/);

  // nuova partita: nuova riga
  F.S.clock+=60000;
  run('score=900;state="play";finish(false)');await run('recQ');
  assert.equal(F.docs('classifica').length,2,'la partita dopo ha la sua riga');
  console.log('PASS: una riga per partita, aggiornata a ogni missione');
 }

 // 2) Tetti delle regole: oltre 80.000 alla creazione la riga parte a 80.000 e il resto arriva col tempo
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Muto','segreta1','','','pc')`);
  run('score=150000;state="play";finish(false)');await run('recQ');
  assert.equal(F.docs('classifica')[0].fields.s.integerValue,'80000','creata al tetto');
  assert.equal(JSON.parse(ls.getItem('stellarRecordResto'))[0].o,150000,'resto in attesa');
  run('recSave(null)');F.S.clock+=10*60000;await run('recRestoTick()');
  assert.equal(F.docs('classifica')[0].fields.s.integerValue,'150000','il resto è arrivato');
  assert.equal(ls.getItem('stellarRecordResto'),null);
  console.log('PASS: tetti e resto in arrivo');
 }

 // 3) Nomi unici: un altro browser non può usare il nome; lo stesso pilota con il backup sì
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','','','pc')`);
  run('score=1000;state="play";finish(true)');await run('recQ');
  const ls2=storage(),g2=game(F,ls2);
  assert.equal(await g2.run(`CX.nomeLibero('fabio')`),false,'nome preso');
  await g2.run(`profCreate('Fabio','altra123','','','pc')`);   // pilota creato senza controllo (per esempio offline)
  F.S.clock+=60000;g2.run('score=999999;state="play";finish(false)');await g2.run('recQ');
  assert.equal(F.docs('classifica').length,1,'con il nome di un altro non si scrive');
  // chi prova a scrivere direttamente senza accesso o senza il nome viene respinto
  const body=JSON.stringify({writes:[{update:{name:'projects/p/databases/(default)/documents/classifica/finta',fields:{n:{stringValue:'Fabio'},s:{integerValue:'3000000'},d:{stringValue:'2026-11-11'}}},updateTransforms:[{fieldPath:'t',setToServerValue:'REQUEST_TIME'},{fieldPath:'c',setToServerValue:'REQUEST_TIME'}]}]});
  assert.equal((await F.fetch('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents:commit?key=k',{method:'POST',body})).status,403,'senza accesso');
  assert.equal((await F.fetch('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents:commit?key=k',{method:'POST',body,headers:{Authorization:'Bearer T.utente2'}})).status,403,'con il nome di un altro');
  const ls3=storage();ls3.setItem('cxNomi',ls.getItem('cxNomi'));const g3=game(F,ls3);
  assert.equal(await g3.run(`CX.nomeMio('Fabio')`),'mio','altro PC con il backup');
  console.log('PASS: nomi unici');
 }

 // 4) Foto: righe senza foto mostrano quella del profilo (se il nome è il tuo) o l'iniziale
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','',${JSON.stringify(MINI)},'pc')`);
  assert(run(`profAva('','map-ava','Fabio')`).includes(MINI),'riga vecchia del pilota: la sua foto');
  const ini=run(`profAva('','map-ava','ffa')`);assert(/ava-ini/.test(ini)&&/>F<\/span>/.test(ini),'altri: iniziale');
  assert.equal(run(`profAva('','map-ava','')`),'');
  assert(run(`profAva(${JSON.stringify(MINI)},'map-ava','ffa')`).includes(MINI),'foto della riga se c’è');
  assert(!/</.test(run(`profAva('','x','<img>')`).replace(/<span[^>]*>|<\/span>/g,'')),'niente HTML dal nome');
  console.log('PASS: foto e iniziali in classifica');
 }
 // 5) IL TUO MIGLIOR RECORD: una riga per partita che cresce, restano le 5 migliori
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','',${JSON.stringify(MINI)},'pc')`);
  run('score=1000;state="play";finish(true)');await run('recQ');
  run('score=2500;state="platform";pfFinish(true)');await run('recQ');
  let m=JSON.parse(ls.getItem('stellarMieiRecord'));
  assert.equal(m.length,1,'stessa partita: una riga');assert.equal(m[0].s,2500);
  run('score=3100;state="play";gameOver=true;finish(false);gameOver=false');await new Promise(r=>setTimeout(r,30));await run('recQ');
  m=JSON.parse(ls.getItem('stellarMieiRecord'));assert.equal(m[0].s,3100,'fine partita: record finale');
  assert.equal(ls.getItem('stellarPartita'),null,'partita chiusa');
  for(const v of [500,9000,700,4000,6000,200]){run(`score=${v};state="play";gameOver=true;finish(false);gameOver=false`);await new Promise(r=>setTimeout(r,30))}
  m=JSON.parse(ls.getItem('stellarMieiRecord'));
  assert.deepEqual(m.map(r=>r.s),[9000,6000,4000,3100,700],'le 5 migliori, in ordine');
  assert(run('PROF_PROGRESS').includes('stellarMieiRecord'),'nel backup del profilo');
  console.log('PASS: i tuoi 5 migliori record');
 }
})().catch(e=>{console.error(e);process.exit(1)});
