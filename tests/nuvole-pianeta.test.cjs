// Nuvole del pianeta (2026-11-14): strato a parte poco sopra la superficie, con ombra e un movimento lentissimo.
// Eseguire dalla cartella principale: node tests/nuvole-pianeta.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','dist','pianeta.js'),'utf8');
const sb={Math,console,performance:{now:()=>0},drawWorld(){},document:{createElement:()=>null}};vm.createContext(sb);
vm.runInContext(s+';this.C=PL_CLOUDS;',sb);
const C=sb.C;
assert.ok(C.lift>1&&C.lift<1.05,'strato appena sopra la superficie: '+C.lift);
assert.ok(C.swing>0&&C.swing<.1&&C.speed>0&&C.speed<.2,'movimento leggerissimo');
assert.ok(C.shadow>0&&C.shadow<.6,'ombra delle nuvole tenue');
// costruzione: le nuvole vanno nello strato a parte, la superficie resta senza nuvole
assert.match(s,/if\(!cd&&cm>0\)/,'senza strato (vecchio browser) le nuvole restano sulla superficie');
assert.match(s,/cd\[i\+3\]=255\*cm\*edge/,'nuvole nello strato a parte');
assert.ok(!/shadowBlur\s*=|\.filter\s*=/.test(s),'niente shadowBlur/filter');
console.log('PASS: nuvole del pianeta su uno strato che si muove');
