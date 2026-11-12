// Salvataggio automatico del file .sfsave (2026-11-12): finita la missione il file scelto si aggiorna da solo.
// Eseguire dalla cartella principale: node tests/salvataggio-file.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
(async()=>{
 const ls=storage(),idb=new Map();
 let perm='granted',scritto=null,scritture=0;
 const handle={name:'Conex-Fabio.sfsave',queryPermission:async()=>perm,createWritable:async()=>({write:async t=>{scritto=t},close:async()=>{scritture++}})};
 const sb={localStorage:ls,$:()=>null,show:noop,state:'map',world:null,pf:null,vite:3,console,setTimeout:()=>0,clearTimeout:noop,setInterval:noop,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,fetch:async()=>({ok:false}),
  dropSupply:noop,finish:noop,pfHitEnemy:noop,pfUpdateHostages:noop,pfFinish:noop,viteGameOver:noop};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+fs.readFileSync(path.join(dist,'classifica.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'profilo.js'),'utf8'),sb);
 sb.__idb=idb;
 vm.runInContext("profIdb=(mode,fn)=>{const r=v=>({result:v});const q=fn({get:k=>r(__idb.get(k)),put:(v,k)=>{__idb.set(k,v);return r(k)},delete:k=>{__idb.delete(k);return r()}});return Promise.resolve(q&&q.result!==undefined?q.result:null)}",sb);
 vm.runInContext(fs.readFileSync(path.join(dist,'salvataggio-file.js'),'utf8'),sb);
 const run=c=>vm.runInContext(c,sb);

 // 1) creando il pilota la chiave resta nel browser
 ls.setItem('frontieraCrediti','2500');
 await run(`profCreate('Fabio','segreta1','','','pc')`);
 assert.ok(idb.get('chiave')&&idb.get('chiave').key,'chiave salvata in IndexedDB');
 assert.equal(idb.get('chiave').salt,run('prof.salt'));
 idb.set('backup',handle);
 run("prof.snap=profSnapKey();profStore()");

 // 2) nuova sessione (chiave non in memoria), missione finita: il file si aggiorna da solo
 run('profKeyMem=null');
 ls.setItem('frontieraCrediti','9100');ls.setItem('frontieraPianetiLiberati','HX-01');
 assert.equal(run('profDirty()'),true);
 sb.state='won';
 await run('salvataggioFile.tick()');
 assert.equal(scritture,1,'file riscritto');
 assert.equal(run('profDirty()'),false,'nessun progresso in sospeso');
 assert.ok(run('prof.ultimoBackup'));
 const u=await run(`profUnpack(${JSON.stringify(scritto)},'segreta1')`);
 assert.equal(u.body.progressi.frontieraCrediti,'9100');
 assert.equal(u.body.progressi.frontieraPianetiLiberati,'HX-01');

 // 3) durante il combattimento non scrive
 ls.setItem('frontieraCrediti','9300');sb.state='play';
 await run('salvataggioFile.tick()');
 assert.equal(scritture,1,'niente scrittura in volo');

 // 4) permesso del browser da rinnovare: non scrive da solo (servirà SALVA ORA), resta in sospeso
 perm='prompt';sb.state='map';
 await new Promise(r=>setTimeout(r,2600));
 await run('salvataggioFile.tick()');
 assert.equal(scritture,1);assert.equal(run('profDirty()'),true);

 // 5) chiave di un altro pilota (sale diverso): non usata
 perm='granted';run('profKeyMem=null');
 idb.set('chiave',Object.assign({},idb.get('chiave'),{salt:'altro'}));
 assert.equal(await run('salvataggioFile.loadKey()'),false);
 await new Promise(r=>setTimeout(r,2600));
 await run('salvataggioFile.tick()');
 assert.equal(scritture,1,'senza la chiave giusta non scrive');

 // 6) password giusta: chiave di nuovo salvata; poi si scrive
 assert.equal(await run(`profUnlock('segreta1')`),true);
 assert.equal(idb.get('chiave').salt,run('prof.salt'));
 run('profKeyMem=null');
 await new Promise(r=>setTimeout(r,2600));
 await run('salvataggioFile.tick()');
 assert.equal(scritture,2);

 // 7) pilota in modalità browser: mai file
 run("prof.modo='browser'");ls.setItem('frontieraCrediti','9999');
 await new Promise(r=>setTimeout(r,2600));
 await run('salvataggioFile.tick()');
 assert.equal(scritture,2);

 // 8) nuovo pilota (reset): la chiave viene cancellata
 run('profReset()');
 assert.equal(idb.has('chiave'),false);
 console.log('salvataggio-file: ok');
})().catch(e=>{console.error(e);process.exit(1)});
