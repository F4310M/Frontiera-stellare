// Crepe dei meteoriti colpiti (2026-11-09): dist/crepe.js. Eseguire: node tests/crepe.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
assert.ok(at('crepe.js')>at('meteoriti.js')&&at('crepe.js')<at('arena.js'),'crepe.js dopo meteoriti.js e prima di arena.js');
assert.match(src('arena.js'),/typeof crDraw==='function'&&crDraw\(o,dmg,o\.r,/,'arena usa le crepe nuove con riserva');
const c=src('crepe.js');assert.ok(!/\.filter\s*=|\.shadowBlur\s*=/.test(c),'niente filter/shadowBlur');
// rete di crepe: deterministica, nascite in 0..1, dentro la roccia
const sb={Math,performance:{now:()=>0},WeakMap,Map,drawRockCracks(){sb.orig++},orig:0};vm.createContext(sb);
vm.runInContext(c+';this.C={crNet,crDraw,CR_REF};',sb);
const a=sb.C.crNet(2),b=sb.C.crNet(2);assert.strictEqual(a,b);
assert.ok(a.segs.length>15,'abbastanza tratti');
for(const s of a.segs){assert.ok(s.b>=0&&s.b<1.2);assert.ok(Math.hypot(s.x1,s.y1)<=sb.C.CR_REF*.8)}
// senza document: torna a false e il gioco usa le linee vecchie, senza errori anche con hp negativo
assert.strictEqual(sb.C.crDraw({},.5,40,1),false);
sb.drawRockCracks({hp:-30,maxHp:10,r:40,rot:1},{});assert.strictEqual(sb.orig,1);
console.log('PASS: crepe');
