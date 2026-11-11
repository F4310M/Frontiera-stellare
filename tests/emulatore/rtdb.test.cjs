// Sfida online (arena.js + accesso.js) contro l'emulatore della Realtime Database. Vedi regole.test.mjs per l'avvio.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=process.env.DIST||path.join(__dirname,'..','..','dist'),DBH='http://127.0.0.1:9005';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(uid){const now=Math.floor(Date.now()/1000);return b64({alg:'none',typ:'JWT'})+'.'+b64({iss:'https://securetoken.google.com/demo-conex',aud:'demo-conex',auth_time:now,user_id:uid,sub:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:'anonymous'}})+'.'}
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
let n=0;
function game(){
 const rete=async(url,o)=>{o=o||{};
  if(url.includes('identitytoolkit')){const uid='uid'+(++n);return{ok:true,status:200,json:async()=>({idToken:jwt(uid),refreshToken:'r',localId:uid,expiresIn:'3600'})}}
  const u=url.replace('https://x-default-rtdb.europe-west1.firebasedatabase.app',DBH).replace('.json','.json?ns=demo-conex-default-rtdb').replace('.json?ns=demo-conex-default-rtdb?','.json?ns=demo-conex-default-rtdb&');
  const r=await fetch(u,{method:o.method||'GET',body:o.body});const t=await r.text();return{ok:r.ok,status:r.status,json:async()=>JSON.parse(t),text:async()=>t}};
 const sb={localStorage:storage(),console,setTimeout,clearTimeout,fetch:rete,crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,AbortController,EventSource:class{addEventListener(){}close(){}}};
 vm.createContext(sb);
 vm.runInContext("const CLASSIFICA_ONLINE={projectId:'p',apiKey:'k',databaseURL:'https://x-default-rtdb.europe-west1.firebasedatabase.app'};\n"+fs.readFileSync(path.join(dist,'accesso.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'arena.js'),'utf8'),sb);
 return c=>vm.runInContext(c,sb);
}
(async()=>{
 await fetch(DBH+'/.settings/rules.json?ns=demo-conex-default-rtdb',{method:'PUT',headers:{Authorization:'Bearer owner'},body:fs.readFileSync(path.join(__dirname,'..','..','database.rules.json'),'utf8')});
 const A=game(),B=game();
 await A(`var na=arNetFirebase('https://x-default-rtdb.europe-west1.firebasedatabase.app','ALFA','aaaaaaaaaa',()=>{});na.join({n:'Fabio',j:1,x:0,y:0})`);
 const raw=await (await fetch(DBH+'/arena/ALFA/p/aaaaaaaaaa.json?ns=demo-conex-default-rtdb',{headers:{Authorization:'Bearer owner'}})).json();
 assert.equal(raw.u,'uid1','nodo marcato col proprio utente');assert.equal(raw.n,'Fabio');
 await B(`var nb=arNetFirebase('https://x-default-rtdb.europe-west1.firebasedatabase.app','ALFA','bbbbbbbbbb',()=>{});nb.join({n:'Bianca',j:2,x:0,y:0})`);
 const cnt=await B(`arRoomCount('https://x-default-rtdb.europe-west1.firebasedatabase.app','ALFA')`);assert.equal(cnt,2,'conteggio piloti con accesso');
 const r=await B(`fetch('https://x-default-rtdb.europe-west1.firebasedatabase.app/arena/ALFA/p/aaaaaaaaaa.json',{method:'PATCH',body:JSON.stringify({x:999,t:{'.sv':'timestamp'}})}).then(r=>r.status)`);
 assert.equal(r,401,'B non sposta A');
 A(`na.send({x:42})`);await new Promise(r=>setTimeout(r,500));
 const raw2=await (await fetch(DBH+'/arena/ALFA/p/aaaaaaaaaa.json?ns=demo-conex-default-rtdb',{headers:{Authorization:'Bearer owner'}})).json();assert.equal(raw2.x,42,'A si muove');
 console.log('RTDB OK');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
