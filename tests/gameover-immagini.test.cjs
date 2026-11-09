// Test: GAME OVER con l'immagine e la musica di Fabio (dist/gameover-immagini.js).
// Eseguire dalla cartella principale: node tests/gameover-immagini.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();
function node(){const cl=new Set();const n={style:{setProperty(){}},classList:{add(c){cl.add(c)},remove(c){cl.delete(c)},toggle(c,v){(v??!cl.has(c))?cl.add(c):cl.delete(c)},contains(c){return cl.has(c)}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},listeners:{},
 querySelector(){return n._q||(n._q=node())},querySelectorAll(){return[]},appendChild(c){n.children.push(c);return c},setAttribute(){},addEventListener(t,f){n.listeners[t]=f},focus(){},getContext(){return null}};
 Object.defineProperty(n,'id',{set(v){nodes.set(v,n)},get(){return''}});return n}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
let now=0;const timers=[],winKeys=[];
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return now}},setTimeout(f){timers.push(f);return timers.length},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(t,f,c){if(t==='keydown'&&c===true)winKeys.push(f)},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id)){if(id==='gameOverArcade'||id==='gameOverImage')return null;nodes.set(id,node())}return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','gameover.js','gameover-immagini.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false');
nodes.get('returnBtn').querySelector=()=>({textContent:''});

// Prima del GAME OVER la scritta non c'è
assert.equal(nodes.get('gameOverArcade'),undefined,'Nessuna scritta finché ci sono vite');


// Prima del GAME OVER niente immagine, e il brano è registrato in musica.js
assert.equal(nodes.get('gameOverImage'),undefined,'Nessuna immagine finché ci sono vite');
assert.equal(val('MUS_TRACKS.caduta'),'musica/orbit-of-the-fallen.mp3');
assert(fs.existsSync('dist/musica/orbit-of-the-fallen.mp3')&&fs.existsSync('dist/gameover/spazio.jpg')&&fs.existsSync('dist/gameover/terra.jpg'),'File presenti');
val('location={protocol:"http:"};Audio=function(){}');

// Ultima vita persa nello spazio: immagine della nave e brano Orbit of the Fallen
run('abort();vite=1;viteSave();eco.balance=4000;eco.earned=3000;selected=0;startGame();arrivalRemaining=0;explodePlayer();for(let i=0;i<400;i++)update(1/60)');
const o=nodes.get('gameOverImage');
assert(o,'Schermata creata');
assert(!o.classList.contains('hidden')&&o.classList.contains('goi-on'),'Immagine visibile');
assert.equal(o.querySelector().src,'gameover/spazio.jpg','Nello spazio: la nave distrutta');
assert.equal(nodes.get('gameOverArcade'),undefined,'La vecchia scritta a pixel non compare');
assert.equal(nodes.get('resultEyebrow').textContent,'GAME OVER');
assert.equal(val('vite'),3,'Si riparte con 3 vite');assert.equal(val('eco.balance'),600,'Resta il 20% dei guadagni');
assert.equal(val('state'),'lost');assert.equal(val('musTheme()'),'caduta','Suona Orbit of the Fallen');
console.log('PASS: GAME OVER nello spazio');

// Un tasto troppo presto non la chiude; dopo un attimo sì. Il brano continua sulla schermata finale.
const ev={stopPropagation(){},preventDefault(){}};
now=500;winKeys.forEach(f=>f(ev));assert(!o.classList.contains('hidden'),'Resta visibile per almeno un secondo');
now=2000;winKeys.forEach(f=>f(ev));assert(o.classList.contains('hidden'),'Un tasto la chiude');
assert.equal(val('musTheme()'),'caduta','Il brano continua sulla schermata di fine partita');
run('abort()');assert.equal(val('musTheme()'),'menu','Tornati alla mappa: musica del menu');
console.log('PASS: si chiude con un tasto, musica del menu sulla mappa');

// Ultima vita persa a terra: immagine del pilota caduto
now=0;run('abort();vite=1;viteSave();selected=0;startPlatform();for(let i=0;i<200;i++)update(1/60);pf.lives=1;pfLoseLife();for(let i=0;i<600&&state==="platform";i++)update(1/60)');
assert(!o.classList.contains('hidden'),'GAME OVER anche a terra');
assert.equal(o.querySelector().src,'gameover/terra.jpg','A terra: il pilota caduto');
assert.equal(val('musTheme()'),'caduta');
console.log('PASS: GAME OVER a terra');

// Una vita persa ma non l'ultima: niente immagine né brano
now=5000;winKeys.forEach(f=>f(ev));run('abort();vite=3;viteSave();startGame();arrivalRemaining=0;explodePlayer();for(let i=0;i<400;i++)update(1/60)');
assert(o.classList.contains('hidden'),'Nessuna immagine se restano vite');
assert.notEqual(val('musTheme()'),'caduta');
// Senza server (file://) niente brano registrato: resta la musica di sempre
run('abort();vite=1;viteSave();startGame();arrivalRemaining=0;explodePlayer();for(let i=0;i<400;i++)update(1/60)');
val('location={protocol:"file:"}');assert.notEqual(val('musTheme()'),'caduta','Da file:// si usa la musica sintetica');
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('gameover-immagini.js')>html.indexOf('gameover.js')&&html.includes('gameover-immagini.css'),'Caricato dopo gameover.js');
console.log('PASS: tutto ok');
