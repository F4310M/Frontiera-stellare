// Camminata e corsa di soldati e coloni (camminata.js, 2026-11-08).
// Eseguire dalla cartella principale: node tests/camminata.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const fakeCtx=new Proxy({},{get(t,k){if(k in t)return t[k];return()=>{}},set(t,k,v){t[k]=v;return true}});
const sandbox={console,Math,ctx:fakeCtx,selected:0,PF_REBEL:{},gTrooper(){},pfShoulder(){return{x:0,y:0}}};
vm.createContext(sandbox);
vm.runInContext('var ctx=globalThis.ctx,selected=0;function gTrooper(){};function pfShoulder(){return{x:0,y:0}};var PF_REBEL={}',sandbox);
for(const f of ['soldati.js','coloni.js','camminata.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),sandbox);
const val=s=>vm.runInContext(s,sandbox);

// 1) soldati: il piede d'appoggio resta fermo a terra mentre il corpo avanza (niente pattinamento)
for(const [tipo,vx] of [['pilota',265],['nemico',140]]){
 val(`globalThis.T=SOLD.tipi.${tipo};globalThis.o={x:0,y:0,ground:true,vx:${vx},face:1,run:0,aim:0};soldPosa(T,o,0)`);
 let prev=null,still=0,moves=0,air=0;
 for(let i=0;i<240;i++){
  const dist=i*2; // unità di gioco percorse
  val(`o.run=${dist}*.05;o.x=${dist};globalThis.p=soldPosa(T,o,0)`);
  const g=val('T.gamba.A'),pA=val('p.fA'),S=val('T.S');
  const wx=dist+(pA[0]-val('T.O[0]'))*S,onGround=Math.abs(pA[1]-g.cav[1])<1;
  if(prev&&prev.on&&onGround){moves++;if(Math.abs(wx-prev.wx)<.6)still++}
  if(!onGround)air++;
  prev={wx,on:onGround};
 }
 assert(moves>20,tipo+': il piede tocca terra');
 assert(still/moves>.9,tipo+': il piede a terra non scivola ('+still+'/'+moves+')');
 assert(air>20,tipo+': il piede si alza nel ritorno');
}
console.log('PASS: piedi dei soldati fermi a terra durante l\'appoggio');

// 2) il pilota (più veloce) corre: meno tempo a terra del passo di carica dei nemici
assert(val('CAMM.sold.appoggio[1]<CAMM.sold.appoggio[0]'));
console.log('PASS: corsa del pilota e carica dei nemici');

// 3) coloni: catena anca-ginocchio-caviglia, nella posa di riposo le gambe restano come nell'immagine
for(let k=0;k<4;k++)for(const lato of ['dietro','avanti']){
 const L=val(`CAMM.coloni[${k}].${lato}`);
 const a=Math.atan2(L.gin[0]-L.anca[0],L.gin[1]-L.anca[1]),s=Math.atan2(L.cav[0]-L.gin[0],L.cav[1]-L.gin[1]);
 const c=val(`cammCatena(CAMM.coloni[${k}].${lato},{a:${L.gin[1]>L.anca[1]+4?a:0},b:${L.gin[1]>L.anca[1]+4?a-s:-s}})`);
 assert(Math.abs(c.ax-L.cav[0])<1&&Math.abs(c.ay-L.cav[1])<1,'caviglia a riposo '+k+' '+lato);
 assert(L.taglio<L.cav[1]&&L.cav[1]<768);
}
// durante la corsa il ginocchio si piega di più nel ritorno che nell'appoggio
const ritorno=val('cammPosaColono(0,false,"avanti").b'),appoggio=val('cammPosaColono(Math.PI,false,"avanti").b');
assert(ritorno>appoggio+.8,'ginocchio piegato nel ritorno');
console.log('PASS: gambe dei coloni');

// 4) jetpack: il pilota con il jetpack acceso ha le gambe come i soldati nemici col jetpack
val(`globalThis.T=SOLD.tipi.pilota;globalThis.jp=soldPosa(T,{ground:false,jetOn:true,vy:-120,face:1,aim:0},1);globalThis.en=soldPosa(T,{ground:false,jet:true,vy:-120,face:-1,aim:Math.PI},1)`);
assert.deepStrictEqual(val('[jp.fD,jp.fA]'),val('[en.fD,en.fA]'),'stesse gambe del nemico col jetpack');
val(`globalThis.jp=soldPosa(T,{ground:false,jetOn:true,vy:80,face:1,aim:0},1);globalThis.en=soldPosa(T,{ground:false,jet:true,vy:80,face:-1,aim:Math.PI},1)`);
assert.deepStrictEqual(val('[jp.fD,jp.fA]'),val('[en.fD,en.fA]'),'anche scendendo');
console.log('PASS: gambe del pilota col jetpack');
