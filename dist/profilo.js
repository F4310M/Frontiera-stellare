// Conex — PROFILO DEL PILOTA e SALVATAGGIO DEI PROGRESSI.
// Al primo avvio si può aprire un salvataggio o creare un pilota.
// I progressi restano sempre nel browser: alla partita successiva si riparte dalla mappa con crediti,
// vite, potenziamenti, pianeti liberati e punti. Una missione interrotta a metà ricomincia dall'inizio.
// SALVA PROGRESSI scrive un file .sfsave sul PC, criptato con la password (AES-GCM 256, chiave PBKDF2-SHA256):
// senza la password non si legge, e se qualcuno cambia anche un solo byte il file non si apre più.
// IMPORTA rimette i progressi da quel file, anche dopo aver cancellato il browser o su un altro computer.
// A fine gioco (GAME OVER o vittoria su OMEGA) nome, foto e punteggio vanno da soli in classifica.
// Il gioco gira tutto nel browser: nessuna protezione dal lato del giocatore è assoluta.
// Va caricato dopo classifica.js e godmode.js, prima di i18n.js.

const PROF_KEY='stellarProfilo',PROF_ITER=250000,PROF_EXT='.sfsave',PROF_GAME='Stellar Frontier',PROF_FORMAT=1,PROF_PW_MIN=6;
// Chiavi del browser che fanno parte dei progressi (e impostazioni che viaggiano con il pilota).
const PROF_PROGRESS=['frontieraCrediti','frontieraPotenziamenti','frontieraVite','frontieraPhaseOneComplete','frontieraPhaseTwoComplete','frontieraPianetiLiberati','frontieraOmegaLibero','stellarPunti','stellarRecord','stellarMieiRecord','stellarPartita','stellarArena'];
const PROF_SETTINGS=['frontieraSound','frontieraMusica','stellarLang','stellarVolumeMusica','stellarVolumeEffetti','stellarGodMode'];
const PROF_IMG=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/,PROF_MINI_MAX=8000;
function profImgOk(s,max){return typeof s==='string'&&s.length<=(max||60000)&&PROF_IMG.test(s)}
function profT(s){return typeof tr==='function'?tr(s):s}

// ---- archivio del browser
function profGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function profSet(k,v){try{if(v===null)localStorage.removeItem?localStorage.removeItem(k):localStorage.setItem(k,'');else localStorage.setItem(k,String(v))}catch(e){}}
function profLoad(){try{const p=JSON.parse(profGet(PROF_KEY)||'null');return p&&typeof p.nome==='string'&&p.nome&&typeof p.salt==='string'&&typeof p.check==='string'?p:null}catch(e){return null}}
let prof=profLoad(),profKeyMem=null; // profKeyMem: chiave AES della sessione, non esportabile, mai salvata
function profStore(){profSet(PROF_KEY,JSON.stringify(prof))}
function profSnapshot(){const o={};for(const k of PROF_PROGRESS.concat(PROF_SETTINGS)){const v=profGet(k);if(v!==null)o[k]=v}return o}
function profSnapKey(){return JSON.stringify(PROF_PROGRESS.map(k=>profGet(k)||''))}
function profDirty(){return !!prof&&prof.snap!==profSnapKey()}

