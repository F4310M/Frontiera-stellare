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
assert(/<script src="storia\.js"><\/script>\s*<script src="esci\.js"><\/script>\s*<\/body>/.test(html),'storia.js prima di esci.js');
assert(html.indexOf('profilo.js')<html.indexOf('storia.js')&&html.indexOf('i18n.js')<html.indexOf('storia.js'),'dopo profilo e lingue');
assert(!/\.filter=|shadowBlur/.test(src.replace(/^\/\/.*$/gm,'')),'niente filter o shadowBlur');
console.log('PASS: storia di Conex');
