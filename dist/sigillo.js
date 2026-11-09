// Conex — SIGILLO: progressi criptati e protezioni contro la manomissione (2026-11-08).
// Va caricato PRIMA di ogni altro script.
// - I progressi (crediti, potenziamenti, vite, pianeti, punti, record, partita salvata...) non stanno più
//   in chiaro nel localStorage: il gioco continua a chiamare localStorage.getItem/setItem come prima,
//   ma per queste chiavi i valori vivono in memoria e vengono scritti in un unico blocco criptato
//   (cifratura a flusso HMAC-SHA256 + firma HMAC). Chi cambia o cancella il blocco a mano viene scoperto.
// - Una copia nascosta in IndexedDB, con un contatore che cresce a ogni salvataggio, ripara il blocco
//   se viene cancellato o sostituito con una copia vecchia (per esempio per riavere le vite dopo un GAME OVER).
// - Se blocco e copia sono entrambi manomessi la partita riparte da zero.
// - Tiene l'elenco segreto delle partite finite (GAME OVER o chiuse): partita.js lo usa per rifiutare
//   i backup .sfsave di una partita già persa.
// Limite onesto: il gioco gira tutto nel browser, quindi chi legge il codice e usa la console
// può ancora barare; questo ferma le modifiche dagli Strumenti per sviluppatori e i trucchi più comuni.
(function(){
'use strict';
const G=typeof window!=='undefined'?window:globalThis;
if(typeof TextEncoder==='undefined'||typeof TextDecoder==='undefined'||typeof btoa==='undefined'||typeof atob==='undefined')return;
const PROTETTE=['frontieraCrediti','frontieraGuadagni','frontieraPotenziamenti','frontieraVite','frontieraPhaseOneComplete','frontieraPhaseTwoComplete',
 'frontieraPianetiLiberati','frontieraOmegaLibero','stellarPunti','stellarRecord','stellarMieiRecord','stellarPartita',
 'stellarPartitaSalvata','stellarCorsa','stellarClassifica','stellarInAttesa'];
const PSET=new Set(PROTETTE);
const BLOCCO='cx_n7',DB='cx-cache',DB_STORE='k',FORMATO='CX1.',MORTI_MAX=300;

// ---------------------------------------------------------------- SHA-256 / HMAC (sincroni)
const KK=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function sha256(m){
 const l=m.length,n=((l+9+63)>>6)<<6,b=new Uint8Array(n);b.set(m);b[l]=0x80;
 const bits=l*8;b[n-4]=bits>>>24;b[n-3]=bits>>>16;b[n-2]=bits>>>8;b[n-1]=bits;b[n-5]=Math.floor(bits/4294967296);
 const h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
 for(let o=0;o<n;o+=64){
  for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
  for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+w[i-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))+w[i-16]}
  let a=h[0],c=h[1],d=h[2],e=h[3],f=h[4],g=h[5],k=h[6],z=h[7];
  for(let i=0;i<64;i++){
   const t1=(z+(((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)))+((f&g)^(~f&k))+KK[i]+w[i])|0;
   const t2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&c)^(a&d)^(c&d)))|0;
   z=k;k=g;g=f;f=(e+t1)|0;e=d;d=c;c=a;a=(t1+t2)|0;
  }
  h[0]+=a;h[1]+=c;h[2]+=d;h[3]+=e;h[4]+=f;h[5]+=g;h[6]+=k;h[7]+=z;
 }
 const r=new Uint8Array(32);for(let i=0;i<8;i++){r[i*4]=h[i]>>>24;r[i*4+1]=h[i]>>>16;r[i*4+2]=h[i]>>>8;r[i*4+3]=h[i]}
 return r;
}
function cat(...a){let n=0;for(const x of a)n+=x.length;const r=new Uint8Array(n);let o=0;for(const x of a){r.set(x,o);o+=x.length}return r}
function hmac(k,m){
 if(k.length>64)k=sha256(k);const ik=new Uint8Array(64),ok=new Uint8Array(64);
 for(let i=0;i<64;i++){const v=k[i]||0;ik[i]=v^0x36;ok[i]=v^0x5c}
 return sha256(cat(ok,sha256(cat(ik,m))));
}
const enc=s=>new TextEncoder().encode(s),dec=b=>new TextDecoder().decode(b);
function b64(b){let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)}
function unb64(s){const t=atob(s),b=new Uint8Array(t.length);for(let i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return b}
function rand(n){const b=new Uint8Array(n);try{crypto.getRandomValues(b)}catch(e){for(let i=0;i<n;i++)b[i]=Math.random()*256|0}return b}
function ugualiCT(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0}

// chiave del gioco: spezzata e mescolata, poi legata al sale casuale di ogni browser
const RADICE=sha256(enc(['c0','N3x','·fr','0nt','iera','·5t','3ll','are','·','Ω','26','11'].map((s,i)=>i%2?s.split('').reverse().join(''):s).join('~')));
function chiavi(sale){return{c:hmac(RADICE,cat(enc('cifra'),sale)),f:hmac(RADICE,cat(enc('firma'),sale))}}
function flusso(k,nonce,dati){
 const out=new Uint8Array(dati.length),ctr=new Uint8Array(4);
 for(let o=0,i=0;o<dati.length;o+=32,i++){
  ctr[0]=i>>>24;ctr[1]=i>>>16;ctr[2]=i>>>8;ctr[3]=i;
  const ks=hmac(k,cat(nonce,ctr));for(let j=0;j<32&&o+j<dati.length;j++)out[o+j]=dati[o+j]^ks[j];
 }
 return out;
}
function chiudi(obj,sale){
 const k=chiavi(sale),nonce=rand(12),ct=flusso(k.c,nonce,enc(JSON.stringify(obj)));
 const corpo=cat(sale,nonce,ct);return FORMATO+b64(cat(corpo,hmac(k.f,corpo)));
}
function apri(testo){
 try{
  if(typeof testo!=='string'||!testo.startsWith(FORMATO))return null;
  const b=unb64(testo.slice(FORMATO.length));if(b.length<16+12+32)return null;
  const corpo=b.subarray(0,b.length-32),firma=b.subarray(b.length-32),sale=corpo.slice(0,16),k=chiavi(sale);
  if(!ugualiCT(hmac(k.f,corpo),firma))return null;
  const o=JSON.parse(dec(flusso(k.c,corpo.subarray(16,28),corpo.subarray(28))));
  if(!o||typeof o!=='object'||!Number.isFinite(o.n)||!o.d||typeof o.d!=='object')return null;
  return{o,sale};
 }catch(e){return null}
}

// ---------------------------------------------------------------- archivio in memoria
let ls=null;try{ls=G.localStorage}catch(e){}
if(!ls)return;
const nativo=typeof Storage!=='undefined'&&Storage.prototype&&ls instanceof Storage;
const T=nativo?Storage.prototype:ls;
const og=T.getItem,os=T.setItem,orm=T.removeItem,ocl=T.clear;
const rawGet=k=>{try{return og.call(ls,k)}catch(e){return null}};
const rawSet=(k,v)=>{try{os.call(ls,k,v);return true}catch(e){return false}};
const rawDel=k=>{try{orm.call(ls,k)}catch(e){}};

const mem=new Map();let morti=[],cont=0,sale=rand(16),avviso='',timer=0;
function carica(o){mem.clear();for(const k of Object.keys(o.d))if(PSET.has(k)&&typeof o.d[k]==='string')mem.set(k,o.d[k]);morti=Array.isArray(o.m)?o.m.filter(x=>typeof x==='string').slice(-MORTI_MAX):[];cont=o.n}
function stato(){const d={};for(const[k,v]of mem)d[k]=v;return{n:cont,d,m:morti,t:Date.now()}}
function scrivi(){
 if(timer){clearTimeout(timer);timer=0}
 cont++;const testo=chiudi(stato(),sale);
 rawSet(BLOCCO,testo);idbPut(testo);
}
function presto(){if(!timer)timer=setTimeout(scrivi,350)}

// avvio: blocco valido → si usa; mancante → si migrano le vecchie chiavi in chiaro; manomesso → si aspetta la copia nascosta
const testo=rawGet(BLOCCO),aperto=apri(testo);
let manomesso=false;
if(aperto){carica(aperto.o);sale=aperto.sale}
else if(testo){manomesso=true}
else for(const k of PROTETTE){const v=rawGet(k);if(v!==null)mem.set(k,v)}
for(const k of PROTETTE)rawDel(k);   // niente più copie in chiaro (anche quelle scritte a mano)
if(!aperto&&!manomesso)scrivi();

// ---------------------------------------------------------------- localStorage trasparente
function propria(s){return s===ls}
T.getItem=function(k){if(propria(this)&&PSET.has(String(k))){const v=mem.get(String(k));return v===undefined?null:v}return og.apply(this,arguments)};
T.setItem=function(k,v){if(propria(this)&&PSET.has(String(k))){const s=String(v);if(mem.get(String(k))!==s){mem.set(String(k),s);presto()}return}return os.apply(this,arguments)};
T.removeItem=function(k){if(propria(this)&&PSET.has(String(k))){if(mem.delete(String(k)))presto();return}return orm.apply(this,arguments)};
if(ocl)T.clear=function(){if(propria(this)){mem.clear();const r=ocl.apply(this,arguments);scrivi();return r}return ocl.apply(this,arguments)};

// ---------------------------------------------------------------- copia nascosta in IndexedDB
function idb(mode,fn){return new Promise(res=>{try{
 if(typeof indexedDB==='undefined')return res(null);
 const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(DB_STORE);
 q.onerror=()=>res(null);
 q.onsuccess=()=>{try{const t=q.result.transaction(DB_STORE,mode),r=fn(t.objectStore(DB_STORE));t.oncomplete=()=>res(r&&'result'in r?r.result:null);t.onerror=()=>res(null)}catch(e){res(null)}};
}catch(e){res(null)}})}
function idbPut(t){idb('readwrite',s=>s.put(t,'n'))}
function segnala(a){avviso=a;try{G.sessionStorage&&G.sessionStorage.setItem('cx_a',a)}catch(e){}}
try{const g=G.sessionStorage,a=g&&g.getItem('cx_a');if(a){g.removeItem('cx_a');avviso=a}}catch(e){}
function riavvia(){
 try{const g=G.sessionStorage;const t=+(g&&g.getItem('cx_r'))||0;if(Date.now()-t<15000)return;g&&g.setItem('cx_r',String(Date.now()))}catch(e){}
 try{G.location.reload()}catch(e){}
}
const pronto=idb('readonly',s=>s.get('n')).then(copia=>{
 const c=apri(copia);
 if(manomesso){
  if(c){carica(c.o);sale=c.sale;rawSet(BLOCCO,copia);segnala('riparato');riavvia();return}
  // blocco e copia manomessi o assenti: si riparte da zero
  mem.clear();segnala('azzerato');scrivi();riavvia();return;
 }
 if(c&&c.o.n>cont){
  // il blocco è più vecchio della copia nascosta: copia vecchia rimessa a mano o blocco cancellato
  const morte=morti.slice();carica(c.o);for(const m of morte)if(!morti.includes(m))morti.push(m);
  sale=c.sale;rawSet(BLOCCO,copia);segnala('riparato');riavvia();return;
 }
 if(!c||c.o.n<cont)idbPut(rawGet(BLOCCO));
});

// ---------------------------------------------------------------- altre schede, chiusura della pagina
if(typeof G.addEventListener==='function'){
 G.addEventListener('storage',e=>{if(e.key!==BLOCCO||!e.newValue)return;const c=apri(e.newValue);if(c&&c.o.n>cont){carica(c.o);sale=c.sale}});
 G.addEventListener('pagehide',()=>{if(timer)scrivi()});
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer)scrivi()});

// ---------------------------------------------------------------- per gli altri moduli (solo funzioni, niente dati)
const api={
 chiavi:PROTETTE.slice(),
 salvaOra(){scrivi()},
 morta(id){return typeof id==='string'&&morti.includes(id)},
 seppellisci(id){if(typeof id!=='string'||!id||morti.includes(id))return;morti.push(id);if(morti.length>MORTI_MAX)morti=morti.slice(-MORTI_MAX);scrivi()},
 avviso(){const a=avviso;avviso='';return a},
 pronto,
 // per i test
 _apri:apri,_chiudi:chiudi,_sha:b=>b64(sha256(b))
};
Object.freeze(api);
try{Object.defineProperty(G,'sigillo',{value:api,writable:false,configurable:false,enumerable:false})}catch(e){G.sigillo=api}
})();
