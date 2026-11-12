// Prossimo pianeta (2026-11-12): tornati alla home dopo un pianeta liberato si seleziona il più facile ancora da liberare.
// Eseguire dalla cartella principale: node tests/prossimo-pianeta.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','prossimo-pianeta.js'),'utf8');
assert.ok(fs.readFileSync(path.join(__dirname,'..','dist','index.html'),'utf8').includes('<script src="prossimo-pianeta.js'));
const freed=new Set(),sel=[];
const sb={planets:[{code:'A',difficulty:1},{code:'B',difficulty:2},{code:'C',difficulty:3},{code:'O',difficulty:7,final:true}],selected:0,state:'platform',window:{},
 mapPlayable:p=>!freed.has(p.code)&&!(p.final&&freed.size<3),mapAllDone:()=>freed.size===4,mapFirstPlayable:()=>0,
 selectPlanet(i){sb.selected=i;sel.push(i)},setInterval(){},abort(){sb.state='map'}};
vm.createContext(sb);vm.runInContext(src,sb);
const P=sb.window.prossimoPianeta;
freed.add('A');P.ppTick();sb.state='map';P.ppTick();
assert.equal(sb.selected,1,'liberato A: si passa a B');
freed.add('B');sb.state='won';P.ppTick();vm.runInContext('abort()',sb);
assert.equal(sb.selected,2,'ritorno con HOME: C');
freed.add('C');sb.state='platform';P.ppTick();sb.state='map';P.ppTick();
assert.equal(sb.selected,3,'tutti liberi: OMEGA');
assert.equal(vm.runInContext('mapFirstPlayable()',sb),3);
console.log('prossimo-pianeta: ok');
