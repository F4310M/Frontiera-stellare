// Test della grafica della fase 2 con canvas fuori schermo simulati. Eseguire dalla cartella principale: node tests/grafica2.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function node(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:Array.from({length:5},()=>({classList:{toggle(){}}})),textContent:'',querySelector(){return node()},querySelectorAll(){return[]},appendChild(){},setAttribute(){},addEventListener(){}}}
const calls={drawImage:0,imageData:0};
function fakeCtx(canvas){const gradient={addColorStop(){}},t={canvas};return new Proxy(t,{get(o,k){if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;if(k==='createPattern')return()=>({setTransform(){}});if(k==='measureText')return()=>({width:10});
 if(k==='createImageData')return(w,h)=>{calls.imageData++;return{width:w,height:h,data:new Uint8ClampedArray(w*h*4)}};
 if(k==='getImageData')return(x,y,w,h)=>{const d=new Uint8ClampedArray(w*h*4);for(let i=Math.floor(h/2)*w*4;i<d.length;i+=4)d[i+3]=255;return{data:d}};
 if(k==='drawImage')return()=>{calls.drawImage++};return()=>{}},set(o,k,v){o[k]=v;return true}})}
const nodes=new Map(),store={};
const sandbox={console:{log(){},warn(...a){throw new Error('grafica non disponibile: '+a.join(' '))}},Math,innerWidth:1280,innerHeight:720,devicePixelRatio:1,localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)}},performance:{now(){return 1000}},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},matchMedia(){return{matches:false}},
 document:{body:node(),documentElement:{},addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},createElement(tag){if(tag!=='canvas')return node();const c={width:0,height:0};c.getContext=()=>fakeCtx(c);return c}}};
const main={width:0,height:0,style:{}};main.getContext=()=>fakeCtx(main);nodes.set('game',Object.assign(node(),main,{getContext:main.getContext}));
vm.createContext(sandbox);
for(const f of ['game.js','fase2.js','grafica2.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),sandbox);
const run=s=>vm.runInContext('{'+s+'\n}',sandbox);
run('soundEnabled=false');
for(let i=0;i<5;i++){
 run(`selected=${i};startPlatform();pf.phase='missione';pf.pilot.visible=true;draw()`);
 assert.equal(run('gfx.ok'),true,'Grafica avanzata attiva sul pianeta '+i);
 assert.equal(run('gfx.layers.length'),4,'Quattro strati di sfondo');
 assert(run('gfx.solids.size')>=1,'Terreno con texture generato');
 run('pf.cam.x=pf.arenaX-500;pf.pilot.x=pf.arenaX+170;pf.pilot.y=600;pf.lives=99');for(let k=0;k<60;k++)run('update(1/30);pf.pilot.hp=100;draw()');
 assert(run('pf.boss!==null'),'Il robot viene disegnato nell’arena');
}
assert(calls.imageData>=5,'Texture procedurale generata per ogni pianeta');
const before=run('gfx.solids.size');run('draw();draw()');assert.equal(run('gfx.solids.size'),before,'Le texture del terreno restano in memoria');
run('const e={x:pf.pilot.x+100,y:600,hp:1,max:1,type:"soldato",w:22,h:48};pf.enemies.push(e);pfHitEnemy(e,5)');assert(run('gFlashes.length')>0,'Gli abbattimenti accendono un lampo di luce');
assert(Math.abs(run('pfShoulder({x:0,y:0,face:1,crouch:false}).y')+42.7)<1e-6,'I colpi partono dal fucile disegnato');
const looks=run('JSON.stringify([1,2,3,4,5,6,7,8].map(id=>{const l=gLook({id});return l.skin+l.hair+l.style}))');assert(new Set(JSON.parse(looks)).size>=4,'I coloni hanno aspetti diversi');
run('for(const st of ["legato","libero","fuga","evacuato"])gColonist({x:pf.pilot.x,y:600,state:st,t:.3,id:7},1)');
console.log('PASS: sfondi a strati, texture del terreno, luci, robot e personaggi su tutti i pianeti, coloni diversi in ogni posa');
