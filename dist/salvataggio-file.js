// SALVATAGGIO AUTOMATICO DEL FILE .sfsave (2026-11-12)
// Prima il gioco salvava da solo solo dentro il browser (sigillo.js): il file .sfsave sul PC cambiava
// soltanto premendo SALVA PROGRESSI nel pannello del pilota, quindi importandolo il giorno dopo
// i progressi delle missioni non c'erano.
// Ora, finita una missione o tornati alla mappa, il file scelto la prima volta si aggiorna da solo:
// - la chiave del pilota (AES, non esportabile: la password non si legge da lì) resta nel browser
//   in IndexedDB, così non serve riscrivere la password a ogni avvio;
// - Chrome/Edge riscrivono lo stesso file; se il browser vuole di nuovo il permesso lo si chiede
//   da solo al primo clic (nessun avviso da premere);
// - gli altri browser (download) non scaricano file da soli.
// Va caricato dopo profilo.js e partita.js.
(function(){
 if(typeof profSaveFile!=='function'||typeof profIdb!=='function'||typeof profPack!=='function')return;
 const SAFE=['map','won'];
 let writing=false,last=0,hidden=false,lastState='';
 const idbGet=k=>profIdb('readonly',s=>s.get(k));
 const idbPut=(k,v)=>profIdb('readwrite',s=>s.put(v,k));
 const idbDel=k=>profIdb('readwrite',s=>s.delete(k));
 const st=()=>typeof state!=='undefined'?state:'';
 const tx=s=>typeof profT==='function'?profT(s):s;

 // ---- la chiave del pilota resta nel browser
 function keepKey(){
  if(typeof prof==='undefined'||!prof||!profKeyMem)return;
  idbPut('chiave',{salt:prof.salt,check:prof.check,key:profKeyMem});
 }
 async function loadKey(){
  if(typeof prof==='undefined'||!prof)return false;
  if(profKeyMem)return true;
  const r=await idbGet('chiave');
  if(r&&r.key&&r.salt===prof.salt&&r.check===prof.check&&!profKeyMem)profKeyMem=r.key;
  return !!profKeyMem;
 }
 const wrap=(name,after)=>{
  const f=globalThis[name];if(typeof f!=='function')return;
  globalThis[name]=function(){
   const r=f.apply(this,arguments);
   if(r&&typeof r.then==='function')return r.then(v=>{after(v);return v});
   after(r);return r;
  };
 };
 wrap('profCreate',()=>keepKey());
 wrap('profUnlock',ok=>{if(ok)keepKey()});
 wrap('profNewPassword',()=>keepKey());
 wrap('profApply',()=>keepKey());
 wrap('profReset',()=>{idbDel('chiave')});

 // ---- scrittura silenziosa sul file già scelto
 async function scriviFile(){
  if(writing||typeof prof==='undefined'||!prof||prof.modo!=='pc')return false;
  if(typeof profCryptoOk==='function'&&!profCryptoOk())return false;
  if(!await loadKey())return false;
  const h=await idbGet('backup');
  if(!h||typeof h.createWritable!=='function')return false;
  let p='prompt';
  try{p=typeof h.queryPermission==='function'?await h.queryPermission({mode:'readwrite'}):'granted'}catch(e){}
  if(p!=='granted')return false;
  writing=true;
  try{
   const snap=profSnapKey();
   const text=await profPack(profKeyMem);
   const w=await h.createWritable();await w.write(text);await w.close();
   Object.assign(prof,{ultimoBackup:new Date().toISOString(),file:h.name||prof.file,snap});profStore();
   if(typeof profRefresh==='function')try{profRefresh()}catch(e){}
   return true;
  }catch(e){return false}
  finally{writing=false}
 }

 // ---- permesso del file chiesto da solo (2026-11-12 pomeriggio): niente più avviso SALVA ORA.
 // Chrome/Edge danno il permesso di scrittura solo dopo un gesto: al primo clic o tasto fuori dal
 // combattimento lo si chiede in automatico (il browser mostra la sua domanda una volta; scegliendo
 // "Consenti a ogni visita" non la ripropone più). Se il permesso c'è già non succede nulla.
 let fileH=null,perm='',chiesto=false;
 async function guardaPermesso(){
  fileH=await idbGet('backup');
  perm='';
  if(fileH&&typeof fileH.queryPermission==='function')try{perm=await fileH.queryPermission({mode:'readwrite'})}catch(e){}
  return perm;
 }
 function gesto(){
  if(chiesto||perm==='granted'||!fileH||typeof fileH.requestPermission!=='function')return;
  if(typeof prof==='undefined'||!prof||prof.modo!=='pc')return;
  if(!SAFE.includes(st())&&st()!=='menu')return;
  chiesto=true;
  try{fileH.requestPermission({mode:'readwrite'}).then(p=>{perm=p;if(p==='granted'){last=0;tick().catch(()=>{})}},()=>{})}catch(e){}
 }
 if(typeof document!=='undefined'&&document.addEventListener){
  document.addEventListener('pointerdown',gesto,true);
  document.addEventListener('keydown',gesto,true);
 }
 if(typeof setTimeout==='function')setTimeout(()=>{guardaPermesso().catch(()=>{})},500);

 // ---- controllo ogni 3 secondi: solo fuori dal combattimento (mappa o missione finita)
 async function tick(){
  const s=st();
  if(s!==lastState)lastState=s;
  if(typeof prof==='undefined'||!prof||prof.modo!=='pc'||writing)return;
  if(!SAFE.includes(s))return;
  if(typeof profDirty==='function'&&!profDirty())return;
  const now=Date.now();if(now-last<2500)return;last=now;
  const ok=await scriviFile();
  if(!ok)guardaPermesso().catch(()=>{});
 }
 if(typeof setInterval==='function')setInterval(()=>{tick().catch(()=>{})},3000);
 if(typeof globalThis!=='undefined')globalThis.salvataggioFile={scriviFile,tick,loadKey,gesto,guardaPermesso};

 // stile per i cursori: nessun cursore di testo lampeggiante fuori dai campi da scrivere
 if(typeof document!=='undefined'&&document.createElement&&document.head){
  const css=document.createElement('style');
  css.textContent='html,body,body *{caret-color:transparent}input,textarea,[contenteditable="true"]{caret-color:auto}';
  document.head.appendChild(css);
 }
})();
