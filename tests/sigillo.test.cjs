// Salvataggi criptati (sigillo.js) e regole di ripresa (partita.js) — 2026-11-08.
// Eseguire dalla cartella principale: node tests/sigillo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const dist=path.join(__dirname,'..','dist');
const SIG=fs.readFileSync(path.join(dist,'sigillo.js'),'utf8'),PAR=fs.readFileSync(path.join(dist,'partita.js'),'utf8');
function storage(init){const m=new Map(init||[]);return{m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
// IndexedDB finto: una sola tabella chiave → valore, condivisa fra "riavvii"
function fakeIdb(store){
 return{open(){const q={result:{createObjectStore(){},transaction(){const t={objectStore:()=>({
  get(k){const r={result:store.has(k)?store.get(k):undefined};return r},put(v,k){store.set(k,v);return{}}})};setTimeout(()=>t.oncomplete&&t.oncomplete());return t}}};
  setTimeout(()=>q.onsuccess&&q.onsuccess());return q}};
}
function boot(ls,opts={}){
 const listeners={},sb={localStorage:ls,sessionStorage:opts.ss||storage(),TextEncoder,TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
  crypto:crypto.webcrypto,setTimeout,clearTimeout,Date,reloads:0,
  addEventListener(t,f){(listeners[t]=listeners[t]||[]).push(f)},location:{reload(){sb.reloads++}}};
 if(opts.idb)sb.indexedDB=opts.idb;
 sb.window=sb;sb.fire=t=>(listeners[t]||[]).forEach(f=>f());
 vm.createContext(sb);vm.runInContext(SIG,sb);
 return sb;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
// ---- 1) le vecchie chiavi in chiaro passano nel blocco criptato
{
 const ls=storage([['frontieraCrediti','4800'],['frontieraVite','2'],['stellarLang','it']]);
 const sb=boot(ls);
 assert.ok(!ls.m.has('frontieraCrediti')&&!ls.m.has('frontieraVite'),'niente più valori in chiaro');
 assert.equal(ls.m.get('stellarLang'),'it','le impostazioni restano normali');
 const blob=ls.m.get('cx_n7');assert.ok(blob&&blob.startsWith('CX1.'));
 assert.ok(!Buffer.from(blob.slice(4),'base64').toString('latin1').includes('4800'),'il valore non si legge nel blocco');
 assert.equal(ls.getItem('frontieraCrediti'),'4800','il gioco legge come prima');
 ls.setItem('frontieraCrediti','5200');sb.fire('pagehide');
 const sb2=boot(ls);assert.equal(ls.getItem('frontieraCrediti'),'5200','salvato e riletto dopo il riavvio');
 // un valore scritto a mano in chiaro viene ignorato e cancellato
 ls.m.set('frontieraCrediti','999999');boot(ls);
 assert.equal(ls.getItem('frontieraCrediti'),'5200','la chiave in chiaro scritta a mano non conta');
 console.log('PASS: progressi criptati e migrazione');
}
// ---- 2) blocco modificato a mano: senza copia nascosta la partita riparte da zero
{
 const ls=storage([['frontieraCrediti','9000']]),ss=storage();boot(ls,{ss});
 const b=ls.m.get('cx_n7'),i=b.length-10;ls.m.set('cx_n7',b.slice(0,i)+(b[i]==='A'?'B':'A')+b.slice(i+1));
 const sb=boot(ls,{ss});await wait(20);
 assert.equal(ls.getItem('frontieraCrediti'),null,'progressi azzerati');
 assert.equal(sb.sigillo.avviso(),'azzerato');
 console.log('PASS: manomissione scoperta');
}
// ---- 3) copia vecchia rimessa al posto del blocco: la copia nascosta ripara
{
 const db=new Map(),ls=storage([['frontieraVite','3']]);
 let sb=boot(ls,{idb:fakeIdb(db)});await wait(20);
 const vecchio=ls.m.get('cx_n7');
 ls.setItem('frontieraVite','1');sb.sigillo.salvaOra();await wait(20);
 sb.sigillo.seppellisci('corsaA');await wait(20);
 ls.m.set('cx_n7',vecchio);                       // il trucco: rimettere il salvataggio con 3 vite
 sb=boot(ls,{idb:fakeIdb(db)});
 assert.equal(ls.getItem('frontieraVite'),'3','prima del controllo si vede la copia vecchia');
 await wait(30);
 assert.equal(ls.getItem('frontieraVite'),'1','ripristinata la copia nascosta più recente');
 assert.equal(sb.reloads,1,'la pagina si ricarica una volta');
 assert.ok(sb.sigillo.morta('corsaA'),'anche l\'elenco delle partite finite resta');
 // blocco cancellato del tutto
 ls.m.delete('cx_n7');sb=boot(ls,{idb:fakeIdb(db),ss:storage()});await wait(30);
 assert.equal(ls.getItem('frontieraVite'),'1','blocco cancellato: torna dalla copia nascosta');
 console.log('PASS: copia nascosta contro i salvataggi vecchi');
}

// ---- 4) regole di ripresa
function game(ls,extra={}){
 let toast='';
 const sb={localStorage:ls,sessionStorage:extra.ss||storage(),$:()=>null,show(){},state:'map',paused:false,selected:0,godMode:false,phaseOneComplete:false,
  planets:[{code:'A1',name:'LYRA'},{code:'B2',name:'VESPER'}],pf:null,
  profToast(s){toast=s},get toast(){return toast},scoreFmt:n=>String(n),mapPlayable:()=>true,setTimeout:f=>f(),Date,
  sigillo:extra.sig,listeners:{},addEventListener(t,f){(sb.listeners[t]=sb.listeners[t]||[]).push(f)}};
 vm.createContext(sb);
 vm.runInContext(`
  var score=Number(localStorage.getItem('stellarPunti'))||0,vite=Number(localStorage.getItem('frontieraVite'))||3;
  const ECO_START=2500;function ecoLoad(){const v=parseInt(localStorage.getItem('frontieraCrediti'),10);return{balance:Number.isFinite(v)?v:ECO_START,upgrades:JSON.parse(localStorage.getItem('frontieraPotenziamenti')||'{}')}}
  const eco=ecoLoad();function ecoSave(){localStorage.setItem('frontieraCrediti',String(eco.balance));localStorage.setItem('frontieraPotenziamenti',JSON.stringify(eco.upgrades))}
  function scoreLoad(){return Number(localStorage.getItem('stellarPunti'))||0}function scoreSave(){localStorage.setItem('stellarPunti',String(score))}
  function viteSave(){localStorage.setItem('frontieraVite',String(vite))}
  function abort(){state='map'}
  function beginWarp(){state='warp'}
  function startPlatform(){state='platform';pf={p:planets[selected],phase:'gioco'}}
  function finish(win){state=win?'won':'lost';if(win){eco.balance+=1000;ecoSave()}}
  function pfFinish(win){state=win?'won':'lost'}
  function viteGameOver(){vite=3;viteSave();eco.balance=ECO_START;eco.upgrades={};ecoSave()}
  function gameOverCarry(){return Math.round((Number(localStorage.getItem("frontieraGuadagni"))||0)*.2)}
  function gameRestart(balance=ECO_START){vite=3;viteSave();eco.balance=balance;ecoSave();score=0;scoreSave()}
  function selectPlanet(i){selected=i}
  const PROF_PROGRESS=['frontieraCrediti','frontieraPotenziamenti','frontieraVite','stellarPunti'];
  let prof={snap:'x'};function profSnapKey(){return ''}function profStore(){}
  function profApply(u){for(const k in u)localStorage.setItem(k,u[k])}
 `+PAR,sb);
 return{sb,run:s=>vm.runInContext(s,sb)};
}
{
 const ls=storage([['frontieraCrediti','3000'],['stellarPunti','100'],['frontieraVite','3']]);
 const S1=boot(ls).sigillo,G=(o={})=>game(ls,Object.assign({sig:S1},o));
 let g=G();
 g.run('selected=1;beginWarp()');
 let s=JSON.parse(ls.getItem('stellarPartitaSalvata'));
 assert.equal(s.fase,1,'inizio missione nello spazio salvato da solo');assert.equal(s.code,'B2');assert.equal(s.snap.frontieraCrediti,'3000');
 g.run('selectPlanet(0)');assert.equal(g.run('selected'),1,'con una missione sospesa non si puo scegliere un altro pianeta');
 // durante la missione: punti, una vita persa, poi la pagina si chiude (connessione persa)
 g.run("state='play';score=900;scoreSave();vite=2;viteSave()");
 g=G();                                       // riavvio
 assert.ok(JSON.parse(ls.getItem('stellarPartitaSalvata')),'dopo il riavvio c\'è RIPRENDI PARTITA');
 g.run('saveResume()');
 assert.equal(g.run('state'),'warp','riparte dall\'inizio della fase nello spazio');
 assert.equal(g.run('score'),100,'punti com\'erano all\'inizio della missione');
 assert.equal(g.run('vite'),2,'la vita persa resta persa');
 // fase nello spazio vinta: il salvataggio passa all'inizio della fase a terra
 g.run("state='play';finish(true)");
 s=JSON.parse(ls.getItem('stellarPartitaSalvata'));assert.equal(s.fase,2);assert.equal(s.snap.frontieraCrediti,'4000');
 g.run("abort()");                                 // ABBANDONA dopo la fase 1
 g=G();g.run('saveResume()');
 assert.equal(g.run('state'),'platform','riprende a terra');assert.equal(g.run('phaseOneComplete'),true);
 assert.equal(JSON.parse(ls.getItem('stellarPartitaSalvata')).fase,2,'a terra resta salvato l\'inizio della fase');
 g.run('pfFinish(true)');assert.equal(ls.getItem('stellarPartitaSalvata'),null,'pianeta liberato: niente da riprendere');
 console.log('PASS: ripresa dall\'inizio della missione (spazio o terra)');

 // GAME OVER: si riparte da zero e la partita finisce fra quelle morte
 const sbS={sigillo:S1};g=G();
 const corsa=ls.getItem('stellarCorsa');assert.ok(corsa,'la partita ha un\'identità');
 g.run("beginWarp();viteGameOver()");
 assert.equal(ls.getItem('stellarPartitaSalvata'),null);assert.notEqual(ls.getItem('stellarCorsa'),corsa,'nuova partita');
 assert.ok(sbS.sigillo.morta(corsa),'la vecchia partita è segnata come finita');
 console.log('PASS: GAME OVER azzera e chiude la partita');
}
{
 // la pagina si chiude mentre la nave esplode con l'ultima vita
 const ls=storage([['frontieraVite','1'],['frontieraCrediti','7000'],['frontieraGuadagni','5000'],['stellarPunti','500']]);
 const S2=boot(ls).sigillo;let g=game(ls,{sig:S2});
 g.run("beginWarp();state='dying'");g.sb.listeners.pagehide.forEach(f=>f());
 assert.equal(ls.getItem('frontieraVite'),'0');
 g=game(ls,{sig:S2});
 assert.equal(ls.getItem('frontieraCrediti'),'1000','all\'avvio: GAME OVER, resta il 20% dei guadagni');
 assert.equal(ls.getItem('frontieraVite'),'3');assert.equal(ls.getItem('stellarPartitaSalvata'),null,'niente RIPRENDI');
 assert.match(g.sb.toast,/GAME OVER/);
 // a terra, pilota che cade con due vite
 ls.setItem('frontieraVite','2');g=game(ls,{sig:S2});
 g.run("startPlatform();pf.morte={t:0}");g.sb.listeners.pagehide.forEach(f=>f());
 assert.equal(ls.getItem('frontieraVite'),'1','la vita persa a terra conta anche chiudendo la pagina');
 console.log('PASS: chiudere la pagina non salva dalla morte');
}
{
 // backup .sfsave di una partita già finita: pilota sì, progressi no
 const ls=storage([['frontieraCrediti','12000'],['frontieraVite','4']]),ss=storage();
 const sbS=boot(ls);let g=game(ls,{ss,sig:sbS.sigillo});
 const vecchia=ls.getItem('stellarCorsa');
 g.run('viteGameOver()');assert.ok(sbS.sigillo.morta(vecchia));
 g.run(`profApply({frontieraCrediti:'12000',frontieraVite:'4',stellarCorsa:'${vecchia}'})`);
 assert.equal(ls.getItem('frontieraCrediti'),null,'progressi del backup rifiutati');assert.equal(ls.getItem('stellarCorsa'),null);
 g=game(ls,{ss,sig:sbS.sigillo});assert.match(g.sb.toast,/PARTITA GIÀ FINITA/);
 // backup della partita in corso: accettato
 const viva=ls.getItem('stellarCorsa');
 g.run(`profApply({frontieraCrediti:'3300',stellarCorsa:'${viva}'})`);assert.equal(ls.getItem('frontieraCrediti'),'3300');
 console.log('PASS: backup di una partita finita rifiutato');
}
})().catch(e=>{console.error(e);process.exit(1)});
