// Finestra OFFRIMI UN CAFFÈ (3 scelte) e sezione INFO nelle impostazioni (dist/caffe.js, 2026-11-09).
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','dist','caffe.js'),'utf8');
const sb={I18N_ROWS:[],URL,console};vm.createContext(sb);
vm.runInContext(src+';this.v=GIOCO_VERSIONE;this.m=caffeMailto();this.ok=caffeMailOk;',sb);
assert.strictEqual(sb.v,'1.5.1','versione del gioco');
assert.strictEqual(sb.m,'mailto:mfsoft@protonmail.com','link mail');
assert.ok(!sb.ok('x" onclick="a@b.it'),'mail non valida rifiutata');
for(const t of['MANDA UNA MAIL','CHIUDI','INFO','VERSIONE DEL GIOCO','CONTATTI','Versione e contatti','SOSTIENI CONEX']){
 const r=sb.I18N_ROWS.find(x=>x[0]===t);assert.ok(r&&r.length===7&&r.every(Boolean),'traduzione completa: '+t);
}
assert.ok(/MANDA UNA MAIL[\s\S]*OFFRIMI UN CAFFÈ[\s\S]*CHIUDI/.test(src.slice(src.indexOf('function caffeDialog'),src.indexOf('function caffeOpen'))),'tre scelte nella finestra');
console.log('caffe-info.test: ok');
