// Conex — ACCESSO (2026-11-11): chi scrive online deve essere un pilota vero del gioco.
// - Accesso anonimo Firebase: ogni browser riceve un utente invisibile (niente email, niente password).
//   Il gettone d'accesso va da solo su tutte le richieste a Firestore (classifiche) e alla Realtime Database
//   (sfida online): le regole rifiutano chi non ce l'ha.
// - App Check (facoltativo): se in firebase-config.js ci sono appId e recaptchaSiteKey, ogni richiesta porta
//   anche il gettone App Check di reCAPTCHA v3, che prova che arriva dalla pagina del gioco.
// - Nomi unici: il primo pilota che usa un nome lo prenota (raccolta `nomi`). La chiave segreta del nome
//   resta in questo browser (cxNomi) e viaggia nel backup .sfsave, così lo stesso pilota scrive anche da un altro PC.
// - Scritture con l'ora del server (t, e c alla creazione) per i limiti di velocità delle regole.
// Va caricato subito dopo firebase-config.js e prima di classifica.js.
const CX_ALTRUI='QUESTO NOME DI PILOTA È GIÀ USATO DA UN ALTRO: CREA UN PILOTA CON UN ALTRO NOME PER ENTRARE IN CLASSIFICA';
const CX=(function(){
'use strict';
const G=typeof window!=='undefined'?window:globalThis;
const CFG=(typeof CLASSIFICA_ONLINE==='object'&&CLASSIFICA_ONLINE)||{};
const on=!!(CFG.projectId&&CFG.apiKey)&&typeof G.fetch==='function';
const KEY='cxAccesso',NOMI='cxNomi';
const PID=String(CFG.projectId||''),AK=encodeURIComponent(CFG.apiKey||'');
const FS='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(PID)+'/';
const DOCS='projects/'+PID+'/databases/(default)/documents/';
const DB=String(CFG.databaseURL||'').replace(/\/$/,'');
const nativo=on?G.fetch.bind(G):null;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const json=(m,b,h)=>({method:m,headers:Object.assign({'Content-Type':'application/json'},h||{}),body:JSON.stringify(b)});

// ---------------------------------------------------------------- App Check (reCAPTCHA v3)
let ac='',acScad=0,acInCorso=null,acPausa=0;
function acOn(){return on&&typeof CFG.appId==='string'&&!!CFG.appId&&typeof CFG.recaptchaSiteKey==='string'&&!!CFG.recaptchaSiteKey&&typeof document!=='undefined'}
function recaptcha(){
 return new Promise((res,rej)=>{
  if(G.grecaptcha&&G.grecaptcha.execute)return G.grecaptcha.ready(()=>res(G.grecaptcha));
  const s=document.createElement('script');
  s.src='https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(CFG.recaptchaSiteKey);
  s.async=true;s.onerror=()=>rej(new Error('recaptcha'));
  s.onload=()=>G.grecaptcha?G.grecaptcha.ready(()=>res(G.grecaptcha)):rej(new Error('recaptcha'));
  document.head.appendChild(s);
 });
}
async function appCheck(){
 if(!acOn())return '';
 if(ac&&Date.now()<acScad-300000)return ac;
 if(Date.now()<acPausa)return ac;
 if(!acInCorso)acInCorso=(async()=>{
  try{
   const g=await recaptcha(),t=await g.execute(CFG.recaptchaSiteKey,{action:'fire_app_check'});
   const r=await nativo('https://content-firebaseappcheck.googleapis.com/v1/projects/'+encodeURIComponent(PID)+'/apps/'+encodeURIComponent(CFG.appId)+':exchangeRecaptchaV3Token?key='+AK,json('POST',{recaptcha_v3_token:t}));
   if(!r.ok)throw new Error('appcheck '+r.status);
   const j=await r.json();ac=String(j.token||'');acScad=Date.now()+(parseInt(j.ttl,10)||3600)*1000;
  }catch(e){acPausa=Date.now()+60000}
  finally{acInCorso=null}
  return ac;
 })();
 return acInCorso;
}

// ---------------------------------------------------------------- accesso anonimo
let tok='',scad=0,uid='',usato='',inCorso=null,pausa=0;
function salvato(){try{const o=JSON.parse(lsGet(KEY)||'null');return o&&typeof o.r==='string'&&o.r&&typeof o.u==='string'?o:null}catch(e){return null}}
function tieni(id,refresh,u,sec){
 tok=String(id||'');uid=String(u||'');scad=Date.now()+(parseInt(sec,10)||3600)*1000;usato=String(refresh||'');
 lsSet(KEY,JSON.stringify({u:uid,r:usato}));
}
async function token(){
 if(!on)return '';
 const s=salvato();
 if(s&&s.r!==usato){tok='';scad=0}                  // backup importato o altra scheda: si riparte da quel pilota
 if(tok&&Date.now()<scad-120000)return tok;
 if(Date.now()<pausa)return tok&&Date.now()<scad?tok:'';
 if(!inCorso)inCorso=(async()=>{
  try{
   const h={},a=await appCheck();if(a)h['X-Firebase-AppCheck']=a;
   if(s){
    const r=await nativo('https://securetoken.googleapis.com/v1/token?key='+AK,{method:'POST',headers:Object.assign({'Content-Type':'application/x-www-form-urlencoded'},h),body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.r)});
    if(r.ok){const j=await r.json();tieni(j.id_token,j.refresh_token,j.user_id,j.expires_in);return tok}
    if(r.status!==400)throw new Error('rete '+r.status);   // 400 = utente cancellato o gettone revocato: se ne crea uno nuovo
   }
   const r=await nativo('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+AK,json('POST',{returnSecureToken:true},h));
   if(!r.ok)throw new Error('accesso '+r.status);
   const j=await r.json();tieni(j.idToken,j.refreshToken,j.localId,j.expiresIn);return tok;
  }catch(e){pausa=Date.now()+30000;return ''}
  finally{inCorso=null}
 })();
 return inCorso;
}
function tokenPronto(){return tok&&Date.now()<scad-60000?tok:''}

// ---------------------------------------------------------------- tutte le richieste del gioco a Firebase
async function richiesta(input,init){
 const url=typeof input==='string'?input:'';
 if(url.startsWith(FS)){
  const [t,a]=await Promise.all([token(),appCheck()]);
  const o=Object.assign({},init||{}),h=Object.assign({},o.headers||{});
  if(t)h.Authorization='Bearer '+t;
  if(a)h['X-Firebase-AppCheck']=a;
  o.headers=h;return nativo(url,o);
 }
 if(DB&&url.startsWith(DB+'/')){
  const t=await token();
  return nativo(t?url+(url.includes('?')?'&':'?')+'auth='+encodeURIComponent(t):url,init);
 }
 return nativo(input,init);
}
if(on)G.fetch=richiesta;
// indirizzo della Realtime Database con il gettone (per EventSource, che non manda intestazioni)
function dbUrl(u){const t=tokenPronto();return t?u+(u.includes('?')?'&':'?')+'auth='+encodeURIComponent(t):u}

// ---------------------------------------------------------------- scritture con l'ora del server
function nome(col,id){return DOCS+col+'/'+id}
function percorso(col,id){return FS+'databases/(default)/documents/'+col+'/'+encodeURIComponent(id)}
// w: {col,id,fields,nuovo,tempo:true|false,maschera:true|false}
function scrittura(w){
 const s={update:{name:nome(w.col,w.id),fields:w.fields}};
 if(w.nuovo===true)s.currentDocument={exists:false};
 else if(w.nuovo===false)s.currentDocument={exists:true};
 if(w.maschera)s.updateMask={fieldPaths:Object.keys(w.fields)};
 if(w.tempo!==false){s.updateTransforms=[{fieldPath:'t',setToServerValue:'REQUEST_TIME'}];if(w.nuovo===true&&w.creazione)s.updateTransforms.push({fieldPath:'c',setToServerValue:'REQUEST_TIME'})}
 return s;
}
async function commit(ws,ms){
 const ctl=typeof AbortController==='function'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),ms||8000):0;
 try{
  const r=await G.fetch(FS+'databases/(default)/documents:commit?key='+AK,Object.assign(json('POST',{writes:ws.map(scrittura)}),{signal:ctl?ctl.signal:undefined}));
  if(!r.ok)throw new Error('firestore '+r.status);
  return await r.json();
 }finally{clearTimeout(tm)}
}
// legge un documento: null se non c'è
async function leggi(col,id){
 const r=await G.fetch(percorso(col,id)+'?key='+AK);
 if(r.status===404)return null;
 if(!r.ok)throw new Error('firestore '+r.status);
 return await r.json();
}

