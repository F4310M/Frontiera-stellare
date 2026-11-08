// Vetrina della home (2026-11-08): video di gioco che si alterna con la classifica mondiale.
// Eseguire dalla cartella principale: node tests/vetrina.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const src=f=>fs.readFileSync(path.join(dist,f),'utf8');

// ---- 1) file caricati nell'ordine giusto e video presenti
{
 const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
 assert.ok(at('vetrina.js')>0,'vetrina.js è caricato');
 for(const f of ['classifica.js','i18n.js','profilo.js'])assert.ok(at(f)<at('vetrina.js'),f+' prima di vetrina.js');
 for(const f of ['azione.webm','azione.mp4','azione.jpg']){
  const st=fs.statSync(path.join(dist,'vetrina',f));
  assert.ok(st.size>5000,f+' non è vuoto');
  assert.ok(st.size<3.5e6,f+' resta leggero (meno di 3,5 MB)');
 }
 console.log('PASS: file e video');
}

// ---- 2) scene e traduzioni, senza DOM
{
 const I18N_ROWS=[["CLASSIFICA","LEADERBOARD","CLASSEMENT","CLASIFICACIÓN","РЕЙТИНГ","排行榜","ランキング"]];
 const sb={I18N_ROWS,console};vm.createContext(sb);
 vm.runInContext(src('vetrina.js')+';this.VET=VET;this.vetScene=vetScene;',sb);
 const {VET,vetScene}=sb;
 assert.strictEqual(VET.scenes.length,4,'quattro scene');
 for(let i=1;i<VET.scenes.length;i++)assert.ok(VET.scenes[i].t>VET.scenes[i-1].t,'scene in ordine');
 assert.ok(VET.scenes[3].t<31,'l’ultima scena inizia prima della fine del video (31,7 s)');
 assert.strictEqual(vetScene(0),0);assert.strictEqual(vetScene(10),1);assert.strictEqual(vetScene(14),2);assert.strictEqual(vetScene(30),3);
 for(const s of VET.scenes.map(s=>s.label).concat(['AZIONE DI GIOCO','CLASSIFICA'])){
  const r=I18N_ROWS.find(r=>r[0]===s);assert.ok(r&&r.length===7,'traduzione per '+s);
 }
 assert.strictEqual(I18N_ROWS.filter(r=>r[0]==='CLASSIFICA').length,1,'nessuna riga doppia');
 assert.ok(VET.src.some(([f])=>f.endsWith('.webm'))&&VET.src.some(([f])=>f.endsWith('.mp4')),'webm e mp4');
 console.log('PASS: scene e traduzioni');
}
