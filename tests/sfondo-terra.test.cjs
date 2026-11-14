// Sfondo a terra in alta definizione e dettagli (2026-11-14): sfondo-hd.js e terra-dettagli.js.
// Eseguire dalla cartella principale: node tests/sfondo-terra.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const hd=fs.readFileSync(path.join(dist,'sfondo-hd.js'),'utf8'),td=fs.readFileSync(path.join(dist,'terra-dettagli.js'),'utf8');

// ---- contesto 2D finto: conta i disegni e ricorda le operazioni vietate
const conta={drawImage:0,fill:0,stroke:0,shadowBlur:0,filter:0,roundRect:0,imageData:0};
function ctx2d(){const g={canvas:null,
 save(){},restore(){},scale(){},translate(){},rotate(){},setTransform(){},transform(){},clearRect(){},fillRect(){},strokeRect(){},
 beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){},ellipse(){},quadraticCurveTo(){},bezierCurveTo(){},clip(){},rect(){},
 roundRect(){conta.roundRect++},fill(){conta.fill++},stroke(){conta.stroke++},drawImage(){conta.drawImage++},
 createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>({setTransform(){}}),
 createImageData:(w,h)=>{conta.imageData++;return{data:new Uint8ClampedArray(Math.ceil(w)*Math.ceil(h)*4)}},putImageData(){},
 getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.ceil(w)*Math.ceil(h)*4)})};
 return new Proxy(g,{set(t,k,v){if(k==='shadowBlur'&&v>0)conta.shadowBlur++;if(k==='filter'&&v&&v!=='none')conta.filter++;t[k]=v;return true}})}
function tela(w=1,h=1){const c={width:w,height:h};c.getContext=()=>{const g=ctx2d();g.canvas=c;return g};return c}
const ctx=ctx2d();
const sb={Math,Map,Set,Proxy,Uint8Array,Uint8ClampedArray,Int32Array,Float32Array,console:{warn(){},log(){}},ctx,DOMMatrix:class{scale(){return this}translate(){return this}},
 document:{createElement:()=>tela()},PF_VH:720,G_TL:2048,W:1280,H:720,grfx:{p:'ultra'},
 chiamate:[]};
vm.createContext(sb);
vm.runInContext(`
function pfRng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function pfHash(t){return Array.from(t).reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),7)>>>0}
function gHash(i){i=Math.imul(i^0x27d4eb2d,0x165667b1);i^=i>>>15;return(i>>>0)/4294967296}
function gMix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function gRgb(c,a=1){return'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+a+')'}
function gHex(h){h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function gCanvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);const g=c.getContext('2d');return{c,g}}
function gMat(){return{sunPos:[.3,.2],sun:[255,240,200],liquid:['#2a8ab3','#0b3a56','#031420'],foam:'rgba(225,250,255,.85)'}}
function gProfAt(p,x){return 500}
function pfTheme(p){return pf.theme}
function pfOnScreen(){return true}
let pf={p:{code:'LY'},theme:{id:'mare',rim:'#a8f0ff',sky:['#000','#111','#203040']},solids:[],deco:{themeBack:{flora:[]}}};
let gfx={res:2,solids:new Map()};
let plz={res:2,pal:{base:[40,60,70],sky:[30,40,60],haze:[60,70,90],m:{sun:[255,240,200]},sunLeft:true,warm:[255,208,140],cool:[150,230,255]}};const PLZ_FAR_W=2048;
function gMakeLayers(){chiamate.push('gMakeLayers');return[]}
function gCropLayer(cv,par,top,RB){chiamate.push('gCropLayer:'+RB);return{c:cv.c,par,top,h:1}}
function gDistantLandmarks(){chiamate.push('gDistantLandmarks')}
function gLayerDetails(g,id){chiamate.push('gLayerDetails:'+id)}
function plzSkyline(){chiamate.push('plzSkyline');return{}}
function plzFacade(){chiamate.push('plzFacade')}
function plzBuilding(b){chiamate.push('plzBuilding');return{c:gCanvas(40,80).c}}
function gSolidCache(sd){chiamate.push('gSolidCache');const o={c:gCanvas(100,60).c};gfx.solids.set(sd,o);return o}
function gDrawFrontLiquid(){chiamate.push('liquido-originale')}
function pfDrawFlora(now){chiamate.push('flora:'+pf.deco.themeBack.flora.map(f=>f.kind).join(','))}
`,sb);
vm.runInContext(hd,sb);vm.runInContext(td,sb);
const run=c=>vm.runInContext(c,sb);