// ---------------------------------------------------------------- nomi unici
// cxNomi = { "nome in minuscolo": { k: chiave segreta, u: [utenti già registrati con quel nome] } }
function chiaveNome(n){return String(n||'').toLowerCase()}
function nomi(){try{const o=JSON.parse(lsGet(NOMI)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(e){return{}}}
function nomiSalva(o){lsSet(NOMI,JSON.stringify(o))}
function segreto(){const b=new Uint8Array(24);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')}
async function impronta(k){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(k));return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('')}
const nomeInCorso=new Map();
// 'mio' = questo pilota può scrivere con quel nome; 'altrui' = il nome è di un altro pilota; '' = non si sa (offline)
function nomeMio(n){
 const key=chiaveNome(n);
 if(!on||!key)return Promise.resolve('');
 if(nomeInCorso.has(key))return nomeInCorso.get(key);
 const p=(async()=>{
  try{
   const t=await token();if(!t)return '';
   const all=nomi(),mio=all[key]&&typeof all[key].k==='string'?all[key]:null;
   if(mio&&Array.isArray(mio.u)&&mio.u.includes(uid))return 'mio';
   const doc=await leggi('nomi',key);
   if(!doc){
    const k=mio?mio.k:segreto(),h=await impronta(k);
    all[key]={k,u:[]};nomiSalva(all);           // la chiave si salva prima: se la rete cade a metà, si riprova
    try{
     await commit([{col:'nomi',id:key,fields:{n:{stringValue:n},h:{stringValue:h}},nuovo:true},
                   {col:'nomi/'+key+'/piloti',id:uid,fields:{k:{stringValue:k}}}]);
    }catch(e){
     if(!/firestore 4\d\d/.test(String(e&&e.message)))throw e;
     const ora=await leggi('nomi',key);          // qualcuno l'ha preso un attimo prima?
     if(!ora||!ora.fields||!ora.fields.h||ora.fields.h.stringValue!==h)return 'altrui';
     await commit([{col:'nomi/'+key+'/piloti',id:uid,fields:{k:{stringValue:k}}}]);
    }
   }else{
    if(!mio)return 'altrui';
    try{await commit([{col:'nomi/'+key+'/piloti',id:uid,fields:{k:{stringValue:mio.k}}}])}
    catch(e){if(/firestore 403/.test(String(e&&e.message)))return 'altrui';throw e}
   }
   const dopo=nomi();dopo[key]=dopo[key]||all[key];dopo[key].u=(Array.isArray(dopo[key].u)?dopo[key].u:[]).filter(x=>x!==uid).concat(uid).slice(-20);nomiSalva(dopo);
   return 'mio';
  }catch(e){return ''}
  finally{nomeInCorso.delete(key)}
 })();
 nomeInCorso.set(key,p);return p;
}
// libero o già mio? (per la creazione del pilota) true = si può usare, false = è di un altro, null = offline
async function nomeLibero(n){
 const key=chiaveNome(n);if(!on||!key)return null;
 const mio=nomi()[key];
 try{const doc=await leggi('nomi',key);if(!doc)return true;return !!(mio&&doc.fields&&doc.fields.h&&doc.fields.h.stringValue===await impronta(mio.k))}catch(e){return null}
}

// il backup .sfsave porta con sé utente e chiavi dei nomi
if(typeof G.addEventListener==='function')G.addEventListener('load',()=>{
 if(typeof PROF_PROGRESS!=='undefined'&&Array.isArray(PROF_PROGRESS))for(const k of [KEY,NOMI])if(!PROF_PROGRESS.includes(k))PROF_PROGRESS.push(k);
});
// all'avvio: accesso e prenotazione del nome del pilota (il primo che lo usa lo tiene)
if(on&&typeof setTimeout==='function')setTimeout(async()=>{
 await token();
 const n=typeof prof!=='undefined'&&prof&&prof.nome;
 if(n&&await nomeMio(n)==='altrui'&&typeof recAltrui==='function')recAltrui(n);
},1500);

// traduzioni dei messaggi
if(typeof G.addEventListener==='function')G.addEventListener('load',()=>{
 if(typeof I18N_ROWS==='undefined')return;
 const rows=[
  ['QUESTO NOME È GIÀ USATO DA UN ALTRO PILOTA: SCEGLINE UN ALTRO','THIS NAME IS ALREADY USED BY ANOTHER PILOT: CHOOSE ANOTHER ONE','CE NOM EST DÉJÀ UTILISÉ PAR UN AUTRE PILOTE : CHOISIS-EN UN AUTRE','ESTE NOMBRE YA LO USA OTRO PILOTO: ELIGE OTRO','ЭТО ИМЯ УЖЕ ЗАНЯТО ДРУГИМ ПИЛОТОМ: ВЫБЕРИ ДРУГОЕ','这个名字已被其他飞行员使用：请换一个','この名前は他のパイロットが使用中です：別の名前を選んでください'],
  [CX_ALTRUI,'THIS PILOT NAME IS ALREADY USED BY SOMEONE ELSE: CREATE A PILOT WITH ANOTHER NAME TO ENTER THE LEADERBOARD','CE NOM DE PILOTE EST DÉJÀ UTILISÉ PAR QUELQU’UN D’AUTRE : CRÉE UN PILOTE AVEC UN AUTRE NOM POUR ENTRER AU CLASSEMENT','ESTE NOMBRE DE PILOTO YA LO USA OTRA PERSONA: CREA UN PILOTO CON OTRO NOMBRE PARA ENTRAR EN LA CLASIFICACIÓN','ЭТО ИМЯ ПИЛОТА УЖЕ ЗАНЯТО: СОЗДАЙ ПИЛОТА С ДРУГИМ ИМЕНЕМ, ЧТОБЫ ПОПАСТЬ В РЕЙТИНГ','这个飞行员名字已被他人使用：换个名字创建飞行员才能进入排行榜','このパイロット名は他の人が使用中です：ランキングに入るには別の名前でパイロットを作成してください']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
});

return {on,token,tokenPronto,appCheck,dbUrl,commit,leggi,nomeMio,nomeLibero,chiaveNome,uid:()=>uid};
})();
