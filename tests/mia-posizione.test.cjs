// La tua posizione in classifica (2026-11-11): la lista va sulla riga del miglior punteggio del pilota.
// Eseguire dalla cartella principale: node tests/mia-posizione.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','mia-posizione.js'),'utf8');
function mk(o){
 const sb=Object.assign({console,Date,Math,Number,Array,Promise,
  recName:()=>'FABIO',arkName:()=>'FABIO',mapBestScore:()=>15000,arkBestPoints:()=>850,
  arkIsMe:r=>r.id==='mio',boardShow(){},arkRows(){return ''}},o);
 vm.createContext(sb);vm.runInContext(src+';this.mpos=mpos;',sb);return sb;
}
// MONDO: la riga col nome del pilota e il suo miglior punteggio (non la partita in corso)
let g=mk();
const mondo=[{n:'ALTRO',s:90000},{n:'FABIO',s:20000},{n:'FABIO',s:15000},{n:'FABIO',s:9000}];
assert.strictEqual(g.mposIndex(mondo,'mondo'),2);
// non in classifica: -1 (la lista resta in cima)
assert.strictEqual(g.mposIndex([{n:'ALTRO',s:90000}],'mondo'),-1);
assert.strictEqual(mk({mapBestScore:()=>0}).mposIndex(mondo,'mondo'),-1);
assert.strictEqual(mk({recName:()=>''}).mposIndex(mondo,'mondo'),-1);
// ONLINE SCORE: nome + punti migliori, poi la riga salvata in questo browser, poi il nome
const arena=[{n:'ALTRO',p:5000,id:'a'},{n:'FABIO',p:850,id:'b'}];
assert.strictEqual(g.mposIndex(arena,'arena'),1);
assert.strictEqual(g.mposIndex([{n:'X',p:900,id:'mio'},{n:'Y',p:10,id:'c'}],'arena'),0);
assert.strictEqual(mk({arkBestPoints:()=>0}).mposIndex([{n:'Z',p:9},{n:'FABIO',p:40}],'arena'),1);
assert.strictEqual(g.mposIndex([{n:'Z',p:9,id:'z'}],'arena'),-1);
// le righe disegnate vengono ricordate per sapere quale riga è del pilota
g.boardShow({},mondo);assert.strictEqual(g.mpos.last,mondo);assert.strictEqual(g.mpos.lastView,'mondo');
g.arkRows(arena);assert.strictEqual(g.mpos.last,arena);assert.strictEqual(g.mpos.lastView,'arena');
// la lista scorre fino alla riga, solo la lista (riga al centro, sotto l'intestazione)
const list={scrollTop:0,clientHeight:400,getBoundingClientRect:()=>({top:100}),querySelector:()=>({getBoundingClientRect:()=>({height:40})})};
g.mposScroll(list,{getBoundingClientRect:()=>({top:1100,height:50})});
assert.strictEqual(list.scrollTop,1000-40-155);
g.mposScroll(list,null);assert.strictEqual(list.scrollTop,0);
console.log('mia-posizione: ok');
