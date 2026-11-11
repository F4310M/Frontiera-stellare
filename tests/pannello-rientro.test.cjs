// Rientro dopo aver liberato un pianeta (2026-11-11): il pannello della home deve mostrare
// il prossimo pianeta da giocare, non i dati (e la scritta LIBERATO) di quello appena concluso.
// Eseguire dalla cartella principale: node tests/pannello-rientro.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','partita.js'),'utf8');
const m=new Map(),ls={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
const sb={localStorage:ls,$:()=>null,state:'map',addEventListener(){},
 planets:[{code:'HX-01',name:'LYRA'},{code:'KQ-17',name:'VESPER'}],freed:[],shown:[]};
sb.mapPlayable=p=>!!p&&!sb.freed.includes(p.code);
sb.selectPlanet=i=>{sb.shown.push(i)};
vm.createContext(sb);vm.runInContext(src,sb);
// salvataggio automatico di inizio fase 2 su LYRA
ls.setItem('stellarPartitaSalvata',JSON.stringify({code:'HX-01',name:'LYRA',fase:2,s:0}));
sb.shown.length=0;vm.runInContext('selectPlanet(1)',sb);
assert.equal(sb.shown[0],0,'missione sospesa su LYRA: la mappa resta bloccata su LYRA');
// LYRA liberata, il salvataggio non è ancora stato cancellato: la mappa passa a VESPER
sb.freed.push('HX-01');sb.shown.length=0;vm.runInContext('selectPlanet(1)',sb);
assert.equal(sb.shown[0],1,'LYRA liberata: il pannello deve aprirsi su VESPER, non su LYRA');
console.log('PASS: pannello pianeta al rientro');
