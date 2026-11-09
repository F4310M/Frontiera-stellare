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
vm.runInContext(src('arena.js')+';this.A={arHurt,arUpgrades,arDamage,arShoot,arMeteorSpawn,arMeteorTick,ARENA,arRocks,arApply,arNew,arTick,arOnState,arHostPid,arScore,arSpawn,arCode,arCleanCode,arCleanName,arFull,arColor,arFactionInfo,arSetTeam,arTeamFix,arTeamScore,arWinTeam,arAlly,arLaunch,arUgCode,arUgDecode,arPickTeam,arHostile,arTeamOf,arRockMask,arRockBroken,arRockHit};',sb);
const A=sb.A;
{
 // stanza: stessi asteroidi per tutti
 assert.deepStrictEqual(JSON.stringify(A.arRocks('ORSA')),JSON.stringify(A.arRocks('ORSA')));
 assert.notStrictEqual(JSON.stringify(A.arRocks('ORSA')),JSON.stringify(A.arRocks('VEGA')));
 assert.ok(A.arRocks('ORSA').length>=10);
 assert.ok(A.ARENA.R>=3400&&A.ARENA.rocks>=24,'arena più grande e più ricca');
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
 const a=A.arNew('aaaaaaaaaa','Fabio','',null,'R'),b=A.arNew('bbbbbbbbbb','Luca','',null,'I');b.me.j=a.me.j+1000;
 for(const g of [a,b]){g.room='ORSA';g.rocks=[];A.arSpawn(g)}
 const tree={};
 const deliver=(from,patch)=>{tree[from.pid]=Object.assign(tree[from.pid]||{},patch);for(const g of [a,b])if(g!==from)A.arOnState(g,tree,new Set([from.pid]))};
 deliver(a,A.arFull(a));deliver(b,A.arFull(b));
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 const step=(ia,ib)=>{const pa=A.arTick(a,1/60,ia||idle);if(pa)deliver(a,pa);const pb=A.arTick(b,1/60,ib||idle);if(pb)deliver(b,pb)};
 step();
 assert.strictEqual(A.arHostPid(a),'aaaaaaaaaa');assert.ok(a.isHost&&!b.isHost,'il primo entrato è l’host');
 assert.notStrictEqual(A.arColor(a,a.pid),A.arColor(a,b.pid),'colori diversi');
 assert.strictEqual(A.arColor(a,a.pid),'#51e6ff','ribelli blu');assert.strictEqual(A.arColor(a,b.pid),'#ff5268','impero rosso');
 assert.strictEqual(A.arFull(a).fa,2,'la fazione viene sincronizzata (come numero: le regole del database accettano solo numeri)');assert.strictEqual(A.arFull(b).fa,1);assert.strictEqual(A.arScore(a)[1].fa,'I');
 a.wantStart=true;b.wantStart=true;
 for(let i=0;i<60*5;i++)step();
 assert.strictEqual(a.phase,'P');assert.strictEqual(b.phase,'P','l’altro segue l’host');
 assert.ok(Math.abs(a.rt-b.rt)<.5,'stesso tempo');
 // Fabio spara a Luca, che sta fermo davanti
 const place=()=>{Object.assign(a.me,{x:0,y:0,vx:0,vy:0,r:0});Object.assign(b.me,{x:300,y:0,vx:0,vy:0});a.inv=0;b.inv=0};
 place();
 for(let i=0;i<60*7&&b.me.dz===0;i++){place();step({...idle,fire:i%18===0})}
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
 // potenziamenti del mercato: danno, doppio laser, motori, barriera
 assert.strictEqual(A.arDamage(A.arUpgrades(()=>0)),10);
 assert.strictEqual(A.arDamage(A.arUpgrades(k=>k==='laser'?3:0)),25);
 assert.ok(A.arDamage(A.arUpgrades(k=>({laser:3,twin:1})[k]||0))<=A.ARENA.maxDmg);
 assert.strictEqual(A.arUpgrades(k=>k==='laser'?99:0).laser,3,'livello massimo 3');
 const a=A.arNew('dddddddddd','Forte','',A.arUpgrades(k=>({laser:2,twin:1,speed:3})[k]||0)),b=A.arNew('eeeeeeeeee','Base');
 a.phase=b.phase='P';a.rt=b.rt=100;a.rocks=b.rocks=[];
 A.arShoot(a);assert.strictEqual(a.shots.length,2,'doppio laser: due colpi');
 assert.strictEqual(a.shots[0].sh[5],13,'danno dichiarato nel colpo');
 const tree={dddddddddd:Object.assign(A.arFull(a),{sh:a.shots.map(s=>s.sh)})};
 Object.assign(b.me,{x:a.shots[0].sh[1],y:a.shots[0].sh[2]});b.inv=0;
 A.arOnState(b,tree,new Set(['dddddddddd']));
 // il colpo nuovo appena visto viene ignorato (era già in volo prima): ne spara altri due
 A.arShoot(a);tree.dddddddddd.sh=a.shots.map(s=>s.sh);A.arOnState(b,tree,new Set(['dddddddddd']));
 assert.ok(b.bullets.length>=2&&b.bullets.every(x=>x.dmg===13));
 // chi dichiara troppo danno viene limitato
 tree.dddddddddd.sh=[[99,0,0,0,0,999]];A.arOnState(b,tree,new Set(['dddddddddd']));
 assert.strictEqual(b.bullets[b.bullets.length-1].dmg,A.ARENA.maxDmg);
 // motori: più veloce
 const run=g=>{Object.assign(g.me,{x:0,y:0,vx:0,vy:0,r:0});for(let i=0;i<120;i++)A.arTick(g,1/60,{ax:0,ay:1,aim:0,fire:false,boost:false,shield:false});return Math.hypot(g.me.vx,g.me.vy)};
 assert.ok(run(a)>run(b)*1.2,'i motori potenziati vanno più veloci');
 console.log('PASS: potenziamenti del mercato');
}
{
 // comandi come nel single-player: clic singolo, pressione prolungata e rilascio potenziato
 const g=A.arNew('ffffffffaa','Carica');g.room='NOVA';g.rocks=[];g.phase='P';g.rt=100;g.inv=0;
 const input=fire=>({ax:0,ay:0,aim:0,fire,boost:false,shield:false,brake:false});
 A.arTick(g,1/60,input(true));const first=g.shotSeq;
 for(let i=0;i<40;i++)A.arTick(g,1/60,input(true));
 assert.strictEqual(g.shotSeq,first,'tenere premuto non produce una raffica automatica');
 A.arTick(g,1/60,input(false));
 assert.strictEqual(g.shotSeq,first+1,'al rilascio parte un solo colpo caricato');
 const mega=g.bullets[g.bullets.length-1];assert.ok(mega.power>0&&mega.r>3&&mega.dmg>A.arDamage(g.up),'colpo più grande e potente');
 // F frena sensibilmente la nave
 Object.assign(g.me,{vx:200,vy:0});for(let i=0;i<30;i++)A.arTick(g,1/60,{...input(false),brake:true});assert.ok(Math.abs(g.me.vx)<25);
 console.log('PASS: comandi single-player e colpo caricato');
}
{
 // cometa (meteorite radente): distrugge nave, proiettili e meteoriti sul percorso
 const g=A.arNew('ffffffffbb','Meteor');g.room='VEGA';g.phase='P';g.rt=100;g.inv=0;g.rocks=[{x:0,y:0,r:120,pts:[1],rot:0,shade:0}];
 Object.assign(g.me,{x:0,y:0,h:100,al:1,sd:1});g.meteor={x:0,y:0,vx:0,vy:0,w:0,life:2};g.meteorT=99;g.bullets=[{x:0,y:0,vx:0,vy:0,life:1,r:3}];
 const before=JSON.stringify(g.rocks);A.arTick(g,1/60,{ax:0,ay:0,aim:0,fire:false,boost:false,shield:false});
 assert.strictEqual(g.me.al,0,'il meteorite distrugge anche una nave protetta');assert.strictEqual(g.bullets.length,0,'distrugge i colpi sul percorso');assert.strictEqual(g.rocks[0].br,1,'(2026-11-09) la cometa spazza via anche i meteoriti');
 const h=A.arNew('ffffffffcc','Host');h.room='VEGA';h.phase='P';h.rt=100;h.meteorT=0;A.arTick(h,1/60,{ax:0,ay:0,aim:0,fire:false,boost:false,shield:false});assert.ok(h.meteor&&h.meteor.w>0,'preavviso prima del passaggio');
 console.log('PASS: meteorite radente sincronizzato');
}
{
 // meteoriti distruttibili: l'host decide, gli altri seguono; i frammenti fanno danno
 const rocks=A.arRocks('NOVA');assert.ok(rocks.length>=40,'campo di meteoriti più fitto');assert.ok(rocks.every(o=>o.hp>=100),'più resistenti');
 assert.ok(A.ARENA.R>=5000,'arena più grande');
 const mk=[];for(let i=0;i<57;i++)if(i%3===0)mk.push(i);
 const fake={rocks:Array.from({length:57},(_,i)=>({br:mk.includes(i)?1:0}))},mask=A.arRockMask(fake);
 assert.ok(mask.every(n=>n<1e6),'numeri accettati dal database');for(let i=0;i<57;i++)assert.strictEqual(A.arRockBroken(mask,i),mk.includes(i));
 const h=A.arNew('rrrrrrrrr1','Host'),c=A.arNew('rrrrrrrrr2','Altro');c.me.j=h.me.j+1000;
 for(const g of [h,c]){g.room='NOVA';g.rocks=A.arRocks('NOVA');g.phase='L';g.meteorT=1e9}
 const tree={},deliver=(f,p)=>{tree[f.pid]=Object.assign(tree[f.pid]||{},p);for(const g of [h,c])if(g!==f)A.arOnState(g,tree,new Set([f.pid]))};
 deliver(h,A.arFull(h));deliver(c,A.arFull(c));
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 const step=()=>{for(const g of [h,c]){const p=A.arTick(g,1/60,idle);if(p)deliver(g,p)}};
 step();assert.ok(h.isHost&&!c.isHost);
 const o=h.rocks[0];
 // un colpo solo non basta
 A.arRockHit(h,0,10);assert.strictEqual(o.br,0);
 A.arRockHit(c,0,9999);assert.strictEqual(c.rocks[0].br,0,'chi non è host non rompe da solo');
 // il pilota (non host) è vicino al meteorite: i frammenti lo colpiscono
 Object.assign(c.me,{x:o.x+o.r+40,y:o.y,vx:0,vy:0,h:100});c.inv=0;
 A.arRockHit(h,0,o.hp);assert.strictEqual(o.br,1,'rotto dall’host');
 const f0=h.frags[0],fa=Math.atan2(f0.vy,f0.vx);Object.assign(c.me,{x:o.x+Math.cos(fa)*(o.r+60),y:o.y+Math.sin(fa)*(o.r+60)});const px=c.me.x,py=c.me.y;
 let hit=false;for(let i=0;i<30;i++){step();Object.assign(c.me,{x:px,y:py,vx:0,vy:0});if(c.me.h<100)hit=true}
 assert.strictEqual(c.rocks[0].br,1,'l’altro pilota lo vede rotto');assert.ok(hit,'i frammenti fanno danno');
 
 // dopo un po' ricompare (se nessuno ci sta sopra)
 Object.assign(c.me,{x:o.x+2000,y:o.y});Object.assign(h.me,{x:o.x-2000,y:o.y});
 h.rocks[0].bt=h.time-A.ARENA.rockBack-1;for(let i=0;i<60;i++)step();
 assert.strictEqual(h.rocks[0].br,0);assert.strictEqual(c.rocks[0].br,0,'ricompare per tutti');
 console.log('PASS: meteoriti distruttibili e frammenti');
}
{
 // bordo dell'arena: fa male e spinge dentro
 const g=A.arNew('cccccccccc','Solo');g.rocks=[];g.phase='P';g.rt=100;Object.assign(g.me,{x:A.ARENA.R+200,y:0,vx:0,vy:0});
 for(let i=0;i<30;i++)A.arTick(g,1/30,{ax:0,ay:0,aim:0,fire:false,boost:false,shield:false});
 assert.ok(g.me.h<100&&g.me.vx<0,'il bordo brucia e respinge');
 console.log('PASS: bordo dell’arena');
}
{
 // TEAM BATTLE: imperiali contro ribelli, scelta della squadra, posti rimasti, niente fuoco amico
 const names=['Fabio','Luca','Sara','Marco','Anna','Gino','Pia'];
 const gs=names.map((n,i)=>{const g=A.arNew('p'+i+'xxxxxxxx'.slice(0,9-String(i).length),n,'',{},1);g.me.j=Date.now()-60000+i*1000;g.room='DUNA';g.rocks=[];g.meteorT=1e9;return g});// niente meteora durante il test
 const tree={};
 const deliver=(from,patch)=>{tree[from.pid]=Object.assign(tree[from.pid]||{},patch);for(const g of gs)if(g!==from&&g.inRoom)A.arOnState(g,tree,new Set([from.pid]))};
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 const enter=g=>{g.inRoom=true;A.arSpawn(g);for(const pid in tree)A.arOnState(g,tree,new Set([pid]));deliver(g,A.arFull(g))};
 const step=(n=1)=>{for(let k=0;k<n;k++)for(const g of gs)if(g.inRoom){const p=A.arTick(g,1/60,idle);if(p)deliver(g,p)}};
 // entrano i primi due: Fabio sceglie gli imperiali, Luca i ribelli
 enter(gs[0]);enter(gs[1]);step(10);
 assert.strictEqual(gs[0].me.tm,0,'prima di scegliere si aspetta di conoscere la stanza');
 assert.ok(A.arSetTeam(gs[0],1),'Fabio negli imperiali');assert.ok(A.arSetTeam(gs[1],2),'Luca nei ribelli');
 step(3);
 // entrano Sara, Marco, Anna, Gino: tutti vogliono gli imperiali, ma i posti sono 3
 for(const g of gs.slice(2,6)){g.wantTeam=1;enter(g);step(5)}
 step(60*2);
 const count=tm=>gs.filter(g=>g.inRoom&&g.me.tm===tm).length;
 assert.strictEqual(count(1),3,'imperiali al completo');assert.strictEqual(count(2),3,'ribelli al completo');
 assert.strictEqual(gs[2].me.tm,1,'Sara arriva presto e prende un posto negli imperiali');
 assert.strictEqual(gs[3].me.tm,1,'anche Marco');
 assert.strictEqual(gs[4].me.tm,2,'Anna arriva tardi: posto rimasto nei ribelli');
 assert.strictEqual(gs[5].me.tm,2,'Gino idem');
 assert.ok(!A.arSetTeam(gs[4],1),'squadra completa: non si cambia');
 // due scelte contemporanee dell'ultimo posto: chi ha scelto dopo torna nell'altra squadra
 gs[3].me.tm=2;gs[3].me.tj=999;deliver(gs[3],{tm:2,tj:999});// Marco passa ai ribelli → 2 imperiali, 4 ribelli
 step(60);
 assert.strictEqual(count(2),3,'ribelli tornano a 3');assert.strictEqual(count(1),3,'imperiali tornano a 3');
 assert.strictEqual(gs[3].me.tm,1,'Marco, l’ultimo a scegliere, torna negli imperiali');
 // vista di tutti uguale
 for(const g of gs.slice(0,6))assert.deepStrictEqual(JSON.stringify(A.arTeamScore(g)),JSON.stringify({1:0,2:0}));
 assert.ok(A.arAlly(gs[0],gs[0].pid,gs[2].pid)&&!A.arAlly(gs[0],gs[0].pid,gs[1].pid),'alleati e nemici');
 assert.strictEqual(A.arHostile(gs[1],gs[0].pid),true,'gli imperiali hanno la nave nemica');
 assert.strictEqual(A.arHostile(gs[0],gs[1].pid),false,'i ribelli la nave del gioco');
 assert.strictEqual(A.arHostile(gs[0],gs[0].pid),true,'anche la mia, se sono imperiale');
 assert.strictEqual(A.arColor(gs[1],gs[0].pid),A.ARENA.teams[1].c,'colore di squadra');
 // la partita parte: ognuno dal suo lato
 gs[0].wantStart=true;step(60*(A.ARENA.countdown+1));
 for(const g of gs.slice(0,6))assert.strictEqual(g.phase,'P');
 assert.ok(gs.slice(0,6).every(g=>g.me.tm===1?g.me.x<0:g.me.x>0),'imperiali a sinistra, ribelli a destra');
 // in partita non si cambia squadra
 assert.ok(!A.arSetTeam(gs[0],2));
 // il settimo pilota non entra (stanza piena) - lo fa arRoomCount; qui: un ritardatario in partita prende il posto rimasto
 gs[5].inRoom=false;deliver(gs[5],null);delete tree[gs[5].pid];for(const g of gs)if(g.inRoom)A.arOnState(g,tree,new Set([gs[5].pid]));
 const late=gs[6];late.wantTeam=1;enter(late);step(60*2);
 assert.strictEqual(late.me.tm,2,'chi arriva per ultimo accetta il posto rimasto');
 assert.strictEqual(late.phase,'P','entra nella partita in corso');
 // niente fuoco amico: Sara spara a Fabio (stessa squadra) → nessun danno; spara a Luca → danno
 const sara=gs[2],fabio=gs[0],luca=gs[1];
 const place=(t)=>{for(const g of gs)if(g.inRoom){g.inv=0}Object.assign(sara.me,{x:0,y:0,vx:0,vy:0,r:0});Object.assign(t.me,{x:300,y:0,vx:0,vy:0});for(const g of gs)if(g.inRoom&&g!==sara&&g!==t)Object.assign(g.me,{x:-1500,y:1500*(g.me.tm===1?1:-1)})};
 for(let i=0;i<60;i++){place(fabio);for(const g of gs)if(g.inRoom){const p=A.arTick(g,1/60,g===sara?{...idle,fire:i%2===0}:idle);if(p)deliver(g,p)}}
 assert.strictEqual(fabio.me.h,100,'nessun danno all’alleato');
 for(let i=0;i<60*4&&luca.me.dz===0;i++){place(luca);for(const g of gs)if(g.inRoom){const p=A.arTick(g,1/60,g===sara?{...idle,fire:i%2===0}:idle);if(p)deliver(g,p)}}
 assert.strictEqual(luca.me.by,sara.pid,'Luca abbattuto da Sara');
 step(10);
 assert.strictEqual(A.arTeamScore(fabio)[1],1,'punto agli imperiali');
 // vince la prima squadra a 15
 sara.me.k=A.ARENA.teamWin;step(30);
 for(const g of gs)if(g.inRoom){assert.strictEqual(g.phase,'E');assert.strictEqual(A.arWinTeam(g),1,'vincono gli imperiali')}
 assert.strictEqual(A.arScore(luca)[0].tm,1,'in classifica prima la squadra vincente');
 // deathmatch: chi entra in una stanza deathmatch con la team battle scelta si adegua all'host
 const h=A.arNew('hhhhhhhhhh','Host','',{},0),v=A.arNew('vvvvvvvvvv','Ospite','',{},1,'I');v.me.j=h.me.j+1000;h.rocks=v.rocks=[];
 const t2={};const d2=(f,p)=>{t2[f.pid]=Object.assign(t2[f.pid]||{},p);for(const g of [h,v])if(g!==f)A.arOnState(g,t2,new Set([f.pid]))};
 d2(h,A.arFull(h));d2(v,A.arFull(v));for(let i=0;i<120;i++){for(const g of [h,v]){const p=A.arTick(g,1/60,idle);if(p)d2(g,p)}}
 assert.strictEqual(v.mode,0,'modalità dell’host');assert.strictEqual(v.me.tm,0,'nessuna squadra in deathmatch');
 assert.strictEqual(A.arHostile(h,v.pid),true,'in deathmatch la nave segue la fazione scelta');assert.strictEqual(A.arHostile(h,h.pid),false);
 console.log('PASS: team battle');
}
{
 // gadget del mercato in rete e missili del lanciatore multiplo
 const up={laser:2,shield:1,speed:3,twin:1,salvo:2,fuel:1};
 assert.deepStrictEqual(JSON.parse(JSON.stringify(A.arUgDecode(A.arUgCode(up)))),up,'livelli codificati e decodificati');
 assert.ok(A.arUgCode(up)<1000000,'rientra nelle regole del database');
 const a=A.arNew('mmmmmmmmmm','Missili','',up),b=A.arNew('nnnnnnnnnn','Bersaglio','',{}),c=A.arNew('oooooooooo','Altro','',{});
 b.me.j=a.me.j+1;c.me.j=a.me.j+2;
 const all=[a,b,c],tree={};for(const g of all){g.rocks=[];g.phase='P';g.rt=100;g.meteorT=1e9}
 const deliver=(f,p)=>{tree[f.pid]=Object.assign(tree[f.pid]||{},p);for(const g of all)if(g!==f)A.arOnState(g,tree,new Set([f.pid]))};
 for(const g of all)deliver(g,A.arFull(g));
 Object.assign(a.me,{x:0,y:0,r:0});Object.assign(b.me,{x:500,y:200});Object.assign(c.me,{x:500,y:-300});
 for(const g of all){g.inv=0;deliver(g,{x:g.me.x,y:g.me.y,iv:0})}
 const idle={ax:0,ay:0,aim:0,fire:false,boost:false,shield:false};
 const pa=A.arTick(a,1/60,{...idle,missile:true});
 assert.strictEqual(a.shots.length,3,'livello 2: tre missili');
 assert.ok(a.shots.every(s=>typeof s.sh[8]==='string'),'ogni missile ha il suo bersaglio');
 assert.deepStrictEqual(new Set(a.shots.map(s=>s.sh[8])).size,2,'due bersagli diversi');
 assert.ok(!A.arLaunch(a),'poi si ricarica');
 deliver(a,pa||{sh:a.shots.map(s=>s.sh)});
 const hp0=b.me.h+c.me.h;
 for(let i=0;i<60*3;i++){for(const g of all){if(g!==a){Object.assign(g.me,{vx:0,vy:0});}const p=A.arTick(g,1/60,idle);if(p)deliver(g,p)}}
 assert.ok(b.me.h+c.me.h<hp0,'i missili guidati colpiscono');
 // iniettori: il post-bruciatore dura di più
 const run=u=>{const g=A.arNew('qqqqqqqqqq','x','',u);g.rocks=[];g.phase='P';g.rt=100;for(let i=0;i<60;i++)A.arTick(g,1/60,{...idle,ay:1,boost:true});return g.boost};
 assert.ok(run({fuel:2})>run({})+5,'iniettori: meno consumo');
 console.log('PASS: gadget in rete, missili, iniettori');
}
{
 // traduzioni complete
 for(const r of I18N_ROWS)assert.ok(r.length===7&&r.every(x=>typeof x==='string'&&x),'7 lingue: '+r[0]);
 for(const s of ['SFIDA ONLINE','ARENA SPAZIALE','PARTITA VELOCE','INIZIA LA SFIDA','ABBATTUTO DA','SCEGLI LA FAZIONE','RIBELLI','IMPERO GALATTICO'])assert.ok(I18N_ROWS.some(r=>r[0]===s),s);
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
