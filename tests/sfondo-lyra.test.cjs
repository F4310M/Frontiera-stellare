// Sfondi dipinti dei pianeti a terra (2026-11-14/15): dist/sfondo-lyra.js con le immagini di dist/sfondi/.
// Eseguire dalla cartella principale: node tests/sfondo-lyra.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=fs.readFileSync(path.join(dist,'sfondo-lyra.js'),'utf8');
const caricate=[],disegni=[];
function Img(){const i={complete:true,naturalWidth:1672,naturalHeight:941,decode:()=>Promise.resolve()};Object.defineProperty(i,'src',{set(v){i._src=v;caricate.push(v)},get(){return i._src}});return i}
function ctx2d(){return{fillRect(){},clearRect(){},drawImage(i,x){disegni.push(i&&i._src||'canvas')},save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},
 createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>({setTransform(){}}),
 getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}}}
const ctx=ctx2d();
const sb={Image:Img,ctx,PF_VH:720,state:'platform',performance:{now:()=>1000},DOMMatrix:class{translate(){return this}},
 localStorage:{getItem:()=>null,setItem(){}},document:{createElement:()=>({width:1,height:1,getContext:()=>ctx2d()})}};
vm.createContext(sb);
vm.runInContext(`var chiamate=[];var gfx={layers:['L0','L1','L2','L3']};var pf={p:{name:'LYRA'},under:false,cam:{x:0}};
function gDrawSky(){chiamate.push('cielo')}function pfDrawColony(){chiamate.push('colonia')}function pfDrawThemeBack(){chiamate.push('tema')}
function gDrawLayer(L){chiamate.push(L)}
function drawPlatform(){gDrawSky();gDrawLayer('L0');gDrawLayer('L1');pfDrawColony();gDrawLayer('L3',0,1280)}
function startPlatform(){}`,sb);
vm.runInContext(src,sb);
const run=c=>vm.runInContext(c,sb);

// tutte le immagini della tabella esistono e sono vere immagini
const conf=run('SL.pianeti');
for(const [nome,c] of Object.entries(conf)){assert.ok(c.img.length>=3,'più immagini per '+nome);
 for(const [f,terra] of c.img){assert.ok(fs.statSync(path.join(dist,'sfondi',f)).size>50000,'immagine presente '+f);assert.ok(terra>500&&terra<900,'riga del terreno '+f)}}
for(const n of ['LYRA','VESPER','NIMBUS','KHEPRI','OMEGA'])assert.ok(conf[n],'sfondo dipinto per '+n);
assert.ok(!conf.UMBRA,'UMBRA tiene lo sfondo disegnato');

// LYRA: niente sfondo disegnato a mano, immagine disegnata
run('drawPlatform()');
assert.deepEqual(run('chiamate'),[],'con l\'immagine lo sfondo disegnato a mano non si disegna');
assert.ok(disegni.some(d=>/sfondi\/lyra/.test(d)),"l'immagine è disegnata");
// un pianeta senza immagini: tutto come prima
run('pf={p:{name:"UMBRA"},under:false};chiamate.length=0;drawPlatform()');
assert.deepEqual(run('chiamate'),['cielo','L0','L1','colonia','L3'],'sugli altri pianeti tutto come prima');
// nei sotterranei sfondo di prima
run('pf={p:{name:"LYRA"},under:true};chiamate.length=0;drawPlatform()');
assert.equal(run('chiamate').length,5,'nei sotterranei sfondo di prima');
// a ogni missione un'immagine diversa (a giro)
const scelte=[];for(let i=0;i<4;i++){run('pf={p:{name:"NIMBUS"},under:false};chiamate.length=0;drawPlatform()');scelte.push(run('slSel.file'))}
assert.equal(new Set(scelte).size,4,'immagini diverse a ogni missione');
assert.ok(scelte.every(f=>/^nimbus-\d\.jpg$/.test(f)));
// analisi una sola volta per immagine
run('pf={p:{name:"OMEGA"},under:false};drawPlatform();drawPlatform()');
assert.equal(typeof run('slSel.e.an'),'object','immagine analizzata (luci, fluidi)');
// regole PC
assert.ok(!/shadowBlur\s*=\s*[1-9]/.test(src)&&!/\.filter\s*=/.test(src),'niente shadowBlur o ctx.filter');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('sfondo-lyra.js')>at('grafica2.js')&&at('sfondo-lyra.js')>at('fuga-sfondo.js'),'ordine di caricamento');
console.log('sfondo-lyra: ok');
