// Record a fine missione (2026-11-04): una riga per partita nella classifica mondiale,
// creata alla prima missione e aggiornata alle successive con la chiave segreta; a fine partita
// la stessa riga riceve il punteggio finale. Con le regole vecchie non si creano doppioni.
// Eseguire dalla cartella principale: node tests/record.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};
const MINI='data:image/jpeg;base64,'+Buffer.alloc(300,7).toString('base64');
const sha=k=>crypto.createHash('sha256').update(k).digest('hex');

function firestore(nuove){
 const docs=new Map();let n=0;
 const ok=j=>({ok:true,json:async()=>j}),no=s=>({ok:false,status:s});
 const fetch=async(url,o)=>{
  const b=JSON.parse(o.body),all=[...docs.values()];
  if(url.includes(':runAggregationQuery')){const v=+b.structuredAggregationQuery.structuredQuery.where.fieldFilter.value.integerValue;return ok([{result:{aggregateFields:{c:{integerValue:String(all.filter(d=>+d.fields.s.integerValue>v).length)}}}}])}
  if(url.includes(':runQuery'))return ok(all.sort((a,b)=>b.fields.s.integerValue-a.fields.s.integerValue).map(d=>({document:d})));
  const f=b.fields;
  if(!nuove&&(f.h||f.k))return no(403);
  if(o.method==='PATCH'){
   const id=decodeURIComponent(url.split('/classifica/')[1].split('?')[0]),old=docs.get(id);
   if(!url.includes('currentDocument.exists=true'))return no(400);
   if(!old)return no(404);
   if(!old.fields.h||!f.k||sha(f.k.stringValue)!==old.fields.h.stringValue||f.h.stringValue===old.fields.h.stringValue)return no(403);
   if(f.n.stringValue!==old.fields.n.stringValue||+f.s.integerValue<+old.fields.s.integerValue)return no(403);
   old.fields=f;return ok(old);
  }
  const d={name:'projects/p/databases/(default)/documents/classifica/id'+(n++),fields:f};docs.set('id'+(n-1),d);return ok(d);
 };
 return{docs,fetch};
}
function game(fs_,ls){
 const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:()=>0,clearTimeout:noop,fetch:fs_.fetch,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,
  finish(win){sb.state=win?'won':'lost';if(sb.gameOver)vm.runInContext('viteGameOver()',sb)},pfFinish(win){sb.state=win?'won':'lost'}};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['classifica.js','profilo.js','record.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),sb);
 return{sb,el,run:c=>vm.runInContext(c,sb)};
}

(async()=>{
 // 1) Regole nuove: missione 1 crea la riga, missione 2 la aggiorna, fine partita la chiude. Una riga sola.
 {
  const F=firestore(true),ls=storage(),{sb,run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','',${JSON.stringify(MINI)},'pc')`);
  run('score=1200;state="play";finish(false)');await run('recQ');
  assert.equal(F.docs.size,1,'prima missione: una riga');
  let d=[...F.docs.values()][0];
  assert.equal(d.fields.n.stringValue,'Fabio');assert.equal(d.fields.s.integerValue,'1200');assert.equal(d.fields.a.stringValue,MINI,'con la foto');
  assert(/^[0-9a-f]{64}$/.test(d.fields.h.stringValue),'impronta della chiave');
  const r1=JSON.parse(ls.getItem('stellarRecord'));assert.equal(sha(r1.k),d.fields.h.stringValue,'la chiave resta solo nel browser');
  assert.equal(run('coMyId'),r1.id);

  run('score=5300;state="platform";pfFinish(true)');await run('recQ');
  assert.equal(F.docs.size,1,'seconda missione: stessa riga');
  d=[...F.docs.values()][0];assert.equal(d.fields.s.integerValue,'5300');
  assert.equal(d.fields.k.stringValue,r1.k,'la chiave vecchia è usata e buttata');
  const r2=JSON.parse(ls.getItem('stellarRecord'));assert.notEqual(r2.k,r1.k);assert.equal(sha(r2.k),d.fields.h.stringValue);

  // chi legge la riga non può riusare la chiave vecchia
  const steal=await F.fetch('x/classifica/'+r1.id+'?key=k&currentDocument.exists=true',{method:'PATCH',body:JSON.stringify({fields:Object.assign({},d.fields,{s:{integerValue:'999999'},k:{stringValue:r1.k},h:{stringValue:sha('x')}})})});
  assert.equal(steal.status,403,'chiave già usata rifiutata');

  // fine partita: la stessa riga riceve il punteggio finale e il record della partita si chiude
  run('score=7400;state="play";gameOver=true;finish(false);gameOver=false');await new Promise(r=>setTimeout(r,20));await run('recQ');
  for(let i=0;i<10&&ls.getItem('stellarRecord');i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(F.docs.size,1,'fine partita: nessuna riga nuova');
  assert.equal([...F.docs.values()][0].fields.s.integerValue,'7400');
  assert.equal(ls.getItem('stellarRecord'),null,'partita chiusa');
  assert.match(run('$("scoreMsg").textContent'),/POSIZIONE 1/);

  // nuova partita: nuova riga
  run('score=900;state="play";finish(false)');await run('recQ');
  assert.equal(F.docs.size,2,'la partita dopo ha la sua riga');
  console.log('PASS: una riga per partita, aggiornata a ogni missione');
 }

 // 2) Regole vecchie su Firebase: nessuna riga a metà partita, posizione calcolata, invio a fine gioco come prima
 {
  const F=firestore(false),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Muto','segreta1','',${JSON.stringify(MINI)},'pc')`);
  run('score=3000;state="play";finish(true)');await run('recQ');
  run('state="play";score=4000;finish(false)');await run('recQ');
  assert.equal(F.docs.size,0,'niente doppioni a metà partita');
  assert.equal(run('recOld'),true);
  run('state="play";gameOver=true;finish(false);gameOver=false');for(let i=0;i<20&&F.docs.size===0;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(F.docs.size,1,'a fine gioco parte una riga sola');
  assert.equal([...F.docs.values()][0].fields.s.integerValue,'4000');
  console.log('PASS: regole vecchie, nessun doppione');
 }

 // 3) Foto: righe senza foto mostrano quella del profilo (se il nome è il tuo) o l'iniziale
 {
  const F=firestore(true),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','',${JSON.stringify(MINI)},'pc')`);
  assert(run(`profAva('','map-ava','Fabio')`).includes(MINI),'riga vecchia del pilota: la sua foto');
  const ini=run(`profAva('','map-ava','ffa')`);assert(/ava-ini/.test(ini)&&/>F<\/span>/.test(ini),'altri: iniziale');
  assert.equal(run(`profAva('','map-ava','')`),'');
  assert(run(`profAva(${JSON.stringify(MINI)},'map-ava','ffa')`).includes(MINI),'foto della riga se c’è');
  assert(!/</.test(run(`profAva('','x','<img>')`).replace(/<span[^>]*>|<\/span>/g,'')),'niente HTML dal nome');
  console.log('PASS: foto e iniziali in classifica');
 }
})().catch(e=>{console.error(e);process.exit(1)});
