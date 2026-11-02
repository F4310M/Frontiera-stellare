// Test (2026-11-01): colonna sonora (brani di Fabio + orchestra procedurale) e iperspazio.
// Eseguire dalla cartella principale: node tests/musica.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){}}}
const store={};const gradient={addColorStop(){}};
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='measureText')return()=>({width:10});return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 0}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement:node}};
sandbox.document.getElementById('game').getContext=()=>fakeCtx;vm.createContext(sandbox);
for(const f of ['icone.js','game.js','camera.js','iperspazio.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','volume.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
const step=(sec,dt=1/60)=>run(`for(let i=0;i<${Math.round(sec/dt)};i++)update(${dt})`);
run('soundEnabled=false');

// Le melodie coprono esattamente 8 battute; i pattern hanno 16 sedicesimi.
for(const[k,S]of Object.entries(val('MUS_SONGS'))){
 assert.equal(S.melLen,64,`Melodia di ${k}: 8 battute`);assert.equal(S.prog.length,8);
 for(const[n,p]of Object.entries({...S.pat,...(S.fill||{})}))assert.equal(p.length,16,`${k}.${n}: 16 passi`);
}
console.log('PASS: brani ben formati');

// Ogni scena ha il suo brano.
const scene=()=>{const l=val('musLevel()'),s=val('musTheme()');return[s,val(`musTrackId("${s}","${l}")`)]};
run('abort()');assert.deepEqual(scene(),['menu','menu'],'Mappa: Oltre le Stelle');
run('selected=0;startGame();arrivalRemaining=0');assert.deepEqual(scene(),['spazio','spazio'],'Volo: Assalto Orbitale');
run('player.x=world.x-world.r-300;player.y=world.y');assert.deepEqual(scene(),['spazio','soglia'],'Vicino al pianeta: Soglia Ostile');
run('abort();vite=3;selected=0;startPlatform()');step(3.5);assert.deepEqual(scene(),['terra','terra'],'A terra: Fuoco sul Pianeta');
run('pf.phase="missione";pfEnterArena()');assert.deepEqual(scene(),['boss','boss'],'Boss: Soglia Ostile (boss)');
run('pf.phase="vittoria"');assert.deepEqual(scene(),['vittoria',null],'Vittoria: orchestra');
run('abort();planets.push(FINAL_PLANET);selected=planets.indexOf(FINAL_PLANET);startPlatform();pf.phase="missione";pfEnterArena()');assert.deepEqual(scene(),['omega','boss'],'OMEGA: brano del boss');
run('abort();planets.pop();selected=0');
for(const f of Object.values(val('MUS_TRACKS')))assert(fs.existsSync('dist/'+f),'File presente: '+f);
console.log('PASS: un brano per ogni scena');

// Orchestra procedurale con un audio finto: ogni brano e ogni intensità si suonano senza errori.
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
const audioNode=()=>({connect(){},disconnect(){},start(){},stop(){},gain:param(),frequency:param(),detune:param(),Q:param(),threshold:param(),ratio:param(),attack:param(),release:param()});
let made=0;const fakeAudio={currentTime:0,sampleRate:8000,destination:audioNode(),createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)}),createConvolver:()=>audioNode()};
for(const k of['Gain','Oscillator','BiquadFilter','BufferSource','DynamicsCompressor'])fakeAudio['create'+k]=()=>{made++;return audioNode()};
sandbox.fakeAudio=fakeAudio;run('mus.bus=null;musBuild(fakeAudio)');
for(const[song,S]of Object.entries(val('MUS_SONGS')))for(const level of Object.keys(S.layers)){run(`musStart(fakeAudio,"${song}");for(let s=0;s<256;s++)musStep(fakeAudio,s%128,s*.1,"${song}","${level}",s>>7)`)}
assert(made>1000,'Le note creano nodi audio');
console.log('PASS: orchestra procedurale');

// Iperspazio: disegna tutte le fasi del salto e sostituisce il suono "warp".
run('selected=1;beginWarp()');for(const t of[0,.4,.85,1.5,2.5,3.1,3.6])run(`drawHyperspace(${t})`);
assert.equal(nodes.get('warpPhase').textContent,'USCITA DALL’IPERSPAZIO');
run('drawHyperspace(1.5)');assert.equal(nodes.get('warpPhase').textContent,'IPERSPAZIO');
run('sfx("warp")');
console.log('PASS: iperspazio');

// Volume: musica al 40% di partenza, effetti al 100%, valori salvati e limitati a 0..100.
assert.equal(val("volumePercent('music')"),40);assert.equal(val("volumePercent('sfx')"),100);
run("setVolume('music',65)");assert.equal(store.stellarVolumeMusica,'65');assert.equal(val("volumeLevel('music')"),.65);
run("setVolume('sfx',150)");assert.equal(val("volumePercent('sfx')"),100);run("setVolume('sfx',-3)");assert.equal(val("volumePercent('sfx')"),0);
console.log('PASS: volume di musica ed effetti');
