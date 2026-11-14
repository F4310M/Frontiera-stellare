// Buchi neri (2026-11-14): attirano la nave del pilota un po' meno (-20%), così si riesce a fuggire.
// Eseguire dalla cartella principale: node tests/buco-nero-fuga.test.cjs
const fs=require('fs'),assert=require('assert'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','dist','buchineri.js'),'utf8');
const k=+s.match(/\bplayer:([\d.]+),/)[1];
assert.ok(k>=.7&&k<1,'nave del pilota tirata un po\' meno: '+k);
assert.match(s,/bhAccel\(h,d,boost\?BH_CFG\.pullBoost:BH_CFG\.pull\)\*BH_CFG\.player/,'vale per l\'attrazione');
assert.match(s,/const drift=BH_CFG\.player\*h\.k\*/,'e per lo scivolamento senza post-bruciatore');
console.log('PASS: si fugge più facilmente dai buchi neri');
