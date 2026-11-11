// Cristalli fluorescenti (cristalli.js)
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const a=html.indexOf('src="grafica2.js"'),b=html.indexOf('src="sotterranei.js"'),c=html.indexOf('src="cristalli.js"');
assert(a>0&&b>a&&c>b,'cristalli.js va caricato dopo grafica2.js e sotterranei.js');
const src=fs.readFileSync(path.join(root,'dist/cristalli.js'),'utf8');
assert(!/\.filter\s*=|\.shadowBlur\s*=/.test(src),'niente ctx.filter né shadowBlur: solo sprite in cache');
for(const n of ['gCrystal','gSolidCache','pfDrawFlora','sotDrawCrystal','gApplyLighting','sotApplyLighting'])assert(src.includes(n),n);
// carica lo script con finte funzioni di gioco e controlla che le avvolga
const ctx={};const win={};
const fake={gCrystal(){},gSolidCache(){},pfDrawFlora(){},sotDrawCrystal(){},gApplyLighting(){},sotApplyLighting(){}};
const run=new Function('window','f',`var gCrystal=f.gCrystal,gSolidCache=f.gSolidCache,pfDrawFlora=f.pfDrawFlora,sotDrawCrystal=f.sotDrawCrystal,gApplyLighting=f.gApplyLighting,sotApplyLighting=f.sotApplyLighting;
${src}
return{gCrystal,gSolidCache,pfDrawFlora,sotDrawCrystal,gApplyLighting,sotApplyLighting};`);
const out=run(win,fake);
for(const k of Object.keys(fake))assert(out[k]!==fake[k],k+' avvolta');
const n=win.CRISTALLI.neon('#7a62d8');
assert(/hsl\(2\d\d,100%/.test(n.body),'tinta viola al neon: '+n.body);
assert.strictEqual(win.CRISTALLI.neon('#7a62d8'),n,'colori in cache');
console.log('cristalli: ok');
