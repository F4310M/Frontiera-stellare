// Ricomincia il gioco (2026-11-04): azzera la partita, tiene pilota, impostazioni e record.
// Eseguire dalla cartella principale: node tests/ricomincia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const m=new Map(),ls={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
let aborted=0,newGame=0,toast='';
const sb={localStorage:ls,$:()=>null,show(){},state:'platform',score:4200,scorePending:0,
 scoreSave(){ls.setItem('stellarPunti',String(sb.score))},abort(){aborted++;sb.state='map'},mapNewGame(){newGame++},
 myRunEnd(){ls.removeItem('stellarPartita')},recSave(r){if(!r)ls.removeItem('stellarRecord')},profToast(s){toast=s}};
vm.createContext(sb);vm.runInContext('var score=4200,scorePending=0;'+fs.readFileSync(path.join(dist,'ricomincia.js'),'utf8'),sb);
ls.setItem('frontieraOmegaLibero','yes');ls.setItem('stellarPartita','x');ls.setItem('stellarRecord','{}');ls.setItem('stellarMieiRecord','[1]');ls.setItem('stellarProfilo','{}');
vm.runInContext('gameRestart()',sb);
assert.equal(aborted,1,'missione in corso chiusa');assert.equal(newGame,1,'progressi azzerati');
assert.equal(vm.runInContext('score',sb),0);assert.equal(ls.getItem('frontieraOmegaLibero'),'');
assert.equal(ls.getItem('stellarPartita'),null);assert.equal(ls.getItem('stellarRecord'),null);
assert.equal(ls.getItem('stellarMieiRecord'),'[1]','i migliori record restano');assert.equal(ls.getItem('stellarProfilo'),'{}','il pilota resta');
assert.match(toast,/RICOMINCIATA/);
console.log('PASS: ricomincia il gioco');
