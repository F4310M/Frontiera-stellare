// Prestazioni in battaglia (2026-11-14): stessi risultati, meno lavoro per fotogramma.
// Eseguire dalla cartella principale: node tests/prestazioni.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
const game=src('game.js'),line=n=>{const i=game.indexOf('function '+n+'(');assert.ok(i>=0,n);return game.slice(i,game.indexOf('\n',i))};

// ---- 1) urti nemici-ostacoli: la scorciatoia del riquadro non cambia nulla
{
 const fast=line('resolveEnemyObstacle'),cut=fast.match(/if\(swept\)\{if\(o\.x-combined.*?return;/);assert.ok(cut,'scorciatoia presente');
 const slow=fast.replace(cut[0],'').replace('function resolveEnemyObstacle','function resolveSlow');
 const ctx={Math,enemyImpact:e=>{e.imp=(e.imp||0)+1}};vm.createContext(ctx);
 vm.runInContext(line('segmentImpact')+'\n'+fast+'\n'+slow,ctx);
 let s=11;const R=()=>(s=(s*16807)%2147483647)/2147483647;let urti=0;
 for(let k=0;k<20000;k++){
  const x=R()*400,y=R()*400,e={x,y,prevX:x+(R()-.5)*120,prevY:y+(R()-.5)*120,vx:(R()-.5)*300,vy:(R()-.5)*300,r:18},o={x:200,y:200,vx:R()*5,vy:0},r=20+R()*60,sw=R()<.7;
  const a={...e},b={...e};ctx.resolveEnemyObstacle(a,o,r,sw);ctx.resolveSlow(b,o,r,sw);
  assert.deepStrictEqual(a,b,'stesso risultato con e senza scorciatoia');if(a.imp)urti++;
 }
 assert.ok(urti>1000,'il test contiene davvero degli urti');
 console.log('PASS: urti identici ('+urti+' urti su 20000)');
}

// ---- 2) HUD: scrive solo quando il valore cambia
{
 const ctx={WeakMap};vm.createContext(ctx);
 vm.runInContext(game.match(/const hudLast=new WeakMap\(\);function hudSet[^\n]*/)[0]+'\n'+game.match(/function hudClass[^\n]*/)[0],ctx);
 let scritture=0;const el={style:{setProperty(){scritture++}},classList:{toggle(){scritture++}}};
 Object.defineProperty(el,'textContent',{set(){scritture++}});Object.defineProperty(el.style,'width',{set(){scritture++}});
 for(let i=0;i<10;i++){ctx.hudSet(el,'text','100%');ctx.hudSet(el,'width','50%');ctx.hudSet(el,'--x','1s');ctx.hudClass(el,'c',true)}
 assert.strictEqual(scritture,4,'una scrittura per valore');
 ctx.hudSet(el,'text','99%');assert.strictEqual(scritture,5,'valore nuovo: scrive');
 console.log('PASS: HUD scrive solo i cambiamenti');
}

// ---- 3) niente lavoro inutile a ogni fotogramma
{
 assert.ok(!/shadowBlur\s*=/.test(src('missili-nemici.js')),'mirino senza shadowBlur');
 assert.ok(!/requestAnimationFrame\(nphPosiziona\);return/.test(src('nuova-partita-home.js')),'NUOVA PARTITA non misura la pagina a ogni fotogramma');
 assert.match(line('drawNearDust'),/drawImage\(dustSprite/,'polvere con uno sprite');
 assert.ok(!/matchMedia/.test(line('drawStarfield')),'stelle senza matchMedia a ogni fotogramma');
 assert.match(src('linea-olografica.js'),/classList\.contains\('on'\)\)svg\.classList\.remove/,'linea olografica non tocca la classe se non serve');
 // adatta.js: le scritte fuori dalle finestre non riadattano le finestre
 const body={},ov={closest:s=>s==='.overlay'?ov:null};
 const ctx={document:{body}};vm.createContext(ctx);vm.runInContext(src('adatta.js').match(/function fitFuori[^\n]*/)[0],ctx);
 const hud={closest:()=>null};
 assert.strictEqual(ctx.fitFuori({target:hud,addedNodes:[]}),true,'testo del HUD: ignorato');
 assert.strictEqual(ctx.fitFuori({target:ov,addedNodes:[]}),false,'dentro una finestra: si riadatta');
 assert.strictEqual(ctx.fitFuori({target:body,addedNodes:[]}),false,'nuovo elemento nel body: si riadatta');
 const card={nodeType:1,matches:()=>true,querySelector:()=>null};
 assert.strictEqual(ctx.fitFuori({target:hud,addedNodes:[card]}),false,'arriva una finestra: si riadatta');
 console.log('PASS: niente lavoro inutile per fotogramma');
}
console.log('TUTTI I TEST DELLE PRESTAZIONI PASSANO');
