// Classifica arena (2026-11-08): secondo ranking con i punti delle sfide online.
// Una riga per pilota nella raccolta Firestore `arena`, aggiornata con la chiave segreta;
// le sfide non inviate restano nel browser e partono a blocchi di 5.
// Eseguire dalla cartella principale: node tests/classifica-arena.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{},sha=k=>crypto.createHash('sha256').update(k).digest('hex');

// Firestore finto che applica le stesse condizioni di firestore.rules per /arena
function firestore(){
 const docs=new Map();let n=0,online=true,regole=true;
 const ok=j=>({ok:true,json:async()=>j}),no=s=>({ok:false,status:s});
 const I=f=>+f.integerValue;
 const valida=f=>['n','p','v','b','m','h'].every(k=>f[k])&&Object.keys(f).every(k=>'npvbmahk'.includes(k))&&
  I(f.m)>=1&&I(f.p)===I(f.b)*100+I(f.v)*500+I(f.m)*50&&/^[0-9a-f]{64}$/.test(f.h.stringValue);
 const fetch=async(url,o)=>{
  if(!online)throw new Error('rete');
  const b=JSON.parse(o.body),all=[...docs.values()];
  if(url.includes(':runAggregationQuery')){const q=b.structuredAggregationQuery.structuredQuery,v=+q.where.fieldFilter.value.integerValue,fld=q.where.fieldFilter.field.fieldPath;
   return ok([{result:{aggregateFields:{c:{integerValue:String(all.filter(d=>d.c===q.from[0].collectionId&&+d.fields[fld].integerValue>v).length)}}}}])}
  if(url.includes(':runQuery')){const c=b.structuredQuery.from[0].collectionId;return ok(all.filter(d=>d.c===c).sort((x,y)=>y.fields.p.integerValue-x.fields.p.integerValue).map(d=>({document:d})))}
  if(!regole)return no(403);
  const f=b.fields;if(!url.includes('/arena'))return no(400);
  if(!valida(f))return no(403);
  if(o.method==='PATCH'){
   const id=decodeURIComponent(url.split('/arena/')[1].split('?')[0]),old=docs.get(id);
   if(!old)return no(404);const of=old.fields,dm=I(f.m)-I(of.m);
   if(f.n.stringValue!==of.n.stringValue||dm<1||dm>5||I(f.v)<I(of.v)||I(f.v)-I(of.v)>dm||I(f.b)<I(of.b)||I(f.b)-I(of.b)>dm*15)return no(403);
   if(!f.k||sha(f.k.stringValue)!==of.h.stringValue||f.h.stringValue===of.h.stringValue)return no(403);
   old.fields=f;return ok(old);
  }
  if(I(f.m)>5||I(f.v)>I(f.m)||I(f.b)>I(f.m)*15)return no(403);
  const id='a'+(n++),d={c:'arena',name:'projects/p/databases/(default)/documents/arena/'+id,fields:f};docs.set(id,d);return ok(d);
 };
 return{docs,fetch,set online(v){online=v},set regole(v){regole=v}};
}
function game(F,ls){
 const el={};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:(f)=>{sb._t.push(f);return 0},clearTimeout:noop,_t:[],
  fetch:F.fetch,crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,I18N_ROWS:[],
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,finish:noop,pfFinish:noop};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k',databaseURL:'https://x-default-rtdb.europe-west1.firebasedatabase.app'};\n"+
  ['classifica.js','profilo.js','record.js','arena.js','classifica-arena.js'].map(src).join('\n'),sb);
 sb.document={getElementById:id=>el[id]||null,createElement:()=>({classList:{toggle(){}},textContent:''})};
 return{sb,el,run:c=>vm.runInContext(c,sb),timers:()=>{const t=sb._t;sb._t=[];t.forEach(f=>f())}};
}
// sfida finta: g con il punteggio finale voluto (io + avversari)
function sfida(run,mieiK,altri){
 run(`var g=arNew('io00000000','Fabio','',{});g.phase='L';g.others={};`+altri.map((k,i)=>`g.others['av${i}0000000']={s:{n:'Av${i}',k:${k},d:0,j:${i+1}},x:0,y:0,r:0,seen:0};`).join('')+
  `g.me.j=999;arEnterPhase(g,'C');arEnterPhase(g,'P');g.me.k=${mieiK};arEnterPhase(g,'E');`);
}

