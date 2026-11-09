// Test tasto ESCI della home. Eseguire dalla cartella principale: node tests/esci.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('dist/esci.js','utf8');
const sandbox={console,ICONS:{},I18N_ROWS:[["ESCI","LEAVE","QUITTER","SALIR","ВЫХОД","离开","退出"]],setTimeout,window:{}};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
assert(sandbox.ICONS.power,'Icona power aggiunta');
const rows=sandbox.I18N_ROWS;
for(const t of ['ESCI DAL GIOCO','ESCI DAL GIOCO?','Esci dal gioco','SÌ, ESCI','GIOCO CHIUSO','TORNA AL GIOCO','I progressi sono salvati: alla prossima partita riparti da dove eri.']){
 const r=rows.find(x=>x[0]===t);assert(r,'Riga di traduzione per '+t);assert.equal(r.length,7,'7 lingue per '+t);
}
assert(src.includes('window.close()'),'Prova a chiudere la scheda');
assert(/exitDone/.test(src),'Schermata di riserva se il browser blocca la chiusura');
const html=fs.readFileSync('dist/index.html','utf8');
assert(/<script src="esci\.js"><\/script>\s*<\/body>/.test(html),'esci.js caricato per ultimo');
console.log('PASS: tasto esci');
