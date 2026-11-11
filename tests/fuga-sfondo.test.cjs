// Sfondo fermo durante la fuga degli ostaggi (fuga-sfondo.js)
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const a=html.indexOf('src="finale-fuga.js"'),b=html.indexOf('src="fuga-sfondo.js"');
assert(a>0&&b>a,'fuga-sfondo.js va caricato dopo finale-fuga.js');
const src=fs.readFileSync(path.join(root,'dist/fuga-sfondo.js'),'utf8');
for(const n of ['pfDrawPit','gDrawSky','gDrawLayer','pfDrawColony','pfDrawAmbient','pfUpdateAmbient','ffUsciti'])assert(src.includes(n),n);
new Function(src);
const c=html.indexOf('src="ostaggi-dopo-boss.js"');
assert(c>b,'ostaggi-dopo-boss.js va caricato dopo fuga-sfondo.js');
new Function(fs.readFileSync(path.join(root,'dist/ostaggi-dopo-boss.js'),'utf8'));
console.log('fuga-sfondo + ostaggi-dopo-boss: ok');