(async()=>{
 // 0) file e regole
 {
  const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
  assert.ok(at('classifica-arena.js')>at('arena.js')&&at('arena.js')>0,'classifica-arena.js dopo arena.js');
  const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
  assert.ok(rules.includes('match /arena/{id}')&&rules.includes('r.p == r.b * 100 + r.v * 500 + r.m * 50'),'regole arena');
  assert.ok(src('profilo.js').includes("'stellarArena'"),'totali arena nel backup del profilo');
  console.log('PASS: file e regole');
 }
 // 1) esito della sfida
 {
  const {run}=game(firestore(),storage());
  assert.equal(run('arkResult([{me:true,k:3}])'),null,'da soli non conta');
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{me:true,k:10},{k:4}]))')),{b:10,v:1});
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{k:10},{me:true,k:4}]))')),{b:4,v:0});
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{me:true,k:0},{k:0}]))')),{b:0,v:0},'0 abbattimenti non è vittoria');
  assert.equal(run('arkResult([{me:true,k:40},{k:0}]).b'),15,'tetto abbattimenti');
  assert.equal(run('arkPoints({b:10,v:1,m:1})'),1550);
  console.log('PASS: esito e punti');
 }
 // 2) prima sfida crea la riga, la seconda la aggiorna con la chiave; posizione nella schermata finale
 {
  const F=firestore(),ls=storage(),{run,el,timers}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','','','pc')`);
  el.arNext={parentNode:{insertBefore(e){el.arRank=e}}};
  sfida(run,7,[3]);timers();await run('arkQ');await new Promise(r=>setTimeout(r,10));
  assert.equal(F.docs.size,1);let d=[...F.docs.values()][0].fields;
  assert.equal(d.n.stringValue,'Fabio');assert.equal(d.p.integerValue,'1250');assert.equal(d.v.integerValue,'1');assert.equal(d.m.integerValue,'1');
  const r1=JSON.parse(ls.getItem('stellarArena'));assert.equal(sha(r1.k),d.h.stringValue,'la chiave resta nel browser');
  assert.match(el.arRank.textContent,/PUNTI ARENA \+1250 · TOTALE 1\.250 · CLASSIFICA ARENA POSIZIONE 1/);
  sfida(run,2,[10,5]);timers();await run('arkQ');
  assert.equal(F.docs.size,1,'stessa riga');d=[...F.docs.values()][0].fields;
  assert.equal(d.m.integerValue,'2');assert.equal(d.b.integerValue,'9');assert.equal(d.v.integerValue,'1');assert.equal(d.p.integerValue,String(900+500+100));
  assert.equal(d.k.stringValue,r1.k,'chiave vecchia usata e buttata');
  // sfida da solo: niente
  run(`var g=arNew('io00000000','Fabio','',{});g.others={};arEnterPhase(g,'C');arEnterPhase(g,'P');g.me.k=0;arEnterPhase(g,'E')`);timers();await run('arkQ');
  assert.equal([...F.docs.values()][0].fields.m.integerValue,'2','da soli non conta');
  assert.match(el.arRank.textContent,/ALMENO 2 PILOTI/);
  // allenamento (L) che passa a E senza P non conta
  run(`var g=arNew('io00000000','Fabio','',{});g.phase='L';arEnterPhase(g,'E')`);timers();await run('arkQ');
  assert.equal([...F.docs.values()][0].fields.m.integerValue,'2');
  console.log('PASS: riga creata e aggiornata con la chiave');
 }
 // 3) regole non ancora pubblicate / offline: i totali restano nel browser e partono a blocchi di 5
 {
  const F=firestore(),ls=storage(),{run,timers}=game(F,ls);
  await run(`profCreate('Luca','segreta1','','','pc')`);
  F.regole=false;
  for(let i=0;i<7;i++){sfida(run,12,[1]);timers();await run('arkQ')}
  assert.equal(F.docs.size,0);
  let r=JSON.parse(ls.getItem('stellarArena'));assert.equal(r.m,7,'nessuna sfida persa');assert.equal(r.b,84);
  F.regole=true;await run('arkSync()');
  assert.equal(F.docs.size,1);const d=[...F.docs.values()][0].fields;
  assert.equal(d.m.integerValue,'7','creata con 5 e aggiornata con 2');assert.equal(d.b.integerValue,'84');assert.equal(d.v.integerValue,'7');
  r=JSON.parse(ls.getItem('stellarArena'));assert.equal(r.sm,7);
  F.online=false;sfida(run,1,[0]);timers();await run('arkQ');
  F.online=true;await run('arkSync()');assert.equal([...F.docs.values()][0].fields.m.integerValue,'8');
  console.log('PASS: in attesa e invio a blocchi');
 }
 // 4) backup vecchio (chiave scaduta): riga nuova, a blocchi
 {
  const F=firestore(),ls=storage(),{run,timers}=game(F,ls);
  await run(`profCreate('Sara','segreta1','','','pc')`);
  sfida(run,5,[1]);timers();await run('arkQ');
  const old=ls.getItem('stellarArena');
  sfida(run,5,[1]);timers();await run('arkQ');
  ls.setItem('stellarArena',old.replace('"m":1','"m":2').replace('"v":1','"v":2').replace('"b":5','"b":10'));
  await run('arkSync()');
  assert.equal(F.docs.size,2,'riga nuova');
  console.log('PASS: chiave scaduta');
 }
 // 5) schede: MONDO | ARENA ONLINE e lista dell'arena
 {
  const F=firestore(),ls=storage(),{run,el,timers}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','','','pc')`);
  sfida(run,10,[2]);timers();await run('arkQ');
  const list={innerHTML:'',classList:{toggle(c,on){list.arena=on}},insertAdjacentHTML(p,h){list.innerHTML=h+list.innerHTML},querySelector:()=>null};
  el.boardList=list;
  run("coView='arena'");await run('boardRender(true)');
  assert.ok(list.arena,'classe board-arena');
  assert.match(list.innerHTML,/VITTORIE · ABBATTIMENTI/);assert.match(list.innerHTML,/board-row me podium/);assert.match(list.innerHTML,/1\.550/);
  F.online=false;await run('boardRender(true)');assert.match(list.innerHTML,/OFFLINE/);
  console.log('PASS: scheda ARENA ONLINE');
 }
 console.log('TUTTI I TEST DELLA CLASSIFICA ARENA PASSATI');
})().catch(e=>{console.error(e);process.exit(1)});
