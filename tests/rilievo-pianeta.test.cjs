// Pianeti con terreno in rilievo (2026-11-14): creste montuose e luce/ombra calcolate sui pendii.
// Eseguire dalla cartella principale: node tests/rilievo-pianeta.test.cjs
const fs=require('fs'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','pianeta.js'),'utf8');
assert.ok(/const PL_RELIEF=\{/.test(src),'parametri del rilievo');
assert.ok(/g\.rowA/.test(src)&&/g\.rowB/.test(src),'riga sopra ricordata per la pendenza verticale');
assert.ok(/PL_RELIEF\.ridge/.test(src),'creste montuose');
assert.ok(/PL_RELIEF\.light/.test(src)&&/PL_RELIEF\.shade/.test(src),'luce e ombra sui pendii');
assert.ok(!/shadowBlur\s*=\s*[1-9]/.test(src)&&!/\.filter\s*=/.test(src),'niente shadowBlur o ctx.filter');
console.log('rilievo-pianeta: ok');
