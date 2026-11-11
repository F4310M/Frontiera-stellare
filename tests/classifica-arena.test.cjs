// Classifica arena (2026-11-08): secondo ranking con i punti delle sfide online.
// Una riga per pilota nella raccolta Firestore `arena` (id = nome in minuscolo, solo per chi possiede il nome);
// le sfide non inviate restano nel browser e partono a blocchi di 5, al ritmo voluto dalle regole.
// Eseguire dalla cartella principale: node tests/classifica-arena.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{},sha=k=>crypto.createHash('sha256').update(k).digest('hex');

const {firebaseFinto}=require('./firebase-finto.cjs');
function game(F,ls){
 const el={};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout:F.setTimeout,clearTimeout:noop,Date:F.FakeDate,
  fetch:F.fetch,crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,I18N_ROWS:[],
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,finish:noop,pfFinish:noop};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k',databaseURL:'https://x-default-rtdb.europe-west1.firebasedatabase.app'};\n"+
  ['accesso.js','classifica.js','profilo.js','record.js','arena.js','classifica-arena.js'].map(src).join('\n'),sb);
 sb.document={getElementById:id=>el[id]||null,createElement:()=>({classList:{toggle(){}},textContent:''})};
 return{sb,el,run:c=>vm.runInContext(c,sb)};
}
// lascia finire timer veloci e invii
async function calma(run){for(let i=0;i<60;i++){await new Promise(r=>setImmediate(r));await run('arkQ')}}
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
  assert.ok(rules.includes('match /arena/{id}')&&rules.includes('r.p == r.b * 100 + r.v * 500 + r.m * 50')&&rules.includes('nomeMio('),'regole arena');
  assert.ok(src('profilo.js').includes("'stellarArena'"),'totali arena nel backup del profilo');
  console.log('PASS: file e regole');
 }
 // 1) esito della sfida
 {
  const {run}=game(firebaseFinto(),storage());
  assert.equal(run('arkResult([{me:true,k:3}])'),null,'da soli non conta');
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{me:true,k:10},{k:4}]))')),{b:10,v:1});
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{k:10},{me:true,k:4}]))')),{b:4,v:0});
  assert.deepEqual(JSON.parse(run('JSON.stringify(arkResult([{me:true,k:0},{k:0}]))')),{b:0,v:0},'0 abbattimenti non è vittoria');
  assert.equal(run('arkResult([{me:true,k:40},{k:0}]).b'),15,'tetto abbattimenti');
  assert.equal(run('arkPoints({b:10,v:1,m:1})'),1550);
  console.log('PASS: esito e punti');
 }
 // 2) prima sfida crea la riga (id = nome), la seconda la aggiorna; posizione nella schermata finale
 {
  const F=firebaseFinto(),ls=storage(),{run,el}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','','','pc')`);
  el.arNext={parentNode:{insertBefore(e){el.arRank=e}}};
  sfida(run,7,[3]);await calma(run);
  let righe=F.docs('arena');assert.equal(righe.length,1);assert.equal(righe[0].id,'fabio','id = nome in minuscolo');
  let d=righe[0].fields;
  assert.equal(d.n.stringValue,'Fabio');assert.equal(d.p.integerValue,'1250');assert.equal(d.v.integerValue,'1');assert.equal(d.m.integerValue,'1');
  assert(d.t&&!d.h,'ora del server, niente chiave');
  assert.match(el.arRank.textContent,/PUNTI ARENA \+1250 · TOTALE 1\.250 · CLASSIFICA ARENA POSIZIONE 1/);
  F.S.clock+=5*60000;
  sfida(run,2,[10,5]);await calma(run);
  righe=F.docs('arena');assert.equal(righe.length,1,'stessa riga');d=righe[0].fields;
  assert.equal(d.m.integerValue,'2');assert.equal(d.b.integerValue,'9');assert.equal(d.v.integerValue,'1');assert.equal(d.p.integerValue,String(900+500+100));
  // sfida da solo: niente
  run(`var g=arNew('io00000000','Fabio','',{});g.others={};arEnterPhase(g,'C');arEnterPhase(g,'P');g.me.k=0;arEnterPhase(g,'E')`);await calma(run);
  assert.equal(F.docs('arena')[0].fields.m.integerValue,'2','da soli non conta');
  assert.match(el.arRank.textContent,/ALMENO 2 PILOTI/);
  // allenamento (L) che passa a E senza P non conta
  run(`var g=arNew('io00000000','Fabio','',{});g.phase='L';arEnterPhase(g,'E')`);await calma(run);
  assert.equal(F.docs('arena')[0].fields.m.integerValue,'2');
  console.log('PASS: riga creata e aggiornata');
 }
 // 3) offline: le sfide restano nel browser e partono a blocchi di 5, con 30 secondi a sfida
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Luca','segreta1','','','pc')`);
  await calma(run);F.S.online=false;
  for(let i=0;i<7;i++){sfida(run,12,[1]);await calma(run)}
  assert.equal(F.docs('arena').length,0);
  let r=JSON.parse(ls.getItem('stellarArena'));assert.equal(r.m,7,'nessuna sfida persa');assert.equal(r.b,84);assert.equal(r.pm,7);
  F.S.online=true;await run('arkSync()');await calma(run);
  const d=F.docs('arena')[0].fields;
  assert.equal(d.m.integerValue,'7','creata con 5 e aggiornata con 2');assert.equal(d.b.integerValue,'84');assert.equal(d.v.integerValue,'7');
  r=JSON.parse(ls.getItem('stellarArena'));assert.equal(r.pm,0);
  console.log('PASS: in attesa e invio a blocchi');
 }
 // 4) vecchia riga con chiave segreta: si chiude e i totali passano nella riga nuova; un nome di altri non scrive
 {
  const F=firebaseFinto(),ls=storage(),{run}=game(F,ls);
  await run(`profCreate('Sara','segreta1','','','pc')`);await calma(run);
  const kOld='f'.repeat(48);
  F.metti('arena/vecchia7',{n:{stringValue:'Sara'},m:{integerValue:'20'},v:{integerValue:'4'},b:{integerValue:'90'},p:{integerValue:String(9000+2000+1000)},h:{stringValue:sha(kOld)}});
  ls.setItem('stellarArena',JSON.stringify({n:'Sara',id:'vecchia7',k:kOld,v:5,b:95,m:21,sm:20,sv:4,sb:90}));
  await run('arkSync()');await calma(run);
  const nuova=F.docs('arena').find(x=>x.id==='sara'),vecchia=F.docs('arena').find(x=>x.id==='vecchia7');
  assert.equal(nuova.fields.m.integerValue,'21','totali portati + la sfida in attesa');assert.equal(nuova.fields.b.integerValue,'95');
  assert.equal(vecchia.fields.p.integerValue,'0','vecchia chiusa');
  assert.equal(await run('arkTop(true).then(b=>b.length)'),1,'la vecchia non si vede');
  // un altro browser con lo stesso nome: niente
  const ls2=storage(),g2=game(F,ls2);
  ls2.setItem('stellarArena',JSON.stringify({n:'Sara',v:50,b:750,m:50}));
  await g2.run('arkSync()');await calma(g2.run);
  assert.equal(F.docs('arena').find(x=>x.id==='sara').fields.m.integerValue,'21','nome di un altro: nessuna scrittura');
  console.log('PASS: vecchia riga portata, nomi unici');
 }
 // 5) schede: MONDO | ONLINE SCORE e lista dell'arena
 {
  const F=firebaseFinto(),ls=storage(),{run,el}=game(F,ls);
  await run(`profCreate('Fabio','segreta1','','','pc')`);
  sfida(run,10,[2]);await calma(run);
  const list={innerHTML:'',classList:{toggle(c,on){list.arena=on}},insertAdjacentHTML(p,h){list.innerHTML=h+list.innerHTML},querySelector:()=>null};
  el.boardList=list;
  run("coView='arena'");await run('boardRender(true)');
  assert.ok(list.arena,'classe board-arena');
  assert.match(list.innerHTML,/VITTORIE · ABBATTIMENTI/);assert.match(list.innerHTML,/board-row me podium/);assert.match(list.innerHTML,/1\.550/);
  F.S.online=false;await run('boardRender(true)');assert.match(list.innerHTML,/OFFLINE/);
  console.log('PASS: scheda ONLINE SCORE');
 }
 console.log('TUTTI I TEST DELLA CLASSIFICA ARENA PASSATI');
})().catch(e=>{console.error(e);process.exit(1)});
