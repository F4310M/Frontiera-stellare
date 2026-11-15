// Crepe dei meteoriti colpiti (2026-11-09): dist/crepe.js. Eseguire: node tests/crepe.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
const html=src('index.html'),at=f=>html.indexOf(`src="${f}`);
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

// 11-14: la crepa si espande a vista (anche tra un colpo e l'altro) e alla rottura si spacca tutta
{
 const noop=new Proxy(function(){},{get:(t,k)=>k==='canvas'?{width:1,height:1}:noop,apply:()=>noop,set:()=>true});
 let t=0;const cv=()=>({width:0,height:0,getContext:()=>noop});
 const sb2={Math,WeakMap,Map,performance:{now:()=>t},document:{createElement:cv},ctx:noop};vm.createContext(sb2);
 vm.runInContext(c+';this.C={crDraw,crState,crShatter,crDrawShatters,crShards,CR_GROW};',sb2);
 const C=sb2.C,rock={};
 C.crDraw(rock,0,40,3);t+=16;C.crDraw(rock,1/3,40,3);
 const st=C.crState.get(rock);assert.ok(st.show<1/3,'subito dopo il colpo la crepa non è ancora tutta');
 for(let i=0;i<20;i++){t+=16;C.crDraw(rock,1/3,40,3)}
 assert.ok(st.show>=1/3-1e-6,'in un attimo raggiunge il danno');
 const a=st.show;for(let i=0;i<200;i++){t+=16;C.crDraw(rock,1/3,40,3)}
 assert.ok(st.show>a+.02&&st.show<=1/3+C.CR_GROW.creep,'poi continua a strisciare piano, con un limite');
 t+=16;C.crDraw(rock,0,40,3);assert.strictEqual(st.show,0,'roccia rinata: niente crepe');
 C.crShatter(10,20,40,0,3);assert.strictEqual(C.crShards.length,1);
 t+=200;C.crDrawShatters();assert.strictEqual(C.crShards.length,1,'la spaccatura si vede per un attimo');
 t+=400;C.crDrawShatters();assert.strictEqual(C.crShards.length,0,'poi sparisce');
 console.log('PASS: crepa che si espande fino alla rottura');
}
