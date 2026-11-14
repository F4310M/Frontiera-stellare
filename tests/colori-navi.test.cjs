// Colori inversi sulle navi (2026-11-14): dettagli rossi sulla nave blu del pilota, blu sulle navi rosse nemiche.
// Eseguire dalla cartella principale: node tests/colori-navi.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
// contesto 2D finto che ricorda i colori usati e le immagini copiate
function finto(){const c={colori:new Set(),immagini:0,trasformazioni:[],shadowBlur:0,
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){c.colori.add(c.fillStyle)},stroke(){c.colori.add(c.strokeStyle)},
 fillRect(){c.colori.add(c.fillStyle)},strokeRect(){c.colori.add(c.strokeStyle)},translate(){},rotate(){},setTransform(){},
 transform(a,b,cc,d){c.trasformazioni.push(d)},drawImage(){c.immagini++}};return c}
const ctx=finto();
const sb={Math,ctx,state:'play',player:{x:0,y:0,angle:0,bank:0},document:{createElement:()=>({width:0,height:0,getContext:()=>finto()})},chiamate:[]};
vm.createContext(sb);
vm.runInContext(`function drawShip(ship,hostile){chiamate.push('drawShip:'+(hostile?'nemico':'pilota'))}
function flHostileBody(g,hostile,boosting){chiamate.push('scafo:'+(hostile?'nemico':'pilota'))}
function shipRoll3D(ship,hostile,b){chiamate.push('rollio')}`,sb);
vm.runInContext(fs.readFileSync(path.join(dist,'colori-navi.js'),'utf8'),sb);
const run=c=>vm.runInContext(c,sb);
const ROSSO=run('CN.rosso.fill'),BLU=run('CN.blu.fill');

// navi nemiche: dettagli blu dentro l'immagine dello scafo (nessun costo in volo)
let g=finto();run('flHostileBody')(g,true,false);
assert.ok(sb.chiamate.includes('scafo:nemico'),'scafo originale disegnato');
assert.ok(g.colori.has(BLU)&&!g.colori.has(ROSSO),'nemico: dettagli blu');
// nave del pilota a terra (stessa funzione): dettagli rossi
g=finto();run('flHostileBody')(g,false,false);
assert.ok(g.colori.has(ROSSO)&&!g.colori.has(BLU),'pilota: dettagli rossi');

// nave del pilota dritta nello spazio: scafo originale + immagine dei dettagli rossi copiata sopra
sb.chiamate.length=0;ctx.immagini=0;run('drawShip(player,false)');
assert.deepEqual(sb.chiamate,['drawShip:pilota']);assert.equal(ctx.immagini,1,'dettagli rossi sopra la nave del pilota');
assert.equal(run('cnSprite&&typeof cnSprite.c'),'object','immagine preparata una volta');
const prima=run('cnSprite');run('drawShip(player,false)');assert.equal(run('cnSprite'),prima,'immagine riusata');

// nave del pilota inclinata: niente copia dritta, la copia la fa il rollio con lo schiacciamento giusto
sb.player.bank=.6;ctx.immagini=0;ctx.trasformazioni.length=0;run('drawShip(player,false)');
assert.equal(ctx.immagini,0,'inclinata: niente copia dritta (la fa shipRoll3D)');
run('shipRoll3D(player,false,.6)');assert.equal(ctx.immagini,1,'dettagli rossi nel rollio');
assert.ok(Math.abs(ctx.trasformazioni.pop()-Math.cos(-.6*1.05))<1e-9,'stesso schiacciamento della superficie');
sb.player.bank=0;

// nemico normale: niente costo in volo (i dettagli sono già nell'immagine)
ctx.immagini=0;ctx.colori.clear();run('drawShip({x:50,y:0,angle:0},true)');
assert.equal(ctx.immagini,0);assert.equal(ctx.colori.size,0,'nemico con immagine pronta: nessun disegno in più');
// nemico con barriera o turbo (disegnato senza immagine pronta): dettagli blu disegnati direttamente
run('drawShip({x:50,y:0,angle:0,barrier:true},true)');assert.ok(ctx.colori.has(BLU),'nemico con barriera: dettagli blu');

// a terra la nave del pilota usa l'immagine di nave3d.js: niente copia in più
sb.state='platform';ctx.immagini=0;run('drawShip(player,false)');assert.equal(ctx.immagini,0);sb.state='play';

// niente bagliori calcolati a ogni fotogramma
const src=fs.readFileSync(path.join(dist,'colori-navi.js'),'utf8');
assert.ok(!/shadowBlur\s*=\s*[1-9]/.test(src)&&!/\.filter\s*=/.test(src),'niente shadowBlur o ctx.filter');

// ordine di caricamento: dopo terra.js, fluidita.js e nave3d.js, prima di nave-gadget.js
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f);
assert.ok(at('colori-navi.js')>at('terra.js')&&at('colori-navi.js')>at('fluidita.js')&&at('colori-navi.js')>at('nave3d.js'),'dopo terra, fluidita e nave3d');
assert.ok(at('colori-navi.js')<at('nave-gadget.js'),'prima di nave-gadget');
console.log('colori-navi: ok');