// ---- crittografia (Web Crypto del browser)
function profCryptoOk(){return typeof crypto!=='undefined'&&!!crypto&&!!crypto.subtle&&typeof TextEncoder!=='undefined'}
const profEnc=s=>new TextEncoder().encode(s),profDec=b=>new TextDecoder().decode(b);
function profB64(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)}
function profUnB64(s){const t=atob(String(s));const b=new Uint8Array(t.length);for(let i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return b}
function profRand(n){const b=new Uint8Array(n);crypto.getRandomValues(b);return b}
function profId(){return profB64(profRand(9)).replace(/[+/=]/g,'x')}
// Dalla password: chiave AES-GCM a 256 bit e un'impronta per riconoscere la password giusta senza salvarla.
async function profDerive(pw,salt,iter){
 const base=await crypto.subtle.importKey('raw',profEnc(String(pw).normalize('NFC')),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},base,256));
 const key=await crypto.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt','decrypt']);
 const tag=profEnc('stellar-frontier-check:'),mix=new Uint8Array(tag.length+bits.length);mix.set(tag);mix.set(bits,tag.length);
 const check=profB64(await crypto.subtle.digest('SHA-256',mix));bits.fill(0);mix.fill(0);
 return{key,check};
}
// L'intestazione del file (sale, iterazioni, iv) è autenticata insieme ai dati: cambiarla rompe il file.
function profAad(h){return profEnc([h.gioco,h.formato,h.kdf,h.iter,h.salt,h.iv].join('|'))}
async function profPack(key){
 const h={gioco:PROF_GAME,formato:PROF_FORMAT,kdf:'PBKDF2-SHA256',iter:prof.iter,salt:prof.salt,iv:profB64(profRand(12))};
 const body={v:1,id:prof.id,nome:prof.nome,foto:prof.foto||'',mini:prof.mini||'',creato:prof.creato||'',salvato:new Date().toISOString(),progressi:profSnapshot()};
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:profUnB64(h.iv),additionalData:profAad(h)},key,profEnc(JSON.stringify(body)));
 return JSON.stringify(Object.assign(h,{dati:profB64(ct)}));
}
async function profUnpack(text,pw){
 const bad=()=>new Error('FILE DI SALVATAGGIO NON VALIDO');
 let h,salt,iv,data;
 try{h=JSON.parse(text);salt=profUnB64(h.salt);iv=profUnB64(h.iv);data=profUnB64(h.dati)}catch(e){throw bad()}
 if(!h||h.gioco!==PROF_GAME||h.formato!==PROF_FORMAT||h.kdf!=='PBKDF2-SHA256'||!(h.iter>=100000&&h.iter<=2000000)||salt.length<16||iv.length!==12||data.length<17)throw bad();
 const {key,check}=await profDerive(pw,salt,h.iter);
 let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:profAad(h)},key,data)}catch(e){throw new Error('PASSWORD ERRATA O FILE MANOMESSO')}
 let body;try{body=JSON.parse(profDec(plain))}catch(e){throw bad()}
 const nome=cleanName(body&&body.nome);
 if(!nome||!body.progressi||typeof body.progressi!=='object')throw bad();
 body.nome=nome;
 return{h,key,check,body};
}

// ---- pilota: creazione, password, ripristino
async function profCreate(nome,pw,foto,mini,modo){
 const salt=profRand(16),{key,check}=await profDerive(pw,salt,PROF_ITER);
 prof={v:1,id:profId(),nome:cleanName(nome),foto:profImgOk(foto)?foto:'',mini:profImgOk(mini,PROF_MINI_MAX)?mini:'',salt:profB64(salt),iter:PROF_ITER,check,
  modo:modo==='browser'?'browser':'pc',creato:new Date().toISOString(),ultimoBackup:'',snap:''};
 profKeyMem=key;profStore();profSet('stellarUltimoNome',prof.nome);
 return prof;
}
async function profUnlock(pw){
 if(!prof)return false;
 const {key,check}=await profDerive(pw,profUnB64(prof.salt),prof.iter||PROF_ITER);
 if(check!==prof.check)return false;
 profKeyMem=key;return true;
}
// Nuova password (anche se quella vecchia è dimenticata): vale per i prossimi salvataggi; i file vecchi restano con quella vecchia.
async function profNewPassword(pw){
 const salt=profRand(16),{key,check}=await profDerive(pw,salt,PROF_ITER);
 Object.assign(prof,{salt:profB64(salt),iter:PROF_ITER,check});profKeyMem=key;profStore();
}
// Un file importato sostituisce i progressi di questo browser.
function profApply(u){
 const p=u.body.progressi;
 for(const k of PROF_PROGRESS.concat(PROF_SETTINGS)){
  const v=p[k];
  if(typeof v==='string'&&v.length<=4000)profSet(k,v);
  else if(PROF_PROGRESS.includes(k))profSet(k,null);
 }
 const b=u.body;
 prof={v:1,id:typeof b.id==='string'&&b.id.length<40?b.id:profId(),nome:b.nome,foto:profImgOk(b.foto)?b.foto:'',mini:profImgOk(b.mini,PROF_MINI_MAX)?b.mini:'',
  salt:u.h.salt,iter:u.h.iter,check:u.check,modo:'pc',creato:typeof b.creato==='string'?b.creato.slice(0,30):'',ultimoBackup:typeof b.salvato==='string'?b.salvato.slice(0,30):'',snap:''};
 profKeyMem=u.key;prof.snap=profSnapKey();profStore();profSet('stellarUltimoNome',prof.nome);
}
function profReset(){
 for(const k of PROF_PROGRESS)profSet(k,null);
 prof=null;profKeyMem=null;profSet(PROF_KEY,null);profIdb('readwrite',s=>s.delete('backup'));
}
function profReload(){try{location.reload()}catch(e){}}

