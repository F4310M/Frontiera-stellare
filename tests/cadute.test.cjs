// Danno da caduta e rientro con barriera/jetpack pieni (cadute.js)
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const d=f=>path.join(__dirname,'..','dist',f);
const sb={Math,state:'platform',godMode:false};vm.createContext(sb);
vm.runInContext(`var pf={under:false,cam:{shake:0},flash:0,pilot:{x:0,y:600,ground:true,visible:true,hp:100,shield:20,jetHeat:80,jetLock:true}};var morti=0;
function pfLoseLife(){morti++}function pfText(){}function pfBurst(){}
var traiettoria=[];function pfUpdatePilot(dt){const P=pf.pilot,s=traiettoria.shift();if(s){P.y=s[0];P.ground=s[1]}}`,sb);
vm.runInContext(fs.readFileSync(d('cadute.js'),'utf8'),sb);
const run=c=>vm.runInContext(c,sb);
const cade=h=>{run(`pf.pilot.hp=100;pf.pilot.y=600;pf.pilot.ground=true;traiettoria=[[600-${h},false],[600-${h}/2,false],[600,true]]`);for(let i=0;i<3;i++)run('pfUpdatePilot(1/60)');return 100-run('pf.pilot.hp')};
assert.equal(cade(200),0,'salto doppio: nessun danno');
const a=cade(450),b=cade(700);assert.ok(a>0&&b>a&&b<=45,'più alto = più danno, con un massimo');
run('pf.pilot.rientroT=2');assert.equal(cade(700),0,'nessun danno durante l\'immunità del rientro');
assert.equal(run('pf.pilot.shield'),100,'barriera piena al rientro');assert.equal(run('pf.pilot.jetHeat'),0,'jetpack pieno al rientro');assert.equal(run('pf.pilot.jetLock'),false);
const html=fs.readFileSync(d('index.html'),'utf8'),at=s=>html.indexOf('src="'+s);
assert.ok(at('cadute.js')>at('tempesta.js')&&at('tempesta.js')>at('rientro.js'),'ordine di caricamento');
console.log('cadute: ok');
