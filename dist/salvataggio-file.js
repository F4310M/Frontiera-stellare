// SALVATAGGIO AUTOMATICO DEL FILE .sfsave (2026-11-12)
// Prima il gioco salvava da solo solo dentro il browser (sigillo.js): il file .sfsave sul PC cambiava
// soltanto premendo SALVA PROGRESSI nel pannello del pilota, quindi importandolo il giorno dopo
// i progressi delle missioni non c'erano.
// Ora, finita una missione o tornati alla mappa, il file scelto la prima volta si aggiorna da solo:
// - la chiave del pilota (AES, non esportabile: la password non si legge da lì) resta nel browser
//   in IndexedDB, così non serve riscrivere la password a ogni avvio;
// - Chrome/Edge riscrivono lo stesso file; se il browser vuole di nuovo il permesso (di solito una
//   volta per sessione) o la chiave manca, in basso nella mappa compare SALVA ORA: il permesso si dà solo con un clic;
// - gli altri browser (download) non scaricano file da soli: resta solo l'avviso.
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

 // ---- avviso SALVA ORA quando il browser vuole un clic
 function banner(on){
  if(typeof document==='undefined'||!document.createElement)return;
  let b=document.getElementById('sfAvviso');
  if(!on){if(b)b.classList.add('hidden');return}
  if(hidden)return;
  if(!b){
   b=document.createElement('div');b.id='sfAvviso';b.className='sf-avviso hidden';b.setAttribute('role','status');
   b.innerHTML='<span id="sfAvvisoTxt"></span><button id="sfAvvisoOk" class="sf-avviso-ok" type="button"></button><button id="sfAvvisoX" class="sf-avviso-x" type="button" aria-label="Chiudi">×</button>';
   document.body.appendChild(b);
   b.querySelector('#sfAvvisoOk').onclick=async e=>{
    if(e&&e.stopPropagation)e.stopPropagation();
    await loadKey();
    const ok=typeof profSaveClick==='function'?await profSaveClick():false;
    if(ok){keepKey();banner(false)}
   };
   b.querySelector('#sfAvvisoX').onclick=e=>{if(e&&e.stopPropagation)e.stopPropagation();hidden=true;banner(false)};
  }
  b.querySelector('#sfAvvisoTxt').textContent=tx('I PROGRESSI NON SONO ANCORA NEL FILE DI SALVATAGGIO');
  b.querySelector('#sfAvvisoOk').textContent=tx('SALVA ORA');
  b.classList.remove('hidden');
 }

 // ---- controllo ogni 3 secondi: solo fuori dal combattimento (mappa o missione finita)
 async function tick(){
  const s=st();
  if(s!==lastState){if(s==='won')hidden=false;lastState=s}
  if(typeof prof==='undefined'||!prof||prof.modo!=='pc'||writing)return;
  if(!SAFE.includes(s)){banner(false);return}
  if(typeof profDirty==='function'&&!profDirty()){banner(false);return}
  const now=Date.now();if(now-last<2500)return;last=now;
  const ok=await scriviFile();
  banner(!ok&&s==='map');
 }
 if(typeof setInterval==='function')setInterval(()=>{tick().catch(()=>{})},3000);
 if(typeof globalThis!=='undefined')globalThis.salvataggioFile={scriviFile,tick,loadKey};

 // ---- stile e traduzioni
 if(typeof document!=='undefined'&&document.createElement&&document.head){
  const css=document.createElement('style');
  css.textContent='.sf-avviso{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:12px;'+
   'max-width:calc(100% - 32px);padding:10px 12px 10px 16px;border:1px solid #ffb347;border-radius:10px;background:rgba(10,14,28,.92);'+
   'color:#ffe2b0;font:600 13px/1.3 inherit;letter-spacing:.04em;box-shadow:0 0 18px rgba(255,170,60,.35)}'+
   '.sf-avviso.hidden{display:none}.sf-avviso-ok{border:0;border-radius:7px;padding:7px 12px;background:#ffb347;color:#1a1000;font-weight:800;cursor:pointer;white-space:nowrap}'+
   '.sf-avviso-x{border:0;background:none;color:#ffe2b0;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}';
  document.head.appendChild(css);
 }
 (function(){
  if(typeof I18N_ROWS==='undefined')return;
  const rows=[
   ['I PROGRESSI NON SONO ANCORA NEL FILE DI SALVATAGGIO','YOUR PROGRESS IS NOT IN THE SAVE FILE YET','TES PROGRÈS NE SONT PAS ENCORE DANS LE FICHIER DE SAUVEGARDE','TU PROGRESO AÚN NO ESTÁ EN EL ARCHIVO DE GUARDADO','ПРОГРЕСС ЕЩЁ НЕ В ФАЙЛЕ СОХРАНЕНИЯ','进度尚未写入存档文件','進行状況はまだセーブファイルにありません'],
   ['SALVA ORA','SAVE NOW','SAUVEGARDER','GUARDAR AHORA','СОХРАНИТЬ','立即保存','今すぐセーブ']
  ];
  for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
  if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function')i18nApply()}catch(e){}
 })();
})();
