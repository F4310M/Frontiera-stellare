// Test UPGRADE DISPONIBILI. Eseguire dalla cartella principale: node tests/upgrade-disponibili.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const sandbox={console,Math,localStorage:{getItem(){return null},setItem(){}},$:()=>null,ico:()=>'<svg></svg>'};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/economia.js','utf8').split('// Pulsanti: mercato')[0].replace(/^const eco=/m,'var eco='),sandbox);
vm.runInContext(fs.readFileSync('dist/upgrade-disponibili.js','utf8'),sandbox);
const val=s=>vm.runInContext(s,sandbox);
assert.equal(val('eco.balance=0;eco.upgrades={};udAffordable().length'),0,'Senza crediti niente upgrade');
assert.deepEqual(val('eco.balance=1400;udAffordable().map(i=>i.id)'),['grenades'],'1.400 CR: solo la cintura granate');
assert.equal(val('eco.upgrades={grenades:3};udAffordable().length'),0,'Livello massimo non conta');
assert.equal(val('eco.balance=100000;eco.upgrades={};udAffordable().length'),7,'Tutti acquistabili');
const src=fs.readFileSync('dist/upgrade-disponibili.js','utf8');
for(const t of ['UPGRADE DISPONIBILI','HAI CREDITI PER POTENZIARE LA NAVE'])assert(src.includes('["'+t+'"'),'Traduzione per '+t);
assert(/upgrade-disponibili\.js/.test(fs.readFileSync('dist/index.html','utf8')),'Script caricato in index.html');
console.log('PASS: upgrade disponibili');
