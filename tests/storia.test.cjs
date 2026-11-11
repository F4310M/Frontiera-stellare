// Test della STORIA DI CONEX. Eseguire dalla cartella principale: node tests/storia.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('dist/storia.js','utf8');
const sandbox={console,ICONS:{},I18N_ROWS:[],MUS_TRACKS:{menu:'x.mp3'},setTimeout,clearTimeout,localStorage:{getItem:()=>null,setItem(){}}};
sandbox.musTheme=()=>'menu';sandbox.volumeLevel=()=>.4;
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const run=c=>vm.runInContext(c,sandbox);
for(const n of ['book','voice','mute','skip'])assert(sandbox.ICONS[n],'icona '+n);
// testo: 8 frasi, ognuna in 7 lingue, tutte nelle traduzioni del gioco
assert.equal(run('STORIA_TESTO.length'),7);
for(const r of run('[...STORIA_TESTO,...STORIA_UI]')){
 assert.equal(r.length,7,'7 lingue per '+r[0]);assert(r.every(x=>typeof x==='string'&&x.length),'nessuna traduzione vuota: '+r[0]);
 assert(sandbox.I18N_ROWS.some(x=>x[0]===r[0]),'riga di traduzione per '+r[0]);
}
assert(/La Caduta e l’Ascesa di CONEX/.test(src)&&/Repubblica Galattica/.test(src)&&/missione di soccorso/.test(src),'la storia di Fabio');
// musica: brano della storia e scelta del tema solo mentre è aperta
assert.equal(sandbox.MUS_TRACKS.storia,'musica/last-light-from-the-cockpit.mp3');
assert(fs.existsSync('dist/musica/last-light-from-the-cockpit.mp3'),'il file musicale esiste');
assert.equal(run('musTheme()'),'menu');
run('STORIA.on=true');assert.equal(run('musTheme()'),'storia');
const alta=run("volumeLevel('music')");assert(alta>=.8,'colonna sonora della storia più alta');
run('STORIA.parla=true');assert(run("volumeLevel('music')")<alta,'musica più bassa mentre parla la voce');
assert.equal(run('STORIA.voce'),false,'voce spenta per default');
run('STORIA.on=false;STORIA.parla=false');assert.equal(run("volumeLevel('music')"),.4);
// voce: frasi spezzate in pezzi corti, tempi di lettura sensati
assert.deepEqual(run("stPezzi('Uno due. Tre: quattro.')"),['Uno due.','Tre:','quattro.']);
assert(run("stStima('x'.repeat(140),false)")>=8000,'senza voce resta il tempo di leggere');
// pagina: caricato prima di esci.js (che resta l'ultimo)
const html=fs.readFileSync('dist/index.html','utf8');
assert(/<script src="storia\.js"><\/script>[\s\S]*<script src="esci\.js"><\/script>\s*<\/body>/.test(html),'storia.js prima di esci.js');
assert(html.indexOf('profilo.js')<html.indexOf('storia.js')&&html.indexOf('i18n.js')<html.indexOf('storia.js'),'dopo profilo e lingue');
// LYRA dettagliata nello sfondo (11-11): usa la superficie di pianeti-dettaglio.js con più risoluzione
run(fs.readFileSync('dist/pianeti-dettaglio.js','utf8').replace(/^const /gm,'var '));
assert.equal(run('stLyraOk()'),true,'pianeti-dettaglio.js disponibile');
assert.equal(run('stLyraP().theme'),'mare','LYRA è il mondo oceanico');
assert(run('ST_LYRA.TW')>=2048&&run('ST_LYRA.TH')*2===run('ST_LYRA.TW'),'mappa grande e proporzionata');
{const r=run("(()=>{const g=pdTexStart({theme:'mare',code:'HX–01',name:'LYRA'});return stLyraRows(g,150,152)})()");
 assert.equal(r.col.length,2*768*4);assert(r.col.some((v,i)=>i%4===3&&v>0),'c’è del mare');assert(new Set(r.col).size>40,'superficie varia');}
{const u=run('stLyraLut(64,768,384)');assert(Math.abs(u.n-Math.PI*32*32)<120,'disco pieno');assert(u.vrow.every(v=>v%768===0))}
assert(/try\{stLyraTex\(\)\}catch/.test(src),'la mappa parte quando si apre la storia');
assert(!/\.filter=|shadowBlur/.test(src.replace(/^\/\/.*$/gm,'')),'niente filter o shadowBlur');
// NEMESI, la fortezza-pianeta dell'Impero nel cielo della storia (11-11)
assert(/function stStazSprite/.test(src)&&/function stStazDisegna/.test(src),'stazione disegnata in memoria e poi copiata');
{const f=t=>run('stStazFase('+t+')');assert.equal(f(0).c,0);assert(f(6).c>0&&f(6).c<1,'si carica piano');
 assert(f(14.5).raggi>0,'i sei raggi convergono');assert(f(16.3).fuoco>0,'poi parte il colpo');assert.equal(f(17.9).fuoco,0);}
console.log('PASS: storia di Conex');
