// Test: scritta GAME OVER anni '80 (dist/gameover.js) quando finiscono tutte le vite.
// Eseguire dalla cartella principale: node tests/gameover.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();
function node(){const cl=new Set();const n={style:{setProperty(){}},classList:{add(c){cl.add(c)},remove(c){cl.delete(c)},toggle(c,v){(v??!cl.has(c))?cl.add(c):cl.delete(c)},contains(c){return cl.has(c)}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},listeners:{},
 querySelector(){return n._q||(n._q=node())},querySelectorAll(){return[]},appendChild(c){n.children.push(c);return c},setAttribute(){},addEventListener(t,f){n.listeners[t]=f},focus(){},getContext(){return null}};
 Object.defineProperty(n,'id',{set(v){nodes.set(v,n)},get(){return''}});return n}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
let now=0;const timers=[],winKeys=[];
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return now}},setTimeout(f){timers.push(f);return timers.length},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(t,f,c){if(t==='keydown'&&c===true)winKeys.push(f)},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id)){if(id==='gameOverArcade')return null;nodes.set(id,node())}return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','gameover.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');
nodes.get('returnBtn').querySelector=()=>({textContent:''});

// Prima del GAME OVER la scritta non c'è
assert.equal(nodes.get('gameOverArcade'),undefined,'Nessuna scritta finché ci sono vite');

// Ultima vita persa nello spazio: logica di sempre + scritta GAME OVER
run('abort();vite=1;viteSave();eco.balance=4000;selected=0;startGame();arrivalRemaining=0;explodePlayer();for(let i=0;i<400;i++)update(1/60)');
const o=nodes.get('gameOverArcade');
assert(o,'La scritta GAME OVER è stata creata');
assert(!o.classList.contains('hidden')&&o.classList.contains('go-on'),'La scritta GAME OVER è visibile');
assert.equal(nodes.get('resultEyebrow').textContent,'GAME OVER');
assert.equal(val('vite'),3,'Si riparte con 3 vite');assert.equal(val('eco.balance'),1000,'Resta il 25% dei crediti');
assert.equal(nodes.get('goRow1').children.length,4);assert.equal(nodes.get('goRow2').children.length,4);
assert.deepEqual(Object.keys(val('GO_FONT')).sort(),['A','E','G','M','O','R','V']);
assert(val('Object.values(GO_FONT).every(l=>l.length===7&&l.every(r=>/^[01]{5}$/.test(r)))'),'Lettere 5x7');
console.log('PASS: GAME OVER nello spazio');

// Un tasto troppo presto non la chiude; dopo un attimo sì
const ev={stopPropagation(){},preventDefault(){}};
now=500;winKeys.forEach(f=>f(ev));assert(!o.classList.contains('hidden'),'Resta visibile per almeno un secondo');
now=2000;winKeys.forEach(f=>f(ev));assert(o.classList.contains('hidden'),'Un tasto la chiude');
console.log('PASS: si chiude con un tasto');

// Ultima vita persa a terra
now=0;run('abort();vite=1;viteSave();selected=0;startPlatform();for(let i=0;i<200;i++)update(1/60);pf.lives=1;pfLoseLife();for(let i=0;i<600&&state==="platform";i++)update(1/60)');
assert(!o.classList.contains('hidden'),'GAME OVER anche a terra');
console.log('PASS: GAME OVER a terra');

// Si chiude da sola
timers.forEach(f=>{try{f()}catch(e){}});assert(o.classList.contains('hidden'),'Sparisce da sola dopo qualche secondo');
const src=fs.readFileSync('dist/gameover.js','utf8');assert(src.includes('["PREMI UN TASTO","PRESS ANY KEY"')&&src.includes('["TOCCA LO SCHERMO","TAP THE SCREEN"'),'Testi tradotti');
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('gameover.js')>html.indexOf('partita.js')&&html.includes('gameover.css'),'Caricato dopo gli altri file');
console.log('PASS: tutto ok');
