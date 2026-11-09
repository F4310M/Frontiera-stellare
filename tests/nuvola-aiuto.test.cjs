// Test nuvola HELP dei coloni legati. Eseguire dalla cartella principale: node tests/nuvola-aiuto.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('dist/nuvola-aiuto.js','utf8');
// tela finta che registra le chiamate
const calls=[];
function fakeCtx(tag){return new Proxy({},{get:(o,k)=>k in o?o[k]:(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):(...a)=>{calls.push(tag+'.'+String(k))}),set:(o,k,v)=>{o[k]=v;if(tag==='main'&&(k==='shadowBlur'||k==='filter'))calls.push('main.'+k);return true}})}
const document={createElement:()=>({width:0,height:0,getContext:()=>fakeCtx('off')}),fonts:{check:()=>true}};
let orig=0;
const sandbox={console,Math,document,ctx:fakeCtx('main'),pf:{pilot:{x:0,y:0,hp:100}},selected:0,
 pfDrawHelp:()=>{orig++},pfColonistSize:v=>v===4?.72:1};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const draw=sandbox.pfDrawHelp;
draw({state:'libero',x:100,y:400,id:1},1);
assert.equal(calls.filter(c=>c==='main.drawImage').length,0,'Nessuna nuvola se il colono è libero');
draw({state:'legato',x:100,y:400,id:1},1);draw({state:'legato',x:300,y:400,id:2},1.3);
const offCalls=calls.filter(c=>c.startsWith('off.')).length;
draw({state:'legato',x:100,y:400,id:1},2);
assert.equal(calls.filter(c=>c.startsWith('off.')).length,offCalls,'La nuvola si disegna una volta sola e poi si riusa');
assert(calls.filter(c=>c==='main.drawImage').length>=3,'Ogni fotogramma è un drawImage');
assert(!calls.includes('main.shadowBlur')&&!calls.includes('main.filter'),'Niente shadowBlur o filter sulla tela principale');
assert.equal(orig,0,'Il vecchio disegno non viene usato');
assert(/HELP!/.test(src),'Scritta HELP!');
const html=fs.readFileSync('dist/index.html','utf8');
assert(/<script src="coloni\.js"><\/script>\s*<script src="nuvola-aiuto\.js"><\/script>/.test(html),'nuvola-aiuto.js caricato dopo coloni.js');
console.log('PASS: nuvola HELP');
