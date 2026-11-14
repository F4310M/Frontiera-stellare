// Navi danneggiate (2026-11-14): scintille e fumo quando una nave è colpita, sempre di più vicino alla distruzione.
// Eseguire dalla cartella principale: node tests/danni-navi.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
{const html=src('index.html'),at=f=>html.indexOf(`src="${f}`);
 assert.ok(at('danni-navi.js')>at('fluidita.js')&&at('danni-navi.js')>at('arena.js')&&at('danni-navi.js')>at('speciale.js'),'danni-navi.js dopo gioco, fluidita.js e arena.js');
 const code=src('danni-navi.js').split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n');
 assert.ok(!/shadowBlur|ctx\.filter/.test(code),'niente effetti pesanti per fotogramma');
 console.log('PASS: file caricato al posto giusto');}

function mondo(){
 const ctx={Math,console,Map,W:1280,H:720,state:'play',paused:false,particles:[],enemies:[],
  player:{x:0,y:0,vx:100,vy:0,r:13,angle:0,health:100},
  camera:()=>({x:-640,y:-360}),update:()=>{},drawParticle:()=>{},document:{createElement:()=>({getContext:()=>null})},
  ARENA:{hp:100},arZoom:()=>1,arTick:()=>'ok'};
 vm.createContext(ctx);vm.runInContext(src('danni-navi.js')+';this.DN=DN;',ctx);return ctx;
}
const fumo=a=>a.filter(p=>p.dn!==undefined).length,scint=a=>a.filter(p=>p.dn===undefined&&!p.soft).length;
function corri(c,sec,f){for(let t=0;t<sec;t+=1/60){f&&f();c.update(1/60)}}

// ---- campagna: la mia nave
{
 const c=mondo();corri(c,1);assert.strictEqual(c.particles.length,0,'nave intatta: niente');
 c.player.health=90;c.update(1/60);assert.ok(scint(c.particles)>=7&&fumo(c.particles)>=2,'colpo: scintille e sbuffo');
 c.particles.length=0;corri(c,2);assert.strictEqual(fumo(c.particles),0,'90%: ancora niente fumo continuo');
 const conta=h=>{const k=mondo();k.player.health=h;k.update(1/60);k.particles.length=0;corri(k,3);return{f:fumo(k.particles),s:scint(k.particles),buio:Math.max(0,...k.particles.filter(p=>p.dn!==undefined).map(p=>p.dn))}};
 const a=conta(60),b=conta(30),d=conta(8);
 assert.ok(a.f>0,'60%: fuma');assert.ok(b.f>a.f&&d.f>b.f,'più danno, più fumo: '+[a.f,b.f,d.f]);
 assert.ok(d.buio>a.buio,'più danno, fumo più scuro');assert.ok(d.s>a.s,'più danno, più scintille');
 c.state='map';c.particles.length=0;c.player.health=10;corri(c,1);assert.strictEqual(c.particles.length,0,'fuori dalla battaglia: niente');
 console.log('PASS: la mia nave fuma sempre di più');
}
// ---- campagna: nemici
{
 const c=mondo(),e={x:200,y:0,vx:0,vy:0,r:18,hp:6,maxHp:6,angle:0},lontano={x:9000,y:0,r:18,hp:6,maxHp:6,angle:0};
 c.enemies.push(e,lontano);c.update(1/60);
 e.hp=5;lontano.hp=1;c.update(1/60);assert.ok(scint(c.particles)>0,'nemico colpito: scintille');
 c.particles.length=0;corri(c,2);const poco=fumo(c.particles);assert.ok(poco>0,'nemico danneggiato fuma');
 e.hp=1;c.particles.length=0;corri(c,2);assert.ok(fumo(c.particles)>poco*1.5,'quasi distrutto: molto più fumo');
 assert.ok(c.particles.every(p=>p.x<5000),'nemico fuori schermo: niente particelle');
 e.hp=0;c.particles.length=0;corri(c,1);assert.strictEqual(c.particles.length,0,'distrutto: smette (esplode)');
 console.log('PASS: le navi nemiche fumano sempre di più');
}
// ---- sfida online
{
 const c=mondo(),g={pid:'me',me:{x:0,y:0,vx:0,vy:0,r:0,h:100,al:1},others:{xx:{x:300,y:0,r:0,s:{h:100,al:1,vx:0,vy:0}}},parts:[]};
 assert.strictEqual(c.arTick(g,1/60),'ok');assert.strictEqual(g.parts.length,0);
 g.others.xx.s.h=80;c.arTick(g,1/60);assert.ok(scint(g.parts)>0,'avversario colpito: scintille');
 g.parts.length=0;g.others.xx.s.h=20;g.me.h=40;for(let i=0;i<120;i++)c.arTick(g,1/60);
 assert.ok(fumo(g.parts)>10,'in arena le navi danneggiate fumano');
 g.parts.length=0;g.others.xx.s.al=0;g.me.h=100;for(let i=0;i<60;i++)c.arTick(g,1/60);assert.strictEqual(g.parts.length,0,'nave distrutta o rinata: niente fumo');
 console.log('PASS: anche nella sfida online');
}
console.log('TUTTI I TEST DELLE NAVI DANNEGGIATE PASSANO');
