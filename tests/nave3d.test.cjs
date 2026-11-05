// Test: nella fase a terra la nave è la stessa dello spazio, disegnata da un'immagine in memoria.
// Eseguire dalla cartella principale: node tests/nave3d.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],textContent:'',innerHTML:'',offsetWidth:0,dataset:{},querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){}}}
const calls={sprites:0,drawImage:0,shadowFrames:0};let building=false;
function fakeCtx(c){const gradient={addColorStop(){}},t={canvas:c};return new Proxy(t,{get(o,k){if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='createPattern')return()=>({setTransform(){}});if(k==='measureText')return()=>({width:10});
 if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)});if(k==='createImageData')return(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
 if(k==='drawImage')return()=>{if(c.main)calls.drawImage++};return()=>{}},set(o,k,v){if(k==='shadowBlur'&&c.main&&v>0)calls.shadowFrames++;o[k]=v;return true}})}
const nodes=new Map(),store={};
const sandbox={console,Math,innerWidth:1280,innerHeight:720,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 1000}},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},addEventListener(){},matchMedia(){return{matches:false}},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement(tag){if(tag!=='canvas')return node();calls.sprites++;const c={width:0,height:0};c.getContext=()=>fakeCtx(c);return c}}};
const main={width:0,height:0,style:{},main:true};nodes.set('game',Object.assign(node(),main,{getContext:()=>fakeCtx(main)}));
vm.createContext(sandbox);
for(const f of ['icone.js','game.js','pianeta.js','fase2.js','grafica2.js','boss.js','economia.js','finale.js','musica.js','terra.js','fluidita.js','battaglia.js','nave3d.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox),val=s=>vm.runInContext(s,sandbox);
run('soundEnabled=false;vite=3;viteSave();selected=0;startPlatform()');
assert(val('n3GetSprite()')!==null,'Immagine della nave creata');
const made=calls.sprites;
calls.drawImage=0;calls.shadowFrames=0;
run('for(let i=0;i<30;i++)n3DrawShip({x:0,y:0,angle:0,forward:i%2,strafe:0})');
assert.equal(calls.drawImage,30,'Ogni fotogramma copia l\'immagine della nave');
assert.equal(calls.shadowFrames,0,'Nessun bagliore (shadowBlur) calcolato a ogni fotogramma');
assert.equal(calls.sprites,made,'L\'immagine resta in memoria');
assert.equal(val('typeof flHostileBody'),'function','Lo scafo usa lo stesso disegno della nave dello spazio');
run('state="map"');calls.drawImage=0;run('drawShip({x:0,y:0,angle:0,forward:0,strafe:0})');assert.equal(calls.drawImage,0,'Nello spazio la nave si disegna come prima');
console.log('PASS: nave dello spazio nella fase a terra');
