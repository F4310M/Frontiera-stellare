// Progressi verificati (2026-11-13): gli upgrade valgono nella sfida online solo fino al livello della campagna.
// Eseguire dalla cartella principale: node tests/progressi.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}

// ---- 1) file e regole
{
 const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
 assert.ok(at('progressi.js')>at('arena.js')&&at('arena.js')>at('economia.js')&&at('progressi.js')>at('accesso.js'),'progressi.js dopo economia.js, accesso.js e arena.js');
 const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
 assert.match(rules,/match \/progressi\/\{uid\}/,'regole per progressi');
 assert.match(rules,/duration\.value\(300 \* \(request\.resource\.data\.l - resource\.data\.l\), 's'\)/,'5 minuti per passo con l’ora del server');
 assert.match(src('progressi.js'),/PV_PASSO=300/,'stesso tempo nel gioco');
 console.log('PASS: file e regole');
}

// ---- 2) arena: tetto degli upgrade per livello
const I18N_ROWS=[];
const sb={I18N_ROWS,console,Math,Date,JSON,Object,Array,Set,String,Number,Promise};vm.createContext(sb);
vm.runInContext(src('arena.js')+';this.A={arCapUp,arShotCap,arBudgetOf,arUpgrades,arUgCode,arUgDecode,arNew,arOnState,arShoot,arLaunch,ARENA};',sb);
const A=sb.A;
{
 const full={laser:3,shield:3,speed:3,twin:1,salvo:2,fuel:2};
 assert.deepStrictEqual({...A.arCapUp(full,null)},{...A.arUpgrades(k=>full[k])},'senza budget niente limite');
 const c2=A.arCapUp(full,2);assert.strictEqual(c2.laser,2);assert.strictEqual(c2.shield+c2.speed+c2.twin+c2.salvo+c2.fuel,0,'budget 2: solo 2 livelli in tutto');
 const c14=A.arCapUp(full,14);assert.deepStrictEqual({...c14},{...A.arUpgrades(k=>full[k])},'budget 14: tutto');
 assert.strictEqual(A.arShotCap({laser:0},0,false),A.ARENA.dmg+1);
 assert.strictEqual(A.arShotCap({laser:3},1,true),A.ARENA.mis.dmg,'missile: sempre il suo danno');
 assert.ok(A.arShotCap({laser:3},1,false)<=A.ARENA.maxDmg);
 console.log('PASS: tetto degli upgrade');
}
{
 // B riceve colpi da un pilota che dichiara laser 3 ma ha livello 0 (budget 2 -> laser 2 al massimo)
 sb.PV={on:true,budget:l=>typeof l==='number'?Math.min(14,2+l):null,mio:()=>0,di:u=>u==='uCattivo'?0:u==='uBravo'?12:undefined};
 const b=A.arNew('bbbbbbbbbb','B','',{},0,'R');b.phase='P';
 const cheat={laser:3,shield:3,speed:3,twin:1,salvo:2,fuel:2};
 const tree={cccccccccc:{n:'Baro',x:0,y:0,j:1,u:'uCattivo',ug:A.arUgCode(cheat),sh:[]}};
 A.arOnState(b,tree,new Set(['cccccccccc']));// entra in stanza
 tree.cccccccccc.sh=[[1,0,0,0,0,999,3,0]];A.arOnState(b,tree,new Set(['cccccccccc']));
 const shot=b.bullets[b.bullets.length-1];
 assert.strictEqual(shot.dmg,A.arShotCap({laser:2},0,false),'colpo tagliato al livello verificato');
 // stesso colpo da chi ha livello 12: tutto il laser
 const tree2={dddddddddd:{n:'Bravo',x:0,y:0,j:1,u:'uBravo',ug:A.arUgCode(cheat),sh:[]}};
 A.arOnState(b,tree2,new Set(['dddddddddd']));
 tree2.dddddddddd.sh=[[1,0,0,0,0,999,3,0]];A.arOnState(b,tree2,new Set(['dddddddddd']));
 assert.strictEqual(b.bullets[b.bullets.length-1].dmg,A.arShotCap({laser:3},0,false),'livello alto: laser 3 permesso');
 // missili: il baro (salvo 0 permesso) ne lancia 3 insieme -> ne passa 1
 const n0=b.bullets.length;
 tree.cccccccccc.sh=[[2,0,0,0,0,20,4,0,'bbbbbbbbbb'],[3,0,0,0,0,20,4,0,'bbbbbbbbbb'],[4,0,0,0,0,20,4,0,'bbbbbbbbbb']];
 A.arOnState(b,tree,new Set(['cccccccccc']));
 assert.strictEqual(b.bullets.length-n0,1,'un solo missile alla volta con livello 0');
 // il mio budget: livello 0 -> la mia nave usa al massimo 2 livelli
 assert.strictEqual(A.arBudgetOf(b,b.pid),2);
 // senza progressi.js (o senza Firebase) tutto come prima
 sb.PV=undefined;
 assert.strictEqual(A.arBudgetOf(b,'cccccccccc'),null);
 tree.cccccccccc.sh=[[5,0,0,0,0,999,3,0]];A.arOnState(b,tree,new Set(['cccccccccc']));
 assert.strictEqual(b.bullets[b.bullets.length-1].dmg,A.ARENA.maxDmg,'senza PV vale solo il tetto generale');
 console.log('PASS: colpi degli altri tagliati al loro livello');
}

