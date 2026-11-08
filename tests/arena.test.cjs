// Sfida online (2026-11-08): arena spaziale multigiocatore (dist/arena.js) e pulsante caffè (dist/caffe.js).
// Eseguire dalla cartella principale: node tests/arena.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');

// ---- 1) file caricati e regole
{
 const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
 assert.ok(at('arena.js')>at('vetrina.js'),'arena.js dopo vetrina.js (ultimo ad agganciare update/draw)');
 assert.ok(at('caffe.js')>0&&html.includes('href="arena.css"'),'caffe.js e arena.css caricati');
 const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'..','database.rules.json'),'utf8'));
 assert.strictEqual(rules.rules['.write'],false,'niente scritture fuori da arena');
 assert.ok(rules.rules.arena.$room.p.$pid['.validate'].includes('now'),'ogni scrittura porta l’ora del server');
 console.log('PASS: file e regole');
}

// ---- 2) logica di gioco con due piloti collegati da una rete finta
const I18N_ROWS=[];
const sb={I18N_ROWS,console,Math,Date,JSON,Object,Array,Set,String,Number,Promise};vm.createContext(sb);
vm.runInContext(src('arena.js')+';this.A={arHurt,ARENA,arRocks,arApply,arNew,arTick,arOnState,arHostPid,arScore,arSpawn,arCode,arCleanCode,arCleanName,arFull,arColor};',sb);
const A=sb.A;
{
 // stanza: stessi asteroidi per tutti
 assert.deepStrictEqual(JSON.stringify(A.arRocks('ORSA')),JSON.stringify(A.arRocks('ORSA')));
 assert.notStrictEqual(JSON.stringify(A.arRocks('ORSA')),JSON.stringify(A.arRocks('VEGA')));
 assert.ok(A.arRocks('ORSA').length>=10);
 assert.match(A.arCode(),/^[A-Z]{4}$/);assert.strictEqual(A.arCleanCode(' ab-cd9e'),'ABCD');
 assert.strictEqual(A.arCleanName('<b>Fabio</b>!!'),'bFabiob');assert.strictEqual(A.arCleanName(''),'PILOTA');
 console.log('PASS: stanza, codici e nomi');
}
{
 // eventi della Realtime Database
 const t={};
 let ch=A.arApply(t,'/',{aa:{x:1,n:'A'},bb:{x:2}},false);assert.strictEqual([...ch].sort().join(),"aa,bb");
 ch=A.arApply(t,'/aa',{x:5,h:90},true);assert.strictEqual(t.aa.x,5);assert.strictEqual(t.aa.n,'A');assert.strictEqual([...ch].join(),"aa");
 A.arApply(t,'/bb',null,false);assert.ok(!t.bb);
 A.arApply(t,'/',{'cc/x':3,'aa/h':50},true);assert.strictEqual(t.cc.x,3);assert.strictEqual(t.aa.h,50);
 A.arApply(t,'/',null,false);assert.strictEqual(Object.keys(t).length,0);
 console.log('PASS: put e patch');
}
{
 // due piloti: la rete finta consegna subito lo stato all'altro
 const a=A.arNew('aaaaaaaaaa','Fabio'),b=A.arNew('bbbbbbbbbb','Luca');b.me.j=a.me.j+1000;
 for(const g of [a,b]){g.room='ORSA';g.rocks=[];A.arSpawn(g)}
 const tree={};
 const deliver=(from,patch)=>{tree[from.pid]=Object.assign(tree[from.pid]||{},patch);for(const g of [a,b])if(g!==from)A.arOnState(g,tree,new Set([from.pid]))};
 deliver(a,A.arFull(a));deliver(b,A.arFull(b));
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 const step=(ia,ib)=>{const pa=A.arTick(a,1/60,ia||idle);if(pa)deliver(a,pa);const pb=A.arTick(b,1/60,ib||idle);if(pb)deliver(b,pb)};
 step();
 assert.strictEqual(A.arHostPid(a),'aaaaaaaaaa');assert.ok(a.isHost&&!b.isHost,'il primo entrato è l’host');
 assert.notStrictEqual(A.arColor(a,a.pid),A.arColor(a,b.pid),'colori diversi');
 a.wantStart=true;b.wantStart=true;
 for(let i=0;i<60*5;i++)step();
 assert.strictEqual(a.phase,'P');assert.strictEqual(b.phase,'P','l’altro segue l’host');
 assert.ok(Math.abs(a.rt-b.rt)<.5,'stesso tempo');
 // Fabio spara a Luca, che sta fermo davanti
 const place=()=>{Object.assign(a.me,{x:0,y:0,vx:0,vy:0,r:0});Object.assign(b.me,{x:300,y:0,vx:0,vy:0});a.inv=0;b.inv=0};
 place();
 for(let i=0;i<60*4&&b.me.dz===0;i++){place();step({...idle,fire:true})}
 assert.strictEqual(b.me.dz,1,'Luca abbattuto');assert.strictEqual(b.me.by,a.pid,'da Fabio');
 for(let i=0;i<10;i++)step();
 assert.strictEqual(a.me.k,1,'abbattimento a Fabio, contato una volta sola');
 assert.strictEqual(b.me.d,1);
 // barriera: meno danno
 for(let i=0;i<60*4;i++)step();assert.strictEqual(b.me.al,1,'Luca rinasce');
 // barriera: un terzo del danno
 b.inv=0;b.me.h=100;b.me.sd=1;A.arHurt(b,10,a.pid);assert.strictEqual(b.me.h,97);b.me.sd=0;
 // fine partita a 10 abbattimenti
 a.me.k=10;for(let i=0;i<20;i++)step();
 assert.strictEqual(a.phase,'E');assert.strictEqual(b.phase,'E');
 assert.strictEqual(A.arScore(b)[0].n,'Fabio','Fabio in testa');
 for(let i=0;i<60*(A.ARENA.endTime+1);i++)step();
 assert.strictEqual(a.phase,'L');assert.strictEqual(b.phase,'L','si torna in sala d’attesa');
 // l'host se ne va: dopo qualche secondo Luca diventa host
 for(let i=0;i<60*(A.ARENA.stale+1);i++){const pb=A.arTick(b,1/60,idle)}
 assert.ok(!b.others[a.pid]&&b.isHost,'Luca è il nuovo host');
 assert.strictEqual(JSON.stringify(b.drop),JSON.stringify([a.pid]),'il pilota sparito viene tolto dalla stanza');
 console.log('PASS: partita a due, abbattimenti, fasi, cambio host');
}
{
 // bordo dell'arena: fa male e spinge dentro
 const g=A.arNew('cccccccccc','Solo');g.rocks=[];g.phase='P';g.rt=100;Object.assign(g.me,{x:A.ARENA.R+200,y:0,vx:0,vy:0});
 for(let i=0;i<30;i++)A.arTick(g,1/30,{ax:0,ay:0,aim:0,fire:false,boost:false,shield:false});
 assert.ok(g.me.h<100&&g.me.vx<0,'il bordo brucia e respinge');
 console.log('PASS: bordo dell’arena');
}
{
 // traduzioni complete
 for(const r of I18N_ROWS)assert.ok(r.length===7&&r.every(x=>typeof x==='string'&&x),'7 lingue: '+r[0]);
 for(const s of ['SFIDA ONLINE','ARENA SPAZIALE','PARTITA VELOCE','INIZIA LA SFIDA','ABBATTUTO DA'])assert.ok(I18N_ROWS.some(r=>r[0]===s),s);
 console.log('PASS: traduzioni');
}
{
 // caffè: compare solo con un link https di un sito di donazioni
 const sb2={I18N_ROWS:[],URL,console};vm.createContext(sb2);vm.runInContext(src('caffe.js')+';this.caffeOk=caffeOk;',sb2);
 assert.ok(sb2.caffeOk('https://buymeacoffee.com/fabio'));assert.ok(sb2.caffeOk('https://ko-fi.com/fabio'));assert.ok(sb2.caffeOk('https://paypal.me/fabio'));
 assert.ok(!sb2.caffeOk(''));assert.ok(!sb2.caffeOk('javascript:alert(1)'));assert.ok(!sb2.caffeOk('http://ko-fi.com/x'));assert.ok(!sb2.caffeOk('https://evil.example/x'));
 console.log('PASS: pulsante caffè');
}
console.log('arena.test: ok');