// ---- strati dello sfondo: rilievo applicato e ritaglio originale chiamato con la scala giusta
sb.chiamate.length=0;run('gCropLayer({c:gCanvas(64,32).c,g:gCanvas(64,32).g},.29,180,1)');
assert.ok(sb.chiamate.includes('gCropLayer:1'),'ritaglio originale chiamato');
// in ULTRA gli strati sono più definiti: gMakeLayers originale chiamato comunque
sb.chiamate.length=0;run('gMakeLayers()');assert.ok(sb.chiamate.includes('gMakeLayers'));
// costruzioni lontane disegnate (anche senza la funzione originale) per ogni tema, senza errori
for(const id of ['mare','deserto','foresta','lava','tempesta'])run(`gDistantLandmarks(gCanvas(10,10).g,[],{base:500},{id:'${id}',rim:'#ffffff'},[60,70,80],[20,20,30],1)`);
// skyline e palazzi: spigoli arrotondati
conta.roundRect=0;run('plzSkyline.call(null)');
run('plzFacade(gCanvas(10,10).g,0,-50,30,50)');assert.ok(sb.chiamate.includes('plzFacade'),'facciata originale chiamata');
assert.ok(conta.roundRect>0,'spigoli arrotondati');
run('plzBuilding({})');assert.ok(sb.chiamate.includes('plzBuilding'));
// rocce vicine: rilievo una sola volta per blocco
sb.chiamate.length=0;run('const sd={x:0,y:500,w:100};gSolidCache(sd);gSolidCache(sd)');
assert.equal(sb.chiamate.filter(c=>c==='gSolidCache').length,2,'cache originale sempre consultata');

// ---- liquido: striscia preparata una volta per livello, poi solo copiata; niente shadowBlur
conta.imageData=0;conta.shadowBlur=0;conta.filter=0;sb.chiamate.length=0;
run('gDrawFrontLiquid(0,1280,1)');const prime=conta.imageData;assert.ok(prime>=2,'strisce dipinte');
for(let i=0;i<5;i++)run(`gDrawFrontLiquid(${i*40},1280,${1+i*.016})`);
assert.equal(conta.imageData,prime,'strisce riusate (non ridipinte a ogni fotogramma)');
assert.ok(!sb.chiamate.includes('liquido-originale'),'liquido nuovo al posto di quello vecchio');
for(const id of ['lava','deserto','tempesta']){run(`pf={...pf,theme:{...pf.theme,id:'${id}'}};td=null`);run('gDrawFrontLiquid(0,1280,1)')}
assert.equal(conta.shadowBlur,0,'niente shadowBlur sul liquido');assert.equal(conta.filter,0,'niente ctx.filter');

// ---- cactus e alberi: immagini pronte al posto dei rettangoli e dei cerchi
run(`pf.deco.themeBack.flora=[{kind:'cactus',x:10,y:600,size:1,flip:1,seed:1},{kind:'albero',x:90,y:600,size:1,flip:-1,seed:2},{kind:'roccia',x:50,y:600,size:1,flip:1,seed:3}]`);
sb.chiamate.length=0;conta.drawImage=0;run('pfDrawFlora(1)');
assert.deepEqual(sb.chiamate,['flora:roccia'],'le altre piante restano all\'originale');
assert.equal(run('pf.deco.themeBack.flora.length'),3,'lista delle piante ripristinata');
assert.ok(conta.drawImage>=2,'cactus e albero copiati come immagini');
const c1=run('td.cactus[0]');run('pfDrawFlora(2)');assert.equal(run('td.cactus[0]'),c1,'immagini riusate');
// alberi della foresta negli strati lontani: niente cerchi, ma gli altri temi restano all'originale
sb.chiamate.length=0;run(`gLayerDetails(gCanvas(10,10).g,'foresta',2,{base:500},[],[60,90,60],[20,30,20],pfRng(1),'#c8ff9a')`);
assert.ok(!sb.chiamate.some(c=>c.startsWith('gLayerDetails')),'foresta: alberi nuovi');
run(`gLayerDetails(gCanvas(10,10).g,'mare',2,{base:500},[],[60,90,60],[20,30,20],pfRng(1),'#fff')`);
assert.ok(sb.chiamate.includes('gLayerDetails:mare'),'altri temi: dettagli originali');

// ---- regole PC: nessun shadowBlur o ctx.filter nei file
for(const [n,src] of [['sfondo-hd.js',hd],['terra-dettagli.js',td]]){
 assert.ok(!/shadowBlur\s*=\s*[1-9]/.test(src),n+': niente shadowBlur');assert.ok(!/\.filter\s*=\s*['"`]blur/.test(src),n+': niente ctx.filter');
}
// ---- ordine di caricamento
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('sfondo-hd.js')>at('grafica2.js')&&at('sfondo-hd.js')>at('palazzi.js'),'sfondo-hd dopo grafica2 e palazzi');
assert.ok(at('terra-dettagli.js')>at('sfondo-hd.js'),'terra-dettagli dopo sfondo-hd');
console.log('sfondo-terra: ok');
