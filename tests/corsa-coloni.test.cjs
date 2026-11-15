// Coloni in fuga con la corsa del pilota (corsa-coloni.js)
const fs=require('fs'),path=require('path'),assert=require('assert');
const d=f=>path.join(__dirname,'..','dist',f),html=fs.readFileSync(d('index.html'),'utf8'),at=s=>html.indexOf('src="'+s);
assert(at('corsa-coloni.js')>at('camminata.js')&&at('camminata.js')>at('coloni.js')&&at('coloni.js')>at('soldati.js'),'corsa-coloni.js dopo soldati, coloni e camminata');
const src=fs.readFileSync(d('corsa-coloni.js'),'utf8');
assert(/soldPosa\(T,o,now\)/.test(src),'usa la posa della corsa del pilota');
assert(!/\.filter\s*=|\.shadowBlur\s*=/.test(src),'niente filter/shadowBlur');
console.log('corsa-coloni: ok');
