// Linea olografica pianeta → pannello nella home (2026-11-12).
// Eseguire dalla cartella principale: node tests/linea-olografica.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const src=fs.readFileSync(path.join(dist,'linea-olografica.js'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert.ok(html.includes('<script src="linea-olografica.js"></script>'),'caricato in index.html');
assert.ok(!/ctx\.filter|shadowBlur|filter:\s*(blur|drop)/.test(src),'niente filtri per fotogramma');
// senza DOM non fa nulla e non si rompe
vm.runInNewContext(src,{});
// con un DOM minimo si avvia e aspetta la mappa
let raf=0;const els=[];
const doc={createElementNS:()=>({setAttribute(){},appendChild(){},style:{setProperty(){}},classList:{add(){},remove(){}}}),createElement:()=>({}),head:{appendChild:e=>els.push(e)},getElementById:()=>null,querySelector:()=>null};
const sb={document:doc,requestAnimationFrame:f=>{raf++;return 1},window:{}};
vm.runInNewContext(src,sb);
assert.equal(raf,1,'animazione avviata');assert.equal(els.length,1,'stile aggiunto');
assert.equal(typeof sb.window.lineaOlografica.frame,'function');
sb.window.lineaOlografica.frame(0);// mappa assente: nessun errore
console.log('linea-olografica: ok');
