// NIMBUS pianeta di neve e ghiacci (2026-11-15): dist/ghiaccio.js.
// Eseguire dalla cartella principale: node tests/ghiaccio.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=fs.readFileSync(path.join(dist,'ghiaccio.js'),'utf8');
const sb={Math,console,state:'game'};
vm.createContext(sb);
vm.runInContext(`
var planets=[{name:'LYRA',theme:'mare'},{name:'NIMBUS',theme:'tempesta',color:'#7763c9',glow:'#9a83ff',desc:'vecchia'}];
var PF_THEMES={tempesta:{id:'tempesta',name:'TEMPESTA',ambient:'pioggia',pit:'nubi',flora:['cristallo']}};
var G_MAT={tempesta:{dark:[1,1,1],rim:'#fff'}};
var PL_THEMES={tempesta:{gas:true}};var PD_THEMES={tempesta:{gas:true}};
var I18N_ROWS=[];var pf={theme:null,ambient:[]};
function pfTheme(p){return PF_THEMES[p.theme]}
function pfUpdateAmbient(dt){}function pfDrawAmbient(){}function pfViewW(){return 1280}
`,sb);
vm.runInContext(src,sb);
const run=c=>vm.runInContext(c,sb);
assert.equal(run('planets[1].theme'),'ghiaccio','NIMBUS ha il tema ghiaccio');
assert.equal(run('planets[1].boss'),'tempesta','NIMBUS tiene il suo boss (sfera sentinella)');
assert.notEqual(run('planets[1].desc'),'vecchia','nuova descrizione');
assert.equal(run('planets[0].theme'),'mare','gli altri pianeti non cambiano');
// a terra: stessa logica di gioco della tempesta (id), colori e materiale del ghiaccio
assert.equal(run('PF_THEMES.ghiaccio.id'),'tempesta','regole di gioco della tempesta');
assert.equal(run('PF_THEMES.ghiaccio.mat'),'ghiaccio');assert.equal(run('PF_THEMES.ghiaccio.ambient'),'neve');
assert.equal(run('PF_THEMES.tempesta.mat'),undefined,'il tema tempesta resta com\'era');
assert.ok(run('G_MAT.ghiaccio')&&run('G_MAT.ghiaccio.rim')==='#ffffff','materiale del ghiaccio');
// spazio e home
assert.ok(run('PL_THEMES.ghiaccio.land')&&!run('PL_THEMES.ghiaccio.gas'),'pianeta di ghiaccio, non gassoso');assert.ok(run('PL_THEMES.ghiaccio.sea')<=0&&run('PD_THEMES.ghiaccio.sea')<=0,'niente mari: tutto neve e ghiaccio');
assert.ok(run('PD_THEMES.ghiaccio.land'),'globo della home');
// neve che cade
run('pf.theme=PF_THEMES.ghiaccio;pf.ambient=[];for(let i=0;i<60;i++)pfUpdateAmbient(1/30)');
assert.ok(run('pf.ambient.filter(a=>a.kind==="fiocco").length')>20,'fiocchi di neve');
// traduzioni
const righe=run('I18N_ROWS');assert.ok(righe.length>=5&&righe.every(r=>r.length===7&&r.every(s=>typeof s==='string'&&s.length)),'testi tradotti in 7 lingue');
// cristalli e mare ghiacciato nei file originali
assert.ok(/mat==='ghiaccio'\?\['#e8fbff'/.test(fs.readFileSync(path.join(dist,'fase2.js'),'utf8')),'cristalli di ghiaccio a terra');
assert.ok(/mat==='ghiaccio'\?\['#f2fcff'/.test(fs.readFileSync(path.join(dist,'grafica2.js'),'utf8')),'cristalli di ghiaccio nella roccia');
assert.ok(/id==='ghiaccio'/.test(fs.readFileSync(path.join(dist,'terra-dettagli.js'),'utf8')),'mare ghiacciato in primo piano');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
for(const f of ['game.js','fase2.js','grafica2.js','pianeta.js','pianeti-dettaglio.js','menu-pianeti.js','finale.js','i18n.js'])assert.ok(at('ghiaccio.js')>at(f),'ghiaccio.js dopo '+f);
console.log('ghiaccio: ok');
