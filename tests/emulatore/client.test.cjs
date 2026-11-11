// Il codice vero del gioco (accesso.js, record.js, classifica-arena.js) contro l'emulatore Firestore con le regole nuove.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=process.env.DIST||path.join(__dirname,'..','..','dist');
const EMU='http://127.0.0.1:8085';
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const noop=()=>{};let nuid=0;
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(uid){const now=Math.floor(Date.now()/1000);return b64({alg:'none',typ:'JWT'})+'.'+b64({iss:'https://securetoken.google.com/demo-conex',aud:'demo-conex',auth_time:now,user_id:uid,sub:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:'anonymous',identities:{}}})+'.'}
const log=[];
async function rete(url,o){
 o=o||{};
 if(url.includes('identitytoolkit')){const uid='u'+(++nuid)+'x'.repeat(20);return{ok:true,status:200,json:async()=>({idToken:jwt(uid),refreshToken:'r-'+uid,localId:uid,expiresIn:'3600'})}}
 if(url.includes('securetoken')){const uid=decodeURIComponent(o.body.split('refresh_token=')[1]).slice(2);return{ok:true,status:200,json:async()=>({id_token:jwt(uid),refresh_token:'r-'+uid,user_id:uid,expires_in:'3600'})}}
 const u=url.replace('https://firestore.googleapis.com',EMU).replace('/projects/p/','/projects/demo-conex/');
 const h=Object.assign({},o.headers||{});
 const body=o.body&&typeof o.body==='string'?o.body.replace(/projects\/p\/databases/g,'projects/demo-conex/databases'):o.body;
 const r=await fetch(u,{method:o.method||'GET',headers:h,body});
 const txt=await r.text();log.push((o.method||'GET')+' '+u.split('/documents')[1]+' '+r.status+(r.ok?'':' '+txt.slice(0,160)));
 return{ok:r.ok,status:r.status,json:async()=>JSON.parse(txt)};
}
function game(ls){
 const el={scoreEntry:{classList:{toggle(){},add(){},remove(){}}},scoreName:{value:''},scoreMsg:{textContent:''},scoreSaveBtn:{disabled:false},scoreFinal:{textContent:''}};
 const sb={localStorage:ls,$:id=>el[id]||null,show:noop,state:'map',world:{p:{difficulty:1}},pf:null,vite:3,console,setTimeout,clearTimeout,fetch:rete,
  crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,AbortController,I18N_ROWS:[],
  dropSupply:noop,pfHitEnemy:noop,pfUpdateHostages:noop,viteGameOver:noop,finish(win){sb.state=win?'won':'lost'},pfFinish(win){sb.state=win?'won':'lost'}};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k'};\n"+['accesso.js','classifica.js','profilo.js','record.js','arena.js','classifica-arena.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8')).join('\n'),sb);
 return{sb,el,run:c=>vm.runInContext(c,sb)};
}
const docs=async col=>{const r=await fetch(EMU+'/v1/projects/demo-conex/databases/(default)/documents/'+col,{headers:{Authorization:'Bearer owner'}});const j=await r.json();return j.documents||[]};
(async()=>{
 await fetch(EMU+'/emulator/v1/projects/demo-conex:securityRules',{method:'PUT',body:JSON.stringify({rules:{files:[{content:fs.readFileSync(path.join(__dirname,'..','..','firestore.rules'),'utf8')}]}})});
 await fetch(EMU+'/emulator/v1/projects/demo-conex/databases/(default)/documents',{method:'DELETE'});
 const ls=storage(),{run}=game(ls);
 await run(`profCreate('Fabio','segreta1','','','pc')`);
 assert.equal(await run(`CX.nomeMio('Fabio')`),'mio','nome prenotato');
 const nomi=await docs('nomi');assert.equal(nomi.length,1);assert.equal(nomi[0].fields.n.stringValue,'Fabio');
 // missione 1
 run('score=1200;state="play";finish(false)');await run('recQ');
 let righe=await docs('classifica');assert.equal(righe.length,1,'riga creata');assert.equal(righe[0].fields.s.integerValue,'1200');
 assert(righe[0].fields.t&&righe[0].fields.c,'ore del server');
 // missione 2 subito dopo: il gioco aspetta i 15 secondi delle regole e poi scrive
 console.log('... missione 2 (attesa 15 s)');
 run('score=5300;state="platform";pfFinish(true)');await run('recQ');
 righe=await docs('classifica');assert.equal(righe.length,1,'stessa riga');assert.equal(righe[0].fields.s.integerValue,'5300');
 // un altro browser non può usare il nome
 const ls2=storage(),g2=game(ls2);
 assert.equal(await g2.run(`CX.nomeLibero('fabio')`),false,'nome preso');
 assert.equal(await g2.run(`CX.nomeMio('Fabio')`),'altrui');
 // stesso pilota su un altro PC: il backup porta la chiave del nome
 const ls3=storage();ls3.setItem('cxNomi',ls.getItem('cxNomi'));const g3=game(ls3);
 assert.equal(await g3.run(`CX.nomeLibero('Fabio')`),true);assert.equal(await g3.run(`CX.nomeMio('Fabio')`),'mio','altro PC col backup');
 // invio classico (coSend) con un punteggio sopra il tetto di creazione: riga a 80.000 e resto in attesa
 const id=await g3.run(`coSend({n:'Fabio',s:150000,d:new Date().toISOString().slice(0,10)})`);
 righe=await docs('classifica');const r3=righe.find(d=>d.name.endsWith('/'+id));assert.equal(r3.fields.s.integerValue,'80000','tetto alla creazione');
 assert.equal(JSON.parse(ls3.getItem('stellarRecordResto'))[0].o,150000,'il resto aspetta');
 // ARENA: vecchia riga con chiave → migrazione, poi sfide nuove
 const crypto=require('crypto'),kOld='e'.repeat(48);
 await fetch(EMU+'/v1/projects/demo-conex/databases/(default)/documents/arena?documentId=vecchia9',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
  body:JSON.stringify({fields:{n:{stringValue:'Fabio'},m:{integerValue:'10'},v:{integerValue:'3'},b:{integerValue:'40'},p:{integerValue:String(40*100+3*500+10*50)},h:{stringValue:crypto.createHash('sha256').update(kOld).digest('hex')}}})});
 ls.setItem('stellarArena',JSON.stringify({n:'Fabio',id:'vecchia9',k:kOld,v:4,b:45,m:11,sm:10,sv:3,sb:40}));   // 1 sfida non ancora inviata
 await run('arkSync()');
 let ar=await docs('arena');const nuova=ar.find(d=>d.name.endsWith('/fabio')),vecchia=ar.find(d=>d.name.endsWith('/vecchia9'));
 assert(nuova,'riga nuova');assert.equal(nuova.fields.m.integerValue,'10','totali portati');assert.equal(vecchia.fields.p.integerValue,'0','vecchia chiusa');
 let L=JSON.parse(ls.getItem('stellarArena'));assert.equal(L.pm,1,'1 sfida ancora da inviare');assert.equal(L.id,'');
 console.log('... sfida in attesa (31 s)');await new Promise(r=>setTimeout(r,38000));await run('arkQ');
 ar=await docs('arena');assert.equal(ar.find(d=>d.name.endsWith('/fabio')).fields.m.integerValue,'11','sfida inviata dopo 30 s');
 L=JSON.parse(ls.getItem('stellarArena'));assert.equal(L.pm,0);
 assert.equal(await run('arkTop(true).then(b=>b.length)'),1,'la vecchia riga (0 punti) non si vede');
 console.log('TUTTO OK CON L\'EMULATORE');process.exit(0);
})().catch(e=>{console.error(e);console.error(log.slice(-15).join('\n'));process.exit(1)});
