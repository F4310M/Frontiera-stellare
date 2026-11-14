// Sfondo di LYRA a terra (2026-11-14): immagine dist/sfondi/lyra.jpg al posto del cielo e degli strati lontani.
// Eseguire dalla cartella principale: node tests/sfondo-lyra.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
assert.ok(fs.statSync(path.join(dist,'sfondi','lyra.jpg')).size>50000,'immagine presente');
const img={complete:true,naturalWidth:1672,naturalHeight:700};
const disegni=[];const ctx={fillRect(){},drawImage(i,x){disegni.push(x)},save(){},restore(){},translate(){},scale(){}};
const sb={Image:function(){return img},ctx,PF_VH:720,state:'platform',disegni};
vm.createContext(sb);
vm.runInContext(`var chiamate=[];var gfx={layers:['L0','L1','L2','L3']};var pf={p:{name:'LYRA'},under:false,cam:{x:0}};
function gDrawSky(){chiamate.push('cielo')}function pfDrawColony(){chiamate.push('colonia')}function pfDrawThemeBack(){chiamate.push('tema')}
function gDrawLayer(L){chiamate.push(L)}
function drawPlatform(){gDrawSky();gDrawLayer('L0');gDrawLayer('L1');pfDrawColony();gDrawLayer('L3',0,1280)}`,sb);
vm.runInContext(fs.readFileSync(path.join(dist,'sfondo-lyra.js'),'utf8'),sb);
const run=c=>vm.runInContext(c,sb);
run('drawPlatform()');
assert.deepEqual(run('chiamate'),[],'su LYRA lo sfondo disegnato a mano non si disegna');
assert.ok(disegni.length>=1,"l'immagine è disegnata");
run('pf.p={name:"KHEPRI"};chiamate.length=0;drawPlatform()');
assert.deepEqual(run('chiamate'),['cielo','L0','L1','colonia','L3'],'sugli altri pianeti tutto come prima');
run('pf.p={name:"LYRA"};pf.under=true;chiamate.length=0;drawPlatform()');
assert.equal(run('chiamate').length,5,'nei sotterranei sfondo di prima');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('sfondo-lyra.js')>at('grafica2.js')&&at('sfondo-lyra.js')>at('fuga-sfondo.js'),'ordine di caricamento');
console.log('sfondo-lyra: ok');
