// Profilo del pilota (2026-11-03): file di salvataggio criptato e anti-manomissione,
// ripristino dei progressi, invio automatico di nome + foto + punti a fine gioco.
// Eseguire dalla cartella principale: node tests/profilo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
const MINI='data:image/jpeg;base64,'+Buffer.alloc(300,7).toString('base64');

(async()=>{
 // Firestore finto: con regole vecchie (rifiuta il campo foto) o nuove.
 const docs=[];let regoleNuove=false;
 const fetch=async(url,o)=>{const b=JSON.parse(o.body);
  if(url.includes(':runAggregationQuery')){const v=+b.structuredAggregationQuery.structuredQuery.where.fieldFilter.value.integerValue;return{ok:true,json:async()=>[{result:{aggregateFields:{c:{integerValue:String(docs.filter(d=>+d.fields.s.integerValue>v).length)}}}}]}}
  if(url.includes(':runQuery'))return{ok:true,json:async()=>docs.slice().sort((a,b)=>b.fields.s.integerValue-a.fields.s.integerValue).map(d=>({document:d}))};
  if(b.fields.a&&!regoleNuove)return{ok:false,status:403};
  const d={name:'projects/p/databases/(default)/documents/classifica/id'+docs.length,fields:b.fields};docs.push(d);return{ok:true,json:async()=>d}};
 const ls=storage();
 const sb={localStorage:ls,$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,setTimeout:()=>0,clearTimeout:noop,fetch,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,
  dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+fs.readFileSync(path.join(dist,'classifica.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'profilo.js'),'utf8'),sb);
 const run=c=>vm.runInContext(c,sb);

 // 1) Senza profilo: niente pilota. Creazione con password.
 assert.equal(run('prof'),null);
 ls.setItem('frontieraCrediti','3200');ls.setItem('frontieraVite','4');ls.setItem('frontieraPianetiLiberati','HX-01,HX-02');ls.setItem('stellarPunti','12500');
 await run(`profCreate('Fabio!! 77','segreta1','',${JSON.stringify(MINI)},'pc')`);
 assert.equal(run('prof.nome'),'Fabio 77','nome pulito come in classifica');
 assert(!ls.getItem('stellarProfilo').includes('segreta1'),'la password non viene salvata');
 assert.equal(run('prof.mini'),MINI);
 console.log('PASS: creazione del pilota');

 // 2) File criptato: niente testo in chiaro, si riapre solo con la password giusta
 const file=await run('profPack(profKeyMem)');
 assert(!file.includes('3200')&&!file.includes('Fabio')&&!file.includes('HX-01'),'nel file non si leggono nome né progressi');
 const u=await run(`profUnpack(${JSON.stringify(file)},'segreta1')`);
 assert.equal(u.body.nome,'Fabio 77');assert.equal(u.body.progressi.frontieraCrediti,'3200');assert.equal(u.body.progressi.stellarPunti,'12500');
 await assert.rejects(run(`profUnpack(${JSON.stringify(file)},'sbagliata')`),/PASSWORD ERRATA O FILE MANOMESSO/);
 console.log('PASS: file criptato, password giusta e sbagliata');

 // 3) Anti-manomissione: un byte cambiato nei dati, nel sale o nelle iterazioni e il file non si apre più
 const j=JSON.parse(file),dati=Buffer.from(j.dati,'base64');dati[5]^=1;
 await assert.rejects(run(`profUnpack(${JSON.stringify(JSON.stringify(Object.assign({},j,{dati:dati.toString('base64')})))},'segreta1')`),/MANOMESSO/);
 const iv=Buffer.from(j.iv,'base64');iv[0]^=1;
 await assert.rejects(run(`profUnpack(${JSON.stringify(JSON.stringify(Object.assign({},j,{iv:iv.toString('base64')})))},'segreta1')`),/MANOMESSO/);
 await assert.rejects(run(`profUnpack(${JSON.stringify(JSON.stringify(Object.assign({},j,{iter:j.iter+1})))},'segreta1')`),/MANOMESSO/);
 await assert.rejects(run(`profUnpack('ciao','segreta1')`),/NON VALIDO/);
 await assert.rejects(run(`profUnpack(${JSON.stringify(JSON.stringify(Object.assign({},j,{iter:5})))},'segreta1')`),/NON VALIDO/,'iterazioni troppo basse rifiutate');
 console.log('PASS: file manomesso rifiutato');

 // 4) Sblocco con la password e password nuova
 run('profKeyMem=null');
 assert.equal(await run(`profUnlock('sbagliata')`),false);assert.equal(run('profKeyMem'),null);
 assert.equal(await run(`profUnlock('segreta1')`),true);assert(run('profKeyMem'));
 await run(`profNewPassword('nuovapass')`);
 const file2=await run('profPack(profKeyMem)');
 await assert.rejects(run(`profUnpack(${JSON.stringify(file2)},'segreta1')`),/PASSWORD ERRATA/);
 assert.equal((await run(`profUnpack(${JSON.stringify(file2)},'nuovapass')`)).body.nome,'Fabio 77');
 assert.equal((await run(`profUnpack(${JSON.stringify(file)},'segreta1')`)).body.nome,'Fabio 77','il file vecchio si apre ancora con la password vecchia');
 console.log('PASS: sblocco e cambio password');

 // 5) Import su un browser vuoto: tornano progressi, pilota e foto; la partita riprende da lì
 const ls2=storage();ls2.setItem('frontieraCrediti','1');ls2.setItem('frontieraOmegaLibero','yes');
 const sb2=Object.assign({},sb,{localStorage:ls2});vm.createContext(sb2);
 vm.runInContext("const CLASSIFICA_ONLINE={};\n"+fs.readFileSync(path.join(dist,'classifica.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'profilo.js'),'utf8'),sb2);
 const r2=c=>vm.runInContext(c,sb2);
 const u2=await r2(`profUnpack(${JSON.stringify(file2)},'nuovapass')`);
 sb2.u2=u2;r2('profApply(u2)');
 assert.equal(ls2.getItem('frontieraCrediti'),'3200');assert.equal(ls2.getItem('frontieraVite'),'4');assert.equal(ls2.getItem('frontieraPianetiLiberati'),'HX-01,HX-02');
 assert.equal(ls2.getItem('frontieraOmegaLibero'),null,'le chiavi che nel file non ci sono vengono tolte');
 assert.equal(r2('prof.nome'),'Fabio 77');assert.equal(r2('prof.mini'),MINI);assert.equal(r2('profDirty()'),false);
 assert.equal(JSON.parse(ls2.getItem('stellarProfilo')).nome,'Fabio 77');
 ls2.setItem('frontieraCrediti','3300');assert.equal(r2('profDirty()'),true,'nuovi progressi non ancora salvati sul PC');
 console.log('PASS: importa e riprendi');

 // 6) Fine gioco: nome e foto partono da soli verso la classifica mondiale
 const inp={value:''},msg={textContent:''},btn={disabled:false},cls={toggle(){}};
 const el={scoreEntry:{classList:cls},scoreName:inp,scoreMsg:msg,scoreSaveBtn:btn,scoreFinal:{textContent:''}};
 sb.$=id=>el[id]||null;
 run('scorePending=0;score=9000;scoreEnd()');
 for(let i=0;i<20&&!docs.length;i++)await new Promise(r=>setImmediate(r));
 for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));
 assert.equal(docs.length,1,'punteggio inviato da solo');
 assert.equal(docs[0].fields.n.stringValue,'Fabio 77');assert.equal(docs[0].fields.s.integerValue,'9000');
 assert(!docs[0].fields.a,'regole Firebase vecchie: parte lo stesso, senza foto');
 assert.equal(run('boardLoad()[0].a'),MINI,'foto nella classifica del browser');
 regoleNuove=true;
 run('scorePending=0;score=7000;scoreEnd()');
 for(let i=0;i<40;i++)await new Promise(r=>setImmediate(r));
 assert.equal(docs.length,2);assert.equal(docs[1].fields.a.stringValue,MINI,'con le regole nuove parte anche la foto');
 const top=await run('coTop(true)');
 assert.equal(top.find(r=>r.s===7000).a,MINI,'la foto si legge dalla classifica mondiale');
 assert(run(`boardRows(coCache,()=>false)`).includes('<img class="board-ava" src="'+MINI),'foto accanto al nome');
 assert(!run(`boardRows([{n:'x',s:1,a:'javascript:alert(1)'}],()=>false)`).includes('javascript'),'solo immagini vere');
 console.log('PASS: classifica a fine gioco con nome e foto');

 // 7) Nuovo pilota: progressi azzerati
 run('profReset()');
 assert.equal(run('prof'),null);assert.equal(ls.getItem('frontieraCrediti'),null);assert.equal(ls.getItem('stellarProfilo'),null);
 console.log('PASS: nuovo pilota');
 console.log('profilo.test: ok');
})().catch(e=>{console.error(e);process.exit(1)});