// ---- file sul PC: Chrome/Edge riscrivono sempre lo stesso file, gli altri browser lo scaricano
function profIdb(mode,fn){return new Promise(res=>{try{
 if(typeof indexedDB==='undefined'||!indexedDB)return res(null);
 const r=indexedDB.open('stellarFrontier',1);
 r.onupgradeneeded=()=>r.result.createObjectStore('file');r.onerror=()=>res(null);
 r.onsuccess=()=>{try{const q=fn(r.result.transaction('file',mode).objectStore('file'));q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}};
}catch(e){res(null)}})}
function profFileName(){return 'Conex-'+String(prof.nome).replace(/\s+/g,'_')+PROF_EXT}
function profDownload(name,text){
 const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'})),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
// Da chiamare dentro un clic: il browser chiede dove salvare solo la prima volta.
async function profSaveFile(){
 const name=profFileName();let handle=null;
 if(typeof showSaveFilePicker==='function'&&!(typeof window!=='undefined'&&window.top!==window)){
  handle=await profIdb('readonly',s=>s.get('backup'));
  if(handle){try{const ok=handle.requestPermission?await handle.requestPermission({mode:'readwrite'}):'granted';if(ok!=='granted')handle=null}catch(e){handle=null}}
  if(!handle){
   try{handle=await showSaveFilePicker({suggestedName:name,types:[{description:'Conex',accept:{'application/octet-stream':[PROF_EXT]}}]});profIdb('readwrite',s=>s.put(handle,'backup'))}
   catch(e){if(e&&e.name==='AbortError')return false;handle=null}
  }
 }
 const text=await profPack(profKeyMem);
 let file=name;
 if(handle){try{const w=await handle.createWritable();await w.write(text);await w.close();file=handle.name||name}catch(e){handle=null}}
 if(!handle)profDownload(name,text);
 Object.assign(prof,{modo:'pc',ultimoBackup:new Date().toISOString(),file,snap:profSnapKey()});profStore();
 return true;
}

// ---- foto: ritaglio quadrato, 128 px per il profilo e 40 px per la classifica
function profReadImage(file){return new Promise((res,rej)=>{
 if(!file||!/^image\//.test(file.type||''))return rej(new Error('IMMAGINE NON VALIDA'));
 const fr=new FileReader();
 fr.onload=()=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('IMMAGINE NON VALIDA'));img.src=fr.result};
 fr.onerror=()=>rej(new Error('IMMAGINE NON VALIDA'));fr.readAsDataURL(file);
})}
function profThumb(img,size,max){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
 x.fillStyle='#0a1b2a';x.fillRect(0,0,size,size);
 if(img){const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,s=Math.min(w,h);x.drawImage(img,(w-s)/2,(h-s)/2,s,s,0,0,size,size)}
 let out='';for(let q=.86;q>=.3;q-=.08){out=c.toDataURL('image/jpeg',q);if(out.length<=max)break}
 return out.length<=max?out:'';
}
// Senza foto: l'iniziale del nome su un emblema colorato.
function profEmblem(nome){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 let hsh=0;for(const ch of String(nome))hsh=(hsh*31+ch.codePointAt(0))>>>0;
 const g=x.createLinearGradient(0,0,128,128);g.addColorStop(0,`hsl(${hsh%360},70%,42%)`);g.addColorStop(1,`hsl(${(hsh+80)%360},70%,18%)`);
 x.fillStyle=g;x.fillRect(0,0,128,128);x.fillStyle='rgba(255,255,255,.92)';x.font='700 64px "Chakra Petch",sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.fillText(String(nome).trim().charAt(0).toUpperCase()||'?',64,68);
 return c;
}
function profPhotos(src){return{foto:profThumb(src,128,40000),mini:profThumb(src,40,PROF_MINI_MAX)}}

