// Simbolo delle vite (2026-11-12): nave nello spazio e nella mappa, omino pilota a terra.
// Eseguire dalla cartella principale: node tests/vite-simbolo.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const sb={state:'map',prof:{foto:'data:image/png;base64,AAAA'},chiamate:0,setInterval:()=>0};
vm.createContext(sb);
vm.runInContext("function vtFoto(){return prof.foto}\nfunction viteHud(){chiamate++}",sb);
vm.runInContext(fs.readFileSync(path.join(dist,'vite-simbolo.js'),'utf8'),sb);
const v=sb.viteSimbolo;
assert.equal(vm.runInContext('vtFoto()',sb),v.NAVE,'nella mappa la nave');
sb.state='play';assert.equal(vm.runInContext('vtFoto()',sb),v.NAVE,'nello spazio la nave');
sb.state='platform';assert.equal(vm.runInContext('vtFoto()',sb),v.PILOTA,'a terra il pilota');
assert.ok(v.NAVE.startsWith('data:image/svg+xml')&&v.PILOTA!==v.NAVE);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert.ok(html.indexOf('vite-simbolo.js')>html.indexOf('<script src="vite.js"'),'dopo vite.js');
console.log('vite-simbolo: ok');
