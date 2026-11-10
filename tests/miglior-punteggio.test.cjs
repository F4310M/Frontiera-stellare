// "TU N°" col miglior punteggio (2026-11-10): mai i punti della partita in corso.
// Eseguire dalla cartella principale: node tests/miglior-punteggio.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','miglior-punteggio.js'),'utf8');
function mk(o){
 const sb=Object.assign({console,Date,Math,Number,Array,Promise,score:999999,coOn:true,
  myList:()=>[{s:4000},{s:12000}],boardLoad:()=>[{n:'FABIO',s:15000},{n:'ALTRO',s:90000}],recName:()=>'FABIO',
  arkName:()=>'FABIO',arkLoad:()=>({n:'FABIO',v:1,b:2,m:3}),arkPoints:t=>100*t.b+500*t.v+50*t.m,
  coRow:d=>({n:d.n,s:d.s}),arkRow:d=>({n:d.n,p:d.p}),calls:[],ticks:0,
  mapBoardTick(){sb.ticks++},setTimeout:f=>{f();return 0},
  coReq:async(p,b)=>{sb.calls.push(b.structuredQuery.from[0].collectionId);return sb.remote[b.structuredQuery.from[0].collectionId]||[]},
  remote:{},mapBestScore:()=>sb.score},o);
 vm.createContext(sb);vm.runInContext(src,sb);return sb;
}
(async()=>{
 // 1) la partita in corso non conta: miglior record locale (15.000 col nome del pilota)
 let g=mk();
 assert.strictEqual(g.mapBestScore(),15000);
 assert.strictEqual(g.arkBestPoints(),850);
 // 2) un record più alto online, con lo stesso nome, vince e ridisegna il riquadro
 g=mk({remote:{classifica:[{document:{n:'FABIO',s:42000}},{document:{n:'FABIO',s:8000}}],arena:[{document:{n:'FABIO',p:3000}}]}});
 g.mapBestScore();g.arkBestPoints();await new Promise(r=>setImmediate(r));
 assert.strictEqual(g.mapBestScore(),42000);
 assert.strictEqual(g.arkBestPoints(),3000);
 assert.ok(g.ticks>=1,'riquadro aggiornato');
 // una sola richiesta al minuto per classifica
 assert.deepStrictEqual(g.calls.sort(),['arena','classifica']);
 // 3) offline: resta il miglior record locale
 g=mk({coOn:false,myList:()=>[{s:7000}],boardLoad:()=>[]});
 assert.strictEqual(g.mapBestScore(),7000);
 // 4) rete che non risponde: nessun errore, record locale
 g=mk({coReq:async()=>{throw new Error('rete')}});
 assert.strictEqual(g.mapBestScore(),15000);await new Promise(r=>setImmediate(r));
 assert.strictEqual(g.mapBestScore(),15000);
 console.log('miglior-punteggio: ok');
})().catch(e=>{console.error(e);process.exit(1)});
