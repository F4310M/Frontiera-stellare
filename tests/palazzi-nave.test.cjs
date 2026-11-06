// Test: palazzi in lontananza (palazzi.js) e pezzi della nave legati ai potenziamenti (nave-gadget.js).
// Eseguire dalla cartella principale: node tests/palazzi-nave.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){}}}
const calls={sprites:0,drawImage:0,shadowFrames:0};
function fakeCtx(c){const gradient={addColorStop(){}},t={canvas:c};return new Proxy(t,{get(o,k){if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='createPattern')return()=>({setTransform(){}});if(k==='measureText')return()=>({width:10});
 if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)});if(k==='createImageData')return(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
 if(k==='getTransform')return()=>({a:1,b:0});
 if(k==='drawImage')return()=>{if(c.main)calls.drawImage++};return()=>{}},set(o,k,v){if(k==='shadowBlur'&&c.main&&v>0)calls.shadowFrames++;o[k]=v;return true}})}
const nodes=new Map(),store={};
const sandbox={console,Math,innerWidth:1280,innerHeight:720,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 1000}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},matchMedia(){return{matches:false}},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement(tag){if(tag!=='canvas')return node();calls.sprites++;const c={width:0,height:0};c.getContext=()=>fakeCtx(c);return c}}};
const main={width:0,height:0,style:{},main:true};nodes.set('game',Object.assign(node(),main,{getContext:()=>fakeCtx(main)}));
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','palazzi.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','battaglia.js','nave3d.js','nave-gadget.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);

// ---- palazzi
run('soundEnabled=false;vite=3;viteSave();selected=1;startPlatform()');
assert(val('plzReady()'),'Immagini dei palazzi preparate');
assert.equal(val('plz.sprites.size'),val('pf.deco.buildings.length'),'Un\'immagine per ogni palazzo');
assert(val('plz.far&&plz.far.c'),'Skyline lontano preparato');
let made=calls.sprites;calls.drawImage=0;calls.shadowFrames=0;
run('for(let i=0;i<20;i++)pfDrawColony(i*40,1280,i*.1)');
assert(calls.drawImage>20,'I palazzi vengono copiati dalle immagini');
assert.equal(calls.shadowFrames,0,'Nessun shadowBlur a ogni fotogramma per i palazzi');
assert.equal(calls.sprites,made,'Nessuna nuova immagine durante il gioco');

// ---- nave
run('state="map";eco.upgrades={}');
calls.drawImage=0;run('drawShip({x:0,y:0,angle:0,forward:0,strafe:0,barrier:false,boostState:"ready"})');
const plain=calls.drawImage;
run('eco.upgrades={laser:2,twin:1,salvo:1,shield:1,speed:2,fuel:1}');
calls.drawImage=0;run('drawShip({x:0,y:0,angle:0,forward:0,strafe:0,barrier:false,boostState:"ready"})');
assert.equal(calls.drawImage,plain+2,'Con i potenziamenti la nave ha i pezzi sotto e sopra lo scafo');
made=calls.sprites;calls.shadowFrames=0;
run('for(let i=0;i<30;i++)drawShip({x:0,y:0,angle:0,forward:0,strafe:0,barrier:false,boostState:"ready"})');
assert.equal(calls.sprites,made,'I pezzi restano in memoria tra un fotogramma e l\'altro');
const k1=val('ngCache.key');run('eco.upgrades.laser=3');run('drawShip({x:0,y:0,angle:0,forward:0,strafe:0})');
assert.notEqual(val('ngCache.key'),k1,'Comprando un potenziamento la nave si ridisegna');
calls.drawImage=0;run('drawShip({x:0,y:0,angle:0,forward:0,strafe:0},true)');
calls.drawImage=0;run('shipRoll3D({x:0,y:0,angle:0,forward:1,strafe:0},false,.7)');
assert(calls.drawImage>=2,'Anche in rollio 3D i pezzi seguono la nave');
calls.drawImage=0;run('shipRoll3D({x:0,y:0,angle:0,forward:1,strafe:0},true,.7)');
assert.equal(calls.drawImage,0,'Le navi nemiche non hanno i pezzi del giocatore');
console.log('PASS: palazzi in lontananza e nave con i potenziamenti');
