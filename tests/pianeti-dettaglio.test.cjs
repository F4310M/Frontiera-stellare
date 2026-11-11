// Test: pianeti dettagliati della home (dist/pianeti-dettaglio.js)
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','dist','pianeti-dettaglio.js'),'utf8');
const ctx={performance:{now:()=>Date.now()},console,Math,JSON};vm.createContext(ctx);
vm.runInContext(src+';this.PD=PD;this.PD_THEMES=PD_THEMES;this.pdTexStart=pdTexStart;this.pdTexBuild=pdTexBuild;this.pdLut=pdLut;',ctx);
// senza canvas/DOM lo script non deve fare nulla e non deve rompersi
assert.ok(ctx.PD&&ctx.PD.views.size===0,'nessun disco senza DOM');
// ogni tema produce una mappa piena e diversa dal nero
ctx.PD.TW=64;ctx.PD.TH=32;
for(const theme of ['mare','deserto','tempesta','foresta','lava','abisso']){
 const g=ctx.pdTexStart({theme,code:'T-'+theme,name:theme});
 let n=0;while(!ctx.pdTexBuild(g,50)&&n<1000)n++;
 assert.ok(g.ready,theme+' pronta');
 let sum=0;for(let i=0;i<g.col.length;i+=4)sum+=g.col[i]+g.col[i+1]+g.col[i+2];
 assert.ok(sum/(g.col.length/4)>40,theme+' non è nera');
}
// stessa missione, stesso pianeta: il seme dipende dal codice
const a=ctx.pdTexStart({theme:'mare',code:'HX-01',name:'LYRA'}),b=ctx.pdTexStart({theme:'mare',code:'HX-01',name:'LYRA'});
ctx.pdTexBuild(a,1e9);ctx.pdTexBuild(b,1e9);assert.deepStrictEqual(Buffer.from(a.col),Buffer.from(b.col),'stesso pianeta = stessa mappa');
// tabella del disco: solo i pixel dentro il cerchio
const v={};ctx.pdLut(v,40);assert.ok(v.lut.n>1100&&v.lut.n<1300,'pixel del disco '+v.lut.n);
// index.html carica lo script dopo menu-pianeti.js
const html=fs.readFileSync(path.join(__dirname,'..','dist','index.html'),'utf8');
assert.ok(html.indexOf('pianeti-dettaglio.js')>html.indexOf('menu-pianeti.js'),'ordine script');
console.log('pianeti-dettaglio: ok');