// ---- classifica: foto accanto al nome, invio automatico a fine gioco
// Foto del pilota in classifica. Se la riga non ha la foto: quella del profilo, se il nome è il tuo,
// altrimenti un tondo colorato con l'iniziale.
function profAva(a,cls,nome){
 cls=cls||'board-ava';
 if(!profImgOk(a,PROF_MINI_MAX)&&nome&&prof&&prof.mini&&cleanName(nome)===prof.nome)a=prof.mini;
 if(profImgOk(a,PROF_MINI_MAX))return `<img class="${cls}" src="${a}" alt="">`;
 if(!nome)return '';
 let h=0;for(const ch of String(nome))h=(h*31+ch.codePointAt(0))>>>0;
 const c=(String(nome).trim().match(/[\p{L}\p{N}]/u)||['?'])[0].toUpperCase();
 return `<span class="${cls} ava-ini" style="background:linear-gradient(135deg,hsl(${h%360},70%,42%),hsl(${(h+80)%360},70%,18%))">${c}</span>`;
}
if(typeof coRow==='function'){const cr=coRow;coRow=function(doc){const r=cr(doc),f=(doc&&doc.fields)||{};r.a=profImgOk(f.a&&f.a.stringValue,PROF_MINI_MAX)?f.a.stringValue:'';return r}}
if(typeof coSend==='function'){
 coSend=async function(row){
  const fields={n:{stringValue:row.n},s:{integerValue:String(row.s)},d:{stringValue:row.d}};
  const a=row.a||(prof&&row.n===prof.nome?prof.mini:'');
  if(profImgOk(a,PROF_MINI_MAX))fields.a={stringValue:a};
  let j;
  try{j=await coReq('/classifica',{fields})}
  catch(e){
   // regole di Firebase non ancora aggiornate per la foto: il punteggio parte lo stesso, senza foto
   if(!fields.a||!/firestore 4\d\d/.test(String(e&&e.message)))throw e;
   delete fields.a;j=await coReq('/classifica',{fields});
  }
  coCache=null;return String(j&&j.name||'').split('/').pop();
 };
}
if(typeof boardAdd==='function'){
 const ba=boardAdd;
 boardAdd=function(name,points){
  const pos=ba(name,points);
  if(pos>=0&&prof&&prof.mini&&cleanName(name)===prof.nome){const b=boardLoad(),r=b.find(r=>r.n===prof.nome&&r.s===Math.round(points)&&!r.a);if(r){r.a=prof.mini;boardSave(b)}}
  return pos;
 };
}
// A fine gioco il punteggio parte da solo con il nome e la foto del pilota (niente casella da riempire).
let profNoBoard=false;
if(typeof boardOpen==='function'){const bo=boardOpen;boardOpen=function(){if(profNoBoard)return;return bo.apply(this,arguments)}}
async function profScoreAuto(){
 const e=$('scoreEntry'),inp=$('scoreName');
 if(e&&e.classList)e.classList.toggle('prof-auto',!!prof);
 if(!prof||!(scorePending>0)||!inp)return false;
 inp.value=prof.nome;
 const w=$('scoreWho');
 if(w){w.innerHTML=profAva(prof.mini,'score-ava')+'<b></b>';const b=w.querySelector&&w.querySelector('b');if(b)b.textContent=prof.nome}
 profNoBoard=true;
 try{await scoreSubmit()}finally{profNoBoard=false}
 return true;
}
if(typeof scoreEnd==='function'){const se=scoreEnd;scoreEnd=function(){const r=se.apply(this,arguments);profScoreAuto();return r}}

