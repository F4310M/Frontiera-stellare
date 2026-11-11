// Accesso anonimo, App Check e foto sicure nell'arena (2026-11-11).
// Eseguire dalla cartella principale: node tests/accesso.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
const DB='https://x-default-rtdb.europe-west1.firebasedatabase.app';
function sandbox(cfg,ls){
 const calls=[];let uid=0;
 const fetch=async(url,o)=>{
  o=o||{};calls.push({url,o});
  if(url.includes('identitytoolkit'))return{ok:true,status:200,json:async()=>({idToken:'T.u'+(++uid),refreshToken:'R.u'+uid,localId:'u'+uid,expiresIn:'3600'})};
  if(url.includes('securetoken'))return{ok:true,status:200,json:async()=>({id_token:'T.again',refresh_token:'R.again',user_id:'u-again',expires_in:'3600'})};
  if(url.includes('exchangeRecaptchaV3Token'))return{ok:true,status:200,json:async()=>({token:'AC-'+JSON.parse(o.body).recaptcha_v3_token,ttl:'3600s'})};
  return{ok:true,status:200,json:async()=>({})};
 };
 const sb={localStorage:ls||storage(),console,setTimeout:()=>0,clearTimeout:()=>{},fetch,crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,
  grecaptcha:{execute:async()=>'rc',ready:f=>f()},document:{head:{appendChild(){}},createElement:()=>({})}};
 vm.createContext(sb);
 vm.runInContext('const CLASSIFICA_ONLINE='+JSON.stringify(cfg)+';\n'+src('accesso.js')+'\n'+src('arena.js'),sb);
 return{sb,calls,run:c=>vm.runInContext(c,sb)};
}
(async()=>{
 // 0) ordine dei file e configurazione
 {
  const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
  assert(at('firebase-config.js')>0&&at('accesso.js')>at('firebase-config.js')&&at('classifica.js')>at('accesso.js'),'accesso.js tra firebase-config.js e classifica.js');
  assert(/appId:/.test(src('firebase-config.js'))&&/recaptchaSiteKey:/.test(src('firebase-config.js')),'campi App Check nella configurazione');
  console.log('PASS: file');
 }
 // 1) gettone d'accesso solo verso Firebase del gioco
 {
  const ls=storage(),{calls,run}=sandbox({projectId:'p',apiKey:'k',databaseURL:DB},ls);
  await run(`fetch('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents:runQuery?key=k',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})`);
  let c=calls[calls.length-1];
  assert.equal(c.o.headers.Authorization,'Bearer T.u1','Firestore con il gettone');assert.equal(c.o.headers['Content-Type'],'application/json');
  assert(!c.o.headers['X-Firebase-AppCheck'],'senza App Check configurato niente intestazione');
  assert.equal(JSON.parse(ls.getItem('cxAccesso')).u,'u1','utente ricordato');
  await run(`fetch('${DB}/arena/ALFA/p/aaaaaaaaaa.json',{method:'PATCH',body:'{}'})`);
  c=calls[calls.length-1];assert.equal(c.url,DB+'/arena/ALFA/p/aaaaaaaaaa.json?auth=T.u1','Realtime Database con auth=');
  await run(`fetch('https://esempio.it/x')`);
  c=calls[calls.length-1];assert.equal(c.url,'https://esempio.it/x');assert(!(c.o.headers&&c.o.headers.Authorization),'altri siti senza gettone');
  await run(`fetch('https://firestore.googleapis.com/v1/projects/altro/databases/(default)/documents/x')`);
  c=calls[calls.length-1];assert(!(c.o.headers&&c.o.headers.Authorization),'altri progetti senza gettone');
  assert.equal(run(`CX.dbUrl('${DB}/arena/ALFA/p.json')`),DB+'/arena/ALFA/p.json?auth=T.u1','ascolto con il gettone');
  assert.equal(calls.filter(x=>x.url.includes('signUp')).length,1,'un solo utente');
  // stesso browser più tardi: si rinnova lo stesso utente, non se ne crea un altro
  const s2=sandbox({projectId:'p',apiKey:'k'},ls);
  await s2.run('CX.token()');
  assert.equal(s2.calls.filter(x=>x.url.includes('signUp')).length,0);assert.equal(s2.calls.filter(x=>x.url.includes('securetoken')).length,1);
  console.log('PASS: accesso anonimo');
 }
 // 2) App Check se configurato
 {
  const {calls,run}=sandbox({projectId:'p',apiKey:'k',appId:'1:2:web:3',recaptchaSiteKey:'chiave'});
  await run(`fetch('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/classifica/x?key=k')`);
  const c=calls[calls.length-1];
  assert.equal(c.o.headers['X-Firebase-AppCheck'],'AC-rc','gettone App Check');
  assert(calls.some(x=>x.url.includes('/apps/1%3A2%3Aweb%3A3:exchangeRecaptchaV3Token')),'scambio reCAPTCHA');
  console.log('PASS: App Check');
 }
 // 3) senza configurazione Firebase nulla cambia
 {
  const {calls,run}=sandbox({projectId:'',apiKey:''});
  assert.equal(run('CX.on'),false);
  await run(`fetch('https://firestore.googleapis.com/v1/projects/p/x')`);
  assert(!(calls[0].o.headers&&calls[0].o.headers.Authorization));
  console.log('PASS: senza Firebase');
 }
 // 4) foto dei piloti nell'arena: niente codice nella pagina
 {
  const {run}=sandbox({projectId:'',apiKey:''});
  const buona='data:image/jpeg;base64,'+Buffer.alloc(30,9).toString('base64');
  assert.equal(run(`arImgOk(${JSON.stringify(buona)})`),buona);
  for(const cattiva of ['data:image/x" onerror="alert(1)','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)','data:image/png;base64,AAA"><script>',buona+'"','x'.repeat(7000)])
   assert.equal(run(`arImgOk(${JSON.stringify(cattiva)})`),'','rifiutata: '+cattiva.slice(0,30));
  const g=`var g={pid:'io',mode:0,others:{}};`;
  const html=run(g+`arPilotRow(g,{pid:'xx',n:'Eve',a:'data:image/x" onerror="alert(1)',fa:'r',k:0,d:0,tm:0},0)`);
  assert(!/onerror/.test(html),'nessun attributo iniettato');
  assert(/<img src="data:image\/jpeg/.test(run(g+`arPilotRow(g,{pid:'xx',n:'Eve',a:${JSON.stringify(buona)},fa:'r',k:0,d:0,tm:0},0)`)),'foto vera mostrata');
  const rules=fs.readFileSync(path.join(__dirname,'..','database.rules.json'),'utf8');
  assert(/base64/.test(rules)&&/auth\.uid/.test(rules),'regole della sfida online: foto e proprietario');
  console.log('PASS: foto sicure nell’arena');
 }
 console.log('TUTTI I TEST DI ACCESSO PASSATI');
})().catch(e=>{console.error(e);process.exit(1)});