// ---- 3) passi vinti e invio a Firestore (con orologio e Firestore finti)
(async()=>{
 let now=Date.parse('2026-11-13T10:00:00Z');
 const docs={},writes=[];let deny=false;
 const CX={on:true,uid:()=>'u1',token:async()=>'T',
  leggi:async(col,id)=>{const d=docs[col+'/'+id];return d?{fields:{l:{integerValue:String(d.l)},t:{timestampValue:new Date(d.t).toISOString()}}}:null},
  commit:async ws=>{const w=ws[0];if(deny)throw new Error('firestore 403');const k=w.col+'/'+w.id,old=docs[k],l=+w.fields.l.integerValue;
   // stesse condizioni di firestore.rules
   if(!old){if(w.nuovo!==true||l>1)throw new Error('firestore 403')}
   else if(!(l>old.l&&l-old.l<=10&&now>=old.t+300000*(l-old.l)))throw new Error('firestore 403');
   docs[k]={l,t:now};writes.push(l);return{commitTime:new Date(now).toISOString()}}};
 const ls=storage();let god=false;
 const ctx={CX,localStorage:ls,console,Math,JSON,Object,Array,Map,String,Number,Promise,parseInt,isFinite,
  Date:class extends Date{static now(){return now}static parse(s){return Date.parse(s)}},
  setTimeout:()=>0,setInterval:()=>0,eco:{run:null},planets:[],selected:0};
 vm.createContext(ctx);
 Object.defineProperty(ctx,'godMode',{get:()=>god});
 vm.runInContext('function ecoEndPhase(phase,win){const r=eco.run;eco.run=null;return r?{phase,win}:null}\n'+src('progressi.js')+'\nthis.P=PV;this.fine=(ph,w)=>{eco.run={phase:ph};return ecoEndPhase(ph,w)}',ctx);
 const P=ctx.P;
 assert.strictEqual(P.budget(undefined),null);assert.strictEqual(P.budget(0),2);assert.strictEqual(P.budget(5),7);assert.strictEqual(P.budget(99),14);
 ctx.fine(1,false);await P.invia();assert.strictEqual(P.stato().p,0,'missione persa: nessun passo');
 god=true;ctx.fine(1,true);await P.invia();assert.strictEqual(P.stato().p,0,'god mode: nessun passo');god=false;
 ctx.fine(1,true);await P.invia();
 assert.deepStrictEqual(writes,[1],'prima vittoria: livello 1 subito');assert.strictEqual(P.mio(),1);
 ctx.fine(2,true);await P.invia();
 assert.deepStrictEqual(writes,[1],'troppo presto: il passo aspetta');assert.strictEqual(P.stato().p,1);
 ctx.fine(1,true);ctx.fine(2,true);await P.invia();
 now+=11*60000;await P.invia();
 assert.deepStrictEqual(writes,[1,3],'dopo 11 minuti passano 2 passi (5 min ciascuno)');assert.strictEqual(P.stato().p,1);
 now+=5*60000+1000;await P.invia();assert.deepStrictEqual(writes,[1,3,4]);assert.strictEqual(P.stato().p,0);assert.strictEqual(P.mio(),4);
 // rifiuto: il passo resta e si riprova
 ctx.fine(1,true);now+=6*60000;deny=true;await P.invia();assert.strictEqual(P.stato().p,1,'rifiutato: il passo non si perde');
 deny=false;now+=10*60000;await P.invia();assert.deepStrictEqual(writes,[1,3,4,5]);
 // livello di un altro pilota
 docs['progressi/u2']={l:9,t:now};
 assert.strictEqual(P.di('u2'),undefined,'subito: non si sa ancora');await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.strictEqual(P.di('u2'),9,'poi il livello letto');
 console.log('PASS: passi vinti, tempi del server, livello degli altri');
 console.log('TUTTI I TEST DEI PROGRESSI PASSANO');
})().catch(e=>{console.error(e);process.exit(1)});