// ---- interfaccia
const profUI=typeof document!=='undefined'&&!!document.createElement&&!!document.body&&!!document.querySelector&&typeof $==='function';
let profModo='pc',profNewPhoto=null,profToastT=0;
function profHtml(){
 const I=n=>typeof ico==='function'?ico(n):'';
 return{
 accesso:'<div class="brief-card prof-card prof-access"><p class="eyebrow">REGISTRO DEI PILOTI</p><h2>PROFILO DEL PILOTA</h2>'+
  '<button id="profImportSaved" class="prof-choice prof-choice-main" type="button"><b class="prof-choice-ico">'+I('upload')+'</b><span class="prof-choice-txt"><strong>CARICA PROFILO</strong><small>Hai già un pilota? Apri il tuo file .sfsave con la password del salvataggio.</small></span></button>'+
  '<p class="prof-or"><span>OPPURE</span></p>'+
  '<button id="profNewPilot" class="prof-choice" type="button"><b class="prof-choice-ico">'+I('user')+'</b><span class="prof-choice-txt"><strong>NUOVO PILOTA</strong><small>Crea un pilota nuovo e inizia la campagna da zero.</small></span><em>'+I('arrow-right')+'</em></button></div>',
 nuovo:'<div class="brief-card prof-card"><div class="settings-head"><div><p class="eyebrow">REGISTRO DEI PILOTI</p><h2>NUOVO PILOTA</h2></div><button id="profNewX" class="close-btn hidden" aria-label="Chiudi">'+I('close')+'</button></div>'+
  '<div class="prof-cols"><div class="prof-left"><button id="profPhotoBtn" class="prof-photo" type="button" aria-label="Scegli la foto del pilota"><img id="profPhotoImg" alt="" class="hidden"><span>'+I('camera')+'<br>SCEGLI LA FOTO</span></button>'+
  '<input id="profPhotoFile" type="file" accept="image/*" class="hidden"><p class="prof-hint">La foto viene rimpicciolita e compare in classifica accanto al tuo nome.</p></div>'+
  '<div class="prof-right"><label class="prof-field"><span>NOME DEL PILOTA</span><input id="profName" class="prof-input" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Massimo 20 lettere"></label>'+
  '<label class="prof-field"><span>PASSWORD</span><input id="profPw" class="prof-input" type="password" autocomplete="new-password" placeholder="Almeno 6 caratteri"></label>'+
  '<label class="prof-field"><span>RIPETI LA PASSWORD</span><input id="profPw2" class="prof-input" type="password" autocomplete="new-password"></label>'+
  '<p class="prof-hint">La password protegge il file di salvataggio. Se la dimentichi, quel file non si può più aprire.</p></div></div>'+
  '<p class="prof-label">DOVE SALVARE I PROGRESSI</p><div class="prof-modes">'+
  '<button class="prof-mode on" data-modo="pc" type="button"><b>'+I('save')+' SUL PC E NEL BROWSER <i>CONSIGLIATO</i></b><small>Scarichi subito un file di salvataggio criptato. Con IMPORTA lo recuperi anche dopo aver cancellato i dati del browser o su un altro computer.</small></button>'+
  '<button class="prof-mode" data-modo="browser" type="button"><b>'+I('globe')+' SOLO NEL BROWSER</b><small>Più veloce, ma se cancelli i dati di navigazione o cambi computer perdi tutti i progressi.</small></button></div>'+
  '<p id="profNewMsg" class="prof-msg"></p><button id="profCreate" class="launch-btn"><span>CREA IL PILOTA</span><b>'+I('check')+'</b></button>'+
  '<button id="profImportLink" class="text-btn">'+I('upload')+' <span>HO GIÀ UN SALVATAGGIO · IMPORTA</span></button></div>',
 pannello:'<div class="brief-card prof-card"><div class="settings-head"><div><p class="eyebrow">REGISTRO DEI PILOTI</p><h2>PROFILO</h2></div><button id="profPanelX" class="close-btn" aria-label="Chiudi">'+I('close')+'</button></div>'+
  '<div class="prof-cols"><div class="prof-left"><button id="profPanelPhoto" class="prof-photo" type="button" aria-label="Cambia la foto"><img id="profPanelImg" alt=""><span>'+I('camera')+'<br>CAMBIA FOTO</span></button><input id="profPanelFile" type="file" accept="image/*" class="hidden"></div>'+
  '<div class="prof-right"><h3 id="profPanelName" class="prof-name"></h3><p id="profPanelMode" class="prof-hint"></p><p id="profPanelLast" class="prof-hint"></p>'+
  '<button id="profPanelSave" class="launch-btn"><span>SALVA PROGRESSI</span><b>'+I('save')+'</b></button>'+
  '<div class="prof-actions"><button id="profPanelImport" class="settings-btn">'+I('upload')+' <span>IMPORTA UN SALVATAGGIO</span></button><button id="profPanelPw" class="settings-btn">'+I('key')+' <span>CAMBIA PASSWORD</span></button></div>'+
  '<button id="profPanelNew" class="text-btn">NUOVO PILOTA · AZZERA I PROGRESSI</button></div></div>'+
  '<p class="prof-hint">I progressi si salvano da soli in questo browser: alla prossima partita riparti dalla mappa con crediti, vite, potenziamenti, pianeti liberati e punti. Una missione interrotta a metà ricomincia dall’inizio.</p>'+
  '<p class="prof-hint">Il file sul PC è criptato con la tua password (AES-256) e protetto contro le modifiche: se viene alterato non si apre più.</p><p id="profPanelMsg" class="prof-msg"></p></div>',
 password:'<div class="brief-card compact prof-pw"><p class="eyebrow" id="profPwEyebrow">FILE DI SALVATAGGIO</p><h2 id="profPwTitle">PASSWORD</h2><p id="profPwText"></p>'+
  '<input id="profPwIn" class="prof-input" type="password" autocomplete="current-password" placeholder="Password"><input id="profPwIn2" class="prof-input hidden" type="password" autocomplete="new-password" placeholder="Ripeti la password">'+
  '<p id="profPwMsg" class="prof-msg"></p><button id="profPwOk" class="launch-btn"><span>CONFERMA</span><b>'+I('check')+'</b></button>'+
  '<button id="profPwForgot" class="text-btn">PASSWORD DIMENTICATA? IMPOSTANE UNA NUOVA</button><button id="profPwCancel" class="text-btn">ANNULLA</button></div>'
 };
}
function profOverlay(id,html,label){
 if($(id))return $(id);
 const o=document.createElement('section');o.id=id;o.className='overlay prof-overlay hidden';o.setAttribute('aria-label',label);o.innerHTML=html;
 document.body.appendChild(o);return o;
}
// Le caselle di testo non devono muovere la nave (tasti WASD, P, M...).
function profKeys(el,enter){if(!el)return;el.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'&&enter)enter()};el.onkeyup=e=>e.stopPropagation()}
function profMsg(id,s,ok){const m=$(id);if(!m)return;m.textContent=s?profT(s):'';if(m.classList)m.classList.toggle('ok',!!ok)}
function profToast(s){
 let t=$('profToast');
 if(!t){t=document.createElement('div');t.id='profToast';t.className='prof-toast hidden';t.setAttribute('role','status');document.body.appendChild(t)}
 t.textContent=profT(s);show('profToast',true);clearTimeout(profToastT);profToastT=setTimeout(()=>show('profToast',false),3200);
}
function profWhen(iso){
 const d=new Date(iso);if(!iso||isNaN(d))return '';
 const p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function profRefresh(){
 if(!profUI)return;
 const chip=$('profChip'),save=$('profSaveBtn');
 if(prof&&!prof.foto){const p=profPhotos(profEmblem(prof.nome));prof.foto=p.foto;prof.mini=prof.mini||p.mini;profStore()}
 if(chip){show('profChip',!!prof);if(prof){$('profChipImg').src=prof.foto||'';$('profChipName').textContent=prof.nome}}
 if(save){show('profSaveBtn',!!prof);save.classList.toggle('dirty',profDirty())}
 if(prof&&$('profPanelName')){
  $('profPanelImg').src=prof.foto||'';$('profPanelName').textContent=prof.nome;
  $('profPanelMode').textContent=profT(prof.modo==='pc'?'PROGRESSI NEL BROWSER E SUL PC':'PROGRESSI SOLO NEL BROWSER · SALVALI SUL PC PER NON PERDERLI');
  $('profPanelLast').textContent=prof.ultimoBackup?profT('ULTIMO SALVATAGGIO SUL PC')+': '+profWhen(prof.ultimoBackup)+(profDirty()?' · '+profT('CI SONO PROGRESSI NON SALVATI'):''):profT('NESSUN SALVATAGGIO SUL PC');
 }
}
// Finestra della password. check(pw) restituisce un messaggio d'errore oppure niente se va bene.
function profAskPw(o){return new Promise(done=>{
 profOverlay('profPwBox',profHtml().password,'Password');
 let nuova=!!o.nuova;
 const set=()=>{
  $('profPwTitle').textContent=profT(nuova?'NUOVA PASSWORD':(o.title||'PASSWORD'));
  $('profPwText').textContent=profT(nuova?'Scegli una nuova password per i prossimi salvataggi. I file salvati prima si aprono solo con la password vecchia.':(o.text||''));
  show('profPwIn2',nuova);show('profPwForgot',!nuova&&!!o.forgot);
  $('profPwIn').value='';$('profPwIn2').value='';$('profPwIn').autocomplete=nuova?'new-password':'current-password';profMsg('profPwMsg','');
 };
 const end=v=>{show('profPwBox',false);$('profPwIn').value='';$('profPwIn2').value='';done(v)};
 const ok=async()=>{
  const pw=$('profPwIn').value;
  if(nuova){
   if(pw.length<PROF_PW_MIN)return profMsg('profPwMsg','LA PASSWORD DEVE AVERE ALMENO 6 CARATTERI');
   if(pw!==$('profPwIn2').value)return profMsg('profPwMsg','LE DUE PASSWORD NON SONO UGUALI');
   $('profPwOk').disabled=true;profMsg('profPwMsg','UN MOMENTO…',true);
   try{await profNewPassword(pw)}finally{$('profPwOk').disabled=false}
   return end(pw);
  }
  if(!pw)return profMsg('profPwMsg','SCRIVI LA PASSWORD');
  $('profPwOk').disabled=true;profMsg('profPwMsg','UN MOMENTO…',true);
  let err=null;try{err=o.check?await o.check(pw):null}catch(e){err=e&&e.message||'ERRORE'}finally{$('profPwOk').disabled=false}
  if(err)return profMsg('profPwMsg',err);
  end(pw);
 };
 $('profPwOk').onclick=ok;$('profPwCancel').onclick=()=>end(null);
 $('profPwForgot').onclick=()=>{nuova=true;set()};
 profKeys($('profPwIn'),ok);profKeys($('profPwIn2'),ok);
 set();show('profPwBox',true);setTimeout(()=>{try{$('profPwIn').focus()}catch(e){}},60);
})}
// SALVA PROGRESSI: alla prima volta della sessione chiede la password, poi salva con un clic.
async function profSaveClick(){
 if(!prof){profOpenAccess();return false}
 if(!profCryptoOk()){profToast('QUESTO BROWSER NON PERMETTE LA CRITTOGRAFIA: APRI IL GIOCO DA HTTPS O DA LOCALHOST');return false}
 if(!profKeyMem){
  const pw=await profAskPw({title:'SALVA PROGRESSI',text:'Scrivi la password del pilota per criptare il file.',forgot:true,check:async pw=>(await profUnlock(pw))?null:'PASSWORD ERRATA'});
  if(pw===null)return false;
 }
 try{
  const ok=await profSaveFile();
  profRefresh();if(ok)profToast('PROGRESSI SALVATI SUL PC');return ok;
 }catch(e){profToast('SALVATAGGIO NON RIUSCITO');return false}
}
function profPickFile(accept){return new Promise(res=>{
 const f=document.createElement('input');f.type='file';f.accept=accept;f.style.display='none';
 f.oncancel=()=>{f.remove();res(null)};
 f.onchange=()=>{const x=f.files&&f.files[0];f.remove();res(x||null)};document.body.appendChild(f);f.click();
})}
async function profImportClick(){
 if(!profCryptoOk()){profToast('QUESTO BROWSER NON PERMETTE LA CRITTOGRAFIA: APRI IL GIOCO DA HTTPS O DA LOCALHOST');return}
 const file=await profPickFile(PROF_EXT+',application/octet-stream,application/json');if(!file)return;
 if(file.size>400000){profToast('FILE DI SALVATAGGIO NON VALIDO');return}
 let text,u=null;
 try{text=await file.text()}catch(e){profToast('FILE DI SALVATAGGIO NON VALIDO');return}
 const pw=await profAskPw({title:'IMPORTA',text:prof?'Scrivi la password con cui è stato salvato il file. I progressi di questo browser verranno sostituiti.':'Scrivi la password con cui è stato salvato il file.',
  check:async pw=>{u=await profUnpack(text,pw);return null}});
 if(pw===null||!u)return;
 profApply(u);profToast('PROGRESSI IMPORTATI');setTimeout(profReload,700);
}
function profOpenAccess(){
 show('profAccess',true);
 $('profImportSaved').focus();
}
function profOpenNew(canClose){
 profOverlay('profNew',profHtml().nuovo,'Nuovo pilota');
 show('profNewX',!!canClose);profMsg('profNewMsg','');show('profNew',true);
 setTimeout(()=>{try{$('profName').focus()}catch(e){}},80);
}
function profOpenPanel(){if(!prof)return profOpenAccess();profRefresh();profMsg('profPanelMsg','');show('profPanel',true)}
async function profPhotoFrom(file){const img=await profReadImage(file);return profPhotos(img)}
async function profCreateClick(){
 const nome=cleanName($('profName').value),pw=$('profPw').value;
 if(!nome)return profMsg('profNewMsg','SCRIVI IL NOME DEL PILOTA');
 if(pw.length<PROF_PW_MIN)return profMsg('profNewMsg','LA PASSWORD DEVE AVERE ALMENO 6 CARATTERI');
 if(pw!==$('profPw2').value)return profMsg('profNewMsg','LE DUE PASSWORD NON SONO UGUALI');
 if(!profCryptoOk())return profMsg('profNewMsg','QUESTO BROWSER NON PERMETTE LA CRITTOGRAFIA: APRI IL GIOCO DA HTTPS O DA LOCALHOST');
 const ph=profNewPhoto||profPhotos(profEmblem(nome));
 $('profCreate').disabled=true;profMsg('profNewMsg','UN MOMENTO…',true);
 try{
  // nomi unici in classifica (accesso.js): un nome già preso da un altro pilota non si può usare
  if(typeof CX!=='undefined'&&CX.on&&await CX.nomeLibero(nome)===false)return profMsg('profNewMsg','QUESTO NOME È GIÀ USATO DA UN ALTRO PILOTA: SCEGLINE UN ALTRO');
  await profCreate(nome,pw,ph.foto,ph.mini,profModo);
  if(typeof CX!=='undefined'&&CX.on)CX.nomeMio(prof.nome);
  $('profPw').value=$('profPw2').value='';profMsg('profNewMsg','');
  prof.snap=profModo==='pc'?'':profSnapKey();profStore();
  show('profNew',false);profRefresh();
  if(profModo==='pc'){const ok=await profSaveClick();if(!ok)profToast('FILE NON SALVATO: PUOI FARLO QUANDO VUOI CON SALVA PROGRESSI')}
  else profToast('PILOTA CREATO');
 }catch(e){profMsg('profNewMsg','ERRORE: RIPROVA')}
 finally{$('profCreate').disabled=false}
}
function profBuild(){
 if(!profUI)return;
 const I=n=>typeof ico==='function'?ico(n):'',H=profHtml();
 // in alto nella mappa: il pilota
 const top=$('settingsBtn')&&$('settingsBtn').parentNode;
 if(top&&top.insertBefore&&!$('profChip')){
  const c=document.createElement('button');c.id='profChip';c.className='settings-btn prof-chip hidden';c.setAttribute('aria-label','Profilo del pilota');
  c.innerHTML='<img id="profChipImg" alt=""><span id="profChipName"></span>';c.onclick=()=>profOpenPanel();
  // 2026-11-10: niente più tasto SALVA PROGRESSI in alto, il gioco salva da solo
  // (il file .sfsave resta nel pannello del pilota)
  top.insertBefore(c,top.firstChild);
 }
 // fine gioco: pilota al posto della casella del nome
 const entry=$('scoreEntry');
 if(entry&&entry.appendChild&&!$('scoreWho')){
  const w=document.createElement('div');w.id='scoreWho';w.className='score-who';entry.insertBefore(w,$('scoreMsg'));
  const v=document.createElement('button');v.id='scoreSeeBoard';v.className='text-btn score-see';v.innerHTML=I('trophy')+' <span>VEDI LA CLASSIFICA</span>';v.onclick=()=>boardOpen();entry.appendChild(v);
 }
 // accesso e nuovo pilota
 const access=profOverlay('profAccess',H.accesso,'Profilo del pilota');
 access.setAttribute('role','dialog');access.setAttribute('aria-modal','true');
 access.onkeydown=e=>{
  if(e.key!=='Tab')return;
  e.preventDefault();
  (document.activeElement===$('profImportSaved')?$('profNewPilot'):$('profImportSaved')).focus();
 };
 $('profImportSaved').onclick=()=>profImportClick();
 $('profNewPilot').onclick=()=>{show('profAccess',false);profOpenNew(true)};
 profOverlay('profNew',H.nuovo,'Nuovo pilota');
 for(const b of document.querySelectorAll('#profNew .prof-mode'))b.onclick=()=>{profModo=b.dataset.modo;for(const x of document.querySelectorAll('#profNew .prof-mode'))x.classList.toggle('on',x===b)};
 $('profPhotoBtn').onclick=()=>$('profPhotoFile').click();
 $('profPhotoFile').onchange=async()=>{
  const f=$('profPhotoFile').files[0];if(!f)return;
  try{profNewPhoto=await profPhotoFrom(f);$('profPhotoImg').src=profNewPhoto.foto;show('profPhotoImg',true);profMsg('profNewMsg','')}catch(e){profMsg('profNewMsg','IMMAGINE NON VALIDA')}
  $('profPhotoFile').value='';
 };
 const nm=$('profName');profKeys(nm,profCreateClick);profKeys($('profPw'),profCreateClick);profKeys($('profPw2'),profCreateClick);
 nm.oninput=()=>{const c=nm.value.replace(/[^\p{L}\p{N} ]/gu,'').slice(0,SCORE_MAX_NAME);if(c!==nm.value)nm.value=c};
 $('profCreate').onclick=()=>profCreateClick();
 $('profImportLink').onclick=()=>profImportClick();
 $('profNewX').onclick=()=>{show('profNew',false);if(!prof)profOpenAccess()};
 // pannello del pilota
 profOverlay('profPanel',H.pannello,'Profilo');
 $('profPanelX').onclick=()=>show('profPanel',false);
 $('profPanelSave').onclick=async()=>{if(await profSaveClick())profRefresh()};
 $('profPanelImport').onclick=()=>profImportClick();
 $('profPanelPw').onclick=async()=>{const pw=await profAskPw({nuova:true});if(pw!==null){profToast('PASSWORD CAMBIATA');prof.snap='';profStore();profRefresh()}};
 $('profPanelPhoto').onclick=()=>$('profPanelFile').click();
 $('profPanelFile').onchange=async()=>{
  const f=$('profPanelFile').files[0];if(!f)return;
  try{const p=await profPhotoFrom(f);prof.foto=p.foto;prof.mini=p.mini;profStore();profRefresh();profMsg('profPanelMsg','FOTO AGGIORNATA',true)}catch(e){profMsg('profPanelMsg','IMMAGINE NON VALIDA')}
  $('profPanelFile').value='';
 };
 $('profPanelNew').onclick=()=>{
  if(!confirm(profT('Creare un nuovo pilota? I progressi di questo browser verranno cancellati. Se vuoi tenerli, prima premi SALVA PROGRESSI.')))return;
  profReset();show('profPanel',false);profRefresh();if(typeof eco!=='undefined')profReload();else profOpenAccess();
 };
 profRefresh();
 if(typeof setInterval==='function')setInterval(()=>{if(prof&&$('profSaveBtn'))$('profSaveBtn').classList.toggle('dirty',profDirty())},3000);
 if(!prof)profOpenAccess();
}
profBuild();
